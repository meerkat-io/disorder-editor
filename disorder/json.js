const { Type } = require('./schema');

/**
 * JSON flavour of a disorder file (`*.djson`). Unlike the binary encoding it is not
 * self-describing, so it can only be read together with its schema.
 *
 * {
 *   "schema": "./schema.yaml",   // relative to the file
 *   "message": "test.data",      // qualified root message
 *   "container": "none",         // none | array | map
 *   "data": { ... }
 * }
 *
 * Value mapping: struct/map -> object, array -> array, long -> decimal string,
 * bytes -> base64 string, timestamp -> ISO 8601 string, enum -> string.
 */

const HEADER_KEYS = ['schema', 'message', 'container'];
const INT_MIN = -(2 ** 31);
const INT_MAX = 2 ** 31 - 1;
const LONG_MIN = -(2n ** 63n);
const LONG_MAX = 2n ** 63n - 1n;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/**
 * @param {Type} type
 * @returns {Type}
 */
function resolve(type) {
    while (type.type === Type.STRUCT_REFERENCE || type.type === Type.ENUM_REFERENCE) {
        type = type.reference;
    }
    return type;
}

/**
 * @param {any} value
 * @returns {string}
 */
function describe(value) {
    if (value === null) {
        return 'null';
    }
    return Array.isArray(value) ? 'array' : typeof value;
}

/**
 * @param {any} value
 * @returns {boolean}
 */
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Converts a decoded/in-memory value (Map, bigint, Date, Uint8Array) to JSON-safe data.
 *
 * @param {any} value
 * @param {Type} type
 * @returns {any}
 */
function toJson(value, type) {
    type = resolve(type);
    switch (type.type) {
        case Type.BOOL:
        case Type.INT:
        case Type.STRING:
        case Type.ENUM:
            return value;
        case Type.FLOAT:
        case Type.DOUBLE:
            if (!Number.isFinite(value)) {
                throw new Error(`value ${value} cannot be stored in JSON`);
            }
            return value;
        case Type.LONG:
            return value.toString();
        case Type.TIMESTAMP:
            return value.toISOString();
        case Type.BYTES:
            return Buffer.from(value).toString('base64');
        case Type.ARRAY:
            return value.map(v => toJson(v, type.reference));
        case Type.MAP: {
            const out = {};
            for (const key of Array.from(value.keys()).sort()) {
                out[key] = toJson(value.get(key), type.reference);
            }
            return out;
        }
        case Type.STRUCT: {
            const out = {};
            for (const [name, fieldType] of type.fields) {
                if (value.has(name)) {
                    out[name] = toJson(value.get(name), fieldType);
                }
            }
            return out;
        }
        default:
            throw new Error(`unsupported type ${type.type}`);
    }
}

/**
 * Converts JSON data to a value the binary `Writer` accepts, validating it against the type.
 * Errors name the offending location, for example `data.items[2].count: expected an int`.
 *
 * @param {any} json
 * @param {Type} type
 * @param {string} [where]
 * @returns {any}
 */
