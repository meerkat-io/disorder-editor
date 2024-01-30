const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml')

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
    static ENUM_REFERENCE = 'enum_reference';

    static STRUCT = 'struct';
    static STRUCT_REFERENCE = 'struct_reference';

    static primaryTypes = [Type.BOOL, Type.INT, Type.LONG, Type.FLOAT, Type.DOUBLE, Type.BYTES,
        Type.STRING, Type.TIMESTAMP];

    static reservedNames = [Type.BOOL, Type.INT, Type.LONG, Type.FLOAT, Type.DOUBLE, Type.BYTES,
        Type.STRING, Type.TIMESTAMP, Type.ENUM, Type.ARRAY, Type.MAP, Type.STRUCT];

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
         * @type {Map<string, Type>}
         */
        this.fields = undefined;
        /**
         * @type {string[]}
         */
        this.enums = undefined;

        if (Type.isPrimary(this.type)) {
            // pass
        } else if (this.type.startsWith('array[') && this.type.endsWith(']')) {
            this.reference = new Type(this.type.substring(6, this.type.length - 1));
            this.type = Type.ARRAY;
        } else if (this.type.startsWith('map[') && this.type.endsWith(']')) {
            this.reference = new Type(this.type.substring(4, this.type.length - 1));
            this.type = Type.MAP;
        } else if (this.type === Type.STRUCT) {
            this.fields = new Map();
        } else if (this.type === Type.ENUM) {
            this.enums = [];
        } else if (!validateQualifiedName(this.type)) {
            throw new Error(`Type "${type}" is not a valid type name`);
        }
    }

    /**
     * @param {string} type 
     * @returns {boolean}
     */
    static isPrimary(type) {
        return Type.primaryTypes.indexOf(type) !== -1;
    }

    /**
     * @param {string} name
     * @returns {boolean}
     */
    static isReserved(name) {
        return Type.reservedNames.indexOf(name) !== -1;
    }
}

/**
 * @public
 * @property {Map<string, Type>} messages
 * @property {Map<string, Type>} enums
 * @property {Set<string>} processedFiles
 * @property {Map<string, Type[]>} packageMessages
 */
class Schema {
    static SCHEMA_NAME = 'disorder';

    constructor() {
        /**
         * @private
         * @type {Map<string, Type>}
         */
        this.messages = new Map();
        /**
         * @private
         * @type {Map<string, Type>}
         */
        this.enums = new Map();
        /**
         * @private
         * @type {Set<string>}
         */
        this.processedFiles = new Set();
        /**
         * @private
         * @type {Map<string, Type[]>}
         */
        this.packageMessages = new Map();
    }

    /**
     * @param {string} qualified 
     * @returns Type
     */
    getEnum(qualified) {
        return this.enums.get(qualified);
    }

    /**
     * @param {string} qualified 
     * @returns 
     */
    getMessage(qualified) {
        return this.messages.get(qualified);
    }

    /**
     * @param {string} filePath 
     * @returns {string[]}
     */
    load(filePath) {
        const messages = this.parse(path.resolve(filePath));
        this.resovle();
        return messages;
    }

    /** 
     * @private
     * @param {string} filePath
     * @returns {YamlFile}
     */
    loadYaml(filePath) {
        return yaml.load(fs.readFileSync(filePath, 'utf8'));
    }

