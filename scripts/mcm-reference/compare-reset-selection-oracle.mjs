import fs from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateResetSelection} from './reset-selection-case.mjs';
const [exeArg,outArg]=process.argv.slice(2);
if(!outArg)throw new Error('Usage: compare-reset-selection-oracle.mjs mcm.exe new-output-directory');
const exe=resolve(exeArg),out=resolve(outArg),hash=x=>createHash('sha256').update(x).digest('hex');
const executableSha256=hash(fs.readFileSync(exe));if(executableSha256!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw new Error('Unrecognized executable');
fs.mkdirSync(out,{recursive:false});
const source=join(dirname(fileURLToPath(import.meta.url)),'reset-selection-oracle.c');
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${cmd}: ${r.error||r.stderr||r.status}`);};
run(process.env.MCM_CC||'i686-w64-mingw32-gcc',['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(out,'oracle.exe')]);
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},f=Math.fround;
const cases=[];
for(let i=0;i<40000;i++){
 const v=Array.from({length:37},()=>f((random()-.5)*1000));
 v[0]=[0,1,2,3,4,5,-1,32767,-32768][i%9];v[1]=Math.floor(i/9)%3-1;
 v[2]=Math.floor(i/27)%2;v[3]=Math.floor(i/54)%2;v[4]=[1,2,3,-1][Math.floor(i/108)%4];v[5]=Math.floor(i/432)%2;v[6]=Math.floor(i/864)%2;
 if(i%7===0){v[13]=v[7];v[15]=v[9];v[8]=0;}
 cases.push(v);
}
const input=Buffer.alloc(4+cases.length*148);input.writeUInt32LE(cases.length);cases.forEach((v,i)=>v.forEach((x,j)=>input.writeFloatLE(x,4+i*148+j*4)));fs.writeFileSync(join(out,'cases.bin'),input);
const win=p=>'Z:'+p.replaceAll('/','\\'),log=fs.openSync(join(out,'wine.log'),'w');
try{run(process.env.MCM_WINE||'/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine',[win(join(out,'oracle.exe')),win(exe),win(join(out,'cases.bin')),win(join(out,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(out,'results.bin'));if(results.length!==cases.length*72)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],outcomes={},fixtures=[],keys=new Set();
for(let i=0;i<cases.length;i++){
 const v=cases[i],expected=evaluateResetSelection(v),actual=Array.from({length:18},(_,j)=>results.readUInt32LE(i*72+j*4));
 for(let j=0;j<18;j++)if(expected[j]!==actual[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j]});}
 const key=`mode=${v[0]}:setting=${v[1]}:bb8=${v[2]}:614=${v[3]}:reason=${v[4]}:c08=${v[5]}:be4=${v[6]}:helper=${actual[10]}:heading=${actual[11]}:zero=${v[7]===v[13]&&v[8]===0&&v[9]===v[15]}`;
 outcomes[key]=(outcomes[key]||0)+1;
 const fixtureKey=`mode=${v[0]}:helper=${actual[10]}:heading=${actual[11]}:zero=${v[7]===v[13]&&v[8]===0&&v[9]===v[15]}:spawn=${v[1]!==0||v[2]!==0||v[4]===2||(v[0]===2&&v[3]!==0)}`;
 if(!keys.has(fixtureKey)||i%137===0)fixtures.push({input:v,outputBits:actual});keys.add(fixtureKey);
}
const report={schemaVersion:1,executableSha256,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original main reset-pose selection 0x4a5eb4..0x4a62eb, all mode branches, stored/current position selection, real vector subtraction and inverse-square-root normalization, conditional bike-position mutation, and terrain/course helper argument dispatch. Finite float32 vectors and nonzero reset reasons. Helpers 0x4ae0b0 and 0x4adb10 supplied at their boundaries with captured arguments and deterministic output; their internal logic, subsequent full reset and whole-bike trajectories excluded.'};
fs.writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(out,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({cases:cases.length,totalDifferences,firstDifferences,fixtures:fixtures.length}));if(totalDifferences)process.exitCode=1;
