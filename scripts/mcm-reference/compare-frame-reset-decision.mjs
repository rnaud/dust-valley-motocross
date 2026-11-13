import fs from 'node:fs';import {resolve,join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {floatBits} from '../../src/physics/mcm/math.js';import {evaluateFrameResetDecision} from './frame-reset-decision-case.mjs';
const [exeArg,outArg,mode]=process.argv.slice(2);if(!outArg||mode&&mode!=='--replay')throw new Error('Usage: compare-frame-reset-decision.mjs mcm.exe output-directory [--replay]');
const exe=resolve(exeArg),out=resolve(outArg),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(hash(exe)!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw new Error('Unrecognized original');
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...options});if(r.error||r.status)throw new Error(`${cmd}: ${r.error||r.stderr||r.status}`);};
if(mode!=='--replay'){
 fs.mkdirSync(out,{recursive:false});let seed=0x56ab8172;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;},pick=a=>a[(random()>>>8)%a.length],fb=a=>floatBits(pick(a));
 const cases=Array.from({length:8000},(_,i)=>[
  +(i%17===0),pick([0,1]),pick([-1,0,1,2,3,4])>>>0,fb([.5,1,2]),fb([0,5.9,6,6.1,7]),pick([0,1,2]),pick([0,1,9]),fb([-3,-2,-.1,-0,0,.001,.1,.5,1,NaN]),fb([.1,.5,1]),fb([0,.866,.867,1,NaN]),fb([.5,1,2,NaN]),fb([-1,-0,0,1]),fb([-1,-0,0,1]),fb([0,105,106,1175,1176,1687,1688,2000,NaN]),fb([19,20,21,100]),fb([0,105,106,1175,1176,1687,1688,2000,NaN]),floatBits(20),floatBits(30),floatBits(40),pick([0,1]),pick([0,1]),fb([0,-0,.001,.02,.1,1]),pick([-1,0,1])>>>0,pick([0,1]),pick([0,1,2,3,4]),floatBits(.25),17,18,19,20
 ]);
 const encoded=Buffer.alloc(4+cases.length*120);encoded.writeUInt32LE(cases.length);cases.forEach((c,i)=>c.forEach((v,j)=>encoded.writeUInt32LE(v,4+i*120+j*4)));fs.writeFileSync(join(out,'cases.bin'),encoded);fs.writeFileSync(join(out,'cases.json'),JSON.stringify(cases));
 run('i686-w64-mingw32-gcc',['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',join(dirname(fileURLToPath(import.meta.url)),'frame-reset-decision-oracle.c'),'-o',join(out,'oracle.exe')]);
 run('/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine',[join(out,'oracle.exe'),exe,join(out,'cases.bin'),join(out,'results.bin')],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'}});
}
const cases=JSON.parse(fs.readFileSync(join(out,'cases.json'))),native=fs.readFileSync(join(out,'results.bin'));if(native.length!==cases.length*80)throw new Error('Output size');
let mismatchCount=0;const mismatches=[],branches={},boundarySides={};
const fixtures=cases.map((input,i)=>{const actual=evaluateFrameResetDecision(input),outputBits=Array.from({length:20},(_,j)=>native.readUInt32LE(i*80+j*4));for(let j=0;j<20;j++)if(actual.words[j]!==outputBits[j]){mismatchCount++;if(mismatches.length<30)mismatches.push({case:i,word:j,actual:actual.words[j],expected:outputBits[j]});}
 branches[actual.branch]=(branches[actual.branch]||0)+1;if(actual.branch==='boundary')boundarySides[outputBits[4]]=(boundarySides[outputBits[4]]||0)+1;
 return {input,outputBits};});
if(!mismatchCount){for(const path of ['forced-position','elapsed','button','boundary','continue','crash-active','crash-expired','rider-inactive'])if(!branches[path])throw new Error(`Missing ${path}`);for(const side of [1,2,3,4])if(!boundarySides[side])throw new Error(`Missing boundary ${side}`);}
const report={scope:'Isolated original pre-loop reset decision 0x4b0610 and rider cleanup 0x40fbb0; initialized inputs, rider visual object absent',cases:cases.length,branches,boundarySides,mismatchCount,mismatches,architecture:process.arch,node:process.version,exeSha256:hash(exe),inputSha256:hash(join(out,'cases.bin')),outputSha256:hash(join(out,'results.bin')),limitations:['Rider visual reparent/callback restoration not connected','Not continuous-frame trajectory evidence']};
fs.writeFileSync(join(out,`report-${process.arch}.json`),JSON.stringify(report,null,2)+'\n');if(mode!=='--replay'&&!mismatchCount)fs.writeFileSync(join(out,'fixtures.json'),JSON.stringify({source:report,fixtures}));console.log(JSON.stringify(report,null,2));if(mismatchCount)process.exitCode=1;
