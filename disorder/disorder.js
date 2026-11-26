const fs = require('fs');
const { Type } = require('./schema');
const { Writer, Reader } = require('./binary');

/**
 * A disorder file is a header (`map[string]`) followed by a single value.
 */
class Disorder {
    static HEADER_TYPE = new Type('map[string]');

    /**
     * @param {Map<string, string>} header
     * @param {Type} type type of the value
     * @param {any} value
     * @returns {Uint8Array}
     */
    static encode(header, type, value) {
        const writer = new Writer();
        writer.write(header, Disorder.HEADER_TYPE);
        writer.write(value, type);
        return writer.toBytes();
    }

    /**
     * The value is self-describing, so no schema is needed to read it back.
     * `value` is undefined when the file only contains a header.
     *
     * @param {Uint8Array} bytes
     * @returns {{header: Map<string, string>, value: any}}
     */
    static decode(bytes) {
        const reader = Reader.fromBytes(bytes);
        const header = reader.read();
        const value = reader.hasMore() ? reader.read() : undefined;
        return { header, value };
    }

    /**
     * @param {Map<string, string>} header
     * @param {Type} type type of the value
     * @param {any} value
     * @param {string} path
     * @returns {void}
     */
    static write(header, type, value, path) {
        fs.writeFileSync(path, Disorder.encode(header, type, value));
    }

    /**
     * @param {string} path
     * @returns {{header: Map<string, string>, value: any}}
     */
    static read(path) {
        return Disorder.decode(new Uint8Array(fs.readFileSync(path)));
    }
}

module.exports = { Disorder };
