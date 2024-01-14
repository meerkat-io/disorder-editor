const binary = require('../disorder/binary');

test('write then read boolean to binary', () => {
    const bytes = new binary.ByteArray();
    bytes.writeBoolean(true);
    bytes.writeBoolean(false);
    bytes.writeBoolean(true);
    expect(bytes.writeOffset).toBe(3);
    expect(bytes.readBoolean()).toBe(true);
    expect(bytes.readBoolean()).toBe(false);
    expect(bytes.readBoolean()).toBe(true);
    expect(bytes.readOffset).toBe(3);
});

test('write then read byte to binary', () => {
    const bytes = new binary.ByteArray();
    bytes.writeByte(0);
    bytes.writeByte(1);
    bytes.writeByte(255);
    expect(bytes.writeOffset).toBe(3);
    expect(bytes.readByte()).toBe(0);
    expect(bytes.readByte()).toBe(1);
    expect(bytes.readByte()).toBe(255);
    expect(bytes.readOffset).toBe(3);
});

test('write then read bytes to binary', () => {
    const bytes = new binary.ByteArray();
    const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    bytes.writeBytes(data);
    expect(bytes.writeOffset).toBe(8);
    expect(bytes.readBytes(8)).toEqual(data);
    expect(bytes.readOffset).toBe(8);
});

test('write then read int to binary', () => {
    const bytes = new binary.ByteArray();
    bytes.writeInt(0);
    bytes.writeInt(1);
    bytes.writeInt(-1);
    bytes.writeInt(2147483647);
    bytes.writeInt(-2147483648);
    expect(bytes.writeOffset).toBe(20);
    expect(bytes.readInt()).toBe(0);
    expect(bytes.readInt()).toBe(1);
    expect(bytes.readInt()).toBe(-1);
    expect(bytes.readInt()).toBe(2147483647);
    expect(bytes.readInt()).toBe(-2147483648);
    expect(bytes.readOffset).toBe(20);
});

test('write then read long to binary', () => {
    const bytes = new binary.ByteArray();
    bytes.writeLong(0n);
    bytes.writeLong(1n);
    bytes.writeLong(-1n);
    bytes.writeLong(9223372036854775807n);
    bytes.writeLong(-9223372036854775808n);
    expect(bytes.writeOffset).toBe(40);
    expect(bytes.readLong()).toBe(0n);
    expect(bytes.readLong()).toBe(1n);
    expect(bytes.readLong()).toBe(-1n);
    expect(bytes.readLong()).toBe(9223372036854775807n);
    expect(bytes.readLong()).toBe(-9223372036854775808n);
    expect(bytes.readOffset).toBe(40);
});

test('write then read float to binary', () => {
    const bytes = new binary.ByteArray();
    bytes.writeFloat(0.5);
    bytes.writeFloat(-0.5);
    bytes.writeFloat(-3.25);
    bytes.writeFloat(3.25);
    expect(bytes.writeOffset).toBe(16);
    expect(bytes.readFloat()).toBe(0.5);
    expect(bytes.readFloat()).toBe(-0.5);
    expect(bytes.readFloat()).toBe(-3.25);
    expect(bytes.readFloat()).toBe(3.25);
    expect(bytes.readOffset).toBe(16);
});

test('write then read double to binary', () => {
    const bytes = new binary.ByteArray();
    bytes.writeDouble(0.5);
    bytes.writeDouble(-0.5);
    bytes.writeDouble(3.25);
    bytes.writeDouble(-3.25);
    expect(bytes.writeOffset).toBe(32);
    expect(bytes.readDouble()).toBe(0.5);
    expect(bytes.readDouble()).toBe(-0.5);
    expect(bytes.readDouble()).toBe(3.25);
    expect(bytes.readDouble()).toBe(-3.25);
    expect(bytes.readOffset).toBe(32);
});

test('bytearray should resize automatically', () => {
    const bytes = new binary.ByteArray();
    for (let i = 0; i < 512; i++) {
        bytes.writeInt(i);
    }
    expect(bytes.writeOffset).toBe(2048);
    for (let i = 0; i < 512; i++) {
        expect(bytes.readInt()).toBe(i);
    }
    expect(bytes.readOffset).toBe(2048);
    expect(bytes.buffer.length).toBe(2048);
});