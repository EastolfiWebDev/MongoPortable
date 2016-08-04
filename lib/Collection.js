"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @file Collection.js - based on Monglo#Collection ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */

var Logger = require("jsw-logger"),
    EventEmitter = require("./utils/EventEmitter"),
    _ = require("lodash"),
    Aggregation = require("./Aggregation"),
    Cursor = require("./Cursor"),
    ObjectId = require('./ObjectId'),
    Selector = require("./Selector"),
    SelectorMatcher = require("./SelectorMatcher");

var logger = null;

/**
 * Collection
 * 
 * @module Collection
 * @constructor
 * @since 0.0.1
 * 
 * @classdesc Collection class that maps a MongoDB-like collection
 * 
 * @param {MongoPortable} db - Additional options
 * @param {String} collectionName - The name of the collection
 * @param {Object} [options] - Database object
 * 
 * @param {Object} [options.pkFactory=null] - Object overriding the basic "ObjectId" primary key generation.
 * 
 */
var database = null;

var Collection = function (_EventEmitter) {
    _inherits(Collection, _EventEmitter);

    // var Collection = function(db, collectionName, options) {
    function Collection(db, collectionName, options) {
        var _ret;

        _classCallCheck(this, Collection);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Collection).call(this));

        if (!(_this instanceof Collection)) return _ret = new Collection(db, collectionName, options), _possibleConstructorReturn(_this, _ret);

        logger = Logger.instance;

        if (_.isNil(db)) logger.throw("db parameter required");

        if (_.isNil(collectionName)) logger.throw("collectionName parameter required");

        if (_.isNil(options) || !_.isPlainObject(options)) options = {};

        Collection.checkCollectionName(collectionName);

        // this.db = db;
        database = db;
        _this.name = collectionName;
        _this.databaseName = db.databaseName;
        _this.fullName = _this.databaseName + '.' + _this.name;
        _this.docs = [];
        _this.doc_indexes = {};
        _this.snapshots = [];
        _this.opts = {}; // Default options

        _.merge(_this.opts, options);

        // this.emit = db.emit;
        return _this;
    }

    _createClass(Collection, [{
        key: "emit",
        value: function emit(name, args, cb) {
            _get(Object.getPrototypeOf(Collection.prototype), "emit", this).call(this, name, args, cb, database._stores);
        }
    }]);

    return Collection;
}(EventEmitter);

// TODO enforce rule that field names can't start with '$' or contain '.'
// (real mongodb does in fact enforce this)
// TODO possibly enforce that 'undefined' does not appear (we assume
// this in our handling of null and $exists)
/**
 * Inserts a document into the collection
 * 
 * @method Collection#insert
 * 
 * @param {Object} doc - Document to be inserted
 * @param {Object} [options] - Additional options
 * 
 * @param {Boolean} [options.chain=false] - If set to "true" returns this instance, so it can be chained with other methods
 * 
 * @param {Function} [callback=null] Callback function to be called at the end with the results
 * 
 * @returns {Object|Collection} If "options.chain" set to "true" returns this instance, otherwise returns the inserted document
 */


Collection.prototype.insert = function (doc, options, callback) {
    if (_.isNil(doc)) logger.throw("doc parameter required");

    if (!_.isPlainObject(doc)) logger.throw("doc must be an object");

    if (_.isNil(options)) options = {};

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    // Creating a safe copy of the document
    var _doc = _.cloneDeep(doc);

    // If the document comes with a number ID, parse it to String
    if (_.isNumber(_doc._id)) {
        _doc._id = _.toString(_doc._id);
    }

    if (_.isNil(_doc._id) || !_doc._id instanceof ObjectId && (!_.isString(_doc._id) || !_doc._id.length)) {
        _doc._id = new ObjectId();
    }

    // Add options to more dates
    _doc.timestamp = new ObjectId().generationTime;

    // Reverse
    this.doc_indexes[_.toString(_doc._id)] = this.docs.length;
    this.docs.push(_doc);

    /**
     * "insert" event.
     *
     * @event MongoPortable~insert
     * 
     * @param {Object} collection - Information about the collection
     * @param {Object} doc - Information about the document inserted
     */
    this.emit('insert', {
        collection: this,
        doc: _doc
    });

    if (callback) callback(null, _doc);

    if (options.chain) return this;

    return _doc;
};

/**
 * Inserts several documents into the collection
 * 
 * @method Collection#bulkInsert
 * 
 * @param {Array} docs - Documents to be inserted
 * @param {Object} [options] - Additional options
 * 
 * @param {Boolean} [options.chain=false] - If set to "true" returns this instance, so it can be chained with other methods
 * 
 * @param {Function} [callback=null] Callback function to be called at the end with the results
 * 
 * @returns {Object|Collection} If "options.chain" set to "true" returns this instance, otherwise returns the inserted document
 */
Collection.prototype.bulkInsert = function (docs, options, callback) {
    if (_.isNil(docs)) logger.throw("docs parameter required");

    if (!_.isArray(docs)) logger.throw("docs must be an array");

    if (_.isNil(options)) options = {};

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var _docs = [];

    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];

        _docs.push(this.insert(doc, options));
    }

    if (callback) callback(null, _docs);

    if (options.chain) return this;

    return _docs;
};

/**
 * Finds all matching documents
 * 
 * @method Collection#find
 * 
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object|Array|String} [fields={}] - The fields of the document to show
 * @param {Object} [options] - Additional options
 * 
 * @param {Number} [options.skip] - Number of documents to be skipped
 * @param {Number} [options.limit] - Max number of documents to display
 * @param {Object|Array|String} [options.fields] - Same as "fields" parameter (if both passed, "options.fields" will be ignored)
 * @param {Boolean} [options.forceFetch=false] - If set to'"true" returns the array of documents already fetched
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Array|Cursor} If "options.forceFetch" set to true returns the array of documents, otherwise returns a cursor
 */
Collection.prototype.find = function (selection, fields, options, callback) {
    var params = _ensureFindParams({
        selection: selection,
        fields: fields,
        options: options,
        callback: callback
    });

    selection = params.selection;
    fields = params.fields;
    options = params.options;
    callback = params.callback;

    var cursor = new Cursor(this.docs, selection, fields, options);

    /**
     * "find" event.
     *
     * @event MongoPortable~find
     * 
     * @property {Object} collection - Information about the collection
     * @property {Object} selector - The selection of the query
     * @property {Object} fields - The fields showed in the query
     */
    this.emit('find', {
        collection: this,
        selector: selection,
        fields: fields
    });

    // Pass the cursor fetched to the callback
    // Add [options.noFetchCallback = true]
    if (callback) callback(null, cursor.fetch());

    if (options.forceFetch) {
        return cursor.fetch();
    } else {
        return cursor;
    }
};

/**
 * Finds the first matching document
 * 
 * @method Collection#findOne
 * 
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object|Array|String} [fields={}] - The fields of the document to show
 * @param {Object} [options] - Additional options
 * 
 * @param {Number} [options.skip] - Number of documents to be skipped
 * @param {Number} [options.limit] - Max number of documents to display
 * @param {Object|Array|String} [options.fields] - Same as "fields" parameter (if both passed, "options.fields" will be ignored)
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Object} Returns the first matching document of the collection
 */
Collection.prototype.findOne = function (selection, fields, options, callback) {
    var params = _ensureFindParams({
        selection: selection,
        fields: fields,
        options: options,
        callback: callback
    });

    selection = params.selection;
    fields = params.fields;
    options = params.options;
    callback = params.callback;

    var cursor = new Cursor(this.docs, selection, fields, options);

    /**
     * "findOne" event.
     *
     * @event MongoPortable~findOne
     * 
     * @property {Object} collection - Information about the collection
     * @property {Object} selector - The selection of the query
     * @property {Object} fields - The fields showed in the query
     */
    this.emit('findOne', {
        collection: this,
        selector: selection,
        fields: fields
    });

    var res = null;

    if (cursor.hasNext()) {
        res = cursor.next();
    }

    // Pass the cursor fetched to the callback
    // Add [options.noFetchCallback = true]
    if (callback) callback(null, res);

    return res;
};

/**
 * Updates one or many documents
 * 
 * @method Collection#update
 * 
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object} [update={}] - The update operation
 * @param {Object} [options] - Additional options
 * 
 * @param {Number} [options.updateAsMongo=true] - By default: 
 *      If the [update] object contains update operator modifiers, such as those using the "$set" modifier, then:
 *          <ul>
 *              <li>The [update] object must contain only update operator expressions</li>
 *              <li>The Collection#update method updates only the corresponding fields in the document</li>
 *          <ul>
 *      If the [update] object contains only "field: value" expressions, then:
 *          <ul>
 *              <li>The Collection#update method replaces the matching document with the [update] object. The Collection#update method does not replace the "_id" value</li>
 *              <li>Collection#update cannot update multiple documents</li>
 *          <ul>
 * 
 * @param {Number} [options.override=false] - Replaces the whole document (only apllies when [updateAsMongo=false])
 * @param {Number} [options.upsert=false] - Creates a new document when no document matches the query criteria
 * @param {Number} [options.multi=false] - Updates multiple documents that meet the criteria
 * @param {Object} [options.writeConcern=null] - An object expressing the write concern
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Object} Object with the update/insert (if upsert=true) information
 */
Collection.prototype.update = function (selection, update, options, callback) {
    if (_.isNil(selection)) selection = {};

    if (_.isNil(update)) logger.throw("You must specify the update operation");

    if (_.isNil(options)) {
        options = {
            skip: 0,
            limit: 15 // for no limit pass [options.limit = -1]
        };
    }

    if (_.isFunction(selection)) logger.throw("You must specify the update operation");

    if (_.isFunction(update)) logger.throw("You must specify the update operation");

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    // Check special case where we are using an objectId
    if (selection instanceof ObjectId) {
        selection = {
            _id: selection
        };
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var res = null;

    var docs = null;
    if (options.multi) {
        docs = this.find(selection, null, { forceFetch: true });
    } else {
        docs = this.findOne(selection);
    }

    if (_.isNil(docs)) {
        docs = [];
    }

    if (!_.isArray(docs)) {
        docs = [docs];
    }

    if (docs.length === 0) {
        if (options.upsert) {
            var inserted = this.insert(update);

            res = {
                updated: {
                    documents: null,
                    count: 0
                },
                inserted: {
                    documents: [inserted],
                    count: 1
                }
            };
        } else {
            // No documents found
            res = {
                updated: {
                    documents: null,
                    count: 0
                },
                inserted: {
                    documents: null,
                    count: 0
                }
            };
        }
    } else {
        var updatedDocs = [];

        for (var i = 0; i < docs.length; i++) {
            var doc = docs[i];

            var override = null;

            var hasModifier = false;

            for (var key in update) {
                // IE7 doesn't support indexing into strings (eg, key[0] or key.indexOf('$') ), so use substr.
                // Testing over the first letter:
                //      Bests result with 1e8 loops => key[0](~3s) > substr(~5s) > regexp(~6s) > indexOf(~16s)

                var modifier = key.substr(0, 1) === '$';
                if (modifier) {
                    hasModifier = true;
                }

                if (options.updateAsMongo) {
                    if (hasModifier && !modifier) logger.throw("All update fields must be an update operator");

                    if (!hasModifier && options.multi) logger.throw("You can not update several documents when no update operators are included");

                    if (hasModifier) override = false;

                    if (!hasModifier) override = true;
                } else {
                    override = !!options.override;
                }
            }

            var _docUpdate = null;

            if (override) {
                // Overrides the document except for the "_id"
                _docUpdate = {
                    _id: doc._id
                };

                // Must ignore fields starting with '$', '.'...
                for (var _key in update) {
                    if (_key.substr(0, 1) === '$' || /\./g.test(_key)) {
                        logger.warn("The field " + _key + " can not begin with '$' or contain '.'");
                    } else {
                        _docUpdate[_key] = update[_key];
                    }
                }
            } else {
                _docUpdate = _.cloneDeep(doc);

                for (var _key2 in update) {
                    var val = update[_key2];

                    if (_key2.substr(0, 1) === '$') {
                        _docUpdate = _applyModifier(_docUpdate, _key2, val);
                    } else {
                        if (!_.isNil(_docUpdate[_key2])) {
                            if (_key2 !== '_id') {
                                _docUpdate[_key2] = val;
                            } else {
                                logger.warn("The field '_id' can not be updated");
                            }
                        } else {
                            logger.warn("The document does not contains the field " + _key2);
                        }
                    }
                }
            }

            updatedDocs.push(_docUpdate);

            var idx = this.doc_indexes[_docUpdate._id];
            this.docs[idx] = _docUpdate;
        }

        /**
         * "update" event.
         *
         * @event MongoPortable~update
         * 
         * @property {Object} collection - Information about the collection
         * @property {Object} selector - The selection of the query
         * @property {Object} modifier - The modifier used in the query
         * @property {Object} docs - The updated/inserted documents information
         */
        this.emit('update', {
            collection: this,
            selector: selection,
            modifier: update,
            docs: updatedDocs
        });

        res = {
            updated: {
                documents: updatedDocs,
                count: updatedDocs.length
            },
            inserted: {
                documents: null,
                count: 0
            }
        };
    }

    if (callback) callback(null, res);

    return res;
};

var _applyModifier = function _applyModifier(_docUpdate, key, val) {
    var doc = _.cloneDeep(_docUpdate);
    // var mod = _modifiers[key];

    if (!_modifiers[key]) {
        logger.throw("Invalid modifier specified: " + key);
    }

    for (var keypath in val) {
        var value = val[keypath];
        var keyparts = keypath.split('.');

        _modify(doc, keyparts, value, key);

        // var no_create = !!Collection._noCreateModifiers[key];
        // var forbid_array = (key === "$rename");
        // var target = Collection._findModTarget(_docUpdate, keyparts, no_create, forbid_array);
        // var field = keyparts.pop();

        // mod(target, field, value, keypath, _docUpdate);
    }

    return doc;
};

var _modify = function _modify(document, keyparts, value, key) {
    var level = arguments.length <= 4 || arguments[4] === undefined ? 0 : arguments[4];

    for (var i = level; i < keyparts.length; i++) {
        var path = keyparts[i];
        var isNumeric = /^[0-9]+$/.test(path);
        var target = document[path];

        var create = _.hasIn(Collection._noCreateModifiers, key) ? false : true;
        if (!create && (!_.isObject(document) || _.isNil(target))) {
            logger.throw("The element \"" + path + "\" must exists in \"" + JSON.stringify(document) + "\"");
        }

        if (_.isArray(document)) {
            // Do not allow $rename on arrays
            if (key === "$rename") return null;

            // Only let the use of "arrayfield.<numeric_index>.subfield"
            if (isNumeric) {
                path = _.toNumber(path);
            } else {
                logger.throw("The field \"" + path + "\" can not be appended to an array");
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
                    //  || keyparts[i + 1] === '$'  // TODO "arrayField.$"
                    target = [];
                } else {
                    target = {};
                }
            }

            document[path] = _modify(target, keyparts, value, key, level + 1);

            return document;
        } else {
            _modifiers[key](document, path, value);

            return document;
        }
    }
};

/**
 * Removes one or many documents
 * 
 * @method Collection#remove
 * 
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object} [options] - Additional options
 * 
 * @param {Number} [options.justOne=false] - Deletes the first occurrence of the selection
 * @param {Object} [options.writeConcern=null] - An object expressing the write concern
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Object} Object with the deleted documents
 */
