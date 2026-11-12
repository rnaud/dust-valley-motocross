import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {queryMcmTerrainHeight} from '../../src/physics/mcm/terrain-height.js';
import {queryMcmTerrainNormal} from '../../src/physics/mcm/terrain-normal.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-terrain-normal-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'terrain-normal-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<40000;i++) {
 const mode=i%6,worldToGrid=i%3===0?1:f(.01+random()*2),extent=mode===0?15:5000;
 let x=f(random()*extent),z=f(random()*extent);
 // Exact grid lines, diagonal ties, negative clamping, hierarchy boundaries.
 if(i%7===0){x=Math.floor(x);z=Math.floor(z);}
 if(i%11===0){x=f(Math.floor(x)+.5);z=f(Math.floor(z)+.5);}
 if(i%13===0)x=-x;if(i%17===0)z=-z;
 cases.push({mode,point:[f(x/worldToGrid),f(random()*100),f(z/worldToGrid)],base:Math.floor(random()*65536),bias:f(random()*10000),scale:i%7===0?1:f(.01+random()*4),worldToGrid,heightScale:f(.001+random()*2),normals:Array.from({length:4},()=>[f(random()*2-1),f(.1+random()),f(random()*2-1)])});
}
const input=Buffer.alloc(4+cases.length*88);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const c=cases[i];[c.mode,c.point[0],c.point[2],c.base,c.bias,c.scale,c.worldToGrid,c.heightScale,c.point[1],0,...c.normals.flat()].forEach((v,j)=>input.writeFloatLE(v,4+i*88+j*4));}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*24)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const c=cases[i],leaf={level:0,bias:c.bias,scale:c.scale,heights:Array.from({length:289},(_,j)=>(c.base+j*137)&65535),normals:Array.from({length:289},(_,j)=>c.normals[(j%17%2)+2*(Math.floor(j/17)%2)])};
 const child={level:1,children:Array(256).fill(leaf)},parent={level:2,children:Array(256).fill(child)};
 const root=[leaf,child,parent,{level:1},{level:1,children:Array(256).fill(null)},null][c.mode];
 const expected=[...queryMcmTerrainHeight({...c,root}),...queryMcmTerrainNormal({...c,root,normal:[1,2,3]})].map(floatBits),actual=Array.from({length:6},(_,j)=>results.readUInt32LE(i*24+j*4));
 for(let j=0;j<6;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c});}
 if(i%53===0)fixtures.push({input:c,outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Original continuous terrain height query 0x411340 with smooth normal output: alternating triangles, grid ties, negative coordinate clamping, two hierarchy levels, missing tiles and null root; finite synthetic coordinates and tiles. Varied corner normals; face-normal mode and live terrain integration are not covered.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
