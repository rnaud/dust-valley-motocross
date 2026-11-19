// Original procedural riding terrains for Dust Valley's own bike handling.
// Each map is a pure height function plus paint, scenery and soil settings,
// so terrain, collision, sand and texture all follow the same surface.
import {DRY_SAND} from './terramechanics.js';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
const fract=v=>v-Math.floor(v);
const wrapAngle=a=>a-TAU*Math.round(a/TAU);

function hash(ix,iz,seed){
 let h=Math.imul(ix|0,374761393)^Math.imul(iz|0,668265263)^Math.imul(seed|0,1274126177);
 h=Math.imul(h^(h>>>13),1103515245);return ((h^(h>>>16))>>>0)/4294967296;
}
export function valueNoise(x,z,seed=0){
 const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz,su=u*u*(3-2*u),sv=v*v*(3-2*v);
 const a=hash(ix,iz,seed),b=hash(ix+1,iz,seed),c=hash(ix,iz+1,seed),d=hash(ix+1,iz+1,seed);
 return a+(b-a)*su+(c-a)*sv+(a-b-c+d)*su*sv;
}
export function fbm(x,z,octaves=3,seed=0){
 let sum=0,amp=.5,norm=0;
 for(let o=0;o<octaves;o++){sum+=valueNoise(x,z,seed+o*17)*amp;norm+=amp;x=x*2.03+11.7;z=z*2.03-7.3;amp*=.5;}
 return sum/norm;
}
const mix=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const grain=(x,z,amount)=>(valueNoise(x*.9,z*.9,91)-.5)*amount+(hash(Math.floor(x*1.6),Math.floor(z*1.6),5)-.5)*amount*.6;

// ---------------------------------------------------------------- Dunes ---
// Transverse dunes driven by a steady wind: long windward ramps, short slip
// faces, crests that wander and break into horns. A flat pan holds the start.
const WIND={x:.94,z:.34};
function dunePhase(x,z){
 const along=x*WIND.x+z*WIND.z,across=-x*WIND.z+z*WIND.x;
 const warp=34*fbm(across*.004+3,along*.003,2,1)+14*Math.sin(across*.013);
 return {along,across,p:fract((along+warp)/200)};
}
function dunesHeight(x,z){
 const {along,across,p}=dunePhase(x,z),face=.3;
 // Knife-edge crests: the windward ramp keeps its slope right to the brink,
 // then the slip face drops steeply and eases out at its foot.
 const w=p/(1-face),q=(p-(1-face))/face;
 const profile=p<1-face?w*w*(1.6-.6*w):(1-q)*(1-q);
 const crest=11+18*fbm(across*.003+9,along*.0022,2,2);
 const horns=.5+.5*fbm(across*.014,along*.008,2,3);
 // Broad draa-scale swells under the dunes add ~20 m of slow relief.
 const pan=2.2*fbm(x*.01,z*.01,2,4)+20*fbm(x*.0022+40,z*.0022-13,2,6);
 // A second, smaller dune set (~85 m apart, crests 3–8 m) fills the troughs
 // between the big ridges, so the middle distance reads as a busy dune sea.
 const p2=fract((along*1.07+across*.18+17*fbm(across*.012+5,along*.01,2,7))/85),w2=p2/.72,q2=(p2-.72)/.28;
 const small=(p2<.72?w2*w2*(1.6-.6*w2):(1-q2)*(1-q2))*(3+5*fbm(across*.02+1,along*.015,2,8));
 const trough=1-smooth(profile*1.6);
 const dune=pan+profile*crest*horns+small*trough;
 const r=Math.hypot(x,z);
 return lerp(pan,dune,smooth((r-22)/42))-20*fbm(40,-13,2,6);
}
function dunesPaint(x,z,h,slope){
 const {p}=dunePhase(x,z),lee=p>.7?smooth((p-.7)/.025)*(1-smooth((p-.92)/.08)):0;
 let c=mix([226,200,160],[238,218,180],smooth(h/12));
 c=mix(c,[222,192,150],lee*.35);                       // slip faces: lighting does the shading
 c=mix(c,[206,176,134],smooth((.08-h)/2.5)*.35);       // firmer interdune pans
 const g=grain(x,z,5);return [c[0]+g,c[1]+g*.9,c[2]+g*.75];
}

