const fs = require('fs');
const { Type } = require('./schema');

/**
 * Tag is used in disorder binary stream 
 * to indicate the type of the following value.
 */
const Tag = {
    Undefined: 0,

    Bool: 1,
    Int: 2,
    Long: 3,
    Float: 4,
    Double: 5,
    Bytes: 6,

    String: 11,
    Timestamp: 12,
    Enum: 13,

    ArrayStart: 21,
    ArrayEnd: 22,
    ObjectStart: 23,
    ObjectEnd: 24
}

const TypeTag = new Map([
    [Type.BOOL, Tag.Bool],
    [Type.INT, Tag.Int],
    [Type.LONG, Tag.Long],
    [Type.FLOAT, Tag.Float],
    [Type.DOUBLE, Tag.Double],
    [Type.BYTES, Tag.Bytes],

    [Type.STRING, Tag.String],
    [Type.TIMESTAMP, Tag.Timestamp],

    [Type.ARRAY, Tag.ArrayStart],
    [Type.MAP, Tag.ObjectStart],

    [Type.ENUM, Tag.Enum],
    [Type.ENUM_REFERENCE, Tag.Enum],

    [Type.STRUCT, Tag.ObjectStart],
    [Type.STRUCT_REFERENCE, Tag.ObjectStart]
]);

/**
 * @public
 * @property {Uint8Array} buffer
 * @property {number} readOffset
 * @property {number} writeOffset
 * @property {Float32Array} f32
 * @property {Uint8Array} f32Bytes
 * @property {Float64Array} f64
 * @property {Uint8Array} f64Bytes
 * @property {boolean} floatLE
 */
class ByteArray {
    /**
     * @param {Uint8Array | undefined} buffer
     */
    constructor(buffer = undefined) {
        /**
         * @type {Uint8Array}
         */
        this.buffer = buffer;
        /**
         * @type {number}
         * @private
         */
        this.readOffset = 0;
        /**
         * @type {number}
         * @private
         */
        this.writeOffset = 0;
        if (this.buffer) {
            this.writeOffset = this.buffer.length;
        } else {
            this.buffer = new Uint8Array(1024);
        }

        /**
         * @type {Float32Array}
         * @private
         */
        this.f32 = new Float32Array([-0]);
        /**
         * @type {Uint8Array}
         * @private
         */
        this.f32Bytes = new Uint8Array(this.f32.buffer);
        /**
         * @type {Float64Array}
         * @private
         */
        this.f64 = new Float64Array([-0]);
        /**
         * @type {Uint8Array}
         * @private
         */
        this.f64Bytes = new Uint8Array(this.f64.buffer);

        /**
         * @type {boolean}
         * @private
         */
        this.floatLE = this.f32Bytes[3] === 128;
    }

    /**
     * @returns {boolean}
     */
    readBoolean() {
        this.checkReadOffset(1);
        const value = this.buffer[this.readOffset] !== 0;
        this.readOffset += 1;
        return value;
    }

    /**
     * @returns {number}
     */
    readByte() {
        this.checkReadOffset(1);
        const value = this.buffer[this.readOffset];
        this.readOffset += 1;
        return value;
    }

    /**
     * @param {number} length 
     * @returns {Uint8Array}
     */
    readBytes(length) {
        this.checkReadOffset(length);
        const value = this.buffer.subarray(this.readOffset, this.readOffset + length);
        this.readOffset += length;
        return value;
    }

    /**
     * @returns {number}
     */
    readInt() {
        this.checkReadOffset(4);
        const value = this.buffer[this.readOffset] << 24
            | this.buffer[this.readOffset + 1] << 16
            | this.buffer[this.readOffset + 2] << 8
            | this.buffer[this.readOffset + 3];
        this.readOffset += 4;
        return value;
    }

    /**
     * @returns {bigint}
     */
    readLong() {
        this.checkReadOffset(8);
        let high = BigInt.asUintN(32, BigInt(this.readInt()));
        let low = BigInt.asUintN(32, BigInt(this.readInt()));
        return BigInt.asIntN(64, (high << 32n) | low);
    }

