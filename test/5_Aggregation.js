var expect = require("chai").expect,
    Aggregation = require("../lib/Aggregation"),
    MongoPortable = require("../lib/MongoPortable"),
    Collection = require("../lib/Collection");

var TEST_DDBB = "test_database";
var TEST_COLL = "test_collection";

var db = null;

describe("Aggregation", function() {
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
            expect(Aggregation).to.exist;
            
            expect(db).to.exist;
            
            expect(db.databaseName).to.be.equal(TEST_DDBB);
            expect(MongoPortable.connections).to.have.ownProperty(TEST_DDBB).to.exist;
        });
        
        // it("should be able to instanciate", function() {
        //     var coll = new Collection(db, TEST_COLL);
            
        //     expect(coll).to.exist;
            
        //     expect(coll.name).to.be.equal(TEST_COLL);
        //     expect(coll.fullName).to.be.equal(db.databaseName + '.' + TEST_COLL);
        // });
    });
    
    describe("#Group", function() {
        it("should be able to group several documents ($sum)", function() {
            var coll = db.collection("coll_group_1");
            
            coll.insert({
                _id: 1111,
                name: 'eeee',
                age: 22
            }, {chain: true})
            .insert({
                _id: 1112,
                name: 'dddd',
                age: 23
            }, {chain: true})
            .insert({
                _id: 1113,
                name: 'cccc',
                age: 22
            }, {chain: true})
            .insert({
                _id: 1114,
                name: 'bbbb',
                age: 25
            }, {chain: true})
            .insert({
                _id: 1115,
                name: 'aaaa',
                age: 23
            });
            
            var docs = coll.aggregate([{
                $group: {
                    _id: "$age",
                    count: {
                        $sum: 1
                    },
                    total_id: {
                        $sum: "$_id"
                    },
                    total_age: {
                        $sum: '$age'
                    }
                }
            }]);
            
            expect(docs).to.exist;
            expect(docs).to.be.instanceof(Array);
            expect(docs).to.have.length(3);
        });
        
        it("should be able to group several documents ($avg)", function() {
            var coll = db.collection("coll_group_2");
            
            coll.insert({
                _id: 1111,
                name: 'eeee',
                age: 22
            }, {chain: true})
            .insert({
                _id: 1112,
                name: 'dddd',
                age: 23
            }, {chain: true})
            .insert({
                _id: 1113,
                name: 'cccc',
                age: 22
            }, {chain: true})
            .insert({
                _id: 1114,
                name: 'bbbb',
                age: 25
            }, {chain: true})
            .insert({
                _id: 1115,
                name: 'aaaa',
                age: 23
            });
            
            var docs = coll.aggregate([{
                $group: {
                    _id: null,
                    aver_age: {
                        $avg: '$age'
                    }
                }
            }]);
            
            expect(docs).to.exist;
            expect(docs).to.be.instanceof(Array);
            expect(docs).to.have.length(1);
            expect(docs[0].aver_age).to.be.equal(23);
        });
    });
    
    describe("#Match", function() {
        it("should be able to match documents", function() {
            var coll = db.collection("coll_match_1");
            
            coll.insert({
                _id: 1111,
                name: 'eeee',
                age: 22
            }, {chain: true})
            .insert({
                _id: 1112,
                name: 'dddd',
                age: 23
            }, {chain: true})
            .insert({
                _id: 1113,
                name: 'cccc',
                age: 22
            }, {chain: true})
            .insert({
                _id: 1114,
                name: 'bbbb',
                age: 25
            }, {chain: true})
            .insert({
                _id: 1115,
                name: 'aaaa',
                age: 23
            });
            
            var docs = coll.aggregate([{
                $match: {
                    age: {
                        $gte: 23
                    }
                }
            }]);
            
            expect(docs).to.exist;
            expect(docs).to.be.instanceof(Array);
            expect(docs).to.have.length(3);
        });
    });
    
    describe("#Sort", function() {
        it("should be able to sort documents", function() {
            var coll = db.collection("coll_sort_1");
            
            coll.insert({
                _id: 1111,
                name: 'eeee',
                age: 22
            }, {chain: true})
            .insert({
                _id: 1112,
                name: 'dddd',
                age: 23
            }, {chain: true})
            .insert({
                _id: 1113,
                name: 'cccc',
                age: 22
            }, {chain: true})
            .insert({
                _id: 1114,
                name: 'bbbb',
                age: 25
            }, {chain: true})
            .insert({
                _id: 1115,
                name: 'aaaa',
                age: 23
            });
            
            var docs = coll.aggregate([{
                $sort: {
                    age: -1
                }
            }]);
            
            expect(docs).to.exist;
            expect(docs).to.be.instanceof(Array);
            expect(docs).to.have.length(5);
        });
    });
    
    describe("#Mixed", function() {
        it("should be able to aggregate several stages", function() {
            var coll = db.collection("coll_mixed_1");
            
            coll.insert({
                _id: 1111,
                name: 'eeee',
                age: 22
            }, {chain: true})
            .insert({
                _id: 1112,
                name: 'dddd',
                age: 23
            }, {chain: true})
            .insert({
                _id: 1113,
                name: 'cccc',
                age: 22
            }, {chain: true})
            .insert({
                _id: 1114,
                name: 'bbbb',
                age: 25
            }, {chain: true})
            .insert({
                _id: 1115,
                name: 'aaaa',
                age: 23
            }, {chain: true})
            .insert({
                _id: 1115,
                name: 'abab',
                age: 22
            });
            
            var docs = coll.aggregate([{
                $match: {
                    age: {
                        $lt: 25
                    }
                }
            }, {
                $group: {
                    _id: "$age",
                    total: {
                        $sum: 1
                    }
                }
            }, {
                $sort: {
                    total: -1
                }
            }, {
                $project: {
                    suma_total: '$total',
                    total: -1
                }
            }]);
            
            expect(docs).to.exist;
            expect(docs).to.be.instanceof(Array);
            expect(docs).to.have.length(2);
            
            expect(docs[0]).to.be.eql({ _id: 22, suma_total: 3 });
            expect(docs[1]).to.be.eql({ _id: 23, suma_total: 2 });
        });
    });
});