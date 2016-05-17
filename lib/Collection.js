"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @file Collection.js - based on Monglo#Collection ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 0.0.1
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
    Selector = require("./Selector");

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

        if (_.isNil(db)) throw new Error("db parameter required");

        if (_.isNil(collectionName)) throw new Error("collectionName parameter required");

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
    if (_.isNil(doc)) throw new Error("doc parameter required");

    if (!_.isPlainObject(doc)) throw new Error("doc must be an object");

    if (_.isNil(options)) options = {};

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) throw new Error("callback must be a function");

    // Creating a safe copy of the document
    var _doc = _.cloneDeep(doc);

    // If the document comes with a number ID, parse it to String
    if (_.isNumber(_doc._id)) {
        _doc._id = _.toString(_doc._id);
    }

    // Remove every non-number character
    _doc._id = (_doc._id || '').replace(/\D/g, '');

    if (_.isNil(_doc._id) || !_doc._id.length) {
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
 * @param {Boolean} [options.chain=false] - If set to "true" returns this instance, so it can be chained with other methods
 * @param {Boolean} [options.forceFetch=false] - If set to "true" returns the array of documents already fetched
 * 
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Array|Collection|Cursor} If "options.chain" set to "true" returns this instance, if "options.forceFetch" set to true returns the array of documents, otherwise returns a cursor
 */
