// Full collision allocations are observed; checkpoint variants may restore
// selected controls. Linked entries and pair flags belong to the shared world.
export function decodeRiderCollision(row){
 const c=row.riderCollision;if(!c)throw Error('Missing rider collision observation');
 const hex=(s,n)=>{if(typeof s!=='string'||s.length!==n*2||!/^[0-9a-f]*$/i.test(s))throw Error('Invalid rider collision bytes');return Buffer.from(s,'hex');};
 const state=hex(c.stateHex,0x110),id=state.readUInt32LE(),count=state.readUInt32LE(0x90);
 for(const key of ['address','entriesAddress','managerAddress','enabled'])if(!Number.isInteger(c[key])||c[key]<0||c[key]>0xffffffff)throw Error('Invalid rider collision metadata');
 if(!c.address||!c.managerAddress||id>=60||count>128||(!c.entriesAddress&&count))throw Error('Invalid rider collision allocation');
 const rider=hex(row.riderHex,0x3ac);
 if(rider.readUInt32LE(0x34)!==c.address||state.readUInt32LE(0x94)!==parseInt(row.riderAddress,16)||state.readUInt32LE(0x8c)!==c.entriesAddress||state.readUInt32LE(0x98)!==c.managerAddress)throw Error('Rider collision ownership differs');
 const entries=hex(c.entriesHex,count*0x18),pairRow=hex(c.pairRowHex,240),pairColumn=hex(c.pairColumnHex,240);
 if(pairRow.readUInt32LE(id*4)!==pairColumn.readUInt32LE(id*4))throw Error('Collision pair diagonal differs');
 return {state,entries,pairRow,pairColumn,id,count,address:c.address,managerAddress:c.managerAddress,entriesAddress:c.entriesAddress,enabled:c.enabled,
  callbacks:[state.readUInt32LE(0x108),state.readUInt32LE(0x10c)],contactAddress:state.readUInt32LE(0x88),type:state.readUInt32LE(0xf4)};
}
export function compareRiderCollision(rows){
 const passes=[0,1].map(pass=>rows.filter(r=>r.pass===pass));
 if(!passes[0].length||passes[0].length!==passes[1].length)throw Error('Incomplete collision passes');
 const differences={},first=[];
 const record=(field,a,b,row)=>{if(a===b)return;const old=differences[field];differences[field]=old?{...old,records:old.records+1}:{records:1,frame:row.playerFrame,phase:row.phase,a,b};if(!old)first.push({field,...differences[field]});};
 for(let i=0;i<passes[0].length;i++){
  const a=passes[0][i],b=passes[1][i];if(a.phase!==b.phase||a.playerFrame!==b.playerFrame)throw Error('Mispaired collision boundaries');
  const x=decodeRiderCollision(a),y=decodeRiderCollision(b);
  for(const field of ['address','managerAddress','entriesAddress','enabled','count'])record(field,x[field],y[field],a);
  for(const field of ['state','entries','pairRow','pairColumn'])for(let o=0;o<Math.max(x[field].length,y[field].length);o+=4)record(`${field}+0x${o.toString(16)}`,o<x[field].length?x[field].readUInt32LE(o):null,o<y[field].length?y[field].readUInt32LE(o):null,a);
 }
 return {scope:'Observed rider collider, entries and shared pair row/column; restoration coverage is defined by each checkpoint. Full grid and other objects not captured.',differences,firstDifferences:first.slice(0,20)};
}
