const VERSION='hockey-v3';
const ASSETS=['./','./index.html','./game.js','./atlas.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png',...['rink','nets','skater-foxes','skater-owls','goalie-foxes','goalie-owls','referee','puck','crowd'].map(n=>'./art/'+n+'.png')];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
 if(r.mode==='navigate'||/\.(html|js)$/.test(new URL(r.url).pathname)){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(VERSION).then(k=>k.put(r,c));return x}).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))));return}
 e.respondWith(caches.match(r).then(m=>m||fetch(r)))});
