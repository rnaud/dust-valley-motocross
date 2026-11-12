import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {calculateMcmTireForce} from '../../src/physics/mcm/tire-force.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-tire-force-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'tire-force-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const unit=()=>{const v=Array.from({length:3},()=>random()-.5),n=Math.hypot(...v);return v.map(x=>f(x/n));};
for(let i=0;i<30000;i++) {
 const axis=unit(),direction=i%7===0?[...axis]:unit();
 if(i%11===0){axis.splice(0,3,1,0,0);direction.splice(0,3,0,1,0);}
 cases.push({axis,direction,load:f(i%13===0?0:random()*3000),coefficient5b0:f(random()*2),coefficient5b4:f(random()*2),scale:f(random()*1.5)});
}
const input=Buffer.alloc(4+cases.length*40);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const c=cases[i];[...c.axis,...c.direction,c.load,c.coefficient5b0,c.coefficient5b4,c.scale].forEach((v,j)=>input.writeFloatLE(v,4+i*40+j*4));}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*48)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const expected=[false,true].flatMap(rear=>{const r=calculateMcmTireForce({...cases[i],rear});return [r.alignment,r.perpendicular,r.magnitude,...r.force].map(floatBits);}),actual=Array.from({length:12},(_,j)=>results.readUInt32LE(i*48+j*4));
 for(let j=0;j<12;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%53===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Original front and rear tire force helpers: supplied axes, slip directions, load, coefficients and rear scale; contact detection and caller sequencing excluded'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
