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
//# sourceMappingURL=data:application/json;base64,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VUFBVSxNQUFwQjs7QUFFQSxvQkFBSSxTQUFTLEVBQWI7b0JBQ0ksTUFESjtvQkFFSSxNQUZKOztBQUlBLHFCQUFLLElBQUksUUFBUSxDQUFqQixFQUFvQixRQUFRLEdBQTVCLEVBQWlDLFNBQVMsQ0FBMUMsRUFBNkM7QUFDekMsNkJBQVMsVUFBVSxNQUFWLENBQWlCLEtBQWpCLEVBQXdCLENBQXhCLENBQVQ7QUFDQSw2QkFBUyxTQUFTLE1BQVQsRUFBaUIsRUFBakIsQ0FBVDs7QUFFQSw4QkFBVSxhQUFhLFFBQWIsQ0FBc0IsTUFBdEIsQ0FBVjtBQUNIOztBQUVELHVCQUFPLElBQUksUUFBSixDQUFhLE1BQWIsRUFBcUIsU0FBckIsQ0FBUDtBQUNIOzs7Ozs7Ozs7Ozs7O0FBeFAwQztBQUFBO0FBQUEsMkNBb1FyQixJQXBRcUIsRUFvUWY7QUFDeEIsb0JBQUksS0FBSyxhQUFhLFNBQWIsQ0FBdUIsSUFBdkIsRUFBNkIsRUFBN0IsRUFBaUMsSUFBakMsRUFBdUMsSUFBdkMsSUFBK0MsYUFBYSxTQUFiLENBQXVCLENBQXZCLEVBQTBCLEVBQTFCLEVBQThCLElBQTlCLEVBQW9DLElBQXBDLENBQXhEOztBQUVBLHVCQUFPLElBQUksUUFBSixDQUFhLEVBQWIsQ0FBUDtBQUNIOzs7Ozs7Ozs7OztBQXhRMEM7QUFBQTtBQUFBLHVDQWtSekI7QUFDZCx1QkFBTyxJQUFJLFFBQUosRUFBUDtBQUNIO0FBcFIwQzs7QUFBQTtBQUFBOzs7Ozs7O0FBMFIvQyxhQUFTLEtBQVQsR0FBaUIsQ0FBakI7O0FBRUEsV0FBTyxRQUFQO0FBQ0gsQ0E3UkQiLCJmaWxlIjoiT2JqZWN0SWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIE9iamVjdElkLmpzIC0gYmFzZWQgb24gTW9uZ2xvI09iamVjdElkICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIGxvZ2dlciA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQmluYXJ5UGFyc2VyLCBMb2dnZXIsIF8pIHtcblxuICAgIC8qKlxuICAgICAqIE1hY2hpbmUgaWQuXG4gICAgICpcbiAgICAgKiBDcmVhdGUgYSByYW5kb20gMy1ieXRlIHZhbHVlIChpLmUuIHVuaXF1ZSBmb3IgdGhpc1xuICAgICAqIHByb2Nlc3MpLiBPdGhlciBkcml2ZXJzIHVzZSBhIG1kNSBvZiB0aGUgbWFjaGluZSBpZCBoZXJlLCBidXRcbiAgICAgKiB0aGF0IHdvdWxkIG1lYW4gYW4gYXN5YyBjYWxsIHRvIGdldGhvc3RuYW1lLCBzbyB3ZSBkb24ndCBib3RoZXIuXG4gICAgICogXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHZhciBNQUNISU5FX0lEID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG4gICAgXG4gICAgLy8gUmVndWxhciBleHByZXNzaW9uIHRoYXQgY2hlY2tzIGZvciBoZXggdmFsdWVcbiAgICB2YXIgY2hlY2tGb3JIZXhSZWdFeHAgPSBuZXcgUmVnRXhwKFwiXlswLTlhLWZBLUZdezI0fSRcIik7XG4gICAgdmFyIGlzVmFsaWRIZXhSZWdFeHAgPSBmdW5jdGlvbihzdHIsIGxlbiA9IDI0KSB7XG4gICAgICAgIGlmIChzdHIubGVuZ3RoID09PSBsZW4gJiYgY2hlY2tGb3JIZXhSZWdFeHAudGVzdChzdHIpKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIE9iamVjdElkXG4gICAgICogXG4gICAgICogQG1vZHVsZSBPYmplY3RJZFxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBzaW5jZSAwLjAuMVxuICAgICAqIFxuICAgICAqIEBjbGFzc2Rlc2MgUmVwcmVzZW50cyB0aGUgQlNPTiBPYmplY3RJZCB0eXBlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBpZCAtIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZywgYSAxMiBieXRlIGJpbmFyeSBzdHJpbmcgb3IgYSBOdW1iZXIuXG4gICAgICovXG4gICAgY2xhc3MgT2JqZWN0SWQge1xuICAgICAgICBjb25zdHJ1Y3RvcihpZCwgX2hleCkge1xuICAgICAgICAgICAgLy8gaWYgKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIG5ldyBPYmplY3RJZChpZCwgX2hleCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5fYnNvbnR5cGUgPSAnT2JqZWN0SWQnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB2YXIgX19pZCA9IG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKGlkKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaWQgPSB0aGlzLmdlbmVyYXRlKGlkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNOdW1iZXIoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaWQgPSB0aGlzLmdlbmVyYXRlKGlkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdHJpbmcgb3IgSGV4XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLmlzU3RyaW5nKGlkKSAmJiAoaWQubGVuZ3RoID09PSAxMiB8fCBpZC5sZW5ndGggPT09IDI0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzVmFsaWRIZXhSZWdFeHAoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVmFsaWQgSGV4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IF9pZCA9IE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcoaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQuaWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9ICBlbHNlIGlmIChpZC5sZW5ndGggPT09IDEyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVmFsaWQgQnl0ZSBTdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIlZhbHVlIHBhc3NlZCBpbiBpcyBub3QgYSB2YWxpZCAyNCBjaGFyYWN0ZXIgaGV4IHN0cmluZ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICAgICAgICAgICAgLy8gaWYgKGlkICE9IG51bGwgJiYgJ251bWJlcicgIT0gdHlwZW9mIGlkICYmIChpZC5sZW5ndGggIT0gMTIgJiYgaWQubGVuZ3RoICE9IDI0KSkge1xuICAgICAgICAgICAgLy8gICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2VuZXJhdGUgaWQgYmFzZWQgb24gdGhlIGlucHV0XG4gICAgICAgICAgICAvLyBpZiAoaWQgPT0gbnVsbCB8fCB0eXBlb2YgaWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIC8vICAgICAvLyBjb252ZXJ0IHRvIDEyIGJ5dGUgYmluYXJ5IHN0cmluZ1xuICAgICAgICAgICAgLy8gICAgIHRoaXMuaWQgPSB0aGlzLmdlbmVyYXRlKGlkKTtcbiAgICAgICAgICAgIC8vIH0gZWxzZSBpZiAoaWQgIT0gbnVsbCAmJiBpZC5sZW5ndGggPT09IDEyKSB7XG4gICAgICAgICAgICAvLyAgICAgLy8gYXNzdW1lIDEyIGJ5dGUgc3RyaW5nXG4gICAgICAgICAgICAvLyAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICAgICAgLy8gfSBlbHNlIGlmIChjaGVja0ZvckhleFJlZ0V4cC50ZXN0KGlkKSkge1xuICAgICAgICAgICAgLy8gICAgIHJldHVybiBPYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nKGlkKTtcbiAgICAgICAgICAgIC8vIH0gZWxzZSBpZiAoIWNoZWNrRm9ySGV4UmVnRXhwLnRlc3QoaWQpKSB7XG4gICAgICAgICAgICAvLyAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFsdWUgcGFzc2VkIGluIGlzIG5vdCBhIHZhbGlkIDI0IGNoYXJhY3RlciBoZXggc3RyaW5nXCIpO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9faWQgPSB0aGlzLnRvSGV4U3RyaW5nKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIElOU1RBTkNFIE1FVEhPRFMgKi9cbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm4gdGhlIE9iamVjdElkIGlkIGFzIGEgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAbWV0aG9kIE9iamVjdElkI3RvSGV4U3RyaW5nXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gICAgICAgICAqL1xuICAgICAgICB0b0hleFN0cmluZygpIHtcbiAgICAgICAgICAgIGlmIChPYmplY3RJZC5jYWNoZUhleFN0cmluZyAmJiB0aGlzLl9faWQpIHJldHVybiB0aGlzLl9faWQ7XG4gICAgICAgIFxuICAgICAgICAgICAgdmFyIGhleFN0cmluZyA9ICcnLFxuICAgICAgICAgICAgICAgIG51bWJlcixcbiAgICAgICAgICAgICAgICB2YWx1ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwLCBsZW4gPSB0aGlzLmlkLmxlbmd0aDsgaW5kZXggPCBsZW47IGluZGV4KyspIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IEJpbmFyeVBhcnNlci50b0J5dGUodGhpcy5pZFtpbmRleF0pO1xuICAgICAgICAgICAgICAgIG51bWJlciA9IHZhbHVlIDw9IDE1ID8gJzAnICsgdmFsdWUudG9TdHJpbmcoMTYpIDogdmFsdWUudG9TdHJpbmcoMTYpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGhleFN0cmluZyA9IGhleFN0cmluZyArIG51bWJlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fX2lkID0gaGV4U3RyaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gaGV4U3RyaW5nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogQWxpYXMgZm9yIHtAbGluayBPYmplY3RJZCN0b0hleFN0cmluZ31cbiAgICAgICAgICogXG4gICAgICAgICAqIEBtZXRob2QgQ3Vyc29yI25leHRcbiAgICAgICAgICovXG4gICAgICAgIHRvU3RyaW5nKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9IZXhTdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFsaWFzIGZvciB7QGxpbmsgT2JqZWN0SWQjdG9IZXhTdHJpbmd9XG4gICAgICAgICAqIFxuICAgICAgICAgKiBAbWV0aG9kIEN1cnNvciNuZXh0XG4gICAgICAgICAqL1xuICAgICAgICB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0hleFN0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogVXBkYXRlIHRoZSBPYmplY3RJZCBpbmRleCB1c2VkIGluIGdlbmVyYXRpbmcgbmV3IE9iamVjdElkJ3Mgb24gdGhlIGRyaXZlclxuICAgICAgICAgKiBcbiAgICAgICAgICogQG1ldGhvZCBPYmplY3RJZCNnZXRfaW5jXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IE5leHQgaW5kZXggdmFsdWUuXG4gICAgICAgICAqL1xuICAgICAgICBnZXRJbmMoKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0SWQuaW5kZXggPSAoT2JqZWN0SWQuaW5kZXggKyAxKSAlIDB4RkZGRkZGO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogR2VuZXJhdGUgYSAxMiBieXRlIGlkIHN0cmluZyB1c2VkIGluIE9iamVjdElkJ3NcbiAgICAgICAgICpcbiAgICAgICAgICogQG1ldGhvZCBPYmplY3RJZCNnZW5lcmF0ZVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IFt0aW1lXSAtIFNlY29uZCBiYXNlZCB0aW1lc3RhbXAgdG8gdGhlIGdlbmVyYXRpb24uXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSAxMiBieXRlIGlkIGJpbmFyeSBzdHJpbmcuXG4gICAgICAgICAqL1xuICAgICAgICBnZW5lcmF0ZSh0aW1lKSB7XG4gICAgICAgICAgICBpZiAoXy5pc05pbCh0aW1lKSB8fCAhXy5pc051bWJlcih0aW1lKSkge1xuICAgICAgICAgICAgICAgIHRpbWUgPSBwYXJzZUludChEYXRlLm5vdygpIC8gMTAwMCwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvKiBmb3IgdGltZS1iYXNlZCBPYmplY3RJZCB0aGUgYnl0ZXMgZm9sbG93aW5nIHRoZSB0aW1lIHdpbGwgYmUgemVyb2VkICovXG4gICAgICAgICAgICB2YXIgdGltZTRCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGltZSwgMzIsIHRydWUsIHRydWUpO1xuICAgICAgICAgICAgdmFyIG1hY2hpbmUzQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KE1BQ0hJTkVfSUQsIDI0LCBmYWxzZSk7XG4gICAgICAgICAgICB2YXIgcGlkMkJ5dGVzID0gQmluYXJ5UGFyc2VyLmZyb21TaG9ydChfLmlzTmlsKHByb2Nlc3MpID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSA6IHByb2Nlc3MucGlkKTtcbiAgICAgICAgICAgIHZhciBpbmRleDNCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGhpcy5nZXRJbmMoKSwgMjQsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRpbWU0Qnl0ZXMgKyBtYWNoaW5lM0J5dGVzICsgcGlkMkJ5dGVzICsgaW5kZXgzQnl0ZXM7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJZCB3aXRoIFtvdGhlcklEXS5cbiAgICAgICAgICpcbiAgICAgICAgICogQG1ldGhvZCBPYmplY3RJZCNlcXVhbHNcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvdGhlcklEIC0gT2JqZWN0SWQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IFRoZSByZXN1bHQgb2YgY29tcGFyaW5nIHR3byBPYmplY3RJZCdzXG4gICAgICAgICAqL1xuICAgICAgICBlcXVhbHMob3RoZXJJRCkge1xuICAgICAgICAgICAgdmFyIGlkID0gKG90aGVySUQgaW5zdGFuY2VvZiBPYmplY3RJZCB8fCBvdGhlcklELnRvSGV4U3RyaW5nKSA/IG90aGVySUQuaWQgOiBPYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nKG90aGVySUQpLmlkO1xuICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlkID09PSBpZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybnMgdGhlIGdlbmVyYXRpb24gdGltZSBpbiBzZWNvbmRzIHRoYXQgdGhpcyBJRCB3YXMgZ2VuZXJhdGVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAbWV0aG9kIE9iamVjdElkI2dldFRpbWVzdGFtcFxuICAgICAgICAgKiBcbiAgICAgICAgICogQHJldHVybnMge051bWJlcn0gTnVtYmVyIG9mIHNlY29uZHMgaW4gdGhlIHRpbWVzdGFtcCBwYXJ0IG9mIHRoZSAxMiBieXRlIGlkLlxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0VGltZXN0YW1wKCkge1xuICAgICAgICAgICAgdmFyIHRpbWVzdGFtcCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRpbWVzdGFtcC5zZXRUaW1lKE1hdGguZmxvb3IoQmluYXJ5UGFyc2VyLmRlY29kZUludCh0aGlzLmlkLnN1YnN0cmluZygwLCA0KSwgMzIsIHRydWUsIHRydWUpKSAqIDEwMDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGltZXN0YW1wO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLyogR0VUVEVSIC0gU0VUVEVSICovXG4gICAgICAgIGdldCBnZW5lcmF0aW9uVGltZSgpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKEJpbmFyeVBhcnNlci5kZWNvZGVJbnQodGhpcy5pZC5zdWJzdHJpbmcoMCwgNCksIDMyLCB0cnVlLCB0cnVlKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHNldCBnZW5lcmF0aW9uVGltZSh2YWx1ZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHZhbHVlLCAzMiwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuaWQgPSB2YWx1ZSArIHRoaXMuaWQuc3Vic3RyKDQpO1xuICAgICAgICAgICAgLy8gZGVsZXRlIHRoaXMuX19pZDtcbiAgICAgICAgICAgIHRoaXMudG9IZXhTdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogU1RBVElDIE1FVEhPRFMgKi9cbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGFuIE9iamVjdElkIGZyb20gYSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIE9iamVjdElkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAbWV0aG9kIE9iamVjdElkI2NyZWF0ZUZyb21IZXhTdHJpbmdcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBoZXhTdHJpbmcgLSBBbiBPYmplY3RJZCAyNCBieXRlIGhleHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAgICAgICAgICogXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3RJZH0gVGhlIGNyZWF0ZWQgT2JqZWN0SWRcbiAgICAgICAgICovXG4gICAgICAgIHN0YXRpYyBjcmVhdGVGcm9tSGV4U3RyaW5nKGhleFN0cmluZykge1xuICAgICAgICAgICAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICAgICAgICAgICAgaWYoXy5pc05pbChoZXhTdHJpbmcpIHx8IGhleFN0cmluZy5sZW5ndGggIT0gMjQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBsZW4gPSBoZXhTdHJpbmcubGVuZ3RoO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gJycsIFxuICAgICAgICAgICAgICAgIHN0cmluZywgXG4gICAgICAgICAgICAgICAgbnVtYmVyO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuOyBpbmRleCArPSAyKSB7XG4gICAgICAgICAgICAgICAgc3RyaW5nID0gaGV4U3RyaW5nLnN1YnN0cihpbmRleCwgMik7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gcGFyc2VJbnQoc3RyaW5nLCAxNik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IEJpbmFyeVBhcnNlci5mcm9tQnl0ZShudW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gbmV3IE9iamVjdElkKHJlc3VsdCwgaGV4U3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYW4gT2JqZWN0SWQgZnJvbSBhIHNlY29uZCBiYXNlZCBudW1iZXIsIHdpdGggdGhlIHJlc3Qgb2YgdGhlIE9iamVjdElkIHplcm9lZCBvdXQuIFxuICAgICAgICAgKiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJZC5cbiAgICAgICAgICpcbiAgICAgICAgICogQG1ldGhvZCBPYmplY3RJZCNjcmVhdGVGcm9tVGltZVxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgLSBBIG51bWJlciBvZiBzZWNvbmRzLlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHJldHVybnMge09iamVjdElkfSBUaGUgY3JlYXRlZCBPYmplY3RJZFxuICAgICAgICAgKi9cbiAgICAgICAgc3RhdGljIGNyZWF0ZUZyb21UaW1lKHRpbWUpIHtcbiAgICAgICAgICAgIHZhciBpZCA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGltZSwgMzIsIHRydWUsIHRydWUpICsgQmluYXJ5UGFyc2VyLmVuY29kZUludCgwLCA2NCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JqZWN0SWQoaWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SWQgemVyb2VkIG91dC4gVXNlZCBmb3IgY29tcGFyaXNvbnMgb3Igc29ydGluZyB0aGUgT2JqZWN0SWQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBtZXRob2QgT2JqZWN0SWQjY3JlYXRlUGtcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGFuIGludGVnZXIgbnVtYmVyIHJlcHJlc2VudGluZyBhIG51bWJlciBvZiBzZWNvbmRzLlxuICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3RJZH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElkXG4gICAgICAgICAqL1xuICAgICAgICBzdGF0aWMgY3JlYXRlUGsoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9iamVjdElkKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIE9iamVjdElkLmluZGV4ID0gMDtcbiAgICBcbiAgICByZXR1cm4gT2JqZWN0SWQ7XG59OyJdfQ==