const dunesSand=()=>1;

// --------------------------------------------------------------- Quarry ---
// A terraced open pit: four benches with steep faces, a spiral haul road,
// spoil heaps on the rim and gravel mounds on the floor.
const PIT={x:0,z:200,rx:200,rz:160,depth:34,levels:4};
const roadTop=-Math.PI/2;                              // road reaches the rim nearest the start
const roadAngle=r=>roadTop-(1-r)*TAU*.85;
const spoils=[[-150,-40,13,34],[130,-70,10,30],[-250,170,15,40],[250,240,12,36],[40,-150,8,26]];
const floorMounds=[[-30,200,3.2,13],[25,215,2.4,9],[0,170,2.8,11]];
function pitCoords(x,z){const dx=(x-PIT.x)/PIT.rx,dz=(z-PIT.z)/PIT.rz;return {r:Math.hypot(dx,dz),a:Math.atan2(dz,dx)};}
function roadMask(r,a){
 if(r>1.02)return 0;
 const lateral=Math.abs(wrapAngle(a-roadAngle(Math.min(1,r))))*Math.max(r,.05)*(PIT.rx+PIT.rz)/2;
 return 1-smooth((lateral-5)/4);
}
function quarryHeight(x,z){
 const {r,a}=pitCoords(x,z),L=PIT.levels;
 let outside=1.4*fbm(x*.008,z*.008,2,20);
 for(const [sx,sz,H,R] of spoils){const d=Math.hypot(x-sx,z-sz)/R;if(d<1)outside+=H*smooth(1-d)*(.85+.15*Math.cos(d*9));}
 const t=clamp(r,0,1)*L,step=Math.floor(Math.min(t,L-1e-6)),f=t-step;
 const stepped=Math.min(L,step+smooth((f-.72)/.28)),road=roadMask(r,a);
 const level=lerp(stepped,t,road);
 let pit=-PIT.depth*(1-level/L)+.5*fbm(x*.05,z*.05,2,21)*(1-road);
 if(r<.25)for(const [mx,mz,H,R] of floorMounds){const d=Math.hypot(x-mx,z-mz)/R;if(d<1)pit+=H*(d<.35?1:1-smooth((d-.35)/.65));}
 return lerp(pit,outside,smooth((r-1)/.08));
}
function quarryPaint(x,z,h,slope){
 const {r,a}=pitCoords(x,z),road=roadMask(r,a);
 const bands=.5+.5*Math.sin(h*1.7+fbm(x*.02,z*.02,2,22)*3);
 let c=mix([176,168,150],[150,138,118],bands*.6);    // limestone faces
 c=mix(c,[201,186,158],smooth((.45-slope)/.3));        // flat benches dusty pale
 c=mix(c,[132,120,104],road*.65);                      // compacted haul road
 c=mix(c,[196,170,124],smooth((r-1)/.1));              // rim plateau soil
 const g=grain(x,z,16);return [c[0]+g,c[1]+g,c[2]+g*.9];
}

