import fs from 'node:fs';
import {evaluateRetainedHistory} from './retained-history-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
import {createHash} from 'node:crypto';
const [source,dir]=process.argv.slice(2);
if(!dir)throw new Error('Usage: compare-retained-history.mjs native-return-source history-output');
const capture=JSON.parse(fs.readFileSync(dir+'/capture.json'));
if(capture.exeSha256!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b'||capture.d3drmSha256!=='7edb1ed218aececbb44f4d92d5b0880f0ff1777dc525e555140f987015d8be1a')throw Error('Unrecognized native capture');
const rng=capture.randomSeed===undefined?null:fs.readFileSync(dir+'/results.bin.rng.bin');
if(rng&&!rng.equals(fs.readFileSync(dir+'/results-repeat.bin.rng.bin')))throw Error('Native RNG repeat mismatch');
const inputs=JSON.parse(fs.readFileSync(dir+'/case-inputs.json')),native=fs.readFileSync(dir+'/results.bin'),prefix=fs.readFileSync(dir+'/prefix.bin');
const old=fs.openSync(source+'/results.bin','r'),oldPrefix=fs.openSync(source+'/prefix.bin','r'),before=Buffer.alloc(46925*4),prior=Buffer.alloc(8277*4);
const size=14378126,frames=400,recordSize=35828,rows=[],mismatches=[],fixtures=[];let mismatchCount=0;
if(native.length!==inputs.length*size*4)throw Error("Native output size");
const compare=(caseIndex,frame,part,a,b)=>{if(a.length*4!==b.length)throw Error(`${part} length`);for(let i=0;i<a.length;i++){const expected=b.readUInt32LE(i*4);if(a[i]!==expected){mismatchCount++;if(mismatches.length<40)mismatches.push({caseIndex,frame,part,word:i,actual:a[i],expected});}}};
for(let index=0;index<inputs.length;index++){
 const input=inputs[index],caseIndex=input.sourceCaseIndex,base=index*size*4;
 fs.readSync(old,before,0,before.length,caseIndex*before.length);fs.readSync(oldPrefix,prior,0,prior.length,caseIndex*prior.length);
 if(!native.subarray(base,base+before.length).equals(before)||!prefix.subarray(index*prior.length,(index+1)*prior.length).equals(prior))throw Error(`Prior trace changed ${caseIndex}`);
 if(native.readUInt32LE(base+46925*4)!==frames)throw Error('History did not finish');
 const expectedFrames=[];
 evaluateRetainedHistory(input,(r,{frame,pressed,context:c,random})=>{
  if(rng)compare(caseIndex,frame,'random',[random.state,random.calls],rng.subarray((index*400+frame)*8,(index*400+frame+1)*8));
  const b=c.bike;
  const start=base+(46926+frame*recordSize)*4,record=native.subarray(start,start+recordSize*4),count=record.readUInt32LE((14000-11097)*4);
  compare(caseIndex,frame,'stiffness',[floatBits(c.frameEntry.extraStiffness)],record.subarray(413*4,414*4));
  compare(caseIndex,frame,'return',r.output,record.subarray((35681-11097)*4));
  if(count!==r.finishes.length)throw Error(`Substeps ${caseIndex}/${frame}`);
  for(let step=0;step<count;step++){const off=(step===0?13502:14001+(step-1)*2168+1670)-11097;compare(caseIndex,frame,`finish-${step}`,r.finishes[step],record.subarray(off*4,(off+498)*4));}
  if(process.env.MCM_WRITE_FIXTURES==='1')expectedFrames.push({extraStiffnessBits:record.readUInt32LE(413*4),random:rng?{state:rng.readUInt32LE((index*400+frame)*8),calls:rng.readUInt32LE((index*400+frame)*8+4)}:undefined,engines:Array.from({length:count},(_,step)=>{const off=(step===0?735:2904+(step-1)*2168)+9;return Array.from({length:33},(_,i)=>record.readUInt32LE((off+i)*4));}),output:Array.from({length:11244},(_,i)=>record.readUInt32LE((35681-11097+i)*4)),finishes:Array.from({length:count},(_,step)=>{const off=(step===0?13502:14001+(step-1)*2168+1670)-11097;return Array.from({length:498},(_,i)=>record.readUInt32LE((off+i)*4));})});
  for(let step=0;step<count;step++){const engine=(step===0?735:2904+(step-1)*2168)+9;compare(caseIndex,frame,`engine-${step}`,r.engines[step],record.subarray(engine*4,(engine+33)*4));}
  const lastEngine=(count===1?735:2904+(count-2)*2168)+9;
  const firstFinish=((count===1?13502:14001+(count-2)*2168+1670)-11097)*4;
  rows.push({caseIndex,frame,pressed,extraStiffness:record.readFloatLE(413*4),status:r.frame.status,substeps:count,nativeSpeed:record.readFloatLE(firstFinish+6*4),recoveredSpeed:b.field6a4,nativeCrash:record.readUInt32LE(firstFinish),recoveredCrash:b.field844,nativeSpeedBits:record.readUInt32LE(firstFinish+6*4),
   positionBits:Array.from({length:3},(_,i)=>record.readUInt32LE(firstFinish+(24+i)*4)),velocityBits:Array.from({length:3},(_,i)=>record.readUInt32LE(firstFinish+(27+i)*4)),
   gear:record.readUInt32LE((lastEngine+1)*4),throttleBits:record.readUInt32LE((lastEngine+2)*4),rpmBits:record.readUInt32LE((lastEngine+3)*4),released:record.readUInt32LE((lastEngine+6)*4)});
 },{randomSeed:capture.randomSeed,burst:capture.burst});
 if(expectedFrames.length)fixtures.push({caseIndex,input,frames:expectedFrames});
}
fs.closeSync(old);fs.closeSync(oldPrefix);
const hash=path=>{const h=createHash('sha256'),fd=fs.openSync(path,'r'),b=Buffer.alloc(1048576);try{for(let n;(n=fs.readSync(fd,b))>0;)h.update(b.subarray(0,n));}finally{fs.closeSync(fd);}return h.digest('hex');};
const repeated=fs.existsSync(dir+'/results-repeat.bin')&&hash(dir+'/results-repeat.bin')===hash(dir+'/results.bin')&&hash(dir+'/prefix-repeat.bin')===hash(dir+'/prefix.bin');
if(!repeated)throw Error('Native repeatability missing');
const report={cases:inputs.length,frames:rows.length,mismatchCount,mismatches,rows,architecture:process.arch,node:process.version,repeated,priorTraceChangedCases:0,
 randomSha256:rng?hash(dir+'/results.bin.rng.bin'):undefined,inputSha256:hash(dir+'/cases.bin'),outputSha256:hash(dir+'/results.bin'),prefixSha256:hash(dir+'/prefix.bin'),
 exeSha256:capture.exeSha256,d3drmSha256:hash(dir+'/prefix.bin.d3drm.dll'),schedule:capture,
 limitations:['Synthetic initial state and assets; crash and overflow trajectories are not a normal acceleration validation',capture.randomSeed===undefined?'Externally supplied RNG draw sequence repeats per substep; full application CRT stream not connected':'Shared CRT stream starts at history boundary; application activity outside the retained bike is not simulated','Four histories only; AI/scripted controllers, original terrain/assets and playable integration remain open']};fs.writeFileSync(dir+`/report-${process.arch}.json`,JSON.stringify(report,null,2)+'\n');if(process.env.MCM_WRITE_FIXTURES==='1'&&!mismatchCount)fs.writeFileSync(dir+'/fixtures.json',JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({cases:inputs.length,frames:rows.length,mismatchCount,mismatches},null,2));if(mismatchCount)process.exitCode=1;
