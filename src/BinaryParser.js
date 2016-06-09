/**
 * @file BinaryParser.js - based on ({@link http://jsfromhell.com/classes/binary-parser Binary Parser}) by Jonas Raoni Soares Silva
 * @version 1.0.0
 * @ignore
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */
 
var Logger = require("jsw-logger"),
    BinaryParserBuffer = require("./BinaryParserBuffer");
    
var logger = null;

// Shorcut for String.fromCharCode
var chr = String.fromCharCode;

var maxBits = [];
for (var i = 0; i < 64; i++) {
    maxBits[i] = Math.pow(2, i);
}

/**
 * BinaryParser
 * @ignore
 * 
 * @module Cursor
 * @constructor
 * @since 0.0.1
 * 
 * @classdesc Cursor class that maps a MongoDB-like cursor
 * 
 * @param {MongoPortable} db - Additional options
 * @param {Collection} collection - The collection instance
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object|Array|String} [fields={}] - The fields of the document to show
 * @param {Object} [options] - Database object
 * 
 * @param {Object} [options.pkFactory=null] - Object overriding the basic "ObjectId" primary key generation.
 * 
 */
class BinaryParser {
    constructor(bigEndian, allowExceptions) {
        logger = Logger.instance;
    
        this.bigEndian = bigEndian;
        this.allowExceptions = allowExceptions;
    }
    
    
}

BinaryParser.decodeFloat = function (data, precisionBits, exponentBits) {
    var b = new BinaryParserBuffer(this.bigEndian, data);

    b.checkBuffer(precisionBits + exponentBits + 1);

    var bias = maxBits[exponentBits - 1] - 1,
        signal = b.readBits(precisionBits + exponentBits, 1),
        exponent = b.readBits(precisionBits, exponentBits),
        significand = 0,
        divisor = 2,
        curByte = b.buffer.length + (-precisionBits >> 3) - 1;

    do {
        for (
            var byteValue = b.buffer[ ++curByte ], startBit = precisionBits % 8 || 8, mask = 1 << startBit;
            mask >>= 1; 
            ( byteValue & mask ) && ( significand += 1 / divisor ), divisor *= 2 
        );
    } while (precisionBits -= startBit);
    
    

    if ( exponent == ( bias << 1 ) + 1 ) {
    	if (significand) {
    		return NaN;
    	} else {
    		if (signal) {
    			return -Infinity;
    		} else {
    			return +Infinity;
    		}
    	}
    } else {
    	var _mod = 0;
    	
    	if (exponent || significand) {
    	    _mod = exponent ? Math.pow( 2, exponent - bias ) * ( 1 + significand ) : Math.pow( 2, -bias + 1 ) * significand;
    	}
    	
    	return ( 1 + signal * -2 ) * (_mod);
    }


    // return exponent == ( bias << 1 ) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity : ( 1 + signal * -2 ) * ( exponent || significand ? !exponent ? Math.pow( 2, -bias + 1 ) * significand : Math.pow( 2, exponent - bias ) * ( 1 + significand ) : 0 );
};

BinaryParser.decodeInt = function (data, bits, signed, forceBigEndian) {
    var b = new BinaryParserBuffer(this.bigEndian || forceBigEndian, data),
        x = b.readBits(0, bits),
        max = maxBits[bits]; //max = Math.pow( 2, bits );

    return signed && x >= max / 2 ? x - max : x;
};

