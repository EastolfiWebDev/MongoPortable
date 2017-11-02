import "mocha";
import { expect } from "chai";

import { TestHelper } from "../../helper/index";
import { MongoPortable } from "../../../src/core/index";
import { BaseStore } from "../../../src/store/index";

TestHelper.initLogger();

let db = null;

describe("- BaseStore", function() {
   describe("#Constructor", function() {
        it("should have the dependencies ready", function() {
            TestHelper.assertDependencies([MongoPortable, BaseStore]);
        });
        
        it("should be able to instanciate", function() {
            let store = new BaseStore();
            
            expect(store).to.exist;
        });
    });
    
    describe("#Emit", function() {
		before(function() {
			db = new MongoPortable("PRUEBAS", null);
			
			db.addStore(new BaseStore());
		});
		
		it("should emit a 'createCollection' event", function(done) {
			db.emit("createCollection", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'insert' event", function(done) {
			db.emit("insert", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'save' event", function(done) {
			db.emit("save", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'all' event", function(done) {
			db.emit("all", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'find' event", function(done) {
			db.emit("find", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'findOne' event", function(done) {
			db.emit("findOne", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'update' event", function(done) {
			db.emit("update", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'remove' event", function(done) {
			db.emit("remove", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'ensureIndex' event", function(done) {
			db.emit("ensureIndex", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'backup' event", function(done) {
			db.emit("backup", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'backups' event", function(done) {
			db.emit("backups", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'removeBackup' event", function(done) {
			db.emit("removeBackup", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
		
		it("should emit a 'restore' event", function(done) {
			db.emit("restore", {})
			.then((result) => {
			    // Result: void
				expect(result).to.not.exist;
				
				done();
			}).catch(error => {
			    expect(error).to.not.exist;
			    
			    done();
			});
		});
    });
});