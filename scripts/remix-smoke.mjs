import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
fs.mkdirSync('/tmp/mcm-remix',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(90000);
 await page.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low');});
 await page.goto('http://127.0.0.1:5197',{waitUntil:'domcontentloaded'});
 for(const id of ['train','erase','kitchen','giant','opponent']){
  await page.selectOption('#remix-level',id);await page.click('#start');await page.waitForFunction(()=>__game.snapshot().phase==='playing');
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>__game.remix().time>2);await page.keyboard.up('KeyW');
  assert.equal(await page.evaluate(()=>__game.remix().id),id);assert.equal(await page.evaluate(()=>__game.snapshot().physicsError),undefined);
  if(id==='giant'){await page.click('#remix-action');assert.equal(await page.evaluate(()=>__game.remix().awake),true);}
  await page.keyboard.press('Escape');await page.click('#photo');await page.screenshot({path:`/tmp/mcm-remix/${id}.png`});await page.keyboard.press('Escape');
  console.log(id,await page.evaluate(()=>({remix:__game.remix(),y:__game.snapshot().y})));
  await page.click('#restart');await page.waitForFunction(()=>__game.snapshot().phase==='playing');assert.ok(await page.evaluate(()=>__game.remix().time<2));
  await page.keyboard.press('Escape');await page.click('#home');
 }
 assert.deepEqual(errors,[]);
 await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.setDefaultTimeout(90000);mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low');});await mobile.goto('http://127.0.0.1:5197',{waitUntil:'domcontentloaded'});await mobile.selectOption('#remix-level','giant');await mobile.click('#start');await mobile.waitForFunction(()=>__game.snapshot().phase==='playing');await mobile.click('#remix-action');assert.equal(await mobile.evaluate(()=>__game.remix().awake),true);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mobile.screenshot({path:'/tmp/mcm-remix/mobile.png'});assert.deepEqual(errors,[]);
 console.log('All five start, ride, pause, restart and return to menu; mobile wake works.');
}finally{await browser.close();}
