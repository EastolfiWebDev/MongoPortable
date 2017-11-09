"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsw_logger_1 = require("jsw-logger");
var _ = require("lodash");
var selector_1 = require("../selector");
/*
class Options {
    public skip: number;
    public limit: number;
    public sort;

    private __defaultOptions = {
        skip: 0,
        limit: 15,
        sort: null
    };

    constructor(options?: any) {
        if (_.isNil(options)) {
            options = {};
        }

        this.skip = (options.skip ? options.skip : this.__defaultOptions.skip);
        this.limit = (options.limit ? options.limit : this.__defaultOptions.limit);
        this.sort = (options.sort ? options.sort : this.__defaultOptions.sort);
    }
}
*/
/***
 * Cursor
 *
 * @module Cursor
 * @since 0.0.1
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 * @classdesc Cursor class that maps a MongoDB-like cursor
 */
var Cursor = /** @class */ (function () {
    /***
     * @param {MongoPortable} db - Additional options
     * @param {Array} documents - The list of documents
     * @param {Object|Array|String} [selection={}] - The selection for matching documents
     * @param {Object|Array|String} [fields={}] - The fields of the document to show
     * @param {Object} [options] - Database object
     *
     * @param {Object} [options.pkFactory=null] - Object overriding the basic "ObjectId" primary key generation.
     */
    function Cursor(documents, selection, fields, options) {
        if (options === void 0) { options = {}; }
        this.sorted = false;
        this.indexes = null;
        this.defaultOptions = {
            skip: 0,
            limit: 15,
            sort: null
        };
        this.documents = documents;
        this.selector = selection;
        var opts = _.assign({}, this.defaultOptions, options);
        this.skipValue = opts.skip;
        this.limitValue = opts.limit;
        this.sortValue = opts.sort;
        this.logger = jsw_logger_1.JSWLogger.instance;
        /**** ADD IDX ****/
        if (selector_1.Selector.isSelectorCompiled(this.selector)) {
            this.selectorCompiled = this.selector;
        }
        else {
            this.selectorCompiled = new selector_1.Selector(this.selector, selector_1.Selector.MATCH_SELECTOR);
        }
        try {
            for (var _a = __values(this.selectorCompiled.clauses), _b = _a.next(); !_b.done; _b = _a.next()) {
                var clause = _b.value;
                if (clause.key === "_id") {
                    this.selectorId = clause.value;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            for (var _d = __values(this.selectorCompiled.clauses), _e = _d.next(); !_e.done; _e = _d.next()) {
                var clause = _e.value;
                if (clause.key === "_id") {
                    var val = clause.value;
                    if (_.isString(val) || _.isNumber(val)) {
                        this.selectorId = val;
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_f = _d.return)) _f.call(_d);
            }
            finally { if (e_2) throw e_2.error; }
        }
        /**** ADD IDX ****/
        this.fetchMode = Cursor.COLSCAN || Cursor.IDXSCAN;
        // this.indexes = null;//findUsableIndexes();
        // if (cursor.fetchMode === Cursor.COLSCAN) {
        // 	 // COLSCAN, wi will iterate over all documents
        // 	 docs = _.cloneDeep(cursor.collection.docs);
        // } else if (cursor.fetchMode === Cursor.IDXSCAN) {
        // 	 // IDXSCAN, wi will iterate over all needed documents
        // 	 for (let i = 0; i < cursor.indexes.length; i++) {
        // 		 let index = cursor.indexes[i];
        // 		 for (let i = index.start; i < index.end; i++) {
        // 			 let idx_id = cursor.collection.getIndex(index.name)[i];
        // 			 docs.push(cursor.collection.docs[idx_id]);
        // 		 }
        // 	 }
        // }
        this.fields = new selector_1.Selector(fields, selector_1.Selector.FIELD_SELECTOR);
        this.sortCompiled = new selector_1.Selector(this.sortValue, selector_1.Selector.SORT_SELECTOR);
        this.dbObjects = null;
        this.cursorPosition = 0;
        var e_1, _c, e_2, _f;
    }
    /***
     * Moves a cursor to the begining
     *
     * @method Cursor#rewind
     */
    Cursor.prototype.rewind = function () {
        this.dbObjects = null;
        this.cursorPosition = 0;
    };
    /***
     * Iterates over the cursor, calling a callback function
     *
     * @method Cursor#forEach
     *
     * @param {Function} [callback=null] - Callback function to be called for each document
     */
    Cursor.prototype.forEach = function (callback) {
        var docs = this.fetchAll();
        try {
            for (var docs_1 = __values(docs), docs_1_1 = docs_1.next(); !docs_1_1.done; docs_1_1 = docs_1.next()) {
                var doc = docs_1_1.value;
                callback(doc);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (docs_1_1 && !docs_1_1.done && (_a = docs_1.return)) _a.call(docs_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        var e_3, _a;
    };
    /***
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
    /***
     * Checks if the cursor has one document to be fetched
     *
     * @method Cursor#hasNext
     *
     * @returns {Boolean} True if we can fetch one more document
     */
    Cursor.prototype.hasNext = function () {
        return (this.cursorPosition < this.documents.length);
    };
    /***
     * Alias for {@link Cursor#fetchOne}
     *
     * @method Cursor#next
     */
    Cursor.prototype.next = function () {
        return this.fetchOne();
    };
    /***
     * Alias for {@link Cursor#fetchAll}
     *
     * @method Cursor#fetch
     */
    Cursor.prototype.fetch = function () {
        return this.fetchAll();
    };
    /***
     * Fetch all documents in the cursor
     *
     * @method Cursor#fetchAll
     *
     * @returns {Array} All the documents contained in the cursor
     */
    Cursor.prototype.fetchAll = function () {
        return getDocuments(this, false) || [];
    };
    /***
     * Retrieves the next document in the cursor
     *
     * @method Cursor#fetchOne
     *
     * @returns {Object} The next document in the cursor
     */
    Cursor.prototype.fetchOne = function () {
        return getDocuments(this, true);
    };
    /***
     * Obtains the total of documents of the cursor
     *
     * @method Cursor#count
     *
     * @returns {Number} The total of documents in the cursor
     */
    Cursor.prototype.count = function () {
        return this.fetchAll().length;
    };
    /***
     * Set the sorting of the cursor
     *
     * @method Cursor#sort
     *
     * @param {Object|Array|String} spec - The sorting specification
     *
     * @returns {Cursor} This instance so it can be chained with other methods
     */
    Cursor.prototype.setSorting = function (spec) {
        if (_.isNil(spec)) {
            this.logger.throw("You need to specify a sorting");
        }
        if (spec) {
            this.sortValue = spec;
            this.sortCompiled = (new selector_1.Selector(spec, selector_1.Selector.SORT_SELECTOR));
        }
        return this;
    };
    /***
     * Applies a sorting on the cursor
     *
     * @method Cursor#sort
     *
     * @param {Object|Array|String} spec - The sorting specification
     *
     * @returns {Cursor} This instance so it can be chained with other methods
     */
    Cursor.prototype.sort = function (spec) {
        var _sort = this.sortCompiled || null;
        if (spec) {
            _sort = new selector_1.Selector(spec, selector_1.Selector.SORT_SELECTOR);
        }
        if (_sort) {
            if (!_.isNil(this.dbObjects) && _.isArray(this.dbObjects)) {
                this.dbObjects = this.dbObjects.sort(_sort);
                this.sorted = true;
            }
            else {
                this.setSorting(spec);
            }
        }
        return this;
    };
    /***
     * Set the number of document to skip when fetching the cursor
     *
     * @method Cursor#skip
     *
     * @param {Number} skip - The number of documents to skip
     *
     * @returns {Cursor} This instance so it can be chained with other methods
     */
    Cursor.prototype.skip = function (skip) {
        if (_.isNil(skip) || _.isNaN(skip)) {
            throw new Error("Must pass a number");
        }
        this.skipValue = skip;
        return this;
    };
    /***
     * Set the max number of document to fetch
     *
     * @method Cursor#limit
     *
     * @param {Number} limit - The max number of documents
     *
     * @returns {Cursor} This instance so it can be chained with other methods
     */
    Cursor.prototype.limit = function (limit) {
        if (_.isNil(limit) || _.isNaN(limit)) {
            throw new Error("Must pass a number");
        }
        this.limitValue = limit;
        return this;
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.batchSize = function () {
        // Controls the number of documents MongoDB will return to the client in a single network message.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.close = function () {
        // Close a cursor and free associated server resources.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.comment = function () {
        // Attaches a comment to the query to allow for traceability in the logs and the system.profile collection.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.explain = function () {
        // Reports on the query execution plan for a cursor.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.hint = function () {
        // Forces MongoDB to use a specific index for a query.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.itcount = function () {
        // Computes the total number of documents in the cursor client-side by fetching and iterating the result set.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.maxScan = function () {
        // Specifies the maximum number of items to scan; documents for collection scans, keys for index scans.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.maxTimeMS = function () {
        // Specifies a cumulative time limit in milliseconds for processing operations on a cursor.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.max = function () {
        // Specifies an exclusive upper index bound for a cursor. For use with cursor.hint()
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.min = function () {
        // Specifies an inclusive lower index bound for a cursor. For use with cursor.hint()
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.noCursorTimeout = function () {
        // Instructs the server to avoid closing a cursor automatically after a period of inactivity.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.objsLeftInBatch = function () {
        // Returns the number of documents left in the current cursor batch.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.pretty = function () {
        // Configures the cursor to display results in an easy-to-read format.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.readConcern = function () {
        // Specifies a read concern for a find() operation.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.readPref = function () {
        // Specifies a read preference to a cursor to control how the client directs queries to a replica set.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.returnKey = function () {
        // Modifies the cursor to return index keys rather than the documents.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.showRecordId = function () {
        // Adds an internal storage engine ID field to each document returned by the cursor.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.size = function () {
        // Returns a count of the documents in the cursor after applying skip() and limit() methods.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.snapshot = function () {
        // Forces the cursor to use the index on the _id field. Ensures that the cursor returns each document,
        // with regards to the value of the _id field, only once.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.tailable = function () {
        // Marks the cursor as tailable. Only valid for cursors over capped collections.
        throw new Error("Not yet implemented");
    };
    /***
     * @todo Implement
     */
    Cursor.prototype.toArray = function () {
        // Returns an array that contains all documents returned by the cursor.
        throw new Error("Not yet implemented");
    };
    Cursor.sort = function (doc, fields) {
        // Sort the elements of a cursor
        throw new Error("Not yet implemented");
    };
    /***
     * Projects the fields of one or several documents, changing the output
     *
     * @method Cursor.project
     *
     * @param {Array|Object} doc - The document/s that will be projected
     * @param {String|Array|Object} spec - Fields projection specification. Can be an space/comma separated list, an array, or an object
     *
     * @returns {Array|Object} The document/s after the projection
     */
    Cursor.project = function (doc, spec, aggregation) {
        // if (_.isNil(doc)) this.logger.throw("doc param required");
        // if (_.isNil(spec)) this.logger.throw("spec param required");
        if (aggregation === void 0) { aggregation = false; }
        var fields = null;
        if (aggregation) {
            fields = new selector_1.Selector(spec, selector_1.Selector.AGG_FIELD_SELECTOR);
        }
        else {
            fields = new selector_1.Selector(spec, selector_1.Selector.FIELD_SELECTOR);
        }
        if (_.isArray(doc)) {
            for (var i = 0; i < doc.length; i++) {
                doc[i] = mapFields(doc[i], fields);
            }
            return doc;
        }
        else {
            return mapFields(doc, fields);
        }
    };
    Cursor.COLSCAN = "colscan";
    Cursor.IDXSCAN = "idxscan";
    return Cursor;
}());
exports.Cursor = Cursor;
var mapFields = function (doc, fields) {
    var _doc = _.cloneDeep(doc);
    if (!_.isNil(fields) && _.isPlainObject(fields) && !_.isEqual(fields, {})) {
        var showId = true;
        var showing = null;
        // Whether if we showing the _id field
        if (_.hasIn(fields, "_id") && fields._id === -1) {
            showId = false;
        }
        for (var field in fields) {
            // Whether if we are showing or hidding fields
            if (field !== "_id") {
                if (fields[field] === 1) {
                    showing = true;
                    break;
                }
                else if (fields[field] === -1) {
                    showing = false;
                    break;
                }
            }
        }
        var tmp = null;
        try {
            for (var _a = __values(Object.keys(fields)), _b = _a.next(); !_b.done; _b = _a.next()) {
                var field = _b.value;
                if (tmp === null) {
                    if (showing) {
                        tmp = {};
                    }
                    else {
                        tmp = _.cloneDeep(doc);
                    }
                }
                // Add or remove the field
                if (fields[field] === 1 || fields[field] === -1) {
                    // Show the field
                    if (showing) {
                        tmp[field] = doc[field];
                    }
                    else {
                        // Hide the field
                        delete tmp[field];
                    }
                }
                else {
                    // Show the new field (rename)
                    tmp[field] = doc[fields[field]];
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_4) throw e_4.error; }
        }
        // Add or remove the _id field
        if (showId) {
            tmp._id = doc._id;
        }
        else {
            delete tmp._id;
        }
        _doc = tmp;
    }
    return _doc;
    var e_4, _c;
};
/***
 * Retrieves one or all the documents in the cursor
 *
 * @method getDocuments
 * @private
 *
 * @param {Cursor} cursor - The cursor with the documents
 * @param {Boolean} [justOne=false] - Whether it retrieves one or all the documents
 *
 * @returns {Array|Object} If [justOne=true] returns the next document, otherwise returns all the documents
 */
var getDocuments = function (cursor, justOne) {
    if (justOne === void 0) { justOne = false; }
    var docs = [];
    if (cursor.fetchMode === Cursor.COLSCAN) {
        // COLSCAN, wi will iterate over all documents
        docs = _.cloneDeep(cursor.documents);
    }
    else if (cursor.fetchMode === Cursor.IDXSCAN) {
        try {
            // IDXSCAN, wi will iterate over all needed documents
            for (var cursor_1 = __values(cursor), cursor_1_1 = cursor_1.next(); !cursor_1_1.done; cursor_1_1 = cursor_1.next()) {
                var index = cursor_1_1.value;
                for (var i = index.start; i < index.end; i++) {
                    // let idxId = cursor.collection.getIndex(index.name)[i];
                    var idxId = index.index[i];
                    docs.push(cursor.documents[idxId]);
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (cursor_1_1 && !cursor_1_1.done && (_a = cursor_1.return)) _a.call(cursor_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
    }
    // if (cursor.selectorId) {
    // 	 if (_.hasIn(cursor.collection.doc_indexes, _.toString(cursor.selectorId))) {
    // 		 let idx = cursor.collection.doc_indexes[_.toString(cursor.selectorId)];
    // 		 return Cursor.project(cursor.collection.docs[idx], cursor.fields);
    // 	 } else {
    // 		 if (justOne) {
    // 			 return null;
    // 		 } else {
    // 			 return [];
    // 		 }
    // 	 }
    // }
    // TODO add warning when sort/skip/limit and fetching one
    // TODO add warning when skip/limit without order
    // TODO index
    while (cursor.cursorPosition < docs.length) {
        var _doc = docs[cursor.cursorPosition];
        cursor.cursorPosition++;
        if (cursor.selectorCompiled.test(_doc)) {
            if (_.isNil(cursor.dbObjects)) {
                cursor.dbObjects = [];
            }
            _doc = Cursor.project(_doc, cursor.fields);
            cursor.dbObjects.push(_doc);
            if (justOne) {
                // Add force sort
                return _doc;
            }
        }
    }
    if (_.isNil(cursor.dbObjects)) {
        return null;
    }
    if (!cursor.sorted && hasSorting(cursor)) {
        cursor.sort();
    }
    var idxFrom = cursor.skipValue;
    var idxTo = cursor.limitValue !== -1 ? (cursor.limitValue + idxFrom) : cursor.dbObjects.length;
    return cursor.dbObjects.slice(idxFrom, idxTo);
    var e_5, _a;
};
/***
 * Checks if a cursor has a sorting defined
 *
 * @method hasSorting
 * @private
 *
 * @param {Cursor} cursor - The cursor
 *
 * @returns {Boolean} Whether the cursor has sorting or not
 */
var hasSorting = function (cursor) {
    if (_.isNil(cursor.sortValue)) {
        return false;
    }
    return true;
};
//# sourceMappingURL=Cursor.js.map