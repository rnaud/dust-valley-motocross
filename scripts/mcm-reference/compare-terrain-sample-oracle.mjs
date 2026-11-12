import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {sampleMcmTerrain} from '../../src/physics/mcm/terrain-sample.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-terrain-sample-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'terrain-sample-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<30000;i++) {
 const mode=i%5;
 cases.push({mode,x:Math.floor(random()*(mode===0?17:5000)),z:Math.floor(random()*(mode===0?17:5000)),base:Math.floor(random()*65536),bias:f(random()*10000),scale:i%7===0?1:f(.01+random()*4),normal:Array.from({length:3},()=>f(random()-.5))});
}
const input=Buffer.alloc(4+cases.length*36);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const c=cases[i];[c.mode,c.x,c.z,c.base,c.bias,c.scale,...c.normal].forEach((v,j)=>input.writeFloatLE(v,4+i*36+j*4));}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*28)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const c=cases[i],leaf={level:0,bias:c.bias,scale:c.scale,heights:Array.from({length:289},(_,j)=>(c.base+j*137)&65535),normals:Array.from({length:289},()=>c.normal)};
 const child={level:1,children:Array(256).fill(leaf)},parent={level:2,children:Array(256).fill(child)};
 const root=[leaf,child,parent,{level:1},{level:1,children:Array(256).fill(null)}][c.mode];
 const r=sampleMcmTerrain(root,c.x,c.z),expectedBuffer=Buffer.alloc(28);expectedBuffer.writeDoubleLE(r.height);expectedBuffer.writeDoubleLE(r.height,8);r.normal.forEach((v,j)=>expectedBuffer.writeFloatLE(v,16+j*4));
 const expected=Array.from({length:7},(_,j)=>expectedBuffer.readUInt32LE(j*4)),actual=Array.from({length:7},(_,j)=>results.readUInt32LE(i*28+j*4));
 for(let j=0;j<7;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%53===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Original terrain height and normal lookup: leaf, two hierarchy levels, missing children, positive edge clamping, and height-scale normal adjustment; nonnegative coordinates, synthetic tiles'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
