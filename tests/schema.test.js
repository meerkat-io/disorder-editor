// @ts-nocheck
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Type, Schema } = require('../disorder/schema');

describe('Type', () => {
    test('parses primary types', () => {
        for (const name of Type.primaryTypes) {
            expect(new Type(name).type).toBe(name);
        }
    });

    test('parses nested containers', () => {
        const type = new Type('map[array[int]]');
        expect(type.type).toBe(Type.MAP);
        expect(type.reference.type).toBe(Type.ARRAY);
        expect(type.reference.reference.type).toBe(Type.INT);
    });

    test('struct and enum start empty', () => {
        expect(new Type(Type.STRUCT).fields.size).toBe(0);
        expect(new Type(Type.ENUM).enums).toEqual([]);
    });

    test('accepts qualified names and rejects malformed ones', () => {
        expect(new Type('pkg.sub.name').type).toBe('pkg.sub.name');
        expect(() => new Type('a-b')).toThrow('not a valid type name');
        expect(() => new Type('a b')).toThrow('not a valid type name');
        expect(() => new Type('a/b')).toThrow('not a valid type name');
        expect(() => new Type('a..b')).toThrow('not a valid type name');
        expect(() => new Type('')).toThrow('not a valid type name');
    });

    test('rejects non-string types', () => {
        expect(() => new Type(5)).toThrow('Type must be a string');
    });

    test('reserved names', () => {
        expect(Type.isReserved('int')).toBe(true);
        expect(Type.isReserved('color')).toBe(false);
    });
});

