"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/**
 * @file Collection.js - based on Monglo#Collection ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 0.0.1
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var Logger = require("./utils/Logger"),
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
var Collection = function Collection(db, collectionName, options) {
    if (!(this instanceof Collection)) return new Collection(db, collectionName, options);

    if (_.isNil(db)) throw new Error("db parameter required");

    if (_.isNil(collectionName)) throw new Error("collectionName parameter required");

    if (_.isNil(options) || !_.isPlainObject(options)) options = {};

    Collection.checkCollectionName(collectionName);

    this.db = db;
    this.name = collectionName;
    this.fullName = this.db.databaseName + '.' + this.name;
    this.docs = [];
    this.doc_indexes = {};
    this.snapshots = [];
    this.opts = {}; // Default options

    _.merge(this.opts, options);
};

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

    this.db._emit('insert', {
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

    this.db._emit('find', {
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

    this.db._emit('findOne', {
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

        this.db._emit('update', {
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
    var _this = this;

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
        var idx = _this.doc_indexes[doc._id];

        delete _this.doc_indexes[doc._id];
        _this.docs.splice(idx, 1);

        docs.push(doc);
    });

    this.db._emit('remove', {
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

            this.name = newName;
            this.fullName = this.db.databaseName + '.' + this.name;

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
//# sourceMappingURL=data:application/json;base64,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SSxFQUFFLFFBQUYsQ0FBVyxPQUFYLENBQUosRUFBeUI7QUFDckIsWUFBSSxLQUFLLElBQUwsS0FBYyxPQUFsQixFQUEyQjtBQUN2Qix1QkFBVyxtQkFBWCxDQUErQixPQUEvQjs7QUFFQSxpQkFBSyxJQUFMLEdBQVksT0FBWjtBQUNBLGlCQUFLLFFBQUwsR0FBZ0IsS0FBSyxFQUFMLENBQVEsWUFBUixHQUF1QixHQUF2QixHQUE2QixLQUFLLElBQWxEOztBQUVBLG1CQUFPLElBQVA7QUFDSDtBQUNKLEtBVEQsTUFTTzs7QUFFTjtBQUNKLENBYkQ7O0FBZUEsT0FBTyxPQUFQLEdBQWlCLFVBQWpCOzs7Ozs7Ozs7OztBQVdBLE9BQU8sSUFBUCxHQUFjLFVBQVMsR0FBVCxFQUFjO0FBQ3hCLFFBQUksT0FBTyxDQUFYO1FBQ0ksR0FESjs7QUFHQSxTQUFLLEdBQUwsSUFBWSxHQUFaLEVBQWlCO0FBQ2IsWUFBSSxJQUFJLGNBQUosQ0FBbUIsR0FBbkIsQ0FBSixFQUE2QjtBQUN6QjtBQUNIO0FBQ0o7O0FBRUQsV0FBTyxJQUFQO0FBQ0gsQ0FYRCIsImZpbGUiOiJDb2xsZWN0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBDb2xsZWN0aW9uLmpzIC0gYmFzZWQgb24gTW9uZ2xvI0NvbGxlY3Rpb24gKHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vTW9uZ2xvfSkgYnkgQ2hyaXN0aWFuIFN1bGxpdmFuIDxjc0BldWZvcmljLmNvPiB8IENvcHlyaWdodCAoYykgMjAxMlxuICogQHZlcnNpb24gMC4wLjFcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVkdWFyZG8uYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlZFxuICovXG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKFwiLi91dGlscy9Mb2dnZXJcIiksXG4gICAgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIiksXG4gICAgQ3Vyc29yID0gcmVxdWlyZShcIi4vQ3Vyc29yXCIpLFxuICAgIE9iamVjdElkID0gcmVxdWlyZSgnLi9PYmplY3RJZCcpLFxuICAgIFNlbGVjdG9yID0gcmVxdWlyZShcIi4vU2VsZWN0b3JcIik7XG4gICAgXG4vKipcbiAqIENvbGxlY3Rpb25cbiAqIFxuICogQG1vZHVsZSBDb2xsZWN0aW9uXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzaW5jZSAwLjAuMVxuICogXG4gKiBAY2xhc3NkZXNjIENvbGxlY3Rpb24gY2xhc3MgdGhhdCBtYXBzIGEgTW9uZ29EQi1saWtlIGNvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBEYXRhYmFzZSBvYmplY3RcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLnBrRmFjdG9yeT1udWxsXSAtIE9iamVjdCBvdmVycmlkaW5nIHRoZSBiYXNpYyBcIk9iamVjdElkXCIgcHJpbWFyeSBrZXkgZ2VuZXJhdGlvbi5cbiAqIFxuICovXG52YXIgQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDb2xsZWN0aW9uKSkgcmV0dXJuIG5ldyBDb2xsZWN0aW9uKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBpZiAoXy5pc05pbChkYikpIHRocm93IG5ldyBFcnJvcihcImRiIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChjb2xsZWN0aW9uTmFtZSkpIHRocm93IG5ldyBFcnJvcihcImNvbGxlY3Rpb25OYW1lIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSB8fCAhXy5pc1BsYWluT2JqZWN0KG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgXG4gICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKGNvbGxlY3Rpb25OYW1lKTtcblxuICAgIHRoaXMuZGIgPSBkYjtcbiAgICB0aGlzLm5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICB0aGlzLmZ1bGxOYW1lID0gdGhpcy5kYi5kYXRhYmFzZU5hbWUgKyAnLicgKyB0aGlzLm5hbWU7XG4gICAgdGhpcy5kb2NzID0gW107XG4gICAgdGhpcy5kb2NfaW5kZXhlcyA9IHt9O1xuICAgIHRoaXMuc25hcHNob3RzID0gW107XG4gICAgdGhpcy5vcHRzID0ge307IC8vIERlZmF1bHQgb3B0aW9uc1xuICAgIFxuICAgIF8ubWVyZ2UodGhpcy5vcHRzLCBvcHRpb25zKTtcbn07XG5cbi8vIFRPRE8gZW5mb3JjZSBydWxlIHRoYXQgZmllbGQgbmFtZXMgY2FuJ3Qgc3RhcnQgd2l0aCAnJCcgb3IgY29udGFpbiAnLidcbi8vIChyZWFsIG1vbmdvZGIgZG9lcyBpbiBmYWN0IGVuZm9yY2UgdGhpcylcbi8vIFRPRE8gcG9zc2libHkgZW5mb3JjZSB0aGF0ICd1bmRlZmluZWQnIGRvZXMgbm90IGFwcGVhciAod2UgYXNzdW1lXG4vLyB0aGlzIGluIG91ciBoYW5kbGluZyBvZiBudWxsIGFuZCAkZXhpc3RzKVxuLyoqXG4gKiBJbnNlcnRzIGEgZG9jdW1lbnQgaW50byB0aGUgY29sbGVjdGlvblxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jaW5zZXJ0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBEb2N1bWVudCB0byBiZSBpbnNlcnRlZFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNoYWluPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fENvbGxlY3Rpb259IElmIFwib3B0aW9ucy5jaGFpblwiIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBpbnNlcnRlZCBkb2N1bWVudFxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoZG9jLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGRvYykpIHRocm93IG5ldyBFcnJvcihcImRvYyBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgXG4gICAgaWYgKCFfLmlzUGxhaW5PYmplY3QoZG9jKSkgdGhyb3cgbmV3IEVycm9yKFwiZG9jIG11c3QgYmUgYW4gb2JqZWN0XCIpO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgdGhyb3cgbmV3IEVycm9yKFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgIC8vIENyZWF0aW5nIGEgc2FmZSBjb3B5IG9mIHRoZSBkb2N1bWVudFxuICAgIHZhciBfZG9jID0gXy5jbG9uZURlZXAoZG9jKTtcblxuICAgIC8vIElmIHRoZSBkb2N1bWVudCBjb21lcyB3aXRoIGEgbnVtYmVyIElELCBwYXJzZSBpdCB0byBTdHJpbmdcbiAgICBpZiAoXy5pc051bWJlcihfZG9jLl9pZCkpIHtcbiAgICAgICAgX2RvYy5faWQgPSBfLnRvU3RyaW5nKF9kb2MuX2lkKTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgZXZlcnkgbm9uLW51bWJlciBjaGFyYWN0ZXJcbiAgICBfZG9jLl9pZCA9IChfZG9jLl9pZCB8fCAnJykucmVwbGFjZSgvXFxEL2csICcnKTtcblxuICAgIGlmIChfLmlzTmlsKF9kb2MuX2lkKSB8fCAhX2RvYy5faWQubGVuZ3RoKSB7XG4gICAgICAgIF9kb2MuX2lkID0gbmV3IE9iamVjdElkKCk7XG4gICAgfVxuXG4gICAgLy8gQWRkIG9wdGlvbnMgdG8gbW9yZSBkYXRlc1xuICAgIF9kb2MudGltZXN0YW1wID0gbmV3IE9iamVjdElkKCkuZ2VuZXJhdGlvblRpbWU7XG4gICAgXG4gICAgLy8gUmV2ZXJzZVxuICAgIHRoaXMuZG9jX2luZGV4ZXNbXy50b1N0cmluZyhfZG9jLl9pZCldID0gdGhpcy5kb2NzLmxlbmd0aDtcbiAgICB0aGlzLmRvY3MucHVzaChfZG9jKTtcbiAgICBcbiAgICB0aGlzLmRiLl9lbWl0KFxuICAgICAgICAnaW5zZXJ0JyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIGRvYzogX2RvY1xuICAgICAgICB9XG4gICAgKTtcblxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgX2RvYyk7XG5cbiAgICBpZiAob3B0aW9ucy5jaGFpbikgcmV0dXJuIHRoaXM7XG4gICAgXG4gICAgcmV0dXJuIF9kb2M7XG59O1xuXG4vKipcbiAqIEZpbmRzIGFsbCBtYXRjaGluZyBkb2N1bWVudHNcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI2ZpbmRcbiAqIFxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbZmllbGRzPXt9XSAtIFRoZSBmaWVsZHMgb2YgdGhlIGRvY3VtZW50IHRvIHNob3dcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnNraXBdIC0gTnVtYmVyIG9mIGRvY3VtZW50cyB0byBiZSBza2lwcGVkXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubGltaXRdIC0gTWF4IG51bWJlciBvZiBkb2N1bWVudHMgdG8gZGlzcGxheVxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbb3B0aW9ucy5maWVsZHNdIC0gU2FtZSBhcyBcImZpZWxkc1wiIHBhcmFtZXRlciAoaWYgYm90aCBwYXNzZWQsIFwib3B0aW9ucy5maWVsZHNcIiB3aWxsIGJlIGlnbm9yZWQpXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNoYWluPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5mb3JjZUZldGNoPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMgYWxyZWFkeSBmZXRjaGVkXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge0FycmF5fENvbGxlY3Rpb258Q3Vyc29yfSBJZiBcIm9wdGlvbnMuY2hhaW5cIiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBpZiBcIm9wdGlvbnMuZm9yY2VGZXRjaFwiIHNldCB0byB0cnVlIHJldHVybnMgdGhlIGFycmF5IG9mIGRvY3VtZW50cywgb3RoZXJ3aXNlIHJldHVybnMgYSBjdXJzb3JcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChzZWxlY3Rpb24pKSBzZWxlY3Rpb24gPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChmaWVsZHMpKSBmaWVsZHMgPSBbXTtcbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkge1xuICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgIGxpbWl0OiAxNSAgIC8vIGZvciBubyBsaW1pdCBwYXNzIFtvcHRpb25zLmxpbWl0ID0gLTFdXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oZmllbGRzKSkge1xuICAgICAgICBjYWxsYmFjayA9IGZpZWxkcztcbiAgICAgICAgZmllbGRzID0gW107XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSB0aHJvdyBuZXcgRXJyb3IoXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgLy8gQ29tcGlsZSBzZWxlY3Rpb24gYW5kIGZpZWxkc1xuICAgIHZhciBzZWxlY3Rpb25Db21waWxlZCA9IFNlbGVjdG9yLl9jb21waWxlU2VsZWN0b3Ioc2VsZWN0aW9uKTtcbiAgICB2YXIgZmllbGRzQ29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZUZpZWxkcyhmaWVsZHMpOyAgIC8vIFRPRE9cblxuICAgIGlmIChvcHRpb25zLmZpZWxkcykge1xuICAgICAgICAvLyBBZGQgd2FybmluZyBpZiBmaWVsZHMgYWxyZWFkeSBwYXNzZWRcbiAgICAgICAgZmllbGRzQ29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZUZpZWxkcyhvcHRpb25zLmZpZWxkcyk7XG4gICAgfVxuXG4gICAgLy8gY2FsbGJhY2sgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICB2YXIgY3Vyc29yID0gbmV3IEN1cnNvcih0aGlzLmRiLCB0aGlzLCBzZWxlY3Rpb25Db21waWxlZCwgZmllbGRzQ29tcGlsZWQsIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5kYi5fZW1pdChcbiAgICAgICAgJ2ZpbmQnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbkNvbXBpbGVkLFxuICAgICAgICAgICAgZmllbGRzOiBmaWVsZHNDb21waWxlZCxcbiAgICAgICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgLy8gUGFzcyB0aGUgY3Vyc29yIGZldGNoZWQgdG8gdGhlIGNhbGxiYWNrXG4gICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBjdXJzb3IuZmV0Y2goKSk7XG5cbiAgICBpZiAob3B0aW9ucy5jaGFpbikge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuZm9yY2VGZXRjaCkge1xuICAgICAgICByZXR1cm4gY3Vyc29yLmZldGNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGN1cnNvcjtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudFxuICogXG4gKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZE9uZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5saW1pdF0gLSBNYXggbnVtYmVyIG9mIGRvY3VtZW50cyB0byBkaXNwbGF5XG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudCBvZiB0aGUgY29sbGVjdGlvblxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5maW5kT25lID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzTmlsKGZpZWxkcykpIGZpZWxkcyA9IFtdO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBza2lwOiAwLFxuICAgICAgICAgICAgbGltaXQ6IDE1ICAgLy8gZm9yIG5vIGxpbWl0IHBhc3MgW29wdGlvbnMubGltaXQgPSAtMV0gLT4gbWFuYWdlIHdpdGggY3Vyc29yXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oZmllbGRzKSkge1xuICAgICAgICBjYWxsYmFjayA9IGZpZWxkcztcbiAgICAgICAgZmllbGRzID0gW107XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSB0aHJvdyBuZXcgRXJyb3IoXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgLy8gQ29tcGlsZSBzZWxlY3Rpb24gYW5kIGZpZWxkc1xuICAgIHZhciBzZWxlY3Rpb25Db21waWxlZCA9IFNlbGVjdG9yLl9jb21waWxlU2VsZWN0b3Ioc2VsZWN0aW9uKTtcbiAgICB2YXIgZmllbGRzQ29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZUZpZWxkcyhmaWVsZHMpOyAgIC8vIFRPRE9cblxuICAgIGlmIChvcHRpb25zLmZpZWxkcykge1xuICAgICAgICAvLyBBZGQgd2FybmluZyBpZiBmaWVsZHMgYWxyZWFkeSBwYXNzZWRcbiAgICAgICAgZmllbGRzQ29tcGlsZWQgPSBTZWxlY3Rvci5fY29tcGlsZUZpZWxkcyhvcHRpb25zLmZpZWxkcyk7XG4gICAgfVxuXG4gICAgdmFyIGN1cnNvciA9IG5ldyBDdXJzb3IodGhpcy5kYiwgdGhpcywgc2VsZWN0aW9uQ29tcGlsZWQsIGZpZWxkc0NvbXBpbGVkLCBvcHRpb25zKTtcblxuICAgIC8vIHRoaXMuZW1pdCgnZmluZCcsIHNlbGVjdG9yLCBjdXJzb3IsIG8pO1xuXG4gICAgdGhpcy5kYi5fZW1pdChcbiAgICAgICAgJ2ZpbmRPbmUnLFxuICAgICAgICB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbkNvbXBpbGVkLFxuICAgICAgICAgICAgZmllbGRzOiBmaWVsZHNDb21waWxlZCxcbiAgICAgICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgdmFyIHJlcyA9IG51bGw7XG4gICAgXG4gICAgaWYgKGN1cnNvci5oYXNOZXh0KCkpIHtcbiAgICAgICAgcmVzID0gY3Vyc29yLm5leHQoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gUGFzcyB0aGUgY3Vyc29yIGZldGNoZWQgdG8gdGhlIGNhbGxiYWNrXG4gICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgIFxuICAgIHJldHVybiByZXM7XG59O1xuXG5cbi8qKlxuICogVXBkYXRlcyBvbmUgb3IgbWFueSBkb2N1bWVudHNcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI3VwZGF0ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdH0gW3VwZGF0ZT17fV0gLSBUaGUgdXBkYXRlIG9wZXJhdGlvblxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudXBkYXRlQXNNb25nbz10cnVlXSAtIEJ5IGRlZmF1bHQ6IFxuICogICAgICBJZiB0aGUgW3VwZGF0ZV0gb2JqZWN0IGNvbnRhaW5zIHVwZGF0ZSBvcGVyYXRvciBtb2RpZmllcnMsIHN1Y2ggYXMgdGhvc2UgdXNpbmcgdGhlIFwiJHNldFwiIG1vZGlmaWVyLCB0aGVuOlxuICogICAgICAgICAgPHVsPlxuICogICAgICAgICAgICAgIDxsaT5UaGUgW3VwZGF0ZV0gb2JqZWN0IG11c3QgY29udGFpbiBvbmx5IHVwZGF0ZSBvcGVyYXRvciBleHByZXNzaW9uczwvbGk+XG4gKiAgICAgICAgICAgICAgPGxpPlRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgdXBkYXRlcyBvbmx5IHRoZSBjb3JyZXNwb25kaW5nIGZpZWxkcyBpbiB0aGUgZG9jdW1lbnQ8L2xpPlxuICogICAgICAgICAgPHVsPlxuICogICAgICBJZiB0aGUgW3VwZGF0ZV0gb2JqZWN0IGNvbnRhaW5zIG9ubHkgXCJmaWVsZDogdmFsdWVcIiBleHByZXNzaW9ucywgdGhlbjpcbiAqICAgICAgICAgIDx1bD5cbiAqICAgICAgICAgICAgICA8bGk+VGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCByZXBsYWNlcyB0aGUgbWF0Y2hpbmcgZG9jdW1lbnQgd2l0aCB0aGUgW3VwZGF0ZV0gb2JqZWN0LiBUaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIGRvZXMgbm90IHJlcGxhY2UgdGhlIFwiX2lkXCIgdmFsdWU8L2xpPlxuICogICAgICAgICAgICAgIDxsaT5Db2xsZWN0aW9uI3VwZGF0ZSBjYW5ub3QgdXBkYXRlIG11bHRpcGxlIGRvY3VtZW50czwvbGk+XG4gKiAgICAgICAgICA8dWw+XG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5vdmVycmlkZT1mYWxzZV0gLSBSZXBsYWNlcyB0aGUgd2hvbGUgZG9jdW1lbnQgKG9ubHkgYXBsbGllcyB3aGVuIFt1cGRhdGVBc01vbmdvPWZhbHNlXSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy51cHNlcnQ9ZmFsc2VdIC0gQ3JlYXRlcyBhIG5ldyBkb2N1bWVudCB3aGVuIG5vIGRvY3VtZW50IG1hdGNoZXMgdGhlIHF1ZXJ5IGNyaXRlcmlhXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubXVsdGk9ZmFsc2VdIC0gVXBkYXRlcyBtdWx0aXBsZSBkb2N1bWVudHMgdGhhdCBtZWV0IHRoZSBjcml0ZXJpYVxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggdGhlIHVwZGF0ZS9pbnNlcnQgKGlmIHVwc2VydD10cnVlKSBpbmZvcm1hdGlvblxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCB1cGRhdGUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoc2VsZWN0aW9uKSkgc2VsZWN0aW9uID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNOaWwodXBkYXRlKSkgdXBkYXRlID0gW107XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIHtcbiAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHNraXA6IDAsXG4gICAgICAgICAgICBsaW1pdDogMTUgICAvLyBmb3Igbm8gbGltaXQgcGFzcyBbb3B0aW9ucy5saW1pdCA9IC0xXVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHNlbGVjdGlvbikpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBzZWxlY3Rpb247XG4gICAgICAgIHNlbGVjdGlvbiA9IHt9O1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHVwZGF0ZSkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSB1cGRhdGU7XG4gICAgICAgIHVwZGF0ZSA9IFtdO1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBcbiAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgaWYoc2VsZWN0aW9uIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgX2lkOiBzZWxlY3Rpb25cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgdGhyb3cgbmV3IEVycm9yKFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuXG4gICAgdmFyIHJlcyA9IG51bGw7XG5cbiAgICB2YXIgZG9jcyA9IG51bGw7XG4gICAgaWYgKG9wdGlvbnMubXVsdGkpIHtcbiAgICAgICAgZG9jcyA9IHRoaXMuZmluZChzZWxlY3Rpb24sIG51bGwsIHsgZm9yY2VGZXRjaDogdHJ1ZSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkb2NzID0gdGhpcy5maW5kT25lKHNlbGVjdGlvbik7XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKGRvY3MpKSB7XG4gICAgICAgIGRvY3MgPSBbXTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFfLmlzQXJyYXkoZG9jcykpIHtcbiAgICAgICAgZG9jcyA9IFtkb2NzXTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGRvY3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGlmIChvcHRpb25zLnVwc2VydCkge1xuICAgICAgICAgICAgdmFyIGluc2VydGVkID0gdGhpcy5pbnNlcnQodXBkYXRlKTtcblxuICAgICAgICAgICAgcmVzID0ge1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBpbnNlcnRlZCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDFcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gZG9jdW1lbnRzIGZvdW5kXG4gICAgICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB1cGRhdGVkRG9jcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb2NzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZG9jID0gZG9jc1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG92ZXJyaWRlID0gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGhhc01vZGlmaWVyID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJRTcgZG9lc24ndCBzdXBwb3J0IGluZGV4aW5nIGludG8gc3RyaW5ncyAoZWcsIGtleVswXSBvciBrZXkuaW5kZXhPZignJCcpICksIHNvIHVzZSBzdWJzdHIuXG4gICAgICAgICAgICAgICAgLy8gVGVzdGluZyBvdmVyIHRoZSBmaXJzdCBsZXR0ZXI6XG4gICAgICAgICAgICAgICAgLy8gICAgICBCZXN0cyByZXN1bHQgd2l0aCAxZTggbG9vcHMgPT4ga2V5WzBdKH4zcykgPiBzdWJzdHIofjVzKSA+IHJlZ2V4cCh+NnMpID4gaW5kZXhPZih+MTZzKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBtb2RpZmllciA9IChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpO1xuICAgICAgICAgICAgICAgIGlmIChtb2RpZmllcikge1xuICAgICAgICAgICAgICAgICAgICBoYXNNb2RpZmllciA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnVwZGF0ZUFzTW9uZ28pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc01vZGlmaWVyICYmICFtb2RpZmllcikgdGhyb3cgbmV3IEVycm9yKFwiQWxsIHVwZGF0ZSBmaWVsZHMgbXVzdCBiZSBhbiB1cGRhdGUgb3BlcmF0b3JcIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc01vZGlmaWVyICYmIG9wdGlvbnMubXVsdGkpIHRocm93IG5ldyBFcnJvcihcIllvdSBjYW4gbm90IHVwZGF0ZSBzZXZlcmFsIGRvY3VtZW50cyB3aGVuIG5vIHVwZGF0ZSBvcGVyYXRvcnMgYXJlIGluY2x1ZGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc01vZGlmaWVyKSBvdmVycmlkZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNNb2RpZmllcikgb3ZlcnJpZGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJyaWRlID0gISFvcHRpb25zLm92ZXJyaWRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIF9kb2NVcGRhdGUgPSBudWxsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPdmVycmlkZSB0aGUgZG9jdW1lbnQgZXhjZXB0IGZvciB0aGUgXCJfaWRcIlxuICAgICAgICAgICAgaWYgKG92ZXJyaWRlKSB7XG4gICAgICAgICAgICAgICAgLy8gTXVzdCBpZ25vcmUgZmllbGRzIHN0YXJ0aW5nIHdpdGggJyQnLCAnLicuLi5cbiAgICAgICAgICAgICAgICBfZG9jVXBkYXRlID0gXy5jbG9uZURlZXAodXBkYXRlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcgfHwgL1xcLi9nLnRlc3Qoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgTG9nZ2VyLndhcm4oYFRoZSBmaWVsZCAke2tleX0gY2FuIG5vdCBiZWdpbiB3aXRoICckJyBvciBjb250YWluICcuJ2ApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIF9kb2NVcGRhdGVba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBEbyBub3Qgb3ZlcnJpZGUgdGhlIFwiX2lkXCJcbiAgICAgICAgICAgICAgICBfZG9jVXBkYXRlLl9pZCA9IGRvYy5faWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSBfLmNsb25lRGVlcChkb2MpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbCA9IHVwZGF0ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2FwcGx5TW9kaWZpZXIoX2RvY1VwZGF0ZSwga2V5LCB2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmlzTmlsKF9kb2NVcGRhdGVba2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ICE9PSAnX2lkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZG9jVXBkYXRlW2tleV0gPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTG9nZ2VyLndhcm4oXCJUaGUgZmllbGQgJ19pZCcgY2FuIG5vdCBiZSB1cGRhdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTG9nZ2VyLndhcm4oYFRoZSBkb2N1bWVudCBkb2VzIG5vdCBjb250YWlucyB0aGUgZmllbGQgJHtrZXl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHVwZGF0ZWREb2NzLnB1c2goX2RvY1VwZGF0ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxldCBpZHggPSB0aGlzLmRvY19pbmRleGVzW19kb2NVcGRhdGUuX2lkXTtcbiAgICAgICAgICAgIHRoaXMuZG9jc1tpZHhdID0gX2RvY1VwZGF0ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5kYi5fZW1pdChcbiAgICAgICAgICAgICd1cGRhdGUnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICBtb2RpZmllcjogdXBkYXRlLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IG9wdGlvbnMsXG4gICAgICAgICAgICAgICAgZG9jczogdXBkYXRlZERvY3NcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgIHVwZGF0ZWQ6IHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudHM6IHVwZGF0ZWREb2NzLFxuICAgICAgICAgICAgICAgIGNvdW50OiB1cGRhdGVkRG9jcy5sZW5ndGhcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBcbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlcyk7XG4gICAgXG4gICAgcmV0dXJuIHJlcztcbn07XG5cbnZhciBfYXBwbHlNb2RpZmllciA9IGZ1bmN0aW9uKF9kb2NVcGRhdGUsIGtleSwgdmFsKSB7XG4gICAgdmFyIG1vZCA9IF9tb2RpZmllcnNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGlmICghbW9kKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBtb2RpZmllciBzcGVjaWZpZWQ6ICR7a2V5fWApO1xuICAgIH1cbiAgICBcbiAgICBmb3IgKHZhciBrZXlwYXRoIGluIHZhbCkge1xuICAgICAgICB2YXIgYXJnID0gdmFsW2tleXBhdGhdO1xuICAgICAgICB2YXIga2V5cGFydHMgPSBrZXlwYXRoLnNwbGl0KCcuJyk7XG4gICAgICAgIHZhciBub19jcmVhdGUgPSAhIUNvbGxlY3Rpb24uX25vQ3JlYXRlTW9kaWZpZXJzW2tleV07XG4gICAgICAgIHZhciBmb3JiaWRfYXJyYXkgPSAoa2V5ID09PSBcIiRyZW5hbWVcIik7XG4gICAgICAgIHZhciB0YXJnZXQgPSBDb2xsZWN0aW9uLl9maW5kTW9kVGFyZ2V0KF9kb2NVcGRhdGUsIGtleXBhcnRzLCBub19jcmVhdGUsIGZvcmJpZF9hcnJheSk7XG4gICAgICAgIHZhciBmaWVsZCA9IGtleXBhcnRzLnBvcCgpO1xuXG4gICAgICAgIG1vZCh0YXJnZXQsIGZpZWxkLCBhcmcsIGtleXBhdGgsIF9kb2NVcGRhdGUpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBvbmUgb3IgbWFueSBkb2N1bWVudHNcbiAqIFxuICogQG1ldGhvZCBDb2xsZWN0aW9uI3JlbW92ZVxuICogXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5qdXN0T25lPWZhbHNlXSAtIERlbGV0ZXMgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgdGhlIHNlbGVjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggdGhlIGRlbGV0ZWQgZG9jdW1lbnRzXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoc2VsZWN0aW9uKSkgc2VsZWN0aW9uID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihzZWxlY3Rpb24pKSB7XG4gICAgICAgIGNhbGxiYWNrID0gc2VsZWN0aW9uO1xuICAgICAgICBzZWxlY3Rpb24gPSB7fTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGFyZSB1c2luZyBhbiBvYmplY3RJZFxuICAgIGlmKHNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgIHNlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgIF9pZDogc2VsZWN0aW9uXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIHRocm93IG5ldyBFcnJvcihcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICB2YXIgY3Vyc29yID0gdGhpcy5maW5kKHNlbGVjdGlvbik7XG4gICAgXG4gICAgdmFyIGRvY3MgPSBbXTtcbiAgICBjdXJzb3IuZm9yRWFjaChkb2MgPT4ge1xuICAgICAgICB2YXIgaWR4ID0gdGhpcy5kb2NfaW5kZXhlc1tkb2MuX2lkXTtcbiAgICAgICAgXG4gICAgICAgIGRlbGV0ZSB0aGlzLmRvY19pbmRleGVzW2RvYy5faWRdO1xuICAgICAgICB0aGlzLmRvY3Muc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIFxuICAgICAgICBkb2NzLnB1c2goZG9jKTtcbiAgICB9KTtcbiAgICBcbiAgICB0aGlzLmRiLl9lbWl0KFxuICAgICAgICAncmVtb3ZlJyxcbiAgICAgICAge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICBkb2NzOiBkb2NzXG4gICAgICAgIH1cbiAgICApO1xuICAgIFxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgZG9jcyk7XG4gICAgXG4gICAgcmV0dXJuIGRvY3M7XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbihvYmosIGZuKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGNhbGxiYWNrID0gZm4gfHwgZnVuY3Rpb24oKXt9O1xuXG4gICAgaWYgKHNlbGYuZG9jc1tvYmouX2lkXSkge1xuICAgICAgICBzZWxmLnVwZGF0ZSh7X2lkOiBvYmouX2lkfSwgY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuaW5zZXJ0KG9iaixjYWxsYmFjayk7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5lbnN1cmVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vVE9ETyBJbXBsZW1lbnQgRW5zdXJlSW5kZXhcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbGxlY3Rpb24jZW5zdXJlSW5kZXggdW5pbXBsZW1lbnRlZCBieSBkcml2ZXInKTtcbn07XG5cbi8vIFRPRE8gZG9jdW1lbnQgKGF0IHNvbWUgcG9pbnQpXG4vLyBUT0RPIHRlc3Rcbi8vIFRPRE8gb2J2aW91c2x5IHRoaXMgcGFydGljdWxhciBpbXBsZW1lbnRhdGlvbiB3aWxsIG5vdCBiZSB2ZXJ5IGVmZmljaWVudFxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGZuKSB7XG4gICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBiYWNrdXBJRCkge1xuICAgICAgICBmbiA9IGJhY2t1cElEO1xuICAgICAgICBiYWNrdXBJRCA9IG5ldyBPYmplY3RJZCgpO1xuICAgIH1cblxuICAgIHZhciBjYWxsYmFjayA9IGZufHxmdW5jdGlvbigpe307XG4gICAgdmFyIHNuYXBJRCA9IGJhY2t1cElEO1xuXG4gICAgdGhpcy5zbmFwc2hvdHNbc25hcElEXSA9IHRoaXMuZG9jcztcbiAgICB0aGlzLmVtaXQoXG4gICAgICAgICdzbmFwc2hvdCcsXG4gICAgICAgIHtcbiAgICAgICAgICAgIF9pZCA6IHRoaXMuZG9jcyxcbiAgICAgICAgICAgIGRhdGEgOiB0aGlzLmRvY3MgXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgY2FsbGJhY2sobnVsbCwgdGhpcy5zbmFwc2hvdHNbc25hcElEXSk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8vIExpc3RzIGF2YWlsYWJsZSBCYWNrdXBzXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmJhY2t1cHMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBmbiB8fCBmdW5jdGlvbigpe307XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICB2YXIgYmFja3VwcyA9IHRoaXMuc25hcHNob3RzO1xuXG4gICAgZm9yICh2YXIgaWQgaW4gYmFja3Vwcykge1xuICAgICAgICBrZXlzLnB1c2goe2lkOiBpZCwgZGF0YTogYmFja3Vwc1tpZF19KTtcbiAgICB9XG5cbiAgICBjYWxsYmFjayhrZXlzKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8gTGlzdHMgYXZhaWxhYmxlIEJhY2t1cHNcbi8qKlxuKiBAaWdub3JlXG4qL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlQmFja3VwID0gZnVuY3Rpb24gKGJhY2t1cElELCBmbikge1xuICAgIGlmICghYmFja3VwSUQgfHwgJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGJhY2t1cElEKSB7XG4gICAgICAgIGZuID0gYmFja3VwSUQ7XG4gICAgICAgIHRoaXMuc25hcHNob3RzID0ge307XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGlkID0gU3RyaW5nKGJhY2t1cElEKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc25hcHNob3RzW2lkXTtcbiAgICB9XG5cbiAgICB2YXIgY2FsbGJhY2sgPSBmbiB8fCBmdW5jdGlvbigpe307XG5cbiAgICBjYWxsYmFjayhudWxsKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vLyBSZXN0b3JlIHRoZSBzbmFwc2hvdC4gSWYgbm8gc25hcHNob3QgZXhpc3RzLCByYWlzZSBhbiBleGNlcHRpb247XG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlc3RvcmUgPSBmdW5jdGlvbiAoIGJhY2t1cElELCBmbiApIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBmbiB8fCBmdW5jdGlvbigpe307XG4gICAgdmFyIHNuYXBzaG90Q291bnQgPSBPYmplY3Quc2l6ZSh0aGlzLnNuYXBzaG90cyk7XG5cbiAgICBpZiAoc25hcHNob3RDb3VudD09PTApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gY3VycmVudCBzbmFwc2hvdFwiKTtcbiAgICB9XG5cbiAgICB2YXIgYmFja3VwRGF0YSA9IHRoaXMuc25hcHNob3RzW2JhY2t1cElEXTtcblxuICAgIGlmICghYmFja3VwRGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIEJhY2t1cCBJRCBcIitiYWNrdXBJRCk7XG4gICAgfVxuXG4gICAgdGhpcy5kb2NzID0gYmFja3VwRGF0YTtcbiAgICB0aGlzLmVtaXQoJ3Jlc3RvcmUnKTtcblxuICAgIGNhbGxiYWNrKG51bGwpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBmb3IgYS5iLmMuMi5kLmUsIGtleXBhcnRzIHNob3VsZCBiZSBbJ2EnLCAnYicsICdjJywgJzInLCAnZCcsICdlJ10sXG4vLyBhbmQgdGhlbiB5b3Ugd291bGQgb3BlcmF0ZSBvbiB0aGUgJ2UnIHByb3BlcnR5IG9mIHRoZSByZXR1cm5lZFxuLy8gb2JqZWN0LiBpZiBub19jcmVhdGUgaXMgZmFsc2V5LCBjcmVhdGVzIGludGVybWVkaWF0ZSBsZXZlbHMgb2Zcbi8vIHN0cnVjdHVyZSBhcyBuZWNlc3NhcnksIGxpa2UgbWtkaXIgLXAgKGFuZCByYWlzZXMgYW4gZXhjZXB0aW9uIGlmXG4vLyB0aGF0IHdvdWxkIG1lYW4gZ2l2aW5nIGEgbm9uLW51bWVyaWMgcHJvcGVydHkgdG8gYW4gYXJyYXkuKSBpZlxuLy8gbm9fY3JlYXRlIGlzIHRydWUsIHJldHVybiB1bmRlZmluZWQgaW5zdGVhZC4gbWF5IG1vZGlmeSB0aGUgbGFzdFxuLy8gZWxlbWVudCBvZiBrZXlwYXJ0cyB0byBzaWduYWwgdG8gdGhlIGNhbGxlciB0aGF0IGl0IG5lZWRzIHRvIHVzZSBhXG4vLyBkaWZmZXJlbnQgdmFsdWUgdG8gaW5kZXggaW50byB0aGUgcmV0dXJuZWQgb2JqZWN0IChmb3IgZXhhbXBsZSxcbi8vIFsnYScsICcwMSddIC0+IFsnYScsIDFdKS4gaWYgZm9yYmlkX2FycmF5IGlzIHRydWUsIHJldHVybiBudWxsIGlmXG4vLyB0aGUga2V5cGF0aCBnb2VzIHRocm91Z2ggYW4gYXJyYXkuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24uX2ZpbmRNb2RUYXJnZXQgPSBmdW5jdGlvbiAoZG9jLCBrZXlwYXJ0cywgbm9fY3JlYXRlLCBmb3JiaWRfYXJyYXkpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBsYXN0ID0gKGkgPT09IGtleXBhcnRzLmxlbmd0aCAtIDEpO1xuICAgICAgICB2YXIga2V5cGFydCA9IGtleXBhcnRzW2ldO1xuICAgICAgICB2YXIgbnVtZXJpYyA9IC9eWzAtOV0rJC8udGVzdChrZXlwYXJ0KTtcblxuICAgICAgICBpZiAobm9fY3JlYXRlICYmICghKHR5cGVvZiBkb2MgPT09IFwib2JqZWN0XCIpIHx8ICEoa2V5cGFydCBpbiBkb2MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkb2MgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgaWYgKGZvcmJpZF9hcnJheSkgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgICAgIGlmICghbnVtZXJpYykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImNhbid0IGFwcGVuZCB0byBhcnJheSB1c2luZyBzdHJpbmcgZmllbGQgbmFtZSBbXCIgKyBrZXlwYXJ0ICsgXCJdXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBrZXlwYXJ0ID0gXy50b051bWJlcihrZXlwYXJ0KTtcblxuICAgICAgICAgICAgaWYgKGxhc3QpIHtcbiAgICAgICAgICAgICAgICAvLyBoYW5kbGUgJ2EuMDEnXG4gICAgICAgICAgICAgICAga2V5cGFydHNbaV0gPSBrZXlwYXJ0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3aGlsZSAoZG9jLmxlbmd0aCA8IGtleXBhcnQpIHtcbiAgICAgICAgICAgICAgICBkb2MucHVzaChudWxsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFsYXN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvYy5sZW5ndGggPT09IGtleXBhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jLnB1c2goe30pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY1trZXlwYXJ0XSAhPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjYW4ndCBtb2RpZnkgZmllbGQgJ1wiICsga2V5cGFydHNbaSArIDFdICsgXCInIG9mIGxpc3QgdmFsdWUgXCIgKyBKU09OLnN0cmluZ2lmeShkb2Nba2V5cGFydF0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBYWFggY2hlY2sgdmFsaWQgZmllbGRuYW1lIChubyAkIGF0IHN0YXJ0LCBubyAuKVxuICAgICAgICAgICAgaWYgKCFsYXN0ICYmICEoa2V5cGFydCBpbiBkb2MpKSB7XG4gICAgICAgICAgICAgICAgZG9jW2tleXBhcnRdID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGFzdCkgcmV0dXJuIGRvYztcblxuICAgICAgICBkb2MgPSBkb2Nba2V5cGFydF07XG4gICAgfVxuXG4gICAgLy8gbm90cmVhY2hlZFxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVycyA9IHtcbiAgICAkdW5zZXQ6IHRydWUsXG4gICAgJHBvcDogdHJ1ZSxcbiAgICAkcmVuYW1lOiB0cnVlLFxuICAgICRwdWxsOiB0cnVlLFxuICAgICRwdWxsQWxsOiB0cnVlXG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbnZhciBfbW9kaWZpZXJzID0ge1xuICAgICRpbmM6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhcmcgIT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1vZGlmaWVyICRpbmMgYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbZmllbGRdICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFwcGx5ICRpbmMgbW9kaWZpZXIgdG8gbm9uLW51bWJlclwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSArPSBhcmc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IF8uY2xvbmVEZWVwKGFyZyk7XG4gICAgfSxcblxuICAgICR1bnNldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAodGFyZ2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVzaDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFthcmddO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFwcGx5ICRwdXNoIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHgucHVzaChfLmNsb25lRGVlcChhcmcpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcHVzaEFsbDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICBpZiAoISh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiICYmIGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFwcGx5ICRwdXNoQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJnLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgeC5wdXNoKGFyZ1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJGFkZFRvU2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gW2FyZ107XG4gICAgICAgIH0gZWxzZSBpZiAoISh4IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYXBwbHkgJGFkZFRvU2V0IG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBpc0VhY2ggPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgayBpbiBhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGsgPT09IFwiJGVhY2hcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNFYWNoID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gaXNFYWNoID8gYXJnW1wiJGVhY2hcIl0gOiBbYXJnXTtcbiAgICAgICAgICAgIF8uZm9yRWFjaCh2YWx1ZXMsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoU2VsZWN0b3IuX2YuX2VxdWFsKHZhbHVlLCB4W2ldKSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHgucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAkcG9wOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoISh4IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYXBwbHkgJHBvcCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicgJiYgYXJnIDwgMCkge1xuICAgICAgICAgICAgICAgIHguc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4LnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgICRwdWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXG4gICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoISh4IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYXBwbHkgJHB1bGwvcHVsbEFsbCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgb3V0ID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiICYmICEoYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgLy8gWFhYIHdvdWxkIGJlIG11Y2ggbmljZXIgdG8gY29tcGlsZSB0aGlzIG9uY2UsIHJhdGhlciB0aGFuXG4gICAgICAgICAgICAgICAgLy8gZm9yIGVhY2ggZG9jdW1lbnQgd2UgbW9kaWZ5Li4gYnV0IHVzdWFsbHkgd2UncmUgbm90XG4gICAgICAgICAgICAgICAgLy8gbW9kaWZ5aW5nIHRoYXQgbWFueSBkb2N1bWVudHMsIHNvIHdlJ2xsIGxldCBpdCBzbGlkZSBmb3JcbiAgICAgICAgICAgICAgICAvLyBub3dcblxuICAgICAgICAgICAgICAgIC8vIFhYWCBfY29tcGlsZVNlbGVjdG9yIGlzbid0IHVwIGZvciB0aGUgam9iLCBiZWNhdXNlIHdlIG5lZWRcbiAgICAgICAgICAgICAgICAvLyB0byBwZXJtaXQgc3R1ZmYgbGlrZSB7JHB1bGw6IHthOiB7JGd0OiA0fX19Li4gc29tZXRoaW5nXG4gICAgICAgICAgICAgICAgLy8gbGlrZSB7JGd0OiA0fSBpcyBub3Qgbm9ybWFsbHkgYSBjb21wbGV0ZSBzZWxlY3Rvci5cbiAgICAgICAgICAgICAgICAvLyBzYW1lIGlzc3VlIGFzICRlbGVtTWF0Y2ggcG9zc2libHk/XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoID0gU2VsZWN0b3IuX2NvbXBpbGVTZWxlY3RvcihhcmcpO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2goeFtpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFTZWxlY3Rvci5fZi5fZXF1YWwoeFtpXSwgYXJnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBvdXQ7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJHB1bGxBbGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG5cbiAgICAgICAgaWYgKCEodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIiAmJiBhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHlcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKCEoeCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhjbHVkZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBhcmcubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yLl9mLl9lcXVhbCh4W2ldLCBhcmdbal0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIWV4Y2x1ZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICRyZW5hbWU6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcsIGtleXBhdGgsIGRvYykge1xuICAgICAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGlmIChrZXlwYXRoID09PSBhcmcpIHtcbiAgICAgICAgICAgIC8vIG5vIGlkZWEgd2h5IG1vbmdvIGhhcyB0aGlzIHJlc3RyaWN0aW9uLi5cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIiRyZW5hbWUgc291cmNlIG11c3QgZGlmZmVyIGZyb20gdGFyZ2V0XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiJHJlbmFtZSBzb3VyY2UgZmllbGQgaW52YWxpZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgYXJnICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCIkcmVuYW1lIHRhcmdldCBtdXN0IGJlIGEgc3RyaW5nXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHYgPSB0YXJnZXRbZmllbGRdO1xuICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcblxuICAgICAgICB2YXIga2V5cGFydHMgPSBhcmcuc3BsaXQoJy4nKTtcbiAgICAgICAgdmFyIHRhcmdldDIgPSBDb2xsZWN0aW9uLl9maW5kTW9kVGFyZ2V0KGRvYywga2V5cGFydHMsIGZhbHNlLCB0cnVlKTtcblxuICAgICAgICBpZiAodGFyZ2V0MiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiJHJlbmFtZSB0YXJnZXQgZmllbGQgaW52YWxpZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmaWVsZDIgPSBrZXlwYXJ0cy5wb3AoKTtcbiAgICAgICAgXG4gICAgICAgIHRhcmdldDJbZmllbGQyXSA9IHY7XG4gICAgfSxcblxuICAgICRiaXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgLy8gWFhYIG1vbmdvIG9ubHkgc3VwcG9ydHMgJGJpdCBvbiBpbnRlZ2VycywgYW5kIHdlIG9ubHkgc3VwcG9ydFxuICAgICAgICAvLyBuYXRpdmUgamF2YXNjcmlwdCBudW1iZXJzIChkb3VibGVzKSBzbyBmYXIsIHNvIHdlIGNhbid0IHN1cHBvcnQgJGJpdFxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCIkYml0IGlzIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgfVxufTtcblxuLyoqXG4qIEBpZ25vcmVcbiovXG5Db2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUgPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSkge1xuICAgIGlmICghXy5pc1N0cmluZyhjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY29sbGVjdGlvbiBuYW1lIG11c3QgYmUgYSBTdHJpbmdcIik7XG4gICAgfVxuXG4gICAgaWYgKCFjb2xsZWN0aW9uTmFtZSB8fCBjb2xsZWN0aW9uTmFtZS5pbmRleE9mKCcuLicpICE9PSAtMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjb2xsZWN0aW9uIG5hbWVzIGNhbm5vdCBiZSBlbXB0eVwiKTtcbiAgICB9XG5cbiAgICBpZiAoY29sbGVjdGlvbk5hbWUuaW5kZXhPZignJCcpICE9IC0xICYmIGNvbGxlY3Rpb25OYW1lLm1hdGNoKC8oKF5cXCRjbWQpfChvcGxvZ1xcLlxcJG1haW4pKS8pID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImNvbGxlY3Rpb24gbmFtZXMgbXVzdCBub3QgY29udGFpbiAnJCdcIik7XG4gICAgfVxuXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLm1hdGNoKC9eXFwufFxcLiQvKSAhPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IHN0YXJ0IG9yIGVuZCB3aXRoICcuJ1wiKTtcbiAgICB9XG59O1xuXG4vKipcbiogQGlnbm9yZVxuKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbmFtZSA9IGZ1bmN0aW9uKG5ld05hbWUpIHtcbiAgICBpZiAoXy5pc1N0cmluZyhuZXdOYW1lKSkge1xuICAgICAgICBpZiAodGhpcy5uYW1lICE9PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUobmV3TmFtZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IG5ld05hbWU7XG4gICAgICAgICAgICB0aGlzLmZ1bGxOYW1lID0gdGhpcy5kYi5kYXRhYmFzZU5hbWUgKyAnLicgKyB0aGlzLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRXJyb3JcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb247XG5cbi8qKlxuICogR2V0cyB0aGUgc2l6ZSBvZiBhbiBvYmplY3QuXG4gKiBcbiAqIEBtZXRob2QgT2JqZWN0I3NpemVcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBvYmplY3RcbiAqIFxuICogQHJldHVybnMge051bWJlcn0gVGhlIHNpemUgb2YgdGhlIG9iamVjdFxuICovXG5PYmplY3Quc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBzaXplID0gMCwgXG4gICAgICAgIGtleTtcbiAgICBcbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBzaXplKys7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHNpemU7XG59OyJdfQ==
