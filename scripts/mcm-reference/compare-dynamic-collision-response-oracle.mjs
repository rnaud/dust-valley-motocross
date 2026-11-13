import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateDynamicCollision} from './dynamic-collision-response-case.mjs';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-dynamic-collision-response-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'dynamic-collision-response-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>{const q=Array.from({length:4},()=>random()-.5),l=Math.hypot(...q),[x,y,z,w]=q.map(v=>v/l);return [1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,...vec(30),1].map(f);};
const transform=()=>({local:matrix(),world:matrix(),cacheValid:random()<.5?0:1});
for(let i=0;i<32000;i++){
 const n=vec(2),length=Math.hypot(...n),slow=i%5===0;
 cases.push({bike:{transform:transform(),state844:i%3,field618:i%3===0?1:i%2,field8a8:i%2,field564:f(i%2?.0005:.01),position:vec(10),velocity:vec(slow?.02:50),angularVelocity:vec(4),worldAngularVelocity:slow?[0,0,0]:vec(4),scratch540:vec(4),field654:vec(4),speed:f(random()*20),restitution:f(random()),inverseMass:f(.001+random()),inverseInertia:Array.from({length:3},()=>f(random()+.01)),alternateInertia:Array.from({length:3},()=>f(random()+.01))},proxy:transform(),collision:{contactCC:vec(10),contactD8:vec(.4),contactE4:n.map(x=>f(x/length)),localCenter:vec(3),radius:f(random()*5+.1),worldCenter:vec(5),matrix:matrix()},gridEnabled:i%7!==0,oldCells:Array.from({length:4},()=>Math.floor(random()*17)),active:Array.from({length:4},()=>random()<.5?0:1)});
}
cases.forEach((c,i)=>{
 c.bike.heading=f((random()-.5)*13);c.collisionType=Math.floor(i/2)%2;
 c.other={transform:transform(),state844:Math.floor(i/3)%3,inverseMass:f(.001+random()),alternateMass:f(.001+random()),riderMass:f(.001+random()),inverseInertia:vec(2).map(Math.abs),alternateInertia:vec(2).map(Math.abs),riderInertia:vec(2).map(Math.abs),position:vec(10),velocity:vec(30),worldAngularVelocity:vec(4),angularVelocity:vec(4),riderTransform:transform(),rider:{position:vec(10),velocity:vec(30),angular:vec(4),alternateVelocity:vec(30),alternateAngular:vec(4),flag13c:Math.floor(i/4)%2,flag140:Math.floor(i/8)%2}};
});
const input=Buffer.alloc(4+cases.length*992);input.writeUInt32LE(cases.length);
const node=n=>[...n.local,...n.world,n.cacheValid];
cases.forEach((c,i)=>{const b=c.bike,o=c.collision,w=c.other,r=w.rider;[...node(b.transform),...node(c.proxy),b.state844,b.field618,b.field8a8,b.field564,...b.position,...b.velocity,...b.angularVelocity,...b.worldAngularVelocity,...b.scratch540,...b.field654,b.speed,b.restitution,b.inverseMass,...b.inverseInertia,...b.alternateInertia,...o.contactCC,...o.contactD8,...o.contactE4,...o.localCenter,o.radius,...o.worldCenter,...o.matrix,+c.gridEnabled,...c.oldCells,...c.active,b.heading,c.collisionType,...node(w.transform),w.state844,w.inverseMass,w.alternateMass,w.riderMass,...w.inverseInertia,...w.alternateInertia,...w.riderInertia,...w.position,...w.velocity,...w.worldAngularVelocity,...w.angularVelocity,...node(w.riderTransform),...r.position,...r.velocity,...r.angular,...r.alternateVelocity,...r.alternateAngular,r.flag13c,r.flag140].forEach((v,j)=>input.writeFloatLE(v,4+i*992+j*4));});
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*1052)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[],outcomes={};
for(let i=0;i<cases.length;i++){
 const c=cases[i],expected=evaluateDynamicCollision(c),actual=Array.from({length:263},(_,j)=>results.readUInt32LE(i*1052+j*4));
 const key=`type=${c.collisionType}:state=${c.bike.state844}:other=${c.other.state844}:positionGate=${c.bike.field8a8}:rider13c=${c.other.rider.flag13c}:rider140=${c.other.rider.flag140}`;outcomes[key]=(outcomes[key]||0)+1;
 for(let j=0;j<263;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:c});}
 if(i%71===0||outcomes[key]===1)fixtures.push({input:c,outputBits:actual});
}
if(Object.keys(outcomes).length!==144)throw new Error('Incomplete state/flag coverage');
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,outcomes,scope:'Connected original 0x49d900 dynamic types 0/1, real paired impulse, transforms, proxy/grid updates and inactive audio. Bike/rider state selection, directional scale, alternate rider velocity, cached root transforms, position correction and grid lists. Visual effects and final crash event suppressed by state/secondary flags; callback gates and full main step excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
