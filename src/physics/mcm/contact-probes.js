import {resolveMcmWorldMatrix} from './world-transform.js';
import {queryMcmTerrainHeight} from './terrain-height.js';
import {queryMcmTerrainNormal} from './terrain-normal.js';

// Original 0x4b8660, including world-cache resolution and x87 sum order.
export function transformMcmPoint(node,point) {
  const m=resolveMcmWorldMatrix(node),[x,y,z]=point;
  return [0,1,2].map(j=>Math.fround(((m[8+j]*z+m[j]*x)+m[4+j]*y)+m[12+j]));
}

// Original 0x4a6a25..0x4a6c01. Two alternative points use component+8ec's
// transform; the third uses bike+434. The caller controls whether this block
// executes and initializes/preserves the incoming selector. These are contact
// probes, not a complete wheel or suspension update.
export function sampleMcmContactProbes({terrain,componentNode,bikeNode,points,selector=0}) {
  const probe=(node,point)=>{
    const world=transformMcmPoint(node,point);
    const surface=queryMcmTerrainHeight({...terrain,point:world});
    const normal=queryMcmTerrainNormal({...terrain,point:world,normal:[0,0,0]});
    return {world,surface,normal,depth:Math.fround(surface[1]-world[1]),difference:surface[1]-world[1]};
  };
  let primary=probe(componentNode,points[0]);
  if(primary.difference>=0)selector=1;
  else {primary=probe(componentNode,points[1]);if(primary.difference>=0)selector=2;}
  const third=probe(bikeNode,points[2]);
  const thirdContact=Number(third.difference>=Math.fround(-.3));
  return {primary,third,selector,thirdContact,anyContact:Number(!!selector||!!thirdContact)};
}
