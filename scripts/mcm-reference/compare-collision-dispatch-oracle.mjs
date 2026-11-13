import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dispatchMcmCollisions,testMcmSpherePair} from '../../src/physics/mcm/collision-dispatch.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-collision-dispatch-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'collision-dispatch-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
for(let i=0;i<32000;i++)cases.push({objects:Array.from({length:4},()=>({enabled:random()<.8,primary:random()<.5,secondary:random()<.5,worldCenter:vec(15),radius:f(random()*6)})),entries:Array.from({length:2},()=>({active:random()<.8,cell:Math.floor(random()*2)})),owners:Array.from({length:8},()=>Math.floor(random()*4)),pairs:Array.from({length:4},()=>Array.from({length:4},()=>Math.floor(random()*4))),enabled:i%13!==0,depth:f(random()*10)});
const input=Buffer.alloc(4+cases.length*232);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],values=[...c.objects.flatMap(o=>[+o.enabled,+o.primary,+o.secondary,...o.worldCenter,o.radius]),...c.entries.flatMap(e=>[+e.active,e.cell]),...c.owners,...c.pairs.flat(),+c.enabled,c.depth];
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*232+j*4));
}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*264)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++) {
 const c=cases[i],calls=[],objects=c.objects.map((o,k)=>({...o,entries:k===0?c.entries:[],contactCC:[k*10,k*10+1,k*10+2],contactD8:[k*10+3,k*10+4,k*10+5],contactE4:[k*10+6,k*10+7,k*10+8],onPrimary:o.primary?()=>calls.push(100+k):null,onSecondary:o.secondary?()=>calls.push(200+k):null}));
 const nodes=c.owners.map(owner=>({owner}));nodes.forEach((node,k)=>{if(k%4!==3)node.next=nodes[k+1];});
 const m={objects,cells:[{next:nodes[0]},{next:nodes[4]}],pairs:c.pairs.map(row=>[...row]),enabled:c.enabled,depth:c.depth,contactCC:[1000,1001,1002],contactD8:[1003,1004,1005],contactE4:[1006,1007,1008],otherE4:[1009,1010,1011]};
 dispatchMcmCollisions(m,0,testMcmSpherePair);
 const expected=[...objects.flatMap(o=>[objects.indexOf(o.other)+1,...[...o.contactCC,...o.contactD8,...o.contactE4].map(floatBits)]),...m.pairs.flat(),floatBits(m.depth),m.currentA===undefined?0:m.currentA+1,m.currentB===undefined?0:m.currentB+1,calls.length,...calls,...Array(6-calls.length).fill(0)],actual=Array.from({length:66},(_,j)=>results.readUInt32LE(i*264+j*4));
 const key=`callbacks=${calls.length}:hit=${objects[0].other!==undefined}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<66;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c});}
 if(i%71===0||outcomes[key]===1)fixtures.push({input:c,outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Connected original 0x42ccc0 dispatch, 0x42b870 candidate pair preparation, 0x42ca00 pair state gate and real type 0/type 0 primitive 0x42c0e0. Four objects, repeated owners/cells, enable flags, protected pair states, hit depth/contact copies and ordered observational callbacks. Other primitive types and mutating gameplay callbacks excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
