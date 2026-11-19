import * as THREE from 'three';
import {dot,float,max,mix,mx_fractal_noise_float,normalize,positionLocal,pow,select,smoothstep,texture,uniform,vec3,vec4} from 'three/tsl';

// Per-map sky: mode 0 keeps the painted sky texture; mode 1 is a clear
// procedural desert sky (zenith → horizon gradient, sun glow, drifting fair-
// weather clouds). Shared by the visible sky and the environment-map sky.
export const skyUniforms={mode:uniform(0),zenith:uniform(new THREE.Color('#3d6db3')),horizon:uniform(new THREE.Color('#d6e1e8')),sunDir:uniform(new THREE.Vector3(0,1,0)),clouds:uniform(0),time:uniform(0)};

// Blend the visible sky into the fog colour at the horizon. Node fog is mixed
// in linear space before tone mapping, so the horizon blend is linear too and
// both pass through the same output transform. fogColor is the live fog Color.
export function matchSkyHorizon(material,fogColor){
 const U=skyUniforms,painted=texture(material.map).rgb,horizonFog=uniform(fogColor),dir=normalize(positionLocal),up=max(dir.y,0);
 const gradient=mix(U.horizon,U.zenith,pow(smoothstep(0,1,up),.4));
 const sunAmount=max(dot(dir,U.sunDir),0),glow=vec3(1,.86,.62).mul(pow(sunAmount,8).mul(.35).add(pow(sunAmount,90).mul(1.2))).add(vec3(1,.97,.9).mul(pow(sunAmount,1800).mul(14)));
 // Clouds: fractal noise projected on a flat layer, lit warm on the sun side.
 // Small fair-weather cumulus: a higher-frequency layer, sparse cover, bright tops.
 const layer=dir.xz.div(up.add(.1)).mul(5.5),noise=mx_fractal_noise_float(vec3(layer,U.time.mul(.006)),4,2.1,.5).mul(.5).add(.5);
 // Soft-edged puffs, thinning toward the horizon; bright sunlit tops, cool bases.
 const cover=smoothstep(float(.64).sub(U.clouds.mul(.1)),float(.8).sub(U.clouds.mul(.08)),noise).mul(smoothstep(.06,.3,up)).mul(select(U.clouds.greaterThan(0),1,0));
 const cloudColor=mix(vec3(.82,.87,.95),vec3(1.45,1.4,1.32),smoothstep(.7,.9,noise).mul(.75).add(pow(sunAmount,2).mul(.25)));
 const clear=mix(gradient.add(glow),cloudColor,cover.mul(.92));
 const skyColor=mix(painted,clear,U.mode);
 material.colorNode=vec4(mix(horizonFog,skyColor,smoothstep(0,mix(.18,.06,U.mode),dir.y)),1);
 material.needsUpdate=true;
}
