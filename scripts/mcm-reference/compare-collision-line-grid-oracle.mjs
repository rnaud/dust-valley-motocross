import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {updateMcmCollisionGrid} from '../../src/physics/mcm/collision-grid.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-collision-line-grid-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'collision-line-grid-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
for(let i=0;i<16000;i++){
 const dimension=1+i%8,cellSize=f([.5,1,10,100][(i>>3)%4]),start=[f((random()-.5)*dimension*cellSize*3),f((random()-.5)*dimension*cellSize*3)],end=[f(start[0]+(random()-.5)*cellSize*12),f(start[1]+(random()-.5)*cellSize*12)];
 if(i%7===0)end[0]=start[0];if(i%11===0)end[1]=start[1];
 cases.push({start,end,centerX:f((random()-.5)*cellSize*4),centerZ:f((random()-.5)*cellSize*4),dimension,cellSize,enabled:i%13!==0,markers:i%3,headerSeed:(i>>2)%7,ownerSeed:(i>>3)%3});
}
const input=Buffer.alloc(4+cases.length*48);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],values=[...c.start,...c.end,c.centerX,c.centerZ,c.dimension,c.cellSize,+c.enabled,c.markers,c.headerSeed,c.ownerSeed];
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*48+j*4));
}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*4944)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++) {
 const c=cases[i],cells=Array.from({length:65},(_,k)=>({owner:(k+c.headerSeed)%7===0?123:900}));
 cells.forEach((cell,k)=>{let tail=cell;for(let j=0;j<c.markers;j++){const e={owner:(k+j+c.ownerSeed)%3===0?123:500+j,other:77+j,active:2,previous:tail};tail.next=e;tail=e;}});
 const object={type:3,owner:123,start:c.start,end:c.end,entries:null};updateMcmCollisionGrid(object,{...c,cells},c.enabled);
 const expected=[];let inserted=0;
 for(const cell of cells){const words=[];let previous=cell;for(let e=cell.next;e;e=e.next){if(e.previous!==previous)throw new Error('Broken previous');words.push(e.owner,e.other,e.active);if(e.active===1)inserted++;previous=e;}expected.push(words.length/3,...words,...Array(18-words.length).fill(0));}
 expected.push(0);
 const actual=Array.from({length:1236},(_,j)=>results.readUInt32LE(i*4944+j*4));
 const key=`enabled=${c.enabled}:markers=${c.markers}:inserted=${inserted}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<1236;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c});}
 if(i%71===0||outcomes[key]===1)fixtures.push({input:c,outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Complete original type 3 line-grid insertion via 0x42a550/0x42a6e0, original CRT allocation, both endpoints and X/Z traversals. Finite endpoints, zero-length axes, dimensions 1..8, unequal grid origins, empty/prepopulated lists and matching sentinel/neighbor owners. Ordered list owner/auxiliary/active fields and previous-link consistency checked; uninitialized cell-index words excluded. Type 4 and collision dispatch excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
