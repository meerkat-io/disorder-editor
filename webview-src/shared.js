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
        /**
         * @type {Type}
         */
        this.reference = undefined;
        /**
         * @type {Object}
         */
        this.fields = undefined;
        /**
         * @type {string[]}
         */
        this.enums = undefined;
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
     * @param {number} index
     */
    constructor(type, path, value, index) {
        this.type = type;
        this.path = path;
        this.value = value;
        this.index = index;
    }
}

const OperationType = {
    UPDATE: 'update',
    INSERT: 'insert',
    DELETE: 'delete',
    RESET: 'reset',
    COPY: 'copy',
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
            return 0;
        case Type.BYTES:
            return null;
        case Type.TIMESTAMP:
        case Type.STRING:
        case Type.ENUM:
            return '';
        case Type.ARRAY:
        case Type.MAP:
        case Type.STRUCT:
            return [];
        default:
            throw new Error(`Unknown type: ${type}`);
    }
}

/**
 * @param {string} type
 * @param {any} value
 * @returns {boolean}
 */
function isEmptyValue(type, value) {
    switch (type) {
        case Type.BOOL:
            return value === false;
        case Type.INT:
        case Type.LONG:
        case Type.FLOAT:
        case Type.DOUBLE:
            return value === 0;
        case Type.BYTES:
            return value === null;
        case Type.TIMESTAMP:
        case Type.STRING:
        case Type.ENUM:
            return value ==='';
        case Type.ARRAY:
        case Type.MAP:
        case Type.STRUCT:
            return value.length === 0;
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

const MessageType = {
    READY: 'ready',
    EDIT: 'edit',
    UNDO: 'undo',
    REDO: 'redo',
    SAVE: 'save',
    REVERT: 'revert',

    SCHEMA: 'schema',
    MESSAGE: 'message',
    DATAGRID: 'datagrid',
};

export { Type, Edit, Operation, OperationType, Container, SchemaStatus, ContextMenuAction, MessageType, getDefaultValue, isEmptyValue };