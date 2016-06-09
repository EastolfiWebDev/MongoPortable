"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @file ObjectId.js - based on Monglo#ObjectId ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

var _ = require("lodash"),
    Logger = require("jsw-logger"),
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
//# sourceMappingURL=data:application/json;base64,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QVMsTUFBVCxFQUFpQixFQUFqQixDQUFUOztBQUVBLDBCQUFVLGFBQWEsUUFBYixDQUFzQixNQUF0QixDQUFWO0FBQ0g7O0FBRUQsbUJBQU8sSUFBSSxRQUFKLENBQWEsTUFBYixFQUFxQixTQUFyQixDQUFQO0FBQ0g7Ozs7Ozs7Ozs7Ozs7Ozt1Q0FZcUIsSSxFQUFNO0FBQ3hCLGdCQUFJLEtBQUssYUFBYSxTQUFiLENBQXVCLElBQXZCLEVBQTZCLEVBQTdCLEVBQWlDLElBQWpDLEVBQXVDLElBQXZDLElBQStDLGFBQWEsU0FBYixDQUF1QixDQUF2QixFQUEwQixFQUExQixFQUE4QixJQUE5QixFQUFvQyxJQUFwQyxDQUF4RDs7QUFFQSxtQkFBTyxJQUFJLFFBQUosQ0FBYSxFQUFiLENBQVA7QUFDSDs7Ozs7Ozs7Ozs7OzttQ0FVaUI7QUFDZCxtQkFBTyxJQUFJLFFBQUosRUFBUDtBQUNIOzs7Ozs7Ozs7OztBQU1MLFNBQVMsS0FBVCxHQUFpQixDQUFqQjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsUUFBakIiLCJmaWxlIjoiT2JqZWN0SWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIE9iamVjdElkLmpzIC0gYmFzZWQgb24gTW9uZ2xvI09iamVjdElkICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpLFxuICAgIExvZ2dlciA9IHJlcXVpcmUoXCJqc3ctbG9nZ2VyXCIpLFxuICAgIEJpbmFyeVBhcnNlciA9IHJlcXVpcmUoXCIuL0JpbmFyeVBhcnNlclwiKTtcbiAgICBcbnZhciBsb2dnZXIgPSBudWxsO1xuXG4vKipcbiAqIE1hY2hpbmUgaWQuXG4gKlxuICogQ3JlYXRlIGEgcmFuZG9tIDMtYnl0ZSB2YWx1ZSAoaS5lLiB1bmlxdWUgZm9yIHRoaXNcbiAqIHByb2Nlc3MpLiBPdGhlciBkcml2ZXJzIHVzZSBhIG1kNSBvZiB0aGUgbWFjaGluZSBpZCBoZXJlLCBidXRcbiAqIHRoYXQgd291bGQgbWVhbiBhbiBhc3ljIGNhbGwgdG8gZ2V0aG9zdG5hbWUsIHNvIHdlIGRvbid0IGJvdGhlci5cbiAqIFxuICogQGlnbm9yZVxuICovXG52YXIgTUFDSElORV9JRCA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRiwgMTApO1xuXG4vLyBSZWd1bGFyIGV4cHJlc3Npb24gdGhhdCBjaGVja3MgZm9yIGhleCB2YWx1ZVxudmFyIGNoZWNrRm9ySGV4UmVnRXhwID0gbmV3IFJlZ0V4cChcIl5bMC05YS1mQS1GXXsyNH0kXCIpO1xudmFyIGlzVmFsaWRIZXhSZWdFeHAgPSBmdW5jdGlvbihzdHIsIGxlbiA9IDI0KSB7XG4gICAgaWYgKHN0ci5sZW5ndGggPT09IGxlbiAmJiBjaGVja0ZvckhleFJlZ0V4cC50ZXN0KHN0cikpIHJldHVybiB0cnVlO1xuICAgIFxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogT2JqZWN0SWRcbiAqIFxuICogQG1vZHVsZSBPYmplY3RJZFxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2luY2UgMC4wLjFcbiAqIFxuICogQGNsYXNzZGVzYyBSZXByZXNlbnRzIHRoZSBCU09OIE9iamVjdElkIHR5cGVcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBpZCAtIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZywgYSAxMiBieXRlIGJpbmFyeSBzdHJpbmcgb3IgYSBOdW1iZXIuXG4gKi9cbmNsYXNzIE9iamVjdElkIHtcbiAgICBjb25zdHJ1Y3RvcihpZCwgX2hleCkge1xuICAgICAgICAvLyBpZiAoISh0aGlzIGluc3RhbmNlb2YgT2JqZWN0SWQpKSByZXR1cm4gbmV3IE9iamVjdElkKGlkLCBfaGV4KTtcbiAgICAgICAgXG4gICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX2Jzb250eXBlID0gJ09iamVjdElkJztcbiAgICAgICAgXG4gICAgICAgIC8vIHZhciBfX2lkID0gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGlkKSkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHRoaXMuZ2VuZXJhdGUoaWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKF8uaXNOdW1iZXIoaWQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pZCA9IHRoaXMuZ2VuZXJhdGUoaWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTdHJpbmcgb3IgSGV4XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNTdHJpbmcoaWQpICYmIChpZC5sZW5ndGggPT09IDEyIHx8IGlkLmxlbmd0aCA9PT0gMjQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkSGV4UmVnRXhwKGlkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVmFsaWQgSGV4XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgX2lkID0gT2JqZWN0SWQuY3JlYXRlRnJvbUhleFN0cmluZyhpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlkID0gX2lkLmlkO1xuICAgICAgICAgICAgICAgICAgICB9ICBlbHNlIGlmIChpZC5sZW5ndGggPT09IDEyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBWYWxpZCBCeXRlIFN0cmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVmFsdWUgcGFzc2VkIGluIGlzIG5vdCBhIHZhbGlkIDI0IGNoYXJhY3RlciBoZXggc3RyaW5nXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICAgICAgICAvLyBpZiAoaWQgIT0gbnVsbCAmJiAnbnVtYmVyJyAhPSB0eXBlb2YgaWQgJiYgKGlkLmxlbmd0aCAhPSAxMiAmJiBpZC5sZW5ndGggIT0gMjQpKSB7XG4gICAgICAgIC8vICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnNcIik7XG4gICAgICAgIC8vIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdlbmVyYXRlIGlkIGJhc2VkIG9uIHRoZSBpbnB1dFxuICAgICAgICAvLyBpZiAoaWQgPT0gbnVsbCB8fCB0eXBlb2YgaWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgLy8gICAgIC8vIGNvbnZlcnQgdG8gMTIgYnl0ZSBiaW5hcnkgc3RyaW5nXG4gICAgICAgIC8vICAgICB0aGlzLmlkID0gdGhpcy5nZW5lcmF0ZShpZCk7XG4gICAgICAgIC8vIH0gZWxzZSBpZiAoaWQgIT0gbnVsbCAmJiBpZC5sZW5ndGggPT09IDEyKSB7XG4gICAgICAgIC8vICAgICAvLyBhc3N1bWUgMTIgYnl0ZSBzdHJpbmdcbiAgICAgICAgLy8gICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgLy8gfSBlbHNlIGlmIChjaGVja0ZvckhleFJlZ0V4cC50ZXN0KGlkKSkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcoaWQpO1xuICAgICAgICAvLyB9IGVsc2UgaWYgKCFjaGVja0ZvckhleFJlZ0V4cC50ZXN0KGlkKSkge1xuICAgICAgICAvLyAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFsdWUgcGFzc2VkIGluIGlzIG5vdCBhIHZhbGlkIDI0IGNoYXJhY3RlciBoZXggc3RyaW5nXCIpO1xuICAgICAgICAvLyB9XG4gICAgICAgIFxuICAgICAgICBpZiAoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuX19pZCA9IHRoaXMudG9IZXhTdHJpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKiBJTlNUQU5DRSBNRVRIT0RTICovXG4gICAgXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBPYmplY3RJZCBpZCBhcyBhIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvblxuICAgICAqIFxuICAgICAqIEBtZXRob2QgT2JqZWN0SWQjdG9IZXhTdHJpbmdcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gICAgICovXG4gICAgdG9IZXhTdHJpbmcoKSB7XG4gICAgICAgIGlmIChPYmplY3RJZC5jYWNoZUhleFN0cmluZyAmJiB0aGlzLl9faWQpIHJldHVybiB0aGlzLl9faWQ7XG4gICAgXG4gICAgICAgIHZhciBoZXhTdHJpbmcgPSAnJyxcbiAgICAgICAgICAgIG51bWJlcixcbiAgICAgICAgICAgIHZhbHVlO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwLCBsZW4gPSB0aGlzLmlkLmxlbmd0aDsgaW5kZXggPCBsZW47IGluZGV4KyspIHtcbiAgICAgICAgICAgIHZhbHVlID0gQmluYXJ5UGFyc2VyLnRvQnl0ZSh0aGlzLmlkW2luZGV4XSk7XG4gICAgICAgICAgICBudW1iZXIgPSB2YWx1ZSA8PSAxNSA/ICcwJyArIHZhbHVlLnRvU3RyaW5nKDE2KSA6IHZhbHVlLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaGV4U3RyaW5nID0gaGV4U3RyaW5nICsgbnVtYmVyO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuX19pZCA9IGhleFN0cmluZztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGhleFN0cmluZztcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQWxpYXMgZm9yIHtAbGluayBPYmplY3RJZCN0b0hleFN0cmluZ31cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIEN1cnNvciNuZXh0XG4gICAgICovXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEFsaWFzIGZvciB7QGxpbmsgT2JqZWN0SWQjdG9IZXhTdHJpbmd9XG4gICAgICogXG4gICAgICogQG1ldGhvZCBDdXJzb3IjbmV4dFxuICAgICAqL1xuICAgIHRvSlNPTigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9IZXhTdHJpbmcoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBPYmplY3RJZCBpbmRleCB1c2VkIGluIGdlbmVyYXRpbmcgbmV3IE9iamVjdElkJ3Mgb24gdGhlIGRyaXZlclxuICAgICAqIFxuICAgICAqIEBtZXRob2QgT2JqZWN0SWQjZ2V0X2luY1xuICAgICAqIEBwcml2YXRlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBOZXh0IGluZGV4IHZhbHVlLlxuICAgICAqL1xuICAgIGdldEluYygpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdElkLmluZGV4ID0gKE9iamVjdElkLmluZGV4ICsgMSkgJSAweEZGRkZGRjtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSAxMiBieXRlIGlkIHN0cmluZyB1c2VkIGluIE9iamVjdElkJ3NcbiAgICAgKlxuICAgICAqIEBtZXRob2QgT2JqZWN0SWQjZ2VuZXJhdGVcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbdGltZV0gLSBTZWNvbmQgYmFzZWQgdGltZXN0YW1wIHRvIHRoZSBnZW5lcmF0aW9uLlxuICAgICAqIFxuICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIDEyIGJ5dGUgaWQgYmluYXJ5IHN0cmluZy5cbiAgICAgKi9cbiAgICBnZW5lcmF0ZSh0aW1lKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHRpbWUpIHx8ICFfLmlzTnVtYmVyKHRpbWUpKSB7XG4gICAgICAgICAgICB0aW1lID0gcGFyc2VJbnQoRGF0ZS5ub3coKSAvIDEwMDAsIDEwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogZm9yIHRpbWUtYmFzZWQgT2JqZWN0SWQgdGhlIGJ5dGVzIGZvbGxvd2luZyB0aGUgdGltZSB3aWxsIGJlIHplcm9lZCAqL1xuICAgICAgICB2YXIgdGltZTRCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGltZSwgMzIsIHRydWUsIHRydWUpO1xuICAgICAgICB2YXIgbWFjaGluZTNCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQoTUFDSElORV9JRCwgMjQsIGZhbHNlKTtcbiAgICAgICAgdmFyIHBpZDJCeXRlcyA9IEJpbmFyeVBhcnNlci5mcm9tU2hvcnQoXy5pc05pbChwcm9jZXNzKSA/IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMCkgOiBwcm9jZXNzLnBpZCk7XG4gICAgICAgIHZhciBpbmRleDNCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGhpcy5nZXRJbmMoKSwgMjQsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aW1lNEJ5dGVzICsgbWFjaGluZTNCeXRlcyArIHBpZDJCeXRlcyArIGluZGV4M0J5dGVzO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJZCB3aXRoIFtvdGhlcklEXS5cbiAgICAgKlxuICAgICAqIEBtZXRob2QgT2JqZWN0SWQjZXF1YWxzXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG90aGVySUQgLSBPYmplY3RJZCBpbnN0YW5jZSB0byBjb21wYXJlIGFnYWluc3QuXG4gICAgICogXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59IFRoZSByZXN1bHQgb2YgY29tcGFyaW5nIHR3byBPYmplY3RJZCdzXG4gICAgICovXG4gICAgZXF1YWxzKG90aGVySUQpIHtcbiAgICAgICAgdmFyIGlkID0gKG90aGVySUQgaW5zdGFuY2VvZiBPYmplY3RJZCB8fCBvdGhlcklELnRvSGV4U3RyaW5nKSA/IG90aGVySUQuaWQgOiBPYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nKG90aGVySUQpLmlkO1xuICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5pZCA9PT0gaWQ7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGdlbmVyYXRpb24gdGltZSBpbiBzZWNvbmRzIHRoYXQgdGhpcyBJRCB3YXMgZ2VuZXJhdGVkLlxuICAgICAqXG4gICAgICogQG1ldGhvZCBPYmplY3RJZCNnZXRUaW1lc3RhbXBcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBOdW1iZXIgb2Ygc2Vjb25kcyBpbiB0aGUgdGltZXN0YW1wIHBhcnQgb2YgdGhlIDEyIGJ5dGUgaWQuXG4gICAgICovXG4gICAgZ2V0VGltZXN0YW1wKCkge1xuICAgICAgICB2YXIgdGltZXN0YW1wID0gbmV3IERhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIHRpbWVzdGFtcC5zZXRUaW1lKE1hdGguZmxvb3IoQmluYXJ5UGFyc2VyLmRlY29kZUludCh0aGlzLmlkLnN1YnN0cmluZygwLCA0KSwgMzIsIHRydWUsIHRydWUpKSAqIDEwMDApO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRpbWVzdGFtcDtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgLyogR0VUVEVSIC0gU0VUVEVSICovXG4gICAgZ2V0IGdlbmVyYXRpb25UaW1lKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihCaW5hcnlQYXJzZXIuZGVjb2RlSW50KHRoaXMuaWQuc3Vic3RyaW5nKDAsIDQpLCAzMiwgdHJ1ZSwgdHJ1ZSkpO1xuICAgIH1cbiAgICBcbiAgICBzZXQgZ2VuZXJhdGlvblRpbWUodmFsdWUpIHtcbiAgICAgICAgdmFsdWUgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHZhbHVlLCAzMiwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmlkID0gdmFsdWUgKyB0aGlzLmlkLnN1YnN0cig0KTtcbiAgICAgICAgLy8gZGVsZXRlIHRoaXMuX19pZDtcbiAgICAgICAgdGhpcy50b0hleFN0cmluZygpO1xuICAgIH1cbiAgICBcbiAgICAvKiBTVEFUSUMgTUVUSE9EUyAqL1xuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gT2JqZWN0SWQgZnJvbSBhIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYW4gT2JqZWN0SWQuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIE9iamVjdElkI2NyZWF0ZUZyb21IZXhTdHJpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gaGV4U3RyaW5nIC0gQW4gT2JqZWN0SWQgMjQgYnl0ZSBoZXhzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gICAgICogXG4gICAgICogQHJldHVybnMge09iamVjdElkfSBUaGUgY3JlYXRlZCBPYmplY3RJZFxuICAgICAqL1xuICAgIHN0YXRpYyBjcmVhdGVGcm9tSGV4U3RyaW5nKGhleFN0cmluZykge1xuICAgICAgICAvLyBUaHJvdyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhIHZhbGlkIHNldHVwXG4gICAgICAgIGlmKF8uaXNOaWwoaGV4U3RyaW5nKSB8fCBoZXhTdHJpbmcubGVuZ3RoICE9IDI0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnNcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBsZW4gPSBoZXhTdHJpbmcubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgdmFyIHJlc3VsdCA9ICcnLCBcbiAgICAgICAgICAgIHN0cmluZywgXG4gICAgICAgICAgICBudW1iZXI7XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuOyBpbmRleCArPSAyKSB7XG4gICAgICAgICAgICBzdHJpbmcgPSBoZXhTdHJpbmcuc3Vic3RyKGluZGV4LCAyKTtcbiAgICAgICAgICAgIG51bWJlciA9IHBhcnNlSW50KHN0cmluZywgMTYpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXN1bHQgKz0gQmluYXJ5UGFyc2VyLmZyb21CeXRlKG51bWJlcik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBuZXcgT2JqZWN0SWQocmVzdWx0LCBoZXhTdHJpbmcpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIE9iamVjdElkIGZyb20gYSBzZWNvbmQgYmFzZWQgbnVtYmVyLCB3aXRoIHRoZSByZXN0IG9mIHRoZSBPYmplY3RJZCB6ZXJvZWQgb3V0LiBcbiAgICAgKiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJZC5cbiAgICAgKlxuICAgICAqIEBtZXRob2QgT2JqZWN0SWQjY3JlYXRlRnJvbVRpbWVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdGltZSAtIEEgbnVtYmVyIG9mIHNlY29uZHMuXG4gICAgICogXG4gICAgICogQHJldHVybnMge09iamVjdElkfSBUaGUgY3JlYXRlZCBPYmplY3RJZFxuICAgICAqL1xuICAgIHN0YXRpYyBjcmVhdGVGcm9tVGltZSh0aW1lKSB7XG4gICAgICAgIHZhciBpZCA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGltZSwgMzIsIHRydWUsIHRydWUpICsgQmluYXJ5UGFyc2VyLmVuY29kZUludCgwLCA2NCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IE9iamVjdElkKGlkKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SWQgemVyb2VkIG91dC4gVXNlZCBmb3IgY29tcGFyaXNvbnMgb3Igc29ydGluZyB0aGUgT2JqZWN0SWQuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIE9iamVjdElkI2NyZWF0ZVBrXG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgYW4gaW50ZWdlciBudW1iZXIgcmVwcmVzZW50aW5nIGEgbnVtYmVyIG9mIHNlY29uZHMuXG4gICAgICogQHJldHVybiB7T2JqZWN0SWR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJZFxuICAgICAqL1xuICAgIHN0YXRpYyBjcmVhdGVQaygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RJZCgpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLmluZGV4ID0gMDtcblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJZDsiXX0=
