import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {brotliCompressSync} from 'node:zlib';
const [executable,pageLog,heapCapture,regionLog]=process.argv.slice(2);
if(!heapCapture)throw Error('Usage: archive-crt-small-heap.mjs original.exe page-results.jsonl heap-capture.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const executableSha256=sha(fs.readFileSync(executable));
if(executableSha256!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw Error('Wrong original executable');
for(const [name,path,data,scope] of [
 ['crt-small-page',pageLog,fs.readFileSync(pageLog,'utf8').trim().split('\n').map(JSON.parse),'Original 0x4c5850 page allocation and 0x4c5580 page free; region decommit intentionally isolated.'],
 ...(regionLog?[['crt-small-regions',regionLog,fs.readFileSync(regionLog,'utf8').trim().split('\n').map(JSON.parse),'Original CRT region selection, page commit/decommit, release and failure paths; virtual-memory results are explicit OS service inputs.']]:[]),
 ['crt-small-heap',heapCapture,JSON.parse(fs.readFileSync(heapCapture)).crtSmallHeap,'Live CRT metadata captured at one debugger stop; not an atomic bike-world initial state.'],
]){
 const provenance={executableSha256,sourceSha256:sha(fs.readFileSync(path)),dataSha256:sha(JSON.stringify(data)),scope};
 fs.writeFileSync(new URL(`../../tests/fixtures/mcm/${name}-wine11.json.br`,import.meta.url),brotliCompressSync(Buffer.from(JSON.stringify({provenance,data}))));
}
