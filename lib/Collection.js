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

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    // Compile selection and fields
    // var selectionCompiled = Selector._compileSelector(selection);
    // var fieldsCompiled = Selector._compileFields(fields);   // TODO

    if (options.fields) {
        if (_.isNil(fields)) {
            fields = options.fields;
        } else {}
        // error

        // fieldsCompiled = Selector._compileFields(options.fields);
    }

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

    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

    // Compile selection and fields
    // var selectionCompiled = Selector._compileSelector(selection);
    // var fieldsCompiled = Selector._compileFields(fields);   // TODO

    if (options.fields) {
        // FIXME Repeated code
        if (_.isNil(fields)) {
            fields = options.fields;
        } else {}
        // error

        // Add warning if fields already passed
        // fieldsCompiled = Selector._compileFields(options.fields);
    }

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
                    if (hasModifier && !modifier) logger.throw("All update fields must be an update operator");

                    if (!hasModifier && options.multi) logger.throw("You can not update several documents when no update operators are included");

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
                        logger.warn("The field " + _key + " can not begin with '$' or contain '.'");
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
    logger.throw('Collection#ensureIndex unimplemented by driver');
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
        logger.throw("No current snapshot");
    }

    var backupData = this.snapshots[backupID];

    if (!backupData) {
        logger.throw("Unknown Backup ID " + backupID);
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

    if (collectionName.indexOf('$') != -1 && collectionName.match(/((^\$cmd)|(oplog\.\$main))/) === null) {
        logger.throw("collection names must not contain '$'");
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
//# sourceMappingURL=data:application/json;base64,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c291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBDb2xsZWN0aW9uLmpzIC0gYmFzZWQgb24gTW9uZ2xvI0NvbGxlY3Rpb24gKHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vTW9uZ2xvfSkgYnkgQ2hyaXN0aWFuIFN1bGxpdmFuIDxjc0BldWZvcmljLmNvPiB8IENvcHlyaWdodCAoYykgMjAxMlxuICogQHZlcnNpb24gMS4wLjBcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlZFxuICovXG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKFwiLi91dGlscy9Mb2dnZXJcIiksXG4gICAgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4vdXRpbHMvRXZlbnRFbWl0dGVyXCIpLFxuICAgIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpLFxuICAgIEN1cnNvciA9IHJlcXVpcmUoXCIuL0N1cnNvclwiKSxcbiAgICBPYmplY3RJZCA9IHJlcXVpcmUoJy4vT2JqZWN0SWQnKTtcbiAgICAvLyBTZWxlY3RvciA9IHJlcXVpcmUoXCIuL1NlbGVjdG9yXCIpO1xuICAgIFxudmFyIGxvZ2dlciA9IG51bGw7XG4gICAgXG4vKipcbiAqIENvbGxlY3Rpb25cbiAqIFxuICogQG1vZHVsZSBDb2xsZWN0aW9uXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzaW5jZSAwLjAuMVxuICogXG4gKiBAY2xhc3NkZXNjIENvbGxlY3Rpb24gY2xhc3MgdGhhdCBtYXBzIGEgTW9uZ29EQi1saWtlIGNvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBEYXRhYmFzZSBvYmplY3RcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLnBrRmFjdG9yeT1udWxsXSAtIE9iamVjdCBvdmVycmlkaW5nIHRoZSBiYXNpYyBcIk9iamVjdElkXCIgcHJpbWFyeSBrZXkgZ2VuZXJhdGlvbi5cbiAqIFxuICovXG52YXIgZGF0YWJhc2UgPSBudWxsO1xuY2xhc3MgQ29sbGVjdGlvbiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4vLyB2YXIgQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucykge1xuICAgIGNvbnN0cnVjdG9yKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIENvbGxlY3Rpb24pKSByZXR1cm4gbmV3IENvbGxlY3Rpb24oZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoZGIpKSBsb2dnZXIudGhyb3coXCJkYiBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChjb2xsZWN0aW9uTmFtZSkpIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb25OYW1lIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpIHx8ICFfLmlzUGxhaW5PYmplY3Qob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIENvbGxlY3Rpb24uY2hlY2tDb2xsZWN0aW9uTmFtZShjb2xsZWN0aW9uTmFtZSk7XG4gICAgXG4gICAgICAgIC8vIHRoaXMuZGIgPSBkYjtcbiAgICAgICAgZGF0YWJhc2UgPSBkYjtcbiAgICAgICAgdGhpcy5uYW1lID0gY29sbGVjdGlvbk5hbWU7XG4gICAgICAgIHRoaXMuZnVsbE5hbWUgPSBkYi5kYXRhYmFzZU5hbWUgKyAnLicgKyB0aGlzLm5hbWU7XG4gICAgICAgIHRoaXMuZG9jcyA9IFtdO1xuICAgICAgICB0aGlzLmRvY19pbmRleGVzID0ge307XG4gICAgICAgIHRoaXMuc25hcHNob3RzID0gW107XG4gICAgICAgIHRoaXMub3B0cyA9IHt9OyAvLyBEZWZhdWx0IG9wdGlvbnNcbiAgICAgICAgXG4gICAgICAgIF8ubWVyZ2UodGhpcy5vcHRzLCBvcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRoaXMuZW1pdCA9IGRiLmVtaXQ7XG4gICAgfVxuICAgIFxuICAgIGVtaXQobmFtZSwgYXJncywgY2IpIHtcbiAgICAgICAgc3VwZXIuZW1pdChuYW1lLCBhcmdzLCBjYiwgZGF0YWJhc2UuX3N0b3Jlcyk7XG4gICAgfVxufVxuXG4vLyBUT0RPIGVuZm9yY2UgcnVsZSB0aGF0IGZpZWxkIG5hbWVzIGNhbid0IHN0YXJ0IHdpdGggJyQnIG9yIGNvbnRhaW4gJy4nXG4vLyAocmVhbCBtb25nb2RiIGRvZXMgaW4gZmFjdCBlbmZvcmNlIHRoaXMpXG4vLyBUT0RPIHBvc3NpYmx5IGVuZm9yY2UgdGhhdCAndW5kZWZpbmVkJyBkb2VzIG5vdCBhcHBlYXIgKHdlIGFzc3VtZVxuLy8gdGhpcyBpbiBvdXIgaGFuZGxpbmcgb2YgbnVsbCBhbmQgJGV4aXN0cylcbi8qKlxuICogSW5zZXJ0cyBhIGRvY3VtZW50IGludG8gdGhlIGNvbGxlY3Rpb25cbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI2luc2VydFxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIC0gRG9jdW1lbnQgdG8gYmUgaW5zZXJ0ZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5jaGFpbj1mYWxzZV0gLSBJZiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBzbyBpdCBjYW4gYmUgY2hhaW5lZCB3aXRoIG90aGVyIG1ldGhvZHNcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdHxDb2xsZWN0aW9ufSBJZiBcIm9wdGlvbnMuY2hhaW5cIiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgaW5zZXJ0ZWQgZG9jdW1lbnRcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24gKGRvYywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChkb2MpKSBsb2dnZXIudGhyb3coXCJkb2MgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgIFxuICAgIGlmICghXy5pc1BsYWluT2JqZWN0KGRvYykpIGxvZ2dlci50aHJvdyhcImRvYyBtdXN0IGJlIGFuIG9iamVjdFwiKTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICAvLyBDcmVhdGluZyBhIHNhZmUgY29weSBvZiB0aGUgZG9jdW1lbnRcbiAgICB2YXIgX2RvYyA9IF8uY2xvbmVEZWVwKGRvYyk7XG5cbiAgICAvLyBJZiB0aGUgZG9jdW1lbnQgY29tZXMgd2l0aCBhIG51bWJlciBJRCwgcGFyc2UgaXQgdG8gU3RyaW5nXG4gICAgaWYgKF8uaXNOdW1iZXIoX2RvYy5faWQpKSB7XG4gICAgICAgIF9kb2MuX2lkID0gXy50b1N0cmluZyhfZG9jLl9pZCk7XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIGV2ZXJ5IG5vbi1udW1iZXIgY2hhcmFjdGVyXG4gICAgX2RvYy5faWQgPSAoX2RvYy5faWQgfHwgJycpLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cbiAgICBpZiAoXy5pc05pbChfZG9jLl9pZCkgfHwgIV9kb2MuX2lkLmxlbmd0aCkge1xuICAgICAgICBfZG9jLl9pZCA9IG5ldyBPYmplY3RJZCgpO1xuICAgIH1cblxuICAgIC8vIEFkZCBvcHRpb25zIHRvIG1vcmUgZGF0ZXNcbiAgICBfZG9jLnRpbWVzdGFtcCA9IG5ldyBPYmplY3RJZCgpLmdlbmVyYXRpb25UaW1lO1xuICAgIFxuICAgIC8vIFJldmVyc2VcbiAgICB0aGlzLmRvY19pbmRleGVzW18udG9TdHJpbmcoX2RvYy5faWQpXSA9IHRoaXMuZG9jcy5sZW5ndGg7XG4gICAgdGhpcy5kb2NzLnB1c2goX2RvYyk7XG4gICAgXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnaW5zZXJ0JyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIGRvYzogX2RvY1xuICAgICAgICB9XG4gICAgKTtcblxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgX2RvYyk7XG5cbiAgICBpZiAob3B0aW9ucy5jaGFpbikgcmV0dXJuIHRoaXM7XG4gICAgXG4gICAgcmV0dXJuIF9kb2M7XG59O1xuXG4vKipcbiAqIEZpbmRzIGFsbCBtYXRjaGluZyBkb2N1bWVudHNcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI2ZpbmRcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbZmllbGRzPXt9XSAtIFRoZSBmaWVsZHMgb2YgdGhlIGRvY3VtZW50IHRvIHNob3dcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnNraXBdIC0gTnVtYmVyIG9mIGRvY3VtZW50cyB0byBiZSBza2lwcGVkXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubGltaXRdIC0gTWF4IG51bWJlciBvZiBkb2N1bWVudHMgdG8gZGlzcGxheVxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbb3B0aW9ucy5maWVsZHNdIC0gU2FtZSBhcyBcImZpZWxkc1wiIHBhcmFtZXRlciAoaWYgYm90aCBwYXNzZWQsIFwib3B0aW9ucy5maWVsZHNcIiB3aWxsIGJlIGlnbm9yZWQpXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNoYWluPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5mb3JjZUZldGNoPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMgYWxyZWFkeSBmZXRjaGVkXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge0FycmF5fENvbGxlY3Rpb258Q3Vyc29yfSBJZiBcIm9wdGlvbnMuY2hhaW5cIiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBpZiBcIm9wdGlvbnMuZm9yY2VGZXRjaFwiIHNldCB0byB0cnVlIHJldHVybnMgdGhlIGFycmF5IG9mIGRvY3VtZW50cywgb3RoZXJ3aXNlIHJldHVybnMgYSBjdXJzb3JcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChzZWxlY3Rpb24pKSBzZWxlY3Rpb24gPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChmaWVsZHMpKSBmaWVsZHMgPSBbXTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkge1xuICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgIGxpbWl0OiAxNSAgIC8vIGZvciBubyBsaW1pdCBwYXNzIFtvcHRpb25zLmxpbWl0ID0gLTFdXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oZmllbGRzKSkge1xuICAgICAgICBjYWxsYmFjayA9IGZpZWxkcztcbiAgICAgICAgZmllbGRzID0gW107XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgLy8gQ29tcGlsZSBzZWxlY3Rpb24gYW5kIGZpZWxkc1xuICAgIC8vIHZhciBzZWxlY3Rpb25Db21waWxlZCA9IFNlbGVjdG9yLl9jb21waWxlU2VsZWN0b3Ioc2VsZWN0aW9uKTtcbiAgICAvLyB2YXIgZmllbGRzQ29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZUZpZWxkcyhmaWVsZHMpOyAgIC8vIFRPRE9cblxuICAgIGlmIChvcHRpb25zLmZpZWxkcykge1xuICAgICAgICBpZiAoXy5pc05pbChmaWVsZHMpKSB7XG4gICAgICAgICAgICBmaWVsZHMgPSBvcHRpb25zLmZpZWxkcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGVycm9yXG4gICAgICAgIH1cbiAgICAgICAgLy8gZmllbGRzQ29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZUZpZWxkcyhvcHRpb25zLmZpZWxkcyk7XG4gICAgfVxuXG4gICAgLy8gY2FsbGJhY2sgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICB2YXIgY3Vyc29yID0gbmV3IEN1cnNvcih0aGlzLmRiLCB0aGlzLCBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucyk7XG5cbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdmaW5kJyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICBmaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgLy8gUGFzcyB0aGUgY3Vyc29yIGZldGNoZWQgdG8gdGhlIGNhbGxiYWNrXG4gICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBjdXJzb3IuZmV0Y2goKSk7XG5cbiAgICBpZiAob3B0aW9ucy5jaGFpbikge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuZm9yY2VGZXRjaCkge1xuICAgICAgICByZXR1cm4gY3Vyc29yLmZldGNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGN1cnNvcjtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudFxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZE9uZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5saW1pdF0gLSBNYXggbnVtYmVyIG9mIGRvY3VtZW50cyB0byBkaXNwbGF5XG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudCBvZiB0aGUgY29sbGVjdGlvblxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5maW5kT25lID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzTmlsKGZpZWxkcykpIGZpZWxkcyA9IFtdO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBza2lwOiAwLFxuICAgICAgICAgICAgbGltaXQ6IDE1ICAgLy8gZm9yIG5vIGxpbWl0IHBhc3MgW29wdGlvbnMubGltaXQgPSAtMV0gLT4gbWFuYWdlIHdpdGggY3Vyc29yXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oZmllbGRzKSkge1xuICAgICAgICBjYWxsYmFjayA9IGZpZWxkcztcbiAgICAgICAgZmllbGRzID0gW107XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgLy8gQ29tcGlsZSBzZWxlY3Rpb24gYW5kIGZpZWxkc1xuICAgIC8vIHZhciBzZWxlY3Rpb25Db21waWxlZCA9IFNlbGVjdG9yLl9jb21waWxlU2VsZWN0b3Ioc2VsZWN0aW9uKTtcbiAgICAvLyB2YXIgZmllbGRzQ29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZUZpZWxkcyhmaWVsZHMpOyAgIC8vIFRPRE9cblxuICAgIGlmIChvcHRpb25zLmZpZWxkcykgeyAgIC8vIEZJWE1FIFJlcGVhdGVkIGNvZGVcbiAgICAgICAgaWYgKF8uaXNOaWwoZmllbGRzKSkge1xuICAgICAgICAgICAgZmllbGRzID0gb3B0aW9ucy5maWVsZHM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBlcnJvclxuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCB3YXJuaW5nIGlmIGZpZWxkcyBhbHJlYWR5IHBhc3NlZFxuICAgICAgICAvLyBmaWVsZHNDb21waWxlZCA9IFNlbGVjdG9yLl9jb21waWxlRmllbGRzKG9wdGlvbnMuZmllbGRzKTtcbiAgICB9XG5cbiAgICB2YXIgY3Vyc29yID0gbmV3IEN1cnNvcih0aGlzLmRiLCB0aGlzLCBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucyk7XG5cbiAgICAvLyB0aGlzLmVtaXQoJ2ZpbmQnLCBzZWxlY3RvciwgY3Vyc29yLCBvKTtcblxuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2ZpbmRPbmUnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgIGZpZWxkczogZmllbGRzLFxuICAgICAgICAgICAgb3B0aW9uczogb3B0aW9uc1xuICAgICAgICB9XG4gICAgKTtcbiAgICBcbiAgICB2YXIgcmVzID0gbnVsbDtcbiAgICBcbiAgICBpZiAoY3Vyc29yLmhhc05leHQoKSkge1xuICAgICAgICByZXMgPSBjdXJzb3IubmV4dCgpO1xuICAgIH1cbiAgICBcbiAgICAvLyBQYXNzIHRoZSBjdXJzb3IgZmV0Y2hlZCB0byB0aGUgY2FsbGJhY2tcbiAgICAvLyBBZGQgW29wdGlvbnMubm9GZXRjaENhbGxiYWNrID0gdHJ1ZV1cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlcyk7XG4gICAgXG4gICAgcmV0dXJuIHJlcztcbn07XG5cblxuLyoqXG4gKiBVcGRhdGVzIG9uZSBvciBtYW55IGRvY3VtZW50c1xuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jdXBkYXRlXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdXBkYXRlPXt9XSAtIFRoZSB1cGRhdGUgb3BlcmF0aW9uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy51cGRhdGVBc01vbmdvPXRydWVdIC0gQnkgZGVmYXVsdDogXG4gKiAgICAgIElmIHRoZSBbdXBkYXRlXSBvYmplY3QgY29udGFpbnMgdXBkYXRlIG9wZXJhdG9yIG1vZGlmaWVycywgc3VjaCBhcyB0aG9zZSB1c2luZyB0aGUgXCIkc2V0XCIgbW9kaWZpZXIsIHRoZW46XG4gKiAgICAgICAgICA8dWw+XG4gKiAgICAgICAgICAgICAgPGxpPlRoZSBbdXBkYXRlXSBvYmplY3QgbXVzdCBjb250YWluIG9ubHkgdXBkYXRlIG9wZXJhdG9yIGV4cHJlc3Npb25zPC9saT5cbiAqICAgICAgICAgICAgICA8bGk+VGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCB1cGRhdGVzIG9ubHkgdGhlIGNvcnJlc3BvbmRpbmcgZmllbGRzIGluIHRoZSBkb2N1bWVudDwvbGk+XG4gKiAgICAgICAgICA8dWw+XG4gKiAgICAgIElmIHRoZSBbdXBkYXRlXSBvYmplY3QgY29udGFpbnMgb25seSBcImZpZWxkOiB2YWx1ZVwiIGV4cHJlc3Npb25zLCB0aGVuOlxuICogICAgICAgICAgPHVsPlxuICogICAgICAgICAgICAgIDxsaT5UaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIHJlcGxhY2VzIHRoZSBtYXRjaGluZyBkb2N1bWVudCB3aXRoIHRoZSBbdXBkYXRlXSBvYmplY3QuIFRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgZG9lcyBub3QgcmVwbGFjZSB0aGUgXCJfaWRcIiB2YWx1ZTwvbGk+XG4gKiAgICAgICAgICAgICAgPGxpPkNvbGxlY3Rpb24jdXBkYXRlIGNhbm5vdCB1cGRhdGUgbXVsdGlwbGUgZG9jdW1lbnRzPC9saT5cbiAqICAgICAgICAgIDx1bD5cbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm92ZXJyaWRlPWZhbHNlXSAtIFJlcGxhY2VzIHRoZSB3aG9sZSBkb2N1bWVudCAob25seSBhcGxsaWVzIHdoZW4gW3VwZGF0ZUFzTW9uZ289ZmFsc2VdKVxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnVwc2VydD1mYWxzZV0gLSBDcmVhdGVzIGEgbmV3IGRvY3VtZW50IHdoZW4gbm8gZG9jdW1lbnQgbWF0Y2hlcyB0aGUgcXVlcnkgY3JpdGVyaWFcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5tdWx0aT1mYWxzZV0gLSBVcGRhdGVzIG11bHRpcGxlIGRvY3VtZW50cyB0aGF0IG1lZXQgdGhlIGNyaXRlcmlhXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB0aGUgdXBkYXRlL2luc2VydCAoaWYgdXBzZXJ0PXRydWUpIGluZm9ybWF0aW9uXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIHVwZGF0ZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChzZWxlY3Rpb24pKSBzZWxlY3Rpb24gPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc05pbCh1cGRhdGUpKSB1cGRhdGUgPSBbXTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkge1xuICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgIGxpbWl0OiAxNSAgIC8vIGZvciBubyBsaW1pdCBwYXNzIFtvcHRpb25zLmxpbWl0ID0gLTFdXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24odXBkYXRlKSkge1xuICAgICAgICBjYWxsYmFjayA9IHVwZGF0ZTtcbiAgICAgICAgdXBkYXRlID0gW107XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG5cbiAgICB2YXIgcmVzID0gbnVsbDtcblxuICAgIHZhciBkb2NzID0gbnVsbDtcbiAgICBpZiAob3B0aW9ucy5tdWx0aSkge1xuICAgICAgICBkb2NzID0gdGhpcy5maW5kKHNlbGVjdGlvbiwgbnVsbCwgeyBmb3JjZUZldGNoOiB0cnVlIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY3MgPSB0aGlzLmZpbmRPbmUoc2VsZWN0aW9uKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwoZG9jcykpIHtcbiAgICAgICAgZG9jcyA9IFtdO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNBcnJheShkb2NzKSkge1xuICAgICAgICBkb2NzID0gW2RvY3NdO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZG9jcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgaWYgKG9wdGlvbnMudXBzZXJ0KSB7XG4gICAgICAgICAgICB2YXIgaW5zZXJ0ZWQgPSB0aGlzLmluc2VydCh1cGRhdGUpO1xuXG4gICAgICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IGluc2VydGVkLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBObyBkb2N1bWVudHMgZm91bmRcbiAgICAgICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHVwZGF0ZWREb2NzID0gW107XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvY3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBkb2MgPSBkb2NzW2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgb3ZlcnJpZGUgPSBudWxsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgaGFzTW9kaWZpZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIElFNyBkb2Vzbid0IHN1cHBvcnQgaW5kZXhpbmcgaW50byBzdHJpbmdzIChlZywga2V5WzBdIG9yIGtleS5pbmRleE9mKCckJykgKSwgc28gdXNlIHN1YnN0ci5cbiAgICAgICAgICAgICAgICAvLyBUZXN0aW5nIG92ZXIgdGhlIGZpcnN0IGxldHRlcjpcbiAgICAgICAgICAgICAgICAvLyAgICAgIEJlc3RzIHJlc3VsdCB3aXRoIDFlOCBsb29wcyA9PiBrZXlbMF0ofjNzKSA+IHN1YnN0cih+NXMpID4gcmVnZXhwKH42cykgPiBpbmRleE9mKH4xNnMpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIG1vZGlmaWVyID0gKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJyk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc01vZGlmaWVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMudXBkYXRlQXNNb25nbykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzTW9kaWZpZXIgJiYgIW1vZGlmaWVyKSBsb2dnZXIudGhyb3coXCJBbGwgdXBkYXRlIGZpZWxkcyBtdXN0IGJlIGFuIHVwZGF0ZSBvcGVyYXRvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghaGFzTW9kaWZpZXIgJiYgb3B0aW9ucy5tdWx0aSkgbG9nZ2VyLnRocm93KFwiWW91IGNhbiBub3QgdXBkYXRlIHNldmVyYWwgZG9jdW1lbnRzIHdoZW4gbm8gdXBkYXRlIG9wZXJhdG9ycyBhcmUgaW5jbHVkZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzTW9kaWZpZXIpIG92ZXJyaWRlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc01vZGlmaWVyKSBvdmVycmlkZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcnJpZGUgPSAhIW9wdGlvbnMub3ZlcnJpZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgX2RvY1VwZGF0ZSA9IG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE92ZXJyaWRlIHRoZSBkb2N1bWVudCBleGNlcHQgZm9yIHRoZSBcIl9pZFwiXG4gICAgICAgICAgICBpZiAob3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBNdXN0IGlnbm9yZSBmaWVsZHMgc3RhcnRpbmcgd2l0aCAnJCcsICcuJy4uLlxuICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSBfLmNsb25lRGVlcCh1cGRhdGUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJyB8fCAvXFwuL2cudGVzdChrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgVGhlIGZpZWxkICR7a2V5fSBjYW4gbm90IGJlZ2luIHdpdGggJyQnIG9yIGNvbnRhaW4gJy4nYCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgX2RvY1VwZGF0ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIERvIG5vdCBvdmVycmlkZSB0aGUgXCJfaWRcIlxuICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUuX2lkID0gZG9jLl9pZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX2RvY1VwZGF0ZSA9IF8uY2xvbmVEZWVwKGRvYyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsID0gdXBkYXRlW2tleV07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYXBwbHlNb2RpZmllcihfZG9jVXBkYXRlLCBrZXksIHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaXNOaWwoX2RvY1VwZGF0ZVtrZXldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihcIlRoZSBmaWVsZCAnX2lkJyBjYW4gbm90IGJlIHVwZGF0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgVGhlIGRvY3VtZW50IGRvZXMgbm90IGNvbnRhaW5zIHRoZSBmaWVsZCAke2tleX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdXBkYXRlZERvY3MucHVzaChfZG9jVXBkYXRlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGlkeCA9IHRoaXMuZG9jX2luZGV4ZXNbX2RvY1VwZGF0ZS5faWRdO1xuICAgICAgICAgICAgdGhpcy5kb2NzW2lkeF0gPSBfZG9jVXBkYXRlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAndXBkYXRlJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgbW9kaWZpZXI6IHVwZGF0ZSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBvcHRpb25zLFxuICAgICAgICAgICAgICAgIGRvY3M6IHVwZGF0ZWREb2NzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnRzOiB1cGRhdGVkRG9jcyxcbiAgICAgICAgICAgICAgICBjb3VudDogdXBkYXRlZERvY3MubGVuZ3RoXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgIFxuICAgIHJldHVybiByZXM7XG59O1xuXG52YXIgX2FwcGx5TW9kaWZpZXIgPSBmdW5jdGlvbihfZG9jVXBkYXRlLCBrZXksIHZhbCkge1xuICAgIHZhciBtb2QgPSBfbW9kaWZpZXJzW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBpZiAoIW1vZCkge1xuICAgICAgICBsb2dnZXIudGhyb3coYEludmFsaWQgbW9kaWZpZXIgc3BlY2lmaWVkOiAke2tleX1gKTtcbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIga2V5cGF0aCBpbiB2YWwpIHtcbiAgICAgICAgdmFyIGFyZyA9IHZhbFtrZXlwYXRoXTtcbiAgICAgICAgdmFyIGtleXBhcnRzID0ga2V5cGF0aC5zcGxpdCgnLicpO1xuICAgICAgICB2YXIgbm9fY3JlYXRlID0gISFDb2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVyc1trZXldO1xuICAgICAgICB2YXIgZm9yYmlkX2FycmF5ID0gKGtleSA9PT0gXCIkcmVuYW1lXCIpO1xuICAgICAgICB2YXIgdGFyZ2V0ID0gQ29sbGVjdGlvbi5fZmluZE1vZFRhcmdldChfZG9jVXBkYXRlLCBrZXlwYXJ0cywgbm9fY3JlYXRlLCBmb3JiaWRfYXJyYXkpO1xuICAgICAgICB2YXIgZmllbGQgPSBrZXlwYXJ0cy5wb3AoKTtcblxuICAgICAgICBtb2QodGFyZ2V0LCBmaWVsZCwgYXJnLCBrZXlwYXRoLCBfZG9jVXBkYXRlKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgb25lIG9yIG1hbnkgZG9jdW1lbnRzXG4gKiBcbiAqIEBtZXRob2QgQ29sbGVjdGlvbiNyZW1vdmVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuanVzdE9uZT1mYWxzZV0gLSBEZWxldGVzIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIHRoZSBzZWxlY3Rpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHRoZSBkZWxldGVkIGRvY3VtZW50c1xuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgdmFyIGN1cnNvciA9IHRoaXMuZmluZChzZWxlY3Rpb24pO1xuICAgIFxuICAgIHZhciBkb2NzID0gW107XG4gICAgY3Vyc29yLmZvckVhY2goZG9jID0+IHtcbiAgICAgICAgdmFyIGlkeCA9IHRoaXMuZG9jX2luZGV4ZXNbZG9jLl9pZF07XG4gICAgICAgIFxuICAgICAgICBkZWxldGUgdGhpcy5kb2NfaW5kZXhlc1tkb2MuX2lkXTtcbiAgICAgICAgdGhpcy5kb2NzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICBcbiAgICAgICAgZG9jcy5wdXNoKGRvYyk7XG4gICAgfSk7XG4gICAgXG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAncmVtb3ZlJyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICBkb2NzOiBkb2NzXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgZG9jcyk7XG4gICAgXG4gICAgcmV0dXJuIGRvY3M7XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbihvYmosIGZuKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGNhbGxiYWNrID0gZm4gfHwgZnVuY3Rpb24oKXt9O1xuXG4gICAgaWYgKHNlbGYuZG9jc1tvYmouX2lkXSkge1xuICAgICAgICBzZWxmLnVwZGF0ZSh7X2lkOiBvYmouX2lkfSwgY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuaW5zZXJ0KG9iaixjYWxsYmFjayk7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5lbnN1cmVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vVE9ETyBJbXBsZW1lbnQgRW5zdXJlSW5kZXhcbiAgICBsb2dnZXIudGhyb3coJ0NvbGxlY3Rpb24jZW5zdXJlSW5kZXggdW5pbXBsZW1lbnRlZCBieSBkcml2ZXInKTtcbn07XG5cbi8vIFRPRE8gZG9jdW1lbnQgKGF0IHNvbWUgcG9pbnQpXG4vLyBUT0RPIHRlc3Rcbi8vIFRPRE8gb2J2aW91c2x5IHRoaXMgcGFydGljdWxhciBpbXBsZW1lbnRhdGlvbiB3aWxsIG5vdCBiZSB2ZXJ5IGVmZmljaWVudFxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGZuKSB7XG4gICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBiYWNrdXBJRCkge1xuICAgICAgICBmbiA9IGJhY2t1cElEO1xuICAgICAgICBiYWNrdXBJRCA9IG5ldyBPYmplY3RJZCgpO1xuICAgIH1cblxuICAgIHZhciBjYWxsYmFjayA9IGZufHxmdW5jdGlvbigpe307XG4gICAgdmFyIHNuYXBJRCA9IGJhY2t1cElEO1xuXG4gICAgdGhpcy5zbmFwc2hvdHNbc25hcElEXSA9IHRoaXMuZG9jcztcbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdzbmFwc2hvdCcsXG4gICAgICAgIHtcbiAgICAgICAgICAgIF9pZCA6IHRoaXMuZG9jcyxcbiAgICAgICAgICAgIGRhdGEgOiB0aGlzLmRvY3MgXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgY2FsbGJhY2sobnVsbCwgdGhpcy5zbmFwc2hvdHNbc25hcElEXSk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8vIExpc3RzIGF2YWlsYWJsZSBCYWNrdXBzXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmJhY2t1cHMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBmbiB8fCBmdW5jdGlvbigpe307XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICB2YXIgYmFja3VwcyA9IHRoaXMuc25hcHNob3RzO1xuXG4gICAgZm9yICh2YXIgaWQgaW4gYmFja3Vwcykge1xuICAgICAgICBrZXlzLnB1c2goe2lkOiBpZCwgZGF0YTogYmFja3Vwc1tpZF19KTtcbiAgICB9XG5cbiAgICBjYWxsYmFjayhrZXlzKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8gTGlzdHMgYXZhaWxhYmxlIEJhY2t1cHNcbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlQmFja3VwID0gZnVuY3Rpb24gKGJhY2t1cElELCBmbikge1xuICAgIGlmICghYmFja3VwSUQgfHwgJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGJhY2t1cElEKSB7XG4gICAgICAgIGZuID0gYmFja3VwSUQ7XG4gICAgICAgIHRoaXMuc25hcHNob3RzID0ge307XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGlkID0gU3RyaW5nKGJhY2t1cElEKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc25hcHNob3RzW2lkXTtcbiAgICB9XG5cbiAgICB2YXIgY2FsbGJhY2sgPSBmbiB8fCBmdW5jdGlvbigpe307XG5cbiAgICBjYWxsYmFjayhudWxsKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vLyBSZXN0b3JlIHRoZSBzbmFwc2hvdC4gSWYgbm8gc25hcHNob3QgZXhpc3RzLCByYWlzZSBhbiBleGNlcHRpb247XG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlc3RvcmUgPSBmdW5jdGlvbiAoIGJhY2t1cElELCBmbiApIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBmbiB8fCBmdW5jdGlvbigpe307XG4gICAgdmFyIHNuYXBzaG90Q291bnQgPSBPYmplY3Quc2l6ZSh0aGlzLnNuYXBzaG90cyk7XG5cbiAgICBpZiAoc25hcHNob3RDb3VudD09PTApIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiTm8gY3VycmVudCBzbmFwc2hvdFwiKTtcbiAgICB9XG5cbiAgICB2YXIgYmFja3VwRGF0YSA9IHRoaXMuc25hcHNob3RzW2JhY2t1cElEXTtcblxuICAgIGlmICghYmFja3VwRGF0YSkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJVbmtub3duIEJhY2t1cCBJRCBcIitiYWNrdXBJRCk7XG4gICAgfVxuXG4gICAgdGhpcy5kb2NzID0gYmFja3VwRGF0YTtcbiAgICB0aGlzLmVtaXQoJ3Jlc3RvcmUnKTtcblxuICAgIGNhbGxiYWNrKG51bGwpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBmb3IgYS5iLmMuMi5kLmUsIGtleXBhcnRzIHNob3VsZCBiZSBbJ2EnLCAnYicsICdjJywgJzInLCAnZCcsICdlJ10sXG4vLyBhbmQgdGhlbiB5b3Ugd291bGQgb3BlcmF0ZSBvbiB0aGUgJ2UnIHByb3BlcnR5IG9mIHRoZSByZXR1cm5lZFxuLy8gb2JqZWN0LiBpZiBub19jcmVhdGUgaXMgZmFsc2V5LCBjcmVhdGVzIGludGVybWVkaWF0ZSBsZXZlbHMgb2Zcbi8vIHN0cnVjdHVyZSBhcyBuZWNlc3NhcnksIGxpa2UgbWtkaXIgLXAgKGFuZCByYWlzZXMgYW4gZXhjZXB0aW9uIGlmXG4vLyB0aGF0IHdvdWxkIG1lYW4gZ2l2aW5nIGEgbm9uLW51bWVyaWMgcHJvcGVydHkgdG8gYW4gYXJyYXkuKSBpZlxuLy8gbm9fY3JlYXRlIGlzIHRydWUsIHJldHVybiB1bmRlZmluZWQgaW5zdGVhZC4gbWF5IG1vZGlmeSB0aGUgbGFzdFxuLy8gZWxlbWVudCBvZiBrZXlwYXJ0cyB0byBzaWduYWwgdG8gdGhlIGNhbGxlciB0aGF0IGl0IG5lZWRzIHRvIHVzZSBhXG4vLyBkaWZmZXJlbnQgdmFsdWUgdG8gaW5kZXggaW50byB0aGUgcmV0dXJuZWQgb2JqZWN0IChmb3IgZXhhbXBsZSxcbi8vIFsnYScsICcwMSddIC0+IFsnYScsIDFdKS4gaWYgZm9yYmlkX2FycmF5IGlzIHRydWUsIHJldHVybiBudWxsIGlmXG4vLyB0aGUga2V5cGF0aCBnb2VzIHRocm91Z2ggYW4gYXJyYXkuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24uX2ZpbmRNb2RUYXJnZXQgPSBmdW5jdGlvbiAoZG9jLCBrZXlwYXJ0cywgbm9fY3JlYXRlLCBmb3JiaWRfYXJyYXkpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBsYXN0ID0gKGkgPT09IGtleXBhcnRzLmxlbmd0aCAtIDEpO1xuICAgICAgICB2YXIga2V5cGFydCA9IGtleXBhcnRzW2ldO1xuICAgICAgICB2YXIgbnVtZXJpYyA9IC9eWzAtOV0rJC8udGVzdChrZXlwYXJ0KTtcblxuICAgICAgICBpZiAobm9fY3JlYXRlICYmICghKHR5cGVvZiBkb2MgPT09IFwib2JqZWN0XCIpIHx8ICEoa2V5cGFydCBpbiBkb2MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkb2MgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgaWYgKGZvcmJpZF9hcnJheSkgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgICAgIGlmICghbnVtZXJpYykge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcImNhbid0IGFwcGVuZCB0byBhcnJheSB1c2luZyBzdHJpbmcgZmllbGQgbmFtZSBbXCIgKyBrZXlwYXJ0ICsgXCJdXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBrZXlwYXJ0ID0gXy50b051bWJlcihrZXlwYXJ0KTtcblxuICAgICAgICAgICAgaWYgKGxhc3QpIHtcbiAgICAgICAgICAgICAgICAvLyBoYW5kbGUgJ2EuMDEnXG4gICAgICAgICAgICAgICAga2V5cGFydHNbaV0gPSBrZXlwYXJ0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3aGlsZSAoZG9jLmxlbmd0aCA8IGtleXBhcnQpIHtcbiAgICAgICAgICAgICAgICBkb2MucHVzaChudWxsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFsYXN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvYy5sZW5ndGggPT09IGtleXBhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jLnB1c2goe30pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY1trZXlwYXJ0XSAhPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJjYW4ndCBtb2RpZnkgZmllbGQgJ1wiICsga2V5cGFydHNbaSArIDFdICsgXCInIG9mIGxpc3QgdmFsdWUgXCIgKyBKU09OLnN0cmluZ2lmeShkb2Nba2V5cGFydF0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBYWFggY2hlY2sgdmFsaWQgZmllbGRuYW1lIChubyAkIGF0IHN0YXJ0LCBubyAuKVxuICAgICAgICAgICAgaWYgKCFsYXN0ICYmICEoa2V5cGFydCBpbiBkb2MpKSB7XG4gICAgICAgICAgICAgICAgZG9jW2tleXBhcnRdID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGFzdCkgcmV0dXJuIGRvYztcblxuICAgICAgICBkb2MgPSBkb2Nba2V5cGFydF07XG4gICAgfVxuXG4gICAgLy8gbm90cmVhY2hlZFxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVycyA9IHtcbiAgICAkdW5zZXQ6IHRydWUsXG4gICAgJHBvcDogdHJ1ZSxcbiAgICAkcmVuYW1lOiB0cnVlLFxuICAgICRwdWxsOiB0cnVlLFxuICAgICRwdWxsQWxsOiB0cnVlXG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbnZhciBfbW9kaWZpZXJzID0ge1xuICAgICRpbmM6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhcmcgIT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRpbmMgYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbZmllbGRdICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRpbmMgbW9kaWZpZXIgdG8gbm9uLW51bWJlclwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSArPSBhcmc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IF8uY2xvbmVEZWVwKGFyZyk7XG4gICAgfSxcblxuICAgICR1bnNldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAodGFyZ2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVzaDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFthcmddO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwdXNoIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHgucHVzaChfLmNsb25lRGVlcChhcmcpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVzaEFsbDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoISh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiICYmIGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwdXNoQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJnLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgeC5wdXNoKGFyZ1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJGFkZFRvU2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gW2FyZ107XG4gICAgICAgIH0gZWxzZSBpZiAoISh4IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJGFkZFRvU2V0IG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBpc0VhY2ggPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgayBpbiBhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGsgPT09IFwiJGVhY2hcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNFYWNoID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gaXNFYWNoID8gYXJnW1wiJGVhY2hcIl0gOiBbYXJnXTtcbiAgICAgICAgICAgIF8uZm9yRWFjaCh2YWx1ZXMsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiAoU2VsZWN0b3IuX2YuX2VxdWFsKHZhbHVlLCB4W2ldKSkgcmV0dXJuOyAvL0ZJWE1FXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgeC5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwb3A6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG5cbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmICh4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmICghKHggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcG9wIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJyAmJiBhcmcgPCAwKSB7XG4gICAgICAgICAgICAgICAgeC5zcGxpY2UoMCwgMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHgucG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1bGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiTm90IHlldCBpbXBsZW1lbnRlZFwiKTsgICAgLy8gUkVWSUVXXG4gICAgICAgIFxuICAgICAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHJldHVybjtcblxuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIiAmJiAhKGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgIC8vIFhYWCB3b3VsZCBiZSBtdWNoIG5pY2VyIHRvIGNvbXBpbGUgdGhpcyBvbmNlLCByYXRoZXIgdGhhblxuICAgICAgICAgICAgICAgIC8vIGZvciBlYWNoIGRvY3VtZW50IHdlIG1vZGlmeS4uIGJ1dCB1c3VhbGx5IHdlJ3JlIG5vdFxuICAgICAgICAgICAgICAgIC8vIG1vZGlmeWluZyB0aGF0IG1hbnkgZG9jdW1lbnRzLCBzbyB3ZSdsbCBsZXQgaXQgc2xpZGUgZm9yXG4gICAgICAgICAgICAgICAgLy8gbm93XG5cbiAgICAgICAgICAgICAgICAvLyBYWFggX2NvbXBpbGVTZWxlY3RvciBpc24ndCB1cCBmb3IgdGhlIGpvYiwgYmVjYXVzZSB3ZSBuZWVkXG4gICAgICAgICAgICAgICAgLy8gdG8gcGVybWl0IHN0dWZmIGxpa2UgeyRwdWxsOiB7YTogeyRndDogNH19fS4uIHNvbWV0aGluZ1xuICAgICAgICAgICAgICAgIC8vIGxpa2UgeyRndDogNH0gaXMgbm90IG5vcm1hbGx5IGEgY29tcGxldGUgc2VsZWN0b3IuXG4gICAgICAgICAgICAgICAgLy8gc2FtZSBpc3N1ZSBhcyAkZWxlbU1hdGNoIHBvc3NpYmx5P1xuICAgICAgICAgICAgICAgIC8vIHZhciBtYXRjaCA9IFNlbGVjdG9yLl9jb21waWxlU2VsZWN0b3IoYXJnKTsgLy8gRklYTUVcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKHhbaV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCh4W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmICghU2VsZWN0b3IuX2YuX2VxdWFsKHhbaV0sIGFyZykpIHsgICAgLy8gRklYTUVcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdWxsQWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7ICAgIC8vIFJFVklFV1xuICAgICAgICBcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG5cbiAgICAgICAgaWYgKCEodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIiAmJiBhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHlcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhjbHVkZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBhcmcubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgKFNlbGVjdG9yLl9mLl9lcXVhbCh4W2ldLCBhcmdbal0pKSB7IC8vIEZJWE1FXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBleGNsdWRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIWV4Y2x1ZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRyZW5hbWU6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcsIGtleXBhdGgsIGRvYykge1xuICAgICAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGlmIChrZXlwYXRoID09PSBhcmcpIHtcbiAgICAgICAgICAgIC8vIG5vIGlkZWEgd2h5IG1vbmdvIGhhcyB0aGlzIHJlc3RyaWN0aW9uLi5cbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIiRyZW5hbWUgc291cmNlIG11c3QgZGlmZmVyIGZyb20gdGFyZ2V0XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiJHJlbmFtZSBzb3VyY2UgZmllbGQgaW52YWxpZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgYXJnICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCIkcmVuYW1lIHRhcmdldCBtdXN0IGJlIGEgc3RyaW5nXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHYgPSB0YXJnZXRbZmllbGRdO1xuICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICB2YXIga2V5cGFydHMgPSBhcmcuc3BsaXQoJy4nKTtcbiAgICAgICAgdmFyIHRhcmdldDIgPSBDb2xsZWN0aW9uLl9maW5kTW9kVGFyZ2V0KGRvYywga2V5cGFydHMsIGZhbHNlLCB0cnVlKTtcblxuICAgICAgICBpZiAodGFyZ2V0MiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiJHJlbmFtZSB0YXJnZXQgZmllbGQgaW52YWxpZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmaWVsZDIgPSBrZXlwYXJ0cy5wb3AoKTtcbiAgICAgICAgXG4gICAgICAgIHRhcmdldDJbZmllbGQyXSA9IHY7XG4gICAgfSxcblxuICAgICRiaXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgLy8gWFhYIG1vbmdvIG9ubHkgc3VwcG9ydHMgJGJpdCBvbiBpbnRlZ2VycywgYW5kIHdlIG9ubHkgc3VwcG9ydFxuICAgICAgICAvLyBuYXRpdmUgamF2YXNjcmlwdCBudW1iZXJzIChkb3VibGVzKSBzbyBmYXIsIHNvIHdlIGNhbid0IHN1cHBvcnQgJGJpdFxuICAgICAgICBsb2dnZXIudGhyb3coXCIkYml0IGlzIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUgPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSkge1xuICAgIGlmICghXy5pc1N0cmluZyhjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lIG11c3QgYmUgYSBTdHJpbmdcIik7XG4gICAgfVxuXG4gICAgaWYgKCFjb2xsZWN0aW9uTmFtZSB8fCBjb2xsZWN0aW9uTmFtZS5pbmRleE9mKCcuLicpICE9PSAtMSkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIGNhbm5vdCBiZSBlbXB0eVwiKTtcbiAgICB9XG5cbiAgICBpZiAoY29sbGVjdGlvbk5hbWUuaW5kZXhPZignJCcpICE9IC0xICYmIGNvbGxlY3Rpb25OYW1lLm1hdGNoKC8oKF5cXCRjbWQpfChvcGxvZ1xcLlxcJG1haW4pKS8pID09PSBudWxsKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgbXVzdCBub3QgY29udGFpbiAnJCdcIik7XG4gICAgfVxuXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLm1hdGNoKC9eXFwufFxcLiQvKSAhPT0gbnVsbCkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IHN0YXJ0IG9yIGVuZCB3aXRoICcuJ1wiKTtcbiAgICB9XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbmFtZSA9IGZ1bmN0aW9uKG5ld05hbWUpIHtcbiAgICBpZiAoXy5pc1N0cmluZyhuZXdOYW1lKSkge1xuICAgICAgICBpZiAodGhpcy5uYW1lICE9PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUobmV3TmFtZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBkYk5hbWUgPSB0aGlzLm5hbWUuc3BsaXQoJy4nKS5sZW5ndGggPiAxID8gdGhpcy5uYW1lLnNwbGl0KCcuJylbMF0gOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5uYW1lID0gbmV3TmFtZTtcbiAgICAgICAgICAgIHRoaXMuZnVsbE5hbWUgPSBkYk5hbWUgKyAnLicgKyB0aGlzLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRXJyb3JcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb247XG5cbi8qKlxuICogR2V0cyB0aGUgc2l6ZSBvZiBhbiBvYmplY3QuXG4gKiBcbiAqIEBtZXRob2QgT2JqZWN0I3NpemVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBvYmplY3RcbiAqIFxuICogQHJldHVybnMge051bWJlcn0gVGhlIHNpemUgb2YgdGhlIG9iamVjdFxuICovXG5PYmplY3Quc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBzaXplID0gMCwgXG4gICAgICAgIGtleTtcbiAgICBcbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBzaXplKys7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHNpemU7XG59OyJdfQ==
