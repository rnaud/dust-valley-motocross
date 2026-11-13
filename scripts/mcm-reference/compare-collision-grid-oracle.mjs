import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {updateMcmCollisionGrid} from '../../src/physics/mcm/collision-grid.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-collision-grid-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'collision-grid-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
for(let i=0;i<32000;i++){
 const dimension=1+i%8,cellSize=f([.5,1,10,100][(i>>3)%4]);
 cases.push({matrix:[...vec(3),0,...vec(3),0,...vec(3),0,...vec(100),1],localCenter:vec(5),worldCenter:vec(100),radius:f(random()*cellSize*2),centerX:f((random()-.5)*50),centerZ:f((random()-.5)*50),dimension,cellSize,enabled:i%13!==0,type:[0,1,2,5][Math.floor(i/17)%4],oldCells:Array.from({length:4},()=>Math.floor(random()*(dimension*dimension+1))),active:Array.from({length:4},()=>Math.floor(random()*3))});
}
for(const dimension of [1,4,8])for(const x of [-1.00001,-1,-.99999,-.00001,0,.00001,dimension-.00001,dimension,dimension+.00001])for(const z of [-.99999,0,dimension])for(const radius of [0,.5]){
 const cx=f(x-dimension*.5),cz=f(z-dimension*.5);
 cases.push({matrix:[1,0,0,0,0,1,0,0,0,0,1,0,cx,0,cz,1],localCenter:[0,0,0],worldCenter:[1,2,3],radius,centerX:0,centerZ:0,dimension,cellSize:1,enabled:true,type:0,oldCells:[0,0,0,dimension*dimension],active:[1,1,1,1]});
}
// Exercise the original signed-64 conversion and low-word use, including
// finite coordinates whose grid quotient overflows FISTP qword.
let integerBoundaryCases=0;
for(const magnitude of [2**31,2**32,2**63-2**40,2**63,2**63+2**40,1e20,1e22,1e23,1e25])for(const sign of [-1,1])for(const cellSize of [.1,.3,1,3,10]){
 const x=f(sign*magnitude),z=f(-sign*magnitude);
 cases.push({matrix:[1,0,0,0,0,1,0,0,0,0,1,0,x,0,z,1],localCenter:[0,0,0],worldCenter:[1,2,3],radius:0,centerX:0,centerZ:0,dimension:8,cellSize:f(cellSize),enabled:true,type:0,oldCells:[0,0,0,64],active:[1,1,1,1]});integerBoundaryCases++;
}
const input=Buffer.alloc(4+cases.length*148);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],values=[...c.matrix,...c.localCenter,...c.worldCenter,c.radius,c.centerX,c.centerZ,c.dimension,c.cellSize,+c.enabled,c.type,...c.oldCells,...c.active];
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*148+j*4));
}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*888)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++) {
 const c=cases[i],cells=Array.from({length:65},(_,i)=>({id:1000+i})),markers=Array.from({length:65},(_,i)=>({id:2000+i}));
 cells.forEach((cell,i)=>{cell.next=markers[i];markers[i].previous=cell;});
 const entries=c.oldCells.map((cell,i)=>({id:i+1,cell,active:c.active[i],owner:123,other:77+i}));
 for(const e of entries)if(e.active){let tail=cells[e.cell];while(tail.next)tail=tail.next;tail.next=e;e.previous=tail;}
 const object={...c,worldCenter:[...c.worldCenter],entries};updateMcmCollisionGrid(object,{...c,cells},c.enabled);
 const id=n=>n?.id||0;
 const expected=[...object.worldCenter.map(floatBits),...entries.flatMap(e=>[id(e.previous),id(e.next),e.owner,e.cell,e.other,e.active]),...cells.flatMap((cell,i)=>[id(cell.next),id(markers[i].previous),id(markers[i].next)])],actual=Array.from({length:222},(_,j)=>results.readUInt32LE(i*888+j*4));
 const key=`enabled=${c.enabled}:type=${c.type}:active=${entries.filter(e=>e.active).length}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<222;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c});}
 if(i>=32000||i%71===0||outcomes[key]===1)fixtures.push({input:c,outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,integerBoundaryCases,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original 0x42a550 plus 0x42a6e0 world-center update, entry unlink and type 0/1 four-corner grid insertion. Existing entry storage, prepopulated cell lists, duplicate/outside cells, dimensions 1..8, enabled/disabled and type 2/invalid cleanup. All entry metadata and observable list links compared, including signed-64 integer conversion overflow and its low-word grid index. Allocation branch, types 3/4, collision dispatch and whole-bike trajectories excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
