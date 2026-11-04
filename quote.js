// ===== الفاتورة المبدئية: حساب إجمالي سلة الزبون قبل الطلب ومشاركتها صورةً أو PDF =====
var quote=null;
function qLoad(){try{var s=localStorage.getItem("shein_quote");if(s)return JSON.parse(s)}catch(e){}return null}
function qKeep(){try{localStorage.setItem("shein_quote",JSON.stringify(quote))}catch(e){}}
function qNew(){quote={name:"",phone:"",rate:D.rate||"",shipFee:"",items:[]};qKeep()}
function openQuote(){quote=quote||qLoad();if(!quote)qNew();if(!has(quote.rate))quote.rate=D.rate||"";go("quote")}
function qTotals(){var q=quote,usd=0,pcs=0;q.items.forEach(function(i){var k=n(has(i.qty)?i.qty:1);usd+=k*n(i.usd);pcs+=k});
 var r=n(q.rate),lyd=usd*r,fee=n(q.shipFee);return{usd:usd,pcs:pcs,rate:r,lyd:lyd,fee:fee,total:lyd+fee}}
function qRow(it,i){return'<div class="qrow"><input class="qd" placeholder="المنتج (اختياري)" value="'+esc(it.desc)+'" oninput="quote.items['+i+'].desc=this.value;qKeep()">'+
 '<input class="qq" inputmode="numeric" aria-label="الكمية" value="'+esc(has(it.qty)?it.qty:1)+'" oninput="quote.items['+i+'].qty=this.value;qUpd()">'+
 '<input class="qp" inputmode="decimal" dir="ltr" placeholder="$" aria-label="السعر بالدولار" value="'+esc(it.usd)+'" oninput="quote.items['+i+'].usd=this.value;qUpd()">'+
 '<button class="x" onclick="qDel('+i+')" aria-label="حذف">'+ic("x")+'</button></div>'}
function quotePage(){var q=quote,t=qTotals();
 return'<button class="back" onclick="go(\'home\')">‹ رجوع</button><h1>فاتورة مبدئية</h1>'+
 '<p class="note">اكتب أسعار منتجات السلة بالدولار كما تظهر في الموقع، فيحسب التطبيق الإجمالي بالدينار ويجهّز فاتورة بالشعار ورقم الهاتف لإرسالها للزبون.</p>'+
 '<div class="row"><div><label>اسم الزبون</label><input value="'+esc(q.name)+'" oninput="quote.name=this.value;qKeep()"></div><div><label>رقم الهاتف</label><input inputmode="tel" dir="ltr" value="'+esc(q.phone)+'" oninput="quote.phone=this.value;qKeep()"></div></div>'+
 '<label>إضافة سريعة: الصق أو اكتب الأسعار مفصولة بمسافة أو سطر جديد</label><div class="row"><div style="flex:3"><input id="qbulk" dir="ltr" inputmode="decimal" placeholder="34.34 39.40 30.97 21.02"></div><div style="flex:1"><button class="btn sec" style="width:100%" onclick="qBulk()">إضافة</button></div></div>'+
 '<h2>منتجات السلة</h2><div class="qhead"><span>المنتج</span><span>الكمية</span><span>السعر</span><span></span></div><div id="qitems">'+(q.items.length?q.items.map(qRow).join(""):'<div class="empty" style="padding:12px">لا توجد منتجات بعد.</div>')+'</div>'+
 '<div class="bar"><button class="btn sec" onclick="qAdd()">+ إضافة منتج</button></div>'+
 '<div class="row"><div><label>سعر الصرف اليوم</label><input inputmode="decimal" value="'+esc(q.rate)+'" oninput="quote.rate=this.value;qUpd()"></div><div><label>رسوم الشحن على الزبون ('+esc(D.cur)+')</label><input inputmode="decimal" value="'+esc(q.shipFee)+'" placeholder="اختياري" oninput="quote.shipFee=this.value;qUpd()"></div></div>'+
 '<div class="card" style="margin-top:14px" id="qsum">'+qSum(t)+'</div>'+
 '<div class="bar"><button class="btn" onclick="qShare(\'jpg\')">إرسال صورة</button><button class="btn" onclick="qShare(\'pdf\')">إرسال PDF</button></div>'+
 '<div id="qprev"></div>'+
 '<div class="bar"><button class="btn sec" onclick="qToOrder()">تحويل إلى طلب</button><button class="btn bad" onclick="if(confirm(\'مسح الفاتورة المبدئية والبدء من جديد؟\')){qNew();render()}">فاتورة جديدة</button></div>'}
