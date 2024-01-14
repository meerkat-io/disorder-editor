
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
    constructor() {
        this.buffer = new Uint8Array(1024);
        this.readOffset = 0;
        this.writeOffset = 0;

        this.f32 = new Float32Array([-0]);
        this.f32Bytes = new Uint8Array(this.f32.buffer);
        this.f64 = new Float64Array([-0]);
        this.f64Bytes = new Uint8Array(this.f64.buffer);

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
 */
class Reader {
    // static fromWriter
    // static fromFile
    /**
     * @param {ByteArray} bytes 
     */
    constructor(bytes) {
        this.bytes = bytes;
        this.bytes.readOffset = 0;
    }
}

/**
 * @public
 */
class Writer {
    constructor() {
        this.bytes = new ByteArray();
    }
}

module.exports = { ByteArray, Reader, Writer }