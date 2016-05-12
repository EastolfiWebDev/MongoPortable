"use strict";

/**
 * @file ObjectId.js - based on Monglo#ObjectId ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 0.0.1
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var Logger = require("./utils/Logger"),
    BinaryParser = require("./BinaryParser");

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
var isValidHexRegExp = function isValidHexRegExp(str, len) {
    if (len == null) len = 24;

    if (str.length === len && checkForHexRegExp.test(str)) return true;

    return false;
};

var _ = require("lodash");

module.exports = ObjectId;

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
function ObjectId(id, _hex) {
    if (!(this instanceof ObjectId)) return new ObjectId(id, _hex);

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
                // Valid Hex
                if (isValidHexRegExp(id)) {
                    this.id = ObjectId.createFromHexString(id);
                }
                // Valid Byte String
                else if (id.length === 12) {
                        this.id = id;
                    } else {
                        throw new Error("Value passed in is not a valid 24 character hex string");
                    }
            } else {
                throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
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

// Is this a bad Idea?
//ObjectId.prototype.__proto__.toString = function() { return '[ObjectId Object]'; };

/**
 * Return the ObjectId id as a 24 byte hex string representation
 * 
 * @method ObjectId#toHexString
 *
 * @returns {String} The 24 byte hex string representation.
 */
ObjectId.prototype.toHexString = function () {
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
};

/**
 * Update the ObjectId index used in generating new ObjectId's on the driver
 * 
 * @method ObjectId#get_inc
 * @private
 *
 * @returns {Number} Next index value.
 */
ObjectId.prototype.get_inc = function () {
    return ObjectId.index = (ObjectId.index + 1) % 0xFFFFFF;
};

/**
 * Update the ObjectId index used in generating new ObjectId's on the driver
 *
 * @method ObjectId#getInc
 * @private
 * 
 * @return {Number} Next index value.
 */
ObjectId.prototype.getInc = function () {
    return this.get_inc();
};

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
ObjectId.prototype.generate = function (time) {
    if (_.isNil(time) || !_.isNumber(time)) {
        time = parseInt(Date.now() / 1000, 10);
    }

    /* for time-based ObjectId the bytes following the time will be zeroed */
    var time4Bytes = BinaryParser.encodeInt(time, 32, true, true);
    var machine3Bytes = BinaryParser.encodeInt(MACHINE_ID, 24, false);
    var pid2Bytes = BinaryParser.fromShort(typeof process === 'undefined' ? Math.floor(Math.random() * 100000) : process.pid);
    var index3Bytes = BinaryParser.encodeInt(this.get_inc(), 24, false, true);

    return time4Bytes + machine3Bytes + pid2Bytes + index3Bytes;
};

/**
 * Converts the id into a 24 byte hex string for printing
 *
 * @method ObjectId#toString
 * @private
 * 
 * @return {String} The 24 byte hex string representation.
 */
ObjectId.prototype.toString = function () {
    return this.toHexString();
};

/**
 * Alias for {@link ObjectId#toString}
 * @alias ObjectId#toString
 *
 * @method ObjectId#inspect
 * @private
 */
ObjectId.prototype.inspect = ObjectId.prototype.toString;

/**
 * Alias for {@link ObjectId#toHexString}
 * @alias ObjectId#toHexString
 *
 * @method ObjectId#toJSON
 * @private
 */
ObjectId.prototype.toJSON = function () {
    return this.toHexString();
};

/**
 * Compares the equality of this ObjectId with [otherID].
 *
 * @method ObjectId#equals
 * 
 * @param {Object} otherID - ObjectId instance to compare against.
 * 
 * @returns {Boolean} The result of comparing two ObjectId's
 */
ObjectId.prototype.equals = function (otherID) {
    var id = otherID instanceof ObjectId || otherID.toHexString ? otherID.id : ObjectId.createFromHexString(otherID).id;

    return this.id === id;
};

/**
 * Returns the generation time in seconds that this ID was generated.
 *
 * @method ObjectId#getTimestamp
 * 
 * @returns {Number} Number of seconds in the timestamp part of the 12 byte id.
 */
ObjectId.prototype.getTimestamp = function () {
    var timestamp = new Date();

    timestamp.setTime(Math.floor(BinaryParser.decodeInt(this.id.substring(0, 4), 32, true, true)) * 1000);

    return timestamp;
};

