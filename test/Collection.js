var expect = require("chai").expect,
    MongoPortable = require("../lib/MongoPortable"),
    Collection = require("../lib/Collection");

var TEST_DDBB = "test_database";
var TEST_COLL = "test_collection";
var TEST_DOC = {
    stringField: "yes",
    numberField: 9
};

var db = null;

describe("Collection", function() {
    before(function() {
        db = new MongoPortable(TEST_DDBB);
    });
    
    after(function() {
        db.dropDatabase();
        db = null;
    });
    
    describe("#Constructor", function() {
        it("should have the dependencies ready", function() {
            expect(MongoPortable).to.exist;
            expect(Collection).to.exist;
            
            expect(db).to.exist;
            
            expect(db.databaseName).to.be.equal(TEST_DDBB);
            expect(MongoPortable.connections).to.have.ownProperty(TEST_DDBB).to.exist;
        });
        
        it("should be able to instanciate", function() {
            var coll = new Collection(db, TEST_COLL);
            
            expect(coll).to.exist;
            
            expect(coll.db.databaseName).to.be.equal(db.databaseName);
            expect(coll.name).to.be.equal(TEST_COLL);
        });
    });
    
    describe("#CRUD", function() {
        describe(" - Create", function() {
            it("should be able to insert a document", function() {
                var coll = db.collection(TEST_COLL);
                
                var inserted = coll.insert(TEST_DOC);
                
                expect(inserted).to.exist;
                
                expect(inserted.stringField).to.be.equal(TEST_DOC.stringField);
                expect(inserted.numberField).to.be.equal(TEST_DOC.numberField);
                expect(coll.docs).to.have.length(1);
            });
            
            it("should be able to insert several documents chained", function() {
                var coll = db.collection("coll_2");
                
                coll.insert({ field: 'a' }, {chain: true}).insert({ field: 'b' });
                
                expect(coll.docs).to.have.length(2);
            });
        });
        
        describe(" - Read", function() {
            it("should be able to read a document", function() {
                var coll = db.collection(TEST_COLL);
                
                var doc = coll.findOne({stringField: "yes"}, {numberField: 1});
                
                expect(doc).to.exist;
                
                expect(doc._id).to.exist;
                expect(doc.stringField).to.not.exist;
                expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
            });
            
            it("should be able to read several documents", function(done) {
                var coll = db.collection(TEST_COLL);
                
                var cursor = coll.find({stringField: "yes"});
                
                expect(cursor).to.exist;
                
                cursor.forEach(function (doc) {
                    expect(doc).to.exist;
                    
                    expect(doc._id).to.exist;
                    expect(doc.stringField).to.exist;
                    expect(doc.numberField).to.exist;
                });
                
                done();
            });
        });
        describe(" - Update", function() {
            it("should be able to update a document", function() {
                var coll = db.collection(TEST_COLL);
                
                var updatedInfo = coll.update({stringField: "yes"}, {numberField: 1});
                
                expect(updatedInfo).to.exist;
                expect(updatedInfo.updated).to.exist;
                expect(updatedInfo.inserted).to.exist;
                
                expect(updatedInfo.updated.documents).to.be.instanceof(Array);
                expect(updatedInfo.updated.count).to.be.equal(1);
                
                expect(updatedInfo.inserted.documents).to.not.exist;
                expect(updatedInfo.inserted.count).to.be.equal(0);
                
                var updated = updatedInfo.updated.documents[0];
                
                expect(updated.stringField).to.be.equal("yes");
                expect(updated.numberField).to.be.equal(1);
                
                var doc = coll.findOne({stringField: "yes"});
                
                expect(doc).to.exist;
                
                expect(doc.stringField).to.be.equal("yes");
                expect(doc.numberField).to.be.equal(1);
            });
            
            it("should be able to use update operators", function() {
                var coll = db.collection(TEST_COLL);
                
                var updatedInfo = coll.update({stringField: "yes"}, {$inc: { numberField: 2 }});
                
                expect(updatedInfo).to.exist;
                expect(updatedInfo.updated).to.exist;
                expect(updatedInfo.inserted).to.exist;
                
                expect(updatedInfo.updated.documents).to.be.instanceof(Array);
                expect(updatedInfo.updated.count).to.be.equal(1);
                
                expect(updatedInfo.inserted.documents).to.not.exist;
                expect(updatedInfo.inserted.count).to.be.equal(0);
                
                var updated = updatedInfo.updated.documents[0];
                
                expect(updated).to.exist;
                
                expect(updated.stringField).to.be.equal("yes");
                expect(updated.numberField).to.be.equal(3);
                
                var doc = coll.findOne({stringField: "yes"});
                
                expect(doc).to.exist;
                
                expect(doc.stringField).to.be.equal("yes");
                expect(doc.numberField).to.be.equal(3);
            });
        });
        describe(" - Delete", function() {
            it("should be able to insert a document", function() {
                var coll = db.collection(TEST_COLL);
                
                var removed = coll.remove({stringField: "yes"});
                
                expect(removed).to.exist;
                expect(removed).to.be.instanceof(Array);
                
                expect(removed).to.be.have.length(1);
                expect(removed[0].stringField).to.be.equal("yes");
                
                var doc = coll.findOne({stringField: "yes"});
                
                expect(doc).to.not.exist;
            });
        });
    });
});