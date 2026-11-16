import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const touch=!!process.env.TOUCH,page=await browser.newPage(touch?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1100,height:800}}),errors=[];
 const cdp=touch?await page.context().newCDPSession(page):null;
 const throttleInput=async down=>{if(!touch)return down?page.keyboard.down('w'):page.keyboard.up('w');const box=await page.locator('[data-control=gas]').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:down?'touchStart':'touchEnd',touchPoints:down?[{x:box.x+box.width/2,y:box.y+box.height/2}]:[]});};page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low');});
 if(process.env.AUDIO_FAIL)await page.route('**/mcm-audio/bike.wav',route=>route.abort());
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5199');await page.selectOption('#physics-mode','mcm-preview');await page.click('[data-mode=free]');await page.uncheck('#sand-mode');await page.click('#start');
 await page.waitForFunction(()=>__game.snapshot().phase==='playing',null,{timeout:90000});await page.click('#sound');
 await page.waitForFunction(()=>__game.audio().ready||__game.audio().error,null,{timeout:60000});if(process.env.AUDIO_FAIL){assert.ok((await page.evaluate(()=>__game.audio())).error);const frame=await page.evaluate(()=>__game.snapshot().frame);await page.waitForFunction(frame=>__game.snapshot().frame>frame+5,frame,{timeout:30000});assert.equal((await page.evaluate(()=>__game.snapshot())).physicsError,undefined);assert.deepEqual(errors,[]);console.log(JSON.stringify({failureHandled:true,audio:await page.evaluate(()=>__game.audio())}));}else{assert.equal((await page.evaluate(()=>__game.audio())).error,null);
 await page.waitForFunction(()=>__game.audio().playing.some(s=>s.file==='idle.wav')&&__game.audio().rms>0,null,{timeout:30000});const idle=await page.evaluate(()=>__game.audio());
 await throttleInput(true);await page.waitForFunction(()=>__game.audio().playing.some(s=>s.file==='bike.wav')&&__game.audio().rms>0,null,{timeout:30000});const throttle=await page.evaluate(()=>__game.audio());
 await throttleInput(false);await page.waitForFunction(()=>__game.audio().playing.some(s=>s.file==='decel.wav'),null,{timeout:30000});const release=await page.evaluate(()=>__game.audio());
 await page.keyboard.press('Escape');await page.waitForFunction(()=>__game.snapshot().phase==='paused');await page.waitForTimeout(200);const paused=await page.evaluate(()=>__game.audio());await page.waitForTimeout(300);const pausedAgain=await page.evaluate(()=>__game.audio());assert.deepEqual(paused.playing,pausedAgain.playing);assert.equal(paused.ticks,pausedAgain.ticks);
 await page.click('#resume');await page.waitForFunction(()=>__game.snapshot().phase==='playing'&&__game.audio().rms>0);
 assert.deepEqual(errors,[]);assert.equal((await page.evaluate(()=>__game.snapshot())).physicsError,undefined);console.log(JSON.stringify({touch,idle,throttle,release,paused:pausedAgain,errors}));}await page.close();
}finally{await browser.close();}
