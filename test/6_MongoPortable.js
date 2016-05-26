var expect = require("chai").expect,
    MongoPortable = require("../lib/MongoPortable");

var TEST_DDBB = "test_database";
var TEST_COLL = "test_collection";

var db = null;

describe("MongoPortable", function() {
    describe("#Constructor", function() {
        after(function() {
            db.dropDatabase();
            db = null;
        });
        
        it("should have the dependencies ready", function() {
            expect(MongoPortable).to.exist;
            
            db = new MongoPortable(TEST_DDBB);
            
            expect(db).to.exist;
            
            expect(db.databaseName).to.be.equal(TEST_DDBB);
            expect(MongoPortable.connections).to.have.ownProperty(TEST_DDBB).to.exist;
        });
        
        it("should have the method Object#renameProperty ready", function() {
            var myObject = {
                prop: 'test'
            };
            
            expect(myObject).to.have.property('prop', 'test');
            
            expect(myObject).to.have.property('renameProperty');
            
            myObject.renameProperty('prop');
            
            expect(myObject).to.have.property('prop', 'test');
            
            myObject.renameProperty('prop', 'prop');
            
            expect(myObject).to.have.property('prop', 'test');
            
            myObject.renameProperty('prop', 'new_prop');
            
            expect(myObject).to.not.have.property('prop');
            expect(myObject).to.have.property('new_prop', 'test');
        });
    });
    
    describe("#Collections", function() {
        before(function() {
            db = new MongoPortable(TEST_DDBB);
        });
        
        after(function() {
            db.dropDatabase();
            db = null;
        });
        
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
            
            it("should be able to obtain a collection directly", function() {
                var coll = db[TEST_COLL];
                
                expect(coll).to.exist;
                
                expect(coll.name).to.be.equal(TEST_COLL);
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
                
                expect(db.collectionNames()).to.be.eql([]);
                
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
        before(function() {
            db = new MongoPortable(TEST_DDBB);
        });
        
        after(function() {
            db.dropDatabase();
            db = null;
        });
        
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
        before(function() {
            db = new MongoPortable(TEST_DDBB);
        });
        
        after(function() {
            db.dropDatabase();
            db = null;
        });
        
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
                var totalCalls = 3;
                
                // Middleware
                db.use('store', {
                    createCollection: function(params) {
                        expect(params.connection).to.exist;
                        expect(params.collection).to.exist;
                        
                        expect(params.connection).to.be.eql(db);
                        expect(params.collection.name).to.be.equal(TEST_COLL);
                        
                        if (totalCalls === 1) {
                            done();
                        } else {
                            totalCalls--;
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
                        
                        if (totalCalls === 1) {
                            done();
                        } else {
                            totalCalls--;
                        }
                    };
                });
                
                // As an object
                db.addStore({
                    createCollection: function(params) {
                        expect(params.connection).to.exist;
                        expect(params.collection).to.exist;
                        
                        expect(params.connection).to.be.eql(db);
                        expect(params.collection.name).to.be.equal(TEST_COLL);
                        
                        if (totalCalls === 1) {
                            done();
                        } else {
                            totalCalls--;
                        }
                    }
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
    
    describe("Function Parameters", function() {
        before(function() {
            db = new MongoPortable("TEST_PARAMS");
        });
        
        after(function() {
            db.dropDatabase();
            db = null;
        });
        
        it.skip("should control MongoPortable#collectionNames parameters", function(done) {
            db.collectionNames(function() {
                
            });
        });
        
        it("should control MongoPortable#collectionNames parameters", function(done) {
            db.collection("testing");
            
            db.collectionNames(function(names) {
                expect(names).to.exist;
                
                expect(names).to.be.instanceof(Array);
                expect(names).to.have.length(1);
                expect(names[0]).to.be.equal("testing");
                
                done();
            });
        });
    });
    
    describe("Failures", function() {
        it("should fail when instanciating as a function (without 'new')", function() {
            expect(MongoPortable).to.throw(Error);
        });
        
        it("should handle not having connections", function() {
            MongoPortable.connections = null;
            
            new MongoPortable("TEST");
            
            expect(MongoPortable.connections).to.exist;
        });
        
        it("should fail when instanciating a ddbb more than one", function() {
            var thrown = false;
            
            try {
                new MongoPortable("TEST");
            } catch (err) {
                expect(err).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when adding stores other than function or objects", function() {
            var thrown = false;
            
            try {
                var _db = new MongoPortable("TEST_STORE");
                
                _db.addStore('name_of_store');
            } catch (err) {
                expect(err).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
        
        it("should fail when renaming an unexisting collection or with wrong parameters", function() {
            var _db = new MongoPortable("TEST_RENAME");
            
            _db.collection("TEST_RENAME");
            
            expect(_db.renameCollection("NON_EXISTING", "NEW_NAME")).to.be.false;
            
            expect(_db.renameCollection("NON_EXISTING")).to.be.false;
        });
        
        it("it sould fail when creating a ddbb with invalids characters in the name", function() {
            var thrown = false;
            
            // Name with space
            try {
                new MongoPortable("TEST NAME");
            } catch (err) {
                expect(err).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            
            // Name with dot
            try {
                new MongoPortable("TEST.NAME");
            } catch (err) {
                expect(err).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            
            // Name with dollar
            try {
                new MongoPortable("TEST$NAME");
            } catch (err) {
                expect(err).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            
            // Name with slash
            try {
                new MongoPortable("TEST/NAME");
            } catch (err) {
                expect(err).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
            
            thrown = false;
            
            // Name with backslash
            try {
                new MongoPortable("TEST\\NAME");
            } catch (err) {
                expect(err).to.be.instanceof(Error);
                
                thrown = true;
            } finally {
                expect(thrown).to.be.true;
            }
        });
    });
});