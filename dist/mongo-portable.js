/**
 * MongoPortable - Solution for a MongoDB-like portable database.
 * version 1.2.1
 * 
 * made by Eduardo Astolfi <eastolfi91@gmail.com>
 * copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * MIT Licensed
 */

require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

function _defineProperty(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true });
    } else {
        obj[key] = value;
    }return obj;
}

/**
 * @file Cursor.js - based on Monglo#Cursor ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var logger = null;

module.exports = function (Selector, Cursor, Logger, _) {

    var stages = {
        '$project': true,
        '$match': true,
        '$redact': false,
        '$limit': false,
        '$skip': false,
        '$unwind': false,
        '$group': true,
        '$sample': false,
        '$sort': true,
        '$geoNear': false,
        '$lookup': false,
        '$out': false,
        '$indexStats': false
    };

    var group_operators = {
        $sum: function $sum(documents, new_id, new_field, value, isCount) {
            var new_docs = {};

            for (var i = 0; i < documents.length; i++) {
                var doc = documents[i];
                var val = value;

                if (!isCount) {
                    val = doc[value.substr(1, value.length)] || 0;
                }

                if (_.hasIn(doc, new_id)) {
                    var _id = doc[new_id];

                    if (!_.hasIn(new_docs, _id)) {
                        new_docs[_id] = _defineProperty({
                            _id: _id
                        }, new_field, _.toNumber(val));
                    } else {
                        new_docs[_id][new_field] += _.toNumber(val);
                    }
                }
            }

            return new_docs;
        },

        $avg: function $avg(documents, new_id, new_field, value, isCount) {
            var new_docs = {};

            for (var i = 0; i < documents.length; i++) {
                var doc = documents[i];
                var val = value;

                if (!isCount) {
                    val = doc[value.substr(1, value.length)] || 0;
                }

                if (_.hasIn(doc, new_id) || _.isNull(new_id)) {
                    var _id = doc[new_id] || null;

                    if (!_.hasIn(new_docs, _id)) {
                        var _new_docs$_id2;

                        new_docs[_id] = (_new_docs$_id2 = {
                            _id: _id
                        }, _defineProperty(_new_docs$_id2, new_field, _.toNumber(val)), _defineProperty(_new_docs$_id2, '__COUNT__', 1), _new_docs$_id2);
                    } else {
                        new_docs[_id][new_field] += _.toNumber(val);
                        new_docs[_id].__COUNT__++;
                    }
                }
            }

            for (var key in new_docs) {
                new_docs[key][new_field] = new_docs[key][new_field] / new_docs[key].__COUNT__;
                delete new_docs[key].__COUNT__;
            }

            return new_docs;
        }
    };

    var do_single_group = function do_single_group(group_id, group_stage, documents) {
        // var operators = {};

        var docs = {};

        for (var field in group_stage) {
            if (field !== '_id') {
                // handle group field
                // let group_key = key;
                var group_field = group_stage[field];

                for (var key in group_field) {
                    if (!_.hasIn(group_operators, key)) logger.throw('Unknown accumulator operator "' + key + '" for group stage');

                    // loop through all documents
                    // var new_docs = {};
                    // for (let i = 0; i < documents.length; i++) {
                    //     let doc = documents[i];

                    //     if (_.hasIn(doc, group_id)) {
                    //         let _id = doc[group_id];

                    //         if (!_.hasIn(new_docs, _id)) {
                    //             new_docs[_id] = {
                    //                 _id: _id,
                    //                 [new_field]: value
                    //             };
                    //         } else {
                    //             new_docs[_id][new_field] += value;
                    //         }
                    //     }
                    // }

                    // if (!_.hasIn(operators, key)) operators[key] = [];

                    // operators[key].push({
                    //     new_field: field,
                    //     value: group_field[key]
                    // });

                    var count = true;
                    if (_.isString(group_field[key])) {
                        if (group_field[key].substr(0, 1) !== '$') logger.throw("Field names references in a right side assignement must be preceded by '$'");

                        if (!_.isFinite(_.toNumber(group_field[key]))) {
                            count = false;
                        }
                    }

                    var operator = group_operators[key];

                    _.merge(docs, operator(documents, group_id, field, group_field[key], count));

                    break;
                }
            }
        }

        return _.values(docs);
    };

    var do_complex_group = function do_complex_group() {};

    var do_sort = function do_sort(documents, sort_stage) {
        return documents.sort(new Selector(sort_stage, Selector.SORT_SELECTOR));
    };

    var do_match = function do_match(documents, match_stage) {
        var cursor = new Cursor(documents, match_stage);

        return cursor.fetch();
    };

    var do_group = function do_group(documents, group_stage) {
        if (!_.hasIn(group_stage, '_id')) logger.throw('The field "_id" is required in the "$group" stage');

        var new_id = group_stage['_id'];

        if (!_.isNull(new_id)) {
            if (new_id.substr(0, 1) !== '$') {
                logger.throw("Field names references in a right side assignement must be preceded by '$'");
            } else {
                new_id = new_id.substr(1, new_id.length);
            }
        }

        if (_.isPlainObject(new_id)) {
            // complex_id
            // do_complex_group();
        } else {
            // single_id
            return do_single_group(new_id, group_stage, documents);
        }
    };

    var do_project = function do_project(documents, project_stage) {
        return Cursor.project(documents, project_stage, true);
    };

    var Aggregation = function () {
        function Aggregation(pipeline) {
            _classCallCheck(this, Aggregation);

            logger = Logger.instance;

            this.pipeline = pipeline;
        }

        _createClass(Aggregation, [{
            key: 'aggregate',
            value: function aggregate(collection) {
                var docs = collection.docs;

                for (var i = 0; i < this.pipeline.length; i++) {
                    var stage = this.pipeline[i];

                    for (var key in stage) {
                        switch (key) {
                            case '$project':
                                docs = do_project(docs, stage[key]);

                                break;
                            case '$match':
                                docs = do_match(docs, stage[key]);

                                break;
                            case '$group':
                                docs = do_group(docs, stage[key]);

                                break;
                            case '$sort':
                                docs = do_sort(docs, stage[key]);

                                break;
                        }
                    }
                }

                return docs; // move to cursor
            }
        }, {
            key: 'validStage',
            value: function validStage(stage) {
                if (!_.hasIn(stages, stage)) return logger.throw('Unknown stage "' + stage + '"');

                if (stages[stage] === false) return logger.throw('Unsupported stage "' + stage + '"');

                return true;
            }
        }]);

        return Aggregation;
    }();

    return Aggregation;
};

},{}],2:[function(require,module,exports){
(function (process){
"use strict";

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

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

    return BinaryParser;
};

}).call(this,require('_process'))
},{"_process":11}],3:[function(require,module,exports){
"use strict";

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

/**
 * @file BinaryParserBuffer.js - based on ({@link http://jsfromhell.com/classes/binary-parser Binary Parser}) by Jonas Raoni Soares Silva
 * @version 1.0.0
 * @ignore
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

var logger = null;

module.exports = function (Logger) {

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

    return BinaryParserBuffer;
};

},{}],4:[function(require,module,exports){
"use strict";

var _typeof2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _typeof = typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol" ? function (obj) {
    return typeof obj === "undefined" ? "undefined" : _typeof2(obj);
} : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof2(obj);
};

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

var _get = function get(object, property, receiver) {
    if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
        var parent = Object.getPrototypeOf(object);if (parent === null) {
            return undefined;
        } else {
            return get(parent, property, receiver);
        }
    } else if ("value" in desc) {
        return desc.value;
    } else {
        var getter = desc.get;if (getter === undefined) {
            return undefined;
        }return getter.call(receiver);
    }
};

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

function _possibleConstructorReturn(self, call) {
    if (!self) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }return call && ((typeof call === "undefined" ? "undefined" : _typeof2(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof2(superClass)));
    }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

/**
 * @file Collection.js - based on Monglo#Collection ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

var logger = null;

module.exports = function (Aggregation, Cursor, Selector, SelectorMatcher, ObjectId, EventEmitter, Logger, _) {

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

    return Collection;
};

},{}],5:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

/**
 * @file Cursor.js - based on Monglo#Cursor ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var logger = null;

module.exports = function (Selector, Logger, _) {

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

    return Cursor;
};

},{}],6:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

function _possibleConstructorReturn(self, call) {
    if (!self) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
    }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

/**
 * @file MongoPortable.js - based on Monglo ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

var logger = null;

module.exports = function (Collection, ObjectId, EventEmitter, Logger, _) {

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

    if (!Object.prototype.renameProperty) {
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
    }

    return MongoPortable;
};

},{}],7:[function(require,module,exports){
(function (process){
"use strict";

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

/**
 * @file ObjectId.js - based on Monglo#ObjectId ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

var logger = null;

module.exports = function (BinaryParser, Logger, _) {

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

    return ObjectId;
};

}).call(this,require('_process'))
},{"_process":11}],8:[function(require,module,exports){
'use strict';

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

var logger = null;

module.exports = function (ObjectId, SelectorMatcher, Logger, _) {
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
            key: 'test',
            value: function test(doc) {
                return this.selector_compiled.test(doc);
            }
        }, {
            key: 'compile',
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
            key: 'compileSort',
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
            key: 'compileFields',
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
            key: 'isSelectorCompiled',
            value: function isSelectorCompiled(selector) {
                if (!_.isNil(selector) && (selector instanceof SelectorMatcher || selector instanceof Selector && selector.selector_compiled instanceof SelectorMatcher)) {
                    return true;
                } else {
                    return false;
                }
            }
        }, {
            key: 'matches',
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

    return Selector;
};

},{}],9:[function(require,module,exports){
'use strict';

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

var logger = null;

module.exports = function (Logger, _) {
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

    return SelectorMatcher;
};

},{}],10:[function(require,module,exports){
"use strict";

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

var logger = null;

module.exports = function (Logger, _) {
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

    return EventEmitter;
};

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
(function (__dirname){
'use strict';

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _symbol = require('babel-runtime/core-js/symbol');

var _symbol2 = _interopRequireDefault(_symbol);

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @file JSW-Logger.js - Logging class extending Winston (@link https://github.com/winstonjs/winston) module
 * @version 0.0.1
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

// var path = require("path"),
//     fs = require('fs-extra'),
//     _ = require("lodash"),
//     winston = require("winston"),
//     winstonLogger = winston.Logger;

var TRANSPORT_PREFIX = 'EAMP_LOGGER';

// Singleton instance
var singleton = (0, _symbol2.default)();
var singletonEnforcer = (0, _symbol2.default)();

var defaultOptions = {
    throwError: true,
    handledExceptionsLogPath: '/../logs/handledException.log'
};

module.exports = function (baseLogger, winston, path, fs, _, browser) {

    /**
     * Logger
     * 
     * @module Logger
     * @constructor
     * @since 1.0.0
     * 
     * @classdesc Logging module singleton which inherits the Winston Logger module.
     *          By default: 
     *              <ol>
     *                  <li>Writes all the HANDLED exceptions under a log file in "logs/handledException.log"</li>
     *                  <li>Writes in the console all warnings and erros</li>
     *              </ol>
     * 
     * @param {Symbol} enforcer - Enforcer internal object to avoid instanciating as "new Logger()"
     * @param {Object} [options] - Additional options
     * 
     * @param {String|Array} [options.throwError=true] - Whether if throw an exception when logged trought the Logger#throw method
     */

    var Logger = function (_baseLogger) {
        (0, _inherits3.default)(Logger, _baseLogger);

        function Logger(enforcer) {
            var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
            (0, _classCallCheck3.default)(this, Logger);

            if (enforcer != singletonEnforcer) throw new Error("Cannot construct singleton");

            if (!browser) {
                var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(Logger).call(this, {
                    transports: [new winston.transports.Console({
                        name: TRANSPORT_PREFIX + '_debug-console',
                        level: 'error'
                    })]
                }));
            } else {
                var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(Logger).call(this));
            }

            _this.options = _.assign(_this.options, defaultOptions, options);

            if (!browser) {
                // Ensuring that the log file exists
                var handledExceptionsLogPath = path.resolve(__dirname + defaultOptions.handledExceptionsLogPath);

                fs.ensureFileSync(handledExceptionsLogPath);

                _this.logger = new winston.Logger({
                    transports: [new winston.transports.File({
                        name: TRANSPORT_PREFIX + '_exception-file',
                        filename: handledExceptionsLogPath,
                        level: 'error',
                        json: false,
                        colorize: true
                    })]
                });
            } else {
                _this.logger = _this;
            }
            return (0, _possibleConstructorReturn3.default)(_this);
        }

        /**
         * Method to throw a controlled exception, logging it to a log file.
         * 
         * @method Logger#throw
         * 
         * @param {Error|String} error - The exception or message to be thrown.
         * @param {Boolean} [throwError=true] - Same as Logger->options->throwError
         */

        (0, _createClass3.default)(Logger, [{
            key: 'throw',
            value: function _throw(error) {
                if (_.isString(error)) error = new Error(error);

                this.logger.error(error);

                if (this.options.throwError) throw error;
            }

            /**
             * Retrieves the current singleton instance, creating a new one if needed.
             * 
             * @static
             * 
             * @returns {Logger} this - The singleton Instance
             */

        }], [{
            key: 'getInstance',

            /**
             * Retrieves the current singleton instance, creating a new one if needed. 
             * It allows, when creating the first time, a set of options. Otherwise, it will return the singleton instance
             * 
             * @static
             * 
             * @param {Object} [options] - Additional options. See {@link Logger#constructor}
             * 
             * @returns {Logger} this - The singleton Instance
             */
            value: function getInstance(options) {
                if (_.isNil(this[singleton])) {
                    this[singleton] = new Logger(singletonEnforcer, options);
                } else {
                    console.error("Singleton already instanciated. Ignoring options and retrieving current instance.");
                }

                return Logger.instance;
            }

            /**
             * Destroy the current singleton instance
             * 
             * @static
             */

        }, {
            key: '__dropInstance',
            value: function __dropInstance() {
                delete this[singleton];
            }
        }, {
            key: 'instance',
            get: function get() {
                if (_.isNil(this[singleton])) {
                    this[singleton] = new Logger(singletonEnforcer);
                }

                return this[singleton];
            }
        }]);
        return Logger;
    }(baseLogger);

    return Logger;
};

}).call(this,"/node_modules/jsw-logger/lib")
},{"babel-runtime/core-js/object/get-prototype-of":15,"babel-runtime/core-js/symbol":17,"babel-runtime/helpers/classCallCheck":19,"babel-runtime/helpers/createClass":20,"babel-runtime/helpers/inherits":21,"babel-runtime/helpers/possibleConstructorReturn":22}],13:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/create"), __esModule: true };
},{"core-js/library/fn/object/create":24}],14:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/define-property"), __esModule: true };
},{"core-js/library/fn/object/define-property":25}],15:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/get-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/get-prototype-of":26}],16:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/set-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/set-prototype-of":27}],17:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/symbol"), __esModule: true };
},{"core-js/library/fn/symbol":28}],18:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/symbol/iterator"), __esModule: true };
},{"core-js/library/fn/symbol/iterator":29}],19:[function(require,module,exports){
"use strict";

exports.__esModule = true;

exports.default = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};
},{}],20:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _defineProperty = require("../core-js/object/define-property");

