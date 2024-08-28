/**
 * @property {string} type
 * @property {Type} reference
 * @property {Object} fields
 * @property {string[]} enums
 */
class Type {
    static BOOL = 'bool';
    static INT = 'int';
    static LONG = 'long';
    static FLOAT = 'float';
    static DOUBLE = 'double';
    static BYTES = 'bytes';

    static STRING = 'string';
    static TIMESTAMP = 'timestamp';

    static ARRAY = 'array';
    static MAP = 'map';
    static ENUM = 'enum';
    static STRUCT = 'struct';

    /**
     * @param {string} type 
     */
    constructor(type) {
        if (typeof type !== 'string') {
            throw new Error('Type must be a string');
        }
        /**
         * @type {string}
         */
        this.type = type;
    }
}

/**
 * @param {string} type 
 */
function getDefaultValue(type) {
    switch (type) {
        case Type.BOOL:
            return false;
        case Type.INT:
        case Type.LONG:
        case Type.FLOAT:
        case Type.DOUBLE:
        case Type.TIMESTAMP:
            return 0;
        case Type.BYTES:
            return null;
        case Type.STRING:
        case Type.ENUM:
            return '';
        case Type.ARRAY:
            return [];
        case Type.MAP:
        case Type.STRUCT:
            return {};
        default:
            throw new Error(`Unknown type: ${type}`);
    }
}

const Container = {
    NONE: 'none',
    ARRAY: 'array',
    MAP: 'map',
};

const SchemaStatus = {
    NONE: 'none',
    LOAD: 'load',
    VALID: 'valid',
    INVALID: 'invalid',
};

const ContextMenuAction = {
    INSERT_ABOVE: 'insert_above',
    INSERT_BELOW: 'insert_below',
    DELETE: 'delete',
}

export { Type, Container, SchemaStatus, ContextMenuAction, getDefaultValue };