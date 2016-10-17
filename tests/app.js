/* global chai, _, Pruebas */

var expect = chai.expect;

describe("MongoPortable - Web", function() {
    it("should have the dependencies ready", function() {
        expect(Pruebas).to.exist;
        
        var test = new Pruebas();
        expect(test.lodash).to.exist;
    });
});