// Original rider-controller event selection, 0x40fa10..0x40fbac.
// records[kind] contains three groups of DWORD values. Group zero may be empty;
// the other two groups must contain at least one entry, as in the original data.
export function startMcmRiderEvent({kind,defaultKind,records,randomValues,drawRandom,velocity}){
 const selectedKind=kind===-1?defaultKind:kind,groups=records[selectedKind];
 let randomCalls=0;
 const choose=values=>{
  const value=drawRandom?drawRandom():randomValues[randomCalls];randomCalls++;
  const x=Math.fround((value/32768)*values.length-.5);
  const floor=Math.floor(x),fraction=x-floor;
  const index=fraction<.5?floor:fraction>.5?floor+1:floor%2===0?floor:floor+1;
  return values[index];
 };
 const first=groups[0].length?choose(groups[0]):0;
 return {kind:selectedKind,selected:[first,choose(groups[1]),choose(groups[2])],active13c:1,active16c:1,previousVelocity:[...velocity],randomCalls};
}
