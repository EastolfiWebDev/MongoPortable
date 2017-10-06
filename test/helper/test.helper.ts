// import "mocha";
import { expect } from "chai";
import { JSWLogger } from "jsw-logger";

export class TestHelper {
	static assertThrown(fnc: Function, expected: boolean) {
		let thrown = false;
		
		try {
			fnc();
		} catch (error) {
			thrown = true;
		}
		
		expect(thrown).to.be.equal(expected);
	}
	
	static assertDependencies(deps: Array<any>) {
		for (let dep of deps) {
			expect(dep).to.exist;
		}
	}
	
	static initLogger(showLogs: boolean = false, throwExceptions: boolean = true) {
		JSWLogger.__dropInstance();
		JSWLogger.getInstance({ hideAllLogs: !showLogs, throwError: throwExceptions });
	}
}