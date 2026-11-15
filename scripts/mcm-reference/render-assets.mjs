import {decompressMcmBlock} from './terrain-data.mjs';
export function readMcmResources(bytes){
 if(bytes.subarray(0,4).toString('hex')!=='52455300')throw Error('Expected RES archive');const count=bytes.readUInt32LE(4),result=new Map();
 if(count>10000||8+count*40>bytes.length)throw Error('Invalid resource directory');
 for(let i=0;i<count;i++){const at=8+i*40,name=bytes.subarray(at,at+32).toString().split('\0')[0].toLowerCase(),offset=bytes.readUInt32LE(at+32),size=bytes.readUInt32LE(at+36);if(offset<8+count*40||offset+size>bytes.length||result.has(name))throw Error('Invalid resource entry');result.set(name,bytes.subarray(offset,offset+size));}return result;
}
export function readMcmTexture(bytes,palette){
 const format=bytes.readUInt32LE(0),width=bytes.readUInt32LE(8),height=bytes.readUInt32LE(12),name=bytes.subarray(16,48).toString().split('\0')[0].toLowerCase();
 if(format!==6||width<1||height<1||width*height>16777216||palette.length!==808)throw Error('Unsupported indexed texture');
 const indices=decompressMcmBlock(bytes.subarray(48),width*height),pixels=Buffer.alloc(width*height*4);
 for(let i=0;i<width*height;i++){palette.copy(pixels,i*4,40+indices[i]*3,43+indices[i]*3);pixels[i*4+3]=indices[i]===255&&pixels[i*4]===255&&pixels[i*4+1]===0&&pixels[i*4+2]===255?0:255;}
 return {width,height,palette:name,rgba:pixels.toString('base64')};
}
export function readMcmSlt(text){
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),objects=[],materials=[];let hierarchy=false;
 for(let i=0;i<lines.length;i++){
  const line=lines[i];if(line==='[Object Hierarchy]'){hierarchy=true;continue;}if(line.startsWith('['))hierarchy=false;
  if(hierarchy){if(line==='end')continue;const [name,parent,...numbers]=line.split(','),matrix=numbers.map(Number);if(matrix.length!==12||matrix.some(v=>!Number.isFinite(v)))throw Error('Invalid SLT hierarchy');objects.push({name,parent:parent==='NONE'?null:parent,matrix,surfaces:[]});}
  const material=line.match(/^\[Materials - (\d+)\]$/);if(material){const data={};while(lines[++i]!=='end'){const [key,value]=lines[i].split('=');data[key]=value;}materials[Number(material[1])]=data;}
  const surface=line.match(/^\[Object - (.+) -LOD 0 - Surface (\d+)\]$/);if(surface){const data={};while(lines[++i]!=='end'){const [key,value]=lines[i].split('=');data[key]=Number(value);}const object=objects.find(o=>o.name===surface[1]);if(!object)throw Error('Missing surface object');const vertices=[],triangles=[];
   for(let j=0;j<data.NumberOfVertices;j++){const fields=lines[++i].split(','),weld=fields.at(-1)==='W';if(weld)fields.pop();const v=fields.map(Number);if(v.length!==11||v.some(x=>!Number.isFinite(x)))throw Error('Invalid SLT vertex '+surface[1]+' '+j+' '+lines[i]);vertices.push([...v,weld?1:0]);}
   for(let j=0;j<data.NumberOfFaces;j++){const [n,...v]=lines[++i].split(',').map(Number);if(n!==v.length||n<3||v.some(x=>!Number.isInteger(x)||x<0||x>=vertices.length))throw Error('Invalid SLT face');for(let k=1;k<n-1;k++)triangles.push(v[0],v[k],v[k+1]);}
   object.surfaces.push({material:data.Material,vertices,triangles});
  }
 }
 if(!objects.length||!materials.length)throw Error('Empty SLT model');for(const o of objects)if(o.parent&&!objects.some(p=>p.name===o.parent))throw Error('Missing SLT parent');return {materials,objects};
}
