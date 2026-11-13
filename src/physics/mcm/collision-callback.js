import {respondMcmDynamicCollision} from './dynamic-collision-response.js';
import {respondMcmStaticCollision} from './static-collision-response.js';

// Original 0x49d900 routing. Unknown object classes leave the bike unchanged.
export function respondMcmCollision(c){
 if(c.collisionType===0||c.collisionType===1)respondMcmDynamicCollision(c);
 else if(c.collisionType===2)respondMcmStaticCollision(c);
}

// Original 0x49e490. Identity matters: a rider can refer to its own bike.
// tag = {player, holder}; tag reset/network notification are explicit adapters.
export function primaryMcmCollision(c){
 const {bike,other,collisionType:type,tag}=c;
 if(bike.field8ac&&type!==2)return;
 if(type===0||type===1){
  if(tag&&(type===0||other!==bike)&&tag.player===bike){
   if(tag.holder===bike){
    if(!c.resetTag||!c.notifyTag)throw new Error('MCM tag transfer requires reset and notification adapters');
    tag.holder=other;c.resetTag();c.notifyTag(bike,other,0);
    bike.field888=5;bike.field8ac=1;other.field888=5;other.field8ac=1;return;
   }
   if(tag.holder===other){
    if(!c.notifyTag)throw new Error('MCM tag contact requires notification adapter');
    c.notifyTag(bike,bike,1);return;
   }
  }else if(other.field8ac)return;
 }
 (c.respond||respondMcmCollision)(c);
}

// Original 0x49e610. The secondary callback suppresses position correction
// before entering the primary callback, which rechecks its own gates.
export function secondaryMcmCollision(c){
 const {bike,other,collisionType:type}=c;
 if(bike.field8ac||bike.field618)return;
 if(type===0||type===1){if(other.field8ac)return;}
 else if(bike.state844===2)return;
 bike.field8a8=1;primaryMcmCollision(c);
}
