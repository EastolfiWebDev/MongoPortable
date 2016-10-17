var expect = require("chai").expect,
    _ = require("lodash");

var Logger = require("jsw-logger");

// Avoid logs when testing
Logger.getInstance({ hideAllLogs: true });

var EventEmitter = require("../lib/utils/EventEmitter")(Logger, _);
var BinaryParserBuffer = require("../lib/BinaryParserBuffer")(Logger);
var BinaryParser = require("../lib/BinaryParser")(BinaryParserBuffer, Logger);
var ObjectId = require("../lib/ObjectId")(BinaryParser, Logger, _);
var SelectorMatcher = require("../lib/SelectorMatcher")(Logger, _);
var Selector = require("../lib/Selector")(ObjectId, SelectorMatcher, Logger, _);
var Cursor = require("../lib/Cursor")(Selector, Logger, _);
var Aggregation = require("../lib/Aggregation")(Selector, Cursor, Logger, _);
var Collection = require("../lib/Collection")(Aggregation, Cursor, Selector, SelectorMatcher, ObjectId, EventEmitter, Logger, _);
var MongoPortable = require("../lib/MongoPortable")(Collection, ObjectId, EventEmitter, Logger, _);

var TEST_DDBB = "test_database";
var TEST_COLL = "test_collection";
var TEST_DOC = {
    stringField: "yes",
    numberField: 9
};

var db = null;