function qSum(t){return aline("عدد المنتجات",t.pcs)+aline("إجمالي السلة",'<span dir="ltr">'+usd2(t.usd)+'</span>')+aline("قيمة السلة بالدينار",t.rate>0?money(t.lyd):"اكتب سعر الصرف")+(t.fee>0?aline("رسوم الشحن",money(t.fee)):"")+
 '<div class="line big"><span>الإجمالي المطلوب</span><span>'+(t.rate>0?money(t.total):"—")+'</span></div>'}
function qUpd(){qKeep();var e=document.getElementById("qsum");if(e)e.innerHTML=qSum(qTotals())}
function qRedraw(){var e=document.getElementById("qitems");if(e)e.innerHTML=quote.items.length?quote.items.map(qRow).join(""):'<div class="empty" style="padding:12px">لا توجد منتجات بعد.</div>';qUpd()}
function qAdd(){quote.items.push({desc:"",qty:1,usd:""});qRedraw();var l=document.querySelectorAll("#qitems .qp");if(l.length)l[l.length-1].focus()}
function qDel(i){quote.items.splice(i,1);qRedraw()}
function qBulk(){var e=document.getElementById("qbulk"),m=String(e.value).replace(/[٠-٩]/g,function(d){return"٠١٢٣٤٥٦٧٨٩".indexOf(d)}).replace(/٫/g,".").match(/\d+(?:[.,]\d+)?/g);
 if(!m){alert("لم أجد أسعاراً في النص");return}m.forEach(function(v){quote.items.push({desc:"",qty:1,usd:v.replace(",",".")})});e.value="";qRedraw()}
function qToOrder(){var t=qTotals();if(!quote.items.length){alert("أضف منتجات أولاً");return}newOrder();
 draft.name=quote.name;draft.phone=quote.phone;draft.rate=quote.rate||draft.rate;draft.shipFee=quote.shipFee;draft.usd=Math.round(t.usd*100)/100;draft.pcs=t.pcs;
 draft.items=quote.items.map(function(i){return{link:"",spec:i.desc||"",qty:has(i.qty)?i.qty:1,priceUsd:i.usd}});render();calcP()}
