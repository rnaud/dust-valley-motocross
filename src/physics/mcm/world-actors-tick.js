import {bitsFloat,floatBits} from './math.js';
const signed16=value=>(value<<16)>>16;
// Original 0x4590b0. Callees remain explicit boundaries, including network,
// race notifications and child traversal. localIdentityScratch is the incoming
// stack word read by the original when remoteCount===1 skips its producer.
export function tickMcmWorldActors(c,delta,services){
 const w=c.world;let local=c.localIdentityScratch;
 if(!w.menu){
  if(c.view.target.excluded)services.select(c,0);
  if(!w.paused){
   if(w.refresh)services.refresh(c.player);
   if(c.running){
    services.physics(c.player,delta);services.presentation(c.player,delta);
    if(signed16(w.aiCount)>0)for(let i=0;;){services.physics(c.ai[i++],delta);if(i===signed16(w.aiCount))break;}
   }else{
    c.countdownBits=floatBits(Math.fround(bitsFloat(c.countdownBits)-delta));
    if(c.countdownBits>0x80000000){c.countdownBits=0;c.running=1;}
   }
   if(w.remoteCount!==1){
    local=services.localIdentity(w.network);
    for(let i=0;i<(w.remoteCount|0);i++)if(w.remoteIds[i]!==local&&c.remote[i])services.remote(c.remote[i],delta);
   }
   if(c.running&&signed16(w.aiCount)>0)for(let i=0;;){
    if(w.network)services.presentation(c.ai[i],delta);
    if(++i===signed16(w.aiCount))break;
   }
   if([1,2,3].includes(w.raceKind&0xffff)&&(c.raceEnabled||(w.raceKind&0xffff)===1)&&c.running&&!c.stopRequested){
    services.race(c.player,delta);
    if(signed16(w.aiCount)>0)for(let i=0;;){services.race(c.ai[i++],delta);if(i===signed16(w.aiCount))break;}
    if(c.remote)for(let i=0;i<(w.remoteCount|0);i++){
     if(local===undefined)throw Error('Missing world local-identity stack input');
     if(w.remoteIds[i]!==local&&c.remote[i])services.race(c.remote[i],delta);
    }
    services.raceWorld(c);
   }
   if(c.running&&c.stopRequested){c.stopRequested=0;c.running=0;}
   if(c.marker?.enabled){const p=[...c.player.position504];p[1]=Math.fround(p[1]+4.25);services.marker(c.marker,p);}
  }
 }
 services.children(c,delta);return 1;
}
