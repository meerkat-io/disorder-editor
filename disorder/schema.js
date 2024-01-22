const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml')

//TO-DO cyclic reference check (between messages)

/**
 * @property {string} type
 * @property {Type} element
 * @property {Map<string, Type>} children
 * @property {string} reference
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
    static ENUM = 'enum';

    static ARRAY = 'array';
    static MAP = 'map';

    static STRUCT = 'struct';
    static REFERENCE = 'reference';

    static primaryTypes = [Type.BOOL, Type.INT, Type.LONG, Type.FLOAT, Type.DOUBLE, Type.BYTES,
    Type.STRING, Type.TIMESTAMP, Type.ENUM];

    /**
     * @param {string} type 
     */
    constructor(type) {
        if (typeof type !== 'string') {
            throw new Error('Type must be a string');
        }
        this.type = type;
        this.element = undefined;
        this.children = undefined;
        this.reference = undefined;

        if (Type.isPrimary(this.type)) {
            // pass
        } else if (this.type.startsWith('array[') && this.type.endsWith(']')) {
            this.element = new Type(this.type.substring(6, this.type.length - 1));
            this.type = Type.ARRAY;
        } else if (this.type.startsWith('map[') && this.type.endsWith(']')) {
            this.element = new Type(this.type.substring(4, this.type.length - 1));
            this.type = Type.MAP;
        } else if (this.type === Type.STRUCT) {
            this.children = new Map();
        } else if (validateQualifiedName(this.type)) {
            this.reference = this.type;
            this.type = Type.REFERENCE;
        } else {
            throw new Error(`Type "${type}" is not a valid type`);
        }
    }

    /**
     * @param {string} type 
     * @returns 
     */
    static isPrimary(type) {
        return Type.primaryTypes.indexOf(type) !== -1;
    }
}

/**
 * @public
 * @property {Map<string, Type>} messages
 * @property {Map<string, string[]>} enums
 * @property {Set<string>} processedFiles
 * @property {Map<string, Type[]>} packageMessages
 */
class Schema {
    static SCHEMA_NAME = 'disorder';

    constructor() {
        this.messages = new Map();
        this.enums = new Map();
        this.processedFiles = new Set();
        this.packageMessages = new Map();
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

        const messages = [];
        if (file.messages) {
            if (!(typeof file.messages === 'object')) {
                throw new Error(`Schema ${filePath} messages must be a map`);
            }

            for (const name of Object.keys(file.messages)) {
                if (!validateSimpleName(name)) {
                    throw new Error(`Schema ${filePath} message name "${name}" is invalid`);
                }
                const qualifiedName = `${packageName}.${name}`;
                if (this.messages.has(qualifiedName)) {
                    throw new Error(`Schema ${filePath} message "${name}" is duplicated`);
                }

                const fields = file.messages[name];
                if (!(typeof fields === 'object')) {
                    throw new Error(`Schema ${filePath} message "${name}" fields must be a map`);
                }
                const fieldsSet = new Set();
                const struct = new Type(Type.STRUCT);
                for (const fieldName of Object.keys(fields)) {
                    if (!validateSimpleName(fieldName)) {
                        throw new Error(`Schema ${filePath} message ${name} field name "${fieldName}" is invalid`);
                    }
                    if (fieldsSet.has(fieldName)) {
                        throw new Error(`Schema ${filePath} message ${name} field name "${fieldName}" is duplicated`);
                    }
                    const fieldType = fields[fieldName];
                    struct.children.set(fieldName, new Type(fieldType));
                    fieldsSet.add(fieldName);
                }
                this.messages.set(qualifiedName, struct);
                if (!this.packageMessages.has(packageName)) {
                    this.packageMessages.set(packageName, []);
                }
                this.packageMessages.get(packageName).push(struct);
                messages.push(name);
            }
        }

        if (file.enums) {
            if (!(typeof file.enums === 'object')) {
                throw new Error(`Schema ${filePath} enums must be a map`);
            }

            for (const name of Object.keys(file.enums)) {
                if (!validateSimpleName(name)) {
                    throw new Error(`Schema ${filePath} enum name "${name}" is invalid`);
                }
                const qualifiedName = `${packageName}.${name}`;
                if (this.enums.has(qualifiedName)) {
                    throw new Error(`Schema ${filePath} enum "${name}" is duplicated`);
                }

                const values = file.enums[name];
                if (!(typeof values === 'object' && values instanceof Array)) {
                    throw new Error(`Schema ${filePath} enum "${name}" values must be an array`);
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
                this.enums.set(qualifiedName, values);
            }
        }

        const folder = path.dirname(filePath);
        if (file.import) {
            for (const importPath of file.import) {
                this.load(path.resolve(folder, importPath));
            }
        }

        return messages;
    }

    /**
     * @private
     */
    resovle() {
        for (const [packageName, messages] of this.packageMessages) {
            for (const message of messages) {
                for (const [name, field] of message.children.entries()) {
                    let type = field.type;
                    let container = field.element;
                    while (type === Type.ARRAY || type === Type.MAP) {
                        container = container.element;
                        type = container.type;
                    }
                    if (type === Type.REFERENCE) {
                        let qualified = type.reference;
                        if (!qualified.includes('.')) {
                            qualified = `${packageName}.${qualified}`;
                        }
                        if (this.enums.has(qualified)) {
                            type.type = Type.ENUM;
                            type.reference = undefined;
                        } else if (this.messages.has(qualified)) {
                            if (container) {
                                container.element = this.messages.get(qualified);
                            } else {
                                message.children.set(name, this.messages.get(qualified));
                            }
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

module.exports = { Type, Schema };