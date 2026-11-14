// Pinned Wine 11 wined3d RVA 0xc2fe0, reached from stateblock application
// through RVA 0x7f5a0. SSE rounds each multiply and add to binary32. This is
// deliberately separate from the original game's x87 world-matrix composer.
// Inputs are the two 16-float arrays at state+0x2c94 and state+0x6c14.
// Not yet wired into retained physics: render order and state must be recovered.
export function multiplyWineRenderMatrix(left, right) {
 if(left.length!==16||right.length!==16)throw new RangeError('Expected two 16-float matrices');
 const f=Math.fround,result=new Float32Array(16);
 for(let row=0;row<4;row++)for(let column=0;column<4;column++){
  const i=row*4;
  const p0=f(f(right[i])*f(left[column]));
  const p1=f(f(right[i+1])*f(left[4+column]));
  const p2=f(f(right[i+2])*f(left[8+column]));
  const p3=f(f(right[i+3])*f(left[12+column]));
  result[i+column]=f(f(p2+f(p0+p1))+p3);
 }
 return result;
}
