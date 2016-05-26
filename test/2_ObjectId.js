var expect = require("chai").expect,
    ObjectId = require("../lib/ObjectId");

describe("ObjectId", function() {
    describe("#Constructor", function() {
        it("should have the dependencies ready", function() {
            expect(ObjectId).to.exist;
        });
        
        it("should be able to create a new ObjectId()", function() {
            var id = new ObjectId();
            
            expect(id).to.exist;
            
            expect(id.toString()).to.be.equal(id.toJSON());
            
            expect(id.getTimestamp().getTime() / 1000).to.be.equal(id.generationTime);
        });
        
        it.skip("should be able to create a new ObjectId(Number)", function() {
            var now = Date.now();
            
            var id = new ObjectId(now);
            
            expect(id).to.exist;
            
            expect(id.toString()).to.be.equal(id.toJSON());
            
            expect(id.generationTime).to.be.equal(now / 1000);
            
            expect(id.getTimestamp().getTime()).to.be.equal(now);
            
            expect(id.getTimestamp().getTime() / 1000).to.be.equal(id.generationTime);
        });
        
        it.skip("should be able to create a new ObjectId(Hex String)", function() {
            var hex = '5044555b65bedb5e56000002';
            
            var id = new ObjectId(hex);
            
            expect(id).to.exist;
            
            expect(id.toString()).to.be.equal(id.toJSON());
            
            expect(id.equals(hex)).to.be.truly;
            
            expect(id.getTimestamp().getTime() / 1000).to.be.equal(id.generationTime);
        });
    });
    
    describe("Failures", function() {
        it("should handle BinaryParserBuffer#checkBuffer failing", function() {
            // expect(manager.test.bind(manager)).to.throw('Oh no')
        });
    });
});