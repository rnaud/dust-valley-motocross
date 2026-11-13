import fs from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {applyMcmAnimationChild,seekMcmAnimation} from '../../src/physics/mcm/animation-seek.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const [exeArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw new Error('Usage: compare-animation-seek-oracle.mjs mcm.exe output-directory');
const exe = resolve(exeArg), output = resolve(outputArg), hash = x => createHash('sha256').update(x).digest('hex');
const exeHash = hash(fs.readFileSync(exe));
if (exeHash !== 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b') throw new Error('Unrecognized executable');
fs.mkdirSync(output, {recursive:false});
const source = join(dirname(fileURLToPath(import.meta.url)), 'animation-seek-oracle.c');
const compiler = process.env.MCM_CC || 'i686-w64-mingw32-gcc';
const wine = process.env.MCM_WINE || '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine';
const run = (command,args,options={}) => {const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr||r.status}`);};
run(compiler,['-O0','-Wall','-Wextra','-Werror','-Wl,--image-base,0x10000000','-Wl,--disable-dynamicbase',source,'-o',join(output,'oracle.exe')]);
const cases=[],f=Math.fround;
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=s=>Array.from({length:3},()=>f((random()-.5)*s));
const matrix=()=>[...vec(3),0,...vec(3),0,...vec(3),0,...vec(100),1];
for(let i=0;i<40000;i++)cases.push({nodes:Array.from({length:3},(_,k)=>({local:matrix(),world:matrix(),cacheValid:(i>>(k+2))%2})),position:vec(100),targetParent:1+i%2,bodyParent:(i>>1)%2,forward:vec(5),up:vec(5),componentIndex:(i>>5)%8,local:(i>>8)%2,positionEnabled:(i>>9)%2,frameCount:1+(i>>10)%8,fraction:[0,.25,.5,.75,1][i%5]});
const input=Buffer.alloc(4+cases.length*468);input.writeUInt32LE(cases.length);
for(let i=0;i<cases.length;i++){
 const c=cases[i],values=[...c.nodes.flatMap(n=>[...n.local,...n.world]),...c.nodes.map(n=>n.cacheValid),0,0,...c.position,c.targetParent,c.bodyParent,...c.forward,...c.up,c.componentIndex,c.local,c.positionEnabled,c.frameCount,c.fraction];
 values.forEach((v,j)=>input.writeFloatLE(v,4+i*468+j*4));
}
fs.writeFileSync(join(output,'cases.bin'),input);
const win=path=>'Z:'+path.replaceAll('/','\\'),log=fs.openSync(join(output,'wine.log'),'w');
try{run(wine,[win(join(output,'oracle.exe')),win(exe),win(join(output,'cases.bin')),win(join(output,'results.bin'))],{env:{...process.env,WINEDEBUG:'-all',MVK_CONFIG_LOG_LEVEL:'0'},stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
const results=fs.readFileSync(join(output,'results.bin'));if(results.length!==cases.length*476)throw new Error('Incomplete results');
let totalDifferences=0;const firstDifferences=[],fixtures=[];
for(let i=0;i<cases.length;i++) {
 const c=cases[i],nodes=c.nodes.map(n=>({...n,local:[...n.local],world:[...n.world]}));
 nodes[0].parent=nodes[c.targetParent];nodes[c.targetParent].firstChild=nodes[0];
 if(c.bodyParent){nodes[1].parent=nodes[2];nodes[1].nextSibling=nodes[2].firstChild;nodes[2].firstChild=nodes[1];}
 const record={componentIndex:c.componentIndex,local:c.local,forward:[...c.forward],up:[...c.up],position:[...c.position]};
 const second={...record,local:!record.local,forward:[...c.up],up:[...c.forward]};
 if(c.frameCount%2===0)record.next=second;
 const components=[];components[c.componentIndex]={node:nodes[0],positionEnabled:c.positionEnabled};
 const frames=Array.from({length:c.frameCount},(_,j)=>({index:j,boundsMin:c.position.map((v,k)=>f(v+j*(k+1))),boundsMax:c.position.map((v,k)=>f(v+j*(k+4))),firstChild:j%3?record:null}));
 frames.forEach((frame,j)=>frame.next=frames[j+1]);
 const animation={frameCount:c.frameCount,firstFrame:frames[0]},object={};
 seekMcmAnimation(object,animation,c.fraction,child=>applyMcmAnimationChild(nodes[1],components,child));
 const expected=[...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...record.forward,...record.up].map(floatBits),object.frame.index,+(object.record===animation),...[...object.boundsMin,...object.boundsMax].map(floatBits),...[...second.forward,...second.up].map(floatBits)],actual=Array.from({length:119},(_,j)=>results.readUInt32LE(i*476+j*4));
 for(let j=0;j<119;j++)if(actual[j]!==expected[j]){totalDifferences++;if(firstDifferences.length<10)firstDifferences.push({case:i,field:j,actual:actual[j],expected:expected[j],input:cases[i]});}
 if(i%71===0)fixtures.push({input:cases[i],outputBits:actual});
}
const report={schemaVersion:1,executableSha256:exeHash,oracleSourceSha256:hash(fs.readFileSync(source)),loaderSourceSha256:hash(fs.readFileSync(join(dirname(source),'oracle.c'))),casesSha256:hash(input),resultsSha256:hash(results),cases:cases.length,controlWord:0x027f,totalDifferences,firstDifferences,scope:'Original animation seek 0x430ab0 and real bike callback 0x44f8b0, both local/relative orientation branches and conditional position updates. Frame counts 1..8, fractions 0/.25/.5/.75/1, childless, single-child and ordered two-child frames, component lookup, parent graphs and cache combinations. Finite nondegenerate axes; longer child lists, rider proxy vtable and complete interaction integration remain excluded.'};
fs.writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify({...report,firstDifferences:firstDifferences.map(({input,...rest})=>rest)},null,2));if(totalDifferences)process.exitCode=1;
