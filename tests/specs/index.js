/* global MongoPortable */

var expect = require('chai').expect;

describe('test setup', function() {
    it('should work', function() {
        expect(window.Pruebas).to.exists;
        // var asd = new MongoPortable();
        
        // expect(asd).to.exists;
        // expect(asd.lodash).to.exists;
        // expect(asd.lodash._isArray).to.exists;
    });
});