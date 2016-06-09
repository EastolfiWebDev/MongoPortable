/**
 * @file BinaryParserBuffer.js - based on ({@link http://jsfromhell.com/classes/binary-parser Binary Parser}) by Jonas Raoni Soares Silva
 * @version 1.0.0
 * @ignore
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

var Logger = require("jsw-logger");

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
class BinaryParserBuffer {
    constructor(bigEndian, buffer) {
        logger = Logger.instance;
        
        this.bigEndian = bigEndian || 0;
        this.buffer = [];
        this.setBuffer(buffer);
    }
    
    setBuffer(data) {
        var l, i, b;
        
        if (data) {
            i = l = data.length;
            b = this.buffer = new Array(l);
            
            for (; i; b[l - i] = data.charCodeAt(--i));
            
            this.bigEndian && b.reverse();
        }
    }
    
    hasNeededBits(neededBits) {
        return this.buffer.length >= -(-neededBits >> 3);
    }
    
    checkBuffer(neededBits) {
        if (!this.hasNeededBits(neededBits)) {
            logger.throw("checkBuffer::missing bytes");
        }
    }
    
    readBits(start, length) {
        //shl fix: Henri Torgemane ~1996 (compressed by Jonas Raoni)
    
        function shl (a, b) {
            for (; b--; a = ((a %= 0x7fffffff + 1) & 0x40000000) == 0x40000000 ? a * 2 : (a - 0x40000000) * 2 + 0x7fffffff + 1);
            
            return a;
        }
    
        if (start < 0 || length <= 0) {
            return 0;
        }
    
        this.checkBuffer(start + length);
    
        var offsetLeft,
            offsetRight = start % 8,
            curByte = this.buffer.length - ( start >> 3 ) - 1,
            lastByte = this.buffer.length + ( -( start + length ) >> 3 ),
            diff = curByte - lastByte,
            sum = ((this.buffer[ curByte ] >> offsetRight) & ((1 << (diff ? 8 - offsetRight : length)) - 1)) + (diff && (offsetLeft = (start + length) % 8) ? (this.buffer[lastByte++] & ((1 << offsetLeft) - 1)) << (diff-- << 3) - offsetRight : 0);
    
        for(; diff; sum += shl(this.buffer[lastByte++], (diff-- << 3) - offsetRight));
    
        return sum;
    }
}


module.exports = BinaryParserBuffer;