/* tslint:disable:no-bitwise */

import { JSWLogger } from "jsw-logger";
import * as _ from "lodash";

import { BinaryParserBuffer } from "./BinaryParserBuffer";

// Shorcut for String.fromCharCode
const chr = String.fromCharCode;

const maxBits = [];
for (let i = 0; i < 64; i++) {
	maxBits[i] = Math.pow(2, i);
}

export class BinaryParser {
	protected logger: JSWLogger;

	private bigEndian: boolean;
	private allowExceptions: boolean;

	constructor(bigEndian: boolean = false, allowExceptions: boolean = true) {
		this.logger = JSWLogger.instance;

		this.bigEndian = bigEndian;
		this.allowExceptions = allowExceptions;
	}

	/***
	 * Generate a 12 byte id string used in ObjectId"s
	 *
	 * @method BinaryParser#generate12string
	 *
	 * @return {String} The 12 byte id binary string.
	 */
	public generate12string(): string {
		const time9bytes = Date.now().toString(32);
		const rnd3bytes = this.encodeInt(parseInt((Math.random() * 0xFFFFFF).toString(), 10), 24, false);

		return time9bytes + rnd3bytes;
	}

	public decodeFloat(data: string | number, precisionBits: number, exponentBits: number): number {
		const b = new BinaryParserBuffer(this.bigEndian, data);

		b.checkBuffer(precisionBits + exponentBits + 1);

		const bias = maxBits[exponentBits - 1] - 1;
		const signal = b.readBits(precisionBits + exponentBits, 1);
		const exponent = b.readBits(precisionBits, exponentBits);
		let significand = 0;
		let divisor = 2;
		let curByte = b.buffer.length + (-precisionBits >> 3) - 1;
		let byteValue;
		let startBit;
		let mask;

		do {
			// tslint:disable-next-line:semicolon no-conditional-assignment
			for (byteValue = b.buffer[++curByte], startBit = precisionBits % 8 || 8, mask = 1 << startBit; mask >>= 1; (byteValue & mask) && (significand += 1 / divisor), divisor *= 2) { ; }
			// tslint:disable-next-line:no-conditional-assignment
		} while (precisionBits -= startBit);

		return exponent === (bias << 1) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity : (1 + signal * -2) * (exponent || significand ? !exponent ? Math.pow(2, -bias + 1) * significand : Math.pow(2, exponent - bias) * (1 + significand) : 0);

		/*if (exponent == (bias << 1) + 1) {
			if (significand) {
				return NaN;
			} else {
				if (signal) {
					return -Infinity;
				} else {
					return +Infinity;
				}
			}
		} else {
			let part1 = ( 1 + signal * -2 );

			if (exponent || significand) {
				if (!exponent) {
					return part1 * (Math.pow( 2, -bias + 1 ) * significand);
				} else {
					return part1 * (Math.pow( 2, exponent - bias ) * ( 1 + significand ));
				}
			} else {
				// return return part1 * (0);
				return 0;
			}
		}*/
	}

	/*decodeFloat_(data: string|number, precisionBits: number, exponentBits: number): number {
		var b = new BinaryParserBuffer(this.bigEndian, data);

		b.checkBuffer(precisionBits + exponentBits + 1);

		var bias = maxBits[exponentBits - 1] - 1,
			signal = b.readBits(precisionBits + exponentBits, 1),
			exponent = b.readBits(precisionBits, exponentBits),
			significand = 0,
			divisor = 2,
			curByte = b.buffer.length + (-precisionBits >> 3) - 1;

		curByte++;
		let byteValue, startBit, mask;
		do {
			// for (
			//	 var byteValue = b.buffer[ ++curByte ], startBit = precisionBits % 8 || 8, mask = 1 << startBit;
			//	 mask >>= 1;
			//	 ( byteValue & mask ) && ( significand += 1 / divisor ), divisor *= 2
			// );
			byteValue = b.buffer[curByte];
			startBit = precisionBits % 8 || 8;
			mask = 1 << startBit;

			mask >>= 1;
			while (mask) {
				(byteValue & mask) && (significand += 1 / divisor);
				divisor *= 2;

				mask >>= 1
			}
			precisionBits -= startBit
		} while (precisionBits);

		// return exponent == ( bias << 1 ) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity : ( 1 + signal * -2 ) *
		( exponent || significand ? !exponent ? Math.pow( 2, -bias + 1 ) * significand : Math.pow( 2, exponent - bias ) * ( 1 + significand ) : 0 );

		if ( exponent == ( bias << 1 ) + 1 ) {
			if (significand) {
				return NaN;
			} else {
				if (signal) {
					return -Infinity;
				} else {
					return +Infinity;
				}
			}
		} else {
			var _mod = 0;

			if (exponent || significand) {
				_mod = exponent ? Math.pow( 2, exponent - bias ) * ( 1 + significand ) : Math.pow( 2, -bias + 1 ) * significand;
			}

			return ( 1 + signal * -2 ) * (_mod);
		}
	}*/

