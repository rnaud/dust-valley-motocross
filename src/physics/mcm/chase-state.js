const floats=w=>new Float32Array(Uint32Array.from(w).buffer);

// Decode the single atomic initial camera. Later frames retain this state.
export function createMcmChaseState(r){
 const v=floats(r.inputs);
 return {controller:{settings:v.slice(50,54),eyeResetFlag:r.inputs[28],restoreFlag:r.inputs[73],previousMode:r.inputs[75],target:floats(r.result.slice(0,3)),camera:{height:r.alternate?.height,zoom:v[49],pitch:v[23],radius:v[24],yaw:v[26],orbitAngle:v[27],backup:v.slice(33,36)},axis:v.slice(20,23),filters:Array.from({length:6},(_,i)=>floats(r.filters.slice(i*4,i*4+4)))},renderCamera:{values:Array.from(floats(r.cameraPose.slice(0,10))),upValid:r.cameraPose[10],forwardValid:r.cameraPose[11],refreshCounter:r.cameraPose[12],retainedMode:r.inputs[88],fov:v[90],refreshByte:r.inputs[92],skipUpdate:r.inputs[91],near:v[98],far:v[99],aspect:v[100],width:r.inputs[101]},nodes:[0,1].map(i=>({flag12c:r.nodeVisibility[i*9],fields240:floats(r.nodeVisibility.slice(i*9+1,i*9+9))})),fovFilter:v.slice(94,98),matrices:floats(r.matrices)};
}

// Map live source/device/context words to the recovered camera routines.
// This reads no expected pose, filters, matrices or later controller state.
export function createMcmChaseInput(r,terrain,state){
 const v=floats(r.inputs);
 const name=new Uint8Array(16),view=new DataView(name.buffer);
 r.inputs.slice(79,83).forEach((word,i)=>view.setUint32(i*4,word,true));
 let sceneName='';for(const byte of name){const code=byte&127;if(!code)break;sceneName+=String.fromCharCode(code);}
 const input={initialized:r.inputs[74],source:{direction:v.slice(54,57),velocity:v.slice(36,39),bike6a4:v[40],bike620:r.inputs[57]},base:{position:v.slice(58,61),velocity:v.slice(36,39),usePrevious:r.inputs[61]},
    controls:{mode:r.inputs[11],active:r.inputs[62],keys:r.inputs[64],joystick:r.inputs[65],count:r.inputs[66]|0,pov:r.inputs[67],button2:r.inputs[68],button3:r.inputs[69],modifierA:r.inputs[70],modifierB:r.inputs[71],multiplierField:v[63],usePrevious:r.inputs[61],freeCamera:r.inputs[72]},
    heading:{mode:r.inputs[11],actorType:r.inputs[12],distance:v[10],bank:v[17],lean:v[18],speedBits:r.inputs[29],crashed:r.inputs[32],velocity:v.slice(36,39),denominator5ec:v[39],denominator6a4:v[40],bike6b0:v[42],bikeBfc:r.inputs[43],manager314:r.inputs[44],bike8b4:r.inputs[45],rider144:r.inputs[46],rider170:r.inputs[47],rider140:r.inputs[48]},
    clearance:{terrain,worldMode:r.inputs[76],worldEnabled:r.inputs[77],worldScale:v[78],sceneName:sceneName},
    finalize:{active:r.inputs[62],bike4e8:v[86],bike4d8:v[87],ownerCounter:r.inputs[89]}};
 if(r.alternate)input.heading.alternate={...r.alternate,height:r.alternate.screenHeight,matrix:state.matrices.slice(32,48),reference:[0,0,1]};
 return input;
}

// Bit-preserving output projection for browser/native comparisons.
export function projectMcmChaseState(state,result){
 const bits=values=>Array.from(new Uint32Array(Float32Array.from(values).buffer));
 const c=state.controller,r=state.renderCamera;
 return [
  ...bits([c.camera.pitch,c.camera.radius,c.camera.yaw,c.camera.orbitAngle]),c.eyeResetFlag,
  ...bits(c.camera.backup),...bits([c.camera.zoom]),...bits(c.settings),
  ...c.filters.flatMap(f=>bits(f)),...bits(c.axis),...bits(c.target),...bits(result.clearance.eye),
  c.restoreFlag,c.previousMode,...bits(r.values),r.upValid,r.forwardValid,r.refreshCounter,
  ...state.nodes.flatMap(n=>[n.flag12c,...bits(n.fields240)]),...bits(state.fovFilter),
  ...bits([r.fov]),r.refreshByte,...bits(state.matrices),...bits([c.camera.height]),
 ];
}
