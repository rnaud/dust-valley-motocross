import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {notifyMcmCollisionSound,mcmCollisionSoundVolume} from '../../src/physics/mcm/collision-notification.js';
import {createMcmRandom} from '../../src/physics/mcm/random.js';
export function evaluateCollisionNotification(c){
 const random=createMcmRandom(c.seed),trace=[];let mask=c.playingMask;
 const device={isPlaying(i){const value=(mask>>>i)&1;trace.push(2,i,value);return value;},stop(i,reset){trace.push(3,i,reset);mask&=~(1<<i);},setPosition(i,value){trace.push(4,i,value>>>0);},setVolume(i,value){trace.push(5,i,value>>>0);},play(i,a,b,d){assert.deepEqual([a,b,d],[0,0,0]);trace.push(6,i,0);}};
 const state={selectedBike:c.selected?1:0,cameraPosition:c.camera,currentIndex:c.currentIndex,riderIndex:6,samples:c.lengths.map(length=>({length})),device,random:{draw(){const v=random.draw();trace.push(1,v,0);return v;}}};
 const spatial=mcmCollisionSoundVolume(c.position,c.camera,0x12345678);
 notifyMcmCollisionSound(state,{address:1,state844:c.crash,position:c.position},c.impulse,c.type);
 return {index:state.currentIndex,state:random.state,randomCalls:random.calls,trace,volume:spatial.volume,pan:spatial.pan};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [casesPath,resultsPath,executable,fixturePath,reportPath]=process.argv.slice(2),hash=b=>createHash('sha256').update(b).digest('hex');
 const cases=JSON.parse(fs.readFileSync(casesPath)),results=fs.readFileSync(resultsPath);assert.equal(results.length,cases.length*134*4);
 const executableSha256=hash(fs.readFileSync(executable));assert.equal(executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 const fixtures=cases.map((input,i)=>{const at=i*134*4,output={index:results.readUInt32LE(at),state:results.readUInt32LE(at+4),randomCalls:results.readUInt32LE(at+8),trace:Array.from({length:results.readUInt32LE(at+12)},(_,k)=>results.readUInt32LE(at+24+k*4)),volume:results.readInt32LE(at+16),pan:results.readInt32LE(at+20)};assert.deepEqual(evaluateCollisionNotification(input),output,`Original notification case ${i}`);return {input,output};});
 const source={executableSha256,oracleSha256:hash(fs.readFileSync(new URL('./collision-notification-oracle.c',import.meta.url))),casesSha256:hash(fs.readFileSync(casesPath)),resultsSha256:hash(results),controlWord:0x027f};
 fs.writeFileSync(fixturePath,JSON.stringify({source,fixtures}));fs.writeFileSync(reportPath,JSON.stringify({...source,cases:cases.length,differences:0,scope:'Original collision notification, spatial attenuation, sound selection, RNG and playback call arguments. Device playback statuses are supplied; live audio allocation capture remains required.'},null,2)+'\n');console.log({cases:cases.length,differences:0});
}
