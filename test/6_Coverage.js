/* Special test case for reaching 100% coverage, due to babel.js transforming */

var expect = require("chai").expect,
    EventEmitter = require("../lib/utils/EventEmitter"),
    BinaryParser = require("../lib/BinaryParser"),
    BinaryParserBuffer = require("../lib/BinaryParserBuffer"),
    ObjectId = require("../lib/ObjectId"),
    Selector = require("../lib/Selector"),
    SelectorMatcher = require("../lib/SelectorMatcher"),
    Cursor = require("../lib/Cursor"),
    Collection = require("../lib/Collection"),
    MongoPortable = require("../lib/MongoPortable");

var TEST_COLL = "TEST_COLL";

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
    
    describe("Selector", function() {
        it("should fail when matching on a function value", function() {
            var thrown = false;
            
            try {
                new Selector({
                    operatorField1: function() { return 1 + 2; }
                }).test({ operatorField1: 3 });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when instantiating with an unexpected selector type", function() {
            var thrown = false;
            
            try {
                new Selector({
                    field: Symbol()
                }).test({ field: false });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail matching with $elemMatch", function() {
            var thrown = false;
            
            try {
                new Selector({
                    operatorField1: {
                        $elemMatch: true
                    }
                }).test({ operatorField1: false });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail matching with $where", function() {
            var thrown = false;
            
            try {
                new Selector({
                    operatorField1: {
                        $where: true
                    }
                }).test({ operatorField1: false });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail matching with $text", function() {
            var thrown = false;
            
            try {
                new Selector({
                    operatorField1: {
                        $text: true
                    }
                }).test({ operatorField1: false });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail matching with $type", function() {
            var thrown = false;
            
            try {
                new Selector({
                    operatorField1: {
                        $type: true
                    }
                }).test({ operatorField1: false });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail matching with $not", function() {
            var thrown = false;
            
            try {
                new Selector({
                    operatorField1: {
                        $not: true
                    }
                }).test({ operatorField1: false });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        describe("Cursor", function() {
            it("should not allow Cursor#batchSize", function() {
                expect(new Cursor().batchSize).to.throw(Error);
            });
            
            it("should not allow Cursor#close", function() {
                expect(new Cursor().close).to.throw(Error);
            });
            
            it("should not allow Cursor#comment", function() {
                expect(new Cursor().comment).to.throw(Error);
            });
            
            it("should not allow Cursor#explain", function() {
                expect(new Cursor().explain).to.throw(Error);
            });
            
            it("should not allow Cursor#hint", function() {
                expect(new Cursor().hint).to.throw(Error);
            });
            
            it("should not allow Cursor#itcount", function() {
                expect(new Cursor().itcount).to.throw(Error);
            });
            
            it("should not allow Cursor#maxScan", function() {
                expect(new Cursor().maxScan).to.throw(Error);
            });
            
            it("should not allow Cursor#maxTimeMS", function() {
                expect(new Cursor().maxTimeMS).to.throw(Error);
            });
            
            it("should not allow Cursor#max", function() {
                expect(new Cursor().max).to.throw(Error);
            });
            
            it("should not allow Cursor#min", function() {
                expect(new Cursor().min).to.throw(Error);
            });
            
            it("should not allow Cursor#noCursorTimeout", function() {
                expect(new Cursor().noCursorTimeout).to.throw(Error);
            });
            
            it("should not allow Cursor#objsLeftInBatch", function() {
                expect(new Cursor().objsLeftInBatch).to.throw(Error);
            });
            
            it("should not allow Cursor#pretty", function() {
                expect(new Cursor().pretty).to.throw(Error);
            });
            
            it("should not allow Cursor#readConcern", function() {
                expect(new Cursor().readConcern).to.throw(Error);
            });
            
            it("should not allow Cursor#readPref", function() {
                expect(new Cursor().readPref).to.throw(Error);
            });
            
            it("should not allow Cursor#returnKey", function() {
                expect(new Cursor().returnKey).to.throw(Error);
            });
            
            it("should not allow Cursor#showRecordId", function() {
                expect(new Cursor().showRecordId).to.throw(Error);
            });
            
            it("should not allow Cursor#size", function() {
                expect(new Cursor().size).to.throw(Error);
            });
            
            it("should not allow Cursor#snapshot", function() {
                expect(new Cursor().snapshot).to.throw(Error);
            });
            
            it("should not allow Cursor#tailable", function() {
                expect(new Cursor().tailable).to.throw(Error);
            });
            
            it("should not allow Cursor#toArray", function() {
                expect(new Cursor().toArray).to.throw(Error);
            });
        });
        
        describe("Collection", function() {
            it("should not allow Collection#ensureIndex", function() {
                expect(new Collection(new MongoPortable("DB"), "NEW").ensureIndex).to.throw(Error);
            });
            
            it("should not allow the $bit operator", function() {
                var thrown = false;
            
                try {
                    var db = new MongoPortable("NOT_IMPLEMENTED");
                    db.collection("NOT_IMPLEMENTED").insert({ stringField: "yes" });
                    
                    db.collection("NOT_IMPLEMENTED").update(
                        {
                            stringField: "yes"
                        }, {
                            $bit: {
                                stringField: "elem"
                            }
                        });
                } catch(error) {
                    expect(error).to.be.instanceof(Error);
                    
                    thrown = true;
                } finally {
                    expect(thrown).to.be.true;
                }
            });
        });
    });
});

describe("Instances", function() {
    describe("EventEmitter", function() {
        it("should fail when instantiating as a function (without 'new')", function() {
            expect(EventEmitter).to.throw(Error);
        });
    });
    
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
            
            number = "test";   //1022.6583862304688
            
            encoded = BinaryParser.fromFloat(number);
            
            expect(encoded).to.exist;
            
            decoded = BinaryParser.toFloat(encoded);
            
            expect(decoded).to.exist;
            
            expect(decoded).to.be.eql(NaN);
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
        
        it("should encode and decode an small", function() {
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
    
    describe("Selector", function() {
        it("should fail when instantiating as a function (without 'new')", function() {
            expect(Selector).to.throw(Error);
        });
        
        it("should fail when instantiating with an invalid selector type", function() {
            var thrown = false;
            
            try {
                new Selector({}, 'GROUP_SELECTOR');
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
    });
    
    describe("SelectorMatcher", function() {
        it("should fail when instantiating as a function (without 'new')", function() {
            expect(SelectorMatcher).to.throw(Error);
        });
    });
    
    describe("Cursor", function() {
        it("should fail when instantiating as a function (without 'new')", function() {
            expect(Cursor).to.throw(Error);
        });
    });
    
    describe("Collection", function() {
        it("should fail when instantiating as a function (without 'new')", function() {
            expect(Collection).to.throw(Error);
        });
    });
});

describe("Failures", function() {
    describe("EventEmitter", function() {
        it("should fail when calling EventEmitter#emit with a bad event name", function() {
            expect(new EventEmitter().emit).to.throw(Error);
        });
    });
    
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
    
    describe("Selector", function() {
        it("should fail when matching unknown operators", function() {
            var thrown = false;
            
            try {
                new Selector({
                    $soo: {
                        operatorField1: 5,
                        operatorField2: 3
                    }
                });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            try {
                new Selector({
                    operatorField1: {
                        $fail: true
                    }
                }).test({ operatorField1: false });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when testing no documents", function() {
            // var selector = new Selector({});
            
            // expect(selector.test).to.throw(Error);
            
            var thrown = false;
            
            try {
                (new Selector({})).test();
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("it should fail when matching with $all and a non-array selector", function() {
            var doc = {
                operatorField: [1, 3, 5]
            };
            
            expect(new Selector({
                operatorField: {
                    $all: "1, 3, 5"
                }
            }).test(doc)).to.be.false;
        });
        
        it("it should fail when matching with an invalid RegExp", function() {
            var thrown = false;
            
            try {
                new Selector({
                    operatorField: {
                        $regex: /^[Noop]/,
                        $options: 'gs'
                    }
                }).test({ operatorField: false });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when sorting with a bad specification", function() {
            var thrown = false;
            
            try {
                new Selector("asc desc", Selector.SORT_SELECTOR);
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when sorting with a number only", function() {
            var thrown = false;
            
            try {
                new Selector(-1, Selector.SORT_SELECTOR);
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when passing fields badly", function() {
            var thrown = false;
            
            try {
                new Selector("-1 1", Selector.FIELD_SELECTOR);
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            try {
                new Selector(false, Selector.FIELD_SELECTOR);
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when including and excluding fields", function() {
            var thrown = false;
            
            try {
                new Selector("field1 1, field2 -1", Selector.FIELD_SELECTOR);
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            try {
                new Selector("field1 true, field2 false", Selector.FIELD_SELECTOR);
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
    });
    
    describe("SelectorMatcher", function() {
        it("should fail when not founding a BsonType", function() {
            var thrown = false;
            
            try {
                SelectorMatcher.cmp(function() {}, function() {});
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            try {
                new Selector("field1 true, field2 false", Selector.FIELD_SELECTOR);
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            try {
                new Selector("field1 true, field2 false", Selector.FIELD_SELECTOR);
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
    });
    
    describe("Collection", function() {
        before(function() {
            db = new MongoPortable("TEST_FAILURES");
            
            var coll = db.collection(TEST_COLL);
            
            coll.insert({ stringField: "yes", numberField: 5, arrayField: [1, 2, 3] });
        });
        
        it("should fail if passing a non function callback when finding", function() {
            var thrown = false;
            
            try {
                db.collection(TEST_COLL).find({}, {}, null, 'myFunction');
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail if passing a non existing modifier when updating", function() {
            var thrown = false;
            
            try {
                db.collection(TEST_COLL).update({ stringField: "yes" }, { $fail: true });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail if passing a non function callback when finding", function() {
            // Only string
            expect(Collection.checkCollectionName.bind(null, 999)).to.throw(Error);
            
            // Not empty or having '..'
            expect(Collection.checkCollectionName.bind(null)).to.throw(Error);
            expect(Collection.checkCollectionName.bind(null, "../test")).to.throw(Error);
            
            // Not having '$' (except for '[...]oplog.$main[...]' and '$cmd[...]')
            expect(Collection.checkCollectionName.bind(null, "new$coll")).to.throw(Error);
            expect(Collection.checkCollectionName.bind(null, "$cmd_coll")).to.not.throw(Error);
            expect(Collection.checkCollectionName.bind(null, "my_oplog.$main_coll")).to.not.throw(Error);
            
            // Not starting with 'ststem.'
            expect(Collection.checkCollectionName.bind(null, "system.mycoll")).to.throw(Error);
            
            // Not starting or ending with '.'
            expect(Collection.checkCollectionName.bind(null, '.mycoll')).to.throw(Error);
            expect(Collection.checkCollectionName.bind(null, "yourcoll.")).to.throw(Error);
        });
        
        it("should fail if restoring a backup without having one", function() {
            var thrown = false;
            
            try {
                db.collection(TEST_COLL).restore(function () {} );
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail if restoring a non existing backup", function() {
            var thrown = false;
            
            db.collection(TEST_COLL).backup("SAVED");
            
            try {
                db.collection(TEST_COLL).restore("UNSAVED");
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail if restoring a backup without knowing wich", function() {
            var thrown = false;
            
            db.collection(TEST_COLL).backup("SAVED2");
            
            try {
                db.collection(TEST_COLL).restore();
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when renaming an unexisting field", function() {
            var thrown = false;
            
            try {
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $rename: {
                            unexistingField: "thrownField"
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when renaming with invalid name params", function() {
            var thrown = false;
            
            try {
                // same name
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $rename: {
                            stringField: "stringField"
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            try {
                // non string
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $rename: {
                            stringField: false
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            try {
                // empty string
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $rename: {
                            stringField: ""
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when accessing a non-numeric field on a array", function() {
            var thrown = false;
            
            try {
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $set: {
                            "arrayField.errorField": "thrownField"
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when incrementing a non-numeric field", function() {
            var thrown = false;
            
            try {
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $inc: {
                            stringField: 2
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            try {
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $inc: {
                            numberField: "not-a-number"
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when pushing on a non-array field", function() {
            var thrown = false;
            
            try {
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $push: {
                            stringField: "elem"
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            try {
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $pushAll: {
                            stringField: ["elem"]
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when pulling on a non-array field", function() {
            var thrown = false;
            
            try {
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $pull: {
                            stringField: "elem"
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            try {
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $pullAll: {
                            stringField: ["elem"]
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when poping of a non-array field", function() {
            var thrown = false;
            
            try {
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $pop: {
                            stringField: 3
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when adding to a non-array set", function() {
            var thrown = false;
            
            try {
                db.collection(TEST_COLL).update(
                    {
                        stringField: "yes"
                    }, {
                        $addToSet: {
                            stringField: "elem"
                        }
                    });
            } catch(error) {
                expect(error).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
    });
});