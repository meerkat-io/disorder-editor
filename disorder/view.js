const { Type } = require('./schema');

/**
 * Converts decoded values into plain JSON-safe trees that can be sent to the webview
 * (`Map`, `bigint`, `Date` and `Uint8Array` do not survive `postMessage`).
 *
 * Node shapes:
 *   {t: 'empty'}
 *   {t: 'bool'|'int'|'long'|'float'|'double'|'string'|'enum'|'timestamp'|'bytes', v: string|number|boolean}
 *   {t: 'struct', fields: [{key, node|null}]}   (null: field not present in the data)
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
                fields.push({ key, node: value.has(key) ? toView(value.get(key), fieldType) : null });
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
            return { t: type && type.type === Type.ENUM ? 'enum' : 'string', v: value };
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
        return { t: 'bytes', v: `${value.length} bytes` };
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

module.exports = { toView, rootType, emptyRoot };