BinaryParser.encodeFloat = function (data, precisionBits, exponentBits) {
    var bias = maxBits[exponentBits - 1] - 1,
        minExp = -bias + 1,
        maxExp = bias,
        minUnnormExp = minExp - precisionBits,
        n = parseFloat(data),
        status = isNaN(n) || n == -Infinity || n == +Infinity ? n : 0,
        exp = 0,
        len = 2 * bias + 1 + precisionBits + 3,
        bin = new Array(len),
        signal = (n = status !== 0 ? 0 : n) < 0,
        intPart = Math.floor(n = Math.abs(n)),
        floatPart = n - intPart,
        lastBit,
        rounded,
        result,
        i,
        j;


    for (i = len; i; bin[--i] = 0);
    
    for (i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor(intPart / 2));
    
    for (i = bias + 1; floatPart > 0 && i; (bin[++i] = ((floatPart *= 2) >= 1) - 0 ) && --floatPart);
    
    for (i = -1; ++i < len && !bin[i];);
  
    if (bin[(lastBit = precisionBits - 1 + (i = (exp = bias + 1 - i) >= minExp && exp <= maxExp ? i + 1 : bias + 1 - (exp = minExp - 1))) + 1]) {
        if (!(rounded = bin[lastBit])) {
            for (j = lastBit + 2; !rounded && j < len; rounded = bin[j++]);
        }
        
        for (j = lastBit + 1; rounded && --j >= 0; (bin[j] = !bin[j] - 0) && (rounded = 0));
    }
  
    for (i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i];);
    
    if ((exp = bias + 1 - i) >= minExp && exp <= maxExp) {
        ++i;
    } else if (exp < minExp) {
        exp != bias + 1 - len && exp < minUnnormExp && console.warn("encodeFloat::float underflow");    // TODO logger
        i = bias + 1 - (exp = minExp - 1);
    }
    
    if (intPart || status !== 0) {
        console.warn(intPart ? "encodeFloat::float overflow" : "encodeFloat::" + status);    // TODO logger
        exp = maxExp + 1;
        i = bias + 2;
    
        if (status == -Infinity) {
            signal = 1;
        } else if (isNaN(status)) {
            bin[i] = 1;
        }
    }
  
    for (n = Math.abs(exp + bias), j = exponentBits + 1, result = ""; --j; result = (n % 2) + result, n = n >>= 1);
    
    let r = [];
    
    for (n = 0, j = 0, i = (result = (signal ? "1" : "0") + result + bin.slice(i, i + precisionBits).join("")).length, r = []; i; j = (j + 1) % 8) {
        n += (1 << j) * result.charAt(--i);
        
        if (j == 7) {
            r[r.length] = String.fromCharCode(n);
            n = 0;
        }
    }
  
    r[r.length] = n ? String.fromCharCode(n) : "";
  
    return (this.bigEndian ? r.reverse() : r).join("");
};

BinaryParser.encodeInt = function (data, bits, signed, forceBigEndian) {
    var max = maxBits[bits];
    
    if (data >= max || data < -(max / 2)) {
        console.warn("encodeInt::overflow");    // TODO logger
        data = 0;
    }
    
    if (data < 0) {
        data += max;
    }
    
    for (var r = []; data; r[r.length] = String.fromCharCode(data % 256), data = Math.floor(data / 256));
    
    for (bits = -(-bits >> 3) - r.length; bits--; r[r.length] = "\0");
    
    return ((this.bigEndian || forceBigEndian) ? r.reverse() : r).join("");
};

BinaryParser.toSmall    = function( data ){ return this.decodeInt( data,  8, true  ); };
BinaryParser.fromSmall  = function( data ){ return this.encodeInt( data,  8, true  ); };
BinaryParser.toByte     = function( data ){ return this.decodeInt( data,  8, false ); };
BinaryParser.fromByte   = function( data ){ return this.encodeInt( data,  8, false ); };
BinaryParser.toShort    = function( data ){ return this.decodeInt( data, 16, true  ); };
BinaryParser.fromShort  = function( data ){ return this.encodeInt( data, 16, true  ); };
BinaryParser.toWord     = function( data ){ return this.decodeInt( data, 16, false ); };
BinaryParser.fromWord   = function( data ){ return this.encodeInt( data, 16, false ); };
BinaryParser.toInt      = function( data ){ return this.decodeInt( data, 32, true  ); };
BinaryParser.fromInt    = function( data ){ return this.encodeInt( data, 32, true  ); };
BinaryParser.toLong     = function( data ){ return this.decodeInt( data, 64, true  ); };
BinaryParser.fromLong   = function( data ){ return this.encodeInt( data, 64, true  ); };
BinaryParser.toDWord    = function( data ){ return this.decodeInt( data, 32, false ); };
BinaryParser.fromDWord  = function( data ){ return this.encodeInt( data, 32, false ); };
BinaryParser.toQWord    = function( data ){ return this.decodeInt( data, 64, true ); };
BinaryParser.fromQWord  = function( data ){ return this.encodeInt( data, 64, true ); };
BinaryParser.toFloat    = function( data ){ return this.decodeFloat( data, 23, 8   ); };
BinaryParser.fromFloat  = function( data ){ return this.encodeFloat( data, 23, 8   ); };
BinaryParser.toDouble   = function( data ){ return this.decodeFloat( data, 52, 11  ); };
BinaryParser.fromDouble = function( data ){ return this.encodeFloat( data, 52, 11  ); };

