const VERSION='hockey-v8';
const ASSETS=['./','./index.html','./game.js','./atlas.js','./game.js?v=8','./atlas.js?v=8','./atlas2.js?v=8','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png',...['referee','puck','crowd'].map(n=>'./art/'+n+'.png?v=8')];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
 if(r.mode==='navigate'||/\.(html|js)$/.test(new URL(r.url).pathname)){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(VERSION).then(k=>k.put(r,c));return x}).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))));return}
 e.respondWith(caches.match(r).then(m=>m||fetch(r)))});
