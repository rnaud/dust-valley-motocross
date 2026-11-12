// Small synthesized sound rig: engine load, wind, roost and landing impacts.
// Everything is generated in the browser; the first user gesture owns the context.
function noiseBuffer(ctx,seconds=2){
 const length=Math.floor(ctx.sampleRate*seconds),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
 return buffer;
}

export class RideAudio {
 constructor(){
  this.ctx=null;this.master=null;this.enabled=false;this.ready=false;this.lastGear=-1;this.noise=null;
 }
 init(){
  if(this.ctx)return;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);
  this.noise=noiseBuffer(this.ctx);
  this.engineFilter=this.ctx.createBiquadFilter();this.engineFilter.type='lowpass';this.engineFilter.frequency.value=600;this.engineFilter.Q.value=.8;
  this.engineGain=this.ctx.createGain();this.engineGain.gain.value=0;
  this.engineOsc1=this.ctx.createOscillator();this.engineOsc1.type='sawtooth';this.engineOsc1.frequency.value=50;
  this.engineOsc2=this.ctx.createOscillator();this.engineOsc2.type='square';this.engineOsc2.frequency.value=25;
  this.engineOsc1.connect(this.engineFilter);this.engineOsc2.connect(this.engineFilter);this.engineFilter.connect(this.engineGain);this.engineGain.connect(this.master);
  this.engineOsc1.start();this.engineOsc2.start();
  const wind=this.ctx.createBufferSource();wind.buffer=this.noise;wind.loop=true;
  this.windFilter=this.ctx.createBiquadFilter();this.windFilter.type='bandpass';this.windFilter.frequency.value=700;this.windFilter.Q.value=.55;
  this.windGain=this.ctx.createGain();this.windGain.gain.value=0;
  wind.connect(this.windFilter);this.windFilter.connect(this.windGain);this.windGain.connect(this.master);wind.start();
  this.ready=true;
 }
 resume(){if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume();}
 setEnabled(on){this.enabled=on;if(this.master)this.master.gain.setTargetAtTime(on?.85:0,this.ctx.currentTime,.04);}
 update(state,input,active=true){
  if(!this.ready)return;
  const now=this.ctx.currentTime,speed=state.speed||0,throttle=active?(state.engine?.load??(input.gas?1:0)):0;
  const rpm=Math.max(900,state.rpm||1200),gear=state.gear||1;
  const frequency=38+(rpm/10000)*118+(state.air?14:0)+throttle*7;
  this.engineOsc1.frequency.setTargetAtTime(frequency,now,.05);
  this.engineOsc2.frequency.setTargetAtTime(frequency*.5,now,.05);
  this.engineFilter.frequency.setTargetAtTime(220+throttle*1100+(rpm/10000)*700,now,.08);
  // Follow the same five-speed shift interruption that cuts rear-wheel torque.
  if(gear!==this.lastGear||state.engine?.shiftRemaining>0){this.engineGain.gain.setTargetAtTime(.004,now,.015);this.lastGear=gear;}
  else this.engineGain.gain.setTargetAtTime(active?.01+throttle*.03+(state.air?.008:0):0,now,.09);
  this.windGain.gain.setTargetAtTime(active?Math.min(.075,(speed/35)**2*.06):0,now,.2);
 }
 beep(frequency=620,duration=.09,volume=.045,type='square'){
  if(!this.ready)return;
  const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.value=frequency;
  gain.gain.setValueAtTime(0,this.ctx.currentTime);gain.gain.linearRampToValueAtTime(volume,this.ctx.currentTime+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+duration);
  osc.connect(gain);gain.connect(this.master);osc.start();osc.stop(this.ctx.currentTime+duration+.02);
 }
 land(power=1){
  if(!this.ready)return;
  const now=this.ctx.currentTime;
  const source=this.ctx.createBufferSource();source.buffer=this.noise;
  const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(900,now);filter.frequency.exponentialRampToValueAtTime(180,now+.3);
  const gain=this.ctx.createGain();gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(Math.min(.22,.08+power*.12),now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.34);
  source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start(now);source.stop(now+.36);
  const thump=this.ctx.createOscillator(),thumpGain=this.ctx.createGain();thump.type='sine';thump.frequency.setValueAtTime(82,now);thump.frequency.exponentialRampToValueAtTime(42,now+.22);
  thumpGain.gain.setValueAtTime(Math.min(.16,.06+power*.09),now);thumpGain.gain.exponentialRampToValueAtTime(.0001,now+.24);
  thump.connect(thumpGain);thumpGain.connect(this.master);thump.start(now);thump.stop(now+.26);
 }
}