    /**
     * @returns {number}
     */
    readFloat() {
        this.checkReadOffset(4);
        if (this.floatLE) {
            this.f32Bytes[3] = this.buffer[this.readOffset];
            this.f32Bytes[2] = this.buffer[this.readOffset + 1];
            this.f32Bytes[1] = this.buffer[this.readOffset + 2];
            this.f32Bytes[0] = this.buffer[this.readOffset + 3];
        } else {
            this.f32Bytes[0] = this.buffer[this.readOffset];
            this.f32Bytes[1] = this.buffer[this.readOffset + 1];
            this.f32Bytes[2] = this.buffer[this.readOffset + 2];
            this.f32Bytes[3] = this.buffer[this.readOffset + 3];
        }
        this.readOffset += 4;
        return this.f32[0];
    }

    /**
     * @returns {number}
     */
    readDouble() {
        this.checkReadOffset(8);
        if (this.floatLE) {
            this.f64Bytes[7] = this.buffer[this.readOffset];
            this.f64Bytes[6] = this.buffer[this.readOffset + 1];
            this.f64Bytes[5] = this.buffer[this.readOffset + 2];
            this.f64Bytes[4] = this.buffer[this.readOffset + 3];
            this.f64Bytes[3] = this.buffer[this.readOffset + 4];
            this.f64Bytes[2] = this.buffer[this.readOffset + 5];
            this.f64Bytes[1] = this.buffer[this.readOffset + 6];
            this.f64Bytes[0] = this.buffer[this.readOffset + 7];
        } else {
            this.f64Bytes[0] = this.buffer[this.readOffset];
            this.f64Bytes[1] = this.buffer[this.readOffset + 1];
            this.f64Bytes[2] = this.buffer[this.readOffset + 2];
            this.f64Bytes[3] = this.buffer[this.readOffset + 3];
            this.f64Bytes[4] = this.buffer[this.readOffset + 4];
            this.f64Bytes[5] = this.buffer[this.readOffset + 5];
            this.f64Bytes[6] = this.buffer[this.readOffset + 6];
            this.f64Bytes[7] = this.buffer[this.readOffset + 7];
        }
        this.readOffset += 8;
        return this.f64[0];
    }


    /**
     * @param {boolean} value
     */
    writeBoolean(value) {
        this.checkWriteCapacity(1);
        this.buffer[this.writeOffset] = value ? 1 : 0;
        this.writeOffset += 1;
        return value;
    }

    /**
     * @param {number} value
     */
    writeByte(value) {
        this.checkWriteCapacity(1);
        this.buffer[this.writeOffset] = value >>> 0;
        this.writeOffset += 1;
    }

    /**
     * @param {Uint8Array} value
     */
    writeBytes(value) {
        this.checkWriteCapacity(value.length);
        this.buffer.set(value, this.writeOffset);
        this.writeOffset += value.length;
    }

    /**
     * @param {number} value
     */
    writeInt(value) {
        this.checkWriteCapacity(4);
        this.buffer[this.writeOffset] = value >>> 24;
        this.buffer[this.writeOffset + 1] = value >>> 16 & 255;
        this.buffer[this.writeOffset + 2] = value >>> 8 & 255;
        this.buffer[this.writeOffset + 3] = value & 255;
        this.writeOffset += 4;
    }

    /**
     * @param {bigint} value
     */
    writeLong(value) {
        this.checkWriteCapacity(8);
        let high = (value >> 32n) & 0xffffffffn;
        let low = value & 0xffffffffn;
        this.writeInt(Number(high));
        this.writeInt(Number(low));
    }

    /**
     * @param {number} value
     */
    writeFloat(value) {
        this.checkWriteCapacity(4);
        this.f32[0] = value;
        if (this.floatLE) {
            this.buffer[this.writeOffset] = this.f32Bytes[3];
            this.buffer[this.writeOffset + 1] = this.f32Bytes[2];
            this.buffer[this.writeOffset + 2] = this.f32Bytes[1];
            this.buffer[this.writeOffset + 3] = this.f32Bytes[0];
        } else {
            this.buffer[this.writeOffset] = this.f32Bytes[0];
            this.buffer[this.writeOffset + 1] = this.f32Bytes[1];
            this.buffer[this.writeOffset + 2] = this.f32Bytes[2];
            this.buffer[this.writeOffset + 3] = this.f32Bytes[3];
        }
        this.writeOffset += 4;
    }

