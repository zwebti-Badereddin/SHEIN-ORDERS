// يقرأ سلة SHEIN المشتركة من رابطها ويعيد المنتجات وأسعارها.
// الاستخدام: /.netlify/functions/cart?url=<رابط السلة>   (أضف &debug=1 لرؤية ما وصل من SHEIN كما هو)
const UA = "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const OK_HOST = /(^|\.)(shein\.com|shein\.top|sheingroup\.com|shein\.co\.uk|onelink\.me)$/i;
const ASSET_HOST = /(^|\.)ltwebstatic\.com$/i;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "no-store" }
});

// يتبع التحويلات يدوياً ليسجل كل خطوة، ويفك الروابط المضمَّنة (link= / url=) في روابط المشاركة
// الكوكيز التي يضعها SHEIN تُرسل مع الطلبات التالية في نفس العملية
function jarHeader(jar) { return Object.entries(jar).map(([k, v]) => k + "=" + v).join("; "); }
function jarStore(jar, res) {
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []);
  for (const c of list) { const m = c.match(/^\s*([^=;\s]+)=([^;]*)/); if (m) jar[m[1]] = m[2]; }
}

async function fetchFollow(start, trail, jar = {}) {
  let url = start, res, body = "";
  for (let i = 0; i < 8; i++) {
    const host = new URL(url).hostname;
    if (!OK_HOST.test(host)) { trail.push({ url, stop: "host not allowed" }); break; }
    res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA, "accept": "text/html,application/json;q=0.9,*/*;q=0.8", "accept-language": "en-US,en;q=0.9", ...(Object.keys(jar).length ? { cookie: jarHeader(jar) } : {}) } });
    jarStore(jar, res);
    trail.push({ url, status: res.status });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) { url = new URL(loc, url).href; continue; }
    body = await res.text();
    // صفحات القفز (sharejump) تحمل الرابط الحقيقي في معامل أو داخل الصفحة
    const inner = new URL(url).searchParams.get("link") || new URL(url).searchParams.get("url");
    if (inner && /^https?:/i.test(inner) && i < 7 && !/goods_name/.test(body)) { url = inner; continue; }
    // صفحة onelink تضع الرابط التالي في <input id="url" value="..."> ثم تنتقل إليه بالجافاسكربت
    const iv = body.match(/<input[^>]*id=["']url["'][^>]*value=["']([^"']+)["']/i) || body.match(/<input[^>]*value=["']([^"']+)["'][^>]*id=["']url["']/i);
    if (iv && !/goods_name/.test(body) && i < 7) { url = iv[1].replace(/&amp;/g, "&"); continue; }
    const m = body.match(/(?:location\.(?:href|replace)\s*\(?\s*=?\s*|http-equiv=["']refresh["'][^>]*url=)["']?(https?:\/\/[^"'\s<>)]+)/i);
    if (m && !/goods_name/.test(body) && i < 7) { url = m[1].replace(/\\u002F/g, "/").replace(/\\\//g, "/"); continue; }
    break;
  }
  return { finalUrl: url, status: res && res.status, body };
}

const num = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")); return isFinite(n) ? n : 0; };
const pick = (s, re) => { const m = s.match(re); return m ? m[1] : ""; };
const unesc = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };

// صفحة appjump تحمل shareInfo (رقم مجموعة السلة والدولة)، وتنقل الجوال إلى:
// <موقع الدولة>/cart/share/landing?shc=..&group_id=..&local_country=..&url_from=..&cart_share=1
function cartLanding(html, fromUrl) {
  const i = html.search(/shareInfo\s*=\s*\{/); if (i < 0) return null;
  let info; try { info = JSON.parse(enclosing(html, html.indexOf("{", i) + 1)); } catch { return null; }
  if (!/cart/.test(info.share_type || "")) return null;
  const lc = info.localcountry || "";
  // موقع الجوال الخاص بالدولة: نبحث في الصفحة عن عنصر فيه siteUrl ويذكر رمز الدولة
  const sites = []; const re = /"?siteUrl"?\s*:\s*["']([^"']+)["']/g; let m;
  while ((m = re.exec(html))) { const obj = enclosing(html, m.index); sites.push({ site: m[1], hit: lc && new RegExp("[\"']" + lc + "[\"']").test(obj) }); }
  const hit = sites.find((x) => x.hit);
  let shc = ""; try { shc = new URL(info.originalUrl || fromUrl).searchParams.get("shc") || ""; } catch {}
  const qs = `/cart/share/landing?shc=${encodeURIComponent(shc)}&group_id=${encodeURIComponent(info.id)}&local_country=${encodeURIComponent(lc)}&url_from=${encodeURIComponent(info.url_from || "")}${info.cart_share ? "&cart_share=" + info.cart_share : ""}`;
  const bases = [...new Set([hit && "https://" + hit.site.replace(/^https?:\/\//, ""), "https://m.shein.com/ar", "https://m.shein.com"].filter(Boolean))];
  return { info: { id: info.id, localcountry: lc, url_from: info.url_from, cart_share: info.cart_share }, sites: sites.slice(0, 30), urls: bases.map((b) => b.replace(/\/$/, "") + qs) };
}

// طلب منتجات السلة المشتركة كما تفعل صفحة SHEIN: POST {langPath}/bff-api/order/cart/share/landing
// مع AppCurrency وAppLanguage وx-csrf-token. نجرب عدة أشكال لأسماء الحقول حتى يرد بمنتجات.
async function bffLanding(landingUrl, info, jar, attempts, pageHtml) {
  const u = new URL(landingUrl), lang = (u.pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//i) || [])[1] || "";
  const base = u.origin + (lang ? "/" + lang : "") + "/bff-api";
  const csrf = (pageHtml.match(/csrf_token["']?\s*[:=]\s*["']([^"']+)["']/) || [])[1] || "";
  const appLang = (pageHtml.match(/appLanguage["']?\s*[:=]\s*["']([^"']+)["']/) || [])[1] || lang || "en";
  const headers = { "user-agent": UA, "accept": "application/json, text/plain, */*", "x-requested-with": "XMLHttpRequest", "referer": landingUrl, "origin": u.origin,
    "AppCurrency": "USD", "AppLanguage": appLang, ...(csrf ? { "x-csrf-token": csrf } : {}), ...(Object.keys(jar).length ? { cookie: jarHeader(jar) } : {}) };
  const id = String(info.id), lc = info.localcountry || "", uf = info.url_from || "";
  // الشكل الذي نجح مع SHEIN: {groupId, localCountry} بصيغة JSON؛ البقية احتياط إن تغيّر
  const variants = [
    { groupId: id, localCountry: lc },
    { group_id: id, local_country: lc },
    { group_id: id, local_country: lc, url_from: uf, cart_share: String(info.cart_share || 1) },
    { group_id: id, localcountry: lc },
    { share_id: id, local_country: lc },
    { group_id: id }
  ];
  for (const v of variants) {
    for (const enc of (v.groupId ? ["json"] : ["json", "form"])) {
      const body = enc === "json" ? JSON.stringify(v) : new URLSearchParams(v).toString();
      const url = base + "/order/cart/share/landing?_ver=1.1.8&_lang=" + encodeURIComponent(appLang);
      try {
        const res = await fetch(url, { method: "POST", headers: { ...headers, "content-type": enc === "json" ? "application/json" : "application/x-www-form-urlencoded" }, body });
        jarStore(jar, res);
        const text = await res.text();
        const items = extract(text).length ? extract(text) : walkItems(text);
        attempts.push({ enc, body: v, status: res.status, length: text.length, items: items.length, head: text.slice(0, items.length ? 300 : 2500) });
        if (items.length) { try { const j = JSON.parse(text), np = j.info && (j.info.normalProducts || [])[0]; if (np) attempts.sample = JSON.stringify(np).slice(0, 6000); } catch {} }
        if (items.length) return items;
        if (text.length > 200) return items; // رد فيه بيانات لكن لم نتعرف على شكلها: نتوقف لنراه
      } catch (e) { attempts.push({ enc, body: v, error: e.message }); }
    }
  }
  return [];
}

// اللون/المقاس: نجرب الحقول المعروفة، ثم أي قائمة خصائص فيها attr_value_name
function attrOf(o) {
  const direct = o.attr_value_en || o.attr_value || o.goods_attr || o.goodsAttr || o.attrValue || o.saleAttrDesc || o.sku_sale_attr_desc;
  if (typeof direct === "string" && direct) return direct;
  const lists = [o.sku_sale_attr, o.skuSaleAttr, o.attr, o.saleAttrs, o.product && o.product.sku_sale_attr].filter(Array.isArray);
  for (const L of lists) { const v = L.map((a) => a && (a.attr_value_name || a.attrValueName || a.attr_value || a.value)).filter(Boolean); if (v.length) return v.join(" / "); }
  if (o.attr && typeof o.attr === "object" && !Array.isArray(o.attr)) { const v = o.attr.attr_value_en || o.attr.attr_value || o.attr.attr_value_name; if (v) return v; }
  return "";
}

// قراءة عامة لأي رد JSON: كل كائن فيه اسم منتج وسعر
function walkItems(text) {
  let j; try { j = JSON.parse(text); } catch { return []; }
  const out = [], seen = new Set();
  const price = (o) => { for (const k of ["salePrice", "sale_price", "unitPrice", "price", "priceInfo"]) { const v = o[k]; if (v == null) continue; if (typeof v === "object") { const n = num(v.usdAmount ?? v.amount ?? v.price ?? (v.salePrice && (v.salePrice.usdAmount ?? v.salePrice.amount))); if (n) return n; } else if (num(v)) return num(v); } return 0; };
  const walk = (o, d) => {
    if (!o || typeof o !== "object" || d > 12) return;
    if (Array.isArray(o)) { o.forEach((x) => walk(x, d + 1)); return; }
    const name = o.goods_name || o.goodsName || o.productName || o.product_name;
    const p = name ? price(o) : 0;
    if (name && p) {
      const it = { name, sku: o.goods_sn || o.goodsSn || o.sku_code || "", price: p, orig: num((o.retailPrice && (o.retailPrice.usdAmount ?? o.retailPrice.amount)) || o.retail_price), qty: Math.max(1, num(o.quantity) || 1),
        attr: attrOf(o), img: o.goods_img || o.goodsImg || "" };
      const key = it.sku + "|" + it.attr + "|" + it.price; if (!seen.has(key)) { seen.add(key); out.push(it); }
    }
    Object.values(o).forEach((x) => walk(x, d + 1));
  };
  walk(j, 0); return out;
}

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

// يبحث في صفحة السلة وملفات الجافاسكربت التابعة لها عن مسارات الطلبات التي تخص مشاركة السلة
async function apiContext(html) {
  const uniq = (a) => [...new Set(a)];
  const allJs = uniq((html.match(/(?:https?:)?\/\/[a-z0-9.-]*ltwebstatic\.com\/[^"'\s<>]+?\.js/gi) || []).map((u) => (u.startsWith("//") ? "https:" + u : u)));
  const out = {};
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 6000);
  await Promise.all(allJs.slice(0, 90).map(async (u) => {
    try {
      const t = await (await fetch(u, { headers: { "user-agent": UA }, signal: ctl.signal })).text();
      const name = u.split("/").pop(), hits = [];
      for (const w of ["fetchCartShareLanding(", "fetchCartShareLanding)", ".fetchCartShareLanding"]) {
        let i = -1, n = 0;
        while (n < 2 && (i = t.indexOf(w, i + 1)) >= 0) { hits.push({ w, s: t.slice(Math.max(0, i - 1200), i + 600) }); n++; }
      }
      if (hits.length) out[name] = hits.slice(0, 3);
    } catch {}
  }));
  clearTimeout(timer);
  return out;
}

async function discover(html) {
  const uniq = (a) => [...new Set(a)];
  const shareStrings = uniq((html.match(/["'`][^"'`\s<>]{0,120}(?:share|landing)[^"'`\s<>]{0,120}["'`]/gi) || []).map((x) => x.slice(1, -1))).slice(0, 80);
  const assetRe = /(?:https?:)?\/\/[a-z0-9.-]*ltwebstatic\.com\/[^"'\s<>]+?\.js/gi;
  const allJs = uniq((html.match(assetRe) || []).map((u) => (u.startsWith("//") ? "https:" + u : u)));
  const chunkNames = uniq((html.match(/[\w-]*(?:cart|share|landing)[\w-]*\.[0-9a-f]{6,}\.js|[\w-]*(?:cart|share|landing)[\w-]*-[0-9a-f]{8,}\.js/gi) || [])).slice(0, 60);
  const candidates = allJs.filter((u) => /cart|share|landing/i.test(u.split("/").pop())).slice(0, 8);
  const found = {};
  for (const u of candidates) {
    try {
      if (!ASSET_HOST.test(new URL(u).hostname)) continue;
      const t = await (await fetch(u, { headers: { "user-agent": UA } })).text();
      found[u.split("/").pop()] = uniq((t.match(/["'`](\/(?:bff-api|api|h5)\/[^"'`\s]{3,160})["'`]/g) || []).map((x) => x.slice(1, -1)).filter((x) => /share|landing|group/i.test(x))).slice(0, 40);
    } catch (e) { found[u] = "fetch failed: " + e.message; }
  }
  // ملف runtime يحوي خريطة أسماء ملفات الصفحات: نبحث فيه عن ملفات صفحة مشاركة السلة ونقرؤها
  const runtimeInfo = {};
  const rt = allJs.find((u) => /\/runtime-[0-9a-f]+\.js/.test(u));
  if (rt) {
    try {
      const t = await (await fetch(rt, { headers: { "user-agent": UA } })).text();
      runtimeInfo.length = t.length;
      const names = {}; let m; const re = /(\d+)\s*:\s*"([\w-]*(?:share|landing)[\w-]*)"/gi;
      while ((m = re.exec(t))) names[m[1]] = m[2];
      runtimeInfo.names = names;
      const base = rt.slice(0, rt.lastIndexOf("/") + 1);
      runtimeInfo.chunks = [];
      for (const [id, name] of Object.entries(names).slice(0, 10)) {
        const hm = t.match(new RegExp("[,{]\\s*" + id + "\\s*:\\s*\"([0-9a-f]{16,24})\"", "g")) || [];
        for (const h of hm.slice(0, 3)) {
          const hash = h.match(/"([0-9a-f]+)"/)[1];
          for (const url of [base + name + "." + hash + ".js", base + name + "-" + hash + ".js"]) {
            try {
              const rr = await fetch(url, { headers: { "user-agent": UA } });
              if (!rr.ok) { runtimeInfo.chunks.push({ url, status: rr.status }); continue; }
              const ct = await rr.text();
              runtimeInfo.chunks.push({ url, status: rr.status, length: ct.length,
                apis: uniq((ct.match(/["'`](\/(?:bff-api|api|h5)\/[^"'`\s]{3,160})["'`]/g) || []).map((x) => x.slice(1, -1))).slice(0, 60),
                around: (() => { const i = ct.search(/group_id/); return i < 0 ? "" : ct.slice(Math.max(0, i - 800), i + 800); })() });
            } catch (e) { runtimeInfo.chunks.push({ url, error: e.message }); }
          }
        }
      }
      // النص الكامل لملف صفحة مشاركة السلة (صغير)، لنرى من أين تجلب المنتجات
      const bff = runtimeInfo.chunks.find((c) => /cart_share_bff\./.test(c.url) && c.status === 200);
      if (bff) { try { runtimeInfo.cartShareBffText = (await (await fetch(bff.url, { headers: { "user-agent": UA } })).text()).slice(0, 9000); } catch {} }
      runtimeInfo.sample = (() => { const i = t.search(/share/i); return i < 0 ? "" : t.slice(Math.max(0, i - 400), i + 600); })();
    } catch (e) { runtimeInfo.error = e.message; }
  }
  // كل ملفات الصفحة بالتوازي: نجمع كل مسار يحتوي share (مثل /order/cart/share/...)
  const shareApis = {};
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 6000);
  await Promise.all(allJs.slice(0, 90).map(async (u) => {
    try {
      if (!ASSET_HOST.test(new URL(u).hostname)) return;
      const t = await (await fetch(u, { headers: { "user-agent": UA }, signal: ctl.signal })).text();
      const hits = uniq((t.match(/["'`](\/[\w\-/]*(?:share|group_?id)[\w\-/]*)["'`]/gi) || []).map((x) => x.slice(1, -1))).filter((x) => x.length > 6 && x.split("/").length > 2);
      if (hits.length) shareApis[u.split("/").pop()] = hits.slice(0, 30);
    } catch {}
  }));
  clearTimeout(timer);
  return { shareApis, runtime: rt, runtimeInfo, jsCount: allJs.length, chunkNames, apiInChunks: found,
    manifestHint: (() => { const i = html.search(/resourceManiFest|_whenLoadChunkNameMap/); return i < 0 ? "" : html.slice(i, i + 3000); })() };
}

function debugInfo(html) {
  const around = (word) => { const out = []; let i = -1; while (out.length < 3 && (i = html.indexOf(word, i + 1)) >= 0) out.push(html.slice(Math.max(0, i - 300), i + 500)); return out; };
  return {
    length: html.length,
    title: pick(html, /<title[^>]*>([^<]*)/i),
    counts: Object.fromEntries(["goods_name", "goods_sn", "salePrice", "retailPrice", "shareInfo", "cartShare", "__NEXT_DATA__", "gbRawData", "captcha", "risk"].map((w) => [w, html.split(w).length - 1])),
    apiUrls: [...new Set((html.match(/["'](\/?(?:api|bff-api|h5)\/[^"'\s]{3,120})["']/g) || []).map((s) => s.slice(1, -1)))].slice(0, 40),
    goodsSnippets: around('"goods_name"'),
    // صفحة appjump: نحتاج تعريف shareInfo ودالة toCartPage لنعرف أين تنتقل
    shareInfoSnippet: (() => { const i = html.search(/shareInfo\s*=\s*[{J]/); return i < 0 ? "" : html.slice(i, i + 3000); })(),
    toCartPage: (() => { const i = html.search(/function\s+toCartPage/); return i < 0 ? "" : html.slice(i, i + 2500); })(),
    jumpHelpers: ["function getCurrentHost", "function getHost", "function toShowDetailPage", "function handleJumpDeeplink", "M_HOST", "PC_HOST", "localcountry"].map((w) => { const i = html.indexOf(w); return i < 0 ? null : { w, s: html.slice(Math.max(0, i - 200), i + 1200) }; }).filter(Boolean),
    globals: [...new Set((html.match(/window\.[A-Za-z_$][\w$]*\s*=/g) || []).map((x) => x.replace(/\s*=$/, "")))].slice(0, 40),
    scripts: (html.match(/<script[^>]+src=["'][^"']+["']/gi) || []).map((x) => x.replace(/^.*src=["']/i, "").replace(/["']$/, "")).slice(0, 20),
    head: html.slice(0, 2500),
    tail: html.length > 2500 ? html.slice(-2500) : ""
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
    const jar = {}, bffAttempts = [];
    let r = await fetchFollow(link, trail, jar);
    let items = extract(r.body), landing = null, firstLanding = null;
    if (!items.length) {
      landing = cartLanding(r.body, r.finalUrl);
      if (landing) {
        // نفتح صفحة السلة أولاً لنأخذ كوكيز الموقع، ثم نطلب المنتجات من نفس الطلب الذي تستخدمه الصفحة
        firstLanding = await fetchFollow(landing.urls[0], trail, jar);
        items = extract(firstLanding.body);
        if (!items.length) items = await bffLanding(landing.urls[0], landing.info, jar, bffAttempts, firstLanding.body);
        r = firstLanding;
      }
    }
    // صفحة السلة تطبيق جافاسكربت يجلب المنتجات بطلب منفصل؛ في وضع التشخيص نبحث عن اسم هذا الطلب في ملفات الصفحة
    if (!items.length && debug && firstLanding) { r = firstLanding; }
    const out = { ok: items.length > 0, count: items.length, total: Math.round(items.reduce((s, x) => s + x.price * x.qty, 0) * 100) / 100, items, finalUrl: r.finalUrl };
    if (!items.length) { out.error = "no_items"; out.message = "لم نتمكن من قراءة منتجات السلة من هذا الرابط"; }
    if (debug) {
      out.csrfInPage = firstLanding ? /csrf_token/.test(firstLanding.body) : null;
      out.trail = trail; out.landing = landing && landing.info; out.bffAttempts = bffAttempts; out.productSample = bffAttempts.sample || ""; out.cookies = Object.keys(jar);
      if (!items.length && firstLanding) out.apiContext = await apiContext(firstLanding.body);
    }
    return json(out);
  } catch (e) {
    return json({ ok: false, error: "fetch_failed", message: "تعذّر الوصول إلى SHEIN", detail: String(e && e.message || e), trail }, 502);
  }
};
