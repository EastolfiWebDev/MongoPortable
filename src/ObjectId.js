/**
 * @file ObjectId.js - based on Monglo#ObjectId ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var _ = require("lodash"),
    Logger = require("./utils/Logger"),
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
var isValidHexRegExp = function(str, len = 24) {
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
class ObjectId {
    constructor(id, _hex) {
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
                        let _id = ObjectId.createFromHexString(id);
                        this.id = _id.id;
                    }  else if (id.length === 12) {
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
    toHexString() {
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
    toString() {
        return this.toHexString();
    }
    
    /**
     * Alias for {@link ObjectId#toHexString}
     * 
     * @method Cursor#next
     */
    toJSON() {
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
    getInc() {
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
    generate(time) {
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
    equals(otherID) {
        var id = (otherID instanceof ObjectId || otherID.toHexString) ? otherID.id : ObjectId.createFromHexString(otherID).id;
    
        return this.id === id;
    }
    
    /**
     * Returns the generation time in seconds that this ID was generated.
     *
     * @method ObjectId#getTimestamp
     * 
     * @returns {Number} Number of seconds in the timestamp part of the 12 byte id.
     */
    getTimestamp() {
        var timestamp = new Date();
        
        timestamp.setTime(Math.floor(BinaryParser.decodeInt(this.id.substring(0, 4), 32, true, true)) * 1000);
        
        return timestamp;
    }
    
    
    /* GETTER - SETTER */
    get generationTime() {
        return Math.floor(BinaryParser.decodeInt(this.id.substring(0, 4), 32, true, true));
    }
    
    set generationTime(value) {
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
    static createFromHexString(hexString) {
        // Throw an error if it's not a valid setup
        if(_.isNil(hexString) || hexString.length != 24) {
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
    static createFromTime(time) {
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
    static createPk() {
        return new ObjectId();
    }
}

/**
 * @ignore
 */
ObjectId.index = 0;

module.exports = ObjectId;