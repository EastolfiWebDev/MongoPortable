var expect = require("chai").expect,
    ObjectId = require("../lib/ObjectId"),
    MongoPortable = require("../lib/MongoPortable"),
    Collection = require("../lib/Collection");

var TEST_DOC = null;
var buildDoc = function(obj) {
    if (TEST_DOC === null) {
        TEST_DOC = {
            _id: new ObjectId(123456789),
            stringField: "yes",
            numberField: 9
        };
    }
    
    return TEST_DOC;
};


var TEST_DDBB = "test_database";
var TEST_COLL = "test_collection";
// var TEST_DOC = {
//     _id: __id,
//     stringField: "yes",
//     numberField: 9
// };

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
            
            expect(coll.name).to.be.equal(TEST_COLL);
            expect(coll.fullName).to.be.equal(db.databaseName + '.' + TEST_COLL);
        });
    });
    
    describe("#CRUD", function() {
        describe(" - Create", function() {
            it("should be able to insert a document", function(done) {
                var coll = db.collection(TEST_COLL);
                
                // Build the doc for first time -> avoid calling on Logger.instance
                buildDoc();
                
                coll.insert(TEST_DOC, function(error, inserted) {
                    expect(error).to.not.exist;
                    expect(inserted).to.exist;
                    
                    expect(inserted.stringField).to.be.equal(TEST_DOC.stringField);
                    expect(inserted.numberField).to.be.equal(TEST_DOC.numberField);
                    expect(coll.docs).to.have.length(1);
                    
                    done();
                });
            });
            
            it("should be able to insert several documents chained", function() {
                var coll = db.collection("coll_2");
                
                coll.insert({ field: 'a' }, {chain: true}).insert({ _id: 12345, field: 'b' });
                
                expect(coll.docs).to.have.length(2);
            });
            
            it("should be able to save a document", function(done) {
                var coll = db.collection(TEST_COLL);
                
                // new document
                var inserted = coll.save({
                    stringField: "save",
                    numberField: 3
                });
                
                expect(inserted).to.exist;
                
                expect(inserted._id).to.exist;
                expect(inserted.stringField).to.be.equal("save");
                expect(inserted.numberField).to.be.equal(3);
                
                // update / upsert
                
                coll.save({ _id: 12345, stringField: "save" }, function(error, updatedInfo) {
                    expect(updatedInfo).to.exist;
                    expect(updatedInfo.updated).to.exist;
                    expect(updatedInfo.inserted).to.exist;
                    
                    expect(updatedInfo.updated.documents).to.not.exist;
                    expect(updatedInfo.updated.count).to.be.equal(0);
                    
                    expect(updatedInfo.inserted.documents).to.be.instanceof(Array);
                    expect(updatedInfo.inserted.count).to.be.equal(1);
                    
                    var inserted = updatedInfo.inserted.documents[0];
                    
                    expect(inserted._id).to.be.equal("12345");
                    expect(inserted.stringField).to.be.equal("save");
                    
                    done();
                });
            });
        });
        
        describe(" - Read", function() {
            it("should be able to read the first document", function(done) {
                var coll = db.collection(TEST_COLL);
                
                coll.findOne(function(error, doc) {
                    expect(doc).to.exist;
                    
                    expect(doc._id).to.exist;
                    expect(doc.stringField).to.exist;
                    expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
                    
                    done();
                });
            });
                
            it("should be able to read a document", function(done) {
                var coll = db.collection(TEST_COLL);
                
                var doc = coll.findOne({stringField: "yes"}, {_id: -1, numberField: 1}, { fields: { numberField: 1 }});
                
                expect(doc).to.exist;
                
                expect(doc._id).to.not.exist;
                expect(doc.stringField).to.not.exist;
                expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
                
                doc = coll.findOne({_id: 123456789}, null, { fields: { numberField: 1 }});
                
                expect(doc).to.not.exist;
                
                doc = coll.findOne(TEST_DOC._id);
                
                expect(doc).to.exist;
                
                expect(doc._id).to.exist;
                expect(doc.stringField).to.be.equal(TEST_DOC.stringField);
                expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
                
                doc = coll.findOne({_id: new ObjectId()});
                
                expect(doc).to.not.exist;
                
                coll.findOne({_id: TEST_DOC._id}, function(error, doc) {
                    expect(doc).to.exist;
                    
                    expect(doc._id).to.exist;
                    expect(doc.stringField).to.exist;
                    expect(doc.numberField).to.be.equal(TEST_DOC.numberField);
                    
                    done();
                });
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
                
                var docs = coll.find({_id: new ObjectId()}, null, { forceFetch: true });
                
                expect(docs).to.exist;
                expect(docs).to.have.length(0);
                
                // Callback
                
                var calls = 3;
                
                coll.find(function(error, docs) {
                    expect(error).to.not.exist;
                    expect(docs).to.exist;
                    
                    expect(docs).to.have.length(3);
                    
                    var doc = docs[0];
                    
                    expect(doc).to.exist;
                    
                    expect(doc._id).to.exist;
                    expect(doc.stringField).to.exist;
                    expect(doc.numberField).to.exist;
                    
                    if (calls === 1) {
                        done();
                    } else {
                        calls--;
                    }
                });
                
                coll.find({ stringField: "yes" }, function(error, docs) {
                    expect(error).to.not.exist;
                    expect(docs).to.exist;
                    
                    expect(docs).to.have.length(1);
                    
                    var doc = docs[0];
                    
                    expect(doc).to.exist;
                    
                    expect(doc._id).to.exist;
                    expect(doc.stringField).to.exist;
                    expect(doc.numberField).to.exist;
                    
                    if (calls === 1) {
                        done();
                    } else {
                        calls--;
                    }
                });
                
                coll.find({ stringField: "yes" }, { stringField: -1 }, function(error, docs) {
                    expect(error).to.not.exist;
                    expect(docs).to.exist;
                    
                    expect(docs).to.have.length(1);
                    
                    var doc = docs[0];
                    
                    expect(doc).to.exist;
                    
                    expect(doc._id).to.exist;
                    expect(doc.stringField).to.not.exist;
                    expect(doc.numberField).to.exist;
                    
                    if (calls === 1) {
                        done();
                    } else {
                        calls--;
                    }
                });
            });
        });
        
        describe(" - Update", function() {
            it("should be able to update a document", function() {
                var coll = db.collection(TEST_COLL);
                
                // By _id
                var updatedInfo = coll.update(
                    TEST_DOC._id,
                    {
                        numberField: 5,
                        unexistingField: 1,
                        _id: "non updated"
                    }
                );
                
                expect(updatedInfo).to.exist;
                expect(updatedInfo.updated).to.exist;
                expect(updatedInfo.inserted).to.exist;
                
                expect(updatedInfo.updated.documents).to.be.instanceof(Array);
                expect(updatedInfo.updated.count).to.be.equal(1);
                
                expect(updatedInfo.inserted.documents).to.not.exist;
                expect(updatedInfo.inserted.count).to.be.equal(0);
                
                var updated = updatedInfo.updated.documents[0];
                
                expect(updated.unexistingField).to.not.exist;
                expect(updated._id).to.be.eql(TEST_DOC._id);
                expect(updated.stringField).to.be.equal("yes");
                expect(updated.numberField).to.be.equal(5);
                
                var doc = coll.findOne({stringField: "yes"});
                
                expect(doc).to.exist;
                
                expect(doc.stringField).to.be.equal("yes");
                expect(doc.numberField).to.be.equal(5);
                
                // By field
                updatedInfo = coll.update({stringField: "yes"}, {numberField: 1});
                
                expect(updatedInfo).to.exist;
                expect(updatedInfo.updated).to.exist;
                expect(updatedInfo.inserted).to.exist;
                
                expect(updatedInfo.updated.documents).to.be.instanceof(Array);
                expect(updatedInfo.updated.count).to.be.equal(1);
                
                expect(updatedInfo.inserted.documents).to.not.exist;
                expect(updatedInfo.inserted.count).to.be.equal(0);
                
                updated = updatedInfo.updated.documents[0];
                
                expect(updated.stringField).to.be.equal("yes");
                expect(updated.numberField).to.be.equal(1);
                
                doc = coll.findOne({stringField: "yes"});
                
                expect(doc).to.exist;
                
                expect(doc.stringField).to.be.equal("yes");
                expect(doc.numberField).to.be.equal(1);
                
                // No matches
                updatedInfo = coll.update({stringField: "nope"}, {numberField: 1});
                
                expect(updatedInfo).to.exist;
                expect(updatedInfo.updated).to.exist;
                expect(updatedInfo.inserted).to.exist;
                
                expect(updatedInfo.updated.documents).to.not.exist;
                expect(updatedInfo.updated.count).to.be.equal(0);
                
                expect(updatedInfo.inserted.documents).to.not.exist;
                expect(updatedInfo.inserted.count).to.be.equal(0);
            });
            
            it("should be able to use update operators", function(done) {
                var coll = db.collection(TEST_COLL);
                
                coll.update({stringField: "yes"}, {$inc: { numberField: 2 }}, function(error, updatedInfo) {
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
                    
                    done();
                });
            });
            
            it("should be able to use upsert a document", function() {
                var coll = db.collection(TEST_COLL);
                
                var updatedInfo = coll.update(
                    {
                        stringField: "noope"
                    }, {
                        stringField: "yees",
                        numberField: 2
                    }, {
                        upsert: true
                    }
                );
                
                expect(updatedInfo).to.exist;
                expect(updatedInfo.updated).to.exist;
                expect(updatedInfo.inserted).to.exist;
                
                expect(updatedInfo.updated.documents).to.not.exist;
                expect(updatedInfo.updated.count).to.be.equal(0);
                
                expect(updatedInfo.inserted.documents).to.be.instanceof(Array);
                expect(updatedInfo.inserted.count).to.be.equal(1);
                
                var created = updatedInfo.inserted.documents[0];
                
                expect(created).to.exist;
                
                expect(created.stringField).to.be.equal("yees");
                expect(created.numberField).to.be.equal(2);
                
                var doc = coll.findOne({stringField: "yees"});
                
                expect(doc).to.exist;
                
                expect(doc.stringField).to.be.equal("yees");
                expect(doc.numberField).to.be.equal(2);
            });
            
            it("should be able to update several documents", function() {
                var coll = db.collection(TEST_COLL);
                
                // add _id
                var updatedInfo = coll.update(
                    {
                        stringField: /^ye+s$/ig
                    }, {
                        numberField: 9
                    }, {
                        multi: true
                    }
                );
                
                expect(updatedInfo).to.exist;
                expect(updatedInfo.updated).to.exist;
                expect(updatedInfo.inserted).to.exist;
                
                expect(updatedInfo.updated.documents).to.be.instanceof(Array);
                expect(updatedInfo.updated.count).to.be.equal(2);
                
                expect(updatedInfo.inserted.documents).to.not.exist;
                expect(updatedInfo.inserted.count).to.be.equal(0);
                
                var updated1 = updatedInfo.updated.documents[0];
                var updated2 = updatedInfo.updated.documents[1];
                
                expect(updated1.stringField).to.be.equal("yes");
                expect(updated1.numberField).to.be.equal(9);
                
                expect(updated2.stringField).to.be.equal("yees");
                expect(updated2.numberField).to.be.equal(9);
                
                var cursor = coll.find({numberField: 9});
                
                expect(cursor.count()).to.be.equal(2);
            });
            
            it("should be able to override a document", function() {
                var coll = db.collection(TEST_COLL);
                
                // add _id
                var updatedInfo = coll.update(
                    {
                        stringField: "yees"
                    }, {
                        numberField: 10,
                        booleanField: true,
                        $inc: {
                            numberField: 1
                        }
                    }, {
                        override: true
                    }
                );
                
                expect(updatedInfo).to.exist;
                expect(updatedInfo.updated).to.exist;
                expect(updatedInfo.inserted).to.exist;
                
                expect(updatedInfo.updated.documents).to.be.instanceof(Array);
                expect(updatedInfo.updated.count).to.be.equal(1);
                
                expect(updatedInfo.inserted.documents).to.not.exist;
                expect(updatedInfo.inserted.count).to.be.equal(0);
                
                var updated = updatedInfo.updated.documents[0];
                
                expect(updated.stringField).to.not.exist;
                expect(updated.numberField).to.be.equal(10);
                expect(updated.booleanField).to.be.true;
                
                var cursor = coll.find({numberField: 10});
                
                expect(cursor.count()).to.be.equal(1);
            });
            
            it.skip("should be able to update as MongoDB does", function() {
                var coll = db.collection(TEST_COLL);
                
                var updatedInfo = coll.update(
                    {
                        stringField: "yes"
                    }, {
                        $inc: {
                            numberField: 2
                        }
                    }, {
                        updateAsMongo: true
                    }
                );
                
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
            it("should be able to remove a document", function(done) {
                var coll = db.collection(TEST_COLL);
                
                var removed = coll.remove({stringField: "yes"});
                
                expect(removed).to.exist;
                expect(removed).to.be.instanceof(Array);
                
                expect(removed).to.be.have.length(1);
                expect(removed[0].stringField).to.be.equal("yes");
                
                var doc = coll.findOne({stringField: "yes"});
                
                expect(doc).to.not.exist;
                
                // Remove by _id
                coll.remove(TEST_DOC._id, function(error, removed) {
                    expect(error).to.not.exist;
                    expect(removed).to.exist;
                    
                    expect(removed).to.be.instanceof(Array);
                    
                    expect(removed).to.be.have.length(0);
                    
                    done();
                });
            });
            
            it("should be able to remove all documents", function(done) {
                var coll = db.collection(TEST_COLL);
                
                coll.remove(function (error, removed) {
                    expect(error).to.not.exist;
                    expect(removed).to.exist;
                    
                    expect(removed).to.be.true;
                    
                    var doc = coll.findOne({stringField: "yes"});
                    
                    expect(doc).to.not.exist;
                    
                    done();
                });
            });
            
            it("should be able to drop the collection", function(done) {
                var coll = db.collection(TEST_COLL);
                
                coll.drop(function (error, removed) {
                    expect(error).to.not.exist;
                    expect(removed).to.exist;
                    
                    expect(removed).to.be.true;
                    
                    var doc = coll.findOne({stringField: "yes"});
                    
                    expect(doc).to.not.exist;
                    
                    done();
                });
            });
        });
    });
    
    describe("#Backups", function() {
        var ID = null;
        
        before(function() {
            if (db) db.dropDatabase();
            
            db = new MongoPortable("BACKUPS");
            
            db.collection("pruebas")
                .insert({ stringField: "first" }, { chain: true })
                .insert({ stringField: "second" }, { chain: true })
                .insert({ stringField: "third" }, { chain: true })
                .insert({ stringField: "fourth" });
        });
        
        describe("#Backups", function() {
            it("should create a new backup", function(done) {
                var coll = db.collection("pruebas");
                
                var snapshot = coll.backup("FIRST");
                
                expect(snapshot).to.exist;
                
                expect(snapshot.backupID).to.exist;
                expect(snapshot.documents).to.exist;
                
                expect(snapshot.backupID).to.be.equal("FIRST");
                expect(snapshot.documents).to.be.instanceof(Array);
                expect(snapshot.documents).to.have.length(4);
                
                coll.insert({ stringField: "new" });
                
                coll.backup(function(error, snapshot) {
                    expect(snapshot.backupID).to.exist;
                    expect(snapshot.documents).to.exist;
                    
                    expect(snapshot.documents).to.be.instanceof(Array);
                    expect(snapshot.documents).to.have.length(5);
                    
                    ID = snapshot.backupID;
                    
                    done();
                });
            });
            
            it("should retrieve all backups", function() {
                var coll = db.collection("pruebas");
                
                var snapshots = coll.backups();
                
                expect(snapshots).to.exist;
                
                expect(snapshots).to.be.instanceof(Array);
                expect(snapshots).to.have.length(2);
                
                expect(snapshots[0].id).to.be.equal("FIRST");
                expect(snapshots[0].documents).to.be.instanceof(Array);
                expect(snapshots[0].documents).to.have.length(4);
                
                expect(snapshots[1].documents).to.be.instanceof(Array);
                expect(snapshots[1].documents).to.have.length(5);
            });
            
            it("should restore a backup", function() {
                var coll = db.collection("pruebas");
                
                expect(coll.find().count()).to.be.equal(5);
                
                // By backupID
                var cursor = coll.restore("FIRST").find();
                
                expect(cursor.count()).to.be.equal(4);
            });
            
            it("should remove a backup", function() {
                var coll = db.collection("pruebas");
                
                var removed = coll.removeBackup(ID);
                
                expect(removed).to.exist;
                expect(removed).to.be.equal(ID);
                
                var snapshots = coll.backups();
                
                expect(snapshots).to.exist;
                
                expect(snapshots).to.be.instanceof(Array);
                expect(snapshots).to.have.length(1);
            });
            
            it("should restore the only backup", function() {
                var coll = db.collection("pruebas");
                
                expect(coll.find().count()).to.be.equal(4);
                
                // By backupID
                var cursor = coll.restore(function(error) {
                    expect(error).to.not.exist;
                }).find();
                
                expect(cursor.count()).to.be.equal(4);
            });
            
            it("should drop all the backups", function(done) {
                var coll = db.collection("pruebas");
                
                coll.removeBackup(function(error, removed) {
                    expect(error).to.not.exist;
                    expect(removed).to.be.true;
                    
                    done();
                });
            });
        });
    });
});