    /**
     * @param {number} value
     */
    writeDouble(value) {
        this.checkWriteCapacity(8);
        this.f64[0] = value;
        if (this.floatLE) {
            this.buffer[this.writeOffset] = this.f64Bytes[7];
            this.buffer[this.writeOffset + 1] = this.f64Bytes[6];
            this.buffer[this.writeOffset + 2] = this.f64Bytes[5];
            this.buffer[this.writeOffset + 3] = this.f64Bytes[4];
            this.buffer[this.writeOffset + 4] = this.f64Bytes[3];
            this.buffer[this.writeOffset + 5] = this.f64Bytes[2];
            this.buffer[this.writeOffset + 6] = this.f64Bytes[1];
            this.buffer[this.writeOffset + 7] = this.f64Bytes[0];
        } else {
            this.buffer[this.writeOffset] = this.f64Bytes[0];
            this.buffer[this.writeOffset + 1] = this.f64Bytes[1];
            this.buffer[this.writeOffset + 2] = this.f64Bytes[2];
            this.buffer[this.writeOffset + 3] = this.f64Bytes[3];
            this.buffer[this.writeOffset + 4] = this.f64Bytes[4];
            this.buffer[this.writeOffset + 5] = this.f64Bytes[5];
            this.buffer[this.writeOffset + 6] = this.f64Bytes[6];
            this.buffer[this.writeOffset + 7] = this.f64Bytes[7];
        }
        this.writeOffset += 8;
    }

    /**
     * @private
     * @param {number} contentLength 
     */
    checkReadOffset(contentLength) {
        if (this.readOffset + contentLength > this.buffer.length) {
            throw new Error('unexpected EOF');
        }
    }

    /**
     * @private
     * @param {number} contentLength 
     */
    checkWriteCapacity(contentLength) {
        if (this.writeOffset + contentLength > this.buffer.length) {
            const buffer = new Uint8Array(this.buffer.length * 2);
            buffer.set(this.buffer);
            this.buffer = buffer;
        }
    }
}

/**
 * @public
 * @property {ByteArray} bytes
 */
class Reader {
    /**
     * @param {Writer} writer 
     * @returns 
     */
    static fromWriter(writer) {
        return new Reader(writer.bytes);
    }

    /**
     * @param {string} file 
     * @returns 
     */
    static fromFile(file) {
        const buffer = fs.readFileSync(file);
        return new Reader(new ByteArray(buffer));
    }

    /**
     * @param {ByteArray} bytes 
     */
    constructor(bytes) {
        /**
         * @type {ByteArray}
         */
        this.bytes = bytes;
    }

    /**
     * @param {number | undefined} tag 
     * @returns {any}
     */
    read(tag = undefined) {
        tag = tag || this.readTag();

        let length = 0;
        let elementTag = Tag.Undefined;
        switch (tag) {
            case Tag.Bool:
                return this.bytes.readBoolean();

            case Tag.Int:
                return this.bytes.readInt();

            case Tag.Long:
                return this.bytes.readLong();

            case Tag.Float:
                return this.bytes.readFloat();

            case Tag.Double:
                return this.bytes.readDouble();

            case Tag.Bytes:
                length = this.bytes.readInt();
                return this.bytes.readBytes(length);

            case Tag.String:
                length = this.bytes.readInt();
                const bytes = this.bytes.readBytes(length);
                return new TextDecoder().decode(bytes);

            case Tag.Timestamp:
                const milliseconds = this.bytes.readLong();
                return new Date(Number(milliseconds));

            case Tag.Enum:
                return this.readName();

            case Tag.ArrayStart:
                const array = new Array();
                elementTag = this.readTag();
                while (elementTag !== Tag.ArrayEnd) {
                    array.push(this.read(elementTag));
                    elementTag = this.readTag();
                }
                return array;

            case Tag.ObjectStart:
                const map = new Map();
                elementTag = this.readTag();
                while (elementTag !== Tag.ObjectEnd) {
                    const key = this.readName();
                    const value = this.read(elementTag);
                    map.set(key, value);
                    elementTag = this.readTag();
                }
                return map;

            default:
                throw new Error(`unexpected tag ${tag}`);
        }
    }

    /**
     * @private
     * @returns {string}
     */
    readName() {
        const length = this.bytes.readByte();
        const bytes = this.bytes.readBytes(length);
        return new TextDecoder().decode(bytes);
    }

