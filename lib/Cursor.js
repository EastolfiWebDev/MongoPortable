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

var Logger = require("./utils/Logger"),
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
//# sourceMappingURL=data:application/json;base64,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QixZQUFXOztBQUVuQyxVQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDSCxDQUhEOzs7OztBQVFBLE9BQU8sU0FBUCxDQUFpQixPQUFqQixHQUEyQixZQUFXOztBQUVsQyxVQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDSCxDQUhEOztBQUtBLE9BQU8sT0FBUCxHQUFpQixNQUFqQiIsImZpbGUiOiJDdXJzb3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIEN1cnNvci5qcyAtIGJhc2VkIG9uIE1vbmdsbyNDdXJzb3IgKHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vTW9uZ2xvfSkgYnkgQ2hyaXN0aWFuIFN1bGxpdmFuIDxjc0BldWZvcmljLmNvPiB8IENvcHlyaWdodCAoYykgMjAxMlxuICogQHZlcnNpb24gMS4wLjBcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlZFxuICovXG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKFwiLi91dGlscy9Mb2dnZXJcIiksXG4gICAgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIiksXG4gICAgU2VsZWN0b3IgPSByZXF1aXJlKCcuL1NlbGVjdG9yJyk7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcblxuLyoqXG4gKiBDdXJzb3JcbiAqIFxuICogQG1vZHVsZSBDdXJzb3JcbiAqIEBjb25zdHJ1Y3RvclxuICogQHNpbmNlIDAuMC4xXG4gKiBcbiAqIEBjbGFzc2Rlc2MgQ3Vyc29yIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjdXJzb3JcbiAqIFxuICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogQHBhcmFtIHtDb2xsZWN0aW9ufSBjb2xsZWN0aW9uIC0gVGhlIGNvbGxlY3Rpb24gaW5zdGFuY2VcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gKiBcbiAqL1xuY2xhc3MgQ3Vyc29yIHtcbiAgICBjb25zdHJ1Y3RvcihkYiwgY29sbGVjdGlvbiwgc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICB0aGlzLmRiID0gZGI7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbiA9IGNvbGxlY3Rpb247XG4gICAgICAgIHRoaXMuc2VsZWN0b3IgPSBzZWxlY3Rpb247XG4gICAgICAgIHRoaXMuc2tpcFZhbHVlID0gb3B0aW9ucy5za2lwIHx8IDA7XG4gICAgICAgIHRoaXMubGltaXRWYWx1ZSA9IG9wdGlvbnMubGltaXQgfHwgMTU7XG4gICAgICAgIHRoaXMuc29ydFZhbHVlID0gb3B0aW9ucy5zb3J0IHx8IG51bGw7XG4gICAgICAgIHRoaXMuc29ydGVkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgXG4gICAgICAgIGlmIChTZWxlY3Rvci5pc1NlbGVjdG9yQ29tcGlsZWQodGhpcy5zZWxlY3RvcikpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0b3JfY29tcGlsZWQgPSB0aGlzLnNlbGVjdG9yO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3Rvcl9jb21waWxlZCA9IG5ldyBTZWxlY3Rvcih0aGlzLnNlbGVjdG9yLCBTZWxlY3Rvci5NQVRDSF9TRUxFQ1RPUik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zZWxlY3Rvcl9jb21waWxlZC5jbGF1c2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZWxlY3Rvcl9jb21waWxlZC5jbGF1c2VzW2ldLmtleSA9PT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdG9yX2lkID0gdGhpcy5zZWxlY3Rvcl9jb21waWxlZC5jbGF1c2VzW2ldLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmZpZWxkcyA9IG5ldyBTZWxlY3RvcihmaWVsZHMsIFNlbGVjdG9yLkZJRUxEX1NFTEVDVE9SKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc29ydF9jb21waWxlZCA9IG5ldyBTZWxlY3Rvcih0aGlzLnNvcnRWYWx1ZSwgU2VsZWN0b3IuU09SVF9TRUxFQ1RPUik7XG4gICAgXG4gICAgICAgIHRoaXMuZGJfb2JqZWN0cyA9IG51bGw7XG4gICAgICAgIHRoaXMuY3Vyc29yX3BvcyA9IDA7XG4gICAgfVxufVxuXG4vKipcbiAqIE1vdmVzIGEgY3Vyc29yIHRvIHRoZSBiZWdpbmluZ1xuICogXG4gKiBAbWV0aG9kIEN1cnNvciNyZXdpbmRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZXdpbmQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmRiX29iamVjdHMgPSBudWxsO1xuICAgIHRoaXMuY3Vyc29yX3BvcyA9IDA7XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIG92ZXIgdGhlIGN1cnNvciwgY2FsbGluZyBhIGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2ZvckVhY2hcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGZvciBlYWNoIGRvY3VtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgbGV0IGRvY3MgPSB0aGlzLmZldGNoQWxsKCk7XG4gICAgXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkb2NzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNhbGxiYWNrKGRvY3NbaV0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogSXRlcmF0ZXMgb3ZlciB0aGUgY3Vyc29yLCByZXR1cm5pbmcgYSBuZXcgYXJyYXkgd2l0aCB0aGUgZG9jdW1lbnRzIGFmZmVjdGVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvblxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNtYXBcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGZvciBlYWNoIGRvY3VtZW50XG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheX0gVGhlIGRvY3VtZW50cyBhZnRlciBiZWluZyBhZmZlY3RlZCB3aXRoIHRoZSBjYWxsYmFjayBmdW5jdGlvblxuICovXG5DdXJzb3IucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgcmVzLnB1c2goY2FsbGJhY2soZG9jKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGN1cnNvciBoYXMgb25lIGRvY3VtZW50IHRvIGJlIGZldGNoZWRcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjaGFzTmV4dFxuICogXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB3ZSBjYW4gZmV0Y2ggb25lIG1vcmUgZG9jdW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5oYXNOZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICh0aGlzLmN1cnNvcl9wb3MgPCB0aGlzLmNvbGxlY3Rpb24uZG9jcy5sZW5ndGgpO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3Ige0BsaW5rIEN1cnNvciNmZXRjaE9uZX1cbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjbmV4dFxuICovXG5DdXJzb3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5mZXRjaE9uZSgpO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3Ige0BsaW5rIEN1cnNvciNmZXRjaEFsbH1cbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjZmV0Y2hcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5mZXRjaCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZldGNoQWxsKCk7XG59O1xuXG4vKipcbiAqIEZldGNoIGFsbCBkb2N1bWVudHMgaW4gdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNmZXRjaEFsbFxuICogXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFsbCB0aGUgZG9jdW1lbnRzIGNvbnRhaW5lZCBpbiB0aGUgY3Vyc29yXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZmV0Y2hBbGwgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gX2dldERvY3VtZW50cyh0aGlzLCBmYWxzZSkgfHwgW107XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgbmV4dCBkb2N1bWVudCBpbiB0aGUgY3Vyc29yXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2ZldGNoT25lXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBuZXh0IGRvY3VtZW50IGluIHRoZSBjdXJzb3JcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5mZXRjaE9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfZ2V0RG9jdW1lbnRzKHRoaXMsIHRydWUpO1xufTtcblxudmFyIF9tYXBGaWVsZHMgPSBmdW5jdGlvbihkb2MsIGZpZWxkcykge1xuICAgIHZhciBfZG9jID0gXy5jbG9uZURlZXAoZG9jKTtcblxuICAgIGlmICghXy5pc05pbChmaWVsZHMpICYmIF8uaXNQbGFpbk9iamVjdChmaWVsZHMpICYmICFfLmlzRXF1YWwoZmllbGRzLCB7fSkpIHtcbiAgICAgICAgdmFyIHNob3dJZCA9IHRydWUsXG4gICAgICAgICAgICBzaG93aW5nID0gbnVsbDtcblxuICAgICAgICAvLyBXaGV0aGVyIGlmIHdlIHNob3dpbmcgdGhlIF9pZCBmaWVsZFxuICAgICAgICBpZiAoXy5oYXNJbihmaWVsZHMsICdfaWQnKSAmJiBmaWVsZHMuX2lkID09PSAtMSkge1xuICAgICAgICAgICAgc2hvd0lkID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdG1wID0gbnVsbDtcblxuICAgICAgICBmb3IgKHZhciBmaWVsZCBpbiBmaWVsZHMpIHtcbiAgICAgICAgICAgIC8vIFdoZXRoZXIgaWYgd2UgYXJlIHNob3dpbmcgb3IgaGlkZGluZyBmaWVsZHNcbiAgICAgICAgICAgIGlmIChmaWVsZCAhPT0gJ19pZCcgJiYgc2hvd2luZyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHNob3dpbmcgPSBmaWVsZHNbZmllbGRdID09PSAxID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2hvd2luZyAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRtcCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2hvd2luZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG1wID0ge307XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0bXAgPSBfLmNsb25lRGVlcChkb2MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgb3IgcmVtb3ZlIHRoZSBmaWVsZFxuICAgICAgICAgICAgICAgIGlmIChzaG93aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRtcFtmaWVsZF0gPSBkb2NbZmllbGRdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0bXBbZmllbGRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBvciByZW1vdmUgdGhlIF9pZCBmaWVsZFxuICAgICAgICBpZiAoc2hvd0lkKSB7XG4gICAgICAgICAgICB0bXAuX2lkID0gZG9jLl9pZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0bXAuX2lkO1xuICAgICAgICB9XG5cbiAgICAgICAgX2RvYyA9IHRtcDtcbiAgICB9XG5cbiAgICByZXR1cm4gX2RvYztcbn07XG5cbi8qKlxuICogUmV0cmlldmVzIG9uZSBvciBhbGwgdGhlIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yXG4gKiBcbiAqIEBtZXRob2QgX2dldERvY3VtZW50c1xuICogQHByaXZhdGVcbiAqIFxuICogQHBhcmFtIHtDdXJzb3J9IGN1cnNvciAtIFRoZSBjdXJzb3Igd2l0aCB0aGUgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtqdXN0T25lPWZhbHNlXSAtIFdoZXRoZXIgaXQgcmV0cmlldmVzIG9uZSBvciBhbGwgdGhlIGRvY3VtZW50c1xuICogXG4gKiBAcmV0dXJucyB7QXJyYXl8T2JqZWN0fSBJZiBbanVzdE9uZT10cnVlXSByZXR1cm5zIHRoZSBuZXh0IGRvY3VtZW50LCBvdGhlcndpc2UgcmV0dXJucyBhbGwgdGhlIGRvY3VtZW50c1xuICovXG52YXIgX2dldERvY3VtZW50cyA9IGZ1bmN0aW9uKGN1cnNvciwganVzdE9uZSA9IGZhbHNlKSB7XG4gICAgaWYgKGN1cnNvci5zZWxlY3Rvcl9pZCkge1xuICAgICAgICBpZiAoXy5oYXNJbihjdXJzb3IuY29sbGVjdGlvbi5kb2NfaW5kZXhlcywgXy50b1N0cmluZyhjdXJzb3Iuc2VsZWN0b3JfaWQpKSkge1xuICAgICAgICAgICAgbGV0IGlkeCA9IGN1cnNvci5jb2xsZWN0aW9uLmRvY19pbmRleGVzW18udG9TdHJpbmcoY3Vyc29yLnNlbGVjdG9yX2lkKV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBfbWFwRmllbGRzKGN1cnNvci5jb2xsZWN0aW9uLmRvY3NbaWR4XSwgY3Vyc29yLmZpZWxkcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoanVzdE9uZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gVE9ETyBhZGQgd2FybmluZyB3aGVuIHNvcnQvc2tpcC9saW1pdCBhbmQgZmV0Y2hpbmcgb25lXG4gICAgLy8gVE9ETyBhZGQgd2FybmluZyB3aGVuIHNraXAvbGltaXQgd2l0aG91dCBvcmRlclxuICAgIC8vIFRPRE8gaW5kZXhcbiAgICB3aGlsZSAoY3Vyc29yLmN1cnNvcl9wb3MgPCBjdXJzb3IuY29sbGVjdGlvbi5kb2NzLmxlbmd0aCkge1xuICAgICAgICB2YXIgX2RvYyA9IGN1cnNvci5jb2xsZWN0aW9uLmRvY3NbY3Vyc29yLmN1cnNvcl9wb3NdO1xuICAgICAgICBjdXJzb3IuY3Vyc29yX3BvcysrO1xuICAgICAgICBcbiAgICAgICAgaWYgKGN1cnNvci5zZWxlY3Rvcl9jb21waWxlZC50ZXN0KF9kb2MpKSB7XG4gICAgICAgICAgICBpZiAoXy5pc05pbChjdXJzb3IuZGJfb2JqZWN0cykpIGN1cnNvci5kYl9vYmplY3RzID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIF9kb2MgPSBfbWFwRmllbGRzKF9kb2MsIGN1cnNvci5maWVsZHMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjdXJzb3IuZGJfb2JqZWN0cy5wdXNoKF9kb2MpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoanVzdE9uZSkge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmb3JjZSBzb3J0XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9kb2M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwoY3Vyc29yLmRiX29iamVjdHMpKSByZXR1cm4gbnVsbDtcbiAgICBcbiAgICBpZiAoIWN1cnNvci5zb3J0ZWQgJiYgaGFzU29ydGluZyhjdXJzb3IpKSBjdXJzb3Iuc29ydCgpO1xuICAgIFxuICAgIHZhciBpZHhGcm9tID0gY3Vyc29yLnNraXBWYWx1ZTtcbiAgICB2YXIgaWR4VG8gPSBjdXJzb3IubGltaXRWYWx1ZSAhPT0gLTEgPyAoY3Vyc29yLmxpbWl0VmFsdWUgKyBpZHhGcm9tKSA6IGN1cnNvci5kYl9vYmplY3RzLmxlbmd0aDtcbiAgICBcbiAgICByZXR1cm4gY3Vyc29yLmRiX29iamVjdHMuc2xpY2UoaWR4RnJvbSwgaWR4VG8pO1xuICAgIFxufTtcblxuLyoqXG4gKiBPYnRhaW5zIHRoZSB0b3RhbCBvZiBkb2N1bWVudHMgb2YgdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNjb3VudFxuICogXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgdG90YWwgb2YgZG9jdW1lbnRzIGluIHRoZSBjdXJzb3JcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZldGNoQWxsKCkubGVuZ3RoO1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIGEgc29ydGluZyBvbiB0aGUgY3Vyc29yXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI3NvcnRcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBzcGVjIC0gVGhlIHNvcnRpbmcgc3BlY2lmaWNhdGlvblxuICogXG4gKiBAcmV0dXJucyB7Q3Vyc29yfSBUaGlzIGluc3RhbmNlIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICovXG5DdXJzb3IucHJvdG90eXBlLnNvcnQgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgdmFyIF9zb3J0ID0gdGhpcy5zb3J0X2NvbXBpbGVkIHx8IG51bGw7XG4gICAgXG4gICAgaWYgKHNwZWMpIHtcbiAgICAgICAgX3NvcnQgPSBuZXcgU2VsZWN0b3Ioc3BlYywgU2VsZWN0b3IuU09SVF9TRUxFQ1RPUik7XG4gICAgfVxuICAgIFxuICAgIGlmIChfc29ydCkge1xuICAgICAgICBpZiAoc3BlYykge1xuICAgICAgICAgICAgdGhpcy5zb3J0VmFsdWUgPSBzcGVjO1xuICAgICAgICAgICAgdGhpcy5zb3J0X2NvbXBpbGVkID0gX3NvcnQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJZiBubyBzcGVjLCBkbyBzb3J0XG4gICAgICAgICAgICBpZiAoIV8uaXNOaWwodGhpcy5kYl9vYmplY3RzKSAmJiBfLmlzQXJyYXkodGhpcy5kYl9vYmplY3RzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGJfb2JqZWN0cyA9IHRoaXMuZGJfb2JqZWN0cy5zb3J0KF9zb3J0KTtcbiAgICAgICAgICAgICAgICB0aGlzLnNvcnRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgbnVtYmVyIG9mIGRvY3VtZW50IHRvIHNraXAgd2hlbiBmZXRjaGluZyB0aGUgY3Vyc29yXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI3NraXBcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHNraXAgLSBUaGUgbnVtYmVyIG9mIGRvY3VtZW50cyB0byBza2lwXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uKHNraXApIHtcbiAgICBpZiAoXy5pc05pbChza2lwKSB8fCBfLmlzTmFOKHNraXApKSB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHBhc3MgYSBudW1iZXJcIik7XG4gICAgXG4gICAgdGhpcy5za2lwVmFsdWUgPSBza2lwO1xuICAgIFxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIG1heCBudW1iZXIgb2YgZG9jdW1lbnQgdG8gZmV0Y2hcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjbGltaXRcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IGxpbWl0IC0gVGhlIG1heCBudW1iZXIgb2YgZG9jdW1lbnRzXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUubGltaXQgPSBmdW5jdGlvbihsaW1pdCkge1xuICAgIGlmIChfLmlzTmlsKGxpbWl0KSB8fCBfLmlzTmFOKGxpbWl0KSkgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwYXNzIGEgbnVtYmVyXCIpO1xuICAgIFxuICAgIHRoaXMubGltaXRWYWx1ZSA9IGxpbWl0O1xuICAgIFxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSBjdXJzb3IgaGFzIGEgc29ydGluZyBkZWZpbmVkXG4gKiBcbiAqIEBtZXRob2QgaGFzU29ydGluZ1xuICogQHByaXZhdGVcbiAqIFxuICogQHBhcmFtIHtDdXJzb3J9IGN1cnNvciAtIFRoZSBjdXJzb3JcbiAqIFxuICogQHJldHVybnMge0Jvb2xlYW59IFdoZXRoZXIgdGhlIGN1cnNvciBoYXMgc29ydGluZyBvciBub3RcbiAqL1xudmFyIGhhc1NvcnRpbmcgPSBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICBpZiAoXy5pc05pbChjdXJzb3Iuc29ydFZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICAgIFxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5iYXRjaFNpemUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb250cm9scyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBNb25nb0RCIHdpbGwgcmV0dXJuIHRvIHRoZSBjbGllbnQgaW4gYSBzaW5nbGUgbmV0d29yayBtZXNzYWdlLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQ2xvc2UgYSBjdXJzb3IgYW5kIGZyZWUgYXNzb2NpYXRlZCBzZXJ2ZXIgcmVzb3VyY2VzLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmNvbW1lbnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBBdHRhY2hlcyBhIGNvbW1lbnQgdG8gdGhlIHF1ZXJ5IHRvIGFsbG93IGZvciB0cmFjZWFiaWxpdHkgaW4gdGhlIGxvZ3MgYW5kIHRoZSBzeXN0ZW0ucHJvZmlsZSBjb2xsZWN0aW9uLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmV4cGxhaW4gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBSZXBvcnRzIG9uIHRoZSBxdWVyeSBleGVjdXRpb24gcGxhbiBmb3IgYSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuaGludCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEZvcmNlcyBNb25nb0RCIHRvIHVzZSBhIHNwZWNpZmljIGluZGV4IGZvciBhIHF1ZXJ5LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLml0Y291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb21wdXRlcyB0aGUgdG90YWwgbnVtYmVyIG9mIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yIGNsaWVudC1zaWRlIGJ5IGZldGNoaW5nIGFuZCBpdGVyYXRpbmcgdGhlIHJlc3VsdCBzZXQuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWF4U2NhbiA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyB0aGUgbWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gc2NhbjsgZG9jdW1lbnRzIGZvciBjb2xsZWN0aW9uIHNjYW5zLCBrZXlzIGZvciBpbmRleCBzY2Fucy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5tYXhUaW1lTVMgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgYSBjdW11bGF0aXZlIHRpbWUgbGltaXQgaW4gbWlsbGlzZWNvbmRzIGZvciBwcm9jZXNzaW5nIG9wZXJhdGlvbnMgb24gYSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWF4ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGFuIGV4Y2x1c2l2ZSB1cHBlciBpbmRleCBib3VuZCBmb3IgYSBjdXJzb3IuIEZvciB1c2Ugd2l0aCBjdXJzb3IuaGludCgpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWluID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGFuIGluY2x1c2l2ZSBsb3dlciBpbmRleCBib3VuZCBmb3IgYSBjdXJzb3IuIEZvciB1c2Ugd2l0aCBjdXJzb3IuaGludCgpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubm9DdXJzb3JUaW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gSW5zdHJ1Y3RzIHRoZSBzZXJ2ZXIgdG8gYXZvaWQgY2xvc2luZyBhIGN1cnNvciBhdXRvbWF0aWNhbGx5IGFmdGVyIGEgcGVyaW9kIG9mIGluYWN0aXZpdHkuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUub2Jqc0xlZnRJbkJhdGNoID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUmV0dXJucyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBsZWZ0IGluIHRoZSBjdXJyZW50IGN1cnNvciBiYXRjaC5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5wcmV0dHkgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb25maWd1cmVzIHRoZSBjdXJzb3IgdG8gZGlzcGxheSByZXN1bHRzIGluIGFuIGVhc3ktdG8tcmVhZCBmb3JtYXQuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucmVhZENvbmNlcm4gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgYSByZWFkIGNvbmNlcm4gZm9yIGEgZmluZCgpIG9wZXJhdGlvbi5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZWFkUHJlZiA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyBhIHJlYWQgcHJlZmVyZW5jZSB0byBhIGN1cnNvciB0byBjb250cm9sIGhvdyB0aGUgY2xpZW50IGRpcmVjdHMgcXVlcmllcyB0byBhIHJlcGxpY2Egc2V0LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLnJldHVybktleSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIE1vZGlmaWVzIHRoZSBjdXJzb3IgdG8gcmV0dXJuIGluZGV4IGtleXMgcmF0aGVyIHRoYW4gdGhlIGRvY3VtZW50cy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zaG93UmVjb3JkSWQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBBZGRzIGFuIGludGVybmFsIHN0b3JhZ2UgZW5naW5lIElEIGZpZWxkIHRvIGVhY2ggZG9jdW1lbnQgcmV0dXJuZWQgYnkgdGhlIGN1cnNvci5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUmV0dXJucyBhIGNvdW50IG9mIHRoZSBkb2N1bWVudHMgaW4gdGhlIGN1cnNvciBhZnRlciBhcHBseWluZyBza2lwKCkgYW5kIGxpbWl0KCkgbWV0aG9kcy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zbmFwc2hvdCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEZvcmNlcyB0aGUgY3Vyc29yIHRvIHVzZSB0aGUgaW5kZXggb24gdGhlIF9pZCBmaWVsZC4gRW5zdXJlcyB0aGF0IHRoZSBjdXJzb3IgcmV0dXJucyBlYWNoIGRvY3VtZW50LCBcbiAgICAvLyB3aXRoIHJlZ2FyZHMgdG8gdGhlIHZhbHVlIG9mIHRoZSBfaWQgZmllbGQsIG9ubHkgb25jZS5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS50YWlsYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIE1hcmtzIHRoZSBjdXJzb3IgYXMgdGFpbGFibGUuIE9ubHkgdmFsaWQgZm9yIGN1cnNvcnMgb3ZlciBjYXBwZWQgY29sbGVjdGlvbnMuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFJldHVybnMgYW4gYXJyYXkgdGhhdCBjb250YWlucyBhbGwgZG9jdW1lbnRzIHJldHVybmVkIGJ5IHRoZSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ3Vyc29yOyJdfQ==
