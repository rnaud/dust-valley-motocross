import test from 'node:test';
import assert from 'node:assert/strict';
import {CapturedBytes} from '../src/physics/mcm/captured-bytes.js';
test('captured byte views preserve native words, slice offsets and independent copies',()=>{
 const hex='0000803f000000800000c07fffffffff010080ff';
 const bytes=CapturedBytes.from(hex,'hex'),native=Buffer.from(hex,'hex');
 for(let o=0;o+4<=bytes.length;o++){
  assert.equal(bytes.readUInt32LE(o),native.readUInt32LE(o));
  assert.equal(bytes.readInt32LE(o),native.readInt32LE(o));
  assert.ok(Object.is(bytes.readFloatLE(o),native.readFloatLE(o)));
 }
 assert.equal(bytes.toString('hex'),hex);
 const view=bytes.subarray(4,12),copy=CapturedBytes.from(view);
 assert.equal(view.readInt32LE(),-2147483648);
 view.writeFloatLE(-0,4);assert.equal(bytes.readUInt32LE(8),0x80000000);
 assert.equal(copy.readUInt32LE(4),0x7fc00000);
 assert.equal(bytes.equals(native),false);
 for(const value of [-2147483648,-1,0,2147483647]){view.writeInt32LE(value,0);assert.equal(view.readInt32LE(0),value);assert.equal(bytes.readInt32LE(4),value);}
 for(const value of [-2147483649,2147483648,NaN,1.5])assert.throws(()=>view.writeInt32LE(value),RangeError);
 for(const [source,encoding] of [['abc','hex'],['zz','hex'],['00','utf8']])assert.throws(()=>CapturedBytes.from(source,encoding));
 for(const offset of [-1,.5,bytes.length-3])assert.throws(()=>bytes.readUInt32LE(offset),RangeError);
 for(const value of [undefined,-1,0x100000000,NaN])assert.throws(()=>bytes.writeUInt32LE(value),RangeError);
});