    /**
     * @private
     * @param {string} filePath 
     * @returns {string[]}
     */
    parse(filePath) {
        console.log(`Loading schema ${filePath}`);
        if (this.processedFiles.has(filePath)) {
            return;
        }
        this.processedFiles.add(filePath);

        const file = this.loadYaml(filePath);
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

        /**
         * @type {string[]}
         */
        const messages = [];
        if (file.messages) {
            if (!(typeof file.messages === 'object')) {
                throw new Error(`Schema ${filePath} messages must be a map`);
            }

            for (const messageName of Object.keys(file.messages)) {
                if (!validateSimpleName(messageName) || Type.isReserved(messageName)) {
                    throw new Error(`Schema ${filePath} message name "${messageName}" is invalid`);
                }
                const qualifiedName = `${packageName}.${messageName}`;
                if (this.messages.has(qualifiedName)) {
                    throw new Error(`Schema ${filePath} message "${messageName}" is duplicated`);
                }

                /**
                 * @type {Map<string, string>}
                 */
                const fields = file.messages[messageName];
                if (!(typeof fields === 'object')) {
                    throw new Error(`Schema ${filePath} message "${messageName}" fields must be a map`);
                }
                /**
                 * @type {Set<string>}
                 */
                const fieldsSet = new Set();
                const struct = new Type(Type.STRUCT);
                for (const fieldName of Object.keys(fields)) {
                    if (!validateSimpleName(fieldName) || Type.isReserved(fieldName)) {
                        throw new Error(`Schema ${filePath} message ${messageName} field name "${fieldName}" is invalid`);
                    }
                    if (fieldsSet.has(fieldName)) {
                        throw new Error(`Schema ${filePath} message ${messageName} field name "${fieldName}" is duplicated`);
                    }
                    const fieldType = fields[fieldName];
                    struct.fields.set(fieldName, new Type(fieldType));
                    fieldsSet.add(fieldName);
                }
                this.messages.set(qualifiedName, struct);
                if (!this.packageMessages.has(packageName)) {
                    this.packageMessages.set(packageName, []);
                }
                this.packageMessages.get(packageName).push(struct);
                messages.push(messageName);
            }
        }

        if (file.enums) {
            if (!(typeof file.enums === 'object')) {
                throw new Error(`Schema ${filePath} enums must be a map`);
            }

            for (const enumName of Object.keys(file.enums)) {
                if (!validateSimpleName(enumName) || Type.isReserved(enumName)) {
                    throw new Error(`Schema ${filePath} enum name "${enumName}" is invalid`);
                }
                const qualifiedName = `${packageName}.${enumName}`;
                if (this.enums.has(qualifiedName)) {
                    throw new Error(`Schema ${filePath} enum "${enumName}" is duplicated`);
                }

                /**
                 * @type {string[]}
                 */
                const enums = file.enums[enumName];
                if (!(typeof enums === 'object' && enums instanceof Array)) {
                    throw new Error(`Schema ${filePath} enum "${enumName}" values must be an array`);
                }
                /**
                 * @type {Set<string>}
                 */
                const valuesSet = new Set();
                const enumType = new Type(Type.ENUM);
                for (const enumValue of enums) {
                    if (typeof enumValue !== 'string') {
                        throw new Error(`Schema ${filePath} enum "${enumName}" value "${enumValue}" must be a string`);
                    }
                    if (!validateSimpleName(enumValue)) {
                        throw new Error(`Schema ${filePath} enum "${enumName}" value "${enumValue}" must be a valid simple variable name`);
                    }
                    if (valuesSet.has(enumValue)) {
                        throw new Error(`Schema ${filePath} enum "${enumName}" value "${enumValue}" is duplicated`);
                    }
                    valuesSet.add(enumValue);
                }
                enumType.enums = enums;
                this.enums.set(qualifiedName, enumType);
            }
        }

        const folder = path.dirname(filePath);
        if (file.import) {
            for (const importPath of file.import) {
                this.parse(path.resolve(folder, importPath));
            }
        }

        return messages;
    }

    /**
     * @private
     */
    resovle() {
        for (const [packageName, messages] of this.packageMessages.entries()) {
            for (const message of messages) {
                for (const fieldType of message.fields.values()) {
                    let type = fieldType;
                    while (type.type === Type.ARRAY || type.type === Type.MAP) {
                        type = type.reference;
                    }
                    if (!Type.isPrimary(type.type)) {
                        let qualified = type.type;
                        if (!qualified.includes('.')) {
                            qualified = `${packageName}.${qualified}`;
                        }
                        if (this.enums.has(qualified)) {
                            type.type = Type.ENUM_REFERENCE;
                            type.reference = this.enums.get(qualified);
                        } else if (this.messages.has(qualified)) {
                            type.type = Type.STRUCT_REFERENCE;
                            type.reference = this.messages.get(qualified);
                        } else {
                            throw new Error(`Type "${type.reference}" is not defined`);
                        }
                    }
                }
            }
        }
    }
}

/**
 * @typedef {Object} YamlFile
 * @property {string} [schema]
 * @property {string} [version]
 * @property {string} [package]
 * @property {string[]} [import]
 * @property {Map<string, Map<string, string>>} [messages]
 * @property {Map<string, string[]>} [enums]
 */

const simpleName = new RegExp(`^[a-zA-Z_][a-zA-Z_0-9]*$`);
const qualifiedName = new RegExp(`^[a-zA-Z_][a-zA-Z_0-9]*(.[a-zA-Z_][a-zA-Z_0-9]*)*$`);

/**
 * @param {string} name 
 * @returns {boolean} 
 */
function validateSimpleName(name) {
    return simpleName.test(name);
}

/**
 * @param {string} name 
 * @returns {boolean} 
 */
function validateQualifiedName(name) {
    return qualifiedName.test(name);
}

module.exports = { Type, Schema };