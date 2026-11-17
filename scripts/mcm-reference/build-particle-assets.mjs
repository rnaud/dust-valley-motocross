import fs from 'node:fs';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readMcmResources} from './render-assets.mjs';
const root=process.argv[2];if(!root)throw Error('Usage: build-particle-assets.mjs ORIGINAL_GAME');
const exe=fs.readFileSync(path.join(root,'mcm.exe')),archive=fs.readFileSync(path.join(root,'maps/particle.tex'));
const pe=exe.readUInt32LE(60),sections=pe+24+exe.readUInt16LE(pe+20);
const at=address=>{const rva=address-0x400000;for(let i=0;i<exe.readUInt16LE(pe+6);i++){const p=sections+i*40,va=exe.readUInt32LE(p+12),size=exe.readUInt32LE(p+16);if(rva>=va&&rva<va+size)return exe.readUInt32LE(p+20)+rva-va;}throw Error('Unmapped original address');};
// 43ac30 initializes 0..17 and 29..60; unused 18..28 remain zero in BSS.
const uv=Array(61*8).fill(0);
const rect=(i,u,v,size)=>uv.splice(i*8,8,u,v,u+size,v,u+size,v+size,u,v+size);
const f=a=>exe.readFloatLE(at(a)),quarter=f(0x4d7118),eighth=f(0x4d7180),sixteenth=f(0x4d7184),half=f(0x4d7124),threeQuarters=f(0x4d712c);
for(let i=0;i<14;i++)rect(i,(i%4)*quarter,Math.floor(i/4)*quarter,quarter);
for(let i=14;i<18;i++)rect(i,quarter+((i-14)%2)*eighth,threeQuarters+Math.floor((i-14)/2)*eighth,eighth);
for(let i=29;i<45;i++)rect(i,half+((i-29)%4)*sixteenth,threeQuarters+Math.floor((i-29)/4)*sixteenth,sixteenth);
for(let i=45;i<61;i++)rect(i,threeQuarters+((i-45)%4)*sixteenth,threeQuarters+Math.floor((i-45)/4)*sixteenth,sixteenth);
if(uv.some(x=>!Number.isFinite(x)||x<0||x>1))throw Error('Invalid original particle UV');
const textures={};for(const [name,b]of readMcmResources(archive)){
 const width=b.readUInt32LE(8),height=b.readUInt32LE(12);if(b.readUInt32LE(0)!==14||b.length!==48+width*height*2)throw Error('Unsupported particle texture');
 // Original format 14: little-endian A4R4G4B4, retain all four-bit channels.
 const rgba=Buffer.alloc(width*height*4);for(let i=0;i<width*height;i++){const v=b.readUInt16LE(48+i*2);rgba.set([(v>>>8&15)*17,(v>>>4&15)*17,(v&15)*17,(v>>>12)*17],i*4);}
 textures[name]={width,height,rgba:rgba.toString('base64')};
}
// Immutable original spray variation tables for single-bike scene initialization.
const world=JSON.parse(gunzipSync(fs.readFileSync('src/assets/mcm-world-scene.bin'))),child=JSON.parse(world.files['world-child-0.json']);
const sprayHex=child.sprayHex;if(!sprayHex||sprayHex.length!==0x614*2)throw Error('Missing original spray tables');
const output={version:1,textures,uv,sprayTail:sprayHex.slice(0x84*2),sources:{archiveSha256:createHash('sha256').update(archive).digest('hex'),executableSha256:createHash('sha256').update(exe).digest('hex')}};
fs.writeFileSync('src/assets/mcm-particles.bin',gzipSync(JSON.stringify(output),{level:9}));console.log({textures:Object.keys(textures).length,bytes:fs.statSync('src/assets/mcm-particles.bin').size});
