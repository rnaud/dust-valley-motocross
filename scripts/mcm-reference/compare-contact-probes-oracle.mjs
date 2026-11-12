import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readMcmTerrain,decompressMcmBlock} from './terrain-data.mjs';
const [exeArg, outputArg, assetsArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-contact-probes-oracle.mjs mcm.exe output-directory assets-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'contact-probes-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
import {queryMcmTerrainHeight} from '../../src/physics/mcm/terrain-height.js';
import {sampleMcmContactProbes} from '../../src/physics/mcm/contact-probes.js';
import {floatBits} from '../../src/physics/mcm/math.js';
if(!assetsArg)throw new Error('Course path required');
const trn=resolve(assetsArg),bytes=fs.readFileSync(trn),terrain=readMcmTerrain(bytes),queries=[];
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const extent=(terrain.root.level===2?4096:256)/terrain.worldToGrid;
for(let i=0;i<12000;i++) {
 const x=Math.fround(random()*extent),z=Math.fround(random()*extent);
 const y=queryMcmTerrainHeight({...terrain,point:[x,0,z]})[1];
 const matrix=()=>{const m=Array(16).fill(0);for(const j of [0,1,2,4,5,6,8,9,10])m[j]=Math.fround(random()*2-1);m[12]=x;m[13]=Math.fround(y+random()*6-3);m[14]=z;m[15]=1;return m;};
 queries.push({componentMatrix:matrix(),bikeMatrix:matrix(),points:Array.from({length:3},()=>Array.from({length:3},()=>Math.fround(random()*4-2))),selector:i%3});
}
const header=Buffer.alloc(16);header.writeUInt32LE(terrain.banks.length);header.writeFloatLE(terrain.heightScale,4);header.writeFloatLE(terrain.worldToGrid,8);header.writeUInt32LE(terrain.rootOffset,12);
const count=Buffer.alloc(4);count.writeUInt32LE(queries.length);
const input=Buffer.concat([header,...terrain.banks.map(bank=>{const b=bank[2];return (b.compressed?decompressMcmBlock(b.data,b.size):b.data).subarray(0,b.size);}),count,...queries.map(q=>{const b=Buffer.alloc(168);[...q.componentMatrix,...q.bikeMatrix,...q.points.flat()].forEach((v,j)=>b.writeFloatLE(v,j*4));b.writeUInt32LE(q.selector,164);return b;})]);
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(trn),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));let offset=0,queryDifferences=0;const firstDifferences=[],selectors=[0,0,0];
for(let i=0;i<queries.length;i++) {
 const q=queries[i],r=sampleMcmContactProbes({terrain,...q,componentNode:{local:q.componentMatrix,cacheValid:0},bikeNode:{local:q.bikeMatrix,cacheValid:0}});
 selectors[r.selector]++;
 const pack=p=>[...p.world,...p.surface,...p.normal,p.depth].map(floatBits);
 const expected=[...pack(r.primary),...pack(r.third),r.selector,r.thirdContact,r.anyContact];
 for(let j=0;j<23;j++){const actual=results.readUInt32LE(offset+j*4);if(actual!==expected[j]){queryDifferences++;if(firstDifferences.length<10)firstDifferences.push({i,field:j,actual,expected:expected[j],query:q});}}
 offset+=92;
}
if(offset!==results.length)throw new Error('Invalid output length');
const report={schemaVersion:1,executableSha256:exeHash,courseSha256:hash(bytes),course:trn.split('/').slice(-2).join('/'),oracleSourceSha256:hash(fs.readFileSync(source)),courseHarnessSha256:hash(fs.readFileSync(join(dirname(source),'terrain-course-oracle.c'))),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),rootOffset:terrain.rootOffset,nodeCount:terrain.nodes.size,queries:queries.length,selectors,worldToGrid:terrain.worldToGrid,heightScale:terrain.heightScale,queryDifferences,firstDifferences,scope:'Original contact probe block 0x4a6a25..0x4a6c01 executes intact, using 0x4b8660 transforms and 0x411340 smooth terrain queries. Inputs use varied affine transforms and synthetic local probe points over the supplied terrain; incoming selector is preserved as in the original. This is not a full bike-step comparison. Terrain nodes are loaded through original 0x48a2f0. Host stdio/allocation and child object construction replace runtime services; renderer initialization is omitted. Root offset, scales and decompressed banks are supplied by the recovered prefix reader, not independently loaded by the full game.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(queryDifferences)process.exitCode=1;

if(hash(bytes)==='010037ebb3eca34a6be886362f002bbb5d6f49ba47d69190b73b3b54fbdffe0b') {
 const fixtures=queries.flatMap((q,i)=>i%53===0?[{input:q,outputBits:Array.from({length:23},(_,j)=>results.readUInt32LE(i*92+j*4))}]:[]);
 fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');
}
