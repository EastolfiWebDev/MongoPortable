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
 * @param {Boolean} [options.forceFetch=false] - If set to'"true" returns't"e;array of documents already fetched
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

    // callback for backward compatibility
    var cursor = new Cursor(this.db, this, selection, fields, options);

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

    var cursor = new Cursor(this.db, this, selection, fields, options);

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
//# sourceMappingURL=data:application/json;base64,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LFFBQUksRUFBRSxVQUFGLENBQWEsT0FBTyxPQUFwQixDQUFKLEVBQWtDO0FBQzlCLGVBQU8sUUFBUCxHQUFrQixPQUFPLE9BQXpCO0FBQ0EsZUFBTyxPQUFQLEdBQWlCLEVBQWpCO0FBQ0g7OztBQUdELFFBQUksT0FBTyxTQUFQLFlBQTRCLFFBQWhDLEVBQTBDO0FBQ3RDLGVBQU8sU0FBUCxHQUFtQjtBQUNmLGlCQUFLLE9BQU87QUFERyxTQUFuQjtBQUdIOztBQUVELFFBQUksQ0FBQyxFQUFFLEtBQUYsQ0FBUSxPQUFPLFFBQWYsQ0FBRCxJQUE2QixDQUFDLEVBQUUsVUFBRixDQUFhLE9BQU8sUUFBcEIsQ0FBbEMsRUFBaUU7QUFDN0QsZUFBTyxLQUFQLENBQWEsNkJBQWI7QUFDSDs7QUFFRCxRQUFJLE9BQU8sT0FBUCxDQUFlLE1BQW5CLEVBQTJCO0FBQ3ZCLFlBQUksRUFBRSxLQUFGLENBQVEsT0FBTyxNQUFmLEtBQTBCLE9BQU8sTUFBUCxDQUFjLE1BQWQsS0FBeUIsQ0FBdkQsRUFBMEQ7QUFDdEQsbUJBQU8sTUFBUCxHQUFnQixPQUFPLE9BQVAsQ0FBZSxNQUEvQjtBQUNILFNBRkQsTUFFTztBQUNILG1CQUFPLElBQVAsQ0FBWSxvREFBWjtBQUNIO0FBQ0o7O0FBRUQsV0FBTyxNQUFQO0FBQ0gsQ0FyREQiLCJmaWxlIjoiQ29sbGVjdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgQ29sbGVjdGlvbi5qcyAtIGJhc2VkIG9uIE1vbmdsbyNDb2xsZWN0aW9uICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIExvZ2dlciA9IHJlcXVpcmUoXCJqc3ctbG9nZ2VyXCIpLFxuICAgIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0V2ZW50RW1pdHRlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKSxcbiAgICBDdXJzb3IgPSByZXF1aXJlKFwiLi9DdXJzb3JcIiksXG4gICAgT2JqZWN0SWQgPSByZXF1aXJlKCcuL09iamVjdElkJyksXG4gICAgU2VsZWN0b3IgPSByZXF1aXJlKFwiLi9TZWxlY3RvclwiKSxcbiAgICBTZWxlY3Rvck1hdGNoZXIgPSByZXF1aXJlKFwiLi9TZWxlY3Rvck1hdGNoZXJcIik7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcbiAgICBcbi8qKlxuICogQ29sbGVjdGlvblxuICogXG4gKiBAbW9kdWxlIENvbGxlY3Rpb25cbiAqIEBjb25zdHJ1Y3RvclxuICogQHNpbmNlIDAuMC4xXG4gKiBcbiAqIEBjbGFzc2Rlc2MgQ29sbGVjdGlvbiBjbGFzcyB0aGF0IG1hcHMgYSBNb25nb0RCLWxpa2UgY29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0ge01vbmdvUG9ydGFibGV9IGRiIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIERhdGFiYXNlIG9iamVjdFxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMucGtGYWN0b3J5PW51bGxdIC0gT2JqZWN0IG92ZXJyaWRpbmcgdGhlIGJhc2ljIFwiT2JqZWN0SWRcIiBwcmltYXJ5IGtleSBnZW5lcmF0aW9uLlxuICogXG4gKi9cbnZhciBkYXRhYmFzZSA9IG51bGw7XG5jbGFzcyBDb2xsZWN0aW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbi8vIHZhciBDb2xsZWN0aW9uID0gZnVuY3Rpb24oZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKSB7XG4gICAgY29uc3RydWN0b3IoZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQ29sbGVjdGlvbikpIHJldHVybiBuZXcgQ29sbGVjdGlvbihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgIFxuICAgICAgICBpZiAoXy5pc05pbChkYikpIGxvZ2dlci50aHJvdyhcImRiIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGNvbGxlY3Rpb25OYW1lKSkgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbk5hbWUgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwob3B0aW9ucykgfHwgIV8uaXNQbGFpbk9iamVjdChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBcbiAgICAgICAgLy8gdGhpcy5kYiA9IGRiO1xuICAgICAgICBkYXRhYmFzZSA9IGRiO1xuICAgICAgICB0aGlzLm5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICAgICAgdGhpcy5kYXRhYmFzZU5hbWUgPSBkYi5kYXRhYmFzZU5hbWU7XG4gICAgICAgIHRoaXMuZnVsbE5hbWUgPSB0aGlzLmRhdGFiYXNlTmFtZSArICcuJyArIHRoaXMubmFtZTtcbiAgICAgICAgdGhpcy5kb2NzID0gW107XG4gICAgICAgIHRoaXMuZG9jX2luZGV4ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5zbmFwc2hvdHMgPSBbXTtcbiAgICAgICAgdGhpcy5vcHRzID0ge307IC8vIERlZmF1bHQgb3B0aW9uc1xuICAgICAgICBcbiAgICAgICAgXy5tZXJnZSh0aGlzLm9wdHMsIG9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGhpcy5lbWl0ID0gZGIuZW1pdDtcbiAgICB9XG4gICAgXG4gICAgZW1pdChuYW1lLCBhcmdzLCBjYikge1xuICAgICAgICBzdXBlci5lbWl0KG5hbWUsIGFyZ3MsIGNiLCBkYXRhYmFzZS5fc3RvcmVzKTtcbiAgICB9XG59XG5cbi8vIFRPRE8gZW5mb3JjZSBydWxlIHRoYXQgZmllbGQgbmFtZXMgY2FuJ3Qgc3RhcnQgd2l0aCAnJCcgb3IgY29udGFpbiAnLidcbi8vIChyZWFsIG1vbmdvZGIgZG9lcyBpbiBmYWN0IGVuZm9yY2UgdGhpcylcbi8vIFRPRE8gcG9zc2libHkgZW5mb3JjZSB0aGF0ICd1bmRlZmluZWQnIGRvZXMgbm90IGFwcGVhciAod2UgYXNzdW1lXG4vLyB0aGlzIGluIG91ciBoYW5kbGluZyBvZiBudWxsIGFuZCAkZXhpc3RzKVxuLyoqXG4gKiBJbnNlcnRzIGEgZG9jdW1lbnQgaW50byB0aGUgY29sbGVjdGlvblxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jaW5zZXJ0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBEb2N1bWVudCB0byBiZSBpbnNlcnRlZFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNoYWluPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fENvbGxlY3Rpb259IElmIFwib3B0aW9ucy5jaGFpblwiIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBpbnNlcnRlZCBkb2N1bWVudFxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoZG9jLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGRvYykpIGxvZ2dlci50aHJvdyhcImRvYyBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgXG4gICAgaWYgKCFfLmlzUGxhaW5PYmplY3QoZG9jKSkgbG9nZ2VyLnRocm93KFwiZG9jIG11c3QgYmUgYW4gb2JqZWN0XCIpO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIC8vIENyZWF0aW5nIGEgc2FmZSBjb3B5IG9mIHRoZSBkb2N1bWVudFxuICAgIHZhciBfZG9jID0gXy5jbG9uZURlZXAoZG9jKTtcblxuICAgIC8vIElmIHRoZSBkb2N1bWVudCBjb21lcyB3aXRoIGEgbnVtYmVyIElELCBwYXJzZSBpdCB0byBTdHJpbmdcbiAgICBpZiAoXy5pc051bWJlcihfZG9jLl9pZCkpIHtcbiAgICAgICAgX2RvYy5faWQgPSBfLnRvU3RyaW5nKF9kb2MuX2lkKTtcbiAgICB9XG5cbiAgICBpZiAoXy5pc05pbChfZG9jLl9pZCkgfHwgKCFfZG9jLl9pZCBpbnN0YW5jZW9mIE9iamVjdElkICYmICghXy5pc1N0cmluZyhfZG9jLl9pZCkgfHwgIV9kb2MuX2lkLmxlbmd0aCkpKSB7XG4gICAgICAgIF9kb2MuX2lkID0gbmV3IE9iamVjdElkKCk7XG4gICAgfVxuXG4gICAgLy8gQWRkIG9wdGlvbnMgdG8gbW9yZSBkYXRlc1xuICAgIF9kb2MudGltZXN0YW1wID0gbmV3IE9iamVjdElkKCkuZ2VuZXJhdGlvblRpbWU7XG4gICAgXG4gICAgLy8gUmV2ZXJzZVxuICAgIHRoaXMuZG9jX2luZGV4ZXNbXy50b1N0cmluZyhfZG9jLl9pZCldID0gdGhpcy5kb2NzLmxlbmd0aDtcbiAgICB0aGlzLmRvY3MucHVzaChfZG9jKTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBcImluc2VydFwiIGV2ZW50LlxuICAgICAqXG4gICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+aW5zZXJ0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgZG9jdW1lbnQgaW5zZXJ0ZWRcbiAgICAgKi9cbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdpbnNlcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgZG9jOiBfZG9jXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBfZG9jKTtcblxuICAgIGlmIChvcHRpb25zLmNoYWluKSByZXR1cm4gdGhpcztcbiAgICBcbiAgICByZXR1cm4gX2RvYztcbn07XG5cbi8qKlxuICogRmluZHMgYWxsIG1hdGNoaW5nIGRvY3VtZW50c1xuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZFxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5saW1pdF0gLSBNYXggbnVtYmVyIG9mIGRvY3VtZW50cyB0byBkaXNwbGF5XG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuZm9yY2VGZXRjaD1mYWxzZV0gLSBJZiBzZXQgdG8nXCJ0cnVlXCIgcmV0dXJucyd0XCJlO2FycmF5IG9mIGRvY3VtZW50cyBhbHJlYWR5IGZldGNoZWRcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7QXJyYXl8Q3Vyc29yfSBJZiBcIm9wdGlvbnMuZm9yY2VGZXRjaFwiIHNldCB0byB0cnVlIHJldHVybnMgdGhlIGFycmF5IG9mIGRvY3VtZW50cywgb3RoZXJ3aXNlIHJldHVybnMgYSBjdXJzb3JcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBsZXQgcGFyYW1zID0gX2Vuc3VyZUZpbmRQYXJhbXMoe1xuICAgICAgICBzZWxlY3Rpb246IHNlbGVjdGlvbiwgXG4gICAgICAgIGZpZWxkczogZmllbGRzLFxuICAgICAgICBvcHRpb25zOiBvcHRpb25zLCBcbiAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG4gICAgfSk7XG4gICAgXG4gICAgc2VsZWN0aW9uID0gcGFyYW1zLnNlbGVjdGlvbjtcbiAgICBmaWVsZHMgPSBwYXJhbXMuZmllbGRzO1xuICAgIG9wdGlvbnMgPSBwYXJhbXMub3B0aW9ucztcbiAgICBjYWxsYmFjayA9IHBhcmFtcy5jYWxsYmFjaztcbiAgICBcbiAgICAvLyBjYWxsYmFjayBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgIHZhciBjdXJzb3IgPSBuZXcgQ3Vyc29yKHRoaXMuZGIsIHRoaXMsIHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zKTtcblxuICAgIC8qKlxuICAgICAqIFwiZmluZFwiIGV2ZW50LlxuICAgICAqXG4gICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+ZmluZFxuICAgICAqIFxuICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb2xsZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbGxlY3Rpb25cbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gc2VsZWN0b3IgLSBUaGUgc2VsZWN0aW9uIG9mIHRoZSBxdWVyeVxuICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIHNob3dlZCBpbiB0aGUgcXVlcnlcbiAgICAgKi9cbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdmaW5kJyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICBmaWVsZHM6IGZpZWxkc1xuICAgICAgICB9XG4gICAgKTtcbiAgICBcbiAgICAvLyBQYXNzIHRoZSBjdXJzb3IgZmV0Y2hlZCB0byB0aGUgY2FsbGJhY2tcbiAgICAvLyBBZGQgW29wdGlvbnMubm9GZXRjaENhbGxiYWNrID0gdHJ1ZV1cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGN1cnNvci5mZXRjaCgpKTtcblxuICAgIGlmIChvcHRpb25zLmZvcmNlRmV0Y2gpIHtcbiAgICAgICAgcmV0dXJuIGN1cnNvci5mZXRjaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjdXJzb3I7XG4gICAgfVxufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgZmlyc3QgbWF0Y2hpbmcgZG9jdW1lbnRcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI2ZpbmRPbmVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbZmllbGRzPXt9XSAtIFRoZSBmaWVsZHMgb2YgdGhlIGRvY3VtZW50IHRvIHNob3dcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnNraXBdIC0gTnVtYmVyIG9mIGRvY3VtZW50cyB0byBiZSBza2lwcGVkXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubGltaXRdIC0gTWF4IG51bWJlciBvZiBkb2N1bWVudHMgdG8gZGlzcGxheVxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbb3B0aW9ucy5maWVsZHNdIC0gU2FtZSBhcyBcImZpZWxkc1wiIHBhcmFtZXRlciAoaWYgYm90aCBwYXNzZWQsIFwib3B0aW9ucy5maWVsZHNcIiB3aWxsIGJlIGlnbm9yZWQpXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgZmlyc3QgbWF0Y2hpbmcgZG9jdW1lbnQgb2YgdGhlIGNvbGxlY3Rpb25cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZmluZE9uZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBsZXQgcGFyYW1zID0gX2Vuc3VyZUZpbmRQYXJhbXMoe1xuICAgICAgICBzZWxlY3Rpb246IHNlbGVjdGlvbiwgXG4gICAgICAgIGZpZWxkczogZmllbGRzLFxuICAgICAgICBvcHRpb25zOiBvcHRpb25zLCBcbiAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG4gICAgfSk7XG4gICAgXG4gICAgc2VsZWN0aW9uID0gcGFyYW1zLnNlbGVjdGlvbjtcbiAgICBmaWVsZHMgPSBwYXJhbXMuZmllbGRzO1xuICAgIG9wdGlvbnMgPSBwYXJhbXMub3B0aW9ucztcbiAgICBjYWxsYmFjayA9IHBhcmFtcy5jYWxsYmFjaztcbiAgICBcbiAgICB2YXIgY3Vyc29yID0gbmV3IEN1cnNvcih0aGlzLmRiLCB0aGlzLCBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucyk7XG5cbiAgICAvKipcbiAgICAgKiBcImZpbmRPbmVcIiBldmVudC5cbiAgICAgKlxuICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfmZpbmRPbmVcbiAgICAgKiBcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdGlvbiBvZiB0aGUgcXVlcnlcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBzaG93ZWQgaW4gdGhlIHF1ZXJ5XG4gICAgICovXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnZmluZE9uZScsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgZmllbGRzOiBmaWVsZHNcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgdmFyIHJlcyA9IG51bGw7XG4gICAgXG4gICAgaWYgKGN1cnNvci5oYXNOZXh0KCkpIHtcbiAgICAgICAgcmVzID0gY3Vyc29yLm5leHQoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gUGFzcyB0aGUgY3Vyc29yIGZldGNoZWQgdG8gdGhlIGNhbGxiYWNrXG4gICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgIFxuICAgIHJldHVybiByZXM7XG59O1xuXG5cbi8qKlxuICogVXBkYXRlcyBvbmUgb3IgbWFueSBkb2N1bWVudHNcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI3VwZGF0ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdH0gW3VwZGF0ZT17fV0gLSBUaGUgdXBkYXRlIG9wZXJhdGlvblxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudXBkYXRlQXNNb25nbz10cnVlXSAtIEJ5IGRlZmF1bHQ6IFxuICogICAgICBJZiB0aGUgW3VwZGF0ZV0gb2JqZWN0IGNvbnRhaW5zIHVwZGF0ZSBvcGVyYXRvciBtb2RpZmllcnMsIHN1Y2ggYXMgdGhvc2UgdXNpbmcgdGhlIFwiJHNldFwiIG1vZGlmaWVyLCB0aGVuOlxuICogICAgICAgICAgPHVsPlxuICogICAgICAgICAgICAgIDxsaT5UaGUgW3VwZGF0ZV0gb2JqZWN0IG11c3QgY29udGFpbiBvbmx5IHVwZGF0ZSBvcGVyYXRvciBleHByZXNzaW9uczwvbGk+XG4gKiAgICAgICAgICAgICAgPGxpPlRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgdXBkYXRlcyBvbmx5IHRoZSBjb3JyZXNwb25kaW5nIGZpZWxkcyBpbiB0aGUgZG9jdW1lbnQ8L2xpPlxuICogICAgICAgICAgPHVsPlxuICogICAgICBJZiB0aGUgW3VwZGF0ZV0gb2JqZWN0IGNvbnRhaW5zIG9ubHkgXCJmaWVsZDogdmFsdWVcIiBleHByZXNzaW9ucywgdGhlbjpcbiAqICAgICAgICAgIDx1bD5cbiAqICAgICAgICAgICAgICA8bGk+VGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCByZXBsYWNlcyB0aGUgbWF0Y2hpbmcgZG9jdW1lbnQgd2l0aCB0aGUgW3VwZGF0ZV0gb2JqZWN0LiBUaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIGRvZXMgbm90IHJlcGxhY2UgdGhlIFwiX2lkXCIgdmFsdWU8L2xpPlxuICogICAgICAgICAgICAgIDxsaT5Db2xsZWN0aW9uI3VwZGF0ZSBjYW5ub3QgdXBkYXRlIG11bHRpcGxlIGRvY3VtZW50czwvbGk+XG4gKiAgICAgICAgICA8dWw+XG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5vdmVycmlkZT1mYWxzZV0gLSBSZXBsYWNlcyB0aGUgd2hvbGUgZG9jdW1lbnQgKG9ubHkgYXBsbGllcyB3aGVuIFt1cGRhdGVBc01vbmdvPWZhbHNlXSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy51cHNlcnQ9ZmFsc2VdIC0gQ3JlYXRlcyBhIG5ldyBkb2N1bWVudCB3aGVuIG5vIGRvY3VtZW50IG1hdGNoZXMgdGhlIHF1ZXJ5IGNyaXRlcmlhXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubXVsdGk9ZmFsc2VdIC0gVXBkYXRlcyBtdWx0aXBsZSBkb2N1bWVudHMgdGhhdCBtZWV0IHRoZSBjcml0ZXJpYVxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggdGhlIHVwZGF0ZS9pbnNlcnQgKGlmIHVwc2VydD10cnVlKSBpbmZvcm1hdGlvblxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCB1cGRhdGUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoc2VsZWN0aW9uKSkgc2VsZWN0aW9uID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNOaWwodXBkYXRlKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3Qgc3BlY2lmeSB0aGUgdXBkYXRlIG9wZXJhdGlvblwiKTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkge1xuICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgIGxpbWl0OiAxNSAgIC8vIGZvciBubyBsaW1pdCBwYXNzIFtvcHRpb25zLmxpbWl0ID0gLTFdXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3Qgc3BlY2lmeSB0aGUgdXBkYXRlIG9wZXJhdGlvblwiKTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHVwZGF0ZSkpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHNwZWNpZnkgdGhlIHVwZGF0ZSBvcGVyYXRpb25cIik7XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGFyZSB1c2luZyBhbiBvYmplY3RJZFxuICAgIGlmKHNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgIHNlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgIF9pZDogc2VsZWN0aW9uXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcblxuICAgIHZhciByZXMgPSBudWxsO1xuXG4gICAgdmFyIGRvY3MgPSBudWxsO1xuICAgIGlmIChvcHRpb25zLm11bHRpKSB7XG4gICAgICAgIGRvY3MgPSB0aGlzLmZpbmQoc2VsZWN0aW9uLCBudWxsLCB7IGZvcmNlRmV0Y2g6IHRydWUgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZG9jcyA9IHRoaXMuZmluZE9uZShzZWxlY3Rpb24pO1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc05pbChkb2NzKSkge1xuICAgICAgICBkb2NzID0gW107XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc0FycmF5KGRvY3MpKSB7XG4gICAgICAgIGRvY3MgPSBbZG9jc107XG4gICAgfVxuICAgIFxuICAgIGlmIChkb2NzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBpZiAob3B0aW9ucy51cHNlcnQpIHtcbiAgICAgICAgICAgIHZhciBpbnNlcnRlZCA9IHRoaXMuaW5zZXJ0KHVwZGF0ZSk7XG5cbiAgICAgICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogW2luc2VydGVkXSxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDFcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gZG9jdW1lbnRzIGZvdW5kXG4gICAgICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB1cGRhdGVkRG9jcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb2NzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZG9jID0gZG9jc1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG92ZXJyaWRlID0gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGhhc01vZGlmaWVyID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJRTcgZG9lc24ndCBzdXBwb3J0IGluZGV4aW5nIGludG8gc3RyaW5ncyAoZWcsIGtleVswXSBvciBrZXkuaW5kZXhPZignJCcpICksIHNvIHVzZSBzdWJzdHIuXG4gICAgICAgICAgICAgICAgLy8gVGVzdGluZyBvdmVyIHRoZSBmaXJzdCBsZXR0ZXI6XG4gICAgICAgICAgICAgICAgLy8gICAgICBCZXN0cyByZXN1bHQgd2l0aCAxZTggbG9vcHMgPT4ga2V5WzBdKH4zcykgPiBzdWJzdHIofjVzKSA+IHJlZ2V4cCh+NnMpID4gaW5kZXhPZih+MTZzKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBtb2RpZmllciA9IChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpO1xuICAgICAgICAgICAgICAgIGlmIChtb2RpZmllcikge1xuICAgICAgICAgICAgICAgICAgICBoYXNNb2RpZmllciA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnVwZGF0ZUFzTW9uZ28pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc01vZGlmaWVyICYmICFtb2RpZmllcikgbG9nZ2VyLnRocm93KFwiQWxsIHVwZGF0ZSBmaWVsZHMgbXVzdCBiZSBhbiB1cGRhdGUgb3BlcmF0b3JcIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc01vZGlmaWVyICYmIG9wdGlvbnMubXVsdGkpIGxvZ2dlci50aHJvdyhcIllvdSBjYW4gbm90IHVwZGF0ZSBzZXZlcmFsIGRvY3VtZW50cyB3aGVuIG5vIHVwZGF0ZSBvcGVyYXRvcnMgYXJlIGluY2x1ZGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc01vZGlmaWVyKSBvdmVycmlkZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNNb2RpZmllcikgb3ZlcnJpZGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJyaWRlID0gISFvcHRpb25zLm92ZXJyaWRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIF9kb2NVcGRhdGUgPSBudWxsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAob3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBPdmVycmlkZXMgdGhlIGRvY3VtZW50IGV4Y2VwdCBmb3IgdGhlIFwiX2lkXCJcbiAgICAgICAgICAgICAgICBfZG9jVXBkYXRlID0ge1xuICAgICAgICAgICAgICAgICAgICBfaWQ6IGRvYy5faWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE11c3QgaWdub3JlIGZpZWxkcyBzdGFydGluZyB3aXRoICckJywgJy4nLi4uXG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnIHx8IC9cXC4vZy50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBUaGUgZmllbGQgJHtrZXl9IGNhbiBub3QgYmVnaW4gd2l0aCAnJCcgb3IgY29udGFpbiAnLidgKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGVba2V5XSA9IHVwZGF0ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfZG9jVXBkYXRlID0gXy5jbG9uZURlZXAoZG9jKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWwgPSB1cGRhdGVba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSBfYXBwbHlNb2RpZmllcihfZG9jVXBkYXRlLCBrZXksIHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaXNOaWwoX2RvY1VwZGF0ZVtrZXldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihcIlRoZSBmaWVsZCAnX2lkJyBjYW4gbm90IGJlIHVwZGF0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgVGhlIGRvY3VtZW50IGRvZXMgbm90IGNvbnRhaW5zIHRoZSBmaWVsZCAke2tleX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdXBkYXRlZERvY3MucHVzaChfZG9jVXBkYXRlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGlkeCA9IHRoaXMuZG9jX2luZGV4ZXNbX2RvY1VwZGF0ZS5faWRdO1xuICAgICAgICAgICAgdGhpcy5kb2NzW2lkeF0gPSBfZG9jVXBkYXRlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogXCJ1cGRhdGVcIiBldmVudC5cbiAgICAgICAgICpcbiAgICAgICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+dXBkYXRlXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzZWxlY3RvciAtIFRoZSBzZWxlY3Rpb24gb2YgdGhlIHF1ZXJ5XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBtb2RpZmllciAtIFRoZSBtb2RpZmllciB1c2VkIGluIHRoZSBxdWVyeVxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZG9jcyAtIFRoZSB1cGRhdGVkL2luc2VydGVkIGRvY3VtZW50cyBpbmZvcm1hdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgJ3VwZGF0ZScsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgIG1vZGlmaWVyOiB1cGRhdGUsXG4gICAgICAgICAgICAgICAgZG9jczogdXBkYXRlZERvY3NcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgIHVwZGF0ZWQ6IHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudHM6IHVwZGF0ZWREb2NzLFxuICAgICAgICAgICAgICAgIGNvdW50OiB1cGRhdGVkRG9jcy5sZW5ndGhcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBcbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlcyk7XG4gICAgXG4gICAgcmV0dXJuIHJlcztcbn07XG5cbnZhciBfYXBwbHlNb2RpZmllciA9IGZ1bmN0aW9uKF9kb2NVcGRhdGUsIGtleSwgdmFsKSB7XG4gICAgdmFyIGRvYyA9IF8uY2xvbmVEZWVwKF9kb2NVcGRhdGUpO1xuICAgIC8vIHZhciBtb2QgPSBfbW9kaWZpZXJzW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBpZiAoIV9tb2RpZmllcnNba2V5XSkge1xuICAgICAgICBsb2dnZXIudGhyb3coYEludmFsaWQgbW9kaWZpZXIgc3BlY2lmaWVkOiAke2tleX1gKTtcbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIga2V5cGF0aCBpbiB2YWwpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdmFsW2tleXBhdGhdO1xuICAgICAgICB2YXIga2V5cGFydHMgPSBrZXlwYXRoLnNwbGl0KCcuJyk7XG4gICAgICAgIFxuICAgICAgICBfbW9kaWZ5KGRvYywga2V5cGFydHMsIHZhbHVlLCBrZXkpO1xuICAgICAgICBcbiAgICAgICAgLy8gdmFyIG5vX2NyZWF0ZSA9ICEhQ29sbGVjdGlvbi5fbm9DcmVhdGVNb2RpZmllcnNba2V5XTtcbiAgICAgICAgLy8gdmFyIGZvcmJpZF9hcnJheSA9IChrZXkgPT09IFwiJHJlbmFtZVwiKTtcbiAgICAgICAgLy8gdmFyIHRhcmdldCA9IENvbGxlY3Rpb24uX2ZpbmRNb2RUYXJnZXQoX2RvY1VwZGF0ZSwga2V5cGFydHMsIG5vX2NyZWF0ZSwgZm9yYmlkX2FycmF5KTtcbiAgICAgICAgLy8gdmFyIGZpZWxkID0ga2V5cGFydHMucG9wKCk7XG5cbiAgICAgICAgLy8gbW9kKHRhcmdldCwgZmllbGQsIHZhbHVlLCBrZXlwYXRoLCBfZG9jVXBkYXRlKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGRvYztcbn07XG5cbnZhciBfbW9kaWZ5ID0gZnVuY3Rpb24oZG9jdW1lbnQsIGtleXBhcnRzLCB2YWx1ZSwga2V5LCBsZXZlbCA9IDApIHtcbiAgICBmb3IgKGxldCBpID0gbGV2ZWw7IGkgPCBrZXlwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgcGF0aCA9IGtleXBhcnRzW2ldO1xuICAgICAgICBsZXQgaXNOdW1lcmljID0gL15bMC05XSskLy50ZXN0KHBhdGgpO1xuICAgICAgICBsZXQgdGFyZ2V0ID0gZG9jdW1lbnRbcGF0aF07XG4gICAgICAgIFxuICAgICAgICB2YXIgY3JlYXRlID0gXy5oYXNJbihDb2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVycywga2V5KSA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgICAgaWYgKCFjcmVhdGUgJiYgKCFfLmlzT2JqZWN0KGRvY3VtZW50KSB8fCBfLmlzTmlsKHRhcmdldCkpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coYFRoZSBlbGVtZW50IFwiJHtwYXRofVwiIG11c3QgZXhpc3RzIGluIFwiJHtKU09OLnN0cmluZ2lmeShkb2N1bWVudCl9XCJgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNBcnJheShkb2N1bWVudCkpIHtcbiAgICAgICAgICAgIC8vIERvIG5vdCBhbGxvdyAkcmVuYW1lIG9uIGFycmF5c1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCIkcmVuYW1lXCIpIHJldHVybiBudWxsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IGxldCB0aGUgdXNlIG9mIFwiYXJyYXlmaWVsZC48bnVtZXJpY19pbmRleD4uc3ViZmllbGRcIlxuICAgICAgICAgICAgaWYgKGlzTnVtZXJpYykge1xuICAgICAgICAgICAgICAgIHBhdGggPSBfLnRvTnVtYmVyKHBhdGgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coYFRoZSBmaWVsZCBcIiR7cGF0aH1cIiBjYW4gbm90IGJlIGFwcGVuZGVkIHRvIGFuIGFycmF5YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbGwgdGhlIGFycmF5IHRvIHRoZSBkZXNpcmVkIGxlbmd0aFxuICAgICAgICAgICAgd2hpbGUgKGRvY3VtZW50Lmxlbmd0aCA8IHBhdGgpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5wdXNoKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoaSA8IGtleXBhcnRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBhcmUgYWNjZXNzaW5nIHdpdGggXCJhcnJheUZpZWxkLjxudW1lcmljX2luZGV4PlwiXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNGaW5pdGUoXy50b051bWJlcihrZXlwYXJ0c1tpICsgMV0pKSkgeyAgLy8gIHx8IGtleXBhcnRzW2kgKyAxXSA9PT0gJyQnICAvLyBUT0RPIFwiYXJyYXlGaWVsZC4kXCJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0gW107XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkb2N1bWVudFtwYXRoXSA9IF9tb2RpZnkodGFyZ2V0LCBrZXlwYXJ0cywgdmFsdWUsIGtleSwgbGV2ZWwgKyAxKTtcblxuICAgICAgICAgICAgcmV0dXJuIGRvY3VtZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgX21vZGlmaWVyc1trZXldKGRvY3VtZW50LCBwYXRoLCB2YWx1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBvbmUgb3IgbWFueSBkb2N1bWVudHNcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI3JlbW92ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5qdXN0T25lPWZhbHNlXSAtIERlbGV0ZXMgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgdGhlIHNlbGVjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggdGhlIGRlbGV0ZWQgZG9jdW1lbnRzXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoc2VsZWN0aW9uKSkgc2VsZWN0aW9uID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihzZWxlY3Rpb24pKSB7XG4gICAgICAgIGNhbGxiYWNrID0gc2VsZWN0aW9uO1xuICAgICAgICBzZWxlY3Rpb24gPSB7fTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7IGp1c3RPbmU6IGZhbHNlIH07XG4gICAgXG4gICAgLy8gSWYgd2UgYXJlIG5vdCBwYXNzaW5nIGEgc2VsZWN0aW9uIGFuZCB3ZSBhcmUgbm90IHJlbW92aW5nIGp1c3Qgb25lLCBpcyB0aGUgc2FtZSBhcyBhIGRyb3BcbiAgICBpZiAoT2JqZWN0LnNpemUoc2VsZWN0aW9uKSA9PT0gMCAmJiAhb3B0aW9ucy5qdXN0T25lKSByZXR1cm4gdGhpcy5kcm9wKG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICBcbiAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgaWYoc2VsZWN0aW9uIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgX2lkOiBzZWxlY3Rpb25cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIHZhciBjdXJzb3IgPSB0aGlzLmZpbmQoc2VsZWN0aW9uKTtcbiAgICBcbiAgICB2YXIgZG9jcyA9IFtdO1xuICAgIGN1cnNvci5mb3JFYWNoKGRvYyA9PiB7XG4gICAgICAgIHZhciBpZHggPSB0aGlzLmRvY19pbmRleGVzW2RvYy5faWRdO1xuICAgICAgICBcbiAgICAgICAgZGVsZXRlIHRoaXMuZG9jX2luZGV4ZXNbZG9jLl9pZF07XG4gICAgICAgIHRoaXMuZG9jcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgXG4gICAgICAgIGRvY3MucHVzaChkb2MpO1xuICAgIH0pO1xuICAgIFxuICAgIC8qKlxuICAgICAqIFwicmVtb3ZlXCIgZXZlbnQuXG4gICAgICpcbiAgICAgKiBAZXZlbnQgTW9uZ29Qb3J0YWJsZX5yZW1vdmVcbiAgICAgKiBcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdGlvbiBvZiB0aGUgcXVlcnlcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZG9jcyAtIFRoZSBkZWxldGVkIGRvY3VtZW50cyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3JlbW92ZScsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgZG9jczogZG9jc1xuICAgICAgICB9XG4gICAgKTtcbiAgICBcbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGRvY3MpO1xuICAgIFxuICAgIHJldHVybiBkb2NzO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3Ige0BsaW5rIENvbGxlY3Rpb24jcmVtb3ZlfVxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZGVsZXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMucmVtb3ZlKHNlbGVjdGlvbiwgb3B0aW9ucywgY2FsbGJhY2spO1xufTtcbiBcbiAvKipcbiAqIEFsaWFzIGZvciB7QGxpbmsgQ29sbGVjdGlvbiNyZW1vdmV9XG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNkZXN0cm95XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLnJlbW92ZShzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogRHJvcHMgYSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNkcm9wXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmRyb3BJbmRleGVzPWZhbHNlXSAtIFRydWUgaWYgd2Ugd2FudCB0byBkcm9wIHRoZSBpbmRleGVzIHRvb1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gVHJ1ZSB3aGVuIHRoZSBjb2xsZWN0aW9uIGlzIGRyb3BwZWRcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgdGhpcy5kb2NfaW5kZXhlcyA9IHt9O1xuICAgIHRoaXMuZG9jcyA9IFtdO1xuICAgIFxuICAgIGlmIChvcHRpb25zLmRyb3BJbmRleGVzKSB7fSAvLyBUT0RPXG4gICAgXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnZHJvcENvbGxlY3Rpb24nLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgaW5kZXhlczogISFvcHRpb25zLmRyb3BJbmRleGVzXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgdHJ1ZSk7XG4gICAgXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEluc2VydCBvciB1cGRhdGUgYSBkb2N1bWVudC4gSWYgdGhlIGRvY3VtZW50IGhhcyBhbiBcIl9pZFwiIGlzIGFuIHVwZGF0ZSAod2l0aCB1cHNlcnQpLCBpZiBub3QgaXMgYW4gaW5zZXJ0LlxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jc2F2ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIC0gRG9jdW1lbnQgdG8gYmUgaW5zZXJ0ZWQvdXBkYXRlZFxuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuZHJvcEluZGV4ZXM9ZmFsc2VdIC0gVHJ1ZSBpZiB3ZSB3YW50IHRvIGRyb3AgdGhlIGluZGV4ZXMgdG9vXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUcnVlIHdoZW4gdGhlIGNvbGxlY3Rpb24gaXMgZHJvcHBlZFxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24oZG9jLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGRvYykgfHwgXy5pc0Z1bmN0aW9uKGRvYykpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHBhc3MgYSBkb2N1bWVudFwiKTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGlmIChfLmhhc0luKGRvYywgJ19pZCcpKSB7XG4gICAgICAgIG9wdGlvbnMudXBzZXJ0ID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZShcbiAgICAgICAgICAgIHsgX2lkOiBkb2MuX2lkIH0sXG4gICAgICAgICAgICBkb2MsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnNlcnQoZG9jLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5lbnN1cmVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vVE9ETyBJbXBsZW1lbnQgRW5zdXJlSW5kZXhcbiAgICBsb2dnZXIudGhyb3coJ0NvbGxlY3Rpb24jZW5zdXJlSW5kZXggdW5pbXBsZW1lbnRlZCBieSBkcml2ZXInKTtcbn07XG5cbi8vIFRPRE8gZG9jdW1lbnQgKGF0IHNvbWUgcG9pbnQpXG4vLyBUT0RPIHRlc3Rcbi8vIFRPRE8gb2J2aW91c2x5IHRoaXMgcGFydGljdWxhciBpbXBsZW1lbnRhdGlvbiB3aWxsIG5vdCBiZSB2ZXJ5IGVmZmljaWVudFxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgYmFja3VwSUQgPSBuZXcgT2JqZWN0SWQoKS50b1N0cmluZygpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG5cbiAgICB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF0gPSBfLmNsb25lRGVlcCh0aGlzLmRvY3MpO1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3NuYXBzaG90JyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRCxcbiAgICAgICAgICAgIGRvY3VtZW50czogdGhpcy5zbmFwc2hvdHNbYmFja3VwSURdIFxuICAgICAgICB9XG4gICAgKTtcblxuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRCxcbiAgICAgICAgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF1cbiAgICB9O1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBMaXN0cyBhdmFpbGFibGUgQmFja3Vwc1xuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXBzID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIHZhciBiYWNrdXBzID0gW107XG5cbiAgICBmb3IgKGxldCBpZCBpbiB0aGlzLnNuYXBzaG90cykge1xuICAgICAgICBiYWNrdXBzLnB1c2goe2lkOiBpZCwgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tpZF19KTtcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGJhY2t1cHMpO1xuXG4gICAgcmV0dXJuIGJhY2t1cHM7XG59O1xuXG4vLyBMaXN0cyBhdmFpbGFibGUgQmFja3Vwc1xuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVCYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgYmFja3VwSUQgPSBudWxsO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgbGV0IHJlc3VsdCA9IGZhbHNlO1xuICAgIFxuICAgIGlmIChiYWNrdXBJRCkge1xuICAgICAgICBkZWxldGUgdGhpcy5zbmFwc2hvdHNbXy50b1N0cmluZyhiYWNrdXBJRCldO1xuICAgICAgICBcbiAgICAgICAgcmVzdWx0ID0gYmFja3VwSUQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zbmFwc2hvdHMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgfVxuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8vIFJlc3RvcmUgdGhlIHNuYXBzaG90LiBJZiBubyBzbmFwc2hvdCBleGlzdHMsIHJhaXNlIGFuIGV4Y2VwdGlvbjtcbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVzdG9yZSA9IGZ1bmN0aW9uIChiYWNrdXBJRCwgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGJhY2t1cElEKSkge1xuICAgICAgICBjYWxsYmFjayA9IGJhY2t1cElEO1xuICAgICAgICBiYWNrdXBJRCA9IG51bGw7XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICB2YXIgc25hcHNob3RDb3VudCA9IE9iamVjdC5zaXplKHRoaXMuc25hcHNob3RzKTtcbiAgICB2YXIgYmFja3VwRGF0YSA9IG51bGw7XG5cbiAgICBpZiAoc25hcHNob3RDb3VudCA9PT0gMCkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJUaGVyZSBpcyBubyBzbmFwc2hvdHNcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFiYWNrdXBJRCkge1xuICAgICAgICAgICAgaWYgKHNuYXBzaG90Q291bnQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhcIk5vIGJhY2t1cElEIHBhc3NlZC4gUmVzdG9yaW5nIHRoZSBvbmx5IHNuYXBzaG90XCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJldHJpZXZlIHRoZSBvbmx5IHNuYXBzaG90XG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHRoaXMuc25hcHNob3RzKSBiYWNrdXBJRCA9IGtleTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVGhlIGFyZSBzZXZlcmFsIHNuYXBzaG90cy4gUGxlYXNlIHNwZWNpZnkgb25lIGJhY2t1cElEXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGJhY2t1cERhdGEgPSB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF07XG4gICAgICAgICAgICBcbiAgICBpZiAoIWJhY2t1cERhdGEpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KGBVbmtub3duIEJhY2t1cCBJRDogJHtiYWNrdXBJRH1gKTtcbiAgICB9XG5cbiAgICB0aGlzLmRvY3MgPSBiYWNrdXBEYXRhO1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3Jlc3RvcmUnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgYmFja3VwSUQ6IGJhY2t1cElEXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVycyA9IHtcbiAgICAkdW5zZXQ6IHRydWUsXG4gICAgJHBvcDogdHJ1ZSxcbiAgICAkcmVuYW1lOiB0cnVlLFxuICAgICRwdWxsOiB0cnVlLFxuICAgICRwdWxsQWxsOiB0cnVlXG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbnZhciBfbW9kaWZpZXJzID0ge1xuICAgICRpbmM6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKCFfLmlzTnVtYmVyKGFyZykpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRpbmMgYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgICAgaWYgKCFfLmlzTnVtYmVyKHRhcmdldFtmaWVsZF0pKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRpbmMgbW9kaWZpZXIgdG8gbm9uLW51bWJlclwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSArPSBhcmc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IF8uY2xvbmVEZWVwKGFyZyk7XG4gICAgfSxcblxuICAgICR1bnNldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoIV8uaXNOaWwodGFyZ2V0KSkge1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0YXJnZXRbZmllbGRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdXNoOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFthcmddO1xuICAgICAgICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVzaCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4LnB1c2goXy5jbG9uZURlZXAoYXJnKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1c2hBbGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmIChfLmlzTmlsKHgpKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHgucHVzaChhcmdbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRhZGRUb1NldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKF8uaXNOaWwoeCkpIHtcbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBbYXJnXTtcbiAgICAgICAgfSBlbHNlIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJGFkZFRvU2V0IG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBpc0VhY2ggPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChfLmlzUGxhaW5PYmplY3QoYXJnKSkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgaW4gYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrID09PSBcIiRlYWNoXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzRWFjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHZhbHVlcyA9IGlzRWFjaCA/IGFyZ1tcIiRlYWNoXCJdIDogW2FyZ107XG4gICAgICAgICAgICBfLmZvckVhY2godmFsdWVzLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yTWF0Y2hlci5lcXVhbCh2YWx1ZSwgeFtpXSkpIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB4LnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHBvcDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoXy5pc05pbCh0YXJnZXQpIHx8IF8uaXNOaWwodGFyZ2V0W2ZpZWxkXSkpIHJldHVybjtcblxuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcG9wIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChfLmlzTnVtYmVyKGFyZykgJiYgYXJnIDwgMCkge1xuICAgICAgICAgICAgICAgIHguc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4LnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkgfHwgXy5pc05pbCh0YXJnZXRbZmllbGRdKSkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIiAmJiAhKGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgIC8vIFhYWCB3b3VsZCBiZSBtdWNoIG5pY2VyIHRvIGNvbXBpbGUgdGhpcyBvbmNlLCByYXRoZXIgdGhhblxuICAgICAgICAgICAgICAgIC8vIGZvciBlYWNoIGRvY3VtZW50IHdlIG1vZGlmeS4uIGJ1dCB1c3VhbGx5IHdlJ3JlIG5vdFxuICAgICAgICAgICAgICAgIC8vIG1vZGlmeWluZyB0aGF0IG1hbnkgZG9jdW1lbnRzLCBzbyB3ZSdsbCBsZXQgaXQgc2xpZGUgZm9yXG4gICAgICAgICAgICAgICAgLy8gbm93XG5cbiAgICAgICAgICAgICAgICAvLyBYWFggX2NvbXBpbGVTZWxlY3RvciBpc24ndCB1cCBmb3IgdGhlIGpvYiwgYmVjYXVzZSB3ZSBuZWVkXG4gICAgICAgICAgICAgICAgLy8gdG8gcGVybWl0IHN0dWZmIGxpa2UgeyRwdWxsOiB7YTogeyRndDogNH19fS4uIHNvbWV0aGluZ1xuICAgICAgICAgICAgICAgIC8vIGxpa2UgeyRndDogNH0gaXMgbm90IG5vcm1hbGx5IGEgY29tcGxldGUgc2VsZWN0b3IuXG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoID0gbmV3IFNlbGVjdG9yKHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX21hdGNoaW5nX19cIjogYXJnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBfZG9jXyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9fbWF0Y2hpbmdfXzogeFtpXVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGNoLnRlc3QoX2RvY18pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCh4W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghU2VsZWN0b3JNYXRjaGVyLmVxdWFsKHhbaV0sIGFyZykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdWxsQWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkgfHwgXy5pc05pbCh0YXJnZXRbZmllbGRdKSkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoIV8uaXNOaWwoeCkgJiYgIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seVwiKTtcbiAgICAgICAgfSBlbHNlIGlmICghXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhjbHVkZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBhcmcubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yTWF0Y2hlci5lcXVhbCh4W2ldLCBhcmdbal0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIWV4Y2x1ZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRyZW5hbWU6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCB2YWx1ZSkge1xuICAgICAgICBpZiAoZmllbGQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBubyBpZGVhIHdoeSBtb25nbyBoYXMgdGhpcyByZXN0cmljdGlvbi4uXG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJUaGUgbmV3IGZpZWxkIG5hbWUgbXVzdCBiZSBkaWZmZXJlbnRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIV8uaXNTdHJpbmcodmFsdWUpIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIlRoZSBuZXcgbmFtZSBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZ1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRhcmdldFt2YWx1ZV0gPSB0YXJnZXRbZmllbGRdO1xuICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcbiAgICB9LFxuXG4gICAgJGJpdDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAvLyBYWFggbW9uZ28gb25seSBzdXBwb3J0cyAkYml0IG9uIGludGVnZXJzLCBhbmQgd2Ugb25seSBzdXBwb3J0XG4gICAgICAgIC8vIG5hdGl2ZSBqYXZhc2NyaXB0IG51bWJlcnMgKGRvdWJsZXMpIHNvIGZhciwgc28gd2UgY2FuJ3Qgc3VwcG9ydCAkYml0XG4gICAgICAgIGxvZ2dlci50aHJvdyhcIiRiaXQgaXMgbm90IHN1cHBvcnRlZFwiKTtcbiAgICB9XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24uY2hlY2tDb2xsZWN0aW9uTmFtZSA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lKSB7XG4gICAgaWYgKCFfLmlzU3RyaW5nKGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWUgbXVzdCBiZSBhIFN0cmluZ1wiKTtcbiAgICB9XG5cbiAgICBpZiAoIWNvbGxlY3Rpb25OYW1lIHx8IGNvbGxlY3Rpb25OYW1lLmluZGV4T2YoJy4uJykgIT09IC0xKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgY2Fubm90IGJlIGVtcHR5XCIpO1xuICAgIH1cblxuICAgIGlmIChjb2xsZWN0aW9uTmFtZS5pbmRleE9mKCckJykgIT09IC0xICYmIGNvbGxlY3Rpb25OYW1lLm1hdGNoKC8oKF5cXCRjbWQpfChvcGxvZ1xcLlxcJG1haW4pKS8pID09PSBudWxsKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgbXVzdCBub3QgY29udGFpbiAnJCdcIik7XG4gICAgfVxuXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLm1hdGNoKC9ec3lzdGVtXFwuLykgIT09IG51bGwpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBzdGFydCB3aXRoICdzeXN0ZW0uJyAocmVzZXJ2ZWQgZm9yIGludGVybmFsIHVzZSlcIik7XG4gICAgfVxuICAgIFxuICAgIGlmIChjb2xsZWN0aW9uTmFtZS5tYXRjaCgvXlxcLnxcXC4kLykgIT09IG51bGwpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBzdGFydCBvciBlbmQgd2l0aCAnLidcIik7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW5hbWUgPSBmdW5jdGlvbihuZXdOYW1lKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcobmV3TmFtZSkpIHtcbiAgICAgICAgaWYgKHRoaXMubmFtZSAhPT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKG5ld05hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgZGJOYW1lID0gdGhpcy5uYW1lLnNwbGl0KCcuJykubGVuZ3RoID4gMSA/IHRoaXMubmFtZS5zcGxpdCgnLicpWzBdIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IG5ld05hbWU7XG4gICAgICAgICAgICB0aGlzLmZ1bGxOYW1lID0gZGJOYW1lICsgJy4nICsgdGhpcy5uYW1lO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEVycm9yXG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xsZWN0aW9uO1xuXG4vKipcbiAqIEdldHMgdGhlIHNpemUgb2YgYW4gb2JqZWN0LlxuICogXG4gKiBAbWV0aG9kIE9iamVjdCNzaXplXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgb2JqZWN0XG4gKiBcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBzaXplIG9mIHRoZSBvYmplY3RcbiAqL1xuT2JqZWN0LnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgc2l6ZSA9IDAsIFxuICAgICAgICBrZXk7XG4gICAgXG4gICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBzaXplO1xufTtcblxudmFyIF9lbnN1cmVGaW5kUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgLy8gc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrXG4gICAgaWYgKF8uaXNOaWwocGFyYW1zLnNlbGVjdGlvbikpIHBhcmFtcy5zZWxlY3Rpb24gPSB7fTtcblxuICAgIGlmIChfLmlzTmlsKHBhcmFtcy5zZWxlY3Rpb24pKSBwYXJhbXMuc2VsZWN0aW9uID0ge307XG5cbiAgICBpZiAoXy5pc05pbChwYXJhbXMuZmllbGRzKSkgcGFyYW1zLmZpZWxkcyA9IFtdO1xuXG4gICAgaWYgKF8uaXNOaWwocGFyYW1zLm9wdGlvbnMpKSB7XG4gICAgICAgIHBhcmFtcy5vcHRpb25zID0ge1xuICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgIGxpbWl0OiAxNSAvLyBmb3Igbm8gbGltaXQgcGFzcyBbb3B0aW9ucy5saW1pdCA9IC0xXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIGNhbGxiYWNrIGFzIGZpcnN0IHBhcmFtZXRlclxuICAgIGlmIChfLmlzRnVuY3Rpb24ocGFyYW1zLnNlbGVjdGlvbikpIHtcbiAgICAgICAgcGFyYW1zLmNhbGxiYWNrID0gcGFyYW1zLnNlbGVjdGlvbjtcbiAgICAgICAgcGFyYW1zLnNlbGVjdGlvbiA9IHt9O1xuICAgIH1cblxuICAgIC8vIGNhbGxiYWNrIGFzIHNlY29uZCBwYXJhbWV0ZXJcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5maWVsZHMpKSB7XG4gICAgICAgIHBhcmFtcy5jYWxsYmFjayA9IHBhcmFtcy5maWVsZHM7XG4gICAgICAgIHBhcmFtcy5maWVsZHMgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBjYWxsYmFjayBhcyB0aGlyZCBwYXJhbWV0ZXJcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5vcHRpb25zKSkge1xuICAgICAgICBwYXJhbXMuY2FsbGJhY2sgPSBwYXJhbXMub3B0aW9ucztcbiAgICAgICAgcGFyYW1zLm9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgaWYgKHBhcmFtcy5zZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBwYXJhbXMuc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgX2lkOiBwYXJhbXMuc2VsZWN0aW9uXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzTmlsKHBhcmFtcy5jYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihwYXJhbXMuY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICB9XG5cbiAgICBpZiAocGFyYW1zLm9wdGlvbnMuZmllbGRzKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHBhcmFtcy5maWVsZHMpIHx8IHBhcmFtcy5maWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBwYXJhbXMuZmllbGRzID0gcGFyYW1zLm9wdGlvbnMuZmllbGRzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oXCJGaWVsZHMgYWxyZWFkeSBwcmVzZW50LiBJZ25vcmluZyAnb3B0aW9ucy5maWVsZHMnLlwiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gcGFyYW1zO1xufTsiXX0=
