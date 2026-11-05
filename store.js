// ===== صفحة المتجر: سعر الصرف الذي تعرضه حاسبة السلة للزبائن =====
// يُحفظ في public/store ويقرؤه أي زائر للصفحة. لا يكتبه إلا صاحب الحساب الذي أنشأه أول مرة.
var ST={rate:null,ts:0,loaded:false};
function stDoc(){return fdb.doc("public/store")}
function stNum(v){return Number(String(v||"").replace(/[٠-٩]/g,function(d){return"٠١٢٣٤٥٦٧٨٩".indexOf(d)}).replace(/[,٫]/g,".").replace(/[^0-9.]/g,""))||0}
function stInfo(){if(!ST.loaded)return"جارٍ تحميل السعر المعروض…";if(!(ST.rate>0))return"لم يُنشر سعر بعد، والحاسبة في الصفحة تعرض «اسألنا عنه».";
 var d=new Date(n(ST.ts)),p=function(v){return String(v).padStart(2,"0")};
 return"المعروض الآن في الصفحة: "+ST.rate+" د.ل · آخر تحديث "+d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes())}
function stLoad(){if(!auth.currentUser)return;stDoc().get().then(function(s){var x=s.exists?s.data():{};ST.rate=n(x.rate);ST.ts=n(x.ts);ST.loaded=true;stPaint()})
 .catch(function(){ST.loaded=true;var m=document.getElementById("stmsg");if(m)m.textContent="تعذّر قراءة السعر المعروض. تأكد من نشر قواعد Firestore الجديدة."})}
function stPaint(){var m=document.getElementById("stmsg"),i=document.getElementById("strate");if(m)m.textContent=stInfo();if(i&&!i.value&&ST.rate>0)i.value=ST.rate}
function stSave(){var i=document.getElementById("strate"),m=document.getElementById("stmsg"),v=stNum(i&&i.value),u=auth.currentUser;if(!u)return;
 if(!(v>=1&&v<=50)){m.textContent="اكتب سعراً صحيحاً، مثل 7.2";i.focus();return}
 m.textContent="جارٍ النشر…";
 stDoc().set({rate:v,owner:u.uid,ts:Date.now()}).then(function(){ST.rate=v;ST.ts=Date.now();ST.loaded=true;m.textContent="تم. "+stInfo()})
 .catch(function(){m.textContent="تعذّر النشر. تأكد من الإنترنت ومن نشر قواعد Firestore الجديدة."})}
function stHtml(){if(!ST.loaded)setTimeout(stLoad,0);else setTimeout(stPaint,0);
 return'<h2 style="margin-top:14px">صفحة المتجر</h2><label for="strate">سعر الصرف في حاسبة الصفحة (دينار لكل $1)</label>'+
 '<div class="bar"><input id="strate" inputmode="decimal" dir="ltr" placeholder="7.2" style="flex:1"><button class="btn" onclick="stSave()">نشر في الصفحة</button></div>'+
 '<p class="note" id="stmsg">'+esc(stInfo())+'</p>'}

// ===== عداد زوار صفحة المتجر وضغطات «أرسل الطلب» =====
// مستند لكل يوم في stats/{YYYY-MM-DD} بتوقيت طرابلس. الزائر يُحسب مرة واحدة في اليوم لكل هاتف.
var SS=null;
function ssDay(off){var d=new Date(Date.now()-off*864e5);try{return d.toLocaleDateString("en-CA",{timeZone:"Africa/Tripoli"})}catch(e){return d.toISOString().slice(0,10)}}
function ssLoad(){var el=document.getElementById("ssbox");if(!el||!auth.currentUser)return;el.innerHTML='<div class="note">جارٍ تحميل الأرقام…</div>';
 fdb.collection("stats").where(firebase.firestore.FieldPath.documentId(),">=",ssDay(29)).get().then(function(qs){
  var m={};qs.forEach(function(d){m[d.id]=d.data()});SS=m;ssPaint()})
 .catch(function(){el.innerHTML='<div class="note">تعذّر تحميل الأرقام. تأكد من نشر قواعد Firestore الجديدة، ومن نشر سعر الصرف مرة واحدة على الأقل من هذا الحساب.</div>'})}
function ssSum(days,f){var t=0;for(var i=0;i<days;i++){var x=SS[ssDay(i)];if(x)t+=n(x[f])}return t}
function ssPaint(){var el=document.getElementById("ssbox");if(!el||!SS)return;
 var rows=[["اليوم",1],["آخر 7 أيام",7],["آخر 30 يوماً",30]];
 el.innerHTML='<div class="sstab"><span></span><b>زوار</b><b>ضغطوا «أرسل الطلب»</b>'+rows.map(function(r){var v=ssSum(r[1],"visits"),o=ssSum(r[1],"orders");
  return'<span>'+r[0]+'</span><b>'+v+'</b><b>'+o+(v>0&&o>0?' <small>('+Math.round(o/v*100)+'%)</small>':'')+'</b>'}).join("")+'</div>'+
  '<p class="note">الزائر يُحسب مرة واحدة في اليوم لكل هاتف. ضغطة «أرسل الطلب» تعني أن واتساب فُتح برسالة الطلب، وليس أن الطلب تم.</p>'}
function ssHtml(){setTimeout(SS?ssPaint:ssLoad,0);
 return'<h2 style="margin-top:14px">زوار صفحة المتجر</h2><div id="ssbox"></div><button class="btn sec full" onclick="ssLoad()">تحديث الأرقام</button>'}
