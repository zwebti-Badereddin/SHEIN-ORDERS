// يحفظ الصفحة والصور لفتح أسرع. الصفحة تُجلب من الإنترنت أولاً حتى تظهر أي تعديلات فوراً.
var V="store-v5";
var CORE=["./","index.html","manifest.webmanifest","icon-192.png","img/logo.webp"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}))});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==V}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener("fetch",function(e){var r=e.request,u=new URL(r.url);
 if(r.method!=="GET"||u.origin!==location.origin||/\.mp4$/.test(u.pathname))return;
 if(u.pathname.indexOf("/img/")===0){e.respondWith(caches.match(r).then(function(m){return m||fetch(r).then(function(res){var c=res.clone();caches.open(V).then(function(x){x.put(r,c)});return res})}));return}
 e.respondWith(fetch(r).then(function(res){var c=res.clone();caches.open(V).then(function(x){x.put(r,c)});return res}).catch(function(){return caches.match(r).then(function(m){return m||caches.match("index.html")})}))});
