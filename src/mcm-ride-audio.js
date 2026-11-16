import {McmSampleAudio} from './mcm-sample-audio.js';
import {stepMcmRidingSound} from './physics/mcm/riding-sound.js';
import {createMcmSoundControllerDevice} from './physics/mcm/sound-controller-device.js';
import {createMcmRandom} from './physics/mcm/random.js';
import {checkpointMemory} from '../scripts/mcm-reference/live-checkpoint.mjs';
const files=['decel.wav','idle.wav','bike.wav','skid.wav','land01.wav','launch.wav',...Array.from({length:6},(_,i)=>`wreck0${i+1}.wav`),...Array.from({length:6},(_,i)=>`fall0${i+1}.wav`),'oh_01.wav'];
const offsets=[0x68,0x6c,0x70,0x74,0x78,0x7c,0x80,0x84,0x88,0x8c,0x90,0x94,0x9c,0xa0,0xa4,0xa8,0xac,0xb0,0x60];
export class McmRideAudio {
 constructor(context,destination){this.analyser=context.createAnalyser();this.analyser.connect(destination);this.wave=new Float32Array(this.analyser.fftSize);this.bank=new McmSampleAudio(context,this.analyser);this.context=context;this.ready=false;this.error=null;this.owner=null;this.ticks=0;this.world={enabled:1,reactionsEnabled:1};}
 async load(){
  this.ready=false;this.owner=null;this.bank.reset();
  const base=`${import.meta.env.BASE_URL}mcm-audio/`,response=await fetch(base+'manifest.json');if(!response.ok)throw Error('Original audio manifest unavailable');const manifest=await response.json();
  this.metadata=new Map(manifest.assets.map(a=>[a.file,a]));
  const decoded=await Promise.all(files.map(async(file,i)=>{const metadata=this.metadata.get(file);if(!metadata){if(file==='skid.wav')return;throw Error(`Missing original sound ${file}`);}const response=await fetch(base+file);if(!response.ok)throw Error(`Original sound unavailable: ${file}`);const buffer=await this.context.decodeAudioData(await response.arrayBuffer());return [i+1,buffer,metadata];}));for(const sample of decoded)if(sample)this.bank.add(...sample);this.ready=true;
 }
 reset(state){
  this.bank.reset();this.owner=state;this.ticks=0;this.random=createMcmRandom(1);
  this.manager=new DataView(new ArrayBuffer(0x128));this.bike=new DataView(new ArrayBuffer(0xcc8));this.engine=new DataView(new ArrayBuffer(0x160));this.rider=new DataView(new ArrayBuffer(0x150));
  offsets.forEach((o,i)=>this.manager.setUint32(o,i+1,true));this.manager.setUint32(0x44,1,true);
  const checkpoint=state.physics.scene.input.checkpoint,memory=checkpointMemory(checkpoint);this.bike.setUint32(0x618,memory.u32(checkpoint.bikeAddress+0x618),true);
  let group=null;for(let n=5;n>=1;n--)group={handle:n,buffer:this.bank.samples.has(n)?n:null,next:group};
  const low={gearSeekEnabled:false,stop:this.bank.stop.bind(this.bank),play:this.bank.play.bind(this.bank),playing:this.bank.playing.bind(this.bank),seek:this.bank.seek.bind(this.bank),position:this.bank.position.bind(this.bank),volume:this.bank.volume.bind(this.bank),status:n=>({result:0,status:this.bank.playing(n)}),error:()=>{},throttle:()=>this.input.gas?1:0,skid:()=>this.input.brake?1:0,random:()=>this.random.draw()};
  this.device=createMcmSoundControllerDevice(low,this.world,new Map([[1,group]]));
 }
 step(state,input,dt,listener){
  if(!this.ready)return;if(this.owner!==state)this.reset(state);this.bank.setPaused(false);this.input=input;
  const runtime=state.physics.runtime,c=runtime.loaded.context,b=c.bike;
  for(const o of [0x614,0xb04,0x4bc,0x844,0x8b4,0x8c4])this.bike.setUint32(o,b[`field${o.toString(16)}`],true);
  this.bike.setFloat32(0x6f8,b.field6f8,true);this.bike.setFloat32(0x6a4,b.field6a4,true);b.position.forEach((v,i)=>this.bike.setFloat32(0x4f8+i*4,v,true));
  this.engine.setInt32(0x158,c.engine.gear,true);this.engine.setFloat32(0x15c,c.engine.rpmDemand,true);this.rider.setInt32(0x14c,runtime.external.context.rider.field14c,true);
  const p=state.physics.nativePoint(listener.x,listener.z);p.y+=listener.y/.3048;
  stepMcmRidingSound(this.manager,this.bike,this.engine,dt,this.device,{rider:this.rider,listener:[p.x,p.y,p.z],wreckBytes:files.slice(6,12).map(f=>this.metadata.get(f).dataBytes)});this.ticks++;
 }
 diagnostics(){this.analyser.getFloatTimeDomainData(this.wave);const rms=Math.sqrt(this.wave.reduce((sum,v)=>sum+v*v,0)/this.wave.length);return {rms,ready:this.ready,error:this.error,ticks:this.ticks,playing:this.bank.diagnostics(),missing:['skid.wav'],rngScope:'audio-only'};}
}
