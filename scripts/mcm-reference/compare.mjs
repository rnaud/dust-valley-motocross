// Usage: node scripts/mcm-reference/compare.mjs /path/to/mcm.exe /path/to/output-dir
// Requires i686-w64-mingw32-gcc and Wine; never copies the original into the repo.
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {floatBits,bitsFloat,mcmSqrt} from '../../src/physics/mcm/math.js';
import {scheduleMcmFrame,MCM_STEP} from '../../src/physics/mcm/scheduler.js';
const [executableArg,outputArg]=process.argv.slice(2);
if(!executableArg||!outputArg)throw new Error('Expected mcm.exe and output directory');
const executable=resolve(executableArg),output=resolve(outputArg);
const hash=data=>createHash('sha256').update(data).digest('hex');
const exeHash=hash(readFileSync(executable));
if(exeHash!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw new Error('Unrecognized executable');
mkdirSync(output,{recursive:true});
const wine=process.env.MCM_WINE||'/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const compiler=process.env.MCM_CC||'i686-w64-mingw32-gcc';
const source=join(dirname(fileURLToPath(import.meta.url)),'oracle.c');
const run=(cmd,args,options={})=>{
 const result=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:4*1024*1024,...options});
 if(result.error||result.status!==0)throw new Error(`${cmd}: ${result.error||result.stderr||result.stdout||result.status}`);
 return result.stdout?.trim()||'';
};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[];
const add=(kind,a,b,cw)=>cases.push(`${kind} ${a.toString(16)} ${b.toString(16)} ${cw.toString(16)}`);
for(const cw of [0x27f,0x37f]) {
 for(const bits of [0,0x80000000])add('sqrt',bits,0,cw);
 for(let exponent=1;exponent<255;exponent++)for(let bin=0;bin<128;bin++){
  const bits=(exponent<<23)|(bin<<16);
  add('sqrt',bits,0,cw);add('sqrt',bits|0xffff,0,cw);
 }
 const schedules=[[0,0],[-0,0],[.005,.01],[0,.01],[.03,0],[.25,0],[1,0],
  [0.09999999403953552,2**-28],[.01,-(2**-28)],
  [.03,bitsFloat(floatBits(MCM_STEP/2)-1)],[0,MCM_STEP]];
 for(let n=1;n<=12;n++)for(const offset of [-1,0,1])schedules.push([bitsFloat(floatBits(n*MCM_STEP)+offset),0]);
 let seed=0x4a54b6;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(let i=0;i<2048;i++)schedules.push([random()*.5,random()*MCM_STEP]);
 for(const [delta,carry] of schedules)add('schedule',floatBits(delta),floatBits(carry),cw);
}
const casesPath=join(output,'cases.txt'),resultsPath=join(output,'results.jsonl');
writeFileSync(casesPath,cases.join('\n')+'\n');
const win=path=>'Z:'+path.replaceAll('/','\\');
const env={...process.env,WINEPREFIX:process.env.WINEPREFIX||join(output,'prefix'),WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'};
const log=openSync(join(output,'wine.log'),'w');
try { run(wine,[win(join(output,'oracle.exe')),win(executable),win(casesPath),win(resultsPath)],{env,timeout:120000,stdio:['ignore',log,log]}); } finally {closeSync(log);}
const rows=readFileSync(resultsPath,'utf8').trim().split(/\r?\n/).map(line=>JSON.parse(line));
if(rows.length!==cases.length)throw new Error(`Expected ${cases.length} results, got ${rows.length}`);
const differences=[],counts={sqrt:0,schedule:0};
for(let i=0;i<rows.length;i++){
 const row=rows[i];counts[row.kind]++;
 const [kind,a,b,cw]=cases[i].split(' ');
 if(row.kind!==kind||row.controlWord!==parseInt(cw,16)||(row.inputBits??row.deltaBits)!==parseInt(a,16)||(kind==='schedule'&&row.carryBits!==parseInt(b,16)))throw new Error(`Misaligned result ${i}`);
 const actual=row.kind==='sqrt'?{outputBits:floatBits(mcmSqrt(bitsFloat(row.inputBits)))}:(()=>{
  const r=scheduleMcmFrame(bitsFloat(row.deltaBits),bitsFloat(row.carryBits));
  return {iterations:r.iterations,dtBits:floatBits(r.dt),remainderBits:floatBits(r.remainder),inverseDt:r.inverseDt};
 })();
 for(const [field,value] of Object.entries(actual))if(value!==row[field])differences.push({case:i,field,original:row[field],port:value,input:row});
}
const report={schemaVersion:1,executableSha256:exeHash,wineVersion:run(wine,['--version'],{env}),
 oracleSourceSha256:hash(readFileSync(source)),casesSha256:hash(readFileSync(casesPath)),resultsSha256:hash(readFileSync(resultsPath)),
 controlWords:[0x27f,0x37f],counts,comparisons:'Exact binary32 bits, integer counts, and inverse dt rounded to binary64',
 scope:'Original instructions under Wine/Rosetta with synthetic inputs; not a gameplay trace or proof of native Windows equivalence.',
 differenceCount:differences.length,firstDifferences:differences.slice(0,10)};
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(differences.length)process.exitCode=1;
