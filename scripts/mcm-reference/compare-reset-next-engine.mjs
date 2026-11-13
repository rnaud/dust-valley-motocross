import fs from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateResetNextEngine} from './reset-next-engine-case.mjs';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
const [exeArg,corpusArg,outputArg,mode]=process.argv.slice(2);
if(!outputArg||mode&&!['--pilot','--replay'].includes(mode))throw new Error('Usage: compare-reset-next-engine.mjs mcm.exe next-terrain-corpus output-directory [--pilot|--replay]');
const exe=resolve(exeArg),corpus=resolve(corpusArg),output=resolve(outputArg);
const hash=path=>{const h=createHash('sha256'),fd=fs.openSync(path,'r'),b=Buffer.alloc(1048576);try{for(let n;(n=fs.readSync(fd,b))>0;)h.update(b.subarray(0,n));}finally{fs.closeSync(fd);}return h.digest('hex');};
if(hash(exe)!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw new Error('Unrecognized original');
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...options});if(r.error||r.status)throw new Error(`${cmd}: ${r.error||r.stderr||r.status}`);};
if(mode!=='--replay'){
 fs.mkdirSync(output,{recursive:false});
 const inputs=JSON.parse(fs.readFileSync(join(corpus,'case-inputs.json'))),old=fs.readFileSync(join(corpus,'cases.bin'));
 const samples=mode==='--pilot'?JSON.parse(fs.readFileSync(join(corpus,'fixtures.json'))).fixtures.map(c=>c.caseIndex):[];
 let indices=mode==='--pilot'?[...new Set([...Array.from({length:256},(_,i)=>i),...samples,16630,16750,16770])]:inputs.map((_,i)=>i);
 if(mode==='--pilot'){
  const fd=fs.openSync(join(corpus,'results.bin'),'r'),state=Buffer.alloc(44),seen=new Set();
  for(let i=0;i<inputs.length;i++){
   fs.readSync(fd,state,0,44,i*11832*4);
   const key=`${+!!state.readUInt32LE(0)}:${+!!state.readUInt32LE(4)}:${state.readUInt32LE(12)}:${state.readUInt32LE(40)&255}`;
   if(!seen.has(key)){seen.add(key);indices.push(i);}
  }
  fs.closeSync(fd);indices=[...new Set(indices)];
 }
 const encoded=Buffer.alloc(4+indices.length*8064);encoded.writeUInt32LE(indices.length);
 const cases=indices.map((index,i)=>{
  const c=structuredClone(inputs[index]),start=4+i*8064;old.copy(encoded,start,4+index*8064,4+(index+1)*8064);
  c.sourceCaseIndex=index;return c;
 });
 fs.writeFileSync(join(output,'cases.bin'),encoded);fs.writeFileSync(join(output,'case-inputs.json'),JSON.stringify(cases));
 run(process.env.MCM_CC||'i686-w64-mingw32-gcc',['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',join(dirname(fileURLToPath(import.meta.url)),'reset-next-engine-oracle.c'),'-o',join(output,'oracle.exe')]);
 console.log(`Executing ${cases.length} retained cases through original next-frame engine entry`);
 run(process.env.MCM_WINE||'/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine',[join(output,'oracle.exe'),exe,join(output,'cases.bin'),join(output,'prefix.bin'),join(output,'results.bin')],{env:{...process.env,WINEDLLOVERRIDES:'d3drm=b',WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'}});
}
const dllHash=hash(join(output,'prefix.bin.d3drm.dll'));
if(dllHash!=='7edb1ed218aececbb44f4d92d5b0880f0ff1777dc525e555140f987015d8be1a')throw new Error('Unrecognized loaded D3DRM');
const cases=JSON.parse(fs.readFileSync(join(output,'case-inputs.json'))),size=11884;
if(fs.statSync(join(output,'results.bin')).size!==cases.length*size*4)throw new Error('Output size');
const fd=fs.openSync(join(output,'results.bin'),'r'),pf=fs.openSync(join(output,'prefix.bin'),'r'),native=Buffer.alloc(size*4),prefix=Buffer.alloc(8277*4);
const oldPrefix=fs.openSync(join(corpus,'prefix.bin'),'r'),oldRider=fs.openSync(join(corpus,'results.bin'),'r'),oldPrefixBuffer=Buffer.alloc(8277*4),oldRiderBuffer=Buffer.alloc(11832*4);
let priorTraceChangedCases=0;
let mismatchCount=0,exceptionCount=0;const mismatches=[],exceptions=[],engineBranches={},terrainCoverage={},resetBranches={},branches={},recovery={},returnGates={},schedules={},entryRecovery={},inputBranches={},inputModes={},steeringCoverage={},inputCoverage={linear:0,cubic:0,analogEnabled:0,analogDisabled:0,trickReleased:0},fixtures=[],seen=new Set();
for(let i=0;i<cases.length;i++){
 fs.readSync(fd,native,0,native.length,i*native.length);fs.readSync(pf,prefix,0,prefix.length,i*prefix.length);
 const sourceIndex=cases[i].sourceCaseIndex;
 fs.readSync(oldPrefix,oldPrefixBuffer,0,oldPrefixBuffer.length,sourceIndex*oldPrefixBuffer.length);
 fs.readSync(oldRider,oldRiderBuffer,0,oldRiderBuffer.length,sourceIndex*oldRiderBuffer.length);
 if(!prefix.equals(oldPrefixBuffer)||!native.subarray(0,11832*4).equals(oldRiderBuffer))priorTraceChangedCases++;
 let actual;try{actual=evaluateResetNextEngine(cases[i]);}catch(e){exceptionCount++;if(exceptions.length<20)exceptions.push({case:i,error:e.stack});continue;}
 for(const [part,words,expected] of [['prefix',actual.prefix,prefix],['tail',actual.tail,native]]){
  if(words.length*4!==expected.length)throw new Error(`${part} length ${words.length}`);
  for(let j=0;j<words.length;j++){const value=expected.readUInt32LE(j*4);if(value!==words[j]){mismatchCount++;if(mismatches.length<30)mismatches.push({case:i,part,word:j,actual:words[j],expected:value});}}
 }
 const t=actual.tail,branch=actual.branch;engineBranches[actual.engineBranch]=(engineBranches[actual.engineBranch]||0)+1;terrainCoverage[actual.terrainQueries]=(terrainCoverage[actual.terrainQueries]||0)+1;resetBranches[actual.resetBranch]=(resetBranches[actual.resetBranch]||0)+1;branches[branch]=(branches[branch]||0)+1;if(branch==='recovery'){const k=actual.entry.riderStopped?'restart':'advance';recovery[k]=(recovery[k]||0)+1;}
 const gate=cases[i].frameReturn,returned=actual.tail[10954];
 const returnKey=`disabled=${gate.disabled}:state=${gate.state}:player=${gate.playerIsBike}:restored=${returned}`;
 returnGates[returnKey]=(returnGates[returnKey]||0)+1;
 if(actual.tail[11096]!==1)throw new Error('Original frame return not observed');
 const scheduleKey=`path=${actual.scheduler.iterations<0?'negative':actual.scheduler.discardedSteps?'capped':actual.scheduler.iterations===1?'single':'multiple'}:cap=${cases[i].words[0x8d4/4]}:discarded=${actual.scheduler.discardedSteps>0}:delta=${cases[i].nextFrame.deltaBits}:step=${actual.scheduler.dt}`;
 schedules[scheduleKey]=(schedules[scheduleKey]||0)+1;
 entryRecovery[actual.recoveryBranch]=(entryRecovery[actual.recoveryBranch]||0)+1;
 inputBranches[actual.inputBranch]=(inputBranches[actual.inputBranch]||0)+1;
 const controls=cases[i].frameInput;
 if(actual.inputBranch==='player'||actual.inputBranch==='scripted'){
  inputCoverage[controls.devicePresent&&controls.deviceByte!==4&&[2,3].includes(controls.deviceKind)?'cubic':'linear']++;
  inputCoverage[cases[i].words[0x6f8/4]?'analogEnabled':'analogDisabled']++;
 }
 if(actual.tail[11492]&&actual.tail[11478]===0&&actual.tail[11479]===1)inputCoverage.trickReleased++;
 const inputMode=`branch=${actual.inputBranch}:enabled=${cases[i].words[0x6f8/4]}:device=${controls.devicePresent}:${controls.deviceKind}:${controls.deviceByte}`;
 inputModes[inputMode]=(inputModes[inputMode]||0)+1;
 const reached=actual.tail[11496],pose=actual.tail[11498],rate=bitsFloat(actual.tail[11505]),burst=bitsFloat(actual.tail[11510]);
 const steeringKey=`input=${actual.inputBranch}:pose9=${pose===9}:rate=${!Number.isFinite(rate)?'nonfinite':rate===0?'zero':rate>0?'positive':'negative'}:burst=${burst!==0}:carry=${(actual.tail[11508]|0)>0x38d1b717}:zeroDelta=${(cases[i].nextFrame.deltaBits&0x7fffffff)===0}`;
 steeringCoverage[steeringKey]=(steeringCoverage[steeringKey]||0)+1;
 let key=`engine=${actual.engineBranch}:analog=${actual.tail[11836]}:${steeringKey}:recovery=${actual.recoveryBranch}:reset=${actual.resetBranch}:queries=${actual.terrainQueries}:contact=${actual.tail[11673]}:${actual.tail[11674]}`;
 if(!reached)key=`pending=${actual.inputBranch}`;
 if(i===1034)key='cold-x64-angular-z-nan-regression';
 if(i===14101)key='cold-pivot-translation-nan-regression';
 if([16630,16750,16770].includes(i))key=`untouched-normal-stack-${i}`;
 if(!seen.has(key)){seen.add(key);fixtures.push({caseIndex:i,key,input:cases[i],prefixBits:Array.from({length:8277},(_,j)=>prefix.readUInt32LE(j*4)),outputBits:Array.from({length:size},(_,j)=>native.readUInt32LE(j*4))});}
}
fs.closeSync(fd);fs.closeSync(pf);fs.closeSync(oldPrefix);fs.closeSync(oldRider);
if(priorTraceChangedCases)throw new Error(`Prior native trace changed in ${priorTraceChangedCases} cases`);
if(!mismatchCount&&!exceptionCount&&cases.length===17941){
 for(const [path,count] of Object.entries(inputCoverage))if(!count)throw new Error(`Missing input coverage ${path}`);
 for(const branch of ['executed','no-iterations','pending'])if(!engineBranches[branch])throw new Error(`Missing engine branch ${branch}`);
 for(const count of [0,2,3])if(!terrainCoverage[count])throw new Error(`Missing terrain query count ${count}`);
 for(const branch of ['continue','crash-active','button','pending'])if(!resetBranches[branch])throw new Error(`Missing reset branch ${branch}`);
 for(const branch of ['crash','player','ai','scripted'])if(!inputBranches[branch])throw new Error(`Missing input branch ${branch}`);
 for(const branch of ['bypass','animate','restore'])if(!entryRecovery[branch])throw new Error(`Missing entry recovery branch ${branch}`);
 for(const branch of ['crash','normal','recovery','trick','nearby'])if(!branches[branch])throw new Error(`Missing connected branch ${branch}`);
 for(const path of ['negative','capped','single','multiple'])if(!Object.keys(schedules).some(k=>k.startsWith(`path=${path}:`)))throw new Error(`Missing scheduler path ${path}`);
 for(const bits of [0,0x80000000])if(!cases.some(c=>c.nextFrame.deltaBits===bits))throw new Error('Missing signed zero delta');
 if(Object.keys(returnGates).length!==8)throw new Error('Missing frame-return gate combinations');
 for(const path of ['advance','restart'])if(!recovery[path])throw new Error(`Missing recovery ${path}`);
 if(!cases.some(c=>c.frameRider.rawDelta!==c.frameTail.frameDelta))throw new Error('Raw and stored frame intervals were never distinct');
}
const report={scope:'Retained reset, substeps, post-loop filter, rider update, caller tail and actual original frame epilogue/ret 4; next frame recovery, player input, steering-rate and longitudinal burst setup, reset decision and terrain probes and engine entry through 0x4a5e27; AI/scripted paths stop before controller calls',cases:cases.length,wordsPerCase:8277+size,engineBranches,terrainCoverage,resetBranches,branches,recovery,returnGates,schedules,entryRecovery,inputBranches,inputModes,inputCoverage,steeringCoverage,steeringExecutedCases:inputBranches.player+inputBranches.crash,pendingControllerCases:inputBranches.ai+inputBranches.scripted,priorTraceChangedCases,priorTraceComparedCases:cases.length,initialVariantCases:cases.filter(c=>c.initialVariant).length,rawDeltaDiffersFromStoredInterval:cases.filter(c=>c.frameRider.rawDelta!==c.frameTail.frameDelta).length,
 initialStateChanges:{thisMilestone:'All source initial states, external inputs and consecutive-frame stack allocation copied unchanged',trickCompletion:'Additional cases initialize nonloop trick records and raw first-frame delta 1.2 before reset; inherited from the source input corpus and included in unchanged-prior-source checks here',frameInput:'Initial analog enable 0/1; externally supplied axis values and device type before reset; no bike state reseeding at frame handoff',recoveryChoice:'Initial bf8 set to 0/1; no handoff reseeding',balanceFilter:'Initial value constrained to [0.25,0.75]; old arithmetic corpus includes invalid pose-domain values -0.1/1.1',control6f4:'Initial values in [-1,1]; arbitrary old raw control words can drive animation blend out of range',animation:'Complete linked pose/trick records and live objects initialized before reset; stopped and advancing rider objects',nearby:'Inherited initial side-target scenarios from the source frame-rider corpus; no mid-loop state changes',nextFrame:'Initial per-bike cap set to 1/2/4/10; next raw delta varied over +0/-0/1\/120/.02/.04/.25/1; timing carry is retained without alteration',frameReturn:'All eight combinations of disabled gate, scene state 2/3, and selected player initialized before execution'},
 limitations:['Synthetic initial state and animation assets','Animation-start path with pre-existing flag820=1 not reached by this retained corpus','AI 0x46d240 and scripted 0x470560 controller calls not executed; explicit pending boundaries','Next-frame contact, force, integration and collision stages not yet connected; rider visual object absent','At most four substeps in this corpus','Visual object c90 absent; static wall callbacks only','Long histories and whole-bike acceleration/release parity remain open'],mismatchCount,exceptionCount,mismatches,exceptions,exeSha256:hash(exe),d3drmSha256:dllHash,inputSha256:hash(join(output,'cases.bin')),outputSha256:hash(join(output,'results.bin')),prefixSha256:hash(join(output,'prefix.bin')),architecture:process.arch,node:process.version};
fs.writeFileSync(join(output,`report-${process.arch}.json`),JSON.stringify(report,null,2)+'\n');if(mode!=='--replay'&&!mismatchCount&&!exceptionCount)fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(mismatchCount||exceptionCount)process.exitCode=1;
