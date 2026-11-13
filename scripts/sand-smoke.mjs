import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],url=process.env.GAME_URL||'http://127.0.0.1:5194';
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('dust-valley-tutorial','1');localStorage.setItem('dust-valley-quality','high');});
 await page.goto(url);await page.waitForFunction(()=>window.__game);
 for(const handling of ['classic','mcm-preview']){
  await page.click('[data-mode=free]');await page.selectOption('#physics-mode',handling);await page.check('#sand-mode');await page.click('#start');
  await page.evaluate(()=>{window.__trail=[];const capture=()=>{const s=window.__game.snapshot();if(s.phase==='playing'){for(const c of s.wheelContacts||[])if(c&&s.speed>5)window.__trail.push({...c});requestAnimationFrame(capture);}};requestAnimationFrame(capture);});
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__game.snapshot().z>18);await page.keyboard.up('KeyW');await page.keyboard.press('Escape');
  const result=await page.evaluate(()=>{
   const samples=window.__trail.map(p=>({...p,...window.__game.sandSample(p.x,p.z)}));
   const best=samples.filter(p=>p.z>3&&p.z<14).sort((a,b)=>a.displacement-b.displacement)[0];
   window.__rut=best;return{best,samples:samples.length,sand:window.__game.environment().sand};
  });
  assert.ok(result.best?.displacement<-.025,`${handling}: expected visible moving-wheel rut, got ${JSON.stringify(result)}`);
  console.log(handling,result);
  if(handling==='classic'){
   await page.click('#photo');
   await page.evaluate(()=>{const renderer=window.__game.renderer,render=renderer.render.bind(renderer),p=window.__rut;window.__savedRender=render;
    renderer.render=(scene,camera)=>{const view=camera.clone();view.position.set(p.x+3.3,p.height+1.6,p.z-4.4);view.lookAt(p.x,p.height,p.z+1.8);view.updateMatrixWorld();render(scene,view);};
   });
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   await page.screenshot({path:'/tmp/dust-valley-sand-rut.png'});
   await page.evaluate(()=>{window.__game.renderer.render=window.__savedRender;});await page.keyboard.press('Escape');
  }
  await page.click('#home');
 }
 await page.uncheck('#sand-mode');await page.click('#start');assert.equal(await page.evaluate(()=>window.__game.sandSample(0,0)),null);
 assert.deepEqual(errors,[]);console.log('Sand smoke passed: actual rut depth in both handling modes, screenshot, hardpack opt-out, no browser errors.');
}finally{await browser.close();}
