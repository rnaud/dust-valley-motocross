import {CapturedBytes as Buffer} from '../../src/physics/mcm/captured-bytes.js';
import assert from '../../src/physics/mcm/captured-invariants.js';
import {createMcmTerrainDetailTables} from '../../src/physics/mcm/terrain-detail-tables.js';
// Initial immutable inputs only. Later observations certify stability; no
// observed node outputs are imported into a recovered graph by this loader.
export function loadTerrainResources(initial){
 const raw=initial.resources;assert.ok(raw,'Missing terrain resources');
 assert.ok(Number.isInteger(raw.sphereEnabled));
 for(const key of ['rowOffsets','vertexRows']){assert.equal(raw[key].length,17);for(const v of raw[key])assert.ok(Number.isInteger(v)&&v>=0);}
 const lookup=Buffer.from(raw.detailLookupHex,'hex'),metadata=Buffer.from(raw.vertexMetadataHex,'hex');
 assert.equal(lookup.length,65536);assert.equal(metadata.length,289*32);
 for(let i=0;i<289;i++){const x=metadata.readInt32LE(i*32),y=metadata.readInt32LE(i*32+4);assert.ok(x>=0&&x<=16&&y>=0&&y<=16,'Invalid terrain vertex coordinates');assert.equal(raw.vertexRows[y]+x,i,'Misaligned terrain vertex metadata');}
 const generated=createMcmTerrainDetailTables();assert.deepEqual(lookup,Buffer.from(generated.lookup),'Original terrain detail table differs from recovered initialization');
 const banks=new Map();for(const row of raw.banks){assert.ok(Number.isInteger(row.address)&&row.address>0);assert.ok(!banks.has(row.address),'Duplicate terrain bank');const bytes=Buffer.from(row.hex,'hex');assert.equal(bytes.length,0x1654,'Incomplete terrain bank');banks.set(row.address,bytes);}
 assert.ok(banks.size>0&&banks.size<=4096);
 for(const row of initial.nodeSnapshot.nodes){const node=Buffer.from(row.hex,'hex');assert.ok(banks.has(node.readUInt32LE(0x50)),'Missing terrain node bank');}
 return{sphereEnabled:raw.sphereEnabled,rowOffsets:raw.rowOffsets.slice(),vertexRows:raw.vertexRows.slice(),lookup:generated.lookup,inverse:generated.inverse,metadata,banks,
  assertObservation(row){assert.equal(row.resources,undefined,'Later terrain resources cannot replace initialization');assert.equal(row.resourcesUnchanged,true,'Terrain resource stability was not verified');},
 };
}