/**
 * @ignore
 */
ObjectId.index = 0;

/**
 * Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out. Used for comparisons or sorting the ObjectId.
 *
 * @method ObjectId#createPk
 * 
 * @param {Number} time an integer number representing a number of seconds.
 * @return {ObjectId} return the created ObjectId
 */
ObjectId.createPk = function () {
    return new ObjectId();
};

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
ObjectId.createFromTime = function (time) {
    var id = BinaryParser.encodeInt(time, 32, true, true) + BinaryParser.encodeInt(0, 64, true, true);

    return new ObjectId(id);
};

/**
 * Creates an ObjectId from a hex string representation of an ObjectId.
 *
 * @method ObjectId#createFromHexString
 * 
 * @param {String} hexString - An ObjectId 24 byte hexstring representation.
 * 
 * @returns {ObjectId} The created ObjectId
 */
ObjectId.createFromHexString = function (hexString) {
    // Throw an error if it's not a valid setup
    if (typeof hexString === 'undefined' || hexString != null && hexString.length != 24) {
        throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
    }

    var len = hexString.length;

    if (len > 12 * 2) {
        throw new Error('Id cannot be longer than 12 bytes');
    }

    var result = '',
        string,
        number;

    for (var index = 0; index < len; index += 2) {
        string = hexString.substr(index, 2);
        number = parseInt(string, 16);

        result += BinaryParser.fromByte(number);
    }

    return new ObjectId(result, hexString);
};

/**
 * @ignore
 */
