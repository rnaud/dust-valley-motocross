import {floatBits} from '../../src/physics/mcm/math.js';
import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateContactRollSubstep} from './contact-roll-substep-case.mjs';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-contact-roll-substep-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const dllPath=process.env.MCM_D3DRM || '/Applications/Wine Stable.app/Contents/Resources/wine/lib/wine/i386-windows/d3drm.dll';
const d3drmSha256=hash(fs.readFileSync(dllPath));if(d3drmSha256!=='7edb1ed218aececbb44f4d92d5b0880f0ff1777dc525e555140f987015d8be1a')throw new Error('Unrecognized D3DRM reference');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'contact-roll-substep-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>{const q=Array.from({length:4},()=>random()-.5),l=Math.hypot(...q),[x,y,z,w]=q.map(v=>v/l);return [1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,...vec(30),1].map(f);};
for(let i=0;i<40000;i++){
 const c={terrain:{mode:i%6,base:Math.floor(random()*65536),bias:f(random()*20),scale:f(.01+random()*2),worldToGrid:f(.1+random()),heightScale:f(.001+random()*.01),normals:Array.from({length:4},()=>[f(random()*2-1),f(.1+random()),f(random()*2-1)])},node:{local:matrix(),world:matrix(),cacheValid:Math.floor(i/6)%2},radius:f(.1+random()*3),points:Array.from({length:10},()=>vec(20)),heights:vec(10).slice(0,2),resampleNormal:[f(random()),f(random()),3]};
 if(i%19===0)c.points[4]=[0,0,0];
 c.rearRadius=f(.1+random()*3);c.bikeForward=vec(2);c.bikeUp=vec(2);c.rearResampleNormal=vec(3);if(i%23===0)c.bikeUp=[...c.bikeForward];if(i%29===0)c.points[5]=[0,0,0];c.pitch=f((random()-.5)*4);c.heading=f((random()-.5)*12);c.sinRoll=f(random()*2-1);c.probeNormals=[vec(3),vec(3)];c.refinedNormals=[vec(3),vec(3)];
 if(i%17===0){c.heading=f([0,-0,Math.PI,-Math.PI,Math.PI/2,-Math.PI/2,2*Math.PI,-2*Math.PI][Math.floor(i/17)%8]);c.sinRoll=f([0,-0,1,-1][Math.floor(i/17)%4]);c.pitch=f([Math.PI/2,-Math.PI/2,1.570796251296997,1.5707964897155762][Math.floor(i/17)%4]);}
 if(i%31===0)c.terrain.normals=Array.from({length:4},()=>[0,1,0]);
 if(i%37===0){c.terrain.normals=Array.from({length:4},()=>[0,0,0]);c.probeNormals=[[0,0,0],[0,0,0]];c.refinedNormals=[[0,0,0],[0,0,0]];}
 if(i%41===0)c.node.local=c.node.world=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 c.node.cacheValid=Math.floor(i/96)%2;c.nodes=[c.node,...Array.from({length:3},()=>({local:matrix(),world:matrix(),cacheValid:random()<.5?0:1}))];c.parents=c.nodes.map((_,j)=>j===0?-1:Math.floor(random()*(j+1))-1);c.frontIndex=Math.floor(i/6)%4;c.rearIndex=Math.floor(i/24)%4;c.field6b0=f(random()*5);if(c.terrain.mode===0)c.terrain.worldToGrid=f(.1);c.dt=f([0,.02,.001,.1][Math.floor(i/13)%4]);c.componentRate=f((random()-.5)*10);c.state844=[0,0,1,-1][Math.floor(i/7)%4];c.bodyIndex=Math.floor(i/19)%4;c.componentAxis=vec(2);c.componentAngle=f((random()-.5)*6);c.cooldown=f([0,-0,-1,c.dt,c.dt*.5,c.dt*2,3][Math.floor(i/11)%7]);c.cooldownFlag=Math.floor(random()*100);
 if(i%17===0){c.componentRate=0;c.componentAngle=f([0,-0,.0000999999901978299,.0001,.00010000000474974513,-.0001][Math.floor(i/17)%6]);}
 if(i%43===0){c.componentRate=f(3.4028234663852886e38);c.dt=2;}
 c.speed=f(random()*100);c.dragThreshold=f(random()*100);c.dragCoefficient=f(random()*3);c.velocity=vec(100);c.baseForce=vec(1000);if(i%19===0)c.dragThreshold=c.speed;c.roll=f((random()-.5)*4);if(i%17===0)c.speed=[0,32,31.999998092651367,32.000003814697266,-32,-0][Math.floor(i/17)%6];c.scalarBits={speed:floatBits(c.speed),componentAngle:floatBits(c.componentAngle),cooldown:floatBits(c.cooldown)};cases.push(c);
}
const input=Buffer.alloc(4+cases.length*948);input.writeUInt32LE(cases.length);
cases.forEach((c,i)=>{const t=c.terrain;const values=[t.mode,t.base,t.bias,t.scale,t.worldToGrid,t.heightScale,...t.normals.flat(),...c.node.local,...c.node.world,c.node.cacheValid,c.radius,...c.points.flat(),...c.heights,...c.resampleNormal.slice(0,2),c.rearRadius,...c.bikeForward,...c.bikeUp,...c.rearResampleNormal,c.pitch,c.heading,c.sinRoll,...c.probeNormals.flat(),...c.refinedNormals.flat(),...c.nodes.slice(1).flatMap(n=>[...n.local,...n.world,n.cacheValid]),...c.parents,c.frontIndex,c.rearIndex,c.field6b0,c.dt,c.componentRate,c.state844,c.bodyIndex,c.componentAngle,...c.componentAxis,c.cooldown,c.cooldownFlag,c.speed,c.dragThreshold,c.dragCoefficient,...c.velocity,...c.baseForce,c.roll];if(values.length!==237)throw new Error('Input layout');values.forEach((v,j)=>input.writeFloatLE(v,4+i*948+j*4));});
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDLLOVERRIDES:'d3drm=b',WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
if(hash(fs.readFileSync(join(output,'results.bin.d3drm.dll')))!==d3drmSha256)throw new Error('Loaded D3DRM hash mismatch');
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*916)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={},fixtureKeys=new Set();
for(let i=0;i<cases.length;i++){
 const c=cases[i],expected=evaluateContactRollSubstep(c),actual=Array.from({length:229},(_,j)=>results.readUInt32LE(i*916+j*4));
 const key=`terrain=${c.terrain.mode}:front=${c.frontIndex}:rear=${c.rearIndex}:cached=${c.node.cacheValid}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<229;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c});}
 const keys=[`rollBranch=${!!c.state844||((floatBits(c.speed)|0)>0x42000000)}:targetSign=${actual[227]>>>31}:cosOne=${actual[228]===floatBits(1)}:state=${c.state844}`,`contacts=${actual[214]},${actual[215]}:drag=${c.speed>c.dragThreshold}`,key,`state=${c.state844}:body=${c.bodyIndex}:angleZero=${actual[210]===0}:cooldown=${actual[211]===0}:flag=${actual[212]===0}`];
 if(i%113===0||keys.some(k=>!fixtureKeys.has(k)))fixtures.push({input:c,outputBits:actual});keys.forEach(k=>fixtureKeys.add(k));
}
const report={schemaVersion:1,d3drmSha256,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Original continuous ordinary main-loop branch 0x4a63d2..0x4a692a: complete contacts, component/cooldown update, initial force preparation, projected contact normal, roll-target geometry, original CRT asin, stored cosine and steering-dependent roll blend. Finite synthetic state with four-node graphs, terrain modes, speed/angle threshold and signed-zero cases, overflowing angle increments. Pinned Wine 11 D3DRM. Initial query scratch and exit observation boundaries supplied. Later force assembly and whole-bike trajectories excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
