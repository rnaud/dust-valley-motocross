// The rider controller runs outside the captured main-bike update. Counts are
// cumulative observations; normalize at each replay entry, never rewrite them.
export function compareRiderTiming(rows){
 const passes=[0,1].map(pass=>rows.filter(r=>r.pass===pass));
 if(!passes[0].length||passes[0].length!==passes[1].length)throw Error('Incomplete rider timing passes');
 const fixed=rows[0].fixedRider===true;
 for(const r of rows){
  if(!Number.isInteger(r.riderUpdateCount)||r.riderUpdateCount<0||!Number.isInteger(r.riderDtBits)||r.riderDtBits<0||r.riderDtBits>0xffffffff)throw Error('Missing rider timing observation');
  if((r.fixedRider===true)!==fixed)throw Error('Mixed rider timing protocols');
  if(fixed&&r.riderUpdateCount>0&&r.riderDtBits!==0x3ca3d70a)throw Error('Controlled rider interval differs');
 }
 const differences=[],summaries=[];
 for(const p of passes){
  let previous=p[0].riderUpdateCount;const intervals=new Set();let updatesDuringBike=0;
  for(let i=0;i<p.length;i++){
   const r=p[i];if(r.riderUpdateCount<previous)throw Error('Rider update counter regressed');
   if(r.riderUpdateCount>previous)intervals.add(r.riderDtBits);
   if(i%2)updatesDuringBike+=r.riderUpdateCount-p[i-1].riderUpdateCount;
   previous=r.riderUpdateCount;
  }
  summaries.push({updates:previous-p[0].riderUpdateCount,updatesDuringBike,intervalBits:[...intervals]});
 }
 for(let i=0;i<passes[0].length;i++){
  const a=passes[0][i],b=passes[1][i];
  if(a.phase!==b.phase||a.playerFrame!==b.playerFrame)throw Error('Mispaired rider timing boundaries');
  const countA=a.riderUpdateCount-passes[0][0].riderUpdateCount,countB=b.riderUpdateCount-passes[1][0].riderUpdateCount;
  // Last interval at pass entry belongs to the preceding, uncheckpointed frame.
  if(countA!==countB||(countA>0&&countB>0&&a.riderDtBits!==b.riderDtBits))differences.push({frame:a.playerFrame,phase:a.phase,countA,countB,dtA:a.riderDtBits,dtB:b.riderDtBits});
 }
 return {fixed,passes:summaries,differences};
}
