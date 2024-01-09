export class Type {

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
    static Object = new Type('object');

    static primaryTypes = [ 'bool','int',  'long', 'float',   'double',  'bytes',  'string', 'timestamp'];

    constructor(type) {
        this.type = type;
    }

    toString() {
        return this.type;
    }

    isPrimary() {
        return Type.primaryTypes.indexOf(this.type) != -1;
    }
}