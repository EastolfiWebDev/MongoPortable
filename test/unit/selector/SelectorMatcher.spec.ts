import "mocha";
import { expect } from "chai";

import { TestHelper } from "../../helper/index";
import { SelectorMatcher } from "../../../src/selector/index";

TestHelper.initLogger();

describe("SelectorMatcher", function() {
	describe("- Constructor", function() {
		it("should have the dependencies ready", function() {
			TestHelper.assertDependencies([SelectorMatcher]);
		});
	});
});