	public decodeInt(data: string | number, bits: number, signed: boolean, forceBigEndian?: boolean): number {
		const b = new BinaryParserBuffer(this.bigEndian || forceBigEndian, data);
		const x = b.readBits(0, bits);
		const max = maxBits[bits]; // max = Math.pow( 2, bits );

		return signed && x >= max / 2
			? x - max
			: x;
	}

	/*decodeInt_(data: string|number, bits: number, signed: boolean, forceBigEndian?: boolean): number {
		var b = new BinaryParserBuffer(this.bigEndian || forceBigEndian, data),
			x = b.readBits(0, bits),
			max = maxBits[bits]; //max = Math.pow( 2, bits );

		return signed && x >= max / 2 ? x - max : x;
	}*/

	public encodeFloat(data: /*string|*/number, precisionBits: number, exponentBits: number): string {
		const bias = maxBits[exponentBits - 1] - 1;
		const minExp = -bias + 1;
		const maxExp = bias;
		const minUnnormExp = minExp - precisionBits;
		// let n = parseFloat(_.toString(data));
		let n = data;
		const status = isNaN(n) || n === -Infinity || n === +Infinity ? n : 0;
		let exp = 0;
		const len = 2 * bias + 1 + precisionBits + 3;
		const bin = new Array(len);
		let signal = (n = status !== 0 ? 0 : n) < 0;
		let intPart = Math.floor(n = Math.abs(n));
		let floatPart = n - intPart;
		let lastBit;
		let rounded;
		let result;
		let i;
		let j;

		// tslint:disable-next-line:semicolon
		for (i = len; i; bin[--i] = 0) { ; }

		// tslint:disable-next-line:semicolon
		for (i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor(intPart / 2)) { ; }

		// for (i = bias + 1; floatPart > 0 && i; (bin[++i] = ((floatPart *= 2) >= 1) - 0 ) && --floatPart);
		// tslint:disable-next-line:semicolon
		for (i = bias + 1; floatPart > 0 && i; (bin[++i] = _.toNumber(((floatPart *= 2) >= 1))) && --floatPart) { ; }

		// tslint:disable-next-line:semicolon
		for (i = -1; ++i < len && !bin[i];) { ; }

		// tslint:disable-next-line:no-conditional-assignment
		if (bin[(lastBit = precisionBits - 1 + (i = (exp = bias + 1 - i) >= minExp && exp <= maxExp ? i + 1 : bias + 1 - (exp = minExp - 1))) + 1]) {
			// tslint:disable-next-line:no-conditional-assignment
			if (!(rounded = bin[lastBit])) {
				// tslint:disable-next-line:semicolon
				for (j = lastBit + 2; !rounded && j < len; rounded = bin[j++]) { ; }
			}

			// for (j = lastBit + 1; rounded && --j >= 0; (bin[j] = !bin[j] - 0) && (rounded = 0));
			// tslint:disable-next-line:semicolon
			for (j = lastBit + 1; rounded && --j >= 0; (bin[j] = _.toNumber(!bin[j])) && (rounded = 0)) { ; }
			// j = lastBit + 1;
			// while (rounded && --j >= 0) {
			// 	 bin[j] = _.toNumber(!bin[j]);
			// 	 rounded = 0;
			// }
		}

		// tslint:disable-next-line:semicolon
		for (i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i];) { ; }

