/**
 * MongoPortable - Solution for a MongoDB-like portable database.
 * version 1.2.0
 * 
 * made by Eduardo Astolfi <eastolfi91@gmail.com>
 * copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * MIT Licensed
 */

require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global _, Logger */

/**
 * @file BinaryParser.js - based on ({@link http://jsfromhell.com/classes/binary-parser Binary Parser}) by Jonas Raoni Soares Silva
 * @version 1.0.0
 * @ignore
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

var /*Logger = require("jsw-logger"),*/
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
        exp != bias + 1 - len && exp < minUnnormExp && console.warn("encodeFloat::float underflow"); // TODO logger
        i = bias + 1 - (exp = minExp - 1);
    }

    if (intPart || status !== 0) {
        console.warn(intPart ? "encodeFloat::float overflow" : "encodeFloat::" + status); // TODO logger
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
        console.warn("encodeInt::overflow"); // TODO logger
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

module.exports = BinaryParser;

}).call(this,require('_process'))
},{"./BinaryParserBuffer":2,"_process":10}],2:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global Logger */

/**
 * @file BinaryParserBuffer.js - based on ({@link http://jsfromhell.com/classes/binary-parser Binary Parser}) by Jonas Raoni Soares Silva
 * @version 1.0.0
 * @ignore
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

// var Logger = require("jsw-logger");

var logger = null;

/**
 * BinaryParserBuffer
 * @ignore
 * 
 * @module BinaryParserBuffer
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

var BinaryParserBuffer = function () {
    function BinaryParserBuffer(bigEndian, buffer) {
        _classCallCheck(this, BinaryParserBuffer);

        logger = Logger.instance;

        this.bigEndian = bigEndian || 0;
        this.buffer = [];
        this.setBuffer(buffer);
    }

    _createClass(BinaryParserBuffer, [{
        key: "setBuffer",
        value: function setBuffer(data) {
            var l, i, b;

            if (data) {
                i = l = data.length;
                b = this.buffer = new Array(l);

                for (; i; b[l - i] = data.charCodeAt(--i)) {}

                this.bigEndian && b.reverse();
            }
        }
    }, {
        key: "hasNeededBits",
        value: function hasNeededBits(neededBits) {
            return this.buffer.length >= -(-neededBits >> 3);
        }
    }, {
        key: "checkBuffer",
        value: function checkBuffer(neededBits) {
            if (!this.hasNeededBits(neededBits)) {
                logger.throw("checkBuffer::missing bytes");
            }
        }
    }, {
        key: "readBits",
        value: function readBits(start, length) {
            //shl fix: Henri Torgemane ~1996 (compressed by Jonas Raoni)

            function shl(a, b) {
                for (; b--; a = ((a %= 0x7fffffff + 1) & 0x40000000) == 0x40000000 ? a * 2 : (a - 0x40000000) * 2 + 0x7fffffff + 1) {}

                return a;
            }

            if (start < 0 || length <= 0) {
                return 0;
            }

            this.checkBuffer(start + length);

            var offsetLeft,
                offsetRight = start % 8,
                curByte = this.buffer.length - (start >> 3) - 1,
                lastByte = this.buffer.length + (-(start + length) >> 3),
                diff = curByte - lastByte,
                sum = (this.buffer[curByte] >> offsetRight & (1 << (diff ? 8 - offsetRight : length)) - 1) + (diff && (offsetLeft = (start + length) % 8) ? (this.buffer[lastByte++] & (1 << offsetLeft) - 1) << (diff-- << 3) - offsetRight : 0);

            for (; diff; sum += shl(this.buffer[lastByte++], (diff-- << 3) - offsetRight)) {}

            return sum;
        }
    }]);

    return BinaryParserBuffer;
}();

module.exports = BinaryParserBuffer;

},{}],3:[function(require,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* global _, Logger */

/**
 * @file Collection.js - based on Monglo#Collection ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

var /*Logger = require("jsw-logger"),*/
EventEmitter = require("./utils/EventEmitter"),

/*_ = require("lodash"),*/
Cursor = require("./Cursor"),
    ObjectId = require('./ObjectId'),
    Selector = require("./Selector"),
    SelectorMatcher = require("./SelectorMatcher");

var logger = null;

/**
 * Collection
 * 
 * @module Collection
 * @constructor
 * @since 0.0.1
 * 
 * @classdesc Collection class that maps a MongoDB-like collection
 * 
 * @param {MongoPortable} db - Additional options
 * @param {String} collectionName - The name of the collection
 * @param {Object} [options] - Database object
 * 
 * @param {Object} [options.pkFactory=null] - Object overriding the basic "ObjectId" primary key generation.
 * 
 */
var database = null;

var Collection = function (_EventEmitter) {
    _inherits(Collection, _EventEmitter);

    // var Collection = function(db, collectionName, options) {
    function Collection(db, collectionName, options) {
        var _ret;

        _classCallCheck(this, Collection);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Collection).call(this));

        if (!(_this instanceof Collection)) return _ret = new Collection(db, collectionName, options), _possibleConstructorReturn(_this, _ret);

        logger = Logger.instance;

        if (_.isNil(db)) logger.throw("db parameter required");

        if (_.isNil(collectionName)) logger.throw("collectionName parameter required");

        if (_.isNil(options) || !_.isPlainObject(options)) options = {};

        Collection.checkCollectionName(collectionName);

        // this.db = db;
        database = db;
        _this.name = collectionName;
        _this.databaseName = db.databaseName;
        _this.fullName = _this.databaseName + '.' + _this.name;
        _this.docs = [];
        _this.doc_indexes = {};
        _this.snapshots = [];
        _this.opts = {}; // Default options

        _.merge(_this.opts, options);

        // this.emit = db.emit;
        return _this;
    }

    _createClass(Collection, [{
        key: "emit",
        value: function emit(name, args, cb) {
            _get(Object.getPrototypeOf(Collection.prototype), "emit", this).call(this, name, args, cb, database._stores);
        }
    }]);

    return Collection;
}(EventEmitter);

// TODO enforce rule that field names can't start with '$' or contain '.'
// (real mongodb does in fact enforce this)
// TODO possibly enforce that 'undefined' does not appear (we assume
// this in our handling of null and $exists)
/**
 * Inserts a document into the collection
 * 
 * @method Collection#insert
 * 
 * @param {Object} doc - Document to be inserted
 * @param {Object} [options] - Additional options
 * 
 * @param {Boolean} [options.chain=false] - If set to "true" returns this instance, so it can be chained with other methods
 * 
 * @param {Function} [callback=null] Callback function to be called at the end with the results
 * 
 * @returns {Object|Collection} If "options.chain" set to "true" returns this instance, otherwise returns the inserted document
 */


Collection.prototype.insert = function (doc, options, callback) {
    if (_.isNil(doc)) logger.throw("doc parameter required");

    if (!_.isPlainObject(doc)) logger.throw("doc must be an object");

    if (_.isNil(options)) options = {};

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    // Creating a safe copy of the document
    var _doc = _.cloneDeep(doc);

    // If the document comes with a number ID, parse it to String
    if (_.isNumber(_doc._id)) {
        _doc._id = _.toString(_doc._id);
    }

    if (_.isNil(_doc._id) || !_doc._id instanceof ObjectId && (!_.isString(_doc._id) || !_doc._id.length)) {
        _doc._id = new ObjectId();
    }

    // Add options to more dates
    _doc.timestamp = new ObjectId().generationTime;

    // Reverse
    this.doc_indexes[_.toString(_doc._id)] = this.docs.length;
    this.docs.push(_doc);

    /**
     * "insert" event.
     *
     * @event MongoPortable~insert
     * 
     * @param {Object} collection - Information about the collection
     * @param {Object} doc - Information about the document inserted
     */
    this.emit('insert', {
        collection: this,
        doc: _doc
    });

    if (callback) callback(null, _doc);

    if (options.chain) return this;

    return _doc;
};

/**
 * Inserts several documents into the collection
 * 
 * @method Collection#bulkInsert
 * 
 * @param {Array} docs - Documents to be inserted
 * @param {Object} [options] - Additional options
 * 
 * @param {Boolean} [options.chain=false] - If set to "true" returns this instance, so it can be chained with other methods
 * 
 * @param {Function} [callback=null] Callback function to be called at the end with the results
 * 
 * @returns {Object|Collection} If "options.chain" set to "true" returns this instance, otherwise returns the inserted document
 */
Collection.prototype.bulkInsert = function (docs, options, callback) {
    if (_.isNil(docs)) logger.throw("docs parameter required");

    if (!_.isArray(docs)) logger.throw("docs must be an array");

    if (_.isNil(options)) options = {};

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var _docs = [];

    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];

        _docs.push(this.insert(doc, options));
    }

    if (callback) callback(null, _docs);

    if (options.chain) return this;

    return _docs;
};

/**
 * Finds all matching documents
 * 
 * @method Collection#find
 * 
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object|Array|String} [fields={}] - The fields of the document to show
 * @param {Object} [options] - Additional options
 * 
 * @param {Number} [options.skip] - Number of documents to be skipped
 * @param {Number} [options.limit] - Max number of documents to display
 * @param {Object|Array|String} [options.fields] - Same as "fields" parameter (if both passed, "options.fields" will be ignored)
 * @param {Boolean} [options.forceFetch=false] - If set to'"true" returns the array of documents already fetched
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Array|Cursor} If "options.forceFetch" set to true returns the array of documents, otherwise returns a cursor
 */
Collection.prototype.find = function (selection, fields, options, callback) {
    var params = _ensureFindParams({
        selection: selection,
        fields: fields,
        options: options,
        callback: callback
    });

    selection = params.selection;
    fields = params.fields;
    options = params.options;
    callback = params.callback;

    var cursor = new Cursor(this.docs, selection, fields, options);

    /**
     * "find" event.
     *
     * @event MongoPortable~find
     * 
     * @property {Object} collection - Information about the collection
     * @property {Object} selector - The selection of the query
     * @property {Object} fields - The fields showed in the query
     */
    this.emit('find', {
        collection: this,
        selector: selection,
        fields: fields
    });

    // Pass the cursor fetched to the callback
    // Add [options.noFetchCallback = true]
    if (callback) callback(null, cursor.fetch());

    if (options.forceFetch) {
        return cursor.fetch();
    } else {
        return cursor;
    }
};

/**
 * Finds the first matching document
 * 
 * @method Collection#findOne
 * 
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object|Array|String} [fields={}] - The fields of the document to show
 * @param {Object} [options] - Additional options
 * 
 * @param {Number} [options.skip] - Number of documents to be skipped
 * @param {Number} [options.limit] - Max number of documents to display
 * @param {Object|Array|String} [options.fields] - Same as "fields" parameter (if both passed, "options.fields" will be ignored)
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Object} Returns the first matching document of the collection
 */
Collection.prototype.findOne = function (selection, fields, options, callback) {
    var params = _ensureFindParams({
        selection: selection,
        fields: fields,
        options: options,
        callback: callback
    });

    selection = params.selection;
    fields = params.fields;
    options = params.options;
    callback = params.callback;

    var cursor = new Cursor(this.docs, selection, fields, options);

    /**
     * "findOne" event.
     *
     * @event MongoPortable~findOne
     * 
     * @property {Object} collection - Information about the collection
     * @property {Object} selector - The selection of the query
     * @property {Object} fields - The fields showed in the query
     */
    this.emit('findOne', {
        collection: this,
        selector: selection,
        fields: fields
    });

    var res = null;

    if (cursor.hasNext()) {
        res = cursor.next();
    }

    // Pass the cursor fetched to the callback
    // Add [options.noFetchCallback = true]
    if (callback) callback(null, res);

    return res;
};

/**
 * Updates one or many documents
 * 
 * @method Collection#update
 * 
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object} [update={}] - The update operation
 * @param {Object} [options] - Additional options
 * 
 * @param {Number} [options.updateAsMongo=true] - By default: 
 *      If the [update] object contains update operator modifiers, such as those using the "$set" modifier, then:
 *          <ul>
 *              <li>The [update] object must contain only update operator expressions</li>
 *              <li>The Collection#update method updates only the corresponding fields in the document</li>
 *          <ul>
 *      If the [update] object contains only "field: value" expressions, then:
 *          <ul>
 *              <li>The Collection#update method replaces the matching document with the [update] object. The Collection#update method does not replace the "_id" value</li>
 *              <li>Collection#update cannot update multiple documents</li>
 *          <ul>
 * 
 * @param {Number} [options.override=false] - Replaces the whole document (only apllies when [updateAsMongo=false])
 * @param {Number} [options.upsert=false] - Creates a new document when no document matches the query criteria
 * @param {Number} [options.multi=false] - Updates multiple documents that meet the criteria
 * @param {Object} [options.writeConcern=null] - An object expressing the write concern
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Object} Object with the update/insert (if upsert=true) information
 */