// الأرقام والتواريخ داخل نص عربي تُعزل باتجاه يسار-يمين حتى لا تنقلب
function ltr(t){return"\u2066"+t+"\u2069"}
function usd2(v){return"$"+n(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
function qNo(){var d=new Date(),p=function(x){return String(x).padStart(2,"0")};return"Q"+String(d.getFullYear()).slice(2)+p(d.getMonth()+1)+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes())}

// رسم الفاتورة على لوحة صورة بعرض 1080 بكسل
function qImg(i){return new Promise(function(res){var m=new Image();m.onload=function(){res(m)};m.onerror=function(){res(null)};m.src=i})}
function qCanvas(){var q=quote,t=qTotals(),F='"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif',W=1080,P=64,no=qNo();
 var fonts=document.fonts?Promise.all(["400 28px","600 28px","700 40px"].map(function(s){return document.fonts.load(s+' "IBM Plex Sans Arabic"').catch(function(){})})):Promise.resolve();
 return Promise.all([qImg("logo.png"),fonts]).then(function(r){var logo=r[0],rows=q.items.length,RH=62;
  var H=P+230+40+(q.name||q.phone?120:0)+70+rows*RH+30+(t.fee>0?5:4)*58+90+120+300;
  var cv=document.createElement("canvas");cv.width=W;cv.height=H;var c=cv.getContext("2d");
  var ink="#1e2633",mut="#667085",line="#e3e7ee",acc="#2457c5",navy="#1b2a4a";
  c.fillStyle="#fff";c.fillRect(0,0,W,H);
  function T(s,x,y,o){o=o||{};c.font=(o.w||400)+" "+(o.s||28)+"px "+F;c.fillStyle=o.c||ink;c.textAlign=o.a||"right";c.direction=o.d||"rtl";c.textBaseline="middle";
   var mw=o.mw;if(mw&&c.measureText(s).width>mw){while(s.length>1&&c.measureText(s+"…").width>mw)s=s.slice(0,-1);s+="…"}c.fillText(s,x,y)}
  function L(y){c.fillStyle=line;c.fillRect(P,y,W-2*P,2)}
  function R(x,y,w,h,rad,fill,stroke){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,rad);else c.rect(x,y,w,h);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
  var y=P;
  // الرأس: الشعار يميناً، وبيانات الفاتورة يساراً
  if(logo){var lh=220,lw=logo.width*lh/logo.height;c.drawImage(logo,W-P-lw,y,lw,lh)}
  R(P,y+20,380,180,18,"#f4f6f9",line);
  T("فاتورة مبدئية",P+190,y+62,{w:700,s:38,c:navy,a:"center"});
  T("رقم: "+ltr(no),P+190,y+116,{s:24,c:mut,a:"center"});T("التاريخ: "+ltr(today()),P+190,y+156,{s:24,c:mut,a:"center"});
  y+=230;c.fillStyle=navy;c.fillRect(P,y,W-2*P,4);y+=40;
  if(q.name||q.phone){R(P,y,W-2*P,96,16,null,line);if(q.name)T("الزبون: "+q.name,W-P-24,y+48,{w:600,s:28,mw:560});if(q.phone)T(q.phone,P+24,y+48,{s:26,c:mut,a:"left",d:"ltr"});y+=120}
  // جدول المنتجات
  var cx={no:W-P-24,item:W-P-90,qty:P+330,pr:P+200,tot:P+24};
  R(P,y,W-2*P,60,12,"#e8edf6");
  T("#",cx.no,y+30,{w:600,s:24});T("المنتج",cx.item,y+30,{w:600,s:24});T("الكمية",cx.qty,y+30,{w:600,s:24,a:"center"});T("السعر",cx.pr,y+30,{w:600,s:24,a:"center"});T("الإجمالي",cx.tot+40,y+30,{w:600,s:24,a:"center"});
  y+=70;
  q.items.forEach(function(it,k){var qty=n(has(it.qty)?it.qty:1),u=n(it.usd);
   T(String(k+1),cx.no,y+RH/2,{s:24,c:mut});T(it.desc||"منتج "+(k+1),cx.item,y+RH/2,{s:26,mw:cx.item-cx.qty-70});
   T(String(qty),cx.qty,y+RH/2,{s:26,a:"center",d:"ltr"});T(usd2(u),cx.pr,y+RH/2,{s:26,a:"center",d:"ltr"});T(usd2(u*qty),cx.tot+40,y+RH/2,{s:26,a:"center",d:"ltr",w:600});
   y+=RH;L(y-2)});
  y+=30;
  // الإجماليات
  var bx=P,bw=560;function S(k,v,big){T(k,bx+bw-20,y+29,{s:big?30:26,w:big?700:400,c:big?ink:mut});T(v,bx+20,y+29,{s:big?32:26,w:700,c:big?acc:ink,a:"left",d:"ltr"});y+=58}
  S("عدد المنتجات",String(t.pcs));S("إجمالي السلة",usd2(t.usd));S("سعر الصرف",t.rate>0?num(t.rate):"—");S("قيمة السلة بالدينار",t.rate>0?num(t.lyd)+" "+D.cur:"—");
  if(t.fee>0)S("رسوم الشحن",num(t.fee)+" "+D.cur);
  y+=8;R(bx,y,bw,76,16,"#e6edfb");T("الإجمالي المطلوب",bx+bw-24,y+38,{w:700,s:30,c:navy});T(t.rate>0?num(t.total)+" "+D.cur:"—",bx+24,y+38,{w:700,s:34,c:acc,a:"left",d:"ltr"});y+=96;
  T("هذه فاتورة مبدئية للتسعير، والأسعار حسب الموقع يوم إصدارها وقد تتغير عند تنفيذ الطلب.",W-P,y+20,{s:22,c:mut,mw:W-2*P});y+=80;
  // التذييل: بيانات التواصل وختم المتجر
  L(y);y+=30;
  T("شكراً لتعاملكم مع "+STORE.name,W-P,y+30,{w:700,s:30});T("للاستفسار والطلبات (هاتف / واتساب)",W-P,y+80,{s:24,c:mut});T(STORE.phone,W-P,y+128,{w:700,s:34,c:navy,d:"ltr"});
  var sx=P+130,sy=y+120;c.save();c.translate(sx,sy);c.rotate(-0.14);c.strokeStyle=navy;c.lineWidth=4;c.beginPath();c.arc(0,0,112,0,7);c.stroke();c.lineWidth=2;c.beginPath();c.arc(0,0,100,0,7);c.stroke();
  T(STORE.name,0,-34,{w:700,s:26,c:navy,a:"center"});T(STORE.en,0,4,{s:15,c:navy,a:"center",d:"ltr"});T(STORE.phone,0,40,{w:700,s:22,c:navy,a:"center",d:"ltr"});c.restore();
  return cv})}
function qBlob(cv){return new Promise(function(r){cv.toBlob(r,"image/jpeg",0.92)})}
// PDF من صفحة واحدة تحمل صورة الفاتورة بعرض A4
function qPdf(jpg,w,h){var pw=595.28,ph=Math.round(pw*h/w*100)/100,enc=new TextEncoder(),parts=[],off=[],len=0;
 function add(x){var b=typeof x==="string"?enc.encode(x):x;parts.push(b);len+=b.length}
 function obj(i,body,stream){off[i]=len;add(i+" 0 obj\n"+body);if(stream){add("\nstream\n");add(stream);add("\nendstream")}add("\nendobj\n")}
 var draw=enc.encode("q "+pw+" 0 0 "+ph+" 0 0 cm /Im0 Do Q");
 add("%PDF-1.4\n");obj(1,"<< /Type /Catalog /Pages 2 0 R >>");obj(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
 obj(3,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+pw+" "+ph+"] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
 obj(4,"<< /Type /XObject /Subtype /Image /Width "+w+" /Height "+h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+jpg.length+" >>",jpg);
 obj(5,"<< /Length "+draw.length+" >>",draw);
 var x=len,xr="xref\n0 6\n0000000000 65535 f \n";for(var i=1;i<=5;i++)xr+=String(off[i]).padStart(10,"0")+" 00000 n \n";
 add(xr+"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n"+x+"\n%%EOF");
 return new Blob(parts,{type:"application/pdf"})}
function qShare(kind){if(!quote.items.length){alert("أضف منتجات السلة أولاً");return}if(!(n(quote.rate)>0)){alert("اكتب سعر الصرف");return}
 var name="فاتورة-مبدئية-"+(quote.name?quote.name.replace(/[\\/:*?"<>|\s]+/g,"-")+"-":"")+today();
 qCanvas().then(function(cv){var p=document.getElementById("qprev");if(p)p.innerHTML='<img class="qimg" alt="معاينة الفاتورة المبدئية" src="'+cv.toDataURL("image/jpeg",0.8)+'">';
  return qBlob(cv).then(function(b){if(kind==="jpg")return qSend(b,name+".jpg");return b.arrayBuffer().then(function(a){return qSend(qPdf(new Uint8Array(a),cv.width,cv.height),name+".pdf")})})})
 .catch(function(){alert("تعذّر تجهيز الفاتورة")})}
// على الهاتف تفتح قائمة المشاركة (واتساب، ماسنجر…)، وعلى الكمبيوتر يُحمَّل الملف
function qSend(blob,fname){var f=null;try{f=new File([blob],fname,{type:blob.type})}catch(e){}
 if(f&&navigator.canShare&&navigator.canShare({files:[f]}))return navigator.share({files:[f],title:fname}).catch(function(e){if(e&&e.name!=="AbortError")qDown(blob,fname)});
 qDown(blob,fname)}
function qDown(blob,fname){var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fname;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},2000)}
