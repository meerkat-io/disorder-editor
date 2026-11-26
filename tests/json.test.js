const path = require('path');
const { Schema, Type } = require('../disorder/schema');
const { Disorder } = require('../disorder/disorder');
const { DisorderJson, toJson, fromJson } = require('../disorder/json');
const { rootType } = require('../disorder/view');

const schema = new Schema();
schema.load(path.join(__dirname, 'data', 'schema.yaml'));
const objectType = schema.getMessage('test.object');
const dataType = schema.getMessage('test.data');

const header = new Map([['schema', 'schema.yaml'], ['message', 'test.data'], ['container', 'none']]);
const text = bytes => Buffer.from(bytes).toString('utf8');
const file = doc => new Uint8Array(Buffer.from(JSON.stringify(doc)));

describe('json value mapping', () => {
    test('round-trips every primitive type through binary', () => {
        const value = new Map([
            ['bool_field', true],
            ['int_field', -5],
            ['string_field', 'héllo'],
            ['bytes_field', new Uint8Array([0, 1, 255])],
            ['enum_field', 'green'],
            ['time_field', new Date('2024-05-06T07:08:09.123Z')],
            ['int_array', [1, 2, 3]],
            ['int_map', new Map([['b', 2], ['a', 1]])],
        ]);
        const json = toJson(value, objectType);
        expect(json.bytes_field).toBe('AAH/');
        expect(json.time_field).toBe('2024-05-06T07:08:09.123Z');
        expect(Object.keys(json.int_map)).toEqual(['a', 'b']);

        const back = fromJson(JSON.parse(JSON.stringify(json)), objectType);
        const bytes = Disorder.encode(header, objectType, back);
        expect(Disorder.decode(bytes).value).toEqual(Disorder.decode(Disorder.encode(header, objectType, value)).value);
    });

    test('long is a decimal string and keeps full precision', () => {
        const t = new Type('long');
        expect(toJson(9007199254740993n, t)).toBe('9007199254740993');
        expect(fromJson('9007199254740993', t)).toBe(9007199254740993n);
        expect(fromJson(12, t)).toBe(12n);
        expect(() => fromJson('9223372036854775808', t)).toThrow('out of 64-bit range');
        expect(() => fromJson(1.5, t)).toThrow('expected a long');
    });

    test('rejects invalid data with the location of the problem', () => {
        expect(() => fromJson({ number_data: 'x' }, dataType)).toThrow('data.number_data: expected a 32-bit int');
        expect(() => fromJson({ nope: 1 }, dataType)).toThrow('data: unknown field "nope"');
        expect(() => fromJson({ color_data: 'pink' }, dataType)).toThrow('data.color_data: "pink" is not one of');
        expect(() => fromJson({ time_data: 'yesterday' }, dataType)).toThrow('expected an ISO 8601');
        expect(() => fromJson([], dataType)).toThrow('expected an object');
        expect(() => fromJson({ int_array: [1, 'a'] }, objectType)).toThrow('data.int_array[1]');
        expect(() => fromJson({ bytes_field: '***' }, objectType)).toThrow('base64');
    });

    test('null struct fields are treated as absent', () => {
        expect(fromJson({ number_data: null, string_data: 's' }, dataType)).toEqual(new Map([['string_data', 's']]));
    });
});

describe('DisorderJson file', () => {
    test('encode writes header keys first, then data, and parse reads it back', () => {
        const value = new Map([['string_data', 'a'], ['number_data', 1]]);
        const bytes = DisorderJson.encode(header, dataType, value);
        expect(Object.keys(JSON.parse(text(bytes)))).toEqual(['schema', 'message', 'container', 'data']);
        expect(Object.keys(JSON.parse(text(bytes)).data)).toEqual(['number_data', 'string_data']);

        const parsed = DisorderJson.parse(bytes);
        expect(parsed.header).toEqual(header);
        expect(DisorderJson.toValue(parsed.data, dataType)).toEqual(value);
    });

    test('containers', () => {
        const type = rootType(schema, 'test.data', 'array');
        const value = [new Map([['number_data', 1]])];
        const parsed = DisorderJson.parse(DisorderJson.encode(header, type, value));
        expect(parsed.data).toEqual([{ number_data: 1 }]);
        expect(DisorderJson.toValue(parsed.data, type)).toEqual(value);
    });

    test('parse rejects malformed files', () => {
        const ok = { schema: 's.yaml', message: 'm', container: 'none', data: {} };
        expect(() => DisorderJson.parse(new Uint8Array(Buffer.from('{oops')))).toThrow('invalid JSON');
        expect(() => DisorderJson.parse(file([]))).toThrow('must contain a JSON object');
        expect(() => DisorderJson.parse(file({ ...ok, extra: 1 }))).toThrow('unknown key "extra"');
        expect(() => DisorderJson.parse(file({ ...ok, schema: '' }))).toThrow('"schema" must be a non-empty string');
        expect(() => DisorderJson.parse(file({ ...ok, container: 3 }))).toThrow('"container"');
        const { data: _data, ...noData } = ok;
        expect(() => DisorderJson.parse(file(noData))).toThrow('missing "data"');
    });

    test('sample.djson is readable with its schema', () => {
        const bytes = new Uint8Array(require('fs').readFileSync(path.join(__dirname, 'data', 'sample.djson')));
        const { header: h, data } = DisorderJson.parse(bytes);
        const type = rootType(schema, h.get('message'), h.get('container'));
        expect(DisorderJson.toValue(data, type)).toBeInstanceOf(Map);
    });
});
