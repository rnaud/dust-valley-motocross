import {dot,float,fract,mx_noise_float,select,smoothstep,vec2,vec3} from 'three/tsl';

// The wind-ripple pattern, shared by the fine GPU field (as the seed it
// starts nodes from, before the ripple dynamics take over) and the coarse
// ground beyond the fine window (as shading), so the two meet seamlessly.
// Asymmetric profile (long stoss, short lee), crests warped at several
// scales, amplitude patches and crest defects so the train is not a
// perfect corrugation. Returns height in metres (mean zero).
export const RIPPLE_WAVELENGTH=1.25;
export function rippleHeight(pos,wind,amplitude){
 const across=dot(pos,vec2(wind.y,wind.x.negate())),along=dot(pos,wind);
 const warp=mx_noise_float(vec3(pos.mul(.018),0)).mul(7).add(mx_noise_float(vec3(pos.mul(.07),7)).mul(1.8))
  // Defects: short-scale phase jumps across the crests make forks and breaks.
  .add(mx_noise_float(vec3(across.mul(.5),along.mul(.06),3)).mul(.7));
 const phase=fract(along.div(RIPPLE_WAVELENGTH).add(warp));
 const profile=select(phase.lessThan(.78),smoothstep(0,.78,phase),float(1).sub(smoothstep(.78,1,phase))).sub(.5);
 // Patches of stronger and weaker ripples.
 const strength=smoothstep(-.35,.45,mx_noise_float(vec3(pos.mul(.022),5))).mul(.65).add(.35);
 return profile.mul(amplitude.mul(2)).mul(strength);
}
