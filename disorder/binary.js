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

const INT_MIN = -(2 ** 31);
const INT_MAX = 2 ** 31 - 1;
const LONG_MIN = -(2n ** 63n);
const LONG_MAX = 2n ** 63n - 1n;
const MAX_NAME_BYTES = 255;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * @param {Map<string, any>} map
 * @returns {Array<[string, any]>} entries ordered by the UTF-8 bytes of their keys
 */
function sortedEntries(map) {
    return Array.from(map.entries(), ([key, element]) => ({ key, element, bytes: encoder.encode(key) }))
        .sort((a, b) => Buffer.compare(a.bytes, b.bytes))
        .map(({ key, element }) => [key, element]);
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
 * Growable big-endian byte buffer with independent read and write cursors.
 *
 * @public
 * @property {Uint8Array} buffer
 * @property {number} readOffset
 * @property {number} writeOffset
 */
class ByteArray {
    static INITIAL_CAPACITY = 1024;

    /**
     * @param {Uint8Array | undefined} buffer existing content to read from (appending is allowed)
     */
    constructor(buffer = undefined) {
        /**
         * @type {Uint8Array}
         */
        this.buffer = buffer || new Uint8Array(ByteArray.INITIAL_CAPACITY);
        /**
         * @type {number}
         */
        this.readOffset = 0;
        /**
         * @type {number}
         */
        this.writeOffset = buffer ? buffer.length : 0;
        /**
         * @type {DataView}
         * @private
         */
        this.view = this.createView();
    }

    /**
     * The bytes written so far (a view, not a copy).
     * @returns {Uint8Array}
     */
    toBytes() {
        return this.buffer.subarray(0, this.writeOffset);
    }

    /**
     * Number of bytes written but not yet read.
     * @returns {number}
     */
    get remaining() {
        return this.writeOffset - this.readOffset;
    }

    /**
     * @returns {boolean}
     */
    readBoolean() {
        return this.readByte() !== 0;
    }

    /**
     * @returns {number}
     */
    readByte() {
        this.checkReadOffset(1);
        return this.buffer[this.readOffset++];
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
        const value = this.view.getInt32(this.readOffset);
        this.readOffset += 4;
        return value;
    }

    /**
     * @returns {bigint}
     */
    readLong() {
        this.checkReadOffset(8);
        const value = this.view.getBigInt64(this.readOffset);
        this.readOffset += 8;
        return value;
    }

    /**
     * @returns {number}
     */
    readFloat() {
        this.checkReadOffset(4);
        const value = this.view.getFloat32(this.readOffset);
        this.readOffset += 4;
        return value;
    }

    /**
     * @returns {number}
     */
    readDouble() {
        this.checkReadOffset(8);
        const value = this.view.getFloat64(this.readOffset);
        this.readOffset += 8;
        return value;
    }

    /**
     * @param {boolean} value
     */
    writeBoolean(value) {
        this.writeByte(value ? 1 : 0);
    }

    /**
     * @param {number} value
     */
    writeByte(value) {
        this.checkWriteCapacity(1);
        this.buffer[this.writeOffset++] = value;
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
        this.view.setInt32(this.writeOffset, value);
        this.writeOffset += 4;
    }

    /**
     * @param {bigint} value
     */
    writeLong(value) {
        this.checkWriteCapacity(8);
        this.view.setBigInt64(this.writeOffset, value);
        this.writeOffset += 8;
    }

    /**
     * @param {number} value
     */
    writeFloat(value) {
        this.checkWriteCapacity(4);
        this.view.setFloat32(this.writeOffset, value);
        this.writeOffset += 4;
    }

    /**
     * @param {number} value
     */
    writeDouble(value) {
        this.checkWriteCapacity(8);
        this.view.setFloat64(this.writeOffset, value);
        this.writeOffset += 8;
    }

    /**
     * @private
     * @returns {DataView}
     */
    createView() {
        return new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
    }

    /**
     * @private
     * @param {number} contentLength
     */
    checkReadOffset(contentLength) {
        if (this.readOffset + contentLength > this.writeOffset) {
            throw new Error('unexpected EOF');
        }
    }

    /**
     * @private
     * @param {number} contentLength
     */
    checkWriteCapacity(contentLength) {
        const required = this.writeOffset + contentLength;
        if (required <= this.buffer.length) {
            return;
        }
        let capacity = Math.max(this.buffer.length, 1);
        while (capacity < required) {
            capacity *= 2;
        }
        const buffer = new Uint8Array(capacity);
        buffer.set(this.buffer.subarray(0, this.writeOffset));
        this.buffer = buffer;
        this.view = this.createView();
    }
}

/**
 * @public
 * @property {ByteArray} bytes
 */
class Reader {
    /**
     * @returns {boolean} true if there is unread data
     */
    hasMore() {
        return this.bytes.remaining > 0;
    }

    /**
     * @param {Writer} writer 
     * @returns 
     */
    static fromWriter(writer) {
        return Reader.fromBytes(writer.toBytes());
    }

    /**
     * @param {Uint8Array} bytes 
     * @returns 
     */
    static fromBytes(bytes) {
        return new Reader(new ByteArray(bytes));
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
        if (tag === undefined) {
            tag = this.readTag();
        }
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
                return this.bytes.readBytes(this.readLength());

            case Tag.String:
                return decoder.decode(this.bytes.readBytes(this.readLength()));

            case Tag.Timestamp:
                return new Date(Number(this.bytes.readLong()));

            case Tag.Enum:
                return this.readName();

            case Tag.ArrayStart: {
                const array = [];
                for (let elementTag = this.readTag(); elementTag !== Tag.ArrayEnd; elementTag = this.readTag()) {
                    array.push(this.read(elementTag));
                }
                return array;
            }

            case Tag.ObjectStart: {
                const map = new Map();
                for (let elementTag = this.readTag(); elementTag !== Tag.ObjectEnd; elementTag = this.readTag()) {
                    const key = this.readName();
                    map.set(key, this.read(elementTag));
                }
                return map;
            }

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
        return decoder.decode(this.bytes.readBytes(length));
    }

    /**
     * @private
     * @returns {number}
     */
    readLength() {
        const length = this.bytes.readInt();
        if (length < 0) {
            throw new Error(`invalid length ${length}`);
        }
        return length;
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
        if (name !== undefined) {
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
                if (!Number.isInteger(value) || value < INT_MIN || value > INT_MAX) {
                    throw new Error(`value ${value} is not a 32-bit integer`);
                }
                this.bytes.writeInt(value);
                break;

            case Type.LONG:
                if (typeof value !== 'bigint') {
                    throw new Error(`value ${value} is not a long (bigint)`);
                }
                if (value < LONG_MIN || value > LONG_MAX) {
                    throw new Error(`value ${value} is out of 64-bit range`);
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
                this.writeBlob(value);
                break;

            case Type.STRING:
                if (typeof value !== 'string') {
                    throw new Error(`value ${value} is not a string`);
                }
                this.writeBlob(encoder.encode(value));
                break;

            case Type.TIMESTAMP:
                if (!(value instanceof Date)) {
                    throw new Error(`value ${value} is not a timestamp (Date)`);
                }
                if (Number.isNaN(value.getTime())) {
                    throw new Error('timestamp is an invalid Date');
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
                // Sorted by UTF-8 bytes so output is canonical (same as the Go encoder).
                for (const [key, element] of sortedEntries(value)) {
                    if (key === '') {
                        throw new Error('map key cannot be empty');
                    }
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
                throw new Error(`unsupported type ${type.type}`);
        }
    }

    /**
     * @returns {Uint8Array} the bytes written so far
     */
    toBytes() {
        return this.bytes.toBytes();
    }

    /**
     * @private
     * @param {Uint8Array} bytes
     */
    writeBlob(bytes) {
        this.bytes.writeInt(bytes.length);
        this.bytes.writeBytes(bytes);
    }

    /**
     * @private
     * @param {string} name 
     */
    writeName(name) {
        const bytes = encoder.encode(name);
        if (bytes.length > MAX_NAME_BYTES) {
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