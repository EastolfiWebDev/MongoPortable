"use strict";

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
function Cursor(db, collection, selection, fields, options) {
    this.db = db;
    this.collection = collection;
    this.selector = selection;
    this.skipValue = options.skip;
    this.limitValue = options.limit;
    this.sortValue = options.sort || null;
    this.sorted = false;

    logger = Logger.instance;

    if (Selector.isSelectorCompiled(this.selector)) {
        this.selector_compiled = this.selector;
    } else {
        this.selector_compiled = new Selector(this.selector, Selector.MATCH_SELECTOR);
    }

    if (this.selector_compiled._id) {
        this.selector_id = this.selector_compiled._id;
    }

    this.fields = new Selector(fields, Selector.FIELD_SELECTOR);

    this.sort_compiled = new Selector(this.sortValue, Selector.SORT_SELECTOR);

    this.db_objects = null;
    this.cursor_pos = 0;
}

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
    return _getDocuments(this, false);
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
var _getDocuments = function _getDocuments(cursor, justOne) {
    if (cursor.selector_id && _.hasIn(cursor.collection.doc_indexes, cursor.selector_id)) {
        var idx = cursor.collection.doc_indexes[_.toString(cursor.selector_id)];

        return cursor.collection.docs[idx];
    }

    if (_.isNil(justOne)) {
        justOne = false;
    }

    // TODO add warning when sort/skip/limit and fetching one
    // TODO add warning when skip/limit without order
    // TODO index
    while (cursor.cursor_pos < cursor.collection.docs.length) {
        var _doc = cursor.collection.docs[cursor.cursor_pos];
        cursor.cursor_pos++;

        if (cursor.selector_compiled.test(_doc)) {
            if (_.isNil(cursor.db_objects)) cursor.db_objects = [];

            if (!_.isNil(cursor.fields) && _.isPlainObject(cursor.fields) && !_.isEqual(cursor.fields, {})) {
                var tmp = {};

                if (!_.hasIn(cursor.fields, '_id') || cursor.fields._id !== -1) {
                    tmp._id = _doc._id;
                }

                for (var field in cursor.fields) {
                    if (cursor.fields[field] !== -1) {
                        tmp[field] = _doc[field];
                    }
                }

                _doc = tmp;
            }

            cursor.db_objects.push(_doc);

            if (justOne) {
                // Add force sort
                return _doc;
            }
        }
    }

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
            if (_.isNil(this.db_objects) || !_.isArray(this.db_objects)) {
                throw new Error("You need to fetch the data in order to sort it");
            } else {
                this.db_objects = this.db_objects.sort(_sort);
                this.sorted = true;
            }
        }
    } else {
        throw new Error("You need to specify a sort order");
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

    if (_.isNil(cursor.sort_compiled)) {
        return false;
    }

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
//# sourceMappingURL=data:application/json;base64,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LEdBQTZCLFlBQVc7O0FBRXBDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLEdBQWpCLEdBQXVCLFlBQVc7O0FBRTlCLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLEdBQWpCLEdBQXVCLFlBQVc7O0FBRTlCLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLGVBQWpCLEdBQW1DLFlBQVc7O0FBRTFDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLGVBQWpCLEdBQW1DLFlBQVc7O0FBRTFDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLE1BQWpCLEdBQTBCLFlBQVc7O0FBRWpDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLFdBQWpCLEdBQStCLFlBQVc7O0FBRXRDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLFFBQWpCLEdBQTRCLFlBQVc7O0FBRW5DLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLFNBQWpCLEdBQTZCLFlBQVc7O0FBRXBDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLFlBQWpCLEdBQWdDLFlBQVc7O0FBRXZDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLElBQWpCLEdBQXdCLFlBQVc7O0FBRS9CLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLFFBQWpCLEdBQTRCLFlBQVc7OztBQUduQyxVQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDSCxDQUpEOzs7OztBQVNBLE9BQU8sU0FBUCxDQUFpQixRQUFqQixHQUE0QixZQUFXOztBQUVuQyxVQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDSCxDQUhEOzs7OztBQVFBLE9BQU8sU0FBUCxDQUFpQixPQUFqQixHQUEyQixZQUFXOztBQUVsQyxVQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDSCxDQUhEOztBQUtBLE9BQU8sT0FBUCxHQUFpQixNQUFqQiIsImZpbGUiOiJDdXJzb3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIEN1cnNvci5qcyAtIGJhc2VkIG9uIE1vbmdsbyNDdXJzb3IgKHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vTW9uZ2xvfSkgYnkgQ2hyaXN0aWFuIFN1bGxpdmFuIDxjc0BldWZvcmljLmNvPiB8IENvcHlyaWdodCAoYykgMjAxMlxuICogQHZlcnNpb24gMS4wLjBcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlZFxuICovXG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKFwiLi91dGlscy9Mb2dnZXJcIiksXG4gICAgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIiksXG4gICAgU2VsZWN0b3IgPSByZXF1aXJlKCcuL1NlbGVjdG9yJyk7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcblxuLyoqXG4gKiBDdXJzb3JcbiAqIFxuICogQG1vZHVsZSBDdXJzb3JcbiAqIEBjb25zdHJ1Y3RvclxuICogQHNpbmNlIDAuMC4xXG4gKiBcbiAqIEBjbGFzc2Rlc2MgQ3Vyc29yIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjdXJzb3JcbiAqIFxuICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogQHBhcmFtIHtDb2xsZWN0aW9ufSBjb2xsZWN0aW9uIC0gVGhlIGNvbGxlY3Rpb24gaW5zdGFuY2VcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gKiBcbiAqL1xuZnVuY3Rpb24gQ3Vyc29yKGRiLCBjb2xsZWN0aW9uLCBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucykge1xuICAgIHRoaXMuZGIgPSBkYjtcbiAgICB0aGlzLmNvbGxlY3Rpb24gPSBjb2xsZWN0aW9uO1xuICAgIHRoaXMuc2VsZWN0b3IgPSBzZWxlY3Rpb247XG4gICAgdGhpcy5za2lwVmFsdWUgPSBvcHRpb25zLnNraXA7XG4gICAgdGhpcy5saW1pdFZhbHVlID0gb3B0aW9ucy5saW1pdDtcbiAgICB0aGlzLnNvcnRWYWx1ZSA9IG9wdGlvbnMuc29ydCB8fCBudWxsO1xuICAgIHRoaXMuc29ydGVkID0gZmFsc2U7XG4gICAgXG4gICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuXG4gICAgaWYgKFNlbGVjdG9yLmlzU2VsZWN0b3JDb21waWxlZCh0aGlzLnNlbGVjdG9yKSkge1xuICAgICAgICB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkID0gdGhpcy5zZWxlY3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkID0gbmV3IFNlbGVjdG9yKHRoaXMuc2VsZWN0b3IsIFNlbGVjdG9yLk1BVENIX1NFTEVDVE9SKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuX2lkKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0b3JfaWQgPSB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkLl9pZDtcbiAgICB9XG4gICAgXG4gICAgdGhpcy5maWVsZHMgPSBuZXcgU2VsZWN0b3IoZmllbGRzLCBTZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUik7XG4gICAgXG4gICAgdGhpcy5zb3J0X2NvbXBpbGVkID0gbmV3IFNlbGVjdG9yKHRoaXMuc29ydFZhbHVlLCBTZWxlY3Rvci5TT1JUX1NFTEVDVE9SKTtcblxuICAgIHRoaXMuZGJfb2JqZWN0cyA9IG51bGw7XG4gICAgdGhpcy5jdXJzb3JfcG9zID0gMDtcbn1cblxuLyoqXG4gKiBNb3ZlcyBhIGN1cnNvciB0byB0aGUgYmVnaW5pbmdcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjcmV3aW5kXG4gKi9cbkN1cnNvci5wcm90b3R5cGUucmV3aW5kID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5kYl9vYmplY3RzID0gbnVsbDtcbiAgICB0aGlzLmN1cnNvcl9wb3MgPSAwO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyBvdmVyIHRoZSBjdXJzb3IsIGNhbGxpbmcgYSBjYWxsYmFjayBmdW5jdGlvblxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNmb3JFYWNoXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBmb3IgZWFjaCBkb2N1bWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGxldCBkb2NzID0gdGhpcy5mZXRjaEFsbCgpO1xuICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZG9jcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjYWxsYmFjayhkb2NzW2ldKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIG92ZXIgdGhlIGN1cnNvciwgcmV0dXJuaW5nIGEgbmV3IGFycmF5IHdpdGggdGhlIGRvY3VtZW50cyBhZmZlY3RlZCBieSB0aGUgY2FsbGJhY2sgZnVuY3Rpb25cbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjbWFwXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBmb3IgZWFjaCBkb2N1bWVudFxuICogXG4gKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBkb2N1bWVudHMgYWZ0ZXIgYmVpbmcgYWZmZWN0ZWQgd2l0aCB0aGUgY2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciByZXMgPSBbXTtcblxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHJlcy5wdXNoKGNhbGxiYWNrKGRvYykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlcztcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBjdXJzb3IgaGFzIG9uZSBkb2N1bWVudCB0byBiZSBmZXRjaGVkXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2hhc05leHRcbiAqIFxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgd2UgY2FuIGZldGNoIG9uZSBtb3JlIGRvY3VtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuaGFzTmV4dCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAodGhpcy5jdXJzb3JfcG9zIDwgdGhpcy5jb2xsZWN0aW9uLmRvY3MubGVuZ3RoKTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBDdXJzb3IjZmV0Y2hPbmV9XG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI25leHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZmV0Y2hPbmUoKTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBDdXJzb3IjZmV0Y2hBbGx9XG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2ZldGNoXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZmV0Y2ggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5mZXRjaEFsbCgpO1xufTtcblxuLyoqXG4gKiBGZXRjaCBhbGwgZG9jdW1lbnRzIGluIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjZmV0Y2hBbGxcbiAqIFxuICogQHJldHVybnMge0FycmF5fSBBbGwgdGhlIGRvY3VtZW50cyBjb250YWluZWQgaW4gdGhlIGN1cnNvclxuICovXG5DdXJzb3IucHJvdG90eXBlLmZldGNoQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF9nZXREb2N1bWVudHModGhpcywgZmFsc2UpO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIG5leHQgZG9jdW1lbnQgaW4gdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNmZXRjaE9uZVxuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgbmV4dCBkb2N1bWVudCBpbiB0aGUgY3Vyc29yXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZmV0Y2hPbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gX2dldERvY3VtZW50cyh0aGlzLCB0cnVlKTtcbn07XG5cbi8qKlxuICogUmV0cmlldmVzIG9uZSBvciBhbGwgdGhlIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yXG4gKiBcbiAqIEBtZXRob2QgX2dldERvY3VtZW50c1xuICogQHByaXZhdGVcbiAqIFxuICogQHBhcmFtIHtDdXJzb3J9IGN1cnNvciAtIFRoZSBjdXJzb3Igd2l0aCB0aGUgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtqdXN0T25lPWZhbHNlXSAtIFdoZXRoZXIgaXQgcmV0cmlldmVzIG9uZSBvciBhbGwgdGhlIGRvY3VtZW50c1xuICogXG4gKiBAcmV0dXJucyB7QXJyYXl8T2JqZWN0fSBJZiBbanVzdE9uZT10cnVlXSByZXR1cm5zIHRoZSBuZXh0IGRvY3VtZW50LCBvdGhlcndpc2UgcmV0dXJucyBhbGwgdGhlIGRvY3VtZW50c1xuICovXG52YXIgX2dldERvY3VtZW50cyA9IGZ1bmN0aW9uKGN1cnNvciwganVzdE9uZSkge1xuICAgIGlmIChjdXJzb3Iuc2VsZWN0b3JfaWQgJiYgXy5oYXNJbihjdXJzb3IuY29sbGVjdGlvbi5kb2NfaW5kZXhlcywgY3Vyc29yLnNlbGVjdG9yX2lkKSkge1xuICAgICAgICBsZXQgaWR4ID0gY3Vyc29yLmNvbGxlY3Rpb24uZG9jX2luZGV4ZXNbXy50b1N0cmluZyhjdXJzb3Iuc2VsZWN0b3JfaWQpXTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjdXJzb3IuY29sbGVjdGlvbi5kb2NzW2lkeF07XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKGp1c3RPbmUpKSB7XG4gICAgICAgIGp1c3RPbmUgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLy8gVE9ETyBhZGQgd2FybmluZyB3aGVuIHNvcnQvc2tpcC9saW1pdCBhbmQgZmV0Y2hpbmcgb25lXG4gICAgLy8gVE9ETyBhZGQgd2FybmluZyB3aGVuIHNraXAvbGltaXQgd2l0aG91dCBvcmRlclxuICAgIC8vIFRPRE8gaW5kZXhcbiAgICB3aGlsZSAoY3Vyc29yLmN1cnNvcl9wb3MgPCBjdXJzb3IuY29sbGVjdGlvbi5kb2NzLmxlbmd0aCkge1xuICAgICAgICB2YXIgX2RvYyA9IGN1cnNvci5jb2xsZWN0aW9uLmRvY3NbY3Vyc29yLmN1cnNvcl9wb3NdO1xuICAgICAgICBjdXJzb3IuY3Vyc29yX3BvcysrO1xuICAgICAgICBcbiAgICAgICAgaWYgKGN1cnNvci5zZWxlY3Rvcl9jb21waWxlZC50ZXN0KF9kb2MpKSB7XG4gICAgICAgICAgICBpZiAoXy5pc05pbChjdXJzb3IuZGJfb2JqZWN0cykpIGN1cnNvci5kYl9vYmplY3RzID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghXy5pc05pbChjdXJzb3IuZmllbGRzKSAmJiBfLmlzUGxhaW5PYmplY3QoY3Vyc29yLmZpZWxkcykgJiYgIV8uaXNFcXVhbChjdXJzb3IuZmllbGRzLCB7fSkpIHtcbiAgICAgICAgICAgICAgICBsZXQgdG1wID0ge307XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFfLmhhc0luKGN1cnNvci5maWVsZHMsICdfaWQnKSB8fCBjdXJzb3IuZmllbGRzLl9pZCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdG1wLl9pZCA9IF9kb2MuX2lkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBmaWVsZCBpbiBjdXJzb3IuZmllbGRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJzb3IuZmllbGRzW2ZpZWxkXSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRtcFtmaWVsZF0gPSBfZG9jW2ZpZWxkXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBfZG9jID0gdG1wO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjdXJzb3IuZGJfb2JqZWN0cy5wdXNoKF9kb2MpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoanVzdE9uZSkge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmb3JjZSBzb3J0XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9kb2M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYgKCFjdXJzb3Iuc29ydGVkICYmIGhhc1NvcnRpbmcoY3Vyc29yKSkgY3Vyc29yLnNvcnQoKTtcbiAgICBcbiAgICB2YXIgaWR4RnJvbSA9IGN1cnNvci5za2lwVmFsdWU7XG4gICAgdmFyIGlkeFRvID0gY3Vyc29yLmxpbWl0VmFsdWUgIT09IC0xID8gKGN1cnNvci5saW1pdFZhbHVlICsgaWR4RnJvbSkgOiBjdXJzb3IuZGJfb2JqZWN0cy5sZW5ndGg7XG4gICAgXG4gICAgcmV0dXJuIGN1cnNvci5kYl9vYmplY3RzLnNsaWNlKGlkeEZyb20sIGlkeFRvKTtcbiAgICBcbn07XG5cbi8qKlxuICogT2J0YWlucyB0aGUgdG90YWwgb2YgZG9jdW1lbnRzIG9mIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjY291bnRcbiAqIFxuICogQHJldHVybnMge051bWJlcn0gVGhlIHRvdGFsIG9mIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuY291bnQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5mZXRjaEFsbCgpLmxlbmd0aDtcbn07XG5cbi8qKlxuICogQXBwbGllcyBhIHNvcnRpbmcgb24gdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNzb3J0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gc3BlYyAtIFRoZSBzb3J0aW5nIHNwZWNpZmljYXRpb25cbiAqIFxuICogQHJldHVybnMge0N1cnNvcn0gVGhpcyBpbnN0YW5jZSBzbyBpdCBjYW4gYmUgY2hhaW5lZCB3aXRoIG90aGVyIG1ldGhvZHNcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zb3J0ID0gZnVuY3Rpb24oc3BlYykge1xuICAgIHZhciBfc29ydCA9IHRoaXMuc29ydF9jb21waWxlZCB8fCBudWxsO1xuICAgIFxuICAgIGlmIChzcGVjKSB7XG4gICAgICAgIF9zb3J0ID0gbmV3IFNlbGVjdG9yKHNwZWMsIFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoX3NvcnQpIHtcbiAgICAgICAgaWYgKHNwZWMpIHtcbiAgICAgICAgICAgIHRoaXMuc29ydFZhbHVlID0gc3BlYztcbiAgICAgICAgICAgIHRoaXMuc29ydF9jb21waWxlZCA9IF9zb3J0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSWYgbm8gc3BlYywgZG8gc29ydFxuICAgICAgICAgICAgaWYgKF8uaXNOaWwodGhpcy5kYl9vYmplY3RzKSB8fCAhXy5pc0FycmF5KHRoaXMuZGJfb2JqZWN0cykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbmVlZCB0byBmZXRjaCB0aGUgZGF0YSBpbiBvcmRlciB0byBzb3J0IGl0XCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRiX29iamVjdHMgPSB0aGlzLmRiX29iamVjdHMuc29ydChfc29ydCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zb3J0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiWW91IG5lZWQgdG8gc3BlY2lmeSBhIHNvcnQgb3JkZXJcIik7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIG51bWJlciBvZiBkb2N1bWVudCB0byBza2lwIHdoZW4gZmV0Y2hpbmcgdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNza2lwXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBza2lwIC0gVGhlIG51bWJlciBvZiBkb2N1bWVudHMgdG8gc2tpcFxuICogXG4gKiBAcmV0dXJucyB7Q3Vyc29yfSBUaGlzIGluc3RhbmNlIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICovXG5DdXJzb3IucHJvdG90eXBlLnNraXAgPSBmdW5jdGlvbihza2lwKSB7XG4gICAgaWYgKF8uaXNOaWwoc2tpcCkgfHwgXy5pc05hTihza2lwKSkgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwYXNzIGEgbnVtYmVyXCIpO1xuICAgIFxuICAgIHRoaXMuc2tpcFZhbHVlID0gc2tpcDtcbiAgICBcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBtYXggbnVtYmVyIG9mIGRvY3VtZW50IHRvIGZldGNoXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2xpbWl0XG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBsaW1pdCAtIFRoZSBtYXggbnVtYmVyIG9mIGRvY3VtZW50c1xuICogXG4gKiBAcmV0dXJucyB7Q3Vyc29yfSBUaGlzIGluc3RhbmNlIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICovXG5DdXJzb3IucHJvdG90eXBlLmxpbWl0ID0gZnVuY3Rpb24obGltaXQpIHtcbiAgICBpZiAoXy5pc05pbChsaW1pdCkgfHwgXy5pc05hTihsaW1pdCkpIHRocm93IG5ldyBFcnJvcihcIk11c3QgcGFzcyBhIG51bWJlclwiKTtcbiAgICBcbiAgICB0aGlzLmxpbWl0VmFsdWUgPSBsaW1pdDtcbiAgICBcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgY3Vyc29yIGhhcyBhIHNvcnRpbmcgZGVmaW5lZFxuICogXG4gKiBAbWV0aG9kIGhhc1NvcnRpbmdcbiAqIEBwcml2YXRlXG4gKiBcbiAqIEBwYXJhbSB7Q3Vyc29yfSBjdXJzb3IgLSBUaGUgY3Vyc29yXG4gKiBcbiAqIEByZXR1cm5zIHtCb29sZWFufSBXaGV0aGVyIHRoZSBjdXJzb3IgaGFzIHNvcnRpbmcgb3Igbm90XG4gKi9cbnZhciBoYXNTb3J0aW5nID0gZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgaWYgKF8uaXNOaWwoY3Vyc29yLnNvcnRWYWx1ZSkpIHJldHVybiBmYWxzZTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChjdXJzb3Iuc29ydF9jb21waWxlZCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuYmF0Y2hTaXplID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQ29udHJvbHMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgTW9uZ29EQiB3aWxsIHJldHVybiB0byB0aGUgY2xpZW50IGluIGEgc2luZ2xlIG5ldHdvcmsgbWVzc2FnZS5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIENsb3NlIGEgY3Vyc29yIGFuZCBmcmVlIGFzc29jaWF0ZWQgc2VydmVyIHJlc291cmNlcy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jb21tZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQXR0YWNoZXMgYSBjb21tZW50IHRvIHRoZSBxdWVyeSB0byBhbGxvdyBmb3IgdHJhY2VhYmlsaXR5IGluIHRoZSBsb2dzIGFuZCB0aGUgc3lzdGVtLnByb2ZpbGUgY29sbGVjdGlvbi5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5leHBsYWluID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUmVwb3J0cyBvbiB0aGUgcXVlcnkgZXhlY3V0aW9uIHBsYW4gZm9yIGEgY3Vyc29yLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmhpbnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBGb3JjZXMgTW9uZ29EQiB0byB1c2UgYSBzcGVjaWZpYyBpbmRleCBmb3IgYSBxdWVyeS5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5pdGNvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQ29tcHV0ZXMgdGhlIHRvdGFsIG51bWJlciBvZiBkb2N1bWVudHMgaW4gdGhlIGN1cnNvciBjbGllbnQtc2lkZSBieSBmZXRjaGluZyBhbmQgaXRlcmF0aW5nIHRoZSByZXN1bHQgc2V0LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLm1heFNjYW4gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgdGhlIG1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRvIHNjYW47IGRvY3VtZW50cyBmb3IgY29sbGVjdGlvbiBzY2Fucywga2V5cyBmb3IgaW5kZXggc2NhbnMuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWF4VGltZU1TID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGEgY3VtdWxhdGl2ZSB0aW1lIGxpbWl0IGluIG1pbGxpc2Vjb25kcyBmb3IgcHJvY2Vzc2luZyBvcGVyYXRpb25zIG9uIGEgY3Vyc29yLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLm1heCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyBhbiBleGNsdXNpdmUgdXBwZXIgaW5kZXggYm91bmQgZm9yIGEgY3Vyc29yLiBGb3IgdXNlIHdpdGggY3Vyc29yLmhpbnQoKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLm1pbiA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyBhbiBpbmNsdXNpdmUgbG93ZXIgaW5kZXggYm91bmQgZm9yIGEgY3Vyc29yLiBGb3IgdXNlIHdpdGggY3Vyc29yLmhpbnQoKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLm5vQ3Vyc29yVGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEluc3RydWN0cyB0aGUgc2VydmVyIHRvIGF2b2lkIGNsb3NpbmcgYSBjdXJzb3IgYXV0b21hdGljYWxseSBhZnRlciBhIHBlcmlvZCBvZiBpbmFjdGl2aXR5LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLm9ianNMZWZ0SW5CYXRjaCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgbGVmdCBpbiB0aGUgY3VycmVudCBjdXJzb3IgYmF0Y2guXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucHJldHR5ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQ29uZmlndXJlcyB0aGUgY3Vyc29yIHRvIGRpc3BsYXkgcmVzdWx0cyBpbiBhbiBlYXN5LXRvLXJlYWQgZm9ybWF0LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLnJlYWRDb25jZXJuID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGEgcmVhZCBjb25jZXJuIGZvciBhIGZpbmQoKSBvcGVyYXRpb24uXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucmVhZFByZWYgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgYSByZWFkIHByZWZlcmVuY2UgdG8gYSBjdXJzb3IgdG8gY29udHJvbCBob3cgdGhlIGNsaWVudCBkaXJlY3RzIHF1ZXJpZXMgdG8gYSByZXBsaWNhIHNldC5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZXR1cm5LZXkgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBNb2RpZmllcyB0aGUgY3Vyc29yIHRvIHJldHVybiBpbmRleCBrZXlzIHJhdGhlciB0aGFuIHRoZSBkb2N1bWVudHMuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2hvd1JlY29yZElkID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQWRkcyBhbiBpbnRlcm5hbCBzdG9yYWdlIGVuZ2luZSBJRCBmaWVsZCB0byBlYWNoIGRvY3VtZW50IHJldHVybmVkIGJ5IHRoZSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2l6ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFJldHVybnMgYSBjb3VudCBvZiB0aGUgZG9jdW1lbnRzIGluIHRoZSBjdXJzb3IgYWZ0ZXIgYXBwbHlpbmcgc2tpcCgpIGFuZCBsaW1pdCgpIG1ldGhvZHMuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc25hcHNob3QgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBGb3JjZXMgdGhlIGN1cnNvciB0byB1c2UgdGhlIGluZGV4IG9uIHRoZSBfaWQgZmllbGQuIEVuc3VyZXMgdGhhdCB0aGUgY3Vyc29yIHJldHVybnMgZWFjaCBkb2N1bWVudCwgXG4gICAgLy8gd2l0aCByZWdhcmRzIHRvIHRoZSB2YWx1ZSBvZiB0aGUgX2lkIGZpZWxkLCBvbmx5IG9uY2UuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUudGFpbGFibGUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBNYXJrcyB0aGUgY3Vyc29yIGFzIHRhaWxhYmxlLiBPbmx5IHZhbGlkIGZvciBjdXJzb3JzIG92ZXIgY2FwcGVkIGNvbGxlY3Rpb25zLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLnRvQXJyYXkgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBSZXR1cm5zIGFuIGFycmF5IHRoYXQgY29udGFpbnMgYWxsIGRvY3VtZW50cyByZXR1cm5lZCBieSB0aGUgY3Vyc29yLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEN1cnNvcjsiXX0=
