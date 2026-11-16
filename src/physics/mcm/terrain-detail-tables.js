// Original 44e950 initializes both tables once. The fixed 256 thresholds and
// all 65,536 forward entries are checked against the intact native initializer.
export function createMcmTerrainDetailTables(){
 const lookup=new Uint8Array(65536),inverse=new Uint16Array(256);
 let first=0;
 for(let level=0;level<256;level++){
  const last=(Math.trunc(Math.pow(level+1,1+level*level*1.5378700499807768e-5))-1)&65535;
  inverse[level]=last;
  if(first<=last){lookup.fill(level,first,last+1);first=last+1;}
 }
 return{lookup,inverse};
}
