import * as THREE from 'three';
let pending;
export function loadMcmParticleAssets(){return pending??=fetch(new URL('./assets/mcm-particles.bin',import.meta.url)).then(async r=>{if(!r.ok)throw Error('Original particles download failed');return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();}).catch(e=>{pending=null;throw e;});}
export function particleTexture(asset,name){
 const source=asset.textures[name];if(!source)throw Error('Missing original particle texture '+name);
 const pixels=Uint8Array.from(atob(source.rgba),c=>c.charCodeAt(0));
 const texture=new THREE.DataTexture(pixels,source.width,source.height);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}
