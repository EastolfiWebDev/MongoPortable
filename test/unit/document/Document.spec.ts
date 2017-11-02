import "mocha";
import { expect } from "chai";

import { TestHelper } from "../../helper/index";
import { Document } from "../../../src/document/index";

TestHelper.initLogger();

describe("Document", function() {
	describe("- Constructor", function() {
		it("should have the dependencies ready", function() {
			TestHelper.assertDependencies([Document]);
		});
	});
});