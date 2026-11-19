import * as T from 'three';
import {fitBikeLink} from './bike-linkage.js';
import {limbJoint} from './rider.js';

// An original late-90s style bike and rider: few polygons, flat shading and
// tiny nearest-filtered pixel textures. It uses the same body-local frame as
// the modern bike (axles at z -1.05 / 1.1, bars at 0,1.34,.7, pegs at ±.31,.43)
// so physics, steering, suspension links and the rider IK are unchanged.

export const RETRO_PALETTE={orange:'#f07a2a',cream:'#f4e6c4',purple:'#5a3d8a',ink:'#1d1a22',chrome:'#a7a8b5',rubber:'#2a2630',tan:'#c99a5b'};
const rgb=hex=>{const c=new T.Color(hex);return [c.r*255|0,c.g*255|0,c.b*255|0];};
const P=Object.fromEntries(Object.entries(RETRO_PALETTE).map(([k,v])=>[k,rgb(v)]));

// 3×5 pixel glyphs for the number plates and tank logo.
const GLYPHS={'9':['111','101','111','001','111'],'8':['111','101','111','101','111'],'D':['110','101','101','101','110'],'V':['101','101','101','101','010']};
export function pixelTexture(width,height,paint){
 const data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const c=paint(x,y),i=(y*width+x)*4;data[i]=c[0];data[i+1]=c[1];data[i+2]=c[2];data[i+3]=255;}
 const t=new T.DataTexture(data,width,height);
 t.magFilter=T.NearestFilter;t.minFilter=T.NearestFilter;t.generateMipmaps=false;t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;
 return t;
}
const glyphAt=(text,x,y,ox,oy,scale=1)=>{
 const gx=Math.floor((x-ox)/scale),gy=Math.floor((y-oy)/scale),char=Math.floor(gx/4),col=gx%4;
 if(gx<0||gy<0||gy>=5||char>=text.length||col>=3)return false;
 return GLYPHS[text[char]][4-gy][col]==='1';
};
function retroTextures(number='98'){
 const plate=pixelTexture(16,16,(x,y)=>x===0||y===0||x===15||y===15?P.ink:glyphAt(number,x,y,1,3,2)?P.ink:P.cream);
 const tank=pixelTexture(16,16,(x,y)=>y>=6&&y<=8?P.cream:y===5||y===9?P.purple:glyphAt('DV',x,y,4,10)?P.cream:P.orange);
 const knobby=pixelTexture(8,16,(x,y)=>(y%4<2)!==(x<4)?P.rubber:[18,16,22]);
 const jersey=pixelTexture(16,16,(x,y)=>x>=6&&x<=9?P.cream:y<3?P.purple:y>12&&(x+y)%2===0?P.purple:P.orange);
 const pants=pixelTexture(8,8,(x,y)=>x===2||x===5?P.orange:P.ink);
 const helmet=pixelTexture(16,16,(x,y)=>y>=9&&y<=11?P.purple:x>=7&&x<=8?P.orange:P.cream);
 return {plate,tank,knobby,jersey,pants,helmet};
}

function material(color,map,options={}){return new T.MeshStandardMaterial({color:map?'#ffffff':color,map:map??null,flatShading:true,roughness:.85,metalness:0,...options});}

