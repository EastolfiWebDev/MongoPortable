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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk9iamVjdElkLmpzIl0sIm5hbWVzIjpbImxvZ2dlciIsIm1vZHVsZSIsImV4cG9ydHMiLCJCaW5hcnlQYXJzZXIiLCJMb2dnZXIiLCJfIiwiTUFDSElORV9JRCIsInBhcnNlSW50IiwiTWF0aCIsInJhbmRvbSIsImNoZWNrRm9ySGV4UmVnRXhwIiwiUmVnRXhwIiwiaXNWYWxpZEhleFJlZ0V4cCIsInN0ciIsImxlbiIsImxlbmd0aCIsInRlc3QiLCJPYmplY3RJZCIsImlkIiwiX2hleCIsImluc3RhbmNlIiwiX2Jzb250eXBlIiwiaXNOaWwiLCJnZW5lcmF0ZSIsImlzTnVtYmVyIiwiaXNTdHJpbmciLCJfaWQiLCJjcmVhdGVGcm9tSGV4U3RyaW5nIiwidGhyb3ciLCJjYWNoZUhleFN0cmluZyIsIl9faWQiLCJ0b0hleFN0cmluZyIsImhleFN0cmluZyIsIm51bWJlciIsInZhbHVlIiwiaW5kZXgiLCJ0b0J5dGUiLCJ0b1N0cmluZyIsInRpbWUiLCJEYXRlIiwibm93IiwidGltZTRCeXRlcyIsImVuY29kZUludCIsIm1hY2hpbmUzQnl0ZXMiLCJwaWQyQnl0ZXMiLCJmcm9tU2hvcnQiLCJwcm9jZXNzIiwiZmxvb3IiLCJwaWQiLCJpbmRleDNCeXRlcyIsImdldEluYyIsIm90aGVySUQiLCJ0aW1lc3RhbXAiLCJzZXRUaW1lIiwiZGVjb2RlSW50Iiwic3Vic3RyaW5nIiwic3Vic3RyIiwiRXJyb3IiLCJyZXN1bHQiLCJzdHJpbmciLCJmcm9tQnl0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7Ozs7OztBQVNBLElBQUlBLFNBQVMsSUFBYjs7QUFFQUMsT0FBT0MsT0FBUCxHQUFpQixVQUFTQyxZQUFULEVBQXVCQyxNQUF2QixFQUErQkMsQ0FBL0IsRUFBa0M7O0FBRS9DOzs7Ozs7Ozs7QUFTQSxRQUFJQyxhQUFhQyxTQUFTQyxLQUFLQyxNQUFMLEtBQWdCLFFBQXpCLEVBQW1DLEVBQW5DLENBQWpCOztBQUVBO0FBQ0EsUUFBSUMsb0JBQW9CLElBQUlD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Q0FBakI7O0FBRUEsV0FBT2xCLFFBQVA7QUFDSCxDQTdSRCIsImZpbGUiOiJPYmplY3RJZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgT2JqZWN0SWQuanMgLSBiYXNlZCBvbiBNb25nbG8jT2JqZWN0SWQgKHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vTW9uZ2xvfSkgYnkgQ2hyaXN0aWFuIFN1bGxpdmFuIDxjc0BldWZvcmljLmNvPiB8IENvcHlyaWdodCAoYykgMjAxMlxuICogQHZlcnNpb24gMS4wLjBcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgbG9nZ2VyID0gbnVsbDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihCaW5hcnlQYXJzZXIsIExvZ2dlciwgXykge1xuXG4gICAgLyoqXG4gICAgICogTWFjaGluZSBpZC5cbiAgICAgKlxuICAgICAqIENyZWF0ZSBhIHJhbmRvbSAzLWJ5dGUgdmFsdWUgKGkuZS4gdW5pcXVlIGZvciB0aGlzXG4gICAgICogcHJvY2VzcykuIE90aGVyIGRyaXZlcnMgdXNlIGEgbWQ1IG9mIHRoZSBtYWNoaW5lIGlkIGhlcmUsIGJ1dFxuICAgICAqIHRoYXQgd291bGQgbWVhbiBhbiBhc3ljIGNhbGwgdG8gZ2V0aG9zdG5hbWUsIHNvIHdlIGRvbid0IGJvdGhlci5cbiAgICAgKiBcbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgdmFyIE1BQ0hJTkVfSUQgPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcbiAgICBcbiAgICAvLyBSZWd1bGFyIGV4cHJlc3Npb24gdGhhdCBjaGVja3MgZm9yIGhleCB2YWx1ZVxuICAgIHZhciBjaGVja0ZvckhleFJlZ0V4cCA9IG5ldyBSZWdFeHAoXCJeWzAtOWEtZkEtRl17MjR9JFwiKTtcbiAgICB2YXIgaXNWYWxpZEhleFJlZ0V4cCA9IGZ1bmN0aW9uKHN0ciwgbGVuID0gMjQpIHtcbiAgICAgICAgaWYgKHN0ci5sZW5ndGggPT09IGxlbiAmJiBjaGVja0ZvckhleFJlZ0V4cC50ZXN0KHN0cikpIHJldHVybiB0cnVlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogT2JqZWN0SWRcbiAgICAgKiBcbiAgICAgKiBAbW9kdWxlIE9iamVjdElkXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHNpbmNlIDAuMC4xXG4gICAgICogXG4gICAgICogQGNsYXNzZGVzYyBSZXByZXNlbnRzIHRoZSBCU09OIE9iamVjdElkIHR5cGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IGlkIC0gQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nLCBhIDEyIGJ5dGUgYmluYXJ5IHN0cmluZyBvciBhIE51bWJlci5cbiAgICAgKi9cbiAgICBjbGFzcyBPYmplY3RJZCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGlkLCBfaGV4KSB7XG4gICAgICAgICAgICAvLyBpZiAoISh0aGlzIGluc3RhbmNlb2YgT2JqZWN0SWQpKSByZXR1cm4gbmV3IE9iamVjdElkKGlkLCBfaGV4KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLl9ic29udHlwZSA9ICdPYmplY3RJZCc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHZhciBfX2lkID0gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNOaWwoaWQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pZCA9IHRoaXMuZ2VuZXJhdGUoaWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc051bWJlcihpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pZCA9IHRoaXMuZ2VuZXJhdGUoaWQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0cmluZyBvciBIZXhcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNTdHJpbmcoaWQpICYmIChpZC5sZW5ndGggPT09IDEyIHx8IGlkLmxlbmd0aCA9PT0gMjQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNWYWxpZEhleFJlZ0V4cChpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBWYWxpZCBIZXhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgX2lkID0gT2JqZWN0SWQuY3JlYXRlRnJvbUhleFN0cmluZyhpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pZCA9IF9pZC5pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gIGVsc2UgaWYgKGlkLmxlbmd0aCA9PT0gMTIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBWYWxpZCBCeXRlIFN0cmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVmFsdWUgcGFzc2VkIGluIGlzIG5vdCBhIHZhbGlkIDI0IGNoYXJhY3RlciBoZXggc3RyaW5nXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaHJvdyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhIHZhbGlkIHNldHVwXG4gICAgICAgICAgICAvLyBpZiAoaWQgIT0gbnVsbCAmJiAnbnVtYmVyJyAhPSB0eXBlb2YgaWQgJiYgKGlkLmxlbmd0aCAhPSAxMiAmJiBpZC5sZW5ndGggIT0gMjQpKSB7XG4gICAgICAgICAgICAvLyAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBpZCBiYXNlZCBvbiB0aGUgaW5wdXRcbiAgICAgICAgICAgIC8vIGlmIChpZCA9PSBudWxsIHx8IHR5cGVvZiBpZCA9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgLy8gICAgIC8vIGNvbnZlcnQgdG8gMTIgYnl0ZSBiaW5hcnkgc3RyaW5nXG4gICAgICAgICAgICAvLyAgICAgdGhpcy5pZCA9IHRoaXMuZ2VuZXJhdGUoaWQpO1xuICAgICAgICAgICAgLy8gfSBlbHNlIGlmIChpZCAhPSBudWxsICYmIGlkLmxlbmd0aCA9PT0gMTIpIHtcbiAgICAgICAgICAgIC8vICAgICAvLyBhc3N1bWUgMTIgYnl0ZSBzdHJpbmdcbiAgICAgICAgICAgIC8vICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgICAgICAvLyB9IGVsc2UgaWYgKGNoZWNrRm9ySGV4UmVnRXhwLnRlc3QoaWQpKSB7XG4gICAgICAgICAgICAvLyAgICAgcmV0dXJuIE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcoaWQpO1xuICAgICAgICAgICAgLy8gfSBlbHNlIGlmICghY2hlY2tGb3JIZXhSZWdFeHAudGVzdChpZCkpIHtcbiAgICAgICAgICAgIC8vICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWYWx1ZSBwYXNzZWQgaW4gaXMgbm90IGEgdmFsaWQgMjQgY2hhcmFjdGVyIGhleCBzdHJpbmdcIik7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChPYmplY3RJZC5jYWNoZUhleFN0cmluZykge1xuICAgICAgICAgICAgICAgIHRoaXMuX19pZCA9IHRoaXMudG9IZXhTdHJpbmcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogSU5TVEFOQ0UgTUVUSE9EUyAqL1xuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybiB0aGUgT2JqZWN0SWQgaWQgYXMgYSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgICAgICogXG4gICAgICAgICAqIEBtZXRob2QgT2JqZWN0SWQjdG9IZXhTdHJpbmdcbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAgICAgICAgICovXG4gICAgICAgIHRvSGV4U3RyaW5nKCkge1xuICAgICAgICAgICAgaWYgKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nICYmIHRoaXMuX19pZCkgcmV0dXJuIHRoaXMuX19pZDtcbiAgICAgICAgXG4gICAgICAgICAgICB2YXIgaGV4U3RyaW5nID0gJycsXG4gICAgICAgICAgICAgICAgbnVtYmVyLFxuICAgICAgICAgICAgICAgIHZhbHVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDAsIGxlbiA9IHRoaXMuaWQubGVuZ3RoOyBpbmRleCA8IGxlbjsgaW5kZXgrKykge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gQmluYXJ5UGFyc2VyLnRvQnl0ZSh0aGlzLmlkW2luZGV4XSk7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gdmFsdWUgPD0gMTUgPyAnMCcgKyB2YWx1ZS50b1N0cmluZygxNikgOiB2YWx1ZS50b1N0cmluZygxNik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaGV4U3RyaW5nID0gaGV4U3RyaW5nICsgbnVtYmVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9faWQgPSBoZXhTdHJpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBoZXhTdHJpbmc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbGlhcyBmb3Ige0BsaW5rIE9iamVjdElkI3RvSGV4U3RyaW5nfVxuICAgICAgICAgKiBcbiAgICAgICAgICogQG1ldGhvZCBDdXJzb3IjbmV4dFxuICAgICAgICAgKi9cbiAgICAgICAgdG9TdHJpbmcoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0hleFN0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogQWxpYXMgZm9yIHtAbGluayBPYmplY3RJZCN0b0hleFN0cmluZ31cbiAgICAgICAgICogXG4gICAgICAgICAqIEBtZXRob2QgQ3Vyc29yI25leHRcbiAgICAgICAgICovXG4gICAgICAgIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVcGRhdGUgdGhlIE9iamVjdElkIGluZGV4IHVzZWQgaW4gZ2VuZXJhdGluZyBuZXcgT2JqZWN0SWQncyBvbiB0aGUgZHJpdmVyXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAbWV0aG9kIE9iamVjdElkI2dldF9pbmNcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybnMge051bWJlcn0gTmV4dCBpbmRleCB2YWx1ZS5cbiAgICAgICAgICovXG4gICAgICAgIGdldEluYygpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3RJZC5pbmRleCA9IChPYmplY3RJZC5pbmRleCArIDEpICUgMHhGRkZGRkY7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZW5lcmF0ZSBhIDEyIGJ5dGUgaWQgc3RyaW5nIHVzZWQgaW4gT2JqZWN0SWQnc1xuICAgICAgICAgKlxuICAgICAgICAgKiBAbWV0aG9kIE9iamVjdElkI2dlbmVyYXRlXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gW3RpbWVdIC0gU2Vjb25kIGJhc2VkIHRpbWVzdGFtcCB0byB0aGUgZ2VuZXJhdGlvbi5cbiAgICAgICAgICogXG4gICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIDEyIGJ5dGUgaWQgYmluYXJ5IHN0cmluZy5cbiAgICAgICAgICovXG4gICAgICAgIGdlbmVyYXRlKHRpbWUpIHtcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHRpbWUpIHx8ICFfLmlzTnVtYmVyKHRpbWUpKSB7XG4gICAgICAgICAgICAgICAgdGltZSA9IHBhcnNlSW50KERhdGUubm93KCkgLyAxMDAwLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8qIGZvciB0aW1lLWJhc2VkIE9iamVjdElkIHRoZSBieXRlcyBmb2xsb3dpbmcgdGhlIHRpbWUgd2lsbCBiZSB6ZXJvZWQgKi9cbiAgICAgICAgICAgIHZhciB0aW1lNEJ5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aW1lLCAzMiwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICB2YXIgbWFjaGluZTNCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQoTUFDSElORV9JRCwgMjQsIGZhbHNlKTtcbiAgICAgICAgICAgIHZhciBwaWQyQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZnJvbVNob3J0KF8uaXNOaWwocHJvY2VzcykgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDApIDogcHJvY2Vzcy5waWQpO1xuICAgICAgICAgICAgdmFyIGluZGV4M0J5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aGlzLmdldEluYygpLCAyNCwgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGltZTRCeXRlcyArIG1hY2hpbmUzQnl0ZXMgKyBwaWQyQnl0ZXMgKyBpbmRleDNCeXRlcztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbXBhcmVzIHRoZSBlcXVhbGl0eSBvZiB0aGlzIE9iamVjdElkIHdpdGggW290aGVySURdLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAbWV0aG9kIE9iamVjdElkI2VxdWFsc1xuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG90aGVySUQgLSBPYmplY3RJZCBpbnN0YW5jZSB0byBjb21wYXJlIGFnYWluc3QuXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVGhlIHJlc3VsdCBvZiBjb21wYXJpbmcgdHdvIE9iamVjdElkJ3NcbiAgICAgICAgICovXG4gICAgICAgIGVxdWFscyhvdGhlcklEKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSAob3RoZXJJRCBpbnN0YW5jZW9mIE9iamVjdElkIHx8IG90aGVySUQudG9IZXhTdHJpbmcpID8gb3RoZXJJRC5pZCA6IE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcob3RoZXJJRCkuaWQ7XG4gICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaWQgPT09IGlkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJucyB0aGUgZ2VuZXJhdGlvbiB0aW1lIGluIHNlY29uZHMgdGhhdCB0aGlzIElEIHdhcyBnZW5lcmF0ZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBtZXRob2QgT2JqZWN0SWQjZ2V0VGltZXN0YW1wXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBOdW1iZXIgb2Ygc2Vjb25kcyBpbiB0aGUgdGltZXN0YW1wIHBhcnQgb2YgdGhlIDEyIGJ5dGUgaWQuXG4gICAgICAgICAqL1xuICAgICAgICBnZXRUaW1lc3RhbXAoKSB7XG4gICAgICAgICAgICB2YXIgdGltZXN0YW1wID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGltZXN0YW1wLnNldFRpbWUoTWF0aC5mbG9vcihCaW5hcnlQYXJzZXIuZGVjb2RlSW50KHRoaXMuaWQuc3Vic3RyaW5nKDAsIDQpLCAzMiwgdHJ1ZSwgdHJ1ZSkpICogMTAwMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aW1lc3RhbXA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvKiBHRVRURVIgLSBTRVRURVIgKi9cbiAgICAgICAgZ2V0IGdlbmVyYXRpb25UaW1lKCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoQmluYXJ5UGFyc2VyLmRlY29kZUludCh0aGlzLmlkLnN1YnN0cmluZygwLCA0KSwgMzIsIHRydWUsIHRydWUpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc2V0IGdlbmVyYXRpb25UaW1lKHZhbHVlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodmFsdWUsIDMyLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5pZCA9IHZhbHVlICsgdGhpcy5pZC5zdWJzdHIoNCk7XG4gICAgICAgICAgICAvLyBkZWxldGUgdGhpcy5fX2lkO1xuICAgICAgICAgICAgdGhpcy50b0hleFN0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBTVEFUSUMgTUVUSE9EUyAqL1xuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYW4gT2JqZWN0SWQgZnJvbSBhIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYW4gT2JqZWN0SWQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBtZXRob2QgT2JqZWN0SWQjY3JlYXRlRnJvbUhleFN0cmluZ1xuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGhleFN0cmluZyAtIEFuIE9iamVjdElkIDI0IGJ5dGUgaGV4c3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHJldHVybnMge09iamVjdElkfSBUaGUgY3JlYXRlZCBPYmplY3RJZFxuICAgICAgICAgKi9cbiAgICAgICAgc3RhdGljIGNyZWF0ZUZyb21IZXhTdHJpbmcoaGV4U3RyaW5nKSB7XG4gICAgICAgICAgICAvLyBUaHJvdyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhIHZhbGlkIHNldHVwXG4gICAgICAgICAgICBpZihfLmlzTmlsKGhleFN0cmluZykgfHwgaGV4U3RyaW5nLmxlbmd0aCAhPSAyNCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGxlbiA9IGhleFN0cmluZy5sZW5ndGg7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSAnJywgXG4gICAgICAgICAgICAgICAgc3RyaW5nLCBcbiAgICAgICAgICAgICAgICBudW1iZXI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW47IGluZGV4ICs9IDIpIHtcbiAgICAgICAgICAgICAgICBzdHJpbmcgPSBoZXhTdHJpbmcuc3Vic3RyKGluZGV4LCAyKTtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBwYXJzZUludChzdHJpbmcsIDE2KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gQmluYXJ5UGFyc2VyLmZyb21CeXRlKG51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JqZWN0SWQocmVzdWx0LCBoZXhTdHJpbmcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SWQgemVyb2VkIG91dC4gXG4gICAgICAgICAqIFVzZWQgZm9yIGNvbXBhcmlzb25zIG9yIHNvcnRpbmcgdGhlIE9iamVjdElkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAbWV0aG9kIE9iamVjdElkI2NyZWF0ZUZyb21UaW1lXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gdGltZSAtIEEgbnVtYmVyIG9mIHNlY29uZHMuXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0SWR9IFRoZSBjcmVhdGVkIE9iamVjdElkXG4gICAgICAgICAqL1xuICAgICAgICBzdGF0aWMgY3JlYXRlRnJvbVRpbWUodGltZSkge1xuICAgICAgICAgICAgdmFyIGlkID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aW1lLCAzMiwgdHJ1ZSwgdHJ1ZSkgKyBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KDAsIDY0LCB0cnVlLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RJZChpZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGFuIE9iamVjdElkIGZyb20gYSBzZWNvbmQgYmFzZWQgbnVtYmVyLCB3aXRoIHRoZSByZXN0IG9mIHRoZSBPYmplY3RJZCB6ZXJvZWQgb3V0LiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJZC5cbiAgICAgICAgICpcbiAgICAgICAgICogQG1ldGhvZCBPYmplY3RJZCNjcmVhdGVQa1xuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgYW4gaW50ZWdlciBudW1iZXIgcmVwcmVzZW50aW5nIGEgbnVtYmVyIG9mIHNlY29uZHMuXG4gICAgICAgICAqIEByZXR1cm4ge09iamVjdElkfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SWRcbiAgICAgICAgICovXG4gICAgICAgIHN0YXRpYyBjcmVhdGVQaygpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JqZWN0SWQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgT2JqZWN0SWQuaW5kZXggPSAwO1xuICAgIFxuICAgIHJldHVybiBPYmplY3RJZDtcbn07Il19
