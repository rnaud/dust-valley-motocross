import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
try{
 if(!process.env.PHONE_ONLY){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await page.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low');});
 page.setDefaultTimeout(60000);
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5190',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__game);
 await page.selectOption('#physics-mode','mcm-preview');await page.click('[data-mode=free]');
 await page.screenshot({path:'/tmp/mcm-preview-menu.png'});
 await page.click('#start');await page.waitForFunction(()=>window.__game.snapshot().countdown<=0);
 assert.equal(await page.evaluate(()=>window.__game.snapshot().physicsMode),'mcm-preview');
 assert.equal(await page.locator('#lights').isVisible(),false);assert.ok(await page.evaluate(()=>window.__game.snapshot().countdown<0));
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__game.snapshot().speed>8).catch(async e=>{console.error(await page.evaluate(()=>window.__game.snapshot()));throw e;});
 await page.keyboard.down('KeyD');await page.waitForFunction(()=>Math.abs(window.__game.snapshot().steer)>.03);await page.keyboard.up('KeyD');
 await page.screenshot({path:'/tmp/mcm-preview-riding.png'});
 await page.keyboard.up('KeyW');await page.waitForFunction(()=>window.__game.snapshot().engine.recovered.released===1);
 assert.equal(await page.evaluate(()=>window.__game.snapshot().engine.force),0);
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__game.snapshot().phase),'paused');
 await page.click('#photo');await page.mouse.move(800,450);await page.mouse.down();await page.mouse.move(1040,450,{steps:12});await page.mouse.up();await page.mouse.wheel(0,-280);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:'/tmp/mcm-preview-bike.png'});
 await page.keyboard.press('Escape');await page.click('#resume');await page.keyboard.press('KeyR');
 assert.equal(await page.evaluate(()=>window.__game.snapshot().engine.recovered.randomState),12345);
 await page.keyboard.press('Escape');await page.click('#home');await page.selectOption('#physics-mode','classic');await page.click('#start');
 assert.equal(await page.evaluate(()=>window.__game.snapshot().physicsMode),'classic');
 assert.equal(await page.locator('#preview-badge').isVisible(),false);
 await page.close();
 }
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});phone.on('pageerror',e=>errors.push(e.message));
 await phone.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low');});
 await phone.goto(process.env.GAME_URL||'http://127.0.0.1:5190',{waitUntil:'domcontentloaded'});await phone.waitForFunction(()=>window.__game);await phone.selectOption('#physics-mode','mcm-preview');
 await phone.screenshot({path:'/tmp/mcm-preview-mobile.png'});
 assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await phone.locator('#start').scrollIntoViewIfNeeded();assert.ok(await phone.locator('#start').isVisible());
 await phone.click('[data-mode=free]');await phone.click('#start');await phone.waitForFunction(()=>window.__game.snapshot().phase==='playing');
 await phone.evaluate(()=>{window.__touchEvents=[];for(const event of ['pointerdown','pointerup','pointercancel','lostpointercapture'])window.addEventListener(event,e=>window.__touchEvents.push({type:e.type,id:e.pointerId,target:e.target.id||e.target.dataset.control}),true);});
 const touch=await phone.context().newCDPSession(phone),gasBox=await phone.locator('[data-control=gas]').boundingBox(),stickBox=await phone.locator('#joystick').boundingBox();
 const gasPoint={x:gasBox.x+gasBox.width/2,y:gasBox.y+gasBox.height/2,id:1};
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[gasPoint]});
 await phone.waitForFunction(()=>window.__game.snapshot().elapsed>3);
 const straight=await phone.evaluate(()=>{const s=window.__game.snapshot();return {yaw:s.yaw,steer:s.steer,speed:s.speed,crashed:s.crashed};});
 assert.equal(straight.steer,0);assert.ok(Math.abs(straight.yaw)<.12);assert.ok(straight.speed>5);assert.equal(straight.crashed,false);
 for(const direction of [-1,1]){
  const stickPoint={x:stickBox.x+stickBox.width/2+direction*stickBox.width*.2,y:stickBox.y+stickBox.height/2,id:2};
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[gasPoint,stickPoint]});
  await phone.waitForFunction(direction=>window.__game.snapshot().steer*direction<-.01,direction);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[stickPoint]});
  await phone.waitForFunction(()=>Math.abs(window.__game.snapshot().steer)<.001,null,{timeout:8000}).catch(async e=>{console.error(await phone.evaluate(()=>({phase:window.__game.snapshot().phase,steer:window.__game.snapshot().steer,knob:document.querySelector('#joystick-knob').style.transform,events:window.__touchEvents})));throw e;});
 }
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await phone.waitForFunction(()=>window.__game.snapshot().engine.recovered.released===1);
 await phone.screenshot({path:'/tmp/mcm-preview-touch-free-ride.png'});
 assert.deepEqual(errors,[]);console.log('Touch Free Ride passed: throttle-only heading, both steering directions, stick release, throttle release.');
 assert.deepEqual(errors,[]);if(!process.env.PHONE_ONLY)console.log('Preview browser checks passed: selection, acceleration, steering, throttle release, pause/photo/reset, classic fallback, mobile layout.');
}finally{await browser.close();}
