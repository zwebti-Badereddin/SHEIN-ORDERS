// ===== تذكير السداد وتقرير الربح الشهري =====

// ---------- تذكير السداد ----------
var REMIND_TPL="مرحباً {الاسم}،\nنذكّرك بطلبك رقم {الرقم} من {المتجر}.\nالمبلغ المتبقي: {المتبقي} {العملة}\nحالة الطلب: {الحالة}\nشكراً لتعاملك معنا.";
function remTpl(){return has(D.remindTpl)?D.remindTpl:REMIND_TPL}
function remMsg(o){var c=calc(o);return remTpl().replace(/\{الاسم\}/g,o.name||"").replace(/\{الرقم\}/g,fno(o)).replace(/\{المتجر\}/g,STORE.name).replace(/\{المتبقي\}/g,r2(c.rem)).replace(/\{العملة\}/g,D.cur).replace(/\{الحالة\}/g,o.status||"").replace(/\{الإجمالي\}/g,r2(c.tot)).replace(/\{المدفوع\}/g,r2(c.paid))}
function unpaid(){return D.orders.filter(function(o){return o.status!=="مكتمل"&&calc(o).rem>0.009})}
function daysSince(d){if(!d)return null;var t=Date.parse(String(d).slice(0,10)+"T00:00:00");if(isNaN(t))return null;return Math.max(0,Math.floor((Date.parse(today()+"T00:00:00")-t)/864e5))}
function lastPayDate(o){var ds=(o.pays||[]).map(function(p){return p.date}).filter(Boolean).sort();return ds.length?ds[ds.length-1]:(o.bookDate||o.date||"")}
function ago(n){return n===null?"":n===0?"اليوم":n===1?"أمس":n===2?"قبل يومين":n<=10?"قبل "+n+" أيام":"قبل "+n+" يوماً"}
function sendRemind(id){var o=get(id);if(!o)return;var ph=waPhone(o.phone);if(!ph){alert("لا يوجد رقم هاتف لهذا الزبون. أضفه من تعديل الطلب.");return}
 o.remindedAt=today();touch(o);save();window.open("https://wa.me/"+ph+"?text="+encodeURIComponent(remMsg(o)),"_blank");if(view==="remind")render()}
// بطاقة في الرئيسية تظهر حين يوجد مبلغ متبقٍ
function remindBanner(){var L=unpaid();if(!L.length)return"";var sum=L.reduce(function(a,o){return a+calc(o).rem},0);
 return'<button class="remban" onclick="go(\'remind\')"><span class="remico">'+ic("bell")+'</span><span class="remtx"><b>'+L.length+' '+(L.length===1?"زبون عليه":"زبائن عليهم")+' '+money(sum)+'</b><small>أرسل تذكيراً بالسداد عبر واتساب</small></span><span class="remgo">تذكير ‹</span></button>'}
