import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];const url=process.env.GAME_URL||'http://127.0.0.1:5191';
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.setDefaultTimeout(90000);
  await page.addInitScript(({mobile})=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality',mobile?'low':'high');},{mobile});
  await page.goto(url);await page.waitForFunction(()=>window.__game);
  await page.click('[data-mode=free]');await page.check('#sand-mode');
  await page.selectOption('#physics-mode','mcm-preview');assert.equal(await page.locator('#sand-mode').isDisabled(),false);
  await page.selectOption('#physics-mode',mobile?'mcm-preview':'classic');await page.click('#start');
  await page.waitForFunction(()=>window.__game.snapshot().phase==='playing');
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.ok(await page.evaluate(()=>!!window.__game.environment().sand));
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__game.snapshot().speed>2);await page.keyboard.up('KeyW');
  await page.screenshot({path:`/tmp/dust-valley-graphics-${mobile?'mobile':'desktop'}.png`});
  console.log(mobile?'mobile':'desktop',await page.evaluate(()=>{const g=window.__game,s=g.snapshot(),r=g.renderer;return{speed:s.speed,sand:g.environment().sand,render:r.info.render,memory:r.info.memory,programs:r.info.programs.length};}));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.keyboard.press('Escape');await page.click('#home');await page.click('[data-mode=race]');await page.selectOption('#physics-mode','mcm-preview');await page.click('#start');
  assert.ok(await page.evaluate(()=>!!window.__game.environment().sand));
  await page.keyboard.press('Escape');await page.click('#home');await page.uncheck('#sand-mode');await page.click('#start');
  assert.equal(await page.evaluate(()=>window.__game.environment().sand),null);
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log('Graphics smoke passed: desktop/mobile, sand controls, rendered ride, no browser/shader errors. SwiftShader workload only; no hardware FPS claim.');
}finally{await browser.close();}
