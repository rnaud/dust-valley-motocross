import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{for(const touch of [false,true]){
 const page=await browser.newPage(touch?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1200,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Make display frames 120 Hz while retaining real game physics scheduling.
 // This makes repeated render frames within each 50 Hz physics step deterministic.
 // Apply to the scheduler itself: production minification changes callback names.
 await page.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','low');const clocks=new WeakMap();window.requestAnimationFrame=cb=>setTimeout(()=>{const clock=(clocks.get(cb)??performance.now())+1000/120;clocks.set(cb,clock);cb(clock);},8);});
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5198');await page.selectOption('#physics-mode','mcm-preview');await page.click('[data-mode=free]');await page.uncheck('#sand-mode');await page.click('#start');await page.waitForFunction(()=>__game.snapshot().phase==='playing',null,{timeout:90000});
 await page.evaluate(()=>{window.poseFrames=[];const renderer=__game.renderer,original=renderer.render.bind(renderer);renderer.render=(scene,camera)=>{const root=scene.getObjectByName('mcm-original-models'),s=__game.snapshot();if(root&&s.phase==='playing'&&poseFrames.length<300){const rider=root.children.find(p=>p.name.startsWith('mcm-rider-')),bike=root.children.find(p=>p.name.startsWith('mcm-bike-'));poseFrames.push({frame:s.frame,rider:rider.matrix.elements.slice(12,15),bike:bike.matrix.elements.slice(12,15)});}return original(scene,camera);};});
 let touchSession;
 if(touch){touchSession=await page.context().newCDPSession(page);const b=await page.locator('[data-control=gas]').boundingBox();await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});}else await page.keyboard.down('w');
 await page.waitForFunction(()=>poseFrames.length>=100,null,{timeout:90000});
 const result=await page.evaluate(()=>{let repeated=0,riderMoves=0,bikeMoves=0;for(let i=1;i<poseFrames.length;i++){const a=poseFrames[i-1],b=poseFrames[i];if(a.frame===b.frame){repeated++;if(a.rider.some((v,j)=>Math.abs(v-b.rider[j])>1e-8))riderMoves++;if(a.bike.some((v,j)=>Math.abs(v-b.bike[j])>1e-8))bikeMoves++;}}return {repeated,riderMoves,bikeMoves,physicsError:__game.snapshot().physicsError,phase:__game.snapshot().phase};});
 console.log(JSON.stringify({touch,...result,errors}));assert.ok(result.repeated>20);assert.ok(result.riderMoves>20);assert.ok(result.bikeMoves>20);assert.equal(result.phase,'playing');assert.equal(result.physicsError,undefined);assert.deepEqual(errors,[]);
 if(touch)await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('w');
 await page.screenshot({path:`/tmp/mcm-rider-interpolation-${touch?'touch':'desktop'}.png`});await page.close();
}}finally{await browser.close();}
