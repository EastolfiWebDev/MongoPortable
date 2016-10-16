"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkNvbGxlY3Rpb24uanMiXSwibmFtZXMiOlsibG9nZ2VyIiwibW9kdWxlIiwiZXhwb3J0cyIsIkFnZ3JlZ2F0aW9uIiwiQ3Vyc29yIiwiU2VsZWN0b3IiLCJTZWxlY3Rvck1hdGNoZXIiLCJPYmplY3RJZCIsIkV2ZW50RW1pdHRlciIsIkxvZ2dlciIsIl8iLCJkYXRhYmFzZSIsIkNvbGxlY3Rpb24iLCJkYiIsImNvbGxlY3Rpb25OYW1lIiwib3B0aW9ucyIsImluc3RhbmNlIiwiaXNOaWwiLCJ0aHJvdyIsImlzUGxhaW5PYmplY3QiLCJjaGVja0NvbGxlY3Rpb25OYW1lIiwibmFtZSIsImRhdGFiYXNlTmFtZSIsImZ1bGxOYW1lIiwiZG9jcyIsImRvY19pbmRleGVzIiwic25hcHNob3RzIiwib3B0cyIsIm1lcmdlIiwiYXJncyIsImNiIiwiX3N0b3JlcyIsInByb3RvdHlwZSIsImluc2VydCIsImRvYyIsImNhbGxiYWNrIiwiaXNGdW5jdGlvbiIsIl9kb2MiLCJjbG9uZURlZXAiLCJpc051bWJlciIsIl9pZCIsInRvU3RyaW5nIiwiaXNTdHJpbmciLCJsZW5ndGgiLCJ0aW1lc3RhbXAiLCJnZW5lcmF0aW9uVGltZSIsInB1c2giLCJlbWl0IiwiY29sbGVjdGlvbiIsImNoYWluIiwiYnVsa0luc2VydCIsImlzQXJyYXkiLCJfZG9jcyIsImkiLCJmaW5kIiwic2VsZWN0aW9uIiwiZmllbGRzIiwicGFyYW1zIiwiX2Vuc3VyZUZpbmRQYXJhbXMiLCJjdXJzb3IiLCJzZWxlY3RvciIsImZldGNoIiwiZm9yY2VGZXRjaCIsImZpbmRPbmUiLCJyZXMiLCJoYXNOZXh0IiwibmV4dCIsInVwZGF0ZSIsInNraXAiLCJsaW1pdCIsIm11bHRpIiwidXBzZXJ0IiwiaW5zZXJ0ZWQiLCJ1cGRhdGVkIiwiZG9jdW1lbnRzIiwiY291bnQiLCJ1cGRhdGVkRG9jcyIsIm92ZXJyaWRlIiwiaGFzTW9kaWZpZXIiLCJrZXkiLCJtb2RpZmllciIsInN1YnN0ciIsInVwZGF0ZUFzTW9uZ28iLCJfZG9jVXBkYXRlIiwidGVzdCIsIndhcm4iLCJ2YWwiLCJfYXBwbHlNb2RpZmllciIsImlkeCIsIl9tb2RpZmllcnMiLCJrZXlwYXRoIiwidmFsdWUiLCJrZXlwYXJ0cyIsInNwbGl0IiwiX21vZGlmeSIsImRvY3VtZW50IiwibGV2ZWwiLCJwYXRoIiwiaXNOdW1lcmljIiwidGFyZ2V0IiwiY3JlYXRlIiwiaGFzSW4iLCJfbm9DcmVhdGVNb2RpZmllcnMiLCJpc09iamVjdCIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0b051bWJlciIsImlzRmluaXRlIiwicmVtb3ZlIiwianVzdE9uZSIsIk9iamVjdCIsInNpemUiLCJkcm9wIiwiZm9yRWFjaCIsInNwbGljZSIsImRlbGV0ZSIsImRlc3Ryb3kiLCJkcm9wSW5kZXhlcyIsImluZGV4ZXMiLCJzYXZlIiwiZW5zdXJlSW5kZXgiLCJiYWNrdXAiLCJiYWNrdXBJRCIsInJlc3VsdCIsImJhY2t1cHMiLCJpZCIsInJlbW92ZUJhY2t1cCIsInJlc3RvcmUiLCJzbmFwc2hvdENvdW50IiwiYmFja3VwRGF0YSIsImluZm8iLCJhZ2dyZWdhdGUiLCJwaXBlbGluZSIsImFnZ3JlZ2F0aW9uIiwic3RhZ2UiLCJ2YWxpZFN0YWdlIiwiJHVuc2V0IiwiJHBvcCIsIiRyZW5hbWUiLCIkcHVsbCIsIiRwdWxsQWxsIiwiJGluYyIsImZpZWxkIiwiYXJnIiwiJHNldCIsIiRwdXNoIiwieCIsIiRwdXNoQWxsIiwiJGFkZFRvU2V0IiwiaXNFYWNoIiwiayIsInZhbHVlcyIsImVxdWFsIiwicG9wIiwib3V0IiwiQXJyYXkiLCJtYXRjaCIsIl9kb2NfIiwiX19tYXRjaGluZ19fIiwiZXhjbHVkZSIsImoiLCJ0cmltIiwiJGJpdCIsImluZGV4T2YiLCJyZW5hbWUiLCJuZXdOYW1lIiwiZGJOYW1lIiwib2JqIiwiaGFzT3duUHJvcGVydHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7Ozs7OztBQVNBLElBQUlBLFNBQVMsSUFBYjs7QUFFQUMsT0FBT0MsT0FBUCxHQUFpQixVQUFTQyxXQUFULEVBQXNCQyxNQUF0QixFQUE4QkMsUUFBOUIsRUFBd0NDLGVBQXhDLEVBQXlEQyxRQUF6RCxFQUFtRUMsWUFBbkUsRUFBaUZDLE1BQWpGLEVBQXlGQyxDQUF6RixFQUE0Rjs7QUFFekc7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkEsUUFBSUMsV0FBVyxJQUFmOztBQWxCeUcsUUFtQm5HQyxVQW5CbUc7QUFBQTs7QUFvQnpHO0FBQ0ksNEJBQVlDLEVBQVosRUFBZ0JDLGNBQWhCLEVBQWdDQyxPQUFoQyxFQUF5QztBQUFBOztBQUFBOztBQUFBOztBQUdyQyxnQkFBSSxFQUFFLGlCQUFnQkgsVUFBbEIsQ0FBSixFQUFtQyxjQUFPLElBQUlBLFVBQUosQ0FBZUMsRUFBZixFQUFtQkMsY0FBbkIsRUFBbUNDLE9BQW5DLENBQVA7O0FBRW5DZixxQkFBU1MsT0FBT08sUUFBaEI7O0FBRUEsZ0JBQUlOLEVBQUVPLEtBQUYsQ0FBUUosRUFBUixDQUFKLEVBQWlCYixPQUFPa0IsS0FBUCxDQUFhLHVCQUFiOztBQUVqQixnQkFBSVIsRUFBRU8sS0FBRixDQUFRSCxjQUFSLENBQUosRUFBNkJkLE9BQU9rQixLQUFQLENBQWEsbUNBQWI7O0FBRTdCLGdCQUFJUixFQUFFTyxLQUFGLENBQVFGLE9BQVIsS0FBb0IsQ0FBQ0wsRUFBRVMsYUFBRixDQUFnQkosT0FBaEIsQ0FBekIsRUFBbURBLFVBQVUsRUFBVjs7QUFFbkRILHVCQUFXUSxtQkFBWCxDQUErQk4sY0FBL0I7O0FBRUE7QUFDQUgsdUJBQVdFLEVBQVg7QUFDQSxrQkFBS1EsSUFBTCxHQUFZUCxjQUFaO0FBQ0Esa0JBQUtRLFlBQUwsR0FBb0JULEdBQUdTLFlBQXZCO0FBQ0Esa0JBQUtDLFFBQUwsR0FBZ0IsTUFBS0QsWUFBTCxHQUFvQixHQUFwQixHQUEwQixNQUFLRCxJQUEvQztBQUNBLGtCQUFLRyxJQUFMLEdBQVksRUFBWjtBQUNBLGtCQUFLQyxXQUFMLEdBQW1CLEVBQW5CO0FBQ0Esa0JBQUtDLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxrQkFBS0MsSUFBTCxHQUFZLEVBQVosQ0F2QnFDLENBdUJyQjs7QUFFaEJqQixjQUFFa0IsS0FBRixDQUFRLE1BQUtELElBQWIsRUFBbUJaLE9BQW5COztBQUVBO0FBM0JxQztBQTRCeEM7O0FBakRvRztBQUFBO0FBQUEsaUNBbURoR00sSUFuRGdHLEVBbUQxRlEsSUFuRDBGLEVBbURwRkMsRUFuRG9GLEVBbURoRjtBQUNqQiwyRkFBV1QsSUFBWCxFQUFpQlEsSUFBakIsRUFBdUJDLEVBQXZCLEVBQTJCbkIsU0FBU29CLE9BQXBDO0FBQ0g7QUFyRG9HOztBQUFBO0FBQUEsTUFtQmhGdkIsWUFuQmdGOztBQXdEekc7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7OztBQWNBSSxlQUFXb0IsU0FBWCxDQUFxQkMsTUFBckIsR0FBOEIsVUFBVUMsR0FBVixFQUFlbkIsT0FBZixFQUF3Qm9CLFFBQXhCLEVBQWtDO0FBQzVELFlBQUl6QixFQUFFTyxLQUFGLENBQVFpQixHQUFSLENBQUosRUFBa0JsQyxPQUFPa0IsS0FBUCxDQUFhLHdCQUFiOztBQUVsQixZQUFJLENBQUNSLEVBQUVTLGFBQUYsQ0FBZ0JlLEdBQWhCLENBQUwsRUFBMkJsQyxPQUFPa0IsS0FBUCxDQUFhLHVCQUFiOztBQUUzQixZQUFJUixFQUFFTyxLQUFGLENBQVFGLE9BQVIsQ0FBSixFQUFzQkEsVUFBVSxFQUFWOztBQUV0QixZQUFJTCxFQUFFMEIsVUFBRixDQUFhckIsT0FBYixDQUFKLEVBQTJCO0FBQ3ZCb0IsdUJBQVdwQixPQUFYO0FBQ0FBLHNCQUFVLEVBQVY7QUFDSDs7QUFFRCxZQUFJLENBQUNMLEVBQUVPLEtBQUYsQ0FBUWtCLFFBQVIsQ0FBRCxJQUFzQixDQUFDekIsRUFBRTBCLFVBQUYsQ0FBYUQsUUFBYixDQUEzQixFQUFtRG5DLE9BQU9rQixLQUFQLENBQWEsNkJBQWI7O0FBRW5EO0FBQ0EsWUFBSW1CLE9BQU8zQixFQUFFNEIsU0FBRixDQUFZSixHQUFaLENBQVg7O0FBRUE7QUFDQSxZQUFJeEIsRUFBRTZCLFFBQUYsQ0FBV0YsS0FBS0csR0FBaEIsQ0FBSixFQUEwQjtBQUN0QkgsaUJBQUtHLEdBQUwsR0FBVzlCLEVBQUUrQixRQUFGLENBQVdKLEtBQUtHLEdBQWhCLENBQVg7QUFDSDs7QUFFRCxZQUFJOUIsRUFBRU8sS0FBRixDQUFRb0IsS0FBS0csR0FBYixLQUFzQixDQUFDSCxLQUFLRyxHQUFOLFlBQXFCakMsUUFBckIsS0FBa0MsQ0FBQ0csRUFBRWdDLFFBQUYsQ0FBV0wsS0FBS0csR0FBaEIsQ0FBRCxJQUF5QixDQUFDSCxLQUFLRyxHQUFMLENBQVNHLE1BQXJFLENBQTFCLEVBQXlHO0FBQ3JHTixpQkFBS0csR0FBTCxHQUFXLElBQUlqQyxRQUFKLEVBQVg7QUFDSDs7QUFFRDtBQUNBOEIsYUFBS08sU0FBTCxHQUFpQixJQUFJckMsUUFBSixHQUFlc0MsY0FBaEM7O0FBRUE7QUFDQSxhQUFLcEIsV0FBTCxDQUFpQmYsRUFBRStCLFFBQUYsQ0FBV0osS0FBS0csR0FBaEIsQ0FBakIsSUFBeUMsS0FBS2hCLElBQUwsQ0FBVW1CLE1BQW5EO0FBQ0EsYUFBS25CLElBQUwsQ0FBVXNCLElBQVYsQ0FBZVQsSUFBZjs7QUFFQTs7Ozs7Ozs7QUFRQSxhQUFLVSxJQUFMLENBQ0ksUUFESixFQUVJO0FBQ0lDLHdCQUFZLElBRGhCO0FBRUlkLGlCQUFLRztBQUZULFNBRko7O0FBUUEsWUFBSUYsUUFBSixFQUFjQSxTQUFTLElBQVQsRUFBZUUsSUFBZjs7QUFFZCxZQUFJdEIsUUFBUWtDLEtBQVosRUFBbUIsT0FBTyxJQUFQOztBQUVuQixlQUFPWixJQUFQO0FBQ0gsS0F0REQ7O0FBd0RBOzs7Ozs7Ozs7Ozs7OztBQWNBekIsZUFBV29CLFNBQVgsQ0FBcUJrQixVQUFyQixHQUFrQyxVQUFVMUIsSUFBVixFQUFnQlQsT0FBaEIsRUFBeUJvQixRQUF6QixFQUFtQztBQUNqRSxZQUFJekIsRUFBRU8sS0FBRixDQUFRTyxJQUFSLENBQUosRUFBbUJ4QixPQUFPa0IsS0FBUCxDQUFhLHlCQUFiOztBQUVuQixZQUFJLENBQUNSLEVBQUV5QyxPQUFGLENBQVUzQixJQUFWLENBQUwsRUFBc0J4QixPQUFPa0IsS0FBUCxDQUFhLHVCQUFiOztBQUV0QixZQUFJUixFQUFFTyxLQUFGLENBQVFGLE9BQVIsQ0FBSixFQUFzQkEsVUFBVSxFQUFWOztBQUV0QixZQUFJTCxFQUFFMEIsVUFBRixDQUFhckIsT0FBYixDQUFKLEVBQTJCO0FBQ3ZCb0IsdUJBQVdwQixPQUFYO0FBQ0FBLHNCQUFVLEVBQVY7QUFDSDs7QUFFRCxZQUFJLENBQUNMLEVBQUVPLEtBQUYsQ0FBUWtCLFFBQVIsQ0FBRCxJQUFzQixDQUFDekIsRUFBRTBCLFVBQUYsQ0FBYUQsUUFBYixDQUEzQixFQUFtRG5DLE9BQU9rQixLQUFQLENBQWEsNkJBQWI7O0FBRW5ELFlBQUlrQyxRQUFRLEVBQVo7O0FBRUEsYUFBSyxJQUFJQyxJQUFJLENBQWIsRUFBZ0JBLElBQUk3QixLQUFLbUIsTUFBekIsRUFBaUNVLEdBQWpDLEVBQXNDO0FBQ2xDLGdCQUFJbkIsTUFBTVYsS0FBSzZCLENBQUwsQ0FBVjs7QUFFQUQsa0JBQU1OLElBQU4sQ0FBVyxLQUFLYixNQUFMLENBQVlDLEdBQVosRUFBaUJuQixPQUFqQixDQUFYO0FBQ0g7O0FBRUQsWUFBSW9CLFFBQUosRUFBY0EsU0FBUyxJQUFULEVBQWVpQixLQUFmOztBQUVkLFlBQUlyQyxRQUFRa0MsS0FBWixFQUFtQixPQUFPLElBQVA7O0FBRW5CLGVBQU9HLEtBQVA7QUFDSCxLQTNCRDs7QUE2QkE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQXhDLGVBQVdvQixTQUFYLENBQXFCc0IsSUFBckIsR0FBNEIsVUFBVUMsU0FBVixFQUFxQkMsTUFBckIsRUFBNkJ6QyxPQUE3QixFQUFzQ29CLFFBQXRDLEVBQWdEO0FBQ3hFLFlBQUlzQixTQUFTQyxrQkFBa0I7QUFDM0JILHVCQUFXQSxTQURnQjtBQUUzQkMsb0JBQVFBLE1BRm1CO0FBRzNCekMscUJBQVNBLE9BSGtCO0FBSTNCb0Isc0JBQVVBO0FBSmlCLFNBQWxCLENBQWI7O0FBT0FvQixvQkFBWUUsT0FBT0YsU0FBbkI7QUFDQUMsaUJBQVNDLE9BQU9ELE1BQWhCO0FBQ0F6QyxrQkFBVTBDLE9BQU8xQyxPQUFqQjtBQUNBb0IsbUJBQVdzQixPQUFPdEIsUUFBbEI7O0FBRUEsWUFBSXdCLFNBQVMsSUFBSXZELE1BQUosQ0FBVyxLQUFLb0IsSUFBaEIsRUFBc0IrQixTQUF0QixFQUFpQ0MsTUFBakMsRUFBeUN6QyxPQUF6QyxDQUFiOztBQUVBOzs7Ozs7Ozs7QUFTQSxhQUFLZ0MsSUFBTCxDQUNJLE1BREosRUFFSTtBQUNJQyx3QkFBWSxJQURoQjtBQUVJWSxzQkFBVUwsU0FGZDtBQUdJQyxvQkFBUUE7QUFIWixTQUZKOztBQVNBO0FBQ0E7QUFDQSxZQUFJckIsUUFBSixFQUFjQSxTQUFTLElBQVQsRUFBZXdCLE9BQU9FLEtBQVAsRUFBZjs7QUFFZCxZQUFJOUMsUUFBUStDLFVBQVosRUFBd0I7QUFDcEIsbUJBQU9ILE9BQU9FLEtBQVAsRUFBUDtBQUNILFNBRkQsTUFFTztBQUNILG1CQUFPRixNQUFQO0FBQ0g7QUFDSixLQTFDRDs7QUE0Q0E7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJBL0MsZUFBV29CLFNBQVgsQ0FBcUIrQixPQUFyQixHQUErQixVQUFVUixTQUFWLEVBQXFCQyxNQUFyQixFQUE2QnpDLE9BQTdCLEVBQXNDb0IsUUFBdEMsRUFBZ0Q7QUFDM0UsWUFBSXNCLFNBQVNDLGtCQUFrQjtBQUMzQkgsdUJBQVdBLFNBRGdCO0FBRTNCQyxvQkFBUUEsTUFGbUI7QUFHM0J6QyxxQkFBU0EsT0FIa0I7QUFJM0JvQixzQkFBVUE7QUFKaUIsU0FBbEIsQ0FBYjs7QUFPQW9CLG9CQUFZRSxPQUFPRixTQUFuQjtBQUNBQyxpQkFBU0MsT0FBT0QsTUFBaEI7QUFDQXpDLGtCQUFVMEMsT0FBTzFDLE9BQWpCO0FBQ0FvQixtQkFBV3NCLE9BQU90QixRQUFsQjs7QUFFQSxZQUFJd0IsU0FBUyxJQUFJdkQsTUFBSixDQUFXLEtBQUtvQixJQUFoQixFQUFzQitCLFNBQXRCLEVBQWlDQyxNQUFqQyxFQUF5Q3pDLE9BQXpDLENBQWI7O0FBRUE7Ozs7Ozs7OztBQVNBLGFBQUtnQyxJQUFMLENBQ0ksU0FESixFQUVJO0FBQ0lDLHdCQUFZLElBRGhCO0FBRUlZLHNCQUFVTCxTQUZkO0FBR0lDLG9CQUFRQTtBQUhaLFNBRko7O0FBU0EsWUFBSVEsTUFBTSxJQUFWOztBQUVBLFlBQUlMLE9BQU9NLE9BQVAsRUFBSixFQUFzQjtBQUNsQkQsa0JBQU1MLE9BQU9PLElBQVAsRUFBTjtBQUNIOztBQUVEO0FBQ0E7QUFDQSxZQUFJL0IsUUFBSixFQUFjQSxTQUFTLElBQVQsRUFBZTZCLEdBQWY7O0FBRWQsZUFBT0EsR0FBUDtBQUNILEtBNUNEOztBQStDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBOEJBcEQsZUFBV29CLFNBQVgsQ0FBcUJtQyxNQUFyQixHQUE4QixVQUFVWixTQUFWLEVBQXFCWSxNQUFyQixFQUE2QnBELE9BQTdCLEVBQXNDb0IsUUFBdEMsRUFBZ0Q7QUFDMUUsWUFBSXpCLEVBQUVPLEtBQUYsQ0FBUXNDLFNBQVIsQ0FBSixFQUF3QkEsWUFBWSxFQUFaOztBQUV4QixZQUFJN0MsRUFBRU8sS0FBRixDQUFRa0QsTUFBUixDQUFKLEVBQXFCbkUsT0FBT2tCLEtBQVAsQ0FBYSx1Q0FBYjs7QUFFckIsWUFBSVIsRUFBRU8sS0FBRixDQUFRRixPQUFSLENBQUosRUFBc0I7QUFDbEJBLHNCQUFVO0FBQ05xRCxzQkFBTSxDQURBO0FBRU5DLHVCQUFPLEVBRkQsQ0FFTTtBQUZOLGFBQVY7QUFJSDs7QUFFRCxZQUFJM0QsRUFBRTBCLFVBQUYsQ0FBYW1CLFNBQWIsQ0FBSixFQUE2QnZELE9BQU9rQixLQUFQLENBQWEsdUNBQWI7O0FBRTdCLFlBQUlSLEVBQUUwQixVQUFGLENBQWErQixNQUFiLENBQUosRUFBMEJuRSxPQUFPa0IsS0FBUCxDQUFhLHVDQUFiOztBQUUxQixZQUFJUixFQUFFMEIsVUFBRixDQUFhckIsT0FBYixDQUFKLEVBQTJCO0FBQ3ZCb0IsdUJBQVdwQixPQUFYO0FBQ0FBLHNCQUFVLEVBQVY7QUFDSDs7QUFFRDtBQUNBLFlBQUd3QyxxQkFBcUJoRCxRQUF4QixFQUFrQztBQUM5QmdELHdCQUFZO0FBQ1JmLHFCQUFLZTtBQURHLGFBQVo7QUFHSDs7QUFFRCxZQUFJLENBQUM3QyxFQUFFTyxLQUFGLENBQVFrQixRQUFSLENBQUQsSUFBc0IsQ0FBQ3pCLEVBQUUwQixVQUFGLENBQWFELFFBQWIsQ0FBM0IsRUFBbURuQyxPQUFPa0IsS0FBUCxDQUFhLDZCQUFiOztBQUVuRCxZQUFJOEMsTUFBTSxJQUFWOztBQUVBLFlBQUl4QyxPQUFPLElBQVg7QUFDQSxZQUFJVCxRQUFRdUQsS0FBWixFQUFtQjtBQUNmOUMsbUJBQU8sS0FBSzhCLElBQUwsQ0FBVUMsU0FBVixFQUFxQixJQUFyQixFQUEyQixFQUFFTyxZQUFZLElBQWQsRUFBM0IsQ0FBUDtBQUNILFNBRkQsTUFFTztBQUNIdEMsbUJBQU8sS0FBS3VDLE9BQUwsQ0FBYVIsU0FBYixDQUFQO0FBQ0g7O0FBRUQsWUFBSTdDLEVBQUVPLEtBQUYsQ0FBUU8sSUFBUixDQUFKLEVBQW1CO0FBQ2ZBLG1CQUFPLEVBQVA7QUFDSDs7QUFFRCxZQUFJLENBQUNkLEVBQUV5QyxPQUFGLENBQVUzQixJQUFWLENBQUwsRUFBc0I7QUFDbEJBLG1CQUFPLENBQUNBLElBQUQsQ0FBUDtBQUNIOztBQUVELFlBQUlBLEtBQUttQixNQUFMLEtBQWdCLENBQXBCLEVBQXVCO0FBQ25CLGdCQUFJNUIsUUFBUXdELE1BQVosRUFBb0I7QUFDaEIsb0JBQUlDLFdBQVcsS0FBS3ZDLE1BQUwsQ0FBWWtDLE1BQVosQ0FBZjs7QUFFQUgsc0JBQU07QUFDRlMsNkJBQVM7QUFDTEMsbUNBQVcsSUFETjtBQUVMQywrQkFBTztBQUZGLHFCQURQO0FBS0ZILDhCQUFVO0FBQ05FLG1DQUFXLENBQUNGLFFBQUQsQ0FETDtBQUVORywrQkFBTztBQUZEO0FBTFIsaUJBQU47QUFVSCxhQWJELE1BYU87QUFDSDtBQUNBWCxzQkFBTTtBQUNGUyw2QkFBUztBQUNMQyxtQ0FBVyxJQUROO0FBRUxDLCtCQUFPO0FBRkYscUJBRFA7QUFLRkgsOEJBQVU7QUFDTkUsbUNBQVcsSUFETDtBQUVOQywrQkFBTztBQUZEO0FBTFIsaUJBQU47QUFVSDtBQUNKLFNBM0JELE1BMkJPO0FBQ0gsZ0JBQUlDLGNBQWMsRUFBbEI7O0FBRUEsaUJBQUssSUFBSXZCLElBQUksQ0FBYixFQUFnQkEsSUFBSTdCLEtBQUttQixNQUF6QixFQUFpQ1UsR0FBakMsRUFBc0M7QUFDbEMsb0JBQUluQixNQUFNVixLQUFLNkIsQ0FBTCxDQUFWOztBQUVBLG9CQUFJd0IsV0FBVyxJQUFmOztBQUVBLG9CQUFJQyxjQUFjLEtBQWxCOztBQUVBLHFCQUFLLElBQUlDLEdBQVQsSUFBZ0JaLE1BQWhCLEVBQXdCO0FBQ3BCO0FBQ0E7QUFDQTs7QUFFQSx3QkFBSWEsV0FBWUQsSUFBSUUsTUFBSixDQUFXLENBQVgsRUFBYyxDQUFkLE1BQXFCLEdBQXJDO0FBQ0Esd0JBQUlELFFBQUosRUFBYztBQUNWRixzQ0FBYyxJQUFkO0FBQ0g7O0FBRUQsd0JBQUkvRCxRQUFRbUUsYUFBWixFQUEyQjtBQUN2Qiw0QkFBSUosZUFBZSxDQUFDRSxRQUFwQixFQUE4QmhGLE9BQU9rQixLQUFQLENBQWEsOENBQWI7O0FBRTlCLDRCQUFJLENBQUM0RCxXQUFELElBQWdCL0QsUUFBUXVELEtBQTVCLEVBQW1DdEUsT0FBT2tCLEtBQVAsQ0FBYSw0RUFBYjs7QUFFbkMsNEJBQUk0RCxXQUFKLEVBQWlCRCxXQUFXLEtBQVg7O0FBRWpCLDRCQUFJLENBQUNDLFdBQUwsRUFBa0JELFdBQVcsSUFBWDtBQUNyQixxQkFSRCxNQVFPO0FBQ0hBLG1DQUFXLENBQUMsQ0FBQzlELFFBQVE4RCxRQUFyQjtBQUNIO0FBQ0o7O0FBRUQsb0JBQUlNLGFBQWEsSUFBakI7O0FBRUEsb0JBQUlOLFFBQUosRUFBYztBQUNWO0FBQ0FNLGlDQUFhO0FBQ1QzQyw2QkFBS04sSUFBSU07QUFEQSxxQkFBYjs7QUFJQTtBQUNBLHlCQUFLLElBQUl1QyxJQUFULElBQWdCWixNQUFoQixFQUF3QjtBQUNwQiw0QkFBSVksS0FBSUUsTUFBSixDQUFXLENBQVgsRUFBYyxDQUFkLE1BQXFCLEdBQXJCLElBQTRCLE1BQU1HLElBQU4sQ0FBV0wsSUFBWCxDQUFoQyxFQUFpRDtBQUM3Qy9FLG1DQUFPcUYsSUFBUCxnQkFBeUJOLElBQXpCO0FBQ0gseUJBRkQsTUFFTztBQUNISSx1Q0FBV0osSUFBWCxJQUFrQlosT0FBT1ksSUFBUCxDQUFsQjtBQUNIO0FBQ0o7QUFDSixpQkFkRCxNQWNPO0FBQ0hJLGlDQUFhekUsRUFBRTRCLFNBQUYsQ0FBWUosR0FBWixDQUFiOztBQUVBLHlCQUFLLElBQUk2QyxLQUFULElBQWdCWixNQUFoQixFQUF3QjtBQUNwQiw0QkFBSW1CLE1BQU1uQixPQUFPWSxLQUFQLENBQVY7O0FBRUEsNEJBQUlBLE1BQUlFLE1BQUosQ0FBVyxDQUFYLEVBQWMsQ0FBZCxNQUFxQixHQUF6QixFQUE4QjtBQUMxQkUseUNBQWFJLGVBQWVKLFVBQWYsRUFBMkJKLEtBQTNCLEVBQWdDTyxHQUFoQyxDQUFiO0FBQ0gseUJBRkQsTUFFTztBQUNILGdDQUFJLENBQUM1RSxFQUFFTyxLQUFGLENBQVFrRSxXQUFXSixLQUFYLENBQVIsQ0FBTCxFQUErQjtBQUMzQixvQ0FBSUEsVUFBUSxLQUFaLEVBQW1CO0FBQ2ZJLCtDQUFXSixLQUFYLElBQWtCTyxHQUFsQjtBQUNILGlDQUZELE1BRU87QUFDSHRGLDJDQUFPcUYsSUFBUCxDQUFZLG9DQUFaO0FBQ0g7QUFDSiw2QkFORCxNQU1PO0FBQ0hyRix1Q0FBT3FGLElBQVAsK0NBQXdETixLQUF4RDtBQUNIO0FBQ0o7QUFDSjtBQUNKOztBQUVESCw0QkFBWTlCLElBQVosQ0FBaUJxQyxVQUFqQjs7QUFFQSxvQkFBSUssTUFBTSxLQUFLL0QsV0FBTCxDQUFpQjBELFdBQVczQyxHQUE1QixDQUFWO0FBQ0EscUJBQUtoQixJQUFMLENBQVVnRSxHQUFWLElBQWlCTCxVQUFqQjtBQUNIOztBQUVEOzs7Ozs7Ozs7O0FBVUEsaUJBQUtwQyxJQUFMLENBQ0ksUUFESixFQUVJO0FBQ0lDLDRCQUFZLElBRGhCO0FBRUlZLDBCQUFVTCxTQUZkO0FBR0l5QiwwQkFBVWIsTUFIZDtBQUlJM0Msc0JBQU1vRDtBQUpWLGFBRko7O0FBVUFaLGtCQUFNO0FBQ0ZTLHlCQUFTO0FBQ0xDLCtCQUFXRSxXQUROO0FBRUxELDJCQUFPQyxZQUFZakM7QUFGZCxpQkFEUDtBQUtGNkIsMEJBQVU7QUFDTkUsK0JBQVcsSUFETDtBQUVOQywyQkFBTztBQUZEO0FBTFIsYUFBTjtBQVVIOztBQUdELFlBQUl4QyxRQUFKLEVBQWNBLFNBQVMsSUFBVCxFQUFlNkIsR0FBZjs7QUFFZCxlQUFPQSxHQUFQO0FBQ0gsS0EzTEQ7O0FBNkxBLFFBQUl1QixpQkFBaUIsU0FBakJBLGNBQWlCLENBQVNKLFVBQVQsRUFBcUJKLEdBQXJCLEVBQTBCTyxHQUExQixFQUErQjtBQUNoRCxZQUFJcEQsTUFBTXhCLEVBQUU0QixTQUFGLENBQVk2QyxVQUFaLENBQVY7QUFDQTs7QUFFQSxZQUFJLENBQUNNLFdBQVdWLEdBQVgsQ0FBTCxFQUFzQjtBQUNsQi9FLG1CQUFPa0IsS0FBUCxrQ0FBNEM2RCxHQUE1QztBQUNIOztBQUVELGFBQUssSUFBSVcsT0FBVCxJQUFvQkosR0FBcEIsRUFBeUI7QUFDckIsZ0JBQUlLLFFBQVFMLElBQUlJLE9BQUosQ0FBWjtBQUNBLGdCQUFJRSxXQUFXRixRQUFRRyxLQUFSLENBQWMsR0FBZCxDQUFmOztBQUVBQyxvQkFBUTVELEdBQVIsRUFBYTBELFFBQWIsRUFBdUJELEtBQXZCLEVBQThCWixHQUE5Qjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNIOztBQUVELGVBQU83QyxHQUFQO0FBQ0gsS0F2QkQ7O0FBeUJBLFFBQUk0RCxVQUFVLFNBQVZBLE9BQVUsQ0FBU0MsUUFBVCxFQUFtQkgsUUFBbkIsRUFBNkJELEtBQTdCLEVBQW9DWixHQUFwQyxFQUFvRDtBQUFBLFlBQVhpQixLQUFXLHlEQUFILENBQUc7O0FBQzlELGFBQUssSUFBSTNDLElBQUkyQyxLQUFiLEVBQW9CM0MsSUFBSXVDLFNBQVNqRCxNQUFqQyxFQUF5Q1UsR0FBekMsRUFBOEM7QUFDMUMsZ0JBQUk0QyxPQUFPTCxTQUFTdkMsQ0FBVCxDQUFYO0FBQ0EsZ0JBQUk2QyxZQUFZLFdBQVdkLElBQVgsQ0FBZ0JhLElBQWhCLENBQWhCO0FBQ0EsZ0JBQUlFLFNBQVNKLFNBQVNFLElBQVQsQ0FBYjs7QUFFQSxnQkFBSUcsU0FBUzFGLEVBQUUyRixLQUFGLENBQVF6RixXQUFXMEYsa0JBQW5CLEVBQXVDdkIsR0FBdkMsSUFBOEMsS0FBOUMsR0FBc0QsSUFBbkU7QUFDQSxnQkFBSSxDQUFDcUIsTUFBRCxLQUFZLENBQUMxRixFQUFFNkYsUUFBRixDQUFXUixRQUFYLENBQUQsSUFBeUJyRixFQUFFTyxLQUFGLENBQVFrRixNQUFSLENBQXJDLENBQUosRUFBMkQ7QUFDdkRuRyx1QkFBT2tCLEtBQVAsb0JBQTZCK0UsSUFBN0IsNEJBQXNETyxLQUFLQyxTQUFMLENBQWVWLFFBQWYsQ0FBdEQ7QUFDSDs7QUFFRCxnQkFBSXJGLEVBQUV5QyxPQUFGLENBQVU0QyxRQUFWLENBQUosRUFBeUI7QUFDckI7QUFDQSxvQkFBSWhCLFFBQVEsU0FBWixFQUF1QixPQUFPLElBQVA7O0FBRXZCO0FBQ0Esb0JBQUltQixTQUFKLEVBQWU7QUFDWEQsMkJBQU92RixFQUFFZ0csUUFBRixDQUFXVCxJQUFYLENBQVA7QUFDSCxpQkFGRCxNQUVPO0FBQ0hqRywyQkFBT2tCLEtBQVAsa0JBQTJCK0UsSUFBM0I7QUFDSDs7QUFFRDtBQUNBLHVCQUFPRixTQUFTcEQsTUFBVCxHQUFrQnNELElBQXpCLEVBQStCO0FBQzNCRiw2QkFBU2pELElBQVQsQ0FBYyxJQUFkO0FBQ0g7QUFDSjs7QUFFRCxnQkFBSU8sSUFBSXVDLFNBQVNqRCxNQUFULEdBQWtCLENBQTFCLEVBQTZCO0FBQ3pCLG9CQUFJakMsRUFBRU8sS0FBRixDQUFRa0YsTUFBUixDQUFKLEVBQXFCO0FBQ2pCO0FBQ0Esd0JBQUl6RixFQUFFaUcsUUFBRixDQUFXakcsRUFBRWdHLFFBQUYsQ0FBV2QsU0FBU3ZDLElBQUksQ0FBYixDQUFYLENBQVgsQ0FBSixFQUE2QztBQUFHO0FBQzVDOEMsaUNBQVMsRUFBVDtBQUNILHFCQUZELE1BRU87QUFDSEEsaUNBQVMsRUFBVDtBQUNIO0FBQ0o7O0FBRURKLHlCQUFTRSxJQUFULElBQWlCSCxRQUFRSyxNQUFSLEVBQWdCUCxRQUFoQixFQUEwQkQsS0FBMUIsRUFBaUNaLEdBQWpDLEVBQXNDaUIsUUFBUSxDQUE5QyxDQUFqQjs7QUFFQSx1QkFBT0QsUUFBUDtBQUNILGFBYkQsTUFhTztBQUNITiwyQkFBV1YsR0FBWCxFQUFnQmdCLFFBQWhCLEVBQTBCRSxJQUExQixFQUFnQ04sS0FBaEM7O0FBRUEsdUJBQU9JLFFBQVA7QUFDSDtBQUNKO0FBQ0osS0EvQ0Q7O0FBaURBOzs7Ozs7Ozs7Ozs7Ozs7QUFlQW5GLGVBQVdvQixTQUFYLENBQXFCNEUsTUFBckIsR0FBOEIsVUFBVXJELFNBQVYsRUFBcUJ4QyxPQUFyQixFQUE4Qm9CLFFBQTlCLEVBQXdDO0FBQUE7O0FBQ2xFLFlBQUl6QixFQUFFTyxLQUFGLENBQVFzQyxTQUFSLENBQUosRUFBd0JBLFlBQVksRUFBWjs7QUFFeEIsWUFBSTdDLEVBQUUwQixVQUFGLENBQWFtQixTQUFiLENBQUosRUFBNkI7QUFDekJwQix1QkFBV29CLFNBQVg7QUFDQUEsd0JBQVksRUFBWjtBQUNIOztBQUVELFlBQUk3QyxFQUFFMEIsVUFBRixDQUFhckIsT0FBYixDQUFKLEVBQTJCO0FBQ3ZCb0IsdUJBQVdwQixPQUFYO0FBQ0FBLHNCQUFVLEVBQVY7QUFDSDs7QUFFRCxZQUFJTCxFQUFFTyxLQUFGLENBQVFGLE9BQVIsQ0FBSixFQUFzQkEsVUFBVSxFQUFFOEYsU0FBUyxLQUFYLEVBQVY7O0FBRXRCO0FBQ0EsWUFBSUMsT0FBT0MsSUFBUCxDQUFZeEQsU0FBWixNQUEyQixDQUEzQixJQUFnQyxDQUFDeEMsUUFBUThGLE9BQTdDLEVBQXNELE9BQU8sS0FBS0csSUFBTCxDQUFVakcsT0FBVixFQUFtQm9CLFFBQW5CLENBQVA7O0FBRXREO0FBQ0EsWUFBR29CLHFCQUFxQmhELFFBQXhCLEVBQWtDO0FBQzlCZ0Qsd0JBQVk7QUFDUmYscUJBQUtlO0FBREcsYUFBWjtBQUdIOztBQUVELFlBQUksQ0FBQzdDLEVBQUVPLEtBQUYsQ0FBUWtCLFFBQVIsQ0FBRCxJQUFzQixDQUFDekIsRUFBRTBCLFVBQUYsQ0FBYUQsUUFBYixDQUEzQixFQUFtRG5DLE9BQU9rQixLQUFQLENBQWEsNkJBQWI7O0FBRW5ELFlBQUl5QyxTQUFTLEtBQUtMLElBQUwsQ0FBVUMsU0FBVixDQUFiOztBQUVBLFlBQUkvQixPQUFPLEVBQVg7QUFDQW1DLGVBQU9zRCxPQUFQLENBQWUsZUFBTztBQUNsQixnQkFBSXpCLE1BQU0sT0FBSy9ELFdBQUwsQ0FBaUJTLElBQUlNLEdBQXJCLENBQVY7O0FBRUEsbUJBQU8sT0FBS2YsV0FBTCxDQUFpQlMsSUFBSU0sR0FBckIsQ0FBUDtBQUNBLG1CQUFLaEIsSUFBTCxDQUFVMEYsTUFBVixDQUFpQjFCLEdBQWpCLEVBQXNCLENBQXRCOztBQUVBaEUsaUJBQUtzQixJQUFMLENBQVVaLEdBQVY7QUFDSCxTQVBEOztBQVNBOzs7Ozs7Ozs7QUFTQSxhQUFLYSxJQUFMLENBQ0ksUUFESixFQUVJO0FBQ0lDLHdCQUFZLElBRGhCO0FBRUlZLHNCQUFVTCxTQUZkO0FBR0kvQixrQkFBTUE7QUFIVixTQUZKOztBQVNBLFlBQUlXLFFBQUosRUFBY0EsU0FBUyxJQUFULEVBQWVYLElBQWY7O0FBRWQsZUFBT0EsSUFBUDtBQUNILEtBNUREOztBQThEQTs7Ozs7QUFLQVosZUFBV29CLFNBQVgsQ0FBcUJtRixNQUFyQixHQUE4QixVQUFVNUQsU0FBVixFQUFxQnhDLE9BQXJCLEVBQThCb0IsUUFBOUIsRUFBd0M7QUFDbEUsZUFBTyxLQUFLeUUsTUFBTCxDQUFZckQsU0FBWixFQUF1QnhDLE9BQXZCLEVBQWdDb0IsUUFBaEMsQ0FBUDtBQUNILEtBRkQ7O0FBSUM7Ozs7O0FBS0R2QixlQUFXb0IsU0FBWCxDQUFxQm9GLE9BQXJCLEdBQStCLFVBQVU3RCxTQUFWLEVBQXFCeEMsT0FBckIsRUFBOEJvQixRQUE5QixFQUF3QztBQUNuRSxlQUFPLEtBQUt5RSxNQUFMLENBQVlyRCxTQUFaLEVBQXVCeEMsT0FBdkIsRUFBZ0NvQixRQUFoQyxDQUFQO0FBQ0gsS0FGRDs7QUFJQTs7Ozs7Ozs7Ozs7Ozs7QUFjQXZCLGVBQVdvQixTQUFYLENBQXFCZ0YsSUFBckIsR0FBNEIsVUFBU2pHLE9BQVQsRUFBa0JvQixRQUFsQixFQUE0QjtBQUNwRCxZQUFJekIsRUFBRU8sS0FBRixDQUFRRixPQUFSLENBQUosRUFBc0JBLFVBQVUsRUFBVjs7QUFFdEIsWUFBSUwsRUFBRTBCLFVBQUYsQ0FBYXJCLE9BQWIsQ0FBSixFQUEyQjtBQUN2Qm9CLHVCQUFXcEIsT0FBWDtBQUNBQSxzQkFBVSxFQUFWO0FBQ0g7O0FBRUQsWUFBSSxDQUFDTCxFQUFFTyxLQUFGLENBQVFrQixRQUFSLENBQUQsSUFBc0IsQ0FBQ3pCLEVBQUUwQixVQUFGLENBQWFELFFBQWIsQ0FBM0IsRUFBbURuQyxPQUFPa0IsS0FBUCxDQUFhLDZCQUFiOztBQUVuRCxhQUFLTyxXQUFMLEdBQW1CLEVBQW5CO0FBQ0EsYUFBS0QsSUFBTCxHQUFZLEVBQVo7O0FBRUEsWUFBSVQsUUFBUXNHLFdBQVosRUFBeUIsQ0FBRSxDQWJ5QixDQWF4Qjs7QUFFNUIsYUFBS3RFLElBQUwsQ0FDSSxnQkFESixFQUVJO0FBQ0lDLHdCQUFZLElBRGhCO0FBRUlzRSxxQkFBUyxDQUFDLENBQUN2RyxRQUFRc0c7QUFGdkIsU0FGSjs7QUFRQSxZQUFJbEYsUUFBSixFQUFjQSxTQUFTLElBQVQsRUFBZSxJQUFmOztBQUVkLGVBQU8sSUFBUDtBQUNILEtBMUJEOztBQTRCQTs7Ozs7Ozs7Ozs7Ozs7QUFjQXZCLGVBQVdvQixTQUFYLENBQXFCdUYsSUFBckIsR0FBNEIsVUFBU3JGLEdBQVQsRUFBY25CLE9BQWQsRUFBdUJvQixRQUF2QixFQUFpQztBQUN6RCxZQUFJekIsRUFBRU8sS0FBRixDQUFRaUIsR0FBUixLQUFnQnhCLEVBQUUwQixVQUFGLENBQWFGLEdBQWIsQ0FBcEIsRUFBdUNsQyxPQUFPa0IsS0FBUCxDQUFhLDBCQUFiOztBQUV2QyxZQUFJUixFQUFFMEIsVUFBRixDQUFhckIsT0FBYixDQUFKLEVBQTJCO0FBQ3ZCb0IsdUJBQVdwQixPQUFYO0FBQ0FBLHNCQUFVLEVBQVY7QUFDSDs7QUFFRCxZQUFJTCxFQUFFMkYsS0FBRixDQUFRbkUsR0FBUixFQUFhLEtBQWIsQ0FBSixFQUF5QjtBQUNyQm5CLG9CQUFRd0QsTUFBUixHQUFpQixJQUFqQjs7QUFFQSxtQkFBTyxLQUFLSixNQUFMLENBQ0gsRUFBRTNCLEtBQUtOLElBQUlNLEdBQVgsRUFERyxFQUVITixHQUZHLEVBR0huQixPQUhHLEVBSUhvQixRQUpHLENBQVA7QUFNSCxTQVRELE1BU087QUFDSCxtQkFBTyxLQUFLRixNQUFMLENBQVlDLEdBQVosRUFBaUJuQixPQUFqQixFQUEwQm9CLFFBQTFCLENBQVA7QUFDSDtBQUNKLEtBcEJEOztBQXNCQTs7O0FBR0F2QixlQUFXb0IsU0FBWCxDQUFxQndGLFdBQXJCLEdBQW1DLFlBQVc7QUFDMUM7QUFDQXhILGVBQU9rQixLQUFQLENBQWEsZ0RBQWI7QUFDSCxLQUhEOztBQUtBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQU4sZUFBV29CLFNBQVgsQ0FBcUJ5RixNQUFyQixHQUE4QixVQUFVQyxRQUFWLEVBQW9CdkYsUUFBcEIsRUFBOEI7QUFDeEQsWUFBSXpCLEVBQUUwQixVQUFGLENBQWFzRixRQUFiLENBQUosRUFBNEI7QUFDeEJ2Rix1QkFBV3VGLFFBQVg7QUFDQUEsdUJBQVcsSUFBSW5ILFFBQUosR0FBZWtDLFFBQWYsRUFBWDtBQUNIOztBQUVELFlBQUksQ0FBQy9CLEVBQUVPLEtBQUYsQ0FBUWtCLFFBQVIsQ0FBRCxJQUFzQixDQUFDekIsRUFBRTBCLFVBQUYsQ0FBYUQsUUFBYixDQUEzQixFQUFtRG5DLE9BQU9rQixLQUFQLENBQWEsNkJBQWI7O0FBRW5ELGFBQUtRLFNBQUwsQ0FBZWdHLFFBQWYsSUFBMkJoSCxFQUFFNEIsU0FBRixDQUFZLEtBQUtkLElBQWpCLENBQTNCO0FBQ0EsYUFBS3VCLElBQUwsQ0FDSSxVQURKLEVBRUk7QUFDSUMsd0JBQVksSUFEaEI7QUFFSTBFLHNCQUFVQSxRQUZkO0FBR0loRCx1QkFBVyxLQUFLaEQsU0FBTCxDQUFlZ0csUUFBZjtBQUhmLFNBRko7O0FBU0EsWUFBSUMsU0FBUztBQUNURCxzQkFBVUEsUUFERDtBQUVUaEQsdUJBQVcsS0FBS2hELFNBQUwsQ0FBZWdHLFFBQWY7QUFGRixTQUFiOztBQUtBLFlBQUl2RixRQUFKLEVBQWNBLFNBQVMsSUFBVCxFQUFld0YsTUFBZjs7QUFFZCxlQUFPQSxNQUFQO0FBQ0gsS0ExQkQ7O0FBNEJBO0FBQ0E7OztBQUdBL0csZUFBV29CLFNBQVgsQ0FBcUI0RixPQUFyQixHQUErQixVQUFVekYsUUFBVixFQUFvQjtBQUMvQyxZQUFJLENBQUN6QixFQUFFTyxLQUFGLENBQVFrQixRQUFSLENBQUQsSUFBc0IsQ0FBQ3pCLEVBQUUwQixVQUFGLENBQWFELFFBQWIsQ0FBM0IsRUFBbURuQyxPQUFPa0IsS0FBUCxDQUFhLDZCQUFiOztBQUVuRCxZQUFJMEcsVUFBVSxFQUFkOztBQUVBLGFBQUssSUFBSUMsRUFBVCxJQUFlLEtBQUtuRyxTQUFwQixFQUErQjtBQUMzQmtHLG9CQUFROUUsSUFBUixDQUFhLEVBQUMrRSxJQUFJQSxFQUFMLEVBQVNuRCxXQUFXLEtBQUtoRCxTQUFMLENBQWVtRyxFQUFmLENBQXBCLEVBQWI7QUFDSDs7QUFFRCxZQUFJMUYsUUFBSixFQUFjQSxTQUFTLElBQVQsRUFBZXlGLE9BQWY7O0FBRWQsZUFBT0EsT0FBUDtBQUNILEtBWkQ7O0FBY0E7QUFDQTs7O0FBR0FoSCxlQUFXb0IsU0FBWCxDQUFxQjhGLFlBQXJCLEdBQW9DLFVBQVVKLFFBQVYsRUFBb0J2RixRQUFwQixFQUE4QjtBQUM5RCxZQUFJekIsRUFBRTBCLFVBQUYsQ0FBYXNGLFFBQWIsQ0FBSixFQUE0QjtBQUN4QnZGLHVCQUFXdUYsUUFBWDtBQUNBQSx1QkFBVyxJQUFYO0FBQ0g7O0FBRUQsWUFBSSxDQUFDaEgsRUFBRU8sS0FBRixDQUFRa0IsUUFBUixDQUFELElBQXNCLENBQUN6QixFQUFFMEIsVUFBRixDQUFhRCxRQUFiLENBQTNCLEVBQW1EbkMsT0FBT2tCLEtBQVAsQ0FBYSw2QkFBYjs7QUFFbkQsWUFBSXlHLFNBQVMsS0FBYjs7QUFFQSxZQUFJRCxRQUFKLEVBQWM7QUFDVixtQkFBTyxLQUFLaEcsU0FBTCxDQUFlaEIsRUFBRStCLFFBQUYsQ0FBV2lGLFFBQVgsQ0FBZixDQUFQOztBQUVBQyxxQkFBU0QsUUFBVDtBQUNILFNBSkQsTUFJTztBQUNILGlCQUFLaEcsU0FBTCxHQUFpQixFQUFqQjs7QUFFQWlHLHFCQUFTLElBQVQ7QUFDSDs7QUFFRCxZQUFJeEYsUUFBSixFQUFjQSxTQUFTLElBQVQsRUFBZXdGLE1BQWY7O0FBRWQsZUFBT0EsTUFBUDtBQUNILEtBdkJEOztBQTBCQTtBQUNBOzs7QUFHQS9HLGVBQVdvQixTQUFYLENBQXFCK0YsT0FBckIsR0FBK0IsVUFBVUwsUUFBVixFQUFvQnZGLFFBQXBCLEVBQThCO0FBQ3pELFlBQUl6QixFQUFFMEIsVUFBRixDQUFhc0YsUUFBYixDQUFKLEVBQTRCO0FBQ3hCdkYsdUJBQVd1RixRQUFYO0FBQ0FBLHVCQUFXLElBQVg7QUFDSDs7QUFFRCxZQUFJLENBQUNoSCxFQUFFTyxLQUFGLENBQVFrQixRQUFSLENBQUQsSUFBc0IsQ0FBQ3pCLEVBQUUwQixVQUFGLENBQWFELFFBQWIsQ0FBM0IsRUFBbURuQyxPQUFPa0IsS0FBUCxDQUFhLDZCQUFiOztBQUVuRCxZQUFJOEcsZ0JBQWdCbEIsT0FBT0MsSUFBUCxDQUFZLEtBQUtyRixTQUFqQixDQUFwQjtBQUNBLFlBQUl1RyxhQUFhLElBQWpCOztBQUVBLFlBQUlELGtCQUFrQixDQUF0QixFQUF5QjtBQUNyQmhJLG1CQUFPa0IsS0FBUCxDQUFhLHVCQUFiO0FBQ0gsU0FGRCxNQUVPO0FBQ0gsZ0JBQUksQ0FBQ3dHLFFBQUwsRUFBZTtBQUNYLG9CQUFJTSxrQkFBa0IsQ0FBdEIsRUFBeUI7QUFDckJoSSwyQkFBT2tJLElBQVAsQ0FBWSxpREFBWjs7QUFFQTtBQUNBLHlCQUFLLElBQUluRCxHQUFULElBQWdCLEtBQUtyRCxTQUFyQjtBQUFnQ2dHLG1DQUFXM0MsR0FBWDtBQUFoQztBQUNILGlCQUxELE1BS087QUFDSC9FLDJCQUFPa0IsS0FBUCxDQUFhLHdEQUFiO0FBQ0g7QUFDSjtBQUNKOztBQUVEK0cscUJBQWEsS0FBS3ZHLFNBQUwsQ0FBZWdHLFFBQWYsQ0FBYjs7QUFFQSxZQUFJLENBQUNPLFVBQUwsRUFBaUI7QUFDYmpJLG1CQUFPa0IsS0FBUCx5QkFBbUN3RyxRQUFuQztBQUNIOztBQUVELGFBQUtsRyxJQUFMLEdBQVl5RyxVQUFaO0FBQ0EsYUFBS2xGLElBQUwsQ0FDSSxTQURKLEVBRUk7QUFDSUMsd0JBQVksSUFEaEI7QUFFSTBFLHNCQUFVQTtBQUZkLFNBRko7O0FBUUEsWUFBSXZGLFFBQUosRUFBY0EsU0FBUyxJQUFUOztBQUVkLGVBQU8sSUFBUDtBQUNILEtBNUNEOztBQThDQTs7Ozs7Ozs7Ozs7O0FBWUF2QixlQUFXb0IsU0FBWCxDQUFxQm1HLFNBQXJCLEdBQWlDLFVBQVNDLFFBQVQsRUFBb0Q7QUFBQSxZQUFqQ3JILE9BQWlDLHlEQUF2QixFQUFFK0MsWUFBWSxLQUFkLEVBQXVCOztBQUNqRixZQUFJcEQsRUFBRU8sS0FBRixDQUFRbUgsUUFBUixLQUFxQixDQUFDMUgsRUFBRXlDLE9BQUYsQ0FBVWlGLFFBQVYsQ0FBMUIsRUFBK0NwSSxPQUFPa0IsS0FBUCxDQUFhLHVDQUFiOztBQUUvQyxZQUFJbUgsY0FBYyxJQUFJbEksV0FBSixDQUFnQmlJLFFBQWhCLENBQWxCOztBQUVBLGFBQUssSUFBSS9FLElBQUksQ0FBYixFQUFnQkEsSUFBSStFLFNBQVN6RixNQUE3QixFQUFxQ1UsR0FBckMsRUFBMEM7QUFDdEMsZ0JBQUlpRixRQUFRRixTQUFTL0UsQ0FBVCxDQUFaOztBQUVBLGlCQUFLLElBQUkwQixHQUFULElBQWdCdUQsS0FBaEIsRUFBdUI7QUFDbkIsb0JBQUl2RCxJQUFJRSxNQUFKLENBQVcsQ0FBWCxFQUFjLENBQWQsTUFBcUIsR0FBekIsRUFBOEJqRixPQUFPa0IsS0FBUCxDQUFhLHlDQUFiOztBQUU5QixvQkFBSSxDQUFDbUgsWUFBWUUsVUFBWixDQUF1QnhELEdBQXZCLENBQUwsRUFBa0MvRSxPQUFPa0IsS0FBUCxzQkFBK0I2RCxHQUEvQjs7QUFFbEM7QUFDSDtBQUNKOztBQUVELFlBQUk0QyxTQUFTVSxZQUFZRixTQUFaLENBQXNCLElBQXRCLENBQWI7O0FBRUEsZUFBT1IsTUFBUCxDQW5CaUYsQ0FtQmpFO0FBQ25CLEtBcEJEOztBQXNCQTs7O0FBR0EvRyxlQUFXMEYsa0JBQVgsR0FBZ0M7QUFDNUJrQyxnQkFBUSxJQURvQjtBQUU1QkMsY0FBTSxJQUZzQjtBQUc1QkMsaUJBQVMsSUFIbUI7QUFJNUJDLGVBQU8sSUFKcUI7QUFLNUJDLGtCQUFVO0FBTGtCLEtBQWhDOztBQVFBOzs7QUFHQSxRQUFJbkQsYUFBYTtBQUNib0QsY0FBTSxjQUFVMUMsTUFBVixFQUFrQjJDLEtBQWxCLEVBQXlCQyxHQUF6QixFQUE4QjtBQUNoQyxnQkFBSSxDQUFDckksRUFBRTZCLFFBQUYsQ0FBV3dHLEdBQVgsQ0FBTCxFQUFzQjtBQUNsQi9JLHVCQUFPa0IsS0FBUCxDQUFhLHdDQUFiO0FBQ0g7O0FBRUQsZ0JBQUk0SCxTQUFTM0MsTUFBYixFQUFxQjtBQUNqQixvQkFBSSxDQUFDekYsRUFBRTZCLFFBQUYsQ0FBVzRELE9BQU8yQyxLQUFQLENBQVgsQ0FBTCxFQUFnQztBQUM1QjlJLDJCQUFPa0IsS0FBUCxDQUFhLDBDQUFiO0FBQ0g7O0FBRURpRix1QkFBTzJDLEtBQVAsS0FBaUJDLEdBQWpCO0FBQ0gsYUFORCxNQU1PO0FBQ0g1Qyx1QkFBTzJDLEtBQVAsSUFBZ0JDLEdBQWhCO0FBQ0g7QUFDSixTQWZZOztBQWlCYkMsY0FBTSxjQUFVN0MsTUFBVixFQUFrQjJDLEtBQWxCLEVBQXlCQyxHQUF6QixFQUE4QjtBQUNoQzVDLG1CQUFPMkMsS0FBUCxJQUFnQnBJLEVBQUU0QixTQUFGLENBQVl5RyxHQUFaLENBQWhCO0FBQ0gsU0FuQlk7O0FBcUJiUCxnQkFBUSxnQkFBVXJDLE1BQVYsRUFBa0IyQyxLQUFsQixFQUF5QkMsR0FBekIsRUFBOEI7QUFDbEMsZ0JBQUksQ0FBQ3JJLEVBQUVPLEtBQUYsQ0FBUWtGLE1BQVIsQ0FBTCxFQUFzQjtBQUNsQixvQkFBSXpGLEVBQUV5QyxPQUFGLENBQVVnRCxNQUFWLENBQUosRUFBdUI7QUFDbkIsd0JBQUkyQyxTQUFTM0MsTUFBYixFQUFxQjtBQUNqQkEsK0JBQU8yQyxLQUFQLElBQWdCLElBQWhCO0FBQ0g7QUFDSixpQkFKRCxNQUlPO0FBQ0gsMkJBQU8zQyxPQUFPMkMsS0FBUCxDQUFQO0FBQ0g7QUFDSjtBQUNKLFNBL0JZOztBQWlDYkcsZUFBTyxlQUFVOUMsTUFBVixFQUFrQjJDLEtBQWxCLEVBQXlCQyxHQUF6QixFQUE4QjtBQUNqQyxnQkFBSUcsSUFBSS9DLE9BQU8yQyxLQUFQLENBQVI7O0FBRUEsZ0JBQUlwSSxFQUFFTyxLQUFGLENBQVFpSSxDQUFSLENBQUosRUFBZ0I7QUFDWi9DLHVCQUFPMkMsS0FBUCxJQUFnQixDQUFDQyxHQUFELENBQWhCO0FBQ0gsYUFGRCxNQUVPLElBQUksQ0FBQ3JJLEVBQUV5QyxPQUFGLENBQVUrRixDQUFWLENBQUwsRUFBbUI7QUFDdEJsSix1QkFBT2tCLEtBQVAsQ0FBYSwwQ0FBYjtBQUNILGFBRk0sTUFFQTtBQUNIZ0ksa0JBQUVwRyxJQUFGLENBQU9wQyxFQUFFNEIsU0FBRixDQUFZeUcsR0FBWixDQUFQO0FBQ0g7QUFDSixTQTNDWTs7QUE2Q2JJLGtCQUFVLGtCQUFVaEQsTUFBVixFQUFrQjJDLEtBQWxCLEVBQXlCQyxHQUF6QixFQUE4QjtBQUNwQyxnQkFBSUcsSUFBSS9DLE9BQU8yQyxLQUFQLENBQVI7O0FBRUEsZ0JBQUlwSSxFQUFFTyxLQUFGLENBQVFpSSxDQUFSLENBQUosRUFBZ0I7QUFDWi9DLHVCQUFPMkMsS0FBUCxJQUFnQkMsR0FBaEI7QUFDSCxhQUZELE1BRU8sSUFBSSxDQUFDckksRUFBRXlDLE9BQUYsQ0FBVStGLENBQVYsQ0FBTCxFQUFtQjtBQUN0QmxKLHVCQUFPa0IsS0FBUCxDQUFhLG1EQUFiO0FBQ0gsYUFGTSxNQUVBO0FBQ0gscUJBQUssSUFBSW1DLElBQUksQ0FBYixFQUFnQkEsSUFBSTBGLElBQUlwRyxNQUF4QixFQUFnQ1UsR0FBaEMsRUFBcUM7QUFDakM2RixzQkFBRXBHLElBQUYsQ0FBT2lHLElBQUkxRixDQUFKLENBQVA7QUFDSDtBQUNKO0FBQ0osU0F6RFk7O0FBMkRiK0YsbUJBQVcsbUJBQVVqRCxNQUFWLEVBQWtCMkMsS0FBbEIsRUFBeUJDLEdBQXpCLEVBQThCO0FBQ3JDLGdCQUFJRyxJQUFJL0MsT0FBTzJDLEtBQVAsQ0FBUjs7QUFFQSxnQkFBSXBJLEVBQUVPLEtBQUYsQ0FBUWlJLENBQVIsQ0FBSixFQUFnQjtBQUNaL0MsdUJBQU8yQyxLQUFQLElBQWdCLENBQUNDLEdBQUQsQ0FBaEI7QUFDSCxhQUZELE1BRU8sSUFBSSxDQUFDckksRUFBRXlDLE9BQUYsQ0FBVStGLENBQVYsQ0FBTCxFQUFtQjtBQUN0QmxKLHVCQUFPa0IsS0FBUCxDQUFhLDhDQUFiO0FBQ0gsYUFGTSxNQUVBO0FBQ0gsb0JBQUltSSxTQUFTLEtBQWI7QUFDQSxvQkFBSTNJLEVBQUVTLGFBQUYsQ0FBZ0I0SCxHQUFoQixDQUFKLEVBQTBCO0FBQ3RCLHlCQUFLLElBQUlPLENBQVQsSUFBY1AsR0FBZCxFQUFtQjtBQUNmLDRCQUFJTyxNQUFNLE9BQVYsRUFBbUI7QUFDZkQscUNBQVMsSUFBVDtBQUNIOztBQUVEO0FBQ0g7QUFDSjs7QUFFRCxvQkFBSUUsU0FBU0YsU0FBU04sSUFBSSxPQUFKLENBQVQsR0FBd0IsQ0FBQ0EsR0FBRCxDQUFyQztBQUNBckksa0JBQUV1RyxPQUFGLENBQVVzQyxNQUFWLEVBQWtCLFVBQVU1RCxLQUFWLEVBQWlCO0FBQy9CLHlCQUFLLElBQUl0QyxJQUFJLENBQWIsRUFBZ0JBLElBQUk2RixFQUFFdkcsTUFBdEIsRUFBOEJVLEdBQTlCLEVBQW1DO0FBQy9CLDRCQUFJL0MsZ0JBQWdCa0osS0FBaEIsQ0FBc0I3RCxLQUF0QixFQUE2QnVELEVBQUU3RixDQUFGLENBQTdCLENBQUosRUFBd0M7QUFDM0M7O0FBRUQ2RixzQkFBRXBHLElBQUYsQ0FBTzZDLEtBQVA7QUFDSCxpQkFORDtBQU9IO0FBQ0osU0F2Rlk7O0FBeUZiOEMsY0FBTSxjQUFVdEMsTUFBVixFQUFrQjJDLEtBQWxCLEVBQXlCQyxHQUF6QixFQUE4QjtBQUNoQyxnQkFBSXJJLEVBQUVPLEtBQUYsQ0FBUWtGLE1BQVIsS0FBbUJ6RixFQUFFTyxLQUFGLENBQVFrRixPQUFPMkMsS0FBUCxDQUFSLENBQXZCLEVBQStDOztBQUUvQyxnQkFBSUksSUFBSS9DLE9BQU8yQyxLQUFQLENBQVI7O0FBRUEsZ0JBQUksQ0FBQ3BJLEVBQUV5QyxPQUFGLENBQVUrRixDQUFWLENBQUwsRUFBbUI7QUFDZmxKLHVCQUFPa0IsS0FBUCxDQUFhLHlDQUFiO0FBQ0gsYUFGRCxNQUVPO0FBQ0gsb0JBQUlSLEVBQUU2QixRQUFGLENBQVd3RyxHQUFYLEtBQW1CQSxNQUFNLENBQTdCLEVBQWdDO0FBQzVCRyxzQkFBRWhDLE1BQUYsQ0FBUyxDQUFULEVBQVksQ0FBWjtBQUNILGlCQUZELE1BRU87QUFDSGdDLHNCQUFFTyxHQUFGO0FBQ0g7QUFDSjtBQUNKLFNBdkdZOztBQXlHYmQsZUFBTyxlQUFVeEMsTUFBVixFQUFrQjJDLEtBQWxCLEVBQXlCQyxHQUF6QixFQUE4QjtBQUNqQyxnQkFBSXJJLEVBQUVPLEtBQUYsQ0FBUWtGLE1BQVIsS0FBbUJ6RixFQUFFTyxLQUFGLENBQVFrRixPQUFPMkMsS0FBUCxDQUFSLENBQXZCLEVBQStDOztBQUUvQyxnQkFBSUksSUFBSS9DLE9BQU8yQyxLQUFQLENBQVI7O0FBRUEsZ0JBQUksQ0FBQ3BJLEVBQUV5QyxPQUFGLENBQVUrRixDQUFWLENBQUwsRUFBbUI7QUFDZmxKLHVCQUFPa0IsS0FBUCxDQUFhLGtEQUFiO0FBQ0gsYUFGRCxNQUVPO0FBQ0gsb0JBQUl3SSxNQUFNLEVBQVY7O0FBRUEsb0JBQUksUUFBT1gsR0FBUCx5Q0FBT0EsR0FBUCxPQUFlLFFBQWYsSUFBMkIsRUFBRUEsZUFBZVksS0FBakIsQ0FBL0IsRUFBd0Q7QUFDcEQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esd0JBQUlDLFFBQVEsSUFBSXZKLFFBQUosQ0FBYTtBQUNyQix3Q0FBZ0IwSTtBQURLLHFCQUFiLENBQVo7QUFHQSx5QkFBSyxJQUFJMUYsSUFBSSxDQUFiLEVBQWdCQSxJQUFJNkYsRUFBRXZHLE1BQXRCLEVBQThCVSxHQUE5QixFQUFtQztBQUMvQiw0QkFBSXdHLFFBQVE7QUFDUkMsMENBQWNaLEVBQUU3RixDQUFGO0FBRE4seUJBQVo7QUFHQSw0QkFBSSxDQUFDdUcsTUFBTXhFLElBQU4sQ0FBV3lFLEtBQVgsQ0FBTCxFQUF3QjtBQUNwQkgsZ0NBQUk1RyxJQUFKLENBQVNvRyxFQUFFN0YsQ0FBRixDQUFUO0FBQ0g7QUFDSjtBQUNKLGlCQXBCRCxNQW9CTztBQUNILHlCQUFLLElBQUlBLElBQUksQ0FBYixFQUFnQkEsSUFBSTZGLEVBQUV2RyxNQUF0QixFQUE4QlUsR0FBOUIsRUFBbUM7QUFDL0IsNEJBQUksQ0FBQy9DLGdCQUFnQmtKLEtBQWhCLENBQXNCTixFQUFFN0YsQ0FBRixDQUF0QixFQUE0QjBGLEdBQTVCLENBQUwsRUFBdUM7QUFDbkNXLGdDQUFJNUcsSUFBSixDQUFTb0csRUFBRTdGLENBQUYsQ0FBVDtBQUNIO0FBQ0o7QUFDSjs7QUFFRDhDLHVCQUFPMkMsS0FBUCxJQUFnQlksR0FBaEI7QUFDSDtBQUNKLFNBakpZOztBQW1KYmQsa0JBQVUsa0JBQVV6QyxNQUFWLEVBQWtCMkMsS0FBbEIsRUFBeUJDLEdBQXpCLEVBQThCO0FBQ3BDLGdCQUFJckksRUFBRU8sS0FBRixDQUFRa0YsTUFBUixLQUFtQnpGLEVBQUVPLEtBQUYsQ0FBUWtGLE9BQU8yQyxLQUFQLENBQVIsQ0FBdkIsRUFBK0M7O0FBRS9DLGdCQUFJSSxJQUFJL0MsT0FBTzJDLEtBQVAsQ0FBUjs7QUFFQSxnQkFBSSxDQUFDcEksRUFBRU8sS0FBRixDQUFRaUksQ0FBUixDQUFELElBQWUsQ0FBQ3hJLEVBQUV5QyxPQUFGLENBQVUrRixDQUFWLENBQXBCLEVBQWtDO0FBQzlCbEosdUJBQU9rQixLQUFQLENBQWEsbURBQWI7QUFDSCxhQUZELE1BRU8sSUFBSSxDQUFDUixFQUFFTyxLQUFGLENBQVFpSSxDQUFSLENBQUwsRUFBaUI7QUFDcEIsb0JBQUlRLE1BQU0sRUFBVjs7QUFFQSxxQkFBSyxJQUFJckcsSUFBSSxDQUFiLEVBQWdCQSxJQUFJNkYsRUFBRXZHLE1BQXRCLEVBQThCVSxHQUE5QixFQUFtQztBQUMvQix3QkFBSTBHLFVBQVUsS0FBZDs7QUFFQSx5QkFBSyxJQUFJQyxJQUFJLENBQWIsRUFBZ0JBLElBQUlqQixJQUFJcEcsTUFBeEIsRUFBZ0NxSCxHQUFoQyxFQUFxQztBQUNqQyw0QkFBSTFKLGdCQUFnQmtKLEtBQWhCLENBQXNCTixFQUFFN0YsQ0FBRixDQUF0QixFQUE0QjBGLElBQUlpQixDQUFKLENBQTVCLENBQUosRUFBeUM7QUFDckNELHNDQUFVLElBQVY7O0FBRUE7QUFDSDtBQUNKOztBQUVELHdCQUFJLENBQUNBLE9BQUwsRUFBYztBQUNWTCw0QkFBSTVHLElBQUosQ0FBU29HLEVBQUU3RixDQUFGLENBQVQ7QUFDSDtBQUNKOztBQUVEOEMsdUJBQU8yQyxLQUFQLElBQWdCWSxHQUFoQjtBQUNIO0FBQ0osU0EvS1k7O0FBaUxiaEIsaUJBQVMsaUJBQVV2QyxNQUFWLEVBQWtCMkMsS0FBbEIsRUFBeUJuRCxLQUF6QixFQUFnQztBQUNyQyxnQkFBSW1ELFVBQVVuRCxLQUFkLEVBQXFCO0FBQ2pCO0FBQ0EzRix1QkFBT2tCLEtBQVAsQ0FBYSxzQ0FBYjtBQUNIOztBQUVELGdCQUFJLENBQUNSLEVBQUVnQyxRQUFGLENBQVdpRCxLQUFYLENBQUQsSUFBc0JBLE1BQU1zRSxJQUFOLE9BQWlCLEVBQTNDLEVBQStDO0FBQzNDakssdUJBQU9rQixLQUFQLENBQWEseUNBQWI7QUFDSDs7QUFFRGlGLG1CQUFPUixLQUFQLElBQWdCUSxPQUFPMkMsS0FBUCxDQUFoQjtBQUNBLG1CQUFPM0MsT0FBTzJDLEtBQVAsQ0FBUDtBQUNILFNBN0xZOztBQStMYm9CLGNBQU0sY0FBVS9ELE1BQVYsRUFBa0IyQyxLQUFsQixFQUF5QkMsR0FBekIsRUFBOEI7QUFDaEM7QUFDQTtBQUNBL0ksbUJBQU9rQixLQUFQLENBQWEsdUJBQWI7QUFDSDtBQW5NWSxLQUFqQjs7QUFzTUE7OztBQUdBTixlQUFXUSxtQkFBWCxHQUFpQyxVQUFTTixjQUFULEVBQXlCO0FBQ3RELFlBQUksQ0FBQ0osRUFBRWdDLFFBQUYsQ0FBVzVCLGNBQVgsQ0FBTCxFQUFpQztBQUM3QmQsbUJBQU9rQixLQUFQLENBQWEsa0NBQWI7QUFDSDs7QUFFRCxZQUFJLENBQUNKLGNBQUQsSUFBbUJBLGVBQWVxSixPQUFmLENBQXVCLElBQXZCLE1BQWlDLENBQUMsQ0FBekQsRUFBNEQ7QUFDeERuSyxtQkFBT2tCLEtBQVAsQ0FBYSxrQ0FBYjtBQUNIOztBQUVELFlBQUlKLGVBQWVxSixPQUFmLENBQXVCLEdBQXZCLE1BQWdDLENBQUMsQ0FBakMsSUFBc0NySixlQUFlOEksS0FBZixDQUFxQiw0QkFBckIsTUFBdUQsSUFBakcsRUFBdUc7QUFDbkc1SixtQkFBT2tCLEtBQVAsQ0FBYSx1Q0FBYjtBQUNIOztBQUVELFlBQUlKLGVBQWU4SSxLQUFmLENBQXFCLFdBQXJCLE1BQXNDLElBQTFDLEVBQWdEO0FBQzVDNUosbUJBQU9rQixLQUFQLENBQWEsNEVBQWI7QUFDSDs7QUFFRCxZQUFJSixlQUFlOEksS0FBZixDQUFxQixTQUFyQixNQUFvQyxJQUF4QyxFQUE4QztBQUMxQzVKLG1CQUFPa0IsS0FBUCxDQUFhLGlEQUFiO0FBQ0g7QUFDSixLQXBCRDs7QUFzQkE7OztBQUdBTixlQUFXb0IsU0FBWCxDQUFxQm9JLE1BQXJCLEdBQThCLFVBQVNDLE9BQVQsRUFBa0I7QUFDNUMsWUFBSTNKLEVBQUVnQyxRQUFGLENBQVcySCxPQUFYLENBQUosRUFBeUI7QUFDckIsZ0JBQUksS0FBS2hKLElBQUwsS0FBY2dKLE9BQWxCLEVBQTJCO0FBQ3ZCekosMkJBQVdRLG1CQUFYLENBQStCaUosT0FBL0I7O0FBRUEsb0JBQUlDLFNBQVMsS0FBS2pKLElBQUwsQ0FBVXdFLEtBQVYsQ0FBZ0IsR0FBaEIsRUFBcUJsRCxNQUFyQixHQUE4QixDQUE5QixHQUFrQyxLQUFLdEIsSUFBTCxDQUFVd0UsS0FBVixDQUFnQixHQUFoQixFQUFxQixDQUFyQixDQUFsQyxHQUE0RCxFQUF6RTs7QUFFQSxxQkFBS3hFLElBQUwsR0FBWWdKLE9BQVo7QUFDQSxxQkFBSzlJLFFBQUwsR0FBZ0IrSSxTQUFTLEdBQVQsR0FBZSxLQUFLakosSUFBcEM7O0FBRUEsdUJBQU8sSUFBUDtBQUNIO0FBQ0osU0FYRCxNQVdPO0FBQ0g7QUFDSDtBQUNKLEtBZkQ7O0FBaUJBOzs7Ozs7Ozs7QUFTQXlGLFdBQU9DLElBQVAsR0FBYyxVQUFTd0QsR0FBVCxFQUFjO0FBQ3hCLFlBQUl4RCxPQUFPLENBQVg7QUFBQSxZQUNJaEMsR0FESjs7QUFHQSxhQUFLQSxHQUFMLElBQVl3RixHQUFaLEVBQWlCO0FBQ2IsZ0JBQUlBLElBQUlDLGNBQUosQ0FBbUJ6RixHQUFuQixDQUFKLEVBQTZCO0FBQ3pCZ0M7QUFDSDtBQUNKOztBQUVELGVBQU9BLElBQVA7QUFDSCxLQVhEOztBQWFBLFFBQUlyRCxvQkFBb0IsU0FBcEJBLGlCQUFvQixDQUFTRCxNQUFULEVBQWlCO0FBQ3JDO0FBQ0EsWUFBSS9DLEVBQUVPLEtBQUYsQ0FBUXdDLE9BQU9GLFNBQWYsQ0FBSixFQUErQkUsT0FBT0YsU0FBUCxHQUFtQixFQUFuQjs7QUFFL0IsWUFBSTdDLEVBQUVPLEtBQUYsQ0FBUXdDLE9BQU9GLFNBQWYsQ0FBSixFQUErQkUsT0FBT0YsU0FBUCxHQUFtQixFQUFuQjs7QUFFL0IsWUFBSTdDLEVBQUVPLEtBQUYsQ0FBUXdDLE9BQU9ELE1BQWYsQ0FBSixFQUE0QkMsT0FBT0QsTUFBUCxHQUFnQixFQUFoQjs7QUFFNUIsWUFBSTlDLEVBQUVPLEtBQUYsQ0FBUXdDLE9BQU8xQyxPQUFmLENBQUosRUFBNkI7QUFDekIwQyxtQkFBTzFDLE9BQVAsR0FBaUI7QUFDYnFELHNCQUFNLENBRE87QUFFYkMsdUJBQU8sRUFGTSxDQUVIO0FBRkcsYUFBakI7QUFJSDs7QUFFRDtBQUNBLFlBQUkzRCxFQUFFMEIsVUFBRixDQUFhcUIsT0FBT0YsU0FBcEIsQ0FBSixFQUFvQztBQUNoQ0UsbUJBQU90QixRQUFQLEdBQWtCc0IsT0FBT0YsU0FBekI7QUFDQUUsbUJBQU9GLFNBQVAsR0FBbUIsRUFBbkI7QUFDSDs7QUFFRDtBQUNBLFlBQUk3QyxFQUFFMEIsVUFBRixDQUFhcUIsT0FBT0QsTUFBcEIsQ0FBSixFQUFpQztBQUM3QkMsbUJBQU90QixRQUFQLEdBQWtCc0IsT0FBT0QsTUFBekI7QUFDQUMsbUJBQU9ELE1BQVAsR0FBZ0IsRUFBaEI7QUFDSDs7QUFFRDtBQUNBLFlBQUk5QyxFQUFFMEIsVUFBRixDQUFhcUIsT0FBTzFDLE9BQXBCLENBQUosRUFBa0M7QUFDOUIwQyxtQkFBT3RCLFFBQVAsR0FBa0JzQixPQUFPMUMsT0FBekI7QUFDQTBDLG1CQUFPMUMsT0FBUCxHQUFpQixFQUFqQjtBQUNIOztBQUVEO0FBQ0EsWUFBSTBDLE9BQU9GLFNBQVAsWUFBNEJoRCxRQUFoQyxFQUEwQztBQUN0Q2tELG1CQUFPRixTQUFQLEdBQW1CO0FBQ2ZmLHFCQUFLaUIsT0FBT0Y7QUFERyxhQUFuQjtBQUdIOztBQUVELFlBQUksQ0FBQzdDLEVBQUVPLEtBQUYsQ0FBUXdDLE9BQU90QixRQUFmLENBQUQsSUFBNkIsQ0FBQ3pCLEVBQUUwQixVQUFGLENBQWFxQixPQUFPdEIsUUFBcEIsQ0FBbEMsRUFBaUU7QUFDN0RuQyxtQkFBT2tCLEtBQVAsQ0FBYSw2QkFBYjtBQUNIOztBQUVELFlBQUl1QyxPQUFPMUMsT0FBUCxDQUFleUMsTUFBbkIsRUFBMkI7QUFDdkIsZ0JBQUk5QyxFQUFFTyxLQUFGLENBQVF3QyxPQUFPRCxNQUFmLEtBQTBCQyxPQUFPRCxNQUFQLENBQWNiLE1BQWQsS0FBeUIsQ0FBdkQsRUFBMEQ7QUFDdERjLHVCQUFPRCxNQUFQLEdBQWdCQyxPQUFPMUMsT0FBUCxDQUFleUMsTUFBL0I7QUFDSCxhQUZELE1BRU87QUFDSHhELHVCQUFPcUYsSUFBUCxDQUFZLG9EQUFaO0FBQ0g7QUFDSjs7QUFFRCxlQUFPNUIsTUFBUDtBQUNILEtBckREOztBQXVEQSxXQUFPN0MsVUFBUDtBQUNILENBMXZDRCIsImZpbGUiOiJDb2xsZWN0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBDb2xsZWN0aW9uLmpzIC0gYmFzZWQgb24gTW9uZ2xvI0NvbGxlY3Rpb24gKHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vTW9uZ2xvfSkgYnkgQ2hyaXN0aWFuIFN1bGxpdmFuIDxjc0BldWZvcmljLmNvPiB8IENvcHlyaWdodCAoYykgMjAxMlxuICogQHZlcnNpb24gMS4wLjBcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgbG9nZ2VyID0gbnVsbDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihBZ2dyZWdhdGlvbiwgQ3Vyc29yLCBTZWxlY3RvciwgU2VsZWN0b3JNYXRjaGVyLCBPYmplY3RJZCwgRXZlbnRFbWl0dGVyLCBMb2dnZXIsIF8pIHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb2xsZWN0aW9uXG4gICAgICogXG4gICAgICogQG1vZHVsZSBDb2xsZWN0aW9uXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHNpbmNlIDAuMC4xXG4gICAgICogXG4gICAgICogQGNsYXNzZGVzYyBDb2xsZWN0aW9uIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjb2xsZWN0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIERhdGFiYXNlIG9iamVjdFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gICAgICogXG4gICAgICovXG4gICAgdmFyIGRhdGFiYXNlID0gbnVsbDtcbiAgICBjbGFzcyBDb2xsZWN0aW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICAvLyB2YXIgQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucykge1xuICAgICAgICBjb25zdHJ1Y3RvcihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHN1cGVyKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDb2xsZWN0aW9uKSkgcmV0dXJuIG5ldyBDb2xsZWN0aW9uKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc05pbChkYikpIGxvZ2dlci50aHJvdyhcImRiIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNOaWwoY29sbGVjdGlvbk5hbWUpKSBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uTmFtZSBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpIHx8ICFfLmlzUGxhaW5PYmplY3Qob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKGNvbGxlY3Rpb25OYW1lKTtcbiAgICAgICAgXG4gICAgICAgICAgICAvLyB0aGlzLmRiID0gZGI7XG4gICAgICAgICAgICBkYXRhYmFzZSA9IGRiO1xuICAgICAgICAgICAgdGhpcy5uYW1lID0gY29sbGVjdGlvbk5hbWU7XG4gICAgICAgICAgICB0aGlzLmRhdGFiYXNlTmFtZSA9IGRiLmRhdGFiYXNlTmFtZTtcbiAgICAgICAgICAgIHRoaXMuZnVsbE5hbWUgPSB0aGlzLmRhdGFiYXNlTmFtZSArICcuJyArIHRoaXMubmFtZTtcbiAgICAgICAgICAgIHRoaXMuZG9jcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5kb2NfaW5kZXhlcyA9IHt9O1xuICAgICAgICAgICAgdGhpcy5zbmFwc2hvdHMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMub3B0cyA9IHt9OyAvLyBEZWZhdWx0IG9wdGlvbnNcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXy5tZXJnZSh0aGlzLm9wdHMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB0aGlzLmVtaXQgPSBkYi5lbWl0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBlbWl0KG5hbWUsIGFyZ3MsIGNiKSB7XG4gICAgICAgICAgICBzdXBlci5lbWl0KG5hbWUsIGFyZ3MsIGNiLCBkYXRhYmFzZS5fc3RvcmVzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBUT0RPIGVuZm9yY2UgcnVsZSB0aGF0IGZpZWxkIG5hbWVzIGNhbid0IHN0YXJ0IHdpdGggJyQnIG9yIGNvbnRhaW4gJy4nXG4gICAgLy8gKHJlYWwgbW9uZ29kYiBkb2VzIGluIGZhY3QgZW5mb3JjZSB0aGlzKVxuICAgIC8vIFRPRE8gcG9zc2libHkgZW5mb3JjZSB0aGF0ICd1bmRlZmluZWQnIGRvZXMgbm90IGFwcGVhciAod2UgYXNzdW1lXG4gICAgLy8gdGhpcyBpbiBvdXIgaGFuZGxpbmcgb2YgbnVsbCBhbmQgJGV4aXN0cylcbiAgICAvKipcbiAgICAgKiBJbnNlcnRzIGEgZG9jdW1lbnQgaW50byB0aGUgY29sbGVjdGlvblxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiNpbnNlcnRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZG9jIC0gRG9jdW1lbnQgdG8gYmUgaW5zZXJ0ZWRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5jaGFpbj1mYWxzZV0gLSBJZiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBzbyBpdCBjYW4gYmUgY2hhaW5lZCB3aXRoIG90aGVyIG1ldGhvZHNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R8Q29sbGVjdGlvbn0gSWYgXCJvcHRpb25zLmNoYWluXCIgc2V0IHRvIFwidHJ1ZVwiIHJldHVybnMgdGhpcyBpbnN0YW5jZSwgb3RoZXJ3aXNlIHJldHVybnMgdGhlIGluc2VydGVkIGRvY3VtZW50XG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24gKGRvYywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoZG9jKSkgbG9nZ2VyLnRocm93KFwiZG9jIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc1BsYWluT2JqZWN0KGRvYykpIGxvZ2dlci50aHJvdyhcImRvYyBtdXN0IGJlIGFuIG9iamVjdFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0aW5nIGEgc2FmZSBjb3B5IG9mIHRoZSBkb2N1bWVudFxuICAgICAgICB2YXIgX2RvYyA9IF8uY2xvbmVEZWVwKGRvYyk7XG4gICAgXG4gICAgICAgIC8vIElmIHRoZSBkb2N1bWVudCBjb21lcyB3aXRoIGEgbnVtYmVyIElELCBwYXJzZSBpdCB0byBTdHJpbmdcbiAgICAgICAgaWYgKF8uaXNOdW1iZXIoX2RvYy5faWQpKSB7XG4gICAgICAgICAgICBfZG9jLl9pZCA9IF8udG9TdHJpbmcoX2RvYy5faWQpO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIGlmIChfLmlzTmlsKF9kb2MuX2lkKSB8fCAoIV9kb2MuX2lkIGluc3RhbmNlb2YgT2JqZWN0SWQgJiYgKCFfLmlzU3RyaW5nKF9kb2MuX2lkKSB8fCAhX2RvYy5faWQubGVuZ3RoKSkpIHtcbiAgICAgICAgICAgIF9kb2MuX2lkID0gbmV3IE9iamVjdElkKCk7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy8gQWRkIG9wdGlvbnMgdG8gbW9yZSBkYXRlc1xuICAgICAgICBfZG9jLnRpbWVzdGFtcCA9IG5ldyBPYmplY3RJZCgpLmdlbmVyYXRpb25UaW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gUmV2ZXJzZVxuICAgICAgICB0aGlzLmRvY19pbmRleGVzW18udG9TdHJpbmcoX2RvYy5faWQpXSA9IHRoaXMuZG9jcy5sZW5ndGg7XG4gICAgICAgIHRoaXMuZG9jcy5wdXNoKF9kb2MpO1xuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFwiaW5zZXJ0XCIgZXZlbnQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfmluc2VydFxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gZG9jIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGRvY3VtZW50IGluc2VydGVkXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAnaW5zZXJ0JyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIGRvYzogX2RvY1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIF9kb2MpO1xuICAgIFxuICAgICAgICBpZiAob3B0aW9ucy5jaGFpbikgcmV0dXJuIHRoaXM7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gX2RvYztcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEluc2VydHMgc2V2ZXJhbCBkb2N1bWVudHMgaW50byB0aGUgY29sbGVjdGlvblxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiNidWxrSW5zZXJ0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtBcnJheX0gZG9jcyAtIERvY3VtZW50cyB0byBiZSBpbnNlcnRlZFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNoYWluPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHJldHVybnMge09iamVjdHxDb2xsZWN0aW9ufSBJZiBcIm9wdGlvbnMuY2hhaW5cIiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgaW5zZXJ0ZWQgZG9jdW1lbnRcbiAgICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5idWxrSW5zZXJ0ID0gZnVuY3Rpb24gKGRvY3MsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKGRvY3MpKSBsb2dnZXIudGhyb3coXCJkb2NzIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc0FycmF5KGRvY3MpKSBsb2dnZXIudGhyb3coXCJkb2NzIG11c3QgYmUgYW4gYXJyYXlcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgIFxuICAgICAgICB2YXIgX2RvY3MgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZG9jcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IGRvYyA9IGRvY3NbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIF9kb2NzLnB1c2godGhpcy5pbnNlcnQoZG9jLCBvcHRpb25zKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgX2RvY3MpO1xuICAgIFxuICAgICAgICBpZiAob3B0aW9ucy5jaGFpbikgcmV0dXJuIHRoaXM7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gX2RvY3M7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBGaW5kcyBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDb2xsZWN0aW9uI2ZpbmRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbZmllbGRzPXt9XSAtIFRoZSBmaWVsZHMgb2YgdGhlIGRvY3VtZW50IHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnNraXBdIC0gTnVtYmVyIG9mIGRvY3VtZW50cyB0byBiZSBza2lwcGVkXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmxpbWl0XSAtIE1heCBudW1iZXIgb2YgZG9jdW1lbnRzIHRvIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmZvcmNlRmV0Y2g9ZmFsc2VdIC0gSWYgc2V0IHRvJ1widHJ1ZVwiIHJldHVybnMgdGhlIGFycmF5IG9mIGRvY3VtZW50cyBhbHJlYWR5IGZldGNoZWRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHJldHVybnMge0FycmF5fEN1cnNvcn0gSWYgXCJvcHRpb25zLmZvcmNlRmV0Y2hcIiBzZXQgdG8gdHJ1ZSByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMsIG90aGVyd2lzZSByZXR1cm5zIGEgY3Vyc29yXG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgbGV0IHBhcmFtcyA9IF9lbnN1cmVGaW5kUGFyYW1zKHtcbiAgICAgICAgICAgIHNlbGVjdGlvbjogc2VsZWN0aW9uLCBcbiAgICAgICAgICAgIGZpZWxkczogZmllbGRzLFxuICAgICAgICAgICAgb3B0aW9uczogb3B0aW9ucywgXG4gICAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBzZWxlY3Rpb24gPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgICAgICBmaWVsZHMgPSBwYXJhbXMuZmllbGRzO1xuICAgICAgICBvcHRpb25zID0gcGFyYW1zLm9wdGlvbnM7XG4gICAgICAgIGNhbGxiYWNrID0gcGFyYW1zLmNhbGxiYWNrO1xuICAgICAgICBcbiAgICAgICAgdmFyIGN1cnNvciA9IG5ldyBDdXJzb3IodGhpcy5kb2NzLCBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucyk7XG4gICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcImZpbmRcIiBldmVudC5cbiAgICAgICAgICpcbiAgICAgICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+ZmluZFxuICAgICAgICAgKiBcbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gc2VsZWN0b3IgLSBUaGUgc2VsZWN0aW9uIG9mIHRoZSBxdWVyeVxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBzaG93ZWQgaW4gdGhlIHF1ZXJ5XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAnZmluZCcsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgIGZpZWxkczogZmllbGRzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICAvLyBQYXNzIHRoZSBjdXJzb3IgZmV0Y2hlZCB0byB0aGUgY2FsbGJhY2tcbiAgICAgICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgY3Vyc29yLmZldGNoKCkpO1xuICAgIFxuICAgICAgICBpZiAob3B0aW9ucy5mb3JjZUZldGNoKSB7XG4gICAgICAgICAgICByZXR1cm4gY3Vyc29yLmZldGNoKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gY3Vyc29yO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBGaW5kcyB0aGUgZmlyc3QgbWF0Y2hpbmcgZG9jdW1lbnRcbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZE9uZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubGltaXRdIC0gTWF4IG51bWJlciBvZiBkb2N1bWVudHMgdG8gZGlzcGxheVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW29wdGlvbnMuZmllbGRzXSAtIFNhbWUgYXMgXCJmaWVsZHNcIiBwYXJhbWV0ZXIgKGlmIGJvdGggcGFzc2VkLCBcIm9wdGlvbnMuZmllbGRzXCIgd2lsbCBiZSBpZ25vcmVkKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudCBvZiB0aGUgY29sbGVjdGlvblxuICAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLmZpbmRPbmUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGxldCBwYXJhbXMgPSBfZW5zdXJlRmluZFBhcmFtcyh7XG4gICAgICAgICAgICBzZWxlY3Rpb246IHNlbGVjdGlvbiwgXG4gICAgICAgICAgICBmaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgICAgIG9wdGlvbnM6IG9wdGlvbnMsIFxuICAgICAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgc2VsZWN0aW9uID0gcGFyYW1zLnNlbGVjdGlvbjtcbiAgICAgICAgZmllbGRzID0gcGFyYW1zLmZpZWxkcztcbiAgICAgICAgb3B0aW9ucyA9IHBhcmFtcy5vcHRpb25zO1xuICAgICAgICBjYWxsYmFjayA9IHBhcmFtcy5jYWxsYmFjaztcbiAgICAgICAgXG4gICAgICAgIHZhciBjdXJzb3IgPSBuZXcgQ3Vyc29yKHRoaXMuZG9jcywgc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMpO1xuICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogXCJmaW5kT25lXCIgZXZlbnQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfmZpbmRPbmVcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb2xsZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbGxlY3Rpb25cbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdGlvbiBvZiB0aGUgcXVlcnlcbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgc2hvd2VkIGluIHRoZSBxdWVyeVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgJ2ZpbmRPbmUnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICBmaWVsZHM6IGZpZWxkc1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgdmFyIHJlcyA9IG51bGw7XG4gICAgICAgIFxuICAgICAgICBpZiAoY3Vyc29yLmhhc05leHQoKSkge1xuICAgICAgICAgICAgcmVzID0gY3Vyc29yLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUGFzcyB0aGUgY3Vyc29yIGZldGNoZWQgdG8gdGhlIGNhbGxiYWNrXG4gICAgICAgIC8vIEFkZCBbb3B0aW9ucy5ub0ZldGNoQ2FsbGJhY2sgPSB0cnVlXVxuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlcyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyBvbmUgb3IgbWFueSBkb2N1bWVudHNcbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIENvbGxlY3Rpb24jdXBkYXRlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbdXBkYXRlPXt9XSAtIFRoZSB1cGRhdGUgb3BlcmF0aW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy51cGRhdGVBc01vbmdvPXRydWVdIC0gQnkgZGVmYXVsdDogXG4gICAgICogICAgICBJZiB0aGUgW3VwZGF0ZV0gb2JqZWN0IGNvbnRhaW5zIHVwZGF0ZSBvcGVyYXRvciBtb2RpZmllcnMsIHN1Y2ggYXMgdGhvc2UgdXNpbmcgdGhlIFwiJHNldFwiIG1vZGlmaWVyLCB0aGVuOlxuICAgICAqICAgICAgICAgIDx1bD5cbiAgICAgKiAgICAgICAgICAgICAgPGxpPlRoZSBbdXBkYXRlXSBvYmplY3QgbXVzdCBjb250YWluIG9ubHkgdXBkYXRlIG9wZXJhdG9yIGV4cHJlc3Npb25zPC9saT5cbiAgICAgKiAgICAgICAgICAgICAgPGxpPlRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgdXBkYXRlcyBvbmx5IHRoZSBjb3JyZXNwb25kaW5nIGZpZWxkcyBpbiB0aGUgZG9jdW1lbnQ8L2xpPlxuICAgICAqICAgICAgICAgIDx1bD5cbiAgICAgKiAgICAgIElmIHRoZSBbdXBkYXRlXSBvYmplY3QgY29udGFpbnMgb25seSBcImZpZWxkOiB2YWx1ZVwiIGV4cHJlc3Npb25zLCB0aGVuOlxuICAgICAqICAgICAgICAgIDx1bD5cbiAgICAgKiAgICAgICAgICAgICAgPGxpPlRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgcmVwbGFjZXMgdGhlIG1hdGNoaW5nIGRvY3VtZW50IHdpdGggdGhlIFt1cGRhdGVdIG9iamVjdC4gVGhlIENvbGxlY3Rpb24jdXBkYXRlIG1ldGhvZCBkb2VzIG5vdCByZXBsYWNlIHRoZSBcIl9pZFwiIHZhbHVlPC9saT5cbiAgICAgKiAgICAgICAgICAgICAgPGxpPkNvbGxlY3Rpb24jdXBkYXRlIGNhbm5vdCB1cGRhdGUgbXVsdGlwbGUgZG9jdW1lbnRzPC9saT5cbiAgICAgKiAgICAgICAgICA8dWw+XG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm92ZXJyaWRlPWZhbHNlXSAtIFJlcGxhY2VzIHRoZSB3aG9sZSBkb2N1bWVudCAob25seSBhcGxsaWVzIHdoZW4gW3VwZGF0ZUFzTW9uZ289ZmFsc2VdKVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy51cHNlcnQ9ZmFsc2VdIC0gQ3JlYXRlcyBhIG5ldyBkb2N1bWVudCB3aGVuIG5vIGRvY3VtZW50IG1hdGNoZXMgdGhlIHF1ZXJ5IGNyaXRlcmlhXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm11bHRpPWZhbHNlXSAtIFVwZGF0ZXMgbXVsdGlwbGUgZG9jdW1lbnRzIHRoYXQgbWVldCB0aGUgY3JpdGVyaWFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggdGhlIHVwZGF0ZS9pbnNlcnQgKGlmIHVwc2VydD10cnVlKSBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIHVwZGF0ZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoc2VsZWN0aW9uKSkgc2VsZWN0aW9uID0ge307XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbCh1cGRhdGUpKSBsb2dnZXIudGhyb3coXCJZb3UgbXVzdCBzcGVjaWZ5IHRoZSB1cGRhdGUgb3BlcmF0aW9uXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgc2tpcDogMCxcbiAgICAgICAgICAgICAgICBsaW1pdDogMTUgICAvLyBmb3Igbm8gbGltaXQgcGFzcyBbb3B0aW9ucy5saW1pdCA9IC0xXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihzZWxlY3Rpb24pKSBsb2dnZXIudGhyb3coXCJZb3UgbXVzdCBzcGVjaWZ5IHRoZSB1cGRhdGUgb3BlcmF0aW9uXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih1cGRhdGUpKSBsb2dnZXIudGhyb3coXCJZb3UgbXVzdCBzcGVjaWZ5IHRoZSB1cGRhdGUgb3BlcmF0aW9uXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgICAgIGlmKHNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgICAgICBzZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICAgICAgX2lkOiBzZWxlY3Rpb25cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICAgICAgdmFyIHJlcyA9IG51bGw7XG4gICAgXG4gICAgICAgIHZhciBkb2NzID0gbnVsbDtcbiAgICAgICAgaWYgKG9wdGlvbnMubXVsdGkpIHtcbiAgICAgICAgICAgIGRvY3MgPSB0aGlzLmZpbmQoc2VsZWN0aW9uLCBudWxsLCB7IGZvcmNlRmV0Y2g6IHRydWUgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb2NzID0gdGhpcy5maW5kT25lKHNlbGVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGRvY3MpKSB7XG4gICAgICAgICAgICBkb2NzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc0FycmF5KGRvY3MpKSB7XG4gICAgICAgICAgICBkb2NzID0gW2RvY3NdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZG9jcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLnVwc2VydCkge1xuICAgICAgICAgICAgICAgIHZhciBpbnNlcnRlZCA9IHRoaXMuaW5zZXJ0KHVwZGF0ZSk7XG4gICAgXG4gICAgICAgICAgICAgICAgcmVzID0ge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRlZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBbaW5zZXJ0ZWRdLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IDFcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vIGRvY3VtZW50cyBmb3VuZFxuICAgICAgICAgICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHVwZGF0ZWREb2NzID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZG9jcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBkb2MgPSBkb2NzW2ldO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBvdmVycmlkZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIGhhc01vZGlmaWVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJRTcgZG9lc24ndCBzdXBwb3J0IGluZGV4aW5nIGludG8gc3RyaW5ncyAoZWcsIGtleVswXSBvciBrZXkuaW5kZXhPZignJCcpICksIHNvIHVzZSBzdWJzdHIuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRlc3Rpbmcgb3ZlciB0aGUgZmlyc3QgbGV0dGVyOlxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgIEJlc3RzIHJlc3VsdCB3aXRoIDFlOCBsb29wcyA9PiBrZXlbMF0ofjNzKSA+IHN1YnN0cih+NXMpID4gcmVnZXhwKH42cykgPiBpbmRleE9mKH4xNnMpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB2YXIgbW9kaWZpZXIgPSAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vZGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNNb2RpZmllciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnVwZGF0ZUFzTW9uZ28pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNNb2RpZmllciAmJiAhbW9kaWZpZXIpIGxvZ2dlci50aHJvdyhcIkFsbCB1cGRhdGUgZmllbGRzIG11c3QgYmUgYW4gdXBkYXRlIG9wZXJhdG9yXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc01vZGlmaWVyICYmIG9wdGlvbnMubXVsdGkpIGxvZ2dlci50aHJvdyhcIllvdSBjYW4gbm90IHVwZGF0ZSBzZXZlcmFsIGRvY3VtZW50cyB3aGVuIG5vIHVwZGF0ZSBvcGVyYXRvcnMgYXJlIGluY2x1ZGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFzTW9kaWZpZXIpIG92ZXJyaWRlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFzTW9kaWZpZXIpIG92ZXJyaWRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJyaWRlID0gISFvcHRpb25zLm92ZXJyaWRlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBfZG9jVXBkYXRlID0gbnVsbDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAob3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT3ZlcnJpZGVzIHRoZSBkb2N1bWVudCBleGNlcHQgZm9yIHRoZSBcIl9pZFwiXG4gICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfaWQ6IGRvYy5faWRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE11c3QgaWdub3JlIGZpZWxkcyBzdGFydGluZyB3aXRoICckJywgJy4nLi4uXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcgfHwgL1xcLi9nLnRlc3Qoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBUaGUgZmllbGQgJHtrZXl9IGNhbiBub3QgYmVnaW4gd2l0aCAnJCcgb3IgY29udGFpbiAnLidgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RvY1VwZGF0ZVtrZXldID0gdXBkYXRlW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfZG9jVXBkYXRlID0gXy5jbG9uZURlZXAoZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2YWwgPSB1cGRhdGVba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGUgPSBfYXBwbHlNb2RpZmllcihfZG9jVXBkYXRlLCBrZXksIHZhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghXy5pc05pbChfZG9jVXBkYXRlW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZG9jVXBkYXRlW2tleV0gPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihcIlRoZSBmaWVsZCAnX2lkJyBjYW4gbm90IGJlIHVwZGF0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgVGhlIGRvY3VtZW50IGRvZXMgbm90IGNvbnRhaW5zIHRoZSBmaWVsZCAke2tleX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdXBkYXRlZERvY3MucHVzaChfZG9jVXBkYXRlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsZXQgaWR4ID0gdGhpcy5kb2NfaW5kZXhlc1tfZG9jVXBkYXRlLl9pZF07XG4gICAgICAgICAgICAgICAgdGhpcy5kb2NzW2lkeF0gPSBfZG9jVXBkYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFwidXBkYXRlXCIgZXZlbnQuXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+dXBkYXRlXG4gICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb2xsZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbGxlY3Rpb25cbiAgICAgICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzZWxlY3RvciAtIFRoZSBzZWxlY3Rpb24gb2YgdGhlIHF1ZXJ5XG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gbW9kaWZpZXIgLSBUaGUgbW9kaWZpZXIgdXNlZCBpbiB0aGUgcXVlcnlcbiAgICAgICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkb2NzIC0gVGhlIHVwZGF0ZWQvaW5zZXJ0ZWQgZG9jdW1lbnRzIGluZm9ybWF0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICAgICAndXBkYXRlJyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIG1vZGlmaWVyOiB1cGRhdGUsXG4gICAgICAgICAgICAgICAgICAgIGRvY3M6IHVwZGF0ZWREb2NzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzID0ge1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiB1cGRhdGVkRG9jcyxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IHVwZGF0ZWREb2NzLmxlbmd0aFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlcyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgXG4gICAgdmFyIF9hcHBseU1vZGlmaWVyID0gZnVuY3Rpb24oX2RvY1VwZGF0ZSwga2V5LCB2YWwpIHtcbiAgICAgICAgdmFyIGRvYyA9IF8uY2xvbmVEZWVwKF9kb2NVcGRhdGUpO1xuICAgICAgICAvLyB2YXIgbW9kID0gX21vZGlmaWVyc1trZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiAoIV9tb2RpZmllcnNba2V5XSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KGBJbnZhbGlkIG1vZGlmaWVyIHNwZWNpZmllZDogJHtrZXl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGtleXBhdGggaW4gdmFsKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB2YWxba2V5cGF0aF07XG4gICAgICAgICAgICB2YXIga2V5cGFydHMgPSBrZXlwYXRoLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIF9tb2RpZnkoZG9jLCBrZXlwYXJ0cywgdmFsdWUsIGtleSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHZhciBub19jcmVhdGUgPSAhIUNvbGxlY3Rpb24uX25vQ3JlYXRlTW9kaWZpZXJzW2tleV07XG4gICAgICAgICAgICAvLyB2YXIgZm9yYmlkX2FycmF5ID0gKGtleSA9PT0gXCIkcmVuYW1lXCIpO1xuICAgICAgICAgICAgLy8gdmFyIHRhcmdldCA9IENvbGxlY3Rpb24uX2ZpbmRNb2RUYXJnZXQoX2RvY1VwZGF0ZSwga2V5cGFydHMsIG5vX2NyZWF0ZSwgZm9yYmlkX2FycmF5KTtcbiAgICAgICAgICAgIC8vIHZhciBmaWVsZCA9IGtleXBhcnRzLnBvcCgpO1xuICAgIFxuICAgICAgICAgICAgLy8gbW9kKHRhcmdldCwgZmllbGQsIHZhbHVlLCBrZXlwYXRoLCBfZG9jVXBkYXRlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGRvYztcbiAgICB9O1xuICAgIFxuICAgIHZhciBfbW9kaWZ5ID0gZnVuY3Rpb24oZG9jdW1lbnQsIGtleXBhcnRzLCB2YWx1ZSwga2V5LCBsZXZlbCA9IDApIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IGxldmVsOyBpIDwga2V5cGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBwYXRoID0ga2V5cGFydHNbaV07XG4gICAgICAgICAgICBsZXQgaXNOdW1lcmljID0gL15bMC05XSskLy50ZXN0KHBhdGgpO1xuICAgICAgICAgICAgbGV0IHRhcmdldCA9IGRvY3VtZW50W3BhdGhdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY3JlYXRlID0gXy5oYXNJbihDb2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVycywga2V5KSA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgICAgICAgIGlmICghY3JlYXRlICYmICghXy5pc09iamVjdChkb2N1bWVudCkgfHwgXy5pc05pbCh0YXJnZXQpKSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhgVGhlIGVsZW1lbnQgXCIke3BhdGh9XCIgbXVzdCBleGlzdHMgaW4gXCIke0pTT04uc3RyaW5naWZ5KGRvY3VtZW50KX1cImApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KGRvY3VtZW50KSkge1xuICAgICAgICAgICAgICAgIC8vIERvIG5vdCBhbGxvdyAkcmVuYW1lIG9uIGFycmF5c1xuICAgICAgICAgICAgICAgIGlmIChrZXkgPT09IFwiJHJlbmFtZVwiKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGxldCB0aGUgdXNlIG9mIFwiYXJyYXlmaWVsZC48bnVtZXJpY19pbmRleD4uc3ViZmllbGRcIlxuICAgICAgICAgICAgICAgIGlmIChpc051bWVyaWMpIHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aCA9IF8udG9OdW1iZXIocGF0aCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KGBUaGUgZmllbGQgXCIke3BhdGh9XCIgY2FuIG5vdCBiZSBhcHBlbmRlZCB0byBhbiBhcnJheWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBGaWxsIHRoZSBhcnJheSB0byB0aGUgZGVzaXJlZCBsZW5ndGhcbiAgICAgICAgICAgICAgICB3aGlsZSAoZG9jdW1lbnQubGVuZ3RoIDwgcGF0aCkge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5wdXNoKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGkgPCBrZXlwYXJ0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNOaWwodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBhcmUgYWNjZXNzaW5nIHdpdGggXCJhcnJheUZpZWxkLjxudW1lcmljX2luZGV4PlwiXG4gICAgICAgICAgICAgICAgICAgIGlmIChfLmlzRmluaXRlKF8udG9OdW1iZXIoa2V5cGFydHNbaSArIDFdKSkpIHsgIC8vICB8fCBrZXlwYXJ0c1tpICsgMV0gPT09ICckJyAgLy8gVE9ETyBcImFycmF5RmllbGQuJFwiXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGRvY3VtZW50W3BhdGhdID0gX21vZGlmeSh0YXJnZXQsIGtleXBhcnRzLCB2YWx1ZSwga2V5LCBsZXZlbCArIDEpO1xuICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBkb2N1bWVudDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX21vZGlmaWVyc1trZXldKGRvY3VtZW50LCBwYXRoLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvY3VtZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIG9uZSBvciBtYW55IGRvY3VtZW50c1xuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiNyZW1vdmVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5qdXN0T25lPWZhbHNlXSAtIERlbGV0ZXMgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgdGhlIHNlbGVjdGlvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB0aGUgZGVsZXRlZCBkb2N1bWVudHNcbiAgICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoXy5pc05pbChzZWxlY3Rpb24pKSBzZWxlY3Rpb24gPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBzZWxlY3Rpb247XG4gICAgICAgICAgICBzZWxlY3Rpb24gPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHsganVzdE9uZTogZmFsc2UgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHdlIGFyZSBub3QgcGFzc2luZyBhIHNlbGVjdGlvbiBhbmQgd2UgYXJlIG5vdCByZW1vdmluZyBqdXN0IG9uZSwgaXMgdGhlIHNhbWUgYXMgYSBkcm9wXG4gICAgICAgIGlmIChPYmplY3Quc2l6ZShzZWxlY3Rpb24pID09PSAwICYmICFvcHRpb25zLmp1c3RPbmUpIHJldHVybiB0aGlzLmRyb3Aob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGFyZSB1c2luZyBhbiBvYmplY3RJZFxuICAgICAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICAgICAgc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgICAgIF9pZDogc2VsZWN0aW9uXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgIFxuICAgICAgICB2YXIgY3Vyc29yID0gdGhpcy5maW5kKHNlbGVjdGlvbik7XG4gICAgICAgIFxuICAgICAgICB2YXIgZG9jcyA9IFtdO1xuICAgICAgICBjdXJzb3IuZm9yRWFjaChkb2MgPT4ge1xuICAgICAgICAgICAgdmFyIGlkeCA9IHRoaXMuZG9jX2luZGV4ZXNbZG9jLl9pZF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmRvY19pbmRleGVzW2RvYy5faWRdO1xuICAgICAgICAgICAgdGhpcy5kb2NzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBkb2NzLnB1c2goZG9jKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogXCJyZW1vdmVcIiBldmVudC5cbiAgICAgICAgICpcbiAgICAgICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+cmVtb3ZlXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzZWxlY3RvciAtIFRoZSBzZWxlY3Rpb24gb2YgdGhlIHF1ZXJ5XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkb2NzIC0gVGhlIGRlbGV0ZWQgZG9jdW1lbnRzIGluZm9ybWF0aW9uXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAncmVtb3ZlJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgZG9jczogZG9jc1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBkb2NzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkb2NzO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQWxpYXMgZm9yIHtAbGluayBDb2xsZWN0aW9uI3JlbW92ZX1cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIENvbGxlY3Rpb24jZGVsZXRlXG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlKHNlbGVjdGlvbiwgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgIH07XG4gICAgIFxuICAgICAvKipcbiAgICAgKiBBbGlhcyBmb3Ige0BsaW5rIENvbGxlY3Rpb24jcmVtb3ZlfVxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiNkZXN0cm95XG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZShzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIERyb3BzIGEgY29sbGVjdGlvblxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiNkcm9wXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5kcm9wSW5kZXhlcz1mYWxzZV0gLSBUcnVlIGlmIHdlIHdhbnQgdG8gZHJvcCB0aGUgaW5kZXhlcyB0b29cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHJldHVybnMge09iamVjdH0gVHJ1ZSB3aGVuIHRoZSBjb2xsZWN0aW9uIGlzIGRyb3BwZWRcbiAgICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5kb2NfaW5kZXhlcyA9IHt9O1xuICAgICAgICB0aGlzLmRvY3MgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChvcHRpb25zLmRyb3BJbmRleGVzKSB7fSAvLyBUT0RPXG4gICAgICAgIFxuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAnZHJvcENvbGxlY3Rpb24nLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICAgICAgaW5kZXhlczogISFvcHRpb25zLmRyb3BJbmRleGVzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbnNlcnQgb3IgdXBkYXRlIGEgZG9jdW1lbnQuIElmIHRoZSBkb2N1bWVudCBoYXMgYW4gXCJfaWRcIiBpcyBhbiB1cGRhdGUgKHdpdGggdXBzZXJ0KSwgaWYgbm90IGlzIGFuIGluc2VydC5cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIENvbGxlY3Rpb24jc2F2ZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgLSBEb2N1bWVudCB0byBiZSBpbnNlcnRlZC91cGRhdGVkXG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmRyb3BJbmRleGVzPWZhbHNlXSAtIFRydWUgaWYgd2Ugd2FudCB0byBkcm9wIHRoZSBpbmRleGVzIHRvb1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy53cml0ZUNvbmNlcm49bnVsbF0gLSBBbiBvYmplY3QgZXhwcmVzc2luZyB0aGUgd3JpdGUgY29uY2VyblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUcnVlIHdoZW4gdGhlIGNvbGxlY3Rpb24gaXMgZHJvcHBlZFxuICAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbihkb2MsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKGRvYykgfHwgXy5pc0Z1bmN0aW9uKGRvYykpIGxvZ2dlci50aHJvdyhcIllvdSBtdXN0IHBhc3MgYSBkb2N1bWVudFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICBpZiAoXy5oYXNJbihkb2MsICdfaWQnKSkge1xuICAgICAgICAgICAgb3B0aW9ucy51cHNlcnQgPSB0cnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcy51cGRhdGUoXG4gICAgICAgICAgICAgICAgeyBfaWQ6IGRvYy5faWQgfSxcbiAgICAgICAgICAgICAgICBkb2MsXG4gICAgICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluc2VydChkb2MsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgKiBAaWdub3JlXG4gICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5lbnN1cmVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvL1RPRE8gSW1wbGVtZW50IEVuc3VyZUluZGV4XG4gICAgICAgIGxvZ2dlci50aHJvdygnQ29sbGVjdGlvbiNlbnN1cmVJbmRleCB1bmltcGxlbWVudGVkIGJ5IGRyaXZlcicpO1xuICAgIH07XG4gICAgXG4gICAgLy8gVE9ETyBkb2N1bWVudCAoYXQgc29tZSBwb2ludClcbiAgICAvLyBUT0RPIHRlc3RcbiAgICAvLyBUT0RPIG9idmlvdXNseSB0aGlzIHBhcnRpY3VsYXIgaW1wbGVtZW50YXRpb24gd2lsbCBub3QgYmUgdmVyeSBlZmZpY2llbnRcbiAgICAvKipcbiAgICAqIEBpZ25vcmVcbiAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLmJhY2t1cCA9IGZ1bmN0aW9uIChiYWNrdXBJRCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gYmFja3VwSUQ7XG4gICAgICAgICAgICBiYWNrdXBJRCA9IG5ldyBPYmplY3RJZCgpLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBcbiAgICAgICAgdGhpcy5zbmFwc2hvdHNbYmFja3VwSURdID0gXy5jbG9uZURlZXAodGhpcy5kb2NzKTtcbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgJ3NuYXBzaG90JyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRCxcbiAgICAgICAgICAgICAgICBkb2N1bWVudHM6IHRoaXMuc25hcHNob3RzW2JhY2t1cElEXSBcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICBcbiAgICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIGJhY2t1cElEOiBiYWNrdXBJRCxcbiAgICAgICAgICAgIGRvY3VtZW50czogdGhpcy5zbmFwc2hvdHNbYmFja3VwSURdXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgICBcbiAgICAvLyBMaXN0cyBhdmFpbGFibGUgQmFja3Vwc1xuICAgIC8qKlxuICAgICogQGlnbm9yZVxuICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuYmFja3VwcyA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgIFxuICAgICAgICB2YXIgYmFja3VwcyA9IFtdO1xuICAgIFxuICAgICAgICBmb3IgKGxldCBpZCBpbiB0aGlzLnNuYXBzaG90cykge1xuICAgICAgICAgICAgYmFja3Vwcy5wdXNoKHtpZDogaWQsIGRvY3VtZW50czogdGhpcy5zbmFwc2hvdHNbaWRdfSk7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCBiYWNrdXBzKTtcbiAgICBcbiAgICAgICAgcmV0dXJuIGJhY2t1cHM7XG4gICAgfTtcbiAgICBcbiAgICAvLyBMaXN0cyBhdmFpbGFibGUgQmFja3Vwc1xuICAgIC8qKlxuICAgICogQGlnbm9yZVxuICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlQmFja3VwID0gZnVuY3Rpb24gKGJhY2t1cElELCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGJhY2t1cElEKSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgICAgIGJhY2t1cElEID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICBcbiAgICAgICAgbGV0IHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgaWYgKGJhY2t1cElEKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5zbmFwc2hvdHNbXy50b1N0cmluZyhiYWNrdXBJRCldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXN1bHQgPSBiYWNrdXBJRDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc25hcHNob3RzID0ge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICAgIFxuICAgIFxuICAgIC8vIFJlc3RvcmUgdGhlIHNuYXBzaG90LiBJZiBubyBzbmFwc2hvdCBleGlzdHMsIHJhaXNlIGFuIGV4Y2VwdGlvbjtcbiAgICAvKipcbiAgICAqIEBpZ25vcmVcbiAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLnJlc3RvcmUgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24oYmFja3VwSUQpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGJhY2t1cElEO1xuICAgICAgICAgICAgYmFja3VwSUQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgIFxuICAgICAgICB2YXIgc25hcHNob3RDb3VudCA9IE9iamVjdC5zaXplKHRoaXMuc25hcHNob3RzKTtcbiAgICAgICAgdmFyIGJhY2t1cERhdGEgPSBudWxsO1xuICAgIFxuICAgICAgICBpZiAoc25hcHNob3RDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVGhlcmUgaXMgbm8gc25hcHNob3RzXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFiYWNrdXBJRCkge1xuICAgICAgICAgICAgICAgIGlmIChzbmFwc2hvdENvdW50ID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKFwiTm8gYmFja3VwSUQgcGFzc2VkLiBSZXN0b3JpbmcgdGhlIG9ubHkgc25hcHNob3RcIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgb25seSBzbmFwc2hvdFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdGhpcy5zbmFwc2hvdHMpIGJhY2t1cElEID0ga2V5O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIlRoZSBhcmUgc2V2ZXJhbCBzbmFwc2hvdHMuIFBsZWFzZSBzcGVjaWZ5IG9uZSBiYWNrdXBJRFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGJhY2t1cERhdGEgPSB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIGlmICghYmFja3VwRGF0YSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KGBVbmtub3duIEJhY2t1cCBJRDogJHtiYWNrdXBJRH1gKTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICB0aGlzLmRvY3MgPSBiYWNrdXBEYXRhO1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAncmVzdG9yZScsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICBiYWNrdXBJRDogYmFja3VwSURcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsKTtcbiAgICBcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIGFnZ3JlZ2F0ZSB2YWx1ZXMgZm9yIHRoZSBkYXRhIGluIGEgY29sbGVjdGlvblxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiNhZ2dyZWdhdGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwaXBlbGluZSAtIEEgc2VxdWVuY2Ugb2YgZGF0YSBhZ2dyZWdhdGlvbiBvcGVyYXRpb25zIG9yIHN0YWdlc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmZvcmNlRmV0Y2g9ZmFsc2VdIC0gSWYgc2V0IHRvJ1widHJ1ZVwiIHJldHVybnMgdGhlIGFycmF5IG9mIGRvY3VtZW50cyBhbHJlYWR5IGZldGNoZWRcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl8Q3Vyc29yfSBJZiBcIm9wdGlvbnMuZm9yY2VGZXRjaFwiIHNldCB0byB0cnVlIHJldHVybnMgdGhlIGFycmF5IG9mIGRvY3VtZW50cywgb3RoZXJ3aXNlIHJldHVybnMgYSBjdXJzb3JcbiAgICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5hZ2dyZWdhdGUgPSBmdW5jdGlvbihwaXBlbGluZSwgb3B0aW9ucyA9IHsgZm9yY2VGZXRjaDogZmFsc2UgfSkge1xuICAgICAgICBpZiAoXy5pc05pbChwaXBlbGluZSkgfHwgIV8uaXNBcnJheShwaXBlbGluZSkpIGxvZ2dlci50aHJvdygnVGhlIFwicGlwZWxpbmVcIiBwYXJhbSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgIFxuICAgICAgICB2YXIgYWdncmVnYXRpb24gPSBuZXcgQWdncmVnYXRpb24ocGlwZWxpbmUpO1xuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwaXBlbGluZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IHN0YWdlID0gcGlwZWxpbmVbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiBzdGFnZSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpICE9PSAnJCcpIGxvZ2dlci50aHJvdyhcIlRoZSBwaXBlbGluZSBzdGFnZXMgbXVzdCBiZWdpbiB3aXRoICckJ1wiKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWFnZ3JlZ2F0aW9uLnZhbGlkU3RhZ2Uoa2V5KSkgbG9nZ2VyLnRocm93KGBJbnZhbGlkIHN0YWdlIFwiJHtrZXl9XCJgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHJlc3VsdCA9IGFnZ3JlZ2F0aW9uLmFnZ3JlZ2F0ZSh0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7ICAvLyBjaGFuZ2UgdG8gY3Vyc29yXG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAqIEBpZ25vcmVcbiAgICAqL1xuICAgIENvbGxlY3Rpb24uX25vQ3JlYXRlTW9kaWZpZXJzID0ge1xuICAgICAgICAkdW5zZXQ6IHRydWUsXG4gICAgICAgICRwb3A6IHRydWUsXG4gICAgICAgICRyZW5hbWU6IHRydWUsXG4gICAgICAgICRwdWxsOiB0cnVlLFxuICAgICAgICAkcHVsbEFsbDogdHJ1ZVxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgKiBAaWdub3JlXG4gICAgKi9cbiAgICB2YXIgX21vZGlmaWVycyA9IHtcbiAgICAgICAgJGluYzogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAgICAgaWYgKCFfLmlzTnVtYmVyKGFyZykpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJNb2RpZmllciAkaW5jIGFsbG93ZWQgZm9yIG51bWJlcnMgb25seVwiKTtcbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIV8uaXNOdW1iZXIodGFyZ2V0W2ZpZWxkXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRpbmMgbW9kaWZpZXIgdG8gbm9uLW51bWJlclwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSArPSBhcmc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgXG4gICAgICAgICRzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBfLmNsb25lRGVlcChhcmcpO1xuICAgICAgICB9LFxuICAgIFxuICAgICAgICAkdW5zZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgICAgIGlmICghXy5pc05pbCh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIFxuICAgICAgICAkcHVzaDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNOaWwoeCkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gW2FyZ107XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJHB1c2ggbW9kaWZpZXIgdG8gbm9uLWFycmF5XCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4LnB1c2goXy5jbG9uZURlZXAoYXJnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgXG4gICAgICAgICRwdXNoQWxsOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG4gICAgXG4gICAgICAgICAgICBpZiAoXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJNb2RpZmllciAkcHVzaEFsbC9wdWxsQWxsIGFsbG93ZWQgZm9yIGFycmF5cyBvbmx5XCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB4LnB1c2goYXJnW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgXG4gICAgICAgICRhZGRUb1NldDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNOaWwoeCkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gW2FyZ107XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJGFkZFRvU2V0IG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGlzRWFjaCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChfLmlzUGxhaW5PYmplY3QoYXJnKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBrIGluIGFyZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGsgPT09IFwiJGVhY2hcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzRWFjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZXMgPSBpc0VhY2ggPyBhcmdbXCIkZWFjaFwiXSA6IFthcmddO1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh2YWx1ZXMsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChTZWxlY3Rvck1hdGNoZXIuZXF1YWwodmFsdWUsIHhbaV0pKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgICAgICAgICAgeC5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICBcbiAgICAgICAgJHBvcDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAgICAgaWYgKF8uaXNOaWwodGFyZ2V0KSB8fCBfLmlzTmlsKHRhcmdldFtmaWVsZF0pKSByZXR1cm47XG4gICAgXG4gICAgICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG4gICAgXG4gICAgICAgICAgICBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcG9wIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNOdW1iZXIoYXJnKSAmJiBhcmcgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHguc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHgucG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIFxuICAgICAgICAkcHVsbDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAgICAgaWYgKF8uaXNOaWwodGFyZ2V0KSB8fCBfLmlzTmlsKHRhcmdldFtmaWVsZF0pKSByZXR1cm47XG4gICAgXG4gICAgICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG4gICAgXG4gICAgICAgICAgICBpZiAoIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkcHVsbC9wdWxsQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiICYmICEoYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFhYWCB3b3VsZCBiZSBtdWNoIG5pY2VyIHRvIGNvbXBpbGUgdGhpcyBvbmNlLCByYXRoZXIgdGhhblxuICAgICAgICAgICAgICAgICAgICAvLyBmb3IgZWFjaCBkb2N1bWVudCB3ZSBtb2RpZnkuLiBidXQgdXN1YWxseSB3ZSdyZSBub3RcbiAgICAgICAgICAgICAgICAgICAgLy8gbW9kaWZ5aW5nIHRoYXQgbWFueSBkb2N1bWVudHMsIHNvIHdlJ2xsIGxldCBpdCBzbGlkZSBmb3JcbiAgICAgICAgICAgICAgICAgICAgLy8gbm93XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFhYWCBfY29tcGlsZVNlbGVjdG9yIGlzbid0IHVwIGZvciB0aGUgam9iLCBiZWNhdXNlIHdlIG5lZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gdG8gcGVybWl0IHN0dWZmIGxpa2UgeyRwdWxsOiB7YTogeyRndDogNH19fS4uIHNvbWV0aGluZ1xuICAgICAgICAgICAgICAgICAgICAvLyBsaWtlIHskZ3Q6IDR9IGlzIG5vdCBub3JtYWxseSBhIGNvbXBsZXRlIHNlbGVjdG9yLlxuICAgICAgICAgICAgICAgICAgICB2YXIgbWF0Y2ggPSBuZXcgU2VsZWN0b3Ioe1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX21hdGNoaW5nX19cIjogYXJnXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfZG9jXyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfX21hdGNoaW5nX186IHhbaV1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGNoLnRlc3QoX2RvY18pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghU2VsZWN0b3JNYXRjaGVyLmVxdWFsKHhbaV0sIGFyZykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCh4W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIFxuICAgICAgICAkcHVsbEFsbDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAgICAgaWYgKF8uaXNOaWwodGFyZ2V0KSB8fCBfLmlzTmlsKHRhcmdldFtmaWVsZF0pKSByZXR1cm47XG4gICAgXG4gICAgICAgICAgICB2YXIgeCA9IHRhcmdldFtmaWVsZF07XG4gICAgXG4gICAgICAgICAgICBpZiAoIV8uaXNOaWwoeCkgJiYgIV8uaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIk1vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHlcIik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFfLmlzTmlsKHgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuICAgIFxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXhjbHVkZSA9IGZhbHNlO1xuICAgIFxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGFyZy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yTWF0Y2hlci5lcXVhbCh4W2ldLCBhcmdbal0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhjbHVkZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleGNsdWRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCh4W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIFxuICAgICAgICAkcmVuYW1lOiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChmaWVsZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBubyBpZGVhIHdoeSBtb25nbyBoYXMgdGhpcyByZXN0cmljdGlvbi4uXG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVGhlIG5ldyBmaWVsZCBuYW1lIG11c3QgYmUgZGlmZmVyZW50XCIpO1xuICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgaWYgKCFfLmlzU3RyaW5nKHZhbHVlKSB8fCB2YWx1ZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiVGhlIG5ldyBuYW1lIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nXCIpO1xuICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgdGFyZ2V0W3ZhbHVlXSA9IHRhcmdldFtmaWVsZF07XG4gICAgICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcbiAgICAgICAgfSxcbiAgICBcbiAgICAgICAgJGJpdDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAgICAgLy8gWFhYIG1vbmdvIG9ubHkgc3VwcG9ydHMgJGJpdCBvbiBpbnRlZ2VycywgYW5kIHdlIG9ubHkgc3VwcG9ydFxuICAgICAgICAgICAgLy8gbmF0aXZlIGphdmFzY3JpcHQgbnVtYmVycyAoZG91Ymxlcykgc28gZmFyLCBzbyB3ZSBjYW4ndCBzdXBwb3J0ICRiaXRcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIiRiaXQgaXMgbm90IHN1cHBvcnRlZFwiKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgKiBAaWdub3JlXG4gICAgKi9cbiAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUgPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSkge1xuICAgICAgICBpZiAoIV8uaXNTdHJpbmcoY29sbGVjdGlvbk5hbWUpKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWUgbXVzdCBiZSBhIFN0cmluZ1wiKTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICBpZiAoIWNvbGxlY3Rpb25OYW1lIHx8IGNvbGxlY3Rpb25OYW1lLmluZGV4T2YoJy4uJykgIT09IC0xKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIGNhbm5vdCBiZSBlbXB0eVwiKTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICBpZiAoY29sbGVjdGlvbk5hbWUuaW5kZXhPZignJCcpICE9PSAtMSAmJiBjb2xsZWN0aW9uTmFtZS5tYXRjaCgvKCheXFwkY21kKXwob3Bsb2dcXC5cXCRtYWluKSkvKSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBjb250YWluICckJ1wiKTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICBpZiAoY29sbGVjdGlvbk5hbWUubWF0Y2goL15zeXN0ZW1cXC4vKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBtdXN0IG5vdCBzdGFydCB3aXRoICdzeXN0ZW0uJyAocmVzZXJ2ZWQgZm9yIGludGVybmFsIHVzZSlcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChjb2xsZWN0aW9uTmFtZS5tYXRjaCgvXlxcLnxcXC4kLykgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgbXVzdCBub3Qgc3RhcnQgb3IgZW5kIHdpdGggJy4nXCIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAqIEBpZ25vcmVcbiAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLnJlbmFtZSA9IGZ1bmN0aW9uKG5ld05hbWUpIHtcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcobmV3TmFtZSkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm5hbWUgIT09IG5ld05hbWUpIHtcbiAgICAgICAgICAgICAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUobmV3TmFtZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIGRiTmFtZSA9IHRoaXMubmFtZS5zcGxpdCgnLicpLmxlbmd0aCA+IDEgPyB0aGlzLm5hbWUuc3BsaXQoJy4nKVswXSA6ICcnO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoaXMubmFtZSA9IG5ld05hbWU7XG4gICAgICAgICAgICAgICAgdGhpcy5mdWxsTmFtZSA9IGRiTmFtZSArICcuJyArIHRoaXMubmFtZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEVycm9yXG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHNpemUgb2YgYW4gb2JqZWN0LlxuICAgICAqIFxuICAgICAqIEBtZXRob2QgT2JqZWN0I3NpemVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG9iamVjdFxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBzaXplIG9mIHRoZSBvYmplY3RcbiAgICAgKi9cbiAgICBPYmplY3Quc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICB2YXIgc2l6ZSA9IDAsIFxuICAgICAgICAgICAga2V5O1xuICAgICAgICBcbiAgICAgICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzaXplO1xuICAgIH07XG4gICAgXG4gICAgdmFyIF9lbnN1cmVGaW5kUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgIC8vIHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zLCBjYWxsYmFja1xuICAgICAgICBpZiAoXy5pc05pbChwYXJhbXMuc2VsZWN0aW9uKSkgcGFyYW1zLnNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgICAgICBpZiAoXy5pc05pbChwYXJhbXMuc2VsZWN0aW9uKSkgcGFyYW1zLnNlbGVjdGlvbiA9IHt9O1xuICAgIFxuICAgICAgICBpZiAoXy5pc05pbChwYXJhbXMuZmllbGRzKSkgcGFyYW1zLmZpZWxkcyA9IFtdO1xuICAgIFxuICAgICAgICBpZiAoXy5pc05pbChwYXJhbXMub3B0aW9ucykpIHtcbiAgICAgICAgICAgIHBhcmFtcy5vcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIHNraXA6IDAsXG4gICAgICAgICAgICAgICAgbGltaXQ6IDE1IC8vIGZvciBubyBsaW1pdCBwYXNzIFtvcHRpb25zLmxpbWl0ID0gLTFdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIC8vIGNhbGxiYWNrIGFzIGZpcnN0IHBhcmFtZXRlclxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHBhcmFtcy5zZWxlY3Rpb24pKSB7XG4gICAgICAgICAgICBwYXJhbXMuY2FsbGJhY2sgPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgICAgICAgICAgcGFyYW1zLnNlbGVjdGlvbiA9IHt9O1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIC8vIGNhbGxiYWNrIGFzIHNlY29uZCBwYXJhbWV0ZXJcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihwYXJhbXMuZmllbGRzKSkge1xuICAgICAgICAgICAgcGFyYW1zLmNhbGxiYWNrID0gcGFyYW1zLmZpZWxkcztcbiAgICAgICAgICAgIHBhcmFtcy5maWVsZHMgPSBbXTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICAvLyBjYWxsYmFjayBhcyB0aGlyZCBwYXJhbWV0ZXJcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihwYXJhbXMub3B0aW9ucykpIHtcbiAgICAgICAgICAgIHBhcmFtcy5jYWxsYmFjayA9IHBhcmFtcy5vcHRpb25zO1xuICAgICAgICAgICAgcGFyYW1zLm9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICAvLyBDaGVjayBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UgYXJlIHVzaW5nIGFuIG9iamVjdElkXG4gICAgICAgIGlmIChwYXJhbXMuc2VsZWN0aW9uIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgICAgIHBhcmFtcy5zZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICAgICAgX2lkOiBwYXJhbXMuc2VsZWN0aW9uXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIGlmICghXy5pc05pbChwYXJhbXMuY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24ocGFyYW1zLmNhbGxiYWNrKSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIGlmIChwYXJhbXMub3B0aW9ucy5maWVsZHMpIHtcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHBhcmFtcy5maWVsZHMpIHx8IHBhcmFtcy5maWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmZpZWxkcyA9IHBhcmFtcy5vcHRpb25zLmZpZWxkcztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oXCJGaWVsZHMgYWxyZWFkeSBwcmVzZW50LiBJZ25vcmluZyAnb3B0aW9ucy5maWVsZHMnLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICB9O1xuICAgIFxuICAgIHJldHVybiBDb2xsZWN0aW9uO1xufTsiXX0=
