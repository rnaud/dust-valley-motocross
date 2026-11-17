import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:800,height:600}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low')});await p.goto(process.env.GAME_URL||'http://127.0.0.1:5197');await p.click('#start');await p.waitForFunction(()=>window.__game?.snapshot().frame>=10,null,{timeout:90000});await p.click('#pause');await p.click('#photo');
 const frame=await p.evaluate(()=>__game.snapshot().frame);
 const capture=()=>p.locator('#game').screenshot();
 // Photo mode eases its field of view; wait until the image settles first.
 await p.waitForTimeout(4000);let before=await capture();for(let i=0;i<20;i++){await p.waitForTimeout(250);const next=await capture();if(before.equals(next))break;before=next;}
 await p.locator('#game').screenshot({path:'/tmp/mcm-art-styles/restore-before.png'});
 for(const style of ['ps1','original']){await p.evaluate(style=>{const select=document.querySelector('#art-style');select.value=style;select.dispatchEvent(new Event('change'));},style);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 const after=await capture();await p.locator('#game').screenshot({path:'/tmp/mcm-art-styles/restore-after.png'});assert.ok(before.equals(after),'Original image must be restored exactly after PS1 material hooks');assert.equal(await p.evaluate(()=>__game.snapshot().frame),frame);assert.deepEqual(errors,[]);console.log('Original image restored byte-for-byte after PS1; physics stayed paused.');
}finally{await browser.close();}
