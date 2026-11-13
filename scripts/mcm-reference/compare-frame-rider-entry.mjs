import fs from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {evaluateResetPostFilter} from './reset-post-filter-case.mjs';
import {bitsFloat} from '../../src/physics/mcm/math.js';
import {frameRiderEntryWords,frameRiderEntryLabels as labels} from './frame-rider-entry-case.mjs';

// Audit the live 0x4ad07a handoff before supplying complete animation assets.
// Generate the source corpus with compare-reset-post-filter-oracle.mjs first.
const [exeArg,corpusArg,outputArg,mode]=process.argv.slice(2);
if(!outputArg||mode&&mode!=='--replay')throw new Error('Usage: compare-frame-rider-entry.mjs mcm.exe post-filter-corpus output-directory [--replay]');
const exe=resolve(exeArg),corpus=resolve(corpusArg),output=resolve(outputArg);
const hash=path=>{
 const h=createHash('sha256'),fd=fs.openSync(path,'r'),buffer=Buffer.alloc(1024*1024);
 try{for(let n;(n=fs.readSync(fd,buffer))>0;)h.update(buffer.subarray(0,n));}finally{fs.closeSync(fd);}
 return h.digest('hex');
};
const exeHash=hash(exe);
if(exeHash!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw new Error('Unrecognized original');
const source=join(dirname(fileURLToPath(import.meta.url)),'reset-post-filter-oracle.c');
const run=(command,args,options={})=>{const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
if(!mode){
 fs.mkdirSync(output,{recursive:false});
 run(process.env.MCM_CC||'i686-w64-mingw32-gcc',['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
 run(process.env.MCM_WINE||'/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine',[join(output,'oracle.exe'),exe,join(corpus,'cases.bin'),join(output,'results.bin'),join(output,'entry.bin')],{env:{...process.env,WINEDLLOVERRIDES:'d3drm=b',WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'}});
}
const dllHash=hash(join(output,'results.bin.d3drm.dll'));
if(dllHash!=='7edb1ed218aececbb44f4d92d5b0880f0ff1777dc525e555140f987015d8be1a')throw new Error('Unrecognized loaded D3DRM');
const prefixHash=hash(join(output,'results.bin'));
if(prefixHash!==hash(join(corpus,'results.bin')))throw new Error('Entry observation changed prior native output');
const cases=JSON.parse(fs.readFileSync(join(corpus,'case-inputs.json'))),native=fs.readFileSync(join(output,'entry.bin'));
if(native.length!==cases.length*56*4)throw new Error('Entry output size');
const floats=['728','730','734','848','818','81c','82c','830','834','4e0','828'];
const branches={},nonfinite={},mismatches=[];let mismatchCount=0;
for(let i=0;i<cases.length;i++)evaluateResetPostFilter(cases[i],c=>{
 const b=c.bike;
 const branch=b.field844?'crash':b.field710?((b.field814<<24)>>24)<0?'nearby':'trick':b.fieldbfc===2?'recovery':'normal';
 branches[branch]=(branches[branch]||0)+1;
 for(const k of floats)if(!Number.isFinite(b[`field${k}`]))nonfinite[k]=(nonfinite[k]||0)+1;
 const words=frameRiderEntryWords(c);
 for(let j=0;j<56;j++){const expected=native.readUInt32LE((i*56+j)*4);if(words[j]!==expected){mismatchCount++;if(mismatches.length<20)mismatches.push({case:i,branch,field:labels[j],actual:words[j],expected});}}
});
const report={scope:'Retained reset/substep loop and post-filter state at 0x4ad07a, before frame-end rider execution; no state reseeded at the handoff',cases:cases.length,wordsPerCase:56,branches,nonfinite,mismatchCount,mismatches,exeSha256:exeHash,d3drmSha256:dllHash,inputSha256:hash(join(corpus,'cases.bin')),caseInputsSha256:hash(join(corpus,'case-inputs.json')),prefixSha256:prefixHash,entrySha256:hash(join(output,'entry.bin')),node:process.version,architecture:process.arch,limitations:['Frame-end call not executed by this audit','Animation pointers use existing corpus tokens; complete animation assets still required','Raw incoming frame delta is not captured by the source corpus']};
const fixtureKeys=new Set(),fixtures=[];
for(let i=0;i<cases.length;i++){
 const words=Array.from({length:56},(_,j)=>native.readUInt32LE((i*56+j)*4));
 const branch=words[0]?'crash':words[1]?((words[10]<<24)>>24)<0?'nearby':'trick':words[3]===2?'recovery':'normal';
 const key=`${branch}:state=${words[0]}:ai=${words[4]}:secondary=${words[5]}:finiteSpeed=${Number.isFinite(bitsFloat(words[14]))}:finiteHeading=${Number.isFinite(bitsFloat(words[20]))}`;
 if(!fixtureKeys.has(key)){fixtures.push({caseIndex:i,key,input:cases[i],outputBits:words});fixtureKeys.add(key);}
}
if(!mismatchCount)fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');
fs.writeFileSync(join(output,`report-${process.arch}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(mismatchCount)process.exitCode=1;
