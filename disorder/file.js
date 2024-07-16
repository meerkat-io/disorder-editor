const fs = require('fs')
const path = require('path')
const { Type, Schema } = require('./schema');
const { Writer, Reader, ByteArray } = require('./binary');

/**
 * @public
 * @property {string} filePath
 * @property {string} schemaPath
 * @property {Schema} schema
 * @property {string} message
 * @property {string} container
 * @property {Type} type
 * @property {any} value
 * @property {boolean} initialized
 */
class File {
    static HEADER_TYPE = new Type("map[string]");

    /**
     * @param {string} filePath 
     */
    constructor(filePath) {
        /**
         * @type {string}
         */
        this.filePath = filePath;
        /**
         * @type {string}
         */
        this.schemaPath = "";
        /**
         * @type {Schema}
         */
        this.schema = new Schema();
        /**
         * @type {string}
         */
        this.message = "";
        /**
         * @type {string}
         */
        this.container = ContainerType.NONE;
        /**
         * @type {Type}
         */
        this.type = null;
        /**
         * @type {any}
         */
        this.value = null;
        /**
         * @type {boolean}
         */
        this.initialized = false;
    }

    /**
     * @param {string} schemaPath 
     * @returns {string[]}
     */
    loadSchema(schemaPath) {
        this.schemaPath = path.relative(this.filePath, schemaPath)
        return this.schema.load(schemaPath);
    }

    /**
     * @param {string} message
     * @param {string} container
     * @returns {void}
     */
    setMessage(message, container) {
        this.message = message;
        this.container = container;

        const type = this.schema.getMessage(this.message);
        if (this.container === ContainerType.NONE) {
            this.type = type;
        } else if (this.container === "array") {
            this.type = new Type("array[]");
            this.type.reference = type;
        } else if (this.container === "map") {
            this.type = new Type("map[]");
            this.type.reference = type;
        }

        this.initialized = true;
    }

    /**
     * @param {any} value 
     * @returns {void}
     */
    write(value) {
        this.value = value;

        const header = new Map();
        header.set(HeaderName.SCHEMA, this.schemaPath);
        header.set(HeaderName.MESSAGE, this.message);
        header.set(HeaderName.CONTAINER, this.container);

        const writer = new Writer();
        writer.write(header, File.HEADER_TYPE);
        writer.write(value, this.type);
        fs.writeFileSync(this.filePath, writer.bytes.buffer);
    }

    /**
     * @returns {any}
     */
    read() {
        const bytes = fs.readFileSync(this.filePath);
        if (bytes.length === 0) {
            return null;
        }
        const reader = new Reader(new ByteArray(bytes));

        const header = reader.read();
        this.schemaPath = header.get(HeaderName.SCHEMA);

        const schemaPath = path.join(path.dirname(this.filePath), this.schemaPath);
        this.schema.load(schemaPath);

        this.setMessage(header.get(HeaderName.MESSAGE), header.get(HeaderName.CONTAINER));
        this.value=reader.read();
        return this.value;
    }
}

const ContainerType = {
    NONE: "none",
    ARRAY: "array",
    MAP: "map",
}

const HeaderName = {
    SCHEMA: "schema",
    MESSAGE: "message",
    CONTAINER: "container",
}

module.exports = { File }