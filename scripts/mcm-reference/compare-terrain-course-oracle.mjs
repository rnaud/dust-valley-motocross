import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readMcmTerrain,decompressMcmBlock} from './terrain-data.mjs';
const [exeArg, outputArg, assetsArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-terrain-course-oracle.mjs mcm.exe output-directory assets-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'terrain-course-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
import {queryMcmTerrainHeight} from '../../src/physics/mcm/terrain-height.js';
import {queryMcmTerrainNormal} from '../../src/physics/mcm/terrain-normal.js';
import {queryMcmTerrainFaceNormal} from '../../src/physics/mcm/terrain-face-normal.js';
import {floatBits} from '../../src/physics/mcm/math.js';
if(!assetsArg)throw new Error('Course path required');
const trn=resolve(assetsArg),bytes=fs.readFileSync(trn),terrain=readMcmTerrain(bytes),queries=[];
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const extent=(terrain.root.level===2?4096:256)/terrain.worldToGrid;
for(let i=0;i<4000;i++)queries.push({point:[Math.fround((random()*1.2-.1)*extent),0,Math.fround((random()*1.2-.1)*extent)],mode:i%2});
const header=Buffer.alloc(16);header.writeUInt32LE(terrain.banks.length);header.writeFloatLE(terrain.heightScale,4);header.writeFloatLE(terrain.worldToGrid,8);header.writeUInt32LE(terrain.rootOffset,12);
const count=Buffer.alloc(4);count.writeUInt32LE(queries.length);
const input=Buffer.concat([header,...terrain.banks.map(bank=>{const b=bank[2];return (b.compressed?decompressMcmBlock(b.data,b.size):b.data).subarray(0,b.size);}),count,...queries.map(q=>{const b=Buffer.alloc(16);q.point.forEach((v,j)=>b.writeFloatLE(v,j*4));b.writeUInt32LE(q.mode,12);return b;})]);
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(trn),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin')),nodeCount=results.readUInt32LE();let offset=4,nodeDifferences=0,queryDifferences=0;const firstDifferences=[];
if(nodeCount!==terrain.nodes.size)throw new Error('Node count differs');
for(let i=0;i<nodeCount;i++){
 const at=results.readUInt32LE(offset),node=terrain.nodes.get(at);if(!node)throw new Error('Unexpected node offset');
 const expected=[at,floatBits(node.bias),floatBits(node.scale),node.level,node.shift,node.bankIndex,...Array.from({length:256},(_,j)=>node.children?.[j]?.offset||0)];
 for(let j=0;j<expected.length;j++)if(results.readUInt32LE(offset+j*4)!==expected[j])nodeDifferences++;
 offset+=262*4;
}
for(let i=0;i<queries.length;i++){
 const q=queries[i],args={...terrain,point:q.point,normal:[1,2,3]};
 const expected=[...queryMcmTerrainHeight(args),...(q.mode?queryMcmTerrainFaceNormal(args):queryMcmTerrainNormal(args))].map(floatBits);
 for(let j=0;j<6;j++){const actual=results.readUInt32LE(offset+j*4);if(actual!==expected[j]){queryDifferences++;if(firstDifferences.length<10)firstDifferences.push({i,field:j,actual,expected:expected[j],query:q});}}
 offset+=24;
}
if(offset!==results.length)throw new Error('Invalid output length');
const report={schemaVersion:1,executableSha256:exeHash,courseSha256:hash(bytes),course:trn.split('/').slice(-2).join('/'),oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),rootOffset:terrain.rootOffset,nodeCount,queries:queries.length,worldToGrid:terrain.worldToGrid,heightScale:terrain.heightScale,nodeDifferences,queryDifferences,firstDifferences,scope:'Original 0x48a2f0 node deserialization and child-offset traversal, followed by intact 0x411340 height/smooth/face queries on actual course banks. Host stdio/allocation and child object construction replace runtime services; renderer initialization is omitted. Root offset, scales and decompressed banks are supplied by the recovered prefix reader, not independently loaded by the full game.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(nodeDifferences||queryDifferences)process.exitCode=1;
