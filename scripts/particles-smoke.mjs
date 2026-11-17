import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const url=process.env.GAME_URL||'http://127.0.0.1:5197',dir='/tmp/mcm-original-particles';fs.mkdirSync(dir,{recursive:true});
try{
 for(const map of ['quarries-dunes','quarries-quarry00']){
  const p=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];p.setDefaultTimeout(90000);
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low')});
  await p.goto(url);await p.selectOption('#mcm-map',map);await p.click('#start');await p.waitForFunction(()=>window.__game?.snapshot().phase==='playing');
  await p.keyboard.down('KeyW');const frame=await p.evaluate(()=>__game.snapshot().frame);await p.waitForFunction(f=>__game.snapshot().frame>=f+30,frame);await p.keyboard.up('KeyW');
  await p.keyboard.press('Escape');await p.click('#photo');await p.screenshot({path:`${dir}/${map}.png`});
  const data=await p.evaluate(()=>__game.presentation());assert.ok(data.particles>0);assert.equal(data.particleTexture,map==='quarries-dunes'?'particles\\track04p.tga':'particles\\track15p.tga');assert.ok(data.particleSprites.some(n=>n<=12));assert.deepEqual(errors,[]);console.log(JSON.stringify({map,...data,errors}));await p.close();
 }
}finally{await browser.close();}
