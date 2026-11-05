import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const mode of ['race','free']){
  const page=await browser.newPage({viewport:{width:960,height:600}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5189');await page.waitForFunction(()=>window.__game);
  await page.click(`[data-mode=${mode}]`);await page.click('#start');await page.waitForFunction(()=>window.__game.snapshot().countdown<=0,{},{timeout:90000}).catch(async e=>{console.log(await page.evaluate(()=>window.__game.snapshot()));throw e;});
  await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>window.__game.snapshot().speed>14);
  const log=[];
  for(const direction of [-1,1,-1,1]){
   const key=direction<0?'ArrowLeft':'ArrowRight',before=await page.evaluate(()=>window.__game.snapshot());
   await page.keyboard.down(key);
   await page.waitForFunction(t=>window.__game.snapshot().elapsed>t+.5,before.elapsed);
   const middle=await page.evaluate(()=>window.__game.snapshot());
   assert.equal(middle.crashed,false);assert.ok(Math.abs(middle.yawRate)<1.5,'uncommanded spin');
   assert.ok(middle.yawRate*(-direction)>.08,'opposite input must reverse turn');
   assert.ok(middle.speed>before.speed*.75,'reversing must not brake the bike');
   await page.waitForFunction(t=>window.__game.snapshot().elapsed>t+1,before.elapsed);
   await page.keyboard.up(key);log.push({direction,speed:middle.speed,yawRate:middle.yawRate});
  }
  await page.keyboard.up('ArrowUp');
  assert.deepEqual(errors,[]);console.log(mode,JSON.stringify(log));
  await page.keyboard.press('p');
  await page.screenshot({path:`/tmp/dust-reversal-${mode}.png`,timeout:90000});await page.close();
 }
}finally{await browser.close();}
