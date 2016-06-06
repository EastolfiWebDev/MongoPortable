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
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var Logger = require("./utils/Logger"),
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
        _this.fullName = db.databaseName + '.' + _this.name;
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

    this.emit('find', {
        collection: this,
        selector: selection,
        fields: fields,
        options: options
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

    // this.emit('find', selector, cursor, o);

    this.emit('findOne', {
        collection: this,
        selector: selection,
        fields: fields,
        options: options
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

        this.emit('update', {
            collection: this,
            selector: selection,
            modifier: update,
            options: options,
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

    this.emit('remove', {
        collection: this,
        selector: selection,
        docs: docs
    });

    if (callback) callback(null, docs);

    return docs;
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
//# sourceMappingURL=data:application/json;base64,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Q0g7O0FBRUQsUUFBSSxPQUFPLE9BQVAsQ0FBZSxNQUFuQixFQUEyQjtBQUN2QixZQUFJLEVBQUUsS0FBRixDQUFRLE9BQU8sTUFBZixLQUEwQixPQUFPLE1BQVAsQ0FBYyxNQUFkLEtBQXlCLENBQXZELEVBQTBEO0FBQ3RELG1CQUFPLE1BQVAsR0FBZ0IsT0FBTyxPQUFQLENBQWUsTUFBL0I7QUFDSCxTQUZELE1BRU87QUFDSCxtQkFBTyxJQUFQLENBQVksb0RBQVo7QUFDSDtBQUNKOztBQUVELFdBQU8sTUFBUDtBQUNILENBckREIiwiZmlsZSI6IkNvbGxlY3Rpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIENvbGxlY3Rpb24uanMgLSBiYXNlZCBvbiBNb25nbG8jQ29sbGVjdGlvbiAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIExvZ2dlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0xvZ2dlclwiKSxcbiAgICBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi91dGlscy9FdmVudEVtaXR0ZXJcIiksXG4gICAgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIiksXG4gICAgQ3Vyc29yID0gcmVxdWlyZShcIi4vQ3Vyc29yXCIpLFxuICAgIE9iamVjdElkID0gcmVxdWlyZSgnLi9PYmplY3RJZCcpLFxuICAgIFNlbGVjdG9yID0gcmVxdWlyZShcIi4vU2VsZWN0b3JcIiksXG4gICAgU2VsZWN0b3JNYXRjaGVyID0gcmVxdWlyZShcIi4vU2VsZWN0b3JNYXRjaGVyXCIpO1xuICAgIFxudmFyIGxvZ2dlciA9IG51bGw7XG4gICAgXG4vKipcbiAqIENvbGxlY3Rpb25cbiAqIFxuICogQG1vZHVsZSBDb2xsZWN0aW9uXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzaW5jZSAwLjAuMVxuICogXG4gKiBAY2xhc3NkZXNjIENvbGxlY3Rpb24gY2xhc3MgdGhhdCBtYXBzIGEgTW9uZ29EQi1saWtlIGNvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBEYXRhYmFzZSBvYmplY3RcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLnBrRmFjdG9yeT1udWxsXSAtIE9iamVjdCBvdmVycmlkaW5nIHRoZSBiYXNpYyBcIk9iamVjdElkXCIgcHJpbWFyeSBrZXkgZ2VuZXJhdGlvbi5cbiAqIFxuICovXG52YXIgZGF0YWJhc2UgPSBudWxsO1xuY2xhc3MgQ29sbGVjdGlvbiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4vLyB2YXIgQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucykge1xuICAgIGNvbnN0cnVjdG9yKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIENvbGxlY3Rpb24pKSByZXR1cm4gbmV3IENvbGxlY3Rpb24oZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoZGIpKSBsb2dnZXIudGhyb3coXCJkYiBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChjb2xsZWN0aW9uTmFtZSkpIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb25OYW1lIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpIHx8ICFfLmlzUGxhaW5PYmplY3Qob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIENvbGxlY3Rpb24uY2hlY2tDb2xsZWN0aW9uTmFtZShjb2xsZWN0aW9uTmFtZSk7XG4gICAgXG4gICAgICAgIC8vIHRoaXMuZGIgPSBkYjtcbiAgICAgICAgZGF0YWJhc2UgPSBkYjtcbiAgICAgICAgdGhpcy5uYW1lID0gY29sbGVjdGlvbk5hbWU7XG4gICAgICAgIHRoaXMuZnVsbE5hbWUgPSBkYi5kYXRhYmFzZU5hbWUgKyAnLicgKyB0aGlzLm5hbWU7XG4gICAgICAgIHRoaXMuZG9jcyA9IFtdO1xuICAgICAgICB0aGlzLmRvY19pbmRleGVzID0ge307XG4gICAgICAgIHRoaXMuc25hcHNob3RzID0gW107XG4gICAgICAgIHRoaXMub3B0cyA9IHt9OyAvLyBEZWZhdWx0IG9wdGlvbnNcbiAgICAgICAgXG4gICAgICAgIF8ubWVyZ2UodGhpcy5vcHRzLCBvcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRoaXMuZW1pdCA9IGRiLmVtaXQ7XG4gICAgfVxuICAgIFxuICAgIGVtaXQobmFtZSwgYXJncywgY2IpIHtcbiAgICAgICAgc3VwZXIuZW1pdChuYW1lLCBhcmdzLCBjYiwgZGF0YWJhc2UuX3N0b3Jlcyk7XG4gICAgfVxufVxuXG4vLyBUT0RPIGVuZm9yY2UgcnVsZSB0aGF0IGZpZWxkIG5hbWVzIGNhbid0IHN0YXJ0IHdpdGggJyQnIG9yIGNvbnRhaW4gJy4nXG4vLyAocmVhbCBtb25nb2RiIGRvZXMgaW4gZmFjdCBlbmZvcmNlIHRoaXMpXG4vLyBUT0RPIHBvc3NpYmx5IGVuZm9yY2UgdGhhdCAndW5kZWZpbmVkJyBkb2VzIG5vdCBhcHBlYXIgKHdlIGFzc3VtZVxuLy8gdGhpcyBpbiBvdXIgaGFuZGxpbmcgb2YgbnVsbCBhbmQgJGV4aXN0cylcbi8qKlxuICogSW5zZXJ0cyBhIGRvY3VtZW50IGludG8gdGhlIGNvbGxlY3Rpb25cbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI2luc2VydFxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIC0gRG9jdW1lbnQgdG8gYmUgaW5zZXJ0ZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5jaGFpbj1mYWxzZV0gLSBJZiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBzbyBpdCBjYW4gYmUgY2hhaW5lZCB3aXRoIG90aGVyIG1ldGhvZHNcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdHxDb2xsZWN0aW9ufSBJZiBcIm9wdGlvbnMuY2hhaW5cIiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgaW5zZXJ0ZWQgZG9jdW1lbnRcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24gKGRvYywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChkb2MpKSBsb2dnZXIudGhyb3coXCJkb2MgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgIFxuICAgIGlmICghXy5pc1BsYWluT2JqZWN0KGRvYykpIGxvZ2dlci50aHJvdyhcImRvYyBtdXN0IGJlIGFuIG9iamVjdFwiKTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICAvLyBDcmVhdGluZyBhIHNhZmUgY29weSBvZiB0aGUgZG9jdW1lbnRcbiAgICB2YXIgX2RvYyA9IF8uY2xvbmVEZWVwKGRvYyk7XG5cbiAgICAvLyBJZiB0aGUgZG9jdW1lbnQgY29tZXMgd2l0aCBhIG51bWJlciBJRCwgcGFyc2UgaXQgdG8gU3RyaW5nXG4gICAgaWYgKF8uaXNOdW1iZXIoX2RvYy5faWQpKSB7XG4gICAgICAgIF9kb2MuX2lkID0gXy50b1N0cmluZyhfZG9jLl9pZCk7XG4gICAgfVxuXG4gICAgaWYgKF8uaXNOaWwoX2RvYy5faWQpIHx8ICghX2RvYy5faWQgaW5zdGFuY2VvZiBPYmplY3RJZCAmJiAoIV8uaXNTdHJpbmcoX2RvYy5faWQpIHx8ICFfZG9jLl9pZC5sZW5ndGgpKSkge1xuICAgICAgICBfZG9jLl9pZCA9IG5ldyBPYmplY3RJZCgpO1xuICAgIH1cblxuICAgIC8vIEFkZCBvcHRpb25zIHRvIG1vcmUgZGF0ZXNcbiAgICBfZG9jLnRpbWVzdGFtcCA9IG5ldyBPYmplY3RJZCgpLmdlbmVyYXRpb25UaW1lO1xuICAgIFxuICAgIC8vIFJldmVyc2VcbiAgICB0aGlzLmRvY19pbmRleGVzW18udG9TdHJpbmcoX2RvYy5faWQpXSA9IHRoaXMuZG9jcy5sZW5ndGg7XG4gICAgdGhpcy5kb2NzLnB1c2goX2RvYyk7XG4gICAgXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnaW5zZXJ0JyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIGRvYzogX2RvY1xuICAgICAgICB9XG4gICAgKTtcblxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgX2RvYyk7XG5cbiAgICBpZiAob3B0aW9ucy5jaGFpbikgcmV0dXJuIHRoaXM7XG4gICAgXG4gICAgcmV0dXJuIF9kb2M7XG59O1xuXG4vKipcbiAqIEZpbmRzIGFsbCBtYXRjaGluZyBkb2N1bWVudHNcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI2ZpbmRcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbZmllbGRzPXt9XSAtIFRoZSBmaWVsZHMgb2YgdGhlIGRvY3VtZW50IHRvIHNob3dcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnNraXBdIC0gTnVtYmVyIG9mIGRvY3VtZW50cyB0byBiZSBza2lwcGVkXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubGltaXRdIC0gTWF4IG51bWJlciBvZiBkb2N1bWVudHMgdG8gZGlzcGxheVxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbb3B0aW9ucy5maWVsZHNdIC0gU2FtZSBhcyBcImZpZWxkc1wiIHBhcmFtZXRlciAoaWYgYm90aCBwYXNzZWQsIFwib3B0aW9ucy5maWVsZHNcIiB3aWxsIGJlIGlnbm9yZWQpXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmZvcmNlRmV0Y2g9ZmFsc2VdIC0gSWYgc2V0IHRvJ1widHJ1ZVwiIHJldHVybnMndFwiZTthcnJheSBvZiBkb2N1bWVudHMgYWxyZWFkeSBmZXRjaGVkXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge0FycmF5fEN1cnNvcn0gSWYgXCJvcHRpb25zLmZvcmNlRmV0Y2hcIiBzZXQgdG8gdHJ1ZSByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMsIG90aGVyd2lzZSByZXR1cm5zIGEgY3Vyc29yXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgbGV0IHBhcmFtcyA9IF9lbnN1cmVGaW5kUGFyYW1zKHtcbiAgICAgICAgc2VsZWN0aW9uOiBzZWxlY3Rpb24sIFxuICAgICAgICBmaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgb3B0aW9uczogb3B0aW9ucywgXG4gICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgIH0pO1xuICAgIFxuICAgIHNlbGVjdGlvbiA9IHBhcmFtcy5zZWxlY3Rpb247XG4gICAgZmllbGRzID0gcGFyYW1zLmZpZWxkcztcbiAgICBvcHRpb25zID0gcGFyYW1zLm9wdGlvbnM7XG4gICAgY2FsbGJhY2sgPSBwYXJhbXMuY2FsbGJhY2s7XG4gICAgXG4gICAgLy8gY2FsbGJhY2sgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICB2YXIgY3Vyc29yID0gbmV3IEN1cnNvcih0aGlzLmRiLCB0aGlzLCBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucyk7XG5cbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdmaW5kJyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICBmaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgLy8gUGFzcyB0aGUgY3Vyc29yIGZldGNoZWQgdG8gdGhlIGNhbGxiYWNrXG4gICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBjdXJzb3IuZmV0Y2goKSk7XG5cbiAgICBpZiAob3B0aW9ucy5mb3JjZUZldGNoKSB7XG4gICAgICAgIHJldHVybiBjdXJzb3IuZmV0Y2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY3Vyc29yO1xuICAgIH1cbn07XG5cbi8qKlxuICogRmluZHMgdGhlIGZpcnN0IG1hdGNoaW5nIGRvY3VtZW50XG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNmaW5kT25lXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5za2lwXSAtIE51bWJlciBvZiBkb2N1bWVudHMgdG8gYmUgc2tpcHBlZFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmxpbWl0XSAtIE1heCBudW1iZXIgb2YgZG9jdW1lbnRzIHRvIGRpc3BsYXlcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW29wdGlvbnMuZmllbGRzXSAtIFNhbWUgYXMgXCJmaWVsZHNcIiBwYXJhbWV0ZXIgKGlmIGJvdGggcGFzc2VkLCBcIm9wdGlvbnMuZmllbGRzXCIgd2lsbCBiZSBpZ25vcmVkKVxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGZpcnN0IG1hdGNoaW5nIGRvY3VtZW50IG9mIHRoZSBjb2xsZWN0aW9uXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmZpbmRPbmUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgbGV0IHBhcmFtcyA9IF9lbnN1cmVGaW5kUGFyYW1zKHtcbiAgICAgICAgc2VsZWN0aW9uOiBzZWxlY3Rpb24sIFxuICAgICAgICBmaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgb3B0aW9uczogb3B0aW9ucywgXG4gICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgIH0pO1xuICAgIFxuICAgIHNlbGVjdGlvbiA9IHBhcmFtcy5zZWxlY3Rpb247XG4gICAgZmllbGRzID0gcGFyYW1zLmZpZWxkcztcbiAgICBvcHRpb25zID0gcGFyYW1zLm9wdGlvbnM7XG4gICAgY2FsbGJhY2sgPSBwYXJhbXMuY2FsbGJhY2s7XG4gICAgXG4gICAgdmFyIGN1cnNvciA9IG5ldyBDdXJzb3IodGhpcy5kYiwgdGhpcywgc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMpO1xuXG4gICAgLy8gdGhpcy5lbWl0KCdmaW5kJywgc2VsZWN0b3IsIGN1cnNvciwgbyk7XG5cbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdmaW5kT25lJyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICBmaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgdmFyIHJlcyA9IG51bGw7XG4gICAgXG4gICAgaWYgKGN1cnNvci5oYXNOZXh0KCkpIHtcbiAgICAgICAgcmVzID0gY3Vyc29yLm5leHQoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gUGFzcyB0aGUgY3Vyc29yIGZldGNoZWQgdG8gdGhlIGNhbGxiYWNrXG4gICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgIFxuICAgIHJldHVybiByZXM7XG59O1xuXG5cbi8qKlxuICogVXBkYXRlcyBvbmUgb3IgbWFueSBkb2N1bWVudHNcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI3VwZGF0ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdH0gW3VwZGF0ZT17fV0gLSBUaGUgdXBkYXRlIG9wZXJhdGlvblxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudXBkYXRlQXNNb25nbz10cnVlXSAtIEJ5IGRlZmF1bHQ6IFxuICogICAgICBJZiB0aGUgW3VwZGF0ZV0gb2JqZWN0IGNvbnRhaW5zIHVwZGF0ZSBvcGVyYXRvciBtb2RpZmllcnMsIHN1Y2ggYXMgdGhvc2UgdXNpbmcgdGhlIFwiJHNldFwiIG1vZGlmaWVyLCB0aGVuOlxuICogICAgICAgICAgPHVsPlxuICogICAgICAgICAgICAgIDxsaT5UaGUgW3VwZGF0ZV0gb2JqZWN0IG11c3QgY29udGFpbiBvbmx5IHVwZGF0ZSBvcGVyYXRvciBleHByZXNzaW9uczwvbGk+XG4gKiAgICAgICAgICAgICAgPGxpPlRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgdXBkYXRlcyBvbmx5IHRoZSBjb3JyZXNwb25kaW5nIGZpZWxkcyBpbiB0aGUgZG9jdW1lbnQ8L2xpPlxuICogICAgICAgICAgPHVsPlxuICogICAgICBJZiB0aGUgW3VwZGF0ZV0gb2JqZWN0IGNvbnRhaW5zIG9ubHkgXCJmaWVsZDogdmFsdWVcIiBleHByZXNzaW9ucywgdGhlbjpcbiAqICAgICAgICAgIDx1bD5cbiAqICAgICAgICAgICAgICA8bGk+VGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCByZXBsYWNlcyB0aGUgbWF0Y2hpbmcgZG9jdW1lbnQgd2l0aCB0aGUgW3VwZGF0ZV0gb2JqZWN0LiBUaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIGRvZXMgbm90IHJlcGxhY2UgdGhlIFwiX2lkXCIgdmFsdWU8L2xpPlxuICogICAgICAgICAgICAgIDxsaT5Db2xsZWN0aW9uI3VwZGF0ZSBjYW5ub3QgdXBkYXRlIG11bHRpcGxlIGRvY3VtZW50czwvbGk+XG4gKiAgICAgICAgICA8dWw+XG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5vdmVycmlkZT1mYWxzZV0gLSBSZXBsYWNlcyB0aGUgd2hvbGUgZG9jdW1lbnQgKG9ubHkgYXBsbGllcyB3aGVuIFt1cGRhdGVBc01vbmdvPWZhbHNlXSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy51cHNlcnQ9ZmFsc2VdIC0gQ3JlYXRlcyBhIG5ldyBkb2N1bWVudCB3aGVuIG5vIGRvY3VtZW50IG1hdGNoZXMgdGhlIHF1ZXJ5IGNyaXRlcmlhXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubXVsdGk9ZmFsc2VdIC0gVXBkYXRlcyBtdWx0aXBsZSBkb2N1bWVudHMgdGhhdCBtZWV0IHRoZSBjcml0ZXJpYVxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggdGhlIHVwZGF0ZS9pbnNlcnQgKGlmIHVwc2VydD10cnVlKSBpbmZvcm1hdGlvblxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCB1cGRhdGUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoc2VsZWN0aW9uKSkgc2VsZWN0aW9uID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNOaWwodXBkYXRlKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3Qgc3BlY2lmeSB0aGUgdXBkYXRlIG9wZXJhdGlvblwiKTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkge1xuICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgIGxpbWl0OiAxNSAgIC8vIGZvciBubyBsaW1pdCBwYXNzIFtvcHRpb25zLmxpbWl0ID0gLTFdXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3Qgc3BlY2lmeSB0aGUgdXBkYXRlIG9wZXJhdGlvblwiKTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHVwZGF0ZSkpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHNwZWNpZnkgdGhlIHVwZGF0ZSBvcGVyYXRpb25cIik7XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGFyZSB1c2luZyBhbiBvYmplY3RJZFxuICAgIGlmKHNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgIHNlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgIF9pZDogc2VsZWN0aW9uXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcblxuICAgIHZhciByZXMgPSBudWxsO1xuXG4gICAgdmFyIGRvY3MgPSBudWxsO1xuICAgIGlmIChvcHRpb25zLm11bHRpKSB7XG4gICAgICAgIGRvY3MgPSB0aGlzLmZpbmQoc2VsZWN0aW9uLCBudWxsLCB7IGZvcmNlRmV0Y2g6IHRydWUgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZG9jcyA9IHRoaXMuZmluZE9uZShzZWxlY3Rpb24pO1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc05pbChkb2NzKSkge1xuICAgICAgICBkb2NzID0gW107XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc0FycmF5KGRvY3MpKSB7XG4gICAgICAgIGRvY3MgPSBbZG9jc107XG4gICAgfVxuICAgIFxuICAgIGlmIChkb2NzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBpZiAob3B0aW9ucy51cHNlcnQpIHtcbiAgICAgICAgICAgIHZhciBpbnNlcnRlZCA9IHRoaXMuaW5zZXJ0KHVwZGF0ZSk7XG5cbiAgICAgICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogW2luc2VydGVkXSxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDFcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gZG9jdW1lbnRzIGZvdW5kXG4gICAgICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB1cGRhdGVkRG9jcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb2NzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZG9jID0gZG9jc1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG92ZXJyaWRlID0gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGhhc01vZGlmaWVyID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJRTcgZG9lc24ndCBzdXBwb3J0IGluZGV4aW5nIGludG8gc3RyaW5ncyAoZWcsIGtleVswXSBvciBrZXkuaW5kZXhPZignJCcpICksIHNvIHVzZSBzdWJzdHIuXG4gICAgICAgICAgICAgICAgLy8gVGVzdGluZyBvdmVyIHRoZSBmaXJzdCBsZXR0ZXI6XG4gICAgICAgICAgICAgICAgLy8gICAgICBCZXN0cyByZXN1bHQgd2l0aCAxZTggbG9vcHMgPT4ga2V5WzBdKH4zcykgPiBzdWJzdHIofjVzKSA+IHJlZ2V4cCh+NnMpID4gaW5kZXhPZih+MTZzKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBtb2RpZmllciA9IChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpO1xuICAgICAgICAgICAgICAgIGlmIChtb2RpZmllcikge1xuICAgICAgICAgICAgICAgICAgICBoYXNNb2RpZmllciA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnVwZGF0ZUFzTW9uZ28pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc01vZGlmaWVyICYmICFtb2RpZmllcikgbG9nZ2VyLnRocm93KFwiQWxsIHVwZGF0ZSBmaWVsZHMgbXVzdCBiZSBhbiB1cGRhdGUgb3BlcmF0b3JcIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc01vZGlmaWVyICYmIG9wdGlvbnMubXVsdGkpIGxvZ2dlci50aHJvdyhcIllvdSBjYW4gbm90IHVwZGF0ZSBzZXZlcmFsIGRvY3VtZW50cyB3aGVuIG5vIHVwZGF0ZSBvcGVyYXRvcnMgYXJlIGluY2x1ZGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc01vZGlmaWVyKSBvdmVycmlkZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNNb2RpZmllcikgb3ZlcnJpZGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJyaWRlID0gISFvcHRpb25zLm92ZXJyaWRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIF9kb2NVcGRhdGUgPSBudWxsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAob3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBPdmVycmlkZXMgdGhlIGRvY3VtZW50IGV4Y2VwdCBmb3IgdGhlIFwiX2lkXCJcbiAgICAgICAgICAgICAgICBfZG9jVXBkYXRlID0ge1xuICAgICAgICAgICAgICAgICAgICBfaWQ6IGRvYy5faWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE11c3QgaWdub3JlIGZpZWxkcyBzdGFydGluZyB3aXRoICckJywgJy4nLi4uXG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnIHx8IC9cXC4vZy50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBUaGUgZmllbGQgJHtrZXl9IGNhbiBub3QgYmVnaW4gd2l0aCAnJCcgb3IgY29udGFpbiAnLidgKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGVba2V5XSA9IHVwZGF0ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfZG9jVXBkYXRlID0gXy5jbG9uZURlZXAoZG9jKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWwgPSB1cGRhdGVba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSBfYXBwbHlNb2RpZmllcihfZG9jVXBkYXRlLCBrZXksIHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaXNOaWwoX2RvY1VwZGF0ZVtrZXldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihcIlRoZSBmaWVsZCAnX2lkJyBjYW4gbm90IGJlIHVwZGF0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgVGhlIGRvY3VtZW50IGRvZXMgbm90IGNvbnRhaW5zIHRoZSBmaWVsZCAke2tleX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdXBkYXRlZERvY3MucHVzaChfZG9jVXBkYXRlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGlkeCA9IHRoaXMuZG9jX2luZGV4ZXNbX2RvY1VwZGF0ZS5faWRdO1xuICAgICAgICAgICAgdGhpcy5kb2NzW2lkeF0gPSBfZG9jVXBkYXRlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAndXBkYXRlJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgbW9kaWZpZXI6IHVwZGF0ZSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBvcHRpb25zLFxuICAgICAgICAgICAgICAgIGRvY3M6IHVwZGF0ZWREb2NzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnRzOiB1cGRhdGVkRG9jcyxcbiAgICAgICAgICAgICAgICBjb3VudDogdXBkYXRlZERvY3MubGVuZ3RoXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgIFxuICAgIHJldHVybiByZXM7XG59O1xuXG52YXIgX2FwcGx5TW9kaWZpZXIgPSBmdW5jdGlvbihfZG9jVXBkYXRlLCBrZXksIHZhbCkge1xuICAgIHZhciBkb2MgPSBfLmNsb25lRGVlcChfZG9jVXBkYXRlKTtcbiAgICAvLyB2YXIgbW9kID0gX21vZGlmaWVyc1trZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgaWYgKCFfbW9kaWZpZXJzW2tleV0pIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KGBJbnZhbGlkIG1vZGlmaWVyIHNwZWNpZmllZDogJHtrZXl9YCk7XG4gICAgfVxuICAgIFxuICAgIGZvciAodmFyIGtleXBhdGggaW4gdmFsKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHZhbFtrZXlwYXRoXTtcbiAgICAgICAgdmFyIGtleXBhcnRzID0ga2V5cGF0aC5zcGxpdCgnLicpO1xuICAgICAgICBcbiAgICAgICAgX21vZGlmeShkb2MsIGtleXBhcnRzLCB2YWx1ZSwga2V5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHZhciBub19jcmVhdGUgPSAhIUNvbGxlY3Rpb24uX25vQ3JlYXRlTW9kaWZpZXJzW2tleV07XG4gICAgICAgIC8vIHZhciBmb3JiaWRfYXJyYXkgPSAoa2V5ID09PSBcIiRyZW5hbWVcIik7XG4gICAgICAgIC8vIHZhciB0YXJnZXQgPSBDb2xsZWN0aW9uLl9maW5kTW9kVGFyZ2V0KF9kb2NVcGRhdGUsIGtleXBhcnRzLCBub19jcmVhdGUsIGZvcmJpZF9hcnJheSk7XG4gICAgICAgIC8vIHZhciBmaWVsZCA9IGtleXBhcnRzLnBvcCgpO1xuXG4gICAgICAgIC8vIG1vZCh0YXJnZXQsIGZpZWxkLCB2YWx1ZSwga2V5cGF0aCwgX2RvY1VwZGF0ZSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBkb2M7XG59O1xuXG52YXIgX21vZGlmeSA9IGZ1bmN0aW9uKGRvY3VtZW50LCBrZXlwYXJ0cywgdmFsdWUsIGtleSwgbGV2ZWwgPSAwKSB7XG4gICAgZm9yIChsZXQgaSA9IGxldmVsOyBpIDwga2V5cGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IHBhdGggPSBrZXlwYXJ0c1tpXTtcbiAgICAgICAgbGV0IGlzTnVtZXJpYyA9IC9eWzAtOV0rJC8udGVzdChwYXRoKTtcbiAgICAgICAgbGV0IHRhcmdldCA9IGRvY3VtZW50W3BhdGhdO1xuICAgICAgICBcbiAgICAgICAgdmFyIGNyZWF0ZSA9IF8uaGFzSW4oQ29sbGVjdGlvbi5fbm9DcmVhdGVNb2RpZmllcnMsIGtleSkgPyBmYWxzZSA6IHRydWU7XG4gICAgICAgIGlmICghY3JlYXRlICYmICghXy5pc09iamVjdChkb2N1bWVudCkgfHwgXy5pc05pbCh0YXJnZXQpKSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KGBUaGUgZWxlbWVudCBcIiR7cGF0aH1cIiBtdXN0IGV4aXN0cyBpbiBcIiR7SlNPTi5zdHJpbmdpZnkoZG9jdW1lbnQpfVwiYCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQXJyYXkoZG9jdW1lbnQpKSB7XG4gICAgICAgICAgICAvLyBEbyBub3QgYWxsb3cgJHJlbmFtZSBvbiBhcnJheXNcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiJHJlbmFtZVwiKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBsZXQgdGhlIHVzZSBvZiBcImFycmF5ZmllbGQuPG51bWVyaWNfaW5kZXg+LnN1YmZpZWxkXCJcbiAgICAgICAgICAgIGlmIChpc051bWVyaWMpIHtcbiAgICAgICAgICAgICAgICBwYXRoID0gXy50b051bWJlcihwYXRoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KGBUaGUgZmllbGQgXCIke3BhdGh9XCIgY2FuIG5vdCBiZSBhcHBlbmRlZCB0byBhbiBhcnJheWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaWxsIHRoZSBhcnJheSB0byB0aGUgZGVzaXJlZCBsZW5ndGhcbiAgICAgICAgICAgIHdoaWxlIChkb2N1bWVudC5sZW5ndGggPCBwYXRoKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucHVzaChudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGkgPCBrZXlwYXJ0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBpZiAoXy5pc05pbCh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgYXJlIGFjY2Vzc2luZyB3aXRoIFwiYXJyYXlGaWVsZC48bnVtZXJpY19pbmRleD5cIlxuICAgICAgICAgICAgICAgIGlmIChfLmlzRmluaXRlKF8udG9OdW1iZXIoa2V5cGFydHNbaSArIDFdKSkpIHsgIC8vICB8fCBrZXlwYXJ0c1tpICsgMV0gPT09ICckJyAgLy8gVE9ETyBcImFycmF5RmllbGQuJFwiXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IFtdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZG9jdW1lbnRbcGF0aF0gPSBfbW9kaWZ5KHRhcmdldCwga2V5cGFydHMsIHZhbHVlLCBrZXksIGxldmVsICsgMSk7XG5cbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF9tb2RpZmllcnNba2V5XShkb2N1bWVudCwgcGF0aCwgdmFsdWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZG9jdW1lbnQ7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgb25lIG9yIG1hbnkgZG9jdW1lbnRzXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNyZW1vdmVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuanVzdE9uZT1mYWxzZV0gLSBEZWxldGVzIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIHRoZSBzZWxlY3Rpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHRoZSBkZWxldGVkIGRvY3VtZW50c1xuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0geyBqdXN0T25lOiBmYWxzZSB9O1xuICAgIFxuICAgIC8vIElmIHdlIGFyZSBub3QgcGFzc2luZyBhIHNlbGVjdGlvbiBhbmQgd2UgYXJlIG5vdCByZW1vdmluZyBqdXN0IG9uZSwgaXMgdGhlIHNhbWUgYXMgYSBkcm9wXG4gICAgaWYgKE9iamVjdC5zaXplKHNlbGVjdGlvbikgPT09IDAgJiYgIW9wdGlvbnMuanVzdE9uZSkgcmV0dXJuIHRoaXMuZHJvcChvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgXG4gICAgLy8gQ2hlY2sgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGFyZSB1c2luZyBhbiBvYmplY3RJZFxuICAgIGlmKHNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgIHNlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgIF9pZDogc2VsZWN0aW9uXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICB2YXIgY3Vyc29yID0gdGhpcy5maW5kKHNlbGVjdGlvbik7XG4gICAgXG4gICAgdmFyIGRvY3MgPSBbXTtcbiAgICBjdXJzb3IuZm9yRWFjaChkb2MgPT4ge1xuICAgICAgICB2YXIgaWR4ID0gdGhpcy5kb2NfaW5kZXhlc1tkb2MuX2lkXTtcbiAgICAgICAgXG4gICAgICAgIGRlbGV0ZSB0aGlzLmRvY19pbmRleGVzW2RvYy5faWRdO1xuICAgICAgICB0aGlzLmRvY3Muc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIFxuICAgICAgICBkb2NzLnB1c2goZG9jKTtcbiAgICB9KTtcbiAgICBcbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdyZW1vdmUnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgIGRvY3M6IGRvY3NcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBkb2NzKTtcbiAgICBcbiAgICByZXR1cm4gZG9jcztcbn07XG5cbi8qKlxuICogRHJvcHMgYSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNkcm9wXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmRyb3BJbmRleGVzPWZhbHNlXSAtIFRydWUgaWYgd2Ugd2FudCB0byBkcm9wIHRoZSBpbmRleGVzIHRvb1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gVHJ1ZSB3aGVuIHRoZSBjb2xsZWN0aW9uIGlzIGRyb3BwZWRcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgdGhpcy5kb2NfaW5kZXhlcyA9IHt9O1xuICAgIHRoaXMuZG9jcyA9IFtdO1xuICAgIFxuICAgIGlmIChvcHRpb25zLmRyb3BJbmRleGVzKSB7fSAvLyBUT0RPXG4gICAgXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnZHJvcENvbGxlY3Rpb24nLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgaW5kZXhlczogISFvcHRpb25zLmRyb3BJbmRleGVzXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgdHJ1ZSk7XG4gICAgXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEluc2VydCBvciB1cGRhdGUgYSBkb2N1bWVudC4gSWYgdGhlIGRvY3VtZW50IGhhcyBhbiBcIl9pZFwiIGlzIGFuIHVwZGF0ZSAod2l0aCB1cHNlcnQpLCBpZiBub3QgaXMgYW4gaW5zZXJ0LlxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jc2F2ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIC0gRG9jdW1lbnQgdG8gYmUgaW5zZXJ0ZWQvdXBkYXRlZFxuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuZHJvcEluZGV4ZXM9ZmFsc2VdIC0gVHJ1ZSBpZiB3ZSB3YW50IHRvIGRyb3AgdGhlIGluZGV4ZXMgdG9vXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUcnVlIHdoZW4gdGhlIGNvbGxlY3Rpb24gaXMgZHJvcHBlZFxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24oZG9jLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGRvYykgfHwgXy5pc0Z1bmN0aW9uKGRvYykpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHBhc3MgYSBkb2N1bWVudFwiKTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGlmIChfLmhhc0luKGRvYywgJ19pZCcpKSB7XG4gICAgICAgIG9wdGlvbnMudXBzZXJ0ID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZShcbiAgICAgICAgICAgIHsgX2lkOiBkb2MuX2lkIH0sXG4gICAgICAgICAgICBkb2MsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnNlcnQoZG9jLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5lbnN1cmVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vVE9ETyBJbXBsZW1lbnQgRW5zdXJlSW5kZXhcbiAgICBsb2dnZXIudGhyb3coJ0NvbGxlY3Rpb24jZW5zdXJlSW5kZXggdW5pbXBsZW1lbnRlZCBieSBkcml2ZXInKTtcbn07XG5cbi8vIFRPRE8gZG9jdW1lbnQgKGF0IHNvbWUgcG9pbnQpXG4vLyBUT0RPIHRlc3Rcbi8vIFRPRE8gb2J2aW91c2x5IHRoaXMgcGFydGljdWxhciBpbXBsZW1lbnRhdGlvbiB3aWxsIG5vdCBiZSB2ZXJ5IGVmZmljaWVudFxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgYmFja3VwSUQgPSBuZXcgT2JqZWN0SWQoKS50b1N0cmluZygpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG5cbiAgICB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF0gPSBfLmNsb25lRGVlcCh0aGlzLmRvY3MpO1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3NuYXBzaG90JyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRCxcbiAgICAgICAgICAgIGRvY3VtZW50czogdGhpcy5zbmFwc2hvdHNbYmFja3VwSURdIFxuICAgICAgICB9XG4gICAgKTtcblxuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRCxcbiAgICAgICAgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF1cbiAgICB9O1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBMaXN0cyBhdmFpbGFibGUgQmFja3Vwc1xuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXBzID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIHZhciBiYWNrdXBzID0gW107XG5cbiAgICBmb3IgKGxldCBpZCBpbiB0aGlzLnNuYXBzaG90cykge1xuICAgICAgICBiYWNrdXBzLnB1c2goe2lkOiBpZCwgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tpZF19KTtcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGJhY2t1cHMpO1xuXG4gICAgcmV0dXJuIGJhY2t1cHM7XG59O1xuXG4vLyBMaXN0cyBhdmFpbGFibGUgQmFja3Vwc1xuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVCYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgYmFja3VwSUQgPSBudWxsO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgbGV0IHJlc3VsdCA9IGZhbHNlO1xuICAgIFxuICAgIGlmIChiYWNrdXBJRCkge1xuICAgICAgICBkZWxldGUgdGhpcy5zbmFwc2hvdHNbXy50b1N0cmluZyhiYWNrdXBJRCldO1xuICAgICAgICBcbiAgICAgICAgcmVzdWx0ID0gYmFja3VwSUQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zbmFwc2hvdHMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgfVxuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8vIFJlc3RvcmUgdGhlIHNuYXBzaG90LiBJZiBubyBzbmFwc2hvdCBleGlzdHMsIHJhaXNlIGFuIGV4Y2VwdGlvbjtcbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVzdG9yZSA9IGZ1bmN0aW9uIChiYWNrdXBJRCwgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGJhY2t1cElEKSkge1xuICAgICAgICBjYWxsYmFjayA9IGJhY2t1cElEO1xuICAgICAgICBiYWNrdXBJRCA9IG51bGw7XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICB2YXIgc25hcHNob3RDb3VudCA9IE9iamVjdC5zaXplKHRoaXMuc25hcHNob3RzKTtcbiAgICB2YXIgYmFja3VwRGF0YSA9IG51bGw7XG5cbiAgICBpZiAoc25hcHNob3RDb3VudCA9PT0gMCkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJUaGVyZSBpcyBubyBzbmFwc2hvdHNcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFiYWNrdXBJRCkge1xuICAgICAgICAgICAgaWYgKHNuYXBzaG90Q291bnQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhcIk5vIGJhY2t1cElEIHBhc3NlZC4gUmVzdG9yaW5nIHRoZSBvbmx5IHNuYXBzaG90XCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJldHJpZXZlIHRoZSBvbmx5IHNuYXBzaG90XG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHRoaXMuc25hcHNob3RzKSBiYWNrdXBJRCA9IGtleTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVGhlIGFyZSBzZXZlcmFsIHNuYXBzaG90cy4gUGxlYXNlIHNwZWNpZnkgb25lIGJhY2t1cElEXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGJhY2t1cERhdGEgPSB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF07XG4gICAgICAgICAgICBcbiAgICBpZiAoIWJhY2t1cERhdGEpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KGBVbmtub3duIEJhY2t1cCBJRDogJHtiYWNrdXBJRH1gKTtcbiAgICB9XG5cbiAgICB0aGlzLmRvY3MgPSBiYWNrdXBEYXRhO1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3Jlc3RvcmUnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgYmFja3VwSUQ6IGJhY2t1cElEXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVycyA9IHtcbiAgICAkdW5zZXQ6IHRydWUsXG4gICAgJHBvcDogdHJ1ZSxcbiAgICAkcmVuYW1lOiB0cnVlLFxuICAgICRwdWxsOiB0cnVlLFxuICAgICRwdWxsQWxsOiB0cnVlXG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbnZhciBfbW9kaWZpZXJzID0ge1xuICAgICRpbmM6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKCFfLmlzTnVtYmVyKGFyZykpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRpbmMgYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgICAgaWYgKCFfLmlzTnVtYmVyKHRhcmdldFtmaWVsZF0pKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRpbmMgbW9kaWZpZXIgdG8gbm9uLW51bWJlclwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSArPSBhcmc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IF8uY2xvbmVEZWVwKGFyZyk7XG4gICAgfSxcblxuICAgICR1bnNldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoIV8uaXNOaWwodGFyZ2V0KSkge1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0YXJnZXRbZmllbGRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdXNoOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFthcmddO1xuICAgICAgICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVzaCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4LnB1c2goXy5jbG9uZURlZXAoYXJnKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1c2hBbGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmIChfLmlzTmlsKHgpKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHgucHVzaChhcmdbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRhZGRUb1NldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKF8uaXNOaWwoeCkpIHtcbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBbYXJnXTtcbiAgICAgICAgfSBlbHNlIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJGFkZFRvU2V0IG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBpc0VhY2ggPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChfLmlzUGxhaW5PYmplY3QoYXJnKSkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgaW4gYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrID09PSBcIiRlYWNoXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzRWFjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHZhbHVlcyA9IGlzRWFjaCA/IGFyZ1tcIiRlYWNoXCJdIDogW2FyZ107XG4gICAgICAgICAgICBfLmZvckVhY2godmFsdWVzLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yTWF0Y2hlci5lcXVhbCh2YWx1ZSwgeFtpXSkpIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB4LnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHBvcDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoXy5pc05pbCh0YXJnZXQpIHx8IF8uaXNOaWwodGFyZ2V0W2ZpZWxkXSkpIHJldHVybjtcblxuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcG9wIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChfLmlzTnVtYmVyKGFyZykgJiYgYXJnIDwgMCkge1xuICAgICAgICAgICAgICAgIHguc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4LnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkgfHwgXy5pc05pbCh0YXJnZXRbZmllbGRdKSkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIiAmJiAhKGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgIC8vIFhYWCB3b3VsZCBiZSBtdWNoIG5pY2VyIHRvIGNvbXBpbGUgdGhpcyBvbmNlLCByYXRoZXIgdGhhblxuICAgICAgICAgICAgICAgIC8vIGZvciBlYWNoIGRvY3VtZW50IHdlIG1vZGlmeS4uIGJ1dCB1c3VhbGx5IHdlJ3JlIG5vdFxuICAgICAgICAgICAgICAgIC8vIG1vZGlmeWluZyB0aGF0IG1hbnkgZG9jdW1lbnRzLCBzbyB3ZSdsbCBsZXQgaXQgc2xpZGUgZm9yXG4gICAgICAgICAgICAgICAgLy8gbm93XG5cbiAgICAgICAgICAgICAgICAvLyBYWFggX2NvbXBpbGVTZWxlY3RvciBpc24ndCB1cCBmb3IgdGhlIGpvYiwgYmVjYXVzZSB3ZSBuZWVkXG4gICAgICAgICAgICAgICAgLy8gdG8gcGVybWl0IHN0dWZmIGxpa2UgeyRwdWxsOiB7YTogeyRndDogNH19fS4uIHNvbWV0aGluZ1xuICAgICAgICAgICAgICAgIC8vIGxpa2UgeyRndDogNH0gaXMgbm90IG5vcm1hbGx5IGEgY29tcGxldGUgc2VsZWN0b3IuXG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoID0gbmV3IFNlbGVjdG9yKHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX21hdGNoaW5nX19cIjogYXJnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBfZG9jXyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9fbWF0Y2hpbmdfXzogeFtpXVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGNoLnRlc3QoX2RvY18pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCh4W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghU2VsZWN0b3JNYXRjaGVyLmVxdWFsKHhbaV0sIGFyZykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdWxsQWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkgfHwgXy5pc05pbCh0YXJnZXRbZmllbGRdKSkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoIV8uaXNOaWwoeCkgJiYgIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seVwiKTtcbiAgICAgICAgfSBlbHNlIGlmICghXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhjbHVkZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBhcmcubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yTWF0Y2hlci5lcXVhbCh4W2ldLCBhcmdbal0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIWV4Y2x1ZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRyZW5hbWU6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCB2YWx1ZSkge1xuICAgICAgICBpZiAoZmllbGQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBubyBpZGVhIHdoeSBtb25nbyBoYXMgdGhpcyByZXN0cmljdGlvbi4uXG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJUaGUgbmV3IGZpZWxkIG5hbWUgbXVzdCBiZSBkaWZmZXJlbnRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIV8uaXNTdHJpbmcodmFsdWUpIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIlRoZSBuZXcgbmFtZSBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZ1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRhcmdldFt2YWx1ZV0gPSB0YXJnZXRbZmllbGRdO1xuICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcbiAgICB9LFxuXG4gICAgJGJpdDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAvLyBYWFggbW9uZ28gb25seSBzdXBwb3J0cyAkYml0IG9uIGludGVnZXJzLCBhbmQgd2Ugb25seSBzdXBwb3J0XG4gICAgICAgIC8vIG5hdGl2ZSBqYXZhc2NyaXB0IG51bWJlcnMgKGRvdWJsZXMpIHNvIGZhciwgc28gd2UgY2FuJ3Qgc3VwcG9ydCAkYml0XG4gICAgICAgIGxvZ2dlci50aHJvdyhcIiRiaXQgaXMgbm90IHN1cHBvcnRlZFwiKTtcbiAgICB9XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24uY2hlY2tDb2xsZWN0aW9uTmFtZSA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lKSB7XG4gICAgaWYgKCFfLmlzU3RyaW5nKGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWUgbXVzdCBiZSBhIFN0cmluZ1wiKTtcbiAgICB9XG5cbiAgICBpZiAoIWNvbGxlY3Rpb25OYW1lIHx8IGNvbGxlY3Rpb25OYW1lLmluZGV4T2YoJy4uJykgIT09IC0xKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgY2Fubm90IGJlIGVtcHR5XCIpO1xuICAgIH1cblxuICAgIGlmIChjb2xsZWN0aW9uTmFtZS5pbmRleE9mKCckJykgIT09IC0xICYmIGNvbGxlY3Rpb25OYW1lLm1hdGNoKC8oKF5cXCRjbWQpfChvcGxvZ1xcLlxcJG1haW4pKS8pID09PSBudWxsKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgbXVzdCBub3QgY29udGFpbiAnJCdcIik7XG4gICAgfVxuXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLm1hdGNoKC9ec3lzdGVtXFwuLykgIT09IG51bGwpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBzdGFydCB3aXRoICdzeXN0ZW0uJyAocmVzZXJ2ZWQgZm9yIGludGVybmFsIHVzZSlcIik7XG4gICAgfVxuICAgIFxuICAgIGlmIChjb2xsZWN0aW9uTmFtZS5tYXRjaCgvXlxcLnxcXC4kLykgIT09IG51bGwpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBzdGFydCBvciBlbmQgd2l0aCAnLidcIik7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW5hbWUgPSBmdW5jdGlvbihuZXdOYW1lKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcobmV3TmFtZSkpIHtcbiAgICAgICAgaWYgKHRoaXMubmFtZSAhPT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKG5ld05hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgZGJOYW1lID0gdGhpcy5uYW1lLnNwbGl0KCcuJykubGVuZ3RoID4gMSA/IHRoaXMubmFtZS5zcGxpdCgnLicpWzBdIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IG5ld05hbWU7XG4gICAgICAgICAgICB0aGlzLmZ1bGxOYW1lID0gZGJOYW1lICsgJy4nICsgdGhpcy5uYW1lO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEVycm9yXG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xsZWN0aW9uO1xuXG4vKipcbiAqIEdldHMgdGhlIHNpemUgb2YgYW4gb2JqZWN0LlxuICogXG4gKiBAbWV0aG9kIE9iamVjdCNzaXplXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgb2JqZWN0XG4gKiBcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBzaXplIG9mIHRoZSBvYmplY3RcbiAqL1xuT2JqZWN0LnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgc2l6ZSA9IDAsIFxuICAgICAgICBrZXk7XG4gICAgXG4gICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBzaXplO1xufTtcblxudmFyIF9lbnN1cmVGaW5kUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgLy8gc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrXG4gICAgaWYgKF8uaXNOaWwocGFyYW1zLnNlbGVjdGlvbikpIHBhcmFtcy5zZWxlY3Rpb24gPSB7fTtcblxuICAgIGlmIChfLmlzTmlsKHBhcmFtcy5zZWxlY3Rpb24pKSBwYXJhbXMuc2VsZWN0aW9uID0ge307XG5cbiAgICBpZiAoXy5pc05pbChwYXJhbXMuZmllbGRzKSkgcGFyYW1zLmZpZWxkcyA9IFtdO1xuXG4gICAgaWYgKF8uaXNOaWwocGFyYW1zLm9wdGlvbnMpKSB7XG4gICAgICAgIHBhcmFtcy5vcHRpb25zID0ge1xuICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgIGxpbWl0OiAxNSAvLyBmb3Igbm8gbGltaXQgcGFzcyBbb3B0aW9ucy5saW1pdCA9IC0xXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIGNhbGxiYWNrIGFzIGZpcnN0IHBhcmFtZXRlclxuICAgIGlmIChfLmlzRnVuY3Rpb24ocGFyYW1zLnNlbGVjdGlvbikpIHtcbiAgICAgICAgcGFyYW1zLmNhbGxiYWNrID0gcGFyYW1zLnNlbGVjdGlvbjtcbiAgICAgICAgcGFyYW1zLnNlbGVjdGlvbiA9IHt9O1xuICAgIH1cblxuICAgIC8vIGNhbGxiYWNrIGFzIHNlY29uZCBwYXJhbWV0ZXJcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5maWVsZHMpKSB7XG4gICAgICAgIHBhcmFtcy5jYWxsYmFjayA9IHBhcmFtcy5maWVsZHM7XG4gICAgICAgIHBhcmFtcy5maWVsZHMgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBjYWxsYmFjayBhcyB0aGlyZCBwYXJhbWV0ZXJcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5vcHRpb25zKSkge1xuICAgICAgICBwYXJhbXMuY2FsbGJhY2sgPSBwYXJhbXMub3B0aW9ucztcbiAgICAgICAgcGFyYW1zLm9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgaWYgKHBhcmFtcy5zZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBwYXJhbXMuc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgX2lkOiBwYXJhbXMuc2VsZWN0aW9uXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzTmlsKHBhcmFtcy5jYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihwYXJhbXMuY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICB9XG5cbiAgICBpZiAocGFyYW1zLm9wdGlvbnMuZmllbGRzKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHBhcmFtcy5maWVsZHMpIHx8IHBhcmFtcy5maWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBwYXJhbXMuZmllbGRzID0gcGFyYW1zLm9wdGlvbnMuZmllbGRzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oXCJGaWVsZHMgYWxyZWFkeSBwcmVzZW50LiBJZ25vcmluZyAnb3B0aW9ucy5maWVsZHMnLlwiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gcGFyYW1zO1xufTsiXX0=