function remindPage(){var L=unpaid().map(function(o){var c=calc(o),d=daysSince(lastPayDate(o)),r=daysSince(o.remindedAt);return{o:o,c:c,d:d,r:r}})
  .sort(function(a,b){return(a.r===0)-(b.r===0)||b.c.rem-a.c.rem}),sum=L.reduce(function(a,x){return a+x.c.rem},0);
 var rows=L.map(function(x){var o=x.o,noPh=!waPhone(o.phone);
  return'<div class="remrow"><div class="remmain"><b>'+esc(o.name)+'</b><small>'+fno(o)+(o.city?' · '+esc(o.city):'')+' · '+esc(o.status)+'</small>'+
  '<small>'+(x.d!==null?'آخر دفعة أو طلب '+ago(x.d):'')+(x.r!==null?' · <span class="ok-t">ذُكّر '+ago(x.r)+'</span>':'')+'</small></div>'+
  '<div class="remside"><b class="rem-t">'+money(x.c.rem)+'</b><button class="btn'+(x.r===0?' sec':'')+'" '+(noPh?'disabled title="لا يوجد رقم هاتف"':'')+' onclick="sendRemind(\''+esc(o.id)+'\')">'+ic("send")+(x.r===0?' مرة أخرى':' تذكير')+'</button></div></div>'}).join("");
 return'<button class="back" onclick="go(\'home\')">‹ رجوع</button><h1>تذكير السداد</h1>'+
 '<div class="card"><div class="line"><span>زبائن عليهم مبالغ</span><b>'+L.length+'</b></div><div class="line big"><span>إجمالي المتبقي</span><span class="rem-t">'+money(sum)+'</span></div></div>'+
 (L.length?'<p class="note">اضغط «تذكير» ليفتح واتساب برسالة جاهزة لكل زبون. من ذُكّر اليوم ينزل إلى آخر القائمة.</p><div class="remlist">'+rows+'</div>':'<div class="empty">لا توجد مبالغ متبقية. كل الطلبات مسددة.</div>')+
 '<details style="margin-top:18px"><summary>نص رسالة التذكير</summary><p class="note">يمكنك تعديل النص. الكلمات بين القوسين تُستبدل تلقائياً: {الاسم} {الرقم} {المتبقي} {العملة} {الحالة} {الإجمالي} {المدفوع} {المتجر}</p>'+
 '<textarea id="remtpl" style="min-height:150px;font-size:14px" oninput="D.remindTpl=this.value;save()">'+esc(remTpl())+'</textarea>'+
 '<div class="bar"><button class="btn sec" onclick="D.remindTpl=\'\';save();render()">استعادة النص الأصلي</button></div>'+
 (L.length?'<label>معاينة لأول زبون</label><div class="card" style="white-space:pre-line;font-size:14px">'+esc(remMsg(L[0].o))+'</div>':'')+'</details>'}

// ---------- تقرير الربح الشهري ----------
var MONTHS=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
function monthKey(o){var d=String((isV3(o)&&o.bookDate)||o.date||"").slice(0,7);return/^\d{4}-\d{2}$/.test(d)?d:"?"}
function monthName(k){if(k==="?")return"بدون تاريخ";var p=k.split("-");return MONTHS[+p[1]-1]+" "+p[0]}
function isDone(o){return o.status==="تم التسليم"||o.status==="مكتمل"}
// ما وفّره الكوبون والنقاط بالدينار، وهو مصدر الربح الأساسي
function saving(o){var r=n(o.rate);if(isV3(o)){var A=acct(o);return A.actual!==null&&A.rate>0?Math.max(0,(A.site-A.actual)*A.rate):0}
 var b=batchForOrder(o);if(n(o.accountingV)>=2||b){var cu=b?batchAllocation(o,b,"coupon"):n(o.couponUsd),pt=b?batchAllocation(o,b,"points"):n(o.pointsUsd);return(cu+pt)*r}return n(o.coupon)}
function monthStats(){var M={};D.orders.forEach(function(o){var k=monthKey(o),c=calc(o),m=M[k]||(M[k]={k:k,n:0,done:0,sales:0,paid:0,real:0,exp:0,unknown:0,save:0});
 m.n++;m.sales+=c.tot;m.paid+=c.paid;m.save+=saving(o);if(c.profit===null)m.unknown++;else if(isDone(o)){m.done++;m.real+=c.profit}else m.exp+=c.profit});
 return Object.keys(M).sort().reverse().map(function(k){return M[k]})}
