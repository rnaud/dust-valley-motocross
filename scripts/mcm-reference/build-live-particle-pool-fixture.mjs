import fs from 'node:fs';
import {brotliCompressSync,constants} from 'node:zlib';
import {compareLiveParticlePoolTicks} from './compare-live-particle-pool.mjs';
const [trace,fixturePath,reportPath]=process.argv.slice(2);
if(!reportPath)throw Error('Usage: build-live-particle-pool-fixture.mjs trace.jsonl fixture.br report.json');
const events=fs.readFileSync(trace,'utf8').trim().split('\n').map(JSON.parse).filter(e=>['initial-rider','before-pool','after-pool'].includes(e.phase));
const report=compareLiveParticlePoolTicks(events);if(!report.ticks||report.differences)throw Error('Native pool calls differ');
fs.writeFileSync(fixturePath,brotliCompressSync(Buffer.from(JSON.stringify({events})),{params:{[constants.BROTLI_PARAM_QUALITY]:6}}));
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log({...report,reports:report.reports.at(-1)});
