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
    ObjectId = require('./ObjectId');
// Selector = require("./Selector");

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
                        _applyModifier(_docUpdate, _key2, val);
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
    var mod = _modifiers[key];

    if (!mod) {
        logger.throw("Invalid modifier specified: " + key);
    }

    for (var keypath in val) {
        var arg = val[keypath];
        var keyparts = keypath.split('.');
        var no_create = !!Collection._noCreateModifiers[key];
        var forbid_array = key === "$rename";
        var target = Collection._findModTarget(_docUpdate, keyparts, no_create, forbid_array);
        var field = keyparts.pop();

        mod(target, field, arg, keypath, _docUpdate);
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

// for a.b.c.2.d.e, keyparts should be ['a', 'b', 'c', '2', 'd', 'e'],
// and then you would operate on the 'e' property of the returned
// object. if no_create is falsey, creates intermediate levels of
// structure as necessary, like mkdir -p (and raises an exception if
// that would mean giving a non-numeric property to an array.) if
// no_create is true, return undefined instead. may modify the last
// element of keyparts to signal to the caller that it needs to use a
// different value to index into the returned object (for example,
// ['a', '01'] -> ['a', 1]). if forbid_array is true, return null if
// the keypath goes through an array.
/**
* @ignore
*/
Collection._findModTarget = function (doc, keyparts, no_create, forbid_array) {
    for (var i = 0; i < keyparts.length; i++) {
        var last = i === keyparts.length - 1;
        var keypart = keyparts[i];
        var numeric = /^[0-9]+$/.test(keypart);

        if (no_create && (!((typeof doc === "undefined" ? "undefined" : _typeof(doc)) === "object") || !(keypart in doc))) {
            return undefined;
        }

        if (doc instanceof Array) {
            if (forbid_array) return null;

            if (!numeric) {
                logger.throw("can't append to array using string field name [" + keypart + "]");
            }

            keypart = _.toNumber(keypart);

            if (last) {
                // handle 'a.01'
                keyparts[i] = keypart;
            }

            while (doc.length < keypart) {
                doc.push(null);
            }

            if (!last) {
                if (doc.length === keypart) {
                    doc.push({});
                } else if (_typeof(doc[keypart]) !== "object") {
                    logger.throw("can't modify field '" + keyparts[i + 1] + "' of list value " + JSON.stringify(doc[keypart]));
                }
            }
        } else {
            // XXX check valid fieldname (no $ at start, no .)
            if (!last && !(keypart in doc)) {
                doc[keypart] = {};
            }
        }

        if (last) return doc;

        doc = doc[keypart];
    }

    // notreached
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
        if (typeof arg !== "number") {
            logger.throw("Modifier $inc allowed for numbers only");
        }

        if (field in target) {
            if (typeof target[field] !== "number") {
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
        if (target !== undefined) {
            if (target instanceof Array) {
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

        if (x === undefined) {
            target[field] = [arg];
        } else if (!(x instanceof Array)) {
            logger.throw("Cannot apply $push modifier to non-array");
        } else {
            x.push(_.cloneDeep(arg));
        }
    },

    $pushAll: function $pushAll(target, field, arg) {
        if (!((typeof arg === "undefined" ? "undefined" : _typeof(arg)) === "object" && arg instanceof Array)) {
            logger.throw("Modifier $pushAll/pullAll allowed for arrays only");
        }

        var x = target[field];

        if (x === undefined) {
            target[field] = arg;
        } else if (!(x instanceof Array)) {
            logger.throw("Cannot apply $pushAll modifier to non-array");
        } else {
            for (var i = 0; i < arg.length; i++) {
                x.push(arg[i]);
            }
        }
    },

    $addToSet: function $addToSet(target, field, arg) {
        var x = target[field];

        if (x === undefined) {
            target[field] = [arg];
        } else if (!(x instanceof Array)) {
            logger.throw("Cannot apply $addToSet modifier to non-array");
        } else {
            var isEach = false;
            if ((typeof arg === "undefined" ? "undefined" : _typeof(arg)) === "object") {
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
                    // if (Selector._f._equal(value, x[i])) return; //FIXME
                }

                x.push(value);
            });
        }
    },

    $pop: function $pop(target, field, arg) {
        if (target === undefined) return;

        var x = target[field];

        if (x === undefined) {
            return;
        } else if (!(x instanceof Array)) {
            logger.throw("Cannot apply $pop modifier to non-array");
        } else {
            if (typeof arg === 'number' && arg < 0) {
                x.splice(0, 1);
            } else {
                x.pop();
            }
        }
    },

    $pull: function $pull(target, field, arg) {
        logger.throw("Not yet implemented"); // REVIEW

        if (target === undefined) return;

        var x = target[field];

        if (x === undefined) {
            return;
        } else if (!(x instanceof Array)) {
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
                // same issue as $elemMatch possibly?
                // var match = Selector._compileSelector(arg); // FIXME

                for (var i = 0; i < x.length; i++) {
                    if (!match(x[i])) {
                        out.push(x[i]);
                    }
                }
            } else {
                for (var i = 0; i < x.length; i++) {
                    // if (!Selector._f._equal(x[i], arg)) {    // FIXME
                    //     out.push(x[i]);
                    // }
                }
            }

            target[field] = out;
        }
    },

    $pullAll: function $pullAll(target, field, arg) {
        logger.throw("Not yet implemented"); // REVIEW

        if (target === undefined) return;

        if (!((typeof arg === "undefined" ? "undefined" : _typeof(arg)) === "object" && arg instanceof Array)) {
            logger.throw("Modifier $pushAll/pullAll allowed for arrays only");
        }

        var x = target[field];

        if (x === undefined) {
            return;
        } else if (!(x instanceof Array)) {
            logger.throw("Cannot apply $pull/pullAll modifier to non-array");
        } else {
            var out = [];

            for (var i = 0; i < x.length; i++) {
                var exclude = false;

                for (var j = 0; j < arg.length; j++) {
                    // if (Selector._f._equal(x[i], arg[j])) { // FIXME
                    //     exclude = true;

                    //     break;
                    // }
                }

                if (!exclude) {
                    out.push(x[i]);
                }
            }

            target[field] = out;
        }
    },

    $rename: function $rename(target, field, arg, keypath, doc) {
        if (target === undefined) return;

        if (keypath === arg) {
            // no idea why mongo has this restriction..
            logger.throw("$rename source must differ from target");
        }

        if (target === null) {
            logger.throw("$rename source field invalid");
        }

        if (typeof arg !== "string") {
            logger.throw("$rename target must be a string");
        }

        var v = target[field];
        delete target[field];

        var keyparts = arg.split('.');
        var target2 = Collection._findModTarget(doc, keyparts, false, true);

        if (target2 === null) {
            logger.throw("$rename target field invalid");
        }

        var field2 = keyparts.pop();

        target2[field2] = v;
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
//# sourceMappingURL=data:application/json;base64,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T0FBTyxNQUFmLEtBQTBCLE9BQU8sTUFBUCxDQUFjLE1BQWQsS0FBeUIsQ0FBdkQsRUFBMEQ7QUFDdEQsbUJBQU8sTUFBUCxHQUFnQixPQUFPLE9BQVAsQ0FBZSxNQUEvQjtBQUNILFNBRkQsTUFFTztBQUNILG1CQUFPLElBQVAsQ0FBWSxvREFBWjtBQUNIO0FBQ0o7O0FBRUQsV0FBTyxNQUFQO0FBQ0gsQ0FyREQiLCJmaWxlIjoiQ29sbGVjdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgQ29sbGVjdGlvbi5qcyAtIGJhc2VkIG9uIE1vbmdsbyNDb2xsZWN0aW9uICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZShcIi4vdXRpbHMvTG9nZ2VyXCIpLFxuICAgIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0V2ZW50RW1pdHRlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKSxcbiAgICBDdXJzb3IgPSByZXF1aXJlKFwiLi9DdXJzb3JcIiksXG4gICAgT2JqZWN0SWQgPSByZXF1aXJlKCcuL09iamVjdElkJyk7XG4gICAgLy8gU2VsZWN0b3IgPSByZXF1aXJlKFwiLi9TZWxlY3RvclwiKTtcbiAgICBcbnZhciBsb2dnZXIgPSBudWxsO1xuICAgIFxuLyoqXG4gKiBDb2xsZWN0aW9uXG4gKiBcbiAqIEBtb2R1bGUgQ29sbGVjdGlvblxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2luY2UgMC4wLjFcbiAqIFxuICogQGNsYXNzZGVzYyBDb2xsZWN0aW9uIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBwYXJhbSB7TW9uZ29Qb3J0YWJsZX0gZGIgLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gKiBcbiAqL1xudmFyIGRhdGFiYXNlID0gbnVsbDtcbmNsYXNzIENvbGxlY3Rpb24gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuLy8gdmFyIENvbGxlY3Rpb24gPSBmdW5jdGlvbihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpIHtcbiAgICBjb25zdHJ1Y3RvcihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDb2xsZWN0aW9uKSkgcmV0dXJuIG5ldyBDb2xsZWN0aW9uKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGRiKSkgbG9nZ2VyLnRocm93KFwiZGIgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoY29sbGVjdGlvbk5hbWUpKSBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uTmFtZSBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChvcHRpb25zKSB8fCAhXy5pc1BsYWluT2JqZWN0KG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgICAgIFxuICAgICAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUoY29sbGVjdGlvbk5hbWUpO1xuICAgIFxuICAgICAgICAvLyB0aGlzLmRiID0gZGI7XG4gICAgICAgIGRhdGFiYXNlID0gZGI7XG4gICAgICAgIHRoaXMubmFtZSA9IGNvbGxlY3Rpb25OYW1lO1xuICAgICAgICB0aGlzLmZ1bGxOYW1lID0gZGIuZGF0YWJhc2VOYW1lICsgJy4nICsgdGhpcy5uYW1lO1xuICAgICAgICB0aGlzLmRvY3MgPSBbXTtcbiAgICAgICAgdGhpcy5kb2NfaW5kZXhlcyA9IHt9O1xuICAgICAgICB0aGlzLnNuYXBzaG90cyA9IFtdO1xuICAgICAgICB0aGlzLm9wdHMgPSB7fTsgLy8gRGVmYXVsdCBvcHRpb25zXG4gICAgICAgIFxuICAgICAgICBfLm1lcmdlKHRoaXMub3B0cywgb3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICAvLyB0aGlzLmVtaXQgPSBkYi5lbWl0O1xuICAgIH1cbiAgICBcbiAgICBlbWl0KG5hbWUsIGFyZ3MsIGNiKSB7XG4gICAgICAgIHN1cGVyLmVtaXQobmFtZSwgYXJncywgY2IsIGRhdGFiYXNlLl9zdG9yZXMpO1xuICAgIH1cbn1cblxuLy8gVE9ETyBlbmZvcmNlIHJ1bGUgdGhhdCBmaWVsZCBuYW1lcyBjYW4ndCBzdGFydCB3aXRoICckJyBvciBjb250YWluICcuJ1xuLy8gKHJlYWwgbW9uZ29kYiBkb2VzIGluIGZhY3QgZW5mb3JjZSB0aGlzKVxuLy8gVE9ETyBwb3NzaWJseSBlbmZvcmNlIHRoYXQgJ3VuZGVmaW5lZCcgZG9lcyBub3QgYXBwZWFyICh3ZSBhc3N1bWVcbi8vIHRoaXMgaW4gb3VyIGhhbmRsaW5nIG9mIG51bGwgYW5kICRleGlzdHMpXG4vKipcbiAqIEluc2VydHMgYSBkb2N1bWVudCBpbnRvIHRoZSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNpbnNlcnRcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IGRvYyAtIERvY3VtZW50IHRvIGJlIGluc2VydGVkXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuY2hhaW49ZmFsc2VdIC0gSWYgc2V0IHRvIFwidHJ1ZVwiIHJldHVybnMgdGhpcyBpbnN0YW5jZSwgc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R8Q29sbGVjdGlvbn0gSWYgXCJvcHRpb25zLmNoYWluXCIgc2V0IHRvIFwidHJ1ZVwiIHJldHVybnMgdGhpcyBpbnN0YW5jZSwgb3RoZXJ3aXNlIHJldHVybnMgdGhlIGluc2VydGVkIGRvY3VtZW50XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uIChkb2MsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoZG9jKSkgbG9nZ2VyLnRocm93KFwiZG9jIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICBcbiAgICBpZiAoIV8uaXNQbGFpbk9iamVjdChkb2MpKSBsb2dnZXIudGhyb3coXCJkb2MgbXVzdCBiZSBhbiBvYmplY3RcIik7XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgLy8gQ3JlYXRpbmcgYSBzYWZlIGNvcHkgb2YgdGhlIGRvY3VtZW50XG4gICAgdmFyIF9kb2MgPSBfLmNsb25lRGVlcChkb2MpO1xuXG4gICAgLy8gSWYgdGhlIGRvY3VtZW50IGNvbWVzIHdpdGggYSBudW1iZXIgSUQsIHBhcnNlIGl0IHRvIFN0cmluZ1xuICAgIGlmIChfLmlzTnVtYmVyKF9kb2MuX2lkKSkge1xuICAgICAgICBfZG9jLl9pZCA9IF8udG9TdHJpbmcoX2RvYy5faWQpO1xuICAgIH1cblxuICAgIGlmIChfLmlzTmlsKF9kb2MuX2lkKSB8fCAoIV9kb2MuX2lkIGluc3RhbmNlb2YgT2JqZWN0SWQgJiYgKCFfLmlzU3RyaW5nKF9kb2MuX2lkKSB8fCAhX2RvYy5faWQubGVuZ3RoKSkpIHtcbiAgICAgICAgX2RvYy5faWQgPSBuZXcgT2JqZWN0SWQoKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgb3B0aW9ucyB0byBtb3JlIGRhdGVzXG4gICAgX2RvYy50aW1lc3RhbXAgPSBuZXcgT2JqZWN0SWQoKS5nZW5lcmF0aW9uVGltZTtcbiAgICBcbiAgICAvLyBSZXZlcnNlXG4gICAgdGhpcy5kb2NfaW5kZXhlc1tfLnRvU3RyaW5nKF9kb2MuX2lkKV0gPSB0aGlzLmRvY3MubGVuZ3RoO1xuICAgIHRoaXMuZG9jcy5wdXNoKF9kb2MpO1xuICAgIFxuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2luc2VydCcsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBkb2M6IF9kb2NcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIF9kb2MpO1xuXG4gICAgaWYgKG9wdGlvbnMuY2hhaW4pIHJldHVybiB0aGlzO1xuICAgIFxuICAgIHJldHVybiBfZG9jO1xufTtcblxuLyoqXG4gKiBGaW5kcyBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNmaW5kXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5za2lwXSAtIE51bWJlciBvZiBkb2N1bWVudHMgdG8gYmUgc2tpcHBlZFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmxpbWl0XSAtIE1heCBudW1iZXIgb2YgZG9jdW1lbnRzIHRvIGRpc3BsYXlcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW29wdGlvbnMuZmllbGRzXSAtIFNhbWUgYXMgXCJmaWVsZHNcIiBwYXJhbWV0ZXIgKGlmIGJvdGggcGFzc2VkLCBcIm9wdGlvbnMuZmllbGRzXCIgd2lsbCBiZSBpZ25vcmVkKVxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5mb3JjZUZldGNoPWZhbHNlXSAtIElmIHNldCB0bydcInRydWVcIiByZXR1cm5zJ3RcImU7YXJyYXkgb2YgZG9jdW1lbnRzIGFscmVhZHkgZmV0Y2hlZFxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheXxDdXJzb3J9IElmIFwib3B0aW9ucy5mb3JjZUZldGNoXCIgc2V0IHRvIHRydWUgcmV0dXJucyB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzLCBvdGhlcndpc2UgcmV0dXJucyBhIGN1cnNvclxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGxldCBwYXJhbXMgPSBfZW5zdXJlRmluZFBhcmFtcyh7XG4gICAgICAgIHNlbGVjdGlvbjogc2VsZWN0aW9uLCBcbiAgICAgICAgZmllbGRzOiBmaWVsZHMsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnMsIFxuICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICB9KTtcbiAgICBcbiAgICBzZWxlY3Rpb24gPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgIGZpZWxkcyA9IHBhcmFtcy5maWVsZHM7XG4gICAgb3B0aW9ucyA9IHBhcmFtcy5vcHRpb25zO1xuICAgIGNhbGxiYWNrID0gcGFyYW1zLmNhbGxiYWNrO1xuICAgIFxuICAgIC8vIGNhbGxiYWNrIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgdmFyIGN1cnNvciA9IG5ldyBDdXJzb3IodGhpcy5kYiwgdGhpcywgc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnZmluZCcsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgZmllbGRzOiBmaWVsZHMsXG4gICAgICAgICAgICBvcHRpb25zOiBvcHRpb25zXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIC8vIFBhc3MgdGhlIGN1cnNvciBmZXRjaGVkIHRvIHRoZSBjYWxsYmFja1xuICAgIC8vIEFkZCBbb3B0aW9ucy5ub0ZldGNoQ2FsbGJhY2sgPSB0cnVlXVxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgY3Vyc29yLmZldGNoKCkpO1xuXG4gICAgaWYgKG9wdGlvbnMuZm9yY2VGZXRjaCkge1xuICAgICAgICByZXR1cm4gY3Vyc29yLmZldGNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGN1cnNvcjtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudFxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZE9uZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5saW1pdF0gLSBNYXggbnVtYmVyIG9mIGRvY3VtZW50cyB0byBkaXNwbGF5XG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudCBvZiB0aGUgY29sbGVjdGlvblxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5maW5kT25lID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGxldCBwYXJhbXMgPSBfZW5zdXJlRmluZFBhcmFtcyh7XG4gICAgICAgIHNlbGVjdGlvbjogc2VsZWN0aW9uLCBcbiAgICAgICAgZmllbGRzOiBmaWVsZHMsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnMsIFxuICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICB9KTtcbiAgICBcbiAgICBzZWxlY3Rpb24gPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgIGZpZWxkcyA9IHBhcmFtcy5maWVsZHM7XG4gICAgb3B0aW9ucyA9IHBhcmFtcy5vcHRpb25zO1xuICAgIGNhbGxiYWNrID0gcGFyYW1zLmNhbGxiYWNrO1xuICAgIFxuICAgIHZhciBjdXJzb3IgPSBuZXcgQ3Vyc29yKHRoaXMuZGIsIHRoaXMsIHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zKTtcblxuICAgIC8vIHRoaXMuZW1pdCgnZmluZCcsIHNlbGVjdG9yLCBjdXJzb3IsIG8pO1xuXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnZmluZE9uZScsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgZmllbGRzOiBmaWVsZHMsXG4gICAgICAgICAgICBvcHRpb25zOiBvcHRpb25zXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIHZhciByZXMgPSBudWxsO1xuICAgIFxuICAgIGlmIChjdXJzb3IuaGFzTmV4dCgpKSB7XG4gICAgICAgIHJlcyA9IGN1cnNvci5uZXh0KCk7XG4gICAgfVxuICAgIFxuICAgIC8vIFBhc3MgdGhlIGN1cnNvciBmZXRjaGVkIHRvIHRoZSBjYWxsYmFja1xuICAgIC8vIEFkZCBbb3B0aW9ucy5ub0ZldGNoQ2FsbGJhY2sgPSB0cnVlXVxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICBcbiAgICByZXR1cm4gcmVzO1xufTtcblxuXG4vKipcbiAqIFVwZGF0ZXMgb25lIG9yIG1hbnkgZG9jdW1lbnRzXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiN1cGRhdGVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R9IFt1cGRhdGU9e31dIC0gVGhlIHVwZGF0ZSBvcGVyYXRpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnVwZGF0ZUFzTW9uZ289dHJ1ZV0gLSBCeSBkZWZhdWx0OiBcbiAqICAgICAgSWYgdGhlIFt1cGRhdGVdIG9iamVjdCBjb250YWlucyB1cGRhdGUgb3BlcmF0b3IgbW9kaWZpZXJzLCBzdWNoIGFzIHRob3NlIHVzaW5nIHRoZSBcIiRzZXRcIiBtb2RpZmllciwgdGhlbjpcbiAqICAgICAgICAgIDx1bD5cbiAqICAgICAgICAgICAgICA8bGk+VGhlIFt1cGRhdGVdIG9iamVjdCBtdXN0IGNvbnRhaW4gb25seSB1cGRhdGUgb3BlcmF0b3IgZXhwcmVzc2lvbnM8L2xpPlxuICogICAgICAgICAgICAgIDxsaT5UaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIHVwZGF0ZXMgb25seSB0aGUgY29ycmVzcG9uZGluZyBmaWVsZHMgaW4gdGhlIGRvY3VtZW50PC9saT5cbiAqICAgICAgICAgIDx1bD5cbiAqICAgICAgSWYgdGhlIFt1cGRhdGVdIG9iamVjdCBjb250YWlucyBvbmx5IFwiZmllbGQ6IHZhbHVlXCIgZXhwcmVzc2lvbnMsIHRoZW46XG4gKiAgICAgICAgICA8dWw+XG4gKiAgICAgICAgICAgICAgPGxpPlRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgcmVwbGFjZXMgdGhlIG1hdGNoaW5nIGRvY3VtZW50IHdpdGggdGhlIFt1cGRhdGVdIG9iamVjdC4gVGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCBkb2VzIG5vdCByZXBsYWNlIHRoZSBcIl9pZFwiIHZhbHVlPC9saT5cbiAqICAgICAgICAgICAgICA8bGk+Q29sbGVjdGlvbiN1cGRhdGUgY2Fubm90IHVwZGF0ZSBtdWx0aXBsZSBkb2N1bWVudHM8L2xpPlxuICogICAgICAgICAgPHVsPlxuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMub3ZlcnJpZGU9ZmFsc2VdIC0gUmVwbGFjZXMgdGhlIHdob2xlIGRvY3VtZW50IChvbmx5IGFwbGxpZXMgd2hlbiBbdXBkYXRlQXNNb25nbz1mYWxzZV0pXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudXBzZXJ0PWZhbHNlXSAtIENyZWF0ZXMgYSBuZXcgZG9jdW1lbnQgd2hlbiBubyBkb2N1bWVudCBtYXRjaGVzIHRoZSBxdWVyeSBjcml0ZXJpYVxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm11bHRpPWZhbHNlXSAtIFVwZGF0ZXMgbXVsdGlwbGUgZG9jdW1lbnRzIHRoYXQgbWVldCB0aGUgY3JpdGVyaWFcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHRoZSB1cGRhdGUvaW5zZXJ0IChpZiB1cHNlcnQ9dHJ1ZSkgaW5mb3JtYXRpb25cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgdXBkYXRlLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzTmlsKHVwZGF0ZSkpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHNwZWNpZnkgdGhlIHVwZGF0ZSBvcGVyYXRpb25cIik7XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIHtcbiAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHNraXA6IDAsXG4gICAgICAgICAgICBsaW1pdDogMTUgICAvLyBmb3Igbm8gbGltaXQgcGFzcyBbb3B0aW9ucy5saW1pdCA9IC0xXVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHNlbGVjdGlvbikpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHNwZWNpZnkgdGhlIHVwZGF0ZSBvcGVyYXRpb25cIik7XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbih1cGRhdGUpKSBsb2dnZXIudGhyb3coXCJZb3UgbXVzdCBzcGVjaWZ5IHRoZSB1cGRhdGUgb3BlcmF0aW9uXCIpO1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG5cbiAgICB2YXIgcmVzID0gbnVsbDtcblxuICAgIHZhciBkb2NzID0gbnVsbDtcbiAgICBpZiAob3B0aW9ucy5tdWx0aSkge1xuICAgICAgICBkb2NzID0gdGhpcy5maW5kKHNlbGVjdGlvbiwgbnVsbCwgeyBmb3JjZUZldGNoOiB0cnVlIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY3MgPSB0aGlzLmZpbmRPbmUoc2VsZWN0aW9uKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwoZG9jcykpIHtcbiAgICAgICAgZG9jcyA9IFtdO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNBcnJheShkb2NzKSkge1xuICAgICAgICBkb2NzID0gW2RvY3NdO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZG9jcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgaWYgKG9wdGlvbnMudXBzZXJ0KSB7XG4gICAgICAgICAgICB2YXIgaW5zZXJ0ZWQgPSB0aGlzLmluc2VydCh1cGRhdGUpO1xuXG4gICAgICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IFtpbnNlcnRlZF0sXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAxXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vIGRvY3VtZW50cyBmb3VuZFxuICAgICAgICAgICAgcmVzID0ge1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdXBkYXRlZERvY3MgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZG9jcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGRvYyA9IGRvY3NbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBvdmVycmlkZSA9IG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBoYXNNb2RpZmllciA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gSUU3IGRvZXNuJ3Qgc3VwcG9ydCBpbmRleGluZyBpbnRvIHN0cmluZ3MgKGVnLCBrZXlbMF0gb3Iga2V5LmluZGV4T2YoJyQnKSApLCBzbyB1c2Ugc3Vic3RyLlxuICAgICAgICAgICAgICAgIC8vIFRlc3Rpbmcgb3ZlciB0aGUgZmlyc3QgbGV0dGVyOlxuICAgICAgICAgICAgICAgIC8vICAgICAgQmVzdHMgcmVzdWx0IHdpdGggMWU4IGxvb3BzID0+IGtleVswXSh+M3MpID4gc3Vic3RyKH41cykgPiByZWdleHAofjZzKSA+IGluZGV4T2YofjE2cylcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgbW9kaWZpZXIgPSAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnKTtcbiAgICAgICAgICAgICAgICBpZiAobW9kaWZpZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzTW9kaWZpZXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy51cGRhdGVBc01vbmdvKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNNb2RpZmllciAmJiAhbW9kaWZpZXIpIGxvZ2dlci50aHJvdyhcIkFsbCB1cGRhdGUgZmllbGRzIG11c3QgYmUgYW4gdXBkYXRlIG9wZXJhdG9yXCIpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNNb2RpZmllciAmJiBvcHRpb25zLm11bHRpKSBsb2dnZXIudGhyb3coXCJZb3UgY2FuIG5vdCB1cGRhdGUgc2V2ZXJhbCBkb2N1bWVudHMgd2hlbiBubyB1cGRhdGUgb3BlcmF0b3JzIGFyZSBpbmNsdWRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNNb2RpZmllcikgb3ZlcnJpZGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghaGFzTW9kaWZpZXIpIG92ZXJyaWRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdmVycmlkZSA9ICEhb3B0aW9ucy5vdmVycmlkZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBfZG9jVXBkYXRlID0gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG92ZXJyaWRlKSB7XG4gICAgICAgICAgICAgICAgLy8gT3ZlcnJpZGVzIHRoZSBkb2N1bWVudCBleGNlcHQgZm9yIHRoZSBcIl9pZFwiXG4gICAgICAgICAgICAgICAgX2RvY1VwZGF0ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgX2lkOiBkb2MuX2lkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBNdXN0IGlnbm9yZSBmaWVsZHMgc3RhcnRpbmcgd2l0aCAnJCcsICcuJy4uLlxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJyB8fCAvXFwuL2cudGVzdChrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgVGhlIGZpZWxkICR7a2V5fSBjYW4gbm90IGJlZ2luIHdpdGggJyQnIG9yIGNvbnRhaW4gJy4nYCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfZG9jVXBkYXRlW2tleV0gPSB1cGRhdGVba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX2RvY1VwZGF0ZSA9IF8uY2xvbmVEZWVwKGRvYyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsID0gdXBkYXRlW2tleV07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYXBwbHlNb2RpZmllcihfZG9jVXBkYXRlLCBrZXksIHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaXNOaWwoX2RvY1VwZGF0ZVtrZXldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihcIlRoZSBmaWVsZCAnX2lkJyBjYW4gbm90IGJlIHVwZGF0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgVGhlIGRvY3VtZW50IGRvZXMgbm90IGNvbnRhaW5zIHRoZSBmaWVsZCAke2tleX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdXBkYXRlZERvY3MucHVzaChfZG9jVXBkYXRlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGlkeCA9IHRoaXMuZG9jX2luZGV4ZXNbX2RvY1VwZGF0ZS5faWRdO1xuICAgICAgICAgICAgdGhpcy5kb2NzW2lkeF0gPSBfZG9jVXBkYXRlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAndXBkYXRlJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgbW9kaWZpZXI6IHVwZGF0ZSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBvcHRpb25zLFxuICAgICAgICAgICAgICAgIGRvY3M6IHVwZGF0ZWREb2NzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnRzOiB1cGRhdGVkRG9jcyxcbiAgICAgICAgICAgICAgICBjb3VudDogdXBkYXRlZERvY3MubGVuZ3RoXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgIFxuICAgIHJldHVybiByZXM7XG59O1xuXG52YXIgX2FwcGx5TW9kaWZpZXIgPSBmdW5jdGlvbihfZG9jVXBkYXRlLCBrZXksIHZhbCkge1xuICAgIHZhciBtb2QgPSBfbW9kaWZpZXJzW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBpZiAoIW1vZCkge1xuICAgICAgICBsb2dnZXIudGhyb3coYEludmFsaWQgbW9kaWZpZXIgc3BlY2lmaWVkOiAke2tleX1gKTtcbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIga2V5cGF0aCBpbiB2YWwpIHtcbiAgICAgICAgdmFyIGFyZyA9IHZhbFtrZXlwYXRoXTtcbiAgICAgICAgdmFyIGtleXBhcnRzID0ga2V5cGF0aC5zcGxpdCgnLicpO1xuICAgICAgICB2YXIgbm9fY3JlYXRlID0gISFDb2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVyc1trZXldO1xuICAgICAgICB2YXIgZm9yYmlkX2FycmF5ID0gKGtleSA9PT0gXCIkcmVuYW1lXCIpO1xuICAgICAgICB2YXIgdGFyZ2V0ID0gQ29sbGVjdGlvbi5fZmluZE1vZFRhcmdldChfZG9jVXBkYXRlLCBrZXlwYXJ0cywgbm9fY3JlYXRlLCBmb3JiaWRfYXJyYXkpO1xuICAgICAgICB2YXIgZmllbGQgPSBrZXlwYXJ0cy5wb3AoKTtcblxuICAgICAgICBtb2QodGFyZ2V0LCBmaWVsZCwgYXJnLCBrZXlwYXRoLCBfZG9jVXBkYXRlKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgb25lIG9yIG1hbnkgZG9jdW1lbnRzXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNyZW1vdmVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuanVzdE9uZT1mYWxzZV0gLSBEZWxldGVzIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIHRoZSBzZWxlY3Rpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHRoZSBkZWxldGVkIGRvY3VtZW50c1xuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0geyBqdXN0T25lOiBmYWxzZSB9O1xuICAgIFxuICAgIC8vIElmIHdlIGFyZSBub3QgcGFzc2luZyBhIHNlbGVjdGlvbiBhbmQgd2UgYXJlIG5vdCByZW1vdmluZyBqdXN0IG9uZSwgaXMgdGhlIHNhbWUgYXMgYSBkcm9wXG4gICAgaWYgKE9iamVjdC5zaXplKHNlbGVjdGlvbikgPT09IDAgJiYgIW9wdGlvbnMuanVzdE9uZSkgcmV0dXJuIHRoaXMuZHJvcChvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgXG4gICAgLy8gQ2hlY2sgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGFyZSB1c2luZyBhbiBvYmplY3RJZFxuICAgIGlmKHNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgIHNlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgIF9pZDogc2VsZWN0aW9uXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICB2YXIgY3Vyc29yID0gdGhpcy5maW5kKHNlbGVjdGlvbik7XG4gICAgXG4gICAgdmFyIGRvY3MgPSBbXTtcbiAgICBjdXJzb3IuZm9yRWFjaChkb2MgPT4ge1xuICAgICAgICB2YXIgaWR4ID0gdGhpcy5kb2NfaW5kZXhlc1tkb2MuX2lkXTtcbiAgICAgICAgXG4gICAgICAgIGRlbGV0ZSB0aGlzLmRvY19pbmRleGVzW2RvYy5faWRdO1xuICAgICAgICB0aGlzLmRvY3Muc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIFxuICAgICAgICBkb2NzLnB1c2goZG9jKTtcbiAgICB9KTtcbiAgICBcbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdyZW1vdmUnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgIGRvY3M6IGRvY3NcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBkb2NzKTtcbiAgICBcbiAgICByZXR1cm4gZG9jcztcbn07XG5cbi8qKlxuICogRHJvcHMgYSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNkcm9wXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmRyb3BJbmRleGVzPWZhbHNlXSAtIFRydWUgaWYgd2Ugd2FudCB0byBkcm9wIHRoZSBpbmRleGVzIHRvb1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gVHJ1ZSB3aGVuIHRoZSBjb2xsZWN0aW9uIGlzIGRyb3BwZWRcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgdGhpcy5kb2NfaW5kZXhlcyA9IHt9O1xuICAgIHRoaXMuZG9jcyA9IFtdO1xuICAgIFxuICAgIGlmIChvcHRpb25zLmRyb3BJbmRleGVzKSB7fSAvLyBUT0RPXG4gICAgXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnZHJvcENvbGxlY3Rpb24nLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgaW5kZXhlczogISFvcHRpb25zLmRyb3BJbmRleGVzXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgdHJ1ZSk7XG4gICAgXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEluc2VydCBvciB1cGRhdGUgYSBkb2N1bWVudC4gSWYgdGhlIGRvY3VtZW50IGhhcyBhbiBcIl9pZFwiIGlzIGFuIHVwZGF0ZSAod2l0aCB1cHNlcnQpLCBpZiBub3QgaXMgYW4gaW5zZXJ0LlxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jc2F2ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIC0gRG9jdW1lbnQgdG8gYmUgaW5zZXJ0ZWQvdXBkYXRlZFxuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuZHJvcEluZGV4ZXM9ZmFsc2VdIC0gVHJ1ZSBpZiB3ZSB3YW50IHRvIGRyb3AgdGhlIGluZGV4ZXMgdG9vXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUcnVlIHdoZW4gdGhlIGNvbGxlY3Rpb24gaXMgZHJvcHBlZFxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24oZG9jLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGRvYykgfHwgXy5pc0Z1bmN0aW9uKGRvYykpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHBhc3MgYSBkb2N1bWVudFwiKTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGlmIChfLmhhc0luKGRvYywgJ19pZCcpKSB7XG4gICAgICAgIG9wdGlvbnMudXBzZXJ0ID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZShcbiAgICAgICAgICAgIHsgX2lkOiBkb2MuX2lkIH0sXG4gICAgICAgICAgICBkb2MsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnNlcnQoZG9jLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5lbnN1cmVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vVE9ETyBJbXBsZW1lbnQgRW5zdXJlSW5kZXhcbiAgICBsb2dnZXIudGhyb3coJ0NvbGxlY3Rpb24jZW5zdXJlSW5kZXggdW5pbXBsZW1lbnRlZCBieSBkcml2ZXInKTtcbn07XG5cbi8vIFRPRE8gZG9jdW1lbnQgKGF0IHNvbWUgcG9pbnQpXG4vLyBUT0RPIHRlc3Rcbi8vIFRPRE8gb2J2aW91c2x5IHRoaXMgcGFydGljdWxhciBpbXBsZW1lbnRhdGlvbiB3aWxsIG5vdCBiZSB2ZXJ5IGVmZmljaWVudFxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgYmFja3VwSUQgPSBuZXcgT2JqZWN0SWQoKS50b1N0cmluZygpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG5cbiAgICB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF0gPSBfLmNsb25lRGVlcCh0aGlzLmRvY3MpO1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3NuYXBzaG90JyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRCxcbiAgICAgICAgICAgIGRvY3VtZW50czogdGhpcy5zbmFwc2hvdHNbYmFja3VwSURdIFxuICAgICAgICB9XG4gICAgKTtcblxuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRCxcbiAgICAgICAgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF1cbiAgICB9O1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBMaXN0cyBhdmFpbGFibGUgQmFja3Vwc1xuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXBzID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIHZhciBiYWNrdXBzID0gW107XG5cbiAgICBmb3IgKGxldCBpZCBpbiB0aGlzLnNuYXBzaG90cykge1xuICAgICAgICBiYWNrdXBzLnB1c2goe2lkOiBpZCwgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tpZF19KTtcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGJhY2t1cHMpO1xuXG4gICAgcmV0dXJuIGJhY2t1cHM7XG59O1xuXG4vLyBMaXN0cyBhdmFpbGFibGUgQmFja3Vwc1xuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVCYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgYmFja3VwSUQgPSBudWxsO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgbGV0IHJlc3VsdCA9IGZhbHNlO1xuICAgIFxuICAgIGlmIChiYWNrdXBJRCkge1xuICAgICAgICBkZWxldGUgdGhpcy5zbmFwc2hvdHNbXy50b1N0cmluZyhiYWNrdXBJRCldO1xuICAgICAgICBcbiAgICAgICAgcmVzdWx0ID0gYmFja3VwSUQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zbmFwc2hvdHMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgfVxuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8vIFJlc3RvcmUgdGhlIHNuYXBzaG90LiBJZiBubyBzbmFwc2hvdCBleGlzdHMsIHJhaXNlIGFuIGV4Y2VwdGlvbjtcbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVzdG9yZSA9IGZ1bmN0aW9uIChiYWNrdXBJRCwgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGJhY2t1cElEKSkge1xuICAgICAgICBjYWxsYmFjayA9IGJhY2t1cElEO1xuICAgICAgICBiYWNrdXBJRCA9IG51bGw7XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICB2YXIgc25hcHNob3RDb3VudCA9IE9iamVjdC5zaXplKHRoaXMuc25hcHNob3RzKTtcbiAgICB2YXIgYmFja3VwRGF0YSA9IG51bGw7XG5cbiAgICBpZiAoc25hcHNob3RDb3VudCA9PT0gMCkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJUaGVyZSBpcyBubyBzbmFwc2hvdHNcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFiYWNrdXBJRCkge1xuICAgICAgICAgICAgaWYgKHNuYXBzaG90Q291bnQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhcIk5vIGJhY2t1cElEIHBhc3NlZC4gUmVzdG9yaW5nIHRoZSBvbmx5IHNuYXBzaG90XCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJldHJpZXZlIHRoZSBvbmx5IHNuYXBzaG90XG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHRoaXMuc25hcHNob3RzKSBiYWNrdXBJRCA9IGtleTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVGhlIGFyZSBzZXZlcmFsIHNuYXBzaG90cy4gUGxlYXNlIHNwZWNpZnkgb25lIGJhY2t1cElEXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGJhY2t1cERhdGEgPSB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF07XG4gICAgICAgICAgICBcbiAgICBpZiAoIWJhY2t1cERhdGEpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KGBVbmtub3duIEJhY2t1cCBJRDogJHtiYWNrdXBJRH1gKTtcbiAgICB9XG5cbiAgICB0aGlzLmRvY3MgPSBiYWNrdXBEYXRhO1xuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3Jlc3RvcmUnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgYmFja3VwSUQ6IGJhY2t1cElEXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8gZm9yIGEuYi5jLjIuZC5lLCBrZXlwYXJ0cyBzaG91bGQgYmUgWydhJywgJ2InLCAnYycsICcyJywgJ2QnLCAnZSddLFxuLy8gYW5kIHRoZW4geW91IHdvdWxkIG9wZXJhdGUgb24gdGhlICdlJyBwcm9wZXJ0eSBvZiB0aGUgcmV0dXJuZWRcbi8vIG9iamVjdC4gaWYgbm9fY3JlYXRlIGlzIGZhbHNleSwgY3JlYXRlcyBpbnRlcm1lZGlhdGUgbGV2ZWxzIG9mXG4vLyBzdHJ1Y3R1cmUgYXMgbmVjZXNzYXJ5LCBsaWtlIG1rZGlyIC1wIChhbmQgcmFpc2VzIGFuIGV4Y2VwdGlvbiBpZlxuLy8gdGhhdCB3b3VsZCBtZWFuIGdpdmluZyBhIG5vbi1udW1lcmljIHByb3BlcnR5IHRvIGFuIGFycmF5LikgaWZcbi8vIG5vX2NyZWF0ZSBpcyB0cnVlLCByZXR1cm4gdW5kZWZpbmVkIGluc3RlYWQuIG1heSBtb2RpZnkgdGhlIGxhc3Rcbi8vIGVsZW1lbnQgb2Yga2V5cGFydHMgdG8gc2lnbmFsIHRvIHRoZSBjYWxsZXIgdGhhdCBpdCBuZWVkcyB0byB1c2UgYVxuLy8gZGlmZmVyZW50IHZhbHVlIHRvIGluZGV4IGludG8gdGhlIHJldHVybmVkIG9iamVjdCAoZm9yIGV4YW1wbGUsXG4vLyBbJ2EnLCAnMDEnXSAtPiBbJ2EnLCAxXSkuIGlmIGZvcmJpZF9hcnJheSBpcyB0cnVlLCByZXR1cm4gbnVsbCBpZlxuLy8gdGhlIGtleXBhdGggZ29lcyB0aHJvdWdoIGFuIGFycmF5LlxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLl9maW5kTW9kVGFyZ2V0ID0gZnVuY3Rpb24gKGRvYywga2V5cGFydHMsIG5vX2NyZWF0ZSwgZm9yYmlkX2FycmF5KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbGFzdCA9IChpID09PSBrZXlwYXJ0cy5sZW5ndGggLSAxKTtcbiAgICAgICAgdmFyIGtleXBhcnQgPSBrZXlwYXJ0c1tpXTtcbiAgICAgICAgdmFyIG51bWVyaWMgPSAvXlswLTldKyQvLnRlc3Qoa2V5cGFydCk7XG5cbiAgICAgICAgaWYgKG5vX2NyZWF0ZSAmJiAoISh0eXBlb2YgZG9jID09PSBcIm9iamVjdFwiKSB8fCAhKGtleXBhcnQgaW4gZG9jKSkpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZG9jIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGlmIChmb3JiaWRfYXJyYXkpIHJldHVybiBudWxsO1xuXG4gICAgICAgICAgICBpZiAoIW51bWVyaWMpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJjYW4ndCBhcHBlbmQgdG8gYXJyYXkgdXNpbmcgc3RyaW5nIGZpZWxkIG5hbWUgW1wiICsga2V5cGFydCArIFwiXVwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAga2V5cGFydCA9IF8udG9OdW1iZXIoa2V5cGFydCk7XG5cbiAgICAgICAgICAgIGlmIChsYXN0KSB7XG4gICAgICAgICAgICAgICAgLy8gaGFuZGxlICdhLjAxJ1xuICAgICAgICAgICAgICAgIGtleXBhcnRzW2ldID0ga2V5cGFydDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2hpbGUgKGRvYy5sZW5ndGggPCBrZXlwYXJ0KSB7XG4gICAgICAgICAgICAgICAgZG9jLnB1c2gobnVsbCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghbGFzdCkge1xuICAgICAgICAgICAgICAgIGlmIChkb2MubGVuZ3RoID09PSBrZXlwYXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgIGRvYy5wdXNoKHt9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2Nba2V5cGFydF0gIT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiY2FuJ3QgbW9kaWZ5IGZpZWxkICdcIiArIGtleXBhcnRzW2kgKyAxXSArIFwiJyBvZiBsaXN0IHZhbHVlIFwiICsgSlNPTi5zdHJpbmdpZnkoZG9jW2tleXBhcnRdKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gWFhYIGNoZWNrIHZhbGlkIGZpZWxkbmFtZSAobm8gJCBhdCBzdGFydCwgbm8gLilcbiAgICAgICAgICAgIGlmICghbGFzdCAmJiAhKGtleXBhcnQgaW4gZG9jKSkge1xuICAgICAgICAgICAgICAgIGRvY1trZXlwYXJ0XSA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxhc3QpIHJldHVybiBkb2M7XG5cbiAgICAgICAgZG9jID0gZG9jW2tleXBhcnRdO1xuICAgIH1cblxuICAgIC8vIG5vdHJlYWNoZWRcbn07XG5cbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5fbm9DcmVhdGVNb2RpZmllcnMgPSB7XG4gICAgJHVuc2V0OiB0cnVlLFxuICAgICRwb3A6IHRydWUsXG4gICAgJHJlbmFtZTogdHJ1ZSxcbiAgICAkcHVsbDogdHJ1ZSxcbiAgICAkcHVsbEFsbDogdHJ1ZVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG52YXIgX21vZGlmaWVycyA9IHtcbiAgICAkaW5jOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYXJnICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJNb2RpZmllciAkaW5jIGFsbG93ZWQgZm9yIG51bWJlcnMgb25seVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGFyZ2V0W2ZpZWxkXSAhPT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkaW5jIG1vZGlmaWVyIHRvIG5vbi1udW1iZXJcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gKz0gYXJnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkc2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSBfLmNsb25lRGVlcChhcmcpO1xuICAgIH0sXG5cbiAgICAkdW5zZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKHRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1c2g6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmICh4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBbYXJnXTtcbiAgICAgICAgfSBlbHNlIGlmICghKHggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVzaCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4LnB1c2goXy5jbG9uZURlZXAoYXJnKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1c2hBbGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKCEodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIiAmJiBhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHlcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgICAgfSBlbHNlIGlmICghKHggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVzaEFsbCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHgucHVzaChhcmdbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRhZGRUb1NldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFthcmddO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRhZGRUb1NldCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgaXNFYWNoID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGsgaW4gYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrID09PSBcIiRlYWNoXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzRWFjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IGlzRWFjaCA/IGFyZ1tcIiRlYWNoXCJdIDogW2FyZ107XG4gICAgICAgICAgICBfLmZvckVhY2godmFsdWVzLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgKFNlbGVjdG9yLl9mLl9lcXVhbCh2YWx1ZSwgeFtpXSkpIHJldHVybjsgLy9GSVhNRVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHgucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcG9wOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoISh4IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJHBvcCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicgJiYgYXJnIDwgMCkge1xuICAgICAgICAgICAgICAgIHguc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4LnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7ICAgIC8vIFJFVklFV1xuICAgICAgICBcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG5cbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmICh4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmICghKHggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVsbC9wdWxsQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvdXQgPSBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmcgPT09IFwib2JqZWN0XCIgJiYgIShhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAvLyBYWFggd291bGQgYmUgbXVjaCBuaWNlciB0byBjb21waWxlIHRoaXMgb25jZSwgcmF0aGVyIHRoYW5cbiAgICAgICAgICAgICAgICAvLyBmb3IgZWFjaCBkb2N1bWVudCB3ZSBtb2RpZnkuLiBidXQgdXN1YWxseSB3ZSdyZSBub3RcbiAgICAgICAgICAgICAgICAvLyBtb2RpZnlpbmcgdGhhdCBtYW55IGRvY3VtZW50cywgc28gd2UnbGwgbGV0IGl0IHNsaWRlIGZvclxuICAgICAgICAgICAgICAgIC8vIG5vd1xuXG4gICAgICAgICAgICAgICAgLy8gWFhYIF9jb21waWxlU2VsZWN0b3IgaXNuJ3QgdXAgZm9yIHRoZSBqb2IsIGJlY2F1c2Ugd2UgbmVlZFxuICAgICAgICAgICAgICAgIC8vIHRvIHBlcm1pdCBzdHVmZiBsaWtlIHskcHVsbDoge2E6IHskZ3Q6IDR9fX0uLiBzb21ldGhpbmdcbiAgICAgICAgICAgICAgICAvLyBsaWtlIHskZ3Q6IDR9IGlzIG5vdCBub3JtYWxseSBhIGNvbXBsZXRlIHNlbGVjdG9yLlxuICAgICAgICAgICAgICAgIC8vIHNhbWUgaXNzdWUgYXMgJGVsZW1NYXRjaCBwb3NzaWJseT9cbiAgICAgICAgICAgICAgICAvLyB2YXIgbWF0Y2ggPSBTZWxlY3Rvci5fY29tcGlsZVNlbGVjdG9yKGFyZyk7IC8vIEZJWE1FXG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRjaCh4W2ldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiAoIVNlbGVjdG9yLl9mLl9lcXVhbCh4W2ldLCBhcmcpKSB7ICAgIC8vIEZJWE1FXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBvdXQucHVzaCh4W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG91dDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVsbEFsbDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpOyAgICAvLyBSRVZJRVdcbiAgICAgICAgXG4gICAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXG4gICAgICAgIGlmICghKHR5cGVvZiBhcmcgPT09IFwib2JqZWN0XCIgJiYgYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJNb2RpZmllciAkcHVzaEFsbC9wdWxsQWxsIGFsbG93ZWQgZm9yIGFycmF5cyBvbmx5XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmICh4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmICghKHggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVsbC9wdWxsQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvdXQgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGV4Y2x1ZGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYXJnLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIChTZWxlY3Rvci5fZi5fZXF1YWwoeFtpXSwgYXJnW2pdKSkgeyAvLyBGSVhNRVxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgZXhjbHVkZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFleGNsdWRlKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG91dDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcmVuYW1lOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnLCBrZXlwYXRoLCBkb2MpIHtcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBpZiAoa2V5cGF0aCA9PT0gYXJnKSB7XG4gICAgICAgICAgICAvLyBubyBpZGVhIHdoeSBtb25nbyBoYXMgdGhpcyByZXN0cmljdGlvbi4uXG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCIkcmVuYW1lIHNvdXJjZSBtdXN0IGRpZmZlciBmcm9tIHRhcmdldFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIiRyZW5hbWUgc291cmNlIGZpZWxkIGludmFsaWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGFyZyAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiJHJlbmFtZSB0YXJnZXQgbXVzdCBiZSBhIHN0cmluZ1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2ID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICAgICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgdmFyIGtleXBhcnRzID0gYXJnLnNwbGl0KCcuJyk7XG4gICAgICAgIHZhciB0YXJnZXQyID0gQ29sbGVjdGlvbi5fZmluZE1vZFRhcmdldChkb2MsIGtleXBhcnRzLCBmYWxzZSwgdHJ1ZSk7XG5cbiAgICAgICAgaWYgKHRhcmdldDIgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIiRyZW5hbWUgdGFyZ2V0IGZpZWxkIGludmFsaWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZmllbGQyID0ga2V5cGFydHMucG9wKCk7XG4gICAgICAgIFxuICAgICAgICB0YXJnZXQyW2ZpZWxkMl0gPSB2O1xuICAgIH0sXG5cbiAgICAkYml0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIC8vIFhYWCBtb25nbyBvbmx5IHN1cHBvcnRzICRiaXQgb24gaW50ZWdlcnMsIGFuZCB3ZSBvbmx5IHN1cHBvcnRcbiAgICAgICAgLy8gbmF0aXZlIGphdmFzY3JpcHQgbnVtYmVycyAoZG91Ymxlcykgc28gZmFyLCBzbyB3ZSBjYW4ndCBzdXBwb3J0ICRiaXRcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiJGJpdCBpcyBub3Qgc3VwcG9ydGVkXCIpO1xuICAgIH1cbn07XG5cbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUpIHtcbiAgICBpZiAoIV8uaXNTdHJpbmcoY29sbGVjdGlvbk5hbWUpKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZSBtdXN0IGJlIGEgU3RyaW5nXCIpO1xuICAgIH1cblxuICAgIGlmICghY29sbGVjdGlvbk5hbWUgfHwgY29sbGVjdGlvbk5hbWUuaW5kZXhPZignLi4nKSAhPT0gLTEpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBjYW5ub3QgYmUgZW1wdHlcIik7XG4gICAgfVxuXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLmluZGV4T2YoJyQnKSAhPT0gLTEgJiYgY29sbGVjdGlvbk5hbWUubWF0Y2goLygoXlxcJGNtZCl8KG9wbG9nXFwuXFwkbWFpbikpLykgPT09IG51bGwpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBjb250YWluICckJ1wiKTtcbiAgICB9XG5cbiAgICBpZiAoY29sbGVjdGlvbk5hbWUubWF0Y2goL15zeXN0ZW1cXC4vKSAhPT0gbnVsbCkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IHN0YXJ0IHdpdGggJ3N5c3RlbS4nIChyZXNlcnZlZCBmb3IgaW50ZXJuYWwgdXNlKVwiKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLm1hdGNoKC9eXFwufFxcLiQvKSAhPT0gbnVsbCkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IHN0YXJ0IG9yIGVuZCB3aXRoICcuJ1wiKTtcbiAgICB9XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbmFtZSA9IGZ1bmN0aW9uKG5ld05hbWUpIHtcbiAgICBpZiAoXy5pc1N0cmluZyhuZXdOYW1lKSkge1xuICAgICAgICBpZiAodGhpcy5uYW1lICE9PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUobmV3TmFtZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBkYk5hbWUgPSB0aGlzLm5hbWUuc3BsaXQoJy4nKS5sZW5ndGggPiAxID8gdGhpcy5uYW1lLnNwbGl0KCcuJylbMF0gOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5uYW1lID0gbmV3TmFtZTtcbiAgICAgICAgICAgIHRoaXMuZnVsbE5hbWUgPSBkYk5hbWUgKyAnLicgKyB0aGlzLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRXJyb3JcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb247XG5cbi8qKlxuICogR2V0cyB0aGUgc2l6ZSBvZiBhbiBvYmplY3QuXG4gKiBcbiAqIEBtZXRob2QgT2JqZWN0I3NpemVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBvYmplY3RcbiAqIFxuICogQHJldHVybnMge051bWJlcn0gVGhlIHNpemUgb2YgdGhlIG9iamVjdFxuICovXG5PYmplY3Quc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBzaXplID0gMCwgXG4gICAgICAgIGtleTtcbiAgICBcbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBzaXplKys7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHNpemU7XG59O1xuXG52YXIgX2Vuc3VyZUZpbmRQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAvLyBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2tcbiAgICBpZiAoXy5pc05pbChwYXJhbXMuc2VsZWN0aW9uKSkgcGFyYW1zLnNlbGVjdGlvbiA9IHt9O1xuXG4gICAgaWYgKF8uaXNOaWwocGFyYW1zLnNlbGVjdGlvbikpIHBhcmFtcy5zZWxlY3Rpb24gPSB7fTtcblxuICAgIGlmIChfLmlzTmlsKHBhcmFtcy5maWVsZHMpKSBwYXJhbXMuZmllbGRzID0gW107XG5cbiAgICBpZiAoXy5pc05pbChwYXJhbXMub3B0aW9ucykpIHtcbiAgICAgICAgcGFyYW1zLm9wdGlvbnMgPSB7XG4gICAgICAgICAgICBza2lwOiAwLFxuICAgICAgICAgICAgbGltaXQ6IDE1IC8vIGZvciBubyBsaW1pdCBwYXNzIFtvcHRpb25zLmxpbWl0ID0gLTFdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gY2FsbGJhY2sgYXMgZmlyc3QgcGFyYW1ldGVyXG4gICAgaWYgKF8uaXNGdW5jdGlvbihwYXJhbXMuc2VsZWN0aW9uKSkge1xuICAgICAgICBwYXJhbXMuY2FsbGJhY2sgPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgICAgICBwYXJhbXMuc2VsZWN0aW9uID0ge307XG4gICAgfVxuXG4gICAgLy8gY2FsbGJhY2sgYXMgc2Vjb25kIHBhcmFtZXRlclxuICAgIGlmIChfLmlzRnVuY3Rpb24ocGFyYW1zLmZpZWxkcykpIHtcbiAgICAgICAgcGFyYW1zLmNhbGxiYWNrID0gcGFyYW1zLmZpZWxkcztcbiAgICAgICAgcGFyYW1zLmZpZWxkcyA9IFtdO1xuICAgIH1cblxuICAgIC8vIGNhbGxiYWNrIGFzIHRoaXJkIHBhcmFtZXRlclxuICAgIGlmIChfLmlzRnVuY3Rpb24ocGFyYW1zLm9wdGlvbnMpKSB7XG4gICAgICAgIHBhcmFtcy5jYWxsYmFjayA9IHBhcmFtcy5vcHRpb25zO1xuICAgICAgICBwYXJhbXMub3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZiAocGFyYW1zLnNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgIHBhcmFtcy5zZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHBhcmFtcy5zZWxlY3Rpb25cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNOaWwocGFyYW1zLmNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKHBhcmFtcy5jYWxsYmFjaykpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIH1cblxuICAgIGlmIChwYXJhbXMub3B0aW9ucy5maWVsZHMpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwocGFyYW1zLmZpZWxkcykgfHwgcGFyYW1zLmZpZWxkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHBhcmFtcy5maWVsZHMgPSBwYXJhbXMub3B0aW9ucy5maWVsZHM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIud2FybihcIkZpZWxkcyBhbHJlYWR5IHByZXNlbnQuIElnbm9yaW5nICdvcHRpb25zLmZpZWxkcycuXCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBwYXJhbXM7XG59OyJdfQ==
