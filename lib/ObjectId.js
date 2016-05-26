"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
var isValidHexRegExp = function isValidHexRegExp(str, len) {
    if (len == null) len = 24;

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
                    // Valid Hex
                    if (isValidHexRegExp(id)) {
                        this.id = ObjectId.createFromHexString(id);
                    }
                    // Valid Byte String
                    else if (id.length === 12) {
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
//# sourceMappingURL=data:application/json;base64,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QixFQUFpQyxTQUFTLENBQTFDLEVBQTZDO0FBQ3pDLHlCQUFTLFVBQVUsTUFBVixDQUFpQixLQUFqQixFQUF3QixDQUF4QixDQUFUO0FBQ0EseUJBQVMsU0FBUyxNQUFULEVBQWlCLEVBQWpCLENBQVQ7O0FBRUEsMEJBQVUsYUFBYSxRQUFiLENBQXNCLE1BQXRCLENBQVY7QUFDSDs7QUFFRCxtQkFBTyxJQUFJLFFBQUosQ0FBYSxNQUFiLEVBQXFCLFNBQXJCLENBQVA7QUFDSDs7Ozs7Ozs7Ozs7Ozs7O3VDQVlxQixJLEVBQU07QUFDeEIsZ0JBQUksS0FBSyxhQUFhLFNBQWIsQ0FBdUIsSUFBdkIsRUFBNkIsRUFBN0IsRUFBaUMsSUFBakMsRUFBdUMsSUFBdkMsSUFBK0MsYUFBYSxTQUFiLENBQXVCLENBQXZCLEVBQTBCLEVBQTFCLEVBQThCLElBQTlCLEVBQW9DLElBQXBDLENBQXhEOztBQUVBLG1CQUFPLElBQUksUUFBSixDQUFhLEVBQWIsQ0FBUDtBQUNIOzs7Ozs7Ozs7Ozs7O21DQVVpQjtBQUNkLG1CQUFPLElBQUksUUFBSixFQUFQO0FBQ0g7Ozs7Ozs7Ozs7O0FBTUwsU0FBUyxLQUFULEdBQWlCLENBQWpCOztBQUVBLE9BQU8sT0FBUCxHQUFpQixRQUFqQiIsImZpbGUiOiJPYmplY3RJZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgT2JqZWN0SWQuanMgLSBiYXNlZCBvbiBNb25nbG8jT2JqZWN0SWQgKHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vTW9uZ2xvfSkgYnkgQ2hyaXN0aWFuIFN1bGxpdmFuIDxjc0BldWZvcmljLmNvPiB8IENvcHlyaWdodCAoYykgMjAxMlxuICogQHZlcnNpb24gMS4wLjBcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlZFxuICovXG5cbnZhciBfID0gcmVxdWlyZShcImxvZGFzaFwiKSxcbiAgICBMb2dnZXIgPSByZXF1aXJlKFwiLi91dGlscy9Mb2dnZXJcIiksXG4gICAgQmluYXJ5UGFyc2VyID0gcmVxdWlyZShcIi4vQmluYXJ5UGFyc2VyXCIpO1xuICAgIFxudmFyIGxvZ2dlciA9IG51bGw7XG5cbi8qKlxuICogTWFjaGluZSBpZC5cbiAqXG4gKiBDcmVhdGUgYSByYW5kb20gMy1ieXRlIHZhbHVlIChpLmUuIHVuaXF1ZSBmb3IgdGhpc1xuICogcHJvY2VzcykuIE90aGVyIGRyaXZlcnMgdXNlIGEgbWQ1IG9mIHRoZSBtYWNoaW5lIGlkIGhlcmUsIGJ1dFxuICogdGhhdCB3b3VsZCBtZWFuIGFuIGFzeWMgY2FsbCB0byBnZXRob3N0bmFtZSwgc28gd2UgZG9uJ3QgYm90aGVyLlxuICogXG4gKiBAaWdub3JlXG4gKi9cbnZhciBNQUNISU5FX0lEID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG5cbi8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB0aGF0IGNoZWNrcyBmb3IgaGV4IHZhbHVlXG52YXIgY2hlY2tGb3JIZXhSZWdFeHAgPSBuZXcgUmVnRXhwKFwiXlswLTlhLWZBLUZdezI0fSRcIik7XG52YXIgaXNWYWxpZEhleFJlZ0V4cCA9IGZ1bmN0aW9uKHN0ciwgbGVuKSB7XG4gICAgaWYgKGxlbiA9PSBudWxsKSBsZW4gPSAyNDtcbiAgICBcbiAgICBpZiAoc3RyLmxlbmd0aCA9PT0gbGVuICYmIGNoZWNrRm9ySGV4UmVnRXhwLnRlc3Qoc3RyKSkgcmV0dXJuIHRydWU7XG4gICAgXG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBPYmplY3RJZFxuICogXG4gKiBAbW9kdWxlIE9iamVjdElkXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzaW5jZSAwLjAuMVxuICogXG4gKiBAY2xhc3NkZXNjIFJlcHJlc2VudHMgdGhlIEJTT04gT2JqZWN0SWQgdHlwZVxuICogXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IGlkIC0gQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nLCBhIDEyIGJ5dGUgYmluYXJ5IHN0cmluZyBvciBhIE51bWJlci5cbiAqL1xuY2xhc3MgT2JqZWN0SWQge1xuICAgIGNvbnN0cnVjdG9yKGlkLCBfaGV4KSB7XG4gICAgICAgIC8vIGlmICghKHRoaXMgaW5zdGFuY2VvZiBPYmplY3RJZCkpIHJldHVybiBuZXcgT2JqZWN0SWQoaWQsIF9oZXgpO1xuICAgICAgICBcbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5fYnNvbnR5cGUgPSAnT2JqZWN0SWQnO1xuICAgICAgICBcbiAgICAgICAgLy8gdmFyIF9faWQgPSBudWxsO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoaWQpKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gdGhpcy5nZW5lcmF0ZShpZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoXy5pc051bWJlcihpZCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlkID0gdGhpcy5nZW5lcmF0ZShpZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFN0cmluZyBvciBIZXhcbiAgICAgICAgICAgICAgICBpZiAoXy5pc1N0cmluZyhpZCkgJiYgKGlkLmxlbmd0aCA9PT0gMTIgfHwgaWQubGVuZ3RoID09PSAyNCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVmFsaWQgSGV4XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkSGV4UmVnRXhwKGlkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pZCA9IE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcoaWQpO1xuICAgICAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgICAgICAgICAvLyBWYWxpZCBCeXRlIFN0cmluZ1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChpZC5sZW5ndGggPT09IDEyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJWYWx1ZSBwYXNzZWQgaW4gaXMgbm90IGEgdmFsaWQgMjQgY2hhcmFjdGVyIGhleCBzdHJpbmdcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnNcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUaHJvdyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhIHZhbGlkIHNldHVwXG4gICAgICAgIC8vIGlmIChpZCAhPSBudWxsICYmICdudW1iZXInICE9IHR5cGVvZiBpZCAmJiAoaWQubGVuZ3RoICE9IDEyICYmIGlkLmxlbmd0aCAhPSAyNCkpIHtcbiAgICAgICAgLy8gICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcbiAgICAgICAgLy8gfVxuICAgICAgICBcbiAgICAgICAgLy8gR2VuZXJhdGUgaWQgYmFzZWQgb24gdGhlIGlucHV0XG4gICAgICAgIC8vIGlmIChpZCA9PSBudWxsIHx8IHR5cGVvZiBpZCA9PSAnbnVtYmVyJykge1xuICAgICAgICAvLyAgICAgLy8gY29udmVydCB0byAxMiBieXRlIGJpbmFyeSBzdHJpbmdcbiAgICAgICAgLy8gICAgIHRoaXMuaWQgPSB0aGlzLmdlbmVyYXRlKGlkKTtcbiAgICAgICAgLy8gfSBlbHNlIGlmIChpZCAhPSBudWxsICYmIGlkLmxlbmd0aCA9PT0gMTIpIHtcbiAgICAgICAgLy8gICAgIC8vIGFzc3VtZSAxMiBieXRlIHN0cmluZ1xuICAgICAgICAvLyAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICAvLyB9IGVsc2UgaWYgKGNoZWNrRm9ySGV4UmVnRXhwLnRlc3QoaWQpKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gT2JqZWN0SWQuY3JlYXRlRnJvbUhleFN0cmluZyhpZCk7XG4gICAgICAgIC8vIH0gZWxzZSBpZiAoIWNoZWNrRm9ySGV4UmVnRXhwLnRlc3QoaWQpKSB7XG4gICAgICAgIC8vICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWYWx1ZSBwYXNzZWQgaW4gaXMgbm90IGEgdmFsaWQgMjQgY2hhcmFjdGVyIGhleCBzdHJpbmdcIik7XG4gICAgICAgIC8vIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChPYmplY3RJZC5jYWNoZUhleFN0cmluZykge1xuICAgICAgICAgICAgdGhpcy5fX2lkID0gdGhpcy50b0hleFN0cmluZygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qIElOU1RBTkNFIE1FVEhPRFMgKi9cbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIE9iamVjdElkIGlkIGFzIGEgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICogXG4gICAgICogQG1ldGhvZCBPYmplY3RJZCN0b0hleFN0cmluZ1xuICAgICAqXG4gICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAgICAgKi9cbiAgICB0b0hleFN0cmluZygpIHtcbiAgICAgICAgaWYgKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nICYmIHRoaXMuX19pZCkgcmV0dXJuIHRoaXMuX19pZDtcbiAgICBcbiAgICAgICAgdmFyIGhleFN0cmluZyA9ICcnLFxuICAgICAgICAgICAgbnVtYmVyLFxuICAgICAgICAgICAgdmFsdWU7XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpbmRleCA9IDAsIGxlbiA9IHRoaXMuaWQubGVuZ3RoOyBpbmRleCA8IGxlbjsgaW5kZXgrKykge1xuICAgICAgICAgICAgdmFsdWUgPSBCaW5hcnlQYXJzZXIudG9CeXRlKHRoaXMuaWRbaW5kZXhdKTtcbiAgICAgICAgICAgIG51bWJlciA9IHZhbHVlIDw9IDE1ID8gJzAnICsgdmFsdWUudG9TdHJpbmcoMTYpIDogdmFsdWUudG9TdHJpbmcoMTYpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBoZXhTdHJpbmcgPSBoZXhTdHJpbmcgKyBudW1iZXI7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChPYmplY3RJZC5jYWNoZUhleFN0cmluZykge1xuICAgICAgICAgICAgdGhpcy5fX2lkID0gaGV4U3RyaW5nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaGV4U3RyaW5nO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBBbGlhcyBmb3Ige0BsaW5rIE9iamVjdElkI3RvSGV4U3RyaW5nfVxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ3Vyc29yI25leHRcbiAgICAgKi9cbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9IZXhTdHJpbmcoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQWxpYXMgZm9yIHtAbGluayBPYmplY3RJZCN0b0hleFN0cmluZ31cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIEN1cnNvciNuZXh0XG4gICAgICovXG4gICAgdG9KU09OKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b0hleFN0cmluZygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIE9iamVjdElkIGluZGV4IHVzZWQgaW4gZ2VuZXJhdGluZyBuZXcgT2JqZWN0SWQncyBvbiB0aGUgZHJpdmVyXG4gICAgICogXG4gICAgICogQG1ldGhvZCBPYmplY3RJZCNnZXRfaW5jXG4gICAgICogQHByaXZhdGVcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IE5leHQgaW5kZXggdmFsdWUuXG4gICAgICovXG4gICAgZ2V0SW5jKCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0SWQuaW5kZXggPSAoT2JqZWN0SWQuaW5kZXggKyAxKSAlIDB4RkZGRkZGO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIDEyIGJ5dGUgaWQgc3RyaW5nIHVzZWQgaW4gT2JqZWN0SWQnc1xuICAgICAqXG4gICAgICogQG1ldGhvZCBPYmplY3RJZCNnZW5lcmF0ZVxuICAgICAqIEBwcml2YXRlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFt0aW1lXSAtIFNlY29uZCBiYXNlZCB0aW1lc3RhbXAgdG8gdGhlIGdlbmVyYXRpb24uXG4gICAgICogXG4gICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgMTIgYnl0ZSBpZCBiaW5hcnkgc3RyaW5nLlxuICAgICAqL1xuICAgIGdlbmVyYXRlKHRpbWUpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwodGltZSkgfHwgIV8uaXNOdW1iZXIodGltZSkpIHtcbiAgICAgICAgICAgIHRpbWUgPSBwYXJzZUludChEYXRlLm5vdygpIC8gMTAwMCwgMTApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBmb3IgdGltZS1iYXNlZCBPYmplY3RJZCB0aGUgYnl0ZXMgZm9sbG93aW5nIHRoZSB0aW1lIHdpbGwgYmUgemVyb2VkICovXG4gICAgICAgIHZhciB0aW1lNEJ5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aW1lLCAzMiwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgIHZhciBtYWNoaW5lM0J5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludChNQUNISU5FX0lELCAyNCwgZmFsc2UpO1xuICAgICAgICB2YXIgcGlkMkJ5dGVzID0gQmluYXJ5UGFyc2VyLmZyb21TaG9ydChfLmlzTmlsKHByb2Nlc3MpID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSA6IHByb2Nlc3MucGlkKTtcbiAgICAgICAgdmFyIGluZGV4M0J5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aGlzLmdldEluYygpLCAyNCwgZmFsc2UsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRpbWU0Qnl0ZXMgKyBtYWNoaW5lM0J5dGVzICsgcGlkMkJ5dGVzICsgaW5kZXgzQnl0ZXM7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbXBhcmVzIHRoZSBlcXVhbGl0eSBvZiB0aGlzIE9iamVjdElkIHdpdGggW290aGVySURdLlxuICAgICAqXG4gICAgICogQG1ldGhvZCBPYmplY3RJZCNlcXVhbHNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3RoZXJJRCAtIE9iamVjdElkIGluc3RhbmNlIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVGhlIHJlc3VsdCBvZiBjb21wYXJpbmcgdHdvIE9iamVjdElkJ3NcbiAgICAgKi9cbiAgICBlcXVhbHMob3RoZXJJRCkge1xuICAgICAgICB2YXIgaWQgPSAob3RoZXJJRCBpbnN0YW5jZW9mIE9iamVjdElkIHx8IG90aGVySUQudG9IZXhTdHJpbmcpID8gb3RoZXJJRC5pZCA6IE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcob3RoZXJJRCkuaWQ7XG4gICAgXG4gICAgICAgIHJldHVybiB0aGlzLmlkID09PSBpZDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZ2VuZXJhdGlvbiB0aW1lIGluIHNlY29uZHMgdGhhdCB0aGlzIElEIHdhcyBnZW5lcmF0ZWQuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIE9iamVjdElkI2dldFRpbWVzdGFtcFxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IE51bWJlciBvZiBzZWNvbmRzIGluIHRoZSB0aW1lc3RhbXAgcGFydCBvZiB0aGUgMTIgYnl0ZSBpZC5cbiAgICAgKi9cbiAgICBnZXRUaW1lc3RhbXAoKSB7XG4gICAgICAgIHZhciB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBcbiAgICAgICAgdGltZXN0YW1wLnNldFRpbWUoTWF0aC5mbG9vcihCaW5hcnlQYXJzZXIuZGVjb2RlSW50KHRoaXMuaWQuc3Vic3RyaW5nKDAsIDQpLCAzMiwgdHJ1ZSwgdHJ1ZSkpICogMTAwMCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGltZXN0YW1wO1xuICAgIH1cbiAgICBcbiAgICBcbiAgICAvKiBHRVRURVIgLSBTRVRURVIgKi9cbiAgICBnZXQgZ2VuZXJhdGlvblRpbWUoKSB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKEJpbmFyeVBhcnNlci5kZWNvZGVJbnQodGhpcy5pZC5zdWJzdHJpbmcoMCwgNCksIDMyLCB0cnVlLCB0cnVlKSk7XG4gICAgfVxuICAgIFxuICAgIHNldCBnZW5lcmF0aW9uVGltZSh2YWx1ZSkge1xuICAgICAgICB2YWx1ZSA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodmFsdWUsIDMyLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaWQgPSB2YWx1ZSArIHRoaXMuaWQuc3Vic3RyKDQpO1xuICAgICAgICAvLyBkZWxldGUgdGhpcy5fX2lkO1xuICAgICAgICB0aGlzLnRvSGV4U3RyaW5nKCk7XG4gICAgfVxuICAgIFxuICAgIC8qIFNUQVRJQyBNRVRIT0RTICovXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBPYmplY3RJZC5cbiAgICAgKlxuICAgICAqIEBtZXRob2QgT2JqZWN0SWQjY3JlYXRlRnJvbUhleFN0cmluZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBoZXhTdHJpbmcgLSBBbiBPYmplY3RJZCAyNCBieXRlIGhleHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0SWR9IFRoZSBjcmVhdGVkIE9iamVjdElkXG4gICAgICovXG4gICAgc3RhdGljIGNyZWF0ZUZyb21IZXhTdHJpbmcoaGV4U3RyaW5nKSB7XG4gICAgICAgIC8vIFRocm93IGFuIGVycm9yIGlmIGl0J3Mgbm90IGEgdmFsaWQgc2V0dXBcbiAgICAgICAgaWYodHlwZW9mIGhleFN0cmluZyA9PT0gJ3VuZGVmaW5lZCcgfHwgaGV4U3RyaW5nICE9IG51bGwgJiYgaGV4U3RyaW5nLmxlbmd0aCAhPSAyNCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgbGVuID0gaGV4U3RyaW5nLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIGlmKGxlbiA+IDEyICogMikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJZCBjYW5ub3QgYmUgbG9uZ2VyIHRoYW4gMTIgYnl0ZXMnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHJlc3VsdCA9ICcnLCBcbiAgICAgICAgICAgIHN0cmluZywgXG4gICAgICAgICAgICBudW1iZXI7XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuOyBpbmRleCArPSAyKSB7XG4gICAgICAgICAgICBzdHJpbmcgPSBoZXhTdHJpbmcuc3Vic3RyKGluZGV4LCAyKTtcbiAgICAgICAgICAgIG51bWJlciA9IHBhcnNlSW50KHN0cmluZywgMTYpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXN1bHQgKz0gQmluYXJ5UGFyc2VyLmZyb21CeXRlKG51bWJlcik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBuZXcgT2JqZWN0SWQocmVzdWx0LCBoZXhTdHJpbmcpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIE9iamVjdElkIGZyb20gYSBzZWNvbmQgYmFzZWQgbnVtYmVyLCB3aXRoIHRoZSByZXN0IG9mIHRoZSBPYmplY3RJZCB6ZXJvZWQgb3V0LiBcbiAgICAgKiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJZC5cbiAgICAgKlxuICAgICAqIEBtZXRob2QgT2JqZWN0SWQjY3JlYXRlRnJvbVRpbWVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdGltZSAtIEEgbnVtYmVyIG9mIHNlY29uZHMuXG4gICAgICogXG4gICAgICogQHJldHVybnMge09iamVjdElkfSBUaGUgY3JlYXRlZCBPYmplY3RJZFxuICAgICAqL1xuICAgIHN0YXRpYyBjcmVhdGVGcm9tVGltZSh0aW1lKSB7XG4gICAgICAgIHZhciBpZCA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGltZSwgMzIsIHRydWUsIHRydWUpICsgQmluYXJ5UGFyc2VyLmVuY29kZUludCgwLCA2NCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IE9iamVjdElkKGlkKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SWQgemVyb2VkIG91dC4gVXNlZCBmb3IgY29tcGFyaXNvbnMgb3Igc29ydGluZyB0aGUgT2JqZWN0SWQuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIE9iamVjdElkI2NyZWF0ZVBrXG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgYW4gaW50ZWdlciBudW1iZXIgcmVwcmVzZW50aW5nIGEgbnVtYmVyIG9mIHNlY29uZHMuXG4gICAgICogQHJldHVybiB7T2JqZWN0SWR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJZFxuICAgICAqL1xuICAgIHN0YXRpYyBjcmVhdGVQaygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RJZCgpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLmluZGV4ID0gMDtcblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJZDsiXX0=