		// tslint:disable-next-line:no-conditional-assignment
		if ((exp = bias + 1 - i) >= minExp && exp <= maxExp) {
			++i;
		} else if (exp < minExp) {
			if (exp !== bias + 1 - len && exp < minUnnormExp) {
				this.logger.warn("encodeFloat::float underflow");
			}

			i = bias + 1 - (exp = minExp - 1);
		}

		if (intPart || status !== 0) {
			this.logger.warn(intPart ? "encodeFloat::float overflow" : "encodeFloat::" + status);
			exp = maxExp + 1;
			i = bias + 2;

			if (status === -Infinity) {
				signal = true;
			} else if (isNaN(status)) {
				bin[i] = 1;
			}
		}

		// tslint:disable-next-line:semicolon
		for (n = Math.abs(exp + bias), j = exponentBits + 1, result = ""; --j; result = (n % 2) + result, n = n >>= 1) { ; }

		let r = [];
		for (n = 0, j = 0, i = (result = (signal ? "1" : "0") + result + bin.slice(i, i + precisionBits).join("")).length, r = []; i; j = (j + 1) % 8) {
			n += (1 << j) * result.charAt(--i);
			if (j === 7) {
				r[r.length] = String.fromCharCode(n);
				n = 0;
			}
		}

		r[r.length] = n
			? String.fromCharCode(n)
			: "";

