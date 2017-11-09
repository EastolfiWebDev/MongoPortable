import { JSWLogger } from "jsw-logger";
import * as _ from "lodash";

import { BinaryParser } from "../binary/index";

/***
 * Machine id.
 *
 * Create a random 3-byte value (i.e. unique for this
 * process). Other drivers use a md5 of the machine id here, but
 * that would mean an asyc call to gethostname, so we don"t bother.
 *
 * @ignore
 */
const MACHINE_ID: number = parseInt(`${Math.random() * 0xFFFFFF}`, 10);

// Regular expression that checks for hex value
const checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
const isValidHexRegExp = (str, len = 24) => {
	if (str.length === len && checkForHexRegExp.test(str)) { return true; }

	return false;
};

let pid: number = Math.floor(Math.random() * 100000);

try {
	if (!_.isNil(process)) { pid = process.pid; }
} catch (e) {
	// "process" does not exists -> keep the value from Math.random
}

/***
 * ObjectId
 *
 * @module ObjectId
 * @since 0.0.1
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 *
 * @classdesc Represents the BSON ObjectId type
 *
 * @param {string|number} id - Can be a 24 byte hex string, a 12 byte binary string or a Number.
 */
export class ObjectId {
	public static index: number = 0;

	private static cacheHexString: string;

	public binaryParser: BinaryParser;
	public id: string;

	protected logger: JSWLogger;

	// private bsontype: string = "ObjectId";
	private cachedId: string;

