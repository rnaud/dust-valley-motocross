import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
// Diagnose call-boundary evidence only; never feed observed words into physics.
export function analyzeHudStack(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('Missing HUD stack observations');
 let refreshes=0,calls=0,clears=0;const changes=[],offsets=new Set(),targets=new Set();
 let phase='configured',pending=null;
 for(const row of rows){
  if(row.refresh!==refreshes||!Number.isInteger(row.scratchAddress)||!row.scratchAddress)throw Error('Incomplete HUD refresh sequence');
  if(row.phase!==phase&&!(phase==='row-formatted'&&row.phase==='returned'))throw Error('Unexpected HUD call order');
  if(row.phase==='configured')phase='font-selected';
  else if(row.phase==='font-selected')phase='heading-drawn';
  else if(row.phase==='heading-drawn')phase='row-formatted';
  else if(row.phase==='row-formatted')phase='before-draw-text';
  else if(row.phase==='before-draw-text'){
   if(row.instruction!==0x423f52||row.format!==0x124||!Number.isInteger(row.length)||row.length<0||row.textHex?.length!==row.length*2||!/^[0-9a-f]*$/i.test(row.textHex)||row.rect?.length!==4)throw Error('Unsupported DrawTextA observation');
   pending=row;phase='row-drawn';
  }else if(row.phase==='row-drawn'){
   if(row.instruction!==0x423f58||row.esp!==pending.esp+20||row.scratchAddress!==pending.scratchAddress)throw Error('DrawTextA call boundary differs');
   calls++;offsets.add(pending.esp-pending.scratchAddress);targets.add(pending.target);
   if(pending.scratchBits!==row.scratchBits)changes.push({refresh:row.refresh,before:pending.scratchBits,after:row.scratchBits});
   if(pending.scratchBits&&row.scratchBits===0)clears++;
   pending=null;phase='row-formatted';
  }else{refreshes++;phase='configured';}
 }
 if(phase!=='configured'||pending)throw Error('Truncated HUD refresh');
 return {refreshes,calls,nonzeroToZero:clears,changes,offsetsBelowCallEsp:[...offsets],targets:[...targets]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const rows=fs.readFileSync(process.argv[2],'utf8').trim().split(/\r?\n/).map(line=>JSON.parse(line));
 console.log(JSON.stringify(analyzeHudStack(rows),null,2));
}
