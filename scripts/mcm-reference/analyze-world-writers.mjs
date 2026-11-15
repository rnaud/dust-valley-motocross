import {analyzeSamplerFormatter,samplerFormatterPhases} from './analyze-sampler-formatter.mjs';
import {analyzeUploadCopy} from './analyze-upload-copy.mjs';
import assert from 'node:assert/strict';
import {deriveActorApplyStacks} from './derive-actor-apply-stacks.mjs';
import {analyzeBindingGates} from './analyze-binding-gates.mjs';
import {analyzeRenderResourceUploads} from './analyze-render-resource-upload.mjs';
import {mcmRenderBindingGates,mcmApplyBindingStack} from '../../src/physics/mcm/render-binding-gates.js';
import {mcmRenderBinding} from '../../src/physics/mcm/render-binding.js';
import {mcmRenderProductAddress} from '../../src/physics/mcm/render-dirty.js';
import {mcmRenderTransformUpload,mcmRenderAuxiliaryUploads} from '../../src/physics/mcm/render-upload.js';
import {mcmRenderHeapStore} from '../../src/physics/mcm/render-heap.js';
import {multiplyWineRenderMatrix} from '../../src/physics/mcm/wine-render-matrix.js';
import {mcmHudMeasuredLineStores} from '../../src/physics/mcm/hud-line-stores.js';
import {tickMcmHudRefreshClock} from '../../src/physics/mcm/hud-refresh-clock.js';
const float=x=>new Float32Array(Uint32Array.of(x).buffer)[0];
const bits=x=>new Uint32Array(Float32Array.of(x).buffer)[0];
const floats=x=>new Float32Array(Uint32Array.from(x).buffer);
export const bindingPhases=new Set(['state-1bd500','state-prepared','binding-gate-input','binding-producer-input','binding-input','binding-call-store','binding-call-return']);
export const worldWriterPhases=new Set([...samplerFormatterPhases,...bindingPhases,'state-declaration','upload-config','wrapper','wrapper-exit','wrapper-cull','store-before','store-after','hud-clock-input','hud-line-clear','bike-function-entry','upload-input','upload-resource-input','resource-input','resource-stage','command-producer','command-bytes','handler-1b6460','heap-store-value','upload-command-allocation','upload-command-bytes','resource-upload-callback','upload-copy-save']);

