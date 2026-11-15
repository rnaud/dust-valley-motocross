import fs from 'node:fs';import {createHash} from 'node:crypto';import {brotliCompressSync,constants} from 'node:zlib';import {analyzeAiTrickGraph} from './analyze-ai-trick-graph.mjs';
const [raw,cleanup,capture,executable,output]=process.argv.slice(2);if(!output)throw Error('Usage: archive-ai-trick-graph.mjs RAW CLEANUP CAPTURE_LOG ORIGINAL_EXE OUTPUT');
const hash=b=>createHash('sha256').update(b).digest('hex'),live=fs.readFileSync(raw,'utf8'),restored=fs.readFileSync(cleanup,'utf8');
if(!/debugger=0 clean=1/.test(restored)||(restored.match(/restored=1/g)||[]).length!==26)throw Error('Unverified debugger cleanup');
const result=analyzeAiTrickGraph(live.trim().split('\n').map(JSON.parse));
const f={provenance:{executableSha256:hash(fs.readFileSync(executable)),liveSha256:hash(live),cleanup:restored,capture:fs.readFileSync(capture,'utf8'),scope:'Two stage-local trick starts with orientation reset and complete graph/animation/bounds/envelope comparison. Entry graph and pose are observed boundaries; full retained controller rejects an external latch clear at call22.'},result,live};
fs.writeFileSync(output,brotliCompressSync(Buffer.from(JSON.stringify(f)),{params:{[constants.BROTLI_PARAM_QUALITY]:6}}));console.log(result);
