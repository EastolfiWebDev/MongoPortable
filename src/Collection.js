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
class Collection extends EventEmitter {
// var Collection = function(db, collectionName, options) {
    constructor(db, collectionName, options) {
        super();
        
        if (!(this instanceof Collection)) return new Collection(db, collectionName, options);
        
        logger = Logger.instance;
    
        if (_.isNil(db)) logger.throw("db parameter required");
        
        if (_.isNil(collectionName)) logger.throw("collectionName parameter required");
        
        if (_.isNil(options) || !_.isPlainObject(options)) options = {};
        
        Collection.checkCollectionName(collectionName);
    
        // this.db = db;
        database = db;
        this.name = collectionName;
        this.fullName = db.databaseName + '.' + this.name;
        this.docs = [];
        this.doc_indexes = {};
        this.snapshots = [];
        this.opts = {}; // Default options
        
        _.merge(this.opts, options);
        
        // this.emit = db.emit;
    }
    
    emit(name, args, cb) {
        super.emit(name, args, cb, database._stores);
    }
}

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

    if (_.isNil(_doc._id) || (!_doc._id instanceof ObjectId && (!_.isString(_doc._id) || !_doc._id.length))) {
        _doc._id = new ObjectId();
    }

    // Add options to more dates
    _doc.timestamp = new ObjectId().generationTime;
    
    // Reverse
    this.doc_indexes[_.toString(_doc._id)] = this.docs.length;
    this.docs.push(_doc);
    
    this.emit(
        'insert',
        {
            collection: this,
            doc: _doc
        }
    );

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
    let params = _ensureFindParams({
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

    this.emit(
        'find',
        {
            collection: this,
            selector: selection,
            fields: fields,
            options: options
        }
    );
    
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
    let params = _ensureFindParams({
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

    this.emit(
        'findOne',
        {
            collection: this,
            selector: selection,
            fields: fields,
            options: options
        }
    );
    
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
            limit: 15   // for no limit pass [options.limit = -1]
        };
    }
    
    if (_.isFunction(selection)) logger.throw("You must specify the update operation");
    
    if (_.isFunction(update)) logger.throw("You must specify the update operation");
    
    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }
    
    // Check special case where we are using an objectId
    if(selection instanceof ObjectId) {
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
            
            for (let key in update) {
                // IE7 doesn't support indexing into strings (eg, key[0] or key.indexOf('$') ), so use substr.
                // Testing over the first letter:
                //      Bests result with 1e8 loops => key[0](~3s) > substr(~5s) > regexp(~6s) > indexOf(~16s)
                
                var modifier = (key.substr(0, 1) === '$');
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
                for (let key in update) {
                    if (key.substr(0, 1) === '$' || /\./g.test(key)) {
                        logger.warn(`The field ${key} can not begin with '$' or contain '.'`);
                    } else {
                        _docUpdate[key] = update[key];
                    }
                }
            } else {
                _docUpdate = _.cloneDeep(doc);
                
                for (let key in update) {
                    let val = update[key];
                    
                    if (key.substr(0, 1) === '$') {
                        _docUpdate = _applyModifier(_docUpdate, key, val);
                    } else {
                        if (!_.isNil(_docUpdate[key])) {
                            if (key !== '_id') {
                                _docUpdate[key] = val;
                            } else {
                                logger.warn("The field '_id' can not be updated");
                            }
                        } else {
                            logger.warn(`The document does not contains the field ${key}`);
                        }
                    }
                }
            }
            
            updatedDocs.push(_docUpdate);
            
            let idx = this.doc_indexes[_docUpdate._id];
            this.docs[idx] = _docUpdate;
        }
        
        this.emit(
            'update',
            {
                collection: this,
                selector: selection,
                modifier: update,
                options: options,
                docs: updatedDocs
            }
        );
        
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

var _applyModifier = function(_docUpdate, key, val) {
    var doc = _.cloneDeep(_docUpdate);
    // var mod = _modifiers[key];
                        
    if (!_modifiers[key]) {
        logger.throw(`Invalid modifier specified: ${key}`);
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

var _modify = function(document, keyparts, value, key, level = 0) {
    for (let i = level; i < keyparts.length; i++) {
        let path = keyparts[i];
        let isNumeric = /^[0-9]+$/.test(path);
        let target = document[path];
        
        var create = _.hasIn(Collection._noCreateModifiers, key) ? false : true;
        if (!create && (!_.isObject(document) || _.isNil(target))) {
            logger.throw(`The element "${path}" must exists in "${JSON.stringify(document)}"`);
        }
        
        if (_.isArray(document)) {
            // Do not allow $rename on arrays
            if (key === "$rename") return null;
            
            // Only let the use of "arrayfield.<numeric_index>.subfield"
            if (isNumeric) {
                path = _.toNumber(path);
            } else {
                logger.throw(`The field "${path}" can not be appended to an array`);
            }
            
            // Fill the array to the desired length
            while (document.length < path) {
                document.push(null);
            }
        }
        
        if (i < keyparts.length - 1) {
            if (_.isNil(target)) {
                // If we are accessing with "arrayField.<numeric_index>"
                if (_.isFinite(_.toNumber(keyparts[i + 1]))) {  //  || keyparts[i + 1] === '$'  // TODO "arrayField.$"
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
    if(selection instanceof ObjectId) {
        selection = {
            _id: selection
        };
    }
    
    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");
    
    var cursor = this.find(selection);
    
    var docs = [];
    cursor.forEach(doc => {
        var idx = this.doc_indexes[doc._id];
        
        delete this.doc_indexes[doc._id];
        this.docs.splice(idx, 1);
        
        docs.push(doc);
    });
    
    this.emit(
        'remove',
        {
            collection: this,
            selector: selection,
            docs: docs
        }
    );
    
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
Collection.prototype.drop = function(options, callback) {
    if (_.isNil(options)) options = {};
    
    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }
    
    if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");
    
    this.doc_indexes = {};
    this.docs = [];
    
    if (options.dropIndexes) {} // TODO
    
    this.emit(
        'dropCollection',
        {
            collection: this,
            indexes: !!options.dropIndexes
        }
    );
    
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
Collection.prototype.save = function(doc, options, callback) {
    if (_.isNil(doc) || _.isFunction(doc)) logger.throw("You must pass a document");
    
    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    if (_.hasIn(doc, '_id')) {
        options.upsert = true;
        
        return this.update(
            { _id: doc._id },
            doc,
            options,
            callback
        );
    } else {
        return this.insert(doc, options, callback);
    }
};

/**
* @ignore
*/
Collection.prototype.ensureIndex = function() {
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
    this.emit(
        'snapshot',
        {
            collection: this,
            backupID: backupID,
            documents: this.snapshots[backupID] 
        }
    );

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

    for (let id in this.snapshots) {
        backups.push({id: id, documents: this.snapshots[id]});
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
    
    let result = false;
    
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
                for (let key in this.snapshots) backupID = key;
            } else {
                logger.throw("The are several snapshots. Please specify one backupID");
            }
        }
    }
    
    backupData = this.snapshots[backupID];
            
    if (!backupData) {
        logger.throw(`Unknown Backup ID: ${backupID}`);
    }

    this.docs = backupData;
    this.emit(
        'restore',
        {
            collection: this,
            backupID: backupID
        }
    );

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
    $inc: function (target, field, arg) {
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

    $set: function (target, field, arg) {
        target[field] = _.cloneDeep(arg);
    },

    $unset: function (target, field, arg) {
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

    $push: function (target, field, arg) {
        var x = target[field];

        if (_.isNil(x)) {
            target[field] = [arg];
        } else if (!_.isArray(x)) {
            logger.throw("Cannot apply $push modifier to non-array");
        } else {
            x.push(_.cloneDeep(arg));
        }
    },

    $pushAll: function (target, field, arg) {
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

    $addToSet: function (target, field, arg) {
        var x = target[field];

        if (_.isNil(x)) {
            target[field] = [arg];
        } else if (!_.isArray(x)) {
            logger.throw("Cannot apply $addToSet modifier to non-array");
        } else {
            let isEach = false;
            if (_.isPlainObject(arg)) {
                for (let k in arg) {
                    if (k === "$each") {
                        isEach = true;
                    }
                    
                    break;
                }
            }

            let values = isEach ? arg["$each"] : [arg];
            _.forEach(values, function (value) {
                for (let i = 0; i < x.length; i++) {
                    if (SelectorMatcher.equal(value, x[i])) return;
                }

                x.push(value);
            });
        }
    },

    $pop: function (target, field, arg) {
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

    $pull: function (target, field, arg) {
        if (_.isNil(target) || _.isNil(target[field])) return;

        var x = target[field];

        if (!_.isArray(x)) {
            logger.throw("Cannot apply $pull/pullAll modifier to non-array");
        } else {
            var out = [];
            
            if (typeof arg === "object" && !(arg instanceof Array)) {
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

    $pullAll: function (target, field, arg) {
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

    $rename: function (target, field, value) {
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

    $bit: function (target, field, arg) {
        // XXX mongo only supports $bit on integers, and we only support
        // native javascript numbers (doubles) so far, so we can't support $bit
        logger.throw("$bit is not supported");
    }
};

/**
* @ignore
*/
Collection.checkCollectionName = function(collectionName) {
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
Collection.prototype.rename = function(newName) {
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
Object.size = function(obj) {
    var size = 0, 
        key;
    
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }
    
    return size;
};

var _ensureFindParams = function(params) {
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