Collection.prototype.update = function (selection, update, options, callback) {
    if (_.isNil(selection)) selection = {};

    if (_.isNil(update)) logger.throw("You must specify the update operation");

    if (_.isNil(options)) {
        options = {
            skip: 0,
            limit: 15 // for no limit pass [options.limit = -1]
        };
    }

    if (_.isFunction(selection)) logger.throw("You must specify the update operation");

    if (_.isFunction(update)) logger.throw("You must specify the update operation");

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    // Check special case where we are using an objectId
    if (selection instanceof ObjectId) {
        selection = {
            _id: selection
        };
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var res = null;

    var docs = null;
    if (options.multi) {
        docs = this.find(selection, null, { forceFetch: true });
    } else {
        docs = this.findOne(selection);
    }

    if (_.isNil(docs)) {
        docs = [];
    }

    if (!_.isArray(docs)) {
        docs = [docs];
    }

    if (docs.length === 0) {
        if (options.upsert) {
            var inserted = this.insert(update);

            res = {
                updated: {
                    documents: null,
                    count: 0
                },
                inserted: {
                    documents: [inserted],
                    count: 1
                }
            };
        } else {
            // No documents found
            res = {
                updated: {
                    documents: null,
                    count: 0
                },
                inserted: {
                    documents: null,
                    count: 0
                }
            };
        }
    } else {
        var updatedDocs = [];

        for (var i = 0; i < docs.length; i++) {
            var doc = docs[i];

            var override = null;

            var hasModifier = false;

            for (var key in update) {
                // IE7 doesn't support indexing into strings (eg, key[0] or key.indexOf('$') ), so use substr.
                // Testing over the first letter:
                //      Bests result with 1e8 loops => key[0](~3s) > substr(~5s) > regexp(~6s) > indexOf(~16s)

                var modifier = key.substr(0, 1) === '$';
                if (modifier) {
                    hasModifier = true;
                }

                if (options.updateAsMongo) {
                    if (hasModifier && !modifier) logger.throw("All update fields must be an update operator");

                    if (!hasModifier && options.multi) logger.throw("You can not update several documents when no update operators are included");

                    if (hasModifier) override = false;

                    if (!hasModifier) override = true;
                } else {
                    override = !!options.override;
                }
            }

            var _docUpdate = null;

            if (override) {
                // Overrides the document except for the "_id"
                _docUpdate = {
                    _id: doc._id
                };

                // Must ignore fields starting with '$', '.'...
                for (var _key in update) {
                    if (_key.substr(0, 1) === '$' || /\./g.test(_key)) {
                        logger.warn("The field " + _key + " can not begin with '$' or contain '.'");
                    } else {
                        _docUpdate[_key] = update[_key];
                    }
                }
            } else {
                _docUpdate = _.cloneDeep(doc);

                for (var _key2 in update) {
                    var val = update[_key2];

                    if (_key2.substr(0, 1) === '$') {
                        _docUpdate = _applyModifier(_docUpdate, _key2, val);
                    } else {
                        if (!_.isNil(_docUpdate[_key2])) {
                            if (_key2 !== '_id') {
                                _docUpdate[_key2] = val;
                            } else {
                                logger.warn("The field '_id' can not be updated");
                            }
                        } else {
                            logger.warn("The document does not contains the field " + _key2);
                        }
                    }
                }
            }

            updatedDocs.push(_docUpdate);

            var idx = this.doc_indexes[_docUpdate._id];
            this.docs[idx] = _docUpdate;
        }

        /**
         * "update" event.
         *
         * @event MongoPortable~update
         * 
         * @property {Object} collection - Information about the collection
         * @property {Object} selector - The selection of the query
         * @property {Object} modifier - The modifier used in the query
         * @property {Object} docs - The updated/inserted documents information
         */
        this.emit('update', {
            collection: this,
            selector: selection,
            modifier: update,
            docs: updatedDocs
        });

        res = {
            updated: {
                documents: updatedDocs,
                count: updatedDocs.length
            },
            inserted: {
                documents: null,
                count: 0
            }
        };
    }

    if (callback) callback(null, res);

    return res;
};

var _applyModifier = function _applyModifier(_docUpdate, key, val) {
    var doc = _.cloneDeep(_docUpdate);
    // var mod = _modifiers[key];

    if (!_modifiers[key]) {
        logger.throw("Invalid modifier specified: " + key);
    }

    for (var keypath in val) {
        var value = val[keypath];
        var keyparts = keypath.split('.');

        _modify(doc, keyparts, value, key);

        // var no_create = !!Collection._noCreateModifiers[key];
        // var forbid_array = (key === "$rename");
        // var target = Collection._findModTarget(_docUpdate, keyparts, no_create, forbid_array);
        // var field = keyparts.pop();

        // mod(target, field, value, keypath, _docUpdate);
    }

    return doc;
};

var _modify = function _modify(document, keyparts, value, key) {
    var level = arguments.length <= 4 || arguments[4] === undefined ? 0 : arguments[4];

    for (var i = level; i < keyparts.length; i++) {
        var path = keyparts[i];
        var isNumeric = /^[0-9]+$/.test(path);
        var target = document[path];

        var create = _.hasIn(Collection._noCreateModifiers, key) ? false : true;
        if (!create && (!_.isObject(document) || _.isNil(target))) {
            logger.throw("The element \"" + path + "\" must exists in \"" + JSON.stringify(document) + "\"");
        }

        if (_.isArray(document)) {
            // Do not allow $rename on arrays
            if (key === "$rename") return null;

            // Only let the use of "arrayfield.<numeric_index>.subfield"
            if (isNumeric) {
                path = _.toNumber(path);
            } else {
                logger.throw("The field \"" + path + "\" can not be appended to an array");
            }

            // Fill the array to the desired length
            while (document.length < path) {
                document.push(null);
            }
        }

        if (i < keyparts.length - 1) {
            if (_.isNil(target)) {
                // If we are accessing with "arrayField.<numeric_index>"
                if (_.isFinite(_.toNumber(keyparts[i + 1]))) {
                    //  || keyparts[i + 1] === '$'  // TODO "arrayField.$"
                    target = [];
                } else {
                    target = {};
                }
            }

            document[path] = _modify(target, keyparts, value, key, level + 1);

            return document;
        } else {
            _modifiers[key](document, path, value);

            return document;
        }
    }
};

/**
 * Removes one or many documents
 * 
 * @method Collection#remove
 * 
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object} [options] - Additional options
 * 
 * @param {Number} [options.justOne=false] - Deletes the first occurrence of the selection
 * @param {Object} [options.writeConcern=null] - An object expressing the write concern
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Object} Object with the deleted documents
 */
Collection.prototype.remove = function (selection, options, callback) {
    var _this2 = this;

    if (_.isNil(selection)) selection = {};

    if (_.isFunction(selection)) {
        callback = selection;
        selection = {};
    }

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (_.isNil(options)) options = { justOne: false };

    // If we are not passing a selection and we are not removing just one, is the same as a drop
    if (Object.size(selection) === 0 && !options.justOne) return this.drop(options, callback);

    // Check special case where we are using an objectId
    if (selection instanceof ObjectId) {
        selection = {
            _id: selection
        };
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var cursor = this.find(selection);

    var docs = [];
    cursor.forEach(function (doc) {
        var idx = _this2.doc_indexes[doc._id];

        delete _this2.doc_indexes[doc._id];
        _this2.docs.splice(idx, 1);

        docs.push(doc);
    });

    /**
     * "remove" event.
     *
     * @event MongoPortable~remove
     * 
     * @property {Object} collection - Information about the collection
     * @property {Object} selector - The selection of the query
     * @property {Object} docs - The deleted documents information
     */
    this.emit('remove', {
        collection: this,
        selector: selection,
        docs: docs
    });

    if (callback) callback(null, docs);

    return docs;
};

/**
 * Alias for {@link Collection#remove}
 * 
 * @method Collection#delete
 */
Collection.prototype.delete = function (selection, options, callback) {
    return this.remove(selection, options, callback);
};

/**
* Alias for {@link Collection#remove}
* 
* @method Collection#destroy
*/
Collection.prototype.destroy = function (selection, options, callback) {
    return this.remove(selection, options, callback);
};

/**
 * Drops a collection
 * 
 * @method Collection#drop
 * 
 * @param {Object} [options] - Additional options
 * 
 * @param {Number} [options.dropIndexes=false] - True if we want to drop the indexes too
 * @param {Object} [options.writeConcern=null] - An object expressing the write concern
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Object} True when the collection is dropped
 */
Collection.prototype.drop = function (options, callback) {
    if (_.isNil(options)) options = {};

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    this.doc_indexes = {};
    this.docs = [];

    if (options.dropIndexes) {} // TODO

    this.emit('dropCollection', {
        collection: this,
        indexes: !!options.dropIndexes
    });

    if (callback) callback(null, true);

    return true;
};

/**
 * Insert or update a document. If the document has an "_id" is an update (with upsert), if not is an insert.
 * 
 * @method Collection#save
 * 
 * @param {Object} doc - Document to be inserted/updated
 * 
 * @param {Number} [options.dropIndexes=false] - True if we want to drop the indexes too
 * @param {Object} [options.writeConcern=null] - An object expressing the write concern
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Object} True when the collection is dropped
 */
Collection.prototype.save = function (doc, options, callback) {
    if (_.isNil(doc) || _.isFunction(doc)) logger.throw("You must pass a document");

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (_.hasIn(doc, '_id')) {
        options.upsert = true;

        return this.update({ _id: doc._id }, doc, options, callback);
    } else {
        return this.insert(doc, options, callback);
    }
};

/**
* @ignore
*/
Collection.prototype.ensureIndex = function () {
    //TODO Implement EnsureIndex
    logger.throw('Collection#ensureIndex unimplemented by driver');
};

// TODO document (at some point)
// TODO test
// TODO obviously this particular implementation will not be very efficient
/**
* @ignore
*/
Collection.prototype.backup = function (backupID, callback) {
    if (_.isFunction(backupID)) {
        callback = backupID;
        backupID = new ObjectId().toString();
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    this.snapshots[backupID] = _.cloneDeep(this.docs);
    this.emit('snapshot', {
        collection: this,
        backupID: backupID,
        documents: this.snapshots[backupID]
    });

    var result = {
        backupID: backupID,
        documents: this.snapshots[backupID]
    };

    if (callback) callback(null, result);

    return result;
};

// Lists available Backups
/**
* @ignore
*/
Collection.prototype.backups = function (callback) {
    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var backups = [];

    for (var id in this.snapshots) {
        backups.push({ id: id, documents: this.snapshots[id] });
    }

    if (callback) callback(null, backups);

    return backups;
};

// Lists available Backups
/**
* @ignore
*/
Collection.prototype.removeBackup = function (backupID, callback) {
    if (_.isFunction(backupID)) {
        callback = backupID;
        backupID = null;
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var result = false;

    if (backupID) {
        delete this.snapshots[_.toString(backupID)];

        result = backupID;
    } else {
        this.snapshots = {};

        result = true;
    }

    if (callback) callback(null, result);

    return result;
};

// Restore the snapshot. If no snapshot exists, raise an exception;
/**
* @ignore
*/
Collection.prototype.restore = function (backupID, callback) {
    if (_.isFunction(backupID)) {
        callback = backupID;
        backupID = null;
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var snapshotCount = Object.size(this.snapshots);
    var backupData = null;

    if (snapshotCount === 0) {
        logger.throw("There is no snapshots");
    } else {
        if (!backupID) {
            if (snapshotCount === 1) {
                logger.info("No backupID passed. Restoring the only snapshot");

                // Retrieve the only snapshot
                for (var key in this.snapshots) {
                    backupID = key;
                }
            } else {
                logger.throw("The are several snapshots. Please specify one backupID");
            }
        }
    }

    backupData = this.snapshots[backupID];

    if (!backupData) {
        logger.throw("Unknown Backup ID: " + backupID);
    }

    this.docs = backupData;
    this.emit('restore', {
        collection: this,
        backupID: backupID
    });

    if (callback) callback(null);

    return this;
};

/**
 * Calculates aggregate values for the data in a collection
 * 
 * @method Collection#aggregate
 * 
 * @param {Array} pipeline - A sequence of data aggregation operations or stages
 * @param {Object} [options] - Additional options
 * 
 * @param {Boolean} [options.forceFetch=false] - If set to'"true" returns the array of documents already fetched
 * 
 * @returns {Array|Cursor} If "options.forceFetch" set to true returns the array of documents, otherwise returns a cursor
 */
Collection.prototype.aggregate = function (pipeline) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? { forceFetch: false } : arguments[1];

    if (_.isNil(pipeline) || !_.isArray(pipeline)) logger.throw('The "pipeline" param must be an array');

    var aggregation = new Aggregation(pipeline);

    for (var i = 0; i < pipeline.length; i++) {
        var stage = pipeline[i];

        for (var key in stage) {
            if (key.substr(0, 1) !== '$') logger.throw("The pipeline stages must begin with '$'");

            if (!aggregation.validStage(key)) logger.throw("Invalid stage \"" + key + "\"");

            break;
        }
    }

    var result = aggregation.aggregate(this);

    return result; // change to cursor
};

/**
* @ignore
*/
Collection._noCreateModifiers = {
    $unset: true,
    $pop: true,
    $rename: true,
    $pull: true,
    $pullAll: true
};

/**
* @ignore
*/
var _modifiers = {
    $inc: function $inc(target, field, arg) {
        if (!_.isNumber(arg)) {
            logger.throw("Modifier $inc allowed for numbers only");
        }

        if (field in target) {
            if (!_.isNumber(target[field])) {
                logger.throw("Cannot apply $inc modifier to non-number");
            }

            target[field] += arg;
        } else {
            target[field] = arg;
        }
    },

    $set: function $set(target, field, arg) {
        target[field] = _.cloneDeep(arg);
    },

    $unset: function $unset(target, field, arg) {
        if (!_.isNil(target)) {
            if (_.isArray(target)) {
                if (field in target) {
                    target[field] = null;
                }
            } else {
                delete target[field];
            }
        }
    },

    $push: function $push(target, field, arg) {
        var x = target[field];

        if (_.isNil(x)) {
            target[field] = [arg];
        } else if (!_.isArray(x)) {
            logger.throw("Cannot apply $push modifier to non-array");
        } else {
            x.push(_.cloneDeep(arg));
        }
    },

    $pushAll: function $pushAll(target, field, arg) {
        var x = target[field];

        if (_.isNil(x)) {
            target[field] = arg;
        } else if (!_.isArray(x)) {
            logger.throw("Modifier $pushAll/pullAll allowed for arrays only");
        } else {
            for (var i = 0; i < arg.length; i++) {
                x.push(arg[i]);
            }
        }
    },

    $addToSet: function $addToSet(target, field, arg) {
        var x = target[field];

        if (_.isNil(x)) {
            target[field] = [arg];
        } else if (!_.isArray(x)) {
            logger.throw("Cannot apply $addToSet modifier to non-array");
        } else {
            var isEach = false;
            if (_.isPlainObject(arg)) {
                for (var k in arg) {
                    if (k === "$each") {
                        isEach = true;
                    }

                    break;
                }
            }

            var values = isEach ? arg["$each"] : [arg];
            _.forEach(values, function (value) {
                for (var i = 0; i < x.length; i++) {
                    if (SelectorMatcher.equal(value, x[i])) return;
                }

                x.push(value);
            });
        }
    },

    $pop: function $pop(target, field, arg) {
        if (_.isNil(target) || _.isNil(target[field])) return;

        var x = target[field];

        if (!_.isArray(x)) {
            logger.throw("Cannot apply $pop modifier to non-array");
        } else {
            if (_.isNumber(arg) && arg < 0) {
                x.splice(0, 1);
            } else {
                x.pop();
            }
        }
    },

    $pull: function $pull(target, field, arg) {
        if (_.isNil(target) || _.isNil(target[field])) return;

        var x = target[field];

        if (!_.isArray(x)) {
            logger.throw("Cannot apply $pull/pullAll modifier to non-array");
        } else {
            var out = [];

            if ((typeof arg === "undefined" ? "undefined" : _typeof(arg)) === "object" && !(arg instanceof Array)) {
                // XXX would be much nicer to compile this once, rather than
                // for each document we modify.. but usually we're not
                // modifying that many documents, so we'll let it slide for
                // now

                // XXX _compileSelector isn't up for the job, because we need
                // to permit stuff like {$pull: {a: {$gt: 4}}}.. something
                // like {$gt: 4} is not normally a complete selector.
                var match = new Selector({
                    "__matching__": arg
                });
                for (var i = 0; i < x.length; i++) {
                    var _doc_ = {
                        __matching__: x[i]
                    };
                    if (!match.test(_doc_)) {
                        out.push(x[i]);
                    }
                }
            } else {
                for (var i = 0; i < x.length; i++) {
                    if (!SelectorMatcher.equal(x[i], arg)) {
                        out.push(x[i]);
                    }
                }
            }

            target[field] = out;
        }
    },

    $pullAll: function $pullAll(target, field, arg) {
        if (_.isNil(target) || _.isNil(target[field])) return;

        var x = target[field];

        if (!_.isNil(x) && !_.isArray(x)) {
            logger.throw("Modifier $pushAll/pullAll allowed for arrays only");
        } else if (!_.isNil(x)) {
            var out = [];

            for (var i = 0; i < x.length; i++) {
                var exclude = false;

                for (var j = 0; j < arg.length; j++) {
                    if (SelectorMatcher.equal(x[i], arg[j])) {
                        exclude = true;

                        break;
                    }
                }

                if (!exclude) {
                    out.push(x[i]);
                }
            }

            target[field] = out;
        }
    },

    $rename: function $rename(target, field, value) {
        if (field === value) {
            // no idea why mongo has this restriction..
            logger.throw("The new field name must be different");
        }

        if (!_.isString(value) || value.trim() === '') {
            logger.throw("The new name must be a non-empty string");
        }

        target[value] = target[field];
        delete target[field];
    },

    $bit: function $bit(target, field, arg) {
        // XXX mongo only supports $bit on integers, and we only support
        // native javascript numbers (doubles) so far, so we can't support $bit
        logger.throw("$bit is not supported");
    }
};

/**
* @ignore
*/
Collection.checkCollectionName = function (collectionName) {
    if (!_.isString(collectionName)) {
        logger.throw("collection name must be a String");
    }

    if (!collectionName || collectionName.indexOf('..') !== -1) {
        logger.throw("collection names cannot be empty");
    }

    if (collectionName.indexOf('$') !== -1 && collectionName.match(/((^\$cmd)|(oplog\.\$main))/) === null) {
        logger.throw("collection names must not contain '$'");
    }

    if (collectionName.match(/^system\./) !== null) {
        logger.throw("collection names must not start with 'system.' (reserved for internal use)");
    }

    if (collectionName.match(/^\.|\.$/) !== null) {
        logger.throw("collection names must not start or end with '.'");
    }
};

/**
* @ignore
*/
Collection.prototype.rename = function (newName) {
    if (_.isString(newName)) {
        if (this.name !== newName) {
            Collection.checkCollectionName(newName);

            var dbName = this.name.split('.').length > 1 ? this.name.split('.')[0] : '';

            this.name = newName;
            this.fullName = dbName + '.' + this.name;

            return this;
        }
    } else {
        // Error
    }
};

module.exports = Collection;

/**
 * Gets the size of an object.
 * 
 * @method Object#size
 * 
 * @param {Object} obj - The object
 * 
 * @returns {Number} The size of the object
 */
Object.size = function (obj) {
    var size = 0,
        key;

    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }

    return size;
};

var _ensureFindParams = function _ensureFindParams(params) {
    // selection, fields, options, callback
    if (_.isNil(params.selection)) params.selection = {};

    if (_.isNil(params.selection)) params.selection = {};

    if (_.isNil(params.fields)) params.fields = [];

    if (_.isNil(params.options)) {
        params.options = {
            skip: 0,
            limit: 15 // for no limit pass [options.limit = -1]
        };
    }

    // callback as first parameter
    if (_.isFunction(params.selection)) {
        params.callback = params.selection;
        params.selection = {};
    }

    // callback as second parameter
    if (_.isFunction(params.fields)) {
        params.callback = params.fields;
        params.fields = [];
    }

    // callback as third parameter
    if (_.isFunction(params.options)) {
        params.callback = params.options;
        params.options = {};
    }

    // Check special case where we are using an objectId
    if (params.selection instanceof ObjectId) {
        params.selection = {
            _id: params.selection
        };
    }

    if (!_.isNil(params.callback) && !_.isFunction(params.callback)) {
        logger.throw("callback must be a function");
    }

    if (params.options.fields) {
        if (_.isNil(params.fields) || params.fields.length === 0) {
            params.fields = params.options.fields;
        } else {
            logger.warn("Fields already present. Ignoring 'options.fields'.");
        }
    }

    return params;
};

},{"./Cursor":4,"./ObjectId":5,"./Selector":6,"./SelectorMatcher":7,"./utils/EventEmitter":9}],4:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global _, Logger */

/**
 * @file Cursor.js - based on Monglo#Cursor ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var /*Logger = require("jsw-logger"),
    _ = require("lodash"),*/
Selector = require('./Selector');

var logger = null;

/**
 * Cursor
 * 
 * @module Cursor
 * @constructor
 * @since 0.0.1
 * 
 * @classdesc Cursor class that maps a MongoDB-like cursor
 * 
 * @param {MongoPortable} db - Additional options
 * @param {Array} documents - The list of documents
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object|Array|String} [fields={}] - The fields of the document to show
 * @param {Object} [options] - Database object
 * 
 * @param {Object} [options.pkFactory=null] - Object overriding the basic "ObjectId" primary key generation.
 * 
 */

var Cursor = function Cursor(documents, selection, fields) {
    var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    _classCallCheck(this, Cursor);

    this.documents = documents;
    this.selector = selection;
    this.skipValue = options.skip || 0;
    this.limitValue = options.limit || 15;
    this.sortValue = options.sort || null;
    this.sorted = false;

    logger = Logger.instance;

    /** ADD IDX **/
    if (Selector.isSelectorCompiled(this.selector)) {
        this.selector_compiled = this.selector;
    } else {
        this.selector_compiled = new Selector(this.selector, Selector.MATCH_SELECTOR);
    }

    for (var i = 0; i < this.selector_compiled.clauses.length; i++) {
        if (this.selector_compiled.clauses[i].key === '_id') {
            this.selector_id = this.selector_compiled.clauses[i].value;
        }
    }

    for (var _i = 0; _i < this.selector_compiled.clauses.length; _i++) {
        if (this.selector_compiled.clauses[_i].key === '_id') {
            var _val = this.selector_compiled.clauses[_i].value;

            if (_.isString(_val) || _.isNumber(_val)) {
                this.selector_id = _val;
            }
        }
    }

    /** ADD IDX **/

    this.fetch_mode = Cursor.COLSCAN || Cursor.IDXSCAN;
    this.indexex = null; //findUsableIndexes();

    // if (cursor.fetch_mode === Cursor.COLSCAN) {
    //     // COLSCAN, wi will iterate over all documents
    //     docs = _.cloneDeep(cursor.collection.docs);
    // } else if (cursor.fetch_mode === Cursor.IDXSCAN) {
    //     // IDXSCAN, wi will iterate over all needed documents
    //     for (let i = 0; i < cursor.indexes.length; i++) {
    //         let index = cursor.indexes[i];

    //         for (let i = index.start; i < index.end; i++) {
    //             let idx_id = cursor.collection.getIndex(index.name)[i];

    //             docs.push(cursor.collection.docs[idx_id]);
    //         }
    //     }
    // }

    this.fields = new Selector(fields, Selector.FIELD_SELECTOR);

    this.sort_compiled = new Selector(this.sortValue, Selector.SORT_SELECTOR);

    this.db_objects = null;
    this.cursor_pos = 0;
};

Cursor.COLSCAN = 'colscan';
Cursor.IDXSCAN = 'idxscan';

/**
 * Moves a cursor to the begining
 * 
 * @method Cursor#rewind
 */
Cursor.prototype.rewind = function () {
    this.db_objects = null;
    this.cursor_pos = 0;
};

/**
 * Iterates over the cursor, calling a callback function
 * 
 * @method Cursor#forEach
 * 
 * @param {Function} [callback=null] - Callback function to be called for each document
 */
Cursor.prototype.forEach = function (callback) {
    var docs = this.fetchAll();

    for (var i = 0; i < docs.length; i++) {
        callback(docs[i]);
    }
};

/**
 * Iterates over the cursor, returning a new array with the documents affected by the callback function
 * 
 * @method Cursor#map
 * 
 * @param {Function} [callback=null] - Callback function to be called for each document
 * 
 * @returns {Array} The documents after being affected with the callback function
 */
Cursor.prototype.map = function (callback) {
    var res = [];

    this.forEach(function (doc) {
        res.push(callback(doc));
    });

    return res;
};

/**
 * Checks if the cursor has one document to be fetched
 * 
 * @method Cursor#hasNext
 * 
 * @returns {Boolean} True if we can fetch one more document
 */
Cursor.prototype.hasNext = function () {
    return this.cursor_pos < this.documents.length;
};

/**
 * Alias for {@link Cursor#fetchOne}
 * 
 * @method Cursor#next
 */
Cursor.prototype.next = function () {
    return this.fetchOne();
};

/**
 * Alias for {@link Cursor#fetchAll}
 * 
 * @method Cursor#fetch
 */
Cursor.prototype.fetch = function () {
    return this.fetchAll();
};

/**
 * Fetch all documents in the cursor
 * 
 * @method Cursor#fetchAll
 * 
 * @returns {Array} All the documents contained in the cursor
 */
Cursor.prototype.fetchAll = function () {
    return _getDocuments(this, false) || [];
};

/**
 * Retrieves the next document in the cursor
 * 
 * @method Cursor#fetchOne
 * 
 * @returns {Object} The next document in the cursor
 */
Cursor.prototype.fetchOne = function () {
    return _getDocuments(this, true);
};

Cursor.sort = function (doc, fields) {};

/**
 * Projects the fields of one or several documents, changing the output
 * 
 * @method Cursor.project
 * 
 * @param {Array|Object} doc - The document/s that will be projected
 * @param {String|Array|Object} spec - Fields projection specification. Can be an space/comma separated list, an array, or an object
 * 
 * @returns {Array|Object} The document/s after the projection
 */
Cursor.project = function (doc, spec) {
    var aggregation = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

    if (_.isNil(doc)) logger.throw('doc param required');
    if (_.isNil(spec)) logger.throw('spec param required');

    var fields = null;
    if (aggregation) {
        fields = new Selector(spec, Selector.AGG_FIELD_SELECTOR);
    } else {
        fields = new Selector(spec, Selector.FIELD_SELECTOR);
    }

    if (_.isArray(doc)) {
        for (var i = 0; i < doc.length; i++) {
            doc[i] = _mapFields(doc[i], fields);
        }

        return doc;
    } else {
        return _mapFields(doc, fields);
    }
};

var _mapFields = function _mapFields(doc, fields) {
    var _doc = _.cloneDeep(doc);

    if (!_.isNil(fields) && _.isPlainObject(fields) && !_.isEqual(fields, {})) {
        var showId = true,
            showing = null;

        // Whether if we showing the _id field
        if (_.hasIn(fields, '_id') && fields._id === -1) {
            showId = false;
        }

        for (var field in fields) {
            // Whether if we are showing or hidding fields
            if (field !== '_id') {
                if (fields[field] === 1) {
                    showing = true;
                    break;
                } else if (fields[field] === -1) {
                    showing = false;
                    break;
                }
            }
        }

        var tmp = null;

        for (var field in fields) {
            if (tmp === null) {
                if (showing) {
                    tmp = {};
                } else {
                    tmp = _.cloneDeep(doc);
                }
            }

            // Add or remove the field
            if (fields[field] === 1 || fields[field] === -1) {
                // Show the field
                if (showing) {
                    tmp[field] = doc[field];
                } else {
                    // Hide the field
                    delete tmp[field];
                }
            } else {
                // Show the new field (rename)
                tmp[field] = doc[fields[field]];
            }
        }

        // Add or remove the _id field
        if (showId) {
            tmp._id = doc._id;
        } else {
            delete tmp._id;
        }

        _doc = tmp;
    }

    return _doc;
};

/**
 * Retrieves one or all the documents in the cursor
 * 
 * @method _getDocuments
 * @private
 * 
 * @param {Cursor} cursor - The cursor with the documents
 * @param {Boolean} [justOne=false] - Whether it retrieves one or all the documents
 * 
 * @returns {Array|Object} If [justOne=true] returns the next document, otherwise returns all the documents
 */
var _getDocuments = function _getDocuments(cursor) {
    var justOne = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    var docs = [];

    if (cursor.fetch_mode === Cursor.COLSCAN) {
        // COLSCAN, wi will iterate over all documents
        docs = _.cloneDeep(cursor.documents);
    } else if (cursor.fetch_mode === Cursor.IDXSCAN) {
        // IDXSCAN, wi will iterate over all needed documents
        for (var i = 0; i < cursor.indexes.length; i++) {
            var index = cursor.indexes[i];

            for (var _i2 = index.start; _i2 < index.end; _i2++) {
                // let idx_id = cursor.collection.getIndex(index.name)[i];
                var idx_id = index.index[_i2];

                docs.push(cursor.documents[idx_id]);
            }
        }
    }

    // if (cursor.selector_id) {
    //     if (_.hasIn(cursor.collection.doc_indexes, _.toString(cursor.selector_id))) {
    //         let idx = cursor.collection.doc_indexes[_.toString(cursor.selector_id)];

    //         return Cursor.project(cursor.collection.docs[idx], cursor.fields);
    //     } else {
    //         if (justOne) {
    //             return null;
    //         } else {
    //             return [];
    //         }
    //     }
    // }

    // TODO add warning when sort/skip/limit and fetching one
    // TODO add warning when skip/limit without order
    // TODO index
    while (cursor.cursor_pos < docs.length) {
        var _doc = docs[cursor.cursor_pos];
        cursor.cursor_pos++;

        if (cursor.selector_compiled.test(_doc)) {
            if (_.isNil(cursor.db_objects)) cursor.db_objects = [];

            _doc = Cursor.project(_doc, cursor.fields);

            cursor.db_objects.push(_doc);

            if (justOne) {
                // Add force sort
                return _doc;
            }
        }
    }

    if (_.isNil(cursor.db_objects)) return null;

    if (!cursor.sorted && hasSorting(cursor)) cursor.sort();

    var idxFrom = cursor.skipValue;
    var idxTo = cursor.limitValue !== -1 ? cursor.limitValue + idxFrom : cursor.db_objects.length;

    return cursor.db_objects.slice(idxFrom, idxTo);
};

/**
 * Obtains the total of documents of the cursor
 * 
 * @method Cursor#count
 * 
 * @returns {Number} The total of documents in the cursor
 */
Cursor.prototype.count = function () {
    return this.fetchAll().length;
};

/**
 * Set the sorting of the cursor
 * 
 * @method Cursor#sort
 * 
 * @param {Object|Array|String} spec - The sorting specification
 * 
 * @returns {Cursor} This instance so it can be chained with other methods
 */
Cursor.prototype.setSorting = function (spec) {
    if (_.isNil(spec)) logger.throw("You need to specify a sorting");

    if (spec) {
        this.sortValue = spec;
        this.sort_compiled = new Selector(spec, Selector.SORT_SELECTOR);
    }

    return this;
};

/**
 * Applies a sorting on the cursor
 * 
 * @method Cursor#sort
 * 
 * @param {Object|Array|String} spec - The sorting specification
 * 
 * @returns {Cursor} This instance so it can be chained with other methods
 */
Cursor.prototype.sort = function (spec) {
    var _sort = this.sort_compiled || null;

    if (spec) {
        _sort = new Selector(spec, Selector.SORT_SELECTOR);
    }

    if (_sort) {
        if (!_.isNil(this.db_objects) && _.isArray(this.db_objects)) {
            this.db_objects = this.db_objects.sort(_sort);
            this.sorted = true;
        } else {
            this.setSorting(spec);
        }
    }

    return this;
};

/**
 * Set the number of document to skip when fetching the cursor
 * 
 * @method Cursor#skip
 * 
 * @param {Number} skip - The number of documents to skip
 * 
 * @returns {Cursor} This instance so it can be chained with other methods
 */
Cursor.prototype.skip = function (skip) {
    if (_.isNil(skip) || _.isNaN(skip)) throw new Error("Must pass a number");

    this.skipValue = skip;

    return this;
};

/**
 * Set the max number of document to fetch
 * 
 * @method Cursor#limit
 * 
 * @param {Number} limit - The max number of documents
 * 
 * @returns {Cursor} This instance so it can be chained with other methods
 */
Cursor.prototype.limit = function (limit) {
    if (_.isNil(limit) || _.isNaN(limit)) throw new Error("Must pass a number");

    this.limitValue = limit;

    return this;
};

/**
 * Checks if a cursor has a sorting defined
 * 
 * @method hasSorting
 * @private
 * 
 * @param {Cursor} cursor - The cursor
 * 
 * @returns {Boolean} Whether the cursor has sorting or not
 */
var hasSorting = function hasSorting(cursor) {
    if (_.isNil(cursor.sortValue)) return false;

    return true;
};

/**
 * @todo Implement
 */
Cursor.prototype.batchSize = function () {
    // Controls the number of documents MongoDB will return to the client in a single network message.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.close = function () {
    // Close a cursor and free associated server resources.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.comment = function () {
    // Attaches a comment to the query to allow for traceability in the logs and the system.profile collection.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.explain = function () {
    // Reports on the query execution plan for a cursor.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.hint = function () {
    // Forces MongoDB to use a specific index for a query.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.itcount = function () {
    // Computes the total number of documents in the cursor client-side by fetching and iterating the result set.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.maxScan = function () {
    // Specifies the maximum number of items to scan; documents for collection scans, keys for index scans.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.maxTimeMS = function () {
    // Specifies a cumulative time limit in milliseconds for processing operations on a cursor.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.max = function () {
    // Specifies an exclusive upper index bound for a cursor. For use with cursor.hint()
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.min = function () {
    // Specifies an inclusive lower index bound for a cursor. For use with cursor.hint()
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.noCursorTimeout = function () {
    // Instructs the server to avoid closing a cursor automatically after a period of inactivity.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.objsLeftInBatch = function () {
    // Returns the number of documents left in the current cursor batch.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.pretty = function () {
    // Configures the cursor to display results in an easy-to-read format.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.readConcern = function () {
    // Specifies a read concern for a find() operation.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.readPref = function () {
    // Specifies a read preference to a cursor to control how the client directs queries to a replica set.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.returnKey = function () {
    // Modifies the cursor to return index keys rather than the documents.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.showRecordId = function () {
    // Adds an internal storage engine ID field to each document returned by the cursor.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.size = function () {
    // Returns a count of the documents in the cursor after applying skip() and limit() methods.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.snapshot = function () {
    // Forces the cursor to use the index on the _id field. Ensures that the cursor returns each document, 
    // with regards to the value of the _id field, only once.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.tailable = function () {
    // Marks the cursor as tailable. Only valid for cursors over capped collections.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.toArray = function () {
    // Returns an array that contains all documents returned by the cursor.
    throw new Error("Not yet implemented");
};

module.exports = Cursor;

},{"./Selector":6}],5:[function(require,module,exports){
(function (process){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global _, Logger */

/**
 * @file ObjectId.js - based on Monglo#ObjectId ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

var /*_ = require("lodash"),
    Logger = require("jsw-logger"),*/
BinaryParser = require("./BinaryParser");

var logger = null;

/**
 * Machine id.
 *
 * Create a random 3-byte value (i.e. unique for this
 * process). Other drivers use a md5 of the machine id here, but
 * that would mean an asyc call to gethostname, so we don't bother.
 * 
 * @ignore
 */
var MACHINE_ID = parseInt(Math.random() * 0xFFFFFF, 10);

// Regular expression that checks for hex value
var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
var isValidHexRegExp = function isValidHexRegExp(str) {
    var len = arguments.length <= 1 || arguments[1] === undefined ? 24 : arguments[1];

    if (str.length === len && checkForHexRegExp.test(str)) return true;

    return false;
};

/**
 * ObjectId
 * 
 * @module ObjectId
 * @constructor
 * @since 0.0.1
 * 
 * @classdesc Represents the BSON ObjectId type
 * 
 * @param {String|Number} id - Can be a 24 byte hex string, a 12 byte binary string or a Number.
 */

var ObjectId = function () {
    function ObjectId(id, _hex) {
        _classCallCheck(this, ObjectId);

        // if (!(this instanceof ObjectId)) return new ObjectId(id, _hex);

        logger = Logger.instance;

        this._bsontype = 'ObjectId';

        // var __id = null;

        if (_.isNil(id)) {
            this.id = this.generate(id);
        } else {
            if (_.isNumber(id)) {
                this.id = this.generate(id);
            } else {
                // String or Hex
                if (_.isString(id) && (id.length === 12 || id.length === 24)) {
                    if (isValidHexRegExp(id)) {
                        // Valid Hex
                        var _id = ObjectId.createFromHexString(id);
                        this.id = _id.id;
                    } else if (id.length === 12) {
                        // Valid Byte String
                        this.id = id;
                    } else {
                        logger.throw("Value passed in is not a valid 24 character hex string");
                    }
                } else {
                    logger.throw("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
                }
            }
        }

        // Throw an error if it's not a valid setup
        // if (id != null && 'number' != typeof id && (id.length != 12 && id.length != 24)) {
        //     throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
        // }

        // Generate id based on the input
        // if (id == null || typeof id == 'number') {
        //     // convert to 12 byte binary string
        //     this.id = this.generate(id);
        // } else if (id != null && id.length === 12) {
        //     // assume 12 byte string
        //     this.id = id;
        // } else if (checkForHexRegExp.test(id)) {
        //     return ObjectId.createFromHexString(id);
        // } else if (!checkForHexRegExp.test(id)) {
        //     throw new Error("Value passed in is not a valid 24 character hex string");
        // }

        if (ObjectId.cacheHexString) {
            this.__id = this.toHexString();
        }
    }

    /* INSTANCE METHODS */

    /**
     * Return the ObjectId id as a 24 byte hex string representation
     * 
     * @method ObjectId#toHexString
     *
     * @returns {String} The 24 byte hex string representation.
     */


    _createClass(ObjectId, [{
        key: "toHexString",
        value: function toHexString() {
            if (ObjectId.cacheHexString && this.__id) return this.__id;

            var hexString = '',
                number,
                value;

            for (var index = 0, len = this.id.length; index < len; index++) {
                value = BinaryParser.toByte(this.id[index]);
                number = value <= 15 ? '0' + value.toString(16) : value.toString(16);

                hexString = hexString + number;
            }

            if (ObjectId.cacheHexString) {
                this.__id = hexString;
            }

            return hexString;
        }

        /**
         * Alias for {@link ObjectId#toHexString}
         * 
         * @method Cursor#next
         */

    }, {
        key: "toString",
        value: function toString() {
            return this.toHexString();
        }

        /**
         * Alias for {@link ObjectId#toHexString}
         * 
         * @method Cursor#next
         */

    }, {
        key: "toJSON",
        value: function toJSON() {
            return this.toHexString();
        }

        /**
         * Update the ObjectId index used in generating new ObjectId's on the driver
         * 
         * @method ObjectId#get_inc
         * @private
         *
         * @returns {Number} Next index value.
         */

    }, {
        key: "getInc",
        value: function getInc() {
            return ObjectId.index = (ObjectId.index + 1) % 0xFFFFFF;
        }

        /**
         * Generate a 12 byte id string used in ObjectId's
         *
         * @method ObjectId#generate
         * @private
         * 
         * @param {Number} [time] - Second based timestamp to the generation.
         * 
         * @return {String} The 12 byte id binary string.
         */

    }, {
        key: "generate",
        value: function generate(time) {
            if (_.isNil(time) || !_.isNumber(time)) {
                time = parseInt(Date.now() / 1000, 10);
            }

            /* for time-based ObjectId the bytes following the time will be zeroed */
            var time4Bytes = BinaryParser.encodeInt(time, 32, true, true);
            var machine3Bytes = BinaryParser.encodeInt(MACHINE_ID, 24, false);
            var pid2Bytes = BinaryParser.fromShort(_.isNil(process) ? Math.floor(Math.random() * 100000) : process.pid);
            var index3Bytes = BinaryParser.encodeInt(this.getInc(), 24, false, true);

            return time4Bytes + machine3Bytes + pid2Bytes + index3Bytes;
        }

        /**
         * Compares the equality of this ObjectId with [otherID].
         *
         * @method ObjectId#equals
         * 
         * @param {Object} otherID - ObjectId instance to compare against.
         * 
         * @returns {Boolean} The result of comparing two ObjectId's
         */

    }, {
        key: "equals",
        value: function equals(otherID) {
            var id = otherID instanceof ObjectId || otherID.toHexString ? otherID.id : ObjectId.createFromHexString(otherID).id;

            return this.id === id;
        }

        /**
         * Returns the generation time in seconds that this ID was generated.
         *
         * @method ObjectId#getTimestamp
         * 
         * @returns {Number} Number of seconds in the timestamp part of the 12 byte id.
         */

    }, {
        key: "getTimestamp",
        value: function getTimestamp() {
            var timestamp = new Date();

            timestamp.setTime(Math.floor(BinaryParser.decodeInt(this.id.substring(0, 4), 32, true, true)) * 1000);

            return timestamp;
        }

        /* GETTER - SETTER */

    }, {
        key: "generationTime",
        get: function get() {
            return Math.floor(BinaryParser.decodeInt(this.id.substring(0, 4), 32, true, true));
        },
        set: function set(value) {
            value = BinaryParser.encodeInt(value, 32, true, true);

            this.id = value + this.id.substr(4);
            // delete this.__id;
            this.toHexString();
        }

        /* STATIC METHODS */

        /**
         * Creates an ObjectId from a hex string representation of an ObjectId.
         *
         * @method ObjectId#createFromHexString
         * 
         * @param {String} hexString - An ObjectId 24 byte hexstring representation.
         * 
         * @returns {ObjectId} The created ObjectId
         */

    }], [{
        key: "createFromHexString",
        value: function createFromHexString(hexString) {
            // Throw an error if it's not a valid setup
            if (_.isNil(hexString) || hexString.length != 24) {
                throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
            }

            var len = hexString.length;

            var result = '',
                string,
                number;

            for (var index = 0; index < len; index += 2) {
                string = hexString.substr(index, 2);
                number = parseInt(string, 16);

                result += BinaryParser.fromByte(number);
            }

            return new ObjectId(result, hexString);
        }

        /**
         * Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out. 
         * Used for comparisons or sorting the ObjectId.
         *
         * @method ObjectId#createFromTime
         * 
         * @param {Number} time - A number of seconds.
         * 
         * @returns {ObjectId} The created ObjectId
         */

    }, {
        key: "createFromTime",
        value: function createFromTime(time) {
            var id = BinaryParser.encodeInt(time, 32, true, true) + BinaryParser.encodeInt(0, 64, true, true);

            return new ObjectId(id);
        }

        /**
         * Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out. Used for comparisons or sorting the ObjectId.
         *
         * @method ObjectId#createPk
         * 
         * @param {Number} time an integer number representing a number of seconds.
         * @return {ObjectId} return the created ObjectId
         */

    }, {
        key: "createPk",
        value: function createPk() {
            return new ObjectId();
        }
    }]);

    return ObjectId;
}();

/**
 * @ignore
 */


ObjectId.index = 0;

module.exports = ObjectId;

}).call(this,require('_process'))
},{"./BinaryParser":1,"_process":10}],6:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global _, Logger */

var /*Logger = require("jsw-logger"),
    _ = require("lodash"),*/
SelectorMatcher = require("./SelectorMatcher");

var logger = null;

var Selector = function () {
    function Selector(selector) {
        var type = arguments.length <= 1 || arguments[1] === undefined ? Selector.MATCH_SELECTOR : arguments[1];

        _classCallCheck(this, Selector);

        logger = Logger.instance;

        this.selector_compiled = null;

        if (type === Selector.MATCH_SELECTOR) {
            this.selector_compiled = this.compile(selector);
        } else if (type === Selector.SORT_SELECTOR) {
            return this.compileSort(selector);
        } else if (type === Selector.FIELD_SELECTOR) {
            return this.compileFields(selector, false);
        } else if (type === Selector.AGG_FIELD_SELECTOR) {
            return this.compileFields(selector, true);
        } else {
            logger.throw("You need to specify the selector type");
        }
    }

    _createClass(Selector, [{
        key: "test",
        value: function test(doc) {
            return this.selector_compiled.test(doc);
        }
    }, {
        key: "compile",
        value: function compile(selector) {
            if (_.isNil(selector)) {
                logger.debug('selector -> null');

                selector = {};
            } else {
                logger.debug('selector -> not null');

                if (!selector || _.hasIn(selector, '_id') && !selector._id) {
                    logger.debug('selector -> false value || { _id: false value }');

                    selector = {
                        _id: false
                    };
                }
            }

            if (_.isFunction(selector)) {
                logger.debug('selector -> function(doc) { ... }');

                //_initFunction.call(matcher, selector);
                this.clauses = [{
                    kind: 'function',
                    value: selector
                }];

                logger.debug('clauses created: ' + JSON.stringify(this.clauses));
            } else if (_.isString(selector) || _.isNumber(selector)) {
                logger.debug('selector -> "123456789" || 123456798');

                selector = {
                    _id: selector
                };

                //_initObject.call(matcher, selector);
                this.clauses = _buildSelector(selector);

                logger.debug('clauses created: ' + JSON.stringify(this.clauses));
            } else {
                logger.debug('selector -> { field: value }');

                //_initObject.call(matcher, selector);
                this.clauses = _buildSelector(selector);

                logger.debug('clauses created: ' + JSON.stringify(this.clauses));
            }

            var matcher = new SelectorMatcher(this);

            return matcher;
        }
    }, {
        key: "compileSort",
        value: function compileSort(spec) {
            if (_.isNil(spec)) {
                return function () {
                    return 0;
                };
            }

            var keys = [];
            var asc = [];

            if (_.isString(spec)) {
                spec = spec.replace(/( )+/ig, ' ').trim();

                if (spec.indexOf(',') !== -1) {
                    // Replace commas by spaces, and treat it as a spaced-separated string
                    return this.compileSort(spec.replace(/,/ig, ' '));
                } else if (spec.indexOf(' ') !== -1) {
                    var fields = spec.split(' ');

                    for (var i = 0; i < fields.length; i++) {
                        var field = fields[i].trim();

                        if (field === 'desc' || field === 'asc' || field === '-1' || field === '1' || field === 'false' || field === 'true') {

                            throw Error("Bad sort specification: ", JSON.stringify(spec));
                        } else {
                            var next = _.toString(fields[i + 1]);

                            if (next === 'desc' || next === 'asc') {
                                keys.push(field);
                                asc.push(next === 'asc' ? true : false);

                                i++;
                            } else if (next === '-1' || next === '1') {
                                keys.push(field);
                                asc.push(next === '1' ? true : false);

                                i++;
                            } else if (next === 'false' || next === 'true') {
                                keys.push(field);
                                asc.push(next === 'true' ? true : false);

                                i++;
                            } else {
                                keys.push(field);
                                asc.push(true); // Default sort
                            }
                        }
                    }
                } else {
                    //.sort("field1")

                    keys.push(spec);
                    asc.push(true);
                }
            } else if (_.isArray(spec)) {
                // Join the array with spaces, and treat it as a spaced-separated string
                return this.compileSort(spec.join(' '));
                // for (var i = 0; i < spec.length; i++) {
                //     if (_.isString(spec[i])) {
                //         keys.push(spec[i]);
                //         asc.push(true);
                //     } else {
                //         keys.push(spec[i][0]);
                //         asc.push(spec[i][1] !== "desc");
                //     }
                // }
            } else if (_.isPlainObject(spec)) {
                // TODO Nested path -> .sort({ "field1.field12": "asc" })
                var _spec = [];
                for (var key in spec) {
                    if (_.hasIn(spec, key)) {
                        _spec.push(key);
                        _spec.push(spec[key]);
                    }
                }

                return this.compileSort(_spec);
            } else {
                throw Error("Bad sort specification: ", JSON.stringify(spec));
            }

            // return {keys: keys, asc: asc};
            return function (a, b) {
                var x = 0;

                for (var i = 0; i < keys.length; i++) {
                    if (i !== 0 && x !== 0) return x; // Non reachable?


                    // x = Selector._f._cmp(a[JSON.stringify(keys[i])], b[JSON.stringify(keys[i])]);
                    x = SelectorMatcher.cmp(a[keys[i]], b[keys[i]]);

                    if (!asc[i]) {
                        x *= -1;
                    }
                }

                return x;
            };

            // eval() does not return a value in IE8, nor does the spec say it
            // should. Assign to a local to get the value, instead.

            // var _func;
            // var code = "_func = (function(c){return function(a,b){var x;";
            // for (var i = 0; i < keys.length; i++) {
            //     if (i !== 0) {
            //         code += "if(x!==0)return x;";
            //     }

            //     code += "x=" + (asc[i] ? "" : "-") + "c(a[" + JSON.stringify(keys[i]) + "],b[" + JSON.stringify(keys[i]) + "]);";
            // }

            // code += "return x;};})";

            // eval(code);

            // return _func(Selector._f._cmp);
        }
    }, {
        key: "compileFields",
        value: function compileFields(spec, aggregation) {
            var projection = {};

            if (_.isNil(spec)) return projection;

            if (_.isString(spec)) {
                // trim surrounding and inner spaces
                spec = spec.replace(/( )+/ig, ' ').trim();

                // Replace the commas by spaces
                if (spec.indexOf(',') !== -1) {
                    // Replace commas by spaces, and treat it as a spaced-separated string
                    return this.compileFields(spec.replace(/,/ig, ' '), aggregation);
                } else if (spec.indexOf(' ') !== -1) {
                    var fields = spec.split(' ');

                    for (var i = 0; i < fields.length; i++) {
                        // Get the field from the spec (we will be working with pairs)
                        var field = fields[i].trim();

                        // If the first is not a field, throw error
                        if (field === '-1' || field === '1' || field === 'false' || field === 'true') {

                            throw Error("Bad fields specification: ", JSON.stringify(spec));
                        } else {
                            // Get the next item of the pair
                            var next = _.toString(fields[i + 1]);

                            if (next === '-1' || next === '1') {
                                if (next === '-1') {
                                    for (var _key in projection) {
                                        if (field !== '_id' && projection[_key] === 1) {
                                            throw new Error("A projection cannot contain both include and exclude specifications");
                                        }
                                    }

                                    projection[field] = -1;
                                } else {
                                    projection[field] = 1;
                                }

                                i++;
                            } else if (next === 'false' || next === 'true') {
                                if (next === 'false') {
                                    if (field === '_id') {
                                        projection[field] = -1;
                                    } else {
                                        throw new Error("A projection cannot contain both include and exclude specifications");
                                    }
                                } else {
                                    projection[field] = 1;
                                }

                                i++;
                            } else if (aggregation && next.indexOf('$') === 0) {
                                projection[field] = next.replace('$', '');

                                i++;
                            } else {
                                projection[field] = 1;
                            }
                        }
                    }
                } else if (spec.length > 0) {
                    //.find({}, "field1")

                    projection[spec] = 1;
                }
            } else if (_.isArray(spec)) {
                // Join the array with spaces, and treat it as a spaced-separated string
                return this.compileFields(spec.join(' '), aggregation);
            } else if (_.isPlainObject(spec)) {
                // TODO Nested path -> .find({}, { "field1.field12": "asc" })
                var _spec = [];
                for (var key in spec) {
                    if (_.hasIn(spec, key)) {
                        _spec.push(key);
                        _spec.push(spec[key]);
                    }
                }

                return this.compileFields(_spec, aggregation);
            } else {
                throw Error("Bad fields specification: ", JSON.stringify(spec));
            }

            return projection;
        }

        /* STATIC METHODS */

    }], [{
        key: "isSelectorCompiled",
        value: function isSelectorCompiled(selector) {
            if (!_.isNil(selector) && (selector instanceof SelectorMatcher || selector instanceof Selector && selector.selector_compiled instanceof SelectorMatcher)) {
                return true;
            } else {
                return false;
            }
        }
    }, {
        key: "matches",
        value: function matches(selector, doc) {
            return new Selector(selector).test(doc);
        }
    }]);

    return Selector;
}();

var _buildSelector = function _buildSelector(selector) {
    logger.debug('Called: _buildSelector');

    var clauses = [];

    for (var key in selector) {
        var value = selector[key];

        if (key.charAt(0) === '$') {
            logger.debug('selector -> operator => { $and: [{...}, {...}] }');

            clauses.push(_buildDocumentSelector(key, value));
        } else {
            logger.debug('selector -> plain => { field1: <value> }');

            clauses.push(_buildKeypathSelector(key, value));
        }
    }

    return clauses;
};

var _buildDocumentSelector = function _buildDocumentSelector(key, value) {
    var clause = {};

    switch (key) {
        case '$or':
        case '$and':
        case '$nor':
            clause.key = key.replace(/\$/, '');
        // The rest will be handled by '_operator_'
        case '_operator_':
            // Generic handler for operators ($or, $and, $nor)

            clause.kind = 'operator';
            clause.type = 'array';

            clause.value = [];
            for (var i = 0; i < value.length; i++) {
                clause.value = _.union(clause.value, _buildSelector(value[i]));
            }

            break;
        default:
            throw Error("Unrecogized key in selector: ", key);
    }

    // TODO cases: $where, $elemMatch

    logger.debug('clause created: ' + JSON.stringify(clause));

    return clause;
};

var _buildKeypathSelector = function _buildKeypathSelector(keypath, value) {
    logger.debug('Called: _buildKeypathSelector');

    var clause = {};

    clause.value = value;

    if (_.isNil(value)) {
        logger.debug('clause of type null');

        clause.type = 'null';
    } else if (_.isRegExp(value)) {
        logger.debug('clause of type RegExp');

        clause.type = 'regexp';

        var source = value.toString().split('/');

        clause.value = {
            $regex: source[1] // The first item splitted is an empty string
        };

        if (source[2] != "") {
            clause.value["$options"] = source[2];
        }
    } else if (_.isArray(value)) {
        logger.debug('clause of type Array');

        clause.type = 'array';
    } else if (_.isString(value)) {
        logger.debug('clause of type String');

        clause.type = 'string';
    } else if (_.isNumber(value)) {
        logger.debug('clause of type Number');

        clause.type = 'number';
    } else if (_.isBoolean(value)) {
        logger.debug('clause of type Boolean');

        clause.type = 'boolean';
    } else if (_.isFunction(value)) {
        logger.debug('clause of type Function');

        clause.type = 'function';
    } else if (_.isPlainObject(value)) {
        var literalObject = true;
        for (var key in value) {
            if (key.charAt(0) === '$') {
                literalObject = false;
                break;
            }
        }

        if (literalObject) {
            logger.debug('clause of type Object => { field: { field_1: <value>, field_2: <value> } }');

            clause.type = 'literal_object';
        } else {
            logger.debug('clause of type Operator => { field: { $gt: 2, $lt 5 } }');

            clause.type = 'operator_object';
        }
    } else if (value instanceof ObjectId) {
        logger.debug('clause of type ObjectId -> String');

        clause.type = 'string';
        clause.value = value.toString();
    } else {
        clause.type = '__invalid__';
    }

    var parts = keypath.split('.');
    if (parts.length > 1) {
        logger.debug('clause over Object field => { "field1.field1_2": <value> }');

        clause.kind = 'object';
        clause.key = parts;
    } else {
        logger.debug('clause over Plain field => { "field": <value> }');

        clause.kind = 'plain';
        clause.key = parts[0];
    }

    logger.debug('clause created: ' + JSON.stringify(clause));

    return clause;
};

Selector.MATCH_SELECTOR = 'match';
Selector.SORT_SELECTOR = 'sort';
Selector.FIELD_SELECTOR = 'field';
Selector.AGG_FIELD_SELECTOR = 'project';

module.exports = Selector;

},{"./SelectorMatcher":7}],7:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global _, Logger */

