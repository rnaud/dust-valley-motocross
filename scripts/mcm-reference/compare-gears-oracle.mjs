import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compareGears} from './compare-gears.mjs';
import {floatBits, bitsFloat} from '../../src/physics/mcm/math.js';
const [exeArg, traceArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-gears-oracle.mjs mcm.exe live-shift.jsonl output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
const trace = fs.readFileSync(traceArg), first = trace.toString().trim().split(/\r?\n/).map(JSON.parse).find(r => r.phase === 'before');
const template = Buffer.from(first.engineHex, 'hex');
if (template.length !== 0x16c || template.readUInt32LE(0x84) !== 5) throw new Error('Expected captured five-gear parameter table');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'gears-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases = [];
const around = value => [-1,0,1].map(n => bitsFloat(floatBits(value)+n));
for (let gear=0;gear<5;gear++) for(const disabled of [0,1]) for(const timer of [0,Math.fround(.05)]) {
  const threshold=template.readFloatLE(0x154), down=template.readFloatLE(0x78);
  const rpmValues=[0,10250,...around(threshold),...around(down)];
  const speeds=[...around(template.readFloatLE(0x64+gear*4)),...around(template.readFloatLE(0x60+Math.max(gear,1)*4))].filter(x=>Number.isFinite(x)&&x>=0);
  for(const rpm of rpmValues) for(const previous of [rpm-1,rpm,rpm+1]) for(const speed of speeds) for(const level of [0,Math.fround(.2),Math.fround(.8),1]) for(const random of [0,16384,32767]) {
    const bytes=Buffer.from(template);
    bytes.writeUInt32LE(gear,0x158);bytes.writeUInt32LE(disabled,0x14c);
    bytes.writeFloatLE(timer,0x168);bytes.writeFloatLE(rpm,0x15c);bytes.writeFloatLE(previous,0x7c);bytes.writeFloatLE(level,0x160);
    cases.push({bytes,speedBits:floatBits(speed),random});
  }
}
const input=Buffer.alloc(4+cases.length*(0x16c+12));input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){const offset=4+i*(0x16c+12),c=cases[i];c.bytes.copy(input,offset);input.writeUInt32LE(c.speedBits,offset+0x16c);input.writeUInt32LE(c.random,offset+0x170);input.writeUInt32LE(0x027f,offset+0x174);}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));
if(results.length!==cases.length*0x170)throw new Error('Incomplete oracle results');
let totalDifferences=0,upshifts=0,downshifts=0,timerSkips=0;const firstDifferences=[];
for(let i=0;i<cases.length;i++) {
  const c=cases[i],engine=results.subarray(i*0x170,i*0x170+0x16c),draws=results.readUInt32LE(i*0x170+0x16c);
  if(draws>1)throw new Error('Unexpected random call count');
  const base={engine:1,thread:1,cw:0x027f,speedBits:c.speedBits,randomScaleBits:first.randomScaleBits};
  const rows=[{...base,phase:'before',engineHex:c.bytes.toString('hex')}];
  if(draws)rows.push({engine:1,phase:'random',value:c.random});
  rows.push({...base,phase:'after',engineHex:engine.toString('hex')});
  const r=compareGears(rows);totalDifferences+=r.failures.length;upshifts+=r.upshifts;downshifts+=r.downshifts;timerSkips+=r.timerSkips;
  for(const f of r.failures)if(firstDifferences.length<10)firstDifferences.push({case:i,...f});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),parameterTraceSha256:hash(trace),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,upshifts,downshifts,timerSkips,totalDifferences,firstDifferences,scope:'Original mapped shift instructions; synthetic state boundaries using one captured parameter table; supplied random draw replaces CRT dependency only'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
