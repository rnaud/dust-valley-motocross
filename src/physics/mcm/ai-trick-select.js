// Original 0x49d6a0. Table from pinned PE 0x4ea3c0 (six 80-byte rows),
// durations from 0x4ea380. Random stream belongs to the application thread.
const f=Math.fround;
const nearestEven=x=>{const lo=Math.floor(x),p=x-lo;return p<.5?lo:p>.5?lo+1:lo%2===0?lo:lo+1;};
const table={"rows":[{"threshold":2.25,"counts":[16,8,8],"tricks":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]},{"threshold":2.0,"counts":[15,8,7],"tricks":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,15,0]},{"threshold":1.7699999809265137,"counts":[11,7,4],"tricks":[0,1,2,3,4,5,7,8,9,10,15,0,0,0,0,0]},{"threshold":1.5,"counts":[9,6,3],"tricks":[0,1,2,3,5,7,8,9,10,0,0,0,0,0,0,0]},{"threshold":1.3300000429153442,"counts":[4,2,2],"tricks":[3,7,9,10,0,0,0,0,0,0,0,0,0,0,0,0]},{"threshold":1.0,"counts":[1,1,0],"tricks":[7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}],"durations":[1.5,1.5,1.5,1.3300000429153442,1.7699999809265137,1.5,2.0,1.0,1.5,1.3300000429153442,1.3300000429153442,2.0,2.0,2.0,2.25,1.7699999809265137],"subtract":0.5,"scale":0.800000011920929};
export function selectMcmAiTrick({flightTime,selector,delayEnabled,selected,delay},random){
 const row=table.rows.find(r=>r.threshold<flightTime||Number.isNaN(flightTime));
 if(!row||![0,1,2].includes(selector))return {success:0,selected,delay};
 let count=row.counts[selector],offset=0;
 if(selector===2){if(count===0)count=row.counts[1];else offset=row.counts[1];}
 // Original FISTP rounds the stored float to nearest, ties to even.
 selected=row.tricks[offset+nearestEven(f(random.draw()/32768*count-.5))];
 if(delayEnabled)delay=f(random.draw()/32768*f(flightTime-table.durations[selected])*f(.8));
 return {success:1,selected,delay};
}
