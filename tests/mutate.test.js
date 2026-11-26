const path = require('path');
const { Schema, Type } = require('../disorder/schema');
const { parseText, typeAt, getAt, editAt, addAt, removeAt } = require('../disorder/mutate');
const { toView } = require('../disorder/view');

const schema = new Schema();
schema.load(path.join(__dirname, 'data', 'schema.yaml'));
const objectType = schema.getMessage('test.object');

const prim = name => new Type(name);
const enumType = objectType.fields.get('enum_field');

describe('parseText', () => {
    test('numbers', () => {
        expect(parseText(prim('int'), ' -42 ')).toBe(-42);
        expect(parseText(prim('double'), '1e3')).toBe(1000);
        expect(parseText(prim('float'), '0.1')).toBe(Math.fround(0.1));
        for (const bad of ['', 'abc', '1.5.2', '0x10', 'NaN', 'Infinity']) {
            expect(() => parseText(prim('double'), bad)).toThrow('expected a number');
        }
        expect(() => parseText(prim('int'), '1.5')).toThrow('32-bit int');
        expect(() => parseText(prim('int'), '2147483648')).toThrow('32-bit int');
    });

    test('long keeps 64-bit precision', () => {
        expect(parseText(prim('long'), '9223372036854775807')).toBe(9223372036854775807n);
        expect(() => parseText(prim('long'), '9223372036854775808')).toThrow('out of 64-bit range');
        expect(() => parseText(prim('long'), '1.5')).toThrow('long');
    });

    test('bool, string and enum', () => {
        expect(parseText(prim('bool'), 'false')).toBe(false);
        expect(() => parseText(prim('bool'), 'yes')).toThrow('true or false');
        expect(parseText(prim('string'), '  keep spaces ')).toBe('  keep spaces ');
        expect(parseText(enumType, 'green')).toBe('green');
        expect(() => parseText(enumType, 'pink')).toThrow('not one of');
    });

    test('timestamps need a timezone and a real date', () => {
        expect(parseText(prim('timestamp'), '2024-01-02T03:04:05.678Z').toISOString()).toBe('2024-01-02T03:04:05.678Z');
        expect(parseText(prim('timestamp'), '2024-01-02T03:04:05+02:00').toISOString()).toBe('2024-01-02T01:04:05.000Z');
        for (const bad of ['2024', 'yesterday', '2024-01-02T03:04:05', '2024-02-30T00:00:00Z', '2024-01-02T25:00:00Z']) {
            expect(() => parseText(prim('timestamp'), bad)).toThrow();
        }
    });

    test('bytes are base64', () => {
        expect(Array.from(parseText(prim('bytes'), 'AAH/'))).toEqual([0, 1, 255]);
        expect(Array.from(parseText(prim('bytes'), ' AA H/ '))).toEqual([0, 1, 255]);
        expect(parseText(prim('bytes'), '')).toEqual(new Uint8Array());
        expect(() => parseText(prim('bytes'), 'not base64!')).toThrow('base64');
    });
});

