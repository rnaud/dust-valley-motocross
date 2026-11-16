// Little-endian captured memory, usable in both the browser and native replay
// tools. from() copies; subarray() shares storage, like the original Buffer API.
export class CapturedBytes extends Uint8Array {
  static alloc(size) {
    if (!Number.isInteger(size) || size < 0 || size > 0x7fffffff) throw new RangeError('Invalid captured allocation size');
    return new CapturedBytes(size);
  }
  equals(other) {
    if (!(other instanceof Uint8Array)) throw new TypeError('Expected captured bytes');
    return this.length === other.length && this.every((value, index) => value === other[index]);
  }
  toString(encoding) {
    if (encoding !== 'hex') throw new TypeError('Captured bytes only support hex encoding');
    return Array.from(this, value => value.toString(16).padStart(2, '0')).join('');
  }
  static from(source, encoding) {
    if (typeof source !== 'string') {
      if (!(source instanceof Uint8Array) || encoding !== undefined) throw new TypeError('Expected captured bytes');
      return new CapturedBytes(source);
    }
    if (encoding !== 'hex' || source.length % 2 || !/^[0-9a-f]*$/i.test(source)) throw new TypeError('Invalid captured hex');
    const bytes = new CapturedBytes(source.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(source.slice(i * 2, i * 2 + 2), 16);
    return bytes;
  }
  view(offset, width) {
    if (!Number.isInteger(offset) || offset < 0 || offset + width > this.length) throw new RangeError('Captured memory offset out of range');
    return new DataView(this.buffer, this.byteOffset + offset, width);
  }
  readUInt8(offset = 0) { return this.view(offset, 1).getUint8(0); }
  readInt16LE(offset = 0) { return this.view(offset, 2).getInt16(0, true); }
  readUInt16LE(offset = 0) { return this.view(offset, 2).getUint16(0, true); }
  readUInt32LE(offset = 0) { return this.view(offset, 4).getUint32(0, true); }
  readInt32LE(offset = 0) { return this.view(offset, 4).getInt32(0, true); }
  readFloatLE(offset = 0) { return this.view(offset, 4).getFloat32(0, true); }
  writeUInt32LE(value, offset = 0) {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new RangeError('Invalid captured uint32');
    this.view(offset, 4).setUint32(0, value, true);
    return offset + 4;
  }
  writeInt32LE(value, offset = 0) {
    if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) throw new RangeError('Invalid captured int32');
    this.view(offset, 4).setInt32(0, value, true);
    return offset + 4;
  }
  writeFloatLE(value, offset = 0) {
    if (typeof value !== 'number') throw new TypeError('Invalid captured float');
    this.view(offset, 4).setFloat32(0, value, true);
    return offset + 4;
  }
}
