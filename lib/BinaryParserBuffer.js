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

var logger = null;

module.exports = function (Logger) {

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

    return BinaryParserBuffer;
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkJpbmFyeVBhcnNlckJ1ZmZlci5qcyJdLCJuYW1lcyI6WyJsb2dnZXIiLCJtb2R1bGUiLCJleHBvcnRzIiwiTG9nZ2VyIiwiQmluYXJ5UGFyc2VyQnVmZmVyIiwiYmlnRW5kaWFuIiwiYnVmZmVyIiwiaW5zdGFuY2UiLCJzZXRCdWZmZXIiLCJkYXRhIiwibCIsImkiLCJiIiwibGVuZ3RoIiwiQXJyYXkiLCJjaGFyQ29kZUF0IiwicmV2ZXJzZSIsIm5lZWRlZEJpdHMiLCJoYXNOZWVkZWRCaXRzIiwidGhyb3ciLCJzdGFydCIsInNobCIsImEiLCJjaGVja0J1ZmZlciIsIm9mZnNldExlZnQiLCJvZmZzZXRSaWdodCIsImN1ckJ5dGUiLCJsYXN0Qnl0ZSIsImRpZmYiLCJzdW0iXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7Ozs7Ozs7O0FBVUEsSUFBSUEsU0FBUyxJQUFiOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCLFVBQVNDLE1BQVQsRUFBaUI7O0FBRTlCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRjhCLFFBcUJ4QkMsa0JBckJ3QjtBQXNCMUIsb0NBQVlDLFNBQVosRUFBdUJDLE1BQXZCLEVBQStCO0FBQUE7O0FBQzNCTixxQkFBU0csT0FBT0ksUUFBaEI7O0FBRUEsaUJBQUtGLFNBQUwsR0FBaUJBLGFBQWEsQ0FBOUI7QUFDQSxpQkFBS0MsTUFBTCxHQUFjLEVBQWQ7QUFDQSxpQkFBS0UsU0FBTCxDQUFlRixNQUFmO0FBQ0g7O0FBNUJ5QjtBQUFBO0FBQUEsc0NBOEJoQkcsSUE5QmdCLEVBOEJWO0FBQ1osb0JBQUlDLENBQUosRUFBT0MsQ0FBUCxFQUFVQyxDQUFWOztBQUVBLG9CQUFJSCxJQUFKLEVBQVU7QUFDTkUsd0JBQUlELElBQUlELEtBQUtJLE1BQWI7QUFDQUQsd0JBQUksS0FBS04sTUFBTCxHQUFjLElBQUlRLEtBQUosQ0FBVUosQ0FBVixDQUFsQjs7QUFFQSwyQkFBT0MsQ0FBUCxFQUFVQyxFQUFFRixJQUFJQyxDQUFOLElBQVdGLEtBQUtNLFVBQUwsQ0FBZ0IsRUFBRUosQ0FBbEIsQ0FBckI7O0FBRUEseUJBQUtOLFNBQUwsSUFBa0JPLEVBQUVJLE9BQUYsRUFBbEI7QUFDSDtBQUNKO0FBekN5QjtBQUFBO0FBQUEsMENBMkNaQyxVQTNDWSxFQTJDQTtBQUN0Qix1QkFBTyxLQUFLWCxNQUFMLENBQVlPLE1BQVosSUFBc0IsRUFBRSxDQUFDSSxVQUFELElBQWUsQ0FBakIsQ0FBN0I7QUFDSDtBQTdDeUI7QUFBQTtBQUFBLHdDQStDZEEsVUEvQ2MsRUErQ0Y7QUFDcEIsb0JBQUksQ0FBQyxLQUFLQyxhQUFMLENBQW1CRCxVQUFuQixDQUFMLEVBQXFDO0FBQ2pDakIsMkJBQU9tQixLQUFQLENBQWEsNEJBQWI7QUFDSDtBQUNKO0FBbkR5QjtBQUFBO0FBQUEscUNBcURqQkMsS0FyRGlCLEVBcURWUCxNQXJEVSxFQXFERjtBQUNwQjs7QUFFQSx5QkFBU1EsR0FBVCxDQUFjQyxDQUFkLEVBQWlCVixDQUFqQixFQUFvQjtBQUNoQiwyQkFBT0EsR0FBUCxFQUFZVSxJQUFJLENBQUMsQ0FBQ0EsS0FBSyxhQUFhLENBQW5CLElBQXdCLFVBQXpCLEtBQXdDLFVBQXhDLEdBQXFEQSxJQUFJLENBQXpELEdBQTZELENBQUNBLElBQUksVUFBTCxJQUFtQixDQUFuQixHQUF1QixVQUF2QixHQUFvQyxDQUFqSDs7QUFFQSwyQkFBT0EsQ0FBUDtBQUNIOztBQUVELG9CQUFJRixRQUFRLENBQVIsSUFBYVAsVUFBVSxDQUEzQixFQUE4QjtBQUMxQiwyQkFBTyxDQUFQO0FBQ0g7O0FBRUQscUJBQUtVLFdBQUwsQ0FBaUJILFFBQVFQLE1BQXpCOztBQUVBLG9CQUFJVyxVQUFKO0FBQUEsb0JBQ0lDLGNBQWNMLFFBQVEsQ0FEMUI7QUFBQSxvQkFFSU0sVUFBVSxLQUFLcEIsTUFBTCxDQUFZTyxNQUFaLElBQXVCTyxTQUFTLENBQWhDLElBQXNDLENBRnBEO0FBQUEsb0JBR0lPLFdBQVcsS0FBS3JCLE1BQUwsQ0FBWU8sTUFBWixJQUF1QixFQUFHTyxRQUFRUCxNQUFYLEtBQXVCLENBQTlDLENBSGY7QUFBQSxvQkFJSWUsT0FBT0YsVUFBVUMsUUFKckI7QUFBQSxvQkFLSUUsTUFBTSxDQUFFLEtBQUt2QixNQUFMLENBQWFvQixPQUFiLEtBQTBCRCxXQUEzQixHQUEyQyxDQUFDLE1BQU1HLE9BQU8sSUFBSUgsV0FBWCxHQUF5QlosTUFBL0IsQ0FBRCxJQUEyQyxDQUF2RixLQUE4RmUsU0FBU0osYUFBYSxDQUFDSixRQUFRUCxNQUFULElBQW1CLENBQXpDLElBQThDLENBQUMsS0FBS1AsTUFBTCxDQUFZcUIsVUFBWixJQUEyQixDQUFDLEtBQUtILFVBQU4sSUFBb0IsQ0FBaEQsS0FBdUQsQ0FBQ0ksVUFBVSxDQUFYLElBQWdCSCxXQUFySCxHQUFtSSxDQUFqTyxDQUxWOztBQU9BLHVCQUFNRyxJQUFOLEVBQVlDLE9BQU9SLElBQUksS0FBS2YsTUFBTCxDQUFZcUIsVUFBWixDQUFKLEVBQTZCLENBQUNDLFVBQVUsQ0FBWCxJQUFnQkgsV0FBN0MsQ0FBbkI7O0FBRUEsdUJBQU9JLEdBQVA7QUFDSDtBQTlFeUI7O0FBQUE7QUFBQTs7QUFpRjlCLFdBQU96QixrQkFBUDtBQUNILENBbEZEIiwiZmlsZSI6IkJpbmFyeVBhcnNlckJ1ZmZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgQmluYXJ5UGFyc2VyQnVmZmVyLmpzIC0gYmFzZWQgb24gKHtAbGluayBodHRwOi8vanNmcm9taGVsbC5jb20vY2xhc3Nlcy9iaW5hcnktcGFyc2VyIEJpbmFyeSBQYXJzZXJ9KSBieSBKb25hcyBSYW9uaSBTb2FyZXMgU2lsdmFcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBAaWdub3JlXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIGxvZ2dlciA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oTG9nZ2VyKSB7XG5cbiAgICAvKipcbiAgICAgKiBCaW5hcnlQYXJzZXJCdWZmZXJcbiAgICAgKiBAaWdub3JlXG4gICAgICogXG4gICAgICogQG1vZHVsZSBCaW5hcnlQYXJzZXJCdWZmZXJcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAc2luY2UgMC4wLjFcbiAgICAgKiBcbiAgICAgKiBAY2xhc3NkZXNjIEN1cnNvciBjbGFzcyB0aGF0IG1hcHMgYSBNb25nb0RCLWxpa2UgY3Vyc29yXG4gICAgICogXG4gICAgICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7Q29sbGVjdGlvbn0gY29sbGVjdGlvbiAtIFRoZSBjb2xsZWN0aW9uIGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIERhdGFiYXNlIG9iamVjdFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gICAgICogXG4gICAgICovXG4gICAgY2xhc3MgQmluYXJ5UGFyc2VyQnVmZmVyIHtcbiAgICAgICAgY29uc3RydWN0b3IoYmlnRW5kaWFuLCBidWZmZXIpIHtcbiAgICAgICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5iaWdFbmRpYW4gPSBiaWdFbmRpYW4gfHwgMDtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gW107XG4gICAgICAgICAgICB0aGlzLnNldEJ1ZmZlcihidWZmZXIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzZXRCdWZmZXIoZGF0YSkge1xuICAgICAgICAgICAgdmFyIGwsIGksIGI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgaSA9IGwgPSBkYXRhLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBiID0gdGhpcy5idWZmZXIgPSBuZXcgQXJyYXkobCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yICg7IGk7IGJbbCAtIGldID0gZGF0YS5jaGFyQ29kZUF0KC0taSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoaXMuYmlnRW5kaWFuICYmIGIucmV2ZXJzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBoYXNOZWVkZWRCaXRzKG5lZWRlZEJpdHMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmJ1ZmZlci5sZW5ndGggPj0gLSgtbmVlZGVkQml0cyA+PiAzKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY2hlY2tCdWZmZXIobmVlZGVkQml0cykge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmhhc05lZWRlZEJpdHMobmVlZGVkQml0cykpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJjaGVja0J1ZmZlcjo6bWlzc2luZyBieXRlc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmVhZEJpdHMoc3RhcnQsIGxlbmd0aCkge1xuICAgICAgICAgICAgLy9zaGwgZml4OiBIZW5yaSBUb3JnZW1hbmUgfjE5OTYgKGNvbXByZXNzZWQgYnkgSm9uYXMgUmFvbmkpXG4gICAgICAgIFxuICAgICAgICAgICAgZnVuY3Rpb24gc2hsIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgZm9yICg7IGItLTsgYSA9ICgoYSAlPSAweDdmZmZmZmZmICsgMSkgJiAweDQwMDAwMDAwKSA9PSAweDQwMDAwMDAwID8gYSAqIDIgOiAoYSAtIDB4NDAwMDAwMDApICogMiArIDB4N2ZmZmZmZmYgKyAxKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICAgICBpZiAoc3RhcnQgPCAwIHx8IGxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAgICAgdGhpcy5jaGVja0J1ZmZlcihzdGFydCArIGxlbmd0aCk7XG4gICAgICAgIFxuICAgICAgICAgICAgdmFyIG9mZnNldExlZnQsXG4gICAgICAgICAgICAgICAgb2Zmc2V0UmlnaHQgPSBzdGFydCAlIDgsXG4gICAgICAgICAgICAgICAgY3VyQnl0ZSA9IHRoaXMuYnVmZmVyLmxlbmd0aCAtICggc3RhcnQgPj4gMyApIC0gMSxcbiAgICAgICAgICAgICAgICBsYXN0Qnl0ZSA9IHRoaXMuYnVmZmVyLmxlbmd0aCArICggLSggc3RhcnQgKyBsZW5ndGggKSA+PiAzICksXG4gICAgICAgICAgICAgICAgZGlmZiA9IGN1ckJ5dGUgLSBsYXN0Qnl0ZSxcbiAgICAgICAgICAgICAgICBzdW0gPSAoKHRoaXMuYnVmZmVyWyBjdXJCeXRlIF0gPj4gb2Zmc2V0UmlnaHQpICYgKCgxIDw8IChkaWZmID8gOCAtIG9mZnNldFJpZ2h0IDogbGVuZ3RoKSkgLSAxKSkgKyAoZGlmZiAmJiAob2Zmc2V0TGVmdCA9IChzdGFydCArIGxlbmd0aCkgJSA4KSA/ICh0aGlzLmJ1ZmZlcltsYXN0Qnl0ZSsrXSAmICgoMSA8PCBvZmZzZXRMZWZ0KSAtIDEpKSA8PCAoZGlmZi0tIDw8IDMpIC0gb2Zmc2V0UmlnaHQgOiAwKTtcbiAgICAgICAgXG4gICAgICAgICAgICBmb3IoOyBkaWZmOyBzdW0gKz0gc2hsKHRoaXMuYnVmZmVyW2xhc3RCeXRlKytdLCAoZGlmZi0tIDw8IDMpIC0gb2Zmc2V0UmlnaHQpKTtcbiAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gc3VtO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBCaW5hcnlQYXJzZXJCdWZmZXI7XG59OyJdfQ==
