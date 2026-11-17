import {chromium} from '@playwright/test';
import fs from 'node:fs';
const directory=process.env.SCREENSHOT_DIR||'/tmp/mcm-art-styles';
const styles=[['original','Original'],['moebius','Hiraeth / Moebius'],['voxel','Voxel dunes']];
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:440},deviceScaleFactor:1});
 await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#101816;color:#eff4e8;font:18px system-ui;padding:24px}h1{font-size:26px;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}article{background:#23302a;border-radius:8px;overflow:hidden}img{display:block;width:100%}h2{font-size:17px;margin:12px 16px}</style><h1>Dust Valley · Art style experiments</h1><div class="grid">${styles.map(([id,title])=>`<article><img src="data:image/png;base64,${fs.readFileSync(`${directory}/${id}.png`).toString('base64')}"><h2>${title}</h2></article>`).join('')}</div>`);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
 await page.screenshot({path:`${directory}/comparison.png`,fullPage:true});
}finally{await browser.close();}
