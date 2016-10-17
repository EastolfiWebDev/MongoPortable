/* global _ */

var Logger = require('jsw-logger');

var EventEmitter = require('./lib/utils/EventEmitter')(Logger, _);
var BinaryParserBuffer = require('./lib/BinaryParserBuffer')(Logger);
var BinaryParser = require('./lib/BinaryParser')(BinaryParserBuffer, Logger);
var ObjectId = require('./lib/ObjectId')(BinaryParser, Logger, _);
var SelectorMatcher = require('./lib/SelectorMatcher')(Logger, _);
var Selector = require('./lib/Selector')(ObjectId, SelectorMatcher, Logger, _);
var Cursor = require('./lib/Cursor')(Selector, Logger, _);
var Aggregation = require('./lib/Aggregation')(Selector, Cursor, Logger, _);
var Collection = require('./lib/Collection')(Aggregation, Cursor, Selector, SelectorMatcher, ObjectId, EventEmitter, Logger, _);
var MongoPortable = require('./lib/MongoPortable')(Collection, ObjectId, EventEmitter, Logger, _);

window.MongoPortable = MongoPortable;

module.exports = MongoPortable;