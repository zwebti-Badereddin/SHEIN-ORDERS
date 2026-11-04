// ===== الفاتورة المبدئية: حساب إجمالي سلة الزبون قبل الطلب ومشاركتها صورةً أو PDF =====
var quote=null;
function qLoad(){try{var s=localStorage.getItem("shein_quote");if(s)return JSON.parse(s)}catch(e){}return null}
function qKeep(){try{localStorage.setItem("shein_quote",JSON.stringify(quote))}catch(e){}}
function qNew(){quote={name:"",phone:"",rate:D.rate||"",shipFee:"",items:[]};qKeep()}
function openQuote(){quote=quote||qLoad();if(!quote)qNew();if(!has(quote.rate))quote.rate=D.rate||"";go("quote")}
function qTotals(){var q=quote,usd=0,pcs=0;q.items.forEach(function(i){var k=n(has(i.qty)?i.qty:1);usd+=k*n(i.usd);pcs+=k});
 var r=n(q.rate),lyd=usd*r,fee=n(q.shipFee);return{usd:usd,pcs:pcs,rate:r,lyd:lyd,fee:fee,total:lyd+fee}}
function qLyd(it){var r=n(quote.rate),u=n(it.usd);return r>0&&u>0?num(u*r):""}
function qRow(it,i){return'<div class="qitem"><input class="qd" dir="auto" placeholder="المنتج (اختياري)" value="'+esc(it.desc)+'" oninput="quote.items['+i+'].desc=this.value;qKeep()">'+
 '<div class="qrow"><input class="qq" inputmode="numeric" aria-label="الكمية" value="'+esc(has(it.qty)?it.qty:1)+'" oninput="quote.items['+i+'].qty=this.value;qUpd()">'+
 '<input class="qp'+(it.flag?" qwarn":"")+'" inputmode="decimal" dir="ltr" placeholder="$" aria-label="السعر بالدولار"'+(it.flag?' title="'+(it.flag==="fixed"?"صُحّح تلقائياً، تأكد منه":"تأكد من هذا السعر")+'"':'')+' value="'+esc(it.usd)+'" oninput="delete quote.items['+i+'].flag;this.classList.remove(\'qwarn\');quote.items['+i+'].usd=this.value;qUpd()">'+
 '<input class="ql" id="ql'+i+'" readonly tabindex="-1" dir="ltr" aria-label="السعر بالدينار" value="'+qLyd(it)+'">'+
 '<button class="x" onclick="qDel('+i+')" aria-label="حذف">'+ic("x")+'</button></div></div>'}
function quotePage(){var q=quote,t=qTotals();
 return'<button class="back" onclick="go(\'home\')">‹ رجوع</button><h1>فاتورة مبدئية</h1>'+
 '<p class="note">أرفق صورة السلة أو اكتب الأسعار، فيحسب التطبيق الإجمالي بالدينار ويجهّز فاتورة بالشعار ورقم الهاتف لإرسالها للزبون.</p>'+
 '<div class="row"><div><label>اسم الزبون</label><input value="'+esc(q.name)+'" oninput="quote.name=this.value;qKeep()"></div><div><label>رقم الهاتف</label><input inputmode="tel" dir="ltr" value="'+esc(q.phone)+'" oninput="quote.phone=this.value;qKeep()"></div></div>'+
 '<label class="qpick"><input type="file" accept="image/*" multiple onchange="qOcr(this)"><span class="btn full">'+ic("dl")+' إرفاق صورة السلة</span></label>'+
 '<p class="note" style="margin-top:6px">صوّر سلة SHEIN أو قائمة المنتجات المشتركة، ويمكن اختيار أكثر من صورة. يقرأ التطبيق الأسماء والأسعار وتراجعها قبل الإرسال.</p><div id="qocr" class="qocr"></div>'+
 '<label>أو اكتب الأسعار مفصولة بمسافة</label><div class="row"><div style="flex:3"><input id="qbulk" dir="ltr" inputmode="decimal" placeholder="34.34 39.40 30.97 21.02"></div><div style="flex:1"><button class="btn sec" style="width:100%" onclick="qBulk()">إضافة</button></div></div>'+
 '<h2>منتجات السلة</h2><div class="qhead"><span>الكمية</span><span>السعر $</span><span>السعر '+esc(D.cur)+'</span><span></span></div><div id="qitems">'+(q.items.length?q.items.map(qRow).join(""):'<div class="empty" style="padding:12px">لا توجد منتجات بعد.</div>')+'</div>'+
 '<div class="bar"><button class="btn sec" onclick="qAdd()">+ إضافة منتج</button></div><div id="qshots">'+qShotsHtml()+'</div>'+
 '<div class="row"><div><label>سعر الصرف اليوم</label><input inputmode="decimal" value="'+esc(q.rate)+'" oninput="quote.rate=this.value;qUpd()"></div><div><label>رسوم الشحن على الزبون ('+esc(D.cur)+')</label><input inputmode="decimal" value="'+esc(q.shipFee)+'" placeholder="اختياري" oninput="quote.shipFee=this.value;qUpd()"></div></div>'+
 '<div class="card" style="margin-top:14px" id="qsum">'+qSum(t)+'</div>'+
 '<div class="bar"><button class="btn" onclick="qShare(\'jpg\')">إرسال صورة</button><button class="btn" onclick="qShare(\'pdf\')">إرسال PDF</button></div>'+
 '<div id="qprev"></div>'+
 '<div class="bar"><button class="btn sec" onclick="qToOrder()">تحويل إلى طلب</button><button class="btn bad" onclick="if(confirm(\'مسح الفاتورة المبدئية والبدء من جديد؟\')){qNew();render()}">فاتورة جديدة</button></div>'}
