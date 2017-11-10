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
var Promise = require("promise");
var Cursor_1 = require("./Cursor");
var aggregation_1 = require("../aggregation");
var document_1 = require("../document");
var selector_1 = require("../selector");
/**
 * Gets the size of an object.
 *
 * @param obj - The object
 *
 * @returns The size of the object
 */
var getObjectSize = function (obj) {
    var size = 0;
    var key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }
    return size;
};
// module.exports = function(Aggregation, Cursor, Selector, SelectorMatcher, ObjectId, EventEmitter, Logger, _) {
/**
 * Collection
 *
 * @module Collection
 * @constructor
 * @since 0.0.1
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 *
 * @classdesc Collection class that maps a MongoDB-like collection
 */
var database = null;
var Collection = /** @class */ (function () {
    // var Collection = function(db, collectionName, options) {
    /**
     * @param db - Database object
     * @param collectionName - The name of the collection
     */
    function Collection(db, collectionName /*, options*/) {
        // super(options.log || {});
        // super();
        /**
         * Inserts several documents into the collection
         *
         * @param docs - Documents to be inserted
         * @param options
         * @param callback - Callback function to be called at the end with the results
         *
         * @returns Promise with the inserted documents
         */
        this.bulkInsert = function (docs, options, callback) {
            var self = this;
            return new Promise(function (resolve, reject) {
                if (_.isNil(docs)) {
                    self.logger.throw("docs parameter required");
                }
                if (!_.isArray(docs)) {
                    self.logger.throw("docs must be an array");
                }
                if (_.isNil(options)) {
                    options = {};
                }
                if (_.isFunction(options)) {
                    callback = options;
                    options = {};
                }
                if (!_.isNil(callback) && !_.isFunction(callback)) {
                    self.logger.throw("callback must be a function");
                }
                var promises = [];
                try {
                    for (var docs_1 = __values(docs), docs_1_1 = docs_1.next(); !docs_1_1.done; docs_1_1 = docs_1.next()) {
                        var doc = docs_1_1.value;
                        promises.push(self.insert(doc, options));
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (docs_1_1 && !docs_1_1.done && (_a = docs_1.return)) _a.call(docs_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                Promise.all(promises)
                    .then(function (_docs) {
                    if (callback) {
                        callback(null, _docs);
                    }
                    resolve(docs);
                }).catch(function (error) {
                    if (callback) {
                        callback(error, null);
                    }
                    reject(error);
                });
                var e_1, _a;
            });
        };
        if (!(this instanceof Collection)) {
            return new Collection(db, collectionName /*, options*/);
        }
        this.logger = jsw_logger_1.JSWLogger.instance;
        if (_.isNil(db)) {
            this.logger.throw("db parameter required");
        }
        if (_.isNil(collectionName)) {
            this.logger.throw("collectionName parameter required");
        }
        // if (_.isNil(options) || !_.isPlainObject(options)) options = {};
        Collection.checkCollectionName(collectionName);
        // this.db = db;
        database = db;
        this.name = collectionName;
        this.databaseName = db._databaseName;
        this.fullName = this.databaseName + "." + this.name;
        this.docs = [];
        this.doc_indexes = {};
        this.snapshots = [];
        // this.opts = {}; // Default options
        // _.merge(this.opts, options);
        this.emit = function (name, args) {
            return db.emit(name, args);
        };
    }
    // emit(name, args) {
    // 	 super.emit(name, args, database._stores);
    // }
    // TODO enforce rule that field names can't start with '$' or contain '.'
    // (real mongodb does in fact enforce this)
    // TODO possibly enforce that 'undefined' does not appear (we assume
    // this in our handling of null and $exists)
    /**
     * Inserts a document into the collection
     *
     * @emits [[MongoPortable.insert]]
     *
     * @param doc - Document to be inserted
     * @param options
     * @param callback - Callback function to be called at the end with the results
     *
     * @returns Promise with the inserted document
     */
    Collection.prototype.insert = function (doc, options, callback) {
        var self = this;
        return new Promise(function (resolve, reject) {
            // REJECT
            if (_.isNil(doc)) {
                self.logger.throw("doc parameter required");
            }
            if (!_.isPlainObject(doc)) {
                self.logger.throw("doc must be an object");
            }
            if (_.isNil(options)) {
                options = {};
            }
            if (_.isFunction(options)) {
                callback = options;
                options = {};
            }
            if (!_.isNil(callback) && !_.isFunction(callback)) {
                self.logger.throw("callback must be a function");
            }
            // Creating a safe copy of the document
            var _doc = _.cloneDeep(doc);
            // If the document comes with a number ID, parse it to String
            if (_.isNumber(_doc._id)) {
                _doc._id = _.toString(_doc._id);
            }
            if (_.isNil(_doc._id) || (!(_doc._id instanceof document_1.ObjectId) && (!_.isString(_doc._id) || !_doc._id.length))) {
                _doc._id = new document_1.ObjectId();
            }
            // Add options to more dates
            _doc.timestamp = new document_1.ObjectId().generationTime;
            // Reverse
            self.doc_indexes[_.toString(_doc._id)] = self.docs.length;
            self.docs.push(_doc);
            self.emit("insert", {
                collection: self,
                doc: _doc
            }).then(function () {
                if (callback) {
                    callback(null, _doc);
                }
                resolve(_doc);
            }).catch(function (error) {
                // EXCEPTION UTIL
                if (callback) {
                    callback(error, null);
                }
                reject(error);
            });
        });
    };
    /**
     * Finds all matching documents
     *
     * @fires [[MongoPortable.find]]
     *
     * @param selection - The selection for matching documents
     * @param fields - The fields of the document to show
     * @param options
     * @param options.skip - Number of documents to be skipped
     * @param options.limit - Max number of documents to display
     * @param options.fields - Same as "fields" parameter (if both passed, "options.fields" will be ignored)
     * @param options.doNotFetch - If set to "true" returns the cursor not fetched
     * @param callback - Callback function to be called at the end with the results
     *
     * @returns Returns a promise with the documents (or cursor if "options.forceFetch" set to true)
     */
    Collection.prototype.find = function (selection, fields, options, callback) {
        if (options === void 0) { options = {
            doNotFecth: false
        }; }
        var self = this;
        return new Promise(function (resolve, reject) {
            /*
            { selection, fields, options, callback } = ensureFindParams({
                selection,
                fields,
                options,
                callback
            });

            selection = params.selection;
            fields = params.fields;
            options = params.options;
            callback = params.callback;
            */
            self.emit("find", {
                collection: self,
                selector: selection,
                fields: fields
            }).then(function () {
                var cursor = new Cursor_1.Cursor(self.docs, selection, fields, options);
                // Pass the cursor fetched to the callback
                if (options.doNotFecth) {
                    if (callback) {
                        callback(null, cursor);
                    }
                    resolve(cursor);
                }
                else {
                    var docs = cursor.fetch();
                    if (callback) {
                        callback(null, docs);
                    }
                    resolve(docs);
                }
            }).catch(function (error) {
                if (callback) {
                    callback(error, null);
                }
                reject(error);
            });
        });
    };
    /**
     * Finds the first matching document
     *
     * @fires [[MongoPortable.findOne]]
     *
     * @param selection - The selection for matching documents
     * @param fields - The fields of the document to show
     * @param options
     * @param options.skip - Number of documents to be skipped
     * @param options.limit - Max number of documents to display
     * @param options.fields - Same as "fields" parameter (if both passed, "options.fields" will be ignored)
     *
     * @param callback - Callback function to be called at the end with the results
     *
     * @returns {Promise<Object>} Returns a promise with the first matching document of the collection
     */
    Collection.prototype.findOne = function (selection, fields, options, callback) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var params = ensureFindParams({
                selection: selection,
                fields: fields,
                options: options,
                callback: callback
            });
            selection = params.selection;
            fields = params.fields;
            options = params.options;
            callback = params.callback;
            self.emit("findOne", {
                collection: self,
                selector: selection,
                fields: fields
            }).then(function () {
                var cursor = new Cursor_1.Cursor(self.docs, selection, fields, options);
                var res = null;
                if (cursor.hasNext()) {
                    res = cursor.next();
                }
                if (callback) {
                    callback(null, res);
                }
                resolve(res);
            }).catch(function (error) {
                if (callback) {
                    callback(error, null);
                }
                reject(error);
            });
        });
    };
    /**
     * Updates one or many documents
     *
     * @fires [[MongoPortable.update]]
     *
     * @param selection - The selection for matching documents
     * @param update - The update operation
     * @param options
     * @param options.updateAsMongo - By default:
     * @param options.override - Replaces the whole document (only apllies when [updateAsMongo=false])
     * @param options.upsert - Creates a new document when no document matches the query criteria
     * @param options.multi - Updates multiple documents that meet the criteria
     * @param callback - Callback function to be called at the end with the results
     *
     * @returns Returns a promise with the update/insert (if upsert=true) information
     */
    Collection.prototype.update = function (selection, update, options, callback) {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (_.isNil(selection)) {
                selection = {};
            }
            if (_.isNil(update)) {
                self.logger.throw("You must specify the update operation");
            }
            if (_.isNil(options)) {
                options = {
                    skip: 0,
                    limit: 15 // for no limit pass [options.limit = -1]
                };
            }
            if (_.isFunction(selection)) {
                self.logger.throw("You must specify the update operation");
            }
            if (_.isFunction(update)) {
                self.logger.throw("You must specify the update operation");
            }
            if (_.isFunction(options)) {
                callback = options;
                options = {};
            }
            // Check special case where we are using an objectId
            if (selection instanceof document_1.ObjectId) {
                selection = {
                    _id: selection
                };
            }
            if (!_.isNil(callback) && !_.isFunction(callback)) {
                self.logger.throw("callback must be a function");
            }
            var res = null;
            // var docs = null;
            if (options.multi) {
                // docs = self.find(selection, null, { forceFetch: true });
                self.find(selection, null /*, { forceFetch: true }*/)
                    .then(onDocsFound)
                    .catch(doReject);
            }
            else {
                // docs = self.findOne(selection);
                self.findOne(selection, null, null, callback)
                    .then(onDocsFound)
                    .catch(doReject);
            }
            function onDocsFound(docs) {
                if (_.isNil(docs)) {
                    docs = [];
                }
                if (!_.isArray(docs)) {
                    docs = [docs];
                }
                if (docs.length === 0) {
                    if (options.upsert) {
                        self.insert(update, null, callback)
                            .then(function (inserted) {
                            doResolve({
                                updated: {
                                    documents: null,
                                    count: 0
                                },
                                inserted: {
                                    documents: [inserted],
                                    count: 1
                                }
                            });
                        }).catch(doReject);
                        // res = {
                        // 	 updated: {
                        // 		 documents: null,
                        // 		 count: 0
                        // 	 },
                        // 	 inserted: {
                        // 		 documents: [inserted],
                        // 		 count: 1
                        // 	 }
                        // };
                    }
                    else {
                        // No documents found
                        /*res = */ doResolve({
                            updated: {
                                documents: null,
                                count: 0
                            },
                            inserted: {
                                documents: null,
                                count: 0
                            }
                        });
                    }
                }
                else {
                    var updatedDocs_1 = [];
                    for (var i = 0; i < docs.length; i++) {
                        var doc = docs[i];
                        var override = null;
                        var hasModifier = false;
                        try {
                            for (var _a = __values(Object.keys(update)), _b = _a.next(); !_b.done; _b = _a.next()) {
                                var key = _b.value;
                                // IE7 doesn't support indexing into strings (eg, key[0] or key.indexOf('$') ), so use substr.
                                // Testing over the first letter:
                                // 	  Bests result with 1e8 loops => key[0](~3s) > substr(~5s) > regexp(~6s) > indexOf(~16s)
                                var modifier = (key.substr(0, 1) === "$");
                                if (modifier) {
                                    hasModifier = true;
                                }
                                if (options.updateAsMongo) {
                                    if (hasModifier && !modifier) {
                                        self.logger.throw("All update fields must be an update operator");
                                    }
                                    if (!hasModifier && options.multi) {
                                        self.logger.throw("You can not update several documents when no update operators are included");
                                    }
                                    if (hasModifier) {
                                        override = false;
                                    }
                                    if (!hasModifier) {
                                        override = true;
                                    }
                                }
                                else {
                                    override = !!options.override;
                                }
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        var _docUpdate = null;
                        if (override) {
                            // Overrides the document except for the "_id"
                            _docUpdate = {
                                _id: doc._id
                            };
                            try {
                                // Must ignore fields starting with '$', '.'...
                                for (var _d = __values(Object.keys(update)), _e = _d.next(); !_e.done; _e = _d.next()) {
                                    var key = _e.value;
                                    if (key.substr(0, 1) === "$" || /\./g.test(key)) {
                                        self.logger.warn("The field " + key + " can not begin with '$' or contain '.'");
                                    }
                                    else {
                                        _docUpdate[key] = update[key];
                                    }
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (_e && !_e.done && (_f = _d.return)) _f.call(_d);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                        }
                        else {
                            _docUpdate = _.cloneDeep(doc);
                            try {
                                for (var _g = __values(Object.keys(update)), _h = _g.next(); !_h.done; _h = _g.next()) {
                                    var key = _h.value;
                                    var val = update[key];
                                    if (key.substr(0, 1) === "$") {
                                        _docUpdate = applyModifier(_docUpdate, key, val);
                                    }
                                    else {
                                        if (!_.isNil(_docUpdate[key])) {
                                            if (key !== "_id") {
                                                _docUpdate[key] = val;
                                            }
                                            else {
                                                self.logger.warn("The field '_id' can not be updated");
                                            }
                                        }
                                        else {
                                            self.logger.warn("The document does not contains the field " + key);
                                        }
                                    }
                                }
                            }
                            catch (e_4_1) { e_4 = { error: e_4_1 }; }
                            finally {
                                try {
                                    if (_h && !_h.done && (_j = _g.return)) _j.call(_g);
                                }
                                finally { if (e_4) throw e_4.error; }
                            }
                        }
                        updatedDocs_1.push(_docUpdate);
                        var idx = self.doc_indexes[_docUpdate._id];
                        self.docs[idx] = _docUpdate;
                    }
                    self.emit("update", {
                        collection: self,
                        selector: selection,
                        modifier: update,
                        docs: updatedDocs_1
                    }).then(function () {
                        doResolve({
                            updated: {
                                documents: updatedDocs_1,
                                count: updatedDocs_1.length
                            },
                            inserted: {
                                documents: null,
                                count: 0
                            }
                        });
                    }).catch(function (error) {
                        doReject(error);
                    });
                    // res = {
                    // 	 updated: {
                    // 		 documents: updatedDocs,
                    // 		 count: updatedDocs.length
                    // 	 },
                    // 	 inserted: {
                    // 		 documents: null,
                    // 		 count: 0
                    // 	 }
                    // };
                }
                var e_2, _c, e_3, _f, e_4, _j;
                // if (callback) callback(null, res);
                // return res;
            }
            function doResolve(result) {
                if (callback) {
                    callback(null, result);
                }
                resolve(result);
            }
            function doReject(error) {
                if (callback) {
                    callback(error, null);
                }
                reject(error);
            }
        });
    };
    /**
     * Removes one or many documents
     *
     * @fires [[MongoPortable.remove]]
     *
     * @param selection - The selection for matching documents
     * @param options
     * @param options.justOne - Deletes the first occurrence of the selection
     *
     * @param callback - Callback function to be called at the end with the results
     *
     * @returns Promise with the deleted documents
     */
    Collection.prototype.remove = function (selection, options, callback) {
        var self = this;
        if (_.isNil(selection)) {
            selection = {};
        }
        if (_.isFunction(selection)) {
            callback = selection;
            selection = {};
        }
        if (_.isFunction(options)) {
            callback = options;
            options = {};
        }
        if (_.isNil(options)) {
            options = { justOne: false };
        }
        // If we are not passing a selection and we are not removing just one, is the same as a drop
        if (getObjectSize(selection) === 0 && !options.justOne) {
            return self.drop(options, callback);
        }
        else {
            return new Promise(function (resolve, reject) {
                // Check special case where we are using an objectId
                if (selection instanceof document_1.ObjectId) {
                    selection = {
                        _id: selection
                    };
                }
                if (!_.isNil(callback) && !_.isFunction(callback)) {
                    self.logger.throw("callback must be a function");
                }
                self.find(selection, null, null, callback)
                    .then(function (documents) {
                    var docs = [];
                    try {
                        for (var documents_1 = __values(documents), documents_1_1 = documents_1.next(); !documents_1_1.done; documents_1_1 = documents_1.next()) {
                            var doc = documents_1_1.value;
                            var idx = self.doc_indexes[doc._id];
                            delete self.doc_indexes[doc._id];
                            self.docs.splice(idx, 1);
                            docs.push(doc);
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (documents_1_1 && !documents_1_1.done && (_a = documents_1.return)) _a.call(documents_1);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                    self.emit("remove", {
                        collection: self,
                        selector: selection,
                        docs: docs
                    }).then(function () {
                        if (callback) {
                            callback(null, docs);
                        }
                        resolve(docs);
                    }).catch(function (error) {
                        if (callback) {
                            callback(error, null);
                        }
                        reject(error);
                    });
                    var e_5, _a;
                }).catch(function (error) {
                    if (callback) {
                        callback(error, null);
                    }
                    reject(error);
                });
            });
        }
    };
    /**
     * Alias for [[Collection.remove]]
     */
    Collection.prototype.delete = function (selection, options, callback) {
        return this.remove(selection, options, callback);
    };
    /**
     * Alias for [[Collection.remove]]
     */
    Collection.prototype.destroy = function (selection, options, callback) {
        return this.remove(selection, options, callback);
    };
    /**
     * Drops a collection
     *
     * @param options
     * @param options.dropIndexes - True if we want to drop the indexes too
     * @param callback - Callback function to be called at the end with the results
     *
     * @returns Promise with the deleted documents
     */
    Collection.prototype.drop = function (options, callback) {
        if (options === void 0) { options = { dropIndexes: false }; }
        var self = this;
        return new Promise(function (resolve, reject) {
            if (_.isNil(options)) {
                options = { dropIndexes: false };
            }
            if (_.isFunction(options)) {
                callback = options;
                options = { dropIndexes: false };
            }
            if (!_.isNil(callback) && !_.isFunction(callback)) {
                self.logger.throw("callback must be a function");
            }
            self.find(null, null, { limit: -1 }).then(function (docs) {
                self.doc_indexes = {};
                self.docs = [];
                if (options.dropIndexes) {
                    // TODO
                }
                self.emit("dropCollection", {
                    collection: self,
                    indexes: !!options.dropIndexes
                }).then(function () {
                    if (callback) {
                        callback(null, docs);
                    }
                    resolve(docs);
                }).catch(function (error) {
                    if (callback) {
                        callback(error, false);
                    }
                    reject();
                });
            }).catch(function (error) {
                if (callback) {
                    callback(error, false);
                }
                reject();
            });
        });
    };
    /**
     * Insert or update a document. If the document has an "_id" is an update (with upsert), if not is an insert.
     *
     * @param doc - Document to be inserted/updated
     * @param options
     * @param options.dropIndexes - True if we want to drop the indexes too
     * @param callback - Callback function to be called at the end with the results
     *
     * @returns Returns a promise with the inserted document or the update information
     */
    Collection.prototype.save = function (doc, options, callback) {
        if (_.isNil(doc) || _.isFunction(doc)) {
            this.logger.throw("You must pass a document");
        }
        if (_.isFunction(options)) {
            callback = options;
            options = {};
        }
        if (_.isNil(options)) {
            options = {};
        }
        if (_.hasIn(doc, "_id")) {
            options.upsert = true;
            return this.update({ _id: doc._id }, doc, options, callback);
        }
        else {
            return this.insert(doc, options, callback);
        }
    };
    Collection.prototype.ensureIndex = function () {
        // TODO Implement EnsureIndex
        this.logger.throw("Collection#ensureIndex unimplemented by driver");
    };
    // TODO document (at some point)
    // TODO test
    // TODO obviously this particular implementation will not be very efficient
    Collection.prototype.backup = function (backupID, callback) {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (_.isFunction(backupID)) {
                callback = backupID;
                backupID = new document_1.ObjectId().toString();
            }
            if (!_.isNil(callback) && !_.isFunction(callback)) {
                self.logger.throw("callback must be a function");
            }
            self.snapshots[backupID] = _.cloneDeep(self.docs);
            self.emit("snapshot", {
                collection: self,
                backupID: backupID,
                documents: self.snapshots[backupID]
            }).then(function () {
                var result = {
                    backupID: backupID,
                    documents: self.snapshots[backupID]
                };
                if (callback) {
                    callback(null, result);
                }
                resolve(result);
            }).catch(function (error) {
                if (callback) {
                    callback(error, null);
                }
                reject(error);
            });
        });
    };
    /**
     * Lists available Backups
     */
    Collection.prototype.backups = function () {
        // if (!_.isNil(callback) && !_.isFunction(callback)) this.logger.throw("callback must be a function");
        var backups = [];
        try {
            for (var _a = __values(Object.keys(this.snapshots)), _b = _a.next(); !_b.done; _b = _a.next()) {
                var id = _b.value;
                backups.push({ id: id, documents: this.snapshots[id] });
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_6) throw e_6.error; }
        }
        // if (callback) callback(null, backups);
        return backups;
        var e_6, _c;
    };
    Collection.prototype.removeBackup = function (backupID /*, callback*/) {
        // if (_.isFunction(backupID)) {
        // 	 callback = backupID;
        // 	 backupID = null;
        // }
        if (_.isNil(backupID)) {
            this.logger.throw("backupID required");
        }
        // if (!_.isNil(callback) && !_.isFunction(callback)) this.logger.throw("callback must be a function");
        var result = null;
        if (backupID) {
            delete this.snapshots[_.toString(backupID)];
            result = backupID;
            // } else {
            // 	 this.snapshots = {};
            // 	 result = true;
        }
        // if (callback) callback(null, result);
        return result;
    };
    /**
     * @TO-DO
     */
    Collection.prototype.clearBackups = function () {
        // TODO
    };
    /**
     * Restore the snapshot. If no snapshot exists, raise an exception;
     */
    Collection.prototype.restore = function (backupID, callback) {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (_.isFunction(backupID)) {
                callback = backupID;
                backupID = null;
            }
            if (!_.isNil(callback) && !_.isFunction(callback)) {
                self.logger.throw("callback must be a function");
            }
            var snapshotCount = getObjectSize(self.snapshots);
            var backupData = null;
            if (snapshotCount === 0) {
                self.logger.throw("There is no snapshots");
            }
            else {
                if (!backupID) {
                    if (snapshotCount === 1) {
                        self.logger.info("No backupID passed. Restoring the only snapshot");
                        try {
                            // Retrieve the only snapshot
                            for (var _a = __values(Object.keys(self.snapshots)), _b = _a.next(); !_b.done; _b = _a.next()) {
                                var key = _b.value;
                                backupID = key;
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                    }
                    else {
                        self.logger.throw("The are several snapshots. Please specify one backupID");
                    }
                }
            }
            backupData = self.snapshots[backupID];
            if (!backupData) {
                self.logger.throw("Unknown Backup ID: " + backupID);
            }
            self.docs = backupData;
            self.emit("restore", {
                collection: self,
                backupID: backupID
            }).then(function () {
                if (callback) {
                    callback(null, backupID);
                }
                resolve(backupID);
            }).catch(function (error) {
                if (callback) {
                    callback(error, null);
                }
                reject(error);
            });
            var e_7, _c;
        });
    };
    /**
     * Calculates aggregate values for the data in a collection
     *
     * @param pipeline - A sequence of data aggregation operations or stages
     * @param options
     * @param options.forceFetch - If set to'"true" returns the array of documents already fetched
     *
     * @returns If "options.forceFetch" set to true returns the array of documents, otherwise returns a cursor
     */
    Collection.prototype.aggregate = function (pipeline, options) {
        if (options === void 0) { options = { forceFetch: false }; }
        if (_.isNil(pipeline) || !_.isArray(pipeline)) {
            this.logger.throw('The "pipeline" param must be an array');
        }
        var aggregation = new aggregation_1.Aggregation(pipeline);
        try {
            for (var pipeline_1 = __values(pipeline), pipeline_1_1 = pipeline_1.next(); !pipeline_1_1.done; pipeline_1_1 = pipeline_1.next()) {
                var stage = pipeline_1_1.value;
                try {
                    for (var _a = __values(Object.keys(stage)), _b = _a.next(); !_b.done; _b = _a.next()) {
                        var key = _b.value;
                        if (key.substr(0, 1) !== "$") {
                            this.logger.throw("The pipeline stages must begin with '$'");
                        }
                        if (!aggregation.validStage(key)) {
                            this.logger.throw("Invalid stage \"" + key + "\"");
                        }
                        break;
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (pipeline_1_1 && !pipeline_1_1.done && (_d = pipeline_1.return)) _d.call(pipeline_1);
            }
            finally { if (e_9) throw e_9.error; }
        }
        var result = aggregation.aggregate(this);
        return result; // change to cursor
        var e_9, _d, e_8, _c;
    };
    Collection.prototype.rename = function (newName) {
        if (_.isString(newName)) {
            if (this.name !== newName) {
                Collection.checkCollectionName(newName);
                var dbName = this.name.split(".").length > 1 ? this.name.split(".")[0] : "";
                this.name = newName;
                this.fullName = dbName + "." + this.name;
                return this;
            }
        }
        else {
            // Error
            return null;
        }
    };
    Collection.checkCollectionName = function (collectionName) {
        if (!_.isString(collectionName)) {
            jsw_logger_1.JSWLogger.instance.throw("collection name must be a String");
        }
        if (!collectionName || collectionName.indexOf("..") !== -1) {
            jsw_logger_1.JSWLogger.instance.throw("collection names cannot be empty");
        }
        if (collectionName.indexOf("$") !== -1 && collectionName.match(/((^\$cmd)|(oplog\.\$main))/) === null) {
            jsw_logger_1.JSWLogger.instance.throw("collection names must not contain '$'");
        }
        if (collectionName.match(/^system\./) !== null) {
            jsw_logger_1.JSWLogger.instance.throw("collection names must not start with 'system.' (reserved for internal use)");
        }
        if (collectionName.match(/^\.|\.$/) !== null) {
            jsw_logger_1.JSWLogger.instance.throw("collection names must not start or end with '.'");
        }
    };
    Collection._noCreateModifiers = {
        $unset: true,
        $pop: true,
        $rename: true,
        $pull: true,
        $pullAll: true
    };
    return Collection;
}());
exports.Collection = Collection;
var applyModifier = function (_docUpdate, key, val) {
    var doc = _.cloneDeep(_docUpdate);
    // var mod = modifiers[key];
    if (!modifiers[key]) {
        jsw_logger_1.JSWLogger.instance.throw("Invalid modifier specified: " + key);
    }
    try {
        for (var _a = __values(Object.keys(val)), _b = _a.next(); !_b.done; _b = _a.next()) {
            var keypath = _b.value;
            var value = val[keypath];
            var keyparts = keypath.split(".");
            modify(doc, keyparts, value, key);
            // var no_create = !!Collection._noCreateModifiers[key];
            // var forbid_array = (key === "$rename");
            // var target = Collection._findModTarget(_docUpdate, keyparts, no_create, forbid_array);
            // var field = keyparts.pop();
            // mod(target, field, value, keypath, _docUpdate);
        }
    }
    catch (e_10_1) { e_10 = { error: e_10_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
        }
        finally { if (e_10) throw e_10.error; }
    }
    return doc;
    var e_10, _c;
};
var modify = function (document, keyparts, value, key, level) {
    if (level === void 0) { level = 0; }
    for (var i = level; i < keyparts.length; i++) {
        var path = keyparts[i];
        var isNumeric = /^[0-9]+$/.test(path);
        var target = document[path];
        var create = _.hasIn(Collection._noCreateModifiers, key) ? false : true;
        if (!create && (!_.isObject(document) || _.isNil(target))) {
            jsw_logger_1.JSWLogger.instance.throw("The element \"" + path + "\" must exists in \"" + JSON.stringify(document) + "\"");
        }
        if (_.isArray(document)) {
            // Do not allow $rename on arrays
            if (key === "$rename") {
                return null;
            }
            // Only let the use of "arrayfield.<numeric_index>.subfield"
            if (isNumeric) {
                path = _.toNumber(path);
            }
            else {
                jsw_logger_1.JSWLogger.instance.throw("The field \"" + path + "\" can not be appended to an array");
            }
            // Fill the array to the desired length
            while (document.length < path) {
                document.push(null);
            }
        }
        if (i < keyparts.length - 1) {
            if (_.isNil(target)) {
                // If we are accessing with "arrayField.<numeric_index>"
                if (_.isFinite(_.toNumber(keyparts[i + 1]))) {
                    target = [];
                }
                else {
                    target = {};
                }
            }
            document[path] = modify(target, keyparts, value, key, level + 1);
            return document;
        }
        else {
            modifiers[key](document, path, value);
            return document;
        }
    }
};
var modifiers = {
    $inc: function (target, field, arg) {
        if (!_.isNumber(arg)) {
            jsw_logger_1.JSWLogger.instance.throw("Modifier $inc allowed for numbers only");
        }
        if (field in target) {
            if (!_.isNumber(target[field])) {
                jsw_logger_1.JSWLogger.instance.throw("Cannot apply $inc modifier to non-number");
            }
            target[field] += arg;
        }
        else {
            target[field] = arg;
        }
    },
    $set: function (target, field, arg) {
        target[field] = _.cloneDeep(arg);
    },
    $unset: function (target, field, arg) {
        if (!_.isNil(target)) {
            if (_.isArray(target)) {
                if (field in target) {
                    target[field] = null;
                }
            }
            else {
                delete target[field];
            }
        }
    },
    $push: function (target, field, arg) {
        var fieldTarget = target[field];
        if (_.isNil(fieldTarget)) {
            target[field] = [arg];
        }
        else if (!_.isArray(fieldTarget)) {
            jsw_logger_1.JSWLogger.instance.throw("Cannot apply $push modifier to non-array");
        }
        else {
            fieldTarget.push(_.cloneDeep(arg));
        }
    },
    $pushAll: function (target, field, arg) {
        var fieldTarget = target[field];
        if (_.isNil(fieldTarget)) {
            target[field] = arg;
        }
        else if (!_.isArray(fieldTarget)) {
            jsw_logger_1.JSWLogger.instance.throw("Modifier $pushAll/pullAll allowed for arrays only");
        }
        else {
            try {
                for (var arg_1 = __values(arg), arg_1_1 = arg_1.next(); !arg_1_1.done; arg_1_1 = arg_1.next()) {
                    var argValue = arg_1_1.value;
                    fieldTarget.push(argValue);
                }
            }
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (arg_1_1 && !arg_1_1.done && (_a = arg_1.return)) _a.call(arg_1);
                }
                finally { if (e_11) throw e_11.error; }
            }
        }
        var e_11, _a;
    },
    $addToSet: function (target, field, arg) {
        var fieldTarget = target[field];
        if (_.isNil(fieldTarget)) {
            target[field] = [arg];
        }
        else if (!_.isArray(fieldTarget)) {
            jsw_logger_1.JSWLogger.instance.throw("Cannot apply $addToSet modifier to non-array");
        }
        else {
            var isEach = false;
            if (_.isPlainObject(arg)) {
                try {
                    for (var _a = __values(Object.keys(arg)), _b = _a.next(); !_b.done; _b = _a.next()) {
                        var key = _b.value;
                        if (key === "$each") {
                            isEach = true;
                        }
                        break;
                    }
                }
                catch (e_12_1) { e_12 = { error: e_12_1 }; }
                finally {
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_12) throw e_12.error; }
                }
            }
            var values = isEach ? arg.$each : [arg];
            _.forEach(values, function (value) {
                try {
                    for (var fieldTarget_1 = __values(fieldTarget), fieldTarget_1_1 = fieldTarget_1.next(); !fieldTarget_1_1.done; fieldTarget_1_1 = fieldTarget_1.next()) {
                        var fieldTargetValue = fieldTarget_1_1.value;
                        if (selector_1.SelectorMatcher.equal(value, fieldTargetValue)) {
                            return;
                        }
                    }
                }
                catch (e_13_1) { e_13 = { error: e_13_1 }; }
                finally {
                    try {
                        if (fieldTarget_1_1 && !fieldTarget_1_1.done && (_a = fieldTarget_1.return)) _a.call(fieldTarget_1);
                    }
                    finally { if (e_13) throw e_13.error; }
                }
                fieldTarget.push(value);
                var e_13, _a;
            });
        }
        var e_12, _c;
    },
    $pop: function (target, field, arg) {
        if (_.isNil(target) || _.isNil(target[field])) {
            return;
        }
        var fieldTarget = target[field];
        if (!_.isArray(fieldTarget)) {
            jsw_logger_1.JSWLogger.instance.throw("Cannot apply $pop modifier to non-array");
        }
        else {
            if (_.isNumber(arg) && arg < 0) {
                fieldTarget.splice(0, 1);
            }
            else {
                fieldTarget.pop();
            }
        }
    },
    $pull: function (target, field, arg) {
        if (_.isNil(target) || _.isNil(target[field])) {
            return;
        }
        var fieldTarget = target[field];
        if (!_.isArray(fieldTarget)) {
            jsw_logger_1.JSWLogger.instance.throw("Cannot apply $pull/pullAll modifier to non-array");
        }
        else {
            var out = [];
            if (typeof arg === "object" && !(arg instanceof Array)) {
                // XXX would be much nicer to compile this once, rather than
                // for each document we modify.. but usually we're not
                // modifying that many documents, so we'll let it slide for
                // now
                // XXX _compileSelector isn't up for the job, because we need
                // to permit stuff like {$pull: {a: {$gt: 4}}}.. something
                // like {$gt: 4} is not normally a complete selector.
                var match = new selector_1.Selector({
                    __matching__: arg
                });
                try {
                    for (var fieldTarget_2 = __values(fieldTarget), fieldTarget_2_1 = fieldTarget_2.next(); !fieldTarget_2_1.done; fieldTarget_2_1 = fieldTarget_2.next()) {
                        var fieldTargetValue = fieldTarget_2_1.value;
                        var doc = {
                            __matching__: fieldTargetValue
                        };
                        if (!match.test(doc)) {
                            out.push(fieldTargetValue);
                        }
                    }
                }
                catch (e_14_1) { e_14 = { error: e_14_1 }; }
                finally {
                    try {
                        if (fieldTarget_2_1 && !fieldTarget_2_1.done && (_a = fieldTarget_2.return)) _a.call(fieldTarget_2);
                    }
                    finally { if (e_14) throw e_14.error; }
                }
            }
            else {
                try {
                    for (var fieldTarget_3 = __values(fieldTarget), fieldTarget_3_1 = fieldTarget_3.next(); !fieldTarget_3_1.done; fieldTarget_3_1 = fieldTarget_3.next()) {
                        var fieldTargetValue = fieldTarget_3_1.value;
                        if (!selector_1.SelectorMatcher.equal(fieldTargetValue, arg)) {
                            out.push(fieldTargetValue);
                        }
                    }
                }
                catch (e_15_1) { e_15 = { error: e_15_1 }; }
                finally {
                    try {
                        if (fieldTarget_3_1 && !fieldTarget_3_1.done && (_b = fieldTarget_3.return)) _b.call(fieldTarget_3);
                    }
                    finally { if (e_15) throw e_15.error; }
                }
            }
            target[field] = out;
        }
        var e_14, _a, e_15, _b;
    },
    $pullAll: function (target, field, arg) {
        if (_.isNil(target) || _.isNil(target[field])) {
            return;
        }
        var fieldTarget = target[field];
        if (!_.isNil(fieldTarget) && !_.isArray(fieldTarget)) {
            jsw_logger_1.JSWLogger.instance.throw("Modifier $pushAll/pullAll allowed for arrays only");
        }
        else if (!_.isNil(fieldTarget)) {
            var out = [];
            try {
                for (var fieldTarget_4 = __values(fieldTarget), fieldTarget_4_1 = fieldTarget_4.next(); !fieldTarget_4_1.done; fieldTarget_4_1 = fieldTarget_4.next()) {
                    var fieldTargetValue = fieldTarget_4_1.value;
                    var exclude = false;
                    try {
                        for (var arg_2 = __values(arg), arg_2_1 = arg_2.next(); !arg_2_1.done; arg_2_1 = arg_2.next()) {
                            var argValue = arg_2_1.value;
                            if (selector_1.SelectorMatcher.equal(fieldTargetValue, argValue)) {
                                exclude = true;
                                break;
                            }
                        }
                    }
                    catch (e_16_1) { e_16 = { error: e_16_1 }; }
                    finally {
                        try {
                            if (arg_2_1 && !arg_2_1.done && (_a = arg_2.return)) _a.call(arg_2);
                        }
                        finally { if (e_16) throw e_16.error; }
                    }
                    if (!exclude) {
                        out.push(fieldTargetValue);
                    }
                }
            }
            catch (e_17_1) { e_17 = { error: e_17_1 }; }
            finally {
                try {
                    if (fieldTarget_4_1 && !fieldTarget_4_1.done && (_b = fieldTarget_4.return)) _b.call(fieldTarget_4);
                }
                finally { if (e_17) throw e_17.error; }
            }
            target[field] = out;
        }
        var e_17, _b, e_16, _a;
    },
    $rename: function (target, field, value) {
        if (field === value) {
            // no idea why mongo has this restriction..
            jsw_logger_1.JSWLogger.instance.throw("The new field name must be different");
        }
        if (!_.isString(value) || value.trim() === "") {
            jsw_logger_1.JSWLogger.instance.throw("The new name must be a non-empty string");
        }
        target[value] = target[field];
        delete target[field];
    },
    $bit: function (target, field, arg) {
        // XXX mongo only supports $bit on integers, and we only support
        // native javascript numbers (doubles) so far, so we can't support $bit
        jsw_logger_1.JSWLogger.instance.throw("$bit is not supported");
    }
};
var ensureFindParams = function (params) {
    // selection, fields, options, callback
    if (_.isNil(params.selection)) {
        params.selection = {};
    }
    if (_.isNil(params.fields)) {
        params.fields = [];
    }
    if (_.isNil(params.options)) {
        params.options = {
            skip: 0,
            limit: 15 // for no limit pass [options.limit = -1]
        };
    }
    // callback as first parameter
    if (_.isFunction(params.selection)) {
        params.callback = params.selection;
        params.selection = {};
    }
    // callback as second parameter
    if (_.isFunction(params.fields)) {
        params.callback = params.fields;
        params.fields = [];
    }
    // callback as third parameter
    if (_.isFunction(params.options)) {
        params.callback = params.options;
        params.options = {};
    }
    // Check special case where we are using an objectId
    if (params.selection instanceof document_1.ObjectId) {
        params.selection = {
            _id: params.selection
        };
    }
    if (!_.isNil(params.callback) && !_.isFunction(params.callback)) {
        jsw_logger_1.JSWLogger.instance.throw("callback must be a function");
    }
    if (params.options.fields) {
        if (_.isNil(params.fields) || params.fields.length === 0) {
            params.fields = params.options.fields;
        }
        else {
            jsw_logger_1.JSWLogger.instance.warn("Fields already present. Ignoring 'options.fields'.");
        }
    }
    return params;
};
//# sourceMappingURL=Collection.js.map