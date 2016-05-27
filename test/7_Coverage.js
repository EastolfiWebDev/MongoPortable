/* Special test case for reaching 100% coverage, due to babel.js transforming */

var expect = require("chai").expect,
    Logger = require("../lib/utils/Logger"),
    BinaryParser = require("../lib/BinaryParser"),
    BinaryParserBuffer = require("../lib/BinaryParserBuffer"),
    ObjectId = require("../lib/ObjectId"),
    MongoPortable = require("../lib/MongoPortable");

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

describe("Instances", function() {
    describe("Logger", function() {
        it("should fail when instantiating as a function (without 'new')", function() {
            expect(Logger).to.throw(Error);
        });
    });
    
    describe("BinaryParser", function() {
        it("should let instantiate as a class", function() {
            var binaryParser = new BinaryParser(null, null);
            
            expect(binaryParser).to.exist;
        });
        
        it("should encode and decode a float", function() {
            var float = 1022.6583862304688;
            
            var encoded = BinaryParser.fromFloat(float);
            
            expect(encoded).to.exist;
            
            var decoded = BinaryParser.toFloat(encoded);
            
            expect(decoded).to.exist;
            
            expect(decoded).to.be.equal(float);
        });
        
        it("should encode and decode an integer", function() {
            var float = 1022;
            
            var encoded = BinaryParser.fromInt(float);
            
            expect(encoded).to.exist;
            
            var decoded = BinaryParser.toInt(encoded);
            
            expect(decoded).to.exist;
            
            expect(decoded).to.be.equal(float);
        });
        
        it("should encode and decode a long", function() {
            var float = 30;
            
            var encoded = BinaryParser.fromLong(float);
            
            expect(encoded).to.exist;
            
            var decoded = BinaryParser.toLong(encoded);
            
            expect(decoded).to.exist;
            
            expect(decoded).to.be.equal(float);
        });
        
        it("should encode and decode an small", function() {
            var float = 30;
            
            var encoded = BinaryParser.fromSmall(float);
            
            expect(encoded).to.exist;
            
            var decoded = BinaryParser.toSmall(encoded);
            
            expect(decoded).to.exist;
            
            expect(decoded).to.be.equal(float);
        });
        
        it("should encode and decode a byte", function() {
            var float = 3;
            
            var encoded = BinaryParser.fromByte(float);
            
            expect(encoded).to.exist;
            
            var decoded = BinaryParser.toByte(encoded);
            
            expect(decoded).to.exist;
            
            expect(decoded).to.be.equal(float);
        });
        
        it("should encode and decode a word", function() {
            var float = 2365;
            
            var encoded = BinaryParser.fromWord(float);
            
            expect(encoded).to.exist;
            
            var decoded = BinaryParser.toWord(encoded);
            
            expect(decoded).to.exist;
            
            expect(decoded).to.be.equal(float);
        });
        
        it("should encode and decode a DWord", function() {
            var float = 2365;
            
            var encoded = BinaryParser.fromDWord(float);
            
            expect(encoded).to.exist;
            
            var decoded = BinaryParser.toDWord(encoded);
            
            expect(decoded).to.exist;
            
            expect(decoded).to.be.equal(float);
        });
        
        it("should encode and decode a QWord", function() {
            var float = 2365;
            
            var encoded = BinaryParser.fromQWord(float);
            
            expect(encoded).to.exist;
            
            var decoded = BinaryParser.toQWord(encoded);
            
            expect(decoded).to.exist;
            
            expect(decoded).to.be.equal(float);
        });
        
        it("should fail when instantiating as a function (without 'new')", function() {
            expect(BinaryParser).to.throw(Error);
        });
    });
    
    describe("BinaryParserBuffer", function() {
        it("should fail when instantiating as a function (without 'new')", function() {
            expect(BinaryParserBuffer).to.throw(Error);
        });
    });
    
    describe("ObjectId", function() {
        it("should fail when instantiating as a function (without 'new')", function() {
            expect(ObjectId).to.throw(Error);
        });
        
        it("should fail when instantiating with an object", function() {
            var thrown = false;
            
            try {
                new ObjectId({});
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when instantiating with an invalid string or hexstring", function() {
            var thrown = false;
            
            try {
                new ObjectId('p23456789012345678901234');
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when creating from a bad hexstring (ObjectId#cacheHexString)", function() {
            var thrown = false;
            
            try {
                ObjectId.createFromHexString('01234567890');
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
    });
});

describe("Failures", function() {
    describe("BinaryParserBuffer", function() {
        it("should fail when calling BinaryParserBuffer#checkBuffer with buffer lower than expected", function() {
            var buffer = new BinaryParserBuffer(true, "A<ë");

            expect(buffer.checkBuffer.bind(buffer, 32)).to.throw(Error);
        });
        
        it("should fail when calling BinaryParserBuffer#readBits with bounds start < 0 || end <= 0", function() {
            var buffer = new BinaryParserBuffer(true, "A<ë");

            expect(buffer.readBits(0, 0)).to.be.equal(0);
        });
    });
});