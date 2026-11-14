const f=Math.fround,add=(a,b)=>f(a+b),sub=(a,b)=>f(a-b),mul=(a,b)=>f(a*b);
function normalize(v){const length=f(Math.sqrt(add(add(mul(v[0],v[0]),mul(v[1],v[1])),mul(v[2],v[2]))));if(length===0)return [1,0,0];const reciprocal=f(1/length);return v.map(x=>mul(x,reciprocal));}
function quaternion(a,b){return [sub(mul(a[0],b[0]),add(add(mul(a[1],b[1]),mul(a[2],b[2])),mul(a[3],b[3]))),add(add(mul(a[1],b[0]),mul(a[0],b[1])),sub(mul(a[2],b[3]),mul(a[3],b[2]))),add(add(mul(a[2],b[0]),mul(a[0],b[2])),sub(mul(a[3],b[1]),mul(a[1],b[3]))),add(add(mul(a[3],b[0]),mul(a[0],b[3])),sub(mul(a[1],b[2]),mul(a[2],b[1])))];}

// Pinned Wine d3drm.dll RVA 0x1fd0. This differs from the game's x87
// axis-angle helper: normalize the caller's axis in place, compose two
// float32 quaternion products, then normalize the rotated vector.
export function rotateMcmRuntimeVector(vector,axis,angle){
 const normalized=normalize(Array.from(axis,Math.fround));
 for(let i=0;i<3;i++)axis[i]=normalized[i];
 const half=mul(f(angle),.5),sin=f(Math.sin(half)),cos=f(Math.cos(half));
 const q=[cos,...normalized.map(v=>mul(v,sin))];
 return Float32Array.from(normalize(quaternion(quaternion(q,[0,...Array.from(vector,Math.fround)]),[cos,...q.slice(1).map(v=>-v)]).slice(1)));
}