// --------------------------------------------------------------- Canyon ---
// A meandering gorge cut into a red sandstone plateau. Layered ledges step
// the walls, side gullies climb out, and rock steps make kickers in the wash.
const gorgeCenter=z=>55*Math.sin(z*.011)+22*Math.sin(z*.029+1.3);
const gorgeSlope=z=>55*.011*Math.cos(z*.011)+22*.029*Math.cos(z*.029+1.3);
function gorgeCoords(x,z){
 const c=gorgeCenter(z),d=Math.abs(x-c)/Math.sqrt(1+gorgeSlope(z)**2),w=17+9*fbm(z*.008,3,2,30);
 return {d,w,wall:d-w,side:x>c?1:-1};
}
function canyonHeight(x,z){
 const {d,w,wall,side}=gorgeCoords(x,z),plateau=30+4*fbm(x*.01,z*.01,3,31);
 if(wall<=0){
  const dish=-.7*(1-(d/w)**2),wash=.5*fbm(x*.06,z*.06,2,32);
  const p=fract(z/68+.3),ledge=p<.09?1.1*smooth(p/.09):p<.12?1.1*(1-smooth((p-.09)/.03)):0;
  const atCenter=1-smooth((d/w-.55)/.3);
  return dish+wash+ledge*atCenter*smooth((Math.abs(z)-24)/10);
 }
 const rise=clamp(wall/28,0,1),strata=rise*5,k=Math.floor(Math.min(strata,4.999)),f=strata-k;
 const terraced=(k+smooth((f-.45)/.55))/5;
 let h=plateau*lerp(smooth(rise),terraced,.65);
 const notch=Math.pow(Math.max(0,Math.sin(z*.031+(side>0?1.9:0))),14);
 h*=1-.6*notch*(1-smooth((wall-12)/55));
 return h;
}
function canyonPaint(x,z,h,slope){
 const {wall}=gorgeCoords(x,z),strata=.5+.5*Math.sin(h*2.1+fbm(x*.015,z*.015,2,33)*2.5);
 let c=mix([180,92,58],[208,124,78],strata);           // red sandstone layers
 c=mix(c,[226,170,118],smooth((.35-slope)/.25)*.7);    // sand caught on ledges
 c=mix(c,[222,182,134],1-smooth(wall/3));              // pale wash floor
 c=mix(c,[160,84,56],smooth((h-28)/3)*.4);             // weathered plateau cap
 const g=grain(x,z,15);return [c[0]+g,c[1]+g*.8,c[2]+g*.7];
}

function canyonSand(x,z,h,slope){const {wall}=gorgeCoords(x,z);return Math.max(1-smooth(wall/4),smooth((.3-slope)/.2)*smooth((26-h)/4)*.6);}

// ----------------------------------------------------------------- Baja ---
// An open desert run: a long loop trail with whoop sections, braided dry
// washes and flat-topped mesas off to the sides of the route.
const trailRadius=a=>255+45*Math.sin(3*a+.4)+20*Math.sin(5*a);
function trailCoords(x,z){const a=Math.atan2(z,x),rho=Math.hypot(x,z);return {a,rho,lateral:Math.abs(rho-trailRadius(a))};}
function bajaHeight(x,z){
 const {a,lateral}=trailCoords(x,z),trail=1-smooth((lateral-4)/5);
 const broad=8*fbm(x*.0035,z*.0035,3,40),roll=3*fbm(x*.012,z*.012,2,41);
 const n=fbm(x*.006+5,z*.006-3,2,42),wash=(1-smooth(Math.abs(n-.5)/.045))*2.4;
 const clearance=smooth((lateral-30)/20)*smooth((Math.hypot(x-trailRadius(0),z)-50)/30);
 const mesa=smooth((fbm(x*.004+50,z*.004-20,2,43)-.6)/.05)*14*clearance;
 let h=broad+roll-wash+mesa;
 const section=smooth((Math.sin(2*a-1.2)-.35)/.2),arc=a*270;
 const whoops=.55*Math.sin(arc/6.5*TAU)*section;
 h=lerp(h,broad+roll*.4+whoops,trail*.85);
 return h;
}
function bajaPaint(x,z,h,slope){
 const {lateral}=trailCoords(x,z),n=fbm(x*.006+5,z*.006-3,2,42),wash=1-smooth(Math.abs(n-.5)/.06);
 let c=mix([198,162,112],[184,150,104],fbm(x*.02,z*.02,2,44));
 c=mix(c,[150,128,86],smooth((fbm(x*.05,z*.05,2,45)-.58)/.1)*.6); // creosote scrub
 c=mix(c,[218,194,150],wash*.7);                        // pale wash gravel
 c=mix(c,[168,108,72],smooth((slope-.6)/.3));           // mesa cliffs
 c=mix(c,[164,128,90],(1-smooth((lateral-3)/3))*.6);     // worn trail
 const g=grain(x,z,14);return [c[0]+g,c[1]+g*.9,c[2]+g*.75];
}

