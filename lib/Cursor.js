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
 * @param {Array} documents - The list of documents
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object|Array|String} [fields={}] - The fields of the document to show
 * @param {Object} [options] - Database object
 * 
 * @param {Object} [options.pkFactory=null] - Object overriding the basic "ObjectId" primary key generation.
 * 
 */

var Cursor = function Cursor(documents, selection, fields) {
    var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    _classCallCheck(this, Cursor);

    this.documents = documents;
    this.selector = selection;
    this.skipValue = options.skip || 0;
    this.limitValue = options.limit || 15;
    this.sortValue = options.sort || null;
    this.sorted = false;

    logger = Logger.instance;

    /** ADD IDX **/
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

    /** ADD IDX **/

    this.fetch_mode = Cursor.COLSCAN || Cursor.IDXSCAN;
    this.indexex = null; //findUsableIndexes();

    // if (cursor.fetch_mode === Cursor.COLSCAN) {
    //     // COLSCAN, wi will iterate over all documents
    //     docs = _.cloneDeep(cursor.collection.docs);
    // } else if (cursor.fetch_mode === Cursor.IDXSCAN) {
    //     // IDXSCAN, wi will iterate over all needed documents
    //     for (let i = 0; i < cursor.indexes.length; i++) {
    //         let index = cursor.indexes[i];

    //         for (let i = index.start; i < index.end; i++) {
    //             let idx_id = cursor.collection.getIndex(index.name)[i];

    //             docs.push(cursor.collection.docs[idx_id]);
    //         }
    //     }
    // }

    this.fields = new Selector(fields, Selector.FIELD_SELECTOR);

    this.sort_compiled = new Selector(this.sortValue, Selector.SORT_SELECTOR);

    this.db_objects = null;
    this.cursor_pos = 0;
};

