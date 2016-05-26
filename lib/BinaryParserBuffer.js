"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @file BinaryParserBuffer.js - based on ({@link http://jsfromhell.com/classes/binary-parser Binary Parser}) by Jonas Raoni Soares Silva
 * @version 1.0.0
 * @ignore
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var Logger = require("./utils/Logger");

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

module.exports = BinaryParserBuffer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9CaW5hcnlQYXJzZXJCdWZmZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQVVBLElBQUksU0FBUyxRQUFRLGdCQUFSLENBQWI7O0FBRUEsSUFBSSxTQUFTLElBQWI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFxQk0sa0I7QUFDRixnQ0FBWSxTQUFaLEVBQXVCLE1BQXZCLEVBQStCO0FBQUE7O0FBQzNCLGlCQUFTLE9BQU8sUUFBaEI7O0FBRUEsYUFBSyxTQUFMLEdBQWlCLGFBQWEsQ0FBOUI7QUFDQSxhQUFLLE1BQUwsR0FBYyxFQUFkO0FBQ0EsYUFBSyxTQUFMLENBQWUsTUFBZjtBQUNIOzs7O2tDQUVTLEksRUFBTTtBQUNaLGdCQUFJLENBQUosRUFBTyxDQUFQLEVBQVUsQ0FBVjs7QUFFQSxnQkFBSSxJQUFKLEVBQVU7QUFDTixvQkFBSSxJQUFJLEtBQUssTUFBYjtBQUNBLG9CQUFJLEtBQUssTUFBTCxHQUFjLElBQUksS0FBSixDQUFVLENBQVYsQ0FBbEI7O0FBRUEsdUJBQU8sQ0FBUCxFQUFVLEVBQUUsSUFBSSxDQUFOLElBQVcsS0FBSyxVQUFMLENBQWdCLEVBQUUsQ0FBbEIsQ0FBckI7O0FBRUEscUJBQUssU0FBTCxJQUFrQixFQUFFLE9BQUYsRUFBbEI7QUFDSDtBQUNKOzs7c0NBRWEsVSxFQUFZO0FBQ3RCLG1CQUFPLEtBQUssTUFBTCxDQUFZLE1BQVosSUFBc0IsRUFBRSxDQUFDLFVBQUQsSUFBZSxDQUFqQixDQUE3QjtBQUNIOzs7b0NBRVcsVSxFQUFZO0FBQ3BCLGdCQUFJLENBQUMsS0FBSyxhQUFMLENBQW1CLFVBQW5CLENBQUwsRUFBcUM7QUFDakMsdUJBQU8sS0FBUCxDQUFhLDRCQUFiO0FBQ0g7QUFDSjs7O2lDQUVRLEssRUFBTyxNLEVBQVE7OztBQUdwQixxQkFBUyxHQUFULENBQWMsQ0FBZCxFQUFpQixDQUFqQixFQUFvQjtBQUNoQix1QkFBTyxHQUFQLEVBQVksSUFBSSxDQUFDLENBQUMsS0FBSyxhQUFhLENBQW5CLElBQXdCLFVBQXpCLEtBQXdDLFVBQXhDLEdBQXFELElBQUksQ0FBekQsR0FBNkQsQ0FBQyxJQUFJLFVBQUwsSUFBbUIsQ0FBbkIsR0FBdUIsVUFBdkIsR0FBb0MsQ0FBakg7O0FBRUEsdUJBQU8sQ0FBUDtBQUNIOztBQUVELGdCQUFJLFFBQVEsQ0FBUixJQUFhLFVBQVUsQ0FBM0IsRUFBOEI7QUFDMUIsdUJBQU8sQ0FBUDtBQUNIOztBQUVELGlCQUFLLFdBQUwsQ0FBaUIsUUFBUSxNQUF6Qjs7QUFFQSxnQkFBSSxVQUFKO2dCQUNJLGNBQWMsUUFBUSxDQUQxQjtnQkFFSSxVQUFVLEtBQUssTUFBTCxDQUFZLE1BQVosSUFBdUIsU0FBUyxDQUFoQyxJQUFzQyxDQUZwRDtnQkFHSSxXQUFXLEtBQUssTUFBTCxDQUFZLE1BQVosSUFBdUIsRUFBRyxRQUFRLE1BQVgsS0FBdUIsQ0FBOUMsQ0FIZjtnQkFJSSxPQUFPLFVBQVUsUUFKckI7Z0JBS0ksTUFBTSxDQUFFLEtBQUssTUFBTCxDQUFhLE9BQWIsS0FBMEIsV0FBM0IsR0FBMkMsQ0FBQyxNQUFNLE9BQU8sSUFBSSxXQUFYLEdBQXlCLE1BQS9CLENBQUQsSUFBMkMsQ0FBdkYsS0FBOEYsU0FBUyxhQUFhLENBQUMsUUFBUSxNQUFULElBQW1CLENBQXpDLElBQThDLENBQUMsS0FBSyxNQUFMLENBQVksVUFBWixJQUEyQixDQUFDLEtBQUssVUFBTixJQUFvQixDQUFoRCxLQUF1RCxDQUFDLFVBQVUsQ0FBWCxJQUFnQixXQUFySCxHQUFtSSxDQUFqTyxDQUxWOztBQU9BLG1CQUFNLElBQU4sRUFBWSxPQUFPLElBQUksS0FBSyxNQUFMLENBQVksVUFBWixDQUFKLEVBQTZCLENBQUMsVUFBVSxDQUFYLElBQWdCLFdBQTdDLENBQW5COztBQUVBLG1CQUFPLEdBQVA7QUFDSDs7Ozs7O0FBSUwsT0FBTyxPQUFQLEdBQWlCLGtCQUFqQiIsImZpbGUiOiJCaW5hcnlQYXJzZXJCdWZmZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIEJpbmFyeVBhcnNlckJ1ZmZlci5qcyAtIGJhc2VkIG9uICh7QGxpbmsgaHR0cDovL2pzZnJvbWhlbGwuY29tL2NsYXNzZXMvYmluYXJ5LXBhcnNlciBCaW5hcnkgUGFyc2VyfSkgYnkgSm9uYXMgUmFvbmkgU29hcmVzIFNpbHZhXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogQGlnbm9yZVxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIExvZ2dlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0xvZ2dlclwiKTtcblxudmFyIGxvZ2dlciA9IG51bGw7XG5cbi8qKlxuICogQmluYXJ5UGFyc2VyQnVmZmVyXG4gKiBAaWdub3JlXG4gKiBcbiAqIEBtb2R1bGUgQmluYXJ5UGFyc2VyQnVmZmVyXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzaW5jZSAwLjAuMVxuICogXG4gKiBAY2xhc3NkZXNjIEN1cnNvciBjbGFzcyB0aGF0IG1hcHMgYSBNb25nb0RCLWxpa2UgY3Vyc29yXG4gKiBcbiAqIEBwYXJhbSB7TW9uZ29Qb3J0YWJsZX0gZGIgLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIEBwYXJhbSB7Q29sbGVjdGlvbn0gY29sbGVjdGlvbiAtIFRoZSBjb2xsZWN0aW9uIGluc3RhbmNlXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIERhdGFiYXNlIG9iamVjdFxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMucGtGYWN0b3J5PW51bGxdIC0gT2JqZWN0IG92ZXJyaWRpbmcgdGhlIGJhc2ljIFwiT2JqZWN0SWRcIiBwcmltYXJ5IGtleSBnZW5lcmF0aW9uLlxuICogXG4gKi9cbmNsYXNzIEJpbmFyeVBhcnNlckJ1ZmZlciB7XG4gICAgY29uc3RydWN0b3IoYmlnRW5kaWFuLCBidWZmZXIpIHtcbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5iaWdFbmRpYW4gPSBiaWdFbmRpYW4gfHwgMDtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBbXTtcbiAgICAgICAgdGhpcy5zZXRCdWZmZXIoYnVmZmVyKTtcbiAgICB9XG4gICAgXG4gICAgc2V0QnVmZmVyKGRhdGEpIHtcbiAgICAgICAgdmFyIGwsIGksIGI7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgaSA9IGwgPSBkYXRhLmxlbmd0aDtcbiAgICAgICAgICAgIGIgPSB0aGlzLmJ1ZmZlciA9IG5ldyBBcnJheShsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yICg7IGk7IGJbbCAtIGldID0gZGF0YS5jaGFyQ29kZUF0KC0taSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmJpZ0VuZGlhbiAmJiBiLnJldmVyc2UoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBoYXNOZWVkZWRCaXRzKG5lZWRlZEJpdHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyLmxlbmd0aCA+PSAtKC1uZWVkZWRCaXRzID4+IDMpO1xuICAgIH1cbiAgICBcbiAgICBjaGVja0J1ZmZlcihuZWVkZWRCaXRzKSB7XG4gICAgICAgIGlmICghdGhpcy5oYXNOZWVkZWRCaXRzKG5lZWRlZEJpdHMpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJjaGVja0J1ZmZlcjo6bWlzc2luZyBieXRlc1wiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZWFkQml0cyhzdGFydCwgbGVuZ3RoKSB7XG4gICAgICAgIC8vc2hsIGZpeDogSGVucmkgVG9yZ2VtYW5lIH4xOTk2IChjb21wcmVzc2VkIGJ5IEpvbmFzIFJhb25pKVxuICAgIFxuICAgICAgICBmdW5jdGlvbiBzaGwgKGEsIGIpIHtcbiAgICAgICAgICAgIGZvciAoOyBiLS07IGEgPSAoKGEgJT0gMHg3ZmZmZmZmZiArIDEpICYgMHg0MDAwMDAwMCkgPT0gMHg0MDAwMDAwMCA/IGEgKiAyIDogKGEgLSAweDQwMDAwMDAwKSAqIDIgKyAweDdmZmZmZmZmICsgMSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIGlmIChzdGFydCA8IDAgfHwgbGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIHRoaXMuY2hlY2tCdWZmZXIoc3RhcnQgKyBsZW5ndGgpO1xuICAgIFxuICAgICAgICB2YXIgb2Zmc2V0TGVmdCxcbiAgICAgICAgICAgIG9mZnNldFJpZ2h0ID0gc3RhcnQgJSA4LFxuICAgICAgICAgICAgY3VyQnl0ZSA9IHRoaXMuYnVmZmVyLmxlbmd0aCAtICggc3RhcnQgPj4gMyApIC0gMSxcbiAgICAgICAgICAgIGxhc3RCeXRlID0gdGhpcy5idWZmZXIubGVuZ3RoICsgKCAtKCBzdGFydCArIGxlbmd0aCApID4+IDMgKSxcbiAgICAgICAgICAgIGRpZmYgPSBjdXJCeXRlIC0gbGFzdEJ5dGUsXG4gICAgICAgICAgICBzdW0gPSAoKHRoaXMuYnVmZmVyWyBjdXJCeXRlIF0gPj4gb2Zmc2V0UmlnaHQpICYgKCgxIDw8IChkaWZmID8gOCAtIG9mZnNldFJpZ2h0IDogbGVuZ3RoKSkgLSAxKSkgKyAoZGlmZiAmJiAob2Zmc2V0TGVmdCA9IChzdGFydCArIGxlbmd0aCkgJSA4KSA/ICh0aGlzLmJ1ZmZlcltsYXN0Qnl0ZSsrXSAmICgoMSA8PCBvZmZzZXRMZWZ0KSAtIDEpKSA8PCAoZGlmZi0tIDw8IDMpIC0gb2Zmc2V0UmlnaHQgOiAwKTtcbiAgICBcbiAgICAgICAgZm9yKDsgZGlmZjsgc3VtICs9IHNobCh0aGlzLmJ1ZmZlcltsYXN0Qnl0ZSsrXSwgKGRpZmYtLSA8PCAzKSAtIG9mZnNldFJpZ2h0KSk7XG4gICAgXG4gICAgICAgIHJldHVybiBzdW07XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gQmluYXJ5UGFyc2VyQnVmZmVyOyJdfQ==