    /**
     * @private
     * @returns {number}
     */
    readTag() {
        return this.bytes.readByte();
    }
}

/**
 * @public
 * @property {ByteArray} bytes
 */
class Writer {

    constructor() {
        /**
         * @type {ByteArray}
         */
        this.bytes = new ByteArray();
    }

    /**
     * @param {any} value 
     * @param {Type} type 
     * @param {string | undefined} name 
     */
    write(value, type, name = undefined) {
        if (!TypeTag.has(type.type)) {
            throw new Error(`unsupported type ${type.type}`);
        }
        this.writeTag(TypeTag.get(type.type));
        if (name) {
            this.writeName(name);
        }
        switch (type.type) {
            case Type.BOOL:
                if (typeof value !== 'boolean') {
                    throw new Error(`value ${value} is not a boolean`);
                }
                this.bytes.writeBoolean(value);
                break;

            case Type.INT:
                if (typeof value !== 'number') {
                    throw new Error(`value ${value} is not a integer`);
                }
                this.bytes.writeInt(value);
                break;

            case Type.LONG:
                if (typeof value !== 'bigint') {
                    throw new Error(`value ${value} is not a long (bigint)`);
                }
                this.bytes.writeLong(value);
                break;

            case Type.FLOAT:
                if (typeof value !== 'number') {
                    throw new Error(`value ${value} is not a float`);
                }
                this.bytes.writeFloat(value);
                break;

            case Type.DOUBLE:
                if (typeof value !== 'number') {
                    throw new Error(`value ${value} is not a double`);
                }
                this.bytes.writeDouble(value);
                break;

            case Type.BYTES:
                if (!(value instanceof Uint8Array)) {
                    throw new Error(`value ${value} is not a bytes (Uint8Array)`);
                }
                this.bytes.writeInt(value.length);
                this.bytes.writeBytes(value);
                break;

            case Type.STRING:
                if (typeof value !== 'string') {
                    throw new Error(`value ${value} is not a string`);
                }
                this.bytes.writeInt(value.length);
                this.bytes.writeBytes(new TextEncoder().encode(value));
                break;

            case Type.TIMESTAMP:
                if (!(value instanceof Date)) {
                    throw new Error(`value ${value} is not a timestamp (Date)`);
                }
                this.bytes.writeLong(BigInt(value.getTime()));
                break;

            case Type.ENUM_REFERENCE:
                type = type.reference;
            case Type.ENUM:
                if (typeof value !== 'string') {
                    throw new Error(`value ${value} is not a enum`);
                }
                if (type.enums.indexOf(value) === -1) {
                    throw new Error(`value ${value} is not a enum of [${type.enums}]`);
                }
                this.writeName(value);
                break;

            case Type.ARRAY:
                if (!(value instanceof Array)) {
                    throw new Error(`value ${value} is not a array`);
                }
                for (const element of value) {
                    this.write(element, type.reference);
                }
                this.writeTag(Tag.ArrayEnd);
                break;

            case Type.MAP:
                if (!(value instanceof Map)) {
                    throw new Error(`value ${value} is not a map`);
                }
                for (const [key, element] of value.entries()) {
                    this.write(element, type.reference, key);
                }
                this.writeTag(Tag.ObjectEnd);
                break;

            case Type.STRUCT_REFERENCE:
                type = type.reference;
            case Type.STRUCT:
                if (!(value instanceof Map)) {
                    throw new Error(`value ${value} is not a struct`);
                }
                for (const [key, element] of type.fields.entries()) {
                    if (value.has(key)) {
                        this.write(value.get(key), element, key);
                    }
                }
                this.writeTag(Tag.ObjectEnd);
                break;

            default:
                throw new Error(`unsupported type ${type}`);
        }
    }

    /**
     * @private
     * @param {string} name 
     */
    writeName(name) {
        const bytes = new TextEncoder().encode(name);
        if (bytes.length > 255) {
            throw new Error('name too long');
        }
        this.bytes.writeByte(bytes.length);
        this.bytes.writeBytes(bytes);
    }

    /**
     * @private
     * @param {number} tag 
     */
    writeTag(tag) {
        this.bytes.writeByte(tag);
    }
}

module.exports = { ByteArray, Reader, Writer }