function qSum(t){return aline("عدد القطع",t.pcs)+aline("الإجمالي بالدولار",'<span dir="ltr">'+usd2(t.usd)+'</span>')+(t.fee>0?aline("رسوم الشحن",money(t.fee)):"")+
 '<div class="line big"><span>الإجمالي بالدينار</span><span>'+(t.rate>0?money(t.total):"اكتب سعر الصرف")+'</span></div>'}
function qUpd(){qKeep();quote.items.forEach(function(it,i){var l=document.getElementById("ql"+i);if(l)l.value=qLyd(it)});var e=document.getElementById("qsum");if(e)e.innerHTML=qSum(qTotals())}
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
 return Promise.all([qImg("logo.png"),fonts]).then(function(r){var logo=r[0],rows=q.items.length,two=q.items.some(function(i){return/ · /.test(i.desc||"")}),RH=two?84:62;
  var H=P+230+40+(q.name||q.phone?120:0)+70+rows*RH+30+(t.fee>0?3:2)*58+90+120+300;
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
  var cx={no:W-P-24,item:W-P-80,qty:P+470,pr:P+360,pl:P+225,tot:P+80};
  R(P,y,W-2*P,60,12,"#e8edf6");
  T("#",cx.no,y+30,{w:600,s:24});T("المنتج",cx.item,y+30,{w:600,s:24});T("الكمية",cx.qty,y+30,{w:600,s:22,a:"center"});T("السعر $",cx.pr,y+30,{w:600,s:22,a:"center"});T("السعر "+D.cur,cx.pl,y+30,{w:600,s:22,a:"center"});T("الإجمالي "+D.cur,cx.tot,y+30,{w:600,s:22,a:"center"});
  y+=70;
  q.items.forEach(function(it,k){var qty=n(has(it.qty)?it.qty:1),u=n(it.usd);
   T(String(k+1),cx.no,y+RH/2,{s:24,c:mut});
   // الاسم بالإنجليزية يُرسم من اليسار لليمين، واللون/المقاس في سطر ثانٍ أصغر
   var parts=String(it.desc||"منتج "+(k+1)).split(" · "),nm=parts.shift(),vr=parts.join(" · "),mw=cx.item-cx.qty-50,dl=function(t){return/^[^\u0600-\u06FF]*[A-Za-z]/.test(t)&&!/[\u0600-\u06FF]/.test(t)?"ltr":"rtl"};
   if(vr){T(nm,cx.item,y+28,{s:25,mw:mw,d:dl(nm)});T(vr,cx.item,y+60,{s:20,c:mut,mw:mw,d:dl(vr)})}else T(nm,cx.item,y+RH/2,{s:26,mw:mw,d:dl(nm)});
   T(String(qty),cx.qty,y+RH/2,{s:25,a:"center",d:"ltr"});T(usd2(u),cx.pr,y+RH/2,{s:25,a:"center",d:"ltr"});T(t.rate>0?num(u*t.rate):"—",cx.pl,y+RH/2,{s:25,a:"center",d:"ltr"});T(t.rate>0?num(u*qty*t.rate):"—",cx.tot,y+RH/2,{s:25,a:"center",d:"ltr",w:600});
   y+=RH;L(y-2)});
  y+=30;
  // الإجماليات
  var bx=P,bw=560;
  // المبلغ ثم العملة، كلٌّ على حدة حتى لا ينقلب ترتيبهما
  function V(v,cur,x,yy,o){T(v,x,yy,Object.assign({a:"left",d:"ltr"},o));if(cur){c.font=(o.w||400)+" "+(o.s||28)+"px "+F;var w=c.measureText(v).width;T(cur,x+w+10,yy,Object.assign({},o,{a:"left",d:"rtl"}))}}
  function S(k,v,cur){T(k,bx+bw-20,y+29,{s:26,c:mut});V(v,cur,bx+20,y+29,{s:26,w:700,c:ink});y+=58}
  S("عدد القطع",String(t.pcs));S("الإجمالي بالدولار",usd2(t.usd));
  if(t.fee>0)S("رسوم الشحن",num(t.fee),D.cur);
  y+=8;R(bx,y,bw,76,16,"#e6edfb");T("الإجمالي بالدينار",bx+bw-24,y+38,{w:700,s:30,c:navy});V(t.rate>0?num(t.total):"—",t.rate>0?D.cur:"",bx+24,y+38,{w:700,s:34,c:acc});y+=96;
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

// ===== قراءة صورة السلة: يتعرّف التطبيق على المنتجات والأسعار من لقطة شاشة SHEIN =====
// تتم القراءة على الهاتف نفسه (Tesseract)، ولا تُرسل الصورة إلى أي خادم.
var TESS="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
function qLib(){if(window.Tesseract)return Promise.resolve(window.Tesseract);return new Promise(function(res,rej){var s=document.createElement("script");s.src=TESS;s.onload=function(){res(window.Tesseract)};s.onerror=function(){rej(new Error("net"))};document.head.appendChild(s)})}
// تكبير الصورة لعرض 1500 بكسل وأخذ القناة الخضراء (فتصبح الأسعار الحمراء داكنة) ثم رفع التباين
function qPrep(file){return new Promise(function(res,rej){var url=URL.createObjectURL(file),im=new Image();
 im.onload=function(){var s=Math.min(4,Math.max(1,1500/im.width));if(im.width*s*im.height*s>16e6)s=Math.sqrt(16e6/(im.width*im.height));
  var w=Math.round(im.width*s),h=Math.round(im.height*s),cv=document.createElement("canvas");cv.width=w;cv.height=h;var c=cv.getContext("2d");c.imageSmoothingQuality="high";c.drawImage(im,0,0,w,h);
  var d=c.getImageData(0,0,w,h),p=d.data,hist=new Uint32Array(256),i,lo=0,hi=255,acc=0,cut=w*h*0.01;for(i=0;i<p.length;i+=4)hist[p[i+1]]++;
  while(lo<254&&(acc+=hist[lo])<cut)lo++;acc=0;while(hi>lo+1&&(acc+=hist[hi])<cut)hi--;var k=255/(hi-lo);
  for(i=0;i<p.length;i+=4){var v=(p[i+1]-lo)*k;v=v<0?0:v>255?255:v;p[i]=p[i+1]=p[i+2]=v}c.putImageData(d,0,0);URL.revokeObjectURL(url);res(cv)};
 im.onerror=function(){URL.revokeObjectURL(url);rej(new Error("img"))};im.src=url})}
// تحويل النص المقروء إلى منتجات: كل سطر فيه سعر بالدولار يُغلق منتجاً، والسطران قبله هما الاسم واللون/المقاس.
// أول سعر في السطر هو السعر الحالي، والسعر المشطوب بعده يُتجاهل.
function qClean(l){return l.replace(/(\dX+|\bX+)[lI!|1](?![A-Za-z])/g,"$1L").replace(/^[^A-Za-z0-9؀-ۿ]+/,"").replace(/[\s.…]+$/,"").replace(/\s+/g," ").trim()}
// أسعار SHEIN دائماً بسنتين، والسنتات تُكتب صغيرة فوق السطر فقد تُقرأ "34 34" أو "3434" أو "2 1 .02"
function qPrice(tok){tok=tok.replace(/\s+$/,"");var d=tok.search(/[.,:]/),L,R;
 if(d>=0){L=tok.slice(0,d).replace(/\D/g,"");R=(tok.slice(d+1).replace(/\D/g,"")+"00").slice(0,2)}
 else{var g=tok.trim().split(/\s+/);if(g.length>1&&/^\d{2}$/.test(g[1])){L=g[0];R=g[1]}else if(g[0].length>=3){L=g[0].slice(0,-2);R=g[0].slice(-2)}else{L=g[0];R="00"}}
 return L?parseFloat(L+"."+R):0}
// السعر الأصلي المشطوب بعد السعر الحالي في نفس السطر. علامة $ فيه تُقرأ غالباً رقماً (5 أو 6 أو 8)
// أو حرفاً، والنقطة تُقرأ "-"، مثل "623-90" وهي 23.90
// السعر الأصلي المشطوب بعد السعر الحالي في نفس السطر. علامة $ فيه تُقرأ غالباً رقماً (5 أو 6 أو 8)
// أو حرفاً، والنقطة تُقرأ "-"، مثل "623-90" وهي 23.90. نعيد القراءة كما هي، والقراءة بعد حذف ذلك الرقم.
function qOrig(rest){var m=rest.match(/[\$sS§£€]?\s*(\d[\d\s.,:-]*)/);if(!m)return{a:0,b:0};var t=m[1].replace(/-/g,".").trim(),dg=t.replace(/\D/g,"");
 if(dg.length<3)return{a:0,b:0};var drop=dg.length>=4&&/[5689]/.test(dg[0])?qPrice(t.replace(/^\d\s*/,"")):0,as=qPrice(t);
 return dg.length>=5&&drop?{a:drop,b:as}:{a:as,b:drop}}
// السعر الحالي لا يتجاوز السعر الأصلي. إن تجاوزه فالخطأ غالباً رقم زائد (271.02) أو 7 مكان 1 (27.02):
// نجرّب حذف رقم أو استبدال 7 بـ 1 ونأخذ أكبر قيمة لا تتجاوز الأصلي، ونعلّم السعر للمراجعة.
// أسعار 100$ فأكثر نادرة في سلال SHEIN فتُعلَّم دائماً.
function qFix(v,o){if(!(v>0))return{v:v};o=o||{a:0,b:0};
 function tryB(bound){if(!bound||v<=bound*1.001)return 0;var c=v.toFixed(2),ip=c.split(".")[0],cents=c.split(".")[1],cand=[],i,j;
  // حذف رقم فقط عندما يكون الجزء الصحيح 3 أرقام فأكثر (271 ← 21)، أما 7 ← 1 فدائماً (27 ← 21)
  for(i=0;i<ip.length;i++){if(ip.length>=3)cand.push(ip.slice(0,i)+ip.slice(i+1));if(ip[i]==="7")cand.push(ip.slice(0,i)+"1"+ip.slice(i+1))}
  if(ip.length>=3)for(i=0;i<ip.length;i++)if(ip[i]==="7")for(j=0;j<ip.length-1;j++){var d=ip.slice(0,i)+"1"+ip.slice(i+1);cand.push(d.slice(0,j)+d.slice(j+1))}
  var best=0;cand.forEach(function(x){var y=parseFloat(x+"."+cents);if(y<=bound*1.001&&y>=bound*0.25&&y>best)best=y});return best}
 var f=tryB(o.a);if(f)return{v:f,flag:"fixed"};
 if(o.a&&v>o.a*1.001)return{v:v,flag:"check"};
 if(v>=100){f=tryB(o.b);return f?{v:f,flag:"fixed"}:{v:v,flag:"check"}}
 return{v:v}}
function qParse(text){var items=[],title="",variant="",skip=/sub\s*total|total|saved|discount|coupon|shipping|tax|points|المجموع|الإجمالي|الخصم|الشحن/i,
 noise=/lowest price|bought|add all|items shared|add to cart|checkout|similar|^\W*-?\d+\s*%|^\d{1,2}:\d{2}/i;
 String(text).split(/\n/).forEach(function(raw){var l=raw.replace(/(\d),(\d{3})(?!\d)/g,"$1$2").trim();if(!l)return;
  // السعر ينتهي عند سنتين بعد الفاصلة، أو "34 34"، أو رقم متصل، حتى لا يندمج بالسعر المشطوب بعده
  // وفي أول السطر قد تُقرأ علامة $ حرف s، فنقبلها هناك إن تبعها سعر بسنتين
  var m=l.match(/(?:US)?\$\s*(\d{1,4}(?: \d)?\s?[.,:]\s?\d ?\d|\d+ \d{2}(?!\d)|\d+)/)||l.match(/^[sS§]\s?(\d{1,4}(?: \d)?\s?[.,:]\s?\d ?\d|\d{1,3} \d{2}(?!\d))/);
  if(m){if(skip.test(l)){title="";variant="";return}
   var v=qPrice(m[1]),o=qOrig(l.slice(m.index+m[0].length)),fx=qFix(v,o);
   if(fx.v>0&&fx.v<5000){var it={desc:[title,variant].filter(Boolean).join(" · "),qty:1,usd:fx.v.toFixed(2)};if(fx.flag)it.flag=fx.flag;items.push(it)}
   title="";variant="";return}
  if(noise.test(l))return;if((l.match(/[A-Za-z؀-ۿ]/g)||[]).length<4)return;
  var t=qClean(l);if(title&&!variant&&/\//.test(t))variant=t;else if(!title)title=t;else if(!variant)variant=t});
 return items}
var qShots=[];
function qShotsHtml(){return qShots.length?'<details class="qshots" open><summary>الصورة المرفقة للمقارنة</summary>'+qShots.map(function(u){return'<img src="'+u+'" alt="صورة السلة">'}).join("")+'</details>':""}
function qOcr(input){var files=[].slice.call(input.files||[]);input.value="";if(!files.length)return;
 qShots.forEach(function(u){URL.revokeObjectURL(u)});qShots=files.map(function(f){return URL.createObjectURL(f)});var sh=document.getElementById("qshots");if(sh)sh.innerHTML=qShotsHtml();
 var st=document.getElementById("qocr"),say=function(t,bad){if(st){st.textContent=t;st.className="qocr"+(bad?" bad":"")}},added=0,before=quote.items.length,worker=null;
 say("جارٍ تجهيز قارئ الصور… في المرة الأولى يحتاج تحميلاً قصيراً");
 qLib().then(function(T){return T.createWorker("eng",1,{logger:function(m){if(m.status==="recognizing text")say("جارٍ قراءة الصورة… "+Math.round(m.progress*100)+"%")}})})
 .then(function(w){worker=w;return w.setParameters({tessedit_pageseg_mode:"4",preserve_interword_spaces:"1"})})
 .then(function(){var chain=Promise.resolve();files.forEach(function(f,fi){chain=chain.then(function(){return qPrep(f)}).then(function(cv){if(files.length>1)say("جارٍ قراءة الصورة "+(fi+1)+" من "+files.length+"…");return worker.recognize(cv)})
  .then(function(r){var got=qParse(r.data.text),prev=quote.items.slice(before);
   // عند تداخل لقطتين متتاليتين لا يُكرَّر المنتج نفسه
   got.forEach(function(it){if(fi>0&&prev.some(function(p){return p.usd===it.usd&&p.desc===it.desc}))return;quote.items.push(it);added++})})});return chain})
 .then(function(){if(worker)worker.terminate();qRedraw();
  var fl=quote.items.slice(before).filter(function(i){return i.flag}).length;
  say(added?"أُضيف "+added+" منتج من الصورة."+(fl?" راجع "+(fl===1?"السعر المعلَّم":"الأسعار المعلَّمة ("+fl+")")+" باللون البرتقالي وقارنه بالصورة.":" راجع الأسماء والأسعار والكميات قبل الإرسال."):"لم أجد أسعاراً بالدولار في الصورة. جرّب لقطة أوضح أو أدخل الأسعار يدوياً.",!added)})
 .catch(function(e){if(worker)worker.terminate();say(e&&e.message==="net"?"تعذّر تحميل قارئ الصور. تأكد من اتصال الإنترنت ثم حاول مجدداً.":"تعذّرت قراءة الصورة. جرّب صورة أخرى أو أدخل الأسعار يدوياً.",true)})}
