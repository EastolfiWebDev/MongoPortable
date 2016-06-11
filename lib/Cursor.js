"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @file Cursor.js - based on Monglo#Cursor ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var Logger = require("jsw-logger"),
    _ = require("lodash"),
    Selector = require('./Selector');

var logger = null;

/**
 * Cursor
 * 
 * @module Cursor
 * @constructor
 * @since 0.0.1
 * 
 * @classdesc Cursor class that maps a MongoDB-like cursor
 * 
 * @param {MongoPortable} db - Additional options
 * @param {Collection} collection - The collection instance
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object|Array|String} [fields={}] - The fields of the document to show
 * @param {Object} [options] - Database object
 * 
 * @param {Object} [options.pkFactory=null] - Object overriding the basic "ObjectId" primary key generation.
 * 
 */

var Cursor = function Cursor(db, collection, selection, fields) {
    var options = arguments.length <= 4 || arguments[4] === undefined ? {} : arguments[4];

    _classCallCheck(this, Cursor);

    this.db = db;
    this.collection = collection;
    this.selector = selection;
    this.skipValue = options.skip || 0;
    this.limitValue = options.limit || 15;
    this.sortValue = options.sort || null;
    this.sorted = false;

    logger = Logger.instance;

    if (Selector.isSelectorCompiled(this.selector)) {
        this.selector_compiled = this.selector;
    } else {
        this.selector_compiled = new Selector(this.selector, Selector.MATCH_SELECTOR);
    }

    for (var i = 0; i < this.selector_compiled.clauses.length; i++) {
        if (this.selector_compiled.clauses[i].key === '_id') {
            this.selector_id = this.selector_compiled.clauses[i].value;
        }
    }

    for (var _i = 0; _i < this.selector_compiled.clauses.length; _i++) {
        if (this.selector_compiled.clauses[_i].key === '_id') {
            var _val = this.selector_compiled.clauses[_i].value;

            if (_.isString(_val) || _.isNumber(_val)) {
                this.selector_id = _val;
            }
        }
    }

    this.fields = new Selector(fields, Selector.FIELD_SELECTOR);

    this.sort_compiled = new Selector(this.sortValue, Selector.SORT_SELECTOR);

    this.db_objects = null;
    this.cursor_pos = 0;
};

/**
 * Moves a cursor to the begining
 * 
 * @method Cursor#rewind
 */


Cursor.prototype.rewind = function () {
    this.db_objects = null;
    this.cursor_pos = 0;
};

/**
 * Iterates over the cursor, calling a callback function
 * 
 * @method Cursor#forEach
 * 
 * @param {Function} [callback=null] - Callback function to be called for each document
 */
Cursor.prototype.forEach = function (callback) {
    var docs = this.fetchAll();

    for (var i = 0; i < docs.length; i++) {
        callback(docs[i]);
    }
};

/**
 * Iterates over the cursor, returning a new array with the documents affected by the callback function
 * 
 * @method Cursor#map
 * 
 * @param {Function} [callback=null] - Callback function to be called for each document
 * 
 * @returns {Array} The documents after being affected with the callback function
 */
Cursor.prototype.map = function (callback) {
    var res = [];

    this.forEach(function (doc) {
        res.push(callback(doc));
    });

    return res;
};

/**
 * Checks if the cursor has one document to be fetched
 * 
 * @method Cursor#hasNext
 * 
 * @returns {Boolean} True if we can fetch one more document
 */
Cursor.prototype.hasNext = function () {
    return this.cursor_pos < this.collection.docs.length;
};

/**
 * Alias for {@link Cursor#fetchOne}
 * 
 * @method Cursor#next
 */
Cursor.prototype.next = function () {
    return this.fetchOne();
};

/**
 * Alias for {@link Cursor#fetchAll}
 * 
 * @method Cursor#fetch
 */
Cursor.prototype.fetch = function () {
    return this.fetchAll();
};

/**
 * Fetch all documents in the cursor
 * 
 * @method Cursor#fetchAll
 * 
 * @returns {Array} All the documents contained in the cursor
 */
Cursor.prototype.fetchAll = function () {
    return _getDocuments(this, false) || [];
};

/**
 * Retrieves the next document in the cursor
 * 
 * @method Cursor#fetchOne
 * 
 * @returns {Object} The next document in the cursor
 */
Cursor.prototype.fetchOne = function () {
    return _getDocuments(this, true);
};

