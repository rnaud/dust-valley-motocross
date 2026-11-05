import * as T from 'three';
const up=new T.Vector3(0,1,0);
const v=(x,y,z)=>new T.Vector3(x,y,z);

// Two-link limbs keep gloves on the grips and boots on the pegs while the
// torso absorbs suspension movement. The hint selects elbows-out/knees-forward.
export function limbJoint(start,end,a,b,hint){
 const axis=end.clone().sub(start),distance=axis.length();axis.normalize();
 const d=Math.max(.001,Math.min(a+b-.001,distance));
 const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
 const bend=hint.clone().sub(start);bend.addScaledVector(axis,-bend.dot(axis)).normalize();
 return start.clone().addScaledVector(axis,along).addScaledVector(bend,height);
}
export function createRider(){
 const root=new T.Group();
 const jersey=new T.MeshStandardMaterial({color:'#c9e84d',roughness:.85});
 const pants=new T.MeshStandardMaterial({color:'#33484f',roughness:.9});
 const trim=new T.MeshStandardMaterial({color:'#f2ede2',roughness:.65});
 const rubber=new T.MeshStandardMaterial({color:'#172326',roughness:.8});
 const lens=new T.MeshStandardMaterial({color:'#264e58',metalness:.5,roughness:.16});
 function add(geo,mat,parent=root){const m=new T.Mesh(geo,mat);m.castShadow=true;parent.add(m);return m;}
 function oval(mat,scale,parent=root){const m=add(new T.SphereGeometry(1,16,12),mat,parent);m.scale.set(...scale);return m;}
 function segment(mat,top,bottom){return add(new T.CylinderGeometry(top,bottom,1,12),mat);}
 function placeSegment(m,a,b){m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=a.distanceTo(b);m.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());}
 const torso=new T.Group();root.add(torso);
 // Waist, ribs and shoulders have different widths, with rounded neck/arm seams.
 const profile=[[.12,-.34],[.22,-.30],[.25,-.15],[.29,.08],[.31,.20],[.27,.28],[.12,.33]].map(([r,y])=>new T.Vector2(r,y));
 const jacket=add(new T.LatheGeometry(profile,20),jersey,torso);jacket.scale.z=.6;
 const chest=oval(pants,[.22,.22,.045],torso);chest.position.set(0,.08,.17);
 const back=oval(trim,[.21,.24,.045],torso);back.position.set(0,.04,-.175);
 if(typeof document!=='undefined'){
  const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#f2ede2';g.fillRect(4,4,120,120);g.fillStyle='#203126';g.font='bold 68px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('07',64,68);
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
  const plate=new T.Mesh(new T.PlaneGeometry(.31,.33),new T.MeshBasicMaterial({map:tex,transparent:true}));plate.position.set(0,.04,-.221);plate.rotation.y=Math.PI;torso.add(plate);
 }
 const brace=add(new T.TorusGeometry(.16,.035,6,18),rubber,torso);brace.position.y=.30;brace.rotation.x=Math.PI/2;
 const neck=oval(rubber,[.105,.13,.105],torso);neck.position.y=.35;
 const pelvis=oval(pants,[.25,.19,.19]);
 const helmet=new T.Group();helmet.scale.setScalar(.82);root.add(helmet);
 oval(trim,[.29,.31,.33],helmet);
 const opening=oval(rubber,[.255,.145,.075],helmet);opening.position.set(0,.025,.285);
 const goggles=oval(jersey,[.235,.105,.045],helmet);goggles.position.set(0,.05,.343);
 const glass=oval(lens,[.205,.076,.024],helmet);glass.position.set(0,.052,.377);
 const chin=oval(trim,[.21,.115,.21],helmet);chin.position.set(0,-.18,.25);
 const vent=oval(rubber,[.12,.035,.025],helmet);vent.position.set(0,-.17,.445);
 const peak=oval(jersey,[.31,.032,.28],helmet);peak.position.set(0,.205,.27);peak.rotation.x=.12;
 for(const side of [-1,1]){const panel=oval(jersey,[.018,.15,.25],helmet);panel.position.set(side*.275,.04,-.015);}
 const helmetStripe=add(new T.BoxGeometry(.055,.29,.025),jersey,helmet);helmetStripe.position.set(0,.03,-.315);helmetStripe.rotation.x=-.12;
 const helmetVent=add(new T.BoxGeometry(.16,.035,.035),rubber,helmet);helmetVent.position.set(0,-.1,-.30);
 const limbs=[-1,1].map(side=>{
  const boot=oval(trim,[.125,.17,.23]);
  const shinGuard=oval(trim,[.12,.19,.085]);
  return {side,upperArm:segment(jersey,.12,.105),forearm:segment(pants,.10,.075),elbow:oval(jersey,[.11,.11,.11]),shoulder:oval(jersey,[.14,.14,.14]),glove:oval(rubber,[.09,.09,.12]),thigh:segment(pants,.145,.12),shin:segment(pants,.11,.085),knee:oval(jersey,[.13,.14,.12]),boot,shinGuard};
 });
 function update({compression=0,bank=0,lean=0,steer=0,gripQuaternion}={}){
  const corner=Math.max(-1,Math.min(1,bank));
  const crouch=Math.min(1,compression),shift=-Math.sin(corner)*.06;
  const hip=v(shift,1.12-crouch*.10-Math.abs(corner)*.005,-.36-lean*.035);
  pelvis.position.copy(hip);
  // The rider now rolls and twists into the corner instead of staying rigid
  // on top of the bike; the head stays closer to level so the eyes lead.
  torso.position.copy(hip).add(v(0,.35-Math.abs(corner)*.09,.46-lean*.03));
  torso.rotation.set(.40+crouch*.12-lean*.10+Math.abs(corner)*.03,steer*.65,corner*.2);
  torso.updateMatrix();
  helmet.position.copy(v(0,.64,.09).applyMatrix4(torso.matrix));
  helmet.rotation.set(-.05-lean*.08,-steer*.45-corner*.06,-corner*.14);
  for(const l of limbs){const side=l.side;
   const shoulder=v(side*.285,.19,0).applyMatrix4(torso.matrix);
   const hand=v(side*.49,0,0);
   if(gripQuaternion)hand.applyQuaternion(gripQuaternion);else hand.applyAxisAngle(up,steer);
   hand.add(v(0,1.34,.7));
   const elbow=limbJoint(shoulder,hand,.43,.44,v(side*.65,1.38,.18));
   placeSegment(l.upperArm,shoulder,elbow);placeSegment(l.forearm,elbow,hand);
   l.shoulder.position.copy(shoulder);l.elbow.position.copy(elbow);l.glove.position.copy(hand);l.glove.rotation.y=steer;
   const thigh=hip.clone().add(v(side*.24,-.02,0)),ankle=v(side*.31,.43,.03);
   const knee=limbJoint(thigh,ankle,.49,.48,v(side*.44,.78,.65));
   placeSegment(l.thigh,thigh,knee);placeSegment(l.shin,knee,ankle);l.knee.position.copy(knee);
   l.boot.position.copy(ankle).add(v(0,-.015,.07));
   l.shinGuard.position.copy(ankle).lerp(knee,.42).add(v(0,0,.07));l.shinGuard.quaternion.copy(l.shin.quaternion);
  }
 }
 update();return {root,update,limbs};
}