// var Logger = require("jsw-logger"),
//     _ = require("lodash");

var logger = null;

var SelectorMatcher = function () {
    function SelectorMatcher(selector) {
        _classCallCheck(this, SelectorMatcher);

        this.clauses = selector.clauses;

        logger = Logger.instance;
    }

    _createClass(SelectorMatcher, [{
        key: 'test',
        value: function test(document) {
            logger.debug('Called SelectorMatcher->test');

            var _match = false;

            if (_.isNil(document)) {
                logger.debug('document -> null');

                logger.throw("Parameter 'document' required");
            }

            logger.debug('document -> not null');

            for (var i = 0; i < this.clauses.length; i++) {
                var clause = this.clauses[i];

                if (clause.kind === 'function') {
                    logger.debug('clause -> function');

                    _match = clause.value.call(null, document);
                } else if (clause.kind === 'plain') {
                    logger.debug('clause -> plain on field "' + clause.key + '" and value = ' + JSON.stringify(clause.value));

                    _match = _testClause(clause, document[clause.key]);

                    logger.debug('clause result -> ' + _match);
                } else if (clause.kind === 'object') {
                    logger.debug('clause -> object on field "' + clause.key.join('.') + '" and value = ' + JSON.stringify(clause.value));

                    _match = _testObjectClause(clause, document, _.clone(clause.key).reverse());

                    logger.debug('clause result -> ' + _match);
                } else if (clause.kind === 'operator') {
                    logger.debug('clause -> operator \'' + clause.key + '\'');

                    _match = _testLogicalClause(clause, document, clause.key);

                    logger.debug('clause result -> ' + _match);
                }

                // If any test case fails, the document will not match
                if (_match === false || _match === 'false') {
                    logger.debug('the document do not matches');

                    return false;
                }
            }

            // Everything matches
            logger.debug('the document matches');

            return true;
        }
    }], [{
        key: 'all',
        value: function all(array, value) {
            // $all is only meaningful on arrays
            if (!(array instanceof Array)) {
                return false;
            }

            // TODO should use a canonicalizing representation, so that we
            // don't get screwed by key order
            var parts = {};
            var remaining = 0;

            _.forEach(value, function (val) {
                var hash = JSON.stringify(val);

                if (!(hash in parts)) {
                    parts[hash] = true;
                    remaining++;
                }
            });

            for (var i = 0; i < array.length; i++) {
                var hash = JSON.stringify(array[i]);
                if (parts[hash]) {
                    delete parts[hash];
                    remaining--;

                    if (0 === remaining) return true;
                }
            }

            return false;
        }
    }, {
        key: 'in',
        value: function _in(array, value) {
            if (!_.isObject(array)) {
                // optimization: use scalar equality (fast)
                for (var i = 0; i < value.length; i++) {
                    if (array === value[i]) {
                        return true;
                    }
                }

                return false;
            } else {
                // nope, have to use deep equality
                for (var i = 0; i < value.length; i++) {
                    if (SelectorMatcher.equal(array, value[i])) {
                        return true;
                    }
                }

                return false;
            }
        }

        // deep equality test: use for literal document and array matches

    }, {
        key: 'equal',
        value: function equal(array, qval) {
            var match = function match(a, b) {
                // scalars
                if (_.isNumber(a) || _.isString(a) || _.isBoolean(a) || _.isNil(a)) return a === b;

                if (_.isFunction(a)) return false; // Not allowed yet

                // OK, typeof a === 'object'
                if (!_.isObject(b)) return false;

                // arrays
                if (_.isArray(a)) {
                    if (!_.isArray(b)) return false;

                    if (a.length !== b.length) return false;

                    for (var _i = 0; _i < a.length; _i++) {
                        if (!match(a[_i], b[_i])) return false;
                    }

                    return true;
                }

                // objects
                /*
                var unmatched_b_keys = 0;
                for (var x in b)
                    unmatched_b_keys++;
                for (var x in a) {
                    if (!(x in b) || !match(a[x], b[x]))
                        return false;
                    unmatched_b_keys--;
                }
                return unmatched_b_keys === 0;
                */
                // Follow Mongo in considering key order to be part of
                // equality. Key enumeration order is actually not defined in
                // the ecmascript spec but in practice most implementations
                // preserve it. (The exception is Chrome, which preserves it
                // usually, but not for keys that parse as ints.)
                var b_keys = [];

                for (var array in b) {
                    b_keys.push(b[array]);
                }

                var i = 0;
                for (var _array in a) {
                    if (i >= b_keys.length) return false;

                    if (!match(a[_array], b_keys[i])) return false;

                    i++;
                }
                if (i !== b_keys.length) return false;

                return true;
            };

            return match(array, qval);
        }

        // if x is not an array, true iff f(x) is true. if x is an array,
        // true iff f(y) is true for any y in x.
        //
        // this is the way most mongo operators (like $gt, $mod, $type..)
        // treat their arguments.

    }, {
        key: 'matches',
        value: function matches(value, func) {
            if (_.isArray(value)) {
                for (var i = 0; i < value.length; i++) {
                    if (func(value[i])) return true;
                }

                return false;
            }

            return func(value);
        }

        // like _matches, but if x is an array, it's true not only if f(y)
        // is true for some y in x, but also if f(x) is true.
        //
        // this is the way mongo value comparisons usually work, like {x:
        // 4}, {x: [4]}, or {x: {$in: [1,2,3]}}.

    }, {
        key: 'matches_plus',
        value: function matches_plus(value, func) {
            // if (_.isArray(value)) {
            //     for (var i = 0; i < value.length; i++) {
            //         if (func(value[i])) return true;
            //     }

            //     // fall through!
            // }

            // return func(value);
            return SelectorMatcher.matches(value, func) || func(value);
        }

        // compare two values of unknown type according to BSON ordering
        // semantics. (as an extension, consider 'undefined' to be less than
        // any other value.)
        // return negative if a is less, positive if b is less, or 0 if equal

    }, {
        key: 'cmp',
        value: function cmp(a, b) {
            if (_.isUndefined(a)) return b === undefined ? 0 : -1;

            if (_.isUndefined(b)) return 1;

            var aType = BsonTypes.getByValue(a);
            var bType = BsonTypes.getByValue(b);

            if (aType.order !== bType.order) return aType.order < bType.order ? -1 : 1;

            // Same sort order, but distinct value type
            if (aType.number !== bType.number) {
                // Currently, Symbols can not be sortered in JS, so we are setting the Symbol as greater
                if (_.isSymbol(a)) return 1;
                if (_.isSymbol(b)) return -1;

                // TODO Integer, Date and Timestamp
            }

            if (_.isNumber(a)) return a - b;

            if (_.isString(a)) return a < b ? -1 : a === b ? 0 : 1;

            if (_.isBoolean(a)) {
                if (a) return b ? 0 : 1;

                return b ? -1 : 0;
            }

            if (_.isArray(a)) {
                for (var i = 0;; i++) {
                    if (i === a.length) return i === b.length ? 0 : -1;

                    if (i === b.length) return 1;

                    if (a.length !== b.length) return a.length - b.length;

                    var s = SelectorMatcher.cmp(a[i], b[i]);

                    if (s !== 0) return s;
                }
            }

            if (_.isNull(a)) return 0;

            if (_.isRegExp(a)) throw Error("Sorting not supported on regular expression"); // TODO

            // if (_.isFunction(a)) return {type: 13, order: 100, fnc: _.isFunction};

            if (_.isPlainObject(a)) {
                var to_array = function to_array(obj) {
                    var ret = [];

                    for (var key in obj) {
                        ret.push(key);
                        ret.push(obj[key]);
                    }

                    return ret;
                };

                return SelectorMatcher.cmp(to_array(a), to_array(b));
            }

            // double
            // if (ta === 1)  return a - b;

            // string
            // if (tb === 2) return a < b ? -1 : (a === b ? 0 : 1);

            // Object
            // if (ta === 3) {
            //     // this could be much more efficient in the expected case ...
            //     var to_array = function (obj) {
            //         var ret = [];

            //         for (var key in obj) {
            //             ret.push(key);
            //             ret.push(obj[key]);
            //         }

            //         return ret;
            //     };

            //     return Selector._f._cmp(to_array(a), to_array(b));
            // }

            // Array
            // if (ta === 4) {
            //     for (var i = 0; ; i++) {
            //         if (i === a.length) return (i === b.length) ? 0 : -1;

            //         if (i === b.length) return 1;

            //         if (a.length !== b.length) return a.length - b.length;

            //         var s = Selector._f._cmp(a[i], b[i]);

            //         if (s !== 0) return s;
            //     }
            // }

            // 5: binary data
            // 7: object id

            // boolean
            // if (ta === 8) {
            //     if (a) return b ? 0 : 1;

            //     return b ? -1 : 0;
            // }

            // 9: date

            // null
            // if (ta === 10) return 0;

            // regexp
            // if (ta === 11) {
            //     throw Error("Sorting not supported on regular expression"); // TODO
            // }

            // 13: javascript code
            // 14: symbol
            if (_.isSymbol(a)) {
                // Currently, Symbols can not be sortered in JS, so we are returning an equality
                return 0;
            }
            // 15: javascript code with scope
            // 16: 32-bit integer
            // 17: timestamp
            // 18: 64-bit integer
            // 255: minkey
            // 127: maxkey

            // javascript code
            // if (ta === 13) {
            //     throw Error("Sorting not supported on Javascript code"); // TODO
            // }
        }
    }]);

    return SelectorMatcher;
}();

