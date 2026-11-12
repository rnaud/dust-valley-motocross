import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {multiplyMcmMatrices} from '../../src/physics/mcm/matrix.js';
import {mcmAxisAngleMatrix} from '../../src/physics/mcm/axis-angle.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-transform-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'transform-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
for(let i=0;i<12000;i++) {
 const a=i%5===0?identity():Array.from({length:16},()=>f((random()-.5)*10));
 const b=Array.from({length:16},()=>f((random()-.5)*10));
 const axis=i%7===0?[1,0,0]:Array.from({length:3},()=>f((random()-.5)*2));
 cases.push({a,b,axis,angle:i%11===0?0:f((random()-.5)*6.28)});
}
const input=Buffer.alloc(4+cases.length*144);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++)[...cases[i].a,...cases[i].b,...cases[i].axis,cases[i].angle].forEach((v,j)=>input.writeFloatLE(v,4+i*144+j*4));
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*132)throw new Error('Incomplete results');
let totalDifferences=0,matrixDifferences=0,rotationDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const {a,b,axis,angle}=cases[i],rotated=multiplyMcmMatrices(a,mcmAxisAngleMatrix(axis,angle));rotated.splice(12,3,...a.slice(12,15));
 const expected=[...multiplyMcmMatrices(a,b),...rotated].map(floatBits);expected.push(0);
 const actual=Array.from({length:33},(_,j)=>results.readUInt32LE(i*132+j*4));
 for(let j=0;j<33;j++)if(actual[j]!==expected[j]){totalDifferences++;if(j<16)matrixDifferences++;else rotationDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%47===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,matrixDifferences,rotationDifferences,firstDifferences,scope:'Original general matrix multiplication and local axis-angle rotation of an isolated transform node; no child tree or pivot translation'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