var _defineProperty2 = _interopRequireDefault(_defineProperty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      (0, _defineProperty2.default)(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();
},{"../core-js/object/define-property":14}],21:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _setPrototypeOf = require("../core-js/object/set-prototype-of");

var _setPrototypeOf2 = _interopRequireDefault(_setPrototypeOf);

var _create = require("../core-js/object/create");

var _create2 = _interopRequireDefault(_create);

var _typeof2 = require("../helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : (0, _typeof3.default)(superClass)));
  }

  subClass.prototype = (0, _create2.default)(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _setPrototypeOf2.default ? (0, _setPrototypeOf2.default)(subClass, superClass) : subClass.__proto__ = superClass;
};
},{"../core-js/object/create":13,"../core-js/object/set-prototype-of":16,"../helpers/typeof":23}],22:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _typeof2 = require("../helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && ((typeof call === "undefined" ? "undefined" : (0, _typeof3.default)(call)) === "object" || typeof call === "function") ? call : self;
};
},{"../helpers/typeof":23}],23:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _iterator = require("../core-js/symbol/iterator");

var _iterator2 = _interopRequireDefault(_iterator);

var _symbol = require("../core-js/symbol");

var _symbol2 = _interopRequireDefault(_symbol);

var _typeof = typeof _symbol2.default === "function" && typeof _iterator2.default === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof _symbol2.default === "function" && obj.constructor === _symbol2.default ? "symbol" : typeof obj; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = typeof _symbol2.default === "function" && _typeof(_iterator2.default) === "symbol" ? function (obj) {
  return typeof obj === "undefined" ? "undefined" : _typeof(obj);
} : function (obj) {
  return obj && typeof _symbol2.default === "function" && obj.constructor === _symbol2.default ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof(obj);
};
},{"../core-js/symbol":17,"../core-js/symbol/iterator":18}],24:[function(require,module,exports){
require('../../modules/es6.object.create');
var $Object = require('../../modules/_core').Object;
module.exports = function create(P, D){
  return $Object.create(P, D);
};
},{"../../modules/_core":35,"../../modules/es6.object.create":89}],25:[function(require,module,exports){
require('../../modules/es6.object.define-property');
var $Object = require('../../modules/_core').Object;
module.exports = function defineProperty(it, key, desc){
  return $Object.defineProperty(it, key, desc);
};
},{"../../modules/_core":35,"../../modules/es6.object.define-property":90}],26:[function(require,module,exports){
require('../../modules/es6.object.get-prototype-of');
module.exports = require('../../modules/_core').Object.getPrototypeOf;
},{"../../modules/_core":35,"../../modules/es6.object.get-prototype-of":91}],27:[function(require,module,exports){
require('../../modules/es6.object.set-prototype-of');
module.exports = require('../../modules/_core').Object.setPrototypeOf;
},{"../../modules/_core":35,"../../modules/es6.object.set-prototype-of":92}],28:[function(require,module,exports){
require('../../modules/es6.symbol');
require('../../modules/es6.object.to-string');
require('../../modules/es7.symbol.async-iterator');
require('../../modules/es7.symbol.observable');
module.exports = require('../../modules/_core').Symbol;
},{"../../modules/_core":35,"../../modules/es6.object.to-string":93,"../../modules/es6.symbol":95,"../../modules/es7.symbol.async-iterator":96,"../../modules/es7.symbol.observable":97}],29:[function(require,module,exports){
require('../../modules/es6.string.iterator');
require('../../modules/web.dom.iterable');
module.exports = require('../../modules/_wks-ext').f('iterator');
},{"../../modules/_wks-ext":86,"../../modules/es6.string.iterator":94,"../../modules/web.dom.iterable":98}],30:[function(require,module,exports){
module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};
},{}],31:[function(require,module,exports){
module.exports = function(){ /* empty */ };
},{}],32:[function(require,module,exports){
var isObject = require('./_is-object');
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};
},{"./_is-object":51}],33:[function(require,module,exports){
// false -> Array#indexOf
// true  -> Array#includes
var toIObject = require('./_to-iobject')
  , toLength  = require('./_to-length')
  , toIndex   = require('./_to-index');
module.exports = function(IS_INCLUDES){
  return function($this, el, fromIndex){
    var O      = toIObject($this)
      , length = toLength(O.length)
      , index  = toIndex(fromIndex, length)
      , value;
    // Array#includes uses SameValueZero equality algorithm
    if(IS_INCLUDES && el != el)while(length > index){
      value = O[index++];
      if(value != value)return true;
    // Array#toIndex ignores holes, Array#includes - not
    } else for(;length > index; index++)if(IS_INCLUDES || index in O){
      if(O[index] === el)return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};
},{"./_to-index":78,"./_to-iobject":80,"./_to-length":81}],34:[function(require,module,exports){
var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};
},{}],35:[function(require,module,exports){
var core = module.exports = {version: '2.4.0'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
},{}],36:[function(require,module,exports){
// optional / simple context binding
var aFunction = require('./_a-function');
module.exports = function(fn, that, length){
  aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  }
  return function(/* ...args */){
    return fn.apply(that, arguments);
  };
};
},{"./_a-function":30}],37:[function(require,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};
},{}],38:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./_fails')(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./_fails":43}],39:[function(require,module,exports){
var isObject = require('./_is-object')
  , document = require('./_global').document
  // in old IE typeof document.createElement is 'object'
  , is = isObject(document) && isObject(document.createElement);