Collection.prototype.find = function (selection, fields, options, callback) {
    if (_.isNil(selection)) selection = {};

    if (_.isNil(fields)) fields = [];

    if (_.isNil(options)) {
        options = {
            skip: 0,
            limit: 15 // for no limit pass [options.limit = -1]
        };
    }

    if (_.isFunction(selection)) {
        callback = selection;
        selection = {};
    }

    if (_.isFunction(fields)) {
        callback = fields;
        fields = [];
    }

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

    if (!_.isNil(callback) && !_.isFunction(callback)) throw new Error("callback must be a function");

    // Compile selection and fields
    var selectionCompiled = Selector._compileSelector(selection);
    var fieldsCompiled = Selector._compileFields(fields); // TODO

    if (options.fields) {
        // Add warning if fields already passed
        fieldsCompiled = Selector._compileFields(options.fields);
    }

    // callback for backward compatibility
    var cursor = new Cursor(this.db, this, selectionCompiled, fieldsCompiled, options);

    this.emit('find', {
        collection: this,
        selector: selectionCompiled,
        fields: fieldsCompiled,
        options: options
    });

    // Pass the cursor fetched to the callback
    // Add [options.noFetchCallback = true]
    if (callback) callback(null, cursor.fetch());

    if (options.chain) {
        return this;
    } else if (options.forceFetch) {
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
    if (_.isNil(selection)) selection = {};

    if (_.isNil(fields)) fields = [];

    if (_.isNil(options)) {
        options = {
            skip: 0,
            limit: 15 // for no limit pass [options.limit = -1] -> manage with cursor
        };
    }

    if (_.isFunction(selection)) {
        callback = selection;
        selection = {};
    }

    if (_.isFunction(fields)) {
        callback = fields;
        fields = [];
    }

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

    if (!_.isNil(callback) && !_.isFunction(callback)) throw new Error("callback must be a function");

    // Compile selection and fields
    var selectionCompiled = Selector._compileSelector(selection);
    var fieldsCompiled = Selector._compileFields(fields); // TODO

    if (options.fields) {
        // Add warning if fields already passed
        fieldsCompiled = Selector._compileFields(options.fields);
    }

    var cursor = new Cursor(this.db, this, selectionCompiled, fieldsCompiled, options);

    // this.emit('find', selector, cursor, o);

    this.emit('findOne', {
        collection: this,
        selector: selectionCompiled,
        fields: fieldsCompiled,
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

    if (_.isNil(update)) update = [];

    if (_.isNil(options)) {
        options = {
            skip: 0,
            limit: 15 // for no limit pass [options.limit = -1]
        };
    }

    if (_.isFunction(selection)) {
        callback = selection;
        selection = {};
    }

    if (_.isFunction(update)) {
        callback = update;
        update = [];
    }

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

    if (!_.isNil(callback) && !_.isFunction(callback)) throw new Error("callback must be a function");

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
                    documents: inserted,
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
                    if (hasModifier && !modifier) throw new Error("All update fields must be an update operator");

                    if (!hasModifier && options.multi) throw new Error("You can not update several documents when no update operators are included");

                    if (hasModifier) override = false;

                    if (!hasModifier) override = true;
                } else {
                    override = !!options.override;
                }
            }

            var _docUpdate = null;

            // Override the document except for the "_id"
            if (override) {
                // Must ignore fields starting with '$', '.'...
                _docUpdate = _.cloneDeep(update);

                for (var _key in update) {
                    if (_key.substr(0, 1) === '$' || /\./g.test(_key)) {
                        Logger.warn("The field " + _key + " can not begin with '$' or contain '.'");
                    } else {
                        delete _docUpdate[_key];
                    }
                }

                // Do not override the "_id"
                _docUpdate._id = doc._id;
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
                                Logger.warn("The field '_id' can not be updated");
                            }
                        } else {
                            Logger.warn("The document does not contains the field " + _key2);
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
        throw new Error("Invalid modifier specified: " + key);
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
Collection.prototype.remove = function (selection, callback) {
    var _this2 = this;

    if (_.isNil(selection)) selection = {};

    if (_.isFunction(selection)) {
        callback = selection;
        selection = {};
    }

    // Check special case where we are using an objectId
    if (selection instanceof ObjectId) {
        selection = {
            _id: selection
        };
    }

    if (!_.isNil(callback) && !_.isFunction(callback)) throw new Error("callback must be a function");

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
* @ignore
*/
Collection.prototype.save = function (obj, fn) {
    var self = this;

    var callback = fn || function () {};

    if (self.docs[obj._id]) {
        self.update({ _id: obj._id }, callback);
    } else {
        self.insert(obj, callback);
    }
};

/**
* @ignore
*/
Collection.prototype.ensureIndex = function () {
    //TODO Implement EnsureIndex
    throw new Error('Collection#ensureIndex unimplemented by driver');
};

// TODO document (at some point)
// TODO test
// TODO obviously this particular implementation will not be very efficient
/**
* @ignore
*/
Collection.prototype.backup = function (backupID, fn) {
    if ('function' === typeof backupID) {
        fn = backupID;
        backupID = new ObjectId();
    }

    var callback = fn || function () {};
    var snapID = backupID;

    this.snapshots[snapID] = this.docs;
    this.emit('snapshot', {
        _id: this.docs,
        data: this.docs
    });

    callback(null, this.snapshots[snapID]);

    return this;
};

// Lists available Backups
/**
* @ignore
*/
Collection.prototype.backups = function (fn) {
    var callback = fn || function () {};
    var keys = [];
    var backups = this.snapshots;

    for (var id in backups) {
        keys.push({ id: id, data: backups[id] });
    }

    callback(keys);

    return this;
};

// Lists available Backups
/**
* @ignore
*/
Collection.prototype.removeBackup = function (backupID, fn) {
    if (!backupID || 'function' === typeof backupID) {
        fn = backupID;
        this.snapshots = {};
    } else {
        var id = String(backupID);
        delete this.snapshots[id];
    }

    var callback = fn || function () {};

    callback(null);

    return this;
};

// Restore the snapshot. If no snapshot exists, raise an exception;
/**
* @ignore
*/
Collection.prototype.restore = function (backupID, fn) {
    var callback = fn || function () {};
    var snapshotCount = Object.size(this.snapshots);

    if (snapshotCount === 0) {
        throw new Error("No current snapshot");
    }

    var backupData = this.snapshots[backupID];

    if (!backupData) {
        throw new Error("Unknown Backup ID " + backupID);
    }

    this.docs = backupData;
    this.emit('restore');

    callback(null);

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
                throw new Error("can't append to array using string field name [" + keypart + "]");
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
                    throw new Error("can't modify field '" + keyparts[i + 1] + "' of list value " + JSON.stringify(doc[keypart]));
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
            throw new Error("Modifier $inc allowed for numbers only");
        }

        if (field in target) {
            if (typeof target[field] !== "number") {
                throw new Error("Cannot apply $inc modifier to non-number");
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
            throw new Error("Cannot apply $push modifier to non-array");
        } else {
            x.push(_.cloneDeep(arg));
        }
    },

    $pushAll: function $pushAll(target, field, arg) {
        if (!((typeof arg === "undefined" ? "undefined" : _typeof(arg)) === "object" && arg instanceof Array)) {
            throw new Error("Modifier $pushAll/pullAll allowed for arrays only");
        }

        var x = target[field];

        if (x === undefined) {
            target[field] = arg;
        } else if (!(x instanceof Array)) {
            throw new Error("Cannot apply $pushAll modifier to non-array");
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
            throw new Error("Cannot apply $addToSet modifier to non-array");
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
                    if (Selector._f._equal(value, x[i])) return;
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
            throw new Error("Cannot apply $pop modifier to non-array");
        } else {
            if (typeof arg === 'number' && arg < 0) {
                x.splice(0, 1);
            } else {
                x.pop();
            }
        }
    },

    $pull: function $pull(target, field, arg) {
        if (target === undefined) return;

        var x = target[field];

        if (x === undefined) {
            return;
        } else if (!(x instanceof Array)) {
            throw new Error("Cannot apply $pull/pullAll modifier to non-array");
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
                var match = Selector._compileSelector(arg);

                for (var i = 0; i < x.length; i++) {
                    if (!match(x[i])) {
                        out.push(x[i]);
                    }
                }
            } else {
                for (var i = 0; i < x.length; i++) {
                    if (!Selector._f._equal(x[i], arg)) {
                        out.push(x[i]);
                    }
                }
            }

            target[field] = out;
        }
    },

    $pullAll: function $pullAll(target, field, arg) {
        if (target === undefined) return;

        if (!((typeof arg === "undefined" ? "undefined" : _typeof(arg)) === "object" && arg instanceof Array)) {
            throw new Error("Modifier $pushAll/pullAll allowed for arrays only");
        }

        var x = target[field];

        if (x === undefined) {
            return;
        } else if (!(x instanceof Array)) {
            throw new Error("Cannot apply $pull/pullAll modifier to non-array");
        } else {
            var out = [];

            for (var i = 0; i < x.length; i++) {
                var exclude = false;

                for (var j = 0; j < arg.length; j++) {
                    if (Selector._f._equal(x[i], arg[j])) {
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

    $rename: function $rename(target, field, arg, keypath, doc) {
        if (target === undefined) return;

        if (keypath === arg) {
            // no idea why mongo has this restriction..
            throw new Error("$rename source must differ from target");
        }

        if (target === null) {
            throw new Error("$rename source field invalid");
        }

        if (typeof arg !== "string") {
            throw new Error("$rename target must be a string");
        }

        var v = target[field];
        delete target[field];

        var keyparts = arg.split('.');
        var target2 = Collection._findModTarget(doc, keyparts, false, true);

        if (target2 === null) {
            throw new Error("$rename target field invalid");
        }

        var field2 = keyparts.pop();

        target2[field2] = v;
    },

    $bit: function $bit(target, field, arg) {
        // XXX mongo only supports $bit on integers, and we only support
        // native javascript numbers (doubles) so far, so we can't support $bit
        throw new Error("$bit is not supported");
    }
};

/**
* @ignore
*/
Collection.checkCollectionName = function (collectionName) {
    if (!_.isString(collectionName)) {
        throw new Error("collection name must be a String");
    }

    if (!collectionName || collectionName.indexOf('..') !== -1) {
        throw new Error("collection names cannot be empty");
    }

    if (collectionName.indexOf('$') != -1 && collectionName.match(/((^\$cmd)|(oplog\.\$main))/) === null) {
        throw new Error("collection names must not contain '$'");
    }

    if (collectionName.match(/^\.|\.$/) !== null) {
        throw new Error("collection names must not start or end with '.'");
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
//# sourceMappingURL=data:application/json;base64,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QUMxQyxjQUFNLElBQUksS0FBSixDQUFVLGlEQUFWLENBQU47QUFDSDtBQUNKLENBaEJEOzs7OztBQXFCQSxXQUFXLFNBQVgsQ0FBcUIsTUFBckIsR0FBOEIsVUFBUyxPQUFULEVBQWtCO0FBQzVDLFFBQUksRUFBRSxRQUFGLENBQVcsT0FBWCxDQUFKLEVBQXlCO0FBQ3JCLFlBQUksS0FBSyxJQUFMLEtBQWMsT0FBbEIsRUFBMkI7QUFDdkIsdUJBQVcsbUJBQVgsQ0FBK0IsT0FBL0I7O0FBRUEsZ0JBQUksU0FBUyxLQUFLLElBQUwsQ0FBVSxLQUFWLENBQWdCLEdBQWhCLEVBQXFCLE1BQXJCLEdBQThCLENBQTlCLEdBQWtDLEtBQUssSUFBTCxDQUFVLEtBQVYsQ0FBZ0IsR0FBaEIsRUFBcUIsQ0FBckIsQ0FBbEMsR0FBNEQsRUFBekU7O0FBRUEsaUJBQUssSUFBTCxHQUFZLE9BQVo7QUFDQSxpQkFBSyxRQUFMLEdBQWdCLFNBQVMsR0FBVCxHQUFlLEtBQUssSUFBcEM7O0FBRUEsbUJBQU8sSUFBUDtBQUNIO0FBQ0osS0FYRCxNQVdPOztBQUVOO0FBQ0osQ0FmRDs7QUFpQkEsT0FBTyxPQUFQLEdBQWlCLFVBQWpCOzs7Ozs7Ozs7OztBQVdBLE9BQU8sSUFBUCxHQUFjLFVBQVMsR0FBVCxFQUFjO0FBQ3hCLFFBQUksT0FBTyxDQUFYO1FBQ0ksR0FESjs7QUFHQSxTQUFLLEdBQUwsSUFBWSxHQUFaLEVBQWlCO0FBQ2IsWUFBSSxJQUFJLGNBQUosQ0FBbUIsR0FBbkIsQ0FBSixFQUE2QjtBQUN6QjtBQUNIO0FBQ0o7O0FBRUQsV0FBTyxJQUFQO0FBQ0gsQ0FYRCIsImZpbGUiOiJDb2xsZWN0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBDb2xsZWN0aW9uLmpzIC0gYmFzZWQgb24gTW9uZ2xvI0NvbGxlY3Rpb24gKHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vTW9uZ2xvfSkgYnkgQ2hyaXN0aWFuIFN1bGxpdmFuIDxjc0BldWZvcmljLmNvPiB8IENvcHlyaWdodCAoYykgMjAxMlxuICogQHZlcnNpb24gMC4wLjFcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlZFxuICovXG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKFwiLi91dGlscy9Mb2dnZXJcIiksXG4gICAgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4vdXRpbHMvRXZlbnRFbWl0dGVyXCIpLFxuICAgIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpLFxuICAgIEN1cnNvciA9IHJlcXVpcmUoXCIuL0N1cnNvclwiKSxcbiAgICBPYmplY3RJZCA9IHJlcXVpcmUoJy4vT2JqZWN0SWQnKSxcbiAgICBTZWxlY3RvciA9IHJlcXVpcmUoXCIuL1NlbGVjdG9yXCIpO1xuICAgIFxuLyoqXG4gKiBDb2xsZWN0aW9uXG4gKiBcbiAqIEBtb2R1bGUgQ29sbGVjdGlvblxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2luY2UgMC4wLjFcbiAqIFxuICogQGNsYXNzZGVzYyBDb2xsZWN0aW9uIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBwYXJhbSB7TW9uZ29Qb3J0YWJsZX0gZGIgLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gKiBcbiAqL1xudmFyIGRhdGFiYXNlID0gbnVsbDtcbmNsYXNzIENvbGxlY3Rpb24gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuLy8gdmFyIENvbGxlY3Rpb24gPSBmdW5jdGlvbihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpIHtcbiAgICBjb25zdHJ1Y3RvcihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDb2xsZWN0aW9uKSkgcmV0dXJuIG5ldyBDb2xsZWN0aW9uKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucyk7XG4gICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGRiKSkgdGhyb3cgbmV3IEVycm9yKFwiZGIgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoY29sbGVjdGlvbk5hbWUpKSB0aHJvdyBuZXcgRXJyb3IoXCJjb2xsZWN0aW9uTmFtZSBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChvcHRpb25zKSB8fCAhXy5pc1BsYWluT2JqZWN0KG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgICAgIFxuICAgICAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUoY29sbGVjdGlvbk5hbWUpO1xuICAgIFxuICAgICAgICAvLyB0aGlzLmRiID0gZGI7XG4gICAgICAgIGRhdGFiYXNlID0gZGI7XG4gICAgICAgIHRoaXMubmFtZSA9IGNvbGxlY3Rpb25OYW1lO1xuICAgICAgICB0aGlzLmZ1bGxOYW1lID0gZGIuZGF0YWJhc2VOYW1lICsgJy4nICsgdGhpcy5uYW1lO1xuICAgICAgICB0aGlzLmRvY3MgPSBbXTtcbiAgICAgICAgdGhpcy5kb2NfaW5kZXhlcyA9IHt9O1xuICAgICAgICB0aGlzLnNuYXBzaG90cyA9IFtdO1xuICAgICAgICB0aGlzLm9wdHMgPSB7fTsgLy8gRGVmYXVsdCBvcHRpb25zXG4gICAgICAgIFxuICAgICAgICBfLm1lcmdlKHRoaXMub3B0cywgb3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICAvLyB0aGlzLmVtaXQgPSBkYi5lbWl0O1xuICAgIH1cbiAgICBcbiAgICBlbWl0KG5hbWUsIGFyZ3MsIGNiKSB7XG4gICAgICAgIHN1cGVyLmVtaXQobmFtZSwgYXJncywgY2IsIGRhdGFiYXNlLl9zdG9yZXMpO1xuICAgIH1cbn1cblxuLy8gVE9ETyBlbmZvcmNlIHJ1bGUgdGhhdCBmaWVsZCBuYW1lcyBjYW4ndCBzdGFydCB3aXRoICckJyBvciBjb250YWluICcuJ1xuLy8gKHJlYWwgbW9uZ29kYiBkb2VzIGluIGZhY3QgZW5mb3JjZSB0aGlzKVxuLy8gVE9ETyBwb3NzaWJseSBlbmZvcmNlIHRoYXQgJ3VuZGVmaW5lZCcgZG9lcyBub3QgYXBwZWFyICh3ZSBhc3N1bWVcbi8vIHRoaXMgaW4gb3VyIGhhbmRsaW5nIG9mIG51bGwgYW5kICRleGlzdHMpXG4vKipcbiAqIEluc2VydHMgYSBkb2N1bWVudCBpbnRvIHRoZSBjb2xsZWN0aW9uXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNpbnNlcnRcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IGRvYyAtIERvY3VtZW50IHRvIGJlIGluc2VydGVkXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuY2hhaW49ZmFsc2VdIC0gSWYgc2V0IHRvIFwidHJ1ZVwiIHJldHVybnMgdGhpcyBpbnN0YW5jZSwgc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R8Q29sbGVjdGlvbn0gSWYgXCJvcHRpb25zLmNoYWluXCIgc2V0IHRvIFwidHJ1ZVwiIHJldHVybnMgdGhpcyBpbnN0YW5jZSwgb3RoZXJ3aXNlIHJldHVybnMgdGhlIGluc2VydGVkIGRvY3VtZW50XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uIChkb2MsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoZG9jKSkgdGhyb3cgbmV3IEVycm9yKFwiZG9jIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICBcbiAgICBpZiAoIV8uaXNQbGFpbk9iamVjdChkb2MpKSB0aHJvdyBuZXcgRXJyb3IoXCJkb2MgbXVzdCBiZSBhbiBvYmplY3RcIik7XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSB0aHJvdyBuZXcgRXJyb3IoXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgLy8gQ3JlYXRpbmcgYSBzYWZlIGNvcHkgb2YgdGhlIGRvY3VtZW50XG4gICAgdmFyIF9kb2MgPSBfLmNsb25lRGVlcChkb2MpO1xuXG4gICAgLy8gSWYgdGhlIGRvY3VtZW50IGNvbWVzIHdpdGggYSBudW1iZXIgSUQsIHBhcnNlIGl0IHRvIFN0cmluZ1xuICAgIGlmIChfLmlzTnVtYmVyKF9kb2MuX2lkKSkge1xuICAgICAgICBfZG9jLl9pZCA9IF8udG9TdHJpbmcoX2RvYy5faWQpO1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSBldmVyeSBub24tbnVtYmVyIGNoYXJhY3RlclxuICAgIF9kb2MuX2lkID0gKF9kb2MuX2lkIHx8ICcnKS5yZXBsYWNlKC9cXEQvZywgJycpO1xuXG4gICAgaWYgKF8uaXNOaWwoX2RvYy5faWQpIHx8ICFfZG9jLl9pZC5sZW5ndGgpIHtcbiAgICAgICAgX2RvYy5faWQgPSBuZXcgT2JqZWN0SWQoKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgb3B0aW9ucyB0byBtb3JlIGRhdGVzXG4gICAgX2RvYy50aW1lc3RhbXAgPSBuZXcgT2JqZWN0SWQoKS5nZW5lcmF0aW9uVGltZTtcbiAgICBcbiAgICAvLyBSZXZlcnNlXG4gICAgdGhpcy5kb2NfaW5kZXhlc1tfLnRvU3RyaW5nKF9kb2MuX2lkKV0gPSB0aGlzLmRvY3MubGVuZ3RoO1xuICAgIHRoaXMuZG9jcy5wdXNoKF9kb2MpO1xuICAgIFxuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2luc2VydCcsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBkb2M6IF9kb2NcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIF9kb2MpO1xuXG4gICAgaWYgKG9wdGlvbnMuY2hhaW4pIHJldHVybiB0aGlzO1xuICAgIFxuICAgIHJldHVybiBfZG9jO1xufTtcblxuLyoqXG4gKiBGaW5kcyBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNmaW5kXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5za2lwXSAtIE51bWJlciBvZiBkb2N1bWVudHMgdG8gYmUgc2tpcHBlZFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmxpbWl0XSAtIE1heCBudW1iZXIgb2YgZG9jdW1lbnRzIHRvIGRpc3BsYXlcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW29wdGlvbnMuZmllbGRzXSAtIFNhbWUgYXMgXCJmaWVsZHNcIiBwYXJhbWV0ZXIgKGlmIGJvdGggcGFzc2VkLCBcIm9wdGlvbnMuZmllbGRzXCIgd2lsbCBiZSBpZ25vcmVkKVxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5jaGFpbj1mYWxzZV0gLSBJZiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBzbyBpdCBjYW4gYmUgY2hhaW5lZCB3aXRoIG90aGVyIG1ldGhvZHNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuZm9yY2VGZXRjaD1mYWxzZV0gLSBJZiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzIGFscmVhZHkgZmV0Y2hlZFxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheXxDb2xsZWN0aW9ufEN1cnNvcn0gSWYgXCJvcHRpb25zLmNoYWluXCIgc2V0IHRvIFwidHJ1ZVwiIHJldHVybnMgdGhpcyBpbnN0YW5jZSwgaWYgXCJvcHRpb25zLmZvcmNlRmV0Y2hcIiBzZXQgdG8gdHJ1ZSByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMsIG90aGVyd2lzZSByZXR1cm5zIGEgY3Vyc29yXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoc2VsZWN0aW9uKSkgc2VsZWN0aW9uID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNOaWwoZmllbGRzKSkgZmllbGRzID0gW107XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIHtcbiAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHNraXA6IDAsXG4gICAgICAgICAgICBsaW1pdDogMTUgICAvLyBmb3Igbm8gbGltaXQgcGFzcyBbb3B0aW9ucy5saW1pdCA9IC0xXVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHNlbGVjdGlvbikpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBzZWxlY3Rpb247XG4gICAgICAgIHNlbGVjdGlvbiA9IHt9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGZpZWxkcykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBmaWVsZHM7XG4gICAgICAgIGZpZWxkcyA9IFtdO1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgaWYoc2VsZWN0aW9uIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgX2lkOiBzZWxlY3Rpb25cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgdGhyb3cgbmV3IEVycm9yKFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIC8vIENvbXBpbGUgc2VsZWN0aW9uIGFuZCBmaWVsZHNcbiAgICB2YXIgc2VsZWN0aW9uQ29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZVNlbGVjdG9yKHNlbGVjdGlvbik7XG4gICAgdmFyIGZpZWxkc0NvbXBpbGVkID0gU2VsZWN0b3IuX2NvbXBpbGVGaWVsZHMoZmllbGRzKTsgICAvLyBUT0RPXG5cbiAgICBpZiAob3B0aW9ucy5maWVsZHMpIHtcbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgaWYgZmllbGRzIGFscmVhZHkgcGFzc2VkXG4gICAgICAgIGZpZWxkc0NvbXBpbGVkID0gU2VsZWN0b3IuX2NvbXBpbGVGaWVsZHMob3B0aW9ucy5maWVsZHMpO1xuICAgIH1cblxuICAgIC8vIGNhbGxiYWNrIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgdmFyIGN1cnNvciA9IG5ldyBDdXJzb3IodGhpcy5kYiwgdGhpcywgc2VsZWN0aW9uQ29tcGlsZWQsIGZpZWxkc0NvbXBpbGVkLCBvcHRpb25zKTtcblxuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2ZpbmQnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbkNvbXBpbGVkLFxuICAgICAgICAgICAgZmllbGRzOiBmaWVsZHNDb21waWxlZCxcbiAgICAgICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgLy8gUGFzcyB0aGUgY3Vyc29yIGZldGNoZWQgdG8gdGhlIGNhbGxiYWNrXG4gICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBjdXJzb3IuZmV0Y2goKSk7XG5cbiAgICBpZiAob3B0aW9ucy5jaGFpbikge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuZm9yY2VGZXRjaCkge1xuICAgICAgICByZXR1cm4gY3Vyc29yLmZldGNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGN1cnNvcjtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudFxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZE9uZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5saW1pdF0gLSBNYXggbnVtYmVyIG9mIGRvY3VtZW50cyB0byBkaXNwbGF5XG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudCBvZiB0aGUgY29sbGVjdGlvblxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5maW5kT25lID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzTmlsKGZpZWxkcykpIGZpZWxkcyA9IFtdO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBza2lwOiAwLFxuICAgICAgICAgICAgbGltaXQ6IDE1ICAgLy8gZm9yIG5vIGxpbWl0IHBhc3MgW29wdGlvbnMubGltaXQgPSAtMV0gLT4gbWFuYWdlIHdpdGggY3Vyc29yXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oZmllbGRzKSkge1xuICAgICAgICBjYWxsYmFjayA9IGZpZWxkcztcbiAgICAgICAgZmllbGRzID0gW107XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSB0aHJvdyBuZXcgRXJyb3IoXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgLy8gQ29tcGlsZSBzZWxlY3Rpb24gYW5kIGZpZWxkc1xuICAgIHZhciBzZWxlY3Rpb25Db21waWxlZCA9IFNlbGVjdG9yLl9jb21waWxlU2VsZWN0b3Ioc2VsZWN0aW9uKTtcbiAgICB2YXIgZmllbGRzQ29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZUZpZWxkcyhmaWVsZHMpOyAgIC8vIFRPRE9cblxuICAgIGlmIChvcHRpb25zLmZpZWxkcykge1xuICAgICAgICAvLyBBZGQgd2FybmluZyBpZiBmaWVsZHMgYWxyZWFkeSBwYXNzZWRcbiAgICAgICAgZmllbGRzQ29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZUZpZWxkcyhvcHRpb25zLmZpZWxkcyk7XG4gICAgfVxuXG4gICAgdmFyIGN1cnNvciA9IG5ldyBDdXJzb3IodGhpcy5kYiwgdGhpcywgc2VsZWN0aW9uQ29tcGlsZWQsIGZpZWxkc0NvbXBpbGVkLCBvcHRpb25zKTtcblxuICAgIC8vIHRoaXMuZW1pdCgnZmluZCcsIHNlbGVjdG9yLCBjdXJzb3IsIG8pO1xuXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnZmluZE9uZScsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uQ29tcGlsZWQsXG4gICAgICAgICAgICBmaWVsZHM6IGZpZWxkc0NvbXBpbGVkLFxuICAgICAgICAgICAgb3B0aW9uczogb3B0aW9uc1xuICAgICAgICB9XG4gICAgKTtcbiAgICBcbiAgICB2YXIgcmVzID0gbnVsbDtcbiAgICBcbiAgICBpZiAoY3Vyc29yLmhhc05leHQoKSkge1xuICAgICAgICByZXMgPSBjdXJzb3IubmV4dCgpO1xuICAgIH1cbiAgICBcbiAgICAvLyBQYXNzIHRoZSBjdXJzb3IgZmV0Y2hlZCB0byB0aGUgY2FsbGJhY2tcbiAgICAvLyBBZGQgW29wdGlvbnMubm9GZXRjaENhbGxiYWNrID0gdHJ1ZV1cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlcyk7XG4gICAgXG4gICAgcmV0dXJuIHJlcztcbn07XG5cblxuLyoqXG4gKiBVcGRhdGVzIG9uZSBvciBtYW55IGRvY3VtZW50c1xuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jdXBkYXRlXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdXBkYXRlPXt9XSAtIFRoZSB1cGRhdGUgb3BlcmF0aW9uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy51cGRhdGVBc01vbmdvPXRydWVdIC0gQnkgZGVmYXVsdDogXG4gKiAgICAgIElmIHRoZSBbdXBkYXRlXSBvYmplY3QgY29udGFpbnMgdXBkYXRlIG9wZXJhdG9yIG1vZGlmaWVycywgc3VjaCBhcyB0aG9zZSB1c2luZyB0aGUgXCIkc2V0XCIgbW9kaWZpZXIsIHRoZW46XG4gKiAgICAgICAgICA8dWw+XG4gKiAgICAgICAgICAgICAgPGxpPlRoZSBbdXBkYXRlXSBvYmplY3QgbXVzdCBjb250YWluIG9ubHkgdXBkYXRlIG9wZXJhdG9yIGV4cHJlc3Npb25zPC9saT5cbiAqICAgICAgICAgICAgICA8bGk+VGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCB1cGRhdGVzIG9ubHkgdGhlIGNvcnJlc3BvbmRpbmcgZmllbGRzIGluIHRoZSBkb2N1bWVudDwvbGk+XG4gKiAgICAgICAgICA8dWw+XG4gKiAgICAgIElmIHRoZSBbdXBkYXRlXSBvYmplY3QgY29udGFpbnMgb25seSBcImZpZWxkOiB2YWx1ZVwiIGV4cHJlc3Npb25zLCB0aGVuOlxuICogICAgICAgICAgPHVsPlxuICogICAgICAgICAgICAgIDxsaT5UaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIHJlcGxhY2VzIHRoZSBtYXRjaGluZyBkb2N1bWVudCB3aXRoIHRoZSBbdXBkYXRlXSBvYmplY3QuIFRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgZG9lcyBub3QgcmVwbGFjZSB0aGUgXCJfaWRcIiB2YWx1ZTwvbGk+XG4gKiAgICAgICAgICAgICAgPGxpPkNvbGxlY3Rpb24jdXBkYXRlIGNhbm5vdCB1cGRhdGUgbXVsdGlwbGUgZG9jdW1lbnRzPC9saT5cbiAqICAgICAgICAgIDx1bD5cbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm92ZXJyaWRlPWZhbHNlXSAtIFJlcGxhY2VzIHRoZSB3aG9sZSBkb2N1bWVudCAob25seSBhcGxsaWVzIHdoZW4gW3VwZGF0ZUFzTW9uZ289ZmFsc2VdKVxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnVwc2VydD1mYWxzZV0gLSBDcmVhdGVzIGEgbmV3IGRvY3VtZW50IHdoZW4gbm8gZG9jdW1lbnQgbWF0Y2hlcyB0aGUgcXVlcnkgY3JpdGVyaWFcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5tdWx0aT1mYWxzZV0gLSBVcGRhdGVzIG11bHRpcGxlIGRvY3VtZW50cyB0aGF0IG1lZXQgdGhlIGNyaXRlcmlhXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB0aGUgdXBkYXRlL2luc2VydCAoaWYgdXBzZXJ0PXRydWUpIGluZm9ybWF0aW9uXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIHVwZGF0ZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChzZWxlY3Rpb24pKSBzZWxlY3Rpb24gPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc05pbCh1cGRhdGUpKSB1cGRhdGUgPSBbXTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkge1xuICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgIGxpbWl0OiAxNSAgIC8vIGZvciBubyBsaW1pdCBwYXNzIFtvcHRpb25zLmxpbWl0ID0gLTFdXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24odXBkYXRlKSkge1xuICAgICAgICBjYWxsYmFjayA9IHVwZGF0ZTtcbiAgICAgICAgdXBkYXRlID0gW107XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSB0aHJvdyBuZXcgRXJyb3IoXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG5cbiAgICB2YXIgcmVzID0gbnVsbDtcblxuICAgIHZhciBkb2NzID0gbnVsbDtcbiAgICBpZiAob3B0aW9ucy5tdWx0aSkge1xuICAgICAgICBkb2NzID0gdGhpcy5maW5kKHNlbGVjdGlvbiwgbnVsbCwgeyBmb3JjZUZldGNoOiB0cnVlIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY3MgPSB0aGlzLmZpbmRPbmUoc2VsZWN0aW9uKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwoZG9jcykpIHtcbiAgICAgICAgZG9jcyA9IFtdO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNBcnJheShkb2NzKSkge1xuICAgICAgICBkb2NzID0gW2RvY3NdO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZG9jcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgaWYgKG9wdGlvbnMudXBzZXJ0KSB7XG4gICAgICAgICAgICB2YXIgaW5zZXJ0ZWQgPSB0aGlzLmluc2VydCh1cGRhdGUpO1xuXG4gICAgICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IGluc2VydGVkLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBObyBkb2N1bWVudHMgZm91bmRcbiAgICAgICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHVwZGF0ZWREb2NzID0gW107XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvY3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBkb2MgPSBkb2NzW2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgb3ZlcnJpZGUgPSBudWxsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgaGFzTW9kaWZpZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIElFNyBkb2Vzbid0IHN1cHBvcnQgaW5kZXhpbmcgaW50byBzdHJpbmdzIChlZywga2V5WzBdIG9yIGtleS5pbmRleE9mKCckJykgKSwgc28gdXNlIHN1YnN0ci5cbiAgICAgICAgICAgICAgICAvLyBUZXN0aW5nIG92ZXIgdGhlIGZpcnN0IGxldHRlcjpcbiAgICAgICAgICAgICAgICAvLyAgICAgIEJlc3RzIHJlc3VsdCB3aXRoIDFlOCBsb29wcyA9PiBrZXlbMF0ofjNzKSA+IHN1YnN0cih+NXMpID4gcmVnZXhwKH42cykgPiBpbmRleE9mKH4xNnMpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIG1vZGlmaWVyID0gKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJyk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc01vZGlmaWVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMudXBkYXRlQXNNb25nbykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzTW9kaWZpZXIgJiYgIW1vZGlmaWVyKSB0aHJvdyBuZXcgRXJyb3IoXCJBbGwgdXBkYXRlIGZpZWxkcyBtdXN0IGJlIGFuIHVwZGF0ZSBvcGVyYXRvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghaGFzTW9kaWZpZXIgJiYgb3B0aW9ucy5tdWx0aSkgdGhyb3cgbmV3IEVycm9yKFwiWW91IGNhbiBub3QgdXBkYXRlIHNldmVyYWwgZG9jdW1lbnRzIHdoZW4gbm8gdXBkYXRlIG9wZXJhdG9ycyBhcmUgaW5jbHVkZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzTW9kaWZpZXIpIG92ZXJyaWRlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc01vZGlmaWVyKSBvdmVycmlkZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcnJpZGUgPSAhIW9wdGlvbnMub3ZlcnJpZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgX2RvY1VwZGF0ZSA9IG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE92ZXJyaWRlIHRoZSBkb2N1bWVudCBleGNlcHQgZm9yIHRoZSBcIl9pZFwiXG4gICAgICAgICAgICBpZiAob3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBNdXN0IGlnbm9yZSBmaWVsZHMgc3RhcnRpbmcgd2l0aCAnJCcsICcuJy4uLlxuICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSBfLmNsb25lRGVlcCh1cGRhdGUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJyB8fCAvXFwuL2cudGVzdChrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBMb2dnZXIud2FybihgVGhlIGZpZWxkICR7a2V5fSBjYW4gbm90IGJlZ2luIHdpdGggJyQnIG9yIGNvbnRhaW4gJy4nYCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgX2RvY1VwZGF0ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIERvIG5vdCBvdmVycmlkZSB0aGUgXCJfaWRcIlxuICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUuX2lkID0gZG9jLl9pZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX2RvY1VwZGF0ZSA9IF8uY2xvbmVEZWVwKGRvYyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsID0gdXBkYXRlW2tleV07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYXBwbHlNb2RpZmllcihfZG9jVXBkYXRlLCBrZXksIHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaXNOaWwoX2RvY1VwZGF0ZVtrZXldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMb2dnZXIud2FybihcIlRoZSBmaWVsZCAnX2lkJyBjYW4gbm90IGJlIHVwZGF0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBMb2dnZXIud2FybihgVGhlIGRvY3VtZW50IGRvZXMgbm90IGNvbnRhaW5zIHRoZSBmaWVsZCAke2tleX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdXBkYXRlZERvY3MucHVzaChfZG9jVXBkYXRlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGlkeCA9IHRoaXMuZG9jX2luZGV4ZXNbX2RvY1VwZGF0ZS5faWRdO1xuICAgICAgICAgICAgdGhpcy5kb2NzW2lkeF0gPSBfZG9jVXBkYXRlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAndXBkYXRlJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgbW9kaWZpZXI6IHVwZGF0ZSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBvcHRpb25zLFxuICAgICAgICAgICAgICAgIGRvY3M6IHVwZGF0ZWREb2NzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnRzOiB1cGRhdGVkRG9jcyxcbiAgICAgICAgICAgICAgICBjb3VudDogdXBkYXRlZERvY3MubGVuZ3RoXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgIFxuICAgIHJldHVybiByZXM7XG59O1xuXG52YXIgX2FwcGx5TW9kaWZpZXIgPSBmdW5jdGlvbihfZG9jVXBkYXRlLCBrZXksIHZhbCkge1xuICAgIHZhciBtb2QgPSBfbW9kaWZpZXJzW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBpZiAoIW1vZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgbW9kaWZpZXIgc3BlY2lmaWVkOiAke2tleX1gKTtcbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIga2V5cGF0aCBpbiB2YWwpIHtcbiAgICAgICAgdmFyIGFyZyA9IHZhbFtrZXlwYXRoXTtcbiAgICAgICAgdmFyIGtleXBhcnRzID0ga2V5cGF0aC5zcGxpdCgnLicpO1xuICAgICAgICB2YXIgbm9fY3JlYXRlID0gISFDb2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVyc1trZXldO1xuICAgICAgICB2YXIgZm9yYmlkX2FycmF5ID0gKGtleSA9PT0gXCIkcmVuYW1lXCIpO1xuICAgICAgICB2YXIgdGFyZ2V0ID0gQ29sbGVjdGlvbi5fZmluZE1vZFRhcmdldChfZG9jVXBkYXRlLCBrZXlwYXJ0cywgbm9fY3JlYXRlLCBmb3JiaWRfYXJyYXkpO1xuICAgICAgICB2YXIgZmllbGQgPSBrZXlwYXJ0cy5wb3AoKTtcblxuICAgICAgICBtb2QodGFyZ2V0LCBmaWVsZCwgYXJnLCBrZXlwYXRoLCBfZG9jVXBkYXRlKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgb25lIG9yIG1hbnkgZG9jdW1lbnRzXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNyZW1vdmVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuanVzdE9uZT1mYWxzZV0gLSBEZWxldGVzIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIHRoZSBzZWxlY3Rpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHRoZSBkZWxldGVkIGRvY3VtZW50c1xuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSB0aHJvdyBuZXcgRXJyb3IoXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgdmFyIGN1cnNvciA9IHRoaXMuZmluZChzZWxlY3Rpb24pO1xuICAgIFxuICAgIHZhciBkb2NzID0gW107XG4gICAgY3Vyc29yLmZvckVhY2goZG9jID0+IHtcbiAgICAgICAgdmFyIGlkeCA9IHRoaXMuZG9jX2luZGV4ZXNbZG9jLl9pZF07XG4gICAgICAgIFxuICAgICAgICBkZWxldGUgdGhpcy5kb2NfaW5kZXhlc1tkb2MuX2lkXTtcbiAgICAgICAgdGhpcy5kb2NzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICBcbiAgICAgICAgZG9jcy5wdXNoKGRvYyk7XG4gICAgfSk7XG4gICAgXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAncmVtb3ZlJyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICBkb2NzOiBkb2NzXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgZG9jcyk7XG4gICAgXG4gICAgcmV0dXJuIGRvY3M7XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbihvYmosIGZuKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGNhbGxiYWNrID0gZm4gfHwgZnVuY3Rpb24oKXt9O1xuXG4gICAgaWYgKHNlbGYuZG9jc1tvYmouX2lkXSkge1xuICAgICAgICBzZWxmLnVwZGF0ZSh7X2lkOiBvYmouX2lkfSwgY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuaW5zZXJ0KG9iaixjYWxsYmFjayk7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5lbnN1cmVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vVE9ETyBJbXBsZW1lbnQgRW5zdXJlSW5kZXhcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbGxlY3Rpb24jZW5zdXJlSW5kZXggdW5pbXBsZW1lbnRlZCBieSBkcml2ZXInKTtcbn07XG5cbi8vIFRPRE8gZG9jdW1lbnQgKGF0IHNvbWUgcG9pbnQpXG4vLyBUT0RPIHRlc3Rcbi8vIFRPRE8gb2J2aW91c2x5IHRoaXMgcGFydGljdWxhciBpbXBsZW1lbnRhdGlvbiB3aWxsIG5vdCBiZSB2ZXJ5IGVmZmljaWVudFxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGZuKSB7XG4gICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBiYWNrdXBJRCkge1xuICAgICAgICBmbiA9IGJhY2t1cElEO1xuICAgICAgICBiYWNrdXBJRCA9IG5ldyBPYmplY3RJZCgpO1xuICAgIH1cblxuICAgIHZhciBjYWxsYmFjayA9IGZufHxmdW5jdGlvbigpe307XG4gICAgdmFyIHNuYXBJRCA9IGJhY2t1cElEO1xuXG4gICAgdGhpcy5zbmFwc2hvdHNbc25hcElEXSA9IHRoaXMuZG9jcztcbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdzbmFwc2hvdCcsXG4gICAgICAgIHtcbiAgICAgICAgICAgIF9pZCA6IHRoaXMuZG9jcyxcbiAgICAgICAgICAgIGRhdGEgOiB0aGlzLmRvY3MgXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgY2FsbGJhY2sobnVsbCwgdGhpcy5zbmFwc2hvdHNbc25hcElEXSk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8vIExpc3RzIGF2YWlsYWJsZSBCYWNrdXBzXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmJhY2t1cHMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBmbiB8fCBmdW5jdGlvbigpe307XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICB2YXIgYmFja3VwcyA9IHRoaXMuc25hcHNob3RzO1xuXG4gICAgZm9yICh2YXIgaWQgaW4gYmFja3Vwcykge1xuICAgICAgICBrZXlzLnB1c2goe2lkOiBpZCwgZGF0YTogYmFja3Vwc1tpZF19KTtcbiAgICB9XG5cbiAgICBjYWxsYmFjayhrZXlzKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8gTGlzdHMgYXZhaWxhYmxlIEJhY2t1cHNcbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlQmFja3VwID0gZnVuY3Rpb24gKGJhY2t1cElELCBmbikge1xuICAgIGlmICghYmFja3VwSUQgfHwgJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGJhY2t1cElEKSB7XG4gICAgICAgIGZuID0gYmFja3VwSUQ7XG4gICAgICAgIHRoaXMuc25hcHNob3RzID0ge307XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGlkID0gU3RyaW5nKGJhY2t1cElEKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc25hcHNob3RzW2lkXTtcbiAgICB9XG5cbiAgICB2YXIgY2FsbGJhY2sgPSBmbiB8fCBmdW5jdGlvbigpe307XG5cbiAgICBjYWxsYmFjayhudWxsKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vLyBSZXN0b3JlIHRoZSBzbmFwc2hvdC4gSWYgbm8gc25hcHNob3QgZXhpc3RzLCByYWlzZSBhbiBleGNlcHRpb247XG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlc3RvcmUgPSBmdW5jdGlvbiAoIGJhY2t1cElELCBmbiApIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBmbiB8fCBmdW5jdGlvbigpe307XG4gICAgdmFyIHNuYXBzaG90Q291bnQgPSBPYmplY3Quc2l6ZSh0aGlzLnNuYXBzaG90cyk7XG5cbiAgICBpZiAoc25hcHNob3RDb3VudD09PTApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gY3VycmVudCBzbmFwc2hvdFwiKTtcbiAgICB9XG5cbiAgICB2YXIgYmFja3VwRGF0YSA9IHRoaXMuc25hcHNob3RzW2JhY2t1cElEXTtcblxuICAgIGlmICghYmFja3VwRGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIEJhY2t1cCBJRCBcIitiYWNrdXBJRCk7XG4gICAgfVxuXG4gICAgdGhpcy5kb2NzID0gYmFja3VwRGF0YTtcbiAgICB0aGlzLmVtaXQoJ3Jlc3RvcmUnKTtcblxuICAgIGNhbGxiYWNrKG51bGwpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBmb3IgYS5iLmMuMi5kLmUsIGtleXBhcnRzIHNob3VsZCBiZSBbJ2EnLCAnYicsICdjJywgJzInLCAnZCcsICdlJ10sXG4vLyBhbmQgdGhlbiB5b3Ugd291bGQgb3BlcmF0ZSBvbiB0aGUgJ2UnIHByb3BlcnR5IG9mIHRoZSByZXR1cm5lZFxuLy8gb2JqZWN0LiBpZiBub19jcmVhdGUgaXMgZmFsc2V5LCBjcmVhdGVzIGludGVybWVkaWF0ZSBsZXZlbHMgb2Zcbi8vIHN0cnVjdHVyZSBhcyBuZWNlc3NhcnksIGxpa2UgbWtkaXIgLXAgKGFuZCByYWlzZXMgYW4gZXhjZXB0aW9uIGlmXG4vLyB0aGF0IHdvdWxkIG1lYW4gZ2l2aW5nIGEgbm9uLW51bWVyaWMgcHJvcGVydHkgdG8gYW4gYXJyYXkuKSBpZlxuLy8gbm9fY3JlYXRlIGlzIHRydWUsIHJldHVybiB1bmRlZmluZWQgaW5zdGVhZC4gbWF5IG1vZGlmeSB0aGUgbGFzdFxuLy8gZWxlbWVudCBvZiBrZXlwYXJ0cyB0byBzaWduYWwgdG8gdGhlIGNhbGxlciB0aGF0IGl0IG5lZWRzIHRvIHVzZSBhXG4vLyBkaWZmZXJlbnQgdmFsdWUgdG8gaW5kZXggaW50byB0aGUgcmV0dXJuZWQgb2JqZWN0IChmb3IgZXhhbXBsZSxcbi8vIFsnYScsICcwMSddIC0+IFsnYScsIDFdKS4gaWYgZm9yYmlkX2FycmF5IGlzIHRydWUsIHJldHVybiBudWxsIGlmXG4vLyB0aGUga2V5cGF0aCBnb2VzIHRocm91Z2ggYW4gYXJyYXkuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24uX2ZpbmRNb2RUYXJnZXQgPSBmdW5jdGlvbiAoZG9jLCBrZXlwYXJ0cywgbm9fY3JlYXRlLCBmb3JiaWRfYXJyYXkpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBsYXN0ID0gKGkgPT09IGtleXBhcnRzLmxlbmd0aCAtIDEpO1xuICAgICAgICB2YXIga2V5cGFydCA9IGtleXBhcnRzW2ldO1xuICAgICAgICB2YXIgbnVtZXJpYyA9IC9eWzAtOV0rJC8udGVzdChrZXlwYXJ0KTtcblxuICAgICAgICBpZiAobm9fY3JlYXRlICYmICghKHR5cGVvZiBkb2MgPT09IFwib2JqZWN0XCIpIHx8ICEoa2V5cGFydCBpbiBkb2MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkb2MgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgaWYgKGZvcmJpZF9hcnJheSkgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgICAgIGlmICghbnVtZXJpYykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImNhbid0IGFwcGVuZCB0byBhcnJheSB1c2luZyBzdHJpbmcgZmllbGQgbmFtZSBbXCIgKyBrZXlwYXJ0ICsgXCJdXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBrZXlwYXJ0ID0gXy50b051bWJlcihrZXlwYXJ0KTtcblxuICAgICAgICAgICAgaWYgKGxhc3QpIHtcbiAgICAgICAgICAgICAgICAvLyBoYW5kbGUgJ2EuMDEnXG4gICAgICAgICAgICAgICAga2V5cGFydHNbaV0gPSBrZXlwYXJ0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3aGlsZSAoZG9jLmxlbmd0aCA8IGtleXBhcnQpIHtcbiAgICAgICAgICAgICAgICBkb2MucHVzaChudWxsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFsYXN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvYy5sZW5ndGggPT09IGtleXBhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jLnB1c2goe30pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY1trZXlwYXJ0XSAhPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjYW4ndCBtb2RpZnkgZmllbGQgJ1wiICsga2V5cGFydHNbaSArIDFdICsgXCInIG9mIGxpc3QgdmFsdWUgXCIgKyBKU09OLnN0cmluZ2lmeShkb2Nba2V5cGFydF0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBYWFggY2hlY2sgdmFsaWQgZmllbGRuYW1lIChubyAkIGF0IHN0YXJ0LCBubyAuKVxuICAgICAgICAgICAgaWYgKCFsYXN0ICYmICEoa2V5cGFydCBpbiBkb2MpKSB7XG4gICAgICAgICAgICAgICAgZG9jW2tleXBhcnRdID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGFzdCkgcmV0dXJuIGRvYztcblxuICAgICAgICBkb2MgPSBkb2Nba2V5cGFydF07XG4gICAgfVxuXG4gICAgLy8gbm90cmVhY2hlZFxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVycyA9IHtcbiAgICAkdW5zZXQ6IHRydWUsXG4gICAgJHBvcDogdHJ1ZSxcbiAgICAkcmVuYW1lOiB0cnVlLFxuICAgICRwdWxsOiB0cnVlLFxuICAgICRwdWxsQWxsOiB0cnVlXG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbnZhciBfbW9kaWZpZXJzID0ge1xuICAgICRpbmM6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhcmcgIT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1vZGlmaWVyICRpbmMgYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbZmllbGRdICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFwcGx5ICRpbmMgbW9kaWZpZXIgdG8gbm9uLW51bWJlclwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSArPSBhcmc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IF8uY2xvbmVEZWVwKGFyZyk7XG4gICAgfSxcblxuICAgICR1bnNldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAodGFyZ2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVzaDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFthcmddO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFwcGx5ICRwdXNoIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHgucHVzaChfLmNsb25lRGVlcChhcmcpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVzaEFsbDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoISh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiICYmIGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFwcGx5ICRwdXNoQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJnLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgeC5wdXNoKGFyZ1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJGFkZFRvU2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gW2FyZ107XG4gICAgICAgIH0gZWxzZSBpZiAoISh4IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYXBwbHkgJGFkZFRvU2V0IG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBpc0VhY2ggPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgayBpbiBhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGsgPT09IFwiJGVhY2hcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNFYWNoID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gaXNFYWNoID8gYXJnW1wiJGVhY2hcIl0gOiBbYXJnXTtcbiAgICAgICAgICAgIF8uZm9yRWFjaCh2YWx1ZXMsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoU2VsZWN0b3IuX2YuX2VxdWFsKHZhbHVlLCB4W2ldKSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHgucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcG9wOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoISh4IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYXBwbHkgJHBvcCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicgJiYgYXJnIDwgMCkge1xuICAgICAgICAgICAgICAgIHguc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4LnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoISh4IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYXBwbHkgJHB1bGwvcHVsbEFsbCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgb3V0ID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiICYmICEoYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgLy8gWFhYIHdvdWxkIGJlIG11Y2ggbmljZXIgdG8gY29tcGlsZSB0aGlzIG9uY2UsIHJhdGhlciB0aGFuXG4gICAgICAgICAgICAgICAgLy8gZm9yIGVhY2ggZG9jdW1lbnQgd2UgbW9kaWZ5Li4gYnV0IHVzdWFsbHkgd2UncmUgbm90XG4gICAgICAgICAgICAgICAgLy8gbW9kaWZ5aW5nIHRoYXQgbWFueSBkb2N1bWVudHMsIHNvIHdlJ2xsIGxldCBpdCBzbGlkZSBmb3JcbiAgICAgICAgICAgICAgICAvLyBub3dcblxuICAgICAgICAgICAgICAgIC8vIFhYWCBfY29tcGlsZVNlbGVjdG9yIGlzbid0IHVwIGZvciB0aGUgam9iLCBiZWNhdXNlIHdlIG5lZWRcbiAgICAgICAgICAgICAgICAvLyB0byBwZXJtaXQgc3R1ZmYgbGlrZSB7JHB1bGw6IHthOiB7JGd0OiA0fX19Li4gc29tZXRoaW5nXG4gICAgICAgICAgICAgICAgLy8gbGlrZSB7JGd0OiA0fSBpcyBub3Qgbm9ybWFsbHkgYSBjb21wbGV0ZSBzZWxlY3Rvci5cbiAgICAgICAgICAgICAgICAvLyBzYW1lIGlzc3VlIGFzICRlbGVtTWF0Y2ggcG9zc2libHk/XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoID0gU2VsZWN0b3IuX2NvbXBpbGVTZWxlY3RvcihhcmcpO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2goeFtpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFTZWxlY3Rvci5fZi5fZXF1YWwoeFtpXSwgYXJnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBvdXQ7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1bGxBbGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG5cbiAgICAgICAgaWYgKCEodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIiAmJiBhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHlcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhjbHVkZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBhcmcubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yLl9mLl9lcXVhbCh4W2ldLCBhcmdbal0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIWV4Y2x1ZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRyZW5hbWU6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcsIGtleXBhdGgsIGRvYykge1xuICAgICAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGlmIChrZXlwYXRoID09PSBhcmcpIHtcbiAgICAgICAgICAgIC8vIG5vIGlkZWEgd2h5IG1vbmdvIGhhcyB0aGlzIHJlc3RyaWN0aW9uLi5cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIiRyZW5hbWUgc291cmNlIG11c3QgZGlmZmVyIGZyb20gdGFyZ2V0XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiJHJlbmFtZSBzb3VyY2UgZmllbGQgaW52YWxpZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgYXJnICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCIkcmVuYW1lIHRhcmdldCBtdXN0IGJlIGEgc3RyaW5nXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHYgPSB0YXJnZXRbZmllbGRdO1xuICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICB2YXIga2V5cGFydHMgPSBhcmcuc3BsaXQoJy4nKTtcbiAgICAgICAgdmFyIHRhcmdldDIgPSBDb2xsZWN0aW9uLl9maW5kTW9kVGFyZ2V0KGRvYywga2V5cGFydHMsIGZhbHNlLCB0cnVlKTtcblxuICAgICAgICBpZiAodGFyZ2V0MiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiJHJlbmFtZSB0YXJnZXQgZmllbGQgaW52YWxpZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmaWVsZDIgPSBrZXlwYXJ0cy5wb3AoKTtcbiAgICAgICAgXG4gICAgICAgIHRhcmdldDJbZmllbGQyXSA9IHY7XG4gICAgfSxcblxuICAgICRiaXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgLy8gWFhYIG1vbmdvIG9ubHkgc3VwcG9ydHMgJGJpdCBvbiBpbnRlZ2VycywgYW5kIHdlIG9ubHkgc3VwcG9ydFxuICAgICAgICAvLyBuYXRpdmUgamF2YXNjcmlwdCBudW1iZXJzIChkb3VibGVzKSBzbyBmYXIsIHNvIHdlIGNhbid0IHN1cHBvcnQgJGJpdFxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCIkYml0IGlzIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUgPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSkge1xuICAgIGlmICghXy5pc1N0cmluZyhjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY29sbGVjdGlvbiBuYW1lIG11c3QgYmUgYSBTdHJpbmdcIik7XG4gICAgfVxuXG4gICAgaWYgKCFjb2xsZWN0aW9uTmFtZSB8fCBjb2xsZWN0aW9uTmFtZS5pbmRleE9mKCcuLicpICE9PSAtMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjb2xsZWN0aW9uIG5hbWVzIGNhbm5vdCBiZSBlbXB0eVwiKTtcbiAgICB9XG5cbiAgICBpZiAoY29sbGVjdGlvbk5hbWUuaW5kZXhPZignJCcpICE9IC0xICYmIGNvbGxlY3Rpb25OYW1lLm1hdGNoKC8oKF5cXCRjbWQpfChvcGxvZ1xcLlxcJG1haW4pKS8pID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImNvbGxlY3Rpb24gbmFtZXMgbXVzdCBub3QgY29udGFpbiAnJCdcIik7XG4gICAgfVxuXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLm1hdGNoKC9eXFwufFxcLiQvKSAhPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IHN0YXJ0IG9yIGVuZCB3aXRoICcuJ1wiKTtcbiAgICB9XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbmFtZSA9IGZ1bmN0aW9uKG5ld05hbWUpIHtcbiAgICBpZiAoXy5pc1N0cmluZyhuZXdOYW1lKSkge1xuICAgICAgICBpZiAodGhpcy5uYW1lICE9PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUobmV3TmFtZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBkYk5hbWUgPSB0aGlzLm5hbWUuc3BsaXQoJy4nKS5sZW5ndGggPiAxID8gdGhpcy5uYW1lLnNwbGl0KCcuJylbMF0gOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5uYW1lID0gbmV3TmFtZTtcbiAgICAgICAgICAgIHRoaXMuZnVsbE5hbWUgPSBkYk5hbWUgKyAnLicgKyB0aGlzLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRXJyb3JcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb247XG5cbi8qKlxuICogR2V0cyB0aGUgc2l6ZSBvZiBhbiBvYmplY3QuXG4gKiBcbiAqIEBtZXRob2QgT2JqZWN0I3NpemVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBvYmplY3RcbiAqIFxuICogQHJldHVybnMge051bWJlcn0gVGhlIHNpemUgb2YgdGhlIG9iamVjdFxuICovXG5PYmplY3Quc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBzaXplID0gMCwgXG4gICAgICAgIGtleTtcbiAgICBcbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBzaXplKys7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHNpemU7XG59OyJdfQ==
