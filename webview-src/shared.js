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
 * @property {Operation} undo
 * @property {Operation} redo
 */
class Edit {
    /**
     * @param {Operation} undo 
     * @param {Operation} redo 
     */
    constructor(undo, redo) {
        this.undo = undo;
        this.redo = redo;
    }
}

/**
 * @property {string} type
 * @property {string} path
 * @property {any} value
 */
class Operation {
    /**
     * @param {string} type 
     * @param {string} path 
     * @param {any} value 
     */
    constructor(type, path, value) {
        this.type = type;
        this.path = path;
        this.value = value;
    }
}

const OperationType = {
    INSERT: 'insert',
    DELETE: 'delete',
    UPDATE: 'update',
};

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

const OutMessageType = {
    SCHEMA: 'schema',
    MESSAGE: 'message',
    EDIT: 'edit',
    READY: 'ready',
};

export { Type, Edit, Operation, OperationType, Container, SchemaStatus, ContextMenuAction, OutMessageType, getDefaultValue };