function fromJson(json, type, where = 'data') {
    type = resolve(type);
    const fail = (message) => {
        throw new Error(`${where}: ${message}`);
    };
    switch (type.type) {
        case Type.BOOL:
            if (typeof json !== 'boolean') {
                fail(`expected a bool, got ${describe(json)}`);
            }
            return json;
        case Type.INT:
            if (!Number.isInteger(json) || json < INT_MIN || json > INT_MAX) {
                fail(`expected a 32-bit int, got ${JSON.stringify(json)}`);
            }
            return json;
        case Type.LONG: {
            const ok = typeof json === 'string' ? /^-?\d+$/.test(json) : Number.isSafeInteger(json);
            if (!ok) {
                fail(`expected a long (decimal string), got ${JSON.stringify(json)}`);
            }
            const value = BigInt(json);
            if (value < LONG_MIN || value > LONG_MAX) {
                fail(`${json} is out of 64-bit range`);
            }
            return value;
        }
        case Type.FLOAT:
        case Type.DOUBLE:
            if (typeof json !== 'number' || !Number.isFinite(json)) {
                fail(`expected a ${type.type}, got ${JSON.stringify(json)}`);
            }
            return json;
        case Type.STRING:
            if (typeof json !== 'string') {
                fail(`expected a string, got ${describe(json)}`);
            }
            return json;
        case Type.ENUM:
            if (!type.enums.includes(json)) {
                fail(`${JSON.stringify(json)} is not one of [${type.enums.join(', ')}]`);
            }
            return json;
        case Type.TIMESTAMP: {
            const date = typeof json === 'string' ? new Date(json) : undefined;
            if (!date || Number.isNaN(date.getTime())) {
                fail(`expected an ISO 8601 timestamp, got ${JSON.stringify(json)}`);
            }
            return date;
        }
        case Type.BYTES:
            if (typeof json !== 'string' || !BASE64.test(json)) {
                fail('expected bytes as a base64 string');
            }
            return new Uint8Array(Buffer.from(json, 'base64'));
        case Type.ARRAY:
            if (!Array.isArray(json)) {
                fail(`expected an array, got ${describe(json)}`);
            }
            return json.map((v, i) => fromJson(v, type.reference, `${where}[${i}]`));
        case Type.MAP: {
            if (!isPlainObject(json)) {
                fail(`expected an object, got ${describe(json)}`);
            }
            const map = new Map();
            for (const [key, v] of Object.entries(json)) {
                if (key === '') {
                    fail('map key cannot be empty');
                }
                map.set(key, fromJson(v, type.reference, `${where}.${key}`));
            }
            return map;
        }
        case Type.STRUCT: {
            if (!isPlainObject(json)) {
                fail(`expected an object, got ${describe(json)}`);
            }
            const map = new Map();
            for (const [key, v] of Object.entries(json)) {
                const fieldType = type.fields.get(key);
                if (!fieldType) {
                    fail(`unknown field "${key}"`);
                }
                if (v !== null) {
                    map.set(key, fromJson(v, fieldType, `${where}.${key}`));
                }
            }
            return map;
        }
        default:
            throw new Error(`unsupported type ${type.type}`);
    }
}

class DisorderJson {
    /**
     * @param {Map<string, string>} header schema, message and container
     * @param {Type} type type of the value
     * @param {any} value
     * @returns {Uint8Array}
     */
    static encode(header, type, value) {
        const doc = {};
        for (const key of HEADER_KEYS) {
            doc[key] = header.get(key);
        }
        doc.data = toJson(value, type);
        return new Uint8Array(Buffer.from(JSON.stringify(doc, null, 2) + '\n', 'utf8'));
    }

    /**
     * Reads the header and the raw (not yet validated) data. Convert the data with
     * `DisorderJson.toValue` once the schema is loaded.
     *
     * @param {Uint8Array} bytes
     * @returns {{header: Map<string, string>, data: any}}
     */
    static parse(bytes) {
        let doc;
        try {
            doc = JSON.parse(Buffer.from(bytes).toString('utf8'));
        } catch (error) {
            throw new Error(`invalid JSON: ${error.message}`);
        }
        if (!isPlainObject(doc)) {
            throw new Error('a .djson file must contain a JSON object');
        }
        for (const key of Object.keys(doc)) {
            if (key !== 'data' && !HEADER_KEYS.includes(key)) {
                throw new Error(`unknown key "${key}"`);
            }
        }
        const header = new Map();
        for (const key of HEADER_KEYS) {
            if (typeof doc[key] !== 'string' || doc[key] === '') {
                throw new Error(`"${key}" must be a non-empty string`);
            }
            header.set(key, doc[key]);
        }
        if (!('data' in doc)) {
            throw new Error('missing "data"');
        }
        return { header, data: doc.data };
    }

    /**
     * @param {any} data
     * @param {Type} type
     * @returns {any}
     */
    static toValue(data, type) {
        return fromJson(data, type);
    }
}

module.exports = { DisorderJson, toJson, fromJson };
