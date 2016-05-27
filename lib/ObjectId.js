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
//# sourceMappingURL=data:application/json;base64,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QUFTLE1BQVQsRUFBaUIsRUFBakIsQ0FBVDs7QUFFQSwwQkFBVSxhQUFhLFFBQWIsQ0FBc0IsTUFBdEIsQ0FBVjtBQUNIOztBQUVELG1CQUFPLElBQUksUUFBSixDQUFhLE1BQWIsRUFBcUIsU0FBckIsQ0FBUDtBQUNIOzs7Ozs7Ozs7Ozs7Ozs7dUNBWXFCLEksRUFBTTtBQUN4QixnQkFBSSxLQUFLLGFBQWEsU0FBYixDQUF1QixJQUF2QixFQUE2QixFQUE3QixFQUFpQyxJQUFqQyxFQUF1QyxJQUF2QyxJQUErQyxhQUFhLFNBQWIsQ0FBdUIsQ0FBdkIsRUFBMEIsRUFBMUIsRUFBOEIsSUFBOUIsRUFBb0MsSUFBcEMsQ0FBeEQ7O0FBRUEsbUJBQU8sSUFBSSxRQUFKLENBQWEsRUFBYixDQUFQO0FBQ0g7Ozs7Ozs7Ozs7Ozs7bUNBVWlCO0FBQ2QsbUJBQU8sSUFBSSxRQUFKLEVBQVA7QUFDSDs7Ozs7Ozs7Ozs7QUFNTCxTQUFTLEtBQVQsR0FBaUIsQ0FBakI7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLFFBQWpCIiwiZmlsZSI6Ik9iamVjdElkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBPYmplY3RJZC5qcyAtIGJhc2VkIG9uIE1vbmdsbyNPYmplY3RJZCAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpLFxuICAgIExvZ2dlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0xvZ2dlclwiKSxcbiAgICBCaW5hcnlQYXJzZXIgPSByZXF1aXJlKFwiLi9CaW5hcnlQYXJzZXJcIik7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcblxuLyoqXG4gKiBNYWNoaW5lIGlkLlxuICpcbiAqIENyZWF0ZSBhIHJhbmRvbSAzLWJ5dGUgdmFsdWUgKGkuZS4gdW5pcXVlIGZvciB0aGlzXG4gKiBwcm9jZXNzKS4gT3RoZXIgZHJpdmVycyB1c2UgYSBtZDUgb2YgdGhlIG1hY2hpbmUgaWQgaGVyZSwgYnV0XG4gKiB0aGF0IHdvdWxkIG1lYW4gYW4gYXN5YyBjYWxsIHRvIGdldGhvc3RuYW1lLCBzbyB3ZSBkb24ndCBib3RoZXIuXG4gKiBcbiAqIEBpZ25vcmVcbiAqL1xudmFyIE1BQ0hJTkVfSUQgPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcblxuLy8gUmVndWxhciBleHByZXNzaW9uIHRoYXQgY2hlY2tzIGZvciBoZXggdmFsdWVcbnZhciBjaGVja0ZvckhleFJlZ0V4cCA9IG5ldyBSZWdFeHAoXCJeWzAtOWEtZkEtRl17MjR9JFwiKTtcbnZhciBpc1ZhbGlkSGV4UmVnRXhwID0gZnVuY3Rpb24oc3RyLCBsZW4gPSAyNCkge1xuICAgIGlmIChzdHIubGVuZ3RoID09PSBsZW4gJiYgY2hlY2tGb3JIZXhSZWdFeHAudGVzdChzdHIpKSByZXR1cm4gdHJ1ZTtcbiAgICBcbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIE9iamVjdElkXG4gKiBcbiAqIEBtb2R1bGUgT2JqZWN0SWRcbiAqIEBjb25zdHJ1Y3RvclxuICogQHNpbmNlIDAuMC4xXG4gKiBcbiAqIEBjbGFzc2Rlc2MgUmVwcmVzZW50cyB0aGUgQlNPTiBPYmplY3RJZCB0eXBlXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gaWQgLSBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcsIGEgMTIgYnl0ZSBiaW5hcnkgc3RyaW5nIG9yIGEgTnVtYmVyLlxuICovXG5jbGFzcyBPYmplY3RJZCB7XG4gICAgY29uc3RydWN0b3IoaWQsIF9oZXgpIHtcbiAgICAgICAgLy8gaWYgKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIG5ldyBPYmplY3RJZChpZCwgX2hleCk7XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9ic29udHlwZSA9ICdPYmplY3RJZCc7XG4gICAgICAgIFxuICAgICAgICAvLyB2YXIgX19pZCA9IG51bGw7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChpZCkpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSB0aGlzLmdlbmVyYXRlKGlkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChfLmlzTnVtYmVyKGlkKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaWQgPSB0aGlzLmdlbmVyYXRlKGlkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU3RyaW5nIG9yIEhleFxuICAgICAgICAgICAgICAgIGlmIChfLmlzU3RyaW5nKGlkKSAmJiAoaWQubGVuZ3RoID09PSAxMiB8fCBpZC5sZW5ndGggPT09IDI0KSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNWYWxpZEhleFJlZ0V4cChpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFZhbGlkIEhleFxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IF9pZCA9IE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcoaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pZCA9IF9pZC5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSAgZWxzZSBpZiAoaWQubGVuZ3RoID09PSAxMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVmFsaWQgQnl0ZSBTdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIlZhbHVlIHBhc3NlZCBpbiBpcyBub3QgYSB2YWxpZCAyNCBjaGFyYWN0ZXIgaGV4IHN0cmluZ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRocm93IGFuIGVycm9yIGlmIGl0J3Mgbm90IGEgdmFsaWQgc2V0dXBcbiAgICAgICAgLy8gaWYgKGlkICE9IG51bGwgJiYgJ251bWJlcicgIT0gdHlwZW9mIGlkICYmIChpZC5sZW5ndGggIT0gMTIgJiYgaWQubGVuZ3RoICE9IDI0KSkge1xuICAgICAgICAvLyAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuICAgICAgICAvLyB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZW5lcmF0ZSBpZCBiYXNlZCBvbiB0aGUgaW5wdXRcbiAgICAgICAgLy8gaWYgKGlkID09IG51bGwgfHwgdHlwZW9mIGlkID09ICdudW1iZXInKSB7XG4gICAgICAgIC8vICAgICAvLyBjb252ZXJ0IHRvIDEyIGJ5dGUgYmluYXJ5IHN0cmluZ1xuICAgICAgICAvLyAgICAgdGhpcy5pZCA9IHRoaXMuZ2VuZXJhdGUoaWQpO1xuICAgICAgICAvLyB9IGVsc2UgaWYgKGlkICE9IG51bGwgJiYgaWQubGVuZ3RoID09PSAxMikge1xuICAgICAgICAvLyAgICAgLy8gYXNzdW1lIDEyIGJ5dGUgc3RyaW5nXG4gICAgICAgIC8vICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIC8vIH0gZWxzZSBpZiAoY2hlY2tGb3JIZXhSZWdFeHAudGVzdChpZCkpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBPYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nKGlkKTtcbiAgICAgICAgLy8gfSBlbHNlIGlmICghY2hlY2tGb3JIZXhSZWdFeHAudGVzdChpZCkpIHtcbiAgICAgICAgLy8gICAgIHRocm93IG5ldyBFcnJvcihcIlZhbHVlIHBhc3NlZCBpbiBpcyBub3QgYSB2YWxpZCAyNCBjaGFyYWN0ZXIgaGV4IHN0cmluZ1wiKTtcbiAgICAgICAgLy8gfVxuICAgICAgICBcbiAgICAgICAgaWYgKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nKSB7XG4gICAgICAgICAgICB0aGlzLl9faWQgPSB0aGlzLnRvSGV4U3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyogSU5TVEFOQ0UgTUVUSE9EUyAqL1xuICAgIFxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgT2JqZWN0SWQgaWQgYXMgYSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIE9iamVjdElkI3RvSGV4U3RyaW5nXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICAgICAqL1xuICAgIHRvSGV4U3RyaW5nKCkge1xuICAgICAgICBpZiAoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcgJiYgdGhpcy5fX2lkKSByZXR1cm4gdGhpcy5fX2lkO1xuICAgIFxuICAgICAgICB2YXIgaGV4U3RyaW5nID0gJycsXG4gICAgICAgICAgICBudW1iZXIsXG4gICAgICAgICAgICB2YWx1ZTtcbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGluZGV4ID0gMCwgbGVuID0gdGhpcy5pZC5sZW5ndGg7IGluZGV4IDwgbGVuOyBpbmRleCsrKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IEJpbmFyeVBhcnNlci50b0J5dGUodGhpcy5pZFtpbmRleF0pO1xuICAgICAgICAgICAgbnVtYmVyID0gdmFsdWUgPD0gMTUgPyAnMCcgKyB2YWx1ZS50b1N0cmluZygxNikgOiB2YWx1ZS50b1N0cmluZygxNik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGhleFN0cmluZyA9IGhleFN0cmluZyArIG51bWJlcjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nKSB7XG4gICAgICAgICAgICB0aGlzLl9faWQgPSBoZXhTdHJpbmc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBoZXhTdHJpbmc7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEFsaWFzIGZvciB7QGxpbmsgT2JqZWN0SWQjdG9IZXhTdHJpbmd9XG4gICAgICogXG4gICAgICogQG1ldGhvZCBDdXJzb3IjbmV4dFxuICAgICAqL1xuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b0hleFN0cmluZygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBBbGlhcyBmb3Ige0BsaW5rIE9iamVjdElkI3RvSGV4U3RyaW5nfVxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ3Vyc29yI25leHRcbiAgICAgKi9cbiAgICB0b0pTT04oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgT2JqZWN0SWQgaW5kZXggdXNlZCBpbiBnZW5lcmF0aW5nIG5ldyBPYmplY3RJZCdzIG9uIHRoZSBkcml2ZXJcbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIE9iamVjdElkI2dldF9pbmNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqXG4gICAgICogQHJldHVybnMge051bWJlcn0gTmV4dCBpbmRleCB2YWx1ZS5cbiAgICAgKi9cbiAgICBnZXRJbmMoKSB7XG4gICAgICAgIHJldHVybiBPYmplY3RJZC5pbmRleCA9IChPYmplY3RJZC5pbmRleCArIDEpICUgMHhGRkZGRkY7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGEgMTIgYnl0ZSBpZCBzdHJpbmcgdXNlZCBpbiBPYmplY3RJZCdzXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIE9iamVjdElkI2dlbmVyYXRlXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW3RpbWVdIC0gU2Vjb25kIGJhc2VkIHRpbWVzdGFtcCB0byB0aGUgZ2VuZXJhdGlvbi5cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSAxMiBieXRlIGlkIGJpbmFyeSBzdHJpbmcuXG4gICAgICovXG4gICAgZ2VuZXJhdGUodGltZSkge1xuICAgICAgICBpZiAoXy5pc05pbCh0aW1lKSB8fCAhXy5pc051bWJlcih0aW1lKSkge1xuICAgICAgICAgICAgdGltZSA9IHBhcnNlSW50KERhdGUubm93KCkgLyAxMDAwLCAxMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIGZvciB0aW1lLWJhc2VkIE9iamVjdElkIHRoZSBieXRlcyBmb2xsb3dpbmcgdGhlIHRpbWUgd2lsbCBiZSB6ZXJvZWQgKi9cbiAgICAgICAgdmFyIHRpbWU0Qnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRpbWUsIDMyLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgdmFyIG1hY2hpbmUzQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KE1BQ0hJTkVfSUQsIDI0LCBmYWxzZSk7XG4gICAgICAgIHZhciBwaWQyQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZnJvbVNob3J0KF8uaXNOaWwocHJvY2VzcykgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDApIDogcHJvY2Vzcy5waWQpO1xuICAgICAgICB2YXIgaW5kZXgzQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRoaXMuZ2V0SW5jKCksIDI0LCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGltZTRCeXRlcyArIG1hY2hpbmUzQnl0ZXMgKyBwaWQyQnl0ZXMgKyBpbmRleDNCeXRlcztcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ29tcGFyZXMgdGhlIGVxdWFsaXR5IG9mIHRoaXMgT2JqZWN0SWQgd2l0aCBbb3RoZXJJRF0uXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIE9iamVjdElkI2VxdWFsc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvdGhlcklEIC0gT2JqZWN0SWQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUaGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SWQnc1xuICAgICAqL1xuICAgIGVxdWFscyhvdGhlcklEKSB7XG4gICAgICAgIHZhciBpZCA9IChvdGhlcklEIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgb3RoZXJJRC50b0hleFN0cmluZykgPyBvdGhlcklELmlkIDogT2JqZWN0SWQuY3JlYXRlRnJvbUhleFN0cmluZyhvdGhlcklEKS5pZDtcbiAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuaWQgPT09IGlkO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBnZW5lcmF0aW9uIHRpbWUgaW4gc2Vjb25kcyB0aGF0IHRoaXMgSUQgd2FzIGdlbmVyYXRlZC5cbiAgICAgKlxuICAgICAqIEBtZXRob2QgT2JqZWN0SWQjZ2V0VGltZXN0YW1wXG4gICAgICogXG4gICAgICogQHJldHVybnMge051bWJlcn0gTnVtYmVyIG9mIHNlY29uZHMgaW4gdGhlIHRpbWVzdGFtcCBwYXJ0IG9mIHRoZSAxMiBieXRlIGlkLlxuICAgICAqL1xuICAgIGdldFRpbWVzdGFtcCgpIHtcbiAgICAgICAgdmFyIHRpbWVzdGFtcCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIFxuICAgICAgICB0aW1lc3RhbXAuc2V0VGltZShNYXRoLmZsb29yKEJpbmFyeVBhcnNlci5kZWNvZGVJbnQodGhpcy5pZC5zdWJzdHJpbmcoMCwgNCksIDMyLCB0cnVlLCB0cnVlKSkgKiAxMDAwKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aW1lc3RhbXA7XG4gICAgfVxuICAgIFxuICAgIFxuICAgIC8qIEdFVFRFUiAtIFNFVFRFUiAqL1xuICAgIGdldCBnZW5lcmF0aW9uVGltZSgpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoQmluYXJ5UGFyc2VyLmRlY29kZUludCh0aGlzLmlkLnN1YnN0cmluZygwLCA0KSwgMzIsIHRydWUsIHRydWUpKTtcbiAgICB9XG4gICAgXG4gICAgc2V0IGdlbmVyYXRpb25UaW1lKHZhbHVlKSB7XG4gICAgICAgIHZhbHVlID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh2YWx1ZSwgMzIsIHRydWUsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5pZCA9IHZhbHVlICsgdGhpcy5pZC5zdWJzdHIoNCk7XG4gICAgICAgIC8vIGRlbGV0ZSB0aGlzLl9faWQ7XG4gICAgICAgIHRoaXMudG9IZXhTdHJpbmcoKTtcbiAgICB9XG4gICAgXG4gICAgLyogU1RBVElDIE1FVEhPRFMgKi9cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIE9iamVjdElkIGZyb20gYSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIE9iamVjdElkLlxuICAgICAqXG4gICAgICogQG1ldGhvZCBPYmplY3RJZCNjcmVhdGVGcm9tSGV4U3RyaW5nXG4gICAgICogXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGhleFN0cmluZyAtIEFuIE9iamVjdElkIDI0IGJ5dGUgaGV4c3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtPYmplY3RJZH0gVGhlIGNyZWF0ZWQgT2JqZWN0SWRcbiAgICAgKi9cbiAgICBzdGF0aWMgY3JlYXRlRnJvbUhleFN0cmluZyhoZXhTdHJpbmcpIHtcbiAgICAgICAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICAgICAgICBpZihfLmlzTmlsKGhleFN0cmluZykgfHwgaGV4U3RyaW5nLmxlbmd0aCAhPSAyNCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgbGVuID0gaGV4U3RyaW5nLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIHZhciByZXN1bHQgPSAnJywgXG4gICAgICAgICAgICBzdHJpbmcsIFxuICAgICAgICAgICAgbnVtYmVyO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbjsgaW5kZXggKz0gMikge1xuICAgICAgICAgICAgc3RyaW5nID0gaGV4U3RyaW5nLnN1YnN0cihpbmRleCwgMik7XG4gICAgICAgICAgICBudW1iZXIgPSBwYXJzZUludChzdHJpbmcsIDE2KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzdWx0ICs9IEJpbmFyeVBhcnNlci5mcm9tQnl0ZShudW1iZXIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IE9iamVjdElkKHJlc3VsdCwgaGV4U3RyaW5nKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SWQgemVyb2VkIG91dC4gXG4gICAgICogVXNlZCBmb3IgY29tcGFyaXNvbnMgb3Igc29ydGluZyB0aGUgT2JqZWN0SWQuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIE9iamVjdElkI2NyZWF0ZUZyb21UaW1lXG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgLSBBIG51bWJlciBvZiBzZWNvbmRzLlxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtPYmplY3RJZH0gVGhlIGNyZWF0ZWQgT2JqZWN0SWRcbiAgICAgKi9cbiAgICBzdGF0aWMgY3JlYXRlRnJvbVRpbWUodGltZSkge1xuICAgICAgICB2YXIgaWQgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRpbWUsIDMyLCB0cnVlLCB0cnVlKSArIEJpbmFyeVBhcnNlci5lbmNvZGVJbnQoMCwgNjQsIHRydWUsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RJZChpZCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gT2JqZWN0SWQgZnJvbSBhIHNlY29uZCBiYXNlZCBudW1iZXIsIHdpdGggdGhlIHJlc3Qgb2YgdGhlIE9iamVjdElkIHplcm9lZCBvdXQuIFVzZWQgZm9yIGNvbXBhcmlzb25zIG9yIHNvcnRpbmcgdGhlIE9iamVjdElkLlxuICAgICAqXG4gICAgICogQG1ldGhvZCBPYmplY3RJZCNjcmVhdGVQa1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGFuIGludGVnZXIgbnVtYmVyIHJlcHJlc2VudGluZyBhIG51bWJlciBvZiBzZWNvbmRzLlxuICAgICAqIEByZXR1cm4ge09iamVjdElkfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SWRcbiAgICAgKi9cbiAgICBzdGF0aWMgY3JlYXRlUGsoKSB7XG4gICAgICAgIHJldHVybiBuZXcgT2JqZWN0SWQoKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5pbmRleCA9IDA7XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0SWQ7Il19
