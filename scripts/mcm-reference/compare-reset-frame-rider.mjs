import fs from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateResetFrameRider} from './reset-frame-rider-case.mjs';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
const [exeArg,corpusArg,outputArg,mode]=process.argv.slice(2);
if(!outputArg||mode&&!['--pilot','--replay'].includes(mode))throw new Error('Usage: compare-reset-frame-rider.mjs mcm.exe post-filter-corpus output-directory [--pilot|--replay]');
const exe=resolve(exeArg),corpus=resolve(corpusArg),output=resolve(outputArg);
const hash=path=>{const h=createHash('sha256'),fd=fs.openSync(path,'r'),b=Buffer.alloc(1048576);try{for(let n;(n=fs.readSync(fd,b))>0;)h.update(b.subarray(0,n));}finally{fs.closeSync(fd);}return h.digest('hex');};
if(hash(exe)!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw new Error('Unrecognized original');
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...options});if(r.error||r.status)throw new Error(`${cmd}: ${r.error||r.stderr||r.status}`);};
if(mode!=='--replay'){
 fs.mkdirSync(output,{recursive:false});
 const inputs=JSON.parse(fs.readFileSync(join(corpus,'case-inputs.json'))),old=fs.readFileSync(join(corpus,'cases.bin'));
 const indices=mode==='--pilot'?[...new Set([...Array.from({length:64},(_,i)=>i),...Array.from({length:1100},(_,i)=>16384+i)])]:inputs.map((_,i)=>i);
 const variants=JSON.parse(fs.readFileSync(join(dirname(fileURLToPath(import.meta.url)),'reset-frame-rider-nearby-inputs.json'))).variants;
 const baseCount=indices.length;indices.push(...variants.map(v=>v.sourceIndex));
 const encoded=Buffer.alloc(4+indices.length*8016);encoded.writeUInt32LE(indices.length);
 const cases=indices.map((index,i)=>{
  const c=structuredClone(inputs[index]),variant=variants[i-baseCount],start=4+i*8016;old.copy(encoded,start,4+index*8012,4+(index+1)*8012);
  for(const [offset,value] of [[4,1],[8,floatBits(.003)],[0x10,100],[0x14,0],[0x18,0],[0x1c,0],[0x20,0],[0x24,0],[0x28,floatBits(.2)],[0x2c,0],[0x30,0]]){c.words[offset/4]=value;encoded.writeUInt32LE(value,start+8+offset);}
  // Pose selection assumes a balance fraction in the live lean domain.
  // The older arithmetic corpus deliberately seeds -.1/1.1, which can produce
  // pose -1 and make the original dereference bike+0x73c as an animation pointer.
  c.contactPhase.balanceFilter[0]=Math.fround(Math.min(.75,Math.max(.25,c.contactPhase.balanceFilter[0])));
  encoded.writeUInt32LE(floatBits(c.contactPhase.balanceFilter[0]),start+1495*4);
  // +6f4 is a normalized control; arbitrary raw words can drive the airborne
  // animation blend beyond the record's frame range in the original too.
  c.words[0x6f4/4]=floatBits(variant?.control??[-1,-.5,0,.5,1][i%5]);
  if(variant){
   c.contactPhase.balanceFilter[0]=variant.balance;encoded.writeUInt32LE(floatBits(variant.balance),start+1495*4);
   for(let j=0;j<4;j++)c.selection.splice(12+j*4,4,...variant.position,0);
   c.selection.forEach((v,j)=>encoded.writeUInt32LE(floatBits(v),start+(1346+j)*4));
  }
  encoded.writeUInt32LE(c.words[0x6f4/4],start+8+0x6f4);
  c.loopRider.bikeRecords.fill(0);c.loopRider.riderRecords.fill(0);
  for(let k=0;k<32;k++)encoded.writeUInt32LE(0,start+(1968+k)*4);
  c.frameRider={rawDelta:Math.fround([0,.001,.02,.04,.2][Math.floor(i/5)%5])};encoded.writeUInt32LE(floatBits(c.frameRider.rawDelta),start+8012);
  return c;
 });
 fs.writeFileSync(join(output,'cases.bin'),encoded);fs.writeFileSync(join(output,'case-inputs.json'),JSON.stringify(cases));
 run(process.env.MCM_CC||'i686-w64-mingw32-gcc',['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',join(dirname(fileURLToPath(import.meta.url)),'reset-frame-rider-oracle.c'),'-o',join(output,'oracle.exe')]);
 console.log(`Executing ${cases.length} retained cases through original frame-end rider`);
 run(process.env.MCM_WINE||'/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine',[join(output,'oracle.exe'),exe,join(output,'cases.bin'),join(output,'prefix.bin'),join(output,'results.bin')],{env:{...process.env,WINEDLLOVERRIDES:'d3drm=b',WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'}});
}
const dllHash=hash(join(output,'prefix.bin.d3drm.dll'));
if(dllHash!=='7edb1ed218aececbb44f4d92d5b0880f0ff1777dc525e555140f987015d8be1a')throw new Error('Unrecognized loaded D3DRM');
const cases=JSON.parse(fs.readFileSync(join(output,'case-inputs.json'))),size=10954;
if(fs.statSync(join(output,'results.bin')).size!==cases.length*size*4)throw new Error('Output size');
const fd=fs.openSync(join(output,'results.bin'),'r'),pf=fs.openSync(join(output,'prefix.bin'),'r'),native=Buffer.alloc(size*4),prefix=Buffer.alloc(8277*4);
let mismatchCount=0,exceptionCount=0;const mismatches=[],exceptions=[],branches={},recovery={},fixtures=[],seen=new Set();
for(let i=0;i<cases.length;i++){
 fs.readSync(fd,native,0,native.length,i*native.length);fs.readSync(pf,prefix,0,prefix.length,i*prefix.length);
 let actual;try{actual=evaluateResetFrameRider(cases[i]);}catch(e){exceptionCount++;if(exceptions.length<20)exceptions.push({case:i,error:e.stack});continue;}
 for(const [part,words,expected] of [['prefix',actual.prefix,prefix],['tail',actual.tail,native]]){
  if(words.length*4!==expected.length)throw new Error(`${part} length ${words.length}`);
  for(let j=0;j<words.length;j++){const value=expected.readUInt32LE(j*4);if(value!==words[j]){mismatchCount++;if(mismatches.length<30)mismatches.push({case:i,part,word:j,actual:words[j],expected:value});}}
 }
 const t=actual.tail,branch=actual.branch;branches[branch]=(branches[branch]||0)+1;if(branch==='recovery'){const k=actual.entry.riderStopped?'restart':'advance';recovery[k]=(recovery[k]||0)+1;}
 const key=`${branch}:state=${t[0]}:ai=${t[4]}:secondary=${t[5]}:delta=${cases[i].frameRider.rawDelta}:finite=${Number.isFinite(bitsFloat(t[14]))}:riderStopped=${actual.entry.riderStopped}`;
 if(!seen.has(key)){seen.add(key);fixtures.push({caseIndex:i,key,input:cases[i],prefixBits:Array.from({length:8277},(_,j)=>prefix.readUInt32LE(j*4)),outputBits:Array.from({length:size},(_,j)=>native.readUInt32LE(j*4))});}
}
fs.closeSync(fd);fs.closeSync(pf);
if(!mismatchCount&&!exceptionCount){
 for(const branch of ['crash','normal','recovery','trick','nearby'])if(!branches[branch])throw new Error(`Missing connected branch ${branch}`);
 for(const path of ['advance','restart'])if(!recovery[path])throw new Error(`Missing recovery ${path}`);
 if(!cases.some(c=>c.frameRider.rawDelta!==c.frameTail.frameDelta))throw new Error('Raw and stored frame intervals were never distinct');
}
const report={scope:'Retained reset through loop exhaustion, acceleration filter and full frame-end rider call; valid synthetic animation assets initialized before execution',cases:cases.length,wordsPerCase:8277+size,branches,recovery,rawDeltaDiffersFromStoredInterval:cases.filter(c=>c.frameRider.rawDelta!==c.frameTail.frameDelta).length,
 initialStateChanges:{balanceFilter:'Initial value constrained to [0.25,0.75]; old arithmetic corpus includes invalid pose-domain values -0.1/1.1',control6f4:'Initial values in [-1,1]; arbitrary old raw control words can drive animation blend out of range',animation:'Complete linked pose/trick records and live objects initialized before reset; stopped and advancing rider objects',nearby:'140 additional initial side-target scenarios; no mid-loop state changes'},
 limitations:['Synthetic initial state and animation assets','Frame entry and caller tail after rider return not yet connected','At most four substeps in this corpus','Visual object c90 absent; static wall callbacks only','Long histories and whole-bike acceleration/release parity remain open'],mismatchCount,exceptionCount,mismatches,exceptions,exeSha256:hash(exe),d3drmSha256:dllHash,inputSha256:hash(join(output,'cases.bin')),outputSha256:hash(join(output,'results.bin')),prefixSha256:hash(join(output,'prefix.bin')),architecture:process.arch,node:process.version};
fs.writeFileSync(join(output,`report-${process.arch}.json`),JSON.stringify(report,null,2)+'\n');if(mode!=='--replay'&&!mismatchCount&&!exceptionCount)fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(mismatchCount||exceptionCount)process.exitCode=1;
