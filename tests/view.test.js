const path = require('path');
const { Schema } = require('../disorder/schema');
const { Disorder } = require('../disorder/disorder');
const { toView, rootType, emptyRoot } = require('../disorder/view');

const schema = new Schema();
schema.load(path.join(__dirname, 'data', 'schema.yaml'));

describe('toView', () => {
    test('primitives are JSON safe', () => {
        expect(toView(5n)).toEqual({ t: 'long', v: '5' });
        expect(toView(new Date(0))).toEqual({ t: 'timestamp', v: '1970-01-01T00:00:00.000Z' });
        expect(toView(new Uint8Array(3))).toEqual({ t: 'bytes', v: 'AAAA' });
        expect(toView(1.5)).toEqual({ t: 'double', v: 1.5 });
        expect(toView(undefined)).toEqual({ t: 'empty' });
        JSON.stringify(toView(new Map([['a', [1n, new Date(0)]]])));
    });

    test('struct lists schema fields in order, missing ones as flagged defaults', () => {
        const type = schema.getMessage('test.object');
        const names = Array.from(type.fields.keys());
        const view = toView(new Map([[names[1], 1]]), type);
        expect(view.t).toBe('struct');
        expect(view.fields.map(f => f.key)).toEqual(names);
        expect(view.fields[0].node).toEqual({ t: 'bool', v: false, unset: true });
        expect(view.fields.find(f => f.key === 'obj_field').node).toMatchObject({ t: 'struct', unset: true });
        expect(view.fields.find(f => f.key === 'int_array').node).toEqual({ t: 'array', items: [], unset: true });
        expect(view.fields[1].node).not.toBeNull();
    });

    test('unknown struct keys are kept', () => {
        const view = toView(new Map([['extra', true]]), schema.getMessage('test.object'));
        expect(view.fields[view.fields.length - 1]).toEqual({ key: 'extra', node: { t: 'bool', v: true } });
    });

    test('maps and arrays follow the container type', () => {
        const type = rootType(schema, 'test.object', 'map');
        const view = toView(new Map([['k', new Map()]]), type);
        expect(view.t).toBe('map');
        expect(view.entries[0].node.t).toBe('struct');
        expect(toView([], rootType(schema, 'test.object', 'array'))).toEqual({ t: 'array', items: [] });
    });
});

describe('rootType / emptyRoot', () => {
    test('containers', () => {
        expect(rootType(schema, 'test.data', 'none')).toBe(schema.getMessage('test.data'));
        expect(rootType(schema, 'test.data', 'array').reference).toBe(schema.getMessage('test.data'));
        expect(() => rootType(schema, 'nope.x', 'none')).toThrow('not defined');
        expect(() => rootType(schema, 'test.data', 'set')).toThrow('unknown container');
        expect(emptyRoot('array')).toEqual([]);
        expect(emptyRoot('none')).toEqual(new Map());
    });

    test('every container round-trips through the file codec', () => {
        for (const container of ['none', 'array', 'map']) {
            const type = rootType(schema, 'test.data', container);
            const bytes = Disorder.encode(new Map([['container', container]]), type, emptyRoot(container));
            expect(Disorder.decode(bytes).value).toEqual(emptyRoot(container));
        }
    });
});

test('the sample file is readable', () => {
    const { header, value } = Disorder.read(path.join(__dirname, 'data', 'sample.dbin'));
    const type = rootType(schema, header.get('message'), header.get('container'));
    expect(toView(value, type).t).toBe('struct');
});
