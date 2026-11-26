const { Type } = require('./schema');
const { fromJson, toJson } = require('./json');
const { resolve, defaultValue } = require('./view');

/**
 * Edits of single primitive values, addressed by a path of struct field names,
 * map keys and array indexes from the root value.
 */

const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;
const CONTAINERS = [Type.STRUCT, Type.MAP, Type.ARRAY];

/**
 * @param {Type} type
 * @param {string} text
 * @returns {any} the value for the text, or throws an error naming what is wrong
 */
function parseText(type, text) {
    type = resolve(type);
    if (typeof text !== 'string') {
        throw new Error('expected text');
    }
    try {
        switch (type.type) {
            case Type.INT:
            case Type.FLOAT:
            case Type.DOUBLE: {
                const s = text.trim();
                if (!NUMBER.test(s)) {
                    throw new Error('expected a number');
                }
                const n = Number(s);
                const value = fromJson(n, type, 'value');
                return type.type === Type.FLOAT ? Math.fround(value) : value;
            }
            case Type.LONG:
                return fromJson(text.trim(), type, 'value');
            case Type.BOOL:
                if (text.trim() !== 'true' && text.trim() !== 'false') {
                    throw new Error('expected true or false');
                }
                return text.trim() === 'true';
            case Type.STRING:
                return fromJson(text, type, 'value');
            case Type.ENUM:
                return fromJson(text.trim(), type, 'value');
            case Type.TIMESTAMP: {
                const s = text.trim();
                const m = TIMESTAMP.exec(s);
                const hint = 'expected an ISO 8601 timestamp with a timezone, e.g. 2024-01-02T03:04:05.678Z';
                if (!m) {
                    throw new Error(hint);
                }
                const [y, mo, d, h, mi, sec] = m.slice(1, 7).map(Number);
                const day = new Date(Date.UTC(y, mo - 1, d));
                if (mo < 1 || mo > 12 || day.getUTCDate() !== d || h > 23 || mi > 59 || (sec || 0) > 59) {
                    throw new Error(`${s} is not a valid date and time`);
                }
                return fromJson(s, type, 'value');
            }
            case Type.BYTES:
                return fromJson(text.replace(/\s+/g, ''), type, 'value');
            default:
                throw new Error('this value cannot be edited as text');
        }
    } catch (error) {
        throw new Error(error.message.replace(/^value: /, ''));
    }
}

/**
 * @param {Type} rootType
 * @param {(string|number)[]} path
 * @returns {Type}
 */
function typeAt(rootType, path) {
    let type = resolve(rootType);
    for (const key of path) {
        if (type.type === Type.STRUCT) {
            type = type.fields.get(key);
        } else if (type.type === Type.MAP || type.type === Type.ARRAY) {
            type = type.reference;
        } else {
            type = undefined;
        }
        if (!type) {
            throw new Error(`invalid path ${JSON.stringify(path)}`);
        }
        type = resolve(type);
    }
    return type;
}

/**
 * @param {any} value
 * @param {(string|number)[]} path
 * @returns {any}
 */
function getAt(value, path) {
    for (const key of path) {
        if (value instanceof Map) {
            value = value.get(key);
        } else if (Array.isArray(value) && Number.isInteger(key)) {
            value = value[key];
        } else {
            value = undefined;
        }
        if (value === undefined) {
            throw new Error(`nothing at ${JSON.stringify(path)}`);
        }
    }
    return value;
}

/**
 * @param {any} root
 * @param {(string|number)[]} path non-empty
 * @param {any} value
 */
function setAt(root, path, value) {
    const parent = getAt(root, path.slice(0, -1));
    const key = path[path.length - 1];
    if (parent instanceof Map) {
        parent.set(key, value);
    } else {
        parent[key] = value;
    }
}

/**
 * @param {Type} type
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
function sameValue(type, a, b) {
    try {
        return JSON.stringify(toJson(a, type)) === JSON.stringify(toJson(b, type));
    } catch {
        return false;
    }
}

/**
 * Walks `path`, creating the struct fields that are not set yet (with default values), so a
 * value inside an unset field can be edited. `rollback` undoes the creation.
 *
 * @param {Type} rootType
 * @param {any} root
 * @param {(string|number)[]} path
 * @returns {{created: {parent: Map<string, any>, key: string, value: any, depth: number}[], rollback: () => void}}
 */
function ensurePath(rootType, root, path) {
    const created = [];
    const rollback = () => created.slice().reverse().forEach(c => c.parent.delete(c.key));
    try {
        let value = root;
        let type = resolve(rootType);
        path.forEach((key, depth) => {
            if (type.type === Type.STRUCT) {
                const fieldType = type.fields.get(key);
                if (!fieldType) {
                    throw new Error(`invalid path ${JSON.stringify(path)}`);
                }
                if (!value.has(key)) {
                    const child = defaultValue(fieldType);
                    value.set(key, child);
                    created.push({ parent: value, key, value: child, depth });
                }
                value = value.get(key);
                type = resolve(fieldType);
            } else {
                value = getAt(value, [key]);
                type = resolve(type.reference);
            }
        });
    } catch (error) {
        rollback();
        throw error;
    }
    return { created, rollback };
}