	constructor(id?: string | number) {
		// if (!(this instanceof ObjectId)) return new ObjectId(id, _hex);

		this.logger = JSWLogger.instance;
		this.binaryParser = new BinaryParser();

		if (_.isNil(id)) {
			this.id = this.generate();
		} else {
			if (_.isNumber(id)) {
				this.id = this.generate(id);
			} else {
				// String or Hex
				if (_.isString(id) && ((id as string).length === 12 || (id as string).length === 24)) {
					if (isValidHexRegExp(id)) {
						// Valid Hex
						const _id = ObjectId.createFromHexString(id);
						this.id = _id.id;
					} else if ((id as string).length === 12) {
						// Valid Byte String
						this.id = (id as string);
					} else {
						this.logger.throw("Value passed in is not a valid 24 character hex string");
					}
				} else {
					this.logger.throw("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
				}
			}
		}

		if (ObjectId.cacheHexString) {
			this.cachedId = this.toHexString();
		}
	}

	/***
	 * Return the ObjectId id as a 24 byte hex string representation
	 *
	 * @method ObjectId#toHexString
	 *
	 * @returns {String} The 24 byte hex string representation.
	 */
	public toHexString() {
		if (ObjectId.cacheHexString && this.cachedId) { return this.cachedId; }

		let hexString = "";
		let num;
		let value;

		for (let index = 0, len = this.id.length; index < len; index++) {
			let idChar = this.id[index];

			if (_.isNaN(parseInt(idChar, 10))) {
				idChar = `${idChar.charCodeAt(0)}`;
			}

			value = this.binaryParser.toByte(parseInt(idChar, 10));
			num = value <= 15 ? "0" + value.toString(16) : value.toString(16);

			hexString = hexString + num;
		}

		if (ObjectId.cacheHexString) {
			this.cachedId = hexString;
		}

		return hexString;
	}

	/***
	 * Alias for {@link ObjectId#toHexString}
	 *
	 * @method Cursor#next
	 */
	public toString() {
		return this.toHexString();
	}

	/***
	 * Alias for {@link ObjectId#toHexString}
	 *
	 * @method Cursor#next
	 */
	public toJSON() {
		return this.toHexString();
	}

	/***
	 * Update the ObjectId index used in generating new ObjectId"s on the driver
	 *
	 * @method ObjectId#get_inc
	 * @private
	 *
	 * @returns {Number} Next index value.
	 */
	public getInc() {
		return ObjectId.index = (ObjectId.index + 1) % 0xFFFFFF;
	}

	public returnHash(length: number) {
		const abc = "abcdefghijklmnopqrstuvwxyz1234567890".split("");
		let token = "";

		for (let i = 0; i < length; i++) {
			token += abc[Math.floor(Math.random() * abc.length)];
		}

		return token; // Will return a 32 bit "hash"
	}

	/***
	 * Generate a 12 byte id string used in ObjectId"s
	 *
	 * @method ObjectId#generate
	 * @private
	 *
	 * @param {Number} [time] - Second based timestamp to the generation.
	 *
	 * @return {String} The 12 byte id binary string.
	 */
	public generate(time?: string | number) {
		// If is a number string, parse it
		if (!_.isNil(time) && _.isString(time) && !_.isNaN(parseInt(time as string, 10))) {
			time = _.toNumber(time) as number;
		}

		// If its still a non-number, take a new timestamp
		if (_.isNil(time) || !_.isNumber(time)) {
			// let now = _.toString(Date.now());
			// let first = now.substr(0, now.length / 2);
			// let second = now.substr(now.length / 2, now.length);

			// time = parseInt(first, 10) + parseInt(second, 10);
			// time = parseInt(`${second}${time}`, 10);
			// time = time / 1000;
			// time = Date.now() / 1000;
			return this.binaryParser.generate12string();
		} else {
			/* for time-based ObjectId the bytes following the time will be zeroed */
			const time4Bytes = this.binaryParser.encodeInt(time as number, 32, true, true);
			const machine3Bytes = this.binaryParser.encodeInt(MACHINE_ID, 24, false);
			const pid2Bytes = this.binaryParser.fromShort(pid);
			const index3Bytes = this.binaryParser.encodeInt(this.getInc(), 24, false, true);

			return time4Bytes + machine3Bytes + pid2Bytes + index3Bytes;
		}

		// // If is a number string, parse it
		// if (!_.isNil(time) && _.isString(time) && !_.isNaN(parseInt(<string>time))) {
		// 	 time = <number>_.toNumber(time);
		// }

		// // If its still a non-number, take a new timestamp
		// if (_.isNil(time) || !_.isNumber(time)) {
		// 	 let now = _.toString(Date.now());
		// 	 let first = now.substr(0, now.length / 2);
		// 	 let second = now.substr(now.length / 2, now.length);

		// 	 time = parseInt(first, 10) + parseInt(second, 10);
		// 	 time = parseInt(`${second}${time}`, 10);
		// 	 time = time / 1000;
		// 	 // time = Date.now() / 1000;
		// }

		// /* for time-based ObjectId the bytes following the time will be zeroed */
		// var time4Bytes = this.binaryParser.encodeInt(<number>time, 32, true, true);
		// // let time4Bytes = this.returnHash(4);
		// var machine3Bytes = this.binaryParser.encodeInt(MACHINE_ID, 24, false);
		// var pid2Bytes = this.binaryParser.fromShort(pid);
		// var index3Bytes = this.binaryParser.encodeInt(this.getInc(), 24, false, true);

		// return time4Bytes + machine3Bytes + pid2Bytes + index3Bytes;
	}

	/***
	 * Compares the equality of this ObjectId with [otherID].
	 *
	 * @method ObjectId#equals
	 *
	 * @param {Object} otherID - ObjectId instance to compare against.
	 *
	 * @returns {Boolean} The result of comparing two ObjectId"s
	 */
	public equals(otherID) {
		const id = (otherID instanceof ObjectId || otherID.toHexString) ? otherID.id : ObjectId.createFromHexString(otherID).id;

		return this.id === id;
	}

	/***
	 * Returns the generation time in seconds that this ID was generated.
	 *
	 * @method ObjectId#getTimestamp
	 *
	 * @returns {Number} Number of seconds in the timestamp part of the 12 byte id.
	 */
	public getTimestamp() {
		const timestamp = new Date();

		timestamp.setTime(Math.floor(this.binaryParser.decodeInt(this.id.substring(0, 4), 32, true, true)) * 1000);

		return timestamp;
	}

	/* GETTER - SETTER */
	get generationTime() {
		return Math.floor(this.binaryParser.decodeInt(this.id.substring(0, 4), 32, true, true));
	}

	set generationTime(value: string | number) {
		value = this.binaryParser.encodeInt(value as number, 32, true, true);

		this.id = value + this.id.substr(4);
		// delete this.cachedId;
		this.toHexString();
	}

	/* STATIC METHODS */

	/***
	 * Creates an ObjectId from a hex string representation of an ObjectId.
	 *
	 * @method ObjectId#createFromHexString
	 *
	 * @param {String} hexString - An ObjectId 24 byte hexstring representation.
	 *
	 * @returns {ObjectId} The created ObjectId
	 */
	public static createFromHexString(hexString) {
		// Throw an error if it"s not a valid setup
		if (_.isNil(hexString) || hexString.length !== 24) {
			throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
		}

		const len = hexString.length;

		let result = "";
		let str;
		let num;

		for (let index = 0; index < len; index += 2) {
			str = hexString.substr(index, 2);
			num = parseInt(str, 16);

			result += new BinaryParser().fromByte(num);
		}

		return new ObjectId(result);
	}

	/***
	 * Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out.
	 * Used for comparisons or sorting the ObjectId.
	 *
	 * @method ObjectId#createFromTime
	 *
	 * @param {Number} time - A number of seconds.
	 *
	 * @returns {ObjectId} The created ObjectId
	 */
	public static createFromTime(time) {
		const binaryParser = new BinaryParser();
		const id = binaryParser.encodeInt(time, 32, true, true) + binaryParser.encodeInt(0, 64, true, true);

		return new ObjectId(id);
	}

	/***
	 * Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out. Used for comparisons or sorting the ObjectId.
	 *
	 * @method ObjectId#createPk
	 *
	 * @param {Number} time an integer number representing a number of seconds.
	 * @return {ObjectId} return the created ObjectId
	 */
	public static createPk() {
		return new ObjectId();
	}
}
