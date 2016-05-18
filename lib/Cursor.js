"use strict";

/**
 * @file Cursor.js - based on Monglo#Cursor ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 0.0.1
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var Logger = require("./utils/Logger"),
    _ = require("lodash"),
    Selector = require('./Selector');

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
    this.fields = fields;
    this.skipValue = options.skip;
    this.limitValue = options.limit;
    this.sortValue = options.sort || null;
    this.sorted = false;

    if (Selector.isCompiled(this.selector)) {
        this.selector_compiled = this.selector;
    } else {
        this.selector_compiled = Selector._compileSelector(this.selector);
    }

    if (this.selector_compiled._id) {
        this.selector_id = this.selector_compiled._id;
    }

    this.sort_compiled = Selector._compileSort(this.sortValue);

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
        _sort = Selector._compileSort(spec);
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
//# sourceMappingURL=data:application/json;base64,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VSxxQkFBVixDQUFOO0FBQ0gsQ0FKRDs7Ozs7QUFTQSxPQUFPLFNBQVAsQ0FBaUIsUUFBakIsR0FBNEIsWUFBVzs7QUFFbkMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsT0FBakIsR0FBMkIsWUFBVzs7QUFFbEMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7QUFLQSxPQUFPLE9BQVAsR0FBaUIsTUFBakIiLCJmaWxlIjoiQ3Vyc29yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBDdXJzb3IuanMgLSBiYXNlZCBvbiBNb25nbG8jQ3Vyc29yICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDAuMC4xXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZShcIi4vdXRpbHMvTG9nZ2VyXCIpLFxuICAgIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpLFxuICAgIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpO1xuXG4vKipcbiAqIEN1cnNvclxuICogXG4gKiBAbW9kdWxlIEN1cnNvclxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2luY2UgMC4wLjFcbiAqIFxuICogQGNsYXNzZGVzYyBDdXJzb3IgY2xhc3MgdGhhdCBtYXBzIGEgTW9uZ29EQi1saWtlIGN1cnNvclxuICogXG4gKiBAcGFyYW0ge01vbmdvUG9ydGFibGV9IGRiIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBAcGFyYW0ge0NvbGxlY3Rpb259IGNvbGxlY3Rpb24gLSBUaGUgY29sbGVjdGlvbiBpbnN0YW5jZVxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbZmllbGRzPXt9XSAtIFRoZSBmaWVsZHMgb2YgdGhlIGRvY3VtZW50IHRvIHNob3dcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBEYXRhYmFzZSBvYmplY3RcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLnBrRmFjdG9yeT1udWxsXSAtIE9iamVjdCBvdmVycmlkaW5nIHRoZSBiYXNpYyBcIk9iamVjdElkXCIgcHJpbWFyeSBrZXkgZ2VuZXJhdGlvbi5cbiAqIFxuICovXG5mdW5jdGlvbiBDdXJzb3IoZGIsIGNvbGxlY3Rpb24sIHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zKSB7XG4gICAgdGhpcy5kYiA9IGRiO1xuICAgIHRoaXMuY29sbGVjdGlvbiA9IGNvbGxlY3Rpb247XG4gICAgdGhpcy5zZWxlY3RvciA9IHNlbGVjdGlvbjtcbiAgICB0aGlzLmZpZWxkcyA9IGZpZWxkcztcbiAgICB0aGlzLnNraXBWYWx1ZSA9IG9wdGlvbnMuc2tpcDtcbiAgICB0aGlzLmxpbWl0VmFsdWUgPSBvcHRpb25zLmxpbWl0O1xuICAgIHRoaXMuc29ydFZhbHVlID0gb3B0aW9ucy5zb3J0IHx8IG51bGw7XG4gICAgdGhpcy5zb3J0ZWQgPSBmYWxzZTtcblxuICAgIGlmIChTZWxlY3Rvci5pc0NvbXBpbGVkKHRoaXMuc2VsZWN0b3IpKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0b3JfY29tcGlsZWQgPSB0aGlzLnNlbGVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2VsZWN0b3JfY29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZVNlbGVjdG9yKHRoaXMuc2VsZWN0b3IpO1xuICAgIH1cbiAgICBcbiAgICBpZiAodGhpcy5zZWxlY3Rvcl9jb21waWxlZC5faWQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3Rvcl9pZCA9IHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuX2lkO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLnNvcnRfY29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZVNvcnQodGhpcy5zb3J0VmFsdWUpO1xuXG4gICAgdGhpcy5kYl9vYmplY3RzID0gbnVsbDtcbiAgICB0aGlzLmN1cnNvcl9wb3MgPSAwO1xufVxuXG4vKipcbiAqIE1vdmVzIGEgY3Vyc29yIHRvIHRoZSBiZWdpbmluZ1xuICogXG4gKiBAbWV0aG9kIEN1cnNvciNyZXdpbmRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZXdpbmQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmRiX29iamVjdHMgPSBudWxsO1xuICAgIHRoaXMuY3Vyc29yX3BvcyA9IDA7XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIG92ZXIgdGhlIGN1cnNvciwgY2FsbGluZyBhIGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2ZvckVhY2hcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGZvciBlYWNoIGRvY3VtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgbGV0IGRvY3MgPSB0aGlzLmZldGNoQWxsKCk7XG4gICAgXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkb2NzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNhbGxiYWNrKGRvY3NbaV0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogSXRlcmF0ZXMgb3ZlciB0aGUgY3Vyc29yLCByZXR1cm5pbmcgYSBuZXcgYXJyYXkgd2l0aCB0aGUgZG9jdW1lbnRzIGFmZmVjdGVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvblxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNtYXBcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGZvciBlYWNoIGRvY3VtZW50XG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheX0gVGhlIGRvY3VtZW50cyBhZnRlciBiZWluZyBhZmZlY3RlZCB3aXRoIHRoZSBjYWxsYmFjayBmdW5jdGlvblxuICovXG5DdXJzb3IucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgcmVzLnB1c2goY2FsbGJhY2soZG9jKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGN1cnNvciBoYXMgb25lIGRvY3VtZW50IHRvIGJlIGZldGNoZWRcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjaGFzTmV4dFxuICogXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB3ZSBjYW4gZmV0Y2ggb25lIG1vcmUgZG9jdW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5oYXNOZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICh0aGlzLmN1cnNvcl9wb3MgPCB0aGlzLmNvbGxlY3Rpb24uZG9jcy5sZW5ndGgpO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3Ige0BsaW5rIEN1cnNvciNmZXRjaE9uZX1cbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjbmV4dFxuICovXG5DdXJzb3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5mZXRjaE9uZSgpO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3Ige0BsaW5rIEN1cnNvciNmZXRjaEFsbH1cbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjZmV0Y2hcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5mZXRjaCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZldGNoQWxsKCk7XG59O1xuXG4vKipcbiAqIEZldGNoIGFsbCBkb2N1bWVudHMgaW4gdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNmZXRjaEFsbFxuICogXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFsbCB0aGUgZG9jdW1lbnRzIGNvbnRhaW5lZCBpbiB0aGUgY3Vyc29yXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZmV0Y2hBbGwgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gX2dldERvY3VtZW50cyh0aGlzLCBmYWxzZSk7XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgbmV4dCBkb2N1bWVudCBpbiB0aGUgY3Vyc29yXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2ZldGNoT25lXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBuZXh0IGRvY3VtZW50IGluIHRoZSBjdXJzb3JcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5mZXRjaE9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfZ2V0RG9jdW1lbnRzKHRoaXMsIHRydWUpO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgb25lIG9yIGFsbCB0aGUgZG9jdW1lbnRzIGluIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBfZ2V0RG9jdW1lbnRzXG4gKiBAcHJpdmF0ZVxuICogXG4gKiBAcGFyYW0ge0N1cnNvcn0gY3Vyc29yIC0gVGhlIGN1cnNvciB3aXRoIHRoZSBkb2N1bWVudHNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2p1c3RPbmU9ZmFsc2VdIC0gV2hldGhlciBpdCByZXRyaWV2ZXMgb25lIG9yIGFsbCB0aGUgZG9jdW1lbnRzXG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheXxPYmplY3R9IElmIFtqdXN0T25lPXRydWVdIHJldHVybnMgdGhlIG5leHQgZG9jdW1lbnQsIG90aGVyd2lzZSByZXR1cm5zIGFsbCB0aGUgZG9jdW1lbnRzXG4gKi9cbnZhciBfZ2V0RG9jdW1lbnRzID0gZnVuY3Rpb24oY3Vyc29yLCBqdXN0T25lKSB7XG4gICAgaWYgKGN1cnNvci5zZWxlY3Rvcl9pZCAmJiBfLmhhc0luKGN1cnNvci5jb2xsZWN0aW9uLmRvY19pbmRleGVzLCBjdXJzb3Iuc2VsZWN0b3JfaWQpKSB7XG4gICAgICAgIGxldCBpZHggPSBjdXJzb3IuY29sbGVjdGlvbi5kb2NfaW5kZXhlc1tfLnRvU3RyaW5nKGN1cnNvci5zZWxlY3Rvcl9pZCldO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGN1cnNvci5jb2xsZWN0aW9uLmRvY3NbaWR4XTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwoanVzdE9uZSkpIHtcbiAgICAgICAganVzdE9uZSA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICAvLyBUT0RPIGFkZCB3YXJuaW5nIHdoZW4gc29ydC9za2lwL2xpbWl0IGFuZCBmZXRjaGluZyBvbmVcbiAgICAvLyBUT0RPIGFkZCB3YXJuaW5nIHdoZW4gc2tpcC9saW1pdCB3aXRob3V0IG9yZGVyXG4gICAgLy8gVE9ETyBpbmRleFxuICAgIHdoaWxlIChjdXJzb3IuY3Vyc29yX3BvcyA8IGN1cnNvci5jb2xsZWN0aW9uLmRvY3MubGVuZ3RoKSB7XG4gICAgICAgIHZhciBfZG9jID0gY3Vyc29yLmNvbGxlY3Rpb24uZG9jc1tjdXJzb3IuY3Vyc29yX3Bvc107XG4gICAgICAgIGN1cnNvci5jdXJzb3JfcG9zKys7XG4gICAgICAgIFxuICAgICAgICBpZiAoY3Vyc29yLnNlbGVjdG9yX2NvbXBpbGVkLnRlc3QoX2RvYykpIHtcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKGN1cnNvci5kYl9vYmplY3RzKSkgY3Vyc29yLmRiX29iamVjdHMgPSBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFfLmlzTmlsKGN1cnNvci5maWVsZHMpICYmIF8uaXNQbGFpbk9iamVjdChjdXJzb3IuZmllbGRzKSAmJiAhXy5pc0VxdWFsKGN1cnNvci5maWVsZHMsIHt9KSkge1xuICAgICAgICAgICAgICAgIGxldCB0bXAgPSB7fTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIV8uaGFzSW4oY3Vyc29yLmZpZWxkcywgJ19pZCcpIHx8IGN1cnNvci5maWVsZHMuX2lkICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0bXAuX2lkID0gX2RvYy5faWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAobGV0IGZpZWxkIGluIGN1cnNvci5maWVsZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnNvci5maWVsZHNbZmllbGRdICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG1wW2ZpZWxkXSA9IF9kb2NbZmllbGRdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIF9kb2MgPSB0bXA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGN1cnNvci5kYl9vYmplY3RzLnB1c2goX2RvYyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChqdXN0T25lKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGZvcmNlIHNvcnRcbiAgICAgICAgICAgICAgICByZXR1cm4gX2RvYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAoIWN1cnNvci5zb3J0ZWQgJiYgaGFzU29ydGluZyhjdXJzb3IpKSBjdXJzb3Iuc29ydCgpO1xuICAgIFxuICAgIHZhciBpZHhGcm9tID0gY3Vyc29yLnNraXBWYWx1ZTtcbiAgICB2YXIgaWR4VG8gPSBjdXJzb3IubGltaXRWYWx1ZSAhPT0gLTEgPyAoY3Vyc29yLmxpbWl0VmFsdWUgKyBpZHhGcm9tKSA6IGN1cnNvci5kYl9vYmplY3RzLmxlbmd0aDtcbiAgICBcbiAgICByZXR1cm4gY3Vyc29yLmRiX29iamVjdHMuc2xpY2UoaWR4RnJvbSwgaWR4VG8pO1xuICAgIFxufTtcblxuLyoqXG4gKiBPYnRhaW5zIHRoZSB0b3RhbCBvZiBkb2N1bWVudHMgb2YgdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNjb3VudFxuICogXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgdG90YWwgb2YgZG9jdW1lbnRzIGluIHRoZSBjdXJzb3JcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZldGNoQWxsKCkubGVuZ3RoO1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIGEgc29ydGluZyBvbiB0aGUgY3Vyc29yXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI3NvcnRcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBzcGVjIC0gVGhlIHNvcnRpbmcgc3BlY2lmaWNhdGlvblxuICogXG4gKiBAcmV0dXJucyB7Q3Vyc29yfSBUaGlzIGluc3RhbmNlIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICovXG5DdXJzb3IucHJvdG90eXBlLnNvcnQgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgdmFyIF9zb3J0ID0gdGhpcy5zb3J0X2NvbXBpbGVkIHx8IG51bGw7XG4gICAgXG4gICAgaWYgKHNwZWMpIHtcbiAgICAgICAgX3NvcnQgPSBTZWxlY3Rvci5fY29tcGlsZVNvcnQoc3BlYyk7XG4gICAgfVxuICAgIFxuICAgIGlmIChfc29ydCkge1xuICAgICAgICBpZiAoc3BlYykge1xuICAgICAgICAgICAgdGhpcy5zb3J0VmFsdWUgPSBzcGVjO1xuICAgICAgICAgICAgdGhpcy5zb3J0X2NvbXBpbGVkID0gX3NvcnQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJZiBubyBzcGVjLCBkbyBzb3J0XG4gICAgICAgICAgICBpZiAoXy5pc05pbCh0aGlzLmRiX29iamVjdHMpIHx8ICFfLmlzQXJyYXkodGhpcy5kYl9vYmplY3RzKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBuZWVkIHRvIGZldGNoIHRoZSBkYXRhIGluIG9yZGVyIHRvIHNvcnQgaXRcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZGJfb2JqZWN0cyA9IHRoaXMuZGJfb2JqZWN0cy5zb3J0KF9zb3J0KTtcbiAgICAgICAgICAgICAgICB0aGlzLnNvcnRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbmVlZCB0byBzcGVjaWZ5IGEgc29ydCBvcmRlclwiKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgbnVtYmVyIG9mIGRvY3VtZW50IHRvIHNraXAgd2hlbiBmZXRjaGluZyB0aGUgY3Vyc29yXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI3NraXBcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHNraXAgLSBUaGUgbnVtYmVyIG9mIGRvY3VtZW50cyB0byBza2lwXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uKHNraXApIHtcbiAgICBpZiAoXy5pc05pbChza2lwKSB8fCBfLmlzTmFOKHNraXApKSB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHBhc3MgYSBudW1iZXJcIik7XG4gICAgXG4gICAgdGhpcy5za2lwVmFsdWUgPSBza2lwO1xuICAgIFxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIG1heCBudW1iZXIgb2YgZG9jdW1lbnQgdG8gZmV0Y2hcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjbGltaXRcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IGxpbWl0IC0gVGhlIG1heCBudW1iZXIgb2YgZG9jdW1lbnRzXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUubGltaXQgPSBmdW5jdGlvbihsaW1pdCkge1xuICAgIGlmIChfLmlzTmlsKGxpbWl0KSB8fCBfLmlzTmFOKGxpbWl0KSkgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwYXNzIGEgbnVtYmVyXCIpO1xuICAgIFxuICAgIHRoaXMubGltaXRWYWx1ZSA9IGxpbWl0O1xuICAgIFxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSBjdXJzb3IgaGFzIGEgc29ydGluZyBkZWZpbmVkXG4gKiBcbiAqIEBtZXRob2QgaGFzU29ydGluZ1xuICogQHByaXZhdGVcbiAqIFxuICogQHBhcmFtIHtDdXJzb3J9IGN1cnNvciAtIFRoZSBjdXJzb3JcbiAqIFxuICogQHJldHVybnMge0Jvb2xlYW59IFdoZXRoZXIgdGhlIGN1cnNvciBoYXMgc29ydGluZyBvciBub3RcbiAqL1xudmFyIGhhc1NvcnRpbmcgPSBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICBpZiAoXy5pc05pbChjdXJzb3Iuc29ydFZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKGN1cnNvci5zb3J0X2NvbXBpbGVkKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5iYXRjaFNpemUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb250cm9scyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBNb25nb0RCIHdpbGwgcmV0dXJuIHRvIHRoZSBjbGllbnQgaW4gYSBzaW5nbGUgbmV0d29yayBtZXNzYWdlLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQ2xvc2UgYSBjdXJzb3IgYW5kIGZyZWUgYXNzb2NpYXRlZCBzZXJ2ZXIgcmVzb3VyY2VzLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmNvbW1lbnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBBdHRhY2hlcyBhIGNvbW1lbnQgdG8gdGhlIHF1ZXJ5IHRvIGFsbG93IGZvciB0cmFjZWFiaWxpdHkgaW4gdGhlIGxvZ3MgYW5kIHRoZSBzeXN0ZW0ucHJvZmlsZSBjb2xsZWN0aW9uLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmV4cGxhaW4gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBSZXBvcnRzIG9uIHRoZSBxdWVyeSBleGVjdXRpb24gcGxhbiBmb3IgYSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuaGludCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEZvcmNlcyBNb25nb0RCIHRvIHVzZSBhIHNwZWNpZmljIGluZGV4IGZvciBhIHF1ZXJ5LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLml0Y291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb21wdXRlcyB0aGUgdG90YWwgbnVtYmVyIG9mIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yIGNsaWVudC1zaWRlIGJ5IGZldGNoaW5nIGFuZCBpdGVyYXRpbmcgdGhlIHJlc3VsdCBzZXQuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWF4U2NhbiA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyB0aGUgbWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gc2NhbjsgZG9jdW1lbnRzIGZvciBjb2xsZWN0aW9uIHNjYW5zLCBrZXlzIGZvciBpbmRleCBzY2Fucy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5tYXhUaW1lTVMgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgYSBjdW11bGF0aXZlIHRpbWUgbGltaXQgaW4gbWlsbGlzZWNvbmRzIGZvciBwcm9jZXNzaW5nIG9wZXJhdGlvbnMgb24gYSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWF4ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGFuIGV4Y2x1c2l2ZSB1cHBlciBpbmRleCBib3VuZCBmb3IgYSBjdXJzb3IuIEZvciB1c2Ugd2l0aCBjdXJzb3IuaGludCgpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWluID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGFuIGluY2x1c2l2ZSBsb3dlciBpbmRleCBib3VuZCBmb3IgYSBjdXJzb3IuIEZvciB1c2Ugd2l0aCBjdXJzb3IuaGludCgpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubm9DdXJzb3JUaW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gSW5zdHJ1Y3RzIHRoZSBzZXJ2ZXIgdG8gYXZvaWQgY2xvc2luZyBhIGN1cnNvciBhdXRvbWF0aWNhbGx5IGFmdGVyIGEgcGVyaW9kIG9mIGluYWN0aXZpdHkuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUub2Jqc0xlZnRJbkJhdGNoID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUmV0dXJucyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBsZWZ0IGluIHRoZSBjdXJyZW50IGN1cnNvciBiYXRjaC5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5wcmV0dHkgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb25maWd1cmVzIHRoZSBjdXJzb3IgdG8gZGlzcGxheSByZXN1bHRzIGluIGFuIGVhc3ktdG8tcmVhZCBmb3JtYXQuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucmVhZENvbmNlcm4gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgYSByZWFkIGNvbmNlcm4gZm9yIGEgZmluZCgpIG9wZXJhdGlvbi5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZWFkUHJlZiA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyBhIHJlYWQgcHJlZmVyZW5jZSB0byBhIGN1cnNvciB0byBjb250cm9sIGhvdyB0aGUgY2xpZW50IGRpcmVjdHMgcXVlcmllcyB0byBhIHJlcGxpY2Egc2V0LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLnJldHVybktleSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIE1vZGlmaWVzIHRoZSBjdXJzb3IgdG8gcmV0dXJuIGluZGV4IGtleXMgcmF0aGVyIHRoYW4gdGhlIGRvY3VtZW50cy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zaG93UmVjb3JkSWQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBBZGRzIGFuIGludGVybmFsIHN0b3JhZ2UgZW5naW5lIElEIGZpZWxkIHRvIGVhY2ggZG9jdW1lbnQgcmV0dXJuZWQgYnkgdGhlIGN1cnNvci5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUmV0dXJucyBhIGNvdW50IG9mIHRoZSBkb2N1bWVudHMgaW4gdGhlIGN1cnNvciBhZnRlciBhcHBseWluZyBza2lwKCkgYW5kIGxpbWl0KCkgbWV0aG9kcy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zbmFwc2hvdCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEZvcmNlcyB0aGUgY3Vyc29yIHRvIHVzZSB0aGUgaW5kZXggb24gdGhlIF9pZCBmaWVsZC4gRW5zdXJlcyB0aGF0IHRoZSBjdXJzb3IgcmV0dXJucyBlYWNoIGRvY3VtZW50LCBcbiAgICAvLyB3aXRoIHJlZ2FyZHMgdG8gdGhlIHZhbHVlIG9mIHRoZSBfaWQgZmllbGQsIG9ubHkgb25jZS5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS50YWlsYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIE1hcmtzIHRoZSBjdXJzb3IgYXMgdGFpbGFibGUuIE9ubHkgdmFsaWQgZm9yIGN1cnNvcnMgb3ZlciBjYXBwZWQgY29sbGVjdGlvbnMuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFJldHVybnMgYW4gYXJyYXkgdGhhdCBjb250YWlucyBhbGwgZG9jdW1lbnRzIHJldHVybmVkIGJ5IHRoZSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ3Vyc29yOyJdfQ==
