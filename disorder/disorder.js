const fs = require('fs')
const { Type } = require('./schema');
const { Writer, Reader, ByteArray } = require('./binary');

class Disorder {
    static HEADER_TYPE = new Type("map[string]");

    /**
     * @param {Map<string, string>} header
     * @param {any} value 
     * @param {Type} type
     * @param {string} path
     * @returns {void}
     */
    static write(header, type, value, path) {
        const writer = new Writer();
        const headerType = Disorder.HEADER_TYPE
        console.log(headerType)
        writer.write(header, Disorder.HEADER_TYPE);
        writer.write(value, type);
        fs.writeFileSync(path, writer.bytes.buffer);
    }

    /*
     * @param {string} path
     * @returns {Map<string, any>}

    static async read(path) {
        vscode.workspace.fs.readFile(uri).then((data) => {
            const bytes = new ByteArray(data)
    });
        const reader = new Reader(bytes);
        const header = reader.read();
        return header;
    }     */
}

module.exports = { Disorder }