var _testClause = function _testClause(clause, val) {
    logger.debug('Called _testClause');

    // var _val = clause.value;

    // if RegExp || $ -> Operator

    return SelectorMatcher.matches_plus(val, function (_value) {
        // TODO object ids, dates, timestamps?
        switch (clause.type) {
            case 'null':
                logger.debug('test Null equality');

                // http://www.mongodb.org/display/DOCS/Querying+and+nulls
                if (_.isNil(_value)) {
                    return true;
                } else {
                    return false;
                }
            case 'regexp':
                logger.debug('test RegExp equality');

                return _testOperatorClause(clause, _value);
            case 'literal_object':
                logger.debug('test Literal Object equality');

                return SelectorMatcher.equal(_value, clause.value);
            case 'operator_object':
                logger.debug('test Operator Object equality');

                return _testOperatorClause(clause, _value);
            case 'string':
                logger.debug('test String equality');

                return _.toString(_value) === _.toString(clause.value);
            case 'number':
                logger.debug('test Number equality');

                return _.toNumber(_value) === _.toNumber(clause.value);
            case 'boolean':
                logger.debug('test Boolean equality');

                return _.isBoolean(_value) && _.isBoolean(clause.value) && _value === clause.value;
            case 'array':
                logger.debug('test Boolean equality');

                // Check type
                if (_.isArray(_value) && _.isArray(clause.value)) {
                    // Check length
                    if (_value.length === clause.value.length) {
                        // Check items
                        for (var i = 0; i < _value.length; i++) {
                            if (clause.value.indexOf(_value[i]) === -1) {
                                return false;
                            }
                        }

                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            case 'function':
                logger.debug('test Function equality');

                throw Error("Bad value type in query");
            default:
                throw Error("Bad value type in query");
        }
    });
};

var _testObjectClause = function _testObjectClause(clause, doc, key) {
    logger.debug('Called _testObjectClause');

    var val = null;

    if (key.length > 0) {
        var path = key.pop();
        val = doc[path];

        logger.debug('check on field ' + path);

        // TODO add _.isNumber(val) and treat it as an array
        if (val) {
            logger.log(val);
            logger.debug('going deeper');

            return _testObjectClause(clause, val, key);
        }
    } else {
        logger.debug('lowest path: ' + path);

        return _testClause(clause, doc);
    }
};

var _testLogicalClause = function _testLogicalClause(clause, doc, key) {
    var matches = null;

    for (var i = 0; i < clause.value.length; i++) {
        var _matcher = new SelectorMatcher({ clauses: [clause.value[i]] });

        switch (key) {
            case 'and':
                // True unless it has one that do not match
                if (_.isNil(matches)) matches = true;

                if (!_matcher.test(doc)) {
                    return false;
                }

                break;
            case 'or':
                // False unless it has one match at least
                if (_.isNil(matches)) matches = false;

                if (_matcher.test(doc)) {
                    return true;
                }

                break;
        }
    }

    return matches || false;
};

var _testOperatorClause = function _testOperatorClause(clause, value) {
    logger.debug('Called _testOperatorClause');

    for (var key in clause.value) {
        if (!_testOperatorConstraint(key, clause.value[key], clause.value, value, clause)) {
            return false;
        }
    }

    return true;
};

var _testOperatorConstraint = function _testOperatorConstraint(key, operatorValue, clauseValue, docVal, clause) {
    logger.debug('Called _testOperatorConstraint');

    switch (key) {
        // Comparison Query Operators
        case '$gt':
            logger.debug('testing operator $gt');

            return SelectorMatcher.cmp(docVal, operatorValue) > 0;
        case '$lt':
            logger.debug('testing operator $lt');

            return SelectorMatcher.cmp(docVal, operatorValue) < 0;
        case '$gte':
            logger.debug('testing operator $gte');

            return SelectorMatcher.cmp(docVal, operatorValue) >= 0;
        case '$lte':
            logger.debug('testing operator $lte');

            return SelectorMatcher.cmp(docVal, operatorValue) <= 0;
        case '$eq':
            logger.debug('testing operator $eq');

            return SelectorMatcher.equal(docVal, operatorValue);
        case '$ne':
            logger.debug('testing operator $ne');

            return !SelectorMatcher.equal(docVal, operatorValue);
        case '$in':
            logger.debug('testing operator $in');

            return SelectorMatcher.in(docVal, operatorValue);
        case '$nin':
            logger.debug('testing operator $nin');

            return !SelectorMatcher.in(docVal, operatorValue);
        // Logical Query Operators
        case '$not':
            logger.debug('testing operator $not');

            // $or, $and, $nor are in the 'operator' kind treatment
            /*
            var _clause = {
                kind: 'plain',
                key: clause.key,
                value: operatorValue,
                type: 
            };
            var _parent = clause.value;
            var _key = 
            return !(_testClause(_clause, docVal));
            */
            // TODO implement
            throw Error("$not unimplemented");
        // Element Query Operators
        case '$exists':
            logger.debug('testing operator $exists');

            return operatorValue ? !_.isUndefined(docVal) : _.isUndefined(docVal);
        case '$type':
            logger.debug('testing operator $type');

            // $type: 1 is true for an array if any element in the array is of
            // type 1. but an array doesn't have type array unless it contains
            // an array..
            // var Selector._f._type(docVal);
            // return Selector._f._type(docVal).type === operatorValue;
            throw Error("$type unimplemented");
        // Evaluation Query Operators
        case '$mod':
            logger.debug('testing operator $mod');

            return docVal % operatorValue[0] === operatorValue[1];
        case '$options':
            logger.debug('testing operator $options (ignored)');

            // Ignore, as it is to the RegExp
            return true;
        case '$regex':
            logger.debug('testing operator $regex');

            var _opt = null;
            if (_.hasIn(clauseValue, '$options')) {
                _opt = clauseValue['$options'];

                if (/[xs]/.test(_opt)) {
                    //g, i, m, x, s
                    // TODO mongo uses PCRE and supports some additional flags: 'x' and
                    // 's'. javascript doesn't support them. so this is a divergence
                    // between our behavior and mongo's behavior. ideally we would
                    // implement x and s by transforming the regexp, but not today..

                    throw Error("Only the i, m, and g regexp options are supported");
                }
            }

            // Review flags -> g & m
            var regexp = operatorValue;

            if (_.isRegExp(regexp) && _.isNil(_opt)) {
                return regexp.test(docVal);
            } else if (_.isNil(_opt)) {
                regexp = new RegExp(regexp);
            } else if (_.isRegExp(regexp)) {
                regexp = new RegExp(regexp.source, _opt);
            } else {
                regexp = new RegExp(regexp, _opt);
            }

            return regexp.test(docVal);
        case '$text':
            logger.debug('testing operator $text');

            // TODO implement
            throw Error("$text unimplemented");
        case '$where':
            logger.debug('testing operator $where');

            // TODO implement
            throw Error("$where unimplemented");
        // Geospatial Query Operators
        // TODO -> in operator kind
        // Query Operator Array
        case '$all':
            logger.debug('testing operator $all');

            return SelectorMatcher.all(operatorValue, docVal) > 0;
        case '$elemMatch':
            logger.debug('testing operator $elemMatch');

            // TODO implement
            throw Error("$elemMatch unimplemented");
        case '$size':
            logger.debug('testing operator $size');

            return _.isArray(docVal) && docVal.length === operatorValue;
        // Bitwise Query Operators
        // TODO
        default:
            logger.debug('testing operator ' + key);

            throw Error("Unrecognized key in selector: " + key);
    }
};

var BsonTypes = {
    _types: [{ alias: 'minKey', number: -1, order: 1, isType: null }, { alias: 'null', number: 10, order: 2, isType: null }, { alias: 'int', number: 16, order: 3, isType: _.isInteger }, { alias: 'long', number: 18, order: 3, isType: _.isNumber }, { alias: 'double', number: 1, order: 3, isType: _.isNumber }, { alias: 'number', number: null, order: 3, isType: _.isNumber }, { alias: 'string', number: 2, order: 4, isType: _.isString }, { alias: 'symbol', number: 14, order: 4, isType: _.isSymbol }, { alias: 'object', number: 3, order: 5, isType: _.isPlainObject }, { alias: 'array', number: 4, order: 6, isType: _.isArray }, { alias: 'binData', number: 5, order: 7, isType: null }, { alias: 'objectId', number: 7, order: 8, isTypefnc: null }, { alias: 'bool', number: 8, order: 9, isType: _.isBoolean }, { alias: 'date', number: 9, order: 10, isTypefnc: _.isDate }, // format
    { alias: 'timestamp', number: 17, order: 11, isType: _.isDate }, // format
    { alias: 'regex', number: 11, order: 12, isType: _.isRegExp }, { alias: 'maxKey', number: 127, order: 13, isType: null }

    // 		undefined 6
    // 		dbPointer
    // 		javascript
    // 		javascriptWithScope
    // 		function
    ],

    getByAlias: function getByAlias(alias) {
        for (var i = 0; i < this._types.length; i++) {
            if (this._types[i].alias === alias) return this._types[i];
        }
    },
    getByValue: function getByValue(val) {
        if (_.isNumber(val)) return this.getByAlias("double");

        if (_.isString(val)) return this.getByAlias("string");

        if (_.isBoolean(val)) return this.getByAlias("bool");

        if (_.isArray(val)) return this.getByAlias("array");

        if (_.isNull(val)) return this.getByAlias("null");

        if (_.isRegExp(val)) return this.getByAlias("regex");

        if (_.isPlainObject(val)) return this.getByAlias("object");

        if (_.isSymbol(val)) return this.getByAlias("symbol");

        throw Error("Unaccepted BSON type");
    }
};

module.exports = SelectorMatcher;

},{}],8:[function(require,module,exports){
'use strict';

module.exports = require('./MongoPortable');

},{"./MongoPortable":"mongo-portable"}],9:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global _, Logger */

