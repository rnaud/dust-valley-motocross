// Full-terrain granular surface flow: the reference (CPU) model of the GPU
// sand step in sand-flow-gpu.js. Both implement exactly these rules.
//
// State per cell: bed height h, a thin rolling layer r on top of the bed
// (BCRE two-phase surface flow: Bouchaud, Cates, Ravi Prakash & Edwards 1994;
// Boutreux & de Gennes' slope-driven exchange), bedrock floor `rock` below
// which the bed cannot erode, and a flowing flag for repose hysteresis.
//
//  1. Rolling sand runs downhill at the depth-averaged speed of Pouliquen's
//     flow rule, u = β·√(g·r)·r / h_stop(θ), with
//     h_stop(θ) = h0·(tan θ_max − tan θ)/(tan θ − tan θ_dyn).
//     The outflow is shared between the four neighbours by downhill slope.
//  2. Exchange with the bed: while flowing, slopes steeper than the dynamic
//     angle (31°) erode the bed into the rolling layer at a rate that grows
//     with the layer (BCRE); gentler slopes deposit it. Still sand only starts to move above the static angle (34°), so
//     slopes between the two angles are stable (angle-of-repose hysteresis).
// Every transfer is between cells or between layers, so total sand volume is
// conserved exactly (up to float rounding).
const deg=Math.PI/180;
export const FLOW=Object.freeze({
 g:9.81,tanStatic:Math.tan(34*deg),tanDynamic:Math.tan(31*deg),tanMax:Math.tan(50*deg),
 beta:.136,hStop:.004,erosion:25,seed:.01,deposition:1.2,settle:.002,settleRate:3,rollMax:.3,minLayer:1e-4,maxOut:.5,cfl:.45
});

export function createFlowState(n,{height,rock}){
 const h=new Float32Array(n*n),r=new Float32Array(n*n),bed=new Float32Array(n*n),flowing=new Uint8Array(n*n);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i;h[k]=height(i,j);bed[k]=Math.min(h[k],rock(i,j,h[k]));}
 return {n,h,r,rock:bed,flowing,flux:new Float32Array(n*n*4)};
}

// Steepest-descent slope from a cell to its 4 neighbours. One-sided (it
// includes the cell itself), which avoids the odd–even checkerboard that
// central differences allow.
export const descent=(c,e,w,n,s,dx)=>Math.hypot(Math.max(0,c-e,c-w),Math.max(0,c-n,c-s))/dx;
// Outflow of the rolling layer from one cell to (+x, −x, +z, −z).
export function cellFlux(z,r,zE,zW,zN,zS,dx,dt,out){
 out[0]=out[1]=out[2]=out[3]=0;
 if(r<=FLOW.minLayer)return out;
 const t=descent(z,zE,zW,zN,zS,dx);
 if(t<=FLOW.tanDynamic)return out;
 const hStop=hStopAt(t);
 const u=Math.min(FLOW.beta*Math.sqrt(FLOW.g*r)*r/hStop,FLOW.cfl*dx/dt),total=r*Math.min(FLOW.maxOut,u*dt/dx);
 const s=[Math.max(0,z-zE),Math.max(0,z-zW),Math.max(0,z-zN),Math.max(0,z-zS)],sum=s[0]+s[1]+s[2]+s[3];
 if(sum<=0)return out;
 for(let k=0;k<4;k++)out[k]=total*s[k]/sum;
 return out;
}

// Pouliquen's h_stop(θ): layers thinner than this come to rest on slope θ.
export function hStopAt(tan){
 if(tan<=FLOW.tanDynamic)return Infinity;
 const t=Math.min(tan,FLOW.tanMax-.01);return FLOW.hStop*(FLOW.tanMax-t)/(t-FLOW.tanDynamic);
}
// Bed/rolling exchange for one cell after transport. Returns [h, r, flowing].
export function cellExchange(h,r,rock,flowing,tanBed,dt){
 const hs=hStopAt(tanBed);
 if(flowing||r>FLOW.minLayer){
  if(r>=hs){
   // BCRE erosion grows with the rolling layer and saturates as it thickens.
   const e=Math.min(FLOW.erosion*(tanBed-FLOW.tanDynamic)*(r+FLOW.seed)*Math.max(0,1-r/FLOW.rollMax)*dt,Math.max(0,h-rock));h-=e;r+=e;flowing=1;
  }else{
   // Thinner than h_stop: the layer stops and settles back into the bed.
   const d=Math.min(r,FLOW.settleRate*r*dt+FLOW.deposition*Math.max(0,FLOW.tanDynamic-tanBed)*dt+(r<FLOW.settle?r:0));h+=d;r-=d;
  }
  if(r<=FLOW.minLayer){h+=r;r=0;flowing=0;}
 }else if(tanBed>FLOW.tanStatic&&h>rock+FLOW.minLayer){
  // Still sand fails above the static angle as a slab a little thicker than h_stop.
  const e=Math.min(1.5*hs,FLOW.rollMax,h-rock);h-=e;r+=e;flowing=1;
 }
 return [h,r,flowing];
}

const at=(n,i,j)=>Math.min(n-1,Math.max(0,j))*n+Math.min(n-1,Math.max(0,i));
export function stepFlow(state,dx,dt){
 const {n,h,r,rock,flowing,flux}=state,o=[0,0,0,0];
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const k=j*n+i,z=c=>h[c]+r[c];
  cellFlux(z(k),r[k],z(at(n,i+1,j)),z(at(n,i-1,j)),z(at(n,i,j+1)),z(at(n,i,j-1)),dx,dt,o);
  // Edges are walls: no outflow past the border.
  if(i===n-1)o[0]=0;if(i===0)o[1]=0;if(j===n-1)o[2]=0;if(j===0)o[3]=0;
  flux.set(o,k*4);
 }
 const nh=new Float32Array(h),nr=new Float32Array(r);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const k=j*n+i,f=k*4;
  let rr=r[k]-flux[f]-flux[f+1]-flux[f+2]-flux[f+3];
  if(i>0)rr+=flux[(k-1)*4];if(i<n-1)rr+=flux[(k+1)*4+1];if(j>0)rr+=flux[(k-n)*4+2];if(j<n-1)rr+=flux[(k+n)*4+3];
  const tanBed=descent(h[k],h[at(n,i+1,j)],h[at(n,i-1,j)],h[at(n,i,j+1)],h[at(n,i,j-1)],dx);
  const [hh,r2,fl]=cellExchange(h[k],Math.max(0,rr),rock[k],flowing[k],tanBed,dt);
  nh[k]=hh;nr[k]=r2;flowing[k]=fl;
 }
 h.set(nh);r.set(nr);
}
export const totalVolume=(state,dx)=>{let v=0;for(let k=0;k<state.h.length;k++)v+=state.h[k]+state.r[k];return v*dx*dx;};
