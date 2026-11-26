// @ts-nocheck
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Disorder } = require('../disorder/disorder');
const { Schema } = require('../disorder/schema');
const { Reader, Writer } = require('../disorder/binary');

const schema = new Schema();
schema.load('./tests/data/schema.yaml');
const type = schema.getMessage('test.data');

const header = new Map([
    ['schema', '../schema.yaml'],
    ['message', 'test.data'],
    ['container', 'none'],
]);
const value = new Map([
    ['number_data', 42],
    ['string_data', 'héllo'],
    ['bool_data', true],
    ['color_data', 'green'],
    ['time_data', new Date(1700000000000)],
]);

test('encode/decode round trip', () => {
    const { header: h, value: v } = Disorder.decode(Disorder.encode(header, type, value));
    expect(h).toEqual(header);
    expect(v).toEqual(value);
});

test('encode produces no padding after the value', () => {
    const bytes = Disorder.encode(header, type, new Map());
    const reader = Reader.fromBytes(bytes);
    reader.read();
    reader.read();
    expect(reader.hasMore()).toBe(false);
});

test('decode of a header-only file has an undefined value', () => {
    const writer = new Writer();
    writer.write(header, Disorder.HEADER_TYPE);
    const { header: h, value: v } = Disorder.decode(writer.toBytes());
    expect(h).toEqual(header);
    expect(v).toBeUndefined();
});

test('decode rejects truncated data', () => {
    const bytes = Disorder.encode(header, type, value);
    expect(() => Disorder.decode(bytes.slice(0, bytes.length - 3))).toThrow('unexpected EOF');
});

describe('files', () => {
    let dir;
    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'disorder-file-'));
    });
    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    test('write then read', () => {
        const file = path.join(dir, 'data.dbin');
        Disorder.write(header, type, value, file);
        expect(fs.statSync(file).size).toBe(Disorder.encode(header, type, value).length);

        const { header: h, value: v } = Disorder.read(file);
        expect(h).toEqual(header);
        expect(v).toEqual(value);
    });

    test('read throws for a missing file', () => {
        expect(() => Disorder.read(path.join(dir, 'missing.dbin'))).toThrow();
    });
});
