const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml')

/**
 * @property {string} type
 * @property {Type} element
 */
class Type {
    static Undefined = new Type('undefined');

    static Bool = new Type('bool');
    static Int = new Type('int');
    static Long = new Type('long');
    static Float = new Type('float');
    static Double = new Type('double');
    static Bytes = new Type('bytes');

    static String = new Type('string');
    static Timestamp = new Type('timestamp');
    static Enum = new Type('enum');

    static Array = new Type('array');
    static Map = new Type('map');

    static primaryTypes = ['bool', 'int', 'long', 'float', 'double', 'bytes', 'string', 'timestamp'];

    /**
     * @param {string} type 
     */
    constructor(type) {
        this.type = type;
        this.element = undefined;
    }

    toString() {
        return this.type;
    }

    /**
     * @param {string} type 
     * @returns 
     */
    static isPrimary(type) {
        return Type.primaryTypes.indexOf(type) !== -1;
    }

    /**
     * @param {string} type 
     * @returns {boolean} 
     */
    static isArray(type) {
        return type.startsWith('array[') && type.endsWith(']');
    }

    /**
     * @param {string} type 
     * @returns {boolean} 
     */
    static isMapType(type) {
        return type.startsWith('map[') && type.endsWith(']');
    }
}

/**
 * @public
 * @property {string} qualified
 * @property {Map<string, Type>} fields
 */
class Message {
    constructor() {
        this.qualified = undefined;
        this.fields = new Map();
    }
}

/**
 * @public
 * @property {string} qualified
 * @property {string[]} values
 */
class Enum {
    constructor() {
        this.qualified = undefined;
        this.values = [];
    }
}

/**
 * @public
 * @property {Map<string, Message>} messages
 * @property {Map<string, Enum>} enums
 * @property {Set<string>} processedFiles
 * @property {Map<string, string[]>} fileMessages
 */
class Schema {
    static SCHEMA_NAME = 'disorder';
    constructor() {
        this.messages = new Map();
        this.enums = new Map();
        this.processedFiles = new Set();
        this.fileMessages = new Map();
    }

    /**
     * @param {string} filePath 
     */
    load(filePath) {
        filePath = path.resolve(filePath);
        if (this.processedFiles.has(filePath)) {
            return;
        }
        this.processedFiles.add(filePath);

        const file = loadYaml(filePath);
        if (!file.schema || file.schema !== Schema.SCHEMA_NAME) {
            throw new Error(`Schema ${filePath} is not a ${Schema.SCHEMA_NAME} schema`);
        }

        if (!file.package) {
            throw new Error(`Schema ${filePath} does not have a valid package name`);
        }
        const packageName = file.package;
        if (!validateQualifiedName(packageName)) {
            throw new Error(`Schema ${filePath} package "${packageName}" is invalid`);
        }

        if (!file.messages) {
            throw new Error(`Schema ${filePath} does not have any messages`);
        }
        if (!(typeof file.messages === 'object')) {
            throw new Error(`Schema ${filePath} messages must be a map`);
        }

        for (const name of Object.keys(file.messages)) {
            if (!validateSimpleName(name)) {
                throw new Error(`Schema ${filePath} message name "${name}" is invalid`);
            }
            const fields = file.messages[name];
            if (!(typeof fields === 'object')) {
                throw new Error(`Schema ${filePath} message "${name}" fields must be a map`);
            }
            const fieldsSet = new Set();
            const qualifiedName = `${packageName}.${name}`;
            const message = new Message();
            message.qualified = qualifiedName;
            message.fields = new Map();
            for (const fieldName of Object.keys(fields)) {
                if (!validateSimpleName(fieldName)) {
                    throw new Error(`Schema ${filePath} message ${name} field name "${fieldName}" is invalid`);
                }
                if (fieldsSet.has(fieldName)) {
                    throw new Error(`Schema ${filePath} message ${name} field name "${fieldName}" is duplicated`);
                }
                //TO-DO
                //fieldType = fields[fieldName];
                //message.fields.set(fieldName, this.resolveType(fieldType));
                fieldsSet.add(fieldName);
            }
            this.messages.set(qualifiedName, message);
        }

        if (file.enums) {
            if (!(typeof file.enums === 'object')) {
                throw new Error(`Schema ${filePath} enums must be a map`);
            }
            for (const name of Object.keys(file.enums)) {
                const values = file.enums[name];
                if (!(typeof values === 'object' && values instanceof Array)) {
                    throw new Error(`Schema ${filePath} enum "${name}" values must be an array`);
                }
                if (!validateSimpleName(name)) {
                    throw new Error(`Schema ${filePath} enum name "${name}" is invalid`);
                }
                const valuesSet = new Set();
                for (const value of values) {
                    if (typeof value !== 'string') {
                        throw new Error(`Schema ${filePath} enum "${name}" value "${value}" must be a string`);
                    }
                    if (!validateEnumValue(value)) {
                        throw new Error(`Schema ${filePath} enum "${name}" value "${value}" must be a valid simple variable name`);
                    }
                    if (valuesSet.has(value)) {
                        throw new Error(`Schema ${filePath} enum "${name}" value "${value}" is duplicated`);
                    }
                    valuesSet.add(value);
                }
                const qualifiedName = `${packageName}.${name}`;
                const enum_ = new Enum();
                enum_.qualified = qualifiedName;
                enum_.values = values;
                this.enums.set(qualifiedName, enum_);
            }
        }

        /*
        if (file.import) {
            for (const importPath of file.import) {
                this.load(importPath);
            }
        }*/
        console.log(this);
    }

    resovle() {

    }

    validate() {

    }
}

/**
 * @typedef {Object} File
 * @property {string} [schema]
 * @property {string} [version]
 * @property {string} [package]
 * @property {string[]} [import]
 * @property {Map<string, Map<string, string>>} [messages]
 * @property {Map<string, string[]>} [enums]
 */

/** 
 * @param {string} filePath
 * @returns {File}
 */
function loadYaml(filePath) {
    return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

const simpleName = new RegExp(`^[a-zA-Z_][a-zA-Z_0-9]*$`);
const qualifiedName = new RegExp(`^[a-zA-Z_][a-zA-Z_0-9]*(.[a-zA-Z_][a-zA-Z_0-9]*)*$`);

/**
 * @param {string} name 
 * @returns {boolean} 
 */
function validateSimpleName(name) {
    if (Type.isPrimary(name)) {
        return false;
    }
    return simpleName.test(name);
}

/**
 * @param {string} name 
 * @returns {boolean} 
 */
function validateQualifiedName(name) {
    return qualifiedName.test(name);
}

/**
 * @param {string} value 
 * @returns {boolean} 
 */
function validateEnumValue(value) {
    return simpleName.test(value);
}

module.exports = { Type, Message, Enum, Schema };