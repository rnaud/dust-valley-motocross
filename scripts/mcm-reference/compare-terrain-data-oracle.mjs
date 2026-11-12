import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readMcmTerrainBanks,decompressMcmBlock} from './terrain-data.mjs';
const [exeArg, outputArg, assetsArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-terrain-data-oracle.mjs mcm.exe output-directory assets-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'decompress-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
if(!assetsArg)throw new Error('Assets directory required');
const assets=resolve(assetsArg),files=fs.readdirSync(assets,{recursive:true}).filter(p=>p.toLowerCase().endsWith('.trn')).sort();
const cases=[],courses=[];
for(const name of files) {
 const bytes=fs.readFileSync(join(assets,name)),terrain=readMcmTerrainBanks(bytes);
 courses.push({name,sha256:hash(bytes),banks:terrain.banks.length,heightScale:terrain.heightScale,nextOffset:terrain.nextOffset});
 for(const block of terrain.blocks)if(block.compressed)cases.push({...block,name});
}
// Synthetic streams can be retained without redistributing original course data.
function pack(codes) {
 const bits=[];let width=9;
 for(const code of codes){for(let j=width-1;j>=0;j--)bits.push((code>>>j)&1);if(code===257)width++;if(code===258)width=9;}
 const bytes=Buffer.alloc(4+Math.ceil(bits.length/8));bytes.writeUInt32LE(bytes.length);
 bits.forEach((v,j)=>bytes[4+(j>>>3)]|=v<<(7-(j&7)));return bytes;
}
for(const [size,codes] of [[5,[65,259,260,256]],[6,[65,259,260,256]],[4,[1,2,257,3,258,4,256]],[1,[0,256]],[3,[255,0,128,256]]])cases.push({name:'synthetic',size,data:pack(codes)});
const count=Buffer.alloc(4);count.writeUInt32LE(cases.length);
const input=Buffer.concat([count,...cases.flatMap(c=>{const h=Buffer.alloc(8);h.writeUInt32LE(c.size);h.writeUInt32LE(c.data.length,4);return [h,c.data];})]);
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));let offset=0,totalDifferences=0,extraByteBlocks=0;const firstDifferences=[],fixtures=[];
for(const c of cases) {
 const decoded=decompressMcmBlock(c.data,c.size),expected=Buffer.alloc(c.size+32,0xa5);decoded.copy(expected);
 const actual=results.subarray(offset,offset+expected.length);offset+=expected.length;
 if(decoded.length===c.size+1)extraByteBlocks++;
 if(!actual.equals(expected)){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({name:c.name,offset:c.offset,bank:c.bank});}
 if(c.name==='synthetic')fixtures.push({size:c.size,inputHex:c.data.toString('hex'),outputHex:actual.subarray(0,decoded.length).toString('hex')});
}
if(offset!==results.length)throw new Error('Incomplete or excess oracle output');
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),importsSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle-imports.h'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,extraByteBlocks,totalDifferences,firstDifferences,courses,scope:'TRN v2 prefix and sample-bank boundaries inferred from original loaders; compressed palette and sample-bank bytes compared against original 0x427a90, including 32 guard bytes. Course hierarchy/rendering sections and connected bike updates are not yet decoded or validated.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({executableSha256:exeHash,fixtures},null,2)+'\n');console.log(JSON.stringify({cases:cases.length,courses:courses.length,extraByteBlocks,totalDifferences,firstDifferences},null,2));if(totalDifferences)process.exitCode=1;
