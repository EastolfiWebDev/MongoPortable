var expect = require("chai").expect,
    MongoPortable = require("../lib/MongoPortable");

var TEST_DDBB = "test_database";
var TEST_COLL = "test_collection";

var db = null;

describe("MongoPortable", function() {
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
            
            expect(db).to.exist;
            
            expect(db.databaseName).to.be.equal(TEST_DDBB);
            expect(MongoPortable.connections).to.have.ownProperty(TEST_DDBB).to.exist;
        });
    });
    
    describe("#Collections", function() {
        describe("- Creation", function() {
            it("should be able to create a collection", function(done) {
                // Returning value way
                var coll = db.collection(TEST_COLL);
                
                expect(coll).to.exist;
                
                expect(coll.name).to.be.equal(TEST_COLL);
                
                // Callback way
                db.collection(TEST_COLL, function(coll2) {
                    expect(coll2).to.exist;
                    
                    expect(coll2.name).to.be.equal(TEST_COLL);
                    
                    done();
                });
            });
        });
        
        describe("- Obtaining", function() {
            it("should be able to obtain all the collections", function(done) {
                // Returning value
                db.collection(TEST_COLL);
                
                var collections = db.collections();
                
                expect(collections).to.exist;
                expect(collections[0].name).to.be.equal(TEST_COLL);
                
                // Collections Names Only
                collections = db.collectionNames();
                
                expect(collections).to.exist;
                expect(collections[0]).to.be.equal(TEST_COLL);
                
                // Callback
                db.collections(function(cols) {
                    expect(cols).to.exist;
                    expect(cols[0].name).to.be.equal(TEST_COLL);
                    
                    done();
                });
            });
            
            it("should be able to obtain a collection", function(done) {
                // Returning value
                var coll = db.collection(TEST_COLL);
                
                expect(coll).to.exist;
                expect(coll.name).to.be.equal(TEST_COLL);
                
                coll = db.collections({collectionName: TEST_COLL});
                
                expect(coll).to.exist;
                expect(coll[0].name).to.be.equal(TEST_COLL);
                
                // Collection Names Only
                coll = db.collectionNames({collectionName: TEST_COLL});
                
                expect(coll).to.exist;
                expect(coll[0]).to.be.equal(TEST_COLL);
                
                // Callback
                db.collection(TEST_COLL, function(coll2) {
                    expect(coll2).to.exist;
                    
                    expect(coll2.name).to.be.equal(TEST_COLL);
                    
                    done();
                });
            });
            
            it.skip("should be able to obtain a collection's info", function(done) {
                // Returning value way
                var coll = db.collection(TEST_COLL);
                
                expect(coll).to.exist;
                
                expect(coll.name).to.be.equal(TEST_COLL);
                
                // Callback way
                // db.collection("coll_2", function(coll2) {
                //     expect(coll2).to.exist;
                    
                //     expect(coll2.name).to.be.equal("coll_2");
                    
                //     done();
                // });
            });
        });
        
        describe("- Drop", function() {
            it("should be able to drop a collection", function(done) {
                // Returning value way
                var coll = db.collection(TEST_COLL);
                
                expect(coll).to.exist;
                
                var dropped = db.dropCollection(TEST_COLL);
                
                expect(dropped).to.be.true;
                
                expect(db.collectionNames()).to.have.eql([]);
                
                // Callback way
                db.dropCollection(TEST_COLL, function(error) {
                    expect(error).to.exist;
                    
                    done();
                });
            });
        });
        
        describe("- Rename", function() {
            it("should be able to rename a collection", function(done) {
                // Returning value way
                var coll = db.collection(TEST_COLL);
                
                expect(coll).to.exist;
                
                var renamed = db.renameCollection(TEST_COLL, "coll_2");
                
                expect(renamed).to.exist;
                expect(renamed.name).to.be.equal("coll_2");
                
                expect(db._collections["coll_2"]).to.exist;
                
                // // Callback way
                db.renameCollection("coll_2", TEST_COLL, function(error, renamed) {
                    expect(error).to.not.exist;
                    
                    expect(renamed).to.exist;
                    expect(renamed.name).to.be.equal(TEST_COLL);
                    
                    expect(db._collections[TEST_COLL]).to.exist;
                    
                    done();
                });
            });
        });
    });
    
    describe.skip("#Indexes", function() {
        describe("- Creating", function() {
            it("should be able to create an index", function() {
                
            });
            
            it("should be able to create an index (ensuring)", function() {
                
            });
        });
        
        describe("- Drop", function() {
            it("should be able to drop an index", function() {
                
            });
            
            it("should be able to drop all the indexes", function() {
                
            });
        });
        
        describe("- Reindex", function() {
            it("should be able to reindex one index", function() {
                
            });
            
            it("should be able to reindex all the indexes", function() {
                
            });
        });
        
        describe("- Obtaining", function() {
            it("should be able to obtain an index", function() {
                
            });
            
            it("should be able to obtain an index information", function() {
                
            });
            
            it("should be able to obtain all indexes", function() {
                
            });
        });
    });
    
    describe("#Database", function() {
        describe.skip("- Connection", function() {
            it("should be able to open a new connection", function() {
                
            });
            
            it("should be able to create reconnect", function() {
                
            });
            
            it("should be able to close a connection", function() {
                
            });
        });
        
        describe("- Stores", function() {
            it("should be able to add a custom store", function(done) {
                var end = false;
                
                // Middleware
                db.use('store', {
                    createCollection: function(params) {
                        expect(params.connection).to.exist;
                        expect(params.collection).to.exist;
                        
                        expect(params.connection).to.be.eql(db);
                        expect(params.collection.name).to.be.equal(TEST_COLL);
                        
                        if (!end) {
                            end = true;
                        } else {
                            done();
                        }
                    }
                });
                
                // Direct function
                db.addStore(function() {
                    this.createCollection = function(params) {
                        expect(params.connection).to.exist;
                        expect(params.collection).to.exist;
                        
                        expect(params.connection).to.be.eql(db);
                        expect(params.collection.name).to.be.equal(TEST_COLL);
                        
                        if (!end) {
                            end = true;
                        } else {
                            done();
                        }
                    };
                });
                
                db.collection(TEST_COLL);
            });
        });
        
        describe("- Drop", function() {
            it("should be able to drop the database", function(done) {
                var dropped = db.dropDatabase();
                
                expect(dropped).to.be.true;
                expect(db._collections).to.be.eql([]);
                expect(MongoPortable.connections).to.be.eql({});
                
                db.dropDatabase(function(error, success) {
                    expect(error).to.exist;
                    expect(success).to.be.false;
                    
                    done();
                });
            });
        });
    });
});