function pct(a,b){if(!b)return"";var p=Math.round((a-b)/Math.abs(b)*100);return'<span class="'+(p>=0?"ok-t":"rem-t")+'">'+(p>=0?"▲ ":"▼ ")+Math.abs(p)+'%</span> عن الشهر السابق'}
function reportsPage(){var L=monthStats(),cur=today().slice(0,7),dated=L.filter(function(m){return m.k!=="?"}),last6=dated.slice(0,6).reverse(),mx=Math.max.apply(null,last6.map(function(m){return m.real+m.exp}).concat([1]));
 var top=dated[0]||null,prev=dated[1]||null,tot=L.reduce(function(a,m){a.real+=m.real;a.exp+=m.exp;a.save+=m.save;a.n+=m.n;return a},{real:0,exp:0,save:0,n:0});
 var chart=last6.length?'<div class="mchart">'+last6.map(function(m){var h1=Math.round(Math.max(0,m.real)/mx*120),h2=Math.round(Math.max(0,m.exp)/mx*120);
  return'<div class="mcol"><small>'+num(m.real+m.exp)+'</small><div class="mbar"><i class="mexp" style="height:'+h2+'px"></i><i class="mreal" style="height:'+h1+'px"></i></div><span>'+MONTHS[+m.k.split("-")[1]-1]+'</span></div>'}).join("")+'</div>'+
  '<div class="mleg"><span><i class="mreal"></i>ربح محقق</span><span><i class="mexp"></i>ربح متوقع</span></div>':'';
 var cards=L.map(function(m){return'<div class="card mcard'+(m.k===cur?" mnow":"")+'"><div class="line"><b>'+monthName(m.k)+(m.k===cur?' <span class="badge s3">الشهر الحالي</span>':'')+'</b><span>'+m.n+' طلب</span></div>'+
  aline("الربح المحقق ("+m.done+" مسلّم)",'<b class="ok-t">'+money(m.real)+'</b>')+aline("الربح المتوقع (قيد التنفيذ)",money(m.exp))+aline("توفير الكوبونات والنقاط",money(m.save))+aline("المبيعات",money(m.sales))+aline("المقبوض",money(m.paid))+
  (m.unknown?'<p class="note" style="margin:6px 0 0">'+m.unknown+' طلب بلا بيانات تكلفة، فلم يُحسب ربحه.</p>':'')+'</div>'}).join("");
 return'<button class="back" onclick="go(\'home\')">‹ رجوع</button><h1>التقارير</h1>'+
 (top?'<div class="mhero"><small>الربح المحقق في '+monthName(top.k)+'</small><b>'+money(top.real)+'</b><em>'+(prev?pct(top.real,prev.real):'')+'</em></div>':'')+
 '<div class="stats" style="margin-top:10px"><div><span class="sv"><small>كل الربح المحقق</small><b class="ok-t">'+money(tot.real)+'</b></span></div><div><span class="sv"><small>ربح متوقع</small><b>'+money(tot.exp)+'</b></span></div><div><span class="sv"><small>توفير الكوبونات</small><b>'+money(tot.save)+'</b></span></div><div><span class="sv"><small>عدد الطلبات</small><b>'+tot.n+'</b></span></div></div>'+
 (chart?'<h2>آخر الأشهر</h2><div class="card">'+chart+'</div>':'')+
 '<div class="bar"><button class="btn sec" onclick="exportMonths()">تقرير الأشهر PDF</button><button class="btn sec" onclick="exportAll()">تقرير الطلبات PDF</button></div>'+
 '<p class="note">الربح المحقق من الطلبات التي حالتها «تم التسليم» أو «مكتمل»، والمتوقع من الطلبات قيد التنفيذ. الشهر حسب تاريخ الحجز.</p>'+
 (cards||'<div class="empty">لا توجد طلبات بعد.</div>')}
function exportMonths(){var L=monthStats();if(!L.length){alert("لا توجد طلبات");return}
 var rows=L.map(function(m){return'<tr><td>'+monthName(m.k)+'</td><td>'+m.n+'</td><td>'+num(m.sales)+'</td><td>'+num(m.paid)+'</td><td>'+num(m.save)+'</td><td>'+num(m.real)+'</td><td>'+num(m.exp)+'</td></tr>'}).join("");
 var T=L.reduce(function(a,m){["n","sales","paid","save","real","exp"].forEach(function(k){a[k]+=m[k]});return a},{n:0,sales:0,paid:0,save:0,real:0,exp:0});
 pr('<div class="rep-logo"><img src="logo.png" alt=""></div><h1>تقرير الربح الشهري</h1><p>التاريخ: '+today()+'</p><table><thead><tr><th>الشهر</th><th>الطلبات</th><th>المبيعات</th><th>المقبوض</th><th>توفير الكوبونات</th><th>الربح المحقق</th><th>الربح المتوقع</th></tr></thead><tbody>'+rows+
  '</tbody><tfoot><tr><td>المجموع ('+esc(D.cur)+')</td><td>'+T.n+'</td><td>'+num(T.sales)+'</td><td>'+num(T.paid)+'</td><td>'+num(T.save)+'</td><td>'+num(T.real)+'</td><td>'+num(T.exp)+'</td></tr></tfoot></table><p class="note">الربح المحقق من الطلبات المسلّمة أو المكتملة. الشهر حسب تاريخ الحجز.</p>','تقرير-الربح-الشهري-'+today())}
