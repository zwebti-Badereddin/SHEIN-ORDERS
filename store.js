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
