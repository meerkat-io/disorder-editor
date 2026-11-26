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
    const enumReference = new Type(Type.ENUM_REFERENCE);
    enumReference.reference = enumType;

    const writer = new Writer();
    writer.write('blue', enumType);
    writer.write('red', enumReference);

    const reader = new Reader(writer.bytes);
    expect(reader.read()).toBe('blue');
    expect(reader.read()).toBe('red');

    expect(() => writer.write('white', schema.getEnum('test.color'))).toThrow(new Error("value white is not a enum of [red,green,blue]"));
});

test('read and write array & map', () => {
    const array = ['hello', 'world'];
    const arrayType = new Type(Type.ARRAY);
    arrayType.reference = new Type(Type.STRING);

    const map = new Map();
    map.set('foo', 'hello');
    map.set('bar', 'world');
    const mapType = new Type(Type.MAP);
    mapType.reference = new Type(Type.STRING);

    const writer = new Writer();
    writer.write(array, arrayType);
    writer.write(map, mapType);

    const reader = new Reader(writer.bytes);
    assert.deepEqual(reader.read(), array);
    assert.deepEqual(reader.read(), map);

    const zeroArray = [];
    const zeroMap = new Map();
    writer.write(zeroArray, arrayType);
    writer.write(zeroMap, mapType);
    assert.deepEqual(reader.read(), zeroArray);
    assert.deepEqual(reader.read(), zeroMap);
});

test('read and write message', () => {
    const schema = new Schema();
    schema.load('./tests/data/schema.yaml');

    const structType = schema.getMessage('test.object');
    const structReference = new Type(Type.STRUCT_REFERENCE);
    structReference.reference = structType;

    const time = new Date().getTime();
    const number = new Map();
    number.set('value', 789);
    const object = new Map();
    object.set('bool_field', true);
    object.set('int_field', 123);
    object.set('string_field', 'foo');
    object.set('bytes_field', new Uint8Array([4, 5, 6]));
    object.set('enum_field', 'blue');
    object.set('time_field', new Date(time));
    object.set('obj_field', number);
    object.set('int_array', [1, 2, 3]);
    object.set('int_map', new Map());
    object.get('int_map').set('foo', 1);
    object.get('int_map').set('bar', 2);
    object.set('obj_array', [number, number]);
    object.set('obj_map', new Map());
    object.get('obj_map').set('foo', number);
    object.get('obj_map').set('bar', number);

    const writer = new Writer();
    writer.write(object, structType);
    writer.write(object, structReference);

    const reader = new Reader(writer.bytes);
    assert.deepEqual(reader.read(), object);
    assert.deepEqual(reader.read(), object);
});

test('read and write loop message', () => {
    //TODO: test loop message
    const schema = new Schema();
    schema.load('./tests/data/loop_object.yaml');

    const loopType = schema.getMessage('test.loop');
    const loopObject = new Map();
    loopObject.set('id', 1);
    loopObject.set('sub', new Map());
    loopObject.get('sub').set('id', 2);
    loopObject.get('sub').set('sub', new Map());

    const writer = new Writer();
    writer.write(loopObject, loopType);

    const reader = new Reader(writer.bytes);
    assert.deepEqual(reader.read(), loopObject);
});

describe('ByteArray', () => {
    test('grows enough for a single write larger than the buffer', () => {
        const bytes = new ByteArray();
        const data = new Uint8Array(5000).fill(7);
        bytes.writeBytes(data);
        expect(bytes.writeOffset).toBe(5000);
        expect(bytes.readBytes(5000)).toEqual(data);
    });

    test('grows from an empty buffer', () => {
        const bytes = new ByteArray(new Uint8Array(0));
        bytes.writeInt(42);
        expect(bytes.readInt()).toBe(42);
    });

    test('appends after wrapped content and keeps it readable', () => {
        const bytes = new ByteArray(new Uint8Array([0, 0, 0, 1]));
        bytes.writeInt(2);
        expect(bytes.readInt()).toBe(1);
        expect(bytes.readInt()).toBe(2);
    });

    test('is big-endian', () => {
        const bytes = new ByteArray();
        bytes.writeInt(0x01020304);
        expect(bytes.toBytes()).toEqual(new Uint8Array([1, 2, 3, 4]));
    });

    test('throws on reading past the written data, not the padded buffer', () => {
        const bytes = new ByteArray();
        bytes.writeByte(1);
        bytes.readByte();
        expect(() => bytes.readByte()).toThrow('unexpected EOF');
        expect(() => bytes.readInt()).toThrow('unexpected EOF');
    });

    test('toBytes returns only the written bytes', () => {
        const bytes = new ByteArray();
        bytes.writeByte(9);
        expect(bytes.toBytes()).toEqual(new Uint8Array([9]));
    });
});

