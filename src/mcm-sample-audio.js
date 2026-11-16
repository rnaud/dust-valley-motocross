// Browser transport for recovered PCM samples. This is an explicit device
// adapter, not a claim of DirectSound clock/resampling parity.
export class McmSampleAudio {
 constructor(context,destination){this.context=context;this.destination=destination;this.samples=new Map();this.paused=false;}
 add(handle,buffer,metadata){const old=this.samples.get(handle);if(old){this.detach(old);old.gain.disconnect();}const gain=this.context.createGain();gain.connect(this.destination);this.samples.set(handle,{buffer,metadata,gain,cursor:0,playing:false,loop:false,source:null,started:0});}
 position(handle){const s=this.samples.get(handle);if(!s)return 0;let position=s.cursor;if(s.playing&&!this.paused)position+=(this.context.currentTime-s.started)*s.metadata.byteRate;
  if(s.loop)position%=s.metadata.dataBytes;else if(position>=s.metadata.dataBytes){position=0;s.cursor=0;s.playing=false;}
  return Math.floor(position/s.metadata.blockAlign)*s.metadata.blockAlign;
 }
 playing(handle){const s=this.samples.get(handle);if(!s)return 0;this.position(handle);return +s.playing;}
 detach(s){if(s.source){s.source.onended=null;s.source.stop();s.source.disconnect();s.source=null;}}
 start(s){if(this.paused||!s.playing)return;const source=this.context.createBufferSource();source.buffer=s.buffer;source.loop=s.loop;source.connect(s.gain);s.source=source;s.started=this.context.currentTime;
  source.onended=()=>{if(s.source===source){s.playing=false;s.cursor=0;s.source=null;source.disconnect();}};
  source.start(0,s.cursor/s.metadata.byteRate);
 }
 play(handle,reserved,loop){const s=this.samples.get(handle);if(!s)return 1;if(this.playing(handle)&&s.loop===!!loop)return 1;const cursor=this.position(handle);this.detach(s);s.cursor=cursor;s.loop=!!loop;s.playing=true;this.start(s);return 1;}
 stop(handle,reset){const s=this.samples.get(handle);if(!s||!this.playing(handle))return 1;const cursor=this.position(handle);this.detach(s);s.cursor=reset?0:cursor;s.playing=false;return 1;}
 seek(handle,bytes){const s=this.samples.get(handle);if(!s)return 1;const cursor=Math.floor(bytes/s.metadata.blockAlign)*s.metadata.blockAlign;if(cursor>=s.metadata.dataBytes)return 0;this.detach(s);s.cursor=cursor;this.start(s);return 1;}
 volume(handle,centibels){const s=this.samples.get(handle);if(s)s.gain.gain.setValueAtTime(10**(Math.max(-10000,Math.min(0,centibels))/2000),this.context.currentTime);return 1;}
 setPaused(paused){if(this.paused===paused)return;if(paused){for(const [handle,s]of this.samples){s.cursor=this.position(handle);this.detach(s);}this.paused=true;}else{this.paused=false;for(const s of this.samples.values())this.start(s);}}
 reset(){for(const s of this.samples.values()){this.detach(s);s.playing=false;s.cursor=0;s.loop=false;s.gain.gain.setValueAtTime(1,this.context.currentTime);}}
 diagnostics(){return [...this.samples].filter(([h])=>this.playing(h)).map(([handle,s])=>({file:s.metadata.file,cursor:this.position(handle),loop:s.loop}));}
}
