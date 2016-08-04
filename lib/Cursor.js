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

Cursor.sort = function (doc, fields) {};

/**
 * Projects the fields of one or several documents, changing the output
 * 
 * @method Cursor.project
 * 
 * @param {Array|Object} doc - The document/s that will be projected
 * @param {String|Array|Object} spec - Fields projection specification. Can be an space/comma separated list, an array, or an object
 * 
 * @returns {Array|Object} The document/s after the projection
 */
Cursor.project = function (doc, spec) {
    var aggregation = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

    if (_.isNil(doc)) logger.throw('doc param required');
    if (_.isNil(spec)) logger.throw('spec param required');

    var fields = null;
    if (aggregation) {
        fields = new Selector(spec, Selector.AGG_FIELD_SELECTOR);
    } else {
        fields = new Selector(spec, Selector.FIELD_SELECTOR);
    }

    if (_.isArray(doc)) {
        for (var i = 0; i < doc.length; i++) {
            doc[i] = _mapFields(doc[i], fields);
        }

        return doc;
    } else {
        return _mapFields(doc, fields);
    }
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

        for (var field in fields) {
            // Whether if we are showing or hidding fields
            if (field !== '_id') {
                if (fields[field] === 1) {
                    showing = true;
                    break;
                } else if (fields[field] === -1) {
                    showing = false;
                    break;
                }
            }
        }

        var tmp = null;

        for (var field in fields) {
            if (tmp === null) {
                if (showing) {
                    tmp = {};
                } else {
                    tmp = _.cloneDeep(doc);
                }
            }

            // Add or remove the field
            if (fields[field] === 1 || fields[field] === -1) {
                // Show the field
                if (showing) {
                    tmp[field] = doc[field];
                } else {
                    // Hide the field
                    delete tmp[field];
                }
            } else {
                // Show the new field (rename)
                tmp[field] = doc[fields[field]];
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

    //         return Cursor.project(cursor.collection.docs[idx], cursor.fields);
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

            _doc = Cursor.project(_doc, cursor.fields);

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
//# sourceMappingURL=data:application/json;base64,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akIsR0FBeUIsWUFBVzs7QUFFaEMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsT0FBakIsR0FBMkIsWUFBVzs7QUFFbEMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsT0FBakIsR0FBMkIsWUFBVzs7QUFFbEMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsSUFBakIsR0FBd0IsWUFBVzs7QUFFL0IsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsT0FBakIsR0FBMkIsWUFBVzs7QUFFbEMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsT0FBakIsR0FBMkIsWUFBVzs7QUFFbEMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsU0FBakIsR0FBNkIsWUFBVzs7QUFFcEMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsR0FBakIsR0FBdUIsWUFBVzs7QUFFOUIsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsR0FBakIsR0FBdUIsWUFBVzs7QUFFOUIsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsZUFBakIsR0FBbUMsWUFBVzs7QUFFMUMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsZUFBakIsR0FBbUMsWUFBVzs7QUFFMUMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsTUFBakIsR0FBMEIsWUFBVzs7QUFFakMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsV0FBakIsR0FBK0IsWUFBVzs7QUFFdEMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsUUFBakIsR0FBNEIsWUFBVzs7QUFFbkMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsU0FBakIsR0FBNkIsWUFBVzs7QUFFcEMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsWUFBakIsR0FBZ0MsWUFBVzs7QUFFdkMsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsSUFBakIsR0FBd0IsWUFBVzs7QUFFL0IsVUFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsQ0FIRDs7Ozs7QUFRQSxPQUFPLFNBQVAsQ0FBaUIsUUFBakIsR0FBNEIsWUFBVzs7O0FBR25DLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSkQ7Ozs7O0FBU0EsT0FBTyxTQUFQLENBQWlCLFFBQWpCLEdBQTRCLFlBQVc7O0FBRW5DLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7Ozs7O0FBUUEsT0FBTyxTQUFQLENBQWlCLE9BQWpCLEdBQTJCLFlBQVc7O0FBRWxDLFVBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILENBSEQ7O0FBS0EsT0FBTyxPQUFQLEdBQWlCLE1BQWpCIiwiZmlsZSI6IkN1cnNvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgQ3Vyc29yLmpzIC0gYmFzZWQgb24gTW9uZ2xvI0N1cnNvciAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIExvZ2dlciA9IHJlcXVpcmUoXCJqc3ctbG9nZ2VyXCIpLFxuICAgIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpLFxuICAgIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpO1xuICAgIFxudmFyIGxvZ2dlciA9IG51bGw7XG5cbi8qKlxuICogQ3Vyc29yXG4gKiBcbiAqIEBtb2R1bGUgQ3Vyc29yXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzaW5jZSAwLjAuMVxuICogXG4gKiBAY2xhc3NkZXNjIEN1cnNvciBjbGFzcyB0aGF0IG1hcHMgYSBNb25nb0RCLWxpa2UgY3Vyc29yXG4gKiBcbiAqIEBwYXJhbSB7TW9uZ29Qb3J0YWJsZX0gZGIgLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIEBwYXJhbSB7QXJyYXl9IGRvY3VtZW50cyAtIFRoZSBsaXN0IG9mIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbZmllbGRzPXt9XSAtIFRoZSBmaWVsZHMgb2YgdGhlIGRvY3VtZW50IHRvIHNob3dcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBEYXRhYmFzZSBvYmplY3RcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLnBrRmFjdG9yeT1udWxsXSAtIE9iamVjdCBvdmVycmlkaW5nIHRoZSBiYXNpYyBcIk9iamVjdElkXCIgcHJpbWFyeSBrZXkgZ2VuZXJhdGlvbi5cbiAqIFxuICovXG5jbGFzcyBDdXJzb3Ige1xuICAgIGNvbnN0cnVjdG9yKGRvY3VtZW50cywgc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICB0aGlzLmRvY3VtZW50cyA9IGRvY3VtZW50cztcbiAgICAgICAgdGhpcy5zZWxlY3RvciA9IHNlbGVjdGlvbjtcbiAgICAgICAgdGhpcy5za2lwVmFsdWUgPSBvcHRpb25zLnNraXAgfHwgMDtcbiAgICAgICAgdGhpcy5saW1pdFZhbHVlID0gb3B0aW9ucy5saW1pdCB8fCAxNTtcbiAgICAgICAgdGhpcy5zb3J0VmFsdWUgPSBvcHRpb25zLnNvcnQgfHwgbnVsbDtcbiAgICAgICAgdGhpcy5zb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICBcbiAgICAgICAgLyoqIEFERCBJRFggKiovXG4gICAgICAgIGlmIChTZWxlY3Rvci5pc1NlbGVjdG9yQ29tcGlsZWQodGhpcy5zZWxlY3RvcikpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0b3JfY29tcGlsZWQgPSB0aGlzLnNlbGVjdG9yO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3Rvcl9jb21waWxlZCA9IG5ldyBTZWxlY3Rvcih0aGlzLnNlbGVjdG9yLCBTZWxlY3Rvci5NQVRDSF9TRUxFQ1RPUik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zZWxlY3Rvcl9jb21waWxlZC5jbGF1c2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZWxlY3Rvcl9jb21waWxlZC5jbGF1c2VzW2ldLmtleSA9PT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdG9yX2lkID0gdGhpcy5zZWxlY3Rvcl9jb21waWxlZC5jbGF1c2VzW2ldLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuY2xhdXNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuY2xhdXNlc1tpXS5rZXkgPT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgdmFyIF92YWwgPSB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkLmNsYXVzZXNbaV0udmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNTdHJpbmcoX3ZhbCkgfHwgXy5pc051bWJlcihfdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdG9yX2lkID0gX3ZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKiogQUREIElEWCAqKi9cbiAgICAgICAgXG4gICAgICAgIHRoaXMuZmV0Y2hfbW9kZSA9IEN1cnNvci5DT0xTQ0FOIHx8IEN1cnNvci5JRFhTQ0FOO1xuICAgICAgICB0aGlzLmluZGV4ZXggPSBudWxsOy8vZmluZFVzYWJsZUluZGV4ZXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGlmIChjdXJzb3IuZmV0Y2hfbW9kZSA9PT0gQ3Vyc29yLkNPTFNDQU4pIHtcbiAgICAgICAgLy8gICAgIC8vIENPTFNDQU4sIHdpIHdpbGwgaXRlcmF0ZSBvdmVyIGFsbCBkb2N1bWVudHNcbiAgICAgICAgLy8gICAgIGRvY3MgPSBfLmNsb25lRGVlcChjdXJzb3IuY29sbGVjdGlvbi5kb2NzKTtcbiAgICAgICAgLy8gfSBlbHNlIGlmIChjdXJzb3IuZmV0Y2hfbW9kZSA9PT0gQ3Vyc29yLklEWFNDQU4pIHtcbiAgICAgICAgLy8gICAgIC8vIElEWFNDQU4sIHdpIHdpbGwgaXRlcmF0ZSBvdmVyIGFsbCBuZWVkZWQgZG9jdW1lbnRzXG4gICAgICAgIC8vICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN1cnNvci5pbmRleGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vICAgICAgICAgbGV0IGluZGV4ID0gY3Vyc29yLmluZGV4ZXNbaV07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIC8vICAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4LnN0YXJ0OyBpIDwgaW5kZXguZW5kOyBpKyspIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgbGV0IGlkeF9pZCA9IGN1cnNvci5jb2xsZWN0aW9uLmdldEluZGV4KGluZGV4Lm5hbWUpW2ldO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgLy8gICAgICAgICAgICAgZG9jcy5wdXNoKGN1cnNvci5jb2xsZWN0aW9uLmRvY3NbaWR4X2lkXSk7XG4gICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmZpZWxkcyA9IG5ldyBTZWxlY3RvcihmaWVsZHMsIFNlbGVjdG9yLkZJRUxEX1NFTEVDVE9SKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc29ydF9jb21waWxlZCA9IG5ldyBTZWxlY3Rvcih0aGlzLnNvcnRWYWx1ZSwgU2VsZWN0b3IuU09SVF9TRUxFQ1RPUik7XG4gICAgXG4gICAgICAgIHRoaXMuZGJfb2JqZWN0cyA9IG51bGw7XG4gICAgICAgIHRoaXMuY3Vyc29yX3BvcyA9IDA7XG4gICAgfVxufVxuXG5DdXJzb3IuQ09MU0NBTiA9ICdjb2xzY2FuJztcbkN1cnNvci5JRFhTQ0FOID0gJ2lkeHNjYW4nO1xuXG4vKipcbiAqIE1vdmVzIGEgY3Vyc29yIHRvIHRoZSBiZWdpbmluZ1xuICogXG4gKiBAbWV0aG9kIEN1cnNvciNyZXdpbmRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZXdpbmQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmRiX29iamVjdHMgPSBudWxsO1xuICAgIHRoaXMuY3Vyc29yX3BvcyA9IDA7XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIG92ZXIgdGhlIGN1cnNvciwgY2FsbGluZyBhIGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2ZvckVhY2hcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGZvciBlYWNoIGRvY3VtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgbGV0IGRvY3MgPSB0aGlzLmZldGNoQWxsKCk7XG4gICAgXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkb2NzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNhbGxiYWNrKGRvY3NbaV0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogSXRlcmF0ZXMgb3ZlciB0aGUgY3Vyc29yLCByZXR1cm5pbmcgYSBuZXcgYXJyYXkgd2l0aCB0aGUgZG9jdW1lbnRzIGFmZmVjdGVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvblxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNtYXBcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGZvciBlYWNoIGRvY3VtZW50XG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheX0gVGhlIGRvY3VtZW50cyBhZnRlciBiZWluZyBhZmZlY3RlZCB3aXRoIHRoZSBjYWxsYmFjayBmdW5jdGlvblxuICovXG5DdXJzb3IucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgcmVzLnB1c2goY2FsbGJhY2soZG9jKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGN1cnNvciBoYXMgb25lIGRvY3VtZW50IHRvIGJlIGZldGNoZWRcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjaGFzTmV4dFxuICogXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB3ZSBjYW4gZmV0Y2ggb25lIG1vcmUgZG9jdW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5oYXNOZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICh0aGlzLmN1cnNvcl9wb3MgPCB0aGlzLmRvY3VtZW50cy5sZW5ndGgpO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3Ige0BsaW5rIEN1cnNvciNmZXRjaE9uZX1cbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjbmV4dFxuICovXG5DdXJzb3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5mZXRjaE9uZSgpO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3Ige0BsaW5rIEN1cnNvciNmZXRjaEFsbH1cbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjZmV0Y2hcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5mZXRjaCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZldGNoQWxsKCk7XG59O1xuXG4vKipcbiAqIEZldGNoIGFsbCBkb2N1bWVudHMgaW4gdGhlIGN1cnNvclxuICogXG4gKiBAbWV0aG9kIEN1cnNvciNmZXRjaEFsbFxuICogXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFsbCB0aGUgZG9jdW1lbnRzIGNvbnRhaW5lZCBpbiB0aGUgY3Vyc29yXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZmV0Y2hBbGwgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gX2dldERvY3VtZW50cyh0aGlzLCBmYWxzZSkgfHwgW107XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgbmV4dCBkb2N1bWVudCBpbiB0aGUgY3Vyc29yXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI2ZldGNoT25lXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBuZXh0IGRvY3VtZW50IGluIHRoZSBjdXJzb3JcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5mZXRjaE9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfZ2V0RG9jdW1lbnRzKHRoaXMsIHRydWUpO1xufTtcblxuXG5cbkN1cnNvci5zb3J0ID0gZnVuY3Rpb24oZG9jLCBmaWVsZHMpIHtcbiAgICBcbn07XG5cbi8qKlxuICogUHJvamVjdHMgdGhlIGZpZWxkcyBvZiBvbmUgb3Igc2V2ZXJhbCBkb2N1bWVudHMsIGNoYW5naW5nIHRoZSBvdXRwdXRcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IucHJvamVjdFxuICogXG4gKiBAcGFyYW0ge0FycmF5fE9iamVjdH0gZG9jIC0gVGhlIGRvY3VtZW50L3MgdGhhdCB3aWxsIGJlIHByb2plY3RlZFxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl8T2JqZWN0fSBzcGVjIC0gRmllbGRzIHByb2plY3Rpb24gc3BlY2lmaWNhdGlvbi4gQ2FuIGJlIGFuIHNwYWNlL2NvbW1hIHNlcGFyYXRlZCBsaXN0LCBhbiBhcnJheSwgb3IgYW4gb2JqZWN0XG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheXxPYmplY3R9IFRoZSBkb2N1bWVudC9zIGFmdGVyIHRoZSBwcm9qZWN0aW9uXG4gKi9cbkN1cnNvci5wcm9qZWN0ID0gZnVuY3Rpb24gKGRvYywgc3BlYywgYWdncmVnYXRpb24gPSBmYWxzZSkge1xuICAgIGlmIChfLmlzTmlsKGRvYykpIGxvZ2dlci50aHJvdygnZG9jIHBhcmFtIHJlcXVpcmVkJyk7XG4gICAgaWYgKF8uaXNOaWwoc3BlYykpIGxvZ2dlci50aHJvdygnc3BlYyBwYXJhbSByZXF1aXJlZCcpO1xuXG4gICAgdmFyIGZpZWxkcyA9IG51bGw7XG4gICAgaWYgKGFnZ3JlZ2F0aW9uKSB7XG4gICAgICAgIGZpZWxkcyA9IG5ldyBTZWxlY3RvcihzcGVjLCBTZWxlY3Rvci5BR0dfRklFTERfU0VMRUNUT1IpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZpZWxkcyA9IG5ldyBTZWxlY3RvcihzcGVjLCBTZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUik7XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzQXJyYXkoZG9jKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvYy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZG9jW2ldID0gX21hcEZpZWxkcyhkb2NbaV0sIGZpZWxkcyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkb2M7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIF9tYXBGaWVsZHMoZG9jLCBmaWVsZHMpO1xuICAgIH1cblxuICAgIFxuXG59O1xuXG52YXIgX21hcEZpZWxkcyA9IGZ1bmN0aW9uIChkb2MsIGZpZWxkcykge1xuICAgIHZhciBfZG9jID0gXy5jbG9uZURlZXAoZG9jKTtcblxuICAgIGlmICghXy5pc05pbChmaWVsZHMpICYmIF8uaXNQbGFpbk9iamVjdChmaWVsZHMpICYmICFfLmlzRXF1YWwoZmllbGRzLCB7fSkpIHtcbiAgICAgICAgdmFyIHNob3dJZCA9IHRydWUsXG4gICAgICAgICAgICBzaG93aW5nID0gbnVsbDtcblxuICAgICAgICAvLyBXaGV0aGVyIGlmIHdlIHNob3dpbmcgdGhlIF9pZCBmaWVsZFxuICAgICAgICBpZiAoXy5oYXNJbihmaWVsZHMsICdfaWQnKSAmJiBmaWVsZHMuX2lkID09PSAtMSkge1xuICAgICAgICAgICAgc2hvd0lkID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBmaWVsZCBpbiBmaWVsZHMpIHtcbiAgICAgICAgICAgIC8vIFdoZXRoZXIgaWYgd2UgYXJlIHNob3dpbmcgb3IgaGlkZGluZyBmaWVsZHNcbiAgICAgICAgICAgIGlmIChmaWVsZCAhPT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGRzW2ZpZWxkXSA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBzaG93aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChmaWVsZHNbZmllbGRdID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBzaG93aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0bXAgPSBudWxsO1xuXG4gICAgICAgIGZvciAodmFyIGZpZWxkIGluIGZpZWxkcykge1xuICAgICAgICAgICAgaWYgKHRtcCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChzaG93aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRtcCA9IHt9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRtcCA9IF8uY2xvbmVEZWVwKGRvYyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgLy8gQWRkIG9yIHJlbW92ZSB0aGUgZmllbGRcbiAgICAgICAgICAgIGlmIChmaWVsZHNbZmllbGRdID09PSAxIHx8IGZpZWxkc1tmaWVsZF0gPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgZmllbGRcbiAgICAgICAgICAgICAgICBpZiAoc2hvd2luZykge1xuICAgICAgICAgICAgICAgICAgICB0bXBbZmllbGRdID0gZG9jW2ZpZWxkXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBmaWVsZFxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdG1wW2ZpZWxkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG5ldyBmaWVsZCAocmVuYW1lKVxuICAgICAgICAgICAgICAgIHRtcFtmaWVsZF0gPSBkb2NbZmllbGRzW2ZpZWxkXV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgb3IgcmVtb3ZlIHRoZSBfaWQgZmllbGRcbiAgICAgICAgaWYgKHNob3dJZCkge1xuICAgICAgICAgICAgdG1wLl9pZCA9IGRvYy5faWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdG1wLl9pZDtcbiAgICAgICAgfVxuXG4gICAgICAgIF9kb2MgPSB0bXA7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBfZG9jO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgb25lIG9yIGFsbCB0aGUgZG9jdW1lbnRzIGluIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBfZ2V0RG9jdW1lbnRzXG4gKiBAcHJpdmF0ZVxuICogXG4gKiBAcGFyYW0ge0N1cnNvcn0gY3Vyc29yIC0gVGhlIGN1cnNvciB3aXRoIHRoZSBkb2N1bWVudHNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2p1c3RPbmU9ZmFsc2VdIC0gV2hldGhlciBpdCByZXRyaWV2ZXMgb25lIG9yIGFsbCB0aGUgZG9jdW1lbnRzXG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheXxPYmplY3R9IElmIFtqdXN0T25lPXRydWVdIHJldHVybnMgdGhlIG5leHQgZG9jdW1lbnQsIG90aGVyd2lzZSByZXR1cm5zIGFsbCB0aGUgZG9jdW1lbnRzXG4gKi9cbnZhciBfZ2V0RG9jdW1lbnRzID0gZnVuY3Rpb24oY3Vyc29yLCBqdXN0T25lID0gZmFsc2UpIHtcbiAgICB2YXIgZG9jcyA9IFtdO1xuICAgIFxuICAgIGlmIChjdXJzb3IuZmV0Y2hfbW9kZSA9PT0gQ3Vyc29yLkNPTFNDQU4pIHtcbiAgICAgICAgLy8gQ09MU0NBTiwgd2kgd2lsbCBpdGVyYXRlIG92ZXIgYWxsIGRvY3VtZW50c1xuICAgICAgICBkb2NzID0gXy5jbG9uZURlZXAoY3Vyc29yLmRvY3VtZW50cyk7XG4gICAgfSBlbHNlIGlmIChjdXJzb3IuZmV0Y2hfbW9kZSA9PT0gQ3Vyc29yLklEWFNDQU4pIHtcbiAgICAgICAgLy8gSURYU0NBTiwgd2kgd2lsbCBpdGVyYXRlIG92ZXIgYWxsIG5lZWRlZCBkb2N1bWVudHNcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjdXJzb3IuaW5kZXhlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IGluZGV4ID0gY3Vyc29yLmluZGV4ZXNbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBpbmRleC5zdGFydDsgaSA8IGluZGV4LmVuZDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gbGV0IGlkeF9pZCA9IGN1cnNvci5jb2xsZWN0aW9uLmdldEluZGV4KGluZGV4Lm5hbWUpW2ldO1xuICAgICAgICAgICAgICAgIGxldCBpZHhfaWQgPSBpbmRleC5pbmRleFtpXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBkb2NzLnB1c2goY3Vyc29yLmRvY3VtZW50c1tpZHhfaWRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBpZiAoY3Vyc29yLnNlbGVjdG9yX2lkKSB7XG4gICAgLy8gICAgIGlmIChfLmhhc0luKGN1cnNvci5jb2xsZWN0aW9uLmRvY19pbmRleGVzLCBfLnRvU3RyaW5nKGN1cnNvci5zZWxlY3Rvcl9pZCkpKSB7XG4gICAgLy8gICAgICAgICBsZXQgaWR4ID0gY3Vyc29yLmNvbGxlY3Rpb24uZG9jX2luZGV4ZXNbXy50b1N0cmluZyhjdXJzb3Iuc2VsZWN0b3JfaWQpXTtcbiAgICAgICAgICAgIFxuICAgIC8vICAgICAgICAgcmV0dXJuIEN1cnNvci5wcm9qZWN0KGN1cnNvci5jb2xsZWN0aW9uLmRvY3NbaWR4XSwgY3Vyc29yLmZpZWxkcyk7XG4gICAgLy8gICAgIH0gZWxzZSB7XG4gICAgLy8gICAgICAgICBpZiAoanVzdE9uZSkge1xuICAgIC8vICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgIC8vICAgICAgICAgfSBlbHNlIHtcbiAgICAvLyAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgLy8gICAgICAgICB9XG4gICAgLy8gICAgIH1cbiAgICAvLyB9XG4gICAgXG4gICAgLy8gVE9ETyBhZGQgd2FybmluZyB3aGVuIHNvcnQvc2tpcC9saW1pdCBhbmQgZmV0Y2hpbmcgb25lXG4gICAgLy8gVE9ETyBhZGQgd2FybmluZyB3aGVuIHNraXAvbGltaXQgd2l0aG91dCBvcmRlclxuICAgIC8vIFRPRE8gaW5kZXhcbiAgICB3aGlsZSAoY3Vyc29yLmN1cnNvcl9wb3MgPCBkb2NzLmxlbmd0aCkge1xuICAgICAgICB2YXIgX2RvYyA9IGRvY3NbY3Vyc29yLmN1cnNvcl9wb3NdO1xuICAgICAgICBjdXJzb3IuY3Vyc29yX3BvcysrO1xuICAgICAgICBcbiAgICAgICAgaWYgKGN1cnNvci5zZWxlY3Rvcl9jb21waWxlZC50ZXN0KF9kb2MpKSB7XG4gICAgICAgICAgICBpZiAoXy5pc05pbChjdXJzb3IuZGJfb2JqZWN0cykpIGN1cnNvci5kYl9vYmplY3RzID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIF9kb2MgPSBDdXJzb3IucHJvamVjdChfZG9jLCBjdXJzb3IuZmllbGRzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY3Vyc29yLmRiX29iamVjdHMucHVzaChfZG9jKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGp1c3RPbmUpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZm9yY2Ugc29ydFxuICAgICAgICAgICAgICAgIHJldHVybiBfZG9jO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKGN1cnNvci5kYl9vYmplY3RzKSkgcmV0dXJuIG51bGw7XG4gICAgXG4gICAgaWYgKCFjdXJzb3Iuc29ydGVkICYmIGhhc1NvcnRpbmcoY3Vyc29yKSkgY3Vyc29yLnNvcnQoKTtcbiAgICBcbiAgICB2YXIgaWR4RnJvbSA9IGN1cnNvci5za2lwVmFsdWU7XG4gICAgdmFyIGlkeFRvID0gY3Vyc29yLmxpbWl0VmFsdWUgIT09IC0xID8gKGN1cnNvci5saW1pdFZhbHVlICsgaWR4RnJvbSkgOiBjdXJzb3IuZGJfb2JqZWN0cy5sZW5ndGg7XG4gICAgXG4gICAgcmV0dXJuIGN1cnNvci5kYl9vYmplY3RzLnNsaWNlKGlkeEZyb20sIGlkeFRvKTtcbiAgICBcbn07XG5cbi8qKlxuICogT2J0YWlucyB0aGUgdG90YWwgb2YgZG9jdW1lbnRzIG9mIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjY291bnRcbiAqIFxuICogQHJldHVybnMge051bWJlcn0gVGhlIHRvdGFsIG9mIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuY291bnQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5mZXRjaEFsbCgpLmxlbmd0aDtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBzb3J0aW5nIG9mIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBDdXJzb3Ijc29ydFxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IHNwZWMgLSBUaGUgc29ydGluZyBzcGVjaWZpY2F0aW9uXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2V0U29ydGluZyA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICBpZiAoXy5pc05pbChzcGVjKSkgbG9nZ2VyLnRocm93KFwiWW91IG5lZWQgdG8gc3BlY2lmeSBhIHNvcnRpbmdcIik7XG4gICAgXG4gICAgaWYgKHNwZWMpIHtcbiAgICAgICAgdGhpcy5zb3J0VmFsdWUgPSBzcGVjO1xuICAgICAgICB0aGlzLnNvcnRfY29tcGlsZWQgPSAobmV3IFNlbGVjdG9yKHNwZWMsIFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgYSBzb3J0aW5nIG9uIHRoZSBjdXJzb3JcbiAqIFxuICogQG1ldGhvZCBDdXJzb3Ijc29ydFxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IHNwZWMgLSBUaGUgc29ydGluZyBzcGVjaWZpY2F0aW9uXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc29ydCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICB2YXIgX3NvcnQgPSB0aGlzLnNvcnRfY29tcGlsZWQgfHwgbnVsbDtcbiAgICBcbiAgICBpZiAoc3BlYykge1xuICAgICAgICBfc29ydCA9IG5ldyBTZWxlY3RvcihzcGVjLCBTZWxlY3Rvci5TT1JUX1NFTEVDVE9SKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF9zb3J0KSB7XG4gICAgICAgIGlmICghXy5pc05pbCh0aGlzLmRiX29iamVjdHMpICYmIF8uaXNBcnJheSh0aGlzLmRiX29iamVjdHMpKSB7XG4gICAgICAgICAgICB0aGlzLmRiX29iamVjdHMgPSB0aGlzLmRiX29iamVjdHMuc29ydChfc29ydCk7XG4gICAgICAgICAgICB0aGlzLnNvcnRlZCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldFNvcnRpbmcoc3BlYyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgbnVtYmVyIG9mIGRvY3VtZW50IHRvIHNraXAgd2hlbiBmZXRjaGluZyB0aGUgY3Vyc29yXG4gKiBcbiAqIEBtZXRob2QgQ3Vyc29yI3NraXBcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHNraXAgLSBUaGUgbnVtYmVyIG9mIGRvY3VtZW50cyB0byBza2lwXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uKHNraXApIHtcbiAgICBpZiAoXy5pc05pbChza2lwKSB8fCBfLmlzTmFOKHNraXApKSB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHBhc3MgYSBudW1iZXJcIik7XG4gICAgXG4gICAgdGhpcy5za2lwVmFsdWUgPSBza2lwO1xuICAgIFxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIG1heCBudW1iZXIgb2YgZG9jdW1lbnQgdG8gZmV0Y2hcbiAqIFxuICogQG1ldGhvZCBDdXJzb3IjbGltaXRcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IGxpbWl0IC0gVGhlIG1heCBudW1iZXIgb2YgZG9jdW1lbnRzXG4gKiBcbiAqIEByZXR1cm5zIHtDdXJzb3J9IFRoaXMgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUubGltaXQgPSBmdW5jdGlvbihsaW1pdCkge1xuICAgIGlmIChfLmlzTmlsKGxpbWl0KSB8fCBfLmlzTmFOKGxpbWl0KSkgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwYXNzIGEgbnVtYmVyXCIpO1xuICAgIFxuICAgIHRoaXMubGltaXRWYWx1ZSA9IGxpbWl0O1xuICAgIFxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSBjdXJzb3IgaGFzIGEgc29ydGluZyBkZWZpbmVkXG4gKiBcbiAqIEBtZXRob2QgaGFzU29ydGluZ1xuICogQHByaXZhdGVcbiAqIFxuICogQHBhcmFtIHtDdXJzb3J9IGN1cnNvciAtIFRoZSBjdXJzb3JcbiAqIFxuICogQHJldHVybnMge0Jvb2xlYW59IFdoZXRoZXIgdGhlIGN1cnNvciBoYXMgc29ydGluZyBvciBub3RcbiAqL1xudmFyIGhhc1NvcnRpbmcgPSBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICBpZiAoXy5pc05pbChjdXJzb3Iuc29ydFZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICAgIFxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5iYXRjaFNpemUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb250cm9scyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBNb25nb0RCIHdpbGwgcmV0dXJuIHRvIHRoZSBjbGllbnQgaW4gYSBzaW5nbGUgbmV0d29yayBtZXNzYWdlLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQ2xvc2UgYSBjdXJzb3IgYW5kIGZyZWUgYXNzb2NpYXRlZCBzZXJ2ZXIgcmVzb3VyY2VzLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmNvbW1lbnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBBdHRhY2hlcyBhIGNvbW1lbnQgdG8gdGhlIHF1ZXJ5IHRvIGFsbG93IGZvciB0cmFjZWFiaWxpdHkgaW4gdGhlIGxvZ3MgYW5kIHRoZSBzeXN0ZW0ucHJvZmlsZSBjb2xsZWN0aW9uLlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLmV4cGxhaW4gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBSZXBvcnRzIG9uIHRoZSBxdWVyeSBleGVjdXRpb24gcGxhbiBmb3IgYSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuaGludCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEZvcmNlcyBNb25nb0RCIHRvIHVzZSBhIHNwZWNpZmljIGluZGV4IGZvciBhIHF1ZXJ5LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLml0Y291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb21wdXRlcyB0aGUgdG90YWwgbnVtYmVyIG9mIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yIGNsaWVudC1zaWRlIGJ5IGZldGNoaW5nIGFuZCBpdGVyYXRpbmcgdGhlIHJlc3VsdCBzZXQuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWF4U2NhbiA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyB0aGUgbWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gc2NhbjsgZG9jdW1lbnRzIGZvciBjb2xsZWN0aW9uIHNjYW5zLCBrZXlzIGZvciBpbmRleCBzY2Fucy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5tYXhUaW1lTVMgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgYSBjdW11bGF0aXZlIHRpbWUgbGltaXQgaW4gbWlsbGlzZWNvbmRzIGZvciBwcm9jZXNzaW5nIG9wZXJhdGlvbnMgb24gYSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWF4ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGFuIGV4Y2x1c2l2ZSB1cHBlciBpbmRleCBib3VuZCBmb3IgYSBjdXJzb3IuIEZvciB1c2Ugd2l0aCBjdXJzb3IuaGludCgpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubWluID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BlY2lmaWVzIGFuIGluY2x1c2l2ZSBsb3dlciBpbmRleCBib3VuZCBmb3IgYSBjdXJzb3IuIEZvciB1c2Ugd2l0aCBjdXJzb3IuaGludCgpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubm9DdXJzb3JUaW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gSW5zdHJ1Y3RzIHRoZSBzZXJ2ZXIgdG8gYXZvaWQgY2xvc2luZyBhIGN1cnNvciBhdXRvbWF0aWNhbGx5IGFmdGVyIGEgcGVyaW9kIG9mIGluYWN0aXZpdHkuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUub2Jqc0xlZnRJbkJhdGNoID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUmV0dXJucyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBsZWZ0IGluIHRoZSBjdXJyZW50IGN1cnNvciBiYXRjaC5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5wcmV0dHkgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDb25maWd1cmVzIHRoZSBjdXJzb3IgdG8gZGlzcGxheSByZXN1bHRzIGluIGFuIGVhc3ktdG8tcmVhZCBmb3JtYXQuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucmVhZENvbmNlcm4gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWZpZXMgYSByZWFkIGNvbmNlcm4gZm9yIGEgZmluZCgpIG9wZXJhdGlvbi5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZWFkUHJlZiA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNwZWNpZmllcyBhIHJlYWQgcHJlZmVyZW5jZSB0byBhIGN1cnNvciB0byBjb250cm9sIGhvdyB0aGUgY2xpZW50IGRpcmVjdHMgcXVlcmllcyB0byBhIHJlcGxpY2Egc2V0LlxuICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG4vKipcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5DdXJzb3IucHJvdG90eXBlLnJldHVybktleSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIE1vZGlmaWVzIHRoZSBjdXJzb3IgdG8gcmV0dXJuIGluZGV4IGtleXMgcmF0aGVyIHRoYW4gdGhlIGRvY3VtZW50cy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zaG93UmVjb3JkSWQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBBZGRzIGFuIGludGVybmFsIHN0b3JhZ2UgZW5naW5lIElEIGZpZWxkIHRvIGVhY2ggZG9jdW1lbnQgcmV0dXJuZWQgYnkgdGhlIGN1cnNvci5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUmV0dXJucyBhIGNvdW50IG9mIHRoZSBkb2N1bWVudHMgaW4gdGhlIGN1cnNvciBhZnRlciBhcHBseWluZyBza2lwKCkgYW5kIGxpbWl0KCkgbWV0aG9kcy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zbmFwc2hvdCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEZvcmNlcyB0aGUgY3Vyc29yIHRvIHVzZSB0aGUgaW5kZXggb24gdGhlIF9pZCBmaWVsZC4gRW5zdXJlcyB0aGF0IHRoZSBjdXJzb3IgcmV0dXJucyBlYWNoIGRvY3VtZW50LCBcbiAgICAvLyB3aXRoIHJlZ2FyZHMgdG8gdGhlIHZhbHVlIG9mIHRoZSBfaWQgZmllbGQsIG9ubHkgb25jZS5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xufTtcblxuLyoqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS50YWlsYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIE1hcmtzIHRoZSBjdXJzb3IgYXMgdGFpbGFibGUuIE9ubHkgdmFsaWQgZm9yIGN1cnNvcnMgb3ZlciBjYXBwZWQgY29sbGVjdGlvbnMuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbi8qKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbkN1cnNvci5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFJldHVybnMgYW4gYXJyYXkgdGhhdCBjb250YWlucyBhbGwgZG9jdW1lbnRzIHJldHVybmVkIGJ5IHRoZSBjdXJzb3IuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ3Vyc29yOyJdfQ==
