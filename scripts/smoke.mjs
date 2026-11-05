import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const gameUrl=process.env.GAME_URL || 'http://127.0.0.1:5189';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});await page.goto(gameUrl);await page.waitForFunction(()=>window.__game).catch(async e=>{await page.screenshot({path:'/tmp/dust-error.png'});throw e;});await page.screenshot({path:'/tmp/dust-menu.png'});await page.click('#start');await page.waitForFunction(()=>window.__game.snapshot().countdown<=0);await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__game.snapshot().speed>6);await page.keyboard.up('KeyW');const riding=await page.evaluate(()=>window.__game.snapshot());assert.ok(riding.speed>5,JSON.stringify(riding));await page.screenshot({path:'/tmp/dust-riding.png'});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__game.snapshot().phase),'paused');await page.click('#resume');await page.keyboard.press('KeyR');assert.ok((await page.evaluate(()=>window.__game.snapshot())).speed<1);assert.deepEqual(errors,[]);console.log('Desktop passed: throttle, pause/resume, reset, no runtime errors.');await page.close();
const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
await phone.goto(gameUrl);await phone.waitForFunction(()=>window.__game);
await phone.screenshot({path:'/tmp/dust-mobile-menu.png'});
const session=await mobile.newCDPSession(phone);
for(const direction of [-1,1]){
  if(direction===-1)await phone.click('#start');
  else {await phone.click('#pause');await phone.click('#restart');}
  await phone.waitForFunction(()=>window.__game.snapshot().countdown<=0);
  assert.ok(await phone.locator('#touch').isVisible());
  const gas=await phone.locator('[data-control=gas]').boundingBox(),stick=await phone.locator('#joystick').boundingBox();
  const before=await phone.evaluate(()=>window.__game.snapshot());
  const gasPoint={x:gas.x+gas.width/2,y:gas.y+gas.height/2,id:1};
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[gasPoint,{x:stick.x+stick.width/2,y:stick.y+stick.height/2,id:2}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[gasPoint,{x:stick.x+stick.width*(.5+direction*.24),y:stick.y+stick.height/2,id:2}]});
  await phone.waitForFunction(start=>window.__game.snapshot().elapsed>start+1.3,before.elapsed);
  const after=await phone.evaluate(()=>window.__game.snapshot());
  // Project displacement onto the initial camera's screen-right vector.
  const screenRightTravel=-(after.x-before.x)*Math.cos(before.yaw)+(after.z-before.z)*Math.sin(before.yaw);
  assert.ok(screenRightTravel*direction>.4,`wrong screen direction: ${screenRightTravel}, input ${direction}`);
  assert.ok(after.speed>8,`slow launch: ${after.speed}`);
  assert.equal(after.crashed,false);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await phone.waitForFunction(()=>Math.abs(window.__game.snapshot().steer)<.005);
  assert.equal(await phone.locator('.pressed').count(),0);
  assert.equal(await phone.locator('#joystick-knob').evaluate(el=>el.style.transform),'translate(-50%, -50%)');
  console.log(`Mobile ${direction<0?'left':'right'} drag passed: correct screen direction, fast launch, auto-center.`);
}
await phone.screenshot({path:'/tmp/dust-mobile-ride.png'});
assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.deepEqual(errors,[]);
}finally{await browser.close();}
