const vscode = require('vscode');
const path = require('path')
const { Type, Schema } = require('./schema');
const { Reader, Writer, ByteArray } = require('./binary');

/**
 * @public
 * @property {string} filePath
 * @property {string} schemaPath
 * @property {Schema} schema
 * @property {string} message
 * @property {string} container
 * @property {Type} type
 * @property {Uint8Array} content
 * @property {boolean} initialized
 */
class File {
    static HEADER_TYPE = new Type('map[string]');

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
        this.schemaPath = '';
        /**
         * @type {Schema}
         */
        this.schema = new Schema();
        /**
         * @type {string}
         */
        this.message = '';
        /**
         * @type {string}
         */
        this.container = ContainerType.NONE;
        /**
         * @type {Type}
         */
        this.type = null;
        /**
         * @type {Uint8Array}
         */
        this.content = null;
        /**
         * @type {boolean}
         */
        this.initialized = false;
    }

    /**
	 * @param {string | undefined} backupId
     * @returns {Promise<void>}
     */
    async load(backupId) {
        const uri = vscode.Uri.parse(backupId ? backupId : this.filePath);
        this.content = new Uint8Array(await vscode.workspace.fs.readFile(uri));
        if (this.content.length === 0) {
            return;
        }

        const reader = new Reader(new ByteArray(this.content));
        const headers = reader.read();

        this.schemaPath = this.readHeader(headers, HeaderName.SCHEMA);
        const absSchemaPath = path.join(path.dirname(this.filePath), this.schemaPath);
        await this.schema.load(absSchemaPath);
        this.setMessage(this.readHeader(headers, HeaderName.MESSAGE), this.readHeader(headers, HeaderName.CONTAINER));
    }

    async save() {
        const header = [];
        header.push({ key: HeaderName.SCHEMA, value: this.schemaPath });
        header.push({ key: HeaderName.MESSAGE, value: this.message });
        header.push({ key: HeaderName.CONTAINER, value: this.container });

        const writer = new Writer();
        writer.write(header, File.HEADER_TYPE);
        writer.write([], this.type);
        this.content = writer.bytes.getBytes();
        const uri = vscode.Uri.parse(this.filePath);
        await vscode.workspace.fs.writeFile(uri, this.content);
    }

    /**
     * @param {string} absSchemaPath 
     * @returns {Promise<string[]>}
     */
    async loadSchema(absSchemaPath) {
        this.schemaPath = path.relative(path.dirname(this.filePath), absSchemaPath)
        return this.schema.load(absSchemaPath);
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
            this.type = new Type("array[" + this.message + "]");
            this.type.reference = type;
        } else if (this.container === "map") {
            this.type = new Type("map[" + this.message + "]");
            this.type.reference = type;
        }

        this.initialized = true;
    }

    /**
     * @param {Array} headers
     * @param {string} name
     * @returns {string}
     */
    readHeader(headers, name) {
        for (let pair of headers) {
            if (pair.key === name) {
                return pair.value;
            }
        }
        return '';
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