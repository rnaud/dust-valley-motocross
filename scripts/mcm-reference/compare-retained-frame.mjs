import fs from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {evaluateRetainedFrame} from './retained-frame-case.mjs';
const [sourceArg,outputArg]=process.argv.slice(2);
if(!outputArg)throw new Error('Usage: compare-retained-frame.mjs native-next-return-corpus output-directory');
const source=resolve(sourceArg),output=resolve(outputArg);fs.mkdirSync(output,{recursive:true});
const hash=path=>{const h=createHash('sha256'),fd=fs.openSync(path,'r'),b=Buffer.alloc(1048576);try{for(let n;(n=fs.readSync(fd,b))>0;)h.update(b.subarray(0,n));}finally{fs.closeSync(fd);}return h.digest('hex');};
const evidence=JSON.parse(fs.readFileSync(join(source,'report-arm64.json')));
if(evidence.exeSha256!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b'||evidence.mismatchCount||evidence.exceptionCount)throw new Error('Invalid source evidence');
if(hash(join(source,'results.bin'))!==evidence.outputSha256||hash(join(source,'prefix.bin'))!==evidence.prefixSha256||hash(join(source,'cases.bin'))!==evidence.inputSha256)throw new Error('Source native hash mismatch');
const cases=JSON.parse(fs.readFileSync(join(source,'case-inputs.json'))),fd=fs.openSync(join(source,'results.bin'),'r'),pf=fs.openSync(join(source,'prefix.bin'),'r');
const native=Buffer.alloc(46925*4),prefix=Buffer.alloc(8277*4),mismatches=[],exceptions=[],statuses={},fixtures=[],seen=new Set();let mismatchCount=0,exceptionCount=0,substeps=0;
const words=(b,start,length)=>Array.from({length},(_,i)=>b.readUInt32LE((start+i)*4));
for(let i=0;i<cases.length;i++){
 fs.readSync(fd,native,0,native.length,i*native.length);fs.readSync(pf,prefix,0,prefix.length,i*prefix.length);
 let actual;try{actual=evaluateRetainedFrame(cases[i]);}catch(e){exceptionCount++;if(exceptions.length<10)exceptions.push({case:i,error:e.stack});continue;}
 const expectedFinishes=Array.from({length:native.readUInt32LE(14000*4)},(_,step)=>words(native,step===0?13502:14001+(step-1)*2168+1670,498));
 const expected={prefix:words(prefix,0,8277),priorTail:words(native,0,11097),output:words(native,35681,11244),finishes:expectedFinishes};
 const compare=(part,a,b)=>{if(a.length!==b.length)throw new Error(`${part} size`);for(let j=0;j<a.length;j++)if(a[j]!==b[j]){mismatchCount++;if(mismatches.length<20)mismatches.push({case:i,part,word:j,actual:a[j],expected:b[j]});}};
 compare('prefix',actual.prior.prefix,expected.prefix);compare('prior-tail',actual.prior.tail,expected.priorTail);compare('return',actual.output,expected.output);
 compare('finishes',actual.finishes.flat(),expectedFinishes.flat());
 const status=actual.frame.status;statuses[status]=(statuses[status]||0)+1;substeps+=actual.finishes.length;
 const key=`${status}:steps=${actual.finishes.length}:recovery=${actual.frame.recovery}:reset=${actual.frame.reset}:input=${actual.frame.controller}:state=${expected.output[147]}:gate=${cases[i].frameReturn.disabled}:${cases[i].frameReturn.state}:${cases[i].frameReturn.playerIsBike}`;
 if(!seen.has(key)||[134,2825,9956,12088,14101].includes(i)){seen.add(key);fixtures.push({caseIndex:i,key,input:cases[i],expected,status});}
}
fs.closeSync(fd);fs.closeSync(pf);
const report={scope:'Reusable production frame runner from retained first-frame return through every supported second-frame substep, post-loop filter, animation and actual return; every substep finish compared to original execution',cases:cases.length,substeps,statuses,mismatchCount,exceptionCount,mismatches,exceptions,exeSha256:evidence.exeSha256,inputSha256:evidence.inputSha256,outputSha256:evidence.outputSha256,prefixSha256:evidence.prefixSha256,architecture:process.arch,node:process.version,limitations:evidence.limitations};
fs.writeFileSync(join(output,`report-${process.arch}.json`),JSON.stringify(report,null,2)+'\n');if(process.arch==='arm64'&&!mismatchCount&&!exceptionCount)fs.writeFileSync(join(output,'fixtures.json'),JSON.stringify({source:report,fixtures})+'\n');console.log(JSON.stringify(report,null,2));if(mismatchCount||exceptionCount)process.exitCode=1;