/**
 * Wraps a change so that undo/redo also remove/restore the struct fields created on the way.
 *
 * @param {Type} rootType
 * @param {(string|number)[]} path the node that was changed
 * @param {{created: {parent: Map<string, any>, key: string, value: any, depth: number}[]}} guard
 * @param {() => void} undo
 * @param {() => void} redo
 * @returns {{path: (string|number)[], type: Type, undo: () => void, redo: () => void}}
 *   `path` is the topmost node whose view changed (the first created field, else `path`)
 */
function change(rootType, path, guard, undo, redo) {
    const first = guard.created[0];
    const refresh = first ? path.slice(0, first.depth + 1) : path;
    return {
        path: refresh,
        type: typeAt(rootType, refresh),
        undo: () => {
            undo();
            if (first) {
                first.parent.delete(first.key);
            }
        },
        redo: () => {
            if (first) {
                first.parent.set(first.key, first.value);
            }
            redo();
        },
    };
}

/**
 * Parses `text` for the primitive at `path` and stores it in `root`. A field that is not set
 * yet is created.
 *
 * @param {Type} rootType
 * @param {any} root root value, modified in place
 * @param {(string|number)[]} path
 * @param {string} text
 * @returns {{path: (string|number)[], type: Type, value: any, changed: boolean, undo: () => void, redo: () => void}|{changed: false, path: (string|number)[], type: Type, value: any}}
 */
function editAt(rootType, root, path, text) {
    if (!Array.isArray(path) || path.length === 0) {
        throw new Error('invalid path');
    }
    const type = typeAt(rootType, path);
    if (CONTAINERS.includes(type.type)) {
        throw new Error('only single values can be edited');
    }
    const guard = ensurePath(rootType, root, path);
    let old, value;
    try {
        old = getAt(root, path);
        value = parseText(type, text);
    } catch (error) {
        guard.rollback();
        throw error;
    }
    if (guard.created.length === 0 && sameValue(type, old, value)) {
        return { path, type, value, changed: false };
    }
    setAt(root, path, value);
    return {
        value,
        changed: true,
        ...change(rootType, path, guard, () => setAt(root, path, old), () => setAt(root, path, value)),
    };
}

/**
 * Adds a default value to the container at `path`: appends an array item, adds a map
 * entry named `key`, or sets the struct field `key`.
 *
 * @param {Type} rootType
 * @param {any} root root value, modified in place
 * @param {(string|number)[]} path the container
 * @param {string} [key]
 * @returns {{path: (string|number)[], type: Type, undo: () => void, redo: () => void}}
 *   `path` is the node whose view needs refreshing
 */
function addAt(rootType, root, path, key) {
    const type = typeAt(rootType, path);
    if (type.type === Type.STRUCT && !type.fields.has(key)) {
        throw new Error(`unknown field "${key}"`);
    }
    if (type.type === Type.MAP && (typeof key !== 'string' || key === '')) {
        throw new Error('key cannot be empty');
    }
    if (![Type.ARRAY, Type.MAP, Type.STRUCT].includes(type.type)) {
        throw new Error('nothing can be added here');
    }
    const guard = ensurePath(rootType, root, path);
    const container = getAt(root, path);
    let value, undo, redo;
    try {
        switch (type.type) {
            case Type.ARRAY:
                value = defaultValue(type.reference);
                redo = () => container.push(value);
                undo = () => container.pop();
                break;
            case Type.MAP:
                if (container.has(key)) {
                    throw new Error(`key "${key}" already exists`);
                }
                value = defaultValue(type.reference);
                redo = () => container.set(key, value);
                undo = () => container.delete(key);
                break;
            default:
                if (container.has(key)) {
                    throw new Error(`field "${key}" is already set`);
                }
                value = defaultValue(type.fields.get(key));
                redo = () => container.set(key, value);
                undo = () => container.delete(key);
        }
    } catch (error) {
        guard.rollback();
        throw error;
    }
    redo();
    return change(rootType, path, guard, undo, redo);
}

/**
 * Removes the array item, map entry or struct field at `path` (a struct field becomes unset).
 *
 * @param {Type} rootType
 * @param {any} root root value, modified in place
 * @param {(string|number)[]} path
 * @returns {{path: (string|number)[], type: Type, undo: () => void, redo: () => void}}
 *   `path` is the parent container, whose view needs refreshing
 */
function removeAt(rootType, root, path) {
    if (!Array.isArray(path) || path.length === 0) {
        throw new Error('invalid path');
    }
    const parentPath = path.slice(0, -1);
    const key = path[path.length - 1];
    const type = typeAt(rootType, parentPath);
    const parent = getAt(root, parentPath);
    const value = getAt(root, path);
    let undo, redo;
    if (type.type === Type.ARRAY) {
        redo = () => parent.splice(key, 1);
        undo = () => parent.splice(key, 0, value);
    } else if (type.type === Type.MAP || type.type === Type.STRUCT) {
        const entries = Array.from(parent);
        redo = () => parent.delete(key);
        undo = () => {
            parent.clear();
            entries.forEach(([k, v]) => parent.set(k, v));
        };
    } else {
        throw new Error('nothing can be removed here');
    }
    redo();
    return { path: parentPath, type, undo, redo };
}

module.exports = { parseText, typeAt, getAt, setAt, editAt, addAt, removeAt };
