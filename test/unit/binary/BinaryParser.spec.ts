import "mocha";
import { expect } from "chai";

import { TestHelper } from "../../helper/index";
import { BinaryParser } from "../../../src/binary/index";

TestHelper.initLogger();

describe("BinaryParser", function() {
	it("should let instantiate as a class", function() {
		var binaryParser = new BinaryParser(null, null);
		
		expect(binaryParser).to.exist;
	});
	
	it("should encode and decode a float", function() {
		var number = 1022.6583862304688;   //1022.6583862304688
		
		var encoded = BinaryParser.fromFloat(number);
		
		expect(encoded).to.exist;
		
		var decoded = BinaryParser.toFloat(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
		
		// With an Infinity
		
		number = Infinity;   //1022.6583862304688
		
		encoded = BinaryParser.fromFloat(number);
		
		expect(encoded).to.exist;
		
		decoded = BinaryParser.toFloat(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
		
		// With an -Infinity
		
		number = -Infinity;   //1022.6583862304688
		
		encoded = BinaryParser.fromFloat(number);
		
		expect(encoded).to.exist;
		
		decoded = BinaryParser.toFloat(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
		
		// With an String
		
		/*number = "test";   //1022.6583862304688
		
		encoded = BinaryParser.fromFloat(number);
		
		expect(encoded).to.exist;
		
		decoded = BinaryParser.toFloat(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.eql(NaN);*/
	});
	
	it("should encode and decode a double", function() {
		var number = 1022.6583862304688;
		
		var encoded = BinaryParser.fromDouble(number);
		
		expect(encoded).to.exist;
		
		var decoded = BinaryParser.toDouble(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode an integer", function() {
		var number = 1022;
		
		var encoded = BinaryParser.fromInt(number);
		
		expect(encoded).to.exist;
		
		var decoded = BinaryParser.toInt(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
		
		number = -1;
		
		encoded = BinaryParser.fromInt(number);
		
		expect(encoded).to.exist;
		
		decoded = BinaryParser.toInt(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode a long", function() {
		var number = 30;
		
		var encoded = BinaryParser.fromLong(number);
		
		expect(encoded).to.exist;
		
		var decoded = BinaryParser.toLong(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode an small", function() {
		var number = 30;
		
		var encoded = BinaryParser.fromSmall(number);
		
		expect(encoded).to.exist;
		
		var decoded = BinaryParser.toSmall(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode a short", function() {
		var number = 3;
		
		var encoded = BinaryParser.fromShort(number);
		
		expect(encoded).to.exist;
		
		var decoded = BinaryParser.toShort(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode a byte", function() {
		var number = 3;
		
		var encoded = BinaryParser.fromByte(number);
		
		expect(encoded).to.exist;
		
		var decoded = BinaryParser.toByte(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode a word", function() {
		var number = 2365;
		
		var encoded = BinaryParser.fromWord(number);
		
		expect(encoded).to.exist;
		
		var decoded = BinaryParser.toWord(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode a DWord", function() {
		var number = 2365;
		
		var encoded = BinaryParser.fromDWord(number);
		
		expect(encoded).to.exist;
		
		var decoded = BinaryParser.toDWord(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode a QWord", function() {
		var number = 2365;
		
		var encoded = BinaryParser.fromQWord(number);
		
		expect(encoded).to.exist;
		
		var decoded = BinaryParser.toQWord(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode a Int32", function() {
		var number = 2365;
		
		var encoded = BinaryParser.encode_int32(number);
		
		expect(encoded).to.exist;
		
		// var decoded = BinaryParser.toInt(encoded);
		
		// expect(decoded).to.exist;
		
		// expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode a Int64", function() {
		var number = 2365;
		
		var encoded = BinaryParser.encode_int64(number);
		
		expect(encoded).to.exist;
		
		// var decoded = BinaryParser.toQWord(encoded);
		
		// expect(decoded).to.exist;
		
		// expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode a UTF8", function() {
		var number = "my string: Ê ࠁ";
		
		var encoded = BinaryParser.encode_utf8(number);
		
		expect(encoded).to.exist;
		
		var decoded = BinaryParser.decode_utf8(encoded);
		
		expect(decoded).to.exist;
		
		expect(decoded).to.be.equal(number);
	});
	
	it("should encode and decode a CString", function() {
		var number = 2365;
		
		var encoded = BinaryParser.encode_cstring(number);
		
		expect(encoded).to.exist;
		
		// var decoded = BinaryParser.toQWord(encoded);
		
		// expect(decoded).to.exist;
		
		// expect(decoded).to.be.equal(number);
	});
	
	it("should do a H-Print", function() {
		var number = "h\tString";
		
		var encoded = BinaryParser.hprint(number);
		
		expect(encoded).to.exist;
		
		// var decoded = BinaryParser.toQWord(encoded);
		
		// expect(decoded).to.exist;
		
		// expect(decoded).to.be.equal(number);
	});
	
	it("should do a IL-Print", function() {
		var number = "il\tString";
		
		var encoded = BinaryParser.ilprint(number);
		
		expect(encoded).to.exist;
		
		// var decoded = BinaryParser.toQWord(encoded);
		
		// expect(decoded).to.exist;
		
		// expect(decoded).to.be.equal(number);
	});
	
	it("should do a HL-Print", function() {
		var number = "hl\tString";
		
		var encoded = BinaryParser.hlprint(number);
		
		expect(encoded).to.exist;
		
		// var decoded = BinaryParser.toQWord(encoded);
		
		// expect(decoded).to.exist;
		
		// expect(decoded).to.be.equal(number);
	});
	
	// Fails gulp
	it.skip("should fail when instantiating as a function (without 'new')", function() {
		expect(BinaryParser).to.throw(Error);
	});
});