var logger = null;

var EventEmitter = function () {
    function EventEmitter() {
        _classCallCheck(this, EventEmitter);

        logger = Logger.instance;
    }

    _createClass(EventEmitter, [{
        key: "emit",
        value: function emit(name, args, cb, stores) {
            if (_.isNil(name) || !_.isString(name)) {
                throw new Error("Error on name");
            }

            if (_.isNil(args)) {
                args = {};
                cb = null;
            }

            if (_.isNil(cb)) {
                cb = null;
            }

            if (_.isFunction(args)) {
                cb = args;
                args = {};
            }

            if (!_.isNil(stores) && _.isArray(stores)) {
                this._stores = stores;
            }

            var command = name;

            logger.info('Emitting store event ' + name);
            logger.debug(args);

            // Send event to all the stores registered
            _.forEach(this._stores, function (fn) {
                if (_.isFunction(fn[command])) {
                    fn[command](args, cb);
                }
            });
        }
    }]);

    return EventEmitter;
}();

module.exports = EventEmitter;

},{}],10:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
  try {
    cachedSetTimeout = setTimeout;
  } catch (e) {
    cachedSetTimeout = function () {
      throw new Error('setTimeout is not defined');
    }
  }
  try {
    cachedClearTimeout = clearTimeout;
  } catch (e) {
    cachedClearTimeout = function () {
      throw new Error('clearTimeout is not defined');
    }
  }
} ())
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = cachedSetTimeout.call(null, cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    cachedClearTimeout.call(null, timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        cachedSetTimeout.call(null, drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],"mongo-portable":[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* global _, Logger */

/**
 * @file MongoPortable.js - based on Monglo ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */
var /*_ = require('lodash'),*/
EventEmitter = require("./utils/EventEmitter"),
    ObjectId = require('./ObjectId'),
    Collection = require('./Collection') /*,
                                         Logger = require("jsw-logger")*/;

var logger = null;

/**
 * MongoPortable
 * 
 * @module MongoPortable
 * @constructor
 * @since 0.0.1
 * 
 * @classdesc Portable database with persistence and MongoDB-like API
 * 
 * @param {string} databaseName - Name of the database.
 */

var MongoPortable = function (_EventEmitter) {
    _inherits(MongoPortable, _EventEmitter);

    function MongoPortable(databaseName) {
        var _ret;

        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        _classCallCheck(this, MongoPortable);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MongoPortable).call(this));

        if (!(_this instanceof MongoPortable)) return _ret = new MongoPortable(databaseName), _possibleConstructorReturn(_this, _ret);

        if (options.log) {
            logger = Logger.getInstance(options.log);
        } else {
            logger = Logger.instance;
        }

        // Initializing variables
        _this._collections = {};
        _this._stores = [];

        if (!MongoPortable.connections) {
            MongoPortable.connections = {};
        }

        // Check ddbb name format
        _validateDatabaseName(databaseName);

        //Temp patch until I figure out how far I want to take the implementation;
        // FIXME
        if (MongoPortable.connections[databaseName]) {
            logger.throw('db name already in use');
        }

        _this.databaseName = databaseName;

        MongoPortable.connections[databaseName] = new ObjectId();
        return _this;
    }

    return MongoPortable;
}(EventEmitter);

/**
 * Connection Pool
 * 
 * @memberof MongoPortable
 * @static
 */


MongoPortable.connections = {};

// MongoPortable.prototype.__proto__ = EventEmitter.proto;

/**
 * Version Number
 * 
 * @memberof MongoPortable
 * @static
 */
MongoPortable.version = '0.0.1';

/**
 * Middleware functions
 * 
 * @param  {String} name - Name of the middleware:
 *      <ul>
 *          <li>"store": Add a custom store</li>
 *      </ul>
 * @param  {Object|Function} fn - Function to implement the middleware
 */
MongoPortable.prototype.use = function (name, obj) {
    switch (name) {
        case 'store':
            this._stores.push(obj);
            break;
    }
};

/**
 * Adds a custom stores for remote and local persistence
 *
 * @param {Object|Function} store - The custom store
 * 
 * @returns {MongoPortable} this - The current Instance
 */
MongoPortable.prototype.addStore = function (store) {
    if (_.isNil(store)) logger.throw("store must be included");

    if (_.isFunction(store)) {
        this._stores.push(new store());
    } else if (_.isObject(store)) {
        this._stores.push(store);
    } else {
        logger.throw("store must be a function or object");
    }

    return this;
};

/**
 * Returns a cursor to all the collection information.
 * 
 * @param {String} [collectionName=null] - the collection name we wish to retrieve the information from.
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Array}
 *
 * @todo Implement
 */
MongoPortable.prototype.collectionsInfo = function (collectionName, callback) {
    logger.throw("Not implemented yet");
};

/**
 * Alias for {@link MongoPortable#collections}
 * 
 * @method MongoPortable#fetchCollections
 */
MongoPortable.prototype.fetchCollections = function (options, callback) {
    return this.collections(options, callback);
};

/**
 * Get the list of all collection for the specified db
 *
 * @method MongoPortable#collections
 * 
 * @param {Object} [options] - Additional options
 * 
 * @param {Boolean} [options.namesOnly=false] - Return only the collections names
 * @param {String|Array} [options.collectionName=null] - The collection name we wish to filter by
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 *
 * @return {Array} 
 */
MongoPortable.prototype.collections = function (options, callback) {
    if (_.isNil(callback) && _.isFunction(options)) {
        callback = options;
    }

    if (_.isNil(options)) options = {};

    var self = this;

    var collectionList = [];
    for (var name in self._collections) {
        // Only add the requested collections //TODO Add array type
        if (options.collectionName) {
            if (name.toLowerCase() === options.collectionName.toLowerCase()) {
                if (options.namesOnly) {
                    collectionList.push(name);
                } else {
                    collectionList.push(self._collections[name]);
                }
            }
        } else {
            if (options.namesOnly) {
                collectionList.push(name);
            } else {
                collectionList.push(self._collections[name]);
            }
        }
    }

    if (callback) callback(collectionList);

    return collectionList;
};

/**
* Get the list of all collection names for the specified db, 
*  by calling MongoPortable#collections with [options.namesOnly = true]
*
* @method MongoPortable#collectionNames
* 
* @param {Object} [options] - Additional options.
* 
* @param {String|Array} [options.collectionName=null] - The collection name we wish to filter by.
* 
* @param {Function} [callback=null] - Callback function to be called at the end with the results
*
* @return {Array}
* 
* {@link MongoPortable#collections}
*/
MongoPortable.prototype.collectionNames = function (options, callback) {
    if (_.isNil(callback) && _.isFunction(options)) {
        callback = options;
    }

    if (_.isNil(options)) options = {};

    if (!options.namesOnly) options.namesOnly = true;

    return this.collections(options, callback);
};

/**
 * Creates a collection on a server pre-allocating space, need to create f.ex capped collections.
 * 
 * @method MongoPortable#collection
 * 
 * @param {String} collectionName - the collection name we wish to access.
 * @param {Object} [options] - returns option results.
 * 
 * @param {Boolean|Object} [options.safe=false] Executes with a getLastError command returning the results of the command on MongoMonglo:
 *      <ul>
 *          <li>true</li>
 *          <li>false</li>
 *          <li>{ w: {Number}, wtimeout: {Number}}</li>
 *          <li>{ fsync: true }</li>
 *      </ul>
 * @param {Boolean} [options.serializeFunctions=false] - Serialize functions on the document.
 * @param {Boolean} [options.raw=false] - Perform all operations using raw bson objects.
 * @param {Object} [options.pkFactory=null] - Object overriding the basic ObjectId primary key generation.
 * @param {Boolean} [options.capped=false] - Create a capped collection.
 * @param {Number} [options.size=4096] - The size of the capped collection in bytes.
 * @param {Number} [options.max=500] - The maximum number of documents in the capped collection.
 * @param {Boolean} [options.autoIndexId=false] - Create an index on the _id field of the document, not created automatically on capped collections.
 * @param {String} [options.readPreference=ReadPreference.PRIMARY] - Te prefered read preference:
 *      <ul>
 *          <li>ReadPreference.PRIMARY</li>
 *          <li>ReadPreference.PRIMARY_PREFERRED</li>
 *          <li>ReadPreference.SECONDARY</li>
 *          <li>ReadPreference.SECONDARY_PREFERRED</li>
 *          <li>ReadPreference.NEAREST</li>
 *      </ul>
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @fires {@link MongoStore#createCollection}
 * 
 * @returns {Collection}
 */
MongoPortable.prototype.collection = function (collectionName, options, callback) {
    var self = this;
    var existing = false;
    // var collection;
    // var collectionFullName =  self.databaseName + "." + collectionName;

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    } else {
        options = options || {};
    }

    // Collection already in memory, lets create it
    if (self._collections[collectionName]) {
        /**
         * "createCollection" event.
         *
         * @event MongoPortable~createCollection
         * 
         * @property {Object} connection - Information about the current database connection
         * @property {Object} collection - Information about the collection created
         */
        self.emit('createCollection', {
            connection: self,
            collection: self._collections[collectionName]
        });

        existing = true;
    } else {
        self._collections[collectionName] = new Collection(self, collectionName, self.pkFactory, options);
        /**
         * "createCollection" event.
         *
         * @event MongoPortable~createCollection
         * 
         * @property {Object} connection - Information about the current database connection
         * @property {Object} collection - Information about the collection created
         */
        self.emit('createCollection', {
            connection: self,
            collection: self._collections[collectionName]
        });
    }

    if (!existing) {
        // Letting access the collection by <MongoPortable instance>.<COL_NAME>
        Object.defineProperty(MongoPortable.prototype, collectionName, {
            enumerable: true,
            configurable: true,
            writable: false,
            value: self._collections[collectionName]
        });
    }

    // return self._collections[collectionName];
    if (callback) callback(self._collections[collectionName]);

    return self._collections[collectionName];
};

