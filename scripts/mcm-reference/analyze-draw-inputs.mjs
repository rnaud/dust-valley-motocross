import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const BEFORE='at-00445f85',AFTER='at-00445f88';
export function analyzeDrawInputs(rows){
 let active=null,calls=0,changedCalls=0,inputWordMatches=0,applyPairs=0,applyChanges=0;
 const first=rows.findIndex(r=>r.phase===BEFORE&&r.scratchAddress);if(first<0)throw Error("No initialized draw boundary");
 const batches={},targets=new Set(),applyTargets=new Set();
 for(const row of rows.slice(first)){
  for(const key of ['frame','esp','scratchAddress','scratchBits','target'])if(!Number.isInteger(row[key])||row[key]<0||row[key]>0xffffffff)throw Error('Invalid draw observation');
  if(active&&(row.frame!==active.row.frame||row.scratchAddress!==active.row.scratchAddress))throw Error('Draw identity changed');
  if(row.phase===BEFORE){
   if(active)throw Error('Nested original draw call');
   const a=row.args;
   if(!Array.isArray(a)||a.length!==8||a.some(x=>!Number.isInteger(x)||x<0||x>0xffffffff)||a[1]!==4||a[2]!==2||!a[4]||a[4]>8192||!a[6]||a[6]>32768||!row.scratchAddress)throw Error('Invalid indexed draw arguments');
   for(const [key,n] of [['verticesHex',a[4]*32],['indicesHex',a[6]*2]])if(typeof row[key]!=='string'||row[key].length!==n*2||!/^[0-9a-f]+$/.test(row[key]))throw Error('Invalid draw array');
   const vertices=Buffer.from(row.verticesHex,'hex'),indices=Buffer.from(row.indicesHex,'hex');
   for(let i=0;i<indices.length;i+=2)if(indices.readUInt16LE(i)>=a[4])throw Error('Index outside captured vertices');
   for(let i=0;i<vertices.length;i+=32)for(const o of [0,4,8,24,28])if(!Number.isFinite(vertices.readFloatLE(i+o)))throw Error('Nonfinite vertex coordinate');
   active={row,vertices,apply:null};targets.add(row.target);
  }else if(row.phase===AFTER){
   if(!active)throw Error('Unpaired draw return');
   const b=active.row;
   if(row.frame!==b.frame||row.scratchAddress!==b.scratchAddress||row.esp!==b.esp+32||active.apply)throw Error('Invalid draw return');
   calls++;if(row.scratchBits!==b.scratchBits)changedCalls++;
   const key=`${b.args[4]} vertices / ${b.args[6]} indices`;batches[key]=(batches[key]||0)+1;
   let match=false;for(let o=0;o<active.vertices.length;o+=4)if(active.vertices.readUInt32LE(o)===row.scratchBits)match=true;
   if(match)inputWordMatches++;active=null;
  }else if(active&&row.phase==='before-apply'){
   if(active.apply||!row.target)throw Error('Invalid apply entry');active.apply=row;applyTargets.add(row.target);
  }else if(active&&row.phase==='before-prepare'&&active.apply){
   if(row.esp!==active.apply.esp||row.scratchAddress!==active.apply.scratchAddress)throw Error('Invalid apply return');
   applyPairs++;if(row.scratchBits!==active.apply.scratchBits)applyChanges++;active.apply=null;
  }
 }
 if(active||!calls)throw Error('Incomplete draw capture');
 return {scope:'Observed draw inputs and caller-stack changes; no simulated graphics or scratch injection.',calls,changedCalls,batches,inputWordMatches,applyPairs,applyChanges,targets:[...targets],applyTargets:[...applyTargets],ignoredLeadingRows:first};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(analyzeDrawInputs(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse)),null,2));
