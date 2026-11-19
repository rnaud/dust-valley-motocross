import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const url=process.env.GAME_URL||'http://127.0.0.1:5197',directory='/tmp/mcm-art-styles';fs.mkdirSync(directory,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.setDefaultTimeout(90000);
 await page.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low');});
 await page.goto(url);await page.click('#start');await page.waitForFunction(()=>window.__game?.snapshot().phase==='playing');
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>__game.snapshot().frame>=65);await page.keyboard.up('KeyW');await page.keyboard.press('Escape');
 const before=await page.evaluate(()=>({frame:__game.snapshot().frame,presentation:__game.presentation()}));assert.ok(before.presentation.nativeParticles>0);assert.ok(before.presentation.particles>0);
 const selectedStyles=process.env.ART_STYLES?.split(',')??['original','neon','moebius','voxel','painted','ps1','pixel'];
 for(const id of selectedStyles){
  await page.click('#settings-pause');await page.selectOption('#art-style',id);await page.click('#settings-close');await page.click('#photo');
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.equal(await page.evaluate(()=>__game.presentation().style),id);
  assert.equal(await page.evaluate(()=>__game.snapshot().frame),before.frame,'Style changes cannot advance physics');
  await page.screenshot({path:`${directory}/${id}.png`});await page.keyboard.press('Escape');
 }
 await page.reload();await page.click('#settings-open');assert.equal(await page.locator('#art-style').inputValue(),selectedStyles.at(-1));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({desktop:before,styles:selectedStyles.length,errors}));await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));mobile.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await mobile.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low');});
 await mobile.goto(url);await mobile.click('#settings-open');await mobile.selectOption('#art-style','moebius');await mobile.click('#settings-close');await mobile.click('#start');await mobile.waitForFunction(()=>window.__game?.snapshot().frame>=10,null,{timeout:90000});
 assert.equal(await mobile.evaluate(()=>__game.presentation().style),'moebius');assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mobile.screenshot({path:directory+'/mobile-moebius.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile:await mobile.evaluate(()=>__game.presentation()),errors}));
}finally{await browser.close();}