		return (this.bigEndian ? r.reverse() : r).join("");
	}
	/*
	encodeFloat_(data: string|number, precisionBits: number, exponentBits: number): string {
		var bias = maxBits[exponentBits - 1] - 1,
			minExp = -bias + 1,
			maxExp = bias,
			minUnnormExp = minExp - precisionBits,
			n = parseFloat(`${data}`),
			status = isNaN(n) || n == -Infinity || n == +Infinity ? n : 0,
			exp = 0,
			len = 2 * bias + 1 + precisionBits + 3,
			bin: Array<number> = new Array(len),
			signal: boolean = (n = status !== 0 ? 0 : n) < 0,
			intPart = Math.floor(n = Math.abs(n)),
			floatPart: number = n - intPart,
			lastBit,
			rounded,
			result,
			i,
			j;

		// for (i = len; i; bin[--i] = 0);
		i = len;
		while (i) {
			bin[--i] = 0;
		}

		// for (i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor(intPart / 2));
		i = bias + 2;
		while (intPart && i) {
			bin[--i] = intPart % 2;
			intPart = Math.floor(intPart / 2);
		}

		// for (i = bias + 1; floatPart > 0 && i; (bin[++i] = ((floatPart *= 2) >= 1) - 0 ) && --floatPart);
		i = bias + 1;
		while (floatPart > 0 && i) {
			floatPart *= 2;
			bin[++i] = floatPart >= 1 ? 1 : 0;

			--floatPart;
		}

		// for (i = -1; ++i < len && !bin[i];);
		i = 0;
		while (i < len && !bin[i]) {
			i++;
		}

		if (bin[(lastBit = precisionBits - 1 + (i = (exp = bias + 1 - i) >= minExp &&
				exp <= maxExp ? i + 1 : bias + 1 - (exp = minExp - 1))) + 1]) {
			if (!(rounded = bin[lastBit])) {
				// for (j = lastBit + 2; !rounded && j < len; rounded = bin[j++]);
				j = lastBit + 2;
				while (!rounded && j < len) {
					rounded = bin[j++];
				}
			}

			// for (j = lastBit + 1; rounded && --j >= 0; (bin[j] = !bin[j] - 0) && (rounded = 0));
			j = lastBit;
			while (rounded && j >= 0) {
				j--;
				bin[j] = bin[j] ? 0 : 1;
				rounded = 0;
			}
		}

		for (i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i];);

		if ((exp = bias + 1 - i) >= minExp && exp <= maxExp) {
			++i;
		} else if (exp < minExp) {
			exp != bias + 1 - len && exp < minUnnormExp && this.logger.warn("encodeFloat::float underflow");
			i = bias + 1 - (exp = minExp - 1);
		}

		if (intPart || status !== 0) {
			this.logger.warn(intPart ? "encodeFloat::float overflow" : "encodeFloat::" + status);

			exp = maxExp + 1;
			i = bias + 2;

			if (status == -Infinity) {
				signal = true; // 1
			} else if (isNaN(status)) {
				bin[i] = 1;
			}
		}

		// for (n = Math.abs(exp + bias), j = exponentBits + 1, result = ""; --j; result = (n % 2) + result, n = n >>= 1);
		n = Math.abs(exp + bias);
		j = exponentBits;
		result = "";
		while (j) {
			j--;
			result = (n % 2) + result;
			n = n >>= 1;
		}

		let r = [];

		// for (n = 0, j = 0, i = (result = (signal ? "1" : "0") + result + bin.slice(i, i + precisionBits).join("")).length, r = []; i; j = (j + 1) % 8) {
		n = 0;
		j = 0;
		result = (signal ? "1" : "0") + result + bin.slice(i, i + precisionBits).join("");
		i = result.length;
		r = [];
		while (i) {
			j = (j + 1) % 8
			n += (1 << j) * result.charAt(--i);

			if (j == 7) {
				r[r.length] = String.fromCharCode(n);
				n = 0;
			}
		}

		r[r.length] = n ? String.fromCharCode(n) : "";

		return (this.bigEndian ? r.reverse() : r).join("");
	}
	*/
	public encodeInt(data: number, bits: number, signed: boolean, forceBigEndian?: boolean): string {
		const max = maxBits[bits];
		let r;

		if (data >= max || data < -(max / 2)) {
			this.logger.warn("encodeInt::overflow");
			data = 0;
		}

		if (data < 0) {
			data += max;
		}

		// tslint:disable-next-line:semicolon
		for (r = []; data; r[r.length] = String.fromCharCode(data % 256), data = Math.floor(data / 256)) { ; }

		// tslint:disable-next-line:semicolon
		for (bits = -(-bits >> 3) - r.length; bits--; r[r.length] = "\0") { ; }

		return ((this.bigEndian || forceBigEndian) ? r.reverse() : r).join("");
	}

	/*encodeInt_(data: number, bits: number, signed: boolean, forceBigEndian?: boolean): string {
		var max = maxBits[bits];
		data = data - 0;	// Ensure a number

		if (data >= max || data < -(max / 2)) {
			this.logger.warn("encodeInt::overflow");
			data = 0;
		}

		if (data < 0) {
			data += max;
		}

		// for (var r = []; data; r[r.length] = String.fromCharCode(data % 256), data = Math.floor(data / 256));
		let r = [];
		while(data) {
			r[r.length] = String.fromCharCode(data % 256);
			data = Math.floor(data / 256);
		}

		// for (bits = -(-bits >> 3) - r.length; bits--; r[r.length] = "\0");
		bits = -(-bits >> 3) - r.length;
		while(bits) {
			bits--;
			r[r.length] = "\0";
		}

		return ((this.bigEndian || forceBigEndian) ? r.reverse() : r).join("");
	}*/

	public toSmall(data: number | string): number { return this.decodeInt(data, 8, true); }
	public fromSmall(data: number): string { return this.encodeInt(data, 8, true); }
	public toByte(data: number | string): number { return this.decodeInt(data, 8, false); }
	public fromByte(data: number): string { return this.encodeInt(data, 8, false); }
	public toShort(data: number | string): number { return this.decodeInt(data, 16, true); }
	public fromShort(data: number): string { return this.encodeInt(data, 16, true); }
	public toWord(data: number | string): number { return this.decodeInt(data, 16, false); }
	public fromWord(data: number): string { return this.encodeInt(data, 16, false); }
	public toInt(data: number | string): number { return this.decodeInt(data, 32, true); }
	public fromInt(data: number): string { return this.encodeInt(data, 32, true); }
	public toLong(data: number | string): number { return this.decodeInt(data, 64, true); }
	public fromLong(data: number): string { return this.encodeInt(data, 64, true); }
	public toDWord(data: number | string): number { return this.decodeInt(data, 32, false); }
	public fromDWord(data: number): string { return this.encodeInt(data, 32, false); }
	public toQWord(data: number | string): number { return this.decodeInt(data, 64, true); }
	public fromQWord(data: number): string { return this.encodeInt(data, 64, true); }
	public toFloat(data: number | string): number { return this.decodeFloat(data, 23, 8); }
	public fromFloat(data: number): string { return this.encodeFloat(data, 23, 8); }
	public toDouble(data: number | string): number { return this.decodeFloat(data, 52, 11); }
	public fromDouble(data: number): string { return this.encodeFloat(data, 52, 11); }

	// Factor out the encode so it can be shared by add_header and push_int32
	public encode_int32(num: number, asArray: boolean = false): string[] | string {
		let a;
		let b;
		let c;
		let d;
		let unsigned;

		unsigned = (num < 0) ? (num + 0x100000000) : num;
		a = Math.floor(unsigned / 0xffffff);

		unsigned &= 0xffffff;
		b = Math.floor(unsigned / 0xffff);

		unsigned &= 0xffff;
		c = Math.floor(unsigned / 0xff);

		unsigned &= 0xff;
		d = Math.floor(unsigned);

		return asArray ? [chr(a), chr(b), chr(c), chr(d)] : chr(a) + chr(b) + chr(c) + chr(d);
	}

	public encode_int64(num: number): string {
		let a;
		let b;
		let c;
		let d;
		let e;
		let f;
		let g;
		let h;
		let unsigned;

		unsigned = (num < 0) ? (num + 0x10000000000000000) : num;
		a = Math.floor(unsigned / 0xffffffffffffff);

		unsigned &= 0xffffffffffffff;
		b = Math.floor(unsigned / 0xffffffffffff);

		unsigned &= 0xffffffffffff;
		c = Math.floor(unsigned / 0xffffffffff);

		unsigned &= 0xffffffffff;
		d = Math.floor(unsigned / 0xffffffff);

		unsigned &= 0xffffffff;
		e = Math.floor(unsigned / 0xffffff);

		unsigned &= 0xffffff;
		f = Math.floor(unsigned / 0xffff);

		unsigned &= 0xffff;
		g = Math.floor(unsigned / 0xff);

		unsigned &= 0xff;
		h = Math.floor(unsigned);

		return chr(a) + chr(b) + chr(c) + chr(d) + chr(e) + chr(f) + chr(g) + chr(h);
	}

	/***
	 * UTF8 methods
	 */

	// Take a raw binary string and return a utf8 string
	public decode_utf8(binaryStr: string): string {
		// let len = binaryStr.length;
		let decoded = "";
		let i = 0;
		let c = 0;
		// let c1 = 0;
		let c2 = 0;
		let c3;

		while (i < binaryStr.length) {
			c = binaryStr.charCodeAt(i);

			if (c < 128) {
				decoded += String.fromCharCode(c);

				i++;
			} else if ((c > 191) && (c < 224)) {
				c2 = binaryStr.charCodeAt(i + 1);
				decoded += String.fromCharCode(((c & 31) << 6) | (c2 & 63));

				i += 2;
			} else {
				c2 = binaryStr.charCodeAt(i + 1);
				c3 = binaryStr.charCodeAt(i + 2);
				decoded += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));

				i += 3;
			}
		}

		return decoded;
	}

	// Encode a cstring
	public encode_cstring(s: string | number): string {
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/escape
		return encodeURIComponent(encodeURIComponent(`${s}`)) + this.fromByte(0);
	}

	// Take a utf8 string and return a binary string
	public encode_utf8(s: string): string {
		let a = "";
		let c;

		for (let n = 0, len = s.length; n < len; n++) {
			c = s.charCodeAt(n);

			if (c < 128) {
				a += String.fromCharCode(c);
			} else if ((c > 127) && (c < 2048)) {
				a += String.fromCharCode((c >> 6) | 192);
				a += String.fromCharCode((c & 63) | 128);
			} else {
				a += String.fromCharCode((c >> 12) | 224);
				a += String.fromCharCode(((c >> 6) & 63) | 128);
				a += String.fromCharCode((c & 63) | 128);
			}
		}

		return a;
	}

	public hprint(s: string): number {
		let num;

		for (let i = 0, len = s.length; i < len; i++) {
			if (s.charCodeAt(i) < 32) {
				num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);

				this.logger.silly(num + " ");
			} else {
				num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);

				this.logger.silly(num + " ");
			}
		}

		this.logger.silly("\n\n");

		return num;
	}

	public ilprint(s: string): number {
		let num;

		for (let i = 0, len = s.length; i < len; i++) {
			if (s.charCodeAt(i) < 32) {
				num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(10) : s.charCodeAt(i).toString(10);

				this.logger.silly(num + " ");
			} else {
				num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(10) : s.charCodeAt(i).toString(10);

				this.logger.silly(num + " ");
			}
		}

		this.logger.silly("\n\n");

		return num;
	}

	public hlprint(s: string): number {
		let num;

		for (let i = 0, len = s.length; i < len; i++) {
			if (s.charCodeAt(i) < 32) {
				num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);

				this.logger.silly(num + " ");
			} else {
				num = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);

				this.logger.silly(num + " ");
			}
		}

		this.logger.silly("\n\n");

		return num;
	}

	// Static access to methods
	public static toSmall(data: number | string): number { return (new BinaryParser()).toSmall(data); }
	public static fromSmall(data: number): string { return (new BinaryParser()).fromSmall(data); }
	public static toByte(data: number | string): number { return (new BinaryParser()).toByte(data); }
	public static fromByte(data: number): string { return (new BinaryParser()).fromByte(data); }
	public static toShort(data: number | string): number { return (new BinaryParser()).toShort(data); }
	public static fromShort(data: number): string { return (new BinaryParser()).fromShort(data); }
	public static toWord(data: number | string): number { return (new BinaryParser()).toWord(data); }
	public static fromWord(data: number): string { return (new BinaryParser()).fromWord(data); }
	public static toInt(data: number | string): number { return (new BinaryParser()).toInt(data); }
	public static fromInt(data: number): string { return (new BinaryParser()).fromInt(data); }
	public static toLong(data: number | string): number { return (new BinaryParser()).toLong(data); }
	public static fromLong(data: number): string { return (new BinaryParser()).fromLong(data); }
	public static toDWord(data: number | string): number { return (new BinaryParser()).toDWord(data); }
	public static fromDWord(data: number): string { return (new BinaryParser()).fromDWord(data); }
	public static toQWord(data: number | string): number { return (new BinaryParser()).toQWord(data); }
	public static fromQWord(data: number): string { return (new BinaryParser()).fromQWord(data); }
	public static toFloat(data: number | string): number { return (new BinaryParser()).toFloat(data); }
	public static fromFloat(data: number): string { return (new BinaryParser()).fromFloat(data); }
	public static toDouble(data: number | string): number { return (new BinaryParser()).toDouble(data); }
	public static fromDouble(data: number): string { return (new BinaryParser()).fromDouble(data); }

	public static encode_int32(num: number, asArray: boolean = false): string[] | string { return (new BinaryParser()).encode_int32(num, asArray); }
	public static encode_int64(num: number): string { return (new BinaryParser()).encode_int64(num); }
	public static decode_utf8(binaryStr: string): string { return (new BinaryParser()).decode_utf8(binaryStr); }
	public static encode_cstring(s: string | number): string { return (new BinaryParser()).encode_cstring(s); }
	public static encode_utf8(s: string): string { return (new BinaryParser()).encode_utf8(s); }
	public static hprint(s: string): number { return (new BinaryParser()).hprint(s); }
	public static ilprint(s: string): number { return (new BinaryParser()).ilprint(s); }
	public static hlprint(s: string): number { return (new BinaryParser()).hlprint(s); }
}
