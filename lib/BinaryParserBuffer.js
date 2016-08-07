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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9CaW5hcnlQYXJzZXJCdWZmZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQVVBLElBQUksU0FBUyxJQUFiOztBQUVBLE9BQU8sT0FBUCxHQUFpQixVQUFTLE1BQVQsRUFBaUI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxRQXFCeEIsa0JBckJ3QjtBQXNCMUIsb0NBQVksU0FBWixFQUF1QixNQUF2QixFQUErQjtBQUFBOztBQUMzQixxQkFBUyxPQUFPLFFBQWhCOztBQUVBLGlCQUFLLFNBQUwsR0FBaUIsYUFBYSxDQUE5QjtBQUNBLGlCQUFLLE1BQUwsR0FBYyxFQUFkO0FBQ0EsaUJBQUssU0FBTCxDQUFlLE1BQWY7QUFDSDs7QUE1QnlCO0FBQUE7QUFBQSxzQ0E4QmhCLElBOUJnQixFQThCVjtBQUNaLG9CQUFJLENBQUosRUFBTyxDQUFQLEVBQVUsQ0FBVjs7QUFFQSxvQkFBSSxJQUFKLEVBQVU7QUFDTix3QkFBSSxJQUFJLEtBQUssTUFBYjtBQUNBLHdCQUFJLEtBQUssTUFBTCxHQUFjLElBQUksS0FBSixDQUFVLENBQVYsQ0FBbEI7O0FBRUEsMkJBQU8sQ0FBUCxFQUFVLEVBQUUsSUFBSSxDQUFOLElBQVcsS0FBSyxVQUFMLENBQWdCLEVBQUUsQ0FBbEIsQ0FBckI7O0FBRUEseUJBQUssU0FBTCxJQUFrQixFQUFFLE9BQUYsRUFBbEI7QUFDSDtBQUNKO0FBekN5QjtBQUFBO0FBQUEsMENBMkNaLFVBM0NZLEVBMkNBO0FBQ3RCLHVCQUFPLEtBQUssTUFBTCxDQUFZLE1BQVosSUFBc0IsRUFBRSxDQUFDLFVBQUQsSUFBZSxDQUFqQixDQUE3QjtBQUNIO0FBN0N5QjtBQUFBO0FBQUEsd0NBK0NkLFVBL0NjLEVBK0NGO0FBQ3BCLG9CQUFJLENBQUMsS0FBSyxhQUFMLENBQW1CLFVBQW5CLENBQUwsRUFBcUM7QUFDakMsMkJBQU8sS0FBUCxDQUFhLDRCQUFiO0FBQ0g7QUFDSjtBQW5EeUI7QUFBQTtBQUFBLHFDQXFEakIsS0FyRGlCLEVBcURWLE1BckRVLEVBcURGOzs7QUFHcEIseUJBQVMsR0FBVCxDQUFjLENBQWQsRUFBaUIsQ0FBakIsRUFBb0I7QUFDaEIsMkJBQU8sR0FBUCxFQUFZLElBQUksQ0FBQyxDQUFDLEtBQUssYUFBYSxDQUFuQixJQUF3QixVQUF6QixLQUF3QyxVQUF4QyxHQUFxRCxJQUFJLENBQXpELEdBQTZELENBQUMsSUFBSSxVQUFMLElBQW1CLENBQW5CLEdBQXVCLFVBQXZCLEdBQW9DLENBQWpIOztBQUVBLDJCQUFPLENBQVA7QUFDSDs7QUFFRCxvQkFBSSxRQUFRLENBQVIsSUFBYSxVQUFVLENBQTNCLEVBQThCO0FBQzFCLDJCQUFPLENBQVA7QUFDSDs7QUFFRCxxQkFBSyxXQUFMLENBQWlCLFFBQVEsTUFBekI7O0FBRUEsb0JBQUksVUFBSjtvQkFDSSxjQUFjLFFBQVEsQ0FEMUI7b0JBRUksVUFBVSxLQUFLLE1BQUwsQ0FBWSxNQUFaLElBQXVCLFNBQVMsQ0FBaEMsSUFBc0MsQ0FGcEQ7b0JBR0ksV0FBVyxLQUFLLE1BQUwsQ0FBWSxNQUFaLElBQXVCLEVBQUcsUUFBUSxNQUFYLEtBQXVCLENBQTlDLENBSGY7b0JBSUksT0FBTyxVQUFVLFFBSnJCO29CQUtJLE1BQU0sQ0FBRSxLQUFLLE1BQUwsQ0FBYSxPQUFiLEtBQTBCLFdBQTNCLEdBQTJDLENBQUMsTUFBTSxPQUFPLElBQUksV0FBWCxHQUF5QixNQUEvQixDQUFELElBQTJDLENBQXZGLEtBQThGLFNBQVMsYUFBYSxDQUFDLFFBQVEsTUFBVCxJQUFtQixDQUF6QyxJQUE4QyxDQUFDLEtBQUssTUFBTCxDQUFZLFVBQVosSUFBMkIsQ0FBQyxLQUFLLFVBQU4sSUFBb0IsQ0FBaEQsS0FBdUQsQ0FBQyxVQUFVLENBQVgsSUFBZ0IsV0FBckgsR0FBbUksQ0FBak8sQ0FMVjs7QUFPQSx1QkFBTSxJQUFOLEVBQVksT0FBTyxJQUFJLEtBQUssTUFBTCxDQUFZLFVBQVosQ0FBSixFQUE2QixDQUFDLFVBQVUsQ0FBWCxJQUFnQixXQUE3QyxDQUFuQjs7QUFFQSx1QkFBTyxHQUFQO0FBQ0g7QUE5RXlCOztBQUFBO0FBQUE7O0FBaUY5QixXQUFPLGtCQUFQO0FBQ0gsQ0FsRkQiLCJmaWxlIjoiQmluYXJ5UGFyc2VyQnVmZmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBCaW5hcnlQYXJzZXJCdWZmZXIuanMgLSBiYXNlZCBvbiAoe0BsaW5rIGh0dHA6Ly9qc2Zyb21oZWxsLmNvbS9jbGFzc2VzL2JpbmFyeS1wYXJzZXIgQmluYXJ5IFBhcnNlcn0pIGJ5IEpvbmFzIFJhb25pIFNvYXJlcyBTaWx2YVxuICogQHZlcnNpb24gMS4wLjBcbiAqIEBpZ25vcmVcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgbG9nZ2VyID0gbnVsbDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihMb2dnZXIpIHtcblxuICAgIC8qKlxuICAgICAqIEJpbmFyeVBhcnNlckJ1ZmZlclxuICAgICAqIEBpZ25vcmVcbiAgICAgKiBcbiAgICAgKiBAbW9kdWxlIEJpbmFyeVBhcnNlckJ1ZmZlclxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBzaW5jZSAwLjAuMVxuICAgICAqIFxuICAgICAqIEBjbGFzc2Rlc2MgQ3Vyc29yIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjdXJzb3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge01vbmdvUG9ydGFibGV9IGRiIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gICAgICogQHBhcmFtIHtDb2xsZWN0aW9ufSBjb2xsZWN0aW9uIC0gVGhlIGNvbGxlY3Rpb24gaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbZmllbGRzPXt9XSAtIFRoZSBmaWVsZHMgb2YgdGhlIGRvY3VtZW50IHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLnBrRmFjdG9yeT1udWxsXSAtIE9iamVjdCBvdmVycmlkaW5nIHRoZSBiYXNpYyBcIk9iamVjdElkXCIgcHJpbWFyeSBrZXkgZ2VuZXJhdGlvbi5cbiAgICAgKiBcbiAgICAgKi9cbiAgICBjbGFzcyBCaW5hcnlQYXJzZXJCdWZmZXIge1xuICAgICAgICBjb25zdHJ1Y3RvcihiaWdFbmRpYW4sIGJ1ZmZlcikge1xuICAgICAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmJpZ0VuZGlhbiA9IGJpZ0VuZGlhbiB8fCAwO1xuICAgICAgICAgICAgdGhpcy5idWZmZXIgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuc2V0QnVmZmVyKGJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHNldEJ1ZmZlcihkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbCwgaSwgYjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpID0gbCA9IGRhdGEubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGIgPSB0aGlzLmJ1ZmZlciA9IG5ldyBBcnJheShsKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKDsgaTsgYltsIC0gaV0gPSBkYXRhLmNoYXJDb2RlQXQoLS1pKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5iaWdFbmRpYW4gJiYgYi5yZXZlcnNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGhhc05lZWRlZEJpdHMobmVlZGVkQml0cykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyLmxlbmd0aCA+PSAtKC1uZWVkZWRCaXRzID4+IDMpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjaGVja0J1ZmZlcihuZWVkZWRCaXRzKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaGFzTmVlZGVkQml0cyhuZWVkZWRCaXRzKSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcImNoZWNrQnVmZmVyOjptaXNzaW5nIGJ5dGVzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZWFkQml0cyhzdGFydCwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAvL3NobCBmaXg6IEhlbnJpIFRvcmdlbWFuZSB+MTk5NiAoY29tcHJlc3NlZCBieSBKb25hcyBSYW9uaSlcbiAgICAgICAgXG4gICAgICAgICAgICBmdW5jdGlvbiBzaGwgKGEsIGIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKDsgYi0tOyBhID0gKChhICU9IDB4N2ZmZmZmZmYgKyAxKSAmIDB4NDAwMDAwMDApID09IDB4NDAwMDAwMDAgPyBhICogMiA6IChhIC0gMHg0MDAwMDAwMCkgKiAyICsgMHg3ZmZmZmZmZiArIDEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgIGlmIChzdGFydCA8IDAgfHwgbGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmNoZWNrQnVmZmVyKHN0YXJ0ICsgbGVuZ3RoKTtcbiAgICAgICAgXG4gICAgICAgICAgICB2YXIgb2Zmc2V0TGVmdCxcbiAgICAgICAgICAgICAgICBvZmZzZXRSaWdodCA9IHN0YXJ0ICUgOCxcbiAgICAgICAgICAgICAgICBjdXJCeXRlID0gdGhpcy5idWZmZXIubGVuZ3RoIC0gKCBzdGFydCA+PiAzICkgLSAxLFxuICAgICAgICAgICAgICAgIGxhc3RCeXRlID0gdGhpcy5idWZmZXIubGVuZ3RoICsgKCAtKCBzdGFydCArIGxlbmd0aCApID4+IDMgKSxcbiAgICAgICAgICAgICAgICBkaWZmID0gY3VyQnl0ZSAtIGxhc3RCeXRlLFxuICAgICAgICAgICAgICAgIHN1bSA9ICgodGhpcy5idWZmZXJbIGN1ckJ5dGUgXSA+PiBvZmZzZXRSaWdodCkgJiAoKDEgPDwgKGRpZmYgPyA4IC0gb2Zmc2V0UmlnaHQgOiBsZW5ndGgpKSAtIDEpKSArIChkaWZmICYmIChvZmZzZXRMZWZ0ID0gKHN0YXJ0ICsgbGVuZ3RoKSAlIDgpID8gKHRoaXMuYnVmZmVyW2xhc3RCeXRlKytdICYgKCgxIDw8IG9mZnNldExlZnQpIC0gMSkpIDw8IChkaWZmLS0gPDwgMykgLSBvZmZzZXRSaWdodCA6IDApO1xuICAgICAgICBcbiAgICAgICAgICAgIGZvcig7IGRpZmY7IHN1bSArPSBzaGwodGhpcy5idWZmZXJbbGFzdEJ5dGUrK10sIChkaWZmLS0gPDwgMykgLSBvZmZzZXRSaWdodCkpO1xuICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBzdW07XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIEJpbmFyeVBhcnNlckJ1ZmZlcjtcbn07Il19