/**
 * Alias for {@link MongoPortable#collection}
 * 
 * @method MongoPortable#createCollection
 */
MongoPortable.prototype.createCollection = MongoPortable.prototype.collection;

/**
 * Drop a collection from the database, removing it permanently. New accesses will create a new collection.
 * 
 * @method MongoPortable#dropCollection
 *
 * @param {String} collectionName - The name of the collection we wish to drop.
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Boolean} "true" if dropped successfully
 */
MongoPortable.prototype.dropCollection = function (collectionName, callback) {
    var self = this;

    if (self._collections[collectionName]) {
        // Drop the collection
        this.emit('dropCollection', {
            conn: this,
            collection: self._collections[collectionName]
        });

        delete self._collections[collectionName];

        if (callback && _.isFunction(callback)) callback();

        return true;
    } else {
        var msg = "No collection found";

        logger.error(msg);

        if (callback && _.isFunction(callback)) callback(new Error(msg));

        return false;
    }
};

/**
 * Rename a collection.
 *
 * @method MongoPortable#renameCollection
 * 
 * @param {String} fromCollection - The name of the current collection we wish to rename.
 * @param {String} toCollection - The new name of the collection.
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Boolean|Collection} The collection if renamed successfully or false if not
 */
MongoPortable.prototype.renameCollection = function (fromCollection, toCollection, callback) {
    var self = this;

    if (_.isString(fromCollection) && _.isString(toCollection) && fromCollection !== toCollection) {
        // Execute the command, return the new renamed collection if successful
        Collection.checkCollectionName(toCollection);

        if (self._collections[fromCollection]) {
            this.emit('renameCollection', {
                conn: self,
                from: fromCollection,
                to: toCollection
            });

            var renamed = self._collections[fromCollection].rename(toCollection);
            self._collections.renameProperty(fromCollection, toCollection);
            self.renameProperty(fromCollection, toCollection);

            if (callback && _.isFunction(callback)) callback(null, renamed);

            return renamed;
        } else {
            var msg = "No collection found";

            logger.error(msg);

            if (callback && _.isFunction(callback)) callback(new Error(msg), null);

            return false;
        }
    } else {
        var _msg = "The params are invalid";

        logger.error(_msg);

        if (callback && _.isFunction(callback)) callback(new Error(_msg), null);

        return false;
    }
};

