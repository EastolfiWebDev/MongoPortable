"use strict";
/* tslint:disable:no-bitwise */
Object.defineProperty(exports, "__esModule", { value: true });
var jsw_logger_1 = require("jsw-logger");
var _ = require("lodash");
/***
 * BinaryParserBuffer
 *
 * @module BinaryParserBuffer
 * @since 0.0.1
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 *
 * @classdesc BinaryParserBuffer - based on ({@link http://jsfromhell.com/classes/binary-parser Binary Parser}) by Jonas Raoni Soares Silva
 */
var BinaryParserBuffer = /** @class */ (function () {
    function BinaryParserBuffer(bigEndian, buffer) {
        this.buffer = [];
        this.logger = jsw_logger_1.JSWLogger.instance;
        this.bigEndian = bigEndian || 0;
        if (_.isString(buffer)) {
            this.setBuffer(buffer);
        }
        else {
            this.setBuffer("" + buffer);
        }
    }
    BinaryParserBuffer.prototype.setBuffer = function (data) {
        var l;
        var i;
        var b;
        if (data) {
            i = l = data.length;
            b = this.buffer = new Array(l);
            // tslint:disable-next-line:semicolon
            for (; i; b[l - i] = data.charCodeAt(--i)) {
                ;
            }
            if (this.bigEndian && b.reverse()) {
                return;
            }
        }
    };
    BinaryParserBuffer.prototype.hasNeededBits = function (neededBits) {
        return this.buffer.length >= -(-neededBits >> 3);
    };
    BinaryParserBuffer.prototype.checkBuffer = function (neededBits) {
        if (!this.hasNeededBits(neededBits)) {
            this.logger.throw("checkBuffer::missing bytes");
        }
    };
    BinaryParserBuffer.prototype.readBits = function (start, length) {
        // shl fix: Henri Torgemane ~1996 (compressed by Jonas Raoni)
        function shl(a, b) {
            // tslint:disable-next-line:semicolon no-conditional-assignment
            for (; b--; a = ((a %= 0x7fffffff + 1) & 0x40000000) === 0x40000000 ? a * 2 : (a - 0x40000000) * 2 + 0x7fffffff + 1) {
                ;
            }
            return a;
        }
        if (start < 0 || length <= 0) {
            return 0;
        }
        this.checkBuffer(start + length);
        var offsetLeft;
        var offsetRight = start % 8;
        var curByte = this.buffer.length - (start >> 3) - 1;
        var lastByte = this.buffer.length + (-(start + length) >> 3);
        var diff = curByte - lastByte;
        // tslint:disable-next-line:no-conditional-assignment
        var sum = ((this.buffer[curByte] >> offsetRight) & ((1 << (diff ? 8 - offsetRight : length)) - 1)) + (diff && (offsetLeft = (start + length) % 8) ? (this.buffer[lastByte++] & ((1 << offsetLeft) - 1)) << (diff-- << 3) - offsetRight : 0);
        // tslint:disable-next-line:semicolon
        for (; diff; sum += shl(this.buffer[lastByte++], (diff-- << 3) - offsetRight)) {
            ;
        }
        return sum;
    };
    return BinaryParserBuffer;
}());
exports.BinaryParserBuffer = BinaryParserBuffer;
//# sourceMappingURL=BinaryParserBuffer.js.map