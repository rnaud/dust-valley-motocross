import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low');});
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5197');await page.click('#start');await page.waitForFunction(()=>window.__game?.snapshot().frame>=10);
 const reports=[];
 for(const style of ['painted','ps1','pixel','original']){
  await page.click('#pause');await page.click('#settings-pause');await page.selectOption('#art-style',style);await page.click('#settings-close');await page.click('#resume');
  const start=await page.evaluate(()=>__game.snapshot().frame);await page.waitForFunction(start=>__game.snapshot().frame>=start+3,start);
  assert.equal(await page.evaluate(()=>__game.presentation().style),style);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/tmp/mcm-art-styles/mobile-${style}.png`});reports.push({style,frame:await page.evaluate(()=>__game.snapshot().frame)});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile:reports,errors}));
}finally{await browser.close();}
