import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {calculateMcmDriveForce} from '../../src/physics/mcm/drive-force.js';
import {floatBits, bitsFloat} from '../../src/physics/mcm/math.js';
const [exeArg, traceArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-force-oracle.mjs mcm.exe live-shift.jsonl output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
const trace = fs.readFileSync(traceArg), first = trace.toString().trim().split(/\r?\n/).map(JSON.parse).find(r => r.phase === 'before');
const template = Buffer.from(first.engineHex, 'hex');
if (template.length !== 0x16c || template.readUInt32LE(0x84) !== 5) throw new Error('Expected captured five-gear parameter table');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'force-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const f = offset => template.readFloatLE(offset);
const table = offset => Array.from({length:15},(_,i)=>f(offset+4*i));
const knots=table(0x8c), samples=table(0xc8), slopes=table(0x104), knotCount=template.readInt32LE(0x88);
const around=value=>value===0?[-Math.pow(2,-149),0,Math.pow(2,-149)]:[-1,0,1].map(n=>bitsFloat(floatBits(value)+n));
const cases=[];
for(let gear=0;gear<5;gear++) for(const released of [0,1]) for(const ai of [0,1])
for(const rpm of [-1,...knots.slice(0,knotCount).flatMap(around),11000])
for(const speed of [-10,-0,0,.5,...around(Math.fround(1.01)),10,100])
for(const direction of [[1,0,0],[0,1,0],[0,0,1],[-.8,.3,.6].map(Math.fround)]) {
  const bytes=Buffer.from(template);bytes.writeUInt32LE(gear,0x158);bytes.writeUInt32LE(released,0x150);bytes.writeFloatLE(rpm,0x15c);
  cases.push({bytes,input:{released,speed,direction,rpmDemand:rpm,gearRatio:f(8+4*gear),knotCount,knots,samples,slopes,ai:!!ai,aiScale:Math.fround(.873)}});
}
const input=Buffer.alloc(4+cases.length*0x184);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++) {
  const offset=4+i*0x184,c=cases[i];c.bytes.copy(input,offset);input.writeFloatLE(c.input.speed,offset+0x16c);
  c.input.direction.forEach((v,j)=>input.writeFloatLE(v,offset+0x170+4*j));input.writeUInt32LE(+c.input.ai,offset+0x17c);input.writeFloatLE(c.input.aiScale,offset+0x180);
}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));
if(results.length!==4+cases.length*16)throw new Error('Incomplete oracle results');
const forceScale=results.readFloatLE(0);let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
  const c=cases[i];c.input.forceScale=forceScale;
  const result=calculateMcmDriveForce(c.input),actual=Array.from({length:4},(_,j)=>results.readUInt32LE(4+i*16+j*4));
  const expected=[result.scalar,...result.vector].map(floatBits);
  for(let j=0;j<4;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c.input});}
  if(i%53===0)fixtures.push({input:c.input,outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),parameterTraceSha256:hash(trace),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,forceScale,totalDifferences,firstDifferences,scope:'Mapped original drive-force instructions, captured parameter table, RPM knot and speed division boundaries, local/AI/released branches; not whole-bike validation'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');
console.log(JSON.stringify(report,null,2));if(totalDifferences)process.exitCode=1;