describe('Schema', () => {
    let dir;
    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'disorder-schema-'));
    });
    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    /** Writes a schema file in the temp dir and returns its path. */
    const write = (name, content) => {
        const file = path.join(dir, name);
        fs.writeFileSync(file, content);
        return file;
    };
    const header = 'schema: disorder\nversion: v1\npackage: p\n';

    test('loads messages, enums and imports', () => {
        const schema = new Schema();
        const messages = schema.load('./tests/data/schema.yaml');
        expect(messages).toEqual(['test.object', 'test.data']);
        expect(schema.getMessage('test.sub')).toBeDefined();
        expect(schema.getEnum('test.color').enums).toEqual(['red', 'green', 'blue']);
        expect(schema.getMessage('test.missing')).toBeUndefined();
    });

    test('resolves references to enums and messages', () => {
        const schema = new Schema();
        schema.load('./tests/data/schema.yaml');
        const fields = schema.getMessage('test.object').fields;
        expect(fields.get('enum_field').type).toBe(Type.ENUM_REFERENCE);
        expect(fields.get('enum_field').reference).toBe(schema.getEnum('test.color'));
        expect(fields.get('obj_field').type).toBe(Type.STRUCT_REFERENCE);
        expect(fields.get('obj_field').reference).toBe(schema.getMessage('test.sub'));
        const nested = fields.get('obj_array').reference;
        expect(nested.type).toBe(Type.STRUCT_REFERENCE);
    });

    test('resolves self references', () => {
        const schema = new Schema();
        schema.load('./tests/data/loop_object.yaml');
        const loop = schema.getMessage('test.loop');
        expect(loop.fields.get('sub').reference).toBe(loop);
    });

    test('resolves fully qualified references across packages', () => {
        write('a.yaml', 'schema: disorder\nversion: v1\npackage: a\nenums:\n  e: [x, y]\n');
        const main = write('b.yaml', `${header}import:\n  - a.yaml\nmessages:\n  m:\n    f: a.e\n`);
        const schema = new Schema();
        schema.load(main);
        expect(schema.getMessage('p.m').fields.get('f').reference).toBe(schema.getEnum('a.e'));
    });

    test('handles import cycles', () => {
        write('a.yaml', `${header.replace('p\n', 'a\n')}import:\n  - b.yaml\nmessages:\n  one:\n    id: int\n`);
        write('b.yaml', `${header.replace('p\n', 'b\n')}import:\n  - a.yaml\nmessages:\n  two:\n    id: int\n`);
        const schema = new Schema();
        expect(schema.load(path.join(dir, 'a.yaml'))).toEqual(['a.one']);
        expect(schema.getMessage('b.two')).toBeDefined();
    });

    test('loading an already loaded file returns no messages', () => {
        const schema = new Schema();
        schema.load('./tests/data/enum.yaml');
        expect(schema.load('./tests/data/enum.yaml')).toEqual([]);
    });

    test('can load a second schema into the same instance', () => {
        const schema = new Schema();
        schema.load('./tests/data/enum.yaml');
        const other = write('other.yaml', `${header.replace('p\n', 'other\n')}messages:\n  m:\n    c: test.color\n`);
        expect(schema.load(other)).toEqual(['other.m']);
        expect(schema.getMessage('other.m').fields.get('c').reference).toBe(schema.getEnum('test.color'));
        // earlier, already resolved messages are untouched
        expect(schema.getMessage('test.object').fields.get('enum_field').type).toBe(Type.ENUM_REFERENCE);
    });

    test('allows an empty message', () => {
        const file = write('empty.yaml', `${header}messages:\n  nothing:\n`);
        const schema = new Schema();
        expect(schema.load(file)).toEqual(['p.nothing']);
        expect(schema.getMessage('p.nothing').fields.size).toBe(0);
    });

    describe('errors', () => {
        const loadError = (content) => {
            const file = write('bad.yaml', content);
            return () => new Schema().load(file);
        };

        test('not a disorder schema', () => {
            expect(() => new Schema().load('./tests/data/invalid_schema.yaml')).toThrow('is not a disorder schema');
            expect(loadError('')).toThrow('is not a disorder schema');
            expect(loadError('- a\n- b\n')).toThrow('is not a disorder schema');
        });

        test('missing file', () => {
            expect(() => new Schema().load(path.join(dir, 'nope.yaml'))).toThrow();
        });

        test('unknown top level keys are rejected', () => {
            expect(loadError(`${header}services:\n  s: {}\n`)).toThrow('unknown key "services"');
            expect(loadError(`${header}option:\n  go_package_prefix: x\n`)).not.toThrow();
        });

        test('package problems', () => {
            expect(loadError('schema: disorder\n')).toThrow('does not have a valid package name');
            expect(loadError('schema: disorder\npackage: a-b\n')).toThrow('package "a-b" is invalid');
        });

        test('invalid names', () => {
            expect(loadError(`${header}messages:\n  int:\n    a: int\n`)).toThrow('message name "int" is invalid');
            expect(loadError(`${header}messages:\n  m:\n    map: int\n`)).toThrow('field name "map" is invalid');
            expect(loadError(`${header}messages:\n  m:\n    a-b: int\n`)).toThrow('field name "a-b" is invalid');
            expect(loadError(`${header}enums:\n  struct: [a]\n`)).toThrow('enum name "struct" is invalid');
        });

        test('wrong shapes', () => {
            expect(loadError(`${header}messages: [a]\n`)).toThrow('messages must be a map');
            expect(loadError(`${header}messages:\n  m: [a]\n`)).toThrow('fields must be a map');
            expect(loadError(`${header}enums: [a]\n`)).toThrow('enums must be a map');
            expect(loadError(`${header}enums:\n  e: a\n`)).toThrow('values must be an array');
        });

        test('bad enum values', () => {
            expect(loadError(`${header}enums:\n  e: [1]\n`)).toThrow('must be a string');
            expect(loadError(`${header}enums:\n  e: ['a b']\n`)).toThrow('valid simple variable name');
            expect(loadError(`${header}enums:\n  e: [a, a]\n`)).toThrow('is duplicated');
        });

        test('duplicates', () => {
            write('dup.yaml', `${header}messages:\n  m:\n    a: int\n`);
            expect(loadError(`${header}import:\n  - dup.yaml\nmessages:\n  m:\n    a: int\n`)).toThrow('message "m" is duplicated');
        });

        test('undefined type names the qualified type', () => {
            expect(loadError(`${header}messages:\n  m:\n    a: array[nothing]\n`)).toThrow('Type "p.nothing" is not defined');
        });

        test('malformed field type', () => {
            expect(loadError(`${header}messages:\n  m:\n    a: 'not valid'\n`)).toThrow('not a valid type name');
            expect(loadError(`${header}messages:\n  m:\n    a: 5\n`)).toThrow('Type must be a string');
        });
    });
});
