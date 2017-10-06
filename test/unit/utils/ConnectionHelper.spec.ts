import "mocha";
import { expect } from "chai";

import { TestHelper } from "../../helper/index";
import { ConnectionHelper } from "../../../src/utils/index";
import { MongoPortable } from "../../../src/core/index";

class MTestHelper extends TestHelper {
	constructor() { super(); }
	
	static createInstance() {
		return new MongoPortable("__test__", null);
	}
}

MTestHelper.initLogger();

describe("ConnectionHelper", function() {
	describe("- Constructor", function() {
		it("should have the dependencies ready", function() {
			MTestHelper.assertDependencies([ConnectionHelper, MongoPortable]);
		});
		
	});
	
	describe("- addConnection", function() {
		it("should add a connection", function() {
			let c = new ConnectionHelper();
			
			expect(c.hasConnection("conn1")).to.be.false;
			
			c.addConnection("conn1", 1, MTestHelper.createInstance());
			
			expect(c.hasConnection("conn1")).to.be.true;
		});
	});
	
	describe("- getConnection", function() {
		it("should get a collection", function() {
			let c = new ConnectionHelper();
			
			c.addConnection("conn1", 1, MTestHelper.createInstance());
			
			let conn = c.getConnection("conn0");
			
			expect(conn).to.not.exist;
			
			conn = c.getConnection("conn1");
			
			expect(conn).to.exist;
			
			expect(conn.name).to.be.equal("conn1");
		});
	});
	
	describe("- dropConnection", function() {
		it("should not fail when deleting a non existing connection", function() {
			TestHelper.assertThrown(() => {
				let c = new ConnectionHelper();
				
				c.dropConnection("conn1");
			}, false);
		});
		
		it("should delete a connection", function() {
			let c = new ConnectionHelper();
			
			c.addConnection("conn1", 1, MTestHelper.createInstance());
			
			expect(c.hasConnection("conn1")).to.be.true;
			
			c.dropConnection("conn1");
			
			expect(c.hasConnection("conn1")).to.be.false;
		});
	});
	
	describe("- hasConnection", function() {
		it("should retrieve a connection", function() {
			let c = new ConnectionHelper();
			
			c.addConnection("conn1", 1, MTestHelper.createInstance());
			
			expect(c.hasConnection("conn0")).to.be.false;
			expect(c.hasConnection("conn1")).to.be.true;
		});
	});
	
	describe("- validateDatabaseName", function() {
		it("should fail if the 'name' param is not a string", function() {
			TestHelper.assertThrown(() => {
				let c = new ConnectionHelper();
				
				c.validateDatabaseName(null);
			}, true);
		});
		
		it("should fail if the 'name' param is an empty string", function() {
			TestHelper.assertThrown(() => {
				let c = new ConnectionHelper();
				
				c.validateDatabaseName("");
			}, true);
		});
		
		it("should fail if the 'name' param contains invalid characters", function() {
			TestHelper.assertThrown(() => {
				let c = new ConnectionHelper();
				
				c.validateDatabaseName("should fail");
			}, true);
			
			TestHelper.assertThrown(() => {
				let c = new ConnectionHelper();
				
				c.validateDatabaseName("should.fail");
			}, true);
			
			TestHelper.assertThrown(() => {
				let c = new ConnectionHelper();
				
				c.validateDatabaseName("should$fail");
			}, true);
			
			TestHelper.assertThrown(() => {
				let c = new ConnectionHelper();
				
				c.validateDatabaseName("should/fail");
			}, true);
			
			/* TestHelper.assertThrown(() => {
				TestHelper.initLogger(true, false);
				
				let c = new ConnectionHelper();
				
				expect(c.validateDatabaseName("should\fail")).to.be.false;
				
				TestHelper.initLogger();
			}, false); */
		});
		
		it("should not fail if the 'name' param is a valid string", function() {
			TestHelper.assertThrown(() => {
				let c = new ConnectionHelper();
				
				c.validateDatabaseName("should_not_fail");
			}, false);
			
			TestHelper.assertThrown(() => {
				let c = new ConnectionHelper();
				
				c.validateDatabaseName("should-not-fail");
			}, false);
		});
	});
	
});