var _mapFields = function _mapFields(doc, fields) {
    var _doc = _.cloneDeep(doc);

    if (!_.isNil(fields) && _.isPlainObject(fields) && !_.isEqual(fields, {})) {
        var showId = true,
            showing = null;

        // Whether if we showing the _id field
        if (_.hasIn(fields, '_id') && fields._id === -1) {
            showId = false;
        }

        var tmp = null;

        for (var field in fields) {
            // Whether if we are showing or hidding fields
            if (field !== '_id' && showing === null) {
                showing = fields[field] === 1 ? true : false;
            }

            if (showing != null) {
                if (tmp === null) {
                    if (showing) {
                        tmp = {};
                    } else {
                        tmp = _.cloneDeep(doc);
                    }
                }

                // Add or remove the field
                if (showing) {
                    tmp[field] = doc[field];
                } else {
                    delete tmp[field];
                }
            }
        }

        // Add or remove the _id field
        if (showId) {
            tmp._id = doc._id;
        } else {
            delete tmp._id;
        }

        _doc = tmp;
    }

    return _doc;
};

/**
 * Retrieves one or all the documents in the cursor
 * 
 * @method _getDocuments
 * @private
 * 
 * @param {Cursor} cursor - The cursor with the documents
 * @param {Boolean} [justOne=false] - Whether it retrieves one or all the documents
 * 
 * @returns {Array|Object} If [justOne=true] returns the next document, otherwise returns all the documents
 */
var _getDocuments = function _getDocuments(cursor) {
    var justOne = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    if (cursor.selector_id) {
        if (_.hasIn(cursor.collection.doc_indexes, _.toString(cursor.selector_id))) {
            var idx = cursor.collection.doc_indexes[_.toString(cursor.selector_id)];

            return _mapFields(cursor.collection.docs[idx], cursor.fields);
        } else {
            if (justOne) {
                return null;
            } else {
                return [];
            }
        }
    }

    // TODO add warning when sort/skip/limit and fetching one
    // TODO add warning when skip/limit without order
    // TODO index
    while (cursor.cursor_pos < cursor.collection.docs.length) {
        var _doc = cursor.collection.docs[cursor.cursor_pos];
        cursor.cursor_pos++;

        if (cursor.selector_compiled.test(_doc)) {
            if (_.isNil(cursor.db_objects)) cursor.db_objects = [];

            _doc = _mapFields(_doc, cursor.fields);

            cursor.db_objects.push(_doc);

            if (justOne) {
                // Add force sort
                return _doc;
            }
        }
    }

    if (_.isNil(cursor.db_objects)) return null;

    if (!cursor.sorted && hasSorting(cursor)) cursor.sort();

    var idxFrom = cursor.skipValue;
    var idxTo = cursor.limitValue !== -1 ? cursor.limitValue + idxFrom : cursor.db_objects.length;

    return cursor.db_objects.slice(idxFrom, idxTo);
};

/**
 * Obtains the total of documents of the cursor
 * 
 * @method Cursor#count
 * 
 * @returns {Number} The total of documents in the cursor
 */
Cursor.prototype.count = function () {
    return this.fetchAll().length;
};

/**
 * Applies a sorting on the cursor
 * 
 * @method Cursor#sort
 * 
 * @param {Object|Array|String} spec - The sorting specification
 * 
 * @returns {Cursor} This instance so it can be chained with other methods
 */
Cursor.prototype.sort = function (spec) {
    var _sort = this.sort_compiled || null;

    if (spec) {
        _sort = new Selector(spec, Selector.SORT_SELECTOR);
    }

    if (_sort) {
        if (spec) {
            this.sortValue = spec;
            this.sort_compiled = _sort;
        } else {
            // If no spec, do sort
            if (!_.isNil(this.db_objects) && _.isArray(this.db_objects)) {
                this.db_objects = this.db_objects.sort(_sort);
                this.sorted = true;
            }
        }
    }

    return this;
};

/**
 * Set the number of document to skip when fetching the cursor
 * 
 * @method Cursor#skip
 * 
 * @param {Number} skip - The number of documents to skip
 * 
 * @returns {Cursor} This instance so it can be chained with other methods
 */
Cursor.prototype.skip = function (skip) {
    if (_.isNil(skip) || _.isNaN(skip)) throw new Error("Must pass a number");

    this.skipValue = skip;

    return this;
};

/**
 * Set the max number of document to fetch
 * 
 * @method Cursor#limit
 * 
 * @param {Number} limit - The max number of documents
 * 
 * @returns {Cursor} This instance so it can be chained with other methods
 */
Cursor.prototype.limit = function (limit) {
    if (_.isNil(limit) || _.isNaN(limit)) throw new Error("Must pass a number");

    this.limitValue = limit;

    return this;
};

