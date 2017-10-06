import "mocha";
import { expect } from "chai";

import { TestHelper } from "../../helper/index";
import { BinaryParserBuffer } from "../../../src/binary/index";

TestHelper.initLogger();

describe("BinaryParserBuffer", function() {
	describe("#Constructor", function() {
        it("should have the dependencies ready", function() {
            expect(BinaryParserBuffer).to.exist;
        });
        
        it("should be able to instantiate with or without 'bigEndian' param", function() {
            let bpb = new BinaryParserBuffer(null, "11");
			
			expect(bpb).to.exist;
			
			bpb = new BinaryParserBuffer(true, "11");
			
			expect(bpb).to.exist;
			
			bpb = new BinaryParserBuffer(false, "11");
			
			expect(bpb).to.exist;
        });
		it("should be able to instantiate with 'buffer' string param", function() {
            let bpb = new BinaryParserBuffer(1, "112233");
			
			expect(bpb).to.exist;
        });
		it("should be able to instantiate with 'buffer' number param", function() {
            let bpb = new BinaryParserBuffer(1, 112233);
			
			expect(bpb).to.exist;
        });
    });
	
	describe("#Buffer", function() {
        describe("- setBuffer", function() {
            it("should work", function() {
				let bpb = new BinaryParserBuffer(null, "123");
				let buff = "123456789";
				
				bpb.setBuffer(buff);
				
				expect(bpb.buffer).to.exist;
				expect(bpb.buffer.length).to.be.equal(buff.length);
			});
        });
		
		describe("- hasNeededBits", function() {
            it("should work", function() {
				let bpb = new BinaryParserBuffer(null, "AAA");
				
				expect(bpb.buffer).to.exist;
				
				let needed = bpb.hasNeededBits(16);
				
				expect(needed).to.be.true;
				
				needed = bpb.hasNeededBits(32);
				
				expect(needed).to.be.false;
			});
        });
		
		describe("- checkBuffer", function() {
            it("should work", function() {
				TestHelper.assertThrown(() => {
					let bpb = new BinaryParserBuffer(null, "AAA");
					
					bpb.checkBuffer(16);
				}, false);
				
				TestHelper.assertThrown(() => {
					let bpb = new BinaryParserBuffer(null, "AAA");
					
					bpb.checkBuffer(32);
				}, true);
			});
        });
		
		describe("- readBits", function() {
            it("should work", function() {
				let bpb = new BinaryParserBuffer(null, "12345678");
				
				let read = bpb.readBits(0, 8);
				
				expect(read).to.exist;
			});
        });
    });
});