import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateBikeReset} from './bike-reset-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-bike-reset-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'bike-reset-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const cases=[];
for(let i=0;i<8192;i++){
 const words=Array.from({length:1042},()=>floatBits((random()-.5)*10000));
 words[0x68c/4]=floatBits(.01+random()*500);words[0x8cc/4]=floatBits(random()*20);
 words[0x814/4]=Math.floor(random()*4294967296)>>>0;
 words[914+0x20/4]=floatBits(random()*12000);words[914+0x50/4]=floatBits((random()-.5)*4000);
 cases.push({mask:i%64,randomValue:[0,32767,Math.floor(random()*32768)][Math.floor(i/64)%3],words});
}
const input=Buffer.alloc(4+cases.length*4176);input.writeUInt32LE(cases.length);cases.forEach((c,i)=>[c.mask,c.randomValue,...c.words].forEach((v,j)=>input.writeUInt32LE(v,4+i*4176+j*4)));fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));
if(results.length!==cases.length*4172)throw new Error('Incomplete oracle results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++){
 const expected=evaluateBikeReset(cases[i]),actual=Array.from({length:1043},(_,j)=>results.readUInt32LE(i*4172+j*4));
 const key=`mask=${cases[i].mask}:random=${Math.floor(i/64)%3}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<1043;j++)if(expected[j]!==actual[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j]});}
 if(outcomes[key]===1||i%131===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Complete original 0x4a1a40 bike reset, including all optional component writes and engine threshold calculation. Only CRT rand is supplied. Full bike and component allocations compared with pointer slots restored to input sentinels; finite source mass/time and threshold parameters. Subsequent pose/contact rebuilding and whole-bike trajectories excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
