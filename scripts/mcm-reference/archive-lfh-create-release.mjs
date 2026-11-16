import fs from 'node:fs';import {createHash} from 'node:crypto';import {brotliCompressSync,constants} from 'node:zlib';
import {createWineLfhRouting} from './wine-lfh-routing.mjs';
const [path]=process.argv.slice(2);if(!path)throw Error('Usage: archive-lfh-create-release.mjs native-results.jsonl');
const source=fs.readFileSync(path),data=source.toString().trim().split('\n').map(JSON.parse);
for(const row of data)for(const step of row.steps){const state=step.after;step.after={ordinary:{freeList:state.freeList,regions:state.regions.map(r=>({address:r.address,blocks:r.blocks.map(b=>({header:b.header,words:b.words}))}))},lfh:createWineLfhRouting(state).snapshot()};}
const sha=b=>createHash('sha256').update(b).digest('hex');
const provenance={runtime:'wine-11.0-x86',sourceSha256:sha(source),dataSha256:sha(JSON.stringify(data)),scope:'Native Wine heaps using the same allocator as the original game. Retained ordinary placement supplies new LFH groups; no later group address is an input.'};
fs.writeFileSync(new URL('../../tests/fixtures/mcm/lfh-create-release-wine11.json.br',import.meta.url),brotliCompressSync(Buffer.from(JSON.stringify({provenance,data})),{params:{[constants.BROTLI_PARAM_QUALITY]:6}}));
