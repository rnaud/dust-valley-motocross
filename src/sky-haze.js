// Blend the visible sky into the same output color used by Three's fog chunk.
// Fog is blended after output encoding; encode our linear Color uniform too.
// The local sphere direction stays stable as the sky follows the camera.
export function matchSkyHorizon(material,fogColor){
 material.onBeforeCompile=shader=>{
  shader.uniforms.horizonFog={value:fogColor};
  shader.vertexShader='varying float skyElevation;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nskyElevation=normalize(position).y;');
  shader.fragmentShader='varying float skyElevation;\nuniform vec3 horizonFog;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\ngl_FragColor.rgb=mix(linearToOutputTexel(vec4(horizonFog,1.0)).rgb,gl_FragColor.rgb,smoothstep(0.0,0.18,skyElevation));');
 };
 material.customProgramCacheKey=()=> 'sky-horizon-fog-v2';
}
