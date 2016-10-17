// import Pruebas from './src';
// var Pruebas = require('./src');
// var Pruebas = require('jsw-logger');
var Pruebas = require('../node_modules/jsw-logger/index');

console.log(Pruebas ? 'yes' : 'nop');

// export * from './src';

window.test = 'a';
window.Pruebas = Pruebas;

// export default Pruebas;
module.exports = Pruebas;