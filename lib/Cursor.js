'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @file Cursor.js - based on Monglo#Cursor ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var logger = null;

module.exports = function (Selector, Logger, _) {

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

    return Cursor;
};
//# sourceMappingURL=data:application/json;base64,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Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsS0FBakIsR0FBeUIsWUFBVzs7QUFFaEMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsT0FBakIsR0FBMkIsWUFBVzs7QUFFbEMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsT0FBakIsR0FBMkIsWUFBVzs7QUFFbEMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsSUFBakIsR0FBd0IsWUFBVzs7QUFFL0IsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsT0FBakIsR0FBMkIsWUFBVzs7QUFFbEMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsT0FBakIsR0FBMkIsWUFBVzs7QUFFbEMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsU0FBakIsR0FBNkIsWUFBVzs7QUFFcEMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsR0FBakIsR0FBdUIsWUFBVzs7QUFFOUIsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsR0FBakIsR0FBdUIsWUFBVzs7QUFFOUIsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsZUFBakIsR0FBbUMsWUFBVzs7QUFFMUMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsZUFBakIsR0FBbUMsWUFBVzs7QUFFMUMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsTUFBakIsR0FBMEIsWUFBVzs7QUFFakMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsV0FBakIsR0FBK0IsWUFBVzs7QUFFdEMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsUUFBakIsR0FBNEIsWUFBVzs7QUFFbkMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsU0FBakIsR0FBNkIsWUFBVzs7QUFFcEMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsWUFBakIsR0FBZ0MsWUFBVzs7QUFFdkMsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsSUFBakIsR0FBd0IsWUFBVzs7QUFFL0IsY0FBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0gsS0FIRDs7Ozs7QUFRQSxXQUFPLFNBQVAsQ0FBaUIsUUFBakIsR0FBNEIsWUFBVzs7O0FBR25DLGNBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILEtBSkQ7Ozs7O0FBU0EsV0FBTyxTQUFQLENBQWlCLFFBQWpCLEdBQTRCLFlBQVc7O0FBRW5DLGNBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILEtBSEQ7Ozs7O0FBUUEsV0FBTyxTQUFQLENBQWlCLE9BQWpCLEdBQTJCLFlBQVc7O0FBRWxDLGNBQU0sSUFBSSxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNILEtBSEQ7O0FBS0EsV0FBTyxNQUFQO0FBQ0gsQ0Fub0JEIiwiZmlsZSI6IkN1cnNvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgQ3Vyc29yLmpzIC0gYmFzZWQgb24gTW9uZ2xvI0N1cnNvciAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIGxvZ2dlciA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oU2VsZWN0b3IsIExvZ2dlciwgXykge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEN1cnNvclxuICAgICAqIFxuICAgICAqIEBtb2R1bGUgQ3Vyc29yXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHNpbmNlIDAuMC4xXG4gICAgICogXG4gICAgICogQGNsYXNzZGVzYyBDdXJzb3IgY2xhc3MgdGhhdCBtYXBzIGEgTW9uZ29EQi1saWtlIGN1cnNvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TW9uZ29Qb3J0YWJsZX0gZGIgLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkb2N1bWVudHMgLSBUaGUgbGlzdCBvZiBkb2N1bWVudHNcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbZmllbGRzPXt9XSAtIFRoZSBmaWVsZHMgb2YgdGhlIGRvY3VtZW50IHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLnBrRmFjdG9yeT1udWxsXSAtIE9iamVjdCBvdmVycmlkaW5nIHRoZSBiYXNpYyBcIk9iamVjdElkXCIgcHJpbWFyeSBrZXkgZ2VuZXJhdGlvbi5cbiAgICAgKiBcbiAgICAgKi9cbiAgICBjbGFzcyBDdXJzb3Ige1xuICAgICAgICBjb25zdHJ1Y3Rvcihkb2N1bWVudHMsIHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgICAgIHRoaXMuZG9jdW1lbnRzID0gZG9jdW1lbnRzO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RvciA9IHNlbGVjdGlvbjtcbiAgICAgICAgICAgIHRoaXMuc2tpcFZhbHVlID0gb3B0aW9ucy5za2lwIHx8IDA7XG4gICAgICAgICAgICB0aGlzLmxpbWl0VmFsdWUgPSBvcHRpb25zLmxpbWl0IHx8IDE1O1xuICAgICAgICAgICAgdGhpcy5zb3J0VmFsdWUgPSBvcHRpb25zLnNvcnQgfHwgbnVsbDtcbiAgICAgICAgICAgIHRoaXMuc29ydGVkID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgICAgICAvKiogQUREIElEWCAqKi9cbiAgICAgICAgICAgIGlmIChTZWxlY3Rvci5pc1NlbGVjdG9yQ29tcGlsZWQodGhpcy5zZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkID0gdGhpcy5zZWxlY3RvcjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rvcl9jb21waWxlZCA9IG5ldyBTZWxlY3Rvcih0aGlzLnNlbGVjdG9yLCBTZWxlY3Rvci5NQVRDSF9TRUxFQ1RPUik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zZWxlY3Rvcl9jb21waWxlZC5jbGF1c2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuY2xhdXNlc1tpXS5rZXkgPT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0b3JfaWQgPSB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkLmNsYXVzZXNbaV0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuY2xhdXNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdG9yX2NvbXBpbGVkLmNsYXVzZXNbaV0ua2V5ID09PSAnX2lkJykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgX3ZhbCA9IHRoaXMuc2VsZWN0b3JfY29tcGlsZWQuY2xhdXNlc1tpXS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChfLmlzU3RyaW5nKF92YWwpIHx8IF8uaXNOdW1iZXIoX3ZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0b3JfaWQgPSBfdmFsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgLyoqIEFERCBJRFggKiovXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuZmV0Y2hfbW9kZSA9IEN1cnNvci5DT0xTQ0FOIHx8IEN1cnNvci5JRFhTQ0FOO1xuICAgICAgICAgICAgdGhpcy5pbmRleGV4ID0gbnVsbDsvL2ZpbmRVc2FibGVJbmRleGVzKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGlmIChjdXJzb3IuZmV0Y2hfbW9kZSA9PT0gQ3Vyc29yLkNPTFNDQU4pIHtcbiAgICAgICAgICAgIC8vICAgICAvLyBDT0xTQ0FOLCB3aSB3aWxsIGl0ZXJhdGUgb3ZlciBhbGwgZG9jdW1lbnRzXG4gICAgICAgICAgICAvLyAgICAgZG9jcyA9IF8uY2xvbmVEZWVwKGN1cnNvci5jb2xsZWN0aW9uLmRvY3MpO1xuICAgICAgICAgICAgLy8gfSBlbHNlIGlmIChjdXJzb3IuZmV0Y2hfbW9kZSA9PT0gQ3Vyc29yLklEWFNDQU4pIHtcbiAgICAgICAgICAgIC8vICAgICAvLyBJRFhTQ0FOLCB3aSB3aWxsIGl0ZXJhdGUgb3ZlciBhbGwgbmVlZGVkIGRvY3VtZW50c1xuICAgICAgICAgICAgLy8gICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3Vyc29yLmluZGV4ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgbGV0IGluZGV4ID0gY3Vyc29yLmluZGV4ZXNbaV07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gICAgICAgICBmb3IgKGxldCBpID0gaW5kZXguc3RhcnQ7IGkgPCBpbmRleC5lbmQ7IGkrKykge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgbGV0IGlkeF9pZCA9IGN1cnNvci5jb2xsZWN0aW9uLmdldEluZGV4KGluZGV4Lm5hbWUpW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBkb2NzLnB1c2goY3Vyc29yLmNvbGxlY3Rpb24uZG9jc1tpZHhfaWRdKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5maWVsZHMgPSBuZXcgU2VsZWN0b3IoZmllbGRzLCBTZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc29ydF9jb21waWxlZCA9IG5ldyBTZWxlY3Rvcih0aGlzLnNvcnRWYWx1ZSwgU2VsZWN0b3IuU09SVF9TRUxFQ1RPUik7XG4gICAgICAgIFxuICAgICAgICAgICAgdGhpcy5kYl9vYmplY3RzID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yX3BvcyA9IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgQ3Vyc29yLkNPTFNDQU4gPSAnY29sc2Nhbic7XG4gICAgQ3Vyc29yLklEWFNDQU4gPSAnaWR4c2Nhbic7XG4gICAgXG4gICAgLyoqXG4gICAgICogTW92ZXMgYSBjdXJzb3IgdG8gdGhlIGJlZ2luaW5nXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDdXJzb3IjcmV3aW5kXG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS5yZXdpbmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5kYl9vYmplY3RzID0gbnVsbDtcbiAgICAgICAgdGhpcy5jdXJzb3JfcG9zID0gMDtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGVzIG92ZXIgdGhlIGN1cnNvciwgY2FsbGluZyBhIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDdXJzb3IjZm9yRWFjaFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBmb3IgZWFjaCBkb2N1bWVudFxuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIGxldCBkb2NzID0gdGhpcy5mZXRjaEFsbCgpO1xuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkb2NzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhkb2NzW2ldKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZXMgb3ZlciB0aGUgY3Vyc29yLCByZXR1cm5pbmcgYSBuZXcgYXJyYXkgd2l0aCB0aGUgZG9jdW1lbnRzIGFmZmVjdGVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ3Vyc29yI21hcFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBmb3IgZWFjaCBkb2N1bWVudFxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIGRvY3VtZW50cyBhZnRlciBiZWluZyBhZmZlY3RlZCB3aXRoIHRoZSBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlcyA9IFtdO1xuICAgIFxuICAgICAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKGRvYykge1xuICAgICAgICAgICAgcmVzLnB1c2goY2FsbGJhY2soZG9jKSk7XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSBjdXJzb3IgaGFzIG9uZSBkb2N1bWVudCB0byBiZSBmZXRjaGVkXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDdXJzb3IjaGFzTmV4dFxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHdlIGNhbiBmZXRjaCBvbmUgbW9yZSBkb2N1bWVudFxuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGFzTmV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuY3Vyc29yX3BvcyA8IHRoaXMuZG9jdW1lbnRzLmxlbmd0aCk7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBbGlhcyBmb3Ige0BsaW5rIEN1cnNvciNmZXRjaE9uZX1cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIEN1cnNvciNuZXh0XG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoT25lKCk7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBbGlhcyBmb3Ige0BsaW5rIEN1cnNvciNmZXRjaEFsbH1cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIEN1cnNvciNmZXRjaFxuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmV0Y2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hBbGwoKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEZldGNoIGFsbCBkb2N1bWVudHMgaW4gdGhlIGN1cnNvclxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ3Vyc29yI2ZldGNoQWxsXG4gICAgICogXG4gICAgICogQHJldHVybnMge0FycmF5fSBBbGwgdGhlIGRvY3VtZW50cyBjb250YWluZWQgaW4gdGhlIGN1cnNvclxuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmV0Y2hBbGwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXREb2N1bWVudHModGhpcywgZmFsc2UpIHx8IFtdO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBuZXh0IGRvY3VtZW50IGluIHRoZSBjdXJzb3JcbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIEN1cnNvciNmZXRjaE9uZVxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBuZXh0IGRvY3VtZW50IGluIHRoZSBjdXJzb3JcbiAgICAgKi9cbiAgICBDdXJzb3IucHJvdG90eXBlLmZldGNoT25lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0RG9jdW1lbnRzKHRoaXMsIHRydWUpO1xuICAgIH07XG4gICAgXG4gICAgXG4gICAgXG4gICAgQ3Vyc29yLnNvcnQgPSBmdW5jdGlvbihkb2MsIGZpZWxkcykge1xuICAgICAgICBcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2plY3RzIHRoZSBmaWVsZHMgb2Ygb25lIG9yIHNldmVyYWwgZG9jdW1lbnRzLCBjaGFuZ2luZyB0aGUgb3V0cHV0XG4gICAgICogXG4gICAgICogQG1ldGhvZCBDdXJzb3IucHJvamVjdFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSBkb2MgLSBUaGUgZG9jdW1lbnQvcyB0aGF0IHdpbGwgYmUgcHJvamVjdGVkXG4gICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl8T2JqZWN0fSBzcGVjIC0gRmllbGRzIHByb2plY3Rpb24gc3BlY2lmaWNhdGlvbi4gQ2FuIGJlIGFuIHNwYWNlL2NvbW1hIHNlcGFyYXRlZCBsaXN0LCBhbiBhcnJheSwgb3IgYW4gb2JqZWN0XG4gICAgICogXG4gICAgICogQHJldHVybnMge0FycmF5fE9iamVjdH0gVGhlIGRvY3VtZW50L3MgYWZ0ZXIgdGhlIHByb2plY3Rpb25cbiAgICAgKi9cbiAgICBDdXJzb3IucHJvamVjdCA9IGZ1bmN0aW9uIChkb2MsIHNwZWMsIGFnZ3JlZ2F0aW9uID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoZG9jKSkgbG9nZ2VyLnRocm93KCdkb2MgcGFyYW0gcmVxdWlyZWQnKTtcbiAgICAgICAgaWYgKF8uaXNOaWwoc3BlYykpIGxvZ2dlci50aHJvdygnc3BlYyBwYXJhbSByZXF1aXJlZCcpO1xuICAgIFxuICAgICAgICB2YXIgZmllbGRzID0gbnVsbDtcbiAgICAgICAgaWYgKGFnZ3JlZ2F0aW9uKSB7XG4gICAgICAgICAgICBmaWVsZHMgPSBuZXcgU2VsZWN0b3Ioc3BlYywgU2VsZWN0b3IuQUdHX0ZJRUxEX1NFTEVDVE9SKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZpZWxkcyA9IG5ldyBTZWxlY3RvcihzcGVjLCBTZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQXJyYXkoZG9jKSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb2MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBkb2NbaV0gPSBfbWFwRmllbGRzKGRvY1tpXSwgZmllbGRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGRvYztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBfbWFwRmllbGRzKGRvYywgZmllbGRzKTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICBcbiAgICBcbiAgICB9O1xuICAgIFxuICAgIHZhciBfbWFwRmllbGRzID0gZnVuY3Rpb24gKGRvYywgZmllbGRzKSB7XG4gICAgICAgIHZhciBfZG9jID0gXy5jbG9uZURlZXAoZG9jKTtcbiAgICBcbiAgICAgICAgaWYgKCFfLmlzTmlsKGZpZWxkcykgJiYgXy5pc1BsYWluT2JqZWN0KGZpZWxkcykgJiYgIV8uaXNFcXVhbChmaWVsZHMsIHt9KSkge1xuICAgICAgICAgICAgdmFyIHNob3dJZCA9IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd2luZyA9IG51bGw7XG4gICAgXG4gICAgICAgICAgICAvLyBXaGV0aGVyIGlmIHdlIHNob3dpbmcgdGhlIF9pZCBmaWVsZFxuICAgICAgICAgICAgaWYgKF8uaGFzSW4oZmllbGRzLCAnX2lkJykgJiYgZmllbGRzLl9pZCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBzaG93SWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIGZvciAodmFyIGZpZWxkIGluIGZpZWxkcykge1xuICAgICAgICAgICAgICAgIC8vIFdoZXRoZXIgaWYgd2UgYXJlIHNob3dpbmcgb3IgaGlkZGluZyBmaWVsZHNcbiAgICAgICAgICAgICAgICBpZiAoZmllbGQgIT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZHNbZmllbGRdID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZpZWxkc1tmaWVsZF0gPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIHZhciB0bXAgPSBudWxsO1xuICAgIFxuICAgICAgICAgICAgZm9yICh2YXIgZmllbGQgaW4gZmllbGRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRtcCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2hvd2luZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG1wID0ge307XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0bXAgPSBfLmNsb25lRGVlcChkb2MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgb3IgcmVtb3ZlIHRoZSBmaWVsZFxuICAgICAgICAgICAgICAgIGlmIChmaWVsZHNbZmllbGRdID09PSAxIHx8IGZpZWxkc1tmaWVsZF0gPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgIGlmIChzaG93aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0bXBbZmllbGRdID0gZG9jW2ZpZWxkXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdG1wW2ZpZWxkXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG5ldyBmaWVsZCAocmVuYW1lKVxuICAgICAgICAgICAgICAgICAgICB0bXBbZmllbGRdID0gZG9jW2ZpZWxkc1tmaWVsZF1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIC8vIEFkZCBvciByZW1vdmUgdGhlIF9pZCBmaWVsZFxuICAgICAgICAgICAgaWYgKHNob3dJZCkge1xuICAgICAgICAgICAgICAgIHRtcC5faWQgPSBkb2MuX2lkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdG1wLl9pZDtcbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIF9kb2MgPSB0bXA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBfZG9jO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIG9uZSBvciBhbGwgdGhlIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yXG4gICAgICogXG4gICAgICogQG1ldGhvZCBfZ2V0RG9jdW1lbnRzXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0N1cnNvcn0gY3Vyc29yIC0gVGhlIGN1cnNvciB3aXRoIHRoZSBkb2N1bWVudHNcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtqdXN0T25lPWZhbHNlXSAtIFdoZXRoZXIgaXQgcmV0cmlldmVzIG9uZSBvciBhbGwgdGhlIGRvY3VtZW50c1xuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtBcnJheXxPYmplY3R9IElmIFtqdXN0T25lPXRydWVdIHJldHVybnMgdGhlIG5leHQgZG9jdW1lbnQsIG90aGVyd2lzZSByZXR1cm5zIGFsbCB0aGUgZG9jdW1lbnRzXG4gICAgICovXG4gICAgdmFyIF9nZXREb2N1bWVudHMgPSBmdW5jdGlvbihjdXJzb3IsIGp1c3RPbmUgPSBmYWxzZSkge1xuICAgICAgICB2YXIgZG9jcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKGN1cnNvci5mZXRjaF9tb2RlID09PSBDdXJzb3IuQ09MU0NBTikge1xuICAgICAgICAgICAgLy8gQ09MU0NBTiwgd2kgd2lsbCBpdGVyYXRlIG92ZXIgYWxsIGRvY3VtZW50c1xuICAgICAgICAgICAgZG9jcyA9IF8uY2xvbmVEZWVwKGN1cnNvci5kb2N1bWVudHMpO1xuICAgICAgICB9IGVsc2UgaWYgKGN1cnNvci5mZXRjaF9tb2RlID09PSBDdXJzb3IuSURYU0NBTikge1xuICAgICAgICAgICAgLy8gSURYU0NBTiwgd2kgd2lsbCBpdGVyYXRlIG92ZXIgYWxsIG5lZWRlZCBkb2N1bWVudHNcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3Vyc29yLmluZGV4ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgaW5kZXggPSBjdXJzb3IuaW5kZXhlc1tpXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gaW5kZXguc3RhcnQ7IGkgPCBpbmRleC5lbmQ7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAvLyBsZXQgaWR4X2lkID0gY3Vyc29yLmNvbGxlY3Rpb24uZ2V0SW5kZXgoaW5kZXgubmFtZSlbaV07XG4gICAgICAgICAgICAgICAgICAgIGxldCBpZHhfaWQgPSBpbmRleC5pbmRleFtpXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGRvY3MucHVzaChjdXJzb3IuZG9jdW1lbnRzW2lkeF9pZF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gaWYgKGN1cnNvci5zZWxlY3Rvcl9pZCkge1xuICAgICAgICAvLyAgICAgaWYgKF8uaGFzSW4oY3Vyc29yLmNvbGxlY3Rpb24uZG9jX2luZGV4ZXMsIF8udG9TdHJpbmcoY3Vyc29yLnNlbGVjdG9yX2lkKSkpIHtcbiAgICAgICAgLy8gICAgICAgICBsZXQgaWR4ID0gY3Vyc29yLmNvbGxlY3Rpb24uZG9jX2luZGV4ZXNbXy50b1N0cmluZyhjdXJzb3Iuc2VsZWN0b3JfaWQpXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgLy8gICAgICAgICByZXR1cm4gQ3Vyc29yLnByb2plY3QoY3Vyc29yLmNvbGxlY3Rpb24uZG9jc1tpZHhdLCBjdXJzb3IuZmllbGRzKTtcbiAgICAgICAgLy8gICAgIH0gZWxzZSB7XG4gICAgICAgIC8vICAgICAgICAgaWYgKGp1c3RPbmUpIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIC8vICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gfVxuICAgICAgICBcbiAgICAgICAgLy8gVE9ETyBhZGQgd2FybmluZyB3aGVuIHNvcnQvc2tpcC9saW1pdCBhbmQgZmV0Y2hpbmcgb25lXG4gICAgICAgIC8vIFRPRE8gYWRkIHdhcm5pbmcgd2hlbiBza2lwL2xpbWl0IHdpdGhvdXQgb3JkZXJcbiAgICAgICAgLy8gVE9ETyBpbmRleFxuICAgICAgICB3aGlsZSAoY3Vyc29yLmN1cnNvcl9wb3MgPCBkb2NzLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIF9kb2MgPSBkb2NzW2N1cnNvci5jdXJzb3JfcG9zXTtcbiAgICAgICAgICAgIGN1cnNvci5jdXJzb3JfcG9zKys7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjdXJzb3Iuc2VsZWN0b3JfY29tcGlsZWQudGVzdChfZG9jKSkge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzTmlsKGN1cnNvci5kYl9vYmplY3RzKSkgY3Vyc29yLmRiX29iamVjdHMgPSBbXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBfZG9jID0gQ3Vyc29yLnByb2plY3QoX2RvYywgY3Vyc29yLmZpZWxkcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY3Vyc29yLmRiX29iamVjdHMucHVzaChfZG9jKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoanVzdE9uZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZm9yY2Ugc29ydFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX2RvYztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGN1cnNvci5kYl9vYmplY3RzKSkgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWN1cnNvci5zb3J0ZWQgJiYgaGFzU29ydGluZyhjdXJzb3IpKSBjdXJzb3Iuc29ydCgpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGlkeEZyb20gPSBjdXJzb3Iuc2tpcFZhbHVlO1xuICAgICAgICB2YXIgaWR4VG8gPSBjdXJzb3IubGltaXRWYWx1ZSAhPT0gLTEgPyAoY3Vyc29yLmxpbWl0VmFsdWUgKyBpZHhGcm9tKSA6IGN1cnNvci5kYl9vYmplY3RzLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjdXJzb3IuZGJfb2JqZWN0cy5zbGljZShpZHhGcm9tLCBpZHhUbyk7XG4gICAgICAgIFxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogT2J0YWlucyB0aGUgdG90YWwgb2YgZG9jdW1lbnRzIG9mIHRoZSBjdXJzb3JcbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIEN1cnNvciNjb3VudFxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSB0b3RhbCBvZiBkb2N1bWVudHMgaW4gdGhlIGN1cnNvclxuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUuY291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hBbGwoKS5sZW5ndGg7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgdGhlIHNvcnRpbmcgb2YgdGhlIGN1cnNvclxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ3Vyc29yI3NvcnRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IHNwZWMgLSBUaGUgc29ydGluZyBzcGVjaWZpY2F0aW9uXG4gICAgICogXG4gICAgICogQHJldHVybnMge0N1cnNvcn0gVGhpcyBpbnN0YW5jZSBzbyBpdCBjYW4gYmUgY2hhaW5lZCB3aXRoIG90aGVyIG1ldGhvZHNcbiAgICAgKi9cbiAgICBDdXJzb3IucHJvdG90eXBlLnNldFNvcnRpbmcgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHNwZWMpKSBsb2dnZXIudGhyb3coXCJZb3UgbmVlZCB0byBzcGVjaWZ5IGEgc29ydGluZ1wiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzcGVjKSB7XG4gICAgICAgICAgICB0aGlzLnNvcnRWYWx1ZSA9IHNwZWM7XG4gICAgICAgICAgICB0aGlzLnNvcnRfY29tcGlsZWQgPSAobmV3IFNlbGVjdG9yKHNwZWMsIFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIGEgc29ydGluZyBvbiB0aGUgY3Vyc29yXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDdXJzb3Ijc29ydFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gc3BlYyAtIFRoZSBzb3J0aW5nIHNwZWNpZmljYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7Q3Vyc29yfSBUaGlzIGluc3RhbmNlIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUuc29ydCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgdmFyIF9zb3J0ID0gdGhpcy5zb3J0X2NvbXBpbGVkIHx8IG51bGw7XG4gICAgICAgIFxuICAgICAgICBpZiAoc3BlYykge1xuICAgICAgICAgICAgX3NvcnQgPSBuZXcgU2VsZWN0b3Ioc3BlYywgU2VsZWN0b3IuU09SVF9TRUxFQ1RPUik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfc29ydCkge1xuICAgICAgICAgICAgaWYgKCFfLmlzTmlsKHRoaXMuZGJfb2JqZWN0cykgJiYgXy5pc0FycmF5KHRoaXMuZGJfb2JqZWN0cykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRiX29iamVjdHMgPSB0aGlzLmRiX29iamVjdHMuc29ydChfc29ydCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zb3J0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFNvcnRpbmcoc3BlYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHRoZSBudW1iZXIgb2YgZG9jdW1lbnQgdG8gc2tpcCB3aGVuIGZldGNoaW5nIHRoZSBjdXJzb3JcbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIEN1cnNvciNza2lwXG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHNraXAgLSBUaGUgbnVtYmVyIG9mIGRvY3VtZW50cyB0byBza2lwXG4gICAgICogXG4gICAgICogQHJldHVybnMge0N1cnNvcn0gVGhpcyBpbnN0YW5jZSBzbyBpdCBjYW4gYmUgY2hhaW5lZCB3aXRoIG90aGVyIG1ldGhvZHNcbiAgICAgKi9cbiAgICBDdXJzb3IucHJvdG90eXBlLnNraXAgPSBmdW5jdGlvbihza2lwKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHNraXApIHx8IF8uaXNOYU4oc2tpcCkpIHRocm93IG5ldyBFcnJvcihcIk11c3QgcGFzcyBhIG51bWJlclwiKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2tpcFZhbHVlID0gc2tpcDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHRoZSBtYXggbnVtYmVyIG9mIGRvY3VtZW50IHRvIGZldGNoXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDdXJzb3IjbGltaXRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gbGltaXQgLSBUaGUgbWF4IG51bWJlciBvZiBkb2N1bWVudHNcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7Q3Vyc29yfSBUaGlzIGluc3RhbmNlIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUubGltaXQgPSBmdW5jdGlvbihsaW1pdCkge1xuICAgICAgICBpZiAoXy5pc05pbChsaW1pdCkgfHwgXy5pc05hTihsaW1pdCkpIHRocm93IG5ldyBFcnJvcihcIk11c3QgcGFzcyBhIG51bWJlclwiKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGltaXRWYWx1ZSA9IGxpbWl0O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgYSBjdXJzb3IgaGFzIGEgc29ydGluZyBkZWZpbmVkXG4gICAgICogXG4gICAgICogQG1ldGhvZCBoYXNTb3J0aW5nXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0N1cnNvcn0gY3Vyc29yIC0gVGhlIGN1cnNvclxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBXaGV0aGVyIHRoZSBjdXJzb3IgaGFzIHNvcnRpbmcgb3Igbm90XG4gICAgICovXG4gICAgdmFyIGhhc1NvcnRpbmcgPSBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoY3Vyc29yLnNvcnRWYWx1ZSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS5iYXRjaFNpemUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ29udHJvbHMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgTW9uZ29EQiB3aWxsIHJldHVybiB0byB0aGUgY2xpZW50IGluIGEgc2luZ2xlIG5ldHdvcmsgbWVzc2FnZS5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEB0b2RvIEltcGxlbWVudFxuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ2xvc2UgYSBjdXJzb3IgYW5kIGZyZWUgYXNzb2NpYXRlZCBzZXJ2ZXIgcmVzb3VyY2VzLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jb21tZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEF0dGFjaGVzIGEgY29tbWVudCB0byB0aGUgcXVlcnkgdG8gYWxsb3cgZm9yIHRyYWNlYWJpbGl0eSBpbiB0aGUgbG9ncyBhbmQgdGhlIHN5c3RlbS5wcm9maWxlIGNvbGxlY3Rpb24uXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBAdG9kbyBJbXBsZW1lbnRcbiAgICAgKi9cbiAgICBDdXJzb3IucHJvdG90eXBlLmV4cGxhaW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gUmVwb3J0cyBvbiB0aGUgcXVlcnkgZXhlY3V0aW9uIHBsYW4gZm9yIGEgY3Vyc29yLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS5oaW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEZvcmNlcyBNb25nb0RCIHRvIHVzZSBhIHNwZWNpZmljIGluZGV4IGZvciBhIHF1ZXJ5LlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS5pdGNvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIENvbXB1dGVzIHRoZSB0b3RhbCBudW1iZXIgb2YgZG9jdW1lbnRzIGluIHRoZSBjdXJzb3IgY2xpZW50LXNpZGUgYnkgZmV0Y2hpbmcgYW5kIGl0ZXJhdGluZyB0aGUgcmVzdWx0IHNldC5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEB0b2RvIEltcGxlbWVudFxuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUubWF4U2NhbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTcGVjaWZpZXMgdGhlIG1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRvIHNjYW47IGRvY3VtZW50cyBmb3IgY29sbGVjdGlvbiBzY2Fucywga2V5cyBmb3IgaW5kZXggc2NhbnMuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBAdG9kbyBJbXBsZW1lbnRcbiAgICAgKi9cbiAgICBDdXJzb3IucHJvdG90eXBlLm1heFRpbWVNUyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTcGVjaWZpZXMgYSBjdW11bGF0aXZlIHRpbWUgbGltaXQgaW4gbWlsbGlzZWNvbmRzIGZvciBwcm9jZXNzaW5nIG9wZXJhdGlvbnMgb24gYSBjdXJzb3IuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBAdG9kbyBJbXBsZW1lbnRcbiAgICAgKi9cbiAgICBDdXJzb3IucHJvdG90eXBlLm1heCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTcGVjaWZpZXMgYW4gZXhjbHVzaXZlIHVwcGVyIGluZGV4IGJvdW5kIGZvciBhIGN1cnNvci4gRm9yIHVzZSB3aXRoIGN1cnNvci5oaW50KClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEB0b2RvIEltcGxlbWVudFxuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUubWluID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFNwZWNpZmllcyBhbiBpbmNsdXNpdmUgbG93ZXIgaW5kZXggYm91bmQgZm9yIGEgY3Vyc29yLiBGb3IgdXNlIHdpdGggY3Vyc29yLmhpbnQoKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS5ub0N1cnNvclRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gSW5zdHJ1Y3RzIHRoZSBzZXJ2ZXIgdG8gYXZvaWQgY2xvc2luZyBhIGN1cnNvciBhdXRvbWF0aWNhbGx5IGFmdGVyIGEgcGVyaW9kIG9mIGluYWN0aXZpdHkuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBAdG9kbyBJbXBsZW1lbnRcbiAgICAgKi9cbiAgICBDdXJzb3IucHJvdG90eXBlLm9ianNMZWZ0SW5CYXRjaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZG9jdW1lbnRzIGxlZnQgaW4gdGhlIGN1cnJlbnQgY3Vyc29yIGJhdGNoLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS5wcmV0dHkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlcyB0aGUgY3Vyc29yIHRvIGRpc3BsYXkgcmVzdWx0cyBpbiBhbiBlYXN5LXRvLXJlYWQgZm9ybWF0LlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS5yZWFkQ29uY2VybiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTcGVjaWZpZXMgYSByZWFkIGNvbmNlcm4gZm9yIGEgZmluZCgpIG9wZXJhdGlvbi5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEB0b2RvIEltcGxlbWVudFxuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUucmVhZFByZWYgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gU3BlY2lmaWVzIGEgcmVhZCBwcmVmZXJlbmNlIHRvIGEgY3Vyc29yIHRvIGNvbnRyb2wgaG93IHRoZSBjbGllbnQgZGlyZWN0cyBxdWVyaWVzIHRvIGEgcmVwbGljYSBzZXQuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBAdG9kbyBJbXBsZW1lbnRcbiAgICAgKi9cbiAgICBDdXJzb3IucHJvdG90eXBlLnJldHVybktleSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBNb2RpZmllcyB0aGUgY3Vyc29yIHRvIHJldHVybiBpbmRleCBrZXlzIHJhdGhlciB0aGFuIHRoZSBkb2N1bWVudHMuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBAdG9kbyBJbXBsZW1lbnRcbiAgICAgKi9cbiAgICBDdXJzb3IucHJvdG90eXBlLnNob3dSZWNvcmRJZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBBZGRzIGFuIGludGVybmFsIHN0b3JhZ2UgZW5naW5lIElEIGZpZWxkIHRvIGVhY2ggZG9jdW1lbnQgcmV0dXJuZWQgYnkgdGhlIGN1cnNvci5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEB0b2RvIEltcGxlbWVudFxuICAgICAqL1xuICAgIEN1cnNvci5wcm90b3R5cGUuc2l6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBSZXR1cm5zIGEgY291bnQgb2YgdGhlIGRvY3VtZW50cyBpbiB0aGUgY3Vyc29yIGFmdGVyIGFwcGx5aW5nIHNraXAoKSBhbmQgbGltaXQoKSBtZXRob2RzLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS5zbmFwc2hvdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBGb3JjZXMgdGhlIGN1cnNvciB0byB1c2UgdGhlIGluZGV4IG9uIHRoZSBfaWQgZmllbGQuIEVuc3VyZXMgdGhhdCB0aGUgY3Vyc29yIHJldHVybnMgZWFjaCBkb2N1bWVudCwgXG4gICAgICAgIC8vIHdpdGggcmVnYXJkcyB0byB0aGUgdmFsdWUgb2YgdGhlIF9pZCBmaWVsZCwgb25seSBvbmNlLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS50YWlsYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBNYXJrcyB0aGUgY3Vyc29yIGFzIHRhaWxhYmxlLiBPbmx5IHZhbGlkIGZvciBjdXJzb3JzIG92ZXIgY2FwcGVkIGNvbGxlY3Rpb25zLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgQ3Vyc29yLnByb3RvdHlwZS50b0FycmF5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFJldHVybnMgYW4gYXJyYXkgdGhhdCBjb250YWlucyBhbGwgZG9jdW1lbnRzIHJldHVybmVkIGJ5IHRoZSBjdXJzb3IuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG4gICAgfTtcbiAgICBcbiAgICByZXR1cm4gQ3Vyc29yO1xufTsiXX0=