module.exports = function(it){
  return is ? document.createElement(it) : {};
};
},{"./_global":44,"./_is-object":51}],40:[function(require,module,exports){
// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');
},{}],41:[function(require,module,exports){
// all enumerable object keys, includes symbols
var getKeys = require('./_object-keys')
  , gOPS    = require('./_object-gops')
  , pIE     = require('./_object-pie');
module.exports = function(it){
  var result     = getKeys(it)
    , getSymbols = gOPS.f;
  if(getSymbols){
    var symbols = getSymbols(it)
      , isEnum  = pIE.f
      , i       = 0
      , key;
    while(symbols.length > i)if(isEnum.call(it, key = symbols[i++]))result.push(key);
  } return result;
};
},{"./_object-gops":65,"./_object-keys":68,"./_object-pie":69}],42:[function(require,module,exports){
var global    = require('./_global')
  , core      = require('./_core')
  , ctx       = require('./_ctx')
  , hide      = require('./_hide')
  , PROTOTYPE = 'prototype';

var $export = function(type, name, source){
  var IS_FORCED = type & $export.F
    , IS_GLOBAL = type & $export.G
    , IS_STATIC = type & $export.S
    , IS_PROTO  = type & $export.P
    , IS_BIND   = type & $export.B
    , IS_WRAP   = type & $export.W
    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
    , expProto  = exports[PROTOTYPE]
    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE]
    , key, own, out;
  if(IS_GLOBAL)source = name;
  for(key in source){
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    if(own && key in exports)continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? ctx(out, global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function(C){
      var F = function(a, b, c){
        if(this instanceof C){
          switch(arguments.length){
            case 0: return new C;
            case 1: return new C(a);
            case 2: return new C(a, b);
          } return new C(a, b, c);
        } return C.apply(this, arguments);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export proto methods to core.%CONSTRUCTOR%.methods.%NAME%
    if(IS_PROTO){
      (exports.virtual || (exports.virtual = {}))[key] = out;
      // export proto methods to core.%CONSTRUCTOR%.prototype.%NAME%
      if(type & $export.R && expProto && !expProto[key])hide(expProto, key, out);
    }
  }
};
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library` 
module.exports = $export;
},{"./_core":35,"./_ctx":36,"./_global":44,"./_hide":46}],43:[function(require,module,exports){
module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};
},{}],44:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
},{}],45:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function(it, key){
  return hasOwnProperty.call(it, key);
};
},{}],46:[function(require,module,exports){
var dP         = require('./_object-dp')
  , createDesc = require('./_property-desc');
module.exports = require('./_descriptors') ? function(object, key, value){
  return dP.f(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};
},{"./_descriptors":38,"./_object-dp":60,"./_property-desc":71}],47:[function(require,module,exports){
module.exports = require('./_global').document && document.documentElement;
},{"./_global":44}],48:[function(require,module,exports){
module.exports = !require('./_descriptors') && !require('./_fails')(function(){
  return Object.defineProperty(require('./_dom-create')('div'), 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./_descriptors":38,"./_dom-create":39,"./_fails":43}],49:[function(require,module,exports){
// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = require('./_cof');
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it){
  return cof(it) == 'String' ? it.split('') : Object(it);
};
},{"./_cof":34}],50:[function(require,module,exports){
// 7.2.2 IsArray(argument)
var cof = require('./_cof');
module.exports = Array.isArray || function isArray(arg){
  return cof(arg) == 'Array';
};
},{"./_cof":34}],51:[function(require,module,exports){
module.exports = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};
},{}],52:[function(require,module,exports){
'use strict';
var create         = require('./_object-create')
  , descriptor     = require('./_property-desc')
  , setToStringTag = require('./_set-to-string-tag')
  , IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
require('./_hide')(IteratorPrototype, require('./_wks')('iterator'), function(){ return this; });

module.exports = function(Constructor, NAME, next){
  Constructor.prototype = create(IteratorPrototype, {next: descriptor(1, next)});
  setToStringTag(Constructor, NAME + ' Iterator');
};
},{"./_hide":46,"./_object-create":59,"./_property-desc":71,"./_set-to-string-tag":74,"./_wks":87}],53:[function(require,module,exports){
'use strict';
var LIBRARY        = require('./_library')
  , $export        = require('./_export')
  , redefine       = require('./_redefine')
  , hide           = require('./_hide')
  , has            = require('./_has')
  , Iterators      = require('./_iterators')
  , $iterCreate    = require('./_iter-create')
  , setToStringTag = require('./_set-to-string-tag')
  , getPrototypeOf = require('./_object-gpo')
  , ITERATOR       = require('./_wks')('iterator')
  , BUGGY          = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
  , FF_ITERATOR    = '@@iterator'
  , KEYS           = 'keys'
  , VALUES         = 'values';

var returnThis = function(){ return this; };

module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED){
  $iterCreate(Constructor, NAME, next);
  var getMethod = function(kind){
    if(!BUGGY && kind in proto)return proto[kind];
    switch(kind){
      case KEYS: return function keys(){ return new Constructor(this, kind); };
      case VALUES: return function values(){ return new Constructor(this, kind); };
    } return function entries(){ return new Constructor(this, kind); };
  };
  var TAG        = NAME + ' Iterator'
    , DEF_VALUES = DEFAULT == VALUES
    , VALUES_BUG = false
    , proto      = Base.prototype
    , $native    = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT]
    , $default   = $native || getMethod(DEFAULT)
    , $entries   = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined
    , $anyNative = NAME == 'Array' ? proto.entries || $native : $native
    , methods, key, IteratorPrototype;
  // Fix native
  if($anyNative){
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base));
    if(IteratorPrototype !== Object.prototype){
      // Set @@toStringTag to native iterators
      setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if(!LIBRARY && !has(IteratorPrototype, ITERATOR))hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if(DEF_VALUES && $native && $native.name !== VALUES){
    VALUES_BUG = true;
    $default = function values(){ return $native.call(this); };
  }
  // Define iterator
  if((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])){
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG]  = returnThis;
  if(DEFAULT){
    methods = {
      values:  DEF_VALUES ? $default : getMethod(VALUES),
      keys:    IS_SET     ? $default : getMethod(KEYS),
      entries: $entries
    };
    if(FORCED)for(key in methods){
      if(!(key in proto))redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};
},{"./_export":42,"./_has":45,"./_hide":46,"./_iter-create":52,"./_iterators":55,"./_library":57,"./_object-gpo":66,"./_redefine":72,"./_set-to-string-tag":74,"./_wks":87}],54:[function(require,module,exports){
module.exports = function(done, value){
  return {value: value, done: !!done};
};
},{}],55:[function(require,module,exports){
module.exports = {};
},{}],56:[function(require,module,exports){
var getKeys   = require('./_object-keys')
  , toIObject = require('./_to-iobject');
module.exports = function(object, el){
  var O      = toIObject(object)
    , keys   = getKeys(O)
    , length = keys.length
    , index  = 0
    , key;
  while(length > index)if(O[key = keys[index++]] === el)return key;
};
},{"./_object-keys":68,"./_to-iobject":80}],57:[function(require,module,exports){
module.exports = true;
},{}],58:[function(require,module,exports){
var META     = require('./_uid')('meta')
  , isObject = require('./_is-object')
  , has      = require('./_has')
  , setDesc  = require('./_object-dp').f
  , id       = 0;
var isExtensible = Object.isExtensible || function(){
  return true;
};
var FREEZE = !require('./_fails')(function(){
  return isExtensible(Object.preventExtensions({}));
});
var setMeta = function(it){
  setDesc(it, META, {value: {
    i: 'O' + ++id, // object ID
    w: {}          // weak collections IDs
  }});
};
var fastKey = function(it, create){
  // return primitive with prefix
  if(!isObject(it))return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if(!has(it, META)){
    // can't set metadata to uncaught frozen object
    if(!isExtensible(it))return 'F';
    // not necessary to add metadata
    if(!create)return 'E';
    // add missing metadata
    setMeta(it);
  // return object ID
  } return it[META].i;
};
var getWeak = function(it, create){
  if(!has(it, META)){
    // can't set metadata to uncaught frozen object
    if(!isExtensible(it))return true;
    // not necessary to add metadata
    if(!create)return false;
    // add missing metadata
    setMeta(it);
  // return hash weak collections IDs
  } return it[META].w;
};
// add metadata on freeze-family methods calling
var onFreeze = function(it){
  if(FREEZE && meta.NEED && isExtensible(it) && !has(it, META))setMeta(it);
  return it;
};
var meta = module.exports = {
  KEY:      META,
  NEED:     false,
  fastKey:  fastKey,
  getWeak:  getWeak,
  onFreeze: onFreeze
};
},{"./_fails":43,"./_has":45,"./_is-object":51,"./_object-dp":60,"./_uid":84}],59:[function(require,module,exports){
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject    = require('./_an-object')
  , dPs         = require('./_object-dps')
  , enumBugKeys = require('./_enum-bug-keys')
  , IE_PROTO    = require('./_shared-key')('IE_PROTO')
  , Empty       = function(){ /* empty */ }
  , PROTOTYPE   = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function(){
  // Thrash, waste and sodomy: IE GC bug
  var iframe = require('./_dom-create')('iframe')
    , i      = enumBugKeys.length
    , lt     = '<'
    , gt     = '>'
    , iframeDocument;
  iframe.style.display = 'none';
  require('./_html').appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while(i--)delete createDict[PROTOTYPE][enumBugKeys[i]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties){
  var result;
  if(O !== null){
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty;
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};

},{"./_an-object":32,"./_dom-create":39,"./_enum-bug-keys":40,"./_html":47,"./_object-dps":61,"./_shared-key":75}],60:[function(require,module,exports){
var anObject       = require('./_an-object')
  , IE8_DOM_DEFINE = require('./_ie8-dom-define')
  , toPrimitive    = require('./_to-primitive')
  , dP             = Object.defineProperty;

exports.f = require('./_descriptors') ? Object.defineProperty : function defineProperty(O, P, Attributes){
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if(IE8_DOM_DEFINE)try {
    return dP(O, P, Attributes);
  } catch(e){ /* empty */ }
  if('get' in Attributes || 'set' in Attributes)throw TypeError('Accessors not supported!');
  if('value' in Attributes)O[P] = Attributes.value;
  return O;
};
},{"./_an-object":32,"./_descriptors":38,"./_ie8-dom-define":48,"./_to-primitive":83}],61:[function(require,module,exports){
var dP       = require('./_object-dp')
  , anObject = require('./_an-object')
  , getKeys  = require('./_object-keys');

module.exports = require('./_descriptors') ? Object.defineProperties : function defineProperties(O, Properties){
  anObject(O);
  var keys   = getKeys(Properties)
    , length = keys.length
    , i = 0
    , P;
  while(length > i)dP.f(O, P = keys[i++], Properties[P]);
  return O;
};
},{"./_an-object":32,"./_descriptors":38,"./_object-dp":60,"./_object-keys":68}],62:[function(require,module,exports){
var pIE            = require('./_object-pie')
  , createDesc     = require('./_property-desc')
  , toIObject      = require('./_to-iobject')
  , toPrimitive    = require('./_to-primitive')
  , has            = require('./_has')
  , IE8_DOM_DEFINE = require('./_ie8-dom-define')
  , gOPD           = Object.getOwnPropertyDescriptor;

exports.f = require('./_descriptors') ? gOPD : function getOwnPropertyDescriptor(O, P){
  O = toIObject(O);
  P = toPrimitive(P, true);
  if(IE8_DOM_DEFINE)try {
    return gOPD(O, P);
  } catch(e){ /* empty */ }
  if(has(O, P))return createDesc(!pIE.f.call(O, P), O[P]);
};
},{"./_descriptors":38,"./_has":45,"./_ie8-dom-define":48,"./_object-pie":69,"./_property-desc":71,"./_to-iobject":80,"./_to-primitive":83}],63:[function(require,module,exports){
// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIObject = require('./_to-iobject')
  , gOPN      = require('./_object-gopn').f
  , toString  = {}.toString;

var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function(it){
  try {
    return gOPN(it);
  } catch(e){
    return windowNames.slice();
  }
};

module.exports.f = function getOwnPropertyNames(it){
  return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
};

},{"./_object-gopn":64,"./_to-iobject":80}],64:[function(require,module,exports){
// 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
var $keys      = require('./_object-keys-internal')
  , hiddenKeys = require('./_enum-bug-keys').concat('length', 'prototype');

exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O){
  return $keys(O, hiddenKeys);
};
},{"./_enum-bug-keys":40,"./_object-keys-internal":67}],65:[function(require,module,exports){
exports.f = Object.getOwnPropertySymbols;
},{}],66:[function(require,module,exports){
// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has         = require('./_has')
  , toObject    = require('./_to-object')
  , IE_PROTO    = require('./_shared-key')('IE_PROTO')
  , ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function(O){
  O = toObject(O);
  if(has(O, IE_PROTO))return O[IE_PROTO];
  if(typeof O.constructor == 'function' && O instanceof O.constructor){
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};
},{"./_has":45,"./_shared-key":75,"./_to-object":82}],67:[function(require,module,exports){
var has          = require('./_has')
  , toIObject    = require('./_to-iobject')
  , arrayIndexOf = require('./_array-includes')(false)
  , IE_PROTO     = require('./_shared-key')('IE_PROTO');

module.exports = function(object, names){
  var O      = toIObject(object)
    , i      = 0
    , result = []
    , key;
  for(key in O)if(key != IE_PROTO)has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while(names.length > i)if(has(O, key = names[i++])){
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};
},{"./_array-includes":33,"./_has":45,"./_shared-key":75,"./_to-iobject":80}],68:[function(require,module,exports){
// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys       = require('./_object-keys-internal')
  , enumBugKeys = require('./_enum-bug-keys');

module.exports = Object.keys || function keys(O){
  return $keys(O, enumBugKeys);
};
},{"./_enum-bug-keys":40,"./_object-keys-internal":67}],69:[function(require,module,exports){
exports.f = {}.propertyIsEnumerable;
},{}],70:[function(require,module,exports){
// most Object methods by ES6 should accept primitives
var $export = require('./_export')
  , core    = require('./_core')
  , fails   = require('./_fails');
module.exports = function(KEY, exec){
  var fn  = (core.Object || {})[KEY] || Object[KEY]
    , exp = {};
  exp[KEY] = exec(fn);
  $export($export.S + $export.F * fails(function(){ fn(1); }), 'Object', exp);
};
},{"./_core":35,"./_export":42,"./_fails":43}],71:[function(require,module,exports){
module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};
},{}],72:[function(require,module,exports){
module.exports = require('./_hide');
},{"./_hide":46}],73:[function(require,module,exports){
// Works with __proto__ only. Old v8 can't work with null proto objects.
/* eslint-disable no-proto */
var isObject = require('./_is-object')
  , anObject = require('./_an-object');
var check = function(O, proto){
  anObject(O);
  if(!isObject(proto) && proto !== null)throw TypeError(proto + ": can't set as prototype!");
};
module.exports = {
  set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line
    function(test, buggy, set){
      try {
        set = require('./_ctx')(Function.call, require('./_object-gopd').f(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch(e){ buggy = true; }
      return function setPrototypeOf(O, proto){
        check(O, proto);
        if(buggy)O.__proto__ = proto;
        else set(O, proto);
        return O;
      };
    }({}, false) : undefined),
  check: check
};
},{"./_an-object":32,"./_ctx":36,"./_is-object":51,"./_object-gopd":62}],74:[function(require,module,exports){
var def = require('./_object-dp').f
  , has = require('./_has')
  , TAG = require('./_wks')('toStringTag');

module.exports = function(it, tag, stat){
  if(it && !has(it = stat ? it : it.prototype, TAG))def(it, TAG, {configurable: true, value: tag});
};
},{"./_has":45,"./_object-dp":60,"./_wks":87}],75:[function(require,module,exports){
var shared = require('./_shared')('keys')
  , uid    = require('./_uid');
module.exports = function(key){
  return shared[key] || (shared[key] = uid(key));
};
},{"./_shared":76,"./_uid":84}],76:[function(require,module,exports){
var global = require('./_global')
  , SHARED = '__core-js_shared__'
  , store  = global[SHARED] || (global[SHARED] = {});
module.exports = function(key){
  return store[key] || (store[key] = {});
};
},{"./_global":44}],77:[function(require,module,exports){
var toInteger = require('./_to-integer')
  , defined   = require('./_defined');
// true  -> String#at
// false -> String#codePointAt
module.exports = function(TO_STRING){
  return function(that, pos){
    var s = String(defined(that))
      , i = toInteger(pos)
      , l = s.length
      , a, b;
    if(i < 0 || i >= l)return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};
},{"./_defined":37,"./_to-integer":79}],78:[function(require,module,exports){
var toInteger = require('./_to-integer')
  , max       = Math.max
  , min       = Math.min;
module.exports = function(index, length){
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};
},{"./_to-integer":79}],79:[function(require,module,exports){
// 7.1.4 ToInteger
var ceil  = Math.ceil
  , floor = Math.floor;
module.exports = function(it){
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};
},{}],80:[function(require,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = require('./_iobject')
  , defined = require('./_defined');
module.exports = function(it){
  return IObject(defined(it));
};
},{"./_defined":37,"./_iobject":49}],81:[function(require,module,exports){
// 7.1.15 ToLength
var toInteger = require('./_to-integer')
  , min       = Math.min;
module.exports = function(it){
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};
},{"./_to-integer":79}],82:[function(require,module,exports){
// 7.1.13 ToObject(argument)
var defined = require('./_defined');
module.exports = function(it){
  return Object(defined(it));
};
},{"./_defined":37}],83:[function(require,module,exports){
// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = require('./_is-object');
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function(it, S){
  if(!isObject(it))return it;
  var fn, val;
  if(S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  if(typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it)))return val;
  if(!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  throw TypeError("Can't convert object to primitive value");
};
},{"./_is-object":51}],84:[function(require,module,exports){
var id = 0
  , px = Math.random();
module.exports = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};
},{}],85:[function(require,module,exports){
var global         = require('./_global')
  , core           = require('./_core')
  , LIBRARY        = require('./_library')
  , wksExt         = require('./_wks-ext')
  , defineProperty = require('./_object-dp').f;
module.exports = function(name){
  var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
  if(name.charAt(0) != '_' && !(name in $Symbol))defineProperty($Symbol, name, {value: wksExt.f(name)});
};
},{"./_core":35,"./_global":44,"./_library":57,"./_object-dp":60,"./_wks-ext":86}],86:[function(require,module,exports){
exports.f = require('./_wks');
},{"./_wks":87}],87:[function(require,module,exports){
var store      = require('./_shared')('wks')
  , uid        = require('./_uid')
  , Symbol     = require('./_global').Symbol
  , USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function(name){
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;
},{"./_global":44,"./_shared":76,"./_uid":84}],88:[function(require,module,exports){
'use strict';
var addToUnscopables = require('./_add-to-unscopables')
  , step             = require('./_iter-step')
  , Iterators        = require('./_iterators')
  , toIObject        = require('./_to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = require('./_iter-define')(Array, 'Array', function(iterated, kind){
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , kind  = this._k
    , index = this._i++;
  if(!O || index >= O.length){
    this._t = undefined;
    return step(1);
  }
  if(kind == 'keys'  )return step(0, index);
  if(kind == 'values')return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');
},{"./_add-to-unscopables":31,"./_iter-define":53,"./_iter-step":54,"./_iterators":55,"./_to-iobject":80}],89:[function(require,module,exports){
var $export = require('./_export')
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
$export($export.S, 'Object', {create: require('./_object-create')});
},{"./_export":42,"./_object-create":59}],90:[function(require,module,exports){
var $export = require('./_export');
// 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
$export($export.S + $export.F * !require('./_descriptors'), 'Object', {defineProperty: require('./_object-dp').f});
},{"./_descriptors":38,"./_export":42,"./_object-dp":60}],91:[function(require,module,exports){
// 19.1.2.9 Object.getPrototypeOf(O)
var toObject        = require('./_to-object')
  , $getPrototypeOf = require('./_object-gpo');

require('./_object-sap')('getPrototypeOf', function(){
  return function getPrototypeOf(it){
    return $getPrototypeOf(toObject(it));
  };
});
},{"./_object-gpo":66,"./_object-sap":70,"./_to-object":82}],92:[function(require,module,exports){
// 19.1.3.19 Object.setPrototypeOf(O, proto)
var $export = require('./_export');
$export($export.S, 'Object', {setPrototypeOf: require('./_set-proto').set});
},{"./_export":42,"./_set-proto":73}],93:[function(require,module,exports){

},{}],94:[function(require,module,exports){
'use strict';
var $at  = require('./_string-at')(true);

// 21.1.3.27 String.prototype[@@iterator]()
require('./_iter-define')(String, 'String', function(iterated){
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , index = this._i
    , point;
  if(index >= O.length)return {value: undefined, done: true};
  point = $at(O, index);
  this._i += point.length;
  return {value: point, done: false};
});
},{"./_iter-define":53,"./_string-at":77}],95:[function(require,module,exports){
'use strict';
// ECMAScript 6 symbols shim
var global         = require('./_global')
  , has            = require('./_has')
  , DESCRIPTORS    = require('./_descriptors')
  , $export        = require('./_export')
  , redefine       = require('./_redefine')
  , META           = require('./_meta').KEY
  , $fails         = require('./_fails')
  , shared         = require('./_shared')
  , setToStringTag = require('./_set-to-string-tag')
  , uid            = require('./_uid')
  , wks            = require('./_wks')
  , wksExt         = require('./_wks-ext')
  , wksDefine      = require('./_wks-define')
  , keyOf          = require('./_keyof')
  , enumKeys       = require('./_enum-keys')
  , isArray        = require('./_is-array')
  , anObject       = require('./_an-object')
  , toIObject      = require('./_to-iobject')
  , toPrimitive    = require('./_to-primitive')
  , createDesc     = require('./_property-desc')
  , _create        = require('./_object-create')
  , gOPNExt        = require('./_object-gopn-ext')
  , $GOPD          = require('./_object-gopd')
  , $DP            = require('./_object-dp')
  , $keys          = require('./_object-keys')
  , gOPD           = $GOPD.f
  , dP             = $DP.f
  , gOPN           = gOPNExt.f
  , $Symbol        = global.Symbol
  , $JSON          = global.JSON
  , _stringify     = $JSON && $JSON.stringify
  , PROTOTYPE      = 'prototype'
  , HIDDEN         = wks('_hidden')
  , TO_PRIMITIVE   = wks('toPrimitive')
  , isEnum         = {}.propertyIsEnumerable
  , SymbolRegistry = shared('symbol-registry')
  , AllSymbols     = shared('symbols')
  , OPSymbols      = shared('op-symbols')
  , ObjectProto    = Object[PROTOTYPE]
  , USE_NATIVE     = typeof $Symbol == 'function'
  , QObject        = global.QObject;
// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = DESCRIPTORS && $fails(function(){
  return _create(dP({}, 'a', {
    get: function(){ return dP(this, 'a', {value: 7}).a; }
  })).a != 7;
}) ? function(it, key, D){
  var protoDesc = gOPD(ObjectProto, key);
  if(protoDesc)delete ObjectProto[key];
  dP(it, key, D);
  if(protoDesc && it !== ObjectProto)dP(ObjectProto, key, protoDesc);
} : dP;

var wrap = function(tag){
  var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
  sym._k = tag;
  return sym;
};

var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function(it){
  return typeof it == 'symbol';
} : function(it){
  return it instanceof $Symbol;
};

var $defineProperty = function defineProperty(it, key, D){
  if(it === ObjectProto)$defineProperty(OPSymbols, key, D);
  anObject(it);
  key = toPrimitive(key, true);
  anObject(D);
  if(has(AllSymbols, key)){
    if(!D.enumerable){
      if(!has(it, HIDDEN))dP(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if(has(it, HIDDEN) && it[HIDDEN][key])it[HIDDEN][key] = false;
      D = _create(D, {enumerable: createDesc(0, false)});
    } return setSymbolDesc(it, key, D);
  } return dP(it, key, D);
};
var $defineProperties = function defineProperties(it, P){
  anObject(it);
  var keys = enumKeys(P = toIObject(P))
    , i    = 0
    , l = keys.length
    , key;
  while(l > i)$defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P){
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key){
  var E = isEnum.call(this, key = toPrimitive(key, true));
  if(this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))return false;
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key){
  it  = toIObject(it);
  key = toPrimitive(key, true);
  if(it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))return;
  var D = gOPD(it, key);
  if(D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key]))D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it){
  var names  = gOPN(toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i){
    if(!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META)result.push(key);
  } return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it){
  var IS_OP  = it === ObjectProto
    , names  = gOPN(IS_OP ? OPSymbols : toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i){
    if(has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true))result.push(AllSymbols[key]);
  } return result;
};

// 19.4.1.1 Symbol([description])
if(!USE_NATIVE){
  $Symbol = function Symbol(){
    if(this instanceof $Symbol)throw TypeError('Symbol is not a constructor!');
    var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
    var $set = function(value){
      if(this === ObjectProto)$set.call(OPSymbols, value);
      if(has(this, HIDDEN) && has(this[HIDDEN], tag))this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    };
    if(DESCRIPTORS && setter)setSymbolDesc(ObjectProto, tag, {configurable: true, set: $set});
    return wrap(tag);
  };
  redefine($Symbol[PROTOTYPE], 'toString', function toString(){
    return this._k;
  });

  $GOPD.f = $getOwnPropertyDescriptor;
  $DP.f   = $defineProperty;
  require('./_object-gopn').f = gOPNExt.f = $getOwnPropertyNames;
  require('./_object-pie').f  = $propertyIsEnumerable;
  require('./_object-gops').f = $getOwnPropertySymbols;

  if(DESCRIPTORS && !require('./_library')){
    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }

  wksExt.f = function(name){
    return wrap(wks(name));
  }
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, {Symbol: $Symbol});

for(var symbols = (
  // 19.4.2.2, 19.4.2.3, 19.4.2.4, 19.4.2.6, 19.4.2.8, 19.4.2.9, 19.4.2.10, 19.4.2.11, 19.4.2.12, 19.4.2.13, 19.4.2.14
  'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'
).split(','), i = 0; symbols.length > i; )wks(symbols[i++]);

for(var symbols = $keys(wks.store), i = 0; symbols.length > i; )wksDefine(symbols[i++]);

$export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
  // 19.4.2.1 Symbol.for(key)
  'for': function(key){
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(key){
    if(isSymbol(key))return keyOf(SymbolRegistry, key);
    throw TypeError(key + ' is not a symbol!');
  },
  useSetter: function(){ setter = true; },
  useSimple: function(){ setter = false; }
});

$export($export.S + $export.F * !USE_NATIVE, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 24.3.2 JSON.stringify(value [, replacer [, space]])
$JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function(){
  var S = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  // WebKit converts symbol values to JSON as null
  // V8 throws on boxed symbols
  return _stringify([S]) != '[null]' || _stringify({a: S}) != '{}' || _stringify(Object(S)) != '{}';
})), 'JSON', {
  stringify: function stringify(it){
    if(it === undefined || isSymbol(it))return; // IE8 returns string on undefined
    var args = [it]
      , i    = 1
      , replacer, $replacer;
    while(arguments.length > i)args.push(arguments[i++]);
    replacer = args[1];
    if(typeof replacer == 'function')$replacer = replacer;
    if($replacer || !isArray(replacer))replacer = function(key, value){
      if($replacer)value = $replacer.call(this, key, value);
      if(!isSymbol(value))return value;
    };
    args[1] = replacer;
    return _stringify.apply($JSON, args);
  }
});

// 19.4.3.4 Symbol.prototype[@@toPrimitive](hint)
$Symbol[PROTOTYPE][TO_PRIMITIVE] || require('./_hide')($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
// 19.4.3.5 Symbol.prototype[@@toStringTag]
setToStringTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setToStringTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setToStringTag(global.JSON, 'JSON', true);
},{"./_an-object":32,"./_descriptors":38,"./_enum-keys":41,"./_export":42,"./_fails":43,"./_global":44,"./_has":45,"./_hide":46,"./_is-array":50,"./_keyof":56,"./_library":57,"./_meta":58,"./_object-create":59,"./_object-dp":60,"./_object-gopd":62,"./_object-gopn":64,"./_object-gopn-ext":63,"./_object-gops":65,"./_object-keys":68,"./_object-pie":69,"./_property-desc":71,"./_redefine":72,"./_set-to-string-tag":74,"./_shared":76,"./_to-iobject":80,"./_to-primitive":83,"./_uid":84,"./_wks":87,"./_wks-define":85,"./_wks-ext":86}],96:[function(require,module,exports){
require('./_wks-define')('asyncIterator');
},{"./_wks-define":85}],97:[function(require,module,exports){
require('./_wks-define')('observable');
},{"./_wks-define":85}],98:[function(require,module,exports){
require('./es6.array.iterator');
var global        = require('./_global')
  , hide          = require('./_hide')
  , Iterators     = require('./_iterators')
  , TO_STRING_TAG = require('./_wks')('toStringTag');

for(var collections = ['NodeList', 'DOMTokenList', 'MediaList', 'StyleSheetList', 'CSSRuleList'], i = 0; i < 5; i++){
  var NAME       = collections[i]
    , Collection = global[NAME]
    , proto      = Collection && Collection.prototype;
  if(proto && !proto[TO_STRING_TAG])hide(proto, TO_STRING_TAG, NAME);
  Iterators[NAME] = Iterators.Array;
}
},{"./_global":44,"./_hide":46,"./_iterators":55,"./_wks":87,"./es6.array.iterator":88}],"jsw-logger":[function(require,module,exports){
'use strict';

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* global _ */

var BaseLogger = function () {
    function BaseLogger() {
        (0, _classCallCheck3.default)(this, BaseLogger);

        // Fallback functions
        if (!console.debug) {
            console.debug = console.log;
        }
        if (!console.info) {
            console.info = console.log;
        }
    }

    (0, _createClass3.default)(BaseLogger, [{
        key: 'silly',
        value: function silly(msg) {
            console.log(msg);
        }
    }, {
        key: 'input',
        value: function input(msg) {
            console.log(msg);
        }
    }, {
        key: 'log',
        value: function log(msg) {
            console.log(msg);
        }
    }, {
        key: 'verbose',
        value: function verbose(msg) {
            console.debug(msg);
        }
    }, {
        key: 'prompt',
        value: function prompt(msg) {
            console.debug(msg);
        }
    }, {
        key: 'debug',
        value: function debug(msg) {
            console.debug(msg);
        }
    }, {
        key: 'info',
        value: function info(msg) {
            console.info(msg);
        }
    }, {
        key: 'data',
        value: function data(msg) {
            console.info(msg);
        }
    }, {
        key: 'help',
        value: function help(msg) {
            console.warn(msg);
        }
    }, {
        key: 'warn',
        value: function warn(msg) {
            console.warn(msg);
        }
    }, {
        key: 'error',
        value: function error(msg) {
            console.error(msg);
        }
    }]);
    return BaseLogger;
}();

var Logger = require('./lib/JSW-Logger')(BaseLogger, null, null, null, _, true);

module.exports = Logger;

},{"./lib/JSW-Logger":12,"babel-runtime/helpers/classCallCheck":19,"babel-runtime/helpers/createClass":20}],"mongo-portable":[function(require,module,exports){
"use strict";

/* global _ */

var Logger = require("jsw-logger");

var EventEmitter = require("./lib/utils/EventEmitter")(Logger, _);
var BinaryParserBuffer = require("./lib/BinaryParserBuffer")(Logger);
var BinaryParser = require("./lib/BinaryParser")(BinaryParserBuffer, Logger);
var ObjectId = require("./lib/ObjectId")(BinaryParser, Logger, _);
var SelectorMatcher = require("./lib/SelectorMatcher")(Logger, _);
var Selector = require("./lib/Selector")(ObjectId, SelectorMatcher, Logger, _);
var Cursor = require("./lib/Cursor")(Selector, Logger, _);
var Aggregation = require("./lib/Aggregation")(Selector, Cursor, Logger, _);
var Collection = require("./lib/Collection")(Aggregation, Cursor, Selector, SelectorMatcher, ObjectId, EventEmitter, Logger, _);
var MongoPortable = require("./lib/MongoPortable")(Collection, ObjectId, EventEmitter, Logger, _);

module.exports = MongoPortable;

},{"./lib/Aggregation":1,"./lib/BinaryParser":2,"./lib/BinaryParserBuffer":3,"./lib/Collection":4,"./lib/Cursor":5,"./lib/MongoPortable":6,"./lib/ObjectId":7,"./lib/Selector":8,"./lib/SelectorMatcher":9,"./lib/utils/EventEmitter":10,"jsw-logger":"jsw-logger"}]},{},["jsw-logger","mongo-portable"]);
