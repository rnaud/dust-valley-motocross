import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {stepMcmChaseControls} from '../../src/physics/mcm/chase-controls.js';
export function decodeChaseControlCase(a){
 const u=i=>a.readUInt32LE(i*4),f=i=>a.readFloatLE(i*4);
 return {state:{radius:f(3),pitch:f(4),yaw:f(5),reset:u(2)},input:{mode:u(0),active:u(1),delta:f(7),keys:u(8),joystick:u(9),count:a.readInt32LE(40),pov:u(11),button2:u(12),button3:u(13),modifierA:u(14),modifierB:u(15),multiplierField:f(6),usePrevious:0,freeCamera:0},steps:u(16)};
}
export function chaseControlOutput(state,result){
 const out=Buffer.alloc(24);[state.radius,state.pitch,state.yaw].forEach((v,i)=>out.writeFloatLE(v,i*4));out.writeUInt32LE(state.reset,12);out.writeUInt32LE(result.motionGate,16);out.writeFloatLE(result.multiplier,20);return out;
}
export function compareChaseControls(input,output){
 if(!input.length||input.length%68)throw Error('Incomplete control input');let at=0,steps=0,differences=0;const examples=[];
 for(let o=0;o<input.length;o+=68){const c=decodeChaseControlCase(input.subarray(o,o+68));if(c.steps<1||c.steps>20)throw Error('Invalid steps');
  for(let j=0;j<c.steps;j++){
   if(at+24>output.length)throw Error('Incomplete control output');
   const actual=chaseControlOutput(c.state,stepMcmChaseControls(c.state,c.input));
   for(let i=0;i<6;i++){const native=output.readUInt32LE(at+i*4),value=actual.readUInt32LE(i*4);if(native!==value){differences++;if(examples.length<12)examples.push({case:o/68,step:j,word:i,native,actual:value});}}
   at+=24;steps++;
  }
 }
 if(at!==output.length)throw Error('Incomplete control output');return {cases:input.length/68,steps,words:at/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareChaseControls(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