describe('Writer', () => {
    const roundTrip = (value, type) => {
        const writer = new Writer();
        writer.write(value, type);
        return Reader.fromWriter(writer).read();
    };

    test('encodes strings by UTF-8 byte length', () => {
        const text = 'héllo ✓ 日本語 😀';
        expect(roundTrip(text, new Type(Type.STRING))).toBe(text);

        const writer = new Writer();
        writer.write('é', new Type(Type.STRING));
        // tag + int length (2 bytes for é) + payload
        expect(writer.toBytes()).toEqual(new Uint8Array([11, 0, 0, 0, 2, 0xc3, 0xa9]));
    });

    test('round-trips an empty string', () => {
        expect(roundTrip('', new Type(Type.STRING))).toBe('');
    });

    test('rejects empty map keys like the Go encoder', () => {
        const writer = new Writer();
        expect(() => writer.write(new Map([['', 'x']]), new Type('map[string]'))).toThrow('map key cannot be empty');
    });

    test('writes map keys sorted by UTF-8 bytes, independent of insertion order', () => {
        const type = new Type('map[int]');
        const encode = (entries) => {
            const writer = new Writer();
            writer.write(new Map(entries), type);
            return writer.toBytes();
        };
        const a = encode([['b', 1], ['a', 2], ['é', 3], ['😀', 4], ['\uffee', 5]]);
        const b = encode([['😀', 4], ['\uffee', 5], ['é', 3], ['a', 2], ['b', 1]]);
        expect(a).toEqual(b);
        // UTF-8 byte order: a, b, é (c3), U+FFEE (ef), 😀 (f0); UTF-16 order would put 😀 before U+FFEE
        const keys = Array.from(Reader.fromBytes(a).read().keys());
        expect(keys).toEqual(['a', 'b', 'é', '\uffee', '😀']);
    });

    test('round-trips values larger than the initial buffer', () => {
        const big = 'x'.repeat(10000);
        expect(roundTrip(big, new Type(Type.STRING))).toBe(big);
        const bytes = new Uint8Array(4096).fill(3);
        expect(roundTrip(bytes, new Type(Type.BYTES))).toEqual(bytes);
    });

    test('round-trips 64-bit extremes and timestamps', () => {
        const long = new Type(Type.LONG);
        expect(roundTrip(9223372036854775807n, long)).toBe(9223372036854775807n);
        expect(roundTrip(-9223372036854775808n, long)).toBe(-9223372036854775808n);
        const date = new Date(-1000);
        expect(roundTrip(date, new Type(Type.TIMESTAMP))).toEqual(date);
    });

    test('rejects values of the wrong type or out of range', () => {
        const writer = new Writer();
        expect(() => writer.write('1', new Type(Type.INT))).toThrow('not a 32-bit integer');
        expect(() => writer.write(1.5, new Type(Type.INT))).toThrow('not a 32-bit integer');
        expect(() => writer.write(2 ** 31, new Type(Type.INT))).toThrow('not a 32-bit integer');
        expect(() => writer.write(1, new Type(Type.LONG))).toThrow('not a long');
        expect(() => writer.write(2n ** 63n, new Type(Type.LONG))).toThrow('out of 64-bit range');
        expect(() => writer.write(1, new Type(Type.BOOL))).toThrow('not a boolean');
        expect(() => writer.write(new Date(NaN), new Type(Type.TIMESTAMP))).toThrow('invalid Date');
        expect(() => writer.write({}, new Type('array[int]'))).toThrow('not a array');
    });

    test('rejects names longer than 255 bytes', () => {
        const writer = new Writer();
        const map = new Map([['k'.repeat(256), 'v']]);
        expect(() => writer.write(map, new Type('map[string]'))).toThrow('name too long');
    });

    test('omits struct fields that are not set', () => {
        const schema = new Schema();
        schema.load('./tests/data/schema.yaml');
        const type = schema.getMessage('test.sub');
        expect(roundTrip(new Map(), type)).toEqual(new Map());
    });
});

describe('Reader', () => {
    test('throws on an unknown tag', () => {
        expect(() => Reader.fromBytes(new Uint8Array([99])).read()).toThrow('unexpected tag 99');
    });

    test('throws on truncated data', () => {
        const writer = new Writer();
        writer.write('hello', new Type(Type.STRING));
        const truncated = writer.toBytes().slice(0, 6);
        expect(() => Reader.fromBytes(truncated).read()).toThrow('unexpected EOF');
        // unterminated array
        expect(() => Reader.fromBytes(new Uint8Array([21, 2, 0, 0, 0, 1])).read()).toThrow('unexpected EOF');
    });

    test('throws on a negative length', () => {
        expect(() => Reader.fromBytes(new Uint8Array([11, 255, 255, 255, 255])).read()).toThrow('invalid length');
    });

    test('reads nested containers', () => {
        const type = new Type('map[array[map[int]]]');
        const value = new Map([['a', [new Map([['x', 1]]), new Map()]], ['b', []]]);
        const writer = new Writer();
        writer.write(value, type);
        expect(Reader.fromWriter(writer).read()).toEqual(value);
    });

    test('hasMore reflects unread data', () => {
        const writer = new Writer();
        writer.write(true, new Type(Type.BOOL));
        const reader = Reader.fromWriter(writer);
        expect(reader.hasMore()).toBe(true);
        reader.read();
        expect(reader.hasMore()).toBe(false);
    });
});
