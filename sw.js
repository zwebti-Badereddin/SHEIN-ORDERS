var V="shein-v10";
var CORE=["./","index.html","batch.js","manifest.webmanifest","icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png","logo.png"];
var HOSTS=["www.gstatic.com","fonts.googleapis.com","fonts.gstatic.com"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}))});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==V}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener("fetch",function(e){
 var r=e.request;if(r.method!=="GET")return;
 var u=new URL(r.url);
 if(u.origin!==location.origin&&HOSTS.indexOf(u.hostname)<0)return;
 if(r.mode==="navigate"){
  e.respondWith(fetch(r).then(function(res){var cp=res.clone();caches.open(V).then(function(c){c.put("index.html",cp)});return res}).catch(function(){return caches.match("index.html")}));
  return}
 // ملفات التطبيق نفسه: الشبكة أولاً حتى تصل التحديثات فوراً، والكاش احتياطي عند انقطاع الإنترنت
 if(u.origin===location.origin&&/\.(js|webmanifest)$/.test(u.pathname)){
  e.respondWith(fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp)})}return res}).catch(function(){return caches.match(r)}));
  return}
 e.respondWith(caches.match(r).then(function(hit){
  var net=fetch(r).then(function(res){if(res&&(res.ok||res.type==="opaque")){var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp)})}return res}).catch(function(){return hit});
  return hit||net}))});
