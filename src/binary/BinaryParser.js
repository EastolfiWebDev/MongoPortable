"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var jsw_logger_1 = require("jsw-logger");
var BinaryParserBuffer_1 = require("./BinaryParserBuffer");
// Shorcut for String.fromCharCode
var chr = String.fromCharCode;
var maxBits = [];
for (var i = 0; i < 64; i++) {
    maxBits[i] = Math.pow(2, i);
}
var BinaryParser = (function () {
    function BinaryParser(bigEndian, allowExceptions) {
        if (bigEndian === void 0) { bigEndian = false; }
        if (allowExceptions === void 0) { allowExceptions = true; }
        this.logger = jsw_logger_1.JSWLogger.instance;
        this.bigEndian = bigEndian;
        this.allowExceptions = allowExceptions;
    }
    /**
     * Generate a 12 byte id string used in ObjectId"s
     *
     * @method BinaryParser#generate12string
     *
     * @return {String} The 12 byte id binary string.
     */
    BinaryParser.prototype.generate12string = function () {
        var time9bytes = Date.now().toString(32);
        var rnd3bytes = this.encodeInt(parseInt((Math.random() * 0xFFFFFF).toString(), 10), 24, false);
        return time9bytes + rnd3bytes;
    };
    BinaryParser.prototype.decodeFloat = function (data, precisionBits, exponentBits) {
        var b = new BinaryParserBuffer_1.BinaryParserBuffer(this.bigEndian, data);
        b.checkBuffer(precisionBits + exponentBits + 1);
        var bias = maxBits[exponentBits - 1] - 1, signal = b.readBits(precisionBits + exponentBits, 1), exponent = b.readBits(precisionBits, exponentBits), significand = 0, divisor = 2, curByte = b.buffer.length + (-precisionBits >> 3) - 1;
        do {
            for (var byteValue = b.buffer[++curByte], startBit = precisionBits % 8 || 8, mask = 1 << startBit; mask >>= 1; (byteValue & mask) && (significand += 1 / divisor), divisor *= 2)
                ;
        } while (precisionBits -= startBit);
        return exponent == (bias << 1) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity : (1 + signal * -2) * (exponent || significand ? !exponent ? Math.pow(2, -bias + 1) * significand : Math.pow(2, exponent - bias) * (1 + significand) : 0);
        /*if (exponent == (bias << 1) + 1) {
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
            let part1 = ( 1 + signal * -2 );
            
            if (exponent || significand) {
                if (!exponent) {
                    return part1 * (Math.pow( 2, -bias + 1 ) * significand);
                } else {
                    return part1 * (Math.pow( 2, exponent - bias ) * ( 1 + significand ));
                }
            } else {
                // return return part1 * (0);
                return 0;
            }
        }*/
    };
    /*decodeFloat_(data: string|number, precisionBits: number, exponentBits: number): number {
        var b = new BinaryParserBuffer(this.bigEndian, data);
    
        b.checkBuffer(precisionBits + exponentBits + 1);
    
        var bias = maxBits[exponentBits - 1] - 1,
            signal = b.readBits(precisionBits + exponentBits, 1),
            exponent = b.readBits(precisionBits, exponentBits),
            significand = 0,
            divisor = 2,
            curByte = b.buffer.length + (-precisionBits >> 3) - 1;
    
        curByte++;
        let byteValue, startBit, mask;
        do {
            // for (
            //     var byteValue = b.buffer[ ++curByte ], startBit = precisionBits % 8 || 8, mask = 1 << startBit;
            //     mask >>= 1;
            //     ( byteValue & mask ) && ( significand += 1 / divisor ), divisor *= 2
            // );
            byteValue = b.buffer[curByte];
            startBit = precisionBits % 8 || 8;
            mask = 1 << startBit;
            
            mask >>= 1;
            while (mask) {
                (byteValue & mask) && (significand += 1 / divisor);
                divisor *= 2;
                
                mask >>= 1
            }
            precisionBits -= startBit
        } while (precisionBits);
        
        // return exponent == ( bias << 1 ) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity : ( 1 + signal * -2 ) * ( exponent || significand ? !exponent ? Math.pow( 2, -bias + 1 ) * significand : Math.pow( 2, exponent - bias ) * ( 1 + significand ) : 0 );
    
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
    }*/
    BinaryParser.prototype.decodeInt = function (data, bits, signed, forceBigEndian) {
        var b = new BinaryParserBuffer_1.BinaryParserBuffer(this.bigEndian || forceBigEndian, data), x = b.readBits(0, bits), max = maxBits[bits]; //max = Math.pow( 2, bits );
        return signed && x >= max / 2
            ? x - max
            : x;
    };
    /*decodeInt_(data: string|number, bits: number, signed: boolean, forceBigEndian?: boolean): number {
        var b = new BinaryParserBuffer(this.bigEndian || forceBigEndian, data),
            x = b.readBits(0, bits),
            max = maxBits[bits]; //max = Math.pow( 2, bits );
    
        return signed && x >= max / 2 ? x - max : x;
    }*/
    BinaryParser.prototype.encodeFloat = function (data, precisionBits, exponentBits) {
        var bias = maxBits[exponentBits - 1] - 1, minExp = -bias + 1, maxExp = bias, minUnnormExp = minExp - precisionBits
        //, n = parseFloat(_.toString(data))
        , n = data, status = isNaN(n) || n == -Infinity || n == +Infinity ? n : 0, exp = 0, len = 2 * bias + 1 + precisionBits + 3, bin = new Array(len), signal = (n = status !== 0 ? 0 : n) < 0, intPart = Math.floor(n = Math.abs(n)), floatPart = n - intPart, lastBit, rounded, result, i, j;
        for (i = len; i; bin[--i] = 0)
            ;
        for (i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor(intPart / 2))
            ;
        // for (i = bias + 1; floatPart > 0 && i; (bin[++i] = ((floatPart *= 2) >= 1) - 0 ) && --floatPart);
        for (i = bias + 1; floatPart > 0 && i; (bin[++i] = _.toNumber(((floatPart *= 2) >= 1))) && --floatPart)
            ;
        for (i = -1; ++i < len && !bin[i];)
            ;
        if (bin[(lastBit = precisionBits - 1 + (i = (exp = bias + 1 - i) >= minExp && exp <= maxExp ? i + 1 : bias + 1 - (exp = minExp - 1))) + 1]) {
            if (!(rounded = bin[lastBit])) {
                for (j = lastBit + 2; !rounded && j < len; rounded = bin[j++])
                    ;
            }
            // for (j = lastBit + 1; rounded && --j >= 0; (bin[j] = !bin[j] - 0) && (rounded = 0));
            for (j = lastBit + 1; rounded && --j >= 0; (bin[j] = _.toNumber(!bin[j])) && (rounded = 0))
                ;
            // j = lastBit + 1;
            // while (rounded && --j >= 0) {
            //     bin[j] = _.toNumber(!bin[j]);
            //     rounded = 0;
            // }
        }
        for (i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i];)
            ;
        if ((exp = bias + 1 - i) >= minExp && exp <= maxExp) {
            ++i;
        }
        else if (exp < minExp) {
            exp != bias + 1 - len && exp < minUnnormExp && this.logger.warn("encodeFloat::float underflow");
            i = bias + 1 - (exp = minExp - 1);
        }
        if (intPart || status !== 0) {
            this.logger.warn(intPart ? "encodeFloat::float overflow" : "encodeFloat::" + status);
            exp = maxExp + 1;
            i = bias + 2;
            if (status == -Infinity) {
                signal = true;
            }
            else if (isNaN(status)) {
                bin[i] = 1;
            }
        }
        for (n = Math.abs(exp + bias), j = exponentBits + 1, result = ""; --j; result = (n % 2) + result, n = n >>= 1)
            ;
        var r = [];
        for (n = 0, j = 0, i = (result = (signal ? "1" : "0") + result + bin.slice(i, i + precisionBits).join("")).length, r = []; i; j = (j + 1) % 8) {
            n += (1 << j) * result.charAt(--i);
            if (j == 7) {
                r[r.length] = String.fromCharCode(n);
                n = 0;
            }
        }
        r[r.length] = n
            ? String.fromCharCode(n)
            : "";
        return (this.bigEndian ? r.reverse() : r).join("");
    };
    /*
    encodeFloat_(data: string|number, precisionBits: number, exponentBits: number): string {
        var bias = maxBits[exponentBits - 1] - 1,
            minExp = -bias + 1,
            maxExp = bias,
            minUnnormExp = minExp - precisionBits,
            n = parseFloat(`${data}`),
            status = isNaN(n) || n == -Infinity || n == +Infinity ? n : 0,
            exp = 0,
            len = 2 * bias + 1 + precisionBits + 3,
            bin: Array<number> = new Array(len),
            signal: boolean = (n = status !== 0 ? 0 : n) < 0,
            intPart = Math.floor(n = Math.abs(n)),
            floatPart: number = n - intPart,
            lastBit,
            rounded,
            result,
            i,
            j;
    
    
        // for (i = len; i; bin[--i] = 0);
        i = len;
        while (i) {
            bin[--i] = 0;
        }
        
        // for (i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor(intPart / 2));
        i = bias + 2;
        while (intPart && i) {
            bin[--i] = intPart % 2;
            intPart = Math.floor(intPart / 2);
        }
        
        // for (i = bias + 1; floatPart > 0 && i; (bin[++i] = ((floatPart *= 2) >= 1) - 0 ) && --floatPart);
        i = bias + 1;
        while (floatPart > 0 && i) {
            floatPart *= 2;
            bin[++i] = floatPart >= 1 ? 1 : 0;
            
            --floatPart;
        }
        
        // for (i = -1; ++i < len && !bin[i];);
        i = 0;
        while (i < len && !bin[i]) {
            i++;
        }
      
        if (bin[(lastBit = precisionBits - 1 + (i = (exp = bias + 1 - i) >= minExp &&
                exp <= maxExp ? i + 1 : bias + 1 - (exp = minExp - 1))) + 1]) {
            if (!(rounded = bin[lastBit])) {
                // for (j = lastBit + 2; !rounded && j < len; rounded = bin[j++]);
                j = lastBit + 2;
                while (!rounded && j < len) {
                    rounded = bin[j++];
                }
            }
            
            // for (j = lastBit + 1; rounded && --j >= 0; (bin[j] = !bin[j] - 0) && (rounded = 0));
            j = lastBit;
            while (rounded && j >= 0) {
                j--;
                bin[j] = bin[j] ? 0 : 1;
                rounded = 0;
            }
        }
      
        for (i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i];);
        
        if ((exp = bias + 1 - i) >= minExp && exp <= maxExp) {
            ++i;
        } else if (exp < minExp) {
            exp != bias + 1 - len && exp < minUnnormExp && this.logger.warn("encodeFloat::float underflow");
            i = bias + 1 - (exp = minExp - 1);
        }
        
        if (intPart || status !== 0) {
            this.logger.warn(intPart ? "encodeFloat::float overflow" : "encodeFloat::" + status);
            
            exp = maxExp + 1;
            i = bias + 2;
        
            if (status == -Infinity) {
                signal = true; // 1
            } else if (isNaN(status)) {
                bin[i] = 1;
            }
        }
      
        // for (n = Math.abs(exp + bias), j = exponentBits + 1, result = ""; --j; result = (n % 2) + result, n = n >>= 1);
        n = Math.abs(exp + bias);
        j = exponentBits;
        result = "";
        while (j) {
            j--;
            result = (n % 2) + result;
            n = n >>= 1;
        }
        
        let r = [];
        
        // for (n = 0, j = 0, i = (result = (signal ? "1" : "0") + result + bin.slice(i, i + precisionBits).join("")).length, r = []; i; j = (j + 1) % 8) {
        n = 0;
        j = 0;
        result = (signal ? "1" : "0") + result + bin.slice(i, i + precisionBits).join("");
        i = result.length;
        r = [];
        while (i) {
            j = (j + 1) % 8
            n += (1 << j) * result.charAt(--i);
            
            if (j == 7) {
                r[r.length] = String.fromCharCode(n);
                n = 0;
            }
        }
      
        r[r.length] = n ? String.fromCharCode(n) : "";
      
        return (this.bigEndian ? r.reverse() : r).join("");
    }
    */
    BinaryParser.prototype.encodeInt = function (data, bits, signed, forceBigEndian) {
        var max = maxBits[bits];
        if (data >= max || data < -(max / 2)) {
            this.logger.warn("encodeInt::overflow");
            data = 0;
        }
        if (data < 0) {
            data += max;
        }
        for (var r = []; data; r[r.length] = String.fromCharCode(data % 256), data = Math.floor(data / 256))
            ;
        for (bits = -(-bits >> 3) - r.length; bits--; r[r.length] = "\0")
            ;
        return ((this.bigEndian || forceBigEndian) ? r.reverse() : r).join("");
    };
    /*encodeInt_(data: number, bits: number, signed: boolean, forceBigEndian?: boolean): string {
        var max = maxBits[bits];
        data = data - 0;    // Ensure a number
        
        if (data >= max || data < -(max / 2)) {
            this.logger.warn("encodeInt::overflow");
            data = 0;
        }
        
        if (data < 0) {
            data += max;
        }
        
        // for (var r = []; data; r[r.length] = String.fromCharCode(data % 256), data = Math.floor(data / 256));
        let r = [];
        while(data) {
            r[r.length] = String.fromCharCode(data % 256);
            data = Math.floor(data / 256);
        }
        
        // for (bits = -(-bits >> 3) - r.length; bits--; r[r.length] = "\0");
        bits = -(-bits >> 3) - r.length;
        while(bits) {
            bits--;
            r[r.length] = "\0";
        }
        
        return ((this.bigEndian || forceBigEndian) ? r.reverse() : r).join("");
    }*/
    BinaryParser.prototype.toSmall = function (data) { return this.decodeInt(data, 8, true); };
    BinaryParser.prototype.fromSmall = function (data) { return this.encodeInt(data, 8, true); };
    BinaryParser.prototype.toByte = function (data) { return this.decodeInt(data, 8, false); };
    BinaryParser.prototype.fromByte = function (data) { return this.encodeInt(data, 8, false); };
    BinaryParser.prototype.toShort = function (data) { return this.decodeInt(data, 16, true); };
    BinaryParser.prototype.fromShort = function (data) { return this.encodeInt(data, 16, true); };
    BinaryParser.prototype.toWord = function (data) { return this.decodeInt(data, 16, false); };
    BinaryParser.prototype.fromWord = function (data) { return this.encodeInt(data, 16, false); };
    BinaryParser.prototype.toInt = function (data) { return this.decodeInt(data, 32, true); };
    BinaryParser.prototype.fromInt = function (data) { return this.encodeInt(data, 32, true); };
    BinaryParser.prototype.toLong = function (data) { return this.decodeInt(data, 64, true); };
    BinaryParser.prototype.fromLong = function (data) { return this.encodeInt(data, 64, true); };
    BinaryParser.prototype.toDWord = function (data) { return this.decodeInt(data, 32, false); };
    BinaryParser.prototype.fromDWord = function (data) { return this.encodeInt(data, 32, false); };
    BinaryParser.prototype.toQWord = function (data) { return this.decodeInt(data, 64, true); };
    BinaryParser.prototype.fromQWord = function (data) { return this.encodeInt(data, 64, true); };
    BinaryParser.prototype.toFloat = function (data) { return this.decodeFloat(data, 23, 8); };
    BinaryParser.prototype.fromFloat = function (data) { return this.encodeFloat(data, 23, 8); };
    BinaryParser.prototype.toDouble = function (data) { return this.decodeFloat(data, 52, 11); };
    BinaryParser.prototype.fromDouble = function (data) { return this.encodeFloat(data, 52, 11); };
    // Static access to methods
    BinaryParser.toSmall = function (data) { return (new BinaryParser()).toSmall(data); };
    BinaryParser.fromSmall = function (data) { return (new BinaryParser()).fromSmall(data); };
    BinaryParser.toByte = function (data) { return (new BinaryParser()).toByte(data); };
    BinaryParser.fromByte = function (data) { return (new BinaryParser()).fromByte(data); };
    BinaryParser.toShort = function (data) { return (new BinaryParser()).toShort(data); };
    BinaryParser.fromShort = function (data) { return (new BinaryParser()).fromShort(data); };
    BinaryParser.toWord = function (data) { return (new BinaryParser()).toWord(data); };
    BinaryParser.fromWord = function (data) { return (new BinaryParser()).fromWord(data); };
    BinaryParser.toInt = function (data) { return (new BinaryParser()).toInt(data); };
    BinaryParser.fromInt = function (data) { return (new BinaryParser()).fromInt(data); };
    BinaryParser.toLong = function (data) { return (new BinaryParser()).toLong(data); };
    BinaryParser.fromLong = function (data) { return (new BinaryParser()).fromLong(data); };
    BinaryParser.toDWord = function (data) { return (new BinaryParser()).toDWord(data); };
    BinaryParser.fromDWord = function (data) { return (new BinaryParser()).fromDWord(data); };
    BinaryParser.toQWord = function (data) { return (new BinaryParser()).toQWord(data); };
    BinaryParser.fromQWord = function (data) { return (new BinaryParser()).fromQWord(data); };
    BinaryParser.toFloat = function (data) { return (new BinaryParser()).toFloat(data); };
    BinaryParser.fromFloat = function (data) { return (new BinaryParser()).fromFloat(data); };
    BinaryParser.toDouble = function (data) { return (new BinaryParser()).toDouble(data); };
    BinaryParser.fromDouble = function (data) { return (new BinaryParser()).fromDouble(data); };
    // Factor out the encode so it can be shared by add_header and push_int32
    BinaryParser.prototype.encode_int32 = function (num, asArray) {
        if (asArray === void 0) { asArray = false; }
        var a, b, c, d, unsigned;
        unsigned = (num < 0) ? (num + 0x100000000) : num;
        a = Math.floor(unsigned / 0xffffff);
        unsigned &= 0xffffff;
        b = Math.floor(unsigned / 0xffff);
        unsigned &= 0xffff;
        c = Math.floor(unsigned / 0xff);
        unsigned &= 0xff;
        d = Math.floor(unsigned);
        return asArray ? [chr(a), chr(b), chr(c), chr(d)] : chr(a) + chr(b) + chr(c) + chr(d);
    };
    BinaryParser.encode_int32 = function (num, asArray) {
        if (asArray === void 0) { asArray = false; }
        return (new BinaryParser()).encode_int32(num, asArray);
    };
    BinaryParser.prototype.encode_int64 = function (num) {
        var a, b, c, d, e, f, g, h, unsigned;
        unsigned = (num < 0) ? (num + 0x10000000000000000) : num;
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
    BinaryParser.encode_int64 = function (num) { return (new BinaryParser()).encode_int64(num); };
    /**
     * UTF8 methods
     */
    // Take a raw binary string and return a utf8 string
    BinaryParser.prototype.decode_utf8 = function (binaryStr) {
        var len = binaryStr.length, decoded = '', i = 0, c = 0, c1 = 0, c2 = 0, c3;
        while (i < len) {
            c = binaryStr.charCodeAt(i);
            if (c < 128) {
                decoded += String.fromCharCode(c);
                i++;
            }
            else if ((c > 191) && (c < 224)) {
                c2 = binaryStr.charCodeAt(i + 1);
                decoded += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = binaryStr.charCodeAt(i + 1);
                c3 = binaryStr.charCodeAt(i + 2);
                decoded += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return decoded;
    };
    BinaryParser.decode_utf8 = function (binaryStr) { return (new BinaryParser()).decode_utf8(binaryStr); };
    // Encode a cstring
    BinaryParser.prototype.encode_cstring = function (s) {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/escape
        return encodeURIComponent(encodeURIComponent("" + s)) + this.fromByte(0);
    };
    BinaryParser.encode_cstring = function (s) { return (new BinaryParser()).encode_cstring(s); };
    // Take a utf8 string and return a binary string
    BinaryParser.prototype.encode_utf8 = function (s) {
        var a = "", c;
        for (var n = 0, len = s.length; n < len; n++) {
            c = s.charCodeAt(n);
            if (c < 128) {
                a += String.fromCharCode(c);
            }
            else if ((c > 127) && (c < 2048)) {
                a += String.fromCharCode((c >> 6) | 192);
                a += String.fromCharCode((c & 63) | 128);
            }
            else {
                a += String.fromCharCode((c >> 12) | 224);
                a += String.fromCharCode(((c >> 6) & 63) | 128);
                a += String.fromCharCode((c & 63) | 128);
            }
        }
        return a;
    };
    BinaryParser.encode_utf8 = function (s) { return (new BinaryParser()).encode_utf8(s); };
    BinaryParser.prototype.hprint = function (s) {
        var num;
        for (var i = 0, len = s.length; i < len; i++) {
            if (s.charCodeAt(i) < 32) {
                num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
                this.logger.silly(num + " ");
            }
            else {
                num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
                this.logger.silly(num + " ");
            }
        }
        this.logger.silly("\n\n");
        return num;
    };
    BinaryParser.hprint = function (s) { return (new BinaryParser()).hprint(s); };
    BinaryParser.prototype.ilprint = function (s) {
        var num;
        for (var i = 0, len = s.length; i < len; i++) {
            if (s.charCodeAt(i) < 32) {
                num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(10) : s.charCodeAt(i).toString(10);
                this.logger.silly(num + " ");
            }
            else {
                num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(10) : s.charCodeAt(i).toString(10);
                this.logger.silly(num + " ");
            }
        }
        this.logger.silly("\n\n");
        return num;
    };
    BinaryParser.ilprint = function (s) { return (new BinaryParser()).ilprint(s); };
    BinaryParser.prototype.hlprint = function (s) {
        var num;
        for (var i = 0, len = s.length; i < len; i++) {
            if (s.charCodeAt(i) < 32) {
                num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
                this.logger.silly(num + " ");
            }
            else {
                num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
                this.logger.silly(num + " ");
            }
        }
        this.logger.silly("\n\n");
        return num;
    };
    BinaryParser.hlprint = function (s) { return (new BinaryParser()).hlprint(s); };
    return BinaryParser;
}());
exports.BinaryParser = BinaryParser;
//# sourceMappingURL=BinaryParser.js.map