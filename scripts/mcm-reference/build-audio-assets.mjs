import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root=process.argv[2],destination=process.argv[3]||'public/mcm-audio';if(!root)throw Error('Usage: build-audio-assets.mjs ORIGINAL_GAME [OUTPUT]');
const hash=b=>createHash('sha256').update(b).digest('hex'),exe=fs.readFileSync(path.join(root,'mcm.exe')),executableSha256=hash(exe);
assert.equal(executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
const assets=[];fs.mkdirSync(destination,{recursive:true});
for(const filename of fs.readdirSync(path.join(root,'audio')).filter(n=>/\.wav$/i.test(n)).sort()){
 const bytes=fs.readFileSync(path.join(root,'audio',filename));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
 let format,dataBytes=0;
 for(let offset=12;offset+8<=bytes.length;){const size=bytes.readUInt32LE(offset+4),start=offset+8;assert.ok(start+size<=bytes.length,'Truncated WAV chunk');
  if(bytes.toString('ascii',offset,offset+4)==='fmt '){assert.ok(size>=16);format={encoding:bytes.readUInt16LE(start),channels:bytes.readUInt16LE(start+2),sampleRate:bytes.readUInt32LE(start+4),byteRate:bytes.readUInt32LE(start+8),blockAlign:bytes.readUInt16LE(start+12),bitsPerSample:bytes.readUInt16LE(start+14)};}
  if(bytes.toString('ascii',offset,offset+4)==='data')dataBytes+=size;offset=start+size+(size&1);
 }
 assert.equal(format?.encoding,1,'Original PCM audio required');assert.ok(dataBytes>0&&dataBytes%format.blockAlign===0);
 const file=filename.toLowerCase();assert.ok(!assets.some(a=>a.file===file),'Duplicate audio name');fs.writeFileSync(path.join(destination,file),bytes);
 assets.push({file,source:`audio/${filename}`,sha256:hash(bytes),bytes:bytes.length,...format,dataBytes,duration:dataBytes/format.byteRate});
}
const references=[...exe.toString('latin1').matchAll(/[\x20-\x7e]{4,}/g)].map(m=>m[0]).filter(s=>/\.wav$/i.test(s));
const missingLiteralReferences=references.filter(s=>!s.includes('%')&&!s.includes('\\')&&!assets.some(a=>a.file===s.toLowerCase())).filter(s=>s!=='.wav');
fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify({version:1,executableSha256,scope:'Byte-identical original recordings; playback selection, pitch, volume and loop rules require separate recovery.',assets,references,missingLiteralReferences},null,2)+'\n');
console.log({assets:assets.length,bytes:assets.reduce((n,a)=>n+a.bytes,0),missingLiteralReferences});