// Factor out the encode so it can be shared by add_header and push_int32
BinaryParser.encode_int32 = function (number, asArray) {
    var a, b, c, d, unsigned;
    
    unsigned = (number < 0) ? (number + 0x100000000) : number;
    a = Math.floor(unsigned / 0xffffff);
    
    unsigned &= 0xffffff;
    b = Math.floor(unsigned / 0xffff);
    
    unsigned &= 0xffff;
    c = Math.floor(unsigned / 0xff);
    
    unsigned &= 0xff;
    d = Math.floor(unsigned);
    
    return asArray ? [chr(a), chr(b), chr(c), chr(d)] : chr(a) + chr(b) + chr(c) + chr(d);
};

BinaryParser.encode_int64 = function (number) {
    var a, b, c, d, e, f, g, h, unsigned;
    
    unsigned = (number < 0) ? (number + 0x10000000000000000) : number;
    a = Math.floor(unsigned / 0xffffffffffffff);
    
    unsigned &= 0xffffffffffffff;
    b = Math.floor(unsigned / 0xffffffffffff);
    
    unsigned &= 0xffffffffffff;
    c = Math.floor(unsigned / 0xffffffffff);
    
    unsigned &= 0xffffffffff;
    d = Math.floor(unsigned / 0xffffffff);
    
    unsigned &= 0xffffffff;
    e = Math.floor(unsigned / 0xffffff);
    
    unsigned &= 0xffffff;
    f = Math.floor(unsigned / 0xffff);
    
    unsigned &= 0xffff;
    g = Math.floor(unsigned / 0xff);
    
    unsigned &= 0xff;
    h = Math.floor(unsigned);
    
    return chr(a) + chr(b) + chr(c) + chr(d) + chr(e) + chr(f) + chr(g) + chr(h);
};

/**
 * UTF8 methods
 */

// Take a raw binary string and return a utf8 string
BinaryParser.decode_utf8 = function (binaryStr) {
    var len = binaryStr.length,
        decoded = '',
        i = 0,
        c = 0,
        c1 = 0,
        c2 = 0,
        c3;
    
    while (i < len) {
        c = binaryStr.charCodeAt(i);
        
        if (c < 128) {
            decoded += String.fromCharCode(c);
            
            i++;
        } else if ((c > 191) && (c < 224)) {
            c2 = binaryStr.charCodeAt(i+1);
            decoded += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            
            i += 2;
        } else {
            c2 = binaryStr.charCodeAt(i+1);
            c3 = binaryStr.charCodeAt(i+2);
            decoded += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            
            i += 3;
        }
    }
    
    return decoded;
};

// Encode a cstring
BinaryParser.encode_cstring = function (s) {
    return unescape(encodeURIComponent(s)) + BinaryParser.fromByte(0);
};

// Take a utf8 string and return a binary string
BinaryParser.encode_utf8 = function encode_utf8 (s) {
    var a = "",
        c;

    for (var n = 0, len = s.length; n < len; n++) {
        c = s.charCodeAt(n);

        if (c < 128) {
            a += String.fromCharCode(c);
        } else if ((c > 127) && (c < 2048)) {
            a += String.fromCharCode((c>>6) | 192) ;
            a += String.fromCharCode((c&63) | 128);
        } else {
            a += String.fromCharCode((c>>12) | 224);
            a += String.fromCharCode(((c>>6) & 63) | 128);
            a += String.fromCharCode((c&63) | 128);
        }
    }

    return a;
};

BinaryParser.hprint = function (s) {
    var number;

    for (var i = 0, len = s.length; i < len; i++) {
        if (s.charCodeAt(i) < 32) {
            number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
            
            process.stdout.write(number + " ");
        } else {
            number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
            
            process.stdout.write(number + " ");
        }
    }
    
    process.stdout.write("\n\n");
    
    return number;
};

BinaryParser.ilprint = function (s) {
    var number;

    for (var i = 0, len = s.length; i < len; i++) {
        if (s.charCodeAt(i) < 32) {
            number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(10) : s.charCodeAt(i).toString(10);
            
            process.stdout.write(number + " ");
        } else {
            number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(10) : s.charCodeAt(i).toString(10);
            
            process.stdout.write(number + " ");
        }
    }
    
    process.stdout.write("\n\n");
    
    return number;
};

BinaryParser.hlprint = function (s) {
    var number;
    
    for (var i = 0, len = s.length; i < len; i++) {
        if (s.charCodeAt(i) < 32) {
            number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
            
            process.stdout.write(number + " ");
        } else {
            number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
            
            process.stdout.write(number + " ");
        }
    }
    
    process.stdout.write("\n\n");
    
    return number;
};

module.exports = BinaryParser;