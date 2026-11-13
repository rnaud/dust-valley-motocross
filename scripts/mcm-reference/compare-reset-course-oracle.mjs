import fs from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {floatBits} from '../../src/physics/mcm/math.js';
import {evaluateResetCourse} from './reset-course-case.mjs';
const [exeArg,outArg]=process.argv.slice(2);
if(!outArg)throw new Error('Usage: compare-reset-course-oracle.mjs mcm.exe new-output-directory');
const exe=resolve(exeArg),out=resolve(outArg),hash=x=>createHash('sha256').update(x).digest('hex');
const executableSha256=hash(fs.readFileSync(exe));if(executableSha256!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw new Error('Unrecognized executable');
fs.mkdirSync(out,{recursive:false});
const source=join(dirname(fileURLToPath(import.meta.url)),'reset-course-oracle.c');
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${cmd}: ${r.error||r.stderr||r.status}`);};
run(process.env.MCM_CC||'i686-w64-mingw32-gcc',['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(out,'oracle.exe')]);
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},f=Math.fround;
const cases=[];
for(let i=0;i<16384;i++){
 const words=Array.from({length:818},()=>floatBits((random()-.5)*1000));
 const g=Array.from({length:42},()=>f(random()*100)),width=f(.1+random()*10);
 g[0]=[0,1,2,3,4,-1][i%6];g[1]=Math.floor(i/6)%2;g[2]=Math.floor(i/12)%2?1:3;g[3]=Math.floor(i/24)%(g[2]===1?5:3);g[4]=i%17===0?1:0;g[5]=Math.floor(i/120)%2;g[6]=Math.floor(i/240)%2;g[7]=i%7===0?0:1;
 for(const start of [8,14,17]){g[start]=f(width*random()*300);g[start+1]=f(random()*20);g[start+2]=f(width*random()*300);}
 g[11]=f((random()-.5)*2);g[12]=f((random()-.5)*2);g[13]=f((random()-.5)*2);
 if(i%5===0){g[11]=0;g[13]=0;}
 if(i%11===0){g[8]=f(width*.5);g[10]=f(width*270);}
 g[20]=width;
 for(let j=0;j<4;j++){g[21+j*4]=f(g[8]+(random()-.5)*10);g[22+j*4]=f(random()*100);g[23+j*4]=f(g[10]+(random()-.5)*10);g[24+j*4]=Math.floor(random()*4)===0?1:0;}
 g[37]=Math.floor(random()*65536);g[38]=f(random()*20);g[39]=f(.01+random()*2);g[40]=f(.001);g[41]=f(Math.floor(i/31)%2?.00001:1);
 cases.push({words,values:g});
}
const input=Buffer.alloc(4+cases.length*3440);input.writeUInt32LE(cases.length);cases.forEach((c,i)=>[...c.words,...c.values.map(floatBits)].forEach((x,j)=>input.writeUInt32LE(x,4+i*3440+j*4)));fs.writeFileSync(join(out,'cases.bin'),input);
const win=p=>'Z:'+p.replaceAll('/','\\'),log=fs.openSync(join(out,'wine.log'),'w');
try{run(process.env.MCM_WINE||'/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine',[win(join(out,'oracle.exe')),win(exe),win(join(out,'cases.bin')),win(join(out,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(out,'results.bin'));if(results.length!==cases.length*3360)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],outcomes={},fixtures=[],keys=new Set();
for(let i=0;i<cases.length;i++){
 const v=cases[i].values,expected=evaluateResetCourse(cases[i]),actual=Array.from({length:840},(_,j)=>results.readUInt32LE(i*3360+j*4));
 for(let j=0;j<840;j++)if(expected[j]!==actual[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j]});}
 const key=`mode=${v[0]}:setting=${v[1]}:players=${v[2]}:ai=${v[3]}:disabled=${v[4]}:bb8=${v[5]}:88c=${v[6]}:heading=${v[7]}:steep=${v[41]===1}:fallback=${v[11]===0&&v[13]===0}`;
 outcomes[key]=(outcomes[key]||0)+1;
 const fixtureKeys=[`mode=${v[0]}:setting=${v[1]}:heading=${v[7]}:steep=${v[41]===1}`,`players=${v[2]}:ai=${v[3]}:disabled=${v[4]}:bb8=${v[5]}:88c=${v[6]}:fallback=${v[11]===0&&v[13]===0}`];
 if(fixtureKeys.some(k=>!keys.has(k))||i%137===0)fixtures.push({input:cases[i],outputBits:actual});fixtureKeys.forEach(k=>keys.add(k));
}
const report={schemaVersion:1,executableSha256,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Complete original 0x4adb10, including real bike enumeration 0x459e90, nearby-bike avoidance, approximate square root, course bounds and real geometric terrain normals. Finite synthetic state, one or three primary bikes, up to four additional bikes, enabled/disabled enumeration, nullable heading, modes 0/1/2/3/4/-1, valid level-two terrain and positive course width. No patched callees or supplied helper results. Main reset selection integration, terrain selector 0x4ae0b0 and whole-bike trajectories excluded.'};
fs.writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(out,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({cases:cases.length,totalDifferences,firstDifferences,fixtures:fixtures.length}));if(totalDifferences)process.exitCode=1;