export function createRetroBike({number='98'}={}){
 const tex=retroTextures(number);
 const mats={
  orange:material(RETRO_PALETTE.orange),cream:material(RETRO_PALETTE.cream),purple:material(RETRO_PALETTE.purple),
  ink:material(RETRO_PALETTE.ink),chrome:material(RETRO_PALETTE.chrome,null,{metalness:.4,roughness:.5}),
  plate:material(null,tex.plate),tank:material(null,tex.tank),tire:material(null,tex.knobby),
  jersey:material(null,tex.jersey),pants:material(null,tex.pants),helmet:material(null,tex.helmet)
 };
 const add=(parent,geo,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(parent,w,h,d,mat,x,y,z)=>add(parent,new T.BoxGeometry(w,h,d),mat,x,y,z);

 // ------------------------------------------------------------ chassis ---
 const chassis=new T.Group();chassis.name='retro-chassis';
 const tube=(a,b,r=.04,mat=mats.chrome)=>{const m=add(chassis,new T.CylinderGeometry(r,r,1,4),mat);fitBikeLink(m,new T.Vector3(...a),new T.Vector3(...b));return m;};
 for(const side of [-1,1]){
  const x=side*.19;
  tube([x,1.18,.65],[x,.26,.35]);tube([x,.26,.35],[x,.25,-.28]);tube([x,.25,-.28],[x,.96,-.5]);tube([x,.96,-.5],[x,1.18,.65]);
  tube([x,.96,-.5],[x,1.02,-1.05],.03);
 }
 const tank=box(chassis,.46,.3,.62,mats.tank,0,1.02,.3);tank.rotation.x=-.14;
 const seat=box(chassis,.36,.12,1.1,mats.ink,0,1.15,-.36);seat.rotation.x=.035;
 const engine=box(chassis,.36,.38,.46,mats.chrome,0,.53,.02);engine.rotation.x=.13;
 for(let i=0;i<4;i++)box(chassis,.42,.03,.3,mats.ink,0,.56+i*.07,.12);
 box(chassis,.4,.08,.56,mats.ink,0,.22,.02);
 for(const side of [-1,1]){
  // Side number plates and wedge radiator shrouds.
  const panel=box(chassis,.05,.34,.56,mats.plate,side*.25,.86,-.48);panel.rotation.x=-.12;
  const shroud=add(chassis,new T.CylinderGeometry(.2,.2,.05,3),mats.orange,side*.25,.86,.42);shroud.rotation.z=Math.PI/2;shroud.rotation.y=.2*side;
 }
 const rearFender=box(chassis,.22,.05,.7,mats.orange,0,1.04,-1.02);rearFender.rotation.x=.22;
 const frontPlate=box(chassis,.3,.26,.04,mats.plate,0,1.02,.98);frontPlate.rotation.x=-.2;
 const exhaust=add(chassis,new T.CylinderGeometry(.065,.09,.66,5),mats.chrome,.29,.88,-.72);exhaust.rotation.x=Math.PI/2+.12;
 tube([.23,.51,.25],[.3,.65,-.35],.05);

 // --------------------------------------------------------- handlebar ---
 const bars=new T.Group();bars.name='retro-bars';
 const bar=add(bars,new T.CylinderGeometry(.035,.035,1.06,4),mats.chrome);bar.rotation.z=Math.PI/2;
 box(bars,.28,.09,.1,mats.purple,0,.02,0);
 for(const side of [-1,1]){const grip=add(bars,new T.CylinderGeometry(.055,.055,.19,4),mats.ink,side*.48,0,0);grip.rotation.z=Math.PI/2;}

 // ------------------------------------------------------------- wheels ---
 // Wheel groups match the modern wheel frame: axle along local x.
 const wheel=()=>{
  const g=new T.Group();g.name='retro-wheel';
  const tire=add(g,new T.CylinderGeometry(.61,.61,.26,10,1,true),mats.tire);tire.rotation.z=Math.PI/2;
  for(const side of [-1,1]){const wall=add(g,new T.RingGeometry(.4,.61,10,1),mats.ink,side*.13,0,0);wall.rotation.y=side*Math.PI/2;}
  const rim=add(g,new T.CylinderGeometry(.42,.42,.16,10,1,true),mats.chrome);rim.rotation.z=Math.PI/2;
  const hub=add(g,new T.CylinderGeometry(.11,.11,.3,6),mats.chrome);hub.rotation.z=Math.PI/2;
  for(let j=0;j<6;j++){const spoke=box(g,.04,.8,.04,mats.chrome,0,0,0);spoke.rotation.x=j*Math.PI/6;}
  return g;
 };

 const frontFender=new T.Mesh(new T.BoxGeometry(.24,.05,.8),mats.orange);frontFender.castShadow=true;frontFender.name='retro-front-fender';

 // Fork, swingarm, shock and axle geometry for the same linkage kinds.
 const linkStyles={forkUpper:[.09,mats.purple],forkLower:[.055,mats.chrome],swingarm:[.075,mats.chrome],brace:[.035,mats.chrome],shock:[.08,mats.orange],axle:[.055,mats.chrome]};
 const link=kind=>{const [r,mat]=linkStyles[kind];return {geometry:kind==='swingarm'?new T.BoxGeometry(.12,1,.16):new T.CylinderGeometry(r,r,1,4),material:mat};};

 return {chassis,bars,wheel,frontFender,link,rider:createRetroRider(mats),materials:mats,textures:tex};
}

// A stiff, simply jointed rider: box limbs on the same IK targets as the
// modern rider, a faceted helmet and pixel-art kit.
export function createRetroRider(mats){
 const root=new T.Group();root.name='retro-rider';const up=new T.Vector3(0,1,0),v=(x,y,z)=>new T.Vector3(x,y,z);
 const add=(geo,mat,parent=root)=>{const m=new T.Mesh(geo,mat);m.castShadow=true;parent.add(m);return m;};
 const limb=(w,mat)=>add(new T.BoxGeometry(w,1,w),mat);
 const place=(m,a,b)=>{m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=a.distanceTo(b);m.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());};
 const torso=new T.Group();root.add(torso);
 add(new T.BoxGeometry(.5,.66,.3),mats.jersey,torso);
 const numberBack=add(new T.BoxGeometry(.3,.3,.02),mats.plate,torso);numberBack.position.set(0,.04,-.16);
 const pelvis=add(new T.BoxGeometry(.44,.26,.3),mats.pants);
 const helmet=new T.Group();root.add(helmet);
 const shell=add(new T.IcosahedronGeometry(.27,0),mats.helmet,helmet);shell.scale.set(1,1.05,1.1);
 const visor=add(new T.BoxGeometry(.34,.06,.2),mats.orange,helmet);visor.position.set(0,.17,.2);visor.rotation.x=.15;
 const goggles=add(new T.BoxGeometry(.3,.09,.06),mats.ink,helmet);goggles.position.set(0,.04,.26);
 const chin=add(new T.BoxGeometry(.22,.12,.16),mats.purple,helmet);chin.position.set(0,-.14,.22);
 const limbs=[-1,1].map(side=>({side,upperArm:limb(.17,mats.jersey),forearm:limb(.14,mats.jersey),glove:add(new T.BoxGeometry(.13,.12,.16),mats.ink),thigh:limb(.22,mats.pants),shin:limb(.17,mats.pants),boot:add(new T.BoxGeometry(.2,.3,.36),mats.cream)}));
 function update({compression=0,bank=0,lean=0,steer=0,gripQuaternion}={}){
  const corner=Math.max(-1,Math.min(1,bank)),crouch=Math.min(1,compression),shift=-Math.sin(corner)*.06;
  const hip=v(shift,1.12-crouch*.1,-.36-lean*.035);pelvis.position.copy(hip);
  // Stiffer than the modern rider: the torso tips as one block.
  torso.position.copy(hip).add(v(0,.36-Math.abs(corner)*.06,.44-lean*.03));
  torso.rotation.set(.42+crouch*.1-lean*.1,steer*.4,corner*.14);torso.updateMatrix();
  helmet.position.copy(v(0,.6,.08).applyMatrix4(torso.matrix));helmet.rotation.set(-.05-lean*.06,-steer*.3,-corner*.1);
  for(const l of limbs){
   const s=l.side,shoulder=v(s*.29,.22,0).applyMatrix4(torso.matrix),hand=v(s*.48,0,0);
   if(gripQuaternion)hand.applyQuaternion(gripQuaternion);else hand.applyAxisAngle(up,steer);
   hand.add(v(0,1.34,.7));
   const elbow=limbJoint(shoulder,hand,.43,.44,v(s*.65,1.38,.18));place(l.upperArm,shoulder,elbow);place(l.forearm,elbow,hand);l.glove.position.copy(hand);
   const thigh=hip.clone().add(v(s*.22,-.02,0)),ankle=v(s*.31,.43,.03),knee=limbJoint(thigh,ankle,.49,.48,v(s*.44,.78,.65));
   place(l.thigh,thigh,knee);place(l.shin,knee,ankle);l.boot.position.copy(ankle).add(v(0,0,.06));
  }
 }
 update();return {root,update,limbs};
}
