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
//# sourceMappingURL=data:application/json;base64,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KipcbiAqIEBmaWxlIENvbGxlY3Rpb24uanMgLSBiYXNlZCBvbiBNb25nbG8jQ29sbGVjdGlvbiAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIExvZ2dlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0xvZ2dlclwiKSxcbiAgICBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi91dGlscy9FdmVudEVtaXR0ZXJcIiksXG4gICAgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIiksXG4gICAgQ3Vyc29yID0gcmVxdWlyZShcIi4vQ3Vyc29yXCIpLFxuICAgIE9iamVjdElkID0gcmVxdWlyZSgnLi9PYmplY3RJZCcpO1xuICAgIC8vIFNlbGVjdG9yID0gcmVxdWlyZShcIi4vU2VsZWN0b3JcIik7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcbiAgICBcbi8qKlxuICogQ29sbGVjdGlvblxuICogXG4gKiBAbW9kdWxlIENvbGxlY3Rpb25cbiAqIEBjb25zdHJ1Y3RvclxuICogQHNpbmNlIDAuMC4xXG4gKiBcbiAqIEBjbGFzc2Rlc2MgQ29sbGVjdGlvbiBjbGFzcyB0aGF0IG1hcHMgYSBNb25nb0RCLWxpa2UgY29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0ge01vbmdvUG9ydGFibGV9IGRiIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIERhdGFiYXNlIG9iamVjdFxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMucGtGYWN0b3J5PW51bGxdIC0gT2JqZWN0IG92ZXJyaWRpbmcgdGhlIGJhc2ljIFwiT2JqZWN0SWRcIiBwcmltYXJ5IGtleSBnZW5lcmF0aW9uLlxuICogXG4gKi9cbnZhciBkYXRhYmFzZSA9IG51bGw7XG5jbGFzcyBDb2xsZWN0aW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbi8vIHZhciBDb2xsZWN0aW9uID0gZnVuY3Rpb24oZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKSB7XG4gICAgY29uc3RydWN0b3IoZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQ29sbGVjdGlvbikpIHJldHVybiBuZXcgQ29sbGVjdGlvbihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgIFxuICAgICAgICBpZiAoXy5pc05pbChkYikpIGxvZ2dlci50aHJvdyhcImRiIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGNvbGxlY3Rpb25OYW1lKSkgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbk5hbWUgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwob3B0aW9ucykgfHwgIV8uaXNQbGFpbk9iamVjdChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBcbiAgICAgICAgLy8gdGhpcy5kYiA9IGRiO1xuICAgICAgICBkYXRhYmFzZSA9IGRiO1xuICAgICAgICB0aGlzLm5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICAgICAgdGhpcy5mdWxsTmFtZSA9IGRiLmRhdGFiYXNlTmFtZSArICcuJyArIHRoaXMubmFtZTtcbiAgICAgICAgdGhpcy5kb2NzID0gW107XG4gICAgICAgIHRoaXMuZG9jX2luZGV4ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5zbmFwc2hvdHMgPSBbXTtcbiAgICAgICAgdGhpcy5vcHRzID0ge307IC8vIERlZmF1bHQgb3B0aW9uc1xuICAgICAgICBcbiAgICAgICAgXy5tZXJnZSh0aGlzLm9wdHMsIG9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGhpcy5lbWl0ID0gZGIuZW1pdDtcbiAgICB9XG4gICAgXG4gICAgZW1pdChuYW1lLCBhcmdzLCBjYikge1xuICAgICAgICBzdXBlci5lbWl0KG5hbWUsIGFyZ3MsIGNiLCBkYXRhYmFzZS5fc3RvcmVzKTtcbiAgICB9XG59XG5cbi8vIFRPRE8gZW5mb3JjZSBydWxlIHRoYXQgZmllbGQgbmFtZXMgY2FuJ3Qgc3RhcnQgd2l0aCAnJCcgb3IgY29udGFpbiAnLidcbi8vIChyZWFsIG1vbmdvZGIgZG9lcyBpbiBmYWN0IGVuZm9yY2UgdGhpcylcbi8vIFRPRE8gcG9zc2libHkgZW5mb3JjZSB0aGF0ICd1bmRlZmluZWQnIGRvZXMgbm90IGFwcGVhciAod2UgYXNzdW1lXG4vLyB0aGlzIGluIG91ciBoYW5kbGluZyBvZiBudWxsIGFuZCAkZXhpc3RzKVxuLyoqXG4gKiBJbnNlcnRzIGEgZG9jdW1lbnQgaW50byB0aGUgY29sbGVjdGlvblxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jaW5zZXJ0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBEb2N1bWVudCB0byBiZSBpbnNlcnRlZFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNoYWluPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fENvbGxlY3Rpb259IElmIFwib3B0aW9ucy5jaGFpblwiIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBpbnNlcnRlZCBkb2N1bWVudFxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoZG9jLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGRvYykpIGxvZ2dlci50aHJvdyhcImRvYyBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgXG4gICAgaWYgKCFfLmlzUGxhaW5PYmplY3QoZG9jKSkgbG9nZ2VyLnRocm93KFwiZG9jIG11c3QgYmUgYW4gb2JqZWN0XCIpO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIC8vIENyZWF0aW5nIGEgc2FmZSBjb3B5IG9mIHRoZSBkb2N1bWVudFxuICAgIHZhciBfZG9jID0gXy5jbG9uZURlZXAoZG9jKTtcblxuICAgIC8vIElmIHRoZSBkb2N1bWVudCBjb21lcyB3aXRoIGEgbnVtYmVyIElELCBwYXJzZSBpdCB0byBTdHJpbmdcbiAgICBpZiAoXy5pc051bWJlcihfZG9jLl9pZCkpIHtcbiAgICAgICAgX2RvYy5faWQgPSBfLnRvU3RyaW5nKF9kb2MuX2lkKTtcbiAgICB9XG5cbiAgICBpZiAoXy5pc05pbChfZG9jLl9pZCkgfHwgKCFfZG9jLl9pZCBpbnN0YW5jZW9mIE9iamVjdElkICYmICghXy5pc1N0cmluZyhfZG9jLl9pZCkgfHwgIV9kb2MuX2lkLmxlbmd0aCkpKSB7XG4gICAgICAgIF9kb2MuX2lkID0gbmV3IE9iamVjdElkKCk7XG4gICAgfVxuXG4gICAgLy8gQWRkIG9wdGlvbnMgdG8gbW9yZSBkYXRlc1xuICAgIF9kb2MudGltZXN0YW1wID0gbmV3IE9iamVjdElkKCkuZ2VuZXJhdGlvblRpbWU7XG4gICAgXG4gICAgLy8gUmV2ZXJzZVxuICAgIHRoaXMuZG9jX2luZGV4ZXNbXy50b1N0cmluZyhfZG9jLl9pZCldID0gdGhpcy5kb2NzLmxlbmd0aDtcbiAgICB0aGlzLmRvY3MucHVzaChfZG9jKTtcbiAgICBcbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdpbnNlcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgZG9jOiBfZG9jXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBfZG9jKTtcblxuICAgIGlmIChvcHRpb25zLmNoYWluKSByZXR1cm4gdGhpcztcbiAgICBcbiAgICByZXR1cm4gX2RvYztcbn07XG5cbi8qKlxuICogRmluZHMgYWxsIG1hdGNoaW5nIGRvY3VtZW50c1xuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZFxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5saW1pdF0gLSBNYXggbnVtYmVyIG9mIGRvY3VtZW50cyB0byBkaXNwbGF5XG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuZm9yY2VGZXRjaD1mYWxzZV0gLSBJZiBzZXQgdG8nXCJ0cnVlXCIgcmV0dXJucyd0XCJlO2FycmF5IG9mIGRvY3VtZW50cyBhbHJlYWR5IGZldGNoZWRcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7QXJyYXl8Q3Vyc29yfSBJZiBcIm9wdGlvbnMuZm9yY2VGZXRjaFwiIHNldCB0byB0cnVlIHJldHVybnMgdGhlIGFycmF5IG9mIGRvY3VtZW50cywgb3RoZXJ3aXNlIHJldHVybnMgYSBjdXJzb3JcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBsZXQgcGFyYW1zID0gX2Vuc3VyZUZpbmRQYXJhbXMoe1xuICAgICAgICBzZWxlY3Rpb246IHNlbGVjdGlvbiwgXG4gICAgICAgIGZpZWxkczogZmllbGRzLFxuICAgICAgICBvcHRpb25zOiBvcHRpb25zLCBcbiAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG4gICAgfSk7XG4gICAgXG4gICAgc2VsZWN0aW9uID0gcGFyYW1zLnNlbGVjdGlvbjtcbiAgICBmaWVsZHMgPSBwYXJhbXMuZmllbGRzO1xuICAgIG9wdGlvbnMgPSBwYXJhbXMub3B0aW9ucztcbiAgICBjYWxsYmFjayA9IHBhcmFtcy5jYWxsYmFjaztcbiAgICBcbiAgICAvLyBjYWxsYmFjayBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgIHZhciBjdXJzb3IgPSBuZXcgQ3Vyc29yKHRoaXMuZGIsIHRoaXMsIHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zKTtcblxuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2ZpbmQnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgIGZpZWxkczogZmllbGRzLFxuICAgICAgICAgICAgb3B0aW9uczogb3B0aW9uc1xuICAgICAgICB9XG4gICAgKTtcbiAgICBcbiAgICAvLyBQYXNzIHRoZSBjdXJzb3IgZmV0Y2hlZCB0byB0aGUgY2FsbGJhY2tcbiAgICAvLyBBZGQgW29wdGlvbnMubm9GZXRjaENhbGxiYWNrID0gdHJ1ZV1cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGN1cnNvci5mZXRjaCgpKTtcblxuICAgIGlmIChvcHRpb25zLmZvcmNlRmV0Y2gpIHtcbiAgICAgICAgcmV0dXJuIGN1cnNvci5mZXRjaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjdXJzb3I7XG4gICAgfVxufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgZmlyc3QgbWF0Y2hpbmcgZG9jdW1lbnRcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI2ZpbmRPbmVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbZmllbGRzPXt9XSAtIFRoZSBmaWVsZHMgb2YgdGhlIGRvY3VtZW50IHRvIHNob3dcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnNraXBdIC0gTnVtYmVyIG9mIGRvY3VtZW50cyB0byBiZSBza2lwcGVkXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubGltaXRdIC0gTWF4IG51bWJlciBvZiBkb2N1bWVudHMgdG8gZGlzcGxheVxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbb3B0aW9ucy5maWVsZHNdIC0gU2FtZSBhcyBcImZpZWxkc1wiIHBhcmFtZXRlciAoaWYgYm90aCBwYXNzZWQsIFwib3B0aW9ucy5maWVsZHNcIiB3aWxsIGJlIGlnbm9yZWQpXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgZmlyc3QgbWF0Y2hpbmcgZG9jdW1lbnQgb2YgdGhlIGNvbGxlY3Rpb25cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZmluZE9uZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBsZXQgcGFyYW1zID0gX2Vuc3VyZUZpbmRQYXJhbXMoe1xuICAgICAgICBzZWxlY3Rpb246IHNlbGVjdGlvbiwgXG4gICAgICAgIGZpZWxkczogZmllbGRzLFxuICAgICAgICBvcHRpb25zOiBvcHRpb25zLCBcbiAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG4gICAgfSk7XG4gICAgXG4gICAgc2VsZWN0aW9uID0gcGFyYW1zLnNlbGVjdGlvbjtcbiAgICBmaWVsZHMgPSBwYXJhbXMuZmllbGRzO1xuICAgIG9wdGlvbnMgPSBwYXJhbXMub3B0aW9ucztcbiAgICBjYWxsYmFjayA9IHBhcmFtcy5jYWxsYmFjaztcbiAgICBcbiAgICB2YXIgY3Vyc29yID0gbmV3IEN1cnNvcih0aGlzLmRiLCB0aGlzLCBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucyk7XG5cbiAgICAvLyB0aGlzLmVtaXQoJ2ZpbmQnLCBzZWxlY3RvciwgY3Vyc29yLCBvKTtcblxuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2ZpbmRPbmUnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgIGZpZWxkczogZmllbGRzLFxuICAgICAgICAgICAgb3B0aW9uczogb3B0aW9uc1xuICAgICAgICB9XG4gICAgKTtcbiAgICBcbiAgICB2YXIgcmVzID0gbnVsbDtcbiAgICBcbiAgICBpZiAoY3Vyc29yLmhhc05leHQoKSkge1xuICAgICAgICByZXMgPSBjdXJzb3IubmV4dCgpO1xuICAgIH1cbiAgICBcbiAgICAvLyBQYXNzIHRoZSBjdXJzb3IgZmV0Y2hlZCB0byB0aGUgY2FsbGJhY2tcbiAgICAvLyBBZGQgW29wdGlvbnMubm9GZXRjaENhbGxiYWNrID0gdHJ1ZV1cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlcyk7XG4gICAgXG4gICAgcmV0dXJuIHJlcztcbn07XG5cblxuLyoqXG4gKiBVcGRhdGVzIG9uZSBvciBtYW55IGRvY3VtZW50c1xuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jdXBkYXRlXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdXBkYXRlPXt9XSAtIFRoZSB1cGRhdGUgb3BlcmF0aW9uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy51cGRhdGVBc01vbmdvPXRydWVdIC0gQnkgZGVmYXVsdDogXG4gKiAgICAgIElmIHRoZSBbdXBkYXRlXSBvYmplY3QgY29udGFpbnMgdXBkYXRlIG9wZXJhdG9yIG1vZGlmaWVycywgc3VjaCBhcyB0aG9zZSB1c2luZyB0aGUgXCIkc2V0XCIgbW9kaWZpZXIsIHRoZW46XG4gKiAgICAgICAgICA8dWw+XG4gKiAgICAgICAgICAgICAgPGxpPlRoZSBbdXBkYXRlXSBvYmplY3QgbXVzdCBjb250YWluIG9ubHkgdXBkYXRlIG9wZXJhdG9yIGV4cHJlc3Npb25zPC9saT5cbiAqICAgICAgICAgICAgICA8bGk+VGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCB1cGRhdGVzIG9ubHkgdGhlIGNvcnJlc3BvbmRpbmcgZmllbGRzIGluIHRoZSBkb2N1bWVudDwvbGk+XG4gKiAgICAgICAgICA8dWw+XG4gKiAgICAgIElmIHRoZSBbdXBkYXRlXSBvYmplY3QgY29udGFpbnMgb25seSBcImZpZWxkOiB2YWx1ZVwiIGV4cHJlc3Npb25zLCB0aGVuOlxuICogICAgICAgICAgPHVsPlxuICogICAgICAgICAgICAgIDxsaT5UaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIHJlcGxhY2VzIHRoZSBtYXRjaGluZyBkb2N1bWVudCB3aXRoIHRoZSBbdXBkYXRlXSBvYmplY3QuIFRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgZG9lcyBub3QgcmVwbGFjZSB0aGUgXCJfaWRcIiB2YWx1ZTwvbGk+XG4gKiAgICAgICAgICAgICAgPGxpPkNvbGxlY3Rpb24jdXBkYXRlIGNhbm5vdCB1cGRhdGUgbXVsdGlwbGUgZG9jdW1lbnRzPC9saT5cbiAqICAgICAgICAgIDx1bD5cbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm92ZXJyaWRlPWZhbHNlXSAtIFJlcGxhY2VzIHRoZSB3aG9sZSBkb2N1bWVudCAob25seSBhcGxsaWVzIHdoZW4gW3VwZGF0ZUFzTW9uZ289ZmFsc2VdKVxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnVwc2VydD1mYWxzZV0gLSBDcmVhdGVzIGEgbmV3IGRvY3VtZW50IHdoZW4gbm8gZG9jdW1lbnQgbWF0Y2hlcyB0aGUgcXVlcnkgY3JpdGVyaWFcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5tdWx0aT1mYWxzZV0gLSBVcGRhdGVzIG11bHRpcGxlIGRvY3VtZW50cyB0aGF0IG1lZXQgdGhlIGNyaXRlcmlhXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB0aGUgdXBkYXRlL2luc2VydCAoaWYgdXBzZXJ0PXRydWUpIGluZm9ybWF0aW9uXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIHVwZGF0ZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChzZWxlY3Rpb24pKSBzZWxlY3Rpb24gPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc05pbCh1cGRhdGUpKSBsb2dnZXIudGhyb3coXCJZb3UgbXVzdCBzcGVjaWZ5IHRoZSB1cGRhdGUgb3BlcmF0aW9uXCIpO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBza2lwOiAwLFxuICAgICAgICAgICAgbGltaXQ6IDE1ICAgLy8gZm9yIG5vIGxpbWl0IHBhc3MgW29wdGlvbnMubGltaXQgPSAtMV1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihzZWxlY3Rpb24pKSBsb2dnZXIudGhyb3coXCJZb3UgbXVzdCBzcGVjaWZ5IHRoZSB1cGRhdGUgb3BlcmF0aW9uXCIpO1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24odXBkYXRlKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3Qgc3BlY2lmeSB0aGUgdXBkYXRlIG9wZXJhdGlvblwiKTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgaWYoc2VsZWN0aW9uIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgX2lkOiBzZWxlY3Rpb25cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuXG4gICAgdmFyIHJlcyA9IG51bGw7XG5cbiAgICB2YXIgZG9jcyA9IG51bGw7XG4gICAgaWYgKG9wdGlvbnMubXVsdGkpIHtcbiAgICAgICAgZG9jcyA9IHRoaXMuZmluZChzZWxlY3Rpb24sIG51bGwsIHsgZm9yY2VGZXRjaDogdHJ1ZSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkb2NzID0gdGhpcy5maW5kT25lKHNlbGVjdGlvbik7XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKGRvY3MpKSB7XG4gICAgICAgIGRvY3MgPSBbXTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzQXJyYXkoZG9jcykpIHtcbiAgICAgICAgZG9jcyA9IFtkb2NzXTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGRvY3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGlmIChvcHRpb25zLnVwc2VydCkge1xuICAgICAgICAgICAgdmFyIGluc2VydGVkID0gdGhpcy5pbnNlcnQodXBkYXRlKTtcblxuICAgICAgICAgICAgcmVzID0ge1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBbaW5zZXJ0ZWRdLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBObyBkb2N1bWVudHMgZm91bmRcbiAgICAgICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHVwZGF0ZWREb2NzID0gW107XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvY3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBkb2MgPSBkb2NzW2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgb3ZlcnJpZGUgPSBudWxsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgaGFzTW9kaWZpZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIElFNyBkb2Vzbid0IHN1cHBvcnQgaW5kZXhpbmcgaW50byBzdHJpbmdzIChlZywga2V5WzBdIG9yIGtleS5pbmRleE9mKCckJykgKSwgc28gdXNlIHN1YnN0ci5cbiAgICAgICAgICAgICAgICAvLyBUZXN0aW5nIG92ZXIgdGhlIGZpcnN0IGxldHRlcjpcbiAgICAgICAgICAgICAgICAvLyAgICAgIEJlc3RzIHJlc3VsdCB3aXRoIDFlOCBsb29wcyA9PiBrZXlbMF0ofjNzKSA+IHN1YnN0cih+NXMpID4gcmVnZXhwKH42cykgPiBpbmRleE9mKH4xNnMpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIG1vZGlmaWVyID0gKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJyk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc01vZGlmaWVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMudXBkYXRlQXNNb25nbykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzTW9kaWZpZXIgJiYgIW1vZGlmaWVyKSBsb2dnZXIudGhyb3coXCJBbGwgdXBkYXRlIGZpZWxkcyBtdXN0IGJlIGFuIHVwZGF0ZSBvcGVyYXRvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghaGFzTW9kaWZpZXIgJiYgb3B0aW9ucy5tdWx0aSkgbG9nZ2VyLnRocm93KFwiWW91IGNhbiBub3QgdXBkYXRlIHNldmVyYWwgZG9jdW1lbnRzIHdoZW4gbm8gdXBkYXRlIG9wZXJhdG9ycyBhcmUgaW5jbHVkZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzTW9kaWZpZXIpIG92ZXJyaWRlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc01vZGlmaWVyKSBvdmVycmlkZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcnJpZGUgPSAhIW9wdGlvbnMub3ZlcnJpZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgX2RvY1VwZGF0ZSA9IG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChvdmVycmlkZSkge1xuICAgICAgICAgICAgICAgIC8vIE92ZXJyaWRlcyB0aGUgZG9jdW1lbnQgZXhjZXB0IGZvciB0aGUgXCJfaWRcIlxuICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSB7XG4gICAgICAgICAgICAgICAgICAgIF9pZDogZG9jLl9pZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTXVzdCBpZ25vcmUgZmllbGRzIHN0YXJ0aW5nIHdpdGggJyQnLCAnLicuLi5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcgfHwgL1xcLi9nLnRlc3Qoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYFRoZSBmaWVsZCAke2tleX0gY2FuIG5vdCBiZWdpbiB3aXRoICckJyBvciBjb250YWluICcuJ2ApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2RvY1VwZGF0ZVtrZXldID0gdXBkYXRlW2tleV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSBfLmNsb25lRGVlcChkb2MpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbCA9IHVwZGF0ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2FwcGx5TW9kaWZpZXIoX2RvY1VwZGF0ZSwga2V5LCB2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmlzTmlsKF9kb2NVcGRhdGVba2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ICE9PSAnX2lkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZG9jVXBkYXRlW2tleV0gPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oXCJUaGUgZmllbGQgJ19pZCcgY2FuIG5vdCBiZSB1cGRhdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYFRoZSBkb2N1bWVudCBkb2VzIG5vdCBjb250YWlucyB0aGUgZmllbGQgJHtrZXl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHVwZGF0ZWREb2NzLnB1c2goX2RvY1VwZGF0ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxldCBpZHggPSB0aGlzLmRvY19pbmRleGVzW19kb2NVcGRhdGUuX2lkXTtcbiAgICAgICAgICAgIHRoaXMuZG9jc1tpZHhdID0gX2RvY1VwZGF0ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgJ3VwZGF0ZScsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgIG1vZGlmaWVyOiB1cGRhdGUsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogb3B0aW9ucyxcbiAgICAgICAgICAgICAgICBkb2NzOiB1cGRhdGVkRG9jc1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgcmVzID0ge1xuICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50czogdXBkYXRlZERvY3MsXG4gICAgICAgICAgICAgICAgY291bnQ6IHVwZGF0ZWREb2NzLmxlbmd0aFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICBcbiAgICByZXR1cm4gcmVzO1xufTtcblxudmFyIF9hcHBseU1vZGlmaWVyID0gZnVuY3Rpb24oX2RvY1VwZGF0ZSwga2V5LCB2YWwpIHtcbiAgICB2YXIgbW9kID0gX21vZGlmaWVyc1trZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgaWYgKCFtb2QpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KGBJbnZhbGlkIG1vZGlmaWVyIHNwZWNpZmllZDogJHtrZXl9YCk7XG4gICAgfVxuICAgIFxuICAgIGZvciAodmFyIGtleXBhdGggaW4gdmFsKSB7XG4gICAgICAgIHZhciBhcmcgPSB2YWxba2V5cGF0aF07XG4gICAgICAgIHZhciBrZXlwYXJ0cyA9IGtleXBhdGguc3BsaXQoJy4nKTtcbiAgICAgICAgdmFyIG5vX2NyZWF0ZSA9ICEhQ29sbGVjdGlvbi5fbm9DcmVhdGVNb2RpZmllcnNba2V5XTtcbiAgICAgICAgdmFyIGZvcmJpZF9hcnJheSA9IChrZXkgPT09IFwiJHJlbmFtZVwiKTtcbiAgICAgICAgdmFyIHRhcmdldCA9IENvbGxlY3Rpb24uX2ZpbmRNb2RUYXJnZXQoX2RvY1VwZGF0ZSwga2V5cGFydHMsIG5vX2NyZWF0ZSwgZm9yYmlkX2FycmF5KTtcbiAgICAgICAgdmFyIGZpZWxkID0ga2V5cGFydHMucG9wKCk7XG5cbiAgICAgICAgbW9kKHRhcmdldCwgZmllbGQsIGFyZywga2V5cGF0aCwgX2RvY1VwZGF0ZSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW1vdmVzIG9uZSBvciBtYW55IGRvY3VtZW50c1xuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jcmVtb3ZlXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmp1c3RPbmU9ZmFsc2VdIC0gRGVsZXRlcyB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiB0aGUgc2VsZWN0aW9uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB0aGUgZGVsZXRlZCBkb2N1bWVudHNcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChzZWxlY3Rpb24pKSBzZWxlY3Rpb24gPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHNlbGVjdGlvbikpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBzZWxlY3Rpb247XG4gICAgICAgIHNlbGVjdGlvbiA9IHt9O1xuICAgIH1cbiAgICBcbiAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgaWYoc2VsZWN0aW9uIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgX2lkOiBzZWxlY3Rpb25cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIHZhciBjdXJzb3IgPSB0aGlzLmZpbmQoc2VsZWN0aW9uKTtcbiAgICBcbiAgICB2YXIgZG9jcyA9IFtdO1xuICAgIGN1cnNvci5mb3JFYWNoKGRvYyA9PiB7XG4gICAgICAgIHZhciBpZHggPSB0aGlzLmRvY19pbmRleGVzW2RvYy5faWRdO1xuICAgICAgICBcbiAgICAgICAgZGVsZXRlIHRoaXMuZG9jX2luZGV4ZXNbZG9jLl9pZF07XG4gICAgICAgIHRoaXMuZG9jcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgXG4gICAgICAgIGRvY3MucHVzaChkb2MpO1xuICAgIH0pO1xuICAgIFxuICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3JlbW92ZScsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgZG9jczogZG9jc1xuICAgICAgICB9XG4gICAgKTtcbiAgICBcbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGRvY3MpO1xuICAgIFxuICAgIHJldHVybiBkb2NzO1xufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24ob2JqLCBmbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBjYWxsYmFjayA9IGZuIHx8IGZ1bmN0aW9uKCl7fTtcblxuICAgIGlmIChzZWxmLmRvY3Nbb2JqLl9pZF0pIHtcbiAgICAgICAgc2VsZi51cGRhdGUoe19pZDogb2JqLl9pZH0sIGNhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLmluc2VydChvYmosY2FsbGJhY2spO1xuICAgIH1cbn07XG5cbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZW5zdXJlSW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICAvL1RPRE8gSW1wbGVtZW50IEVuc3VyZUluZGV4XG4gICAgbG9nZ2VyLnRocm93KCdDb2xsZWN0aW9uI2Vuc3VyZUluZGV4IHVuaW1wbGVtZW50ZWQgYnkgZHJpdmVyJyk7XG59O1xuXG4vLyBUT0RPIGRvY3VtZW50IChhdCBzb21lIHBvaW50KVxuLy8gVE9ETyB0ZXN0XG4vLyBUT0RPIG9idmlvdXNseSB0aGlzIHBhcnRpY3VsYXIgaW1wbGVtZW50YXRpb24gd2lsbCBub3QgYmUgdmVyeSBlZmZpY2llbnRcbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuYmFja3VwID0gZnVuY3Rpb24gKGJhY2t1cElELCBmbikge1xuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgYmFja3VwSUQpIHtcbiAgICAgICAgZm4gPSBiYWNrdXBJRDtcbiAgICAgICAgYmFja3VwSUQgPSBuZXcgT2JqZWN0SWQoKTtcbiAgICB9XG5cbiAgICB2YXIgY2FsbGJhY2sgPSBmbnx8ZnVuY3Rpb24oKXt9O1xuICAgIHZhciBzbmFwSUQgPSBiYWNrdXBJRDtcblxuICAgIHRoaXMuc25hcHNob3RzW3NuYXBJRF0gPSB0aGlzLmRvY3M7XG4gICAgdGhpcy5lbWl0KFxuICAgICAgICAnc25hcHNob3QnLFxuICAgICAgICB7XG4gICAgICAgICAgICBfaWQgOiB0aGlzLmRvY3MsXG4gICAgICAgICAgICBkYXRhIDogdGhpcy5kb2NzIFxuICAgICAgICB9XG4gICAgKTtcblxuICAgIGNhbGxiYWNrKG51bGwsIHRoaXMuc25hcHNob3RzW3NuYXBJRF0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBMaXN0cyBhdmFpbGFibGUgQmFja3Vwc1xuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXBzID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIGNhbGxiYWNrID0gZm4gfHwgZnVuY3Rpb24oKXt9O1xuICAgIHZhciBrZXlzID0gW107XG4gICAgdmFyIGJhY2t1cHMgPSB0aGlzLnNuYXBzaG90cztcblxuICAgIGZvciAodmFyIGlkIGluIGJhY2t1cHMpIHtcbiAgICAgICAga2V5cy5wdXNoKHtpZDogaWQsIGRhdGE6IGJhY2t1cHNbaWRdfSk7XG4gICAgfVxuXG4gICAgY2FsbGJhY2soa2V5cyk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8vIExpc3RzIGF2YWlsYWJsZSBCYWNrdXBzXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbW92ZUJhY2t1cCA9IGZ1bmN0aW9uIChiYWNrdXBJRCwgZm4pIHtcbiAgICBpZiAoIWJhY2t1cElEIHx8ICdmdW5jdGlvbicgPT09IHR5cGVvZiBiYWNrdXBJRCkge1xuICAgICAgICBmbiA9IGJhY2t1cElEO1xuICAgICAgICB0aGlzLnNuYXBzaG90cyA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBpZCA9IFN0cmluZyhiYWNrdXBJRCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnNuYXBzaG90c1tpZF07XG4gICAgfVxuXG4gICAgdmFyIGNhbGxiYWNrID0gZm4gfHwgZnVuY3Rpb24oKXt9O1xuXG4gICAgY2FsbGJhY2sobnVsbCk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gUmVzdG9yZSB0aGUgc25hcHNob3QuIElmIG5vIHNuYXBzaG90IGV4aXN0cywgcmFpc2UgYW4gZXhjZXB0aW9uO1xuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZXN0b3JlID0gZnVuY3Rpb24gKCBiYWNrdXBJRCwgZm4gKSB7XG4gICAgdmFyIGNhbGxiYWNrID0gZm4gfHwgZnVuY3Rpb24oKXt9O1xuICAgIHZhciBzbmFwc2hvdENvdW50ID0gT2JqZWN0LnNpemUodGhpcy5zbmFwc2hvdHMpO1xuXG4gICAgaWYgKHNuYXBzaG90Q291bnQ9PT0wKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcIk5vIGN1cnJlbnQgc25hcHNob3RcIik7XG4gICAgfVxuXG4gICAgdmFyIGJhY2t1cERhdGEgPSB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF07XG5cbiAgICBpZiAoIWJhY2t1cERhdGEpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiVW5rbm93biBCYWNrdXAgSUQgXCIrYmFja3VwSUQpO1xuICAgIH1cblxuICAgIHRoaXMuZG9jcyA9IGJhY2t1cERhdGE7XG4gICAgdGhpcy5lbWl0KCdyZXN0b3JlJyk7XG5cbiAgICBjYWxsYmFjayhudWxsKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8gZm9yIGEuYi5jLjIuZC5lLCBrZXlwYXJ0cyBzaG91bGQgYmUgWydhJywgJ2InLCAnYycsICcyJywgJ2QnLCAnZSddLFxuLy8gYW5kIHRoZW4geW91IHdvdWxkIG9wZXJhdGUgb24gdGhlICdlJyBwcm9wZXJ0eSBvZiB0aGUgcmV0dXJuZWRcbi8vIG9iamVjdC4gaWYgbm9fY3JlYXRlIGlzIGZhbHNleSwgY3JlYXRlcyBpbnRlcm1lZGlhdGUgbGV2ZWxzIG9mXG4vLyBzdHJ1Y3R1cmUgYXMgbmVjZXNzYXJ5LCBsaWtlIG1rZGlyIC1wIChhbmQgcmFpc2VzIGFuIGV4Y2VwdGlvbiBpZlxuLy8gdGhhdCB3b3VsZCBtZWFuIGdpdmluZyBhIG5vbi1udW1lcmljIHByb3BlcnR5IHRvIGFuIGFycmF5LikgaWZcbi8vIG5vX2NyZWF0ZSBpcyB0cnVlLCByZXR1cm4gdW5kZWZpbmVkIGluc3RlYWQuIG1heSBtb2RpZnkgdGhlIGxhc3Rcbi8vIGVsZW1lbnQgb2Yga2V5cGFydHMgdG8gc2lnbmFsIHRvIHRoZSBjYWxsZXIgdGhhdCBpdCBuZWVkcyB0byB1c2UgYVxuLy8gZGlmZmVyZW50IHZhbHVlIHRvIGluZGV4IGludG8gdGhlIHJldHVybmVkIG9iamVjdCAoZm9yIGV4YW1wbGUsXG4vLyBbJ2EnLCAnMDEnXSAtPiBbJ2EnLCAxXSkuIGlmIGZvcmJpZF9hcnJheSBpcyB0cnVlLCByZXR1cm4gbnVsbCBpZlxuLy8gdGhlIGtleXBhdGggZ29lcyB0aHJvdWdoIGFuIGFycmF5LlxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLl9maW5kTW9kVGFyZ2V0ID0gZnVuY3Rpb24gKGRvYywga2V5cGFydHMsIG5vX2NyZWF0ZSwgZm9yYmlkX2FycmF5KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbGFzdCA9IChpID09PSBrZXlwYXJ0cy5sZW5ndGggLSAxKTtcbiAgICAgICAgdmFyIGtleXBhcnQgPSBrZXlwYXJ0c1tpXTtcbiAgICAgICAgdmFyIG51bWVyaWMgPSAvXlswLTldKyQvLnRlc3Qoa2V5cGFydCk7XG5cbiAgICAgICAgaWYgKG5vX2NyZWF0ZSAmJiAoISh0eXBlb2YgZG9jID09PSBcIm9iamVjdFwiKSB8fCAhKGtleXBhcnQgaW4gZG9jKSkpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZG9jIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGlmIChmb3JiaWRfYXJyYXkpIHJldHVybiBudWxsO1xuXG4gICAgICAgICAgICBpZiAoIW51bWVyaWMpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJjYW4ndCBhcHBlbmQgdG8gYXJyYXkgdXNpbmcgc3RyaW5nIGZpZWxkIG5hbWUgW1wiICsga2V5cGFydCArIFwiXVwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAga2V5cGFydCA9IF8udG9OdW1iZXIoa2V5cGFydCk7XG5cbiAgICAgICAgICAgIGlmIChsYXN0KSB7XG4gICAgICAgICAgICAgICAgLy8gaGFuZGxlICdhLjAxJ1xuICAgICAgICAgICAgICAgIGtleXBhcnRzW2ldID0ga2V5cGFydDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2hpbGUgKGRvYy5sZW5ndGggPCBrZXlwYXJ0KSB7XG4gICAgICAgICAgICAgICAgZG9jLnB1c2gobnVsbCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghbGFzdCkge1xuICAgICAgICAgICAgICAgIGlmIChkb2MubGVuZ3RoID09PSBrZXlwYXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgIGRvYy5wdXNoKHt9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2Nba2V5cGFydF0gIT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiY2FuJ3QgbW9kaWZ5IGZpZWxkICdcIiArIGtleXBhcnRzW2kgKyAxXSArIFwiJyBvZiBsaXN0IHZhbHVlIFwiICsgSlNPTi5zdHJpbmdpZnkoZG9jW2tleXBhcnRdKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gWFhYIGNoZWNrIHZhbGlkIGZpZWxkbmFtZSAobm8gJCBhdCBzdGFydCwgbm8gLilcbiAgICAgICAgICAgIGlmICghbGFzdCAmJiAhKGtleXBhcnQgaW4gZG9jKSkge1xuICAgICAgICAgICAgICAgIGRvY1trZXlwYXJ0XSA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxhc3QpIHJldHVybiBkb2M7XG5cbiAgICAgICAgZG9jID0gZG9jW2tleXBhcnRdO1xuICAgIH1cblxuICAgIC8vIG5vdHJlYWNoZWRcbn07XG5cbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5fbm9DcmVhdGVNb2RpZmllcnMgPSB7XG4gICAgJHVuc2V0OiB0cnVlLFxuICAgICRwb3A6IHRydWUsXG4gICAgJHJlbmFtZTogdHJ1ZSxcbiAgICAkcHVsbDogdHJ1ZSxcbiAgICAkcHVsbEFsbDogdHJ1ZVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG52YXIgX21vZGlmaWVycyA9IHtcbiAgICAkaW5jOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYXJnICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJNb2RpZmllciAkaW5jIGFsbG93ZWQgZm9yIG51bWJlcnMgb25seVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGFyZ2V0W2ZpZWxkXSAhPT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkaW5jIG1vZGlmaWVyIHRvIG5vbi1udW1iZXJcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gKz0gYXJnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkc2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSBfLmNsb25lRGVlcChhcmcpO1xuICAgIH0sXG5cbiAgICAkdW5zZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKHRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1c2g6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmICh4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBbYXJnXTtcbiAgICAgICAgfSBlbHNlIGlmICghKHggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVzaCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4LnB1c2goXy5jbG9uZURlZXAoYXJnKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1c2hBbGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKCEodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIiAmJiBhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHlcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgICAgfSBlbHNlIGlmICghKHggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVzaEFsbCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHgucHVzaChhcmdbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRhZGRUb1NldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFthcmddO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRhZGRUb1NldCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgaXNFYWNoID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGsgaW4gYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrID09PSBcIiRlYWNoXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzRWFjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IGlzRWFjaCA/IGFyZ1tcIiRlYWNoXCJdIDogW2FyZ107XG4gICAgICAgICAgICBfLmZvckVhY2godmFsdWVzLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgKFNlbGVjdG9yLl9mLl9lcXVhbCh2YWx1ZSwgeFtpXSkpIHJldHVybjsgLy9GSVhNRVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHgucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcG9wOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoISh4IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJHBvcCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicgJiYgYXJnIDwgMCkge1xuICAgICAgICAgICAgICAgIHguc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4LnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7ICAgIC8vIFJFVklFV1xuICAgICAgICBcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG5cbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmICh4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmICghKHggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVsbC9wdWxsQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvdXQgPSBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmcgPT09IFwib2JqZWN0XCIgJiYgIShhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAvLyBYWFggd291bGQgYmUgbXVjaCBuaWNlciB0byBjb21waWxlIHRoaXMgb25jZSwgcmF0aGVyIHRoYW5cbiAgICAgICAgICAgICAgICAvLyBmb3IgZWFjaCBkb2N1bWVudCB3ZSBtb2RpZnkuLiBidXQgdXN1YWxseSB3ZSdyZSBub3RcbiAgICAgICAgICAgICAgICAvLyBtb2RpZnlpbmcgdGhhdCBtYW55IGRvY3VtZW50cywgc28gd2UnbGwgbGV0IGl0IHNsaWRlIGZvclxuICAgICAgICAgICAgICAgIC8vIG5vd1xuXG4gICAgICAgICAgICAgICAgLy8gWFhYIF9jb21waWxlU2VsZWN0b3IgaXNuJ3QgdXAgZm9yIHRoZSBqb2IsIGJlY2F1c2Ugd2UgbmVlZFxuICAgICAgICAgICAgICAgIC8vIHRvIHBlcm1pdCBzdHVmZiBsaWtlIHskcHVsbDoge2E6IHskZ3Q6IDR9fX0uLiBzb21ldGhpbmdcbiAgICAgICAgICAgICAgICAvLyBsaWtlIHskZ3Q6IDR9IGlzIG5vdCBub3JtYWxseSBhIGNvbXBsZXRlIHNlbGVjdG9yLlxuICAgICAgICAgICAgICAgIC8vIHNhbWUgaXNzdWUgYXMgJGVsZW1NYXRjaCBwb3NzaWJseT9cbiAgICAgICAgICAgICAgICAvLyB2YXIgbWF0Y2ggPSBTZWxlY3Rvci5fY29tcGlsZVNlbGVjdG9yKGFyZyk7IC8vIEZJWE1FXG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRjaCh4W2ldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiAoIVNlbGVjdG9yLl9mLl9lcXVhbCh4W2ldLCBhcmcpKSB7ICAgIC8vIEZJWE1FXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBvdXQucHVzaCh4W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG91dDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVsbEFsbDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJOb3QgeWV0IGltcGxlbWVudGVkXCIpOyAgICAvLyBSRVZJRVdcbiAgICAgICAgXG4gICAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXG4gICAgICAgIGlmICghKHR5cGVvZiBhcmcgPT09IFwib2JqZWN0XCIgJiYgYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJNb2RpZmllciAkcHVzaEFsbC9wdWxsQWxsIGFsbG93ZWQgZm9yIGFycmF5cyBvbmx5XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgICAgIGlmICh4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmICghKHggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVsbC9wdWxsQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvdXQgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGV4Y2x1ZGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYXJnLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIChTZWxlY3Rvci5fZi5fZXF1YWwoeFtpXSwgYXJnW2pdKSkgeyAvLyBGSVhNRVxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgZXhjbHVkZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFleGNsdWRlKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG91dDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcmVuYW1lOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnLCBrZXlwYXRoLCBkb2MpIHtcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBpZiAoa2V5cGF0aCA9PT0gYXJnKSB7XG4gICAgICAgICAgICAvLyBubyBpZGVhIHdoeSBtb25nbyBoYXMgdGhpcyByZXN0cmljdGlvbi4uXG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCIkcmVuYW1lIHNvdXJjZSBtdXN0IGRpZmZlciBmcm9tIHRhcmdldFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIiRyZW5hbWUgc291cmNlIGZpZWxkIGludmFsaWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGFyZyAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiJHJlbmFtZSB0YXJnZXQgbXVzdCBiZSBhIHN0cmluZ1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2ID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICAgICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgdmFyIGtleXBhcnRzID0gYXJnLnNwbGl0KCcuJyk7XG4gICAgICAgIHZhciB0YXJnZXQyID0gQ29sbGVjdGlvbi5fZmluZE1vZFRhcmdldChkb2MsIGtleXBhcnRzLCBmYWxzZSwgdHJ1ZSk7XG5cbiAgICAgICAgaWYgKHRhcmdldDIgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIiRyZW5hbWUgdGFyZ2V0IGZpZWxkIGludmFsaWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZmllbGQyID0ga2V5cGFydHMucG9wKCk7XG4gICAgICAgIFxuICAgICAgICB0YXJnZXQyW2ZpZWxkMl0gPSB2O1xuICAgIH0sXG5cbiAgICAkYml0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIC8vIFhYWCBtb25nbyBvbmx5IHN1cHBvcnRzICRiaXQgb24gaW50ZWdlcnMsIGFuZCB3ZSBvbmx5IHN1cHBvcnRcbiAgICAgICAgLy8gbmF0aXZlIGphdmFzY3JpcHQgbnVtYmVycyAoZG91Ymxlcykgc28gZmFyLCBzbyB3ZSBjYW4ndCBzdXBwb3J0ICRiaXRcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiJGJpdCBpcyBub3Qgc3VwcG9ydGVkXCIpO1xuICAgIH1cbn07XG5cbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUpIHtcbiAgICBpZiAoIV8uaXNTdHJpbmcoY29sbGVjdGlvbk5hbWUpKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZSBtdXN0IGJlIGEgU3RyaW5nXCIpO1xuICAgIH1cblxuICAgIGlmICghY29sbGVjdGlvbk5hbWUgfHwgY29sbGVjdGlvbk5hbWUuaW5kZXhPZignLi4nKSAhPT0gLTEpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBjYW5ub3QgYmUgZW1wdHlcIik7XG4gICAgfVxuXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLmluZGV4T2YoJyQnKSAhPSAtMSAmJiBjb2xsZWN0aW9uTmFtZS5tYXRjaCgvKCheXFwkY21kKXwob3Bsb2dcXC5cXCRtYWluKSkvKSA9PT0gbnVsbCkge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IGNvbnRhaW4gJyQnXCIpO1xuICAgIH1cblxuICAgIGlmIChjb2xsZWN0aW9uTmFtZS5tYXRjaCgvXlxcLnxcXC4kLykgIT09IG51bGwpIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBzdGFydCBvciBlbmQgd2l0aCAnLidcIik7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW5hbWUgPSBmdW5jdGlvbihuZXdOYW1lKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcobmV3TmFtZSkpIHtcbiAgICAgICAgaWYgKHRoaXMubmFtZSAhPT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKG5ld05hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgZGJOYW1lID0gdGhpcy5uYW1lLnNwbGl0KCcuJykubGVuZ3RoID4gMSA/IHRoaXMubmFtZS5zcGxpdCgnLicpWzBdIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IG5ld05hbWU7XG4gICAgICAgICAgICB0aGlzLmZ1bGxOYW1lID0gZGJOYW1lICsgJy4nICsgdGhpcy5uYW1lO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEVycm9yXG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xsZWN0aW9uO1xuXG4vKipcbiAqIEdldHMgdGhlIHNpemUgb2YgYW4gb2JqZWN0LlxuICogXG4gKiBAbWV0aG9kIE9iamVjdCNzaXplXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgb2JqZWN0XG4gKiBcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBzaXplIG9mIHRoZSBvYmplY3RcbiAqL1xuT2JqZWN0LnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgc2l6ZSA9IDAsIFxuICAgICAgICBrZXk7XG4gICAgXG4gICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBzaXplO1xufTtcblxudmFyIF9lbnN1cmVGaW5kUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgLy8gc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrXG4gICAgaWYgKF8uaXNOaWwocGFyYW1zLnNlbGVjdGlvbikpIHBhcmFtcy5zZWxlY3Rpb24gPSB7fTtcblxuICAgIGlmIChfLmlzTmlsKHBhcmFtcy5zZWxlY3Rpb24pKSBwYXJhbXMuc2VsZWN0aW9uID0ge307XG5cbiAgICBpZiAoXy5pc05pbChwYXJhbXMuZmllbGRzKSkgcGFyYW1zLmZpZWxkcyA9IFtdO1xuXG4gICAgaWYgKF8uaXNOaWwocGFyYW1zLm9wdGlvbnMpKSB7XG4gICAgICAgIHBhcmFtcy5vcHRpb25zID0ge1xuICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgIGxpbWl0OiAxNSAvLyBmb3Igbm8gbGltaXQgcGFzcyBbb3B0aW9ucy5saW1pdCA9IC0xXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIGNhbGxiYWNrIGFzIGZpcnN0IHBhcmFtZXRlclxuICAgIGlmIChfLmlzRnVuY3Rpb24ocGFyYW1zLnNlbGVjdGlvbikpIHtcbiAgICAgICAgcGFyYW1zLmNhbGxiYWNrID0gcGFyYW1zLnNlbGVjdGlvbjtcbiAgICAgICAgcGFyYW1zLnNlbGVjdGlvbiA9IHt9O1xuICAgIH1cblxuICAgIC8vIGNhbGxiYWNrIGFzIHNlY29uZCBwYXJhbWV0ZXJcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5maWVsZHMpKSB7XG4gICAgICAgIHBhcmFtcy5jYWxsYmFjayA9IHBhcmFtcy5maWVsZHM7XG4gICAgICAgIHBhcmFtcy5maWVsZHMgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBjYWxsYmFjayBhcyB0aGlyZCBwYXJhbWV0ZXJcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5vcHRpb25zKSkge1xuICAgICAgICBwYXJhbXMuY2FsbGJhY2sgPSBwYXJhbXMub3B0aW9ucztcbiAgICAgICAgcGFyYW1zLm9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgaWYgKHBhcmFtcy5zZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBwYXJhbXMuc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgX2lkOiBwYXJhbXMuc2VsZWN0aW9uXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzTmlsKHBhcmFtcy5jYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihwYXJhbXMuY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICB9XG5cbiAgICBpZiAocGFyYW1zLm9wdGlvbnMuZmllbGRzKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHBhcmFtcy5maWVsZHMpIHx8IHBhcmFtcy5maWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBwYXJhbXMuZmllbGRzID0gcGFyYW1zLm9wdGlvbnMuZmllbGRzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oXCJGaWVsZHMgYWxyZWFkeSBwcmVzZW50LiBJZ25vcmluZyAnb3B0aW9ucy5maWVsZHMnLlwiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gcGFyYW1zO1xufTsiXX0=