/**
 * Creates an index on the collection.
 * 
 * @method MongoPortable#createIndex
 *
 * @param {String} collectionName - Name of the collection to create the index on.
 * @param {Object} fieldOrSpec - FieldOrSpec that defines the index.
 * @param {Object} [options] - Additional options during update.
 * 
 * @param {Boolean|Object} [options.safe=false] Executes with a getLastError command returning the results of the command on MongoMonglo:
 *      <ul>
 *          <li>true</li>
 *          <li>false</li>
 *          <li>{ w: {Number}, wtimeout: {Number}}</li>
 *          <li>{ fsync: true }</li>
 *      </ul> 
 * @param {Boolean} [options.unique=false] - Creates an unique index
 * @param {Boolean} [options.sparse=false] - Creates a sparse index
 * @param {Boolean} [options.background=false] - Creates the index in the background, yielding whenever possible
 * @param {Boolean} [options.dropDups=false] - A unique index cannot be created on a key that has pre-existing duplicate values. If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value
 * @param {Number} [options.min=null] - For geospatial indexes set the lower bound for the co-ordinates
 * @param {Number} [options.max=null] - For geospatial indexes set the high bound for the co-ordinates
 * @param {Number} [options.v=null] - Specify the format version of the indexes
 * @param {Number} [options.expireAfterSeconds=null] - Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher)
 * @param {String} [options.name=null] - Override the autogenerated index name (useful if the resulting name is larger than 128 bytes)
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @todo Implement
 */
