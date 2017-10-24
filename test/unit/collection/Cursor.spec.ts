import "mocha";
import { expect } from "chai";

import { TestHelper } from "../../helper/index";
import { MongoPortable } from "../../../src/core/index";
import { Cursor } from "../../../src/collection/index";
import { Selector } from "../../../src/selector/index";

TestHelper.initLogger();

var TEST_DDBB = "test_database";
var TEST_COLL = "test_collection";
var TEST_DOC = {
    stringField: "yes",
    numberField: 9
};

var db = null;

describe("Cursor", function() {
    before(function() {
        db = new MongoPortable(TEST_DDBB, null);
    });
    
    after(function() {
        db.dropDatabase();
        db = null;
    });
    
    describe("#Constructor", function() {
        it("should have the dependencies ready", function() {
            TestHelper.assertDependencies([MongoPortable, Cursor, Selector]);
			
			expect(db).to.exist;
            
            expect(db._databaseName).to.be.equal(TEST_DDBB);
            //expect(MongoPortable._connHelper.hasConnection(TEST_DDBB)).to.be.true;
        });
        
        it("should be able to create a new instance", function() {
            var c = new Cursor([], { field1: { $gte: 3 } });
            
            expect(c).to.exist;
            
            expect(c).to.not.have.property("collection");
            expect(c.selector).to.exist;
            expect(c.fields).to.exist;
            expect(c.skipValue).to.be.equal(0);     // Default Value
            expect(c.limitValue).to.be.equal(15);   // Default Value
            expect(c.sortValue).to.not.exist;       // Default Value
            
            c = new Cursor(
                [], { field1: { $gte: 3 } }, ["field1, field2"], {
                    skip: 3,
                    limit: 6,
                    sort: { field2: -1 }
                }
            );
            
            expect(c.skipValue).to.be.equal(3);
            expect(c.limitValue).to.be.equal(6);
            expect(c.sortValue).to.exist;
            
            c.skip(2);
            c.limit(3);
            
            expect(c.skipValue).to.be.equal(2);
            expect(c.limitValue).to.be.equal(3);
        });
        
        it("should be able to create a new instance from a compiled selector", function() {
            var selector = new Selector({ field1: { $gte: 3 } });
            
            expect(selector).to.exist;
            
            var c = new Cursor([], selector, ["field1, field2"], { sort: { field2: -1 } });
            
            expect(c).to.exist;
            
            expect(c).to.not.have.property("collection");
            expect(c.selector).to.exist;
            expect(c.fields).to.exist;
            expect(c.skipValue).to.be.equal(0);     // Default Value
            expect(c.limitValue).to.be.equal(15);   // Default Value
            expect(c.sortValue).to.exist;
        });
    });
    
    describe("#Managing", function() {
        before(function(done) {
            db.collection(TEST_COLL).then(coll => {
                coll.bulkInsert([
                    TEST_DOC,
                    { stringField: 'second', numberField: 2 },
                    { stringField: 'third', numberField: 3 }
                ]).then(docs => {
                    expect(docs).to.have.length(3);
                    
                    done();
                });
            });
        });
        
        it("should be able to count the documents", function(done) {
            db.collection(TEST_COLL).then(coll => {
                coll.find(
                    { stringField: "yes" },
                    { numberField: 1 },
                    { doNotFecth: true })
                .then(cursor => {
                    expect(cursor).to.exist;
                    
                    var count = cursor.count();
                    
                    expect(count).to.exist;
                    expect(count).to.be.equal(1);
                    
                    done();
                });
            });
        });
        
        it("should be able to get one document", function(done) {
            db.collection(TEST_COLL).then(coll => {
                coll.find(
                    { stringField: "yes" },
                    { numberField: 1 },
                    { doNotFecth: true })
                .then(cursor => {
                    expect(cursor).to.exist;
                    
                    var doc = cursor.fetchOne();
                    
                    expect(doc).to.exist;
                    
                    expect(doc._id).to.exist;
                    expect(doc.stringField).to.not.exist;
                    expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
                    
                    // cursor = coll.find({stringField: "yes"}, {numberField: 1});
                    
                    // expect(cursor.hasNext()).to.be.true;
                    
                    // doc = cursor.next();
                    
                    // expect(cursor).to.exist;
                    // expect(doc).to.exist;
                    
                    // expect(doc._id).to.exist;
                    // expect(doc.stringField).to.not.exist;
                    // expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
                    
                    done();
                });
            });
        });
        
        it("should be able to get all documents", function(done) {
            db.collection(TEST_COLL).then(coll => {
                var cursor = coll.find(
                    { stringField: "yes" },
                    { numberField: 1 },
                    { doNotFecth: true }
                ).then(cursor => {
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
                    
                    done();
                });
            });
        });
        
        it("should be able to iterate every document", function(done) {
            db.collection(TEST_COLL).then(coll => {
                coll.find(
                    { stringField: "yes" },
                    { numberField: 1 },
                    { doNotFecth: true })
                .then(cursor => {
                    expect(cursor).to.exist;
                    
                    cursor.forEach(function(doc) {
                        expect(doc).to.exist;
                    
                        expect(doc._id).to.exist;
                        expect(doc.stringField).to.not.exist;
                        expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
                    });
                    
                    done();
                });
            });
        });
        
        it("should be able to map every document", function(done) {
            db.collection(TEST_COLL).then(coll => {
                coll.find(
                    { stringField: "yes" },
                    { numberField: 1 },
                    { doNotFecth: true })
                .then(cursor => {
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
                    
                    done();
                });
            });
        });
        
        it("should be able to sort the documents", function(done) {
            db.collection(TEST_COLL).then(coll => {
                coll.find(null, null, { doNotFecth: true })
                .then(cursor => {
                    cursor.sort({ numberField: -1 });
                    
                    var docs = cursor.fetch();
                    
                    expect(docs).be.instanceof(Array);
                    expect(docs).be.have.length(3);
                    
                    var doc = docs[2];
                    
                    expect(doc).to.exist;
                
                    expect(doc._id).to.exist;
                    expect(doc.stringField).to.be.equal("second");
                    expect(doc.numberField).to.be.equal(2);
                    
                    done();
                });
            });
        });
        
        it("should be able to skip some documents", function(done) {
            db.collection(TEST_COLL).then(coll => {
                coll.find(null, null, { doNotFecth: true })
                .then(cursor => {
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
                    
                    done();
                });
            });
        });
        
        it("should be able to limit the documents", function(done) {
            db.collection(TEST_COLL).then(coll => {
                coll.find(null, null, { doNotFecth: true })
                .then(cursor => {
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
                    
                    done();
                });
            });
        });
        
        it("should be able to rewind the cursor", function(done) {
            db.collection(TEST_COLL).then(coll => {
                coll.find(null, null, { doNotFecth: true })
                .then(cursor => {
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
                    
                    done();
                });
            });
        });
    });
});