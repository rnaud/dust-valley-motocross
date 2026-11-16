import {testMcmTerrainVertex} from './terrain-vertex-distance.js';
function invoke(env,name,...args){if(typeof env[name]!=='function')throw new Error('Unconnected terrain update service: '+name);return env[name](...args);}
const increment=(view,offset)=>view.setUint32(offset,(view.getUint32(offset,true)+1)>>>0,true);

// Original 48d930. Propagation is required whenever active status changes.
export function updateMcmTerrainVertex(address,x,y,env){
 const node=env.node(address),owner=env.owner(node.getUint32(0x5c,true));
 increment(owner,0xb0);
 const index=env.vertexRows[y]+x;
 const rejected=testMcmTerrainVertex(node,owner,env.bank(node.getUint32(0x50,true)),env.vertexRows,env.inverse,x,y);
 let flags=node.getUint8(0x60+index);
 if(!rejected){flags|=0x40;node.setUint8(0x60+index,flags);if(flags&0x80)return;flags|=0x80;}
 else{flags&=0xbf;node.setUint8(0x60+index,flags);if(!(flags&0x80))return;flags&=0x7f;}
 node.setUint8(0x60+index,flags);node.setUint8(0x182,1);
 invoke(env,'propagate',address,x,y,node.getUint8(0x60+index)&0x80);
}

// Original 48d6f0, the active same-detail-mode path. The signed bank indices
// and inclusive far-removal endpoint are deliberate original behavior.
export function updateMcmTerrainNode(address,env){
 const node=env.node(address),get=o=>node.getUint32(o,true);
 if(!get(0x184))return;
 if(get(0x54)&&!node.getUint8(0x181))for(let i=0;i<256;i++){
  const child=env.u32(get(0x54)+i*4);if(child)updateMcmTerrainNode(child,env);
 }
 increment(env.owner(get(0x5c)),0x548);
 const level=offset=>{const value=env.lookup[get(offset)];if(!Number.isInteger(value))throw new Error('Missing terrain detail lookup');return value;};
 const near=level(0x188),oldNear=level(0x190),far=Math.min(level(0x18c)+1,255),oldFar=Math.min(level(0x194)+1,255);
 const index=level=>env.bank(get(0x50)).getInt16(0x1210+level*2,true);
 const vertex=i=>env.bank(get(0x50)).getInt16(0x1410+i*2,true);
 const propagate=(v,active)=>{
  node.setUint8(0x182,1);
  const [x,y]=env.vertexCoordinates(v);invoke(env,'propagate',address,x,y,active);
 };
 for(let i=index(oldNear);i<289&&index(near)>i;i++){
  const v=vertex(i),offset=0x60+v;
  node.setUint8(offset,node.getUint8(offset)&0xbf);
  if(!(node.getUint8(offset)&15)){
   increment(env.owner(get(0x5c)),0xac);
   if(node.getUint8(offset)&0x80){node.setUint8(offset,node.getUint8(offset)&0x7f);propagate(v,0);}
  }
 }
 if(far<oldFar)for(let i=index(far);i<289&&index(oldFar)>=i;i++){
  const v=vertex(i),offset=0x60+v;
  node.setUint8(offset,node.getUint8(offset)|0x40);
  if(!(node.getUint8(offset)&15)){
   increment(env.owner(get(0x5c)),0xa8);
   if(!(node.getUint8(offset)&0x80)){node.setUint8(offset,node.getUint8(offset)|0x80);propagate(v,128);}
  }
 }
 for(let i=index(near);i<289&&index(far)>i;i++){
  const v=vertex(i),owner=env.owner(get(0x5c));
  if(node.getUint8(0x60+v)&15)owner.setUint32(0xc4+v*4,owner.getUint32(0x548,true),true);
  else{const[x,y]=env.vertexCoordinates(v);updateMcmTerrainVertex(address,x,y,env);}
 }
 node.setUint32(0x1b0,env.owner(get(0x5c)).getUint32(0xc0,true),true);
}

// Original 48d680: changed mode takes a separate rebuilding path.
export function resetMcmTerrainDetail(address,env){
 const node=env.node(address),get=o=>node.getUint32(o,true);
 if(get(0x54))for(let i=0;i<256;i++){const child=env.u32(get(0x54)+i*4);if(child)resetMcmTerrainDetail(child,env);}
 invoke(env,'rebuild',address);
 if(env.owner(get(0x5c)).getUint32(0x7c,true))invoke(env,'optionalUpdate',address);
 node.setUint32(0x1b0,env.owner(get(0x5c)).getUint32(0xc0,true),true);
 for(const o of[0x190,0x188])node.setUint32(o,0,true);
 for(const o of[0x194,0x18c])node.setUint32(o,65535,true);
}
