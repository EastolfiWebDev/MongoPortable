/* Special test case for reaching 100% coverage, due to babel.js transforming */

var expect = require("chai").expect,
    MongoPortable = require("../lib/MongoPortable"),
    Logger = require("../lib/utils/Logger"),
    BinaryParserBuffer = require("../lib/BinaryParserBuffer");

var db = null;

describe("To be implement", function() {
    describe("MongoPortable", function() {
        before(function() {
            db = new MongoPortable("TEST_IMPLEMENTED");
        });
        
        after(function() {
            db.dropDatabase();
            db = null;
        });
        
        it("should not allow MongoPortable#collectionsInfo", function() {
            expect(db.collectionsInfo).to.throw(Error);
        });
        
        it("should not allow MongoPortable#fetchCollections ", function() {
            expect(db.fetchCollections ).to.throw(Error);
        });
        
        it("should not allow MongoPortable#createIndex", function() {
            expect(db.createIndex).to.throw(Error);
        });
        
        it("should not allow MongoPortable#ensureIndex", function() {
            expect(db.ensureIndex).to.throw(Error);
        });
        
        it("should not allow MongoPortable#dropIndex", function() {
            expect(db.dropIndex).to.throw(Error);
        });
        
        it("should not allow MongoPortable#reIndex", function() {
            expect(db.reIndex).to.throw(Error);
        });
        
        it("should not allow MongoPortable#indexInformation", function() {
            expect(db.indexInformation).to.throw(Error);
        });
    });
});

describe("Failures", function() {
    describe("BinaryParserBuffer", function() {
        it("should fail when instanciating as a function (without 'new')", function() {
            expect(BinaryParserBuffer).to.throw(Error);
        });
        
        it("should fail when calling BinaryParserBuffer#checkBuffer with buffer lower than expected", function() {
            var buffer = new BinaryParserBuffer(true, "A<ë");

            expect(buffer.checkBuffer.bind(buffer, 32)).to.throw(Error);
        });
        
        it("should fail when calling BinaryParserBuffer#readBits with bounds start < 0 || end <= 0", function() {
            var buffer = new BinaryParserBuffer(true, "A<ë");

            expect(buffer.readBits(0, 0)).to.be.equal(0);
        });
    });
    
    describe("Logger", function() {
        it("should fail when instanciating as a function (without 'new')", function() {
            expect(Logger).to.throw(Error);
        });
    });
});