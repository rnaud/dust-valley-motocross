import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateCrashFrameAnimation} from './crash-frame-animation-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-crash-frame-animation-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'crash-frame-animation-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>[...vec(3),0,...vec(3),0,...vec(3),0,...vec(100),1];
for(let i=0;i<40000;i++)cases.push({nodes:Array.from({length:3},(_,k)=>({local:matrix(),world:matrix(),cacheValid:(i>>(k+2))%2})),position:vec(100),targetParent:1+i%2,bodyParent:(i>>1)%2,forward:vec(5),up:vec(5),componentIndex:(i>>5)%8,local:(i>>8)%2,positionEnabled:(i>>9)%2,frameCount:1+(i>>10)%8,fraction:[0,.25,.5,.75,1][i%5],state:1+i%3,secondaryControl:(i>>3)%2,angle:i%4===0?[-8,-1,-.7853981852531433,-.7853981256484985,-0,0,.7853981256484985,.7853981852531433,1,8][Math.floor(i/4)%10]:f((random()-.5)*4)});
const input=Buffer.alloc(4+cases.length*480);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],values=[...c.nodes.flatMap(n=>[...n.local,...n.world]),...c.nodes.map(n=>n.cacheValid),0,0,...c.position,c.targetParent,c.bodyParent,...c.forward,...c.up,c.componentIndex,c.local,c.positionEnabled,c.frameCount,c.fraction,c.state,c.secondaryControl,c.angle];
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*480+j*4));
}
fs.writeFileSync(join(output,'cases.bin'),input);
fs.writeFileSync(join(output,'case-inputs.json'),JSON.stringify(cases));
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*480)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++) {
 const expected=evaluateCrashFrameAnimation(cases[i]),actual=Array.from({length:120},(_,j)=>results.readUInt32LE(i*480+j*4));
 for(let j=0;j<120;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 const c=cases[i],key=`state=${c.state}:secondary=${c.secondaryControl}:frames=${c.frameCount}:children=${actual[105]%3===0?0:c.frameCount%2===0?2:1}:weight=${actual[119]===0?'zero':actual[119]===0x3f800000?'one':'middle'}`;outcomes[key]=(outcomes[key]||0)+1;
 if(i%71===0||i<320)fixtures.push({input:cases[i],angleBits:floatBits(c.angle),outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original 0x4af710 crash-state branch through return, including lean-angle clamping, secondary-control bypass, real 0x430ab0 animation seek and 0x44f8b0 child callbacks. States 1..3, signed zero and saturation boundaries, frame counts 1..8, parent/cache combinations and zero/one/two child records. Finite inputs; normal-state rider animation and connected main-frame execution remain unvalidated.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
