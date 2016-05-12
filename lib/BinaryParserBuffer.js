"use strict";

/**
 * @file BinaryParserBuffer.js - based on ({@link http://jsfromhell.com/classes/binary-parser Binary Parser}) by Jonas Raoni Soares Silva
 * @version 0.0.1
 * @ignore
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var Logger = require("./utils/Logger");

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
function BinaryParserBuffer(bigEndian, buffer) {
    this.bigEndian = bigEndian || 0;
    this.buffer = [];
    this.setBuffer(buffer);
}

BinaryParserBuffer.prototype.setBuffer = function (data) {
    var l, i, b;

    if (data) {
        i = l = data.length;
        b = this.buffer = new Array(l);

        for (; i; b[l - i] = data.charCodeAt(--i)) {}

        this.bigEndian && b.reverse();
    }
};

BinaryParserBuffer.prototype.hasNeededBits = function (neededBits) {
    return this.buffer.length >= -(-neededBits >> 3);
};

BinaryParserBuffer.prototype.checkBuffer = function (neededBits) {
    if (!this.hasNeededBits(neededBits)) {
        throw new Error("checkBuffer::missing bytes");
    }
};

BinaryParserBuffer.prototype.readBits = function (start, length) {
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
};

module.exports = BinaryParserBuffer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9CaW5hcnlQYXJzZXJCdWZmZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBVUEsSUFBSSxTQUFTLFFBQVEsZ0JBQVIsQ0FBYjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBcUJBLFNBQVMsa0JBQVQsQ0FBNkIsU0FBN0IsRUFBd0MsTUFBeEMsRUFBZ0Q7QUFDNUMsU0FBSyxTQUFMLEdBQWlCLGFBQWEsQ0FBOUI7QUFDQSxTQUFLLE1BQUwsR0FBYyxFQUFkO0FBQ0EsU0FBSyxTQUFMLENBQWUsTUFBZjtBQUNIOztBQUVELG1CQUFtQixTQUFuQixDQUE2QixTQUE3QixHQUF5QyxVQUFVLElBQVYsRUFBZ0I7QUFDckQsUUFBSSxDQUFKLEVBQU8sQ0FBUCxFQUFVLENBQVY7O0FBRUEsUUFBSSxJQUFKLEVBQVU7QUFDTixZQUFJLElBQUksS0FBSyxNQUFiO0FBQ0EsWUFBSSxLQUFLLE1BQUwsR0FBYyxJQUFJLEtBQUosQ0FBVSxDQUFWLENBQWxCOztBQUVBLGVBQU8sQ0FBUCxFQUFVLEVBQUUsSUFBSSxDQUFOLElBQVcsS0FBSyxVQUFMLENBQWdCLEVBQUUsQ0FBbEIsQ0FBckI7O0FBRUEsYUFBSyxTQUFMLElBQWtCLEVBQUUsT0FBRixFQUFsQjtBQUNIO0FBQ0osQ0FYRDs7QUFhQSxtQkFBbUIsU0FBbkIsQ0FBNkIsYUFBN0IsR0FBNkMsVUFBVSxVQUFWLEVBQXNCO0FBQy9ELFdBQU8sS0FBSyxNQUFMLENBQVksTUFBWixJQUFzQixFQUFFLENBQUMsVUFBRCxJQUFlLENBQWpCLENBQTdCO0FBQ0gsQ0FGRDs7QUFJQSxtQkFBbUIsU0FBbkIsQ0FBNkIsV0FBN0IsR0FBMkMsVUFBVSxVQUFWLEVBQXNCO0FBQzdELFFBQUksQ0FBQyxLQUFLLGFBQUwsQ0FBbUIsVUFBbkIsQ0FBTCxFQUFxQztBQUNqQyxjQUFNLElBQUksS0FBSixDQUFVLDRCQUFWLENBQU47QUFDSDtBQUNKLENBSkQ7O0FBTUEsbUJBQW1CLFNBQW5CLENBQTZCLFFBQTdCLEdBQXdDLFVBQVUsS0FBVixFQUFpQixNQUFqQixFQUF5Qjs7O0FBRzdELGFBQVMsR0FBVCxDQUFjLENBQWQsRUFBaUIsQ0FBakIsRUFBb0I7QUFDaEIsZUFBTyxHQUFQLEVBQVksSUFBSSxDQUFDLENBQUMsS0FBSyxhQUFhLENBQW5CLElBQXdCLFVBQXpCLEtBQXdDLFVBQXhDLEdBQXFELElBQUksQ0FBekQsR0FBNkQsQ0FBQyxJQUFJLFVBQUwsSUFBbUIsQ0FBbkIsR0FBdUIsVUFBdkIsR0FBb0MsQ0FBakg7O0FBRUEsZUFBTyxDQUFQO0FBQ0g7O0FBRUQsUUFBSSxRQUFRLENBQVIsSUFBYSxVQUFVLENBQTNCLEVBQThCO0FBQzFCLGVBQU8sQ0FBUDtBQUNIOztBQUVELFNBQUssV0FBTCxDQUFpQixRQUFRLE1BQXpCOztBQUVBLFFBQUksVUFBSjtRQUNJLGNBQWMsUUFBUSxDQUQxQjtRQUVJLFVBQVUsS0FBSyxNQUFMLENBQVksTUFBWixJQUF1QixTQUFTLENBQWhDLElBQXNDLENBRnBEO1FBR0ksV0FBVyxLQUFLLE1BQUwsQ0FBWSxNQUFaLElBQXVCLEVBQUcsUUFBUSxNQUFYLEtBQXVCLENBQTlDLENBSGY7UUFJSSxPQUFPLFVBQVUsUUFKckI7UUFLSSxNQUFNLENBQUUsS0FBSyxNQUFMLENBQWEsT0FBYixLQUEwQixXQUEzQixHQUEyQyxDQUFDLE1BQU0sT0FBTyxJQUFJLFdBQVgsR0FBeUIsTUFBL0IsQ0FBRCxJQUEyQyxDQUF2RixLQUE4RixTQUFTLGFBQWEsQ0FBQyxRQUFRLE1BQVQsSUFBbUIsQ0FBekMsSUFBOEMsQ0FBQyxLQUFLLE1BQUwsQ0FBWSxVQUFaLElBQTJCLENBQUMsS0FBSyxVQUFOLElBQW9CLENBQWhELEtBQXVELENBQUMsVUFBVSxDQUFYLElBQWdCLFdBQXJILEdBQW1JLENBQWpPLENBTFY7O0FBT0EsV0FBTSxJQUFOLEVBQVksT0FBTyxJQUFJLEtBQUssTUFBTCxDQUFZLFVBQVosQ0FBSixFQUE2QixDQUFDLFVBQVUsQ0FBWCxJQUFnQixXQUE3QyxDQUFuQjs7QUFFQSxXQUFPLEdBQVA7QUFDSCxDQXpCRDs7QUEyQkEsT0FBTyxPQUFQLEdBQWlCLGtCQUFqQiIsImZpbGUiOiJCaW5hcnlQYXJzZXJCdWZmZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIEJpbmFyeVBhcnNlckJ1ZmZlci5qcyAtIGJhc2VkIG9uICh7QGxpbmsgaHR0cDovL2pzZnJvbWhlbGwuY29tL2NsYXNzZXMvYmluYXJ5LXBhcnNlciBCaW5hcnkgUGFyc2VyfSkgYnkgSm9uYXMgUmFvbmkgU29hcmVzIFNpbHZhXG4gKiBAdmVyc2lvbiAwLjAuMVxuICogQGlnbm9yZVxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIExvZ2dlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0xvZ2dlclwiKTtcblxuLyoqXG4gKiBCaW5hcnlQYXJzZXJCdWZmZXJcbiAqIEBpZ25vcmVcbiAqIFxuICogQG1vZHVsZSBCaW5hcnlQYXJzZXJCdWZmZXJcbiAqIEBjb25zdHJ1Y3RvclxuICogQHNpbmNlIDAuMC4xXG4gKiBcbiAqIEBjbGFzc2Rlc2MgQ3Vyc29yIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjdXJzb3JcbiAqIFxuICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogQHBhcmFtIHtDb2xsZWN0aW9ufSBjb2xsZWN0aW9uIC0gVGhlIGNvbGxlY3Rpb24gaW5zdGFuY2VcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gKiBcbiAqL1xuZnVuY3Rpb24gQmluYXJ5UGFyc2VyQnVmZmVyIChiaWdFbmRpYW4sIGJ1ZmZlcikge1xuICAgIHRoaXMuYmlnRW5kaWFuID0gYmlnRW5kaWFuIHx8IDA7XG4gICAgdGhpcy5idWZmZXIgPSBbXTtcbiAgICB0aGlzLnNldEJ1ZmZlcihidWZmZXIpO1xufVxuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLnNldEJ1ZmZlciA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGwsIGksIGI7XG4gICAgXG4gICAgaWYgKGRhdGEpIHtcbiAgICAgICAgaSA9IGwgPSBkYXRhLmxlbmd0aDtcbiAgICAgICAgYiA9IHRoaXMuYnVmZmVyID0gbmV3IEFycmF5KGwpO1xuICAgICAgICBcbiAgICAgICAgZm9yICg7IGk7IGJbbCAtIGldID0gZGF0YS5jaGFyQ29kZUF0KC0taSkpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5iaWdFbmRpYW4gJiYgYi5yZXZlcnNlKCk7XG4gICAgfVxufTtcblxuQmluYXJ5UGFyc2VyQnVmZmVyLnByb3RvdHlwZS5oYXNOZWVkZWRCaXRzID0gZnVuY3Rpb24gKG5lZWRlZEJpdHMpIHtcbiAgICByZXR1cm4gdGhpcy5idWZmZXIubGVuZ3RoID49IC0oLW5lZWRlZEJpdHMgPj4gMyk7XG59O1xuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLmNoZWNrQnVmZmVyID0gZnVuY3Rpb24gKG5lZWRlZEJpdHMpIHtcbiAgICBpZiAoIXRoaXMuaGFzTmVlZGVkQml0cyhuZWVkZWRCaXRzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjaGVja0J1ZmZlcjo6bWlzc2luZyBieXRlc1wiKTtcbiAgICB9XG59O1xuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLnJlYWRCaXRzID0gZnVuY3Rpb24gKHN0YXJ0LCBsZW5ndGgpIHtcbiAgICAvL3NobCBmaXg6IEhlbnJpIFRvcmdlbWFuZSB+MTk5NiAoY29tcHJlc3NlZCBieSBKb25hcyBSYW9uaSlcblxuICAgIGZ1bmN0aW9uIHNobCAoYSwgYikge1xuICAgICAgICBmb3IgKDsgYi0tOyBhID0gKChhICU9IDB4N2ZmZmZmZmYgKyAxKSAmIDB4NDAwMDAwMDApID09IDB4NDAwMDAwMDAgPyBhICogMiA6IChhIC0gMHg0MDAwMDAwMCkgKiAyICsgMHg3ZmZmZmZmZiArIDEpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0IDwgMCB8fCBsZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICB0aGlzLmNoZWNrQnVmZmVyKHN0YXJ0ICsgbGVuZ3RoKTtcblxuICAgIHZhciBvZmZzZXRMZWZ0LFxuICAgICAgICBvZmZzZXRSaWdodCA9IHN0YXJ0ICUgOCxcbiAgICAgICAgY3VyQnl0ZSA9IHRoaXMuYnVmZmVyLmxlbmd0aCAtICggc3RhcnQgPj4gMyApIC0gMSxcbiAgICAgICAgbGFzdEJ5dGUgPSB0aGlzLmJ1ZmZlci5sZW5ndGggKyAoIC0oIHN0YXJ0ICsgbGVuZ3RoICkgPj4gMyApLFxuICAgICAgICBkaWZmID0gY3VyQnl0ZSAtIGxhc3RCeXRlLFxuICAgICAgICBzdW0gPSAoKHRoaXMuYnVmZmVyWyBjdXJCeXRlIF0gPj4gb2Zmc2V0UmlnaHQpICYgKCgxIDw8IChkaWZmID8gOCAtIG9mZnNldFJpZ2h0IDogbGVuZ3RoKSkgLSAxKSkgKyAoZGlmZiAmJiAob2Zmc2V0TGVmdCA9IChzdGFydCArIGxlbmd0aCkgJSA4KSA/ICh0aGlzLmJ1ZmZlcltsYXN0Qnl0ZSsrXSAmICgoMSA8PCBvZmZzZXRMZWZ0KSAtIDEpKSA8PCAoZGlmZi0tIDw8IDMpIC0gb2Zmc2V0UmlnaHQgOiAwKTtcblxuICAgIGZvcig7IGRpZmY7IHN1bSArPSBzaGwodGhpcy5idWZmZXJbbGFzdEJ5dGUrK10sIChkaWZmLS0gPDwgMykgLSBvZmZzZXRSaWdodCkpO1xuXG4gICAgcmV0dXJuIHN1bTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQmluYXJ5UGFyc2VyQnVmZmVyOyJdfQ==
