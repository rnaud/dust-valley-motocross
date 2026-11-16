// Original 0x43af75..0x43b003 initializes sprite slots 45 through 60.
// The preceding 45 entries are initialized by separate atlas-layout loops.
export function createMcmParticleUvTail(){
 const table=new Float32Array(16*8);
 for(let i=0;i<16;i++){
  const u=.75+(i%4)*.0625,v=.75+Math.floor(i/4)*.0625;
  table.set([u,v,u+.0625,v,u+.0625,v+.0625,u,v+.0625],i*8);
 }
 return table;
}
