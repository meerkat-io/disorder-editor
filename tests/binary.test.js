// @ts-nocheck
const assert = require('assert');
const { ByteArray, Reader, Writer } = require('../disorder/binary');
const { Type, Schema } = require('../disorder/schema');

test('write then read boolean to ByteArray', () => {
    const bytes = new ByteArray();
    bytes.writeBoolean(true);
    bytes.writeBoolean(false);
    bytes.writeBoolean(true);
    expect(bytes.writeOffset).toBe(3);
    expect(bytes.readBoolean()).toBe(true);
    expect(bytes.readBoolean()).toBe(false);
    expect(bytes.readBoolean()).toBe(true);
    expect(bytes.readOffset).toBe(3);
});

test('write then read byte to ByteArray', () => {
    const bytes = new ByteArray();
    bytes.writeByte(0);
    bytes.writeByte(1);
    bytes.writeByte(255);
    expect(bytes.writeOffset).toBe(3);
    expect(bytes.readByte()).toBe(0);
    expect(bytes.readByte()).toBe(1);
    expect(bytes.readByte()).toBe(255);
    expect(bytes.readOffset).toBe(3);
});

test('write then read bytes to ByteArray', () => {
    const bytes = new ByteArray();
    const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    bytes.writeBytes(data);
    expect(bytes.writeOffset).toBe(8);
    expect(bytes.readBytes(8)).toEqual(data);
    expect(bytes.readOffset).toBe(8);
});

test('write then read int to ByteArray', () => {
    const bytes = new ByteArray();
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

test('write then read long to ByteArray', () => {
    const bytes = new ByteArray();
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

test('write then read float to ByteArray', () => {
    const bytes = new ByteArray();
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

test('write then read double to ByteArray', () => {
    const bytes = new ByteArray();
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
    const bytes = new ByteArray();
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

test('read and write primary types', () => {
    const writer = new Writer();
    const time = new Date().getTime();
    writer.write(true, new Type(Type.BOOL));
    writer.write(-123, new Type(Type.INT));
    writer.write(-123456789n, new Type(Type.LONG));
    writer.write(-3.25, new Type(Type.FLOAT));
    writer.write(3.25, new Type(Type.DOUBLE));
    writer.write(new Uint8Array([1, 2, 3]), new Type(Type.BYTES));
    writer.write('hello world', new Type(Type.STRING));
    writer.write(new Date(time), new Type(Type.TIMESTAMP));

    const reader = new Reader(writer.bytes);
    expect(reader.read()).toBe(true);
    expect(reader.read()).toBe(-123);
    expect(reader.read()).toBe(-123456789n);
    expect(reader.read()).toBe(-3.25);
    expect(reader.read()).toBe(3.25);
    expect(reader.read()).toEqual(new Uint8Array([1, 2, 3]));
    expect(reader.read()).toBe('hello world');
    expect(reader.read()).toEqual(new Date(time));
});

test('read and write enum', () => {
    const schema = new Schema();
    schema.load('./tests/data/enum.yaml');

    const enumType = schema.getEnum('test.color');

    const writer = new Writer();
    writer.write('blue', enumType);

    const reader = new Reader(writer.bytes);
    expect(reader.read()).toBe('blue');
    expect(() => writer.write('white', schema.getEnum('test.color'))).toThrow(new Error("value white is not a enum of [red,green,blue]"));
});

test('read and write array & map', () => {
    const array = ['hello', 'world'];
    const arrayType = new Type(Type.ARRAY);
    arrayType.reference = new Type(Type.STRING);

    const map = [{ key: 'foo', value: 'hello' }, { key: 'bar', value: 'world' }];
    const mapType = new Type(Type.MAP);
    mapType.reference = new Type(Type.STRING);

    const writer = new Writer();
    writer.write(array, arrayType);
    writer.write(map, mapType);

    const reader = new Reader(writer.bytes);
    assert.deepEqual(reader.read(), array);
    assert.deepEqual(reader.read(), map);

    const zeroArray = [];
    const zeroMap = [];
    writer.write(zeroArray, arrayType);
    writer.write(zeroMap, mapType);
    assert.deepEqual(reader.read(), zeroArray);
    assert.deepEqual(reader.read(), zeroMap);
});

test('read and write struct', () => {
    const schema = new Schema();
    schema.load('./tests/data/schema.yaml');

    const structType = schema.getMessage('test.object');

    const time = new Date().getTime();
    const number = [{ key: 'value', value: 789 }];
    const object = [];
    object.push({ key: 'bool_field', value: true });
    object.push({ key: 'int_field', value: 123 });
    object.push({ key: 'long_field', value: 9007199254740991n });
    object.push({ key: 'string_field', value: 'foo' });
    object.push({ key: 'bytes_field', value: new Uint8Array([4, 5, 6]) });
    object.push({ key: 'enum_field', value: 'blue' });
    object.push({ key: 'time_field', value: new Date(time) });
    object.push({ key: 'obj_field', value: number });
    object.push({ key: 'int_array', value: [1, 2, 3] });
    object.push({ key: 'int_map', value: [{ key: 'foo', value: 1 }, { key: 'bar', value: 2 }] });
    object.push({ key: 'obj_array', value: [number, number] });
    object.push({ key: 'obj_map', value: [{ key: 'foo', value: number }, { key: 'bar', value: number }] });
    object.push({ key: 'nested', value: [{ key: 'level0', value: [{ key: 'level1', value: [[[{ key: 'level2', value: 'red' }]]] }] }] });
    object.push({ key: 'sub', value: [{ key: 'sub', value: [{ key: 'sub', value: [{ key: 'value', value: 456 }] }] }] });

    const writer = new Writer();
    writer.write(object, structType);

    const reader = new Reader(writer.bytes);
    assert.deepEqual(reader.read(), object);
});

test('loop struct is not allowed', () => {
    //TODO check loop struct
    //TODO check other invalid schema
});
