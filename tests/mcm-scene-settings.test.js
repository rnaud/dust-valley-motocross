import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {readMcmSceneSettings,findMcmSceneFile} from '../scripts/mcm-reference/scene-settings.mjs';
test('scene comments cannot override starts or light settings',()=>{const s=readMcmSceneSettings('[SceneInfo]\r\nDefaultStartDirection=0,0,1\r\n;DefaultStartDirection=1,0,0\r\n[Fog]\nColorRGB=180,210,210 ; comment\n[Light1]\nType=Ambient\nColorRGB=150,150,150\n[Light2]\nType=ObjectPoint\nCastsShadows=T');assert.deepEqual(s.defaultStartDirection,[0,0,1]);assert.deepEqual(s.fogColor,[180,210,210]);assert.equal(s.lights.length,2);assert.equal(s.lights[1].castsShadows,true);});
test('all selectable terrains have an explicit scene record, including absent files',()=>{const settings=JSON.parse(fs.readFileSync(new URL('../src/mcm-scene-settings.json',import.meta.url)));const maps=JSON.parse(fs.readFileSync(new URL('../docs/mcm-map-assets.json',import.meta.url)));assert.deepEqual(Object.keys(settings),maps.map(m=>m.id));assert.deepEqual(settings['quarries-dunes'].fogColor,[180,210,210]);assert.equal(settings['quarries-track13'].title,'Widowmaker');assert.equal(settings['quarries-track13'].source,'teraform/quarries/TRACK13.SCN');for(const map of maps.filter(m=>!m.id.startsWith('waypoint-')))assert.ok(settings[map.id],map.id);assert.equal(settings['waypoint-baja00'],null);});

test('Windows course filenames match scene files regardless of extension case',()=>{assert.equal(findMcmSceneFile('teraform/quarries/TRACK13.TRN',['track12.scn','TRACK13.SCN']),'TRACK13.SCN');assert.equal(findMcmSceneFile('dunes.trn',['DUNES.SCN']),'DUNES.SCN');assert.equal(findMcmSceneFile('missing.TRN',['DUNES.SCN']),undefined);});

test('waypoint variants bind all twelve declared environments to their original terrain',()=>{
 const variants=JSON.parse(fs.readFileSync(new URL('../src/mcm-scene-variants.json',import.meta.url)));
 const maps=JSON.parse(fs.readFileSync(new URL('../docs/mcm-map-assets.json',import.meta.url))).filter(map=>map.id.startsWith('waypoint-'));
 assert.equal(maps.length,6);
 for(const map of maps){assert.equal(variants[map.id].length,2,map.id);for(const scene of variants[map.id]){assert.equal(scene.terrainFile.toLowerCase(),map.source.split('/').at(-1).toLowerCase());if(map.id==='waypoint-dunebaja')assert.equal(scene.waypointFile,null);else assert.ok(scene.waypointFile);assert.equal(scene.sha256.length,64);assert.equal(scene.defaultStartPosition.length,3);}}
 assert.equal(variants['waypoint-baja00'][0].title,'Arizona Waypoint #1');
 assert.deepEqual(variants['waypoint-baja00'][0].defaultStartPosition,[2600,100,2800]);
});
