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
//# sourceMappingURL=data:application/json;base64,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QUQsSUFBNkIsQ0FBQyxFQUFFLFVBQUYsQ0FBYSxPQUFPLFFBQXBCLENBQWxDLEVBQWlFO0FBQzdELGVBQU8sS0FBUCxDQUFhLDZCQUFiO0FBQ0g7O0FBRUQsUUFBSSxPQUFPLE9BQVAsQ0FBZSxNQUFuQixFQUEyQjtBQUN2QixZQUFJLEVBQUUsS0FBRixDQUFRLE9BQU8sTUFBZixLQUEwQixPQUFPLE1BQVAsQ0FBYyxNQUFkLEtBQXlCLENBQXZELEVBQTBEO0FBQ3RELG1CQUFPLE1BQVAsR0FBZ0IsT0FBTyxPQUFQLENBQWUsTUFBL0I7QUFDSCxTQUZELE1BRU87QUFDSCxtQkFBTyxJQUFQLENBQVksb0RBQVo7QUFDSDtBQUNKOztBQUVELFdBQU8sTUFBUDtBQUNILENBckREIiwiZmlsZSI6IkNvbGxlY3Rpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIENvbGxlY3Rpb24uanMgLSBiYXNlZCBvbiBNb25nbG8jQ29sbGVjdGlvbiAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlZFxuICovXG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKFwianN3LWxvZ2dlclwiKSxcbiAgICBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi91dGlscy9FdmVudEVtaXR0ZXJcIiksXG4gICAgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIiksXG4gICAgQWdncmVnYXRpb24gPSByZXF1aXJlKFwiLi9BZ2dyZWdhdGlvblwiKSxcbiAgICBDdXJzb3IgPSByZXF1aXJlKFwiLi9DdXJzb3JcIiksXG4gICAgT2JqZWN0SWQgPSByZXF1aXJlKCcuL09iamVjdElkJyksXG4gICAgU2VsZWN0b3IgPSByZXF1aXJlKFwiLi9TZWxlY3RvclwiKSxcbiAgICBTZWxlY3Rvck1hdGNoZXIgPSByZXF1aXJlKFwiLi9TZWxlY3Rvck1hdGNoZXJcIik7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcbiAgICBcbi8qKlxuICogQ29sbGVjdGlvblxuICogXG4gKiBAbW9kdWxlIENvbGxlY3Rpb25cbiAqIEBjb25zdHJ1Y3RvclxuICogQHNpbmNlIDAuMC4xXG4gKiBcbiAqIEBjbGFzc2Rlc2MgQ29sbGVjdGlvbiBjbGFzcyB0aGF0IG1hcHMgYSBNb25nb0RCLWxpa2UgY29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0ge01vbmdvUG9ydGFibGV9IGRiIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIERhdGFiYXNlIG9iamVjdFxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMucGtGYWN0b3J5PW51bGxdIC0gT2JqZWN0IG92ZXJyaWRpbmcgdGhlIGJhc2ljIFwiT2JqZWN0SWRcIiBwcmltYXJ5IGtleSBnZW5lcmF0aW9uLlxuICogXG4gKi9cbnZhciBkYXRhYmFzZSA9IG51bGw7XG5jbGFzcyBDb2xsZWN0aW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbi8vIHZhciBDb2xsZWN0aW9uID0gZnVuY3Rpb24oZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKSB7XG4gICAgY29uc3RydWN0b3IoZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQ29sbGVjdGlvbikpIHJldHVybiBuZXcgQ29sbGVjdGlvbihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgIFxuICAgICAgICBpZiAoXy5pc05pbChkYikpIGxvZ2dlci50aHJvdyhcImRiIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGNvbGxlY3Rpb25OYW1lKSkgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbk5hbWUgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwob3B0aW9ucykgfHwgIV8uaXNQbGFpbk9iamVjdChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBcbiAgICAgICAgLy8gdGhpcy5kYiA9IGRiO1xuICAgICAgICBkYXRhYmFzZSA9IGRiO1xuICAgICAgICB0aGlzLm5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICAgICAgdGhpcy5kYXRhYmFzZU5hbWUgPSBkYi5kYXRhYmFzZU5hbWU7XG4gICAgICAgIHRoaXMuZnVsbE5hbWUgPSB0aGlzLmRhdGFiYXNlTmFtZSArICcuJyArIHRoaXMubmFtZTtcbiAgICAgICAgdGhpcy5kb2NzID0gW107XG4gICAgICAgIHRoaXMuZG9jX2luZGV4ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5zbmFwc2hvdHMgPSBbXTtcbiAgICAgICAgdGhpcy5vcHRzID0ge307IC8vIERlZmF1bHQgb3B0aW9uc1xuICAgICAgICBcbiAgICAgICAgXy5tZXJnZSh0aGlzLm9wdHMsIG9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGhpcy5lbWl0ID0gZGIuZW1pdDtcbiAgICB9XG4gICAgXG4gICAgZW1pdChuYW1lLCBhcmdzLCBjYikge1xuICAgICAgICBzdXBlci5lbWl0KG5hbWUsIGFyZ3MsIGNiLCBkYXRhYmFzZS5fc3RvcmVzKTtcbiAgICB9XG59XG5cbi8vIFRPRE8gZW5mb3JjZSBydWxlIHRoYXQgZmllbGQgbmFtZXMgY2FuJ3Qgc3RhcnQgd2l0aCAnJCcgb3IgY29udGFpbiAnLidcbi8vIChyZWFsIG1vbmdvZGIgZG9lcyBpbiBmYWN0IGVuZm9yY2UgdGhpcylcbi8vIFRPRE8gcG9zc2libHkgZW5mb3JjZSB0aGF0ICd1bmRlZmluZWQnIGRvZXMgbm90IGFwcGVhciAod2UgYXNzdW1lXG4vLyB0aGlzIGluIG91ciBoYW5kbGluZyBvZiBudWxsIGFuZCAkZXhpc3RzKVxuLyoqXG4gKiBJbnNlcnRzIGEgZG9jdW1lbnQgaW50byB0aGUgY29sbGVjdGlvblxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jaW5zZXJ0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBEb2N1bWVudCB0byBiZSBpbnNlcnRlZFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNoYWluPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fENvbGxlY3Rpb259IElmIFwib3B0aW9ucy5jaGFpblwiIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBpbnNlcnRlZCBkb2N1bWVudFxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoZG9jLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGRvYykpIGxvZ2dlci50aHJvdyhcImRvYyBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgXG4gICAgaWYgKCFfLmlzUGxhaW5PYmplY3QoZG9jKSkgbG9nZ2VyLnRocm93KFwiZG9jIG11c3QgYmUgYW4gb2JqZWN0XCIpO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIC8vIENyZWF0aW5nIGEgc2FmZSBjb3B5IG9mIHRoZSBkb2N1bWVudFxuICAgIHZhciBfZG9jID0gXy5jbG9uZURlZXAoZG9jKTtcblxuICAgIC8vIElmIHRoZSBkb2N1bWVudCBjb21lcyB3aXRoIGEgbnVtYmVyIElELCBwYXJzZSBpdCB0byBTdHJpbmdcbiAgICBpZiAoXy5pc051bWJlcihfZG9jLl9pZCkpIHtcbiAgICAgICAgX2RvYy5faWQgPSBfLnRvU3RyaW5nKF9kb2MuX2lkKTtcbiAgICB9XG5cbiAgICBpZiAoXy5pc05pbChfZG9jLl9pZCkgfHwgKCFfZG9jLl9pZCBpbnN0YW5jZW9mIE9iamVjdElkICYmICghXy5pc1N0cmluZyhfZG9jLl9pZCkgfHwgIV9kb2MuX2lkLmxlbmd0aCkpKSB7XG4gICAgICAgIF9kb2MuX2lkID0gbmV3IE9iamVjdElkKCk7XG4gICAgfVxuXG4gICAgLy8gQWRkIG9wdGlvbnMgdG8gbW9yZSBkYXRlc1xuICAgIF9kb2MudGltZXN0YW1wID0gbmV3IE9iamVjdElkKCkuZ2VuZXJhdGlvblRpbWU7XG4gICAgXG4gICAgLy8gUmV2ZXJzZVxuICAgIHRoaXMuZG9jX2luZGV4ZXNbXy50b1N0cmluZyhfZG9jLl9pZCldID0gdGhpcy5kb2NzLmxlbmd0aDtcbiAgICB0aGlzLmRvY3MucHVzaChfZG9jKTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBcImluc2VydFwiIGV2ZW50LlxuICAgICAqXG4gICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+aW5zZXJ0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgZG9jdW1lbnQgaW5zZXJ0ZWRcbiAgICAgKi9cbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdpbnNlcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgZG9jOiBfZG9jXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBfZG9jKTtcblxuICAgIGlmIChvcHRpb25zLmNoYWluKSByZXR1cm4gdGhpcztcbiAgICBcbiAgICByZXR1cm4gX2RvYztcbn07XG5cbi8qKlxuICogRmluZHMgYWxsIG1hdGNoaW5nIGRvY3VtZW50c1xuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZFxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5saW1pdF0gLSBNYXggbnVtYmVyIG9mIGRvY3VtZW50cyB0byBkaXNwbGF5XG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuZm9yY2VGZXRjaD1mYWxzZV0gLSBJZiBzZXQgdG8nXCJ0cnVlXCIgcmV0dXJucyB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzIGFscmVhZHkgZmV0Y2hlZFxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheXxDdXJzb3J9IElmIFwib3B0aW9ucy5mb3JjZUZldGNoXCIgc2V0IHRvIHRydWUgcmV0dXJucyB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzLCBvdGhlcndpc2UgcmV0dXJucyBhIGN1cnNvclxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGxldCBwYXJhbXMgPSBfZW5zdXJlRmluZFBhcmFtcyh7XG4gICAgICAgIHNlbGVjdGlvbjogc2VsZWN0aW9uLCBcbiAgICAgICAgZmllbGRzOiBmaWVsZHMsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnMsIFxuICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICB9KTtcbiAgICBcbiAgICBzZWxlY3Rpb24gPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgIGZpZWxkcyA9IHBhcmFtcy5maWVsZHM7XG4gICAgb3B0aW9ucyA9IHBhcmFtcy5vcHRpb25zO1xuICAgIGNhbGxiYWNrID0gcGFyYW1zLmNhbGxiYWNrO1xuICAgIFxuICAgIC8vIGNhbGxiYWNrIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgdmFyIGN1cnNvciA9IG5ldyBDdXJzb3IodGhpcy5kYiwgdGhpcywgc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMpO1xuXG4gICAgLyoqXG4gICAgICogXCJmaW5kXCIgZXZlbnQuXG4gICAgICpcbiAgICAgKiBAZXZlbnQgTW9uZ29Qb3J0YWJsZX5maW5kXG4gICAgICogXG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzZWxlY3RvciAtIFRoZSBzZWxlY3Rpb24gb2YgdGhlIHF1ZXJ5XG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgc2hvd2VkIGluIHRoZSBxdWVyeVxuICAgICAqL1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2ZpbmQnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgIGZpZWxkczogZmllbGRzXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIC8vIFBhc3MgdGhlIGN1cnNvciBmZXRjaGVkIHRvIHRoZSBjYWxsYmFja1xuICAgIC8vIEFkZCBbb3B0aW9ucy5ub0ZldGNoQ2FsbGJhY2sgPSB0cnVlXVxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgY3Vyc29yLmZldGNoKCkpO1xuXG4gICAgaWYgKG9wdGlvbnMuZm9yY2VGZXRjaCkge1xuICAgICAgICByZXR1cm4gY3Vyc29yLmZldGNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGN1cnNvcjtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudFxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZE9uZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5saW1pdF0gLSBNYXggbnVtYmVyIG9mIGRvY3VtZW50cyB0byBkaXNwbGF5XG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudCBvZiB0aGUgY29sbGVjdGlvblxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5maW5kT25lID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGxldCBwYXJhbXMgPSBfZW5zdXJlRmluZFBhcmFtcyh7XG4gICAgICAgIHNlbGVjdGlvbjogc2VsZWN0aW9uLCBcbiAgICAgICAgZmllbGRzOiBmaWVsZHMsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnMsIFxuICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICB9KTtcbiAgICBcbiAgICBzZWxlY3Rpb24gPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgIGZpZWxkcyA9IHBhcmFtcy5maWVsZHM7XG4gICAgb3B0aW9ucyA9IHBhcmFtcy5vcHRpb25zO1xuICAgIGNhbGxiYWNrID0gcGFyYW1zLmNhbGxiYWNrO1xuICAgIFxuICAgIHZhciBjdXJzb3IgPSBuZXcgQ3Vyc29yKHRoaXMuZGIsIHRoaXMsIHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zKTtcblxuICAgIC8qKlxuICAgICAqIFwiZmluZE9uZVwiIGV2ZW50LlxuICAgICAqXG4gICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+ZmluZE9uZVxuICAgICAqIFxuICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb2xsZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbGxlY3Rpb25cbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gc2VsZWN0b3IgLSBUaGUgc2VsZWN0aW9uIG9mIHRoZSBxdWVyeVxuICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIHNob3dlZCBpbiB0aGUgcXVlcnlcbiAgICAgKi9cbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdmaW5kT25lJyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICBmaWVsZHM6IGZpZWxkc1xuICAgICAgICB9XG4gICAgKTtcbiAgICBcbiAgICB2YXIgcmVzID0gbnVsbDtcbiAgICBcbiAgICBpZiAoY3Vyc29yLmhhc05leHQoKSkge1xuICAgICAgICByZXMgPSBjdXJzb3IubmV4dCgpO1xuICAgIH1cbiAgICBcbiAgICAvLyBQYXNzIHRoZSBjdXJzb3IgZmV0Y2hlZCB0byB0aGUgY2FsbGJhY2tcbiAgICAvLyBBZGQgW29wdGlvbnMubm9GZXRjaENhbGxiYWNrID0gdHJ1ZV1cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlcyk7XG4gICAgXG4gICAgcmV0dXJuIHJlcztcbn07XG5cblxuLyoqXG4gKiBVcGRhdGVzIG9uZSBvciBtYW55IGRvY3VtZW50c1xuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jdXBkYXRlXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdXBkYXRlPXt9XSAtIFRoZSB1cGRhdGUgb3BlcmF0aW9uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy51cGRhdGVBc01vbmdvPXRydWVdIC0gQnkgZGVmYXVsdDogXG4gKiAgICAgIElmIHRoZSBbdXBkYXRlXSBvYmplY3QgY29udGFpbnMgdXBkYXRlIG9wZXJhdG9yIG1vZGlmaWVycywgc3VjaCBhcyB0aG9zZSB1c2luZyB0aGUgXCIkc2V0XCIgbW9kaWZpZXIsIHRoZW46XG4gKiAgICAgICAgICA8dWw+XG4gKiAgICAgICAgICAgICAgPGxpPlRoZSBbdXBkYXRlXSBvYmplY3QgbXVzdCBjb250YWluIG9ubHkgdXBkYXRlIG9wZXJhdG9yIGV4cHJlc3Npb25zPC9saT5cbiAqICAgICAgICAgICAgICA8bGk+VGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCB1cGRhdGVzIG9ubHkgdGhlIGNvcnJlc3BvbmRpbmcgZmllbGRzIGluIHRoZSBkb2N1bWVudDwvbGk+XG4gKiAgICAgICAgICA8dWw+XG4gKiAgICAgIElmIHRoZSBbdXBkYXRlXSBvYmplY3QgY29udGFpbnMgb25seSBcImZpZWxkOiB2YWx1ZVwiIGV4cHJlc3Npb25zLCB0aGVuOlxuICogICAgICAgICAgPHVsPlxuICogICAgICAgICAgICAgIDxsaT5UaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIHJlcGxhY2VzIHRoZSBtYXRjaGluZyBkb2N1bWVudCB3aXRoIHRoZSBbdXBkYXRlXSBvYmplY3QuIFRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgZG9lcyBub3QgcmVwbGFjZSB0aGUgXCJfaWRcIiB2YWx1ZTwvbGk+XG4gKiAgICAgICAgICAgICAgPGxpPkNvbGxlY3Rpb24jdXBkYXRlIGNhbm5vdCB1cGRhdGUgbXVsdGlwbGUgZG9jdW1lbnRzPC9saT5cbiAqICAgICAgICAgIDx1bD5cbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm92ZXJyaWRlPWZhbHNlXSAtIFJlcGxhY2VzIHRoZSB3aG9sZSBkb2N1bWVudCAob25seSBhcGxsaWVzIHdoZW4gW3VwZGF0ZUFzTW9uZ289ZmFsc2VdKVxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnVwc2VydD1mYWxzZV0gLSBDcmVhdGVzIGEgbmV3IGRvY3VtZW50IHdoZW4gbm8gZG9jdW1lbnQgbWF0Y2hlcyB0aGUgcXVlcnkgY3JpdGVyaWFcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5tdWx0aT1mYWxzZV0gLSBVcGRhdGVzIG11bHRpcGxlIGRvY3VtZW50cyB0aGF0IG1lZXQgdGhlIGNyaXRlcmlhXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB0aGUgdXBkYXRlL2luc2VydCAoaWYgdXBzZXJ0PXRydWUpIGluZm9ybWF0aW9uXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIHVwZGF0ZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChzZWxlY3Rpb24pKSBzZWxlY3Rpb24gPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc05pbCh1cGRhdGUpKSBsb2dnZXIudGhyb3coXCJZb3UgbXVzdCBzcGVjaWZ5IHRoZSB1cGRhdGUgb3BlcmF0aW9uXCIpO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBza2lwOiAwLFxuICAgICAgICAgICAgbGltaXQ6IDE1ICAgLy8gZm9yIG5vIGxpbWl0IHBhc3MgW29wdGlvbnMubGltaXQgPSAtMV1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihzZWxlY3Rpb24pKSBsb2dnZXIudGhyb3coXCJZb3UgbXVzdCBzcGVjaWZ5IHRoZSB1cGRhdGUgb3BlcmF0aW9uXCIpO1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24odXBkYXRlKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3Qgc3BlY2lmeSB0aGUgdXBkYXRlIG9wZXJhdGlvblwiKTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgaWYoc2VsZWN0aW9uIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgX2lkOiBzZWxlY3Rpb25cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuXG4gICAgdmFyIHJlcyA9IG51bGw7XG5cbiAgICB2YXIgZG9jcyA9IG51bGw7XG4gICAgaWYgKG9wdGlvbnMubXVsdGkpIHtcbiAgICAgICAgZG9jcyA9IHRoaXMuZmluZChzZWxlY3Rpb24sIG51bGwsIHsgZm9yY2VGZXRjaDogdHJ1ZSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkb2NzID0gdGhpcy5maW5kT25lKHNlbGVjdGlvbik7XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKGRvY3MpKSB7XG4gICAgICAgIGRvY3MgPSBbXTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzQXJyYXkoZG9jcykpIHtcbiAgICAgICAgZG9jcyA9IFtkb2NzXTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGRvY3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGlmIChvcHRpb25zLnVwc2VydCkge1xuICAgICAgICAgICAgdmFyIGluc2VydGVkID0gdGhpcy5pbnNlcnQodXBkYXRlKTtcblxuICAgICAgICAgICAgcmVzID0ge1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBbaW5zZXJ0ZWRdLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBObyBkb2N1bWVudHMgZm91bmRcbiAgICAgICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHVwZGF0ZWREb2NzID0gW107XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvY3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBkb2MgPSBkb2NzW2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgb3ZlcnJpZGUgPSBudWxsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgaGFzTW9kaWZpZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIElFNyBkb2Vzbid0IHN1cHBvcnQgaW5kZXhpbmcgaW50byBzdHJpbmdzIChlZywga2V5WzBdIG9yIGtleS5pbmRleE9mKCckJykgKSwgc28gdXNlIHN1YnN0ci5cbiAgICAgICAgICAgICAgICAvLyBUZXN0aW5nIG92ZXIgdGhlIGZpcnN0IGxldHRlcjpcbiAgICAgICAgICAgICAgICAvLyAgICAgIEJlc3RzIHJlc3VsdCB3aXRoIDFlOCBsb29wcyA9PiBrZXlbMF0ofjNzKSA+IHN1YnN0cih+NXMpID4gcmVnZXhwKH42cykgPiBpbmRleE9mKH4xNnMpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIG1vZGlmaWVyID0gKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJyk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc01vZGlmaWVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMudXBkYXRlQXNNb25nbykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzTW9kaWZpZXIgJiYgIW1vZGlmaWVyKSBsb2dnZXIudGhyb3coXCJBbGwgdXBkYXRlIGZpZWxkcyBtdXN0IGJlIGFuIHVwZGF0ZSBvcGVyYXRvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghaGFzTW9kaWZpZXIgJiYgb3B0aW9ucy5tdWx0aSkgbG9nZ2VyLnRocm93KFwiWW91IGNhbiBub3QgdXBkYXRlIHNldmVyYWwgZG9jdW1lbnRzIHdoZW4gbm8gdXBkYXRlIG9wZXJhdG9ycyBhcmUgaW5jbHVkZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzTW9kaWZpZXIpIG92ZXJyaWRlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc01vZGlmaWVyKSBvdmVycmlkZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcnJpZGUgPSAhIW9wdGlvbnMub3ZlcnJpZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgX2RvY1VwZGF0ZSA9IG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChvdmVycmlkZSkge1xuICAgICAgICAgICAgICAgIC8vIE92ZXJyaWRlcyB0aGUgZG9jdW1lbnQgZXhjZXB0IGZvciB0aGUgXCJfaWRcIlxuICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSB7XG4gICAgICAgICAgICAgICAgICAgIF9pZDogZG9jLl9pZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTXVzdCBpZ25vcmUgZmllbGRzIHN0YXJ0aW5nIHdpdGggJyQnLCAnLicuLi5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcgfHwgL1xcLi9nLnRlc3Qoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYFRoZSBmaWVsZCAke2tleX0gY2FuIG5vdCBiZWdpbiB3aXRoICckJyBvciBjb250YWluICcuJ2ApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2RvY1VwZGF0ZVtrZXldID0gdXBkYXRlW2tleV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSBfLmNsb25lRGVlcChkb2MpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbCA9IHVwZGF0ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2RvY1VwZGF0ZSA9IF9hcHBseU1vZGlmaWVyKF9kb2NVcGRhdGUsIGtleSwgdmFsKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghXy5pc05pbChfZG9jVXBkYXRlW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RvY1VwZGF0ZVtrZXldID0gdmFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKFwiVGhlIGZpZWxkICdfaWQnIGNhbiBub3QgYmUgdXBkYXRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBUaGUgZG9jdW1lbnQgZG9lcyBub3QgY29udGFpbnMgdGhlIGZpZWxkICR7a2V5fWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB1cGRhdGVkRG9jcy5wdXNoKF9kb2NVcGRhdGUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsZXQgaWR4ID0gdGhpcy5kb2NfaW5kZXhlc1tfZG9jVXBkYXRlLl9pZF07XG4gICAgICAgICAgICB0aGlzLmRvY3NbaWR4XSA9IF9kb2NVcGRhdGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcInVwZGF0ZVwiIGV2ZW50LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXZlbnQgTW9uZ29Qb3J0YWJsZX51cGRhdGVcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb2xsZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbGxlY3Rpb25cbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdGlvbiBvZiB0aGUgcXVlcnlcbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IG1vZGlmaWVyIC0gVGhlIG1vZGlmaWVyIHVzZWQgaW4gdGhlIHF1ZXJ5XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkb2NzIC0gVGhlIHVwZGF0ZWQvaW5zZXJ0ZWQgZG9jdW1lbnRzIGluZm9ybWF0aW9uXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAndXBkYXRlJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgbW9kaWZpZXI6IHVwZGF0ZSxcbiAgICAgICAgICAgICAgICBkb2NzOiB1cGRhdGVkRG9jc1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgcmVzID0ge1xuICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50czogdXBkYXRlZERvY3MsXG4gICAgICAgICAgICAgICAgY291bnQ6IHVwZGF0ZWREb2NzLmxlbmd0aFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICBcbiAgICByZXR1cm4gcmVzO1xufTtcblxudmFyIF9hcHBseU1vZGlmaWVyID0gZnVuY3Rpb24oX2RvY1VwZGF0ZSwga2V5LCB2YWwpIHtcbiAgICB2YXIgZG9jID0gXy5jbG9uZURlZXAoX2RvY1VwZGF0ZSk7XG4gICAgLy8gdmFyIG1vZCA9IF9tb2RpZmllcnNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGlmICghX21vZGlmaWVyc1trZXldKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhgSW52YWxpZCBtb2RpZmllciBzcGVjaWZpZWQ6ICR7a2V5fWApO1xuICAgIH1cbiAgICBcbiAgICBmb3IgKHZhciBrZXlwYXRoIGluIHZhbCkge1xuICAgICAgICB2YXIgdmFsdWUgPSB2YWxba2V5cGF0aF07XG4gICAgICAgIHZhciBrZXlwYXJ0cyA9IGtleXBhdGguc3BsaXQoJy4nKTtcbiAgICAgICAgXG4gICAgICAgIF9tb2RpZnkoZG9jLCBrZXlwYXJ0cywgdmFsdWUsIGtleSk7XG4gICAgICAgIFxuICAgICAgICAvLyB2YXIgbm9fY3JlYXRlID0gISFDb2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVyc1trZXldO1xuICAgICAgICAvLyB2YXIgZm9yYmlkX2FycmF5ID0gKGtleSA9PT0gXCIkcmVuYW1lXCIpO1xuICAgICAgICAvLyB2YXIgdGFyZ2V0ID0gQ29sbGVjdGlvbi5fZmluZE1vZFRhcmdldChfZG9jVXBkYXRlLCBrZXlwYXJ0cywgbm9fY3JlYXRlLCBmb3JiaWRfYXJyYXkpO1xuICAgICAgICAvLyB2YXIgZmllbGQgPSBrZXlwYXJ0cy5wb3AoKTtcblxuICAgICAgICAvLyBtb2QodGFyZ2V0LCBmaWVsZCwgdmFsdWUsIGtleXBhdGgsIF9kb2NVcGRhdGUpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gZG9jO1xufTtcblxudmFyIF9tb2RpZnkgPSBmdW5jdGlvbihkb2N1bWVudCwga2V5cGFydHMsIHZhbHVlLCBrZXksIGxldmVsID0gMCkge1xuICAgIGZvciAobGV0IGkgPSBsZXZlbDsgaSA8IGtleXBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBwYXRoID0ga2V5cGFydHNbaV07XG4gICAgICAgIGxldCBpc051bWVyaWMgPSAvXlswLTldKyQvLnRlc3QocGF0aCk7XG4gICAgICAgIGxldCB0YXJnZXQgPSBkb2N1bWVudFtwYXRoXTtcbiAgICAgICAgXG4gICAgICAgIHZhciBjcmVhdGUgPSBfLmhhc0luKENvbGxlY3Rpb24uX25vQ3JlYXRlTW9kaWZpZXJzLCBrZXkpID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICBpZiAoIWNyZWF0ZSAmJiAoIV8uaXNPYmplY3QoZG9jdW1lbnQpIHx8IF8uaXNOaWwodGFyZ2V0KSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhgVGhlIGVsZW1lbnQgXCIke3BhdGh9XCIgbXVzdCBleGlzdHMgaW4gXCIke0pTT04uc3RyaW5naWZ5KGRvY3VtZW50KX1cImApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0FycmF5KGRvY3VtZW50KSkge1xuICAgICAgICAgICAgLy8gRG8gbm90IGFsbG93ICRyZW5hbWUgb24gYXJyYXlzXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIiRyZW5hbWVcIikgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgbGV0IHRoZSB1c2Ugb2YgXCJhcnJheWZpZWxkLjxudW1lcmljX2luZGV4Pi5zdWJmaWVsZFwiXG4gICAgICAgICAgICBpZiAoaXNOdW1lcmljKSB7XG4gICAgICAgICAgICAgICAgcGF0aCA9IF8udG9OdW1iZXIocGF0aCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhgVGhlIGZpZWxkIFwiJHtwYXRofVwiIGNhbiBub3QgYmUgYXBwZW5kZWQgdG8gYW4gYXJyYXlgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmlsbCB0aGUgYXJyYXkgdG8gdGhlIGRlc2lyZWQgbGVuZ3RoXG4gICAgICAgICAgICB3aGlsZSAoZG9jdW1lbnQubGVuZ3RoIDwgcGF0aCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnB1c2gobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChpIDwga2V5cGFydHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgaWYgKF8uaXNOaWwodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIC8vIElmIHdlIGFyZSBhY2Nlc3Npbmcgd2l0aCBcImFycmF5RmllbGQuPG51bWVyaWNfaW5kZXg+XCJcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0Zpbml0ZShfLnRvTnVtYmVyKGtleXBhcnRzW2kgKyAxXSkpKSB7ICAvLyAgfHwga2V5cGFydHNbaSArIDFdID09PSAnJCcgIC8vIFRPRE8gXCJhcnJheUZpZWxkLiRcIlxuICAgICAgICAgICAgICAgICAgICB0YXJnZXQgPSBbXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRvY3VtZW50W3BhdGhdID0gX21vZGlmeSh0YXJnZXQsIGtleXBhcnRzLCB2YWx1ZSwga2V5LCBsZXZlbCArIDEpO1xuXG4gICAgICAgICAgICByZXR1cm4gZG9jdW1lbnQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfbW9kaWZpZXJzW2tleV0oZG9jdW1lbnQsIHBhdGgsIHZhbHVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGRvY3VtZW50O1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW1vdmVzIG9uZSBvciBtYW55IGRvY3VtZW50c1xuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jcmVtb3ZlXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmp1c3RPbmU9ZmFsc2VdIC0gRGVsZXRlcyB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiB0aGUgc2VsZWN0aW9uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB0aGUgZGVsZXRlZCBkb2N1bWVudHNcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChzZWxlY3Rpb24pKSBzZWxlY3Rpb24gPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHNlbGVjdGlvbikpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBzZWxlY3Rpb247XG4gICAgICAgIHNlbGVjdGlvbiA9IHt9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHsganVzdE9uZTogZmFsc2UgfTtcbiAgICBcbiAgICAvLyBJZiB3ZSBhcmUgbm90IHBhc3NpbmcgYSBzZWxlY3Rpb24gYW5kIHdlIGFyZSBub3QgcmVtb3ZpbmcganVzdCBvbmUsIGlzIHRoZSBzYW1lIGFzIGEgZHJvcFxuICAgIGlmIChPYmplY3Quc2l6ZShzZWxlY3Rpb24pID09PSAwICYmICFvcHRpb25zLmp1c3RPbmUpIHJldHVybiB0aGlzLmRyb3Aob3B0aW9ucywgY2FsbGJhY2spO1xuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgdmFyIGN1cnNvciA9IHRoaXMuZmluZChzZWxlY3Rpb24pO1xuICAgIFxuICAgIHZhciBkb2NzID0gW107XG4gICAgY3Vyc29yLmZvckVhY2goZG9jID0+IHtcbiAgICAgICAgdmFyIGlkeCA9IHRoaXMuZG9jX2luZGV4ZXNbZG9jLl9pZF07XG4gICAgICAgIFxuICAgICAgICBkZWxldGUgdGhpcy5kb2NfaW5kZXhlc1tkb2MuX2lkXTtcbiAgICAgICAgdGhpcy5kb2NzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICBcbiAgICAgICAgZG9jcy5wdXNoKGRvYyk7XG4gICAgfSk7XG4gICAgXG4gICAgLyoqXG4gICAgICogXCJyZW1vdmVcIiBldmVudC5cbiAgICAgKlxuICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfnJlbW92ZVxuICAgICAqIFxuICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb2xsZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbGxlY3Rpb25cbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gc2VsZWN0b3IgLSBUaGUgc2VsZWN0aW9uIG9mIHRoZSBxdWVyeVxuICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkb2NzIC0gVGhlIGRlbGV0ZWQgZG9jdW1lbnRzIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAncmVtb3ZlJyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICBkb2NzOiBkb2NzXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgZG9jcyk7XG4gICAgXG4gICAgcmV0dXJuIGRvY3M7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciB7QGxpbmsgQ29sbGVjdGlvbiNyZW1vdmV9XG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNkZWxldGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5yZW1vdmUoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjayk7XG59O1xuIFxuIC8qKlxuICogQWxpYXMgZm9yIHtAbGluayBDb2xsZWN0aW9uI3JlbW92ZX1cbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI2Rlc3Ryb3lcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMucmVtb3ZlKHNlbGVjdGlvbiwgb3B0aW9ucywgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBEcm9wcyBhIGNvbGxlY3Rpb25cbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI2Ryb3BcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuZHJvcEluZGV4ZXM9ZmFsc2VdIC0gVHJ1ZSBpZiB3ZSB3YW50IHRvIGRyb3AgdGhlIGluZGV4ZXMgdG9vXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUcnVlIHdoZW4gdGhlIGNvbGxlY3Rpb24gaXMgZHJvcHBlZFxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICB0aGlzLmRvY19pbmRleGVzID0ge307XG4gICAgdGhpcy5kb2NzID0gW107XG4gICAgXG4gICAgaWYgKG9wdGlvbnMuZHJvcEluZGV4ZXMpIHt9IC8vIFRPRE9cbiAgICBcbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdkcm9wQ29sbGVjdGlvbicsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBpbmRleGVzOiAhIW9wdGlvbnMuZHJvcEluZGV4ZXNcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCB0cnVlKTtcbiAgICBcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSW5zZXJ0IG9yIHVwZGF0ZSBhIGRvY3VtZW50LiBJZiB0aGUgZG9jdW1lbnQgaGFzIGFuIFwiX2lkXCIgaXMgYW4gdXBkYXRlICh3aXRoIHVwc2VydCksIGlmIG5vdCBpcyBhbiBpbnNlcnQuXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNzYXZlXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBEb2N1bWVudCB0byBiZSBpbnNlcnRlZC91cGRhdGVkXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5kcm9wSW5kZXhlcz1mYWxzZV0gLSBUcnVlIGlmIHdlIHdhbnQgdG8gZHJvcCB0aGUgaW5kZXhlcyB0b29cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRydWUgd2hlbiB0aGUgY29sbGVjdGlvbiBpcyBkcm9wcGVkXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbihkb2MsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoZG9jKSB8fCBfLmlzRnVuY3Rpb24oZG9jKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3QgcGFzcyBhIGRvY3VtZW50XCIpO1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgaWYgKF8uaGFzSW4oZG9jLCAnX2lkJykpIHtcbiAgICAgICAgb3B0aW9ucy51cHNlcnQgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlKFxuICAgICAgICAgICAgeyBfaWQ6IGRvYy5faWQgfSxcbiAgICAgICAgICAgIGRvYyxcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmluc2VydChkb2MsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICB9XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmVuc3VyZUluZGV4ID0gZnVuY3Rpb24oKSB7XG4gICAgLy9UT0RPIEltcGxlbWVudCBFbnN1cmVJbmRleFxuICAgIGxvZ2dlci50aHJvdygnQ29sbGVjdGlvbiNlbnN1cmVJbmRleCB1bmltcGxlbWVudGVkIGJ5IGRyaXZlcicpO1xufTtcblxuLy8gVE9ETyBkb2N1bWVudCAoYXQgc29tZSBwb2ludClcbi8vIFRPRE8gdGVzdFxuLy8gVE9ETyBvYnZpb3VzbHkgdGhpcyBwYXJ0aWN1bGFyIGltcGxlbWVudGF0aW9uIHdpbGwgbm90IGJlIHZlcnkgZWZmaWNpZW50XG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmJhY2t1cCA9IGZ1bmN0aW9uIChiYWNrdXBJRCwgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGJhY2t1cElEKSkge1xuICAgICAgICBjYWxsYmFjayA9IGJhY2t1cElEO1xuICAgICAgICBiYWNrdXBJRCA9IG5ldyBPYmplY3RJZCgpLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcblxuICAgIHRoaXMuc25hcHNob3RzW2JhY2t1cElEXSA9IF8uY2xvbmVEZWVwKHRoaXMuZG9jcyk7XG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnc25hcHNob3QnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgYmFja3VwSUQ6IGJhY2t1cElELFxuICAgICAgICAgICAgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF0gXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgYmFja3VwSUQ6IGJhY2t1cElELFxuICAgICAgICBkb2N1bWVudHM6IHRoaXMuc25hcHNob3RzW2JhY2t1cElEXVxuICAgIH07XG4gICAgXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8vIExpc3RzIGF2YWlsYWJsZSBCYWNrdXBzXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmJhY2t1cHMgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgdmFyIGJhY2t1cHMgPSBbXTtcblxuICAgIGZvciAobGV0IGlkIGluIHRoaXMuc25hcHNob3RzKSB7XG4gICAgICAgIGJhY2t1cHMucHVzaCh7aWQ6IGlkLCBkb2N1bWVudHM6IHRoaXMuc25hcHNob3RzW2lkXX0pO1xuICAgIH1cblxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgYmFja3Vwcyk7XG5cbiAgICByZXR1cm4gYmFja3Vwcztcbn07XG5cbi8vIExpc3RzIGF2YWlsYWJsZSBCYWNrdXBzXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbW92ZUJhY2t1cCA9IGZ1bmN0aW9uIChiYWNrdXBJRCwgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGJhY2t1cElEKSkge1xuICAgICAgICBjYWxsYmFjayA9IGJhY2t1cElEO1xuICAgICAgICBiYWNrdXBJRCA9IG51bGw7XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICBsZXQgcmVzdWx0ID0gZmFsc2U7XG4gICAgXG4gICAgaWYgKGJhY2t1cElEKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnNuYXBzaG90c1tfLnRvU3RyaW5nKGJhY2t1cElEKV07XG4gICAgICAgIFxuICAgICAgICByZXN1bHQgPSBiYWNrdXBJRDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnNuYXBzaG90cyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgcmVzdWx0ID0gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblxuLy8gUmVzdG9yZSB0aGUgc25hcHNob3QuIElmIG5vIHNuYXBzaG90IGV4aXN0cywgcmFpc2UgYW4gZXhjZXB0aW9uO1xuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZXN0b3JlID0gZnVuY3Rpb24gKGJhY2t1cElELCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oYmFja3VwSUQpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gYmFja3VwSUQ7XG4gICAgICAgIGJhY2t1cElEID0gbnVsbDtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIHZhciBzbmFwc2hvdENvdW50ID0gT2JqZWN0LnNpemUodGhpcy5zbmFwc2hvdHMpO1xuICAgIHZhciBiYWNrdXBEYXRhID0gbnVsbDtcblxuICAgIGlmIChzbmFwc2hvdENvdW50ID09PSAwKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcIlRoZXJlIGlzIG5vIHNuYXBzaG90c1wiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIWJhY2t1cElEKSB7XG4gICAgICAgICAgICBpZiAoc25hcHNob3RDb3VudCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKFwiTm8gYmFja3VwSUQgcGFzc2VkLiBSZXN0b3JpbmcgdGhlIG9ubHkgc25hcHNob3RcIik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmV0cmlldmUgdGhlIG9ubHkgc25hcHNob3RcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdGhpcy5zbmFwc2hvdHMpIGJhY2t1cElEID0ga2V5O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJUaGUgYXJlIHNldmVyYWwgc25hcHNob3RzLiBQbGVhc2Ugc3BlY2lmeSBvbmUgYmFja3VwSURcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgYmFja3VwRGF0YSA9IHRoaXMuc25hcHNob3RzW2JhY2t1cElEXTtcbiAgICAgICAgICAgIFxuICAgIGlmICghYmFja3VwRGF0YSkge1xuICAgICAgICBsb2dnZXIudGhyb3coYFVua25vd24gQmFja3VwIElEOiAke2JhY2t1cElEfWApO1xuICAgIH1cblxuICAgIHRoaXMuZG9jcyA9IGJhY2t1cERhdGE7XG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAncmVzdG9yZScsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBiYWNrdXBJRDogYmFja3VwSURcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENhbGN1bGF0ZXMgYWdncmVnYXRlIHZhbHVlcyBmb3IgdGhlIGRhdGEgaW4gYSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNhZ2dyZWdhdGVcbiAqIFxuICogQHBhcmFtIHtBcnJheX0gcGlwZWxpbmUgLSBBIHNlcXVlbmNlIG9mIGRhdGEgYWdncmVnYXRpb24gb3BlcmF0aW9ucyBvciBzdGFnZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5mb3JjZUZldGNoPWZhbHNlXSAtIElmIHNldCB0bydcInRydWVcIiByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMgYWxyZWFkeSBmZXRjaGVkXG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheXxDdXJzb3J9IElmIFwib3B0aW9ucy5mb3JjZUZldGNoXCIgc2V0IHRvIHRydWUgcmV0dXJucyB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzLCBvdGhlcndpc2UgcmV0dXJucyBhIGN1cnNvclxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5hZ2dyZWdhdGUgPSBmdW5jdGlvbihwaXBlbGluZSwgb3B0aW9ucyA9IHsgZm9yY2VGZXRjaDogZmFsc2UgfSkge1xuICAgIGlmIChfLmlzTmlsKHBpcGVsaW5lKSB8fCAhXy5pc0FycmF5KHBpcGVsaW5lKSkgbG9nZ2VyLnRocm93KCdUaGUgXCJwaXBlbGluZVwiIHBhcmFtIG11c3QgYmUgYW4gYXJyYXknKTtcbiAgICBcbiAgICB2YXIgYWdncmVnYXRpb24gPSBuZXcgQWdncmVnYXRpb24ocGlwZWxpbmUpO1xuICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGlwZWxpbmUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IHN0YWdlID0gcGlwZWxpbmVbaV07XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCBrZXkgaW4gc3RhZ2UpIHtcbiAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpICE9PSAnJCcpIGxvZ2dlci50aHJvdyhcIlRoZSBwaXBlbGluZSBzdGFnZXMgbXVzdCBiZWdpbiB3aXRoICckJ1wiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFhZ2dyZWdhdGlvbi52YWxpZFN0YWdlKGtleSkpIGxvZ2dlci50aHJvdyhgSW52YWxpZCBzdGFnZSBcIiR7a2V5fVwiYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHZhciByZXN1bHQgPSBhZ2dyZWdhdGlvbi5hZ2dyZWdhdGUodGhpcyk7XG4gICAgXG4gICAgcmV0dXJuIHJlc3VsdDsgIC8vIGNoYW5nZSB0byBjdXJzb3Jcbn07XG5cbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5fbm9DcmVhdGVNb2RpZmllcnMgPSB7XG4gICAgJHVuc2V0OiB0cnVlLFxuICAgICRwb3A6IHRydWUsXG4gICAgJHJlbmFtZTogdHJ1ZSxcbiAgICAkcHVsbDogdHJ1ZSxcbiAgICAkcHVsbEFsbDogdHJ1ZVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG52YXIgX21vZGlmaWVycyA9IHtcbiAgICAkaW5jOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmICghXy5pc051bWJlcihhcmcpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJNb2RpZmllciAkaW5jIGFsbG93ZWQgZm9yIG51bWJlcnMgb25seVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICAgIGlmICghXy5pc051bWJlcih0YXJnZXRbZmllbGRdKSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkaW5jIG1vZGlmaWVyIHRvIG5vbi1udW1iZXJcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gKz0gYXJnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkc2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSBfLmNsb25lRGVlcChhcmcpO1xuICAgIH0sXG5cbiAgICAkdW5zZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKCFfLmlzTmlsKHRhcmdldCkpIHtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVzaDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKF8uaXNOaWwoeCkpIHtcbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBbYXJnXTtcbiAgICAgICAgfSBlbHNlIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJHB1c2ggbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeC5wdXNoKF8uY2xvbmVEZWVwKGFyZykpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdXNoQWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgICAgfSBlbHNlIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJNb2RpZmllciAkcHVzaEFsbC9wdWxsQWxsIGFsbG93ZWQgZm9yIGFycmF5cyBvbmx5XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB4LnB1c2goYXJnW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkYWRkVG9TZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmIChfLmlzTmlsKHgpKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gW2FyZ107XG4gICAgICAgIH0gZWxzZSBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRhZGRUb1NldCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgaXNFYWNoID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoXy5pc1BsYWluT2JqZWN0KGFyZykpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrIGluIGFyZykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoayA9PT0gXCIkZWFjaFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0VhY2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB2YWx1ZXMgPSBpc0VhY2ggPyBhcmdbXCIkZWFjaFwiXSA6IFthcmddO1xuICAgICAgICAgICAgXy5mb3JFYWNoKHZhbHVlcywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChTZWxlY3Rvck1hdGNoZXIuZXF1YWwodmFsdWUsIHhbaV0pKSByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgeC5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwb3A6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwodGFyZ2V0KSB8fCBfLmlzTmlsKHRhcmdldFtmaWVsZF0pKSByZXR1cm47XG5cbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJHBvcCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoXy5pc051bWJlcihhcmcpICYmIGFyZyA8IDApIHtcbiAgICAgICAgICAgICAgICB4LnNwbGljZSgwLCAxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgeC5wb3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVsbDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoXy5pc05pbCh0YXJnZXQpIHx8IF8uaXNOaWwodGFyZ2V0W2ZpZWxkXSkpIHJldHVybjtcblxuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVsbC9wdWxsQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvdXQgPSBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmcgPT09IFwib2JqZWN0XCIgJiYgIShhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAvLyBYWFggd291bGQgYmUgbXVjaCBuaWNlciB0byBjb21waWxlIHRoaXMgb25jZSwgcmF0aGVyIHRoYW5cbiAgICAgICAgICAgICAgICAvLyBmb3IgZWFjaCBkb2N1bWVudCB3ZSBtb2RpZnkuLiBidXQgdXN1YWxseSB3ZSdyZSBub3RcbiAgICAgICAgICAgICAgICAvLyBtb2RpZnlpbmcgdGhhdCBtYW55IGRvY3VtZW50cywgc28gd2UnbGwgbGV0IGl0IHNsaWRlIGZvclxuICAgICAgICAgICAgICAgIC8vIG5vd1xuXG4gICAgICAgICAgICAgICAgLy8gWFhYIF9jb21waWxlU2VsZWN0b3IgaXNuJ3QgdXAgZm9yIHRoZSBqb2IsIGJlY2F1c2Ugd2UgbmVlZFxuICAgICAgICAgICAgICAgIC8vIHRvIHBlcm1pdCBzdHVmZiBsaWtlIHskcHVsbDoge2E6IHskZ3Q6IDR9fX0uLiBzb21ldGhpbmdcbiAgICAgICAgICAgICAgICAvLyBsaWtlIHskZ3Q6IDR9IGlzIG5vdCBub3JtYWxseSBhIGNvbXBsZXRlIHNlbGVjdG9yLlxuICAgICAgICAgICAgICAgIHZhciBtYXRjaCA9IG5ldyBTZWxlY3Rvcih7XG4gICAgICAgICAgICAgICAgICAgIFwiX19tYXRjaGluZ19fXCI6IGFyZ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgX2RvY18gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfX21hdGNoaW5nX186IHhbaV1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRjaC50ZXN0KF9kb2NfKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIVNlbGVjdG9yTWF0Y2hlci5lcXVhbCh4W2ldLCBhcmcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCh4W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG91dDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVsbEFsbDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoXy5pc05pbCh0YXJnZXQpIHx8IF8uaXNOaWwodGFyZ2V0W2ZpZWxkXSkpIHJldHVybjtcblxuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKCFfLmlzTmlsKHgpICYmICFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHlcIik7XG4gICAgICAgIH0gZWxzZSBpZiAoIV8uaXNOaWwoeCkpIHtcbiAgICAgICAgICAgIHZhciBvdXQgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGV4Y2x1ZGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYXJnLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChTZWxlY3Rvck1hdGNoZXIuZXF1YWwoeFtpXSwgYXJnW2pdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhjbHVkZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFleGNsdWRlKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG91dDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcmVuYW1lOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgdmFsdWUpIHtcbiAgICAgICAgaWYgKGZpZWxkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gbm8gaWRlYSB3aHkgbW9uZ28gaGFzIHRoaXMgcmVzdHJpY3Rpb24uLlxuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVGhlIG5ldyBmaWVsZCBuYW1lIG11c3QgYmUgZGlmZmVyZW50XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFfLmlzU3RyaW5nKHZhbHVlKSB8fCB2YWx1ZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJUaGUgbmV3IG5hbWUgbXVzdCBiZSBhIG5vbi1lbXB0eSBzdHJpbmdcIik7XG4gICAgICAgIH1cblxuICAgICAgICB0YXJnZXRbdmFsdWVdID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICAgICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG4gICAgfSxcblxuICAgICRiaXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgLy8gWFhYIG1vbmdvIG9ubHkgc3VwcG9ydHMgJGJpdCBvbiBpbnRlZ2VycywgYW5kIHdlIG9ubHkgc3VwcG9ydFxuICAgICAgICAvLyBuYXRpdmUgamF2YXNjcmlwdCBudW1iZXJzIChkb3VibGVzKSBzbyBmYXIsIHNvIHdlIGNhbid0IHN1cHBvcnQgJGJpdFxuICAgICAgICBsb2dnZXIudGhyb3coXCIkYml0IGlzIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUgPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSkge1xuICAgIGlmICghXy5pc1N0cmluZyhjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lIG11c3QgYmUgYSBTdHJpbmdcIik7XG4gICAgfVxuXG4gICAgaWYgKCFjb2xsZWN0aW9uTmFtZSB8fCBjb2xsZWN0aW9uTmFtZS5pbmRleE9mKCcuLicpICE9PSAtMSkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIGNhbm5vdCBiZSBlbXB0eVwiKTtcbiAgICB9XG5cbiAgICBpZiAoY29sbGVjdGlvbk5hbWUuaW5kZXhPZignJCcpICE9PSAtMSAmJiBjb2xsZWN0aW9uTmFtZS5tYXRjaCgvKCheXFwkY21kKXwob3Bsb2dcXC5cXCRtYWluKSkvKSA9PT0gbnVsbCkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IGNvbnRhaW4gJyQnXCIpO1xuICAgIH1cblxuICAgIGlmIChjb2xsZWN0aW9uTmFtZS5tYXRjaCgvXnN5c3RlbVxcLi8pICE9PSBudWxsKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgbXVzdCBub3Qgc3RhcnQgd2l0aCAnc3lzdGVtLicgKHJlc2VydmVkIGZvciBpbnRlcm5hbCB1c2UpXCIpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoY29sbGVjdGlvbk5hbWUubWF0Y2goL15cXC58XFwuJC8pICE9PSBudWxsKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgbXVzdCBub3Qgc3RhcnQgb3IgZW5kIHdpdGggJy4nXCIpO1xuICAgIH1cbn07XG5cbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVuYW1lID0gZnVuY3Rpb24obmV3TmFtZSkge1xuICAgIGlmIChfLmlzU3RyaW5nKG5ld05hbWUpKSB7XG4gICAgICAgIGlmICh0aGlzLm5hbWUgIT09IG5ld05hbWUpIHtcbiAgICAgICAgICAgIENvbGxlY3Rpb24uY2hlY2tDb2xsZWN0aW9uTmFtZShuZXdOYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGRiTmFtZSA9IHRoaXMubmFtZS5zcGxpdCgnLicpLmxlbmd0aCA+IDEgPyB0aGlzLm5hbWUuc3BsaXQoJy4nKVswXSA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLm5hbWUgPSBuZXdOYW1lO1xuICAgICAgICAgICAgdGhpcy5mdWxsTmFtZSA9IGRiTmFtZSArICcuJyArIHRoaXMubmFtZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBFcnJvclxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sbGVjdGlvbjtcblxuLyoqXG4gKiBHZXRzIHRoZSBzaXplIG9mIGFuIG9iamVjdC5cbiAqIFxuICogQG1ldGhvZCBPYmplY3Qjc2l6ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG9iamVjdFxuICogXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgc2l6ZSBvZiB0aGUgb2JqZWN0XG4gKi9cbk9iamVjdC5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHNpemUgPSAwLCBcbiAgICAgICAga2V5O1xuICAgIFxuICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHNpemUrKztcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gc2l6ZTtcbn07XG5cbnZhciBfZW5zdXJlRmluZFBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIC8vIHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFja1xuICAgIGlmIChfLmlzTmlsKHBhcmFtcy5zZWxlY3Rpb24pKSBwYXJhbXMuc2VsZWN0aW9uID0ge307XG5cbiAgICBpZiAoXy5pc05pbChwYXJhbXMuc2VsZWN0aW9uKSkgcGFyYW1zLnNlbGVjdGlvbiA9IHt9O1xuXG4gICAgaWYgKF8uaXNOaWwocGFyYW1zLmZpZWxkcykpIHBhcmFtcy5maWVsZHMgPSBbXTtcblxuICAgIGlmIChfLmlzTmlsKHBhcmFtcy5vcHRpb25zKSkge1xuICAgICAgICBwYXJhbXMub3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHNraXA6IDAsXG4gICAgICAgICAgICBsaW1pdDogMTUgLy8gZm9yIG5vIGxpbWl0IHBhc3MgW29wdGlvbnMubGltaXQgPSAtMV1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBjYWxsYmFjayBhcyBmaXJzdCBwYXJhbWV0ZXJcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5zZWxlY3Rpb24pKSB7XG4gICAgICAgIHBhcmFtcy5jYWxsYmFjayA9IHBhcmFtcy5zZWxlY3Rpb247XG4gICAgICAgIHBhcmFtcy5zZWxlY3Rpb24gPSB7fTtcbiAgICB9XG5cbiAgICAvLyBjYWxsYmFjayBhcyBzZWNvbmQgcGFyYW1ldGVyXG4gICAgaWYgKF8uaXNGdW5jdGlvbihwYXJhbXMuZmllbGRzKSkge1xuICAgICAgICBwYXJhbXMuY2FsbGJhY2sgPSBwYXJhbXMuZmllbGRzO1xuICAgICAgICBwYXJhbXMuZmllbGRzID0gW107XG4gICAgfVxuXG4gICAgLy8gY2FsbGJhY2sgYXMgdGhpcmQgcGFyYW1ldGVyXG4gICAgaWYgKF8uaXNGdW5jdGlvbihwYXJhbXMub3B0aW9ucykpIHtcbiAgICAgICAgcGFyYW1zLmNhbGxiYWNrID0gcGFyYW1zLm9wdGlvbnM7XG4gICAgICAgIHBhcmFtcy5vcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGFyZSB1c2luZyBhbiBvYmplY3RJZFxuICAgIGlmIChwYXJhbXMuc2VsZWN0aW9uIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgcGFyYW1zLnNlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgIF9pZDogcGFyYW1zLnNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmICghXy5pc05pbChwYXJhbXMuY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24ocGFyYW1zLmNhbGxiYWNrKSkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgfVxuXG4gICAgaWYgKHBhcmFtcy5vcHRpb25zLmZpZWxkcykge1xuICAgICAgICBpZiAoXy5pc05pbChwYXJhbXMuZmllbGRzKSB8fCBwYXJhbXMuZmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcGFyYW1zLmZpZWxkcyA9IHBhcmFtcy5vcHRpb25zLmZpZWxkcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKFwiRmllbGRzIGFscmVhZHkgcHJlc2VudC4gSWdub3JpbmcgJ29wdGlvbnMuZmllbGRzJy5cIik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHBhcmFtcztcbn07Il19