describe('editAt', () => {
    const make = () => new Map([
        ['int_field', 1],
        ['int_array', [1, 2, 3]],
        ['int_map', new Map([['a', 1]])],
        ['enum_field', 'red'],
    ]);

    test('edits struct fields, array items and map values in place', () => {
        const root = make();
        editAt(objectType, root, ['int_field'], '7');
        editAt(objectType, root, ['int_array', 1], '20');
        editAt(objectType, root, ['int_map', 'a'], '30');
        expect(root.get('int_field')).toBe(7);
        expect(root.get('int_array')).toEqual([1, 20, 3]);
        expect(root.get('int_map').get('a')).toBe(30);
    });

    test('reports the new value, and whether anything changed', () => {
        const root = make();
        expect(editAt(objectType, root, ['int_field'], '2')).toMatchObject({ value: 2, changed: true });
        expect(editAt(objectType, root, ['int_field'], '2').changed).toBe(false);
    });

    test('undo and redo', () => {
        const root = make();
        const edit = editAt(objectType, root, ['int_field'], '2');
        edit.undo();
        expect(root.get('int_field')).toBe(1);
        edit.redo();
        expect(root.get('int_field')).toBe(2);
    });

    test('editing a field that is not set sets it, even to the default', () => {
        const root = make();
        const edit = editAt(objectType, root, ['bool_field'], 'false');
        expect(edit).toMatchObject({ changed: true, path: ['bool_field'] });
        expect(root.get('bool_field')).toBe(false);
        edit.undo();
        expect(root.has('bool_field')).toBe(false);
        edit.redo();
        expect(root.get('bool_field')).toBe(false);
    });

    test('editing inside unset structs and arrays creates them on the way', () => {
        const root = make();
        const edit = editAt(objectType, root, ['obj_field', 'value'], '5');
        expect(edit.path).toEqual(['obj_field']); // the topmost created field is refreshed
        expect(root.get('obj_field').get('value')).toBe(5);
        edit.undo();
        expect(root.has('obj_field')).toBe(false);
        edit.redo();
        expect(root.get('obj_field').get('value')).toBe(5);

        const add = addAt(objectType, root, ['obj_array']);
        expect(add.path).toEqual(['obj_array']);
        expect(root.get('obj_array')).toHaveLength(1);
        add.undo();
        expect(root.has('obj_array')).toBe(false);
    });

    test('a failed edit leaves no created fields behind', () => {
        const root = make();
        expect(() => editAt(objectType, root, ['obj_field', 'value'], 'x')).toThrow();
        expect(root.has('obj_field')).toBe(false);
    });

    test('rejects bad input without touching the value', () => {
        const root = make();
        expect(() => editAt(objectType, root, ['int_field'], 'x')).toThrow();
        expect(root.get('int_field')).toBe(1);
    });

    test('rejects containers, missing values and bad paths', () => {
        const root = make();
        expect(() => editAt(objectType, root, ['int_array'], '1')).toThrow('only single values');
        expect(() => editAt(objectType, root, ['int_array', 9], '1')).toThrow('nothing at');
        expect(() => editAt(objectType, root, ['nope'], '1')).toThrow('invalid path');
        expect(() => editAt(objectType, root, [], '1')).toThrow('invalid path');
    });

    test('typeAt and getAt follow the same path', () => {
        expect(typeAt(objectType, ['int_array', 0]).type).toBe('int');
        expect(getAt(make(), ['int_map', 'a'])).toBe(1);
    });

    test('edited values render through toView', () => {
        const root = make();
        const { type, value } = editAt(objectType, root, ['enum_field'], 'blue');
        expect(toView(value, type)).toEqual({ t: 'enum', v: 'blue', options: ['red', 'green', 'blue'] });
    });
});

describe('addAt / removeAt', () => {
    const root = () => new Map([['int_array', [1, 2, 3]], ['int_map', new Map([['a', 1], ['b', 2]])]]);

    test('append an array item and undo', () => {
        const value = root();
        const change = addAt(objectType, value, ['int_array']);
        expect(change.path).toEqual(['int_array']);
        expect(value.get('int_array')).toEqual([1, 2, 3, 0]);
        change.undo();
        expect(value.get('int_array')).toEqual([1, 2, 3]);
        change.redo();
        expect(value.get('int_array')).toHaveLength(4);
    });

    test('add map entries with a unique, non-empty key', () => {
        const value = root();
        addAt(objectType, value, ['int_map'], 'c');
        expect(value.get('int_map').get('c')).toBe(0);
        expect(() => addAt(objectType, value, ['int_map'], 'a')).toThrow('already exists');
        expect(() => addAt(objectType, value, ['int_map'], '')).toThrow('empty');
    });

    test('set a struct field to its default, once', () => {
        const value = root();
        addAt(objectType, value, [], 'enum_field');
        addAt(objectType, value, [], 'bool_field');
        addAt(objectType, value, [], 'obj_field');
        expect(value.get('enum_field')).toBe('red');
        expect(value.get('bool_field')).toBe(false);
        expect(value.get('obj_field')).toEqual(new Map());
        expect(() => addAt(objectType, value, [], 'bool_field')).toThrow('already set');
        expect(() => addAt(objectType, value, [], 'nope')).toThrow('unknown field');
    });

    test('remove items, entries and fields; undo restores the order', () => {
        const value = root();
        const item = removeAt(objectType, value, ['int_array', 1]);
        expect(value.get('int_array')).toEqual([1, 3]);
        item.undo();
        expect(value.get('int_array')).toEqual([1, 2, 3]);

        const entry = removeAt(objectType, value, ['int_map', 'a']);
        expect(Array.from(value.get('int_map').keys())).toEqual(['b']);
        entry.undo();
        expect(Array.from(value.get('int_map').keys())).toEqual(['a', 'b']);

        const field = removeAt(objectType, value, ['int_array']);
        expect(field.path).toEqual([]);
        expect(value.has('int_array')).toBe(false);
        field.undo();
        expect(value.get('int_array')).toEqual([1, 2, 3]);
    });

    test('invalid targets', () => {
        const value = root();
        expect(() => addAt(objectType, value, ['int_array', 0])).toThrow('nothing can be added');
        expect(() => removeAt(objectType, value, [])).toThrow('invalid path');
        expect(() => removeAt(objectType, value, ['int_array', 9])).toThrow('nothing at');
        expect(() => removeAt(objectType, value, ['int_array', 0, 0])).toThrow();
    });
});
