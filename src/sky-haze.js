import {mix,normalize,positionLocal,smoothstep,texture,uniform,vec4} from 'three/tsl';
// Blend the visible sky into the fog colour at the horizon. Node fog is mixed
// in linear space before tone mapping, so the horizon blend is linear too and
// both pass through the same output transform. fogColor is the live fog Color.
export function matchSkyHorizon(material,fogColor){
 const sky=texture(material.map),horizon=uniform(fogColor);
 material.colorNode=vec4(mix(horizon,sky.rgb,smoothstep(0,.18,normalize(positionLocal).y)),1);
 material.needsUpdate=true;
}
