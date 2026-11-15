import {analyzeAiTrickGraph} from './analyze-ai-trick-graph.mjs';
import {replayAiContactEvents} from './analyze-ai-contact-events.mjs';
import {replayAiRaceHandicap} from './analyze-ai-race-handicap.mjs';
import {analyzeAiLookahead} from './analyze-ai-lookahead.mjs';
import {selectMcmAiRouteSegment} from '../../src/physics/mcm/ai-route-segment.js';
import {computeMcmAiLandingPitch} from '../../src/physics/mcm/ai-landing-pitch.js';
import {queryMcmTerrainNormal} from '../../src/physics/mcm/terrain-normal.js';
import {selectMcmAiTrick} from '../../src/physics/mcm/ai-trick-select.js';
import {bitsFloat as float,floatBits as bits} from '../../src/physics/mcm/math.js';
import assert from 'node:assert/strict';import {computeMcmAiJumpState,AI_JUMP_OFFSETS} from '../../src/physics/mcm/ai-jump-state.js';import {createMcmRandom} from '../../src/physics/mcm/random.js';
// Retain eight jump fields through the complete controller, with computed
// lookahead inputs. Per-call pose and race/handicap configuration remain boundaries.
// The live difficulty-zero scene excludes nearby interaction. Optional contact
// and trick events validate their graph effects and connect computed transitions.
export function replayAiLandingPitch(rows,options){
const trickGraphs=rows.some(r=>r.phase==='trick-graph-before')?analyzeAiTrickGraph(rows).checks:null;
const checks=[],handicap=replayAiRaceHandicap(rows),contacts=replayAiContactEvents(rows),contactEntries=new Map(contacts.checks.map(c=>[rows[c.index],c]));
const look=analyzeAiLookahead(rows,options),entries=new Map(rows.filter(r=>r.phase==='before').map(r=>[r.sequence,r])),route=rows.find(r=>r.phase==='route'),table=route.nodes.map(n=>n.address),routeNodes=new Map(route.nodes.map(n=>[n.address,{x:float(n.words[0]),y:float(n.words[1]),z:float(n.words[2]),kind:n.words[4],speed:float(n.words[3]),next:n.words[10]}]));
let landingInput,landingQueries=0,exits=0;
const rng=createMcmRandom(rows.find(r=>r.phase==='random').state);const nodes=new Map(rows.find(r=>r.phase==='route').nodes.map(n=>[n.address,n.words[9]]));let trickResult,expectedDelay,expectedAnimation,expectedControl;let selections=0,rejected=0;let pending=[],out,ids,calls=0,draws=0;const offsets=[0x514,0xb44,0xb64,0xb68,0xb40,0xb18,0xb20,0xb4c,0xb38];
for(const r of rows){
 const contact=contactEntries.get(r);if(contact&&out){assert.equal(out[7],contact.before,'Retained contact latch entry');out[7]=contact.latch;}
 if(r.phase==='before'&&out){const b=Buffer.from(r.hex,'hex');for(let i=1;i<9;i++)assert.equal(out[i],b.readUInt32LE(offsets[i]),`Retained jump entry ${r.sequence} field ${offsets[i].toString(16)}`);}

 if(r.phase==='lookahead-after'){
 const entry=entries.get(r.sequence);assert.ok(entry,'Missing controller entry');
 const b=Buffer.from(entry.hex,'hex'),observed=Buffer.from(r.hex,'hex'),w=new Uint32Array(34);
 const segment=selectMcmAiRouteSegment({head:b.readUInt32LE(0xaf0),nodes:routeNodes,table,x:b.readFloatLE(0x4f8),z:b.readFloatLE(0x500)});
 assert.equal(r.stack[12],segment.address,'Computed nearest');assert.equal(r.stack[33],Number(segment.class3456),'Computed route class');
 for(const o of [...AI_JUMP_OFFSETS.filter(o=>![0xb80,0xb84,0xb88].includes(o)),0x6c8,0x4c0,0x4c8,0x81c,0x614,0x814,0x710])assert.equal(b.readUInt32LE(o),observed.readUInt32LE(o),`Jump input boundary ${o.toString(16)}`);
 if(out)for(let i=1;i<9;i++)assert.equal(out[i],b.readUInt32LE(offsets[i]),'Retained jump stage');
 ids=[0,out?out[4]:b.readUInt32LE(0xb40),segment.address];
 w[1]=0;w[2]=Number(segment.class3456);w[3]=Number(handicap.checks.find(x=>x.sequence===r.sequence).raceActive);w[4]=bits(handicap.checks.find(x=>x.sequence===r.sequence).progress);w[5]=r.stack[13];w[6]=2;
 AI_JUMP_OFFSETS.forEach((o,i)=>w[7+i]=b.readUInt32LE(o));
 if(out)for(let i=1;i<9;i++)w[7+AI_JUMP_OFFSETS.indexOf(offsets[i])]=out[i];
 const point=look.checks.find(x=>x.sequence===r.sequence).words;for(let i=0;i<3;i++)w[22+i]=point[i];
 w[11]=w[11]?(ids[1]===ids[2]?2:1):0;w[32]=nodes.get(ids[1])||0;w[33]=nodes.get(ids[2])||0;

 out=computeMcmAiJumpState(w,{get state(){return rng.state;},get calls(){return rng.calls;},draw(){pending.push({state:rng.state,consumer:"jump"});return rng.draw();}});out[4]=ids[out[4]];if(ids[1])nodes.set(ids[1],out[9]);nodes.set(ids[2],out[10]);expectedDelay=b.readUInt32LE(0x81c);expectedAnimation=b[0x814];expectedControl=b.readUInt32LE(0x710);
 landingInput={airborne:!!w[7],flag:out[2],angle:float(out[3]),verticalBias:b.readFloatLE(0x6c8),vy:float(out[0]),vx:b.readFloatLE(0x510),vz:b.readFloatLE(0x518),x:b.readFloatLE(0x4f8),z:b.readFloatLE(0x500),matrix4c0:b.readFloatLE(0x4c0),matrix4c8:b.readFloatLE(0x4c8),queryNormal:point=>queryMcmTerrainNormal({...options.terrain,point,normal:[0,0,0]})};
 assert.equal(b.readUInt32LE(0xbf8),0,'Nearby branch absent in this fixture');
 if(w[7]&&out[7]&&(r.stack[30]|0)>=0x3f490fdb&&nodes.get(out[4])){
  trickResult=selectMcmAiTrick({flightTime:float(out[11]),selector:0,delayEnabled:b.readUInt32LE(0x614),delay:float(expectedDelay),selected:0},{draw(){pending.push({state:rng.state,consumer:"trick"});return rng.draw();}});
  expectedDelay=bits(trickResult.delay);out[7]=0;
  if(trickResult.success){if(trickGraphs){const graph=trickGraphs.find(g=>g.sequence===r.sequence);assert.ok(graph,'Missing retained trick graph');assert.equal(graph.selected,trickResult.selected,'Computed retained trick selection');}expectedAnimation=trickResult.selected&255;expectedControl=1;selections++;}else rejected++;

 }

 }
 if(r.phase==='after'){
  const pitch=computeMcmAiLandingPitch(landingInput);out[2]=pitch.flag;out[3]=bits(pitch.angle);landingQueries+=Number(pitch.queried);
  const b=Buffer.from(r.hex,'hex');for(let i=0;i<9;i++)assert.equal(out[i],b.readUInt32LE(offsets[i]),`Computed full-controller jump exit ${r.sequence} field ${offsets[i].toString(16)}`);checks.push({sequence:r.sequence,bodyWords:out.slice(0,9),lookahead:[...look.checks.find(x=>x.sequence===r.sequence).words]});exits++;
 }
 if(r.phase==='random'){
 if(pending.length){const expected=pending.shift();assert.equal(r.state,expected.state,'Predicted AI random state');assert.ok((expected.consumer==='jump'?[0x46f10b,0x46f14d,0x46f20a,0x46f3f2]:[0x49d741,0x49d7a8]).includes(r.caller),'Predicted random consumer');draws++;}else{assert.equal(r.inAi,0,'Unmodeled AI random draw');assert.equal(r.state,rng.state,'Shared random state');rng.draw();}
 }
 if(r.phase==='steering-control-before'){
 const b=Buffer.from(r.hex,'hex');for(let i=0;i<9;i++)assert.equal(out[i],b.readUInt32LE(offsets[i]),`seq ${r.sequence} field ${offsets[i].toString(16)}`);assert.equal(expectedDelay,b.readUInt32LE(0x81c),'Trick delay');assert.equal(expectedAnimation,b[0x814],'Selected trick animation');assert.equal(expectedControl,b.readUInt32LE(0x710),'Trick startup flag');assert.equal(out[11],r.stack[13],`flight ${r.sequence}`);assert.equal(pending.length,0);calls++;
 }
}
if(trickGraphs)assert.equal(trickGraphs.length,selections,'Unmatched retained trick graphs');assert.equal(pending.length,0,'Unconsumed AI draws');assert.equal(calls,rows.filter(r=>r.phase==='lookahead-after').length,'Trick observation count');assert.equal(exits,calls,'Controller exit count');assert.equal(entries.size,calls,'Controller entry count');return {calls,draws,allDraws:rng.calls,selections,rejected,landingQueries,checks};
}

export function analyzeAiLandingPitch(rows,options){const {checks,...summary}=replayAiLandingPitch(rows,options);return summary;}