MongoPortable.prototype.createIndex = function (collectionName, fieldOrSpec, options, callback) {
    logger.throw('Not implemented yet!');
};

/**
 * Ensures that an index exists, if it does not it creates it
 * 
 * @method MongoPortable#ensureIndex
 *
 * @param {String} collectionName - Name of the collection to create the index on.
 * @param {Object} fieldOrSpec - FieldOrSpec that defines the index.
 * @param {Object} [options] - Additional options during update.
 * 
 * @param {Boolean|Object} [options.safe=false] - Executes with a getLastError command returning the results of the command on MongoMonglo:
 *      <ul>
 *          <li>true</li>
 *          <li>false</li>
 *          <li>{ w: {Number}, wtimeout: {Number}}</li>
 *          <li>{ fsync: true }</li>
 *      </ul>
 * @param {Boolean} [options.unique=false] - Creates an unique index
 * @param {Boolean} [options.sparse=false] - Creates a sparse index
 * @param {Boolean} [options.background=false] - Creates the index in the background, yielding whenever possible
 * @param {Boolean} [options.dropDups=false] - A unique index cannot be created on a key that has pre-existing duplicate values. If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value
 * @param {Number} [options.min] - For geospatial indexes set the lower bound for the co-ordinates
 * @param {Number} [options.max] - For geospatial indexes set the high bound for the co-ordinates
 * @param {Number} [options.v] - Specify the format version of the indexes
 * @param {Number} [options.expireAfterSeconds] - Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher)
 * @param {String} [options.name] - Override the autogenerated index name (useful if the resulting name is larger than 128 bytes)
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @todo Implement
 */
MongoPortable.prototype.ensureIndex = function (collectionName, fieldOrSpec, options, callback) {
    logger.throw('Not implemented yet!');
};

/**
 * Drop an index on a collection.
 * 
 * @method MongoPortable#dropIndex
 *
 * @param {String} collectionName - The name of the collection where the command will drop an index.
 * @param {String} indexName - Name of the index to drop.
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @todo Implement
 */
MongoPortable.prototype.dropIndex = function (collectionName, indexName, callback) {
    logger.throw('Not implemented yet!');
};

/**
 * Reindex all indexes on the collection
 * Warning: "reIndex" is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
 * 
 * @method MongoPortable#reIndex
 *
 * @param {String} collectionName - The name of the collection to reindex
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @todo Implement
 **/
MongoPortable.prototype.reIndex = function (collectionName, callback) {
    logger.throw('Not implemented yet!');
};

/**
 * Retrieves this collections index info.
 * 
 * @method MongoPortable#indexInformation
 *
 * @param {String} collectionName - The name of the collection.
 * @param {Object} [options] Additional options during update.
 * 
 * @param {Boolean} [full=false] - Returns the full raw index information.
 * @param {String} [readPreference] - The preferred read preference ((Server.PRIMARY, Server.PRIMARY_PREFERRED, Server.SECONDARY, Server.SECONDARY_PREFERRED, Server.NEAREST).
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @todo Implement
 */
MongoPortable.prototype.indexInformation = function (collectionName, options, callback) {
    logger.throw('Not implemented yet!');
};

/**
 * Drop the whole database.
 * 
 * @method MongoPortable#dropDatabase
 *
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @return {Boolean} "true" if dropped successfully
 */
MongoPortable.prototype.dropDatabase = function (callback) {
    if (MongoPortable.connections[this.databaseName]) {
        this.emit('dropDatabase', {
            conn: this
        });

        delete MongoPortable.connections[this.databaseName];

        this._collections = [];
        this._stores = [];

        if (callback && _.isFunction(callback)) callback(null, true);

        return true;
    } else {
        var msg = 'That database no longer exists';

        logger.error(msg);

        if (callback && _.isFunction(callback)) callback(new Error(msg), false);

        return false;
    }
};

/**
 * Dereference a dbref, against a db
 *
 * @param {DBRef} dbRef db reference object we wish to resolve.
 * @param {Function} [callback=null] Callback function to be called at the end with the results
 * 
 * @todo Implement
 * 
 * @ignore
 */
MongoPortable.prototype.dereference = function (dbRef, callback) {
    // TODO
    // var db = this;

    // // If we have a db reference then let's get the db first
    // if (dbRef.db !== null) db = this.db(dbRef.db);

    // // Fetch the collection and find the reference
    // var collection = Monglo.collection(dbRef.namespace);

    // collection.findOne({'_id':dbRef.oid}, function(err, result) {
    //     callback(err, result);
    // });
};

/**
 * Validates the database name
 * 
 * @method MongoPortable#_validateDatabaseName
 * @private
 * 
 * @param {String} databaseName - The name of the database to validate
 * 
 * @return {Boolean} "true" if the name is valid
 */
var _validateDatabaseName = function _validateDatabaseName(databaseName) {
    if (!_.isString(databaseName)) logger.throw("database name must be a string");

    if (databaseName.length === 0) logger.throw("database name cannot be the empty string");

    var invalidChars = [" ", ".", "$", "/", "\\"];
    for (var i = 0; i < invalidChars.length; i++) {
        if (databaseName.indexOf(invalidChars[i]) != -1) {
            logger.throw('database names cannot contain the character "' + invalidChars[i] + '"');
        }
    }

    return true;
};

module.exports = MongoPortable;

/**
 * Renames an object property.
 * 
 * @method Object#renameProperty
 * 
 * @param {String} oldName - The name of the property to rename
 * @param {String} newName - The new name of the property
 * 
 * @returns {this} The called object
 */
Object.defineProperty(Object.prototype, 'renameProperty', {
    writable: false, // Cannot alter this property
    enumerable: false, // Will not show up in a for-in loop.
    configurable: false, // Cannot be deleted via the delete operator
    value: function value(oldName, newName) {
        // Do nothing if some name is missing or is not an string
        if (!_.isString(oldName) || !_.isString(newName)) {
            return this;
        }

        // Do nothing if the names are the same
        if (oldName == newName) {
            return this;
        }

        // Check for the old property name to 
        // avoid a ReferenceError in strict mode.
        if (this.hasOwnProperty(oldName)) {
            this[newName] = this[oldName];
            delete this[oldName];
        }

        return this;
    }
});

},{"./Collection":3,"./ObjectId":5,"./utils/EventEmitter":9}]},{},[8]);
