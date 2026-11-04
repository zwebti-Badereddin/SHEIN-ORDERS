// ===== النسخ الاحتياطي: نسخة يومية تلقائية في الحساب، واستعادة، وتنزيل ملف =====
// النسخ في users/{uid}/backups/{التاريخ}، ويُحتفظ بآخر 30 نسخة. تعمل على خطة Firebase المجانية.
var BK_KEEP=30;
function bkCol(){var u=typeof auth!=="undefined"&&auth.currentUser;return u?fdb.collection("users/"+u.uid+"/backups"):null}
function bkKey(){var u=auth.currentUser;return"shein_bk_"+(u?u.uid:"x")}
// نسخة واحدة في اليوم تمثّل البيانات عند أول مزامنة في ذلك اليوم، فلا يمسحها خطأ يحدث لاحقاً في نفس اليوم
function bkAuto(){var col=bkCol();if(!col||!D||!Array.isArray(D.orders)||!D.orders.length)return;
 if(cloud.busy||cloud.timer){setTimeout(bkAuto,3000);return}
 var day=today();if(lsGet(bkKey())===day)return;var ref=col.doc(day);
 ref.get().then(function(s){if(s.exists){lsSet(bkKey(),day);return}
  return ref.set({json:JSON.stringify(D),ts:Date.now(),count:D.orders.length}).then(function(){lsSet(bkKey(),day);return bkPrune(col)})}).catch(function(){})}
function bkPrune(col){return col.get().then(function(qs){var L=qs.docs.map(function(d){return{id:d.id,ts:n(d.data().ts)}}).sort(function(a,b){return b.ts-a.ts});
 return Promise.all(L.slice(BK_KEEP).map(function(x){return col.doc(x.id).delete()}))})}
function bkLabel(x){var d=new Date(n(x.ts)),p=function(v){return String(v).padStart(2,"0")},t=d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes());
 return x.safety?"قبل الاستعادة · "+t:x.id}
function bkList(){var el=document.getElementById("bklist"),col=bkCol();if(!el)return;if(!col){el.innerHTML='<div class="note">سجّل الدخول أولاً.</div>';return}
 el.innerHTML='<div class="note">جارٍ تحميل النسخ…</div>';
 col.get().then(function(qs){var L=qs.docs.map(function(d){var x=d.data();return{id:d.id,ts:n(x.ts),count:n(x.count),safety:!!x.safety}}).sort(function(a,b){return b.ts-a.ts});
  el.innerHTML=L.length?L.map(function(x){return'<div class="line bkrow"><span><bdi dir="ltr">'+esc(bkLabel(x))+'</bdi> · '+x.count+' طلب</span><button class="btn sec" onclick="bkRestore(\''+esc(x.id)+'\')">استعادة</button></div>'}).join(""):
  '<div class="note">لا توجد نسخ تلقائية بعد. تُنشأ أول نسخة تلقائياً اليوم، ثم نسخة كل يوم تفتح فيه التطبيق.</div>'})
 .catch(function(){el.innerHTML='<div class="note">تعذّر تحميل النسخ. تأكد من اتصال الإنترنت.</div>'})}
function bkRestore(id){var col=bkCol();if(!col)return;
 col.doc(id).get().then(function(s){if(!s.exists){alert("لم تعد هذه النسخة موجودة");return}var x=s.data(),d;try{d=JSON.parse(x.json)}catch(e){alert("النسخة تالفة");return}
  if(confirm("استعادة "+n(x.count)+" طلب من نسخة "+bkLabel({id:id,ts:x.ts,safety:x.safety})+"؟\nستُستبدل البيانات الحالية، وتُحفظ نسخة منها أولاً."))bkApply(d,"تمت الاستعادة. البيانات السابقة محفوظة في نسخة «قبل الاستعادة».")})
 .catch(function(){alert("تعذّر تحميل النسخة. تأكد من اتصال الإنترنت.")})}
// قبل أي استعادة تُحفظ البيانات الحالية في نسخة «قبل الاستعادة» للتراجع عند الخطأ
function bkApply(d,msg){if(!d||!Array.isArray(d.orders)){alert("البيانات غير صالحة");return}
 var col=bkCol(),safe=col?col.doc("restore-"+Date.now()).set({json:JSON.stringify(D),ts:Date.now(),count:(D.orders||[]).length,safety:true}).then(function(){return bkPrune(col)}).catch(function(){}):Promise.resolve();
 safe.then(function(){var now=Date.now();if(!Array.isArray(d.batches))d.batches=[];d.del=d.del||{};
  // الطلبات المستعادة تُعلَّم بوقت الآن حتى لا تحذفها سجلات حذف أقدم على جهاز آخر
  d.orders.forEach(function(o){o.mts=now;delete d.del[o.id]});d.batches.forEach(function(b){b.mts=now;delete d.del[b.id]});
  if(!d.cur)d.cur="د.ل";D=d;save();view="home";render();window.scrollTo(0,0);if(msg)alert(msg)})}
function bkDownload(){var b=new Blob([JSON.stringify(D)],{type:"application/json"}),name="نسخة-احتياطية-الطلبات-"+today()+".json";
 if(typeof qSend==="function")qSend(b,name);else{var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click()}}
function bkFile(inp){var f=inp.files&&inp.files[0];inp.value="";if(!f)return;
 f.text().then(function(t){var d;try{d=JSON.parse(t)}catch(e){alert("الملف غير صالح");return}if(!d||!Array.isArray(d.orders)){alert("هذا الملف ليس نسخة احتياطية من التطبيق");return}
  if(confirm("استعادة "+d.orders.length+" طلب من الملف؟\nستُستبدل البيانات الحالية، وتُحفظ نسخة منها أولاً."))bkApply(d,"تمت الاستعادة من الملف.")})}
function bkHtml(){var last=lsGet(bkKey());
 return'<h2 style="margin-top:14px">النسخ الاحتياطي</h2><p class="note">يحفظ التطبيق نسخة تلقائية من الطلبات كل يوم في حسابك، ويحتفظ بآخر '+BK_KEEP+' نسخة.'+(last?' آخر نسخة: <bdi dir="ltr">'+esc(last)+'</bdi>':'')+'</p>'+
 '<div class="bar"><button class="btn sec" onclick="bkDownload()">تنزيل نسخة</button><label class="btn sec qpick bkpick"><input type="file" accept=".json,application/json" onchange="bkFile(this)">استعادة من ملف</label></div>'+
 '<button class="btn sec full" onclick="bkList()">عرض النسخ التلقائية</button><div id="bklist" style="margin-top:8px"></div>'}