Collection.prototype.remove = function (selection, options, callback) {
    var _this2 = this;

    if (_.isNil(selection)) selection = {};

    if (_.isFunction(selection)) {
        callback = selection;
        selection = {};
    }

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (_.isNil(options)) options = { justOne: false };

    // If we are not passing a selection and we are not removing just one, is the same as a drop
    if (Object.size(selection) === 0 && !options.justOne) return this.drop(options, callback);

    // Check special case where we are using an objectId
    if (selection instanceof ObjectId) {
        selection = {
            _id: selection
        };
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var cursor = this.find(selection);

    var docs = [];
    cursor.forEach(function (doc) {
        var idx = _this2.doc_indexes[doc._id];

        delete _this2.doc_indexes[doc._id];
        _this2.docs.splice(idx, 1);

        docs.push(doc);
    });

    /**
     * "remove" event.
     *
     * @event MongoPortable~remove
     * 
     * @property {Object} collection - Information about the collection
     * @property {Object} selector - The selection of the query
     * @property {Object} docs - The deleted documents information
     */
    this.emit('remove', {
        collection: this,
        selector: selection,
        docs: docs
    });

    if (callback) callback(null, docs);

    return docs;
};

/**
 * Alias for {@link Collection#remove}
 * 
 * @method Collection#delete
 */
Collection.prototype.delete = function (selection, options, callback) {
    return this.remove(selection, options, callback);
};

/**
* Alias for {@link Collection#remove}
* 
* @method Collection#destroy
*/
Collection.prototype.destroy = function (selection, options, callback) {
    return this.remove(selection, options, callback);
};

/**
 * Drops a collection
 * 
 * @method Collection#drop
 * 
 * @param {Object} [options] - Additional options
 * 
 * @param {Number} [options.dropIndexes=false] - True if we want to drop the indexes too
 * @param {Object} [options.writeConcern=null] - An object expressing the write concern
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Object} True when the collection is dropped
 */
Collection.prototype.drop = function (options, callback) {
    if (_.isNil(options)) options = {};

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    this.doc_indexes = {};
    this.docs = [];

    if (options.dropIndexes) {} // TODO

    this.emit('dropCollection', {
        collection: this,
        indexes: !!options.dropIndexes
    });

    if (callback) callback(null, true);

    return true;
};

/**
 * Insert or update a document. If the document has an "_id" is an update (with upsert), if not is an insert.
 * 
 * @method Collection#save
 * 
 * @param {Object} doc - Document to be inserted/updated
 * 
 * @param {Number} [options.dropIndexes=false] - True if we want to drop the indexes too
 * @param {Object} [options.writeConcern=null] - An object expressing the write concern
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Object} True when the collection is dropped
 */
Collection.prototype.save = function (doc, options, callback) {
    if (_.isNil(doc) || _.isFunction(doc)) logger.throw("You must pass a document");

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (_.hasIn(doc, '_id')) {
        options.upsert = true;

        return this.update({ _id: doc._id }, doc, options, callback);
    } else {
        return this.insert(doc, options, callback);
    }
};

/**
* @ignore
*/
Collection.prototype.ensureIndex = function () {
    //TODO Implement EnsureIndex
    logger.throw('Collection#ensureIndex unimplemented by driver');
};

// TODO document (at some point)
// TODO test
// TODO obviously this particular implementation will not be very efficient
/**
* @ignore
*/
Collection.prototype.backup = function (backupID, callback) {
    if (_.isFunction(backupID)) {
        callback = backupID;
        backupID = new ObjectId().toString();
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    this.snapshots[backupID] = _.cloneDeep(this.docs);
    this.emit('snapshot', {
        collection: this,
        backupID: backupID,
        documents: this.snapshots[backupID]
    });

    var result = {
        backupID: backupID,
        documents: this.snapshots[backupID]
    };

    if (callback) callback(null, result);

    return result;
};

// Lists available Backups
/**
* @ignore
*/
Collection.prototype.backups = function (callback) {
    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var backups = [];

    for (var id in this.snapshots) {
        backups.push({ id: id, documents: this.snapshots[id] });
    }

    if (callback) callback(null, backups);

    return backups;
};

// Lists available Backups
/**
* @ignore
*/
Collection.prototype.removeBackup = function (backupID, callback) {
    if (_.isFunction(backupID)) {
        callback = backupID;
        backupID = null;
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var result = false;

    if (backupID) {
        delete this.snapshots[_.toString(backupID)];

        result = backupID;
    } else {
        this.snapshots = {};

        result = true;
    }

    if (callback) callback(null, result);

    return result;
};

// Restore the snapshot. If no snapshot exists, raise an exception;
/**
* @ignore
*/
Collection.prototype.restore = function (backupID, callback) {
    if (_.isFunction(backupID)) {
        callback = backupID;
        backupID = null;
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    var snapshotCount = Object.size(this.snapshots);
    var backupData = null;

    if (snapshotCount === 0) {
        logger.throw("There is no snapshots");
    } else {
        if (!backupID) {
            if (snapshotCount === 1) {
                logger.info("No backupID passed. Restoring the only snapshot");

                // Retrieve the only snapshot
                for (var key in this.snapshots) {
                    backupID = key;
                }
            } else {
                logger.throw("The are several snapshots. Please specify one backupID");
            }
        }
    }

    backupData = this.snapshots[backupID];

    if (!backupData) {
        logger.throw("Unknown Backup ID: " + backupID);
    }

    this.docs = backupData;
    this.emit('restore', {
        collection: this,
        backupID: backupID
    });

    if (callback) callback(null);

    return this;
};

/**
 * Calculates aggregate values for the data in a collection
 * 
 * @method Collection#aggregate
 * 
 * @param {Array} pipeline - A sequence of data aggregation operations or stages
 * @param {Object} [options] - Additional options
 * 
 * @param {Boolean} [options.forceFetch=false] - If set to'"true" returns the array of documents already fetched
 * 
 * @returns {Array|Cursor} If "options.forceFetch" set to true returns the array of documents, otherwise returns a cursor
 */
Collection.prototype.aggregate = function (pipeline) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? { forceFetch: false } : arguments[1];

    if (_.isNil(pipeline) || !_.isArray(pipeline)) logger.throw('The "pipeline" param must be an array');

    var aggregation = new Aggregation(pipeline);

    for (var i = 0; i < pipeline.length; i++) {
        var stage = pipeline[i];

        for (var key in stage) {
            if (key.substr(0, 1) !== '$') logger.throw("The pipeline stages must begin with '$'");

            if (!aggregation.validStage(key)) logger.throw("Invalid stage \"" + key + "\"");

            break;
        }
    }

    var result = aggregation.aggregate(this);

    return result; // change to cursor
};

/**
* @ignore
*/
Collection._noCreateModifiers = {
    $unset: true,
    $pop: true,
    $rename: true,
    $pull: true,
    $pullAll: true
};

/**
* @ignore
*/
var _modifiers = {
    $inc: function $inc(target, field, arg) {
        if (!_.isNumber(arg)) {
            logger.throw("Modifier $inc allowed for numbers only");
        }

        if (field in target) {
            if (!_.isNumber(target[field])) {
                logger.throw("Cannot apply $inc modifier to non-number");
            }

            target[field] += arg;
        } else {
            target[field] = arg;
        }
    },

    $set: function $set(target, field, arg) {
        target[field] = _.cloneDeep(arg);
    },

    $unset: function $unset(target, field, arg) {
        if (!_.isNil(target)) {
            if (_.isArray(target)) {
                if (field in target) {
                    target[field] = null;
                }
            } else {
                delete target[field];
            }
        }
    },

    $push: function $push(target, field, arg) {
        var x = target[field];

        if (_.isNil(x)) {
            target[field] = [arg];
        } else if (!_.isArray(x)) {
            logger.throw("Cannot apply $push modifier to non-array");
        } else {
            x.push(_.cloneDeep(arg));
        }
    },

    $pushAll: function $pushAll(target, field, arg) {
        var x = target[field];

        if (_.isNil(x)) {
            target[field] = arg;
        } else if (!_.isArray(x)) {
            logger.throw("Modifier $pushAll/pullAll allowed for arrays only");
        } else {
            for (var i = 0; i < arg.length; i++) {
                x.push(arg[i]);
            }
        }
    },

    $addToSet: function $addToSet(target, field, arg) {
        var x = target[field];

        if (_.isNil(x)) {
            target[field] = [arg];
        } else if (!_.isArray(x)) {
            logger.throw("Cannot apply $addToSet modifier to non-array");
        } else {
            var isEach = false;
            if (_.isPlainObject(arg)) {
                for (var k in arg) {
                    if (k === "$each") {
                        isEach = true;
                    }

                    break;
                }
            }

            var values = isEach ? arg["$each"] : [arg];
            _.forEach(values, function (value) {
                for (var i = 0; i < x.length; i++) {
                    if (SelectorMatcher.equal(value, x[i])) return;
                }

                x.push(value);
            });
        }
    },

    $pop: function $pop(target, field, arg) {
        if (_.isNil(target) || _.isNil(target[field])) return;

        var x = target[field];

        if (!_.isArray(x)) {
            logger.throw("Cannot apply $pop modifier to non-array");
        } else {
            if (_.isNumber(arg) && arg < 0) {
                x.splice(0, 1);
            } else {
                x.pop();
            }
        }
    },

    $pull: function $pull(target, field, arg) {
        if (_.isNil(target) || _.isNil(target[field])) return;

        var x = target[field];

        if (!_.isArray(x)) {
            logger.throw("Cannot apply $pull/pullAll modifier to non-array");
        } else {
            var out = [];

            if ((typeof arg === "undefined" ? "undefined" : _typeof(arg)) === "object" && !(arg instanceof Array)) {
                // XXX would be much nicer to compile this once, rather than
                // for each document we modify.. but usually we're not
                // modifying that many documents, so we'll let it slide for
                // now

                // XXX _compileSelector isn't up for the job, because we need
                // to permit stuff like {$pull: {a: {$gt: 4}}}.. something
                // like {$gt: 4} is not normally a complete selector.
                var match = new Selector({
                    "__matching__": arg
                });
                for (var i = 0; i < x.length; i++) {
                    var _doc_ = {
                        __matching__: x[i]
                    };
                    if (!match.test(_doc_)) {
                        out.push(x[i]);
                    }
                }
            } else {
                for (var i = 0; i < x.length; i++) {
                    if (!SelectorMatcher.equal(x[i], arg)) {
                        out.push(x[i]);
                    }
                }
            }

            target[field] = out;
        }
    },

    $pullAll: function $pullAll(target, field, arg) {
        if (_.isNil(target) || _.isNil(target[field])) return;

        var x = target[field];

        if (!_.isNil(x) && !_.isArray(x)) {
            logger.throw("Modifier $pushAll/pullAll allowed for arrays only");
        } else if (!_.isNil(x)) {
            var out = [];

            for (var i = 0; i < x.length; i++) {
                var exclude = false;

                for (var j = 0; j < arg.length; j++) {
                    if (SelectorMatcher.equal(x[i], arg[j])) {
                        exclude = true;

                        break;
                    }
                }

                if (!exclude) {
                    out.push(x[i]);
                }
            }

            target[field] = out;
        }
    },

    $rename: function $rename(target, field, value) {
        if (field === value) {
            // no idea why mongo has this restriction..
            logger.throw("The new field name must be different");
        }

        if (!_.isString(value) || value.trim() === '') {
            logger.throw("The new name must be a non-empty string");
        }

        target[value] = target[field];
        delete target[field];
    },

    $bit: function $bit(target, field, arg) {
        // XXX mongo only supports $bit on integers, and we only support
        // native javascript numbers (doubles) so far, so we can't support $bit
        logger.throw("$bit is not supported");
    }
};

/**
* @ignore
*/
Collection.checkCollectionName = function (collectionName) {
    if (!_.isString(collectionName)) {
        logger.throw("collection name must be a String");
    }

    if (!collectionName || collectionName.indexOf('..') !== -1) {
        logger.throw("collection names cannot be empty");
    }

    if (collectionName.indexOf('$') !== -1 && collectionName.match(/((^\$cmd)|(oplog\.\$main))/) === null) {
        logger.throw("collection names must not contain '$'");
    }

    if (collectionName.match(/^system\./) !== null) {
        logger.throw("collection names must not start with 'system.' (reserved for internal use)");
    }

    if (collectionName.match(/^\.|\.$/) !== null) {
        logger.throw("collection names must not start or end with '.'");
    }
};

/**
* @ignore
*/
Collection.prototype.rename = function (newName) {
    if (_.isString(newName)) {
        if (this.name !== newName) {
            Collection.checkCollectionName(newName);

            var dbName = this.name.split('.').length > 1 ? this.name.split('.')[0] : '';

            this.name = newName;
            this.fullName = dbName + '.' + this.name;

            return this;
        }
    } else {
        // Error
    }
};

module.exports = Collection;

/**
 * Gets the size of an object.
 * 
 * @method Object#size
 * 
 * @param {Object} obj - The object
 * 
 * @returns {Number} The size of the object
 */
Object.size = function (obj) {
    var size = 0,
        key;

    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }

    return size;
};

var _ensureFindParams = function _ensureFindParams(params) {
    // selection, fields, options, callback
    if (_.isNil(params.selection)) params.selection = {};

    if (_.isNil(params.selection)) params.selection = {};

    if (_.isNil(params.fields)) params.fields = [];

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
    if (params.selection instanceof ObjectId) {
        params.selection = {
            _id: params.selection
        };
    }

    if (!_.isNil(params.callback) && !_.isFunction(params.callback)) {
        logger.throw("callback must be a function");
    }

    if (params.options.fields) {
        if (_.isNil(params.fields) || params.fields.length === 0) {
            params.fields = params.options.fields;
        } else {
            logger.warn("Fields already present. Ignoring 'options.fields'.");
        }
    }

    return params;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9Db2xsZWN0aW9uLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBU0EsSUFBSSxTQUFTLFFBQVEsWUFBUixDQUFiO0lBQ0ksZUFBZSxRQUFRLHNCQUFSLENBRG5CO0lBRUksSUFBSSxRQUFRLFFBQVIsQ0FGUjtJQUdJLGNBQWMsUUFBUSxlQUFSLENBSGxCO0lBSUksU0FBUyxRQUFRLFVBQVIsQ0FKYjtJQUtJLFdBQVcsUUFBUSxZQUFSLENBTGY7SUFNSSxXQUFXLFFBQVEsWUFBUixDQU5mO0lBT0ksa0JBQWtCLFFBQVEsbUJBQVIsQ0FQdEI7O0FBU0EsSUFBSSxTQUFTLElBQWI7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQSxJQUFJLFdBQVcsSUFBZjs7SUFDTSxVOzs7O0FBRUYsd0JBQVksRUFBWixFQUFnQixjQUFoQixFQUFnQyxPQUFoQyxFQUF5QztBQUFBOztBQUFBOztBQUFBOztBQUdyQyxZQUFJLEVBQUUsaUJBQWdCLFVBQWxCLENBQUosRUFBbUMsY0FBTyxJQUFJLFVBQUosQ0FBZSxFQUFmLEVBQW1CLGNBQW5CLEVBQW1DLE9BQW5DLENBQVA7O0FBRW5DLGlCQUFTLE9BQU8sUUFBaEI7O0FBRUEsWUFBSSxFQUFFLEtBQUYsQ0FBUSxFQUFSLENBQUosRUFBaUIsT0FBTyxLQUFQLENBQWEsdUJBQWI7O0FBRWpCLFlBQUksRUFBRSxLQUFGLENBQVEsY0FBUixDQUFKLEVBQTZCLE9BQU8sS0FBUCxDQUFhLG1DQUFiOztBQUU3QixZQUFJLEVBQUUsS0FBRixDQUFRLE9BQVIsS0FBb0IsQ0FBQyxFQUFFLGFBQUYsQ0FBZ0IsT0FBaEIsQ0FBekIsRUFBbUQsVUFBVSxFQUFWOztBQUVuRCxtQkFBVyxtQkFBWCxDQUErQixjQUEvQjs7O0FBR0EsbUJBQVcsRUFBWDtBQUNBLGNBQUssSUFBTCxHQUFZLGNBQVo7QUFDQSxjQUFLLFlBQUwsR0FBb0IsR0FBRyxZQUF2QjtBQUNBLGNBQUssUUFBTCxHQUFnQixNQUFLLFlBQUwsR0FBb0IsR0FBcEIsR0FBMEIsTUFBSyxJQUEvQztBQUNBLGNBQUssSUFBTCxHQUFZLEVBQVo7QUFDQSxjQUFLLFdBQUwsR0FBbUIsRUFBbkI7QUFDQSxjQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxjQUFLLElBQUwsR0FBWSxFQUFaLEM7O0FBRUEsVUFBRSxLQUFGLENBQVEsTUFBSyxJQUFiLEVBQW1CLE9BQW5COzs7QUF6QnFDO0FBNEJ4Qzs7Ozs2QkFFSSxJLEVBQU0sSSxFQUFNLEUsRUFBSTtBQUNqQix1RkFBVyxJQUFYLEVBQWlCLElBQWpCLEVBQXVCLEVBQXZCLEVBQTJCLFNBQVMsT0FBcEM7QUFDSDs7OztFQWxDb0IsWTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXVEekIsV0FBVyxTQUFYLENBQXFCLE1BQXJCLEdBQThCLFVBQVUsR0FBVixFQUFlLE9BQWYsRUFBd0IsUUFBeEIsRUFBa0M7QUFDNUQsUUFBSSxFQUFFLEtBQUYsQ0FBUSxHQUFSLENBQUosRUFBa0IsT0FBTyxLQUFQLENBQWEsd0JBQWI7O0FBRWxCLFFBQUksQ0FBQyxFQUFFLGFBQUYsQ0FBZ0IsR0FBaEIsQ0FBTCxFQUEyQixPQUFPLEtBQVAsQ0FBYSx1QkFBYjs7QUFFM0IsUUFBSSxFQUFFLEtBQUYsQ0FBUSxPQUFSLENBQUosRUFBc0IsVUFBVSxFQUFWOztBQUV0QixRQUFJLEVBQUUsVUFBRixDQUFhLE9BQWIsQ0FBSixFQUEyQjtBQUN2QixtQkFBVyxPQUFYO0FBQ0Esa0JBQVUsRUFBVjtBQUNIOztBQUVELFFBQUksQ0FBQyxFQUFFLEtBQUYsQ0FBUSxRQUFSLENBQUQsSUFBc0IsQ0FBQyxFQUFFLFVBQUYsQ0FBYSxRQUFiLENBQTNCLEVBQW1ELE9BQU8sS0FBUCxDQUFhLDZCQUFiOzs7QUFHbkQsUUFBSSxPQUFPLEVBQUUsU0FBRixDQUFZLEdBQVosQ0FBWDs7O0FBR0EsUUFBSSxFQUFFLFFBQUYsQ0FBVyxLQUFLLEdBQWhCLENBQUosRUFBMEI7QUFDdEIsYUFBSyxHQUFMLEdBQVcsRUFBRSxRQUFGLENBQVcsS0FBSyxHQUFoQixDQUFYO0FBQ0g7O0FBRUQsUUFBSSxFQUFFLEtBQUYsQ0FBUSxLQUFLLEdBQWIsS0FBc0IsQ0FBQyxLQUFLLEdBQU4sWUFBcUIsUUFBckIsS0FBa0MsQ0FBQyxFQUFFLFFBQUYsQ0FBVyxLQUFLLEdBQWhCLENBQUQsSUFBeUIsQ0FBQyxLQUFLLEdBQUwsQ0FBUyxNQUFyRSxDQUExQixFQUF5RztBQUNyRyxhQUFLLEdBQUwsR0FBVyxJQUFJLFFBQUosRUFBWDtBQUNIOzs7QUFHRCxTQUFLLFNBQUwsR0FBaUIsSUFBSSxRQUFKLEdBQWUsY0FBaEM7OztBQUdBLFNBQUssV0FBTCxDQUFpQixFQUFFLFFBQUYsQ0FBVyxLQUFLLEdBQWhCLENBQWpCLElBQXlDLEtBQUssSUFBTCxDQUFVLE1BQW5EO0FBQ0EsU0FBSyxJQUFMLENBQVUsSUFBVixDQUFlLElBQWY7Ozs7Ozs7Ozs7QUFVQSxTQUFLLElBQUwsQ0FDSSxRQURKLEVBRUk7QUFDSSxvQkFBWSxJQURoQjtBQUVJLGFBQUs7QUFGVCxLQUZKOztBQVFBLFFBQUksUUFBSixFQUFjLFNBQVMsSUFBVCxFQUFlLElBQWY7O0FBRWQsUUFBSSxRQUFRLEtBQVosRUFBbUIsT0FBTyxJQUFQOztBQUVuQixXQUFPLElBQVA7QUFDSCxDQXRERDs7Ozs7Ozs7Ozs7Ozs7OztBQXNFQSxXQUFXLFNBQVgsQ0FBcUIsVUFBckIsR0FBa0MsVUFBVSxJQUFWLEVBQWdCLE9BQWhCLEVBQXlCLFFBQXpCLEVBQW1DO0FBQ2pFLFFBQUksRUFBRSxLQUFGLENBQVEsSUFBUixDQUFKLEVBQW1CLE9BQU8sS0FBUCxDQUFhLHlCQUFiOztBQUVuQixRQUFJLENBQUMsRUFBRSxPQUFGLENBQVUsSUFBVixDQUFMLEVBQXNCLE9BQU8sS0FBUCxDQUFhLHVCQUFiOztBQUV0QixRQUFJLEVBQUUsS0FBRixDQUFRLE9BQVIsQ0FBSixFQUFzQixVQUFVLEVBQVY7O0FBRXRCLFFBQUksRUFBRSxVQUFGLENBQWEsT0FBYixDQUFKLEVBQTJCO0FBQ3ZCLG1CQUFXLE9BQVg7QUFDQSxrQkFBVSxFQUFWO0FBQ0g7O0FBRUQsUUFBSSxDQUFDLEVBQUUsS0FBRixDQUFRLFFBQVIsQ0FBRCxJQUFzQixDQUFDLEVBQUUsVUFBRixDQUFhLFFBQWIsQ0FBM0IsRUFBbUQsT0FBTyxLQUFQLENBQWEsNkJBQWI7O0FBRW5ELFFBQUksUUFBUSxFQUFaOztBQUVBLFNBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxLQUFLLE1BQXpCLEVBQWlDLEdBQWpDLEVBQXNDO0FBQ2xDLFlBQUksTUFBTSxLQUFLLENBQUwsQ0FBVjs7QUFFQSxjQUFNLElBQU4sQ0FBVyxLQUFLLE1BQUwsQ0FBWSxHQUFaLEVBQWlCLE9BQWpCLENBQVg7QUFDSDs7QUFFRCxRQUFJLFFBQUosRUFBYyxTQUFTLElBQVQsRUFBZSxLQUFmOztBQUVkLFFBQUksUUFBUSxLQUFaLEVBQW1CLE9BQU8sSUFBUDs7QUFFbkIsV0FBTyxLQUFQO0FBQ0gsQ0EzQkQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBK0NBLFdBQVcsU0FBWCxDQUFxQixJQUFyQixHQUE0QixVQUFVLFNBQVYsRUFBcUIsTUFBckIsRUFBNkIsT0FBN0IsRUFBc0MsUUFBdEMsRUFBZ0Q7QUFDeEUsUUFBSSxTQUFTLGtCQUFrQjtBQUMzQixtQkFBVyxTQURnQjtBQUUzQixnQkFBUSxNQUZtQjtBQUczQixpQkFBUyxPQUhrQjtBQUkzQixrQkFBVTtBQUppQixLQUFsQixDQUFiOztBQU9BLGdCQUFZLE9BQU8sU0FBbkI7QUFDQSxhQUFTLE9BQU8sTUFBaEI7QUFDQSxjQUFVLE9BQU8sT0FBakI7QUFDQSxlQUFXLE9BQU8sUUFBbEI7O0FBRUEsUUFBSSxTQUFTLElBQUksTUFBSixDQUFXLEtBQUssSUFBaEIsRUFBc0IsU0FBdEIsRUFBaUMsTUFBakMsRUFBeUMsT0FBekMsQ0FBYjs7Ozs7Ozs7Ozs7QUFXQSxTQUFLLElBQUwsQ0FDSSxNQURKLEVBRUk7QUFDSSxvQkFBWSxJQURoQjtBQUVJLGtCQUFVLFNBRmQ7QUFHSSxnQkFBUTtBQUhaLEtBRko7Ozs7QUFXQSxRQUFJLFFBQUosRUFBYyxTQUFTLElBQVQsRUFBZSxPQUFPLEtBQVAsRUFBZjs7QUFFZCxRQUFJLFFBQVEsVUFBWixFQUF3QjtBQUNwQixlQUFPLE9BQU8sS0FBUCxFQUFQO0FBQ0gsS0FGRCxNQUVPO0FBQ0gsZUFBTyxNQUFQO0FBQ0g7QUFDSixDQTFDRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTZEQSxXQUFXLFNBQVgsQ0FBcUIsT0FBckIsR0FBK0IsVUFBVSxTQUFWLEVBQXFCLE1BQXJCLEVBQTZCLE9BQTdCLEVBQXNDLFFBQXRDLEVBQWdEO0FBQzNFLFFBQUksU0FBUyxrQkFBa0I7QUFDM0IsbUJBQVcsU0FEZ0I7QUFFM0IsZ0JBQVEsTUFGbUI7QUFHM0IsaUJBQVMsT0FIa0I7QUFJM0Isa0JBQVU7QUFKaUIsS0FBbEIsQ0FBYjs7QUFPQSxnQkFBWSxPQUFPLFNBQW5CO0FBQ0EsYUFBUyxPQUFPLE1BQWhCO0FBQ0EsY0FBVSxPQUFPLE9BQWpCO0FBQ0EsZUFBVyxPQUFPLFFBQWxCOztBQUVBLFFBQUksU0FBUyxJQUFJLE1BQUosQ0FBVyxLQUFLLElBQWhCLEVBQXNCLFNBQXRCLEVBQWlDLE1BQWpDLEVBQXlDLE9BQXpDLENBQWI7Ozs7Ozs7Ozs7O0FBV0EsU0FBSyxJQUFMLENBQ0ksU0FESixFQUVJO0FBQ0ksb0JBQVksSUFEaEI7QUFFSSxrQkFBVSxTQUZkO0FBR0ksZ0JBQVE7QUFIWixLQUZKOztBQVNBLFFBQUksTUFBTSxJQUFWOztBQUVBLFFBQUksT0FBTyxPQUFQLEVBQUosRUFBc0I7QUFDbEIsY0FBTSxPQUFPLElBQVAsRUFBTjtBQUNIOzs7O0FBSUQsUUFBSSxRQUFKLEVBQWMsU0FBUyxJQUFULEVBQWUsR0FBZjs7QUFFZCxXQUFPLEdBQVA7QUFDSCxDQTVDRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE2RUEsV0FBVyxTQUFYLENBQXFCLE1BQXJCLEdBQThCLFVBQVUsU0FBVixFQUFxQixNQUFyQixFQUE2QixPQUE3QixFQUFzQyxRQUF0QyxFQUFnRDtBQUMxRSxRQUFJLEVBQUUsS0FBRixDQUFRLFNBQVIsQ0FBSixFQUF3QixZQUFZLEVBQVo7O0FBRXhCLFFBQUksRUFBRSxLQUFGLENBQVEsTUFBUixDQUFKLEVBQXFCLE9BQU8sS0FBUCxDQUFhLHVDQUFiOztBQUVyQixRQUFJLEVBQUUsS0FBRixDQUFRLE9BQVIsQ0FBSixFQUFzQjtBQUNsQixrQkFBVTtBQUNOLGtCQUFNLENBREE7QUFFTixtQkFBTyxFO0FBRkQsU0FBVjtBQUlIOztBQUVELFFBQUksRUFBRSxVQUFGLENBQWEsU0FBYixDQUFKLEVBQTZCLE9BQU8sS0FBUCxDQUFhLHVDQUFiOztBQUU3QixRQUFJLEVBQUUsVUFBRixDQUFhLE1BQWIsQ0FBSixFQUEwQixPQUFPLEtBQVAsQ0FBYSx1Q0FBYjs7QUFFMUIsUUFBSSxFQUFFLFVBQUYsQ0FBYSxPQUFiLENBQUosRUFBMkI7QUFDdkIsbUJBQVcsT0FBWDtBQUNBLGtCQUFVLEVBQVY7QUFDSDs7O0FBR0QsUUFBRyxxQkFBcUIsUUFBeEIsRUFBa0M7QUFDOUIsb0JBQVk7QUFDUixpQkFBSztBQURHLFNBQVo7QUFHSDs7QUFFRCxRQUFJLENBQUMsRUFBRSxLQUFGLENBQVEsUUFBUixDQUFELElBQXNCLENBQUMsRUFBRSxVQUFGLENBQWEsUUFBYixDQUEzQixFQUFtRCxPQUFPLEtBQVAsQ0FBYSw2QkFBYjs7QUFFbkQsUUFBSSxNQUFNLElBQVY7O0FBRUEsUUFBSSxPQUFPLElBQVg7QUFDQSxRQUFJLFFBQVEsS0FBWixFQUFtQjtBQUNmLGVBQU8sS0FBSyxJQUFMLENBQVUsU0FBVixFQUFxQixJQUFyQixFQUEyQixFQUFFLFlBQVksSUFBZCxFQUEzQixDQUFQO0FBQ0gsS0FGRCxNQUVPO0FBQ0gsZUFBTyxLQUFLLE9BQUwsQ0FBYSxTQUFiLENBQVA7QUFDSDs7QUFFRCxRQUFJLEVBQUUsS0FBRixDQUFRLElBQVIsQ0FBSixFQUFtQjtBQUNmLGVBQU8sRUFBUDtBQUNIOztBQUVELFFBQUksQ0FBQyxFQUFFLE9BQUYsQ0FBVSxJQUFWLENBQUwsRUFBc0I7QUFDbEIsZUFBTyxDQUFDLElBQUQsQ0FBUDtBQUNIOztBQUVELFFBQUksS0FBSyxNQUFMLEtBQWdCLENBQXBCLEVBQXVCO0FBQ25CLFlBQUksUUFBUSxNQUFaLEVBQW9CO0FBQ2hCLGdCQUFJLFdBQVcsS0FBSyxNQUFMLENBQVksTUFBWixDQUFmOztBQUVBLGtCQUFNO0FBQ0YseUJBQVM7QUFDTCwrQkFBVyxJQUROO0FBRUwsMkJBQU87QUFGRixpQkFEUDtBQUtGLDBCQUFVO0FBQ04sK0JBQVcsQ0FBQyxRQUFELENBREw7QUFFTiwyQkFBTztBQUZEO0FBTFIsYUFBTjtBQVVILFNBYkQsTUFhTzs7QUFFSCxrQkFBTTtBQUNGLHlCQUFTO0FBQ0wsK0JBQVcsSUFETjtBQUVMLDJCQUFPO0FBRkYsaUJBRFA7QUFLRiwwQkFBVTtBQUNOLCtCQUFXLElBREw7QUFFTiwyQkFBTztBQUZEO0FBTFIsYUFBTjtBQVVIO0FBQ0osS0EzQkQsTUEyQk87QUFDSCxZQUFJLGNBQWMsRUFBbEI7O0FBRUEsYUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLEtBQUssTUFBekIsRUFBaUMsR0FBakMsRUFBc0M7QUFDbEMsZ0JBQUksTUFBTSxLQUFLLENBQUwsQ0FBVjs7QUFFQSxnQkFBSSxXQUFXLElBQWY7O0FBRUEsZ0JBQUksY0FBYyxLQUFsQjs7QUFFQSxpQkFBSyxJQUFJLEdBQVQsSUFBZ0IsTUFBaEIsRUFBd0I7Ozs7O0FBS3BCLG9CQUFJLFdBQVksSUFBSSxNQUFKLENBQVcsQ0FBWCxFQUFjLENBQWQsTUFBcUIsR0FBckM7QUFDQSxvQkFBSSxRQUFKLEVBQWM7QUFDVixrQ0FBYyxJQUFkO0FBQ0g7O0FBRUQsb0JBQUksUUFBUSxhQUFaLEVBQTJCO0FBQ3ZCLHdCQUFJLGVBQWUsQ0FBQyxRQUFwQixFQUE4QixPQUFPLEtBQVAsQ0FBYSw4Q0FBYjs7QUFFOUIsd0JBQUksQ0FBQyxXQUFELElBQWdCLFFBQVEsS0FBNUIsRUFBbUMsT0FBTyxLQUFQLENBQWEsNEVBQWI7O0FBRW5DLHdCQUFJLFdBQUosRUFBaUIsV0FBVyxLQUFYOztBQUVqQix3QkFBSSxDQUFDLFdBQUwsRUFBa0IsV0FBVyxJQUFYO0FBQ3JCLGlCQVJELE1BUU87QUFDSCwrQkFBVyxDQUFDLENBQUMsUUFBUSxRQUFyQjtBQUNIO0FBQ0o7O0FBRUQsZ0JBQUksYUFBYSxJQUFqQjs7QUFFQSxnQkFBSSxRQUFKLEVBQWM7O0FBRVYsNkJBQWE7QUFDVCx5QkFBSyxJQUFJO0FBREEsaUJBQWI7OztBQUtBLHFCQUFLLElBQUksSUFBVCxJQUFnQixNQUFoQixFQUF3QjtBQUNwQix3QkFBSSxLQUFJLE1BQUosQ0FBVyxDQUFYLEVBQWMsQ0FBZCxNQUFxQixHQUFyQixJQUE0QixNQUFNLElBQU4sQ0FBVyxJQUFYLENBQWhDLEVBQWlEO0FBQzdDLCtCQUFPLElBQVAsZ0JBQXlCLElBQXpCO0FBQ0gscUJBRkQsTUFFTztBQUNILG1DQUFXLElBQVgsSUFBa0IsT0FBTyxJQUFQLENBQWxCO0FBQ0g7QUFDSjtBQUNKLGFBZEQsTUFjTztBQUNILDZCQUFhLEVBQUUsU0FBRixDQUFZLEdBQVosQ0FBYjs7QUFFQSxxQkFBSyxJQUFJLEtBQVQsSUFBZ0IsTUFBaEIsRUFBd0I7QUFDcEIsd0JBQUksTUFBTSxPQUFPLEtBQVAsQ0FBVjs7QUFFQSx3QkFBSSxNQUFJLE1BQUosQ0FBVyxDQUFYLEVBQWMsQ0FBZCxNQUFxQixHQUF6QixFQUE4QjtBQUMxQixxQ0FBYSxlQUFlLFVBQWYsRUFBMkIsS0FBM0IsRUFBZ0MsR0FBaEMsQ0FBYjtBQUNILHFCQUZELE1BRU87QUFDSCw0QkFBSSxDQUFDLEVBQUUsS0FBRixDQUFRLFdBQVcsS0FBWCxDQUFSLENBQUwsRUFBK0I7QUFDM0IsZ0NBQUksVUFBUSxLQUFaLEVBQW1CO0FBQ2YsMkNBQVcsS0FBWCxJQUFrQixHQUFsQjtBQUNILDZCQUZELE1BRU87QUFDSCx1Q0FBTyxJQUFQLENBQVksb0NBQVo7QUFDSDtBQUNKLHlCQU5ELE1BTU87QUFDSCxtQ0FBTyxJQUFQLCtDQUF3RCxLQUF4RDtBQUNIO0FBQ0o7QUFDSjtBQUNKOztBQUVELHdCQUFZLElBQVosQ0FBaUIsVUFBakI7O0FBRUEsZ0JBQUksTUFBTSxLQUFLLFdBQUwsQ0FBaUIsV0FBVyxHQUE1QixDQUFWO0FBQ0EsaUJBQUssSUFBTCxDQUFVLEdBQVYsSUFBaUIsVUFBakI7QUFDSDs7Ozs7Ozs7Ozs7O0FBWUQsYUFBSyxJQUFMLENBQ0ksUUFESixFQUVJO0FBQ0ksd0JBQVksSUFEaEI7QUFFSSxzQkFBVSxTQUZkO0FBR0ksc0JBQVUsTUFIZDtBQUlJLGtCQUFNO0FBSlYsU0FGSjs7QUFVQSxjQUFNO0FBQ0YscUJBQVM7QUFDTCwyQkFBVyxXQUROO0FBRUwsdUJBQU8sWUFBWTtBQUZkLGFBRFA7QUFLRixzQkFBVTtBQUNOLDJCQUFXLElBREw7QUFFTix1QkFBTztBQUZEO0FBTFIsU0FBTjtBQVVIOztBQUdELFFBQUksUUFBSixFQUFjLFNBQVMsSUFBVCxFQUFlLEdBQWY7O0FBRWQsV0FBTyxHQUFQO0FBQ0gsQ0EzTEQ7O0FBNkxBLElBQUksaUJBQWlCLFNBQWpCLGNBQWlCLENBQVMsVUFBVCxFQUFxQixHQUFyQixFQUEwQixHQUExQixFQUErQjtBQUNoRCxRQUFJLE1BQU0sRUFBRSxTQUFGLENBQVksVUFBWixDQUFWOzs7QUFHQSxRQUFJLENBQUMsV0FBVyxHQUFYLENBQUwsRUFBc0I7QUFDbEIsZUFBTyxLQUFQLGtDQUE0QyxHQUE1QztBQUNIOztBQUVELFNBQUssSUFBSSxPQUFULElBQW9CLEdBQXBCLEVBQXlCO0FBQ3JCLFlBQUksUUFBUSxJQUFJLE9BQUosQ0FBWjtBQUNBLFlBQUksV0FBVyxRQUFRLEtBQVIsQ0FBYyxHQUFkLENBQWY7O0FBRUEsZ0JBQVEsR0FBUixFQUFhLFFBQWIsRUFBdUIsS0FBdkIsRUFBOEIsR0FBOUI7Ozs7Ozs7O0FBUUg7O0FBRUQsV0FBTyxHQUFQO0FBQ0gsQ0F2QkQ7O0FBeUJBLElBQUksVUFBVSxTQUFWLE9BQVUsQ0FBUyxRQUFULEVBQW1CLFFBQW5CLEVBQTZCLEtBQTdCLEVBQW9DLEdBQXBDLEVBQW9EO0FBQUEsUUFBWCxLQUFXLHlEQUFILENBQUc7O0FBQzlELFNBQUssSUFBSSxJQUFJLEtBQWIsRUFBb0IsSUFBSSxTQUFTLE1BQWpDLEVBQXlDLEdBQXpDLEVBQThDO0FBQzFDLFlBQUksT0FBTyxTQUFTLENBQVQsQ0FBWDtBQUNBLFlBQUksWUFBWSxXQUFXLElBQVgsQ0FBZ0IsSUFBaEIsQ0FBaEI7QUFDQSxZQUFJLFNBQVMsU0FBUyxJQUFULENBQWI7O0FBRUEsWUFBSSxTQUFTLEVBQUUsS0FBRixDQUFRLFdBQVcsa0JBQW5CLEVBQXVDLEdBQXZDLElBQThDLEtBQTlDLEdBQXNELElBQW5FO0FBQ0EsWUFBSSxDQUFDLE1BQUQsS0FBWSxDQUFDLEVBQUUsUUFBRixDQUFXLFFBQVgsQ0FBRCxJQUF5QixFQUFFLEtBQUYsQ0FBUSxNQUFSLENBQXJDLENBQUosRUFBMkQ7QUFDdkQsbUJBQU8sS0FBUCxvQkFBNkIsSUFBN0IsNEJBQXNELEtBQUssU0FBTCxDQUFlLFFBQWYsQ0FBdEQ7QUFDSDs7QUFFRCxZQUFJLEVBQUUsT0FBRixDQUFVLFFBQVYsQ0FBSixFQUF5Qjs7QUFFckIsZ0JBQUksUUFBUSxTQUFaLEVBQXVCLE9BQU8sSUFBUDs7O0FBR3ZCLGdCQUFJLFNBQUosRUFBZTtBQUNYLHVCQUFPLEVBQUUsUUFBRixDQUFXLElBQVgsQ0FBUDtBQUNILGFBRkQsTUFFTztBQUNILHVCQUFPLEtBQVAsa0JBQTJCLElBQTNCO0FBQ0g7OztBQUdELG1CQUFPLFNBQVMsTUFBVCxHQUFrQixJQUF6QixFQUErQjtBQUMzQix5QkFBUyxJQUFULENBQWMsSUFBZDtBQUNIO0FBQ0o7O0FBRUQsWUFBSSxJQUFJLFNBQVMsTUFBVCxHQUFrQixDQUExQixFQUE2QjtBQUN6QixnQkFBSSxFQUFFLEtBQUYsQ0FBUSxNQUFSLENBQUosRUFBcUI7O0FBRWpCLG9CQUFJLEVBQUUsUUFBRixDQUFXLEVBQUUsUUFBRixDQUFXLFNBQVMsSUFBSSxDQUFiLENBQVgsQ0FBWCxDQUFKLEVBQTZDOztBQUN6Qyw2QkFBUyxFQUFUO0FBQ0gsaUJBRkQsTUFFTztBQUNILDZCQUFTLEVBQVQ7QUFDSDtBQUNKOztBQUVELHFCQUFTLElBQVQsSUFBaUIsUUFBUSxNQUFSLEVBQWdCLFFBQWhCLEVBQTBCLEtBQTFCLEVBQWlDLEdBQWpDLEVBQXNDLFFBQVEsQ0FBOUMsQ0FBakI7O0FBRUEsbUJBQU8sUUFBUDtBQUNILFNBYkQsTUFhTztBQUNILHVCQUFXLEdBQVgsRUFBZ0IsUUFBaEIsRUFBMEIsSUFBMUIsRUFBZ0MsS0FBaEM7O0FBRUEsbUJBQU8sUUFBUDtBQUNIO0FBQ0o7QUFDSixDQS9DRDs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnRUEsV0FBVyxTQUFYLENBQXFCLE1BQXJCLEdBQThCLFVBQVUsU0FBVixFQUFxQixPQUFyQixFQUE4QixRQUE5QixFQUF3QztBQUFBOztBQUNsRSxRQUFJLEVBQUUsS0FBRixDQUFRLFNBQVIsQ0FBSixFQUF3QixZQUFZLEVBQVo7O0FBRXhCLFFBQUksRUFBRSxVQUFGLENBQWEsU0FBYixDQUFKLEVBQTZCO0FBQ3pCLG1CQUFXLFNBQVg7QUFDQSxvQkFBWSxFQUFaO0FBQ0g7O0FBRUQsUUFBSSxFQUFFLFVBQUYsQ0FBYSxPQUFiLENBQUosRUFBMkI7QUFDdkIsbUJBQVcsT0FBWDtBQUNBLGtCQUFVLEVBQVY7QUFDSDs7QUFFRCxRQUFJLEVBQUUsS0FBRixDQUFRLE9BQVIsQ0FBSixFQUFzQixVQUFVLEVBQUUsU0FBUyxLQUFYLEVBQVY7OztBQUd0QixRQUFJLE9BQU8sSUFBUCxDQUFZLFNBQVosTUFBMkIsQ0FBM0IsSUFBZ0MsQ0FBQyxRQUFRLE9BQTdDLEVBQXNELE9BQU8sS0FBSyxJQUFMLENBQVUsT0FBVixFQUFtQixRQUFuQixDQUFQOzs7QUFHdEQsUUFBRyxxQkFBcUIsUUFBeEIsRUFBa0M7QUFDOUIsb0JBQVk7QUFDUixpQkFBSztBQURHLFNBQVo7QUFHSDs7QUFFRCxRQUFJLENBQUMsRUFBRSxLQUFGLENBQVEsUUFBUixDQUFELElBQXNCLENBQUMsRUFBRSxVQUFGLENBQWEsUUFBYixDQUEzQixFQUFtRCxPQUFPLEtBQVAsQ0FBYSw2QkFBYjs7QUFFbkQsUUFBSSxTQUFTLEtBQUssSUFBTCxDQUFVLFNBQVYsQ0FBYjs7QUFFQSxRQUFJLE9BQU8sRUFBWDtBQUNBLFdBQU8sT0FBUCxDQUFlLGVBQU87QUFDbEIsWUFBSSxNQUFNLE9BQUssV0FBTCxDQUFpQixJQUFJLEdBQXJCLENBQVY7O0FBRUEsZUFBTyxPQUFLLFdBQUwsQ0FBaUIsSUFBSSxHQUFyQixDQUFQO0FBQ0EsZUFBSyxJQUFMLENBQVUsTUFBVixDQUFpQixHQUFqQixFQUFzQixDQUF0Qjs7QUFFQSxhQUFLLElBQUwsQ0FBVSxHQUFWO0FBQ0gsS0FQRDs7Ozs7Ozs7Ozs7QUFrQkEsU0FBSyxJQUFMLENBQ0ksUUFESixFQUVJO0FBQ0ksb0JBQVksSUFEaEI7QUFFSSxrQkFBVSxTQUZkO0FBR0ksY0FBTTtBQUhWLEtBRko7O0FBU0EsUUFBSSxRQUFKLEVBQWMsU0FBUyxJQUFULEVBQWUsSUFBZjs7QUFFZCxXQUFPLElBQVA7QUFDSCxDQTVERDs7Ozs7OztBQW1FQSxXQUFXLFNBQVgsQ0FBcUIsTUFBckIsR0FBOEIsVUFBVSxTQUFWLEVBQXFCLE9BQXJCLEVBQThCLFFBQTlCLEVBQXdDO0FBQ2xFLFdBQU8sS0FBSyxNQUFMLENBQVksU0FBWixFQUF1QixPQUF2QixFQUFnQyxRQUFoQyxDQUFQO0FBQ0gsQ0FGRDs7Ozs7OztBQVNBLFdBQVcsU0FBWCxDQUFxQixPQUFyQixHQUErQixVQUFVLFNBQVYsRUFBcUIsT0FBckIsRUFBOEIsUUFBOUIsRUFBd0M7QUFDbkUsV0FBTyxLQUFLLE1BQUwsQ0FBWSxTQUFaLEVBQXVCLE9BQXZCLEVBQWdDLFFBQWhDLENBQVA7QUFDSCxDQUZEOzs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBLFdBQVcsU0FBWCxDQUFxQixJQUFyQixHQUE0QixVQUFTLE9BQVQsRUFBa0IsUUFBbEIsRUFBNEI7QUFDcEQsUUFBSSxFQUFFLEtBQUYsQ0FBUSxPQUFSLENBQUosRUFBc0IsVUFBVSxFQUFWOztBQUV0QixRQUFJLEVBQUUsVUFBRixDQUFhLE9BQWIsQ0FBSixFQUEyQjtBQUN2QixtQkFBVyxPQUFYO0FBQ0Esa0JBQVUsRUFBVjtBQUNIOztBQUVELFFBQUksQ0FBQyxFQUFFLEtBQUYsQ0FBUSxRQUFSLENBQUQsSUFBc0IsQ0FBQyxFQUFFLFVBQUYsQ0FBYSxRQUFiLENBQTNCLEVBQW1ELE9BQU8sS0FBUCxDQUFhLDZCQUFiOztBQUVuRCxTQUFLLFdBQUwsR0FBbUIsRUFBbkI7QUFDQSxTQUFLLElBQUwsR0FBWSxFQUFaOztBQUVBLFFBQUksUUFBUSxXQUFaLEVBQXlCLENBQUUsQzs7QUFFM0IsU0FBSyxJQUFMLENBQ0ksZ0JBREosRUFFSTtBQUNJLG9CQUFZLElBRGhCO0FBRUksaUJBQVMsQ0FBQyxDQUFDLFFBQVE7QUFGdkIsS0FGSjs7QUFRQSxRQUFJLFFBQUosRUFBYyxTQUFTLElBQVQsRUFBZSxJQUFmOztBQUVkLFdBQU8sSUFBUDtBQUNILENBMUJEOzs7Ozs7Ozs7Ozs7Ozs7O0FBMENBLFdBQVcsU0FBWCxDQUFxQixJQUFyQixHQUE0QixVQUFTLEdBQVQsRUFBYyxPQUFkLEVBQXVCLFFBQXZCLEVBQWlDO0FBQ3pELFFBQUksRUFBRSxLQUFGLENBQVEsR0FBUixLQUFnQixFQUFFLFVBQUYsQ0FBYSxHQUFiLENBQXBCLEVBQXVDLE9BQU8sS0FBUCxDQUFhLDBCQUFiOztBQUV2QyxRQUFJLEVBQUUsVUFBRixDQUFhLE9BQWIsQ0FBSixFQUEyQjtBQUN2QixtQkFBVyxPQUFYO0FBQ0Esa0JBQVUsRUFBVjtBQUNIOztBQUVELFFBQUksRUFBRSxLQUFGLENBQVEsR0FBUixFQUFhLEtBQWIsQ0FBSixFQUF5QjtBQUNyQixnQkFBUSxNQUFSLEdBQWlCLElBQWpCOztBQUVBLGVBQU8sS0FBSyxNQUFMLENBQ0gsRUFBRSxLQUFLLElBQUksR0FBWCxFQURHLEVBRUgsR0FGRyxFQUdILE9BSEcsRUFJSCxRQUpHLENBQVA7QUFNSCxLQVRELE1BU087QUFDSCxlQUFPLEtBQUssTUFBTCxDQUFZLEdBQVosRUFBaUIsT0FBakIsRUFBMEIsUUFBMUIsQ0FBUDtBQUNIO0FBQ0osQ0FwQkQ7Ozs7O0FBeUJBLFdBQVcsU0FBWCxDQUFxQixXQUFyQixHQUFtQyxZQUFXOztBQUUxQyxXQUFPLEtBQVAsQ0FBYSxnREFBYjtBQUNILENBSEQ7Ozs7Ozs7O0FBV0EsV0FBVyxTQUFYLENBQXFCLE1BQXJCLEdBQThCLFVBQVUsUUFBVixFQUFvQixRQUFwQixFQUE4QjtBQUN4RCxRQUFJLEVBQUUsVUFBRixDQUFhLFFBQWIsQ0FBSixFQUE0QjtBQUN4QixtQkFBVyxRQUFYO0FBQ0EsbUJBQVcsSUFBSSxRQUFKLEdBQWUsUUFBZixFQUFYO0FBQ0g7O0FBRUQsUUFBSSxDQUFDLEVBQUUsS0FBRixDQUFRLFFBQVIsQ0FBRCxJQUFzQixDQUFDLEVBQUUsVUFBRixDQUFhLFFBQWIsQ0FBM0IsRUFBbUQsT0FBTyxLQUFQLENBQWEsNkJBQWI7O0FBRW5ELFNBQUssU0FBTCxDQUFlLFFBQWYsSUFBMkIsRUFBRSxTQUFGLENBQVksS0FBSyxJQUFqQixDQUEzQjtBQUNBLFNBQUssSUFBTCxDQUNJLFVBREosRUFFSTtBQUNJLG9CQUFZLElBRGhCO0FBRUksa0JBQVUsUUFGZDtBQUdJLG1CQUFXLEtBQUssU0FBTCxDQUFlLFFBQWY7QUFIZixLQUZKOztBQVNBLFFBQUksU0FBUztBQUNULGtCQUFVLFFBREQ7QUFFVCxtQkFBVyxLQUFLLFNBQUwsQ0FBZSxRQUFmO0FBRkYsS0FBYjs7QUFLQSxRQUFJLFFBQUosRUFBYyxTQUFTLElBQVQsRUFBZSxNQUFmOztBQUVkLFdBQU8sTUFBUDtBQUNILENBMUJEOzs7Ozs7QUFnQ0EsV0FBVyxTQUFYLENBQXFCLE9BQXJCLEdBQStCLFVBQVUsUUFBVixFQUFvQjtBQUMvQyxRQUFJLENBQUMsRUFBRSxLQUFGLENBQVEsUUFBUixDQUFELElBQXNCLENBQUMsRUFBRSxVQUFGLENBQWEsUUFBYixDQUEzQixFQUFtRCxPQUFPLEtBQVAsQ0FBYSw2QkFBYjs7QUFFbkQsUUFBSSxVQUFVLEVBQWQ7O0FBRUEsU0FBSyxJQUFJLEVBQVQsSUFBZSxLQUFLLFNBQXBCLEVBQStCO0FBQzNCLGdCQUFRLElBQVIsQ0FBYSxFQUFDLElBQUksRUFBTCxFQUFTLFdBQVcsS0FBSyxTQUFMLENBQWUsRUFBZixDQUFwQixFQUFiO0FBQ0g7O0FBRUQsUUFBSSxRQUFKLEVBQWMsU0FBUyxJQUFULEVBQWUsT0FBZjs7QUFFZCxXQUFPLE9BQVA7QUFDSCxDQVpEOzs7Ozs7QUFrQkEsV0FBVyxTQUFYLENBQXFCLFlBQXJCLEdBQW9DLFVBQVUsUUFBVixFQUFvQixRQUFwQixFQUE4QjtBQUM5RCxRQUFJLEVBQUUsVUFBRixDQUFhLFFBQWIsQ0FBSixFQUE0QjtBQUN4QixtQkFBVyxRQUFYO0FBQ0EsbUJBQVcsSUFBWDtBQUNIOztBQUVELFFBQUksQ0FBQyxFQUFFLEtBQUYsQ0FBUSxRQUFSLENBQUQsSUFBc0IsQ0FBQyxFQUFFLFVBQUYsQ0FBYSxRQUFiLENBQTNCLEVBQW1ELE9BQU8sS0FBUCxDQUFhLDZCQUFiOztBQUVuRCxRQUFJLFNBQVMsS0FBYjs7QUFFQSxRQUFJLFFBQUosRUFBYztBQUNWLGVBQU8sS0FBSyxTQUFMLENBQWUsRUFBRSxRQUFGLENBQVcsUUFBWCxDQUFmLENBQVA7O0FBRUEsaUJBQVMsUUFBVDtBQUNILEtBSkQsTUFJTztBQUNILGFBQUssU0FBTCxHQUFpQixFQUFqQjs7QUFFQSxpQkFBUyxJQUFUO0FBQ0g7O0FBRUQsUUFBSSxRQUFKLEVBQWMsU0FBUyxJQUFULEVBQWUsTUFBZjs7QUFFZCxXQUFPLE1BQVA7QUFDSCxDQXZCRDs7Ozs7O0FBOEJBLFdBQVcsU0FBWCxDQUFxQixPQUFyQixHQUErQixVQUFVLFFBQVYsRUFBb0IsUUFBcEIsRUFBOEI7QUFDekQsUUFBSSxFQUFFLFVBQUYsQ0FBYSxRQUFiLENBQUosRUFBNEI7QUFDeEIsbUJBQVcsUUFBWDtBQUNBLG1CQUFXLElBQVg7QUFDSDs7QUFFRCxRQUFJLENBQUMsRUFBRSxLQUFGLENBQVEsUUFBUixDQUFELElBQXNCLENBQUMsRUFBRSxVQUFGLENBQWEsUUFBYixDQUEzQixFQUFtRCxPQUFPLEtBQVAsQ0FBYSw2QkFBYjs7QUFFbkQsUUFBSSxnQkFBZ0IsT0FBTyxJQUFQLENBQVksS0FBSyxTQUFqQixDQUFwQjtBQUNBLFFBQUksYUFBYSxJQUFqQjs7QUFFQSxRQUFJLGtCQUFrQixDQUF0QixFQUF5QjtBQUNyQixlQUFPLEtBQVAsQ0FBYSx1QkFBYjtBQUNILEtBRkQsTUFFTztBQUNILFlBQUksQ0FBQyxRQUFMLEVBQWU7QUFDWCxnQkFBSSxrQkFBa0IsQ0FBdEIsRUFBeUI7QUFDckIsdUJBQU8sSUFBUCxDQUFZLGlEQUFaOzs7QUFHQSxxQkFBSyxJQUFJLEdBQVQsSUFBZ0IsS0FBSyxTQUFyQjtBQUFnQywrQkFBVyxHQUFYO0FBQWhDO0FBQ0gsYUFMRCxNQUtPO0FBQ0gsdUJBQU8sS0FBUCxDQUFhLHdEQUFiO0FBQ0g7QUFDSjtBQUNKOztBQUVELGlCQUFhLEtBQUssU0FBTCxDQUFlLFFBQWYsQ0FBYjs7QUFFQSxRQUFJLENBQUMsVUFBTCxFQUFpQjtBQUNiLGVBQU8sS0FBUCx5QkFBbUMsUUFBbkM7QUFDSDs7QUFFRCxTQUFLLElBQUwsR0FBWSxVQUFaO0FBQ0EsU0FBSyxJQUFMLENBQ0ksU0FESixFQUVJO0FBQ0ksb0JBQVksSUFEaEI7QUFFSSxrQkFBVTtBQUZkLEtBRko7O0FBUUEsUUFBSSxRQUFKLEVBQWMsU0FBUyxJQUFUOztBQUVkLFdBQU8sSUFBUDtBQUNILENBNUNEOzs7Ozs7Ozs7Ozs7OztBQTBEQSxXQUFXLFNBQVgsQ0FBcUIsU0FBckIsR0FBaUMsVUFBUyxRQUFULEVBQW9EO0FBQUEsUUFBakMsT0FBaUMseURBQXZCLEVBQUUsWUFBWSxLQUFkLEVBQXVCOztBQUNqRixRQUFJLEVBQUUsS0FBRixDQUFRLFFBQVIsS0FBcUIsQ0FBQyxFQUFFLE9BQUYsQ0FBVSxRQUFWLENBQTFCLEVBQStDLE9BQU8sS0FBUCxDQUFhLHVDQUFiOztBQUUvQyxRQUFJLGNBQWMsSUFBSSxXQUFKLENBQWdCLFFBQWhCLENBQWxCOztBQUVBLFNBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxTQUFTLE1BQTdCLEVBQXFDLEdBQXJDLEVBQTBDO0FBQ3RDLFlBQUksUUFBUSxTQUFTLENBQVQsQ0FBWjs7QUFFQSxhQUFLLElBQUksR0FBVCxJQUFnQixLQUFoQixFQUF1QjtBQUNuQixnQkFBSSxJQUFJLE1BQUosQ0FBVyxDQUFYLEVBQWMsQ0FBZCxNQUFxQixHQUF6QixFQUE4QixPQUFPLEtBQVAsQ0FBYSx5Q0FBYjs7QUFFOUIsZ0JBQUksQ0FBQyxZQUFZLFVBQVosQ0FBdUIsR0FBdkIsQ0FBTCxFQUFrQyxPQUFPLEtBQVAsc0JBQStCLEdBQS9COztBQUVsQztBQUNIO0FBQ0o7O0FBRUQsUUFBSSxTQUFTLFlBQVksU0FBWixDQUFzQixJQUF0QixDQUFiOztBQUVBLFdBQU8sTUFBUCxDO0FBQ0gsQ0FwQkQ7Ozs7O0FBeUJBLFdBQVcsa0JBQVgsR0FBZ0M7QUFDNUIsWUFBUSxJQURvQjtBQUU1QixVQUFNLElBRnNCO0FBRzVCLGFBQVMsSUFIbUI7QUFJNUIsV0FBTyxJQUpxQjtBQUs1QixjQUFVO0FBTGtCLENBQWhDOzs7OztBQVdBLElBQUksYUFBYTtBQUNiLFVBQU0sY0FBVSxNQUFWLEVBQWtCLEtBQWxCLEVBQXlCLEdBQXpCLEVBQThCO0FBQ2hDLFlBQUksQ0FBQyxFQUFFLFFBQUYsQ0FBVyxHQUFYLENBQUwsRUFBc0I7QUFDbEIsbUJBQU8sS0FBUCxDQUFhLHdDQUFiO0FBQ0g7O0FBRUQsWUFBSSxTQUFTLE1BQWIsRUFBcUI7QUFDakIsZ0JBQUksQ0FBQyxFQUFFLFFBQUYsQ0FBVyxPQUFPLEtBQVAsQ0FBWCxDQUFMLEVBQWdDO0FBQzVCLHVCQUFPLEtBQVAsQ0FBYSwwQ0FBYjtBQUNIOztBQUVELG1CQUFPLEtBQVAsS0FBaUIsR0FBakI7QUFDSCxTQU5ELE1BTU87QUFDSCxtQkFBTyxLQUFQLElBQWdCLEdBQWhCO0FBQ0g7QUFDSixLQWZZOztBQWlCYixVQUFNLGNBQVUsTUFBVixFQUFrQixLQUFsQixFQUF5QixHQUF6QixFQUE4QjtBQUNoQyxlQUFPLEtBQVAsSUFBZ0IsRUFBRSxTQUFGLENBQVksR0FBWixDQUFoQjtBQUNILEtBbkJZOztBQXFCYixZQUFRLGdCQUFVLE1BQVYsRUFBa0IsS0FBbEIsRUFBeUIsR0FBekIsRUFBOEI7QUFDbEMsWUFBSSxDQUFDLEVBQUUsS0FBRixDQUFRLE1BQVIsQ0FBTCxFQUFzQjtBQUNsQixnQkFBSSxFQUFFLE9BQUYsQ0FBVSxNQUFWLENBQUosRUFBdUI7QUFDbkIsb0JBQUksU0FBUyxNQUFiLEVBQXFCO0FBQ2pCLDJCQUFPLEtBQVAsSUFBZ0IsSUFBaEI7QUFDSDtBQUNKLGFBSkQsTUFJTztBQUNILHVCQUFPLE9BQU8sS0FBUCxDQUFQO0FBQ0g7QUFDSjtBQUNKLEtBL0JZOztBQWlDYixXQUFPLGVBQVUsTUFBVixFQUFrQixLQUFsQixFQUF5QixHQUF6QixFQUE4QjtBQUNqQyxZQUFJLElBQUksT0FBTyxLQUFQLENBQVI7O0FBRUEsWUFBSSxFQUFFLEtBQUYsQ0FBUSxDQUFSLENBQUosRUFBZ0I7QUFDWixtQkFBTyxLQUFQLElBQWdCLENBQUMsR0FBRCxDQUFoQjtBQUNILFNBRkQsTUFFTyxJQUFJLENBQUMsRUFBRSxPQUFGLENBQVUsQ0FBVixDQUFMLEVBQW1CO0FBQ3RCLG1CQUFPLEtBQVAsQ0FBYSwwQ0FBYjtBQUNILFNBRk0sTUFFQTtBQUNILGNBQUUsSUFBRixDQUFPLEVBQUUsU0FBRixDQUFZLEdBQVosQ0FBUDtBQUNIO0FBQ0osS0EzQ1k7O0FBNkNiLGNBQVUsa0JBQVUsTUFBVixFQUFrQixLQUFsQixFQUF5QixHQUF6QixFQUE4QjtBQUNwQyxZQUFJLElBQUksT0FBTyxLQUFQLENBQVI7O0FBRUEsWUFBSSxFQUFFLEtBQUYsQ0FBUSxDQUFSLENBQUosRUFBZ0I7QUFDWixtQkFBTyxLQUFQLElBQWdCLEdBQWhCO0FBQ0gsU0FGRCxNQUVPLElBQUksQ0FBQyxFQUFFLE9BQUYsQ0FBVSxDQUFWLENBQUwsRUFBbUI7QUFDdEIsbUJBQU8sS0FBUCxDQUFhLG1EQUFiO0FBQ0gsU0FGTSxNQUVBO0FBQ0gsaUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxJQUFJLE1BQXhCLEVBQWdDLEdBQWhDLEVBQXFDO0FBQ2pDLGtCQUFFLElBQUYsQ0FBTyxJQUFJLENBQUosQ0FBUDtBQUNIO0FBQ0o7QUFDSixLQXpEWTs7QUEyRGIsZUFBVyxtQkFBVSxNQUFWLEVBQWtCLEtBQWxCLEVBQXlCLEdBQXpCLEVBQThCO0FBQ3JDLFlBQUksSUFBSSxPQUFPLEtBQVAsQ0FBUjs7QUFFQSxZQUFJLEVBQUUsS0FBRixDQUFRLENBQVIsQ0FBSixFQUFnQjtBQUNaLG1CQUFPLEtBQVAsSUFBZ0IsQ0FBQyxHQUFELENBQWhCO0FBQ0gsU0FGRCxNQUVPLElBQUksQ0FBQyxFQUFFLE9BQUYsQ0FBVSxDQUFWLENBQUwsRUFBbUI7QUFDdEIsbUJBQU8sS0FBUCxDQUFhLDhDQUFiO0FBQ0gsU0FGTSxNQUVBO0FBQ0gsZ0JBQUksU0FBUyxLQUFiO0FBQ0EsZ0JBQUksRUFBRSxhQUFGLENBQWdCLEdBQWhCLENBQUosRUFBMEI7QUFDdEIscUJBQUssSUFBSSxDQUFULElBQWMsR0FBZCxFQUFtQjtBQUNmLHdCQUFJLE1BQU0sT0FBVixFQUFtQjtBQUNmLGlDQUFTLElBQVQ7QUFDSDs7QUFFRDtBQUNIO0FBQ0o7O0FBRUQsZ0JBQUksU0FBUyxTQUFTLElBQUksT0FBSixDQUFULEdBQXdCLENBQUMsR0FBRCxDQUFyQztBQUNBLGNBQUUsT0FBRixDQUFVLE1BQVYsRUFBa0IsVUFBVSxLQUFWLEVBQWlCO0FBQy9CLHFCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksRUFBRSxNQUF0QixFQUE4QixHQUE5QixFQUFtQztBQUMvQix3QkFBSSxnQkFBZ0IsS0FBaEIsQ0FBc0IsS0FBdEIsRUFBNkIsRUFBRSxDQUFGLENBQTdCLENBQUosRUFBd0M7QUFDM0M7O0FBRUQsa0JBQUUsSUFBRixDQUFPLEtBQVA7QUFDSCxhQU5EO0FBT0g7QUFDSixLQXZGWTs7QUF5RmIsVUFBTSxjQUFVLE1BQVYsRUFBa0IsS0FBbEIsRUFBeUIsR0FBekIsRUFBOEI7QUFDaEMsWUFBSSxFQUFFLEtBQUYsQ0FBUSxNQUFSLEtBQW1CLEVBQUUsS0FBRixDQUFRLE9BQU8sS0FBUCxDQUFSLENBQXZCLEVBQStDOztBQUUvQyxZQUFJLElBQUksT0FBTyxLQUFQLENBQVI7O0FBRUEsWUFBSSxDQUFDLEVBQUUsT0FBRixDQUFVLENBQVYsQ0FBTCxFQUFtQjtBQUNmLG1CQUFPLEtBQVAsQ0FBYSx5Q0FBYjtBQUNILFNBRkQsTUFFTztBQUNILGdCQUFJLEVBQUUsUUFBRixDQUFXLEdBQVgsS0FBbUIsTUFBTSxDQUE3QixFQUFnQztBQUM1QixrQkFBRSxNQUFGLENBQVMsQ0FBVCxFQUFZLENBQVo7QUFDSCxhQUZELE1BRU87QUFDSCxrQkFBRSxHQUFGO0FBQ0g7QUFDSjtBQUNKLEtBdkdZOztBQXlHYixXQUFPLGVBQVUsTUFBVixFQUFrQixLQUFsQixFQUF5QixHQUF6QixFQUE4QjtBQUNqQyxZQUFJLEVBQUUsS0FBRixDQUFRLE1BQVIsS0FBbUIsRUFBRSxLQUFGLENBQVEsT0FBTyxLQUFQLENBQVIsQ0FBdkIsRUFBK0M7O0FBRS9DLFlBQUksSUFBSSxPQUFPLEtBQVAsQ0FBUjs7QUFFQSxZQUFJLENBQUMsRUFBRSxPQUFGLENBQVUsQ0FBVixDQUFMLEVBQW1CO0FBQ2YsbUJBQU8sS0FBUCxDQUFhLGtEQUFiO0FBQ0gsU0FGRCxNQUVPO0FBQ0gsZ0JBQUksTUFBTSxFQUFWOztBQUVBLGdCQUFJLFFBQU8sR0FBUCx5Q0FBTyxHQUFQLE9BQWUsUUFBZixJQUEyQixFQUFFLGVBQWUsS0FBakIsQ0FBL0IsRUFBd0Q7Ozs7Ozs7OztBQVNwRCxvQkFBSSxRQUFRLElBQUksUUFBSixDQUFhO0FBQ3JCLG9DQUFnQjtBQURLLGlCQUFiLENBQVo7QUFHQSxxQkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLEVBQUUsTUFBdEIsRUFBOEIsR0FBOUIsRUFBbUM7QUFDL0Isd0JBQUksUUFBUTtBQUNSLHNDQUFjLEVBQUUsQ0FBRjtBQUROLHFCQUFaO0FBR0Esd0JBQUksQ0FBQyxNQUFNLElBQU4sQ0FBVyxLQUFYLENBQUwsRUFBd0I7QUFDcEIsNEJBQUksSUFBSixDQUFTLEVBQUUsQ0FBRixDQUFUO0FBQ0g7QUFDSjtBQUNKLGFBcEJELE1Bb0JPO0FBQ0gscUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxFQUFFLE1BQXRCLEVBQThCLEdBQTlCLEVBQW1DO0FBQy9CLHdCQUFJLENBQUMsZ0JBQWdCLEtBQWhCLENBQXNCLEVBQUUsQ0FBRixDQUF0QixFQUE0QixHQUE1QixDQUFMLEVBQXVDO0FBQ25DLDRCQUFJLElBQUosQ0FBUyxFQUFFLENBQUYsQ0FBVDtBQUNIO0FBQ0o7QUFDSjs7QUFFRCxtQkFBTyxLQUFQLElBQWdCLEdBQWhCO0FBQ0g7QUFDSixLQWpKWTs7QUFtSmIsY0FBVSxrQkFBVSxNQUFWLEVBQWtCLEtBQWxCLEVBQXlCLEdBQXpCLEVBQThCO0FBQ3BDLFlBQUksRUFBRSxLQUFGLENBQVEsTUFBUixLQUFtQixFQUFFLEtBQUYsQ0FBUSxPQUFPLEtBQVAsQ0FBUixDQUF2QixFQUErQzs7QUFFL0MsWUFBSSxJQUFJLE9BQU8sS0FBUCxDQUFSOztBQUVBLFlBQUksQ0FBQyxFQUFFLEtBQUYsQ0FBUSxDQUFSLENBQUQsSUFBZSxDQUFDLEVBQUUsT0FBRixDQUFVLENBQVYsQ0FBcEIsRUFBa0M7QUFDOUIsbUJBQU8sS0FBUCxDQUFhLG1EQUFiO0FBQ0gsU0FGRCxNQUVPLElBQUksQ0FBQyxFQUFFLEtBQUYsQ0FBUSxDQUFSLENBQUwsRUFBaUI7QUFDcEIsZ0JBQUksTUFBTSxFQUFWOztBQUVBLGlCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksRUFBRSxNQUF0QixFQUE4QixHQUE5QixFQUFtQztBQUMvQixvQkFBSSxVQUFVLEtBQWQ7O0FBRUEscUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxJQUFJLE1BQXhCLEVBQWdDLEdBQWhDLEVBQXFDO0FBQ2pDLHdCQUFJLGdCQUFnQixLQUFoQixDQUFzQixFQUFFLENBQUYsQ0FBdEIsRUFBNEIsSUFBSSxDQUFKLENBQTVCLENBQUosRUFBeUM7QUFDckMsa0NBQVUsSUFBVjs7QUFFQTtBQUNIO0FBQ0o7O0FBRUQsb0JBQUksQ0FBQyxPQUFMLEVBQWM7QUFDVix3QkFBSSxJQUFKLENBQVMsRUFBRSxDQUFGLENBQVQ7QUFDSDtBQUNKOztBQUVELG1CQUFPLEtBQVAsSUFBZ0IsR0FBaEI7QUFDSDtBQUNKLEtBL0tZOztBQWlMYixhQUFTLGlCQUFVLE1BQVYsRUFBa0IsS0FBbEIsRUFBeUIsS0FBekIsRUFBZ0M7QUFDckMsWUFBSSxVQUFVLEtBQWQsRUFBcUI7O0FBRWpCLG1CQUFPLEtBQVAsQ0FBYSxzQ0FBYjtBQUNIOztBQUVELFlBQUksQ0FBQyxFQUFFLFFBQUYsQ0FBVyxLQUFYLENBQUQsSUFBc0IsTUFBTSxJQUFOLE9BQWlCLEVBQTNDLEVBQStDO0FBQzNDLG1CQUFPLEtBQVAsQ0FBYSx5Q0FBYjtBQUNIOztBQUVELGVBQU8sS0FBUCxJQUFnQixPQUFPLEtBQVAsQ0FBaEI7QUFDQSxlQUFPLE9BQU8sS0FBUCxDQUFQO0FBQ0gsS0E3TFk7O0FBK0xiLFVBQU0sY0FBVSxNQUFWLEVBQWtCLEtBQWxCLEVBQXlCLEdBQXpCLEVBQThCOzs7QUFHaEMsZUFBTyxLQUFQLENBQWEsdUJBQWI7QUFDSDtBQW5NWSxDQUFqQjs7Ozs7QUF5TUEsV0FBVyxtQkFBWCxHQUFpQyxVQUFTLGNBQVQsRUFBeUI7QUFDdEQsUUFBSSxDQUFDLEVBQUUsUUFBRixDQUFXLGNBQVgsQ0FBTCxFQUFpQztBQUM3QixlQUFPLEtBQVAsQ0FBYSxrQ0FBYjtBQUNIOztBQUVELFFBQUksQ0FBQyxjQUFELElBQW1CLGVBQWUsT0FBZixDQUF1QixJQUF2QixNQUFpQyxDQUFDLENBQXpELEVBQTREO0FBQ3hELGVBQU8sS0FBUCxDQUFhLGtDQUFiO0FBQ0g7O0FBRUQsUUFBSSxlQUFlLE9BQWYsQ0FBdUIsR0FBdkIsTUFBZ0MsQ0FBQyxDQUFqQyxJQUFzQyxlQUFlLEtBQWYsQ0FBcUIsNEJBQXJCLE1BQXVELElBQWpHLEVBQXVHO0FBQ25HLGVBQU8sS0FBUCxDQUFhLHVDQUFiO0FBQ0g7O0FBRUQsUUFBSSxlQUFlLEtBQWYsQ0FBcUIsV0FBckIsTUFBc0MsSUFBMUMsRUFBZ0Q7QUFDNUMsZUFBTyxLQUFQLENBQWEsNEVBQWI7QUFDSDs7QUFFRCxRQUFJLGVBQWUsS0FBZixDQUFxQixTQUFyQixNQUFvQyxJQUF4QyxFQUE4QztBQUMxQyxlQUFPLEtBQVAsQ0FBYSxpREFBYjtBQUNIO0FBQ0osQ0FwQkQ7Ozs7O0FBeUJBLFdBQVcsU0FBWCxDQUFxQixNQUFyQixHQUE4QixVQUFTLE9BQVQsRUFBa0I7QUFDNUMsUUFBSSxFQUFFLFFBQUYsQ0FBVyxPQUFYLENBQUosRUFBeUI7QUFDckIsWUFBSSxLQUFLLElBQUwsS0FBYyxPQUFsQixFQUEyQjtBQUN2Qix1QkFBVyxtQkFBWCxDQUErQixPQUEvQjs7QUFFQSxnQkFBSSxTQUFTLEtBQUssSUFBTCxDQUFVLEtBQVYsQ0FBZ0IsR0FBaEIsRUFBcUIsTUFBckIsR0FBOEIsQ0FBOUIsR0FBa0MsS0FBSyxJQUFMLENBQVUsS0FBVixDQUFnQixHQUFoQixFQUFxQixDQUFyQixDQUFsQyxHQUE0RCxFQUF6RTs7QUFFQSxpQkFBSyxJQUFMLEdBQVksT0FBWjtBQUNBLGlCQUFLLFFBQUwsR0FBZ0IsU0FBUyxHQUFULEdBQWUsS0FBSyxJQUFwQzs7QUFFQSxtQkFBTyxJQUFQO0FBQ0g7QUFDSixLQVhELE1BV087O0FBRU47QUFDSixDQWZEOztBQWlCQSxPQUFPLE9BQVAsR0FBaUIsVUFBakI7Ozs7Ozs7Ozs7O0FBV0EsT0FBTyxJQUFQLEdBQWMsVUFBUyxHQUFULEVBQWM7QUFDeEIsUUFBSSxPQUFPLENBQVg7UUFDSSxHQURKOztBQUdBLFNBQUssR0FBTCxJQUFZLEdBQVosRUFBaUI7QUFDYixZQUFJLElBQUksY0FBSixDQUFtQixHQUFuQixDQUFKLEVBQTZCO0FBQ3pCO0FBQ0g7QUFDSjs7QUFFRCxXQUFPLElBQVA7QUFDSCxDQVhEOztBQWFBLElBQUksb0JBQW9CLFNBQXBCLGlCQUFvQixDQUFTLE1BQVQsRUFBaUI7O0FBRXJDLFFBQUksRUFBRSxLQUFGLENBQVEsT0FBTyxTQUFmLENBQUosRUFBK0IsT0FBTyxTQUFQLEdBQW1CLEVBQW5COztBQUUvQixRQUFJLEVBQUUsS0FBRixDQUFRLE9BQU8sU0FBZixDQUFKLEVBQStCLE9BQU8sU0FBUCxHQUFtQixFQUFuQjs7QUFFL0IsUUFBSSxFQUFFLEtBQUYsQ0FBUSxPQUFPLE1BQWYsQ0FBSixFQUE0QixPQUFPLE1BQVAsR0FBZ0IsRUFBaEI7O0FBRTVCLFFBQUksRUFBRSxLQUFGLENBQVEsT0FBTyxPQUFmLENBQUosRUFBNkI7QUFDekIsZUFBTyxPQUFQLEdBQWlCO0FBQ2Isa0JBQU0sQ0FETztBQUViLG1CQUFPLEU7QUFGTSxTQUFqQjtBQUlIOzs7QUFHRCxRQUFJLEVBQUUsVUFBRixDQUFhLE9BQU8sU0FBcEIsQ0FBSixFQUFvQztBQUNoQyxlQUFPLFFBQVAsR0FBa0IsT0FBTyxTQUF6QjtBQUNBLGVBQU8sU0FBUCxHQUFtQixFQUFuQjtBQUNIOzs7QUFHRCxRQUFJLEVBQUUsVUFBRixDQUFhLE9BQU8sTUFBcEIsQ0FBSixFQUFpQztBQUM3QixlQUFPLFFBQVAsR0FBa0IsT0FBTyxNQUF6QjtBQUNBLGVBQU8sTUFBUCxHQUFnQixFQUFoQjtBQUNIOzs7QUFHRCxRQUFJLEVBQUUsVUFBRixDQUFhLE9BQU8sT0FBcEIsQ0FBSixFQUFrQztBQUM5QixlQUFPLFFBQVAsR0FBa0IsT0FBTyxPQUF6QjtBQUNBLGVBQU8sT0FBUCxHQUFpQixFQUFqQjtBQUNIOzs7QUFHRCxRQUFJLE9BQU8sU0FBUCxZQUE0QixRQUFoQyxFQUEwQztBQUN0QyxlQUFPLFNBQVAsR0FBbUI7QUFDZixpQkFBSyxPQUFPO0FBREcsU0FBbkI7QUFHSDs7QUFFRCxRQUFJLENBQUMsRUFBRSxLQUFGLENBQVEsT0FBTyxRQUFmLENBQUQsSUFBNkIsQ0FBQyxFQUFFLFVBQUYsQ0FBYSxPQUFPLFFBQXBCLENBQWxDLEVBQWlFO0FBQzdELGVBQU8sS0FBUCxDQUFhLDZCQUFiO0FBQ0g7O0FBRUQsUUFBSSxPQUFPLE9BQVAsQ0FBZSxNQUFuQixFQUEyQjtBQUN2QixZQUFJLEVBQUUsS0FBRixDQUFRLE9BQU8sTUFBZixLQUEwQixPQUFPLE1BQVAsQ0FBYyxNQUFkLEtBQXlCLENBQXZELEVBQTBEO0FBQ3RELG1CQUFPLE1BQVAsR0FBZ0IsT0FBTyxPQUFQLENBQWUsTUFBL0I7QUFDSCxTQUZELE1BRU87QUFDSCxtQkFBTyxJQUFQLENBQVksb0RBQVo7QUFDSDtBQUNKOztBQUVELFdBQU8sTUFBUDtBQUNILENBckREIiwiZmlsZSI6IkNvbGxlY3Rpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIENvbGxlY3Rpb24uanMgLSBiYXNlZCBvbiBNb25nbG8jQ29sbGVjdGlvbiAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlZFxuICovXG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKFwianN3LWxvZ2dlclwiKSxcbiAgICBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi91dGlscy9FdmVudEVtaXR0ZXJcIiksXG4gICAgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIiksXG4gICAgQWdncmVnYXRpb24gPSByZXF1aXJlKFwiLi9BZ2dyZWdhdGlvblwiKSxcbiAgICBDdXJzb3IgPSByZXF1aXJlKFwiLi9DdXJzb3JcIiksXG4gICAgT2JqZWN0SWQgPSByZXF1aXJlKCcuL09iamVjdElkJyksXG4gICAgU2VsZWN0b3IgPSByZXF1aXJlKFwiLi9TZWxlY3RvclwiKSxcbiAgICBTZWxlY3Rvck1hdGNoZXIgPSByZXF1aXJlKFwiLi9TZWxlY3Rvck1hdGNoZXJcIik7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcbiAgICBcbi8qKlxuICogQ29sbGVjdGlvblxuICogXG4gKiBAbW9kdWxlIENvbGxlY3Rpb25cbiAqIEBjb25zdHJ1Y3RvclxuICogQHNpbmNlIDAuMC4xXG4gKiBcbiAqIEBjbGFzc2Rlc2MgQ29sbGVjdGlvbiBjbGFzcyB0aGF0IG1hcHMgYSBNb25nb0RCLWxpa2UgY29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0ge01vbmdvUG9ydGFibGV9IGRiIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIERhdGFiYXNlIG9iamVjdFxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMucGtGYWN0b3J5PW51bGxdIC0gT2JqZWN0IG92ZXJyaWRpbmcgdGhlIGJhc2ljIFwiT2JqZWN0SWRcIiBwcmltYXJ5IGtleSBnZW5lcmF0aW9uLlxuICogXG4gKi9cbnZhciBkYXRhYmFzZSA9IG51bGw7XG5jbGFzcyBDb2xsZWN0aW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbi8vIHZhciBDb2xsZWN0aW9uID0gZnVuY3Rpb24oZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKSB7XG4gICAgY29uc3RydWN0b3IoZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQ29sbGVjdGlvbikpIHJldHVybiBuZXcgQ29sbGVjdGlvbihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgIFxuICAgICAgICBpZiAoXy5pc05pbChkYikpIGxvZ2dlci50aHJvdyhcImRiIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGNvbGxlY3Rpb25OYW1lKSkgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbk5hbWUgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwob3B0aW9ucykgfHwgIV8uaXNQbGFpbk9iamVjdChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBcbiAgICAgICAgLy8gdGhpcy5kYiA9IGRiO1xuICAgICAgICBkYXRhYmFzZSA9IGRiO1xuICAgICAgICB0aGlzLm5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICAgICAgdGhpcy5kYXRhYmFzZU5hbWUgPSBkYi5kYXRhYmFzZU5hbWU7XG4gICAgICAgIHRoaXMuZnVsbE5hbWUgPSB0aGlzLmRhdGFiYXNlTmFtZSArICcuJyArIHRoaXMubmFtZTtcbiAgICAgICAgdGhpcy5kb2NzID0gW107XG4gICAgICAgIHRoaXMuZG9jX2luZGV4ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5zbmFwc2hvdHMgPSBbXTtcbiAgICAgICAgdGhpcy5vcHRzID0ge307IC8vIERlZmF1bHQgb3B0aW9uc1xuICAgICAgICBcbiAgICAgICAgXy5tZXJnZSh0aGlzLm9wdHMsIG9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGhpcy5lbWl0ID0gZGIuZW1pdDtcbiAgICB9XG4gICAgXG4gICAgZW1pdChuYW1lLCBhcmdzLCBjYikge1xuICAgICAgICBzdXBlci5lbWl0KG5hbWUsIGFyZ3MsIGNiLCBkYXRhYmFzZS5fc3RvcmVzKTtcbiAgICB9XG59XG5cbi8vIFRPRE8gZW5mb3JjZSBydWxlIHRoYXQgZmllbGQgbmFtZXMgY2FuJ3Qgc3RhcnQgd2l0aCAnJCcgb3IgY29udGFpbiAnLidcbi8vIChyZWFsIG1vbmdvZGIgZG9lcyBpbiBmYWN0IGVuZm9yY2UgdGhpcylcbi8vIFRPRE8gcG9zc2libHkgZW5mb3JjZSB0aGF0ICd1bmRlZmluZWQnIGRvZXMgbm90IGFwcGVhciAod2UgYXNzdW1lXG4vLyB0aGlzIGluIG91ciBoYW5kbGluZyBvZiBudWxsIGFuZCAkZXhpc3RzKVxuLyoqXG4gKiBJbnNlcnRzIGEgZG9jdW1lbnQgaW50byB0aGUgY29sbGVjdGlvblxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jaW5zZXJ0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBEb2N1bWVudCB0byBiZSBpbnNlcnRlZFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNoYWluPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fENvbGxlY3Rpb259IElmIFwib3B0aW9ucy5jaGFpblwiIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBpbnNlcnRlZCBkb2N1bWVudFxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoZG9jLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGRvYykpIGxvZ2dlci50aHJvdyhcImRvYyBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgXG4gICAgaWYgKCFfLmlzUGxhaW5PYmplY3QoZG9jKSkgbG9nZ2VyLnRocm93KFwiZG9jIG11c3QgYmUgYW4gb2JqZWN0XCIpO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIC8vIENyZWF0aW5nIGEgc2FmZSBjb3B5IG9mIHRoZSBkb2N1bWVudFxuICAgIHZhciBfZG9jID0gXy5jbG9uZURlZXAoZG9jKTtcblxuICAgIC8vIElmIHRoZSBkb2N1bWVudCBjb21lcyB3aXRoIGEgbnVtYmVyIElELCBwYXJzZSBpdCB0byBTdHJpbmdcbiAgICBpZiAoXy5pc051bWJlcihfZG9jLl9pZCkpIHtcbiAgICAgICAgX2RvYy5faWQgPSBfLnRvU3RyaW5nKF9kb2MuX2lkKTtcbiAgICB9XG5cbiAgICBpZiAoXy5pc05pbChfZG9jLl9pZCkgfHwgKCFfZG9jLl9pZCBpbnN0YW5jZW9mIE9iamVjdElkICYmICghXy5pc1N0cmluZyhfZG9jLl9pZCkgfHwgIV9kb2MuX2lkLmxlbmd0aCkpKSB7XG4gICAgICAgIF9kb2MuX2lkID0gbmV3IE9iamVjdElkKCk7XG4gICAgfVxuXG4gICAgLy8gQWRkIG9wdGlvbnMgdG8gbW9yZSBkYXRlc1xuICAgIF9kb2MudGltZXN0YW1wID0gbmV3IE9iamVjdElkKCkuZ2VuZXJhdGlvblRpbWU7XG4gICAgXG4gICAgLy8gUmV2ZXJzZVxuICAgIHRoaXMuZG9jX2luZGV4ZXNbXy50b1N0cmluZyhfZG9jLl9pZCldID0gdGhpcy5kb2NzLmxlbmd0aDtcbiAgICB0aGlzLmRvY3MucHVzaChfZG9jKTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBcImluc2VydFwiIGV2ZW50LlxuICAgICAqXG4gICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+aW5zZXJ0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgZG9jdW1lbnQgaW5zZXJ0ZWRcbiAgICAgKi9cbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdpbnNlcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgZG9jOiBfZG9jXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBfZG9jKTtcblxuICAgIGlmIChvcHRpb25zLmNoYWluKSByZXR1cm4gdGhpcztcbiAgICBcbiAgICByZXR1cm4gX2RvYztcbn07XG5cbi8qKlxuICogSW5zZXJ0cyBzZXZlcmFsIGRvY3VtZW50cyBpbnRvIHRoZSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNidWxrSW5zZXJ0XG4gKiBcbiAqIEBwYXJhbSB7QXJyYXl9IGRvY3MgLSBEb2N1bWVudHMgdG8gYmUgaW5zZXJ0ZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5jaGFpbj1mYWxzZV0gLSBJZiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBzbyBpdCBjYW4gYmUgY2hhaW5lZCB3aXRoIG90aGVyIG1ldGhvZHNcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdHxDb2xsZWN0aW9ufSBJZiBcIm9wdGlvbnMuY2hhaW5cIiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgaW5zZXJ0ZWQgZG9jdW1lbnRcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuYnVsa0luc2VydCA9IGZ1bmN0aW9uIChkb2NzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGRvY3MpKSBsb2dnZXIudGhyb3coXCJkb2NzIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICBcbiAgICBpZiAoIV8uaXNBcnJheShkb2NzKSkgbG9nZ2VyLnRocm93KFwiZG9jcyBtdXN0IGJlIGFuIGFycmF5XCIpO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIHZhciBfZG9jcyA9IFtdO1xuICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZG9jcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgZG9jID0gZG9jc1tpXTtcbiAgICAgICAgXG4gICAgICAgIF9kb2NzLnB1c2godGhpcy5pbnNlcnQoZG9jLCBvcHRpb25zKSk7XG4gICAgfVxuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgX2RvY3MpO1xuXG4gICAgaWYgKG9wdGlvbnMuY2hhaW4pIHJldHVybiB0aGlzO1xuICAgIFxuICAgIHJldHVybiBfZG9jcztcbn07XG5cbi8qKlxuICogRmluZHMgYWxsIG1hdGNoaW5nIGRvY3VtZW50c1xuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZFxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5saW1pdF0gLSBNYXggbnVtYmVyIG9mIGRvY3VtZW50cyB0byBkaXNwbGF5XG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuZm9yY2VGZXRjaD1mYWxzZV0gLSBJZiBzZXQgdG8nXCJ0cnVlXCIgcmV0dXJucyB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzIGFscmVhZHkgZmV0Y2hlZFxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheXxDdXJzb3J9IElmIFwib3B0aW9ucy5mb3JjZUZldGNoXCIgc2V0IHRvIHRydWUgcmV0dXJucyB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzLCBvdGhlcndpc2UgcmV0dXJucyBhIGN1cnNvclxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGxldCBwYXJhbXMgPSBfZW5zdXJlRmluZFBhcmFtcyh7XG4gICAgICAgIHNlbGVjdGlvbjogc2VsZWN0aW9uLCBcbiAgICAgICAgZmllbGRzOiBmaWVsZHMsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnMsIFxuICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICB9KTtcbiAgICBcbiAgICBzZWxlY3Rpb24gPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgIGZpZWxkcyA9IHBhcmFtcy5maWVsZHM7XG4gICAgb3B0aW9ucyA9IHBhcmFtcy5vcHRpb25zO1xuICAgIGNhbGxiYWNrID0gcGFyYW1zLmNhbGxiYWNrO1xuICAgIFxuICAgIHZhciBjdXJzb3IgPSBuZXcgQ3Vyc29yKHRoaXMuZG9jcywgc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMpO1xuXG4gICAgLyoqXG4gICAgICogXCJmaW5kXCIgZXZlbnQuXG4gICAgICpcbiAgICAgKiBAZXZlbnQgTW9uZ29Qb3J0YWJsZX5maW5kXG4gICAgICogXG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzZWxlY3RvciAtIFRoZSBzZWxlY3Rpb24gb2YgdGhlIHF1ZXJ5XG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgc2hvd2VkIGluIHRoZSBxdWVyeVxuICAgICAqL1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2ZpbmQnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgIGZpZWxkczogZmllbGRzXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIC8vIFBhc3MgdGhlIGN1cnNvciBmZXRjaGVkIHRvIHRoZSBjYWxsYmFja1xuICAgIC8vIEFkZCBbb3B0aW9ucy5ub0ZldGNoQ2FsbGJhY2sgPSB0cnVlXVxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgY3Vyc29yLmZldGNoKCkpO1xuXG4gICAgaWYgKG9wdGlvbnMuZm9yY2VGZXRjaCkge1xuICAgICAgICByZXR1cm4gY3Vyc29yLmZldGNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGN1cnNvcjtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudFxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZE9uZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5saW1pdF0gLSBNYXggbnVtYmVyIG9mIGRvY3VtZW50cyB0byBkaXNwbGF5XG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudCBvZiB0aGUgY29sbGVjdGlvblxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5maW5kT25lID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGxldCBwYXJhbXMgPSBfZW5zdXJlRmluZFBhcmFtcyh7XG4gICAgICAgIHNlbGVjdGlvbjogc2VsZWN0aW9uLCBcbiAgICAgICAgZmllbGRzOiBmaWVsZHMsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnMsIFxuICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICB9KTtcbiAgICBcbiAgICBzZWxlY3Rpb24gPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgIGZpZWxkcyA9IHBhcmFtcy5maWVsZHM7XG4gICAgb3B0aW9ucyA9IHBhcmFtcy5vcHRpb25zO1xuICAgIGNhbGxiYWNrID0gcGFyYW1zLmNhbGxiYWNrO1xuICAgIFxuICAgIHZhciBjdXJzb3IgPSBuZXcgQ3Vyc29yKHRoaXMuZG9jcywgc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMpO1xuXG4gICAgLyoqXG4gICAgICogXCJmaW5kT25lXCIgZXZlbnQuXG4gICAgICpcbiAgICAgKiBAZXZlbnQgTW9uZ29Qb3J0YWJsZX5maW5kT25lXG4gICAgICogXG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzZWxlY3RvciAtIFRoZSBzZWxlY3Rpb24gb2YgdGhlIHF1ZXJ5XG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgc2hvd2VkIGluIHRoZSBxdWVyeVxuICAgICAqL1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2ZpbmRPbmUnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgIGZpZWxkczogZmllbGRzXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIHZhciByZXMgPSBudWxsO1xuICAgIFxuICAgIGlmIChjdXJzb3IuaGFzTmV4dCgpKSB7XG4gICAgICAgIHJlcyA9IGN1cnNvci5uZXh0KCk7XG4gICAgfVxuICAgIFxuICAgIC8vIFBhc3MgdGhlIGN1cnNvciBmZXRjaGVkIHRvIHRoZSBjYWxsYmFja1xuICAgIC8vIEFkZCBbb3B0aW9ucy5ub0ZldGNoQ2FsbGJhY2sgPSB0cnVlXVxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICBcbiAgICByZXR1cm4gcmVzO1xufTtcblxuXG4vKipcbiAqIFVwZGF0ZXMgb25lIG9yIG1hbnkgZG9jdW1lbnRzXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiN1cGRhdGVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R9IFt1cGRhdGU9e31dIC0gVGhlIHVwZGF0ZSBvcGVyYXRpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnVwZGF0ZUFzTW9uZ289dHJ1ZV0gLSBCeSBkZWZhdWx0OiBcbiAqICAgICAgSWYgdGhlIFt1cGRhdGVdIG9iamVjdCBjb250YWlucyB1cGRhdGUgb3BlcmF0b3IgbW9kaWZpZXJzLCBzdWNoIGFzIHRob3NlIHVzaW5nIHRoZSBcIiRzZXRcIiBtb2RpZmllciwgdGhlbjpcbiAqICAgICAgICAgIDx1bD5cbiAqICAgICAgICAgICAgICA8bGk+VGhlIFt1cGRhdGVdIG9iamVjdCBtdXN0IGNvbnRhaW4gb25seSB1cGRhdGUgb3BlcmF0b3IgZXhwcmVzc2lvbnM8L2xpPlxuICogICAgICAgICAgICAgIDxsaT5UaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIHVwZGF0ZXMgb25seSB0aGUgY29ycmVzcG9uZGluZyBmaWVsZHMgaW4gdGhlIGRvY3VtZW50PC9saT5cbiAqICAgICAgICAgIDx1bD5cbiAqICAgICAgSWYgdGhlIFt1cGRhdGVdIG9iamVjdCBjb250YWlucyBvbmx5IFwiZmllbGQ6IHZhbHVlXCIgZXhwcmVzc2lvbnMsIHRoZW46XG4gKiAgICAgICAgICA8dWw+XG4gKiAgICAgICAgICAgICAgPGxpPlRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgcmVwbGFjZXMgdGhlIG1hdGNoaW5nIGRvY3VtZW50IHdpdGggdGhlIFt1cGRhdGVdIG9iamVjdC4gVGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCBkb2VzIG5vdCByZXBsYWNlIHRoZSBcIl9pZFwiIHZhbHVlPC9saT5cbiAqICAgICAgICAgICAgICA8bGk+Q29sbGVjdGlvbiN1cGRhdGUgY2Fubm90IHVwZGF0ZSBtdWx0aXBsZSBkb2N1bWVudHM8L2xpPlxuICogICAgICAgICAgPHVsPlxuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMub3ZlcnJpZGU9ZmFsc2VdIC0gUmVwbGFjZXMgdGhlIHdob2xlIGRvY3VtZW50IChvbmx5IGFwbGxpZXMgd2hlbiBbdXBkYXRlQXNNb25nbz1mYWxzZV0pXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudXBzZXJ0PWZhbHNlXSAtIENyZWF0ZXMgYSBuZXcgZG9jdW1lbnQgd2hlbiBubyBkb2N1bWVudCBtYXRjaGVzIHRoZSBxdWVyeSBjcml0ZXJpYVxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm11bHRpPWZhbHNlXSAtIFVwZGF0ZXMgbXVsdGlwbGUgZG9jdW1lbnRzIHRoYXQgbWVldCB0aGUgY3JpdGVyaWFcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHRoZSB1cGRhdGUvaW5zZXJ0IChpZiB1cHNlcnQ9dHJ1ZSkgaW5mb3JtYXRpb25cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgdXBkYXRlLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzTmlsKHVwZGF0ZSkpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHNwZWNpZnkgdGhlIHVwZGF0ZSBvcGVyYXRpb25cIik7XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIHtcbiAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHNraXA6IDAsXG4gICAgICAgICAgICBsaW1pdDogMTUgICAvLyBmb3Igbm8gbGltaXQgcGFzcyBbb3B0aW9ucy5saW1pdCA9IC0xXVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHNlbGVjdGlvbikpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHNwZWNpZnkgdGhlIHVwZGF0ZSBvcGVyYXRpb25cIik7XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbih1cGRhdGUpKSBsb2dnZXIudGhyb3coXCJZb3UgbXVzdCBzcGVjaWZ5IHRoZSB1cGRhdGUgb3BlcmF0aW9uXCIpO1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG5cbiAgICB2YXIgcmVzID0gbnVsbDtcblxuICAgIHZhciBkb2NzID0gbnVsbDtcbiAgICBpZiAob3B0aW9ucy5tdWx0aSkge1xuICAgICAgICBkb2NzID0gdGhpcy5maW5kKHNlbGVjdGlvbiwgbnVsbCwgeyBmb3JjZUZldGNoOiB0cnVlIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY3MgPSB0aGlzLmZpbmRPbmUoc2VsZWN0aW9uKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwoZG9jcykpIHtcbiAgICAgICAgZG9jcyA9IFtdO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNBcnJheShkb2NzKSkge1xuICAgICAgICBkb2NzID0gW2RvY3NdO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZG9jcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgaWYgKG9wdGlvbnMudXBzZXJ0KSB7XG4gICAgICAgICAgICB2YXIgaW5zZXJ0ZWQgPSB0aGlzLmluc2VydCh1cGRhdGUpO1xuXG4gICAgICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IFtpbnNlcnRlZF0sXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAxXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vIGRvY3VtZW50cyBmb3VuZFxuICAgICAgICAgICAgcmVzID0ge1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdXBkYXRlZERvY3MgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZG9jcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGRvYyA9IGRvY3NbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBvdmVycmlkZSA9IG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBoYXNNb2RpZmllciA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gSUU3IGRvZXNuJ3Qgc3VwcG9ydCBpbmRleGluZyBpbnRvIHN0cmluZ3MgKGVnLCBrZXlbMF0gb3Iga2V5LmluZGV4T2YoJyQnKSApLCBzbyB1c2Ugc3Vic3RyLlxuICAgICAgICAgICAgICAgIC8vIFRlc3Rpbmcgb3ZlciB0aGUgZmlyc3QgbGV0dGVyOlxuICAgICAgICAgICAgICAgIC8vICAgICAgQmVzdHMgcmVzdWx0IHdpdGggMWU4IGxvb3BzID0+IGtleVswXSh+M3MpID4gc3Vic3RyKH41cykgPiByZWdleHAofjZzKSA+IGluZGV4T2YofjE2cylcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgbW9kaWZpZXIgPSAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnKTtcbiAgICAgICAgICAgICAgICBpZiAobW9kaWZpZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzTW9kaWZpZXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy51cGRhdGVBc01vbmdvKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNNb2RpZmllciAmJiAhbW9kaWZpZXIpIGxvZ2dlci50aHJvdyhcIkFsbCB1cGRhdGUgZmllbGRzIG11c3QgYmUgYW4gdXBkYXRlIG9wZXJhdG9yXCIpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNNb2RpZmllciAmJiBvcHRpb25zLm11bHRpKSBsb2dnZXIudGhyb3coXCJZb3UgY2FuIG5vdCB1cGRhdGUgc2V2ZXJhbCBkb2N1bWVudHMgd2hlbiBubyB1cGRhdGUgb3BlcmF0b3JzIGFyZSBpbmNsdWRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNNb2RpZmllcikgb3ZlcnJpZGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghaGFzTW9kaWZpZXIpIG92ZXJyaWRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdmVycmlkZSA9ICEhb3B0aW9ucy5vdmVycmlkZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBfZG9jVXBkYXRlID0gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG92ZXJyaWRlKSB7XG4gICAgICAgICAgICAgICAgLy8gT3ZlcnJpZGVzIHRoZSBkb2N1bWVudCBleGNlcHQgZm9yIHRoZSBcIl9pZFwiXG4gICAgICAgICAgICAgICAgX2RvY1VwZGF0ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgX2lkOiBkb2MuX2lkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBNdXN0IGlnbm9yZSBmaWVsZHMgc3RhcnRpbmcgd2l0aCAnJCcsICcuJy4uLlxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJyB8fCAvXFwuL2cudGVzdChrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgVGhlIGZpZWxkICR7a2V5fSBjYW4gbm90IGJlZ2luIHdpdGggJyQnIG9yIGNvbnRhaW4gJy4nYCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfZG9jVXBkYXRlW2tleV0gPSB1cGRhdGVba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX2RvY1VwZGF0ZSA9IF8uY2xvbmVEZWVwKGRvYyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsID0gdXBkYXRlW2tleV07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfZG9jVXBkYXRlID0gX2FwcGx5TW9kaWZpZXIoX2RvY1VwZGF0ZSwga2V5LCB2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmlzTmlsKF9kb2NVcGRhdGVba2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ICE9PSAnX2lkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZG9jVXBkYXRlW2tleV0gPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oXCJUaGUgZmllbGQgJ19pZCcgY2FuIG5vdCBiZSB1cGRhdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYFRoZSBkb2N1bWVudCBkb2VzIG5vdCBjb250YWlucyB0aGUgZmllbGQgJHtrZXl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHVwZGF0ZWREb2NzLnB1c2goX2RvY1VwZGF0ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxldCBpZHggPSB0aGlzLmRvY19pbmRleGVzW19kb2NVcGRhdGUuX2lkXTtcbiAgICAgICAgICAgIHRoaXMuZG9jc1tpZHhdID0gX2RvY1VwZGF0ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFwidXBkYXRlXCIgZXZlbnQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfnVwZGF0ZVxuICAgICAgICAgKiBcbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gc2VsZWN0b3IgLSBUaGUgc2VsZWN0aW9uIG9mIHRoZSBxdWVyeVxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gbW9kaWZpZXIgLSBUaGUgbW9kaWZpZXIgdXNlZCBpbiB0aGUgcXVlcnlcbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGRvY3MgLSBUaGUgdXBkYXRlZC9pbnNlcnRlZCBkb2N1bWVudHMgaW5mb3JtYXRpb25cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICd1cGRhdGUnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICBtb2RpZmllcjogdXBkYXRlLFxuICAgICAgICAgICAgICAgIGRvY3M6IHVwZGF0ZWREb2NzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnRzOiB1cGRhdGVkRG9jcyxcbiAgICAgICAgICAgICAgICBjb3VudDogdXBkYXRlZERvY3MubGVuZ3RoXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgIFxuICAgIHJldHVybiByZXM7XG59O1xuXG52YXIgX2FwcGx5TW9kaWZpZXIgPSBmdW5jdGlvbihfZG9jVXBkYXRlLCBrZXksIHZhbCkge1xuICAgIHZhciBkb2MgPSBfLmNsb25lRGVlcChfZG9jVXBkYXRlKTtcbiAgICAvLyB2YXIgbW9kID0gX21vZGlmaWVyc1trZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgaWYgKCFfbW9kaWZpZXJzW2tleV0pIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KGBJbnZhbGlkIG1vZGlmaWVyIHNwZWNpZmllZDogJHtrZXl9YCk7XG4gICAgfVxuICAgIFxuICAgIGZvciAodmFyIGtleXBhdGggaW4gdmFsKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHZhbFtrZXlwYXRoXTtcbiAgICAgICAgdmFyIGtleXBhcnRzID0ga2V5cGF0aC5zcGxpdCgnLicpO1xuICAgICAgICBcbiAgICAgICAgX21vZGlmeShkb2MsIGtleXBhcnRzLCB2YWx1ZSwga2V5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHZhciBub19jcmVhdGUgPSAhIUNvbGxlY3Rpb24uX25vQ3JlYXRlTW9kaWZpZXJzW2tleV07XG4gICAgICAgIC8vIHZhciBmb3JiaWRfYXJyYXkgPSAoa2V5ID09PSBcIiRyZW5hbWVcIik7XG4gICAgICAgIC8vIHZhciB0YXJnZXQgPSBDb2xsZWN0aW9uLl9maW5kTW9kVGFyZ2V0KF9kb2NVcGRhdGUsIGtleXBhcnRzLCBub19jcmVhdGUsIGZvcmJpZF9hcnJheSk7XG4gICAgICAgIC8vIHZhciBmaWVsZCA9IGtleXBhcnRzLnBvcCgpO1xuXG4gICAgICAgIC8vIG1vZCh0YXJnZXQsIGZpZWxkLCB2YWx1ZSwga2V5cGF0aCwgX2RvY1VwZGF0ZSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBkb2M7XG59O1xuXG52YXIgX21vZGlmeSA9IGZ1bmN0aW9uKGRvY3VtZW50LCBrZXlwYXJ0cywgdmFsdWUsIGtleSwgbGV2ZWwgPSAwKSB7XG4gICAgZm9yIChsZXQgaSA9IGxldmVsOyBpIDwga2V5cGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IHBhdGggPSBrZXlwYXJ0c1tpXTtcbiAgICAgICAgbGV0IGlzTnVtZXJpYyA9IC9eWzAtOV0rJC8udGVzdChwYXRoKTtcbiAgICAgICAgbGV0IHRhcmdldCA9IGRvY3VtZW50W3BhdGhdO1xuICAgICAgICBcbiAgICAgICAgdmFyIGNyZWF0ZSA9IF8uaGFzSW4oQ29sbGVjdGlvbi5fbm9DcmVhdGVNb2RpZmllcnMsIGtleSkgPyBmYWxzZSA6IHRydWU7XG4gICAgICAgIGlmICghY3JlYXRlICYmICghXy5pc09iamVjdChkb2N1bWVudCkgfHwgXy5pc05pbCh0YXJnZXQpKSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KGBUaGUgZWxlbWVudCBcIiR7cGF0aH1cIiBtdXN0IGV4aXN0cyBpbiBcIiR7SlNPTi5zdHJpbmdpZnkoZG9jdW1lbnQpfVwiYCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQXJyYXkoZG9jdW1lbnQpKSB7XG4gICAgICAgICAgICAvLyBEbyBub3QgYWxsb3cgJHJlbmFtZSBvbiBhcnJheXNcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiJHJlbmFtZVwiKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBsZXQgdGhlIHVzZSBvZiBcImFycmF5ZmllbGQuPG51bWVyaWNfaW5kZXg+LnN1YmZpZWxkXCJcbiAgICAgICAgICAgIGlmIChpc051bWVyaWMpIHtcbiAgICAgICAgICAgICAgICBwYXRoID0gXy50b051bWJlcihwYXRoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KGBUaGUgZmllbGQgXCIke3BhdGh9XCIgY2FuIG5vdCBiZSBhcHBlbmRlZCB0byBhbiBhcnJheWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaWxsIHRoZSBhcnJheSB0byB0aGUgZGVzaXJlZCBsZW5ndGhcbiAgICAgICAgICAgIHdoaWxlIChkb2N1bWVudC5sZW5ndGggPCBwYXRoKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucHVzaChudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGkgPCBrZXlwYXJ0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBpZiAoXy5pc05pbCh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgYXJlIGFjY2Vzc2luZyB3aXRoIFwiYXJyYXlGaWVsZC48bnVtZXJpY19pbmRleD5cIlxuICAgICAgICAgICAgICAgIGlmIChfLmlzRmluaXRlKF8udG9OdW1iZXIoa2V5cGFydHNbaSArIDFdKSkpIHsgIC8vICB8fCBrZXlwYXJ0c1tpICsgMV0gPT09ICckJyAgLy8gVE9ETyBcImFycmF5RmllbGQuJFwiXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IFtdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZG9jdW1lbnRbcGF0aF0gPSBfbW9kaWZ5KHRhcmdldCwga2V5cGFydHMsIHZhbHVlLCBrZXksIGxldmVsICsgMSk7XG5cbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF9tb2RpZmllcnNba2V5XShkb2N1bWVudCwgcGF0aCwgdmFsdWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZG9jdW1lbnQ7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgb25lIG9yIG1hbnkgZG9jdW1lbnRzXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNyZW1vdmVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuanVzdE9uZT1mYWxzZV0gLSBEZWxldGVzIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIHRoZSBzZWxlY3Rpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHRoZSBkZWxldGVkIGRvY3VtZW50c1xuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0geyBqdXN0T25lOiBmYWxzZSB9O1xuICAgIFxuICAgIC8vIElmIHdlIGFyZSBub3QgcGFzc2luZyBhIHNlbGVjdGlvbiBhbmQgd2UgYXJlIG5vdCByZW1vdmluZyBqdXN0IG9uZSwgaXMgdGhlIHNhbWUgYXMgYSBkcm9wXG4gICAgaWYgKE9iamVjdC5zaXplKHNlbGVjdGlvbikgPT09IDAgJiYgIW9wdGlvbnMuanVzdE9uZSkgcmV0dXJuIHRoaXMuZHJvcChvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgXG4gICAgLy8gQ2hlY2sgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGFyZSB1c2luZyBhbiBvYmplY3RJZFxuICAgIGlmKHNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgIHNlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgIF9pZDogc2VsZWN0aW9uXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICB2YXIgY3Vyc29yID0gdGhpcy5maW5kKHNlbGVjdGlvbik7XG4gICAgXG4gICAgdmFyIGRvY3MgPSBbXTtcbiAgICBjdXJzb3IuZm9yRWFjaChkb2MgPT4ge1xuICAgICAgICB2YXIgaWR4ID0gdGhpcy5kb2NfaW5kZXhlc1tkb2MuX2lkXTtcbiAgICAgICAgXG4gICAgICAgIGRlbGV0ZSB0aGlzLmRvY19pbmRleGVzW2RvYy5faWRdO1xuICAgICAgICB0aGlzLmRvY3Muc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIFxuICAgICAgICBkb2NzLnB1c2goZG9jKTtcbiAgICB9KTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBcInJlbW92ZVwiIGV2ZW50LlxuICAgICAqXG4gICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+cmVtb3ZlXG4gICAgICogXG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzZWxlY3RvciAtIFRoZSBzZWxlY3Rpb24gb2YgdGhlIHF1ZXJ5XG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IGRvY3MgLSBUaGUgZGVsZXRlZCBkb2N1bWVudHMgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdyZW1vdmUnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgIGRvY3M6IGRvY3NcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBkb2NzKTtcbiAgICBcbiAgICByZXR1cm4gZG9jcztcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBDb2xsZWN0aW9uI3JlbW92ZX1cbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI2RlbGV0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLnJlbW92ZShzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKTtcbn07XG4gXG4gLyoqXG4gKiBBbGlhcyBmb3Ige0BsaW5rIENvbGxlY3Rpb24jcmVtb3ZlfVxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZGVzdHJveVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5yZW1vdmUoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIERyb3BzIGEgY29sbGVjdGlvblxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZHJvcFxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5kcm9wSW5kZXhlcz1mYWxzZV0gLSBUcnVlIGlmIHdlIHdhbnQgdG8gZHJvcCB0aGUgaW5kZXhlcyB0b29cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRydWUgd2hlbiB0aGUgY29sbGVjdGlvbiBpcyBkcm9wcGVkXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRyb3AgPSBmdW5jdGlvbihvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIHRoaXMuZG9jX2luZGV4ZXMgPSB7fTtcbiAgICB0aGlzLmRvY3MgPSBbXTtcbiAgICBcbiAgICBpZiAob3B0aW9ucy5kcm9wSW5kZXhlcykge30gLy8gVE9ET1xuICAgIFxuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2Ryb3BDb2xsZWN0aW9uJyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIGluZGV4ZXM6ICEhb3B0aW9ucy5kcm9wSW5kZXhlc1xuICAgICAgICB9XG4gICAgKTtcbiAgICBcbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgIFxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBJbnNlcnQgb3IgdXBkYXRlIGEgZG9jdW1lbnQuIElmIHRoZSBkb2N1bWVudCBoYXMgYW4gXCJfaWRcIiBpcyBhbiB1cGRhdGUgKHdpdGggdXBzZXJ0KSwgaWYgbm90IGlzIGFuIGluc2VydC5cbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI3NhdmVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IGRvYyAtIERvY3VtZW50IHRvIGJlIGluc2VydGVkL3VwZGF0ZWRcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmRyb3BJbmRleGVzPWZhbHNlXSAtIFRydWUgaWYgd2Ugd2FudCB0byBkcm9wIHRoZSBpbmRleGVzIHRvb1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gVHJ1ZSB3aGVuIHRoZSBjb2xsZWN0aW9uIGlzIGRyb3BwZWRcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uKGRvYywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChkb2MpIHx8IF8uaXNGdW5jdGlvbihkb2MpKSBsb2dnZXIudGhyb3coXCJZb3UgbXVzdCBwYXNzIGEgZG9jdW1lbnRcIik7XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICBpZiAoXy5oYXNJbihkb2MsICdfaWQnKSkge1xuICAgICAgICBvcHRpb25zLnVwc2VydCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGUoXG4gICAgICAgICAgICB7IF9pZDogZG9jLl9pZCB9LFxuICAgICAgICAgICAgZG9jLFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5zZXJ0KGRvYywgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgIH1cbn07XG5cbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZW5zdXJlSW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICAvL1RPRE8gSW1wbGVtZW50IEVuc3VyZUluZGV4XG4gICAgbG9nZ2VyLnRocm93KCdDb2xsZWN0aW9uI2Vuc3VyZUluZGV4IHVuaW1wbGVtZW50ZWQgYnkgZHJpdmVyJyk7XG59O1xuXG4vLyBUT0RPIGRvY3VtZW50IChhdCBzb21lIHBvaW50KVxuLy8gVE9ETyB0ZXN0XG4vLyBUT0RPIG9idmlvdXNseSB0aGlzIHBhcnRpY3VsYXIgaW1wbGVtZW50YXRpb24gd2lsbCBub3QgYmUgdmVyeSBlZmZpY2llbnRcbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuYmFja3VwID0gZnVuY3Rpb24gKGJhY2t1cElELCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oYmFja3VwSUQpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gYmFja3VwSUQ7XG4gICAgICAgIGJhY2t1cElEID0gbmV3IE9iamVjdElkKCkudG9TdHJpbmcoKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuXG4gICAgdGhpcy5zbmFwc2hvdHNbYmFja3VwSURdID0gXy5jbG9uZURlZXAodGhpcy5kb2NzKTtcbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdzbmFwc2hvdCcsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBiYWNrdXBJRDogYmFja3VwSUQsXG4gICAgICAgICAgICBkb2N1bWVudHM6IHRoaXMuc25hcHNob3RzW2JhY2t1cElEXSBcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBiYWNrdXBJRDogYmFja3VwSUQsXG4gICAgICAgIGRvY3VtZW50czogdGhpcy5zbmFwc2hvdHNbYmFja3VwSURdXG4gICAgfTtcbiAgICBcbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy8gTGlzdHMgYXZhaWxhYmxlIEJhY2t1cHNcbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuYmFja3VwcyA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICB2YXIgYmFja3VwcyA9IFtdO1xuXG4gICAgZm9yIChsZXQgaWQgaW4gdGhpcy5zbmFwc2hvdHMpIHtcbiAgICAgICAgYmFja3Vwcy5wdXNoKHtpZDogaWQsIGRvY3VtZW50czogdGhpcy5zbmFwc2hvdHNbaWRdfSk7XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBiYWNrdXBzKTtcblxuICAgIHJldHVybiBiYWNrdXBzO1xufTtcblxuLy8gTGlzdHMgYXZhaWxhYmxlIEJhY2t1cHNcbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlQmFja3VwID0gZnVuY3Rpb24gKGJhY2t1cElELCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oYmFja3VwSUQpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gYmFja3VwSUQ7XG4gICAgICAgIGJhY2t1cElEID0gbnVsbDtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIGxldCByZXN1bHQgPSBmYWxzZTtcbiAgICBcbiAgICBpZiAoYmFja3VwSUQpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuc25hcHNob3RzW18udG9TdHJpbmcoYmFja3VwSUQpXTtcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdCA9IGJhY2t1cElEO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc25hcHNob3RzID0ge307XG4gICAgICAgIFxuICAgICAgICByZXN1bHQgPSB0cnVlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuXG4vLyBSZXN0b3JlIHRoZSBzbmFwc2hvdC4gSWYgbm8gc25hcHNob3QgZXhpc3RzLCByYWlzZSBhbiBleGNlcHRpb247XG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlc3RvcmUgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgYmFja3VwSUQgPSBudWxsO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgdmFyIHNuYXBzaG90Q291bnQgPSBPYmplY3Quc2l6ZSh0aGlzLnNuYXBzaG90cyk7XG4gICAgdmFyIGJhY2t1cERhdGEgPSBudWxsO1xuXG4gICAgaWYgKHNuYXBzaG90Q291bnQgPT09IDApIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiVGhlcmUgaXMgbm8gc25hcHNob3RzXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghYmFja3VwSUQpIHtcbiAgICAgICAgICAgIGlmIChzbmFwc2hvdENvdW50ID09PSAxKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oXCJObyBiYWNrdXBJRCBwYXNzZWQuIFJlc3RvcmluZyB0aGUgb25seSBzbmFwc2hvdFwiKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgb25seSBzbmFwc2hvdFxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB0aGlzLnNuYXBzaG90cykgYmFja3VwSUQgPSBrZXk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIlRoZSBhcmUgc2V2ZXJhbCBzbmFwc2hvdHMuIFBsZWFzZSBzcGVjaWZ5IG9uZSBiYWNrdXBJRFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBiYWNrdXBEYXRhID0gdGhpcy5zbmFwc2hvdHNbYmFja3VwSURdO1xuICAgICAgICAgICAgXG4gICAgaWYgKCFiYWNrdXBEYXRhKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhgVW5rbm93biBCYWNrdXAgSUQ6ICR7YmFja3VwSUR9YCk7XG4gICAgfVxuXG4gICAgdGhpcy5kb2NzID0gYmFja3VwRGF0YTtcbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdyZXN0b3JlJyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRFxuICAgICAgICB9XG4gICAgKTtcblxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2FsY3VsYXRlcyBhZ2dyZWdhdGUgdmFsdWVzIGZvciB0aGUgZGF0YSBpbiBhIGNvbGxlY3Rpb25cbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI2FnZ3JlZ2F0ZVxuICogXG4gKiBAcGFyYW0ge0FycmF5fSBwaXBlbGluZSAtIEEgc2VxdWVuY2Ugb2YgZGF0YSBhZ2dyZWdhdGlvbiBvcGVyYXRpb25zIG9yIHN0YWdlc1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmZvcmNlRmV0Y2g9ZmFsc2VdIC0gSWYgc2V0IHRvJ1widHJ1ZVwiIHJldHVybnMgdGhlIGFycmF5IG9mIGRvY3VtZW50cyBhbHJlYWR5IGZldGNoZWRcbiAqIFxuICogQHJldHVybnMge0FycmF5fEN1cnNvcn0gSWYgXCJvcHRpb25zLmZvcmNlRmV0Y2hcIiBzZXQgdG8gdHJ1ZSByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMsIG90aGVyd2lzZSByZXR1cm5zIGEgY3Vyc29yXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmFnZ3JlZ2F0ZSA9IGZ1bmN0aW9uKHBpcGVsaW5lLCBvcHRpb25zID0geyBmb3JjZUZldGNoOiBmYWxzZSB9KSB7XG4gICAgaWYgKF8uaXNOaWwocGlwZWxpbmUpIHx8ICFfLmlzQXJyYXkocGlwZWxpbmUpKSBsb2dnZXIudGhyb3coJ1RoZSBcInBpcGVsaW5lXCIgcGFyYW0gbXVzdCBiZSBhbiBhcnJheScpO1xuICAgIFxuICAgIHZhciBhZ2dyZWdhdGlvbiA9IG5ldyBBZ2dyZWdhdGlvbihwaXBlbGluZSk7XG4gICAgXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwaXBlbGluZS5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgc3RhZ2UgPSBwaXBlbGluZVtpXTtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGtleSBpbiBzdGFnZSkge1xuICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgIT09ICckJykgbG9nZ2VyLnRocm93KFwiVGhlIHBpcGVsaW5lIHN0YWdlcyBtdXN0IGJlZ2luIHdpdGggJyQnXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWFnZ3JlZ2F0aW9uLnZhbGlkU3RhZ2Uoa2V5KSkgbG9nZ2VyLnRocm93KGBJbnZhbGlkIHN0YWdlIFwiJHtrZXl9XCJgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgdmFyIHJlc3VsdCA9IGFnZ3JlZ2F0aW9uLmFnZ3JlZ2F0ZSh0aGlzKTtcbiAgICBcbiAgICByZXR1cm4gcmVzdWx0OyAgLy8gY2hhbmdlIHRvIGN1cnNvclxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVycyA9IHtcbiAgICAkdW5zZXQ6IHRydWUsXG4gICAgJHBvcDogdHJ1ZSxcbiAgICAkcmVuYW1lOiB0cnVlLFxuICAgICRwdWxsOiB0cnVlLFxuICAgICRwdWxsQWxsOiB0cnVlXG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbnZhciBfbW9kaWZpZXJzID0ge1xuICAgICRpbmM6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKCFfLmlzTnVtYmVyKGFyZykpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRpbmMgYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgICAgaWYgKCFfLmlzTnVtYmVyKHRhcmdldFtmaWVsZF0pKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRpbmMgbW9kaWZpZXIgdG8gbm9uLW51bWJlclwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSArPSBhcmc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IF8uY2xvbmVEZWVwKGFyZyk7XG4gICAgfSxcblxuICAgICR1bnNldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoIV8uaXNOaWwodGFyZ2V0KSkge1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0YXJnZXRbZmllbGRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdXNoOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFthcmddO1xuICAgICAgICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVzaCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4LnB1c2goXy5jbG9uZURlZXAoYXJnKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1c2hBbGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmIChfLmlzTmlsKHgpKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHgucHVzaChhcmdbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRhZGRUb1NldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKF8uaXNOaWwoeCkpIHtcbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBbYXJnXTtcbiAgICAgICAgfSBlbHNlIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJGFkZFRvU2V0IG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBpc0VhY2ggPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChfLmlzUGxhaW5PYmplY3QoYXJnKSkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgaW4gYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrID09PSBcIiRlYWNoXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzRWFjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHZhbHVlcyA9IGlzRWFjaCA/IGFyZ1tcIiRlYWNoXCJdIDogW2FyZ107XG4gICAgICAgICAgICBfLmZvckVhY2godmFsdWVzLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yTWF0Y2hlci5lcXVhbCh2YWx1ZSwgeFtpXSkpIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB4LnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHBvcDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoXy5pc05pbCh0YXJnZXQpIHx8IF8uaXNOaWwodGFyZ2V0W2ZpZWxkXSkpIHJldHVybjtcblxuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcG9wIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChfLmlzTnVtYmVyKGFyZykgJiYgYXJnIDwgMCkge1xuICAgICAgICAgICAgICAgIHguc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4LnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkgfHwgXy5pc05pbCh0YXJnZXRbZmllbGRdKSkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIiAmJiAhKGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgIC8vIFhYWCB3b3VsZCBiZSBtdWNoIG5pY2VyIHRvIGNvbXBpbGUgdGhpcyBvbmNlLCByYXRoZXIgdGhhblxuICAgICAgICAgICAgICAgIC8vIGZvciBlYWNoIGRvY3VtZW50IHdlIG1vZGlmeS4uIGJ1dCB1c3VhbGx5IHdlJ3JlIG5vdFxuICAgICAgICAgICAgICAgIC8vIG1vZGlmeWluZyB0aGF0IG1hbnkgZG9jdW1lbnRzLCBzbyB3ZSdsbCBsZXQgaXQgc2xpZGUgZm9yXG4gICAgICAgICAgICAgICAgLy8gbm93XG5cbiAgICAgICAgICAgICAgICAvLyBYWFggX2NvbXBpbGVTZWxlY3RvciBpc24ndCB1cCBmb3IgdGhlIGpvYiwgYmVjYXVzZSB3ZSBuZWVkXG4gICAgICAgICAgICAgICAgLy8gdG8gcGVybWl0IHN0dWZmIGxpa2UgeyRwdWxsOiB7YTogeyRndDogNH19fS4uIHNvbWV0aGluZ1xuICAgICAgICAgICAgICAgIC8vIGxpa2UgeyRndDogNH0gaXMgbm90IG5vcm1hbGx5IGEgY29tcGxldGUgc2VsZWN0b3IuXG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoID0gbmV3IFNlbGVjdG9yKHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX21hdGNoaW5nX19cIjogYXJnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBfZG9jXyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9fbWF0Y2hpbmdfXzogeFtpXVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGNoLnRlc3QoX2RvY18pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCh4W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghU2VsZWN0b3JNYXRjaGVyLmVxdWFsKHhbaV0sIGFyZykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdWxsQWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkgfHwgXy5pc05pbCh0YXJnZXRbZmllbGRdKSkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoIV8uaXNOaWwoeCkgJiYgIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seVwiKTtcbiAgICAgICAgfSBlbHNlIGlmICghXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhjbHVkZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBhcmcubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yTWF0Y2hlci5lcXVhbCh4W2ldLCBhcmdbal0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIWV4Y2x1ZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRyZW5hbWU6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCB2YWx1ZSkge1xuICAgICAgICBpZiAoZmllbGQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBubyBpZGVhIHdoeSBtb25nbyBoYXMgdGhpcyByZXN0cmljdGlvbi4uXG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJUaGUgbmV3IGZpZWxkIG5hbWUgbXVzdCBiZSBkaWZmZXJlbnRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIV8uaXNTdHJpbmcodmFsdWUpIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIlRoZSBuZXcgbmFtZSBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZ1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRhcmdldFt2YWx1ZV0gPSB0YXJnZXRbZmllbGRdO1xuICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcbiAgICB9LFxuXG4gICAgJGJpdDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAvLyBYWFggbW9uZ28gb25seSBzdXBwb3J0cyAkYml0IG9uIGludGVnZXJzLCBhbmQgd2Ugb25seSBzdXBwb3J0XG4gICAgICAgIC8vIG5hdGl2ZSBqYXZhc2NyaXB0IG51bWJlcnMgKGRvdWJsZXMpIHNvIGZhciwgc28gd2UgY2FuJ3Qgc3VwcG9ydCAkYml0XG4gICAgICAgIGxvZ2dlci50aHJvdyhcIiRiaXQgaXMgbm90IHN1cHBvcnRlZFwiKTtcbiAgICB9XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24uY2hlY2tDb2xsZWN0aW9uTmFtZSA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lKSB7XG4gICAgaWYgKCFfLmlzU3RyaW5nKGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWUgbXVzdCBiZSBhIFN0cmluZ1wiKTtcbiAgICB9XG5cbiAgICBpZiAoIWNvbGxlY3Rpb25OYW1lIHx8IGNvbGxlY3Rpb25OYW1lLmluZGV4T2YoJy4uJykgIT09IC0xKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgY2Fubm90IGJlIGVtcHR5XCIpO1xuICAgIH1cblxuICAgIGlmIChjb2xsZWN0aW9uTmFtZS5pbmRleE9mKCckJykgIT09IC0xICYmIGNvbGxlY3Rpb25OYW1lLm1hdGNoKC8oKF5cXCRjbWQpfChvcGxvZ1xcLlxcJG1haW4pKS8pID09PSBudWxsKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgbXVzdCBub3QgY29udGFpbiAnJCdcIik7XG4gICAgfVxuXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLm1hdGNoKC9ec3lzdGVtXFwuLykgIT09IG51bGwpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBzdGFydCB3aXRoICdzeXN0ZW0uJyAocmVzZXJ2ZWQgZm9yIGludGVybmFsIHVzZSlcIik7XG4gICAgfVxuICAgIFxuICAgIGlmIChjb2xsZWN0aW9uTmFtZS5tYXRjaCgvXlxcLnxcXC4kLykgIT09IG51bGwpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBzdGFydCBvciBlbmQgd2l0aCAnLidcIik7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW5hbWUgPSBmdW5jdGlvbihuZXdOYW1lKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcobmV3TmFtZSkpIHtcbiAgICAgICAgaWYgKHRoaXMubmFtZSAhPT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKG5ld05hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgZGJOYW1lID0gdGhpcy5uYW1lLnNwbGl0KCcuJykubGVuZ3RoID4gMSA/IHRoaXMubmFtZS5zcGxpdCgnLicpWzBdIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IG5ld05hbWU7XG4gICAgICAgICAgICB0aGlzLmZ1bGxOYW1lID0gZGJOYW1lICsgJy4nICsgdGhpcy5uYW1lO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEVycm9yXG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xsZWN0aW9uO1xuXG4vKipcbiAqIEdldHMgdGhlIHNpemUgb2YgYW4gb2JqZWN0LlxuICogXG4gKiBAbWV0aG9kIE9iamVjdCNzaXplXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgb2JqZWN0XG4gKiBcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBzaXplIG9mIHRoZSBvYmplY3RcbiAqL1xuT2JqZWN0LnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgc2l6ZSA9IDAsIFxuICAgICAgICBrZXk7XG4gICAgXG4gICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBzaXplO1xufTtcblxudmFyIF9lbnN1cmVGaW5kUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgLy8gc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrXG4gICAgaWYgKF8uaXNOaWwocGFyYW1zLnNlbGVjdGlvbikpIHBhcmFtcy5zZWxlY3Rpb24gPSB7fTtcblxuICAgIGlmIChfLmlzTmlsKHBhcmFtcy5zZWxlY3Rpb24pKSBwYXJhbXMuc2VsZWN0aW9uID0ge307XG5cbiAgICBpZiAoXy5pc05pbChwYXJhbXMuZmllbGRzKSkgcGFyYW1zLmZpZWxkcyA9IFtdO1xuXG4gICAgaWYgKF8uaXNOaWwocGFyYW1zLm9wdGlvbnMpKSB7XG4gICAgICAgIHBhcmFtcy5vcHRpb25zID0ge1xuICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgIGxpbWl0OiAxNSAvLyBmb3Igbm8gbGltaXQgcGFzcyBbb3B0aW9ucy5saW1pdCA9IC0xXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIGNhbGxiYWNrIGFzIGZpcnN0IHBhcmFtZXRlclxuICAgIGlmIChfLmlzRnVuY3Rpb24ocGFyYW1zLnNlbGVjdGlvbikpIHtcbiAgICAgICAgcGFyYW1zLmNhbGxiYWNrID0gcGFyYW1zLnNlbGVjdGlvbjtcbiAgICAgICAgcGFyYW1zLnNlbGVjdGlvbiA9IHt9O1xuICAgIH1cblxuICAgIC8vIGNhbGxiYWNrIGFzIHNlY29uZCBwYXJhbWV0ZXJcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5maWVsZHMpKSB7XG4gICAgICAgIHBhcmFtcy5jYWxsYmFjayA9IHBhcmFtcy5maWVsZHM7XG4gICAgICAgIHBhcmFtcy5maWVsZHMgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBjYWxsYmFjayBhcyB0aGlyZCBwYXJhbWV0ZXJcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5vcHRpb25zKSkge1xuICAgICAgICBwYXJhbXMuY2FsbGJhY2sgPSBwYXJhbXMub3B0aW9ucztcbiAgICAgICAgcGFyYW1zLm9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgaWYgKHBhcmFtcy5zZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBwYXJhbXMuc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgX2lkOiBwYXJhbXMuc2VsZWN0aW9uXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzTmlsKHBhcmFtcy5jYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihwYXJhbXMuY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICB9XG5cbiAgICBpZiAocGFyYW1zLm9wdGlvbnMuZmllbGRzKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHBhcmFtcy5maWVsZHMpIHx8IHBhcmFtcy5maWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBwYXJhbXMuZmllbGRzID0gcGFyYW1zLm9wdGlvbnMuZmllbGRzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oXCJGaWVsZHMgYWxyZWFkeSBwcmVzZW50LiBJZ25vcmluZyAnb3B0aW9ucy5maWVsZHMnLlwiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gcGFyYW1zO1xufTsiXX0=
