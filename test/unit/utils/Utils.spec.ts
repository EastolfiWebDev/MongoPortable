import "mocha";
import { expect } from "chai";

import { TestHelper } from "../../helper/index";
import { Utils } from "../../../src/utils/index";

TestHelper.initLogger();

describe("Utils", function() {
	describe("- Constructor", function() {
		it("should have the dependencies ready", function() {
			TestHelper.assertDependencies([Utils]);
		});
		
	});
	
	describe("- renameObjectProperty", function() {
		it("should not fail if no property is provided", function() {
			TestHelper.assertThrown(() => {
				let obj = { oldProp: "1" };
			
				let newObj = Utils.renameObjectProperty(obj, null, null);
				
				expect(obj).to.be.deep.equal(newObj);
			}, false);
		});
		
		it("should not fail if no new property is provided", function() {
			TestHelper.assertThrown(() => {
				let obj = { oldProp: "1" };
			
				let newObj = Utils.renameObjectProperty(obj, "oldProp", null);
				
				expect(obj).to.be.deep.equal(newObj);
			}, false);
		});
		
		it("should not fail if no different property is provided", function() {
			TestHelper.assertThrown(() => {
				let obj = { oldProp: "1" };
			
				let newObj = Utils.renameObjectProperty(obj, "oldProp", "oldProp");
				
				expect(obj).to.be.deep.equal(newObj);
			}, false);
		});
		
		it("should work", function() {
			let obj = { oldProp: "1" };
			
			let newObj = Utils.renameObjectProperty(obj, "oldProp", "newProp");
			
			expect(obj).to.not.be.deep.equal(newObj);
			
			expect(newObj.oldProp).to.not.exist;
			expect(newObj.newProp).to.be.equal("1");
		});
	});
	
});