Object.defineProperty(ObjectId.prototype, "generationTime", {
    enumerable: true,
    get: function get() {
        return Math.floor(BinaryParser.decodeInt(this.id.substring(0, 4), 32, true, true));
    },
    set: function set(value) {
        value = BinaryParser.encodeInt(value, 32, true, true);

        this.id = value + this.id.substr(4);
        // delete this.__id;
        this.toHexString();
    }
});
//# sourceMappingURL=data:application/json;base64,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QXBELEVBQTBELElBQTFELENBQVgsQ0FBUDtBQUNILEtBSnVEO0FBS3hELFNBQUssYUFBVSxLQUFWLEVBQWlCO0FBQ2xCLGdCQUFRLGFBQWEsU0FBYixDQUF1QixLQUF2QixFQUE4QixFQUE5QixFQUFrQyxJQUFsQyxFQUF3QyxJQUF4QyxDQUFSOztBQUVBLGFBQUssRUFBTCxHQUFVLFFBQVEsS0FBSyxFQUFMLENBQVEsTUFBUixDQUFlLENBQWYsQ0FBbEI7O0FBRUEsYUFBSyxXQUFMO0FBQ0g7QUFYdUQsQ0FBNUQiLCJmaWxlIjoiT2JqZWN0SWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIE9iamVjdElkLmpzIC0gYmFzZWQgb24gTW9uZ2xvI09iamVjdElkICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDAuMC4xXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZShcIi4vdXRpbHMvTG9nZ2VyXCIpLFxuICAgIEJpbmFyeVBhcnNlciA9IHJlcXVpcmUoXCIuL0JpbmFyeVBhcnNlclwiKTtcblxuLyoqXG4gKiBNYWNoaW5lIGlkLlxuICpcbiAqIENyZWF0ZSBhIHJhbmRvbSAzLWJ5dGUgdmFsdWUgKGkuZS4gdW5pcXVlIGZvciB0aGlzXG4gKiBwcm9jZXNzKS4gT3RoZXIgZHJpdmVycyB1c2UgYSBtZDUgb2YgdGhlIG1hY2hpbmUgaWQgaGVyZSwgYnV0XG4gKiB0aGF0IHdvdWxkIG1lYW4gYW4gYXN5YyBjYWxsIHRvIGdldGhvc3RuYW1lLCBzbyB3ZSBkb24ndCBib3RoZXIuXG4gKiBcbiAqIEBpZ25vcmVcbiAqL1xudmFyIE1BQ0hJTkVfSUQgPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcblxuLy8gUmVndWxhciBleHByZXNzaW9uIHRoYXQgY2hlY2tzIGZvciBoZXggdmFsdWVcbnZhciBjaGVja0ZvckhleFJlZ0V4cCA9IG5ldyBSZWdFeHAoXCJeWzAtOWEtZkEtRl17MjR9JFwiKTtcbnZhciBpc1ZhbGlkSGV4UmVnRXhwID0gZnVuY3Rpb24oc3RyLCBsZW4pIHtcbiAgICBpZiAobGVuID09IG51bGwpIGxlbiA9IDI0O1xuICAgIFxuICAgIGlmIChzdHIubGVuZ3RoID09PSBsZW4gJiYgY2hlY2tGb3JIZXhSZWdFeHAudGVzdChzdHIpKSByZXR1cm4gdHJ1ZTtcbiAgICBcbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0SWQ7XG5cbi8qKlxuICogT2JqZWN0SWRcbiAqIFxuICogQG1vZHVsZSBPYmplY3RJZFxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2luY2UgMC4wLjFcbiAqIFxuICogQGNsYXNzZGVzYyBSZXByZXNlbnRzIHRoZSBCU09OIE9iamVjdElkIHR5cGVcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBpZCAtIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZywgYSAxMiBieXRlIGJpbmFyeSBzdHJpbmcgb3IgYSBOdW1iZXIuXG4gKi9cbmZ1bmN0aW9uIE9iamVjdElkKGlkLCBfaGV4KSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIG5ldyBPYmplY3RJZChpZCwgX2hleCk7XG4gICAgXG4gICAgdGhpcy5fYnNvbnR5cGUgPSAnT2JqZWN0SWQnO1xuICAgIFxuICAgIC8vIHZhciBfX2lkID0gbnVsbDtcbiAgICBcbiAgICBpZiAoXy5pc05pbChpZCkpIHtcbiAgICAgICAgdGhpcy5pZCA9IHRoaXMuZ2VuZXJhdGUoaWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChfLmlzTnVtYmVyKGlkKSkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHRoaXMuZ2VuZXJhdGUoaWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU3RyaW5nIG9yIEhleFxuICAgICAgICAgICAgaWYgKF8uaXNTdHJpbmcoaWQpICYmIChpZC5sZW5ndGggPT09IDEyIHx8IGlkLmxlbmd0aCA9PT0gMjQpKSB7XG4gICAgICAgICAgICAgICAgLy8gVmFsaWQgSGV4XG4gICAgICAgICAgICAgICAgaWYgKGlzVmFsaWRIZXhSZWdFeHAoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaWQgPSBPYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nKGlkKTtcbiAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgICAgIC8vIFZhbGlkIEJ5dGUgU3RyaW5nXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoaWQubGVuZ3RoID09PSAxMikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFsdWUgcGFzc2VkIGluIGlzIG5vdCBhIHZhbGlkIDI0IGNoYXJhY3RlciBoZXggc3RyaW5nXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFRocm93IGFuIGVycm9yIGlmIGl0J3Mgbm90IGEgdmFsaWQgc2V0dXBcbiAgICAvLyBpZiAoaWQgIT0gbnVsbCAmJiAnbnVtYmVyJyAhPSB0eXBlb2YgaWQgJiYgKGlkLmxlbmd0aCAhPSAxMiAmJiBpZC5sZW5ndGggIT0gMjQpKSB7XG4gICAgLy8gICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcbiAgICAvLyB9XG4gICAgXG4gICAgLy8gR2VuZXJhdGUgaWQgYmFzZWQgb24gdGhlIGlucHV0XG4gICAgLy8gaWYgKGlkID09IG51bGwgfHwgdHlwZW9mIGlkID09ICdudW1iZXInKSB7XG4gICAgLy8gICAgIC8vIGNvbnZlcnQgdG8gMTIgYnl0ZSBiaW5hcnkgc3RyaW5nXG4gICAgLy8gICAgIHRoaXMuaWQgPSB0aGlzLmdlbmVyYXRlKGlkKTtcbiAgICAvLyB9IGVsc2UgaWYgKGlkICE9IG51bGwgJiYgaWQubGVuZ3RoID09PSAxMikge1xuICAgIC8vICAgICAvLyBhc3N1bWUgMTIgYnl0ZSBzdHJpbmdcbiAgICAvLyAgICAgdGhpcy5pZCA9IGlkO1xuICAgIC8vIH0gZWxzZSBpZiAoY2hlY2tGb3JIZXhSZWdFeHAudGVzdChpZCkpIHtcbiAgICAvLyAgICAgcmV0dXJuIE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcoaWQpO1xuICAgIC8vIH0gZWxzZSBpZiAoIWNoZWNrRm9ySGV4UmVnRXhwLnRlc3QoaWQpKSB7XG4gICAgLy8gICAgIHRocm93IG5ldyBFcnJvcihcIlZhbHVlIHBhc3NlZCBpbiBpcyBub3QgYSB2YWxpZCAyNCBjaGFyYWN0ZXIgaGV4IHN0cmluZ1wiKTtcbiAgICAvLyB9XG4gICAgXG4gICAgaWYgKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX19pZCA9IHRoaXMudG9IZXhTdHJpbmcoKTtcbiAgICB9XG59XG5cbi8vIElzIHRoaXMgYSBiYWQgSWRlYT9cbi8vT2JqZWN0SWQucHJvdG90eXBlLl9fcHJvdG9fXy50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJ1tPYmplY3RJZCBPYmplY3RdJzsgfTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIE9iamVjdElkIGlkIGFzIGEgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gKiBcbiAqIEBtZXRob2QgT2JqZWN0SWQjdG9IZXhTdHJpbmdcbiAqXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICovXG5PYmplY3RJZC5wcm90b3R5cGUudG9IZXhTdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcgJiYgdGhpcy5fX2lkKSByZXR1cm4gdGhpcy5fX2lkO1xuXG4gICAgdmFyIGhleFN0cmluZyA9ICcnLFxuICAgICAgICBudW1iZXIsXG4gICAgICAgIHZhbHVlO1xuICAgIFxuICAgIGZvciAodmFyIGluZGV4ID0gMCwgbGVuID0gdGhpcy5pZC5sZW5ndGg7IGluZGV4IDwgbGVuOyBpbmRleCsrKSB7XG4gICAgICAgIHZhbHVlID0gQmluYXJ5UGFyc2VyLnRvQnl0ZSh0aGlzLmlkW2luZGV4XSk7XG4gICAgICAgIG51bWJlciA9IHZhbHVlIDw9IDE1ID8gJzAnICsgdmFsdWUudG9TdHJpbmcoMTYpIDogdmFsdWUudG9TdHJpbmcoMTYpO1xuICAgICAgICBcbiAgICAgICAgaGV4U3RyaW5nID0gaGV4U3RyaW5nICsgbnVtYmVyO1xuICAgIH1cbiAgICBcbiAgICBpZiAoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fX2lkID0gaGV4U3RyaW5nO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gaGV4U3RyaW5nO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIE9iamVjdElkIGluZGV4IHVzZWQgaW4gZ2VuZXJhdGluZyBuZXcgT2JqZWN0SWQncyBvbiB0aGUgZHJpdmVyXG4gKiBcbiAqIEBtZXRob2QgT2JqZWN0SWQjZ2V0X2luY1xuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBOZXh0IGluZGV4IHZhbHVlLlxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZ2V0X2luYyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBPYmplY3RJZC5pbmRleCA9IChPYmplY3RJZC5pbmRleCArIDEpICUgMHhGRkZGRkY7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgT2JqZWN0SWQgaW5kZXggdXNlZCBpbiBnZW5lcmF0aW5nIG5ldyBPYmplY3RJZCdzIG9uIHRoZSBkcml2ZXJcbiAqXG4gKiBAbWV0aG9kIE9iamVjdElkI2dldEluY1xuICogQHByaXZhdGVcbiAqIFxuICogQHJldHVybiB7TnVtYmVyfSBOZXh0IGluZGV4IHZhbHVlLlxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZ2V0SW5jID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0X2luYygpO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhIDEyIGJ5dGUgaWQgc3RyaW5nIHVzZWQgaW4gT2JqZWN0SWQnc1xuICpcbiAqIEBtZXRob2QgT2JqZWN0SWQjZ2VuZXJhdGVcbiAqIEBwcml2YXRlXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbdGltZV0gLSBTZWNvbmQgYmFzZWQgdGltZXN0YW1wIHRvIHRoZSBnZW5lcmF0aW9uLlxuICogXG4gKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSAxMiBieXRlIGlkIGJpbmFyeSBzdHJpbmcuXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgICBpZiAoXy5pc05pbCh0aW1lKSB8fCAhXy5pc051bWJlcih0aW1lKSkge1xuICAgICAgICB0aW1lID0gcGFyc2VJbnQoRGF0ZS5ub3coKSAvIDEwMDAsIDEwKTtcbiAgICB9XG4gICAgXG4gICAgLyogZm9yIHRpbWUtYmFzZWQgT2JqZWN0SWQgdGhlIGJ5dGVzIGZvbGxvd2luZyB0aGUgdGltZSB3aWxsIGJlIHplcm9lZCAqL1xuICAgIHZhciB0aW1lNEJ5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aW1lLCAzMiwgdHJ1ZSwgdHJ1ZSk7XG4gICAgdmFyIG1hY2hpbmUzQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KE1BQ0hJTkVfSUQsIDI0LCBmYWxzZSk7XG4gICAgdmFyIHBpZDJCeXRlcyA9IEJpbmFyeVBhcnNlci5mcm9tU2hvcnQodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSA6IHByb2Nlc3MucGlkKTtcbiAgICB2YXIgaW5kZXgzQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRoaXMuZ2V0X2luYygpLCAyNCwgZmFsc2UsIHRydWUpO1xuICAgIFxuICAgIHJldHVybiB0aW1lNEJ5dGVzICsgbWFjaGluZTNCeXRlcyArIHBpZDJCeXRlcyArIGluZGV4M0J5dGVzO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyB0aGUgaWQgaW50byBhIDI0IGJ5dGUgaGV4IHN0cmluZyBmb3IgcHJpbnRpbmdcbiAqXG4gKiBAbWV0aG9kIE9iamVjdElkI3RvU3RyaW5nXG4gKiBAcHJpdmF0ZVxuICogXG4gKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciB7QGxpbmsgT2JqZWN0SWQjdG9TdHJpbmd9XG4gKiBAYWxpYXMgT2JqZWN0SWQjdG9TdHJpbmdcbiAqXG4gKiBAbWV0aG9kIE9iamVjdElkI2luc3BlY3RcbiAqIEBwcml2YXRlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5pbnNwZWN0ID0gT2JqZWN0SWQucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vKipcbiAqIEFsaWFzIGZvciB7QGxpbmsgT2JqZWN0SWQjdG9IZXhTdHJpbmd9XG4gKiBAYWxpYXMgT2JqZWN0SWQjdG9IZXhTdHJpbmdcbiAqXG4gKiBAbWV0aG9kIE9iamVjdElkI3RvSlNPTlxuICogQHByaXZhdGVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG59O1xuXG4vKipcbiAqIENvbXBhcmVzIHRoZSBlcXVhbGl0eSBvZiB0aGlzIE9iamVjdElkIHdpdGggW290aGVySURdLlxuICpcbiAqIEBtZXRob2QgT2JqZWN0SWQjZXF1YWxzXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvdGhlcklEIC0gT2JqZWN0SWQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICogXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVGhlIHJlc3VsdCBvZiBjb21wYXJpbmcgdHdvIE9iamVjdElkJ3NcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uKG90aGVySUQpIHtcbiAgICB2YXIgaWQgPSAob3RoZXJJRCBpbnN0YW5jZW9mIE9iamVjdElkIHx8IG90aGVySUQudG9IZXhTdHJpbmcpID8gb3RoZXJJRC5pZCA6IE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcob3RoZXJJRCkuaWQ7XG5cbiAgICByZXR1cm4gdGhpcy5pZCA9PT0gaWQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGdlbmVyYXRpb24gdGltZSBpbiBzZWNvbmRzIHRoYXQgdGhpcyBJRCB3YXMgZ2VuZXJhdGVkLlxuICpcbiAqIEBtZXRob2QgT2JqZWN0SWQjZ2V0VGltZXN0YW1wXG4gKiBcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IE51bWJlciBvZiBzZWNvbmRzIGluIHRoZSB0aW1lc3RhbXAgcGFydCBvZiB0aGUgMTIgYnl0ZSBpZC5cbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmdldFRpbWVzdGFtcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpO1xuICAgIFxuICAgIHRpbWVzdGFtcC5zZXRUaW1lKE1hdGguZmxvb3IoQmluYXJ5UGFyc2VyLmRlY29kZUludCh0aGlzLmlkLnN1YnN0cmluZygwLCA0KSwgMzIsIHRydWUsIHRydWUpKSAqIDEwMDApO1xuICAgIFxuICAgIHJldHVybiB0aW1lc3RhbXA7XG59O1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQuaW5kZXggPSAwO1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SWQgZnJvbSBhIHNlY29uZCBiYXNlZCBudW1iZXIsIHdpdGggdGhlIHJlc3Qgb2YgdGhlIE9iamVjdElkIHplcm9lZCBvdXQuIFVzZWQgZm9yIGNvbXBhcmlzb25zIG9yIHNvcnRpbmcgdGhlIE9iamVjdElkLlxuICpcbiAqIEBtZXRob2QgT2JqZWN0SWQjY3JlYXRlUGtcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgYW4gaW50ZWdlciBudW1iZXIgcmVwcmVzZW50aW5nIGEgbnVtYmVyIG9mIHNlY29uZHMuXG4gKiBAcmV0dXJuIHtPYmplY3RJZH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElkXG4gKi9cbk9iamVjdElkLmNyZWF0ZVBrID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SWQoKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SWQgemVyb2VkIG91dC4gXG4gKiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJZC5cbiAqXG4gKiBAbWV0aG9kIE9iamVjdElkI2NyZWF0ZUZyb21UaW1lXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIC0gQSBudW1iZXIgb2Ygc2Vjb25kcy5cbiAqIFxuICogQHJldHVybnMge09iamVjdElkfSBUaGUgY3JlYXRlZCBPYmplY3RJZFxuICovXG5PYmplY3RJZC5jcmVhdGVGcm9tVGltZSA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdmFyIGlkID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aW1lLCAzMiwgdHJ1ZSwgdHJ1ZSkgKyBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KDAsIDY0LCB0cnVlLCB0cnVlKTtcbiAgICBcbiAgICByZXR1cm4gbmV3IE9iamVjdElkKGlkKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBPYmplY3RJZC5cbiAqXG4gKiBAbWV0aG9kIE9iamVjdElkI2NyZWF0ZUZyb21IZXhTdHJpbmdcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGhleFN0cmluZyAtIEFuIE9iamVjdElkIDI0IGJ5dGUgaGV4c3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0SWR9IFRoZSBjcmVhdGVkIE9iamVjdElkXG4gKi9cbk9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcgPSBmdW5jdGlvbiAoaGV4U3RyaW5nKSB7XG4gICAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICAgIGlmKHR5cGVvZiBoZXhTdHJpbmcgPT09ICd1bmRlZmluZWQnIHx8IGhleFN0cmluZyAhPSBudWxsICYmIGhleFN0cmluZy5sZW5ndGggIT0gMjQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuICAgIH1cbiAgICBcbiAgICB2YXIgbGVuID0gaGV4U3RyaW5nLmxlbmd0aDtcbiAgICBcbiAgICBpZihsZW4gPiAxMiAqIDIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJZCBjYW5ub3QgYmUgbG9uZ2VyIHRoYW4gMTIgYnl0ZXMnKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIHJlc3VsdCA9ICcnLCBcbiAgICAgICAgc3RyaW5nLCBcbiAgICAgICAgbnVtYmVyO1xuICAgIFxuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW47IGluZGV4ICs9IDIpIHtcbiAgICAgICAgc3RyaW5nID0gaGV4U3RyaW5nLnN1YnN0cihpbmRleCwgMik7XG4gICAgICAgIG51bWJlciA9IHBhcnNlSW50KHN0cmluZywgMTYpO1xuICAgICAgICBcbiAgICAgICAgcmVzdWx0ICs9IEJpbmFyeVBhcnNlci5mcm9tQnl0ZShudW1iZXIpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gbmV3IE9iamVjdElkKHJlc3VsdCwgaGV4U3RyaW5nKTtcbn07XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT2JqZWN0SWQucHJvdG90eXBlLCBcImdlbmVyYXRpb25UaW1lXCIsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihCaW5hcnlQYXJzZXIuZGVjb2RlSW50KHRoaXMuaWQuc3Vic3RyaW5nKDAsIDQpLCAzMiwgdHJ1ZSwgdHJ1ZSkpO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFsdWUgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHZhbHVlLCAzMiwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmlkID0gdmFsdWUgKyB0aGlzLmlkLnN1YnN0cig0KTtcbiAgICAgICAgLy8gZGVsZXRlIHRoaXMuX19pZDtcbiAgICAgICAgdGhpcy50b0hleFN0cmluZygpO1xuICAgIH1cbn0pOyJdfQ==
