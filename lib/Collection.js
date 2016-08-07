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

var logger = null;

module.exports = function (Aggregation, Cursor, Selector, SelectorMatcher, ObjectId, EventEmitter, Logger, _) {

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
     * Inserts several documents into the collection
     * 
     * @method Collection#bulkInsert
     * 
     * @param {Array} docs - Documents to be inserted
     * @param {Object} [options] - Additional options
     * 
     * @param {Boolean} [options.chain=false] - If set to "true" returns this instance, so it can be chained with other methods
     * 
     * @param {Function} [callback=null] Callback function to be called at the end with the results
     * 
     * @returns {Object|Collection} If "options.chain" set to "true" returns this instance, otherwise returns the inserted document
     */
    Collection.prototype.bulkInsert = function (docs, options, callback) {
        if (_.isNil(docs)) logger.throw("docs parameter required");

        if (!_.isArray(docs)) logger.throw("docs must be an array");

        if (_.isNil(options)) options = {};

        if (_.isFunction(options)) {
            callback = options;
            options = {};
        }

        if (!_.isNil(callback) && !_.isFunction(callback)) logger.throw("callback must be a function");

        var _docs = [];

        for (var i = 0; i < docs.length; i++) {
            var doc = docs[i];

            _docs.push(this.insert(doc, options));
        }

        if (callback) callback(null, _docs);

        if (options.chain) return this;

        return _docs;
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

    return Collection;
};
//# sourceMappingURL=data:application/json;base64,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LE9BQVAsQ0FBZSxNQUFuQixFQUEyQjtBQUN2QixnQkFBSSxFQUFFLEtBQUYsQ0FBUSxPQUFPLE1BQWYsS0FBMEIsT0FBTyxNQUFQLENBQWMsTUFBZCxLQUF5QixDQUF2RCxFQUEwRDtBQUN0RCx1QkFBTyxNQUFQLEdBQWdCLE9BQU8sT0FBUCxDQUFlLE1BQS9CO0FBQ0gsYUFGRCxNQUVPO0FBQ0gsdUJBQU8sSUFBUCxDQUFZLG9EQUFaO0FBQ0g7QUFDSjs7QUFFRCxlQUFPLE1BQVA7QUFDSCxLQXJERDs7QUF1REEsV0FBTyxVQUFQO0FBQ0gsQ0ExdkNEIiwiZmlsZSI6IkNvbGxlY3Rpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIENvbGxlY3Rpb24uanMgLSBiYXNlZCBvbiBNb25nbG8jQ29sbGVjdGlvbiAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlZFxuICovXG5cbnZhciBsb2dnZXIgPSBudWxsO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKEFnZ3JlZ2F0aW9uLCBDdXJzb3IsIFNlbGVjdG9yLCBTZWxlY3Rvck1hdGNoZXIsIE9iamVjdElkLCBFdmVudEVtaXR0ZXIsIExvZ2dlciwgXykge1xuICAgIFxuICAgIC8qKlxuICAgICAqIENvbGxlY3Rpb25cbiAgICAgKiBcbiAgICAgKiBAbW9kdWxlIENvbGxlY3Rpb25cbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAc2luY2UgMC4wLjFcbiAgICAgKiBcbiAgICAgKiBAY2xhc3NkZXNjIENvbGxlY3Rpb24gY2xhc3MgdGhhdCBtYXBzIGEgTW9uZ29EQi1saWtlIGNvbGxlY3Rpb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge01vbmdvUG9ydGFibGV9IGRiIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLnBrRmFjdG9yeT1udWxsXSAtIE9iamVjdCBvdmVycmlkaW5nIHRoZSBiYXNpYyBcIk9iamVjdElkXCIgcHJpbWFyeSBrZXkgZ2VuZXJhdGlvbi5cbiAgICAgKiBcbiAgICAgKi9cbiAgICB2YXIgZGF0YWJhc2UgPSBudWxsO1xuICAgIGNsYXNzIENvbGxlY3Rpb24gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIC8vIHZhciBDb2xsZWN0aW9uID0gZnVuY3Rpb24oZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIENvbGxlY3Rpb24pKSByZXR1cm4gbmV3IENvbGxlY3Rpb24oZGIsIGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKGRiKSkgbG9nZ2VyLnRocm93KFwiZGIgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc05pbChjb2xsZWN0aW9uTmFtZSkpIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb25OYW1lIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNOaWwob3B0aW9ucykgfHwgIV8uaXNQbGFpbk9iamVjdChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUoY29sbGVjdGlvbk5hbWUpO1xuICAgICAgICBcbiAgICAgICAgICAgIC8vIHRoaXMuZGIgPSBkYjtcbiAgICAgICAgICAgIGRhdGFiYXNlID0gZGI7XG4gICAgICAgICAgICB0aGlzLm5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICAgICAgICAgIHRoaXMuZGF0YWJhc2VOYW1lID0gZGIuZGF0YWJhc2VOYW1lO1xuICAgICAgICAgICAgdGhpcy5mdWxsTmFtZSA9IHRoaXMuZGF0YWJhc2VOYW1lICsgJy4nICsgdGhpcy5uYW1lO1xuICAgICAgICAgICAgdGhpcy5kb2NzID0gW107XG4gICAgICAgICAgICB0aGlzLmRvY19pbmRleGVzID0ge307XG4gICAgICAgICAgICB0aGlzLnNuYXBzaG90cyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5vcHRzID0ge307IC8vIERlZmF1bHQgb3B0aW9uc1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBfLm1lcmdlKHRoaXMub3B0cywgb3B0aW9ucyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHRoaXMuZW1pdCA9IGRiLmVtaXQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGVtaXQobmFtZSwgYXJncywgY2IpIHtcbiAgICAgICAgICAgIHN1cGVyLmVtaXQobmFtZSwgYXJncywgY2IsIGRhdGFiYXNlLl9zdG9yZXMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFRPRE8gZW5mb3JjZSBydWxlIHRoYXQgZmllbGQgbmFtZXMgY2FuJ3Qgc3RhcnQgd2l0aCAnJCcgb3IgY29udGFpbiAnLidcbiAgICAvLyAocmVhbCBtb25nb2RiIGRvZXMgaW4gZmFjdCBlbmZvcmNlIHRoaXMpXG4gICAgLy8gVE9ETyBwb3NzaWJseSBlbmZvcmNlIHRoYXQgJ3VuZGVmaW5lZCcgZG9lcyBub3QgYXBwZWFyICh3ZSBhc3N1bWVcbiAgICAvLyB0aGlzIGluIG91ciBoYW5kbGluZyBvZiBudWxsIGFuZCAkZXhpc3RzKVxuICAgIC8qKlxuICAgICAqIEluc2VydHMgYSBkb2N1bWVudCBpbnRvIHRoZSBjb2xsZWN0aW9uXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDb2xsZWN0aW9uI2luc2VydFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBEb2N1bWVudCB0byBiZSBpbnNlcnRlZFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNoYWluPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHJldHVybnMge09iamVjdHxDb2xsZWN0aW9ufSBJZiBcIm9wdGlvbnMuY2hhaW5cIiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgaW5zZXJ0ZWQgZG9jdW1lbnRcbiAgICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoZG9jLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoXy5pc05pbChkb2MpKSBsb2dnZXIudGhyb3coXCJkb2MgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzUGxhaW5PYmplY3QoZG9jKSkgbG9nZ2VyLnRocm93KFwiZG9jIG11c3QgYmUgYW4gb2JqZWN0XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRpbmcgYSBzYWZlIGNvcHkgb2YgdGhlIGRvY3VtZW50XG4gICAgICAgIHZhciBfZG9jID0gXy5jbG9uZURlZXAoZG9jKTtcbiAgICBcbiAgICAgICAgLy8gSWYgdGhlIGRvY3VtZW50IGNvbWVzIHdpdGggYSBudW1iZXIgSUQsIHBhcnNlIGl0IHRvIFN0cmluZ1xuICAgICAgICBpZiAoXy5pc051bWJlcihfZG9jLl9pZCkpIHtcbiAgICAgICAgICAgIF9kb2MuX2lkID0gXy50b1N0cmluZyhfZG9jLl9pZCk7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoX2RvYy5faWQpIHx8ICghX2RvYy5faWQgaW5zdGFuY2VvZiBPYmplY3RJZCAmJiAoIV8uaXNTdHJpbmcoX2RvYy5faWQpIHx8ICFfZG9jLl9pZC5sZW5ndGgpKSkge1xuICAgICAgICAgICAgX2RvYy5faWQgPSBuZXcgT2JqZWN0SWQoKTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICAvLyBBZGQgb3B0aW9ucyB0byBtb3JlIGRhdGVzXG4gICAgICAgIF9kb2MudGltZXN0YW1wID0gbmV3IE9iamVjdElkKCkuZ2VuZXJhdGlvblRpbWU7XG4gICAgICAgIFxuICAgICAgICAvLyBSZXZlcnNlXG4gICAgICAgIHRoaXMuZG9jX2luZGV4ZXNbXy50b1N0cmluZyhfZG9jLl9pZCldID0gdGhpcy5kb2NzLmxlbmd0aDtcbiAgICAgICAgdGhpcy5kb2NzLnB1c2goX2RvYyk7XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogXCJpbnNlcnRcIiBldmVudC5cbiAgICAgICAgICpcbiAgICAgICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+aW5zZXJ0XG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgZG9jdW1lbnQgaW5zZXJ0ZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICdpbnNlcnQnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICAgICAgZG9jOiBfZG9jXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgX2RvYyk7XG4gICAgXG4gICAgICAgIGlmIChvcHRpb25zLmNoYWluKSByZXR1cm4gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBfZG9jO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5zZXJ0cyBzZXZlcmFsIGRvY3VtZW50cyBpbnRvIHRoZSBjb2xsZWN0aW9uXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDb2xsZWN0aW9uI2J1bGtJbnNlcnRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkb2NzIC0gRG9jdW1lbnRzIHRvIGJlIGluc2VydGVkXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuY2hhaW49ZmFsc2VdIC0gSWYgc2V0IHRvIFwidHJ1ZVwiIHJldHVybnMgdGhpcyBpbnN0YW5jZSwgc28gaXQgY2FuIGJlIGNoYWluZWQgd2l0aCBvdGhlciBtZXRob2RzXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fENvbGxlY3Rpb259IElmIFwib3B0aW9ucy5jaGFpblwiIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBpbnNlcnRlZCBkb2N1bWVudFxuICAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLmJ1bGtJbnNlcnQgPSBmdW5jdGlvbiAoZG9jcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoZG9jcykpIGxvZ2dlci50aHJvdyhcImRvY3MgcGFyYW1ldGVyIHJlcXVpcmVkXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzQXJyYXkoZG9jcykpIGxvZ2dlci50aHJvdyhcImRvY3MgbXVzdCBiZSBhbiBhcnJheVwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBfZG9jcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkb2NzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgZG9jID0gZG9jc1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgX2RvY3MucHVzaCh0aGlzLmluc2VydChkb2MsIG9wdGlvbnMpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBfZG9jcyk7XG4gICAgXG4gICAgICAgIGlmIChvcHRpb25zLmNoYWluKSByZXR1cm4gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBfZG9jcztcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEZpbmRzIGFsbCBtYXRjaGluZyBkb2N1bWVudHNcbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubGltaXRdIC0gTWF4IG51bWJlciBvZiBkb2N1bWVudHMgdG8gZGlzcGxheVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW29wdGlvbnMuZmllbGRzXSAtIFNhbWUgYXMgXCJmaWVsZHNcIiBwYXJhbWV0ZXIgKGlmIGJvdGggcGFzc2VkLCBcIm9wdGlvbnMuZmllbGRzXCIgd2lsbCBiZSBpZ25vcmVkKVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuZm9yY2VGZXRjaD1mYWxzZV0gLSBJZiBzZXQgdG8nXCJ0cnVlXCIgcmV0dXJucyB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzIGFscmVhZHkgZmV0Y2hlZFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl8Q3Vyc29yfSBJZiBcIm9wdGlvbnMuZm9yY2VGZXRjaFwiIHNldCB0byB0cnVlIHJldHVybnMgdGhlIGFycmF5IG9mIGRvY3VtZW50cywgb3RoZXJ3aXNlIHJldHVybnMgYSBjdXJzb3JcbiAgICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgcGFyYW1zID0gX2Vuc3VyZUZpbmRQYXJhbXMoe1xuICAgICAgICAgICAgc2VsZWN0aW9uOiBzZWxlY3Rpb24sIFxuICAgICAgICAgICAgZmllbGRzOiBmaWVsZHMsXG4gICAgICAgICAgICBvcHRpb25zOiBvcHRpb25zLCBcbiAgICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHNlbGVjdGlvbiA9IHBhcmFtcy5zZWxlY3Rpb247XG4gICAgICAgIGZpZWxkcyA9IHBhcmFtcy5maWVsZHM7XG4gICAgICAgIG9wdGlvbnMgPSBwYXJhbXMub3B0aW9ucztcbiAgICAgICAgY2FsbGJhY2sgPSBwYXJhbXMuY2FsbGJhY2s7XG4gICAgICAgIFxuICAgICAgICB2YXIgY3Vyc29yID0gbmV3IEN1cnNvcih0aGlzLmRvY3MsIHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zKTtcbiAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFwiZmluZFwiIGV2ZW50LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXZlbnQgTW9uZ29Qb3J0YWJsZX5maW5kXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzZWxlY3RvciAtIFRoZSBzZWxlY3Rpb24gb2YgdGhlIHF1ZXJ5XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIHNob3dlZCBpbiB0aGUgcXVlcnlcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICdmaW5kJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgZmllbGRzOiBmaWVsZHNcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBhc3MgdGhlIGN1cnNvciBmZXRjaGVkIHRvIHRoZSBjYWxsYmFja1xuICAgICAgICAvLyBBZGQgW29wdGlvbnMubm9GZXRjaENhbGxiYWNrID0gdHJ1ZV1cbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBjdXJzb3IuZmV0Y2goKSk7XG4gICAgXG4gICAgICAgIGlmIChvcHRpb25zLmZvcmNlRmV0Y2gpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJzb3IuZmV0Y2goKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJzb3I7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEZpbmRzIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudFxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiNmaW5kT25lXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5za2lwXSAtIE51bWJlciBvZiBkb2N1bWVudHMgdG8gYmUgc2tpcHBlZFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5saW1pdF0gLSBNYXggbnVtYmVyIG9mIGRvY3VtZW50cyB0byBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbb3B0aW9ucy5maWVsZHNdIC0gU2FtZSBhcyBcImZpZWxkc1wiIHBhcmFtZXRlciAoaWYgYm90aCBwYXNzZWQsIFwib3B0aW9ucy5maWVsZHNcIiB3aWxsIGJlIGlnbm9yZWQpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGZpcnN0IG1hdGNoaW5nIGRvY3VtZW50IG9mIHRoZSBjb2xsZWN0aW9uXG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuZmluZE9uZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgbGV0IHBhcmFtcyA9IF9lbnN1cmVGaW5kUGFyYW1zKHtcbiAgICAgICAgICAgIHNlbGVjdGlvbjogc2VsZWN0aW9uLCBcbiAgICAgICAgICAgIGZpZWxkczogZmllbGRzLFxuICAgICAgICAgICAgb3B0aW9uczogb3B0aW9ucywgXG4gICAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBzZWxlY3Rpb24gPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgICAgICBmaWVsZHMgPSBwYXJhbXMuZmllbGRzO1xuICAgICAgICBvcHRpb25zID0gcGFyYW1zLm9wdGlvbnM7XG4gICAgICAgIGNhbGxiYWNrID0gcGFyYW1zLmNhbGxiYWNrO1xuICAgICAgICBcbiAgICAgICAgdmFyIGN1cnNvciA9IG5ldyBDdXJzb3IodGhpcy5kb2NzLCBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucyk7XG4gICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcImZpbmRPbmVcIiBldmVudC5cbiAgICAgICAgICpcbiAgICAgICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+ZmluZE9uZVxuICAgICAgICAgKiBcbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gc2VsZWN0b3IgLSBUaGUgc2VsZWN0aW9uIG9mIHRoZSBxdWVyeVxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBzaG93ZWQgaW4gdGhlIHF1ZXJ5XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAnZmluZE9uZScsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgIGZpZWxkczogZmllbGRzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICB2YXIgcmVzID0gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGlmIChjdXJzb3IuaGFzTmV4dCgpKSB7XG4gICAgICAgICAgICByZXMgPSBjdXJzb3IubmV4dCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQYXNzIHRoZSBjdXJzb3IgZmV0Y2hlZCB0byB0aGUgY2FsbGJhY2tcbiAgICAgICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIG9uZSBvciBtYW55IGRvY3VtZW50c1xuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiN1cGRhdGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFt1cGRhdGU9e31dIC0gVGhlIHVwZGF0ZSBvcGVyYXRpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnVwZGF0ZUFzTW9uZ289dHJ1ZV0gLSBCeSBkZWZhdWx0OiBcbiAgICAgKiAgICAgIElmIHRoZSBbdXBkYXRlXSBvYmplY3QgY29udGFpbnMgdXBkYXRlIG9wZXJhdG9yIG1vZGlmaWVycywgc3VjaCBhcyB0aG9zZSB1c2luZyB0aGUgXCIkc2V0XCIgbW9kaWZpZXIsIHRoZW46XG4gICAgICogICAgICAgICAgPHVsPlxuICAgICAqICAgICAgICAgICAgICA8bGk+VGhlIFt1cGRhdGVdIG9iamVjdCBtdXN0IGNvbnRhaW4gb25seSB1cGRhdGUgb3BlcmF0b3IgZXhwcmVzc2lvbnM8L2xpPlxuICAgICAqICAgICAgICAgICAgICA8bGk+VGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCB1cGRhdGVzIG9ubHkgdGhlIGNvcnJlc3BvbmRpbmcgZmllbGRzIGluIHRoZSBkb2N1bWVudDwvbGk+XG4gICAgICogICAgICAgICAgPHVsPlxuICAgICAqICAgICAgSWYgdGhlIFt1cGRhdGVdIG9iamVjdCBjb250YWlucyBvbmx5IFwiZmllbGQ6IHZhbHVlXCIgZXhwcmVzc2lvbnMsIHRoZW46XG4gICAgICogICAgICAgICAgPHVsPlxuICAgICAqICAgICAgICAgICAgICA8bGk+VGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCByZXBsYWNlcyB0aGUgbWF0Y2hpbmcgZG9jdW1lbnQgd2l0aCB0aGUgW3VwZGF0ZV0gb2JqZWN0LiBUaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIGRvZXMgbm90IHJlcGxhY2UgdGhlIFwiX2lkXCIgdmFsdWU8L2xpPlxuICAgICAqICAgICAgICAgICAgICA8bGk+Q29sbGVjdGlvbiN1cGRhdGUgY2Fubm90IHVwZGF0ZSBtdWx0aXBsZSBkb2N1bWVudHM8L2xpPlxuICAgICAqICAgICAgICAgIDx1bD5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMub3ZlcnJpZGU9ZmFsc2VdIC0gUmVwbGFjZXMgdGhlIHdob2xlIGRvY3VtZW50IChvbmx5IGFwbGxpZXMgd2hlbiBbdXBkYXRlQXNNb25nbz1mYWxzZV0pXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnVwc2VydD1mYWxzZV0gLSBDcmVhdGVzIGEgbmV3IGRvY3VtZW50IHdoZW4gbm8gZG9jdW1lbnQgbWF0Y2hlcyB0aGUgcXVlcnkgY3JpdGVyaWFcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubXVsdGk9ZmFsc2VdIC0gVXBkYXRlcyBtdWx0aXBsZSBkb2N1bWVudHMgdGhhdCBtZWV0IHRoZSBjcml0ZXJpYVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB0aGUgdXBkYXRlL2luc2VydCAoaWYgdXBzZXJ0PXRydWUpIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgdXBkYXRlLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoXy5pc05pbChzZWxlY3Rpb24pKSBzZWxlY3Rpb24gPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKHVwZGF0ZSkpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHNwZWNpZnkgdGhlIHVwZGF0ZSBvcGVyYXRpb25cIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChvcHRpb25zKSkge1xuICAgICAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBza2lwOiAwLFxuICAgICAgICAgICAgICAgIGxpbWl0OiAxNSAgIC8vIGZvciBubyBsaW1pdCBwYXNzIFtvcHRpb25zLmxpbWl0ID0gLTFdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHNlbGVjdGlvbikpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHNwZWNpZnkgdGhlIHVwZGF0ZSBvcGVyYXRpb25cIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHVwZGF0ZSkpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHNwZWNpZnkgdGhlIHVwZGF0ZSBvcGVyYXRpb25cIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICAgICAgaWYoc2VsZWN0aW9uIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgICAgIHNlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgICAgICB2YXIgcmVzID0gbnVsbDtcbiAgICBcbiAgICAgICAgdmFyIGRvY3MgPSBudWxsO1xuICAgICAgICBpZiAob3B0aW9ucy5tdWx0aSkge1xuICAgICAgICAgICAgZG9jcyA9IHRoaXMuZmluZChzZWxlY3Rpb24sIG51bGwsIHsgZm9yY2VGZXRjaDogdHJ1ZSB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRvY3MgPSB0aGlzLmZpbmRPbmUoc2VsZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoZG9jcykpIHtcbiAgICAgICAgICAgIGRvY3MgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzQXJyYXkoZG9jcykpIHtcbiAgICAgICAgICAgIGRvY3MgPSBbZG9jc107XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChkb2NzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMudXBzZXJ0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGluc2VydGVkID0gdGhpcy5pbnNlcnQodXBkYXRlKTtcbiAgICBcbiAgICAgICAgICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IFtpbnNlcnRlZF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogMVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm8gZG9jdW1lbnRzIGZvdW5kXG4gICAgICAgICAgICAgICAgcmVzID0ge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgdXBkYXRlZERvY3MgPSBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb2NzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRvYyA9IGRvY3NbaV07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIG92ZXJyaWRlID0gbnVsbDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgaGFzTW9kaWZpZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElFNyBkb2Vzbid0IHN1cHBvcnQgaW5kZXhpbmcgaW50byBzdHJpbmdzIChlZywga2V5WzBdIG9yIGtleS5pbmRleE9mKCckJykgKSwgc28gdXNlIHN1YnN0ci5cbiAgICAgICAgICAgICAgICAgICAgLy8gVGVzdGluZyBvdmVyIHRoZSBmaXJzdCBsZXR0ZXI6XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgQmVzdHMgcmVzdWx0IHdpdGggMWU4IGxvb3BzID0+IGtleVswXSh+M3MpID4gc3Vic3RyKH41cykgPiByZWdleHAofjZzKSA+IGluZGV4T2YofjE2cylcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHZhciBtb2RpZmllciA9IChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobW9kaWZpZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc01vZGlmaWVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMudXBkYXRlQXNNb25nbykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhc01vZGlmaWVyICYmICFtb2RpZmllcikgbG9nZ2VyLnRocm93KFwiQWxsIHVwZGF0ZSBmaWVsZHMgbXVzdCBiZSBhbiB1cGRhdGUgb3BlcmF0b3JcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFzTW9kaWZpZXIgJiYgb3B0aW9ucy5tdWx0aSkgbG9nZ2VyLnRocm93KFwiWW91IGNhbiBub3QgdXBkYXRlIHNldmVyYWwgZG9jdW1lbnRzIHdoZW4gbm8gdXBkYXRlIG9wZXJhdG9ycyBhcmUgaW5jbHVkZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNNb2RpZmllcikgb3ZlcnJpZGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNNb2RpZmllcikgb3ZlcnJpZGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcnJpZGUgPSAhIW9wdGlvbnMub3ZlcnJpZGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIF9kb2NVcGRhdGUgPSBudWxsO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChvdmVycmlkZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPdmVycmlkZXMgdGhlIGRvY3VtZW50IGV4Y2VwdCBmb3IgdGhlIFwiX2lkXCJcbiAgICAgICAgICAgICAgICAgICAgX2RvY1VwZGF0ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9pZDogZG9jLl9pZFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gTXVzdCBpZ25vcmUgZmllbGRzIHN0YXJ0aW5nIHdpdGggJyQnLCAnLicuLi5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJyB8fCAvXFwuL2cudGVzdChrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYFRoZSBmaWVsZCAke2tleX0gY2FuIG5vdCBiZWdpbiB3aXRoICckJyBvciBjb250YWluICcuJ2ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZG9jVXBkYXRlW2tleV0gPSB1cGRhdGVba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSBfLmNsb25lRGVlcChkb2MpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHZhbCA9IHVwZGF0ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RvY1VwZGF0ZSA9IF9hcHBseU1vZGlmaWVyKF9kb2NVcGRhdGUsIGtleSwgdmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmlzTmlsKF9kb2NVcGRhdGVba2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKFwiVGhlIGZpZWxkICdfaWQnIGNhbiBub3QgYmUgdXBkYXRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBUaGUgZG9jdW1lbnQgZG9lcyBub3QgY29udGFpbnMgdGhlIGZpZWxkICR7a2V5fWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB1cGRhdGVkRG9jcy5wdXNoKF9kb2NVcGRhdGUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGxldCBpZHggPSB0aGlzLmRvY19pbmRleGVzW19kb2NVcGRhdGUuX2lkXTtcbiAgICAgICAgICAgICAgICB0aGlzLmRvY3NbaWR4XSA9IF9kb2NVcGRhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogXCJ1cGRhdGVcIiBldmVudC5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBAZXZlbnQgTW9uZ29Qb3J0YWJsZX51cGRhdGVcbiAgICAgICAgICAgICAqIFxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdGlvbiBvZiB0aGUgcXVlcnlcbiAgICAgICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBtb2RpZmllciAtIFRoZSBtb2RpZmllciB1c2VkIGluIHRoZSBxdWVyeVxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGRvY3MgLSBUaGUgdXBkYXRlZC9pbnNlcnRlZCBkb2N1bWVudHMgaW5mb3JtYXRpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgICAgICd1cGRhdGUnLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZpZXI6IHVwZGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgZG9jczogdXBkYXRlZERvY3NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IHVwZGF0ZWREb2NzLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogdXBkYXRlZERvY3MubGVuZ3RoXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgX2FwcGx5TW9kaWZpZXIgPSBmdW5jdGlvbihfZG9jVXBkYXRlLCBrZXksIHZhbCkge1xuICAgICAgICB2YXIgZG9jID0gXy5jbG9uZURlZXAoX2RvY1VwZGF0ZSk7XG4gICAgICAgIC8vIHZhciBtb2QgPSBfbW9kaWZpZXJzW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIGlmICghX21vZGlmaWVyc1trZXldKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coYEludmFsaWQgbW9kaWZpZXIgc3BlY2lmaWVkOiAke2tleX1gKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIga2V5cGF0aCBpbiB2YWwpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHZhbFtrZXlwYXRoXTtcbiAgICAgICAgICAgIHZhciBrZXlwYXJ0cyA9IGtleXBhdGguc3BsaXQoJy4nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgX21vZGlmeShkb2MsIGtleXBhcnRzLCB2YWx1ZSwga2V5KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gdmFyIG5vX2NyZWF0ZSA9ICEhQ29sbGVjdGlvbi5fbm9DcmVhdGVNb2RpZmllcnNba2V5XTtcbiAgICAgICAgICAgIC8vIHZhciBmb3JiaWRfYXJyYXkgPSAoa2V5ID09PSBcIiRyZW5hbWVcIik7XG4gICAgICAgICAgICAvLyB2YXIgdGFyZ2V0ID0gQ29sbGVjdGlvbi5fZmluZE1vZFRhcmdldChfZG9jVXBkYXRlLCBrZXlwYXJ0cywgbm9fY3JlYXRlLCBmb3JiaWRfYXJyYXkpO1xuICAgICAgICAgICAgLy8gdmFyIGZpZWxkID0ga2V5cGFydHMucG9wKCk7XG4gICAgXG4gICAgICAgICAgICAvLyBtb2QodGFyZ2V0LCBmaWVsZCwgdmFsdWUsIGtleXBhdGgsIF9kb2NVcGRhdGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZG9jO1xuICAgIH07XG4gICAgXG4gICAgdmFyIF9tb2RpZnkgPSBmdW5jdGlvbihkb2N1bWVudCwga2V5cGFydHMsIHZhbHVlLCBrZXksIGxldmVsID0gMCkge1xuICAgICAgICBmb3IgKGxldCBpID0gbGV2ZWw7IGkgPCBrZXlwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IHBhdGggPSBrZXlwYXJ0c1tpXTtcbiAgICAgICAgICAgIGxldCBpc051bWVyaWMgPSAvXlswLTldKyQvLnRlc3QocGF0aCk7XG4gICAgICAgICAgICBsZXQgdGFyZ2V0ID0gZG9jdW1lbnRbcGF0aF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjcmVhdGUgPSBfLmhhc0luKENvbGxlY3Rpb24uX25vQ3JlYXRlTW9kaWZpZXJzLCBrZXkpID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICAgICAgaWYgKCFjcmVhdGUgJiYgKCFfLmlzT2JqZWN0KGRvY3VtZW50KSB8fCBfLmlzTmlsKHRhcmdldCkpKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KGBUaGUgZWxlbWVudCBcIiR7cGF0aH1cIiBtdXN0IGV4aXN0cyBpbiBcIiR7SlNPTi5zdHJpbmdpZnkoZG9jdW1lbnQpfVwiYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoZG9jdW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgLy8gRG8gbm90IGFsbG93ICRyZW5hbWUgb24gYXJyYXlzXG4gICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gXCIkcmVuYW1lXCIpIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE9ubHkgbGV0IHRoZSB1c2Ugb2YgXCJhcnJheWZpZWxkLjxudW1lcmljX2luZGV4Pi5zdWJmaWVsZFwiXG4gICAgICAgICAgICAgICAgaWYgKGlzTnVtZXJpYykge1xuICAgICAgICAgICAgICAgICAgICBwYXRoID0gXy50b051bWJlcihwYXRoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coYFRoZSBmaWVsZCBcIiR7cGF0aH1cIiBjYW4gbm90IGJlIGFwcGVuZGVkIHRvIGFuIGFycmF5YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEZpbGwgdGhlIGFycmF5IHRvIHRoZSBkZXNpcmVkIGxlbmd0aFxuICAgICAgICAgICAgICAgIHdoaWxlIChkb2N1bWVudC5sZW5ndGggPCBwYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnB1c2gobnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaSA8IGtleXBhcnRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc05pbCh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIGFyZSBhY2Nlc3Npbmcgd2l0aCBcImFycmF5RmllbGQuPG51bWVyaWNfaW5kZXg+XCJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNGaW5pdGUoXy50b051bWJlcihrZXlwYXJ0c1tpICsgMV0pKSkgeyAgLy8gIHx8IGtleXBhcnRzW2kgKyAxXSA9PT0gJyQnICAvLyBUT0RPIFwiYXJyYXlGaWVsZC4kXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0ge307XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZG9jdW1lbnRbcGF0aF0gPSBfbW9kaWZ5KHRhcmdldCwga2V5cGFydHMsIHZhbHVlLCBrZXksIGxldmVsICsgMSk7XG4gICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvY3VtZW50O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfbW9kaWZpZXJzW2tleV0oZG9jdW1lbnQsIHBhdGgsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9jdW1lbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgb25lIG9yIG1hbnkgZG9jdW1lbnRzXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDb2xsZWN0aW9uI3JlbW92ZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmp1c3RPbmU9ZmFsc2VdIC0gRGVsZXRlcyB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiB0aGUgc2VsZWN0aW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHRoZSBkZWxldGVkIGRvY3VtZW50c1xuICAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihzZWxlY3Rpb24pKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHNlbGVjdGlvbjtcbiAgICAgICAgICAgIHNlbGVjdGlvbiA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0geyBqdXN0T25lOiBmYWxzZSB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgd2UgYXJlIG5vdCBwYXNzaW5nIGEgc2VsZWN0aW9uIGFuZCB3ZSBhcmUgbm90IHJlbW92aW5nIGp1c3Qgb25lLCBpcyB0aGUgc2FtZSBhcyBhIGRyb3BcbiAgICAgICAgaWYgKE9iamVjdC5zaXplKHNlbGVjdGlvbikgPT09IDAgJiYgIW9wdGlvbnMuanVzdE9uZSkgcmV0dXJuIHRoaXMuZHJvcChvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgICAgIGlmKHNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICAgICAgX2lkOiBzZWxlY3Rpb25cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBjdXJzb3IgPSB0aGlzLmZpbmQoc2VsZWN0aW9uKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBkb2NzID0gW107XG4gICAgICAgIGN1cnNvci5mb3JFYWNoKGRvYyA9PiB7XG4gICAgICAgICAgICB2YXIgaWR4ID0gdGhpcy5kb2NfaW5kZXhlc1tkb2MuX2lkXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZG9jX2luZGV4ZXNbZG9jLl9pZF07XG4gICAgICAgICAgICB0aGlzLmRvY3Muc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRvY3MucHVzaChkb2MpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcInJlbW92ZVwiIGV2ZW50LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXZlbnQgTW9uZ29Qb3J0YWJsZX5yZW1vdmVcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb2xsZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbGxlY3Rpb25cbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdGlvbiBvZiB0aGUgcXVlcnlcbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGRvY3MgLSBUaGUgZGVsZXRlZCBkb2N1bWVudHMgaW5mb3JtYXRpb25cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICdyZW1vdmUnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICBkb2NzOiBkb2NzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGRvY3MpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGRvY3M7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBbGlhcyBmb3Ige0BsaW5rIENvbGxlY3Rpb24jcmVtb3ZlfVxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiNkZWxldGVcbiAgICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmUoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICAgXG4gICAgIC8qKlxuICAgICAqIEFsaWFzIGZvciB7QGxpbmsgQ29sbGVjdGlvbiNyZW1vdmV9XG4gICAgICogXG4gICAgICogQG1ldGhvZCBDb2xsZWN0aW9uI2Rlc3Ryb3lcbiAgICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlKHNlbGVjdGlvbiwgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogRHJvcHMgYSBjb2xsZWN0aW9uXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDb2xsZWN0aW9uI2Ryb3BcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmRyb3BJbmRleGVzPWZhbHNlXSAtIFRydWUgaWYgd2Ugd2FudCB0byBkcm9wIHRoZSBpbmRleGVzIHRvb1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUcnVlIHdoZW4gdGhlIGNvbGxlY3Rpb24gaXMgZHJvcHBlZFxuICAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLmRyb3AgPSBmdW5jdGlvbihvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmRvY19pbmRleGVzID0ge307XG4gICAgICAgIHRoaXMuZG9jcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKG9wdGlvbnMuZHJvcEluZGV4ZXMpIHt9IC8vIFRPRE9cbiAgICAgICAgXG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICdkcm9wQ29sbGVjdGlvbicsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICBpbmRleGVzOiAhIW9wdGlvbnMuZHJvcEluZGV4ZXNcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEluc2VydCBvciB1cGRhdGUgYSBkb2N1bWVudC4gSWYgdGhlIGRvY3VtZW50IGhhcyBhbiBcIl9pZFwiIGlzIGFuIHVwZGF0ZSAod2l0aCB1cHNlcnQpLCBpZiBub3QgaXMgYW4gaW5zZXJ0LlxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiNzYXZlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRvYyAtIERvY3VtZW50IHRvIGJlIGluc2VydGVkL3VwZGF0ZWRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuZHJvcEluZGV4ZXM9ZmFsc2VdIC0gVHJ1ZSBpZiB3ZSB3YW50IHRvIGRyb3AgdGhlIGluZGV4ZXMgdG9vXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRydWUgd2hlbiB0aGUgY29sbGVjdGlvbiBpcyBkcm9wcGVkXG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uKGRvYywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoZG9jKSB8fCBfLmlzRnVuY3Rpb24oZG9jKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3QgcGFzcyBhIGRvY3VtZW50XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIGlmIChfLmhhc0luKGRvYywgJ19pZCcpKSB7XG4gICAgICAgICAgICBvcHRpb25zLnVwc2VydCA9IHRydWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZShcbiAgICAgICAgICAgICAgICB7IF9pZDogZG9jLl9pZCB9LFxuICAgICAgICAgICAgICAgIGRvYyxcbiAgICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5zZXJ0KGRvYywgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAqIEBpZ25vcmVcbiAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLmVuc3VyZUluZGV4ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vVE9ETyBJbXBsZW1lbnQgRW5zdXJlSW5kZXhcbiAgICAgICAgbG9nZ2VyLnRocm93KCdDb2xsZWN0aW9uI2Vuc3VyZUluZGV4IHVuaW1wbGVtZW50ZWQgYnkgZHJpdmVyJyk7XG4gICAgfTtcbiAgICBcbiAgICAvLyBUT0RPIGRvY3VtZW50IChhdCBzb21lIHBvaW50KVxuICAgIC8vIFRPRE8gdGVzdFxuICAgIC8vIFRPRE8gb2J2aW91c2x5IHRoaXMgcGFydGljdWxhciBpbXBsZW1lbnRhdGlvbiB3aWxsIG5vdCBiZSB2ZXJ5IGVmZmljaWVudFxuICAgIC8qKlxuICAgICogQGlnbm9yZVxuICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuYmFja3VwID0gZnVuY3Rpb24gKGJhY2t1cElELCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGJhY2t1cElEKSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgICAgIGJhY2t1cElEID0gbmV3IE9iamVjdElkKCkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIFxuICAgICAgICB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF0gPSBfLmNsb25lRGVlcCh0aGlzLmRvY3MpO1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAnc25hcHNob3QnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICAgICAgYmFja3VwSUQ6IGJhY2t1cElELFxuICAgICAgICAgICAgICAgIGRvY3VtZW50czogdGhpcy5zbmFwc2hvdHNbYmFja3VwSURdIFxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIFxuICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgYmFja3VwSUQ6IGJhY2t1cElELFxuICAgICAgICAgICAgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICAgIFxuICAgIC8vIExpc3RzIGF2YWlsYWJsZSBCYWNrdXBzXG4gICAgLyoqXG4gICAgKiBAaWdub3JlXG4gICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXBzID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBiYWNrdXBzID0gW107XG4gICAgXG4gICAgICAgIGZvciAobGV0IGlkIGluIHRoaXMuc25hcHNob3RzKSB7XG4gICAgICAgICAgICBiYWNrdXBzLnB1c2goe2lkOiBpZCwgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tpZF19KTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGJhY2t1cHMpO1xuICAgIFxuICAgICAgICByZXR1cm4gYmFja3VwcztcbiAgICB9O1xuICAgIFxuICAgIC8vIExpc3RzIGF2YWlsYWJsZSBCYWNrdXBzXG4gICAgLyoqXG4gICAgKiBAaWdub3JlXG4gICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVCYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24oYmFja3VwSUQpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGJhY2t1cElEO1xuICAgICAgICAgICAgYmFja3VwSUQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgIFxuICAgICAgICBsZXQgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICBpZiAoYmFja3VwSUQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNuYXBzaG90c1tfLnRvU3RyaW5nKGJhY2t1cElEKV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJlc3VsdCA9IGJhY2t1cElEO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zbmFwc2hvdHMgPSB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzdWx0ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gICAgXG4gICAgXG4gICAgLy8gUmVzdG9yZSB0aGUgc25hcHNob3QuIElmIG5vIHNuYXBzaG90IGV4aXN0cywgcmFpc2UgYW4gZXhjZXB0aW9uO1xuICAgIC8qKlxuICAgICogQGlnbm9yZVxuICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUucmVzdG9yZSA9IGZ1bmN0aW9uIChiYWNrdXBJRCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gYmFja3VwSUQ7XG4gICAgICAgICAgICBiYWNrdXBJRCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBzbmFwc2hvdENvdW50ID0gT2JqZWN0LnNpemUodGhpcy5zbmFwc2hvdHMpO1xuICAgICAgICB2YXIgYmFja3VwRGF0YSA9IG51bGw7XG4gICAgXG4gICAgICAgIGlmIChzbmFwc2hvdENvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJUaGVyZSBpcyBubyBzbmFwc2hvdHNcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIWJhY2t1cElEKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNuYXBzaG90Q291bnQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oXCJObyBiYWNrdXBJRCBwYXNzZWQuIFJlc3RvcmluZyB0aGUgb25seSBzbmFwc2hvdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJldHJpZXZlIHRoZSBvbmx5IHNuYXBzaG90XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB0aGlzLnNuYXBzaG90cykgYmFja3VwSUQgPSBrZXk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVGhlIGFyZSBzZXZlcmFsIHNuYXBzaG90cy4gUGxlYXNlIHNwZWNpZnkgb25lIGJhY2t1cElEXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYmFja3VwRGF0YSA9IHRoaXMuc25hcHNob3RzW2JhY2t1cElEXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgaWYgKCFiYWNrdXBEYXRhKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coYFVua25vd24gQmFja3VwIElEOiAke2JhY2t1cElEfWApO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIHRoaXMuZG9jcyA9IGJhY2t1cERhdGE7XG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICdyZXN0b3JlJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRFxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xuICAgIFxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgYWdncmVnYXRlIHZhbHVlcyBmb3IgdGhlIGRhdGEgaW4gYSBjb2xsZWN0aW9uXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDb2xsZWN0aW9uI2FnZ3JlZ2F0ZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBpcGVsaW5lIC0gQSBzZXF1ZW5jZSBvZiBkYXRhIGFnZ3JlZ2F0aW9uIG9wZXJhdGlvbnMgb3Igc3RhZ2VzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuZm9yY2VGZXRjaD1mYWxzZV0gLSBJZiBzZXQgdG8nXCJ0cnVlXCIgcmV0dXJucyB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzIGFscmVhZHkgZmV0Y2hlZFxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtBcnJheXxDdXJzb3J9IElmIFwib3B0aW9ucy5mb3JjZUZldGNoXCIgc2V0IHRvIHRydWUgcmV0dXJucyB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzLCBvdGhlcndpc2UgcmV0dXJucyBhIGN1cnNvclxuICAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLmFnZ3JlZ2F0ZSA9IGZ1bmN0aW9uKHBpcGVsaW5lLCBvcHRpb25zID0geyBmb3JjZUZldGNoOiBmYWxzZSB9KSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHBpcGVsaW5lKSB8fCAhXy5pc0FycmF5KHBpcGVsaW5lKSkgbG9nZ2VyLnRocm93KCdUaGUgXCJwaXBlbGluZVwiIHBhcmFtIG11c3QgYmUgYW4gYXJyYXknKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBhZ2dyZWdhdGlvbiA9IG5ldyBBZ2dyZWdhdGlvbihwaXBlbGluZSk7XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBpcGVsaW5lLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgc3RhZ2UgPSBwaXBlbGluZVtpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHN0YWdlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgIT09ICckJykgbG9nZ2VyLnRocm93KFwiVGhlIHBpcGVsaW5lIHN0YWdlcyBtdXN0IGJlZ2luIHdpdGggJyQnXCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghYWdncmVnYXRpb24udmFsaWRTdGFnZShrZXkpKSBsb2dnZXIudGhyb3coYEludmFsaWQgc3RhZ2UgXCIke2tleX1cImApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgcmVzdWx0ID0gYWdncmVnYXRpb24uYWdncmVnYXRlKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDsgIC8vIGNoYW5nZSB0byBjdXJzb3JcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICogQGlnbm9yZVxuICAgICovXG4gICAgQ29sbGVjdGlvbi5fbm9DcmVhdGVNb2RpZmllcnMgPSB7XG4gICAgICAgICR1bnNldDogdHJ1ZSxcbiAgICAgICAgJHBvcDogdHJ1ZSxcbiAgICAgICAgJHJlbmFtZTogdHJ1ZSxcbiAgICAgICAgJHB1bGw6IHRydWUsXG4gICAgICAgICRwdWxsQWxsOiB0cnVlXG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAqIEBpZ25vcmVcbiAgICAqL1xuICAgIHZhciBfbW9kaWZpZXJzID0ge1xuICAgICAgICAkaW5jOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgICAgICBpZiAoIV8uaXNOdW1iZXIoYXJnKSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRpbmMgYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5XCIpO1xuICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgICAgICAgIGlmICghXy5pc051bWJlcih0YXJnZXRbZmllbGRdKSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJGluYyBtb2RpZmllciB0byBub24tbnVtYmVyXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgICAgICB0YXJnZXRbZmllbGRdICs9IGFyZztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICBcbiAgICAgICAgJHNldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IF8uY2xvbmVEZWVwKGFyZyk7XG4gICAgICAgIH0sXG4gICAgXG4gICAgICAgICR1bnNldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAgICAgaWYgKCFfLmlzTmlsKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgXG4gICAgICAgICRwdXNoOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG4gICAgXG4gICAgICAgICAgICBpZiAoXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBbYXJnXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVzaCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHgucHVzaChfLmNsb25lRGVlcChhcmcpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICBcbiAgICAgICAgJHB1c2hBbGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICBcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHgpKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHlcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJnLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHgucHVzaChhcmdbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICBcbiAgICAgICAgJGFkZFRvU2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG4gICAgXG4gICAgICAgICAgICBpZiAoXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBbYXJnXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkYWRkVG9TZXQgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgaXNFYWNoID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNQbGFpbk9iamVjdChhcmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGsgaW4gYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoayA9PT0gXCIkZWFjaFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNFYWNoID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlcyA9IGlzRWFjaCA/IGFyZ1tcIiRlYWNoXCJdIDogW2FyZ107XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHZhbHVlcywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yTWF0Y2hlci5lcXVhbCh2YWx1ZSwgeFtpXSkpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgICAgICAgICB4LnB1c2godmFsdWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIFxuICAgICAgICAkcG9wOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgICAgICBpZiAoXy5pc05pbCh0YXJnZXQpIHx8IF8uaXNOaWwodGFyZ2V0W2ZpZWxkXSkpIHJldHVybjtcbiAgICBcbiAgICAgICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICBcbiAgICAgICAgICAgIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwb3AgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc051bWJlcihhcmcpICYmIGFyZyA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgeC5zcGxpY2UoMCwgMSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgeC5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgXG4gICAgICAgICRwdWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgICAgICBpZiAoXy5pc05pbCh0YXJnZXQpIHx8IF8uaXNOaWwodGFyZ2V0W2ZpZWxkXSkpIHJldHVybjtcbiAgICBcbiAgICAgICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICBcbiAgICAgICAgICAgIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgb3V0ID0gW107XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmcgPT09IFwib2JqZWN0XCIgJiYgIShhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gWFhYIHdvdWxkIGJlIG11Y2ggbmljZXIgdG8gY29tcGlsZSB0aGlzIG9uY2UsIHJhdGhlciB0aGFuXG4gICAgICAgICAgICAgICAgICAgIC8vIGZvciBlYWNoIGRvY3VtZW50IHdlIG1vZGlmeS4uIGJ1dCB1c3VhbGx5IHdlJ3JlIG5vdFxuICAgICAgICAgICAgICAgICAgICAvLyBtb2RpZnlpbmcgdGhhdCBtYW55IGRvY3VtZW50cywgc28gd2UnbGwgbGV0IGl0IHNsaWRlIGZvclxuICAgICAgICAgICAgICAgICAgICAvLyBub3dcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gWFhYIF9jb21waWxlU2VsZWN0b3IgaXNuJ3QgdXAgZm9yIHRoZSBqb2IsIGJlY2F1c2Ugd2UgbmVlZFxuICAgICAgICAgICAgICAgICAgICAvLyB0byBwZXJtaXQgc3R1ZmYgbGlrZSB7JHB1bGw6IHthOiB7JGd0OiA0fX19Li4gc29tZXRoaW5nXG4gICAgICAgICAgICAgICAgICAgIC8vIGxpa2UgeyRndDogNH0gaXMgbm90IG5vcm1hbGx5IGEgY29tcGxldGUgc2VsZWN0b3IuXG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaCA9IG5ldyBTZWxlY3Rvcih7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIl9fbWF0Y2hpbmdfX1wiOiBhcmdcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIF9kb2NfID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9fbWF0Y2hpbmdfXzogeFtpXVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2gudGVzdChfZG9jXykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCh4W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFTZWxlY3Rvck1hdGNoZXIuZXF1YWwoeFtpXSwgYXJnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBvdXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgXG4gICAgICAgICRwdWxsQWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgICAgICBpZiAoXy5pc05pbCh0YXJnZXQpIHx8IF8uaXNOaWwodGFyZ2V0W2ZpZWxkXSkpIHJldHVybjtcbiAgICBcbiAgICAgICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICBcbiAgICAgICAgICAgIGlmICghXy5pc05pbCh4KSAmJiAhXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIV8uaXNOaWwoeCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3V0ID0gW107XG4gICAgXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBleGNsdWRlID0gZmFsc2U7XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYXJnLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoU2VsZWN0b3JNYXRjaGVyLmVxdWFsKHhbaV0sIGFyZ1tqXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWV4Y2x1ZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBvdXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgXG4gICAgICAgICRyZW5hbWU6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGZpZWxkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIG5vIGlkZWEgd2h5IG1vbmdvIGhhcyB0aGlzIHJlc3RyaWN0aW9uLi5cbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJUaGUgbmV3IGZpZWxkIG5hbWUgbXVzdCBiZSBkaWZmZXJlbnRcIik7XG4gICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICBpZiAoIV8uaXNTdHJpbmcodmFsdWUpIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJUaGUgbmV3IG5hbWUgbXVzdCBiZSBhIG5vbi1lbXB0eSBzdHJpbmdcIik7XG4gICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICB0YXJnZXRbdmFsdWVdID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICAgICAgICAgIGRlbGV0ZSB0YXJnZXRbZmllbGRdO1xuICAgICAgICB9LFxuICAgIFxuICAgICAgICAkYml0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgICAgICAvLyBYWFggbW9uZ28gb25seSBzdXBwb3J0cyAkYml0IG9uIGludGVnZXJzLCBhbmQgd2Ugb25seSBzdXBwb3J0XG4gICAgICAgICAgICAvLyBuYXRpdmUgamF2YXNjcmlwdCBudW1iZXJzIChkb3VibGVzKSBzbyBmYXIsIHNvIHdlIGNhbid0IHN1cHBvcnQgJGJpdFxuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiJGJpdCBpcyBub3Qgc3VwcG9ydGVkXCIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAqIEBpZ25vcmVcbiAgICAqL1xuICAgIENvbGxlY3Rpb24uY2hlY2tDb2xsZWN0aW9uTmFtZSA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lKSB7XG4gICAgICAgIGlmICghXy5pc1N0cmluZyhjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZSBtdXN0IGJlIGEgU3RyaW5nXCIpO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIGlmICghY29sbGVjdGlvbk5hbWUgfHwgY29sbGVjdGlvbk5hbWUuaW5kZXhPZignLi4nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgY2Fubm90IGJlIGVtcHR5XCIpO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIGlmIChjb2xsZWN0aW9uTmFtZS5pbmRleE9mKCckJykgIT09IC0xICYmIGNvbGxlY3Rpb25OYW1lLm1hdGNoKC8oKF5cXCRjbWQpfChvcGxvZ1xcLlxcJG1haW4pKS8pID09PSBudWxsKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IGNvbnRhaW4gJyQnXCIpO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIGlmIChjb2xsZWN0aW9uTmFtZS5tYXRjaCgvXnN5c3RlbVxcLi8pICE9PSBudWxsKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IHN0YXJ0IHdpdGggJ3N5c3RlbS4nIChyZXNlcnZlZCBmb3IgaW50ZXJuYWwgdXNlKVwiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGNvbGxlY3Rpb25OYW1lLm1hdGNoKC9eXFwufFxcLiQvKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBzdGFydCBvciBlbmQgd2l0aCAnLidcIik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICogQGlnbm9yZVxuICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUucmVuYW1lID0gZnVuY3Rpb24obmV3TmFtZSkge1xuICAgICAgICBpZiAoXy5pc1N0cmluZyhuZXdOYW1lKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMubmFtZSAhPT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgICAgIENvbGxlY3Rpb24uY2hlY2tDb2xsZWN0aW9uTmFtZShuZXdOYW1lKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgZGJOYW1lID0gdGhpcy5uYW1lLnNwbGl0KCcuJykubGVuZ3RoID4gMSA/IHRoaXMubmFtZS5zcGxpdCgnLicpWzBdIDogJyc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5uYW1lID0gbmV3TmFtZTtcbiAgICAgICAgICAgICAgICB0aGlzLmZ1bGxOYW1lID0gZGJOYW1lICsgJy4nICsgdGhpcy5uYW1lO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRXJyb3JcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgc2l6ZSBvZiBhbiBvYmplY3QuXG4gICAgICogXG4gICAgICogQG1ldGhvZCBPYmplY3Qjc2l6ZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgb2JqZWN0XG4gICAgICogXG4gICAgICogQHJldHVybnMge051bWJlcn0gVGhlIHNpemUgb2YgdGhlIG9iamVjdFxuICAgICAqL1xuICAgIE9iamVjdC5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIHZhciBzaXplID0gMCwgXG4gICAgICAgICAgICBrZXk7XG4gICAgICAgIFxuICAgICAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgX2Vuc3VyZUZpbmRQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgLy8gc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrXG4gICAgICAgIGlmIChfLmlzTmlsKHBhcmFtcy5zZWxlY3Rpb24pKSBwYXJhbXMuc2VsZWN0aW9uID0ge307XG4gICAgXG4gICAgICAgIGlmIChfLmlzTmlsKHBhcmFtcy5zZWxlY3Rpb24pKSBwYXJhbXMuc2VsZWN0aW9uID0ge307XG4gICAgXG4gICAgICAgIGlmIChfLmlzTmlsKHBhcmFtcy5maWVsZHMpKSBwYXJhbXMuZmllbGRzID0gW107XG4gICAgXG4gICAgICAgIGlmIChfLmlzTmlsKHBhcmFtcy5vcHRpb25zKSkge1xuICAgICAgICAgICAgcGFyYW1zLm9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgICAgICBsaW1pdDogMTUgLy8gZm9yIG5vIGxpbWl0IHBhc3MgW29wdGlvbnMubGltaXQgPSAtMV1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy8gY2FsbGJhY2sgYXMgZmlyc3QgcGFyYW1ldGVyXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ocGFyYW1zLnNlbGVjdGlvbikpIHtcbiAgICAgICAgICAgIHBhcmFtcy5jYWxsYmFjayA9IHBhcmFtcy5zZWxlY3Rpb247XG4gICAgICAgICAgICBwYXJhbXMuc2VsZWN0aW9uID0ge307XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy8gY2FsbGJhY2sgYXMgc2Vjb25kIHBhcmFtZXRlclxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5maWVsZHMpKSB7XG4gICAgICAgICAgICBwYXJhbXMuY2FsbGJhY2sgPSBwYXJhbXMuZmllbGRzO1xuICAgICAgICAgICAgcGFyYW1zLmZpZWxkcyA9IFtdO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIC8vIGNhbGxiYWNrIGFzIHRoaXJkIHBhcmFtZXRlclxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5vcHRpb25zKSkge1xuICAgICAgICAgICAgcGFyYW1zLmNhbGxiYWNrID0gcGFyYW1zLm9wdGlvbnM7XG4gICAgICAgICAgICBwYXJhbXMub3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICAgICAgaWYgKHBhcmFtcy5zZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICAgICAgcGFyYW1zLnNlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBfaWQ6IHBhcmFtcy5zZWxlY3Rpb25cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgaWYgKCFfLmlzTmlsKHBhcmFtcy5jYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihwYXJhbXMuY2FsbGJhY2spKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgaWYgKHBhcmFtcy5vcHRpb25zLmZpZWxkcykge1xuICAgICAgICAgICAgaWYgKF8uaXNOaWwocGFyYW1zLmZpZWxkcykgfHwgcGFyYW1zLmZpZWxkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuZmllbGRzID0gcGFyYW1zLm9wdGlvbnMuZmllbGRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIud2FybihcIkZpZWxkcyBhbHJlYWR5IHByZXNlbnQuIElnbm9yaW5nICdvcHRpb25zLmZpZWxkcycuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgIH07XG4gICAgXG4gICAgcmV0dXJuIENvbGxlY3Rpb247XG59OyJdfQ==
