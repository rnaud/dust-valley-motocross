import assert from 'node:assert/strict';
// 4a52c0..4a54b6: constructors are no-ops; pushes save four registers and
// explicit stores clear three words. Transform restoration does not write bike
// bytes or these stack locals. Incoming stack bytes remain explicit evidence.
export function analyzeBikePrefix(entry,rows){
 assert.ok(rows.length>0&&rows.length%2===0,'Incomplete bike prefix');
 const differences=[],calls=[];let words=0;
 for(let i=0;i<rows.length;i+=2){
  const before=rows[i],after=rows[i+1];assert.equal(before.sequence,i);assert.equal(after.sequence,i+1);
  assert.equal(before.phase,'before-prefix');assert.equal(after.phase,'after-prefix');
  for(const key of ['bike','thread','stackAddress'])assert.equal(before[key],after[key]);assert.ok(entry.bikes.includes(before.bike));
  assert.equal(before.savedRegisters.length,4);
  const stack=Buffer.from(before.stackHex,'hex');assert.equal(stack.length,0xc00);
  before.savedRegisters.forEach((v,j)=>stack.writeUInt32LE(v>>>0,j*4));for(const offset of [0x1c,0x2c,0x30])stack.writeUInt32LE(0,offset);
  for(const [name,actual,hex,size]of [['stack',stack,after.stackHex,0xc00],['body',Buffer.from(before.bodyHex,'hex'),after.bodyHex,0xcc8]]){
   const expected=Buffer.from(hex,'hex');assert.equal(actual.length,size);assert.equal(expected.length,size);
   for(let offset=0;offset<size;offset+=4){words++;const a=actual.readUInt32LE(offset),e=expected.readUInt32LE(offset);if(a!==e)differences.push({call:i/2,name,offset,actual:a,expected:e});}
  }
  calls.push({bike:before.bike,stackAddress:before.stackAddress,caller:stack.readUInt32LE(0xbf8),deltaBits:stack.readUInt32LE(0xbfc)});
 }
 // Diagnose writes before the first bike entry separately; never substitute its
 // later stack bytes for the initial world image or claim these writers modeled.
 const worldStack=Buffer.from(entry.stackHex,'hex'),first=rows[0],stack=Buffer.from(first.stackHex,'hex'),offset=first.stackAddress-entry.stackAddress;
 assert.ok(offset>=0&&offset+stack.length<=worldStack.length,'World stack does not cover first bike');
 const incomingDifferences=[];
 for(let i=0;i<stack.length;i+=4){const initial=worldStack.readUInt32LE(offset+i),observed=stack.readUInt32LE(i);if(initial!==observed)incomingDifferences.push({offset:i,initial,observed});}
 const firstCallStack=Buffer.from(worldStack.subarray(offset,offset+stack.length));
 assert.equal(first.bike,entry.bikes[0],'Expected player first');
 firstCallStack.writeUInt32LE(0x459126,0xbf8);firstCallStack.writeUInt32LE(entry.dtBits,0xbfc);
 const firstCallDifferences=[];
 for(let i=0;i<stack.length;i+=4){const actual=firstCallStack.readUInt32LE(i),expected=stack.readUInt32LE(i);if(actual!==expected)firstCallDifferences.push({offset:i,actual,expected});}
 return {firstCallDifferences,scope:'Prefix stack/body assertions with explicit incoming stack; transform side effects and pre-bike world writers remain outside this comparison',calls,words,differences,incomingDifferences};
}
