import "mocha";
import { expect } from "chai";

import { TestHelper } from "../../helper/index";
import { EventEmitter } from "../../../src/emitter/index";

TestHelper.initLogger();

describe("- EventEmitter", function() {
   describe("#Constructor", function() {
        it("should have the dependencies ready", function() {
            TestHelper.assertDependencies([EventEmitter]);
        });
        
        it("should be able to instanciate", function() {
            let emitter = new EventEmitter();
            
            expect(emitter).to.exist;
        });
    });
    
    describe("#Emit", function() {
		it("should emit an event", function(done) {
			TestHelper.assertThrown(() => {
				let emitter = new EventEmitter({ autoRejectTimeout: 1500 });
				
				let fnc = function(data) {
					expect(data).to.have.property("result");
					
					return Promise.resolve();
				};
				let store1 = function() {
					this.test = fnc;
				};
				let store2 = {
					test: fnc
				};
				
				emitter.emit("test", { result: "OK" }, [new store1(), store2])
				.then(() => {
					done();
				}).catch(error => {
					expect(error).to.not.exist;
					
					done();
				});
			}, false);
		});
    });
});