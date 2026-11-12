import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mcmInverseSqrt} from '../../src/physics/mcm/inverse-sqrt.js';
import {bitsFloat} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-inverse-sqrt-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'inverse-sqrt-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[];
for(let e=1;e<255;e++)for(let m=0;m<64;m++)for(const edge of [0,1,0x1ffff])cases.push((e<<23)|(m<<17)|edge);
let seed=12345;
for(let i=0;i<10000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;cases.push(0x00800000+(seed%0x7f000000));}
const input=Buffer.alloc(4+cases.length*4);input.writeUInt32LE(cases.length);cases.forEach((b,i)=>input.writeUInt32LE(b,4+i*4));fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));
if(results.length!==cases.length*8)throw new Error('Incomplete oracle results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const expected=Buffer.alloc(8);expected.writeDoubleLE(mcmInverseSqrt(bitsFloat(cases[i])));const actual=results.subarray(i*8,i*8+8);
 if(!actual.equals(expected)){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,inputBits:cases[i],actual:actual.toString('hex'),expected:expected.toString('hex')});}
 if(i%131===0)fixtures.push({inputBits:cases[i],outputHex:actual.toString('hex')});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Original inverse-square-root table initialization and helper; positive normal float32 inputs, binary64 returned intermediate'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
