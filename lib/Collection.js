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
//# sourceMappingURL=data:application/json;base64,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QUFhLE9BQU8sUUFBcEIsQ0FBbEMsRUFBaUU7QUFDN0QsZUFBTyxLQUFQLENBQWEsNkJBQWI7QUFDSDs7QUFFRCxRQUFJLE9BQU8sT0FBUCxDQUFlLE1BQW5CLEVBQTJCO0FBQ3ZCLFlBQUksRUFBRSxLQUFGLENBQVEsT0FBTyxNQUFmLEtBQTBCLE9BQU8sTUFBUCxDQUFjLE1BQWQsS0FBeUIsQ0FBdkQsRUFBMEQ7QUFDdEQsbUJBQU8sTUFBUCxHQUFnQixPQUFPLE9BQVAsQ0FBZSxNQUEvQjtBQUNILFNBRkQsTUFFTztBQUNILG1CQUFPLElBQVAsQ0FBWSxvREFBWjtBQUNIO0FBQ0o7O0FBRUQsV0FBTyxNQUFQO0FBQ0gsQ0FyREQiLCJmaWxlIjoiQ29sbGVjdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgQ29sbGVjdGlvbi5qcyAtIGJhc2VkIG9uIE1vbmdsbyNDb2xsZWN0aW9uICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIExvZ2dlciA9IHJlcXVpcmUoXCJqc3ctbG9nZ2VyXCIpLFxuICAgIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0V2ZW50RW1pdHRlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKSxcbiAgICBBZ2dyZWdhdGlvbiA9IHJlcXVpcmUoXCIuL0FnZ3JlZ2F0aW9uXCIpLFxuICAgIEN1cnNvciA9IHJlcXVpcmUoXCIuL0N1cnNvclwiKSxcbiAgICBPYmplY3RJZCA9IHJlcXVpcmUoJy4vT2JqZWN0SWQnKSxcbiAgICBTZWxlY3RvciA9IHJlcXVpcmUoXCIuL1NlbGVjdG9yXCIpLFxuICAgIFNlbGVjdG9yTWF0Y2hlciA9IHJlcXVpcmUoXCIuL1NlbGVjdG9yTWF0Y2hlclwiKTtcbiAgICBcbnZhciBsb2dnZXIgPSBudWxsO1xuICAgIFxuLyoqXG4gKiBDb2xsZWN0aW9uXG4gKiBcbiAqIEBtb2R1bGUgQ29sbGVjdGlvblxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2luY2UgMC4wLjFcbiAqIFxuICogQGNsYXNzZGVzYyBDb2xsZWN0aW9uIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBwYXJhbSB7TW9uZ29Qb3J0YWJsZX0gZGIgLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gKiBcbiAqL1xudmFyIGRhdGFiYXNlID0gbnVsbDtcbmNsYXNzIENvbGxlY3Rpb24gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuLy8gdmFyIENvbGxlY3Rpb24gPSBmdW5jdGlvbihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpIHtcbiAgICBjb25zdHJ1Y3RvcihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDb2xsZWN0aW9uKSkgcmV0dXJuIG5ldyBDb2xsZWN0aW9uKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGRiKSkgbG9nZ2VyLnRocm93KFwiZGIgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoY29sbGVjdGlvbk5hbWUpKSBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uTmFtZSBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChvcHRpb25zKSB8fCAhXy5pc1BsYWluT2JqZWN0KG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgICAgIFxuICAgICAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUoY29sbGVjdGlvbk5hbWUpO1xuICAgIFxuICAgICAgICAvLyB0aGlzLmRiID0gZGI7XG4gICAgICAgIGRhdGFiYXNlID0gZGI7XG4gICAgICAgIHRoaXMubmFtZSA9IGNvbGxlY3Rpb25OYW1lO1xuICAgICAgICB0aGlzLmRhdGFiYXNlTmFtZSA9IGRiLmRhdGFiYXNlTmFtZTtcbiAgICAgICAgdGhpcy5mdWxsTmFtZSA9IHRoaXMuZGF0YWJhc2VOYW1lICsgJy4nICsgdGhpcy5uYW1lO1xuICAgICAgICB0aGlzLmRvY3MgPSBbXTtcbiAgICAgICAgdGhpcy5kb2NfaW5kZXhlcyA9IHt9O1xuICAgICAgICB0aGlzLnNuYXBzaG90cyA9IFtdO1xuICAgICAgICB0aGlzLm9wdHMgPSB7fTsgLy8gRGVmYXVsdCBvcHRpb25zXG4gICAgICAgIFxuICAgICAgICBfLm1lcmdlKHRoaXMub3B0cywgb3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICAvLyB0aGlzLmVtaXQgPSBkYi5lbWl0O1xuICAgIH1cbiAgICBcbiAgICBlbWl0KG5hbWUsIGFyZ3MsIGNiKSB7XG4gICAgICAgIHN1cGVyLmVtaXQobmFtZSwgYXJncywgY2IsIGRhdGFiYXNlLl9zdG9yZXMpO1xuICAgIH1cbn1cblxuLy8gVE9ETyBlbmZvcmNlIHJ1bGUgdGhhdCBmaWVsZCBuYW1lcyBjYW4ndCBzdGFydCB3aXRoICckJyBvciBjb250YWluICcuJ1xuLy8gKHJlYWwgbW9uZ29kYiBkb2VzIGluIGZhY3QgZW5mb3JjZSB0aGlzKVxuLy8gVE9ETyBwb3NzaWJseSBlbmZvcmNlIHRoYXQgJ3VuZGVmaW5lZCcgZG9lcyBub3QgYXBwZWFyICh3ZSBhc3N1bWVcbi8vIHRoaXMgaW4gb3VyIGhhbmRsaW5nIG9mIG51bGwgYW5kICRleGlzdHMpXG4vKipcbiAqIEluc2VydHMgYSBkb2N1bWVudCBpbnRvIHRoZSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNpbnNlcnRcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IGRvYyAtIERvY3VtZW50IHRvIGJlIGluc2VydGVkXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuY2hhaW49ZmFsc2VdIC0gSWYgc2V0IHRvIFwidHJ1ZVwiIHJldHVybnMgdGhpcyBpbnN0YW5jZSwgc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R8Q29sbGVjdGlvbn0gSWYgXCJvcHRpb25zLmNoYWluXCIgc2V0IHRvIFwidHJ1ZVwiIHJldHVybnMgdGhpcyBpbnN0YW5jZSwgb3RoZXJ3aXNlIHJldHVybnMgdGhlIGluc2VydGVkIGRvY3VtZW50XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uIChkb2MsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoZG9jKSkgbG9nZ2VyLnRocm93KFwiZG9jIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICBcbiAgICBpZiAoIV8uaXNQbGFpbk9iamVjdChkb2MpKSBsb2dnZXIudGhyb3coXCJkb2MgbXVzdCBiZSBhbiBvYmplY3RcIik7XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgLy8gQ3JlYXRpbmcgYSBzYWZlIGNvcHkgb2YgdGhlIGRvY3VtZW50XG4gICAgdmFyIF9kb2MgPSBfLmNsb25lRGVlcChkb2MpO1xuXG4gICAgLy8gSWYgdGhlIGRvY3VtZW50IGNvbWVzIHdpdGggYSBudW1iZXIgSUQsIHBhcnNlIGl0IHRvIFN0cmluZ1xuICAgIGlmIChfLmlzTnVtYmVyKF9kb2MuX2lkKSkge1xuICAgICAgICBfZG9jLl9pZCA9IF8udG9TdHJpbmcoX2RvYy5faWQpO1xuICAgIH1cblxuICAgIGlmIChfLmlzTmlsKF9kb2MuX2lkKSB8fCAoIV9kb2MuX2lkIGluc3RhbmNlb2YgT2JqZWN0SWQgJiYgKCFfLmlzU3RyaW5nKF9kb2MuX2lkKSB8fCAhX2RvYy5faWQubGVuZ3RoKSkpIHtcbiAgICAgICAgX2RvYy5faWQgPSBuZXcgT2JqZWN0SWQoKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgb3B0aW9ucyB0byBtb3JlIGRhdGVzXG4gICAgX2RvYy50aW1lc3RhbXAgPSBuZXcgT2JqZWN0SWQoKS5nZW5lcmF0aW9uVGltZTtcbiAgICBcbiAgICAvLyBSZXZlcnNlXG4gICAgdGhpcy5kb2NfaW5kZXhlc1tfLnRvU3RyaW5nKF9kb2MuX2lkKV0gPSB0aGlzLmRvY3MubGVuZ3RoO1xuICAgIHRoaXMuZG9jcy5wdXNoKF9kb2MpO1xuICAgIFxuICAgIC8qKlxuICAgICAqIFwiaW5zZXJ0XCIgZXZlbnQuXG4gICAgICpcbiAgICAgKiBAZXZlbnQgTW9uZ29Qb3J0YWJsZX5pbnNlcnRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRvYyAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBkb2N1bWVudCBpbnNlcnRlZFxuICAgICAqL1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2luc2VydCcsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBkb2M6IF9kb2NcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIF9kb2MpO1xuXG4gICAgaWYgKG9wdGlvbnMuY2hhaW4pIHJldHVybiB0aGlzO1xuICAgIFxuICAgIHJldHVybiBfZG9jO1xufTtcblxuLyoqXG4gKiBGaW5kcyBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNmaW5kXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5za2lwXSAtIE51bWJlciBvZiBkb2N1bWVudHMgdG8gYmUgc2tpcHBlZFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmxpbWl0XSAtIE1heCBudW1iZXIgb2YgZG9jdW1lbnRzIHRvIGRpc3BsYXlcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW29wdGlvbnMuZmllbGRzXSAtIFNhbWUgYXMgXCJmaWVsZHNcIiBwYXJhbWV0ZXIgKGlmIGJvdGggcGFzc2VkLCBcIm9wdGlvbnMuZmllbGRzXCIgd2lsbCBiZSBpZ25vcmVkKVxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5mb3JjZUZldGNoPWZhbHNlXSAtIElmIHNldCB0bydcInRydWVcIiByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMgYWxyZWFkeSBmZXRjaGVkXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge0FycmF5fEN1cnNvcn0gSWYgXCJvcHRpb25zLmZvcmNlRmV0Y2hcIiBzZXQgdG8gdHJ1ZSByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMsIG90aGVyd2lzZSByZXR1cm5zIGEgY3Vyc29yXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgbGV0IHBhcmFtcyA9IF9lbnN1cmVGaW5kUGFyYW1zKHtcbiAgICAgICAgc2VsZWN0aW9uOiBzZWxlY3Rpb24sIFxuICAgICAgICBmaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgb3B0aW9uczogb3B0aW9ucywgXG4gICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgIH0pO1xuICAgIFxuICAgIHNlbGVjdGlvbiA9IHBhcmFtcy5zZWxlY3Rpb247XG4gICAgZmllbGRzID0gcGFyYW1zLmZpZWxkcztcbiAgICBvcHRpb25zID0gcGFyYW1zLm9wdGlvbnM7XG4gICAgY2FsbGJhY2sgPSBwYXJhbXMuY2FsbGJhY2s7XG4gICAgXG4gICAgdmFyIGN1cnNvciA9IG5ldyBDdXJzb3IodGhpcy5kb2NzLCBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucyk7XG5cbiAgICAvKipcbiAgICAgKiBcImZpbmRcIiBldmVudC5cbiAgICAgKlxuICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfmZpbmRcbiAgICAgKiBcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdGlvbiBvZiB0aGUgcXVlcnlcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBzaG93ZWQgaW4gdGhlIHF1ZXJ5XG4gICAgICovXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnZmluZCcsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgZmllbGRzOiBmaWVsZHNcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgLy8gUGFzcyB0aGUgY3Vyc29yIGZldGNoZWQgdG8gdGhlIGNhbGxiYWNrXG4gICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBjdXJzb3IuZmV0Y2goKSk7XG5cbiAgICBpZiAob3B0aW9ucy5mb3JjZUZldGNoKSB7XG4gICAgICAgIHJldHVybiBjdXJzb3IuZmV0Y2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY3Vyc29yO1xuICAgIH1cbn07XG5cbi8qKlxuICogRmluZHMgdGhlIGZpcnN0IG1hdGNoaW5nIGRvY3VtZW50XG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNmaW5kT25lXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5za2lwXSAtIE51bWJlciBvZiBkb2N1bWVudHMgdG8gYmUgc2tpcHBlZFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmxpbWl0XSAtIE1heCBudW1iZXIgb2YgZG9jdW1lbnRzIHRvIGRpc3BsYXlcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW29wdGlvbnMuZmllbGRzXSAtIFNhbWUgYXMgXCJmaWVsZHNcIiBwYXJhbWV0ZXIgKGlmIGJvdGggcGFzc2VkLCBcIm9wdGlvbnMuZmllbGRzXCIgd2lsbCBiZSBpZ25vcmVkKVxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGZpcnN0IG1hdGNoaW5nIGRvY3VtZW50IG9mIHRoZSBjb2xsZWN0aW9uXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmZpbmRPbmUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgbGV0IHBhcmFtcyA9IF9lbnN1cmVGaW5kUGFyYW1zKHtcbiAgICAgICAgc2VsZWN0aW9uOiBzZWxlY3Rpb24sIFxuICAgICAgICBmaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgb3B0aW9uczogb3B0aW9ucywgXG4gICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgIH0pO1xuICAgIFxuICAgIHNlbGVjdGlvbiA9IHBhcmFtcy5zZWxlY3Rpb247XG4gICAgZmllbGRzID0gcGFyYW1zLmZpZWxkcztcbiAgICBvcHRpb25zID0gcGFyYW1zLm9wdGlvbnM7XG4gICAgY2FsbGJhY2sgPSBwYXJhbXMuY2FsbGJhY2s7XG4gICAgXG4gICAgdmFyIGN1cnNvciA9IG5ldyBDdXJzb3IodGhpcy5kb2NzLCBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucyk7XG5cbiAgICAvKipcbiAgICAgKiBcImZpbmRPbmVcIiBldmVudC5cbiAgICAgKlxuICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfmZpbmRPbmVcbiAgICAgKiBcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdGlvbiBvZiB0aGUgcXVlcnlcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBzaG93ZWQgaW4gdGhlIHF1ZXJ5XG4gICAgICovXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnZmluZE9uZScsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgZmllbGRzOiBmaWVsZHNcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgdmFyIHJlcyA9IG51bGw7XG4gICAgXG4gICAgaWYgKGN1cnNvci5oYXNOZXh0KCkpIHtcbiAgICAgICAgcmVzID0gY3Vyc29yLm5leHQoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gUGFzcyB0aGUgY3Vyc29yIGZldGNoZWQgdG8gdGhlIGNhbGxiYWNrXG4gICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgIFxuICAgIHJldHVybiByZXM7XG59O1xuXG5cbi8qKlxuICogVXBkYXRlcyBvbmUgb3IgbWFueSBkb2N1bWVudHNcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI3VwZGF0ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdH0gW3VwZGF0ZT17fV0gLSBUaGUgdXBkYXRlIG9wZXJhdGlvblxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudXBkYXRlQXNNb25nbz10cnVlXSAtIEJ5IGRlZmF1bHQ6IFxuICogICAgICBJZiB0aGUgW3VwZGF0ZV0gb2JqZWN0IGNvbnRhaW5zIHVwZGF0ZSBvcGVyYXRvciBtb2RpZmllcnMsIHN1Y2ggYXMgdGhvc2UgdXNpbmcgdGhlIFwiJHNldFwiIG1vZGlmaWVyLCB0aGVuOlxuICogICAgICAgICAgPHVsPlxuICogICAgICAgICAgICAgIDxsaT5UaGUgW3VwZGF0ZV0gb2JqZWN0IG11c3QgY29udGFpbiBvbmx5IHVwZGF0ZSBvcGVyYXRvciBleHByZXNzaW9uczwvbGk+XG4gKiAgICAgICAgICAgICAgPGxpPlRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgdXBkYXRlcyBvbmx5IHRoZSBjb3JyZXNwb25kaW5nIGZpZWxkcyBpbiB0aGUgZG9jdW1lbnQ8L2xpPlxuICogICAgICAgICAgPHVsPlxuICogICAgICBJZiB0aGUgW3VwZGF0ZV0gb2JqZWN0IGNvbnRhaW5zIG9ubHkgXCJmaWVsZDogdmFsdWVcIiBleHByZXNzaW9ucywgdGhlbjpcbiAqICAgICAgICAgIDx1bD5cbiAqICAgICAgICAgICAgICA8bGk+VGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCByZXBsYWNlcyB0aGUgbWF0Y2hpbmcgZG9jdW1lbnQgd2l0aCB0aGUgW3VwZGF0ZV0gb2JqZWN0LiBUaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIGRvZXMgbm90IHJlcGxhY2UgdGhlIFwiX2lkXCIgdmFsdWU8L2xpPlxuICogICAgICAgICAgICAgIDxsaT5Db2xsZWN0aW9uI3VwZGF0ZSBjYW5ub3QgdXBkYXRlIG11bHRpcGxlIGRvY3VtZW50czwvbGk+XG4gKiAgICAgICAgICA8dWw+XG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5vdmVycmlkZT1mYWxzZV0gLSBSZXBsYWNlcyB0aGUgd2hvbGUgZG9jdW1lbnQgKG9ubHkgYXBsbGllcyB3aGVuIFt1cGRhdGVBc01vbmdvPWZhbHNlXSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy51cHNlcnQ9ZmFsc2VdIC0gQ3JlYXRlcyBhIG5ldyBkb2N1bWVudCB3aGVuIG5vIGRvY3VtZW50IG1hdGNoZXMgdGhlIHF1ZXJ5IGNyaXRlcmlhXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubXVsdGk9ZmFsc2VdIC0gVXBkYXRlcyBtdWx0aXBsZSBkb2N1bWVudHMgdGhhdCBtZWV0IHRoZSBjcml0ZXJpYVxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggdGhlIHVwZGF0ZS9pbnNlcnQgKGlmIHVwc2VydD10cnVlKSBpbmZvcm1hdGlvblxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCB1cGRhdGUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoc2VsZWN0aW9uKSkgc2VsZWN0aW9uID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNOaWwodXBkYXRlKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3Qgc3BlY2lmeSB0aGUgdXBkYXRlIG9wZXJhdGlvblwiKTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkge1xuICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgIGxpbWl0OiAxNSAgIC8vIGZvciBubyBsaW1pdCBwYXNzIFtvcHRpb25zLmxpbWl0ID0gLTFdXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3Qgc3BlY2lmeSB0aGUgdXBkYXRlIG9wZXJhdGlvblwiKTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHVwZGF0ZSkpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHNwZWNpZnkgdGhlIHVwZGF0ZSBvcGVyYXRpb25cIik7XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGFyZSB1c2luZyBhbiBvYmplY3RJZFxuICAgIGlmKHNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgIHNlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgIF9pZDogc2VsZWN0aW9uXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcblxuICAgIHZhciByZXMgPSBudWxsO1xuXG4gICAgdmFyIGRvY3MgPSBudWxsO1xuICAgIGlmIChvcHRpb25zLm11bHRpKSB7XG4gICAgICAgIGRvY3MgPSB0aGlzLmZpbmQoc2VsZWN0aW9uLCBudWxsLCB7IGZvcmNlRmV0Y2g6IHRydWUgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZG9jcyA9IHRoaXMuZmluZE9uZShzZWxlY3Rpb24pO1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc05pbChkb2NzKSkge1xuICAgICAgICBkb2NzID0gW107XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc0FycmF5KGRvY3MpKSB7XG4gICAgICAgIGRvY3MgPSBbZG9jc107XG4gICAgfVxuICAgIFxuICAgIGlmIChkb2NzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBpZiAob3B0aW9ucy51cHNlcnQpIHtcbiAgICAgICAgICAgIHZhciBpbnNlcnRlZCA9IHRoaXMuaW5zZXJ0KHVwZGF0ZSk7XG5cbiAgICAgICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogW2luc2VydGVkXSxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDFcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gZG9jdW1lbnRzIGZvdW5kXG4gICAgICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB1cGRhdGVkRG9jcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb2NzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZG9jID0gZG9jc1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG92ZXJyaWRlID0gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGhhc01vZGlmaWVyID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJRTcgZG9lc24ndCBzdXBwb3J0IGluZGV4aW5nIGludG8gc3RyaW5ncyAoZWcsIGtleVswXSBvciBrZXkuaW5kZXhPZignJCcpICksIHNvIHVzZSBzdWJzdHIuXG4gICAgICAgICAgICAgICAgLy8gVGVzdGluZyBvdmVyIHRoZSBmaXJzdCBsZXR0ZXI6XG4gICAgICAgICAgICAgICAgLy8gICAgICBCZXN0cyByZXN1bHQgd2l0aCAxZTggbG9vcHMgPT4ga2V5WzBdKH4zcykgPiBzdWJzdHIofjVzKSA+IHJlZ2V4cCh+NnMpID4gaW5kZXhPZih+MTZzKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBtb2RpZmllciA9IChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpO1xuICAgICAgICAgICAgICAgIGlmIChtb2RpZmllcikge1xuICAgICAgICAgICAgICAgICAgICBoYXNNb2RpZmllciA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnVwZGF0ZUFzTW9uZ28pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc01vZGlmaWVyICYmICFtb2RpZmllcikgbG9nZ2VyLnRocm93KFwiQWxsIHVwZGF0ZSBmaWVsZHMgbXVzdCBiZSBhbiB1cGRhdGUgb3BlcmF0b3JcIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc01vZGlmaWVyICYmIG9wdGlvbnMubXVsdGkpIGxvZ2dlci50aHJvdyhcIllvdSBjYW4gbm90IHVwZGF0ZSBzZXZlcmFsIGRvY3VtZW50cyB3aGVuIG5vIHVwZGF0ZSBvcGVyYXRvcnMgYXJlIGluY2x1ZGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc01vZGlmaWVyKSBvdmVycmlkZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNNb2RpZmllcikgb3ZlcnJpZGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJyaWRlID0gISFvcHRpb25zLm92ZXJyaWRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIF9kb2NVcGRhdGUgPSBudWxsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAob3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBPdmVycmlkZXMgdGhlIGRvY3VtZW50IGV4Y2VwdCBmb3IgdGhlIFwiX2lkXCJcbiAgICAgICAgICAgICAgICBfZG9jVXBkYXRlID0ge1xuICAgICAgICAgICAgICAgICAgICBfaWQ6IGRvYy5faWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE11c3QgaWdub3JlIGZpZWxkcyBzdGFydGluZyB3aXRoICckJywgJy4nLi4uXG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnIHx8IC9cXC4vZy50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBUaGUgZmllbGQgJHtrZXl9IGNhbiBub3QgYmVnaW4gd2l0aCAnJCcgb3IgY29udGFpbiAnLidgKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGVba2V5XSA9IHVwZGF0ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfZG9jVXBkYXRlID0gXy5jbG9uZURlZXAoZG9jKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWwgPSB1cGRhdGVba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSBfYXBwbHlNb2RpZmllcihfZG9jVXBkYXRlLCBrZXksIHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaXNOaWwoX2RvY1VwZGF0ZVtrZXldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihcIlRoZSBmaWVsZCAnX2lkJyBjYW4gbm90IGJlIHVwZGF0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgVGhlIGRvY3VtZW50IGRvZXMgbm90IGNvbnRhaW5zIHRoZSBmaWVsZCAke2tleX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdXBkYXRlZERvY3MucHVzaChfZG9jVXBkYXRlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGlkeCA9IHRoaXMuZG9jX2luZGV4ZXNbX2RvY1VwZGF0ZS5faWRdO1xuICAgICAgICAgICAgdGhpcy5kb2NzW2lkeF0gPSBfZG9jVXBkYXRlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogXCJ1cGRhdGVcIiBldmVudC5cbiAgICAgICAgICpcbiAgICAgICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+dXBkYXRlXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzZWxlY3RvciAtIFRoZSBzZWxlY3Rpb24gb2YgdGhlIHF1ZXJ5XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBtb2RpZmllciAtIFRoZSBtb2RpZmllciB1c2VkIGluIHRoZSBxdWVyeVxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZG9jcyAtIFRoZSB1cGRhdGVkL2luc2VydGVkIGRvY3VtZW50cyBpbmZvcm1hdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgJ3VwZGF0ZScsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgIG1vZGlmaWVyOiB1cGRhdGUsXG4gICAgICAgICAgICAgICAgZG9jczogdXBkYXRlZERvY3NcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgIHVwZGF0ZWQ6IHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudHM6IHVwZGF0ZWREb2NzLFxuICAgICAgICAgICAgICAgIGNvdW50OiB1cGRhdGVkRG9jcy5sZW5ndGhcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBcbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlcyk7XG4gICAgXG4gICAgcmV0dXJuIHJlcztcbn07XG5cbnZhciBfYXBwbHlNb2RpZmllciA9IGZ1bmN0aW9uKF9kb2NVcGRhdGUsIGtleSwgdmFsKSB7XG4gICAgdmFyIGRvYyA9IF8uY2xvbmVEZWVwKF9kb2NVcGRhdGUpO1xuICAgIC8vIHZhciBtb2QgPSBfbW9kaWZpZXJzW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBpZiAoIV9tb2RpZmllcnNba2V5XSkge1xuICAgICAgICBsb2dnZXIudGhyb3coYEludmFsaWQgbW9kaWZpZXIgc3BlY2lmaWVkOiAke2tleX1gKTtcbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIga2V5cGF0aCBpbiB2YWwpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdmFsW2tleXBhdGhdO1xuICAgICAgICB2YXIga2V5cGFydHMgPSBrZXlwYXRoLnNwbGl0KCcuJyk7XG4gICAgICAgIFxuICAgICAgICBfbW9kaWZ5KGRvYywga2V5cGFydHMsIHZhbHVlLCBrZXkpO1xuICAgICAgICBcbiAgICAgICAgLy8gdmFyIG5vX2NyZWF0ZSA9ICEhQ29sbGVjdGlvbi5fbm9DcmVhdGVNb2RpZmllcnNba2V5XTtcbiAgICAgICAgLy8gdmFyIGZvcmJpZF9hcnJheSA9IChrZXkgPT09IFwiJHJlbmFtZVwiKTtcbiAgICAgICAgLy8gdmFyIHRhcmdldCA9IENvbGxlY3Rpb24uX2ZpbmRNb2RUYXJnZXQoX2RvY1VwZGF0ZSwga2V5cGFydHMsIG5vX2NyZWF0ZSwgZm9yYmlkX2FycmF5KTtcbiAgICAgICAgLy8gdmFyIGZpZWxkID0ga2V5cGFydHMucG9wKCk7XG5cbiAgICAgICAgLy8gbW9kKHRhcmdldCwgZmllbGQsIHZhbHVlLCBrZXlwYXRoLCBfZG9jVXBkYXRlKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGRvYztcbn07XG5cbnZhciBfbW9kaWZ5ID0gZnVuY3Rpb24oZG9jdW1lbnQsIGtleXBhcnRzLCB2YWx1ZSwga2V5LCBsZXZlbCA9IDApIHtcbiAgICBmb3IgKGxldCBpID0gbGV2ZWw7IGkgPCBrZXlwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgcGF0aCA9IGtleXBhcnRzW2ldO1xuICAgICAgICBsZXQgaXNOdW1lcmljID0gL15bMC05XSskLy50ZXN0KHBhdGgpO1xuICAgICAgICBsZXQgdGFyZ2V0ID0gZG9jdW1lbnRbcGF0aF07XG4gICAgICAgIFxuICAgICAgICB2YXIgY3JlYXRlID0gXy5oYXNJbihDb2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVycywga2V5KSA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgICAgaWYgKCFjcmVhdGUgJiYgKCFfLmlzT2JqZWN0KGRvY3VtZW50KSB8fCBfLmlzTmlsKHRhcmdldCkpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coYFRoZSBlbGVtZW50IFwiJHtwYXRofVwiIG11c3QgZXhpc3RzIGluIFwiJHtKU09OLnN0cmluZ2lmeShkb2N1bWVudCl9XCJgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNBcnJheShkb2N1bWVudCkpIHtcbiAgICAgICAgICAgIC8vIERvIG5vdCBhbGxvdyAkcmVuYW1lIG9uIGFycmF5c1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCIkcmVuYW1lXCIpIHJldHVybiBudWxsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IGxldCB0aGUgdXNlIG9mIFwiYXJyYXlmaWVsZC48bnVtZXJpY19pbmRleD4uc3ViZmllbGRcIlxuICAgICAgICAgICAgaWYgKGlzTnVtZXJpYykge1xuICAgICAgICAgICAgICAgIHBhdGggPSBfLnRvTnVtYmVyKHBhdGgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coYFRoZSBmaWVsZCBcIiR7cGF0aH1cIiBjYW4gbm90IGJlIGFwcGVuZGVkIHRvIGFuIGFycmF5YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbGwgdGhlIGFycmF5IHRvIHRoZSBkZXNpcmVkIGxlbmd0aFxuICAgICAgICAgICAgd2hpbGUgKGRvY3VtZW50Lmxlbmd0aCA8IHBhdGgpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5wdXNoKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoaSA8IGtleXBhcnRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBhcmUgYWNjZXNzaW5nIHdpdGggXCJhcnJheUZpZWxkLjxudW1lcmljX2luZGV4PlwiXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNGaW5pdGUoXy50b051bWJlcihrZXlwYXJ0c1tpICsgMV0pKSkgeyAgLy8gIHx8IGtleXBhcnRzW2kgKyAxXSA9PT0gJyQnICAvLyBUT0RPIFwiYXJyYXlGaWVsZC4kXCJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0gW107XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkb2N1bWVudFtwYXRoXSA9IF9tb2RpZnkodGFyZ2V0LCBrZXlwYXJ0cywgdmFsdWUsIGtleSwgbGV2ZWwgKyAxKTtcblxuICAgICAgICAgICAgcmV0dXJuIGRvY3VtZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgX21vZGlmaWVyc1trZXldKGRvY3VtZW50LCBwYXRoLCB2YWx1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBvbmUgb3IgbWFueSBkb2N1bWVudHNcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI3JlbW92ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5qdXN0T25lPWZhbHNlXSAtIERlbGV0ZXMgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgdGhlIHNlbGVjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggdGhlIGRlbGV0ZWQgZG9jdW1lbnRzXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoc2VsZWN0aW9uKSkgc2VsZWN0aW9uID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihzZWxlY3Rpb24pKSB7XG4gICAgICAgIGNhbGxiYWNrID0gc2VsZWN0aW9uO1xuICAgICAgICBzZWxlY3Rpb24gPSB7fTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7IGp1c3RPbmU6IGZhbHNlIH07XG4gICAgXG4gICAgLy8gSWYgd2UgYXJlIG5vdCBwYXNzaW5nIGEgc2VsZWN0aW9uIGFuZCB3ZSBhcmUgbm90IHJlbW92aW5nIGp1c3Qgb25lLCBpcyB0aGUgc2FtZSBhcyBhIGRyb3BcbiAgICBpZiAoT2JqZWN0LnNpemUoc2VsZWN0aW9uKSA9PT0gMCAmJiAhb3B0aW9ucy5qdXN0T25lKSByZXR1cm4gdGhpcy5kcm9wKG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICBcbiAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgaWYoc2VsZWN0aW9uIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgX2lkOiBzZWxlY3Rpb25cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIHZhciBjdXJzb3IgPSB0aGlzLmZpbmQoc2VsZWN0aW9uKTtcbiAgICBcbiAgICB2YXIgZG9jcyA9IFtdO1xuICAgIGN1cnNvci5mb3JFYWNoKGRvYyA9PiB7XG4gICAgICAgIHZhciBpZHggPSB0aGlzLmRvY19pbmRleGVzW2RvYy5faWRdO1xuICAgICAgICBcbiAgICAgICAgZGVsZXRlIHRoaXMuZG9jX2luZGV4ZXNbZG9jLl9pZF07XG4gICAgICAgIHRoaXMuZG9jcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgXG4gICAgICAgIGRvY3MucHVzaChkb2MpO1xuICAgIH0pO1xuICAgIFxuICAgIC8qKlxuICAgICAqIFwicmVtb3ZlXCIgZXZlbnQuXG4gICAgICpcbiAgICAgKiBAZXZlbnQgTW9uZ29Qb3J0YWJsZX5yZW1vdmVcbiAgICAgKiBcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdGlvbiBvZiB0aGUgcXVlcnlcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZG9jcyAtIFRoZSBkZWxldGVkIGRvY3VtZW50cyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3JlbW92ZScsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgZG9jczogZG9jc1xuICAgICAgICB9XG4gICAgKTtcbiAgICBcbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGRvY3MpO1xuICAgIFxuICAgIHJldHVybiBkb2NzO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3Ige0BsaW5rIENvbGxlY3Rpb24jcmVtb3ZlfVxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZGVsZXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMucmVtb3ZlKHNlbGVjdGlvbiwgb3B0aW9ucywgY2FsbGJhY2spO1xufTtcbiBcbiAvKipcbiAqIEFsaWFzIGZvciB7QGxpbmsgQ29sbGVjdGlvbiNyZW1vdmV9XG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNkZXN0cm95XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLnJlbW92ZShzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogRHJvcHMgYSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNkcm9wXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmRyb3BJbmRleGVzPWZhbHNlXSAtIFRydWUgaWYgd2Ugd2FudCB0byBkcm9wIHRoZSBpbmRleGVzIHRvb1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gVHJ1ZSB3aGVuIHRoZSBjb2xsZWN0aW9uIGlzIGRyb3BwZWRcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgdGhpcy5kb2NfaW5kZXhlcyA9IHt9O1xuICAgIHRoaXMuZG9jcyA9IFtdO1xuICAgIFxuICAgIGlmIChvcHRpb25zLmRyb3BJbmRleGVzKSB7fSAvLyBUT0RPXG4gICAgXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnZHJvcENvbGxlY3Rpb24nLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgaW5kZXhlczogISFvcHRpb25zLmRyb3BJbmRleGVzXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgdHJ1ZSk7XG4gICAgXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEluc2VydCBvciB1cGRhdGUgYSBkb2N1bWVudC4gSWYgdGhlIGRvY3VtZW50IGhhcyBhbiBcIl9pZFwiIGlzIGFuIHVwZGF0ZSAod2l0aCB1cHNlcnQpLCBpZiBub3QgaXMgYW4gaW5zZXJ0LlxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jc2F2ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIC0gRG9jdW1lbnQgdG8gYmUgaW5zZXJ0ZWQvdXBkYXRlZFxuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuZHJvcEluZGV4ZXM9ZmFsc2VdIC0gVHJ1ZSBpZiB3ZSB3YW50IHRvIGRyb3AgdGhlIGluZGV4ZXMgdG9vXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUcnVlIHdoZW4gdGhlIGNvbGxlY3Rpb24gaXMgZHJvcHBlZFxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24oZG9jLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGRvYykgfHwgXy5pc0Z1bmN0aW9uKGRvYykpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHBhc3MgYSBkb2N1bWVudFwiKTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGlmIChfLmhhc0luKGRvYywgJ19pZCcpKSB7XG4gICAgICAgIG9wdGlvbnMudXBzZXJ0ID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZShcbiAgICAgICAgICAgIHsgX2lkOiBkb2MuX2lkIH0sXG4gICAgICAgICAgICBkb2MsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnNlcnQoZG9jLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5lbnN1cmVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vVE9ETyBJbXBsZW1lbnQgRW5zdXJlSW5kZXhcbiAgICBsb2dnZXIudGhyb3coJ0NvbGxlY3Rpb24jZW5zdXJlSW5kZXggdW5pbXBsZW1lbnRlZCBieSBkcml2ZXInKTtcbn07XG5cbi8vIFRPRE8gZG9jdW1lbnQgKGF0IHNvbWUgcG9pbnQpXG4vLyBUT0RPIHRlc3Rcbi8vIFRPRE8gb2J2aW91c2x5IHRoaXMgcGFydGljdWxhciBpbXBsZW1lbnRhdGlvbiB3aWxsIG5vdCBiZSB2ZXJ5IGVmZmljaWVudFxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgYmFja3VwSUQgPSBuZXcgT2JqZWN0SWQoKS50b1N0cmluZygpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG5cbiAgICB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF0gPSBfLmNsb25lRGVlcCh0aGlzLmRvY3MpO1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3NuYXBzaG90JyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRCxcbiAgICAgICAgICAgIGRvY3VtZW50czogdGhpcy5zbmFwc2hvdHNbYmFja3VwSURdIFxuICAgICAgICB9XG4gICAgKTtcblxuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRCxcbiAgICAgICAgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF1cbiAgICB9O1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBMaXN0cyBhdmFpbGFibGUgQmFja3Vwc1xuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXBzID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIHZhciBiYWNrdXBzID0gW107XG5cbiAgICBmb3IgKGxldCBpZCBpbiB0aGlzLnNuYXBzaG90cykge1xuICAgICAgICBiYWNrdXBzLnB1c2goe2lkOiBpZCwgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tpZF19KTtcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGJhY2t1cHMpO1xuXG4gICAgcmV0dXJuIGJhY2t1cHM7XG59O1xuXG4vLyBMaXN0cyBhdmFpbGFibGUgQmFja3Vwc1xuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVCYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgYmFja3VwSUQgPSBudWxsO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgbGV0IHJlc3VsdCA9IGZhbHNlO1xuICAgIFxuICAgIGlmIChiYWNrdXBJRCkge1xuICAgICAgICBkZWxldGUgdGhpcy5zbmFwc2hvdHNbXy50b1N0cmluZyhiYWNrdXBJRCldO1xuICAgICAgICBcbiAgICAgICAgcmVzdWx0ID0gYmFja3VwSUQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zbmFwc2hvdHMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgfVxuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8vIFJlc3RvcmUgdGhlIHNuYXBzaG90LiBJZiBubyBzbmFwc2hvdCBleGlzdHMsIHJhaXNlIGFuIGV4Y2VwdGlvbjtcbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVzdG9yZSA9IGZ1bmN0aW9uIChiYWNrdXBJRCwgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGJhY2t1cElEKSkge1xuICAgICAgICBjYWxsYmFjayA9IGJhY2t1cElEO1xuICAgICAgICBiYWNrdXBJRCA9IG51bGw7XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICB2YXIgc25hcHNob3RDb3VudCA9IE9iamVjdC5zaXplKHRoaXMuc25hcHNob3RzKTtcbiAgICB2YXIgYmFja3VwRGF0YSA9IG51bGw7XG5cbiAgICBpZiAoc25hcHNob3RDb3VudCA9PT0gMCkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJUaGVyZSBpcyBubyBzbmFwc2hvdHNcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFiYWNrdXBJRCkge1xuICAgICAgICAgICAgaWYgKHNuYXBzaG90Q291bnQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhcIk5vIGJhY2t1cElEIHBhc3NlZC4gUmVzdG9yaW5nIHRoZSBvbmx5IHNuYXBzaG90XCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJldHJpZXZlIHRoZSBvbmx5IHNuYXBzaG90XG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHRoaXMuc25hcHNob3RzKSBiYWNrdXBJRCA9IGtleTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVGhlIGFyZSBzZXZlcmFsIHNuYXBzaG90cy4gUGxlYXNlIHNwZWNpZnkgb25lIGJhY2t1cElEXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGJhY2t1cERhdGEgPSB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF07XG4gICAgICAgICAgICBcbiAgICBpZiAoIWJhY2t1cERhdGEpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KGBVbmtub3duIEJhY2t1cCBJRDogJHtiYWNrdXBJRH1gKTtcbiAgICB9XG5cbiAgICB0aGlzLmRvY3MgPSBiYWNrdXBEYXRhO1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3Jlc3RvcmUnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgYmFja3VwSUQ6IGJhY2t1cElEXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDYWxjdWxhdGVzIGFnZ3JlZ2F0ZSB2YWx1ZXMgZm9yIHRoZSBkYXRhIGluIGEgY29sbGVjdGlvblxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jYWdncmVnYXRlXG4gKiBcbiAqIEBwYXJhbSB7QXJyYXl9IHBpcGVsaW5lIC0gQSBzZXF1ZW5jZSBvZiBkYXRhIGFnZ3JlZ2F0aW9uIG9wZXJhdGlvbnMgb3Igc3RhZ2VzXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuZm9yY2VGZXRjaD1mYWxzZV0gLSBJZiBzZXQgdG8nXCJ0cnVlXCIgcmV0dXJucyB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzIGFscmVhZHkgZmV0Y2hlZFxuICogXG4gKiBAcmV0dXJucyB7QXJyYXl8Q3Vyc29yfSBJZiBcIm9wdGlvbnMuZm9yY2VGZXRjaFwiIHNldCB0byB0cnVlIHJldHVybnMgdGhlIGFycmF5IG9mIGRvY3VtZW50cywgb3RoZXJ3aXNlIHJldHVybnMgYSBjdXJzb3JcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuYWdncmVnYXRlID0gZnVuY3Rpb24ocGlwZWxpbmUsIG9wdGlvbnMgPSB7IGZvcmNlRmV0Y2g6IGZhbHNlIH0pIHtcbiAgICBpZiAoXy5pc05pbChwaXBlbGluZSkgfHwgIV8uaXNBcnJheShwaXBlbGluZSkpIGxvZ2dlci50aHJvdygnVGhlIFwicGlwZWxpbmVcIiBwYXJhbSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgXG4gICAgdmFyIGFnZ3JlZ2F0aW9uID0gbmV3IEFnZ3JlZ2F0aW9uKHBpcGVsaW5lKTtcbiAgICBcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBpcGVsaW5lLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBzdGFnZSA9IHBpcGVsaW5lW2ldO1xuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHN0YWdlKSB7XG4gICAgICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSAhPT0gJyQnKSBsb2dnZXIudGhyb3coXCJUaGUgcGlwZWxpbmUgc3RhZ2VzIG11c3QgYmVnaW4gd2l0aCAnJCdcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghYWdncmVnYXRpb24udmFsaWRTdGFnZShrZXkpKSBsb2dnZXIudGhyb3coYEludmFsaWQgc3RhZ2UgXCIke2tleX1cImApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICB2YXIgcmVzdWx0ID0gYWdncmVnYXRpb24uYWdncmVnYXRlKHRoaXMpO1xuICAgIFxuICAgIHJldHVybiByZXN1bHQ7ICAvLyBjaGFuZ2UgdG8gY3Vyc29yXG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24uX25vQ3JlYXRlTW9kaWZpZXJzID0ge1xuICAgICR1bnNldDogdHJ1ZSxcbiAgICAkcG9wOiB0cnVlLFxuICAgICRyZW5hbWU6IHRydWUsXG4gICAgJHB1bGw6IHRydWUsXG4gICAgJHB1bGxBbGw6IHRydWVcbn07XG5cbi8qKlxuKiBAaWdub3JlXG4qL1xudmFyIF9tb2RpZmllcnMgPSB7XG4gICAgJGluYzogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoIV8uaXNOdW1iZXIoYXJnKSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiTW9kaWZpZXIgJGluYyBhbGxvd2VkIGZvciBudW1iZXJzIG9ubHlcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICAgICAgICBpZiAoIV8uaXNOdW1iZXIodGFyZ2V0W2ZpZWxkXSkpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJGluYyBtb2RpZmllciB0byBub24tbnVtYmVyXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdICs9IGFyZztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHNldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICB0YXJnZXRbZmllbGRdID0gXy5jbG9uZURlZXAoYXJnKTtcbiAgICB9LFxuXG4gICAgJHVuc2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmICghXy5pc05pbCh0YXJnZXQpKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1c2g6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmIChfLmlzTmlsKHgpKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gW2FyZ107XG4gICAgICAgIH0gZWxzZSBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwdXNoIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHgucHVzaChfLmNsb25lRGVlcChhcmcpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVzaEFsbDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKF8uaXNOaWwoeCkpIHtcbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgICAgIH0gZWxzZSBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJnLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgeC5wdXNoKGFyZ1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJGFkZFRvU2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFthcmddO1xuICAgICAgICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkYWRkVG9TZXQgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGlzRWFjaCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKF8uaXNQbGFpbk9iamVjdChhcmcpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayBpbiBhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGsgPT09IFwiJGVhY2hcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNFYWNoID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgdmFsdWVzID0gaXNFYWNoID8gYXJnW1wiJGVhY2hcIl0gOiBbYXJnXTtcbiAgICAgICAgICAgIF8uZm9yRWFjaCh2YWx1ZXMsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoU2VsZWN0b3JNYXRjaGVyLmVxdWFsKHZhbHVlLCB4W2ldKSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHgucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcG9wOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkgfHwgXy5pc05pbCh0YXJnZXRbZmllbGRdKSkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwb3AgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKF8uaXNOdW1iZXIoYXJnKSAmJiBhcmcgPCAwKSB7XG4gICAgICAgICAgICAgICAgeC5zcGxpY2UoMCwgMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHgucG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1bGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwodGFyZ2V0KSB8fCBfLmlzTmlsKHRhcmdldFtmaWVsZF0pKSByZXR1cm47XG5cbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJHB1bGwvcHVsbEFsbCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgb3V0ID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiICYmICEoYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgLy8gWFhYIHdvdWxkIGJlIG11Y2ggbmljZXIgdG8gY29tcGlsZSB0aGlzIG9uY2UsIHJhdGhlciB0aGFuXG4gICAgICAgICAgICAgICAgLy8gZm9yIGVhY2ggZG9jdW1lbnQgd2UgbW9kaWZ5Li4gYnV0IHVzdWFsbHkgd2UncmUgbm90XG4gICAgICAgICAgICAgICAgLy8gbW9kaWZ5aW5nIHRoYXQgbWFueSBkb2N1bWVudHMsIHNvIHdlJ2xsIGxldCBpdCBzbGlkZSBmb3JcbiAgICAgICAgICAgICAgICAvLyBub3dcblxuICAgICAgICAgICAgICAgIC8vIFhYWCBfY29tcGlsZVNlbGVjdG9yIGlzbid0IHVwIGZvciB0aGUgam9iLCBiZWNhdXNlIHdlIG5lZWRcbiAgICAgICAgICAgICAgICAvLyB0byBwZXJtaXQgc3R1ZmYgbGlrZSB7JHB1bGw6IHthOiB7JGd0OiA0fX19Li4gc29tZXRoaW5nXG4gICAgICAgICAgICAgICAgLy8gbGlrZSB7JGd0OiA0fSBpcyBub3Qgbm9ybWFsbHkgYSBjb21wbGV0ZSBzZWxlY3Rvci5cbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2ggPSBuZXcgU2VsZWN0b3Ioe1xuICAgICAgICAgICAgICAgICAgICBcIl9fbWF0Y2hpbmdfX1wiOiBhcmdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kb2NfID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgX19tYXRjaGluZ19fOiB4W2ldXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2gudGVzdChfZG9jXykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFTZWxlY3Rvck1hdGNoZXIuZXF1YWwoeFtpXSwgYXJnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBvdXQ7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1bGxBbGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwodGFyZ2V0KSB8fCBfLmlzTmlsKHRhcmdldFtmaWVsZF0pKSByZXR1cm47XG5cbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmICghXy5pc05pbCh4KSAmJiAhXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJNb2RpZmllciAkcHVzaEFsbC9wdWxsQWxsIGFsbG93ZWQgZm9yIGFycmF5cyBvbmx5XCIpO1xuICAgICAgICB9IGVsc2UgaWYgKCFfLmlzTmlsKHgpKSB7XG4gICAgICAgICAgICB2YXIgb3V0ID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBleGNsdWRlID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGFyZy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoU2VsZWN0b3JNYXRjaGVyLmVxdWFsKHhbaV0sIGFyZ1tqXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghZXhjbHVkZSkge1xuICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCh4W2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBvdXQ7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHJlbmFtZTogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIHZhbHVlKSB7XG4gICAgICAgIGlmIChmaWVsZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIG5vIGlkZWEgd2h5IG1vbmdvIGhhcyB0aGlzIHJlc3RyaWN0aW9uLi5cbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIlRoZSBuZXcgZmllbGQgbmFtZSBtdXN0IGJlIGRpZmZlcmVudFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghXy5pc1N0cmluZyh2YWx1ZSkgfHwgdmFsdWUudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVGhlIG5ldyBuYW1lIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGFyZ2V0W3ZhbHVlXSA9IHRhcmdldFtmaWVsZF07XG4gICAgICAgIGRlbGV0ZSB0YXJnZXRbZmllbGRdO1xuICAgIH0sXG5cbiAgICAkYml0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIC8vIFhYWCBtb25nbyBvbmx5IHN1cHBvcnRzICRiaXQgb24gaW50ZWdlcnMsIGFuZCB3ZSBvbmx5IHN1cHBvcnRcbiAgICAgICAgLy8gbmF0aXZlIGphdmFzY3JpcHQgbnVtYmVycyAoZG91Ymxlcykgc28gZmFyLCBzbyB3ZSBjYW4ndCBzdXBwb3J0ICRiaXRcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiJGJpdCBpcyBub3Qgc3VwcG9ydGVkXCIpO1xuICAgIH1cbn07XG5cbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUpIHtcbiAgICBpZiAoIV8uaXNTdHJpbmcoY29sbGVjdGlvbk5hbWUpKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZSBtdXN0IGJlIGEgU3RyaW5nXCIpO1xuICAgIH1cblxuICAgIGlmICghY29sbGVjdGlvbk5hbWUgfHwgY29sbGVjdGlvbk5hbWUuaW5kZXhPZignLi4nKSAhPT0gLTEpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBjYW5ub3QgYmUgZW1wdHlcIik7XG4gICAgfVxuXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLmluZGV4T2YoJyQnKSAhPT0gLTEgJiYgY29sbGVjdGlvbk5hbWUubWF0Y2goLygoXlxcJGNtZCl8KG9wbG9nXFwuXFwkbWFpbikpLykgPT09IG51bGwpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBjb250YWluICckJ1wiKTtcbiAgICB9XG5cbiAgICBpZiAoY29sbGVjdGlvbk5hbWUubWF0Y2goL15zeXN0ZW1cXC4vKSAhPT0gbnVsbCkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IHN0YXJ0IHdpdGggJ3N5c3RlbS4nIChyZXNlcnZlZCBmb3IgaW50ZXJuYWwgdXNlKVwiKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLm1hdGNoKC9eXFwufFxcLiQvKSAhPT0gbnVsbCkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IHN0YXJ0IG9yIGVuZCB3aXRoICcuJ1wiKTtcbiAgICB9XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbmFtZSA9IGZ1bmN0aW9uKG5ld05hbWUpIHtcbiAgICBpZiAoXy5pc1N0cmluZyhuZXdOYW1lKSkge1xuICAgICAgICBpZiAodGhpcy5uYW1lICE9PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUobmV3TmFtZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBkYk5hbWUgPSB0aGlzLm5hbWUuc3BsaXQoJy4nKS5sZW5ndGggPiAxID8gdGhpcy5uYW1lLnNwbGl0KCcuJylbMF0gOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5uYW1lID0gbmV3TmFtZTtcbiAgICAgICAgICAgIHRoaXMuZnVsbE5hbWUgPSBkYk5hbWUgKyAnLicgKyB0aGlzLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRXJyb3JcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb247XG5cbi8qKlxuICogR2V0cyB0aGUgc2l6ZSBvZiBhbiBvYmplY3QuXG4gKiBcbiAqIEBtZXRob2QgT2JqZWN0I3NpemVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBvYmplY3RcbiAqIFxuICogQHJldHVybnMge051bWJlcn0gVGhlIHNpemUgb2YgdGhlIG9iamVjdFxuICovXG5PYmplY3Quc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBzaXplID0gMCwgXG4gICAgICAgIGtleTtcbiAgICBcbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBzaXplKys7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHNpemU7XG59O1xuXG52YXIgX2Vuc3VyZUZpbmRQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAvLyBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2tcbiAgICBpZiAoXy5pc05pbChwYXJhbXMuc2VsZWN0aW9uKSkgcGFyYW1zLnNlbGVjdGlvbiA9IHt9O1xuXG4gICAgaWYgKF8uaXNOaWwocGFyYW1zLnNlbGVjdGlvbikpIHBhcmFtcy5zZWxlY3Rpb24gPSB7fTtcblxuICAgIGlmIChfLmlzTmlsKHBhcmFtcy5maWVsZHMpKSBwYXJhbXMuZmllbGRzID0gW107XG5cbiAgICBpZiAoXy5pc05pbChwYXJhbXMub3B0aW9ucykpIHtcbiAgICAgICAgcGFyYW1zLm9wdGlvbnMgPSB7XG4gICAgICAgICAgICBza2lwOiAwLFxuICAgICAgICAgICAgbGltaXQ6IDE1IC8vIGZvciBubyBsaW1pdCBwYXNzIFtvcHRpb25zLmxpbWl0ID0gLTFdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gY2FsbGJhY2sgYXMgZmlyc3QgcGFyYW1ldGVyXG4gICAgaWYgKF8uaXNGdW5jdGlvbihwYXJhbXMuc2VsZWN0aW9uKSkge1xuICAgICAgICBwYXJhbXMuY2FsbGJhY2sgPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgICAgICBwYXJhbXMuc2VsZWN0aW9uID0ge307XG4gICAgfVxuXG4gICAgLy8gY2FsbGJhY2sgYXMgc2Vjb25kIHBhcmFtZXRlclxuICAgIGlmIChfLmlzRnVuY3Rpb24ocGFyYW1zLmZpZWxkcykpIHtcbiAgICAgICAgcGFyYW1zLmNhbGxiYWNrID0gcGFyYW1zLmZpZWxkcztcbiAgICAgICAgcGFyYW1zLmZpZWxkcyA9IFtdO1xuICAgIH1cblxuICAgIC8vIGNhbGxiYWNrIGFzIHRoaXJkIHBhcmFtZXRlclxuICAgIGlmIChfLmlzRnVuY3Rpb24ocGFyYW1zLm9wdGlvbnMpKSB7XG4gICAgICAgIHBhcmFtcy5jYWxsYmFjayA9IHBhcmFtcy5vcHRpb25zO1xuICAgICAgICBwYXJhbXMub3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZiAocGFyYW1zLnNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgIHBhcmFtcy5zZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHBhcmFtcy5zZWxlY3Rpb25cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNOaWwocGFyYW1zLmNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKHBhcmFtcy5jYWxsYmFjaykpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIH1cblxuICAgIGlmIChwYXJhbXMub3B0aW9ucy5maWVsZHMpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwocGFyYW1zLmZpZWxkcykgfHwgcGFyYW1zLmZpZWxkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHBhcmFtcy5maWVsZHMgPSBwYXJhbXMub3B0aW9ucy5maWVsZHM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIud2FybihcIkZpZWxkcyBhbHJlYWR5IHByZXNlbnQuIElnbm9yaW5nICdvcHRpb25zLmZpZWxkcycuXCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBwYXJhbXM7XG59OyJdfQ==