function bajaSand(x,z,h,slope){const {lateral}=trailCoords(x,z),n=fbm(x*.006+5,z*.006-3,2,42),wash=1-smooth(Math.abs(n-.5)/.06);return clamp(.3+wash*.7,0,1)*smooth((.5-slope)/.3)*smooth((lateral-3)/4);}

export const terrainMaps=[
 {id:'dunes',name:'Sidewinder Dunes',tag:'SOFT SAND · BIG CRESTS',description:'An open dune sea. Climb the long windward ramps and launch off the crests; deep sand ruts, slumps and roosts.',height:dunesHeight,paint:dunesPaint,sand:dunesSand,flow:{depth:40},view:{light:{elevation:13,sun:'#ffe2b8',sunI:4,hemiSky:'#9dbde6',hemiGround:'#c9ad80',hemiI:.55,env:.3,fog:'#c8d6e2',exposure:.98,glow:'#ffe6b8',zenith:'#21539e',horizon:'#c3d3e2',clouds:.5},haze:.00022,sandColor:'#e6caa0',ripple:1,wind:WIND,sparkle:1,fog:[600,3000],far:5200,spray:{dust:'#e6cfa6',clod:'#dcc092'}},spawn:{x:0,z:0,yaw:Math.atan2(WIND.x,WIND.z)},
  soil:{maxDepth:.34,maxLift:.22,settle:.1,dig:.2,lip:.05,sideLip:true,plough:.11,packRelief:.05,repose:31,roost:.55,gouge:1,dust:1,conserve:true,terra:{...DRY_SAND,CI:60e3,slipSink:1.6,gripAssist:1.15}},
  scenery:{buttes:false,boulders:false,decorations:false,grass:false,arch:false,groundDetail:false},clear:()=>false},
 {id:'quarry',name:'Breaker Quarry',tag:'HARDPACK · TERRACED PIT',description:'A four-bench open pit. Take the spiral haul road down or drop the bench faces; gravel mounds on the floor.',height:quarryHeight,paint:quarryPaint,sand:()=>0,view:{light:{elevation:30,sun:'#fff1d8',sunI:3,hemiSky:'#bcd0e2',hemiGround:'#9e9584',hemiI:.85,fog:'#cfd8dc',exposure:1.02,glow:'#fff2d4',zenith:'#4a78b8',horizon:'#dbe3e6',clouds:.35},ripple:0,wind:{x:1,z:0},sparkle:.35,fog:[200,1250],far:1700,spray:{dust:'#d3cbbb',clod:'#bdb3a2'}},spawn:{x:0,z:0,yaw:0},
  soil:{maxDepth:.06,maxLift:.025,settle:.02,dig:.035,lip:.014,sideLip:true,plough:.035,packRelief:.015,repose:0,roost:.15,gouge:.25,dust:.55,conserve:true,terra:{n:.8,kc:5e4,kphi:6e6,CI:1.2e6,slipSink:.5,gripAssist:1.6}},
  scenery:{buttes:true,boulders:true,decorations:false,grass:false,arch:false},clear:(x,z)=>{const {r,a}=pitCoords(x,z);return r<1.1||roadMask(r,a)>0;}},
 {id:'canyon',name:'Red Gorge',tag:'SANDY WASH · STEP LEDGES',description:'A winding gorge through red sandstone. Hit the rock steps in the wash and climb the side gullies to the plateau.',height:canyonHeight,paint:canyonPaint,sand:canyonSand,flow:{depth:1.5},view:{sandColor:'#dfb98e',light:{elevation:19,sun:'#ffd9a8',sunI:3.6,hemiSky:'#a9c4e2',hemiGround:'#b06a46',hemiI:.5,env:.28,fog:'#d4cfc8',exposure:1,glow:'#ffdcae',zenith:'#3f6fb2',horizon:'#dcd9d2',clouds:.45},ripple:.7,wind:{x:.2,z:.98},sparkle:.7,fog:[220,1400],far:1900,spray:{dust:'#dcae86',clod:'#c98e62'}},spawn:{x:gorgeCenter(0),z:0,yaw:Math.atan2(gorgeSlope(0),1)},
  soil:{maxDepth:.18,maxLift:.09,settle:.06,dig:.11,lip:.035,sideLip:true,plough:.075,packRelief:.03,repose:34,roost:.35,gouge:.7,dust:.75,conserve:true,terra:{n:1,kc:2.5e3,kphi:2.2e6,CI:150e3,slipSink:1.2,gripAssist:1.25}},
  scenery:{buttes:false,boulders:true,decorations:true,grass:true,arch:false},clear:(x,z)=>gorgeCoords(x,z).wall<4},
 {id:'baja',name:'Long Wash',tag:'OPEN DESERT · WHOOPS',description:'A long desert loop past mesas and dry washes. Skim the whoop sections and cut across the open ground.',height:bajaHeight,paint:bajaPaint,sand:bajaSand,flow:{depth:.4},view:{light:{elevation:17,sun:'#ffdfb2',sunI:3.7,hemiSky:'#abc7e6',hemiGround:'#bf9a6c',hemiI:.5,env:.28,fog:'#cfd7dd',exposure:1,glow:'#ffe2b4',zenith:'#3c6cb1',horizon:'#d6e0e6',clouds:.5},haze:.00045,sandColor:'#dcbd92',ripple:.6,wind:{x:.7,z:.71},sparkle:.6,fog:[260,2100],far:4200,spray:{dust:'#d8bf96',clod:'#c9a676'}},spawn:{x:trailRadius(0),z:0,yaw:0},
  soil:{maxDepth:.12,maxLift:.06,settle:.045,dig:.08,lip:.03,sideLip:true,plough:.05,packRelief:.02,repose:33,roost:.3,gouge:.6,dust:.85,conserve:true,terra:{n:.9,kc:3e4,kphi:3e6,CI:400e3,slipSink:.9,gripAssist:1.35}},
  scenery:{buttes:false,boulders:true,decorations:true,grass:true,arch:false},clear:(x,z)=>trailCoords(x,z).lateral<9}
];
export const terrainMap=id=>terrainMaps.find(m=>m.id===id)??null;