describe("Cursor", function() {
    before(function() {
        db = new MongoPortable(TEST_DDBB);
    });
    
    after(function() {
        db.dropDatabase();
        db = null;
    });
    
    describe("#Constructor", function() {
        it("should have the dependencies ready", function() {
            expect(Cursor).to.exist;
        });
        
        it("should be able to create a new instance", function() {
            var selector = new Selector({ field1: { $gte: 3 } });
            
            expect(selector).to.exist;
            
            var c = new Cursor([], selector, ["field1, field2"], { sort: { field2: -1 } });
            
            expect(c).to.exist;
            
            expect(c.collection).to.not.exist;
            expect(c.selector).to.exist;
            expect(c.fields).to.exist;
            expect(c.skipValue).to.be.equal(0);     // Default Value
            expect(c.limitValue).to.be.equal(15);   // Default Value
            expect(c.sortValue).to.exist;
            
            c.skip(2);
            c.limit(3);
            
            expect(c.skipValue).to.be.equal(2);
            expect(c.limitValue).to.be.equal(3);
        });
        
        it("should be able to create a new instance from a compiled selector", function() {
            var c = new Cursor([], { field1: { $gte: 3 } }, ["field1, field2"], { sort: { field2: -1 } });
            
            expect(c).to.exist;
            
            expect(c.collection).to.not.exist;
            expect(c.selector).to.exist;
            expect(c.fields).to.exist;
            expect(c.skipValue).to.be.equal(0);     // Default Value
            expect(c.limitValue).to.be.equal(15);   // Default Value
            expect(c.sortValue).to.exist;
            
            c.skip(2);
            c.limit(3);
            
            expect(c.skipValue).to.be.equal(2);
            expect(c.limitValue).to.be.equal(3);
        });
    });
    
    describe("#Managing", function() {
        before(function() {
            var coll = db.collection(TEST_COLL);
                
            var inserted = coll.insert(TEST_DOC);
            coll.insert({ stringField: 'second', numberField: 2 }, {chain: true})
                .insert({ stringField: 'third', numberField: 3 });
            
            expect(inserted).to.exist;
            
            expect(inserted.stringField).to.be.equal(TEST_DOC.stringField);
            expect(inserted.numberField).to.be.equal(TEST_DOC.numberField);
            expect(coll.docs).to.have.length(3);
            
        });
        
        it("should be able to count the documents", function() {
            var coll = db.collection(TEST_COLL);
            
            var cursor = coll.find({stringField: "yes"}, {numberField: 1});
            
            expect(cursor).to.exist;
            
            var count = cursor.count();
            
            expect(count).to.exist;
            expect(count).to.be.equal(1);
        });
        
        it("should be able to get one document", function() {
            var coll = db.collection(TEST_COLL);
            
            var cursor = coll.find({stringField: "yes"}, {numberField: 1});
            
            expect(cursor).to.exist;
            
            var doc = cursor.fetchOne();
            
            expect(doc).to.exist;
            
            expect(doc._id).to.exist;
            expect(doc.stringField).to.not.exist;
            expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
            
            cursor = coll.find({stringField: "yes"}, {numberField: 1});
            
            expect(cursor.hasNext()).to.be.true;
            
            doc = cursor.next();
            
            expect(cursor).to.exist;
            expect(doc).to.exist;
            
            expect(doc._id).to.exist;
            expect(doc.stringField).to.not.exist;
            expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
        });
        
        it("should be able to get all documents", function() {
            var coll = db.collection(TEST_COLL);
            
            var cursor = coll.find({stringField: "yes"}, {numberField: 1});
            
            expect(cursor).to.exist;
            
            var docs = cursor.fetchAll();
            
            expect(docs).to.exist;
            expect(docs).to.be.instanceof(Array);
            
            expect(docs).to.have.length(1);
            
            var doc = docs[0];
            
            expect(doc).to.exist;
            
            expect(doc._id).to.exist;
            expect(doc.stringField).to.not.exist;
            expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
        });
        
        it("should be able to iterate every document", function(done) {
            var coll = db.collection(TEST_COLL);
            
            var cursor = coll.find({stringField: "yes"}, {numberField: 1});
            
            expect(cursor).to.exist;
            
            cursor.forEach(function(doc) {
                expect(doc).to.exist;
            
                expect(doc._id).to.exist;
                expect(doc.stringField).to.not.exist;
                expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
            });
            
            done();
        });
        
        it("should be able to map every document", function() {
            var coll = db.collection(TEST_COLL);
            
            var cursor = coll.find({stringField: "yes"}, {numberField: 1});
            
            expect(cursor).to.exist;
            
            var docs = cursor.map(function(doc) {
                doc.numberField++;
                
                return doc;
            });
            
            var doc = docs[0];
            
            expect(doc).to.exist;
        
            expect(doc._id).to.exist;
            expect(doc.stringField).to.not.exist;
            expect(doc.numberField).to.be.equal(TEST_DOC.numberField + 1);
        });
        
        it("should be able to sort the documents", function() {
            var coll = db.collection(TEST_COLL);
            
            var cursor = coll.find();
            cursor.sort({ numberField: -1 });
            
            var docs = cursor.fetch();
            
            expect(docs).be.instanceof(Array);
            expect(docs).be.have.length(3);
            
            var doc = docs[2];
            
            expect(doc).to.exist;
        
            expect(doc._id).to.exist;
            expect(doc.stringField).to.be.equal("second");
            expect(doc.numberField).to.be.equal(2);
        });
        
        it("should be able to skip some documents", function() {
            var coll = db.collection(TEST_COLL);
            
            var cursor = coll.find();
            cursor.sort({ numberField: -1 });
            cursor.skip(2);
            
            var docs = cursor.fetchAll();
            
            expect(docs).be.instanceof(Array);
            expect(docs).be.have.length(1);
            
            var doc = docs[0];
            
            expect(doc).to.exist;
        
            expect(doc._id).to.exist;
            expect(doc.stringField).to.be.equal("second");
            expect(doc.numberField).to.be.equal(2);
        });
        
        it("should be able to limit the documents", function() {
            var coll = db.collection(TEST_COLL);
            
            var cursor = coll.find();
            cursor.sort({ numberField: -1 });
            cursor.limit(2);
            
            var docs = cursor.fetchAll();
            
            expect(docs).be.instanceof(Array);
            expect(docs).be.have.length(2);
            
            var doc = docs[1];
            
            expect(doc).to.exist;
        
            expect(doc._id).to.exist;
            expect(doc.stringField).to.be.equal("third");
            expect(doc.numberField).to.be.equal(3);
        });
        
        it("should be able to rewind the cursor", function() {
            var coll = db.collection(TEST_COLL);
            
            var cursor = coll.find();
            cursor.sort({ numberField: -1 });
            
            var doc = cursor.next();
            
            expect(doc).to.exist;
        
            expect(doc._id).to.exist;
            expect(doc.stringField).to.be.equal("yes");
            expect(doc.numberField).to.be.equal(9);
            
            cursor.rewind();
            
            doc = cursor.next();
            
            expect(doc).to.exist;
        
            expect(doc._id).to.exist;
            expect(doc.stringField).to.be.equal("yes");
            expect(doc.numberField).to.be.equal(9);
        });
    });
});