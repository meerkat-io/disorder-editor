
/**
 * @property {string} type
 * @property {Type} reference
 * @property {Map<string, Type>} fields
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
}

/**
 * @property {string} name
 * @property {Type} type
 * @property {any} value
 */
class Node {

    /**
     * @param {string} name 
     * @param {Type} type 
     * @param {any} value 
     */
    constructor(name, type, value) {
        /**
         * @type {string}
         */
        this.name = name;
        /**
         * @type {Type}
         */
        this.type = type;
        /**
         * @type {any}
         */
        this.value = value;
    }
}

export { Type, Node };