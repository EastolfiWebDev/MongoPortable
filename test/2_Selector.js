var expect = require("chai").expect,
    _ = require("lodash");

var Logger = require("jsw-logger");

var BinaryParserBuffer = require("../lib/BinaryParserBuffer")(Logger);
var BinaryParser = require("../lib/BinaryParser")(BinaryParserBuffer, Logger);
var ObjectId = require("../lib/ObjectId")(BinaryParser, Logger, _);
var SelectorMatcher = require("../lib/SelectorMatcher")(Logger, _);
var Selector = require("../lib/Selector")(ObjectId, SelectorMatcher, Logger, _);

describe("Selector", function() {
    describe("#Constructor", function() {
        it("should have the dependencies ready", function() {
            expect(Selector).to.exist;
        });
        
        it("should be able to compile a selection", function() {
            var selector = {
                test: "yes"
            };
            
            var doc = {
                test1: 'false',
                test: 'yes'
            };
            
            var _selector = new Selector(selector);
            
            expect(_selector.test(doc)).to.be.true;
        });
    });
    
    describe("#Compiling", function() {
        it("should compile an empty selector", function() {
            var doc = {
                test1: 'false',
                test: 'yes'
            };
            
            var selector = new Selector();
            
            expect(selector.test(doc)).to.be.true;
        });
        
        it("should compile a falsy selector", function() {  // Ignore this?
            var doc = {
                test1: 'false',
                test: 'yes'
            };
            
            var selector = new Selector(0);
            
            expect(selector.test(doc)).to.not.be.true;
            
            selector = new Selector({ _id: '' });
            
            expect(selector.test(doc)).to.not.be.true;
        });
        
        it("should compile a number or string selector", function() {
            var doc = {
                _id: '123',
                test1: 'false',
                test: 'yes'
            };
            
            var selector = new Selector('123');
            
            expect(selector.test(doc)).to.be.true;
            
            selector = new Selector(123);
            
            expect(selector.test(doc)).to.be.true;
        });
        
        it("should compile a function selector", function() {
            var doc = {
                test1: 'false',
                test: 'yes'
            };
            
            var selector = new Selector(function(_doc) {
                expect(_doc.test1).to.be.equal(doc.test1);
                
                return _doc.test1 === 'false';
            });
            
            expect(selector.test(doc)).to.be.true;
        });
    });
    
    describe("#Matching", function() {
        describe("- Plain Fields", function() {
            it("should match on a string value", function() {
                var doc = {
                    stringField: "yes"
                };
                
                // Matching value
                expect(new Selector({
                    stringField: "yes"
                }).test(doc)).to.be.true;
                
                // Non matching value
                expect(new Selector({
                    stringField: "no"
                }).test(doc)).to.not.be.true;
                
                // Non valid field
                expect(new Selector({
                    stringFieldNo: "yes"
                }).test(doc)).to.not.be.true;
                
                // Non valid value type
                expect(new Selector({
                    stringField: 3
                }).test(doc)).to.not.be.true;
            });
            
            it("should match on a number value", function() {
                var doc = {
                    numberField: 4
                };
                
                // Matching value
                expect(new Selector({
                    numberField: 4
                }).test(doc)).to.be.true;
                
                expect(new Selector({
                    numberField: "4"
                }).test(doc)).to.be.true;
                
                // Non matching value
                expect(new Selector({
                    numberField: 3
                }).test(doc)).to.not.be.true;
                
                // Non valid field
                expect(new Selector({
                    numberFieldNo: 4
                }).test(doc)).to.not.be.true;
                
                // Non valid value type
                expect(new Selector({
                    numberField: "no"
                }).test(doc)).to.not.be.true;
            });
            
            it("should match on a boolean value", function() {
                var doc = {
                    booleanField: false
                };
                
                // Matching value
                expect(new Selector({
                    booleanField: false
                }).test(doc)).to.be.true;
                
                expect(new Selector({
                    booleanField: "false"
                }).test(doc)).to.be.true;
                
                // Non matching value
                expect(new Selector({
                    booleanField: true
                }).test(doc)).to.not.be.true;
                
                // Non valid field
                expect(new Selector({
                    booleanFieldNo: false
                }).test(doc)).to.not.be.true;
                
                // Non valid value type
                expect(new Selector({
                    booleanField: "no"
                }).test(doc)).to.not.be.true;
            });
            
            it("should match on a null value", function() {
                var doc = {
                    nullField1: null,
                    nullField2: 'false'
                };
                
                // Matching value
                expect(new Selector({
                    nullField1: null
                }).test(doc)).to.be.true;
                
                // Non matching value
                expect(new Selector({
                    nullField2: null
                }).test(doc)).to.be.false;
            });
            
            it("should match on an array value", function() {
                var doc = {
                    arrayField1: [1, 2, 3],
                    arrayField2: 'false'
                };
                
                // Matching value
                expect(new Selector({
                    arrayField1: [1, 2, 3]
                }).test(doc)).to.be.true;
                
                // Non matching value
                expect(new Selector({
                    arrayField1: [1, 3, 4]
                }).test(doc)).to.be.false;
                
                expect(new Selector({
                    arrayField1: [3, 4]
                }).test(doc)).to.be.false;
                
                expect(new Selector({
                    arrayField2: [1]
                }).test(doc)).to.be.false;
            });
            
            it.skip("should match on a function value", function() {
                
            });
            
            it("should match on a plain object value", function() {
                var doc = {
                    objectField: {
                        field1: 'yes',
                        field2: {
                            field3: 'yep'
                        }
                    }
                };
                
                expect(new Selector({
                    "objectField.field1": "yes"
                }).test(doc)).to.be.true;
                
                expect(new Selector({
                    "objectField.field2": { field3: 'yep' }
                }).test(doc)).to.be.true;
                
                expect(new Selector({
                    "objectField.field1": "yes",
                    "objectField.field2.field3": "yep",
                }).test(doc)).to.be.true;
                
                expect(new Selector({
                    "objectField.field1": "no",
                    "objectField.field2.field4": "nope",
                }).test(doc)).to.not.be.true;
            });
            
            describe("Match on a operator value", function() {
                describe(" - Comparison Query Operators" , function() {
                    it("it should match with $gt", function() {
                        var doc = {
                            operatorField: 5
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $gt: 3
                            }
                        }).test(doc)).to.be.true;
                    });
                    
                    it("it should match with $lt", function() {
                        var doc = {
                            operatorField: 5
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $lt: 7
                            }
                        }).test(doc)).to.be.true;
                    });
                    
                    it("it should match with $gte", function() {
                        var doc = {
                            operatorField: 5
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $gte: 5
                            }
                        }).test(doc)).to.be.true;
                    });
                    
                    it("it should match with $lte", function() {
                        var doc = {
                            operatorField: 5
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $lte: 5
                            }
                        }).test(doc)).to.be.true;
                    });
                    
                    it("it should match with $eq", function() {
                        var doc = {
                            operatorField: 5
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $eq: 5
                            }
                        }).test(doc)).to.be.true;
                    });
                    
                    it("it should match with $ne", function() {
                        var doc = {
                            operatorField: 5
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $ne: 3
                            }
                        }).test(doc)).to.be.true;
                    });
                    
                    it("it should match with $in", function() {
                        var doc = {
                            operatorField1: 5,
                            operatorField2: [2, [3, 4]]
                        };
                        
                        expect(new Selector({
                            operatorField1: {
                                $in: [3, 5, 7]
                            }
                        }).test(doc)).to.be.true;
                        
                        expect(new Selector({
                            operatorField2: {
                                $in: [[3, 4], 7]
                            }
                        }).test(doc)).to.be.true;
                        
                        expect(new Selector({
                            operatorField2: {
                                $in: [3, 6, 7]
                            }
                        }).test(doc)).to.be.false;
                    });
                    
                    it("it should match with $nin", function() {
                        var doc = {
                            operatorField: 5
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $nin: [2, 4, 6]
                            }
                        }).test(doc)).to.be.true;
                    });
                });
                
                describe(" - Element Query Operators" , function() {
                    it("it should match with $exists", function() {
                        var doc = {
                            operatorField: null
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $exists: true
                            }
                        }).test(doc)).to.be.true;
                        
                        expect(new Selector({
                            unexistingField: {
                                $exists: false
                            }
                        }).test(doc)).to.be.true;
                    });
                    
                    it.skip("it should match with $type", function() {
                        
                    });
                });
                
                describe(" - Logical Query Operators" , function() {
                    it("it should match with $and", function() {
                        var doc = {
                            operatorField1: 5,
                            operatorField2: 3
                        };
                        
                        expect(new Selector({
                            $and: [
                                { operatorField1: 5 },
                                { operatorField2: 3 }
                            ]
                        }).test(doc)).to.be.true;
                        
                        expect(new Selector({
                            $and: [
                                { operatorField1: 5 },
                                { operatorField2: 6 }
                            ]
                        }).test(doc)).to.be.false;
                    });
                    
                    it.skip("it should match with $not", function() {
                        var doc = {
                            operatorField: 5
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $not: 3
                            }
                        }).test(doc)).to.be.true;
                    });
                    
                    it("it should match with $or", function() {
                        var doc = {
                            operatorField1: 2,
                            operatorField2: 3
                        };
                        
                        expect(new Selector({
                            $or: [
                                { operatorField1: 5 },
                                { operatorField2: 3 }
                            ]
                        }).test(doc)).to.be.true;
                        
                        expect(new Selector({
                            $or: [
                                { operatorField1: 5 },
                                { operatorField2: 6 }
                            ]
                        }).test(doc)).to.be.false;
                    });
                    
                    it.skip("it should match with $nor", function() {
                        var doc = {
                            operatorField: 5
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $not: 3
                            }
                        }).test(doc)).to.be.true;
                    });
                });
                
                describe(" - Evaluation Query Operators" , function() {
                    it("it should match with $mod", function() {
                        var doc = {
                            operatorField: 15
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $mod: [4, 3]
                            }
                        }).test(doc)).to.be.true;
                    });
                    
                    it("it should match with $regex", function() {
                        var doc = {
                            operatorField1: '-y3s-',
                            operatorField2: '-nope-',
                            operatorField3: 'nope\nyes'
                        };
                        
                        expect(new Selector({
                            operatorField1: {
                                $regex: /[\d]/
                            }
                        }).test(doc)).to.be.true;
                        
                        expect(new Selector({
                            operatorField2: {
                                $regex: /[\d]/
                            }
                        }).test(doc)).to.not.be.true;
                        
                        expect(new Selector({
                            operatorField1: {
                                $regex: /[YES]/,
                                $options: 'i'
                            }
                        }).test(doc)).to.be.true;
                        
                        expect(new Selector({
                            operatorField1: {
                                $regex: '/[NOPE]/'
                            }
                        }).test(doc)).to.not.be.true;
                        
                        expect(new Selector({
                            operatorField3: {
                                $regex: '^[YeS]',
                                $options: 'im'
                            }
                        }).test(doc)).to.be.true;
                        
                        expect(new Selector({
                            operatorField3: {
                                $regex: /^[YeS]/,
                                $options: 'i'
                            }
                        }).test(doc)).to.not.be.true;
                        
                        expect(new Selector({
                            operatorField1: /[YeS]/i
                        }).test(doc)).to.be.true;
                        
                        expect(new Selector({
                            operatorField1: /[yes]/g
                        }).test(doc)).to.be.true;
                        
                        expect(new Selector({
                            operatorField3: /^[yes]/m
                        }).test(doc)).to.be.true;
                    });
                    
                    it.skip("it should match with $text", function() {
                        var doc = {
                            operatorField: 5
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $not: 3
                            }
                        }).test(doc)).to.be.true;
                    });
                    
                    it.skip("it should match with $where", function() {
                        var doc = {
                            operatorField: 5
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $not: 3
                            }
                        }).test(doc)).to.be.true;
                    });
                });
                
                describe.skip(" - Geospatial Query Operators" , function() {
                    // TODO
                });
                
                describe(" - Query Query Operators" , function() {
                    it("it should match with $all", function() {
                        var doc = {
                            operatorField: [1, 3, 5]
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $all: [1, 3, 5]
                            }
                        }).test(doc)).to.be.true;
                        
                        expect(new Selector({
                            operatorField: {
                                $all: [1, 2, 5]
                            }
                        }).test(doc)).to.not.be.true;
                    });
                    
                    it.skip("it should match with $elemMatch", function() {
                        var doc = {
                            operatorField: [1, 3, 5]
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $elemMatch: 3
                            }
                        }).test(doc)).to.be.true;
                    });
                    
                    it("it should match with $size", function() {
                        var doc = {
                            operatorField: [1, 3, 5]
                        };
                        
                        expect(new Selector({
                            operatorField: {
                                $size: 3
                            }
                        }).test(doc)).to.be.true;
                    });
                });
                
                
                describe.skip(" - Bitwise Query Operators" , function() {
                    // TODO
                });
            });
        });
    });
    
    describe("#Methods", function() {
        describe("Selector->matches", function() {
            it("should do the match", function() {
                var doc = {
                    stringField: "yes",
                    numberField: 4
                };
                
                expect(
                    Selector.matches({
                        stringField: "yes"
                    },
                    doc
                )).to.be.true;
                
                expect(
                    Selector.matches({
                        numberField: 3
                    },
                    doc
                )).to.not.be.true;
            });
        });
        
        describe("Selector->isSelectorCompiled", function() {
            it("should know if a match selector is compiled", function() {
                var selector = new Selector({field: 'true'});
                
                expect(Selector.isSelectorCompiled(selector)).to.be.true;
                
                expect(Selector.isSelectorCompiled({field: 'true'})).to.be.false;
            });
        });
    });
    
    describe("#Sorting", function() {
        it("should not sort if nothing is passed", function() {
            var doc1 = {
                stringField1: "Madrid",
                stringField2: "Villalba"
            };
            var doc2 = {
                stringField1: "Barcelona"
            };
            var doc3 = {
                stringField1: "Valencia"
            };
            var doc4 = {
                stringField1: "Madrid",
                stringField2: "Madrid"
            };
            
            var results = [doc1, doc2, doc3, doc4];
            var sorted = null;
            
            sorted = results.sort(new Selector(null, Selector.SORT_SELECTOR));
            expect(sorted[0].stringField1).to.be.equal("Madrid");
            expect(sorted[0].stringField2).to.be.equal("Villalba");
            expect(sorted[1].stringField1).to.be.equal("Barcelona");
            expect(sorted[2].stringField1).to.be.equal("Valencia");
            expect(sorted[3].stringField1).to.be.equal("Madrid");
            expect(sorted[3].stringField2).to.be.equal("Madrid");
        });
        
        it("should sort with a string", function() {
            var doc1 = {
                stringField1: "Madrid",
                stringField2: "Villalba"
            };
            var doc2 = {
                stringField1: "Barcelona"
            };
            var doc3 = {
                stringField1: "Valencia"
            };
            var doc4 = {
                stringField1: "Madrid",
                stringField2: "Madrid"
            };
            
            var results = [doc1, doc2, doc3, doc4];
            var sorted = null;
            
            sorted = results.sort(new Selector("stringField1", Selector.SORT_SELECTOR));
            expect(sorted[0].stringField1).to.be.equal("Barcelona");
            expect(sorted[1].stringField1).to.be.equal("Madrid");
            expect(sorted[1].stringField2).to.be.equal("Villalba");
            expect(sorted[2].stringField1).to.be.equal("Madrid");
            expect(sorted[2].stringField2).to.be.equal("Madrid");
            expect(sorted[3].stringField1).to.be.equal("Valencia");
            
            sorted = results.sort(new Selector("stringField1 desc stringField2", Selector.SORT_SELECTOR));
            
            expect(sorted[0].stringField1).to.be.equal("Valencia");
            expect(sorted[1].stringField1).to.be.equal("Madrid");
            expect(sorted[1].stringField2).to.be.equal("Madrid");
            expect(sorted[2].stringField1).to.be.equal("Madrid");
            expect(sorted[2].stringField2).to.be.equal("Villalba");
            expect(sorted[3].stringField1).to.be.equal("Barcelona");
            
            sorted = results.sort(new Selector("stringField1 stringField2", Selector.SORT_SELECTOR));
            
            expect(sorted[0].stringField1).to.be.equal("Barcelona");
            expect(sorted[1].stringField1).to.be.equal("Madrid");
            expect(sorted[1].stringField2).to.be.equal("Madrid");
            expect(sorted[2].stringField1).to.be.equal("Madrid");
            expect(sorted[2].stringField2).to.be.equal("Villalba");
            expect(sorted[3].stringField1).to.be.equal("Valencia");

            sorted = results.sort(new Selector("stringField1 -1, stringField2 false", Selector.SORT_SELECTOR));
            
            expect(sorted[0].stringField1).to.be.equal("Valencia");
            expect(sorted[1].stringField1).to.be.equal("Madrid");
            expect(sorted[1].stringField2).to.be.equal("Villalba");
            expect(sorted[2].stringField1).to.be.equal("Madrid");
            expect(sorted[2].stringField2).to.be.equal("Madrid");
            expect(sorted[3].stringField1).to.be.equal("Barcelona");
        });
        
        it("should sort with an array", function() {
            var doc1 = {
                stringField1: "Madrid",
                stringField2: "Villalba"
            };
            var doc2 = {
                stringField1: "Barcelona"
            };
            var doc3 = {
                stringField1: "Valencia"
            };
            var doc4 = {
                stringField1: "Madrid",
                stringField2: "Madrid"
            };
            
            var results = [doc1, doc2, doc3, doc4];
            var sorted = null;
            
            sorted = results.sort(new Selector(["stringField1", "false", "stringField2"], Selector.SORT_SELECTOR));
            
            expect(sorted[0].stringField1).to.be.equal("Valencia");
            expect(sorted[1].stringField1).to.be.equal("Madrid");
            expect(sorted[1].stringField2).to.be.equal("Madrid");
            expect(sorted[2].stringField1).to.be.equal("Madrid");
            expect(sorted[2].stringField2).to.be.equal("Villalba");
            expect(sorted[3].stringField1).to.be.equal("Barcelona");
            
            sorted = results.sort(new Selector(["stringField1", 1, ["stringField2", false]], Selector.SORT_SELECTOR));
            
            expect(sorted[0].stringField1).to.be.equal("Barcelona");
            expect(sorted[1].stringField1).to.be.equal("Madrid");
            expect(sorted[1].stringField2).to.be.equal("Villalba");
            expect(sorted[2].stringField1).to.be.equal("Madrid");
            expect(sorted[2].stringField2).to.be.equal("Madrid");
            expect(sorted[3].stringField1).to.be.equal("Valencia");
        });
        
        it("should sort with an object", function() {
            var doc1 = {
                stringField1: "Madrid",
                stringField2: "Villalba"
            };
            var doc2 = {
                stringField1: "Barcelona"
            };
            var doc3 = {
                stringField1: "Valencia"
            };
            var doc4 = {
                stringField1: "Madrid",
                stringField2: "Madrid"
            };
            
            var results = [doc1, doc2, doc3, doc4];
            var sorted = null;
            
            sorted = results.sort(new Selector({
                "stringField1": "",   // Will use default
                "stringField2": ["desc"],
                "stringField3": -1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].stringField1).to.be.equal("Barcelona");
            expect(sorted[1].stringField1).to.be.equal("Madrid");
            expect(sorted[1].stringField2).to.be.equal("Villalba");
            expect(sorted[2].stringField1).to.be.equal("Madrid");
            expect(sorted[2].stringField2).to.be.equal("Madrid");
            expect(sorted[3].stringField1).to.be.equal("Valencia");
        });
        
        it("should sort by number", function() {
            var doc1 = {
                numberField1: 4,
                numberField2: 3
            };
            var doc2 = {
                numberField1: 3,
                numberField2: 7
            };
            var doc3 = {
                numberField1: 4,
                numberField2: 1
            };
            var doc4 = {
                numberField1: 5,
                numberField2: 2
            };
            
            var results = [doc1, doc2, doc3, doc4];
            var sorted = null;
            
            sorted = results.sort(new Selector({
                numberField1: 1,
                numberField2: -1
            }, Selector.SORT_SELECTOR));

            expect(sorted[0].numberField1).to.be.equal(3);
            expect(sorted[0].numberField2).to.be.equal(7);
            expect(sorted[1].numberField1).to.be.equal(4);
            expect(sorted[1].numberField2).to.be.equal(3);
            expect(sorted[2].numberField1).to.be.equal(4);
            expect(sorted[2].numberField2).to.be.equal(1);
            expect(sorted[3].numberField1).to.be.equal(5);
            expect(sorted[3].numberField2).to.be.equal(2);
            
            sorted = results.sort(new Selector({
                numberField1: -1,
                numberField2: 1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].numberField1).to.be.equal(5);
            expect(sorted[0].numberField2).to.be.equal(2);
            expect(sorted[1].numberField1).to.be.equal(4);
            expect(sorted[1].numberField2).to.be.equal(1);
            expect(sorted[2].numberField1).to.be.equal(4);
            expect(sorted[2].numberField2).to.be.equal(3);
            expect(sorted[3].numberField1).to.be.equal(3);
            expect(sorted[3].numberField2).to.be.equal(7);
        });
        
        it("should sort by string", function() {
            var doc1 = {
                stringField1: "Madrid",
                stringField2: "Villalba"
            };
            var doc2 = {
                stringField1: "Barcelona"
            };
            var doc3 = {
                stringField1: "Valencia"
            };
            var doc4 = {
                stringField1: "Madrid",
                stringField2: "Madrid"
            };
            
            var results = [doc1, doc2, doc3, doc4];
            var sorted = null;
            
            sorted = results.sort(new Selector({
                stringField1: 1,
                stringField2: ["desc"]
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].stringField1).to.be.equal("Barcelona");
            expect(sorted[1].stringField1).to.be.equal("Madrid");
            expect(sorted[1].stringField2).to.be.equal("Villalba");
            expect(sorted[2].stringField1).to.be.equal("Madrid");
            expect(sorted[2].stringField2).to.be.equal("Madrid");
            expect(sorted[3].stringField1).to.be.equal("Valencia");
        });
        
        it("should sort by boolean", function() {
            var doc1 = {
                booleanField1: true,
                booleanField2: false
            };
            var doc2 = {
                booleanField1: false,
                booleanField2: true
            };
            var doc3 = {
                booleanField1: false,
                booleanField2: false
            };
            var doc4 = {
                booleanField1: true,
                booleanField2: true
            };
            
            var results = [doc1, doc2, doc3, doc4];
            var sorted = null;
            
            sorted = results.sort(new Selector({
                booleanField1: 1,
                booleanField2: -1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].booleanField1).to.be.equal(false);
            expect(sorted[0].booleanField2).to.be.equal(true);
            expect(sorted[1].booleanField1).to.be.equal(false);
            expect(sorted[1].booleanField2).to.be.equal(false);
            expect(sorted[2].booleanField1).to.be.equal(true);
            expect(sorted[2].booleanField2).to.be.equal(true);
            expect(sorted[3].booleanField1).to.be.equal(true);
            expect(sorted[3].booleanField2).to.be.equal(false);
            
            sorted = results.sort(new Selector({
                booleanField1: -1,
                booleanField2: 1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].booleanField1).to.be.equal(true);
            expect(sorted[0].booleanField2).to.be.equal(false);
            expect(sorted[1].booleanField1).to.be.equal(true);
            expect(sorted[1].booleanField2).to.be.equal(true);
            expect(sorted[2].booleanField1).to.be.equal(false);
            expect(sorted[2].booleanField2).to.be.equal(false);
            expect(sorted[3].booleanField1).to.be.equal(false);
            expect(sorted[3].booleanField2).to.be.equal(true);
        });
        
        it("should sort by array", function() {
            var doc1 = {
                arrayField1: [2],
                arrayField2: []
            };
            var doc2 = {
                arrayField1: [1, 4],
                arrayField2: [3, 5]
            };
            var doc3 = {
                arrayField1: [1, 4],
                arrayField2: []
            };
            var doc4 = {
                arrayField1: [],
                arrayField2: []
            };
            
            var results = [doc1, doc2, doc3, doc4];
            var sorted = null;
            
            sorted = results.sort(new Selector({
                arrayField1: 1,
                arrayField2: -1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].arrayField1).to.be.eql([]);
            expect(sorted[0].arrayField2).to.be.eql([]);
            expect(sorted[1].arrayField1).to.be.eql([2]);
            expect(sorted[1].arrayField2).to.be.eql([]);
            expect(sorted[2].arrayField1).to.be.eql([1, 4]);
            expect(sorted[2].arrayField2).to.be.eql([3, 5]);
            expect(sorted[3].arrayField1).to.be.eql([1, 4]);
            expect(sorted[3].arrayField2).to.be.eql([]);
            
            sorted = results.sort(new Selector({
                arrayField1: -1,
                arrayField2: 1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].arrayField1).to.be.eql([1, 4]);
            expect(sorted[0].arrayField2).to.be.eql([]);
            expect(sorted[1].arrayField1).to.be.eql([1, 4]);
            expect(sorted[1].arrayField2).to.be.eql([3, 5]);
            expect(sorted[2].arrayField1).to.be.eql([2]);
            expect(sorted[2].arrayField2).to.be.eql([]);
            expect(sorted[3].arrayField1).to.be.eql([]);
            expect(sorted[3].arrayField2).to.be.eql([]);
        });
        
        it("should sort by object", function() {
            var doc1 = {
                objectField1: {
                    field1: 4,
                    field2: "h"
                },
                objectField2: {
                    field1: 2,
                    field2: "b"
                },
            };
            var doc2 = {
                objectField1: {
                    field1: 3,
                    field2: "a"
                },
                objectField2: {
                    field1: 6,
                    field2: "d"
                }
            };
            var doc3 = {
                objectField1: {
                    field1: 1,
                    field2: "i"
                },
                objectField2: {
                    field1: 8,
                    field2: "q"
                }
            };
            var doc4 = {
                objectField1: {
                    field1: 3,
                    field2: "a"
                },
                objectField2: {
                    field1: 6,
                    field2: "g"
                }
            };
            
            var results = [doc1, doc2, doc3, doc4];
            var sorted = null;
            
            sorted = results.sort(new Selector({
                objectField1: 1,
                objectField2: -1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].objectField1).to.be.eql({field1: 1, field2: 'i'});
            expect(sorted[0].objectField2).to.be.eql({field1: 8, field2: 'q'});
            expect(sorted[1].objectField1).to.be.eql({field1: 3, field2: 'a'});
            expect(sorted[1].objectField2).to.be.eql({field1: 6, field2: 'g'});
            expect(sorted[2].objectField1).to.be.eql({field1: 3, field2: 'a'});
            expect(sorted[2].objectField2).to.be.eql({field1: 6, field2: 'd'});
            expect(sorted[3].objectField1).to.be.eql({field1: 4, field2: 'h'});
            expect(sorted[3].objectField2).to.be.eql({field1: 2, field2: 'b'});
            
            sorted = results.sort(new Selector({
                objectField1: -1,
                objectField2: 1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].objectField1).to.be.eql({field1: 4, field2: 'h'});
            expect(sorted[0].objectField2).to.be.eql({field1: 2, field2: 'b'});
            expect(sorted[1].objectField1).to.be.eql({field1: 3, field2: 'a'});
            expect(sorted[1].objectField2).to.be.eql({field1: 6, field2: 'd'});
            expect(sorted[2].objectField1).to.be.eql({field1: 3, field2: 'a'});
            expect(sorted[2].objectField2).to.be.eql({field1: 6, field2: 'g'});
            expect(sorted[3].objectField1).to.be.eql({field1: 1, field2: 'i'});
            expect(sorted[3].objectField2).to.be.eql({field1: 8, field2: 'q'});
        });
        
        it("should NOT sort by Symbols", function() {
            var doc1 = {
                symbolField: Symbol("first")
            };
            var doc2 = {
                symbolField: Symbol("second")
            };
            var doc3 = {
                symbolField: Symbol("third")
            };
            
            var results = [doc1, doc2, doc3];
            var sorted = null;
            
            sorted = results.sort(new Selector({
                symbolField: 1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].symbolField).to.be.equal(doc1.symbolField);
            expect(sorted[1].symbolField).to.be.equal(doc2.symbolField);
            expect(sorted[2].symbolField).to.be.equal(doc3.symbolField);
            
            sorted = results.sort(new Selector({
                symbolField: -1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].symbolField).to.be.equal(doc1.symbolField);
            expect(sorted[1].symbolField).to.be.equal(doc2.symbolField);
            expect(sorted[2].symbolField).to.be.equal(doc3.symbolField);
        });
        
        it("should sort by mixed types", function() {
            var doc1 = { field1: "second" };
            
            var doc2 = { field1: 1 };
            
            var doc3 = { field1: { third: 3 } };
            
            var doc4 = { field1: Symbol("five") };
            
            var doc5 = { field1: ["fourth"] };
            
            var doc6 = { field1: false };
            
            var results = [doc1, doc2, doc3, doc4, doc5, doc6];
            var sorted = null;
            
            sorted = results.sort(new Selector({
                field1: 1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].field1).to.be.equal(1);
            expect(sorted[1].field1).to.be.equal("second");
            expect(sorted[2].field1).to.be.equal(doc4.field1);
            expect(sorted[3].field1).to.be.eql({ third: 3 });
            expect(sorted[4].field1).to.be.eql(["fourth"]);
            expect(sorted[5].field1).to.be.equal(false);
            
            sorted = results.sort(new Selector({
                field1: -1
            }, Selector.SORT_SELECTOR));
            
            expect(sorted[0].field1).to.be.equal(false);
            expect(sorted[1].field1).to.be.eql(["fourth"]);
            expect(sorted[2].field1).to.be.eql({ third: 3 });
            expect(sorted[3].field1).to.be.equal(doc4.field1);
            expect(sorted[4].field1).to.be.equal("second");
            expect(sorted[5].field1).to.be.equal(1);
        });
    });
    
    describe("#Fields", function() {
        it("should show or hide the document fields", function() {
            var selector = {
                test1: 1,
                _id: -1
            };
            
            var _selector = new Selector(selector, Selector.FIELD_SELECTOR);
            
            expect(_selector).to.be.eql(selector);
            
            _selector = new Selector({
                test1: true,
                _id: false
            }, Selector.FIELD_SELECTOR);
            
            expect(_selector).to.be.eql(selector);
            
            _selector = new Selector("field1", Selector.FIELD_SELECTOR);
            
            expect(_selector).to.be.eql({ field1: 1 });
        });
    });
});