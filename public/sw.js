// Offline-first asset cache. Built files carry content hashes, so a cached
// copy is always correct: serve it from cache and only fetch what is new.
// The page itself (navigations, index.html) is network-first so new builds
// are picked up; it falls back to the cache when offline.
const CACHE='dust-valley-assets-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const page=request.mode==='navigate'||url.pathname.endsWith('/')||url.pathname.endsWith('.html')||url.pathname.endsWith('sw.js');
 if(page){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy));}return response;}).catch(()=>caches.match(request)));
  return;
 }
 event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{
  if(response.ok&&response.status===200){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy));}
  return response;
 })));
});
