"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @file BinaryParser.js - based on ({@link http://jsfromhell.com/classes/binary-parser Binary Parser}) by Jonas Raoni Soares Silva
 * @version 1.0.0
 * @ignore
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

var logger = null;

// Shorcut for String.fromCharCode
var chr = String.fromCharCode;

var maxBits = [];
for (var i = 0; i < 64; i++) {
    maxBits[i] = Math.pow(2, i);
}

module.exports = function (BinaryParserBuffer, Logger) {
    logger = Logger.instance;

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

    var BinaryParser = function BinaryParser(bigEndian, allowExceptions) {
        _classCallCheck(this, BinaryParser);

        logger = Logger.instance;

        this.bigEndian = bigEndian;
        this.allowExceptions = allowExceptions;
    };

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
            for (var byteValue = b.buffer[++curByte], startBit = precisionBits % 8 || 8, mask = 1 << startBit; mask >>= 1; byteValue & mask && (significand += 1 / divisor), divisor *= 2) {}
        } while (precisionBits -= startBit);

        if (exponent == (bias << 1) + 1) {
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
                _mod = exponent ? Math.pow(2, exponent - bias) * (1 + significand) : Math.pow(2, -bias + 1) * significand;
            }

            return (1 + signal * -2) * _mod;
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

        for (i = len; i; bin[--i] = 0) {}

        for (i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor(intPart / 2)) {}

        for (i = bias + 1; floatPart > 0 && i; (bin[++i] = ((floatPart *= 2) >= 1) - 0) && --floatPart) {}

        for (i = -1; ++i < len && !bin[i];) {}

        if (bin[(lastBit = precisionBits - 1 + (i = (exp = bias + 1 - i) >= minExp && exp <= maxExp ? i + 1 : bias + 1 - (exp = minExp - 1))) + 1]) {
            if (!(rounded = bin[lastBit])) {
                for (j = lastBit + 2; !rounded && j < len; rounded = bin[j++]) {}
            }

            for (j = lastBit + 1; rounded && --j >= 0; (bin[j] = !bin[j] - 0) && (rounded = 0)) {}
        }

        for (i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i];) {}

        if ((exp = bias + 1 - i) >= minExp && exp <= maxExp) {
            ++i;
        } else if (exp < minExp) {
            exp != bias + 1 - len && exp < minUnnormExp && logger.warn("encodeFloat::float underflow");
            i = bias + 1 - (exp = minExp - 1);
        }

        if (intPart || status !== 0) {
            logger.warn(intPart ? "encodeFloat::float overflow" : "encodeFloat::" + status);
            exp = maxExp + 1;
            i = bias + 2;

            if (status == -Infinity) {
                signal = 1;
            } else if (isNaN(status)) {
                bin[i] = 1;
            }
        }

        for (n = Math.abs(exp + bias), j = exponentBits + 1, result = ""; --j; result = n % 2 + result, n = n >>= 1) {}

        var r = [];

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
            logger.warn("encodeInt::overflow");
            data = 0;
        }

        if (data < 0) {
            data += max;
        }

        for (var r = []; data; r[r.length] = String.fromCharCode(data % 256), data = Math.floor(data / 256)) {}

        for (bits = -(-bits >> 3) - r.length; bits--; r[r.length] = "\0") {}

        return (this.bigEndian || forceBigEndian ? r.reverse() : r).join("");
    };

    BinaryParser.toSmall = function (data) {
        return this.decodeInt(data, 8, true);
    };
    BinaryParser.fromSmall = function (data) {
        return this.encodeInt(data, 8, true);
    };
    BinaryParser.toByte = function (data) {
        return this.decodeInt(data, 8, false);
    };
    BinaryParser.fromByte = function (data) {
        return this.encodeInt(data, 8, false);
    };
    BinaryParser.toShort = function (data) {
        return this.decodeInt(data, 16, true);
    };
    BinaryParser.fromShort = function (data) {
        return this.encodeInt(data, 16, true);
    };
    BinaryParser.toWord = function (data) {
        return this.decodeInt(data, 16, false);
    };
    BinaryParser.fromWord = function (data) {
        return this.encodeInt(data, 16, false);
    };
    BinaryParser.toInt = function (data) {
        return this.decodeInt(data, 32, true);
    };
    BinaryParser.fromInt = function (data) {
        return this.encodeInt(data, 32, true);
    };
    BinaryParser.toLong = function (data) {
        return this.decodeInt(data, 64, true);
    };
    BinaryParser.fromLong = function (data) {
        return this.encodeInt(data, 64, true);
    };
    BinaryParser.toDWord = function (data) {
        return this.decodeInt(data, 32, false);
    };
    BinaryParser.fromDWord = function (data) {
        return this.encodeInt(data, 32, false);
    };
    BinaryParser.toQWord = function (data) {
        return this.decodeInt(data, 64, true);
    };
    BinaryParser.fromQWord = function (data) {
        return this.encodeInt(data, 64, true);
    };
    BinaryParser.toFloat = function (data) {
        return this.decodeFloat(data, 23, 8);
    };
    BinaryParser.fromFloat = function (data) {
        return this.encodeFloat(data, 23, 8);
    };
    BinaryParser.toDouble = function (data) {
        return this.decodeFloat(data, 52, 11);
    };
    BinaryParser.fromDouble = function (data) {
        return this.encodeFloat(data, 52, 11);
    };

    // Factor out the encode so it can be shared by add_header and push_int32
    BinaryParser.encode_int32 = function (number, asArray) {
        var a, b, c, d, unsigned;

        unsigned = number < 0 ? number + 0x100000000 : number;
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

        unsigned = number < 0 ? number + 0x10000000000000000 : number;
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
            } else if (c > 191 && c < 224) {
                c2 = binaryStr.charCodeAt(i + 1);
                decoded += String.fromCharCode((c & 31) << 6 | c2 & 63);

                i += 2;
            } else {
                c2 = binaryStr.charCodeAt(i + 1);
                c3 = binaryStr.charCodeAt(i + 2);
                decoded += String.fromCharCode((c & 15) << 12 | (c2 & 63) << 6 | c3 & 63);

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
    BinaryParser.encode_utf8 = function encode_utf8(s) {
        var a = "",
            c;

        for (var n = 0, len = s.length; n < len; n++) {
            c = s.charCodeAt(n);

            if (c < 128) {
                a += String.fromCharCode(c);
            } else if (c > 127 && c < 2048) {
                a += String.fromCharCode(c >> 6 | 192);
                a += String.fromCharCode(c & 63 | 128);
            } else {
                a += String.fromCharCode(c >> 12 | 224);
                a += String.fromCharCode(c >> 6 & 63 | 128);
                a += String.fromCharCode(c & 63 | 128);
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

    return BinaryParser;
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkJpbmFyeVBhcnNlci5qcyJdLCJuYW1lcyI6WyJsb2dnZXIiLCJjaHIiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJtYXhCaXRzIiwiaSIsIk1hdGgiLCJwb3ciLCJtb2R1bGUiLCJleHBvcnRzIiwiQmluYXJ5UGFyc2VyQnVmZmVyIiwiTG9nZ2VyIiwiaW5zdGFuY2UiLCJCaW5hcnlQYXJzZXIiLCJiaWdFbmRpYW4iLCJhbGxvd0V4Y2VwdGlvbnMiLCJkZWNvZGVGbG9hdCIsImRhdGEiLCJwcmVjaXNpb25CaXRzIiwiZXhwb25lbnRCaXRzIiwiYiIsImNoZWNrQnVmZmVyIiwiYmlhcyIsInNpZ25hbCIsInJlYWRCaXRzIiwiZXhwb25lbnQiLCJzaWduaWZpY2FuZCIsImRpdmlzb3IiLCJjdXJCeXRlIiwiYnVmZmVyIiwibGVuZ3RoIiwiYnl0ZVZhbHVlIiwic3RhcnRCaXQiLCJtYXNrIiwiTmFOIiwiSW5maW5pdHkiLCJfbW9kIiwiZGVjb2RlSW50IiwiYml0cyIsInNpZ25lZCIsImZvcmNlQmlnRW5kaWFuIiwieCIsIm1heCIsImVuY29kZUZsb2F0IiwibWluRXhwIiwibWF4RXhwIiwibWluVW5ub3JtRXhwIiwibiIsInBhcnNlRmxvYXQiLCJzdGF0dXMiLCJpc05hTiIsImV4cCIsImxlbiIsImJpbiIsIkFycmF5IiwiaW50UGFydCIsImZsb29yIiwiYWJzIiwiZmxvYXRQYXJ0IiwibGFzdEJpdCIsInJvdW5kZWQiLCJyZXN1bHQiLCJqIiwid2FybiIsInIiLCJzbGljZSIsImpvaW4iLCJjaGFyQXQiLCJyZXZlcnNlIiwiZW5jb2RlSW50IiwidG9TbWFsbCIsImZyb21TbWFsbCIsInRvQnl0ZSIsImZyb21CeXRlIiwidG9TaG9ydCIsImZyb21TaG9ydCIsInRvV29yZCIsImZyb21Xb3JkIiwidG9JbnQiLCJmcm9tSW50IiwidG9Mb25nIiwiZnJvbUxvbmciLCJ0b0RXb3JkIiwiZnJvbURXb3JkIiwidG9RV29yZCIsImZyb21RV29yZCIsInRvRmxvYXQiLCJmcm9tRmxvYXQiLCJ0b0RvdWJsZSIsImZyb21Eb3VibGUiLCJlbmNvZGVfaW50MzIiLCJudW1iZXIiLCJhc0FycmF5IiwiYSIsImMiLCJkIiwidW5zaWduZWQiLCJlbmNvZGVfaW50NjQiLCJlIiwiZiIsImciLCJoIiwiZGVjb2RlX3V0ZjgiLCJiaW5hcnlTdHIiLCJkZWNvZGVkIiwiYzEiLCJjMiIsImMzIiwiY2hhckNvZGVBdCIsImVuY29kZV9jc3RyaW5nIiwicyIsInVuZXNjYXBlIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiZW5jb2RlX3V0ZjgiLCJocHJpbnQiLCJ0b1N0cmluZyIsInByb2Nlc3MiLCJzdGRvdXQiLCJ3cml0ZSIsImlscHJpbnQiLCJobHByaW50Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7Ozs7QUFVQSxJQUFJQSxTQUFTLElBQWI7O0FBRUE7QUFDQSxJQUFJQyxNQUFNQyxPQUFPQyxZQUFqQjs7QUFFQSxJQUFJQyxVQUFVLEVBQWQ7QUFDQSxLQUFLLElBQUlDLElBQUksQ0FBYixFQUFnQkEsSUFBSSxFQUFwQixFQUF3QkEsR0FBeEIsRUFBNkI7QUFDekJELFlBQVFDLENBQVIsSUFBYUMsS0FBS0MsR0FBTCxDQUFTLENBQVQsRUFBWUYsQ0FBWixDQUFiO0FBQ0g7O0FBRURHLE9BQU9DLE9BQVAsR0FBaUIsVUFBU0Msa0JBQVQsRUFBNkJDLE1BQTdCLEVBQXFDO0FBQ2xEWCxhQUFTVyxPQUFPQyxRQUFoQjs7QUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFIa0QsUUFzQjVDQyxZQXRCNEMsR0F1QjlDLHNCQUFZQyxTQUFaLEVBQXVCQyxlQUF2QixFQUF3QztBQUFBOztBQUNwQ2YsaUJBQVNXLE9BQU9DLFFBQWhCOztBQUVBLGFBQUtFLFNBQUwsR0FBaUJBLFNBQWpCO0FBQ0EsYUFBS0MsZUFBTCxHQUF1QkEsZUFBdkI7QUFDSCxLQTVCNkM7O0FBaUNsREYsaUJBQWFHLFdBQWIsR0FBMkIsVUFBVUMsSUFBVixFQUFnQkMsYUFBaEIsRUFBK0JDLFlBQS9CLEVBQTZDO0FB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QUFDSCxDQTFYRCIsImZpbGUiOiJCaW5hcnlQYXJzZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIEJpbmFyeVBhcnNlci5qcyAtIGJhc2VkIG9uICh7QGxpbmsgaHR0cDovL2pzZnJvbWhlbGwuY29tL2NsYXNzZXMvYmluYXJ5LXBhcnNlciBCaW5hcnkgUGFyc2VyfSkgYnkgSm9uYXMgUmFvbmkgU29hcmVzIFNpbHZhXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogQGlnbm9yZVxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlZFxuICovXG4gXG52YXIgbG9nZ2VyID0gbnVsbDtcblxuLy8gU2hvcmN1dCBmb3IgU3RyaW5nLmZyb21DaGFyQ29kZVxudmFyIGNociA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG5cbnZhciBtYXhCaXRzID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDY0OyBpKyspIHtcbiAgICBtYXhCaXRzW2ldID0gTWF0aC5wb3coMiwgaSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQmluYXJ5UGFyc2VyQnVmZmVyLCBMb2dnZXIpIHtcbiAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG5cbiAgICAvKipcbiAgICAgKiBCaW5hcnlQYXJzZXJcbiAgICAgKiBAaWdub3JlXG4gICAgICogXG4gICAgICogQG1vZHVsZSBDdXJzb3JcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAc2luY2UgMC4wLjFcbiAgICAgKiBcbiAgICAgKiBAY2xhc3NkZXNjIEN1cnNvciBjbGFzcyB0aGF0IG1hcHMgYSBNb25nb0RCLWxpa2UgY3Vyc29yXG4gICAgICogXG4gICAgICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7Q29sbGVjdGlvbn0gY29sbGVjdGlvbiAtIFRoZSBjb2xsZWN0aW9uIGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIERhdGFiYXNlIG9iamVjdFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gICAgICogXG4gICAgICovXG4gICAgY2xhc3MgQmluYXJ5UGFyc2VyIHtcbiAgICAgICAgY29uc3RydWN0b3IoYmlnRW5kaWFuLCBhbGxvd0V4Y2VwdGlvbnMpIHtcbiAgICAgICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmJpZ0VuZGlhbiA9IGJpZ0VuZGlhbjtcbiAgICAgICAgICAgIHRoaXMuYWxsb3dFeGNlcHRpb25zID0gYWxsb3dFeGNlcHRpb25zO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICB9XG4gICAgXG4gICAgQmluYXJ5UGFyc2VyLmRlY29kZUZsb2F0ID0gZnVuY3Rpb24gKGRhdGEsIHByZWNpc2lvbkJpdHMsIGV4cG9uZW50Qml0cykge1xuICAgICAgICB2YXIgYiA9IG5ldyBCaW5hcnlQYXJzZXJCdWZmZXIodGhpcy5iaWdFbmRpYW4sIGRhdGEpO1xuICAgIFxuICAgICAgICBiLmNoZWNrQnVmZmVyKHByZWNpc2lvbkJpdHMgKyBleHBvbmVudEJpdHMgKyAxKTtcbiAgICBcbiAgICAgICAgdmFyIGJpYXMgPSBtYXhCaXRzW2V4cG9uZW50Qml0cyAtIDFdIC0gMSxcbiAgICAgICAgICAgIHNpZ25hbCA9IGIucmVhZEJpdHMocHJlY2lzaW9uQml0cyArIGV4cG9uZW50Qml0cywgMSksXG4gICAgICAgICAgICBleHBvbmVudCA9IGIucmVhZEJpdHMocHJlY2lzaW9uQml0cywgZXhwb25lbnRCaXRzKSxcbiAgICAgICAgICAgIHNpZ25pZmljYW5kID0gMCxcbiAgICAgICAgICAgIGRpdmlzb3IgPSAyLFxuICAgICAgICAgICAgY3VyQnl0ZSA9IGIuYnVmZmVyLmxlbmd0aCArICgtcHJlY2lzaW9uQml0cyA+PiAzKSAtIDE7XG4gICAgXG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGZvciAoXG4gICAgICAgICAgICAgICAgdmFyIGJ5dGVWYWx1ZSA9IGIuYnVmZmVyWyArK2N1ckJ5dGUgXSwgc3RhcnRCaXQgPSBwcmVjaXNpb25CaXRzICUgOCB8fCA4LCBtYXNrID0gMSA8PCBzdGFydEJpdDtcbiAgICAgICAgICAgICAgICBtYXNrID4+PSAxOyBcbiAgICAgICAgICAgICAgICAoIGJ5dGVWYWx1ZSAmIG1hc2sgKSAmJiAoIHNpZ25pZmljYW5kICs9IDEgLyBkaXZpc29yICksIGRpdmlzb3IgKj0gMiBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gd2hpbGUgKHByZWNpc2lvbkJpdHMgLT0gc3RhcnRCaXQpO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgXG4gICAgICAgIGlmICggZXhwb25lbnQgPT0gKCBiaWFzIDw8IDEgKSArIDEgKSB7XG4gICAgICAgIFx0aWYgKHNpZ25pZmljYW5kKSB7XG4gICAgICAgIFx0XHRyZXR1cm4gTmFOO1xuICAgICAgICBcdH0gZWxzZSB7XG4gICAgICAgIFx0XHRpZiAoc2lnbmFsKSB7XG4gICAgICAgIFx0XHRcdHJldHVybiAtSW5maW5pdHk7XG4gICAgICAgIFx0XHR9IGVsc2Uge1xuICAgICAgICBcdFx0XHRyZXR1cm4gK0luZmluaXR5O1xuICAgICAgICBcdFx0fVxuICAgICAgICBcdH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgXHR2YXIgX21vZCA9IDA7XG4gICAgICAgIFx0XG4gICAgICAgIFx0aWYgKGV4cG9uZW50IHx8IHNpZ25pZmljYW5kKSB7XG4gICAgICAgIFx0ICAgIF9tb2QgPSBleHBvbmVudCA/IE1hdGgucG93KCAyLCBleHBvbmVudCAtIGJpYXMgKSAqICggMSArIHNpZ25pZmljYW5kICkgOiBNYXRoLnBvdyggMiwgLWJpYXMgKyAxICkgKiBzaWduaWZpY2FuZDtcbiAgICAgICAgXHR9XG4gICAgICAgIFx0XG4gICAgICAgIFx0cmV0dXJuICggMSArIHNpZ25hbCAqIC0yICkgKiAoX21vZCk7XG4gICAgICAgIH1cbiAgICBcbiAgICBcbiAgICAgICAgLy8gcmV0dXJuIGV4cG9uZW50ID09ICggYmlhcyA8PCAxICkgKyAxID8gc2lnbmlmaWNhbmQgPyBOYU4gOiBzaWduYWwgPyAtSW5maW5pdHkgOiArSW5maW5pdHkgOiAoIDEgKyBzaWduYWwgKiAtMiApICogKCBleHBvbmVudCB8fCBzaWduaWZpY2FuZCA/ICFleHBvbmVudCA/IE1hdGgucG93KCAyLCAtYmlhcyArIDEgKSAqIHNpZ25pZmljYW5kIDogTWF0aC5wb3coIDIsIGV4cG9uZW50IC0gYmlhcyApICogKCAxICsgc2lnbmlmaWNhbmQgKSA6IDAgKTtcbiAgICB9O1xuICAgIFxuICAgIEJpbmFyeVBhcnNlci5kZWNvZGVJbnQgPSBmdW5jdGlvbiAoZGF0YSwgYml0cywgc2lnbmVkLCBmb3JjZUJpZ0VuZGlhbikge1xuICAgICAgICB2YXIgYiA9IG5ldyBCaW5hcnlQYXJzZXJCdWZmZXIodGhpcy5iaWdFbmRpYW4gfHwgZm9yY2VCaWdFbmRpYW4sIGRhdGEpLFxuICAgICAgICAgICAgeCA9IGIucmVhZEJpdHMoMCwgYml0cyksXG4gICAgICAgICAgICBtYXggPSBtYXhCaXRzW2JpdHNdOyAvL21heCA9IE1hdGgucG93KCAyLCBiaXRzICk7XG4gICAgXG4gICAgICAgIHJldHVybiBzaWduZWQgJiYgeCA+PSBtYXggLyAyID8geCAtIG1heCA6IHg7XG4gICAgfTtcbiAgICBcbiAgICBCaW5hcnlQYXJzZXIuZW5jb2RlRmxvYXQgPSBmdW5jdGlvbiAoZGF0YSwgcHJlY2lzaW9uQml0cywgZXhwb25lbnRCaXRzKSB7XG4gICAgICAgIHZhciBiaWFzID0gbWF4Qml0c1tleHBvbmVudEJpdHMgLSAxXSAtIDEsXG4gICAgICAgICAgICBtaW5FeHAgPSAtYmlhcyArIDEsXG4gICAgICAgICAgICBtYXhFeHAgPSBiaWFzLFxuICAgICAgICAgICAgbWluVW5ub3JtRXhwID0gbWluRXhwIC0gcHJlY2lzaW9uQml0cyxcbiAgICAgICAgICAgIG4gPSBwYXJzZUZsb2F0KGRhdGEpLFxuICAgICAgICAgICAgc3RhdHVzID0gaXNOYU4obikgfHwgbiA9PSAtSW5maW5pdHkgfHwgbiA9PSArSW5maW5pdHkgPyBuIDogMCxcbiAgICAgICAgICAgIGV4cCA9IDAsXG4gICAgICAgICAgICBsZW4gPSAyICogYmlhcyArIDEgKyBwcmVjaXNpb25CaXRzICsgMyxcbiAgICAgICAgICAgIGJpbiA9IG5ldyBBcnJheShsZW4pLFxuICAgICAgICAgICAgc2lnbmFsID0gKG4gPSBzdGF0dXMgIT09IDAgPyAwIDogbikgPCAwLFxuICAgICAgICAgICAgaW50UGFydCA9IE1hdGguZmxvb3IobiA9IE1hdGguYWJzKG4pKSxcbiAgICAgICAgICAgIGZsb2F0UGFydCA9IG4gLSBpbnRQYXJ0LFxuICAgICAgICAgICAgbGFzdEJpdCxcbiAgICAgICAgICAgIHJvdW5kZWQsXG4gICAgICAgICAgICByZXN1bHQsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgajtcbiAgICBcbiAgICBcbiAgICAgICAgZm9yIChpID0gbGVuOyBpOyBiaW5bLS1pXSA9IDApO1xuICAgICAgICBcbiAgICAgICAgZm9yIChpID0gYmlhcyArIDI7IGludFBhcnQgJiYgaTsgYmluWy0taV0gPSBpbnRQYXJ0ICUgMiwgaW50UGFydCA9IE1hdGguZmxvb3IoaW50UGFydCAvIDIpKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoaSA9IGJpYXMgKyAxOyBmbG9hdFBhcnQgPiAwICYmIGk7IChiaW5bKytpXSA9ICgoZmxvYXRQYXJ0ICo9IDIpID49IDEpIC0gMCApICYmIC0tZmxvYXRQYXJ0KTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoaSA9IC0xOyArK2kgPCBsZW4gJiYgIWJpbltpXTspO1xuICAgICAgXG4gICAgICAgIGlmIChiaW5bKGxhc3RCaXQgPSBwcmVjaXNpb25CaXRzIC0gMSArIChpID0gKGV4cCA9IGJpYXMgKyAxIC0gaSkgPj0gbWluRXhwICYmIGV4cCA8PSBtYXhFeHAgPyBpICsgMSA6IGJpYXMgKyAxIC0gKGV4cCA9IG1pbkV4cCAtIDEpKSkgKyAxXSkge1xuICAgICAgICAgICAgaWYgKCEocm91bmRlZCA9IGJpbltsYXN0Qml0XSkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSBsYXN0Qml0ICsgMjsgIXJvdW5kZWQgJiYgaiA8IGxlbjsgcm91bmRlZCA9IGJpbltqKytdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChqID0gbGFzdEJpdCArIDE7IHJvdW5kZWQgJiYgLS1qID49IDA7IChiaW5bal0gPSAhYmluW2pdIC0gMCkgJiYgKHJvdW5kZWQgPSAwKSk7XG4gICAgICAgIH1cbiAgICAgIFxuICAgICAgICBmb3IgKGkgPSBpIC0gMiA8IDAgPyAtMSA6IGkgLSAzOyArK2kgPCBsZW4gJiYgIWJpbltpXTspO1xuICAgICAgICBcbiAgICAgICAgaWYgKChleHAgPSBiaWFzICsgMSAtIGkpID49IG1pbkV4cCAmJiBleHAgPD0gbWF4RXhwKSB7XG4gICAgICAgICAgICArK2k7XG4gICAgICAgIH0gZWxzZSBpZiAoZXhwIDwgbWluRXhwKSB7XG4gICAgICAgICAgICBleHAgIT0gYmlhcyArIDEgLSBsZW4gJiYgZXhwIDwgbWluVW5ub3JtRXhwICYmIGxvZ2dlci53YXJuKFwiZW5jb2RlRmxvYXQ6OmZsb2F0IHVuZGVyZmxvd1wiKTtcbiAgICAgICAgICAgIGkgPSBiaWFzICsgMSAtIChleHAgPSBtaW5FeHAgLSAxKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGludFBhcnQgfHwgc3RhdHVzICE9PSAwKSB7XG4gICAgICAgICAgICBsb2dnZXIud2FybihpbnRQYXJ0ID8gXCJlbmNvZGVGbG9hdDo6ZmxvYXQgb3ZlcmZsb3dcIiA6IFwiZW5jb2RlRmxvYXQ6OlwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgIGV4cCA9IG1heEV4cCArIDE7XG4gICAgICAgICAgICBpID0gYmlhcyArIDI7XG4gICAgICAgIFxuICAgICAgICAgICAgaWYgKHN0YXR1cyA9PSAtSW5maW5pdHkpIHtcbiAgICAgICAgICAgICAgICBzaWduYWwgPSAxO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc05hTihzdGF0dXMpKSB7XG4gICAgICAgICAgICAgICAgYmluW2ldID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXG4gICAgICAgIGZvciAobiA9IE1hdGguYWJzKGV4cCArIGJpYXMpLCBqID0gZXhwb25lbnRCaXRzICsgMSwgcmVzdWx0ID0gXCJcIjsgLS1qOyByZXN1bHQgPSAobiAlIDIpICsgcmVzdWx0LCBuID0gbiA+Pj0gMSk7XG4gICAgICAgIFxuICAgICAgICBsZXQgciA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yIChuID0gMCwgaiA9IDAsIGkgPSAocmVzdWx0ID0gKHNpZ25hbCA/IFwiMVwiIDogXCIwXCIpICsgcmVzdWx0ICsgYmluLnNsaWNlKGksIGkgKyBwcmVjaXNpb25CaXRzKS5qb2luKFwiXCIpKS5sZW5ndGgsIHIgPSBbXTsgaTsgaiA9IChqICsgMSkgJSA4KSB7XG4gICAgICAgICAgICBuICs9ICgxIDw8IGopICogcmVzdWx0LmNoYXJBdCgtLWkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaiA9PSA3KSB7XG4gICAgICAgICAgICAgICAgcltyLmxlbmd0aF0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG4pO1xuICAgICAgICAgICAgICAgIG4gPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBcbiAgICAgICAgcltyLmxlbmd0aF0gPSBuID8gU3RyaW5nLmZyb21DaGFyQ29kZShuKSA6IFwiXCI7XG4gICAgICBcbiAgICAgICAgcmV0dXJuICh0aGlzLmJpZ0VuZGlhbiA/IHIucmV2ZXJzZSgpIDogcikuam9pbihcIlwiKTtcbiAgICB9O1xuICAgIFxuICAgIEJpbmFyeVBhcnNlci5lbmNvZGVJbnQgPSBmdW5jdGlvbiAoZGF0YSwgYml0cywgc2lnbmVkLCBmb3JjZUJpZ0VuZGlhbikge1xuICAgICAgICB2YXIgbWF4ID0gbWF4Qml0c1tiaXRzXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXRhID49IG1heCB8fCBkYXRhIDwgLShtYXggLyAyKSkge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oXCJlbmNvZGVJbnQ6Om92ZXJmbG93XCIpO1xuICAgICAgICAgICAgZGF0YSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChkYXRhIDwgMCkge1xuICAgICAgICAgICAgZGF0YSArPSBtYXg7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIHIgPSBbXTsgZGF0YTsgcltyLmxlbmd0aF0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGRhdGEgJSAyNTYpLCBkYXRhID0gTWF0aC5mbG9vcihkYXRhIC8gMjU2KSk7XG4gICAgICAgIFxuICAgICAgICBmb3IgKGJpdHMgPSAtKC1iaXRzID4+IDMpIC0gci5sZW5ndGg7IGJpdHMtLTsgcltyLmxlbmd0aF0gPSBcIlxcMFwiKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiAoKHRoaXMuYmlnRW5kaWFuIHx8IGZvcmNlQmlnRW5kaWFuKSA/IHIucmV2ZXJzZSgpIDogcikuam9pbihcIlwiKTtcbiAgICB9O1xuICAgIFxuICAgIEJpbmFyeVBhcnNlci50b1NtYWxsICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZGVjb2RlSW50KCBkYXRhLCAgOCwgdHJ1ZSAgKTsgfTtcbiAgICBCaW5hcnlQYXJzZXIuZnJvbVNtYWxsICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgIDgsIHRydWUgICk7IH07XG4gICAgQmluYXJ5UGFyc2VyLnRvQnl0ZSAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsICA4LCBmYWxzZSApOyB9O1xuICAgIEJpbmFyeVBhcnNlci5mcm9tQnl0ZSAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlSW50KCBkYXRhLCAgOCwgZmFsc2UgKTsgfTtcbiAgICBCaW5hcnlQYXJzZXIudG9TaG9ydCAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgMTYsIHRydWUgICk7IH07XG4gICAgQmluYXJ5UGFyc2VyLmZyb21TaG9ydCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDE2LCB0cnVlICApOyB9O1xuICAgIEJpbmFyeVBhcnNlci50b1dvcmQgICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZGVjb2RlSW50KCBkYXRhLCAxNiwgZmFsc2UgKTsgfTtcbiAgICBCaW5hcnlQYXJzZXIuZnJvbVdvcmQgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgMTYsIGZhbHNlICk7IH07XG4gICAgQmluYXJ5UGFyc2VyLnRvSW50ICAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDMyLCB0cnVlICApOyB9O1xuICAgIEJpbmFyeVBhcnNlci5mcm9tSW50ICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlSW50KCBkYXRhLCAzMiwgdHJ1ZSAgKTsgfTtcbiAgICBCaW5hcnlQYXJzZXIudG9Mb25nICAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgNjQsIHRydWUgICk7IH07XG4gICAgQmluYXJ5UGFyc2VyLmZyb21Mb25nICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICApOyB9O1xuICAgIEJpbmFyeVBhcnNlci50b0RXb3JkICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZGVjb2RlSW50KCBkYXRhLCAzMiwgZmFsc2UgKTsgfTtcbiAgICBCaW5hcnlQYXJzZXIuZnJvbURXb3JkICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgMzIsIGZhbHNlICk7IH07XG4gICAgQmluYXJ5UGFyc2VyLnRvUVdvcmQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICk7IH07XG4gICAgQmluYXJ5UGFyc2VyLmZyb21RV29yZCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICk7IH07XG4gICAgQmluYXJ5UGFyc2VyLnRvRmxvYXQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVGbG9hdCggZGF0YSwgMjMsIDggICApOyB9O1xuICAgIEJpbmFyeVBhcnNlci5mcm9tRmxvYXQgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlRmxvYXQoIGRhdGEsIDIzLCA4ICAgKTsgfTtcbiAgICBCaW5hcnlQYXJzZXIudG9Eb3VibGUgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUZsb2F0KCBkYXRhLCA1MiwgMTEgICk7IH07XG4gICAgQmluYXJ5UGFyc2VyLmZyb21Eb3VibGUgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVGbG9hdCggZGF0YSwgNTIsIDExICApOyB9O1xuICAgIFxuICAgIC8vIEZhY3RvciBvdXQgdGhlIGVuY29kZSBzbyBpdCBjYW4gYmUgc2hhcmVkIGJ5IGFkZF9oZWFkZXIgYW5kIHB1c2hfaW50MzJcbiAgICBCaW5hcnlQYXJzZXIuZW5jb2RlX2ludDMyID0gZnVuY3Rpb24gKG51bWJlciwgYXNBcnJheSkge1xuICAgICAgICB2YXIgYSwgYiwgYywgZCwgdW5zaWduZWQ7XG4gICAgICAgIFxuICAgICAgICB1bnNpZ25lZCA9IChudW1iZXIgPCAwKSA/IChudW1iZXIgKyAweDEwMDAwMDAwMCkgOiBudW1iZXI7XG4gICAgICAgIGEgPSBNYXRoLmZsb29yKHVuc2lnbmVkIC8gMHhmZmZmZmYpO1xuICAgICAgICBcbiAgICAgICAgdW5zaWduZWQgJj0gMHhmZmZmZmY7XG4gICAgICAgIGIgPSBNYXRoLmZsb29yKHVuc2lnbmVkIC8gMHhmZmZmKTtcbiAgICAgICAgXG4gICAgICAgIHVuc2lnbmVkICY9IDB4ZmZmZjtcbiAgICAgICAgYyA9IE1hdGguZmxvb3IodW5zaWduZWQgLyAweGZmKTtcbiAgICAgICAgXG4gICAgICAgIHVuc2lnbmVkICY9IDB4ZmY7XG4gICAgICAgIGQgPSBNYXRoLmZsb29yKHVuc2lnbmVkKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBhc0FycmF5ID8gW2NocihhKSwgY2hyKGIpLCBjaHIoYyksIGNocihkKV0gOiBjaHIoYSkgKyBjaHIoYikgKyBjaHIoYykgKyBjaHIoZCk7XG4gICAgfTtcbiAgICBcbiAgICBCaW5hcnlQYXJzZXIuZW5jb2RlX2ludDY0ID0gZnVuY3Rpb24gKG51bWJlcikge1xuICAgICAgICB2YXIgYSwgYiwgYywgZCwgZSwgZiwgZywgaCwgdW5zaWduZWQ7XG4gICAgICAgIFxuICAgICAgICB1bnNpZ25lZCA9IChudW1iZXIgPCAwKSA/IChudW1iZXIgKyAweDEwMDAwMDAwMDAwMDAwMDAwKSA6IG51bWJlcjtcbiAgICAgICAgYSA9IE1hdGguZmxvb3IodW5zaWduZWQgLyAweGZmZmZmZmZmZmZmZmZmKTtcbiAgICAgICAgXG4gICAgICAgIHVuc2lnbmVkICY9IDB4ZmZmZmZmZmZmZmZmZmY7XG4gICAgICAgIGIgPSBNYXRoLmZsb29yKHVuc2lnbmVkIC8gMHhmZmZmZmZmZmZmZmYpO1xuICAgICAgICBcbiAgICAgICAgdW5zaWduZWQgJj0gMHhmZmZmZmZmZmZmZmY7XG4gICAgICAgIGMgPSBNYXRoLmZsb29yKHVuc2lnbmVkIC8gMHhmZmZmZmZmZmZmKTtcbiAgICAgICAgXG4gICAgICAgIHVuc2lnbmVkICY9IDB4ZmZmZmZmZmZmZjtcbiAgICAgICAgZCA9IE1hdGguZmxvb3IodW5zaWduZWQgLyAweGZmZmZmZmZmKTtcbiAgICAgICAgXG4gICAgICAgIHVuc2lnbmVkICY9IDB4ZmZmZmZmZmY7XG4gICAgICAgIGUgPSBNYXRoLmZsb29yKHVuc2lnbmVkIC8gMHhmZmZmZmYpO1xuICAgICAgICBcbiAgICAgICAgdW5zaWduZWQgJj0gMHhmZmZmZmY7XG4gICAgICAgIGYgPSBNYXRoLmZsb29yKHVuc2lnbmVkIC8gMHhmZmZmKTtcbiAgICAgICAgXG4gICAgICAgIHVuc2lnbmVkICY9IDB4ZmZmZjtcbiAgICAgICAgZyA9IE1hdGguZmxvb3IodW5zaWduZWQgLyAweGZmKTtcbiAgICAgICAgXG4gICAgICAgIHVuc2lnbmVkICY9IDB4ZmY7XG4gICAgICAgIGggPSBNYXRoLmZsb29yKHVuc2lnbmVkKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjaHIoYSkgKyBjaHIoYikgKyBjaHIoYykgKyBjaHIoZCkgKyBjaHIoZSkgKyBjaHIoZikgKyBjaHIoZykgKyBjaHIoaCk7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBVVEY4IG1ldGhvZHNcbiAgICAgKi9cbiAgICBcbiAgICAvLyBUYWtlIGEgcmF3IGJpbmFyeSBzdHJpbmcgYW5kIHJldHVybiBhIHV0Zjggc3RyaW5nXG4gICAgQmluYXJ5UGFyc2VyLmRlY29kZV91dGY4ID0gZnVuY3Rpb24gKGJpbmFyeVN0cikge1xuICAgICAgICB2YXIgbGVuID0gYmluYXJ5U3RyLmxlbmd0aCxcbiAgICAgICAgICAgIGRlY29kZWQgPSAnJyxcbiAgICAgICAgICAgIGkgPSAwLFxuICAgICAgICAgICAgYyA9IDAsXG4gICAgICAgICAgICBjMSA9IDAsXG4gICAgICAgICAgICBjMiA9IDAsXG4gICAgICAgICAgICBjMztcbiAgICAgICAgXG4gICAgICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICAgICAgICBjID0gYmluYXJ5U3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjIDwgMTI4KSB7XG4gICAgICAgICAgICAgICAgZGVjb2RlZCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKGMgPiAxOTEpICYmIChjIDwgMjI0KSkge1xuICAgICAgICAgICAgICAgIGMyID0gYmluYXJ5U3RyLmNoYXJDb2RlQXQoaSsxKTtcbiAgICAgICAgICAgICAgICBkZWNvZGVkICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKChjICYgMzEpIDw8IDYpIHwgKGMyICYgNjMpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGMyID0gYmluYXJ5U3RyLmNoYXJDb2RlQXQoaSsxKTtcbiAgICAgICAgICAgICAgICBjMyA9IGJpbmFyeVN0ci5jaGFyQ29kZUF0KGkrMik7XG4gICAgICAgICAgICAgICAgZGVjb2RlZCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCgoYyAmIDE1KSA8PCAxMikgfCAoKGMyICYgNjMpIDw8IDYpIHwgKGMzICYgNjMpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpICs9IDM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkZWNvZGVkO1xuICAgIH07XG4gICAgXG4gICAgLy8gRW5jb2RlIGEgY3N0cmluZ1xuICAgIEJpbmFyeVBhcnNlci5lbmNvZGVfY3N0cmluZyA9IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHJldHVybiB1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQocykpICsgQmluYXJ5UGFyc2VyLmZyb21CeXRlKDApO1xuICAgIH07XG4gICAgXG4gICAgLy8gVGFrZSBhIHV0Zjggc3RyaW5nIGFuZCByZXR1cm4gYSBiaW5hcnkgc3RyaW5nXG4gICAgQmluYXJ5UGFyc2VyLmVuY29kZV91dGY4ID0gZnVuY3Rpb24gZW5jb2RlX3V0ZjggKHMpIHtcbiAgICAgICAgdmFyIGEgPSBcIlwiLFxuICAgICAgICAgICAgYztcbiAgICBcbiAgICAgICAgZm9yICh2YXIgbiA9IDAsIGxlbiA9IHMubGVuZ3RoOyBuIDwgbGVuOyBuKyspIHtcbiAgICAgICAgICAgIGMgPSBzLmNoYXJDb2RlQXQobik7XG4gICAgXG4gICAgICAgICAgICBpZiAoYyA8IDEyOCkge1xuICAgICAgICAgICAgICAgIGEgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKGMgPiAxMjcpICYmIChjIDwgMjA0OCkpIHtcbiAgICAgICAgICAgICAgICBhICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjYpIHwgMTkyKSA7XG4gICAgICAgICAgICAgICAgYSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChjJjYzKSB8IDEyOCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGEgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoYz4+MTIpIHwgMjI0KTtcbiAgICAgICAgICAgICAgICBhICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKChjPj42KSAmIDYzKSB8IDEyOCk7XG4gICAgICAgICAgICAgICAgYSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChjJjYzKSB8IDEyOCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfTtcbiAgICBcbiAgICBCaW5hcnlQYXJzZXIuaHByaW50ID0gZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgdmFyIG51bWJlcjtcbiAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChzLmNoYXJDb2RlQXQoaSkgPCAzMikge1xuICAgICAgICAgICAgICAgIG51bWJlciA9IHMuY2hhckNvZGVBdChpKSA8PSAxNSA/IFwiMFwiICsgcy5jaGFyQ29kZUF0KGkpLnRvU3RyaW5nKDE2KSA6IHMuY2hhckNvZGVBdChpKS50b1N0cmluZygxNik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobnVtYmVyICsgXCIgXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBzLmNoYXJDb2RlQXQoaSkgPD0gMTUgPyBcIjBcIiArIHMuY2hhckNvZGVBdChpKS50b1N0cmluZygxNikgOiBzLmNoYXJDb2RlQXQoaSkudG9TdHJpbmcoMTYpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG51bWJlciArIFwiIFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoXCJcXG5cXG5cIik7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgIH07XG4gICAgXG4gICAgQmluYXJ5UGFyc2VyLmlscHJpbnQgPSBmdW5jdGlvbiAocykge1xuICAgICAgICB2YXIgbnVtYmVyO1xuICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKHMuY2hhckNvZGVBdChpKSA8IDMyKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gcy5jaGFyQ29kZUF0KGkpIDw9IDE1ID8gXCIwXCIgKyBzLmNoYXJDb2RlQXQoaSkudG9TdHJpbmcoMTApIDogcy5jaGFyQ29kZUF0KGkpLnRvU3RyaW5nKDEwKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShudW1iZXIgKyBcIiBcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG51bWJlciA9IHMuY2hhckNvZGVBdChpKSA8PSAxNSA/IFwiMFwiICsgcy5jaGFyQ29kZUF0KGkpLnRvU3RyaW5nKDEwKSA6IHMuY2hhckNvZGVBdChpKS50b1N0cmluZygxMCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobnVtYmVyICsgXCIgXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShcIlxcblxcblwiKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgfTtcbiAgICBcbiAgICBCaW5hcnlQYXJzZXIuaGxwcmludCA9IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHZhciBudW1iZXI7XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKHMuY2hhckNvZGVBdChpKSA8IDMyKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gcy5jaGFyQ29kZUF0KGkpIDw9IDE1ID8gXCIwXCIgKyBzLmNoYXJDb2RlQXQoaSkudG9TdHJpbmcoMTYpIDogcy5jaGFyQ29kZUF0KGkpLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShudW1iZXIgKyBcIiBcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG51bWJlciA9IHMuY2hhckNvZGVBdChpKSA8PSAxNSA/IFwiMFwiICsgcy5jaGFyQ29kZUF0KGkpLnRvU3RyaW5nKDE2KSA6IHMuY2hhckNvZGVBdChpKS50b1N0cmluZygxNik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobnVtYmVyICsgXCIgXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShcIlxcblxcblwiKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgfTtcbiAgICBcbiAgICByZXR1cm4gQmluYXJ5UGFyc2VyO1xufTsiXX0=