// Paint a world-space colour map covering the 900 m terrain, sampled like the
// existing macro texture (u=(x+450)/900, v=1-(z+450)/900). Returns RGBA bytes;
// row 0 is z=-450. Alpha holds sandiness (where wind ripples form).
export function paintTerrainMap(map,size=1024){
 const data=new Uint8ClampedArray(size*size*4),step=900/size,heights=new Float32Array(size*size);
 for(let py=0;py<size;py++)for(let px=0;px<size;px++)heights[py*size+px]=map.height(px*step-450+step/2,py*step-450+step/2);
 const at=(px,py)=>heights[clamp(py,0,size-1)*size+clamp(px,0,size-1)];
 for(let py=0;py<size;py++)for(let px=0;px<size;px++){
  const x=px*step-450+step/2,z=py*step-450+step/2,h=heights[py*size+px];
  const slope=Math.hypot(at(px+1,py)-at(px-1,py),at(px,py+1)-at(px,py-1))/(2*step);
  const shade=1-clamp(slope-.25,0,1)*.12,c=map.paint(x,z,h,slope),i=(py*size+px)*4;
  data[i]=c[0]*shade;data[i+1]=c[1]*shade;data[i+2]=c[2]*shade;data[i+3]=255*clamp(map.sand?.(x,z,h,slope)??0,0,1);
 }
 return data;
}
