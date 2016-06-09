"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9CaW5hcnlQYXJzZXJCdWZmZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQVVBLElBQUksU0FBUyxRQUFRLFlBQVIsQ0FBYjs7QUFFQSxJQUFJLFNBQVMsSUFBYjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQXFCTSxrQjtBQUNGLGdDQUFZLFNBQVosRUFBdUIsTUFBdkIsRUFBK0I7QUFBQTs7QUFDM0IsaUJBQVMsT0FBTyxRQUFoQjs7QUFFQSxhQUFLLFNBQUwsR0FBaUIsYUFBYSxDQUE5QjtBQUNBLGFBQUssTUFBTCxHQUFjLEVBQWQ7QUFDQSxhQUFLLFNBQUwsQ0FBZSxNQUFmO0FBQ0g7Ozs7a0NBRVMsSSxFQUFNO0FBQ1osZ0JBQUksQ0FBSixFQUFPLENBQVAsRUFBVSxDQUFWOztBQUVBLGdCQUFJLElBQUosRUFBVTtBQUNOLG9CQUFJLElBQUksS0FBSyxNQUFiO0FBQ0Esb0JBQUksS0FBSyxNQUFMLEdBQWMsSUFBSSxLQUFKLENBQVUsQ0FBVixDQUFsQjs7QUFFQSx1QkFBTyxDQUFQLEVBQVUsRUFBRSxJQUFJLENBQU4sSUFBVyxLQUFLLFVBQUwsQ0FBZ0IsRUFBRSxDQUFsQixDQUFyQjs7QUFFQSxxQkFBSyxTQUFMLElBQWtCLEVBQUUsT0FBRixFQUFsQjtBQUNIO0FBQ0o7OztzQ0FFYSxVLEVBQVk7QUFDdEIsbUJBQU8sS0FBSyxNQUFMLENBQVksTUFBWixJQUFzQixFQUFFLENBQUMsVUFBRCxJQUFlLENBQWpCLENBQTdCO0FBQ0g7OztvQ0FFVyxVLEVBQVk7QUFDcEIsZ0JBQUksQ0FBQyxLQUFLLGFBQUwsQ0FBbUIsVUFBbkIsQ0FBTCxFQUFxQztBQUNqQyx1QkFBTyxLQUFQLENBQWEsNEJBQWI7QUFDSDtBQUNKOzs7aUNBRVEsSyxFQUFPLE0sRUFBUTs7O0FBR3BCLHFCQUFTLEdBQVQsQ0FBYyxDQUFkLEVBQWlCLENBQWpCLEVBQW9CO0FBQ2hCLHVCQUFPLEdBQVAsRUFBWSxJQUFJLENBQUMsQ0FBQyxLQUFLLGFBQWEsQ0FBbkIsSUFBd0IsVUFBekIsS0FBd0MsVUFBeEMsR0FBcUQsSUFBSSxDQUF6RCxHQUE2RCxDQUFDLElBQUksVUFBTCxJQUFtQixDQUFuQixHQUF1QixVQUF2QixHQUFvQyxDQUFqSDs7QUFFQSx1QkFBTyxDQUFQO0FBQ0g7O0FBRUQsZ0JBQUksUUFBUSxDQUFSLElBQWEsVUFBVSxDQUEzQixFQUE4QjtBQUMxQix1QkFBTyxDQUFQO0FBQ0g7O0FBRUQsaUJBQUssV0FBTCxDQUFpQixRQUFRLE1BQXpCOztBQUVBLGdCQUFJLFVBQUo7Z0JBQ0ksY0FBYyxRQUFRLENBRDFCO2dCQUVJLFVBQVUsS0FBSyxNQUFMLENBQVksTUFBWixJQUF1QixTQUFTLENBQWhDLElBQXNDLENBRnBEO2dCQUdJLFdBQVcsS0FBSyxNQUFMLENBQVksTUFBWixJQUF1QixFQUFHLFFBQVEsTUFBWCxLQUF1QixDQUE5QyxDQUhmO2dCQUlJLE9BQU8sVUFBVSxRQUpyQjtnQkFLSSxNQUFNLENBQUUsS0FBSyxNQUFMLENBQWEsT0FBYixLQUEwQixXQUEzQixHQUEyQyxDQUFDLE1BQU0sT0FBTyxJQUFJLFdBQVgsR0FBeUIsTUFBL0IsQ0FBRCxJQUEyQyxDQUF2RixLQUE4RixTQUFTLGFBQWEsQ0FBQyxRQUFRLE1BQVQsSUFBbUIsQ0FBekMsSUFBOEMsQ0FBQyxLQUFLLE1BQUwsQ0FBWSxVQUFaLElBQTJCLENBQUMsS0FBSyxVQUFOLElBQW9CLENBQWhELEtBQXVELENBQUMsVUFBVSxDQUFYLElBQWdCLFdBQXJILEdBQW1JLENBQWpPLENBTFY7O0FBT0EsbUJBQU0sSUFBTixFQUFZLE9BQU8sSUFBSSxLQUFLLE1BQUwsQ0FBWSxVQUFaLENBQUosRUFBNkIsQ0FBQyxVQUFVLENBQVgsSUFBZ0IsV0FBN0MsQ0FBbkI7O0FBRUEsbUJBQU8sR0FBUDtBQUNIOzs7Ozs7QUFJTCxPQUFPLE9BQVAsR0FBaUIsa0JBQWpCIiwiZmlsZSI6IkJpbmFyeVBhcnNlckJ1ZmZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgQmluYXJ5UGFyc2VyQnVmZmVyLmpzIC0gYmFzZWQgb24gKHtAbGluayBodHRwOi8vanNmcm9taGVsbC5jb20vY2xhc3Nlcy9iaW5hcnktcGFyc2VyIEJpbmFyeSBQYXJzZXJ9KSBieSBKb25hcyBSYW9uaSBTb2FyZXMgU2lsdmFcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBAaWdub3JlXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIExvZ2dlciA9IHJlcXVpcmUoXCJqc3ctbG9nZ2VyXCIpO1xuXG52YXIgbG9nZ2VyID0gbnVsbDtcblxuLyoqXG4gKiBCaW5hcnlQYXJzZXJCdWZmZXJcbiAqIEBpZ25vcmVcbiAqIFxuICogQG1vZHVsZSBCaW5hcnlQYXJzZXJCdWZmZXJcbiAqIEBjb25zdHJ1Y3RvclxuICogQHNpbmNlIDAuMC4xXG4gKiBcbiAqIEBjbGFzc2Rlc2MgQ3Vyc29yIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjdXJzb3JcbiAqIFxuICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogQHBhcmFtIHtDb2xsZWN0aW9ufSBjb2xsZWN0aW9uIC0gVGhlIGNvbGxlY3Rpb24gaW5zdGFuY2VcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gKiBcbiAqL1xuY2xhc3MgQmluYXJ5UGFyc2VyQnVmZmVyIHtcbiAgICBjb25zdHJ1Y3RvcihiaWdFbmRpYW4sIGJ1ZmZlcikge1xuICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmJpZ0VuZGlhbiA9IGJpZ0VuZGlhbiB8fCAwO1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IFtdO1xuICAgICAgICB0aGlzLnNldEJ1ZmZlcihidWZmZXIpO1xuICAgIH1cbiAgICBcbiAgICBzZXRCdWZmZXIoZGF0YSkge1xuICAgICAgICB2YXIgbCwgaSwgYjtcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBpID0gbCA9IGRhdGEubGVuZ3RoO1xuICAgICAgICAgICAgYiA9IHRoaXMuYnVmZmVyID0gbmV3IEFycmF5KGwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKDsgaTsgYltsIC0gaV0gPSBkYXRhLmNoYXJDb2RlQXQoLS1pKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuYmlnRW5kaWFuICYmIGIucmV2ZXJzZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGhhc05lZWRlZEJpdHMobmVlZGVkQml0cykge1xuICAgICAgICByZXR1cm4gdGhpcy5idWZmZXIubGVuZ3RoID49IC0oLW5lZWRlZEJpdHMgPj4gMyk7XG4gICAgfVxuICAgIFxuICAgIGNoZWNrQnVmZmVyKG5lZWRlZEJpdHMpIHtcbiAgICAgICAgaWYgKCF0aGlzLmhhc05lZWRlZEJpdHMobmVlZGVkQml0cykpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcImNoZWNrQnVmZmVyOjptaXNzaW5nIGJ5dGVzXCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJlYWRCaXRzKHN0YXJ0LCBsZW5ndGgpIHtcbiAgICAgICAgLy9zaGwgZml4OiBIZW5yaSBUb3JnZW1hbmUgfjE5OTYgKGNvbXByZXNzZWQgYnkgSm9uYXMgUmFvbmkpXG4gICAgXG4gICAgICAgIGZ1bmN0aW9uIHNobCAoYSwgYikge1xuICAgICAgICAgICAgZm9yICg7IGItLTsgYSA9ICgoYSAlPSAweDdmZmZmZmZmICsgMSkgJiAweDQwMDAwMDAwKSA9PSAweDQwMDAwMDAwID8gYSAqIDIgOiAoYSAtIDB4NDAwMDAwMDApICogMiArIDB4N2ZmZmZmZmYgKyAxKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCB8fCBsZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgdGhpcy5jaGVja0J1ZmZlcihzdGFydCArIGxlbmd0aCk7XG4gICAgXG4gICAgICAgIHZhciBvZmZzZXRMZWZ0LFxuICAgICAgICAgICAgb2Zmc2V0UmlnaHQgPSBzdGFydCAlIDgsXG4gICAgICAgICAgICBjdXJCeXRlID0gdGhpcy5idWZmZXIubGVuZ3RoIC0gKCBzdGFydCA+PiAzICkgLSAxLFxuICAgICAgICAgICAgbGFzdEJ5dGUgPSB0aGlzLmJ1ZmZlci5sZW5ndGggKyAoIC0oIHN0YXJ0ICsgbGVuZ3RoICkgPj4gMyApLFxuICAgICAgICAgICAgZGlmZiA9IGN1ckJ5dGUgLSBsYXN0Qnl0ZSxcbiAgICAgICAgICAgIHN1bSA9ICgodGhpcy5idWZmZXJbIGN1ckJ5dGUgXSA+PiBvZmZzZXRSaWdodCkgJiAoKDEgPDwgKGRpZmYgPyA4IC0gb2Zmc2V0UmlnaHQgOiBsZW5ndGgpKSAtIDEpKSArIChkaWZmICYmIChvZmZzZXRMZWZ0ID0gKHN0YXJ0ICsgbGVuZ3RoKSAlIDgpID8gKHRoaXMuYnVmZmVyW2xhc3RCeXRlKytdICYgKCgxIDw8IG9mZnNldExlZnQpIC0gMSkpIDw8IChkaWZmLS0gPDwgMykgLSBvZmZzZXRSaWdodCA6IDApO1xuICAgIFxuICAgICAgICBmb3IoOyBkaWZmOyBzdW0gKz0gc2hsKHRoaXMuYnVmZmVyW2xhc3RCeXRlKytdLCAoZGlmZi0tIDw8IDMpIC0gb2Zmc2V0UmlnaHQpKTtcbiAgICBcbiAgICAgICAgcmV0dXJuIHN1bTtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBCaW5hcnlQYXJzZXJCdWZmZXI7Il19
