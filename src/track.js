// Hand-authored desert circuit. Control points are Catmull-Rom knots; everything
// else is derived from one arc-length table so gates, paint, stakes and terrain
// all agree on where the course actually is.
export const TAU=Math.PI*2;
const CONTROL=[[0,170],[100,165],[165,120],[175,50],[140,10],[80,0],[40,-35],[70,-80],[140,-110],[155,-160],[90,-180],[0,-170],[-80,-145],[-150,-90],[-175,-10],[-165,70],[-140,135],[-70,165]];

function catmull(p0,p1,p2,p3,t){
 const t2=t*t,t3=t2*t;
 return [0.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
         0.5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)];
}

const RES=2048,knots=CONTROL.length;
const PATH=new Float64Array((RES+1)*2),DIST=new Float64Array(RES+1);
for(let i=0;i<=RES;i++){
 const u=Math.min(.999999,i/RES),segment=Math.floor(u*knots),local=u*knots-segment;
 const p=catmull(CONTROL[(segment-1+knots)%knots],CONTROL[segment],CONTROL[(segment+1)%knots],CONTROL[(segment+2)%knots],local);
 PATH[i*2]=p[0];PATH[i*2+1]=p[1];
 if(i)DIST[i]=DIST[i-1]+Math.hypot(p[0]-PATH[(i-1)*2],p[1]-PATH[(i-1)*2+1]);
}
export const trackLength=DIST[RES];

function at(distance){
 let d=distance%trackLength;if(d<0)d+=trackLength;
 let lo=0,hi=RES;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(DIST[mid]<=d)lo=mid;else hi=mid;}
 const span=DIST[hi]-DIST[lo]||1,t=(d-DIST[lo])/span;
 const x=PATH[lo*2]+(PATH[hi*2]-PATH[lo*2])*t,z=PATH[lo*2+1]+(PATH[hi*2+1]-PATH[lo*2+1])*t;
 const dx=PATH[hi*2]-PATH[lo*2],dz=PATH[hi*2+1]-PATH[lo*2+1],length=Math.hypot(dx,dz)||1;
 return {x,z,tx:dx/length,tz:dz/length};
}

// t follows the old radians convention so callers can keep using 0..TAU.
export function track(t){
 const u=((t/TAU)%1+1)%1,p=at(u*trackLength);
 return {x:p.x,z:p.z,tx:p.tx,tz:p.tz,s:u};
}
export function trackAt(s){const p=at(s*trackLength);return {...p,s};}
export function trackAngle(s){return Math.atan2(at(s*trackLength).tx,at(s*trackLength).tz);}

// Segments are bucketed into a coarse grid; nearest() is exact within ~24 m of
// the course and falls back to a 64-point approximation farther out.
const CELL=12,GRID=Math.ceil(900/CELL)+1,GRID_ORIGIN=-450;
const buckets=Array.from({length:GRID*GRID},()=>[]);
const SEGMENTS=512,segmentData=[];
for(let i=0;i<SEGMENTS;i++){
 const a=at(i/SEGMENTS*trackLength),b=at((i+1)/SEGMENTS*trackLength);
 const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;
 const segment={ax:a.x,az:a.z,dx,dz,length,tx:dx/length,tz:dz/length,s:i/SEGMENTS};
 segmentData.push(segment);
 const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minZ=Math.min(a.z,b.z),maxZ=Math.max(a.z,b.z);
 const x0=Math.max(0,Math.floor((minX-GRID_ORIGIN)/CELL)),x1=Math.min(GRID-1,Math.floor((maxX-GRID_ORIGIN)/CELL));
 const z0=Math.max(0,Math.floor((minZ-GRID_ORIGIN)/CELL)),z1=Math.min(GRID-1,Math.floor((maxZ-GRID_ORIGIN)/CELL));
 for(let gx=x0;gx<=x1;gx++)for(let gz=z0;gz<=z1;gz++)buckets[gx*GRID+gz].push(segment);
}
const coarse=Array.from({length:64},(_,i)=>{const p=at(i/64*trackLength);return {...p,s:i/64};});

function project(segment,x,z){
 const vx=x-segment.ax,vz=z-segment.az,t=Math.max(0,Math.min(1,(vx*segment.dx+vz*segment.dz)/(segment.length*segment.length)));
 const px=segment.ax+segment.dx*t,pz=segment.az+segment.dz*t,dx=x-px,dz=z-pz,distance=Math.hypot(dx,dz);
 const side=Math.sign(segment.dx*dz-segment.dz*dx||1)*distance;
 return {distance,side,px,pz,tx:segment.tx,tz:segment.tz,s:(segment.s*SEGMENTS+t)/SEGMENTS};
}

// Exact-ish nearest point on the centreline. dist is never under-reported.
export function nearestTrack(x,z){
 const cx=Math.floor((x-GRID_ORIGIN)/CELL),cz=Math.floor((z-GRID_ORIGIN)/CELL);
 let best=null;
 if(cx>=0&&cz>=0&&cx<GRID&&cz<GRID){
  for(let ring=0;ring<=2&&!best;ring++){
   for(let ix=cx-ring;ix<=cx+ring;ix++)for(let iz=cz-ring;iz<=cz+ring;iz++){
    if(ix<0||iz<0||ix>=GRID||iz>=GRID)continue;
    for(const segment of buckets[ix*GRID+iz]){
     const p=project(segment,x,z);
     if(!best||p.distance<best.distance)best=p;
    }
   }
  }
 }
 if(best&&best.distance<=24)return best;
 let far=null;
 for(const p of coarse){const d=Math.hypot(x-p.x,z-p.z);if(!far||d<far.distance)far={distance:d,side:d,px:p.x,pz:p.z,tx:p.tx,tz:p.tz,s:p.s};}
 return best&&best.distance<far.distance?best:far;
}

// Gentle grade keeps the circuit from feeling like a table top, while tabletop
// jumps are placed only where the track is straighter.
export function trackGrade(s){return 2.1*Math.sin(TAU*2*s+.4)+1.0*Math.sin(TAU*3*s+2.1);}
export const raceFeatures=[
 {s:.13,height:1.7,up:9,top:6,down:12,width:11},
 {s:.34,height:1.15,up:7,top:5,down:10,width:10},
 {s:.53,height:2.1,up:10,top:4,down:14,width:12},
 {s:.72,height:1.5,up:8,top:6,down:12,width:11},
 {s:.88,height:1.9,up:9,top:5,down:13,width:12}
];
