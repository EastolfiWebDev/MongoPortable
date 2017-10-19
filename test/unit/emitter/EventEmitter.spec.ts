import "mocha";
import { expect } from "chai";

import { TestHelper } from "../../helper/index";
import { EventEmitter } from "../../../src/emitter/index";
import { Options } from "../../../src/core/index";

TestHelper.initLogger();

describe("- EventEmitter", function() {
   describe("#Constructor", function() {
        it("should have the dependencies ready", function() {
            TestHelper.assertDependencies([EventEmitter, Options]);
        });
        
        it("should be able to instanciate", function() {
            let emitter = new EventEmitter(new Options());
            
            expect(emitter).to.exist;
        });
    });
    
    describe("#Emit", function() {
		it("should emit an event", function() {
			TestHelper.assertThrown(() => {
				let emitter = new EventEmitter(new Options());
				let fnc = function(data) {
					expect(data).to.have.property("result");
				};
				let store1 = function() {
					this.test = fnc;
				};
				let store2 = {
					test: fnc
				};
				
				emitter.emit("test", { result: "OK" }, [store1, store2]);
			}, false);
		});
    });
});