Cursor.COLSCAN = 'colscan';
Cursor.IDXSCAN = 'idxscan';

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
    return this.cursor_pos < this.documents.length;
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

    var docs = [];

    if (cursor.fetch_mode === Cursor.COLSCAN) {
        // COLSCAN, wi will iterate over all documents
        docs = _.cloneDeep(cursor.documents);
    } else if (cursor.fetch_mode === Cursor.IDXSCAN) {
        // IDXSCAN, wi will iterate over all needed documents
        for (var i = 0; i < cursor.indexes.length; i++) {
            var index = cursor.indexes[i];

            for (var _i2 = index.start; _i2 < index.end; _i2++) {
                // let idx_id = cursor.collection.getIndex(index.name)[i];
                var idx_id = index.index[_i2];

                docs.push(cursor.documents[idx_id]);
            }
        }
    }

    // if (cursor.selector_id) {
    //     if (_.hasIn(cursor.collection.doc_indexes, _.toString(cursor.selector_id))) {
    //         let idx = cursor.collection.doc_indexes[_.toString(cursor.selector_id)];

    //         return _mapFields(cursor.collection.docs[idx], cursor.fields);
    //     } else {
    //         if (justOne) {
    //             return null;
    //         } else {
    //             return [];
    //         }
    //     }
    // }

    // TODO add warning when sort/skip/limit and fetching one
    // TODO add warning when skip/limit without order
    // TODO index
    while (cursor.cursor_pos < docs.length) {
        var _doc = docs[cursor.cursor_pos];
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
 * Set the sorting of the cursor
 * 
 * @method Cursor#sort
 * 
 * @param {Object|Array|String} spec - The sorting specification
 * 
 * @returns {Cursor} This instance so it can be chained with other methods
 */
Cursor.prototype.setSorting = function (spec) {
    if (_.isNil(spec)) logger.throw("You need to specify a sorting");

    if (spec) {
        this.sortValue = spec;
        this.sort_compiled = new Selector(spec, Selector.SORT_SELECTOR);
    }

    return this;
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
        if (!_.isNil(this.db_objects) && _.isArray(this.db_objects)) {
            this.db_objects = this.db_objects.sort(_sort);
            this.sorted = true;
        } else {
            this.setSorting(spec);
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
//# sourceMappingURL=data:application/json;base64,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SSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLE9BQWpCLEdBQTJCLFlBQVc7O0FBRWxDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLE9BQWpCLEdBQTJCLFlBQVc7O0FBRWxDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLElBQWpCLEdBQXdCLFlBQVc7O0FBRS9CLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLE9BQWpCLEdBQTJCLFlBQVc7O0FBRWxDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLE9BQWpCLEdBQTJCLFlBQVc7O0FBRWxDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLFNBQWpCLEdBQTZCLFlBQVc7O0FBRXBDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLEdBQWpCLEdBQXVCLFlBQVc7O0FBRTlCLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLEdBQWpCLEdBQXVCLFlBQVc7O0FBRTlCLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLGVBQWpCLEdBQW1DLFlBQVc7O0FBRTFDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLGVBQWpCLEdBQW1DLFlBQVc7O0FBRTFDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLE1BQWpCLEdBQTBCLFlBQVc7O0FBRWpDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLFdBQWpCLEdBQStCLFlBQVc7O0FBRXRDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLFFBQWpCLEdBQTRCLFlBQVc7O0FBRW5DLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLFNBQWpCLEdBQTZCLFlBQVc7O0FBRXBDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLFlBQWpCLEdBQWdDLFlBQVc7O0FBRXZDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLElBQWpCLEdBQXdCLFlBQVc7O0FBRS9CLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLFFBQWpCLEdBQTRCLFlBQVc7OztBQUduQyxVQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDSCxDQUpEOzs7OztBQVNBLE9BQU8sU0FBUCxDQUFpQixRQUFqQixHQUE0QixZQUFXOztBQUVuQyxVQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDSCxDQUhEOzs7OztBQVFBLE9BQU8sU0FBUCxDQUFpQixPQUFqQixHQUEyQixZQUFXOztBQUVsQyxVQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDSCxDQUhEOztBQUtBLE9BQU8sT0FBUCxHQUFpQixNQUFqQiIsImZpbGUiOiJDdXJzb3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIEN1cnNvci5qcyAtIGJhc2VkIG9uIE1vbmdsbyNDdXJzb3IgKHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vTW9uZ2xvfSkgYnkgQ2hyaXN0aWFuIFN1bGxpdmFuIDxjc0BldWZvcmljLmNvPiB8IENvcHlyaWdodCAoYykgMjAxMlxuICogQHZlcnNpb24gMS4wLjBcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlZFxuICovXG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKFwianN3LWxvZ2dlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKSxcbiAgICBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKTtcbiAgICBcbnZhciBsb2dnZXIgPSBudWxsO1xuXG4vKipcbiAqIEN1cnNvclxuICogXG4gKiBAbW9kdWxlIEN1cnNvclxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2luY2UgMC4wLjFcbiAqIFxuICogQGNsYXNzZGVzYyBDdXJzb3IgY2xhc3MgdGhhdCBtYXBzIGEgTW9uZ29EQi1saWtlIGN1cnNvclxuICogXG4gKiBAcGFyYW0ge01vbmdvUG9ydGFibGV9IGRiIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBAcGFyYW0ge0FycmF5fSBkb2N1bWVudHMgLSBUaGUgbGlzdCBvZiBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gKiBcbiAqL1xuY2xhc3MgQ3Vyc29yIHtcbiAgICBjb25zdHJ1Y3Rvcihkb2N1bWVudHMsIHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgdGhpcy5kb2N1bWVudHMgPSBkb2N1bWVudHM7XG4gICAgICAgIHRoaXMuc2VsZWN0b3IgPSBzZWxlY3Rpb247XG4gICAgICAgIHRoaXMuc2tpcFZhbHVlID0gb3B0aW9ucy5za2lwIHx8IDA7XG4gICAgICAgIHRoaXMubGltaXRWYWx1ZSA9IG9wdGlvbnMubGltaXQgfHwgMTU7XG4gICAgICAgIHRoaXMuc29ydFZhbHVlID0gb3B0aW9ucy5zb3J0IHx8IG51bGw7XG4gICAgICAgIHRoaXMuc29ydGVkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgXG4gICAgICAgIC8qKiBBREQgSURYICoqL1xuICAgICAgICBpZiAoU2VsZWN0b3IuaXNTZWxlY3RvckNvbXBpbGVkKHRoaXMuc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkID0gdGhpcy5zZWxlY3RvcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0b3JfY29tcGlsZWQgPSBuZXcgU2VsZWN0b3IodGhpcy5zZWxlY3RvciwgU2VsZWN0b3IuTUFUQ0hfU0VMRUNUT1IpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuY2xhdXNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuY2xhdXNlc1tpXS5rZXkgPT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rvcl9pZCA9IHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuY2xhdXNlc1tpXS52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkLmNsYXVzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdG9yX2NvbXBpbGVkLmNsYXVzZXNbaV0ua2V5ID09PSAnX2lkJykge1xuICAgICAgICAgICAgICAgIHZhciBfdmFsID0gdGhpcy5zZWxlY3Rvcl9jb21waWxlZC5jbGF1c2VzW2ldLnZhbHVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChfLmlzU3RyaW5nKF92YWwpIHx8IF8uaXNOdW1iZXIoX3ZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rvcl9pZCA9IF92YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqIEFERCBJRFggKiovXG4gICAgICAgIFxuICAgICAgICB0aGlzLmZldGNoX21vZGUgPSBDdXJzb3IuQ09MU0NBTiB8fCBDdXJzb3IuSURYU0NBTjtcbiAgICAgICAgdGhpcy5pbmRleGV4ID0gbnVsbDsvL2ZpbmRVc2FibGVJbmRleGVzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBpZiAoY3Vyc29yLmZldGNoX21vZGUgPT09IEN1cnNvci5DT0xTQ0FOKSB7XG4gICAgICAgIC8vICAgICAvLyBDT0xTQ0FOLCB3aSB3aWxsIGl0ZXJhdGUgb3ZlciBhbGwgZG9jdW1lbnRzXG4gICAgICAgIC8vICAgICBkb2NzID0gXy5jbG9uZURlZXAoY3Vyc29yLmNvbGxlY3Rpb24uZG9jcyk7XG4gICAgICAgIC8vIH0gZWxzZSBpZiAoY3Vyc29yLmZldGNoX21vZGUgPT09IEN1cnNvci5JRFhTQ0FOKSB7XG4gICAgICAgIC8vICAgICAvLyBJRFhTQ0FOLCB3aSB3aWxsIGl0ZXJhdGUgb3ZlciBhbGwgbmVlZGVkIGRvY3VtZW50c1xuICAgICAgICAvLyAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjdXJzb3IuaW5kZXhlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyAgICAgICAgIGxldCBpbmRleCA9IGN1cnNvci5pbmRleGVzW2ldO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAvLyAgICAgICAgIGZvciAobGV0IGkgPSBpbmRleC5zdGFydDsgaSA8IGluZGV4LmVuZDsgaSsrKSB7XG4gICAgICAgIC8vICAgICAgICAgICAgIGxldCBpZHhfaWQgPSBjdXJzb3IuY29sbGVjdGlvbi5nZXRJbmRleChpbmRleC5uYW1lKVtpXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIC8vICAgICAgICAgICAgIGRvY3MucHVzaChjdXJzb3IuY29sbGVjdGlvbi5kb2NzW2lkeF9pZF0pO1xuICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5maWVsZHMgPSBuZXcgU2VsZWN0b3IoZmllbGRzLCBTZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNvcnRfY29tcGlsZWQgPSBuZXcgU2VsZWN0b3IodGhpcy5zb3J0VmFsdWUsIFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpO1xuICAgIFxuICAgICAgICB0aGlzLmRiX29iamVjdHMgPSBudWxsO1xuICAgICAgICB0aGlzLmN1cnNvcl9wb3MgPSAwO1xuICAgIH1cbn1cblxuQ3Vyc29yLkNPTFNDQU4gPSAnY29sc2Nhbic7XG5DdXJzb3IuSURYU0NBTiA9ICdpZHhzY2FuJztcblxuLyoqXG4gKiBNb3ZlcyBhIGN1cnNvciB0byB0aGUgYmVnaW5pbmdcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjcmV3aW5kXG4gKi9cbkN1cnNvci5wcm90b3R5cGUucmV3aW5kID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5kYl9vYmplY3RzID0gbnVsbDtcbiAgICB0aGlzLmN1cnNvcl9wb3MgPSAwO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyBvdmVyIHRoZSBjdXJzb3IsIGNhbGxpbmcgYSBjYWxsYmFjayBmdW5jdGlvblxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNmb3JFYWNoXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBmb3IgZWFjaCBkb2N1bWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGxldCBkb2NzID0gdGhpcy5mZXRjaEFsbCgpO1xuICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZG9jcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjYWxsYmFjayhkb2NzW2ldKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIG92ZXIgdGhlIGN1cnNvciwgcmV0dXJuaW5nIGEgbmV3IGFycmF5IHdpdGggdGhlIGRvY3VtZW50cyBhZmZlY3RlZCBieSB0aGUgY2FsbGJhY2sgZnVuY3Rpb25cbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjbWFwXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBmb3IgZWFjaCBkb2N1bWVudFxuICogXG4gKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBkb2N1bWVudHMgYWZ0ZXIgYmVpbmcgYWZmZWN0ZWQgd2l0aCB0aGUgY2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciByZXMgPSBbXTtcblxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHJlcy5wdXNoKGNhbGxiYWNrKGRvYykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlcztcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBjdXJzb3IgaGFzIG9uZSBkb2N1bWVudCB0byBiZSBmZXRjaGVkXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2hhc05leHRcbiAqIFxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgd2UgY2FuIGZldGNoIG9uZSBtb3JlIGRvY3VtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuaGFzTmV4dCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAodGhpcy5jdXJzb3JfcG9zIDwgdGhpcy5kb2N1bWVudHMubGVuZ3RoKTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBDdXJzb3IjZmV0Y2hPbmV9XG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI25leHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZmV0Y2hPbmUoKTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBDdXJzb3IjZmV0Y2hBbGx9XG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2ZldGNoXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZmV0Y2ggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5mZXRjaEFsbCgpO1xufTtcblxuLyoqXG4gKiBGZXRjaCBhbGwgZG9jdW1lbnRzIGluIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjZmV0Y2hBbGxcbiAqIFxuICogQHJldHVybnMge0FycmF5fSBBbGwgdGhlIGRvY3VtZW50cyBjb250YWluZWQgaW4gdGhlIGN1cnNvclxuICovXG5DdXJzb3IucHJvdG90eXBlLmZldGNoQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF9nZXREb2N1bWVudHModGhpcywgZmFsc2UpIHx8IFtdO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIG5leHQgZG9jdW1lbnQgaW4gdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNmZXRjaE9uZVxuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgbmV4dCBkb2N1bWVudCBpbiB0aGUgY3Vyc29yXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZmV0Y2hPbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gX2dldERvY3VtZW50cyh0aGlzLCB0cnVlKTtcbn07XG5cbnZhciBfbWFwRmllbGRzID0gZnVuY3Rpb24oZG9jLCBmaWVsZHMpIHtcbiAgICB2YXIgX2RvYyA9IF8uY2xvbmVEZWVwKGRvYyk7XG5cbiAgICBpZiAoIV8uaXNOaWwoZmllbGRzKSAmJiBfLmlzUGxhaW5PYmplY3QoZmllbGRzKSAmJiAhXy5pc0VxdWFsKGZpZWxkcywge30pKSB7XG4gICAgICAgIHZhciBzaG93SWQgPSB0cnVlLFxuICAgICAgICAgICAgc2hvd2luZyA9IG51bGw7XG5cbiAgICAgICAgLy8gV2hldGhlciBpZiB3ZSBzaG93aW5nIHRoZSBfaWQgZmllbGRcbiAgICAgICAgaWYgKF8uaGFzSW4oZmllbGRzLCAnX2lkJykgJiYgZmllbGRzLl9pZCA9PT0gLTEpIHtcbiAgICAgICAgICAgIHNob3dJZCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRtcCA9IG51bGw7XG5cbiAgICAgICAgZm9yICh2YXIgZmllbGQgaW4gZmllbGRzKSB7XG4gICAgICAgICAgICAvLyBXaGV0aGVyIGlmIHdlIGFyZSBzaG93aW5nIG9yIGhpZGRpbmcgZmllbGRzXG4gICAgICAgICAgICBpZiAoZmllbGQgIT09ICdfaWQnICYmIHNob3dpbmcgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzaG93aW5nID0gZmllbGRzW2ZpZWxkXSA9PT0gMSA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNob3dpbmcgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0bXAgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNob3dpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRtcCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG1wID0gXy5jbG9uZURlZXAoZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIG9yIHJlbW92ZSB0aGUgZmllbGRcbiAgICAgICAgICAgICAgICBpZiAoc2hvd2luZykge1xuICAgICAgICAgICAgICAgICAgICB0bXBbZmllbGRdID0gZG9jW2ZpZWxkXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdG1wW2ZpZWxkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgb3IgcmVtb3ZlIHRoZSBfaWQgZmllbGRcbiAgICAgICAgaWYgKHNob3dJZCkge1xuICAgICAgICAgICAgdG1wLl9pZCA9IGRvYy5faWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdG1wLl9pZDtcbiAgICAgICAgfVxuXG4gICAgICAgIF9kb2MgPSB0bXA7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9kb2M7XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyBvbmUgb3IgYWxsIHRoZSBkb2N1bWVudHMgaW4gdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIF9nZXREb2N1bWVudHNcbiAqIEBwcml2YXRlXG4gKiBcbiAqIEBwYXJhbSB7Q3Vyc29yfSBjdXJzb3IgLSBUaGUgY3Vyc29yIHdpdGggdGhlIGRvY3VtZW50c1xuICogQHBhcmFtIHtCb29sZWFufSBbanVzdE9uZT1mYWxzZV0gLSBXaGV0aGVyIGl0IHJldHJpZXZlcyBvbmUgb3IgYWxsIHRoZSBkb2N1bWVudHNcbiAqIFxuICogQHJldHVybnMge0FycmF5fE9iamVjdH0gSWYgW2p1c3RPbmU9dHJ1ZV0gcmV0dXJucyB0aGUgbmV4dCBkb2N1bWVudCwgb3RoZXJ3aXNlIHJldHVybnMgYWxsIHRoZSBkb2N1bWVudHNcbiAqL1xudmFyIF9nZXREb2N1bWVudHMgPSBmdW5jdGlvbihjdXJzb3IsIGp1c3RPbmUgPSBmYWxzZSkge1xuICAgIHZhciBkb2NzID0gW107XG4gICAgXG4gICAgaWYgKGN1cnNvci5mZXRjaF9tb2RlID09PSBDdXJzb3IuQ09MU0NBTikge1xuICAgICAgICAvLyBDT0xTQ0FOLCB3aSB3aWxsIGl0ZXJhdGUgb3ZlciBhbGwgZG9jdW1lbnRzXG4gICAgICAgIGRvY3MgPSBfLmNsb25lRGVlcChjdXJzb3IuZG9jdW1lbnRzKTtcbiAgICB9IGVsc2UgaWYgKGN1cnNvci5mZXRjaF9tb2RlID09PSBDdXJzb3IuSURYU0NBTikge1xuICAgICAgICAvLyBJRFhTQ0FOLCB3aSB3aWxsIGl0ZXJhdGUgb3ZlciBhbGwgbmVlZGVkIGRvY3VtZW50c1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN1cnNvci5pbmRleGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgaW5kZXggPSBjdXJzb3IuaW5kZXhlc1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4LnN0YXJ0OyBpIDwgaW5kZXguZW5kOyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyBsZXQgaWR4X2lkID0gY3Vyc29yLmNvbGxlY3Rpb24uZ2V0SW5kZXgoaW5kZXgubmFtZSlbaV07XG4gICAgICAgICAgICAgICAgbGV0IGlkeF9pZCA9IGluZGV4LmluZGV4W2ldO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGRvY3MucHVzaChjdXJzb3IuZG9jdW1lbnRzW2lkeF9pZF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIGlmIChjdXJzb3Iuc2VsZWN0b3JfaWQpIHtcbiAgICAvLyAgICAgaWYgKF8uaGFzSW4oY3Vyc29yLmNvbGxlY3Rpb24uZG9jX2luZGV4ZXMsIF8udG9TdHJpbmcoY3Vyc29yLnNlbGVjdG9yX2lkKSkpIHtcbiAgICAvLyAgICAgICAgIGxldCBpZHggPSBjdXJzb3IuY29sbGVjdGlvbi5kb2NfaW5kZXhlc1tfLnRvU3RyaW5nKGN1cnNvci5zZWxlY3Rvcl9pZCldO1xuICAgICAgICAgICAgXG4gICAgLy8gICAgICAgICByZXR1cm4gX21hcEZpZWxkcyhjdXJzb3IuY29sbGVjdGlvbi5kb2NzW2lkeF0sIGN1cnNvci5maWVsZHMpO1xuICAgIC8vICAgICB9IGVsc2Uge1xuICAgIC8vICAgICAgICAgaWYgKGp1c3RPbmUpIHtcbiAgICAvLyAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAvLyAgICAgICAgIH0gZWxzZSB7XG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgIC8vICAgICAgICAgfVxuICAgIC8vICAgICB9XG4gICAgLy8gfVxuICAgIFxuICAgIC8vIFRPRE8gYWRkIHdhcm5pbmcgd2hlbiBzb3J0L3NraXAvbGltaXQgYW5kIGZldGNoaW5nIG9uZVxuICAgIC8vIFRPRE8gYWRkIHdhcm5pbmcgd2hlbiBza2lwL2xpbWl0IHdpdGhvdXQgb3JkZXJcbiAgICAvLyBUT0RPIGluZGV4XG4gICAgd2hpbGUgKGN1cnNvci5jdXJzb3JfcG9zIDwgZG9jcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIF9kb2MgPSBkb2NzW2N1cnNvci5jdXJzb3JfcG9zXTtcbiAgICAgICAgY3Vyc29yLmN1cnNvcl9wb3MrKztcbiAgICAgICAgXG4gICAgICAgIGlmIChjdXJzb3Iuc2VsZWN0b3JfY29tcGlsZWQudGVzdChfZG9jKSkge1xuICAgICAgICAgICAgaWYgKF8uaXNOaWwoY3Vyc29yLmRiX29iamVjdHMpKSBjdXJzb3IuZGJfb2JqZWN0cyA9IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBfZG9jID0gX21hcEZpZWxkcyhfZG9jLCBjdXJzb3IuZmllbGRzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY3Vyc29yLmRiX29iamVjdHMucHVzaChfZG9jKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGp1c3RPbmUpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZm9yY2Ugc29ydFxuICAgICAgICAgICAgICAgIHJldHVybiBfZG9jO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKGN1cnNvci5kYl9vYmplY3RzKSkgcmV0dXJuIG51bGw7XG4gICAgXG4gICAgaWYgKCFjdXJzb3Iuc29ydGVkICYmIGhhc1NvcnRpbmcoY3Vyc29yKSkgY3Vyc29yLnNvcnQoKTtcbiAgICBcbiAgICB2YXIgaWR4RnJvbSA9IGN1cnNvci5za2lwVmFsdWU7XG4gICAgdmFyIGlkeFRvID0gY3Vyc29yLmxpbWl0VmFsdWUgIT09IC0xID8gKGN1cnNvci5saW1pdFZhbHVlICsgaWR4RnJvbSkgOiBjdXJzb3IuZGJfb2JqZWN0cy5sZW5ndGg7XG4gICAgXG4gICAgcmV0dXJuIGN1cnNvci5kYl9vYmplY3RzLnNsaWNlKGlkeEZyb20sIGlkeFRvKTtcbiAgICBcbn07XG5cbi8qKlxuICogT2J0YWlucyB0aGUgdG90YWwgb2YgZG9jdW1lbnRzIG9mIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjY291bnRcbiAqIFxuICogQHJldHVybnMge051bWJlcn0gVGhlIHRvdGFsIG9mIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuY291bnQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5mZXRjaEFsbCgpLmxlbmd0aDtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBzb3J0aW5nIG9mIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBDdXJzb3Ijc29ydFxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IHNwZWMgLSBUaGUgc29ydGluZyBzcGVjaWZpY2F0aW9uXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2V0U29ydGluZyA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICBpZiAoXy5pc05pbChzcGVjKSkgbG9nZ2VyLnRocm93KFwiWW91IG5lZWQgdG8gc3BlY2lmeSBhIHNvcnRpbmdcIik7XG4gICAgXG4gICAgaWYgKHNwZWMpIHtcbiAgICAgICAgdGhpcy5zb3J0VmFsdWUgPSBzcGVjO1xuICAgICAgICB0aGlzLnNvcnRfY29tcGlsZWQgPSAobmV3IFNlbGVjdG9yKHNwZWMsIFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgYSBzb3J0aW5nIG9uIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBDdXJzb3Ijc29ydFxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IHNwZWMgLSBUaGUgc29ydGluZyBzcGVjaWZpY2F0aW9uXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc29ydCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICB2YXIgX3NvcnQgPSB0aGlzLnNvcnRfY29tcGlsZWQgfHwgbnVsbDtcbiAgICBcbiAgICBpZiAoc3BlYykge1xuICAgICAgICBfc29ydCA9IG5ldyBTZWxlY3RvcihzcGVjLCBTZWxlY3Rvci5TT1JUX1NFTEVDVE9SKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF9zb3J0KSB7XG4gICAgICAgIGlmICghXy5pc05pbCh0aGlzLmRiX29iamVjdHMpICYmIF8uaXNBcnJheSh0aGlzLmRiX29iamVjdHMpKSB7XG4gICAgICAgICAgICB0aGlzLmRiX29iamVjdHMgPSB0aGlzLmRiX29iamVjdHMuc29ydChfc29ydCk7XG4gICAgICAgICAgICB0aGlzLnNvcnRlZCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldFNvcnRpbmcoc3BlYyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgbnVtYmVyIG9mIGRvY3VtZW50IHRvIHNraXAgd2hlbiBmZXRjaGluZyB0aGUgY3Vyc29yXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI3NraXBcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHNraXAgLSBUaGUgbnVtYmVyIG9mIGRvY3VtZW50cyB0byBza2lwXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uKHNraXApIHtcbiAgICBpZiAoXy5pc05pbChza2lwKSB8fCBfLmlzTmFOKHNraXApKSB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHBhc3MgYSBudW1iZXJcIik7XG4gICAgXG4gICAgdGhpcy5za2lwVmFsdWUgPSBza2lwO1xuICAgIFxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIG1heCBudW1iZXIgb2YgZG9jdW1lbnQgdG8gZmV0Y2hcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjbGltaXRcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IGxpbWl0IC0gVGhlIG1heCBudW1iZXIgb2YgZG9jdW1lbnRzXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUubGltaXQgPSBmdW5jdGlvbihsaW1pdCkge1xuICAgIGlmIChfLmlzTmlsKGxpbWl0KSB8fCBfLmlzTmFOKGxpbWl0KSkgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwYXNzIGEgbnVtYmVyXCIpO1xuICAgIFxuICAgIHRoaXMubGltaXRWYWx1ZSA9IGxpbWl0O1xuICAgIFxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSBjdXJzb3IgaGFzIGEgc29ydGluZyBkZWZpbmVkXG4gKiBcbiAqIEBtZXRob2QgaGFzU29ydGluZ1xuICogQHByaXZhdGVcbiAqIFxuICogQHBhcmFtIHtDdXJzb3J9IGN1cnNvciAtIFRoZSBjdXJzb3JcbiAqIFxuICogQHJldHVybnMge0Jvb2xlYW59IFdoZXRoZXIgdGhlIGN1cnNvciBoYXMgc29ydGluZyBvciBub3RcbiAqL1xudmFyIGhhc1NvcnRpbmcgPSBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICBpZiAoXy5pc05pbChjdXJzb3Iuc29ydFZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICAgIFxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5iYXRjaFNpemUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb250cm9scyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBNb25nb0RCIHdpbGwgcmV0dXJuIHRvIHRoZSBjbGllbnQgaW4gYSBzaW5nbGUgbmV0d29yayBtZXNzYWdlLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQ2xvc2UgYSBjdXJzb3IgYW5kIGZyZWUgYXNzb2NpYXRlZCBzZXJ2ZXIgcmVzb3VyY2VzLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmNvbW1lbnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBBdHRhY2hlcyBhIGNvbW1lbnQgdG8gdGhlIHF1ZXJ5IHRvIGFsbG93IGZvciB0cmFjZWFiaWxpdHkgaW4gdGhlIGxvZ3MgYW5kIHRoZSBzeXN0ZW0ucHJvZmlsZSBjb2xsZWN0aW9uLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmV4cGxhaW4gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBSZXBvcnRzIG9uIHRoZSBxdWVyeSBleGVjdXRpb24gcGxhbiBmb3IgYSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuaGludCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEZvcmNlcyBNb25nb0RCIHRvIHVzZSBhIHNwZWNpZmljIGluZGV4IGZvciBhIHF1ZXJ5LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLml0Y291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb21wdXRlcyB0aGUgdG90YWwgbnVtYmVyIG9mIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yIGNsaWVudC1zaWRlIGJ5IGZldGNoaW5nIGFuZCBpdGVyYXRpbmcgdGhlIHJlc3VsdCBzZXQuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWF4U2NhbiA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyB0aGUgbWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gc2NhbjsgZG9jdW1lbnRzIGZvciBjb2xsZWN0aW9uIHNjYW5zLCBrZXlzIGZvciBpbmRleCBzY2Fucy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5tYXhUaW1lTVMgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgYSBjdW11bGF0aXZlIHRpbWUgbGltaXQgaW4gbWlsbGlzZWNvbmRzIGZvciBwcm9jZXNzaW5nIG9wZXJhdGlvbnMgb24gYSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWF4ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGFuIGV4Y2x1c2l2ZSB1cHBlciBpbmRleCBib3VuZCBmb3IgYSBjdXJzb3IuIEZvciB1c2Ugd2l0aCBjdXJzb3IuaGludCgpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWluID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGFuIGluY2x1c2l2ZSBsb3dlciBpbmRleCBib3VuZCBmb3IgYSBjdXJzb3IuIEZvciB1c2Ugd2l0aCBjdXJzb3IuaGludCgpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubm9DdXJzb3JUaW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gSW5zdHJ1Y3RzIHRoZSBzZXJ2ZXIgdG8gYXZvaWQgY2xvc2luZyBhIGN1cnNvciBhdXRvbWF0aWNhbGx5IGFmdGVyIGEgcGVyaW9kIG9mIGluYWN0aXZpdHkuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUub2Jqc0xlZnRJbkJhdGNoID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUmV0dXJucyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBsZWZ0IGluIHRoZSBjdXJyZW50IGN1cnNvciBiYXRjaC5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5wcmV0dHkgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb25maWd1cmVzIHRoZSBjdXJzb3IgdG8gZGlzcGxheSByZXN1bHRzIGluIGFuIGVhc3ktdG8tcmVhZCBmb3JtYXQuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucmVhZENvbmNlcm4gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgYSByZWFkIGNvbmNlcm4gZm9yIGEgZmluZCgpIG9wZXJhdGlvbi5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZWFkUHJlZiA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyBhIHJlYWQgcHJlZmVyZW5jZSB0byBhIGN1cnNvciB0byBjb250cm9sIGhvdyB0aGUgY2xpZW50IGRpcmVjdHMgcXVlcmllcyB0byBhIHJlcGxpY2Egc2V0LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLnJldHVybktleSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIE1vZGlmaWVzIHRoZSBjdXJzb3IgdG8gcmV0dXJuIGluZGV4IGtleXMgcmF0aGVyIHRoYW4gdGhlIGRvY3VtZW50cy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zaG93UmVjb3JkSWQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBBZGRzIGFuIGludGVybmFsIHN0b3JhZ2UgZW5naW5lIElEIGZpZWxkIHRvIGVhY2ggZG9jdW1lbnQgcmV0dXJuZWQgYnkgdGhlIGN1cnNvci5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUmV0dXJucyBhIGNvdW50IG9mIHRoZSBkb2N1bWVudHMgaW4gdGhlIGN1cnNvciBhZnRlciBhcHBseWluZyBza2lwKCkgYW5kIGxpbWl0KCkgbWV0aG9kcy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zbmFwc2hvdCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEZvcmNlcyB0aGUgY3Vyc29yIHRvIHVzZSB0aGUgaW5kZXggb24gdGhlIF9pZCBmaWVsZC4gRW5zdXJlcyB0aGF0IHRoZSBjdXJzb3IgcmV0dXJucyBlYWNoIGRvY3VtZW50LCBcbiAgICAvLyB3aXRoIHJlZ2FyZHMgdG8gdGhlIHZhbHVlIG9mIHRoZSBfaWQgZmllbGQsIG9ubHkgb25jZS5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS50YWlsYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIE1hcmtzIHRoZSBjdXJzb3IgYXMgdGFpbGFibGUuIE9ubHkgdmFsaWQgZm9yIGN1cnNvcnMgb3ZlciBjYXBwZWQgY29sbGVjdGlvbnMuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFJldHVybnMgYW4gYXJyYXkgdGhhdCBjb250YWlucyBhbGwgZG9jdW1lbnRzIHJldHVybmVkIGJ5IHRoZSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ3Vyc29yOyJdfQ==
