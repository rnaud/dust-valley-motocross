import fs from 'node:fs';import {createHash} from 'node:crypto';import {brotliCompressSync,constants} from 'node:zlib';
const [executable,...logs]=process.argv.slice(2);
if(logs.length!==3)throw Error('Usage: archive-crt-create.mjs original.exe create.jsonl raw-heap.jsonl coupled.jsonl');
const sha=b=>createHash('sha256').update(b).digest('hex'),executableSha256=sha(fs.readFileSync(executable));
if(executableSha256!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw Error('Wrong original executable');
const ordinary=s=>({freeList:s.freeList,regions:s.regions.map(r=>({address:r.address,blocks:r.blocks.map(b=>({header:b.header,words:b.words}))}))});
for(const [i,name]of ['crt-small-create','ordinary-raw-heap','crt-wine-create'].entries()){
 const source=fs.readFileSync(logs[i]),data=source.toString().trim().split('\n').map(JSON.parse);
 if(i===1)for(const r of data)for(const s of r.steps)s.after=ordinary(s.after);
 if(i===2)for(const r of data)for(const s of r.steps)s.after.wine=ordinary(s.after.wine);
 const provenance={executableSha256,sourceSha256:sha(source),dataSha256:sha(JSON.stringify(data)),scope:['Original CRT region creation and failure cleanup with explicit memory service results.','Raw underlying Wine heap requests, including 0x814-byte CRT region bookkeeping.','Original CRT region creation coupled to actual Wine allocation; metadata pointers are computed by replay. OS reservation addresses remain explicit service results.'][i]};
 fs.writeFileSync(new URL(`../../tests/fixtures/mcm/${name}-wine11.json.br`,import.meta.url),brotliCompressSync(Buffer.from(JSON.stringify({provenance,data})),{params:{[constants.BROTLI_PARAM_QUALITY]:6}}));
}
