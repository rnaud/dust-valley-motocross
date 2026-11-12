import {Vector3,Quaternion} from 'three';
const up=new Vector3(0,1,0);
// World-space mounting points follow the displayed axles, including suspension
// interpolation. Wheel spin cannot move the axle direction.
export function bikeLinkagePoints(chassisPosition,chassisRotation,rear,front){
  const mount=(x,y,z)=>new Vector3(x,y,z).applyQuaternion(chassisRotation).add(chassisPosition);
  const rearAxis=new Vector3(1,0,0).applyQuaternion(rear.quaternion);
  const frontAxis=new Vector3(1,0,0).applyQuaternion(front.quaternion);
  const links=[];
  for(const side of [-1,1]){
    const axle=front.position.clone().addScaledVector(frontAxis,side*.22);
    const crown=mount(0,.66,.65).addScaledVector(frontAxis,side*.22);
    const sleeve=crown.clone().lerp(axle,.58);
    links.push({kind:'forkUpper',start:crown,end:sleeve},{kind:'forkLower',start:sleeve,end:axle});
    const rearAxle=rear.position.clone().addScaledVector(rearAxis,side*.22);
    links.push({kind:'swingarm',start:mount(side*.22,-.12,-.1),end:rearAxle});
    links.push({kind:'brace',start:mount(side*.22,-.12,-.1),end:rearAxle.clone().lerp(mount(side*.22,-.05,-.4),.4)});
  }
  const pivot=mount(0,-.12,-.1),lower=pivot.clone().lerp(rear.position,.36);
  links.push({kind:'shock',start:mount(0,.44,-.38),end:lower});
  links.push({kind:'axle',start:front.position.clone().addScaledVector(frontAxis,-.28),end:front.position.clone().addScaledVector(frontAxis,.28)});
  links.push({kind:'axle',start:rear.position.clone().addScaledVector(rearAxis,-.28),end:rear.position.clone().addScaledVector(rearAxis,.28)});
  return links;
}
export function fitBikeLink(mesh,start,end){
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  const delta=new Vector3().subVectors(end,start);
  mesh.scale.y=delta.length();
  mesh.quaternion.copy(delta.lengthSq()?new Quaternion().setFromUnitVectors(up,delta.normalize()):new Quaternion());
}
