const { Type } = require('./schema');

/**
 * Converts decoded values into plain JSON-safe trees that can be sent to the webview
 * (`Map`, `bigint`, `Date` and `Uint8Array` do not survive `postMessage`).
 *
 * Node shapes:
 *   {t: 'empty'}
 *   {t: 'bool'|'int'|'long'|'float'|'double'|'string'|'enum'|'timestamp'|'bytes', v: string|number|boolean}
 *     (enum also has `options`, bytes are shown as base64)
 *   {t: 'struct', fields: [{key, node|null}]}   (a field missing in the data shows its default, flagged
 *     `unset: true`; null only for a struct that contains itself)
 *   {t: 'map', entries: [{key, node}]}
 *   {t: 'array', items: [node]}
 */

/**
 * @param {Type} [type]
 * @returns {Type|undefined}
 */
function resolve(type) {
    while (type && (type.type === Type.STRUCT_REFERENCE || type.type === Type.ENUM_REFERENCE)) {
        type = type.reference;
    }
    return type;
}

/**
 * @param {Type} type
 * @returns {any} a new value to start from when an item, entry or field is added
 */
function defaultValue(type) {
    type = resolve(type);
    switch (type.type) {
        case Type.BOOL: return false;
        case Type.INT:
        case Type.FLOAT:
        case Type.DOUBLE: return 0;
        case Type.LONG: return 0n;
        case Type.STRING: return '';
        case Type.ENUM:
            if (type.enums.length === 0) {
                throw new Error('enum has no values');
            }
            return type.enums[0];
        case Type.TIMESTAMP: return new Date(Math.floor(Date.now() / 1000) * 1000);
        case Type.BYTES: return new Uint8Array();
        case Type.ARRAY: return [];
        case Type.MAP:
        case Type.STRUCT: return new Map();
        default:
            throw new Error(`unsupported type ${type.type}`);
    }
}

/**
 * View of a field that is not in the data: its default value, flagged `unset` (editing it sets
 * the field). A struct nested in itself stops at the first repeat and yields null.
 *
 * @param {Type} type
 * @param {Set<Type>} chain struct types being expanded
 * @returns {object|null}
 */
function unsetView(type, chain) {
    type = resolve(type);
    if (type.type === Type.STRUCT) {
        if (chain.has(type)) {
            return null;
        }
        const inner = new Set(chain).add(type);
        const fields = Array.from(type.fields, ([key, fieldType]) => ({ key, node: unsetView(fieldType, inner) }));
        return { t: 'struct', fields, unset: true };
    }
    return { ...toView(defaultValue(type), type), unset: true };
}

/**
 * @param {any} value
 * @param {Type} [type] used to name fields and enums; the value is shown as-is when it does not match
 * @returns {object}
 */
function toView(value, type) {
    type = resolve(type);
    if (value === undefined || value === null) {
        return { t: 'empty' };
    }
    if (Array.isArray(value)) {
        const item = type && type.type === Type.ARRAY ? type.reference : undefined;
        return { t: 'array', items: value.map(v => toView(v, item)) };
    }
    if (value instanceof Map) {
        if (type && type.type === Type.STRUCT) {
            const fields = [];
            for (const [key, fieldType] of type.fields) {
                fields.push({ key, node: value.has(key) ? toView(value.get(key), fieldType) : unsetView(fieldType, new Set([type])) });
            }
            for (const [key, v] of value) {
                if (!type.fields.has(key)) {
                    fields.push({ key, node: toView(v) });
                }
            }
            return { t: 'struct', fields };
        }
        const item = type && type.type === Type.MAP ? type.reference : undefined;
        return { t: 'map', entries: Array.from(value, ([key, v]) => ({ key, node: toView(v, item) })) };
    }
    switch (typeof value) {
        case 'boolean':
            return { t: 'bool', v: value };
        case 'bigint':
            return { t: 'long', v: value.toString() };
        case 'string':
            if (type && type.type === Type.ENUM) {
                return { t: 'enum', v: value, options: type.enums };
            }
            return { t: 'string', v: value };
        case 'number': {
            const t = type && [Type.INT, Type.FLOAT, Type.DOUBLE].includes(type.type)
                ? type.type
                : (Number.isInteger(value) ? 'int' : 'double');
            return { t, v: value };
        }
    }
    if (value instanceof Date) {
        return { t: 'timestamp', v: value.toISOString() };
    }
    if (value instanceof Uint8Array) {
        return { t: 'bytes', v: Buffer.from(value).toString('base64') };
    }
    return { t: 'string', v: String(value) };
}

/**
 * Type of the root value for a header's `message` and `container`.
 *
 * @param {import('./schema').Schema} schema
 * @param {string} message qualified message name
 * @param {string} container 'none', 'array' or 'map'
 * @returns {Type}
 */
function rootType(schema, message, container) {
    const type = schema.getMessage(message);
    if (!type) {
        throw new Error(`message "${message}" is not defined in the schema`);
    }
    switch (container) {
        case 'none':
            return type;
        case 'array':
        case 'map': {
            const root = new Type(`${container}[bool]`);
            root.reference = type;
            return root;
        }
        default:
            throw new Error(`unknown container "${container}"`);
    }
}

/**
 * @param {string} container
 * @returns {any} empty root value for a container
 */
function emptyRoot(container) {
    return container === 'array' ? [] : new Map();
}

module.exports = { toView, rootType, emptyRoot, resolve, defaultValue };
