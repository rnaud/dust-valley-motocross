import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {applyMcmOpposingAcceleration} from '../../src/physics/mcm/opposing-acceleration.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-opposing-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'opposing-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
const values=[-100,-1,-Math.pow(2,-126),-0,0,Math.pow(2,-126),1,100];
for(const v of values)for(const a of values)for(const d of values)for(const dt of [0,f(.02),f(.1),1])for(let mask=0;mask<8;mask++) {
 cases.push({velocity:[v,a,d],acceleration:[a,d,v],opposing:[d,v,a],dt,mask});
}
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<15000;i++)cases.push({velocity:Array.from({length:3},()=>f((random()-.5)*100)),acceleration:Array.from({length:3},()=>f((random()-.5)*1000)),opposing:Array.from({length:3},()=>f((random()-.5)*1000)),dt:f(random()*.05),mask:i%8});
const input=Buffer.alloc(4+cases.length*44);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const c=cases[i],offset=4+i*44;[...c.velocity,...c.acceleration,...c.opposing,c.dt].forEach((v,j)=>input.writeFloatLE(v,offset+j*4));input.writeUInt32LE(c.mask,offset+40);}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));
if(results.length!==cases.length*24)throw new Error('Incomplete oracle results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const r=applyMcmOpposingAcceleration(cases[i]),expected=[...r.velocity,...r.acceleration].map(floatBits),actual=Array.from({length:6},(_,j)=>results.readUInt32LE(i*24+j*4));
 for(let j=0;j<6;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 // Store input bits so JSON cannot erase negative zero or tiny values.
 if(i%59===0)fixtures.push({inputBits:Array.from({length:11},(_,j)=>input.readUInt32LE(4+i*44+j*4)),outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Original opposing-acceleration helper, independent vector inputs and all axis mask combinations; not complete angular integration'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
