import {testMcmTerrainVertex} from './terrain-vertex-distance.js';
const increment=(v,o)=>v.setUint32(o,(v.getUint32(o,true)+1)>>>0,true);
function testVertex(address,x,y,env){const n=env.node(address);return testMcmTerrainVertex(n,env.owner(n.getUint32(0x5c,true)),env.bank(n.getUint32(0x50,true)),env.vertexRows,env.inverse,x,y);}

// Original 48db00: propagate active status to the two dependency vertices.
export function propagateMcmTerrainVertex(address,x,y,active,env){
 const node=env.node(address),get=o=>node.getUint32(o,true);
 increment(env.owner(get(0x5c)),0xa0);
 if(x===8&&y===8){
  const parent=get(0x58);if(!parent)return;
  let id=get(0x30),column=id&15,row=id>>4;
  if((id&0x11)!==0&&(id&0x11)!==0x11){
   notifyMcmTerrainVertex(parent,column,row,active,8,0,env);
   id=get(0x30);notifyMcmTerrainVertex(get(0x58),(id&15)+1,(id>>4)+1,active,1,0,env);
  }else{
   notifyMcmTerrainVertex(parent,column,row+1,active,2,0,env);
   id=get(0x30);notifyMcmTerrainVertex(get(0x58),(id&15)+1,id>>4,active,4,0,env);
  }
  return;
 }
 const index=env.vertexRows[y]+x,first=env.vertexMetadata(index);
 if(first[2]===first[4]&&first[3]===first[5])return;
 notifyMcmTerrainVertex(address,first[2],first[3],active,first[6],0,env);
 const second=env.vertexMetadata(index);
 notifyMcmTerrainVertex(address,second[4],second[5],active,second[7],0,env);
}

// Original 48dc30. Cross-patch propagation remains an explicit required
// boundary service until 48e1c0/48de10 are connected to the retained graph.
export function notifyMcmTerrainVertex(address,x,y,active,mask,source,env){
 if(x<0||y<0||x>16||y>16)return;
 const node=env.node(address),get=o=>node.getUint32(o,true);
 increment(env.owner(get(0x5c)),0x9c);
 const index=env.vertexRows[y]+x,bankAddress=get(0x50)+index*16,offset=0x60+index;
 let flags=node.getUint8(offset),changed=false,notify=false;
 if(active){
  if(!(flags&mask)){notify=true;flags|=mask;node.setUint8(offset,flags);}
  flags=node.getUint8(offset);
  if(!(flags&0x80)){flags|=0x80;node.setUint8(offset,flags);changed=notify=true;}
 }else{
  flags&=~mask;node.setUint8(offset,flags);notify=true;
  if(!(flags&15)){
   const owner=env.owner(get(0x5c));
   if(get(0x1b0)===owner.getUint32(0xc0,true)||owner.getUint32(0xc4+index*4,true)===owner.getUint32(0x548,true)){
    const rejected=testVertex(address,x,y,env);flags=node.getUint8(offset);
    if(rejected){if(flags&0x80)changed=true;flags&=0x3f;}else flags|=0xc0;
    node.setUint8(offset,flags);
   }else{
    const code=env.bank(get(0x50)).getUint8(index*16+1);
    const level=o=>{const result=env.lookup[get(o)];if(!Number.isInteger(result))throw new Error('Missing terrain detail lookup');return result;};
    if(!(flags&0x40)){flags=level(0x18c)<code?flags|0xc0:flags&0x7f;changed=true;node.setUint8(offset,flags);}
    else if(level(0x188)>code){changed=true;node.setUint8(offset,flags&0x3f);}
   }
  }
 }
 if(changed){node.setUint8(0x182,1);propagateMcmTerrainVertex(address,x,y,node.getUint8(offset)&0x80,env);}
 const parent=get(0x58);
 if(notify&&parent&&!source&&(x===0||x===16||y===0||y===16)){
  if(typeof env.boundary!=='function')throw new Error('Unconnected terrain update service: boundary');
  env.boundary(parent,address,x,y,active,mask,bankAddress);
 }
}

// Original 48da00 and the eight sweeps arranged by 48d9b0.
export function sweepMcmTerrainVertices(address,startX,startY,width,height,offsetX,offsetY,stepX,stepY,env){
 const node=env.node(address);let row=0;
 for(let y=startY+offsetY;y<=startY+height;y+=stepY,row++){
  const first=offsetY===0?(row&1?0:offsetX):offsetX;
  for(let x=startX+first;x<=startX+width;x+=stepX){
   const offset=0x60+env.vertexRows[y]+x;
   if(node.getUint8(offset)&15)continue;
   const rejected=testVertex(address,x,y,env);let flags=node.getUint8(offset);
   if(!rejected){flags|=0x40;node.setUint8(offset,flags);if(flags&0x80)continue;flags|=0x80;}
   else{flags&=0xbf;node.setUint8(offset,flags);if(!(flags&0x80))continue;flags&=0x7f;}
   node.setUint8(offset,flags);node.setUint8(0x182,1);
   propagateMcmTerrainVertex(address,x,y,node.getUint8(offset)&0x80,env);
  }
 }
}
export function rebuildMcmTerrainVertices(address,env){
 for(let step=1;step<16;step*=2){
  sweepMcmTerrainVertices(address,0,0,16,16,step,0,step*2,step,env);
  sweepMcmTerrainVertices(address,0,0,16,16,step,step,step*2,step*2,env);
 }
}
