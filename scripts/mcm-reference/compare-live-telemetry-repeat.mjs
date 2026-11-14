import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

// Compare declared physical telemetry across two independently restored native
// runs. This does not compare the complete world, animation or particle pools.
const vector=(label,offset)=>[0,1,2].map(i=>({label:`${label}.${'xyz'[i]}`,offset:offset+i*4}));
export const bikeTelemetryFields=[
 ...vector('position',0x4f8),...vector('velocity',0x510),...vector('acceleration',0x51c),
 ...vector('angularVelocityWorld',0x528),...vector('angularVelocityLocal',0x534),
 ...vector('forward',0x4c0),...vector('up',0x4cc),
 ...[['roll',0x4d8],['pitch',0x4dc],['heading',0x4e0],['mass',0x558],['inverseMass',0x55c],['longitudinalSpeed',0x564],['speed',0x6a4],['frontDepth',0x590],['rearDepth',0x594],['crashed',0x844]].map(([label,offset])=>({label,offset}))
];
export const engineTelemetryFields=[['previousRpmDemand',0x7c],['released',0x150],['shiftThreshold',0x154],['gear',0x158],['rpmDemand',0x15c],['state',0x160],['shiftTimer',0x168]].map(([label,offset])=>({label,offset}));
export function compareNativeTelemetryRepeat(first,second){
 if(first.length!==second.length||!first.length||first.length%2)throw Error('Native repeat frame counts differ');
 let comparedWords=0,differences=0;const firstDifferences=[],telemetry=[];
 const check=(original,repeated,frame,field)=>{comparedWords++;if(original!==repeated){differences++;if(firstDifferences.length<20)firstDifferences.push({frame,field,original,repeated});}};
 for(let i=0;i<first.length;i+=2){
  const frame=i/2,a=first[i],b=second[i],ao=first[i+1],bo=second[i+1];
  if(a.phase!=='before-update'||b.phase!==a.phase||ao.phase!=='after-return'||bo.phase!==ao.phase||[a,b,ao,bo].some(r=>r.playerFrame!==frame||r.pass!==0))throw Error('Native repeat sequence differs');
  check(a.requestedThrottle,b.requestedThrottle,frame,'throttle');check(a.frameBits,b.frameBits,frame,'frameDelta');
  for(const [key,fields]of [['stateHex',bikeTelemetryFields],['engineHex',engineTelemetryFields]]){
   const left=Buffer.from(ao[key],'hex'),right=Buffer.from(bo[key],'hex');
   if(left.length!==right.length||left.length<Math.max(...fields.map(f=>f.offset))+4)throw Error('Native repeat allocation sizes differ');
   for(const f of fields)check(left.readUInt32LE(f.offset),right.readUInt32LE(f.offset),frame,f.label);
  }
  const bytes=Buffer.from(ao.stateHex,'hex');telemetry.push({frame,throttle:a.requestedThrottle,crashed:bytes.readUInt32LE(0x844),speed:bytes.readFloatLE(0x6a4),position:[0,4,8].map(o=>bytes.readFloatLE(0x4f8+o)),velocity:[0,4,8].map(o=>bytes.readFloatLE(0x510+o))});
 }
 return {scope:'Exact declared bike/engine telemetry words and throttle/frame timing across two independently restored native runs. Partial checkpoint; shared world and visual effects are not compared. Not full-world repeatability.',frames:first.length/2,bikeTelemetryFields,engineTelemetryFields,comparedWords,differences,firstDifferences,telemetry};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [first,second,output]=process.argv.slice(2);if(!output)throw Error('Usage: compare-live-telemetry-repeat.mjs first-boundaries.jsonl second-boundaries.jsonl report.json');
 const read=p=>fs.readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
 const report=compareNativeTelemetryRepeat(read(first),read(second));fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log({...report,telemetry:`${report.telemetry.length} samples`});
}