/**
 * Checks if a cursor has a sorting defined
 * 
 * @method hasSorting
 * @private
 * 
 * @param {Cursor} cursor - The cursor
 * 
 * @returns {Boolean} Whether the cursor has sorting or not
 */
var hasSorting = function hasSorting(cursor) {
    if (_.isNil(cursor.sortValue)) return false;

    return true;
};

/**
 * @todo Implement
 */
Cursor.prototype.batchSize = function () {
    // Controls the number of documents MongoDB will return to the client in a single network message.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.close = function () {
    // Close a cursor and free associated server resources.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.comment = function () {
    // Attaches a comment to the query to allow for traceability in the logs and the system.profile collection.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.explain = function () {
    // Reports on the query execution plan for a cursor.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.hint = function () {
    // Forces MongoDB to use a specific index for a query.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.itcount = function () {
    // Computes the total number of documents in the cursor client-side by fetching and iterating the result set.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.maxScan = function () {
    // Specifies the maximum number of items to scan; documents for collection scans, keys for index scans.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.maxTimeMS = function () {
    // Specifies a cumulative time limit in milliseconds for processing operations on a cursor.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.max = function () {
    // Specifies an exclusive upper index bound for a cursor. For use with cursor.hint()
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.min = function () {
    // Specifies an inclusive lower index bound for a cursor. For use with cursor.hint()
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.noCursorTimeout = function () {
    // Instructs the server to avoid closing a cursor automatically after a period of inactivity.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.objsLeftInBatch = function () {
    // Returns the number of documents left in the current cursor batch.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.pretty = function () {
    // Configures the cursor to display results in an easy-to-read format.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.readConcern = function () {
    // Specifies a read concern for a find() operation.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.readPref = function () {
    // Specifies a read preference to a cursor to control how the client directs queries to a replica set.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.returnKey = function () {
    // Modifies the cursor to return index keys rather than the documents.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.showRecordId = function () {
    // Adds an internal storage engine ID field to each document returned by the cursor.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.size = function () {
    // Returns a count of the documents in the cursor after applying skip() and limit() methods.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.snapshot = function () {
    // Forces the cursor to use the index on the _id field. Ensures that the cursor returns each document,
    // with regards to the value of the _id field, only once.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.tailable = function () {
    // Marks the cursor as tailable. Only valid for cursors over capped collections.
    throw new Error("Not yet implemented");
};

/**
 * @todo Implement
 */
Cursor.prototype.toArray = function () {
    // Returns an array that contains all documents returned by the cursor.
    throw new Error("Not yet implemented");
};

module.exports = Cursor;
//# sourceMappingURL=data:application/json;base64,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LElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDSCxDQUhEOzs7OztBQVFBLE9BQU8sU0FBUCxDQUFpQixZQUFqQixHQUFnQyxZQUFXOztBQUV2QyxVQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDSCxDQUhEOzs7OztBQVFBLE9BQU8sU0FBUCxDQUFpQixJQUFqQixHQUF3QixZQUFXOztBQUUvQixVQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDSCxDQUhEOzs7OztBQVFBLE9BQU8sU0FBUCxDQUFpQixRQUFqQixHQUE0QixZQUFXOzs7QUFHbkMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FKRDs7Ozs7QUFTQSxPQUFPLFNBQVAsQ0FBaUIsUUFBakIsR0FBNEIsWUFBVzs7QUFFbkMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsT0FBakIsR0FBMkIsWUFBVzs7QUFFbEMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7QUFLQSxPQUFPLE9BQVAsR0FBaUIsTUFBakIiLCJmaWxlIjoiQ3Vyc29yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBDdXJzb3IuanMgLSBiYXNlZCBvbiBNb25nbG8jQ3Vyc29yICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZShcImpzdy1sb2dnZXJcIiksXG4gICAgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIiksXG4gICAgU2VsZWN0b3IgPSByZXF1aXJlKCcuL1NlbGVjdG9yJyk7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcblxuLyoqXG4gKiBDdXJzb3JcbiAqIFxuICogQG1vZHVsZSBDdXJzb3JcbiAqIEBjb25zdHJ1Y3RvclxuICogQHNpbmNlIDAuMC4xXG4gKiBcbiAqIEBjbGFzc2Rlc2MgQ3Vyc29yIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjdXJzb3JcbiAqIFxuICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogQHBhcmFtIHtDb2xsZWN0aW9ufSBjb2xsZWN0aW9uIC0gVGhlIGNvbGxlY3Rpb24gaW5zdGFuY2VcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gKiBcbiAqL1xuY2xhc3MgQ3Vyc29yIHtcbiAgICBjb25zdHJ1Y3RvcihkYiwgY29sbGVjdGlvbiwgc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICB0aGlzLmRiID0gZGI7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbiA9IGNvbGxlY3Rpb247XG4gICAgICAgIHRoaXMuc2VsZWN0b3IgPSBzZWxlY3Rpb247XG4gICAgICAgIHRoaXMuc2tpcFZhbHVlID0gb3B0aW9ucy5za2lwIHx8IDA7XG4gICAgICAgIHRoaXMubGltaXRWYWx1ZSA9IG9wdGlvbnMubGltaXQgfHwgMTU7XG4gICAgICAgIHRoaXMuc29ydFZhbHVlID0gb3B0aW9ucy5zb3J0IHx8IG51bGw7XG4gICAgICAgIHRoaXMuc29ydGVkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgXG4gICAgICAgIGlmIChTZWxlY3Rvci5pc1NlbGVjdG9yQ29tcGlsZWQodGhpcy5zZWxlY3RvcikpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0b3JfY29tcGlsZWQgPSB0aGlzLnNlbGVjdG9yO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3Rvcl9jb21waWxlZCA9IG5ldyBTZWxlY3Rvcih0aGlzLnNlbGVjdG9yLCBTZWxlY3Rvci5NQVRDSF9TRUxFQ1RPUik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zZWxlY3Rvcl9jb21waWxlZC5jbGF1c2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZWxlY3Rvcl9jb21waWxlZC5jbGF1c2VzW2ldLmtleSA9PT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdG9yX2lkID0gdGhpcy5zZWxlY3Rvcl9jb21waWxlZC5jbGF1c2VzW2ldLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuY2xhdXNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuY2xhdXNlc1tpXS5rZXkgPT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgdmFyIF92YWwgPSB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkLmNsYXVzZXNbaV0udmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNTdHJpbmcoX3ZhbCkgfHwgXy5pc051bWJlcihfdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdG9yX2lkID0gX3ZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBcbiAgICAgICAgdGhpcy5maWVsZHMgPSBuZXcgU2VsZWN0b3IoZmllbGRzLCBTZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNvcnRfY29tcGlsZWQgPSBuZXcgU2VsZWN0b3IodGhpcy5zb3J0VmFsdWUsIFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpO1xuICAgIFxuICAgICAgICB0aGlzLmRiX29iamVjdHMgPSBudWxsO1xuICAgICAgICB0aGlzLmN1cnNvcl9wb3MgPSAwO1xuICAgIH1cbn1cblxuLyoqXG4gKiBNb3ZlcyBhIGN1cnNvciB0byB0aGUgYmVnaW5pbmdcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjcmV3aW5kXG4gKi9cbkN1cnNvci5wcm90b3R5cGUucmV3aW5kID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5kYl9vYmplY3RzID0gbnVsbDtcbiAgICB0aGlzLmN1cnNvcl9wb3MgPSAwO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyBvdmVyIHRoZSBjdXJzb3IsIGNhbGxpbmcgYSBjYWxsYmFjayBmdW5jdGlvblxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNmb3JFYWNoXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBmb3IgZWFjaCBkb2N1bWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGxldCBkb2NzID0gdGhpcy5mZXRjaEFsbCgpO1xuICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZG9jcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjYWxsYmFjayhkb2NzW2ldKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIG92ZXIgdGhlIGN1cnNvciwgcmV0dXJuaW5nIGEgbmV3IGFycmF5IHdpdGggdGhlIGRvY3VtZW50cyBhZmZlY3RlZCBieSB0aGUgY2FsbGJhY2sgZnVuY3Rpb25cbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjbWFwXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBmb3IgZWFjaCBkb2N1bWVudFxuICogXG4gKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBkb2N1bWVudHMgYWZ0ZXIgYmVpbmcgYWZmZWN0ZWQgd2l0aCB0aGUgY2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciByZXMgPSBbXTtcblxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHJlcy5wdXNoKGNhbGxiYWNrKGRvYykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlcztcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBjdXJzb3IgaGFzIG9uZSBkb2N1bWVudCB0byBiZSBmZXRjaGVkXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2hhc05leHRcbiAqIFxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgd2UgY2FuIGZldGNoIG9uZSBtb3JlIGRvY3VtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuaGFzTmV4dCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAodGhpcy5jdXJzb3JfcG9zIDwgdGhpcy5jb2xsZWN0aW9uLmRvY3MubGVuZ3RoKTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBDdXJzb3IjZmV0Y2hPbmV9XG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI25leHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZmV0Y2hPbmUoKTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBDdXJzb3IjZmV0Y2hBbGx9XG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2ZldGNoXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZmV0Y2ggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5mZXRjaEFsbCgpO1xufTtcblxuLyoqXG4gKiBGZXRjaCBhbGwgZG9jdW1lbnRzIGluIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjZmV0Y2hBbGxcbiAqIFxuICogQHJldHVybnMge0FycmF5fSBBbGwgdGhlIGRvY3VtZW50cyBjb250YWluZWQgaW4gdGhlIGN1cnNvclxuICovXG5DdXJzb3IucHJvdG90eXBlLmZldGNoQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF9nZXREb2N1bWVudHModGhpcywgZmFsc2UpIHx8IFtdO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIG5leHQgZG9jdW1lbnQgaW4gdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNmZXRjaE9uZVxuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgbmV4dCBkb2N1bWVudCBpbiB0aGUgY3Vyc29yXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZmV0Y2hPbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gX2dldERvY3VtZW50cyh0aGlzLCB0cnVlKTtcbn07XG5cbnZhciBfbWFwRmllbGRzID0gZnVuY3Rpb24oZG9jLCBmaWVsZHMpIHtcbiAgICB2YXIgX2RvYyA9IF8uY2xvbmVEZWVwKGRvYyk7XG5cbiAgICBpZiAoIV8uaXNOaWwoZmllbGRzKSAmJiBfLmlzUGxhaW5PYmplY3QoZmllbGRzKSAmJiAhXy5pc0VxdWFsKGZpZWxkcywge30pKSB7XG4gICAgICAgIHZhciBzaG93SWQgPSB0cnVlLFxuICAgICAgICAgICAgc2hvd2luZyA9IG51bGw7XG5cbiAgICAgICAgLy8gV2hldGhlciBpZiB3ZSBzaG93aW5nIHRoZSBfaWQgZmllbGRcbiAgICAgICAgaWYgKF8uaGFzSW4oZmllbGRzLCAnX2lkJykgJiYgZmllbGRzLl9pZCA9PT0gLTEpIHtcbiAgICAgICAgICAgIHNob3dJZCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRtcCA9IG51bGw7XG5cbiAgICAgICAgZm9yICh2YXIgZmllbGQgaW4gZmllbGRzKSB7XG4gICAgICAgICAgICAvLyBXaGV0aGVyIGlmIHdlIGFyZSBzaG93aW5nIG9yIGhpZGRpbmcgZmllbGRzXG4gICAgICAgICAgICBpZiAoZmllbGQgIT09ICdfaWQnICYmIHNob3dpbmcgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzaG93aW5nID0gZmllbGRzW2ZpZWxkXSA9PT0gMSA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNob3dpbmcgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0bXAgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNob3dpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRtcCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG1wID0gXy5jbG9uZURlZXAoZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIG9yIHJlbW92ZSB0aGUgZmllbGRcbiAgICAgICAgICAgICAgICBpZiAoc2hvd2luZykge1xuICAgICAgICAgICAgICAgICAgICB0bXBbZmllbGRdID0gZG9jW2ZpZWxkXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdG1wW2ZpZWxkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgb3IgcmVtb3ZlIHRoZSBfaWQgZmllbGRcbiAgICAgICAgaWYgKHNob3dJZCkge1xuICAgICAgICAgICAgdG1wLl9pZCA9IGRvYy5faWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdG1wLl9pZDtcbiAgICAgICAgfVxuXG4gICAgICAgIF9kb2MgPSB0bXA7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9kb2M7XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyBvbmUgb3IgYWxsIHRoZSBkb2N1bWVudHMgaW4gdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIF9nZXREb2N1bWVudHNcbiAqIEBwcml2YXRlXG4gKiBcbiAqIEBwYXJhbSB7Q3Vyc29yfSBjdXJzb3IgLSBUaGUgY3Vyc29yIHdpdGggdGhlIGRvY3VtZW50c1xuICogQHBhcmFtIHtCb29sZWFufSBbanVzdE9uZT1mYWxzZV0gLSBXaGV0aGVyIGl0IHJldHJpZXZlcyBvbmUgb3IgYWxsIHRoZSBkb2N1bWVudHNcbiAqIFxuICogQHJldHVybnMge0FycmF5fE9iamVjdH0gSWYgW2p1c3RPbmU9dHJ1ZV0gcmV0dXJucyB0aGUgbmV4dCBkb2N1bWVudCwgb3RoZXJ3aXNlIHJldHVybnMgYWxsIHRoZSBkb2N1bWVudHNcbiAqL1xudmFyIF9nZXREb2N1bWVudHMgPSBmdW5jdGlvbihjdXJzb3IsIGp1c3RPbmUgPSBmYWxzZSkge1xuICAgIGlmIChjdXJzb3Iuc2VsZWN0b3JfaWQpIHtcbiAgICAgICAgaWYgKF8uaGFzSW4oY3Vyc29yLmNvbGxlY3Rpb24uZG9jX2luZGV4ZXMsIF8udG9TdHJpbmcoY3Vyc29yLnNlbGVjdG9yX2lkKSkpIHtcbiAgICAgICAgICAgIGxldCBpZHggPSBjdXJzb3IuY29sbGVjdGlvbi5kb2NfaW5kZXhlc1tfLnRvU3RyaW5nKGN1cnNvci5zZWxlY3Rvcl9pZCldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gX21hcEZpZWxkcyhjdXJzb3IuY29sbGVjdGlvbi5kb2NzW2lkeF0sIGN1cnNvci5maWVsZHMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGp1c3RPbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFRPRE8gYWRkIHdhcm5pbmcgd2hlbiBzb3J0L3NraXAvbGltaXQgYW5kIGZldGNoaW5nIG9uZVxuICAgIC8vIFRPRE8gYWRkIHdhcm5pbmcgd2hlbiBza2lwL2xpbWl0IHdpdGhvdXQgb3JkZXJcbiAgICAvLyBUT0RPIGluZGV4XG4gICAgd2hpbGUgKGN1cnNvci5jdXJzb3JfcG9zIDwgY3Vyc29yLmNvbGxlY3Rpb24uZG9jcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIF9kb2MgPSBjdXJzb3IuY29sbGVjdGlvbi5kb2NzW2N1cnNvci5jdXJzb3JfcG9zXTtcbiAgICAgICAgY3Vyc29yLmN1cnNvcl9wb3MrKztcbiAgICAgICAgXG4gICAgICAgIGlmIChjdXJzb3Iuc2VsZWN0b3JfY29tcGlsZWQudGVzdChfZG9jKSkge1xuICAgICAgICAgICAgaWYgKF8uaXNOaWwoY3Vyc29yLmRiX29iamVjdHMpKSBjdXJzb3IuZGJfb2JqZWN0cyA9IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBfZG9jID0gX21hcEZpZWxkcyhfZG9jLCBjdXJzb3IuZmllbGRzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY3Vyc29yLmRiX29iamVjdHMucHVzaChfZG9jKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGp1c3RPbmUpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZm9yY2Ugc29ydFxuICAgICAgICAgICAgICAgIHJldHVybiBfZG9jO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKGN1cnNvci5kYl9vYmplY3RzKSkgcmV0dXJuIG51bGw7XG4gICAgXG4gICAgaWYgKCFjdXJzb3Iuc29ydGVkICYmIGhhc1NvcnRpbmcoY3Vyc29yKSkgY3Vyc29yLnNvcnQoKTtcbiAgICBcbiAgICB2YXIgaWR4RnJvbSA9IGN1cnNvci5za2lwVmFsdWU7XG4gICAgdmFyIGlkeFRvID0gY3Vyc29yLmxpbWl0VmFsdWUgIT09IC0xID8gKGN1cnNvci5saW1pdFZhbHVlICsgaWR4RnJvbSkgOiBjdXJzb3IuZGJfb2JqZWN0cy5sZW5ndGg7XG4gICAgXG4gICAgcmV0dXJuIGN1cnNvci5kYl9vYmplY3RzLnNsaWNlKGlkeEZyb20sIGlkeFRvKTtcbiAgICBcbn07XG5cbi8qKlxuICogT2J0YWlucyB0aGUgdG90YWwgb2YgZG9jdW1lbnRzIG9mIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjY291bnRcbiAqIFxuICogQHJldHVybnMge051bWJlcn0gVGhlIHRvdGFsIG9mIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuY291bnQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5mZXRjaEFsbCgpLmxlbmd0aDtcbn07XG5cbi8qKlxuICogQXBwbGllcyBhIHNvcnRpbmcgb24gdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNzb3J0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gc3BlYyAtIFRoZSBzb3J0aW5nIHNwZWNpZmljYXRpb25cbiAqIFxuICogQHJldHVybnMge0N1cnNvcn0gVGhpcyBpbnN0YW5jZSBzbyBpdCBjYW4gYmUgY2hhaW5lZCB3aXRoIG90aGVyIG1ldGhvZHNcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zb3J0ID0gZnVuY3Rpb24oc3BlYykge1xuICAgIHZhciBfc29ydCA9IHRoaXMuc29ydF9jb21waWxlZCB8fCBudWxsO1xuICAgIFxuICAgIGlmIChzcGVjKSB7XG4gICAgICAgIF9zb3J0ID0gbmV3IFNlbGVjdG9yKHNwZWMsIFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoX3NvcnQpIHtcbiAgICAgICAgaWYgKHNwZWMpIHtcbiAgICAgICAgICAgIHRoaXMuc29ydFZhbHVlID0gc3BlYztcbiAgICAgICAgICAgIHRoaXMuc29ydF9jb21waWxlZCA9IF9zb3J0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSWYgbm8gc3BlYywgZG8gc29ydFxuICAgICAgICAgICAgaWYgKCFfLmlzTmlsKHRoaXMuZGJfb2JqZWN0cykgJiYgXy5pc0FycmF5KHRoaXMuZGJfb2JqZWN0cykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRiX29iamVjdHMgPSB0aGlzLmRiX29iamVjdHMuc29ydChfc29ydCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zb3J0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIG51bWJlciBvZiBkb2N1bWVudCB0byBza2lwIHdoZW4gZmV0Y2hpbmcgdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNza2lwXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBza2lwIC0gVGhlIG51bWJlciBvZiBkb2N1bWVudHMgdG8gc2tpcFxuICogXG4gKiBAcmV0dXJucyB7Q3Vyc29yfSBUaGlzIGluc3RhbmNlIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICovXG5DdXJzb3IucHJvdG90eXBlLnNraXAgPSBmdW5jdGlvbihza2lwKSB7XG4gICAgaWYgKF8uaXNOaWwoc2tpcCkgfHwgXy5pc05hTihza2lwKSkgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwYXNzIGEgbnVtYmVyXCIpO1xuICAgIFxuICAgIHRoaXMuc2tpcFZhbHVlID0gc2tpcDtcbiAgICBcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBtYXggbnVtYmVyIG9mIGRvY3VtZW50IHRvIGZldGNoXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2xpbWl0XG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBsaW1pdCAtIFRoZSBtYXggbnVtYmVyIG9mIGRvY3VtZW50c1xuICogXG4gKiBAcmV0dXJucyB7Q3Vyc29yfSBUaGlzIGluc3RhbmNlIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICovXG5DdXJzb3IucHJvdG90eXBlLmxpbWl0ID0gZnVuY3Rpb24obGltaXQpIHtcbiAgICBpZiAoXy5pc05pbChsaW1pdCkgfHwgXy5pc05hTihsaW1pdCkpIHRocm93IG5ldyBFcnJvcihcIk11c3QgcGFzcyBhIG51bWJlclwiKTtcbiAgICBcbiAgICB0aGlzLmxpbWl0VmFsdWUgPSBsaW1pdDtcbiAgICBcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgY3Vyc29yIGhhcyBhIHNvcnRpbmcgZGVmaW5lZFxuICogXG4gKiBAbWV0aG9kIGhhc1NvcnRpbmdcbiAqIEBwcml2YXRlXG4gKiBcbiAqIEBwYXJhbSB7Q3Vyc29yfSBjdXJzb3IgLSBUaGUgY3Vyc29yXG4gKiBcbiAqIEByZXR1cm5zIHtCb29sZWFufSBXaGV0aGVyIHRoZSBjdXJzb3IgaGFzIHNvcnRpbmcgb3Igbm90XG4gKi9cbnZhciBoYXNTb3J0aW5nID0gZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgaWYgKF8uaXNOaWwoY3Vyc29yLnNvcnRWYWx1ZSkpIHJldHVybiBmYWxzZTtcbiAgICBcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuYmF0Y2hTaXplID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQ29udHJvbHMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgTW9uZ29EQiB3aWxsIHJldHVybiB0byB0aGUgY2xpZW50IGluIGEgc2luZ2xlIG5ldHdvcmsgbWVzc2FnZS5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIENsb3NlIGEgY3Vyc29yIGFuZCBmcmVlIGFzc29jaWF0ZWQgc2VydmVyIHJlc291cmNlcy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jb21tZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQXR0YWNoZXMgYSBjb21tZW50IHRvIHRoZSBxdWVyeSB0byBhbGxvdyBmb3IgdHJhY2VhYmlsaXR5IGluIHRoZSBsb2dzIGFuZCB0aGUgc3lzdGVtLnByb2ZpbGUgY29sbGVjdGlvbi5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5leHBsYWluID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUmVwb3J0cyBvbiB0aGUgcXVlcnkgZXhlY3V0aW9uIHBsYW4gZm9yIGEgY3Vyc29yLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmhpbnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBGb3JjZXMgTW9uZ29EQiB0byB1c2UgYSBzcGVjaWZpYyBpbmRleCBmb3IgYSBxdWVyeS5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5pdGNvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQ29tcHV0ZXMgdGhlIHRvdGFsIG51bWJlciBvZiBkb2N1bWVudHMgaW4gdGhlIGN1cnNvciBjbGllbnQtc2lkZSBieSBmZXRjaGluZyBhbmQgaXRlcmF0aW5nIHRoZSByZXN1bHQgc2V0LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLm1heFNjYW4gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgdGhlIG1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRvIHNjYW47IGRvY3VtZW50cyBmb3IgY29sbGVjdGlvbiBzY2Fucywga2V5cyBmb3IgaW5kZXggc2NhbnMuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWF4VGltZU1TID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGEgY3VtdWxhdGl2ZSB0aW1lIGxpbWl0IGluIG1pbGxpc2Vjb25kcyBmb3IgcHJvY2Vzc2luZyBvcGVyYXRpb25zIG9uIGEgY3Vyc29yLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLm1heCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyBhbiBleGNsdXNpdmUgdXBwZXIgaW5kZXggYm91bmQgZm9yIGEgY3Vyc29yLiBGb3IgdXNlIHdpdGggY3Vyc29yLmhpbnQoKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLm1pbiA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyBhbiBpbmNsdXNpdmUgbG93ZXIgaW5kZXggYm91bmQgZm9yIGEgY3Vyc29yLiBGb3IgdXNlIHdpdGggY3Vyc29yLmhpbnQoKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLm5vQ3Vyc29yVGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEluc3RydWN0cyB0aGUgc2VydmVyIHRvIGF2b2lkIGNsb3NpbmcgYSBjdXJzb3IgYXV0b21hdGljYWxseSBhZnRlciBhIHBlcmlvZCBvZiBpbmFjdGl2aXR5LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLm9ianNMZWZ0SW5CYXRjaCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgbGVmdCBpbiB0aGUgY3VycmVudCBjdXJzb3IgYmF0Y2guXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucHJldHR5ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQ29uZmlndXJlcyB0aGUgY3Vyc29yIHRvIGRpc3BsYXkgcmVzdWx0cyBpbiBhbiBlYXN5LXRvLXJlYWQgZm9ybWF0LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLnJlYWRDb25jZXJuID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGEgcmVhZCBjb25jZXJuIGZvciBhIGZpbmQoKSBvcGVyYXRpb24uXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucmVhZFByZWYgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgYSByZWFkIHByZWZlcmVuY2UgdG8gYSBjdXJzb3IgdG8gY29udHJvbCBob3cgdGhlIGNsaWVudCBkaXJlY3RzIHF1ZXJpZXMgdG8gYSByZXBsaWNhIHNldC5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZXR1cm5LZXkgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBNb2RpZmllcyB0aGUgY3Vyc29yIHRvIHJldHVybiBpbmRleCBrZXlzIHJhdGhlciB0aGFuIHRoZSBkb2N1bWVudHMuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2hvd1JlY29yZElkID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQWRkcyBhbiBpbnRlcm5hbCBzdG9yYWdlIGVuZ2luZSBJRCBmaWVsZCB0byBlYWNoIGRvY3VtZW50IHJldHVybmVkIGJ5IHRoZSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2l6ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFJldHVybnMgYSBjb3VudCBvZiB0aGUgZG9jdW1lbnRzIGluIHRoZSBjdXJzb3IgYWZ0ZXIgYXBwbHlpbmcgc2tpcCgpIGFuZCBsaW1pdCgpIG1ldGhvZHMuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc25hcHNob3QgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBGb3JjZXMgdGhlIGN1cnNvciB0byB1c2UgdGhlIGluZGV4IG9uIHRoZSBfaWQgZmllbGQuIEVuc3VyZXMgdGhhdCB0aGUgY3Vyc29yIHJldHVybnMgZWFjaCBkb2N1bWVudCwgXG4gICAgLy8gd2l0aCByZWdhcmRzIHRvIHRoZSB2YWx1ZSBvZiB0aGUgX2lkIGZpZWxkLCBvbmx5IG9uY2UuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUudGFpbGFibGUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBNYXJrcyB0aGUgY3Vyc29yIGFzIHRhaWxhYmxlLiBPbmx5IHZhbGlkIGZvciBjdXJzb3JzIG92ZXIgY2FwcGVkIGNvbGxlY3Rpb25zLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLnRvQXJyYXkgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBSZXR1cm5zIGFuIGFycmF5IHRoYXQgY29udGFpbnMgYWxsIGRvY3VtZW50cyByZXR1cm5lZCBieSB0aGUgY3Vyc29yLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEN1cnNvcjsiXX0=
