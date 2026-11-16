import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const url=process.env.GAME_URL||'http://127.0.0.1:5193';
async function snapshot(page){return page.evaluate(()=>{const s=__game.snapshot();return {frame:s.frame,phase:s.phase,backend:s.physicsBackend,speed:s.speed,yaw:s.yaw,steer:s.steer,crashed:s.crashed,engine:s.engine,error:s.physicsError};});}
async function frames(page,count){const start=(await snapshot(page)).frame;await page.waitForFunction(({start,count})=>{const s=__game.snapshot();if(s.physicsError)throw Error(s.physicsError);return s.frame>=start+count;},{start,count},{timeout:60000});}
try{
 for(const touch of [false,true]){
  const page=await browser.newPage(touch?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low');});
  await page.goto(url);await page.waitForFunction(()=>window.__game);
  assert.equal(await page.locator('#physics-mode').inputValue(),'mcm-preview');
  assert.equal(await page.locator('[data-mode=free]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#mcm-assets').isVisible(),true);
  assert.equal(await page.locator('#physics-mode').isVisible(),false);
  assert.equal(await page.locator('#daily').isVisible(),false);
  assert.ok(!(await page.locator('#menu-extra-control').innerText()).includes('Boost'));
  if(!touch)await page.uncheck('#sand-mode');
  await page.click('#start');await page.waitForFunction(()=>__game.snapshot().phase==='playing',null,{timeout:90000});
  assert.equal((await snapshot(page)).backend,'recovered-core');assert.equal(await page.locator('#lights').isVisible(),false);
  let cd,point;
  if(touch){cd=await page.context().newCDPSession(page);const b=await page.locator('[data-control=gas]').boundingBox();point={x:b.x+b.width/2,y:b.y+b.height/2,id:1};await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});}
  else await page.keyboard.down('KeyW');
  await frames(page,20);const gas=await snapshot(page);assert.ok(gas.speed>1);assert.ok(Math.abs(gas.yaw)<.04);assert.equal(gas.crashed,false);
  console.log(JSON.stringify({check:'preview-acceleration',touch,gas}));
  if(touch)await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('KeyW');
  await frames(page,4);assert.equal((await snapshot(page)).engine.recovered.released,1);
  await page.screenshot({path:`/tmp/mcm-core-preview-${touch?'touch':'desktop'}.png`});
  if(touch){assert.ok(await page.evaluate(()=>__game.environment().sand.version>0));await page.click('#reset');}
  else{
   for(const [key,sign] of [['KeyD',-1],['KeyA',1]]){
    await page.keyboard.press('KeyR');await frames(page,2);await page.keyboard.down('KeyW');await frames(page,15);await page.keyboard.down(key);await frames(page,8);
    const turn=await snapshot(page);assert.ok(turn.yaw*sign>0,`${key} must turn in the requested direction`);
    await page.keyboard.up(key);await page.keyboard.up('KeyW');
   }
   await page.keyboard.press('KeyR');await page.keyboard.press('Escape');assert.equal((await snapshot(page)).phase,'paused');await page.click('#photo');await page.screenshot({path:'/tmp/mcm-core-preview-bike.png'});await page.keyboard.press('Escape');await page.click('#home');
   await page.click('[data-mode=race]');await page.click('#start');await page.waitForFunction(()=>__game.snapshot().phase==='playing');await frames(page,3);assert.equal((await snapshot(page)).backend,'recovered-core');await page.screenshot({path:'/tmp/mcm-core-preview-circuit.png'});await page.keyboard.press('Escape');await page.click('#home');
   await page.click('#legacy-game summary');await page.selectOption('#physics-mode','classic');await page.click('[data-mode=free]');await page.click('#start');await page.waitForFunction(()=>__game.snapshot().phase==='playing');assert.equal((await snapshot(page)).backend,undefined);
   assert.equal(await page.locator('#preview-badge').isVisible(),false);
   await page.keyboard.down('KeyW');
   await page.waitForFunction(()=>__game.snapshot().elapsed>=.4);
   const classic=await snapshot(page);await page.keyboard.up('KeyW');
   assert.equal(classic.engine?.recovered,undefined,'Classic must not run the recovered engine');
   assert.ok(gas.engine?.recovered,'Preview must expose the running recovered engine');
   console.log(JSON.stringify({check:'distinct-physics-backends',preview:gas,classic}));
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({touch,gas,errors}));await page.close();
 }
}finally{await browser.close();}
