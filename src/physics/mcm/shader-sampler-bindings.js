import {mcmShaderSamplerMap} from './shader-sampler-map.js';
// Pinned wined3d ec5e0, with logging disabled. Context capability fields stay
// live across callbacks; sampler range, map pointer, prefix and program are
// retained at the same points as the original. GL and buffer helpers are
// explicit boundaries, including the native formatter's stack side effects.
export function bindMcmShaderSamplers(context,callbacks) {
 const gl=context.glInfo;
 if(gl.explicitBindings && (gl.version>>>0)>0x10031)return;
 const type=context.shader?.type;
 const prefix=context.shader==null?'ps':(['ps','vs','gs','hs','ds','cs'][type>>>0]??'unknown');
 const program=context.program>>>0;
 const range=callbacks.getSamplerMap?callbacks.getSamplerMap(context.shader):mcmShaderSamplerMap(context);
 const first=range.first>>>0,count=range.count>>>0,map=range.map;
 const buffer=callbacks.acquire();
 for(let i=0;i<count;i++) {
  callbacks.format(buffer,prefix,i);
  const location=callbacks.query(program,buffer)>>>0;
  if(location===0xffffffff)continue;
  const index=(first+i)>>>0;
  const unit=map==null?index:map[index]>>>0;
  if(unit!==0xffffffff && unit<(gl.unitLimit>>>0))callbacks.bind(location,unit);
 }
 callbacks.release(buffer);
}
