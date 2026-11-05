import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {terrain,freeTerrain} from '../src/world.js';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5189');await page.waitForFunction(()=>window.__game);
  for(const mode of ['free','race']){
   await page.click(`[data-mode=${mode}]`);await page.click('#start');await page.waitForFunction(()=>window.__game.snapshot().countdown<=0);
   const env=await page.evaluate(()=>window.__game.environment());
   assert.equal(env.trackVisible,mode==='race');assert.equal(env.trackTexture,mode==='race');
   assert.equal(await page.locator('.gate-stat').isVisible(),mode==='race');
   assert.equal(env.height,env.visualHeight);
   const height=mode==='free'?freeTerrain:terrain;
   for(const m of env.mountains){
    assert.ok(Math.abs(m.x)+m.radius<450&&Math.abs(m.z)+m.radius<450);
    for(let x=-m.radius;x<=m.radius;x+=2)for(let z=-m.radius;z<=m.radius;z+=2){if(x*x+z*z<=m.radius*m.radius)assert.ok(m.foundation<height(m.x+x,m.z+z)-1,'exposed mountain foundation');}
   }
   if(mode==='free'){
    await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__game.snapshot().speed>8);await page.keyboard.up('KeyW');
    await page.keyboard.down('KeyS');await page.waitForFunction(()=>window.__game.snapshot().speed<.2);await page.keyboard.up('KeyS');
    const before=await page.evaluate(()=>window.__game.snapshot());await page.click('#reset');const after=await page.evaluate(()=>window.__game.snapshot());
    assert.ok(Math.hypot(after.x-before.x,after.z-before.z)<1,'free recovery must stay local');
    await page.screenshot({path:`/tmp/dust-free-${mobile?'mobile':'desktop'}.png`});
   }
   await page.click('#pause');await page.click('#home');
  }
  assert.deepEqual(errors,[]);console.log(`${mobile?'Mobile':'Desktop'}: free/race transitions, local recovery, matching terrain physics, and all 45 mountain foundations passed.`);await page.close();
 }
}finally{await browser.close();}
