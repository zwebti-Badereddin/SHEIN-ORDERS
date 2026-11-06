// يقرأ سلة SHEIN المشتركة من رابطها ويعيد المنتجات وأسعارها.
// الاستخدام: /.netlify/functions/cart?url=<رابط السلة>   (أضف &debug=1 لرؤية ما وصل من SHEIN كما هو)
const UA = "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const OK_HOST = /(^|\.)(shein\.com|shein\.top|sheingroup\.com|shein\.co\.uk|onelink\.me)$/i;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "no-store" }
});

// يتبع التحويلات يدوياً ليسجل كل خطوة، ويفك الروابط المضمَّنة (link= / url=) في روابط المشاركة
async function fetchFollow(start, trail) {
  let url = start, res, body = "";
  for (let i = 0; i < 8; i++) {
    const host = new URL(url).hostname;
    if (!OK_HOST.test(host)) { trail.push({ url, stop: "host not allowed" }); break; }
    res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA, "accept": "text/html,application/json;q=0.9,*/*;q=0.8", "accept-language": "en-US,en;q=0.9" } });
    trail.push({ url, status: res.status });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) { url = new URL(loc, url).href; continue; }
    body = await res.text();
    // صفحات القفز (sharejump) تحمل الرابط الحقيقي في معامل أو داخل الصفحة
    const inner = new URL(url).searchParams.get("link") || new URL(url).searchParams.get("url");
    if (inner && /^https?:/i.test(inner) && i < 7 && !/goods_name/.test(body)) { url = inner; continue; }
    const m = body.match(/(?:location\.(?:href|replace)\s*\(?\s*=?\s*|http-equiv=["']refresh["'][^>]*url=)["']?(https?:\/\/[^"'\s<>)]+)/i);
    if (m && !/goods_name/.test(body) && i < 7) { url = m[1].replace(/\\u002F/g, "/").replace(/\\\//g, "/"); continue; }
    break;
  }
  return { finalUrl: url, status: res && res.status, body };
}

const num = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")); return isFinite(n) ? n : 0; };
const pick = (s, re) => { const m = s.match(re); return m ? m[1] : ""; };
const unesc = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };

// الكائن الذي يحتوي الموضع i: نرجع حتى «{» التي تفتحه، ثم نتقدم حتى «}» التي تغلقه
function enclosing(s, i) {
  let d = 0, a = i;
  for (; a > 0 && i - a < 20000; a--) { const c = s[a]; if (c === "}") d++; else if (c === "{") { if (d === 0) break; d--; } }
  let b = a + 1, inStr = false; d = 1;
  for (; b < s.length && b - a < 40000; b++) {
    const c = s[b];
    if (inStr) { if (c === "\\") b++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === "{") d++; else if (c === "}") { d--; if (!d) break; }
  }
  return s.slice(a, b + 1);
}

// يبحث في الصفحة عن بيانات المنتجات (الحقول المعتادة في SHEIN: goods_name, goods_sn, salePrice, retailPrice, quantity)
function extract(html) {
  const items = [], seen = new Set();
  const re = /"goods_name"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(html))) {
    const win = enclosing(html, m.index);
    const sale = pick(win, /"salePrice"\s*:\s*\{[^}]*?"usdAmount"\s*:\s*"?([\d.]+)/) || pick(win, /"salePrice"\s*:\s*\{[^}]*?"amount"\s*:\s*"?([\d.]+)/) || pick(win, /"sale_price"\s*:\s*"?([\d.]+)/);
    if (!sale) continue;
    const it = {
      name: unesc(m[1]),
      sku: pick(win, /"goods_sn"\s*:\s*"([^"]+)"/),
      price: num(sale),
      orig: num(pick(win, /"retailPrice"\s*:\s*\{[^}]*?"usdAmount"\s*:\s*"?([\d.]+)/) || pick(win, /"retailPrice"\s*:\s*\{[^}]*?"amount"\s*:\s*"?([\d.]+)/)),
      qty: Math.max(1, num(pick(win, /"quantity"\s*:\s*"?(\d+)/)) || 1),
      attr: unesc(pick(win, /"attr_value_en"\s*:\s*"((?:[^"\\]|\\.)*)"/) || pick(win, /"attr_value"\s*:\s*"((?:[^"\\]|\\.)*)"/)),
      img: unesc(pick(win, /"goods_img"\s*:\s*"((?:[^"\\]|\\.)*)"/)),
      currency: pick(win, /"amountWithSymbol"\s*:\s*"([^"\d\s.,]+)/)
    };
    const key = it.sku + "|" + it.attr + "|" + it.price;
    if (seen.has(key)) continue;
    seen.add(key); items.push(it);
  }
  return items;
}

function debugInfo(html) {
  const around = (word) => { const out = []; let i = -1; while (out.length < 3 && (i = html.indexOf(word, i + 1)) >= 0) out.push(html.slice(Math.max(0, i - 300), i + 500)); return out; };
  return {
    length: html.length,
    title: pick(html, /<title[^>]*>([^<]*)/i),
    counts: Object.fromEntries(["goods_name", "goods_sn", "salePrice", "retailPrice", "shareInfo", "cartShare", "__NEXT_DATA__", "gbRawData", "captcha", "risk"].map((w) => [w, html.split(w).length - 1])),
    apiUrls: [...new Set((html.match(/["'](\/?(?:api|bff-api|h5)\/[^"'\s]{3,120})["']/g) || []).map((s) => s.slice(1, -1)))].slice(0, 40),
    goodsSnippets: around('"goods_name"'),
    head: html.slice(0, 3000)
  };
}

export default async (req) => {
  const q = new URL(req.url).searchParams, debug = q.has("debug");
  let link = (q.get("url") || "").trim();
  const found = link.match(/https?:\/\/\S+/); if (found) link = found[0];
  let host = "";
  try { host = new URL(link).hostname; } catch { return json({ ok: false, error: "bad_url", message: "الرابط غير صحيح" }, 400); }
  if (!OK_HOST.test(host)) return json({ ok: false, error: "not_shein", message: "هذا ليس رابط سلة من SHEIN" }, 400);
  const trail = [];
  try {
    const r = await fetchFollow(link, trail);
    const items = extract(r.body);
    const out = { ok: items.length > 0, count: items.length, total: Math.round(items.reduce((s, x) => s + x.price * x.qty, 0) * 100) / 100, items, finalUrl: r.finalUrl };
    if (!items.length) { out.error = "no_items"; out.message = "لم نتمكن من قراءة منتجات السلة من هذا الرابط"; }
    if (debug) { out.trail = trail; out.debug = debugInfo(r.body); }
    return json(out);
  } catch (e) {
    return json({ ok: false, error: "fetch_failed", message: "تعذّر الوصول إلى SHEIN", detail: String(e && e.message || e), trail }, 502);
  }
};