// Predict writes from ordered invocation/stage inputs. Store observations never
// become state. Invocation order, wrapper/non-actor stack depth, prepared graphics state, camera,
// allocator results and font measurements are still external boundaries.
export function analyzeWorldWriters(render, physicsRows, {player, scratch, moduleBase, heapHandle, worldMatrix, actorDrawSchedules=null}) {
  assert.equal(scratch,parseInt(physicsRows[0].stackAddress,16)+0x54);
  const actorStacks=deriveActorApplyStacks(render,{actorDrawSchedules});render=actorStacks.rows;
  const copies=analyzeUploadCopy(render,moduleBase);
  const samplerStores=new Map();
  const samplerFormats=analyzeSamplerFormatter(render,{onStore:(index,store)=>samplerStores.set(index,store)});
  const bindings=analyzeBindingGates(render.filter(r=>bindingPhases.has(r.phase)),moduleBase);
  const wrappers=new Map(),checks=[],counts={hud:0,sse:0,binding:0,heap:0},resources=[];
  let app=null,upload=null,pendingSse=null,line=null,clock=null,clockPending=false,expectedLines=0;
  let last=null,applications=0,clockChecks=0,refreshes=0,lineCalls=0;
  const commit=(kind,frame,store)=>{if(store.address===scratch){last={kind,frame,value:store.value};counts[kind]=(counts[kind]??0)+1;}};
  const finishApply=()=>{
    if(!app)return;
    assert.equal(upload,null,'Incomplete upload');assert.equal(pendingSse,null,'Incomplete SSE store');
    assert.ok(app.prepared&&app.config&&app.declaration&&app.uploadConfig,'Missing application inputs');
    const p=app.prepared,entry=app.entry,expected=[];
    for(const input of [p,app.config,app.declaration,app.uploadConfig]){assert.equal(input.frame,entry.frame);assert.equal(input.block,p.block);}
    assert.equal(app.declaration.declaration,app.config.declaration);assert.equal(app.declaration.transformed,app.config.transformed);
    assert.equal(app.uploadConfig.state2540,0,'Unmodeled blended products');
    if((p.dirty[2]&2)&&mcmRenderProductAddress(entry.esp)+8===scratch){
      const wrapper=wrappers.get(`${entry.frame}/${entry.actor}`);assert.ok(wrapper,'Missing camera input');
      const product=multiplyWineRenderMatrix(floats(wrapper.words.slice(42,58)),Float32Array.from(worldMatrix));
      expected.push({kind:'sse',address:scratch,value:bits(product[2])});
    }
    const gate=mcmRenderBindingGates({...app.config,dirty108:p.dirty[2]});assert.equal(gate.boundary,'continue');
    for(const command of gate.commands){
      const result=mcmRenderBinding({...command,previous:0,handlerEntryEsp:mcmApplyBindingStack(entry.esp).handlerEntryEsp,moduleBase});
      for(const call of result.calls)if(call.store?.address===scratch)expected.push({kind:'binding',...call.store});
    }
    const heap=mcmRenderHeapStore(entry.esp,heapHandle);
    if(heap.address===scratch){
      const input={stateAddress:p.block,entryEsp:entry.esp,transformed:app.declaration.transformed,
        dirty104:p.dirty[1],dirty108:p.dirty[2],flags58:p.flags58,state2540:app.uploadConfig.state2540};
      const transform=mcmRenderTransformUpload(input),predicted=[...(transform?[transform]:[]),...mcmRenderAuxiliaryUploads(input)];
      assert.equal(app.uploads.length,predicted.length,'Heap-producing upload count');
      for(let i=0;i<predicted.length;i++){
        const observed=app.uploads[i];for(const [key,value] of Object.entries(predicted[i]))assert.equal(key==='callerRva'?observed.caller-moduleBase:observed[key],value,`Heap upload ${key}`);
        expected.push({kind:'heap',...heap});
      }
    }
    expected.push(...app.copies.filter(store=>store.address===scratch).map(store=>({kind:'uploadCopy',...store})));
    // The stack offsets are distinct for these observed call paths. No relative ordering between these
    // families is inferred when they do not overlap the target in this call.
    assert.ok(new Set(expected.map(s=>s.kind)).size<=1,'Conflicting stack families');
    assert.deepEqual(app.actual,expected,'Application writes differ');
    for(const store of expected)commit(store.kind,entry.frame,store);
    applications++;app=null;
  };
  for(const [index,r] of render.entries()){
    assert.ok(worldWriterPhases.has(r.phase),'Unknown world writer event');
    if(samplerStores.has(index)){finishApply();commit('sampler',r.frame,samplerStores.get(index));}
    if(r.phase==='wrapper')wrappers.set(`${r.frame}/${r.actor}`,r);
    if(r.phase==='state-1bd500'){finishApply();app={entry:r,actual:[],uploads:[],copies:[]};}
    if(copies.stores.has(index)){assert.ok(app);const store=copies.stores.get(index);app.copies.push(store);if(store.address===scratch)app.actual.push({kind:'uploadCopy',address:r.address,value:r.value});}
    if(r.phase==='state-prepared')app.prepared=r;
    if(r.phase==='binding-gate-input')app.config=r;
    if(r.phase==='state-declaration')app.declaration=r;
    if(r.phase==='upload-config')app.uploadConfig=r;
    if(r.phase==='upload-input'){assert.ok(app&&!upload);app.uploads.push(r);upload={upload:r,staging:{apply:app.entry,frees:[],stores:[]}};}
    if(upload){
      if(r.phase==='upload-resource-input')upload.config=r;
      if(r.phase==='resource-input')upload.staging.input=r;
      if(r.phase==='resource-stage')upload.staging[r.stage===134?'map':'unmap']=r;
      if(r.phase==='command-producer')upload.staging.producer=r;
      if(r.phase==='command-bytes')upload.staging.command=r;
      if(r.phase==='handler-1b6460')upload.staging.frees.push(r);
      if(r.phase==='heap-store-value'&&upload.staging.frees.length)upload.staging.stores.push(r);
      if(r.phase==='upload-command-allocation')upload.allocation=r;
      if(r.phase==='upload-command-bytes'){upload.command=r;resources.push(upload);upload=null;}
    }
    if(r.phase==='heap-store-value'&&r.address===scratch){assert.ok(app);app.actual.push({kind:'heap',address:r.address,value:r.value});}
    if(r.phase==='binding-call-store'&&r.address===scratch){assert.ok(app);app.actual.push({kind:'binding',address:r.address,value:r.value});}
    if(r.phase==='store-before'){assert.ok(app&&!pendingSse);pendingSse=r;}
    if(r.phase==='store-after'){
      assert.ok(pendingSse);assert.equal(r.frame,pendingSse.frame);assert.equal(r.value,pendingSse.value);
      if(pendingSse.scratch===scratch)app.actual.push({kind:'sse',address:scratch,value:r.value});pendingSse=null;
    }
    if(r.phase==='hud-clock-input'){
      if(r.stage===19){
        finishApply();assert.ok(!clockPending);assert.equal(expectedLines,0,'Missing scheduled HUD lines');clockPending=true;
        if(!clock)clock={elapsed:float(r.elapsedBits),frames:r.frames,frameMilliseconds:float(r.frameMillisecondsBits)};
        assert.deepEqual([bits(clock.elapsed),clock.frames,bits(clock.frameMilliseconds)],[r.elapsedBits,r.frames,r.frameMillisecondsBits]);
        tickMcmHudRefreshClock(clock,{dt:float(r.dtBits),enabled:r.enabled,refresh:()=>{refreshes++;expectedLines=2;}});clockChecks++;
      }else{
        assert.equal(r.stage,20);assert.ok(clockPending);assert.equal(expectedLines,0);clockPending=false;
        assert.deepEqual([bits(clock.elapsed),clock.frames,bits(clock.frameMilliseconds)],[r.elapsedBits,r.frames,r.frameMillisecondsBits]);
      }
    }
    if(r.phase==='hud-line-clear'){
      if(r.stage===167){
        finishApply();assert.ok(!line&&expectedLines>0,'Unscheduled HUD line');expectedLines--;
        line=mcmHudMeasuredLineStores({frameBase:r.ebp,fit:r.fit,count:r.count,format:r.format});assert.equal(line.branch,'draw');
        for(const store of line.writes)commit('hud',r.frame,store);lineCalls++;
      }else if(r.stage===169){
        assert.ok(line);assert.deepEqual(line.writes.at(-1),{address:r.address,value:r.value});line=null;
      }else assert.equal(r.stage,168);
    }
    if(r.phase==='bike-function-entry'&&r.ecx===player){
      finishApply();assert.ok(last,'No predicted writer');assert.equal(last.frame,r.frame);
      assert.equal(last.value,r.value,'Next bike entry differs from predicted last writer');
      const next=physicsRows[(r.frame+1)*2];assert.ok(next);assert.equal(parseInt(next.stackAddress,16)+0x54,scratch);assert.equal(Buffer.from(next.stackHex,'hex').readUInt32LE(0x54),last.value,'Physics entry differs');
      assert.equal(r.frame,checks.length,'Missing or repeated player entry');
      checks.push({...last,nextFrame:r.frame+1});
    }
  }
  finishApply();assert.ok(!line&&!clockPending);assert.equal(expectedLines,0);
  assert.equal(checks.length,physicsRows.length/2-1,'Missing next-bike checks');
  const uploads=analyzeRenderResourceUploads(resources,heapHandle);
  return {scope:'Actor application stacks derived from wrapper entries; other invocations and stage inputs; predicted write values, no scratch injection. Draw scheduling and continuous graphics state are not recovered.',
    applications,samplerFormatCalls:samplerFormats.formats,samplerSaveCalls:samplerFormats.stores.length,uploadCopyCalls:copies.calls,sceneScheduledWrappers:actorStacks.scheduledWrappers,derivedActorApplications:actorStacks.applications,derivedChildWrappers:actorStacks.childWrappers,observedRootWrappers:actorStacks.rootWrappers,observedNonActorApplications:actorStacks.observedNonActorApplications,bindings,uploads,clockChecks,refreshes,lineCalls,counts,checks};
}
