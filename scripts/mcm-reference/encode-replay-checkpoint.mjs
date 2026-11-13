import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {checkpointMemory,loadLiveVisuals,loadLiveEngine,loadLiveRider} from './live-checkpoint.mjs';
// Exact same-process addresses, in the capture tool's discovery order. This is
// a partial local snapshot; it is not a portable save or a world checkpoint.
export function encodeReplayCheckpoint(checkpoint){
 const m=checkpointMemory(checkpoint);
 loadLiveEngine(checkpoint);loadLiveRider(checkpoint);
 loadLiveVisuals(checkpoint,{extraRoots:[m.u32(m.u32(checkpoint.bikeAddress+0x8ec)+0x50)]});
 if(checkpoint.blocks.length>256||checkpoint.blocks[0].address!==checkpoint.bikeAddress||checkpoint.blocks[0].size!==0xcc8||checkpoint.blocks.some(b=>b.size>0xcc8))throw Error('Unsupported replay checkpoint layout');
 const header=Buffer.alloc(16);header.write('MCMCP01');header.writeUInt32LE(checkpoint.bikeAddress,8);header.writeUInt32LE(checkpoint.blocks.length,12);
 return Buffer.concat([header,...checkpoint.blocks.flatMap(b=>{const h=Buffer.alloc(8);h.writeUInt32LE(b.address);h.writeUInt32LE(b.size,4);return [h,Buffer.from(b.hex,'hex')];})]);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [,,input,output]=process.argv;if(!output)throw Error('Usage: encode-replay-checkpoint.mjs checkpoint.json output.bin');
 fs.writeFileSync(output,encodeReplayCheckpoint(JSON.parse(fs.readFileSync(input))),{flag:'wx'});
}
