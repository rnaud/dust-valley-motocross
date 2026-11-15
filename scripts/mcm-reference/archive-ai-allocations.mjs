import fs from 'node:fs';import {createHash} from 'node:crypto';import {brotliCompressSync,constants} from 'node:zlib';import {analyzeAiAllocations} from './analyze-ai-allocations.mjs';
const [raw,cleanup,capture,executable,output]=process.argv.slice(2);if(!output)throw Error('Usage: archive-ai-allocations.mjs RAW CLEANUP CAPTURE_LOG ORIGINAL_EXE OUTPUT');
const hash=b=>createHash('sha256').update(b).digest('hex'),live=fs.readFileSync(raw,'utf8'),restored=fs.readFileSync(cleanup,'utf8');
if(!/debugger=0 clean=1/.test(restored)||(restored.match(/restored=1/g)||[]).length!==24)throw Error('Unverified debugger cleanup');
const result=analyzeAiAllocations(live.trim().split('\n').map(JSON.parse));
const f={provenance:{executableSha256:hash(fs.readFileSync(executable)),liveSha256:hash(live),cleanup:restored,capture:fs.readFileSync(capture,'utf8'),scope:'Retained owner accounting; per-call global initial counter and returned pointers are explicit heap environment inputs. Sizes computed only for count 0..8, element size20, validated against intact native CRT oracle. No failure-path or heap-address parity claim.'},result,live};
fs.writeFileSync(output,brotliCompressSync(Buffer.from(JSON.stringify(f)),{params:{[constants.BROTLI_PARAM_QUALITY]:6}}));console.log(result);
