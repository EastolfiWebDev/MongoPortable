/* tslint:disable:no-bitwise */

import { JSWLogger } from "jsw-logger";
import * as _ from "lodash";

/***
 * BinaryParserBuffer
 *
 * @module BinaryParserBuffer
 * @since 0.0.1
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 *
 * @classdesc BinaryParserBuffer - based on ({@link http://jsfromhell.com/classes/binary-parser Binary Parser}) by Jonas Raoni Soares Silva
 */
export class BinaryParserBuffer {
	public bigEndian: number;
	public buffer: any[] = [];

	protected logger: JSWLogger;

	constructor(bigEndian, buffer: string | number) {
		this.logger = JSWLogger.instance;

		this.bigEndian = bigEndian || 0;

		if (_.isString(buffer)) {
			this.setBuffer(buffer as string);
		} else {
			this.setBuffer(`${buffer}`);
		}
	}

	public setBuffer(data: string) {
		let l;
		let i;
		let b;

		if (data) {
			i = l = data.length;
			b = this.buffer = new Array(l);

			// tslint:disable-next-line:semicolon
			for (; i; b[l - i] = data.charCodeAt(--i)) { ; }

			if (this.bigEndian && b.reverse()) {
				return;
			}
		}
	}

	public hasNeededBits(neededBits) {
		return this.buffer.length >= -(-neededBits >> 3);
	}

	public checkBuffer(neededBits) {
		if (!this.hasNeededBits(neededBits)) {
			this.logger.throw("checkBuffer::missing bytes");
		}
	}

	public readBits(start: number, length: number) {
		// shl fix: Henri Torgemane ~1996 (compressed by Jonas Raoni)

		function shl(a, b) {
			// tslint:disable-next-line:semicolon no-conditional-assignment
			for (; b--; a = ((a %= 0x7fffffff + 1) & 0x40000000) === 0x40000000 ? a * 2 : (a - 0x40000000) * 2 + 0x7fffffff + 1) { ; }

			return a;
		}

		if (start < 0 || length <= 0) {
			return 0;
		}

		this.checkBuffer(start + length);

		let offsetLeft;
		const offsetRight = start % 8;
		const curByte = this.buffer.length - (start >> 3) - 1;
		let lastByte = this.buffer.length + (-(start + length) >> 3);
		let diff = curByte - lastByte;
		// tslint:disable-next-line:no-conditional-assignment
		let sum = ((this.buffer[curByte] >> offsetRight) & ((1 << (diff ? 8 - offsetRight : length)) - 1)) + (diff && (offsetLeft = (start + length) % 8) ? (this.buffer[lastByte++] & ((1 << offsetLeft) - 1)) << (diff-- << 3) - offsetRight : 0);

		// tslint:disable-next-line:semicolon
		for (; diff; sum += shl(this.buffer[lastByte++], (diff-- << 3) - offsetRight)) { ; }

		return sum;
	}
}
