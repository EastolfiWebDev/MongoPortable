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

        var cursor = new Cursor(this.docs, selection, fields, options);

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

        var cursor = new Cursor(this.docs, selection, fields, options);

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkNvbGxlY3Rpb24uanMiXSwibmFtZXMiOlsibG9nZ2VyIiwibW9kdWxlIiwiZXhwb3J0cyIsIkFnZ3JlZ2F0aW9uIiwiQ3Vyc29yIiwiU2VsZWN0b3IiLCJTZWxlY3Rvck1hdGNoZXIiLCJPYmplY3RJZCIsIkV2ZW50RW1pdHRlciIsIkxvZ2dlciIsIl8iLCJkYXRhYmFzZSIsIkNvbGxlY3Rpb24iLCJkYiIsImNvbGxlY3Rpb25OYW1lIiwib3B0aW9ucyIsImluc3RhbmNlIiwiaXNOaWwiLCJ0aHJvdyIsImlzUGxhaW5PYmplY3QiLCJjaGVja0NvbGxlY3Rpb25OYW1lIiwibmFtZSIsImRhdGFiYXNlTmFtZSIsImZ1bGxOYW1lIiwiZG9jcyIsImRvY19pbmRleGVzIiwic25hcHNob3RzIiwib3B0cyIsIm1lcmdlIiwiYXJncyIsImNiIiwiX3N0b3JlcyIsInByb3RvdHlwZSIsImluc2VydCIsImRvYyIsImNhbGxiYWNrIiwiaXNGdW5jdGlvbiIsIl9kb2MiLCJjbG9uZURlZXAiLCJpc051bWJlciIsIl9pZCIsInRvU3RyaW5nIiwiaXNTdHJpbmciLCJsZW5ndGgiLCJ0aW1lc3RhbXAiLCJnZW5lcmF0aW9uVGltZSIsInB1c2giLCJlbWl0IiwiY29sbGVjdGlvbiIsImNoYWluIiwiYnVsa0luc2VydCIsImlzQXJyYXkiLCJfZG9jcyIsImkiLCJmaW5kIiwic2VsZWN0aW9uIiwiZmllbGRzIiwicGFyYW1zIiwiX2Vuc3VyZUZpbmRQYXJhbXMiLCJzZWxlY3RvciIsImN1cnNvciIsImZldGNoIiwiZm9yY2VGZXRjaCIsImZpbmRPbmUiLCJyZXMiLCJoYXNOZXh0IiwibmV4dCIsInVwZGF0ZSIsInNraXAiLCJsaW1pdCIsIm11bHRpIiwidXBzZXJ0IiwiaW5zZXJ0ZWQiLCJ1cGRhdGVkIiwiZG9jdW1lbnRzIiwiY291bnQiLCJ1cGRhdGVkRG9jcyIsIm92ZXJyaWRlIiwiaGFzTW9kaWZpZXIiLCJrZXkiLCJtb2RpZmllciIsInN1YnN0ciIsInVwZGF0ZUFzTW9uZ28iLCJfZG9jVXBkYXRlIiwidGVzdCIsIndhcm4iLCJ2YWwiLCJfYXBwbHlNb2RpZmllciIsImlkeCIsIl9tb2RpZmllcnMiLCJrZXlwYXRoIiwidmFsdWUiLCJrZXlwYXJ0cyIsInNwbGl0IiwiX21vZGlmeSIsImRvY3VtZW50IiwibGV2ZWwiLCJwYXRoIiwiaXNOdW1lcmljIiwidGFyZ2V0IiwiY3JlYXRlIiwiaGFzSW4iLCJfbm9DcmVhdGVNb2RpZmllcnMiLCJpc09iamVjdCIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0b051bWJlciIsImlzRmluaXRlIiwicmVtb3ZlIiwianVzdE9uZSIsIk9iamVjdCIsInNpemUiLCJkcm9wIiwiZm9yRWFjaCIsInNwbGljZSIsImRlbGV0ZSIsImRlc3Ryb3kiLCJkcm9wSW5kZXhlcyIsImluZGV4ZXMiLCJzYXZlIiwiZW5zdXJlSW5kZXgiLCJiYWNrdXAiLCJiYWNrdXBJRCIsInJlc3VsdCIsImJhY2t1cHMiLCJpZCIsInJlbW92ZUJhY2t1cCIsInJlc3RvcmUiLCJzbmFwc2hvdENvdW50IiwiYmFja3VwRGF0YSIsImluZm8iLCJhZ2dyZWdhdGUiLCJwaXBlbGluZSIsImFnZ3JlZ2F0aW9uIiwic3RhZ2UiLCJ2YWxpZFN0YWdlIiwiJHVuc2V0IiwiJHBvcCIsIiRyZW5hbWUiLCIkcHVsbCIsIiRwdWxsQWxsIiwiJGluYyIsImZpZWxkIiwiYXJnIiwiJHNldCIsIiRwdXNoIiwieCIsIiRwdXNoQWxsIiwiJGFkZFRvU2V0IiwiaXNFYWNoIiwiayIsInZhbHVlcyIsImVxdWFsIiwicG9wIiwib3V0IiwiQXJyYXkiLCJtYXRjaCIsIl9kb2NfIiwiX19tYXRjaGluZ19fIiwiZXhjbHVkZSIsImoiLCJ0cmltIiwiJGJpdCIsImluZGV4T2YiLCJyZW5hbWUiLCJuZXdOYW1lIiwiZGJOYW1lIiwib2JqIiwiaGFzT3duUHJvcGVydHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7Ozs7OztBQVNBLElBQUlBLFNBQVMsSUFBYjs7QUFFQUMsT0FBT0MsT0FB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dkQsRUFBMEQ7QUFDdERjLHVCQUFPRCxNQUFQLEdBQWdCQyxPQUFPMUMsT0FBUCxDQUFleUMsTUFBL0I7QUFDSCxhQUZELE1BRU87QUFDSHhELHVCQUFPcUYsSUFBUCxDQUFZLG9EQUFaO0FBQ0g7QUFDSjs7QUFFRCxlQUFPNUIsTUFBUDtBQUNILEtBckREOztBQXVEQSxXQUFPN0MsVUFBUDtBQUNILENBMXZDRCIsImZpbGUiOiJDb2xsZWN0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBDb2xsZWN0aW9uLmpzIC0gYmFzZWQgb24gTW9uZ2xvI0NvbGxlY3Rpb24gKHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vTW9uZ2xvfSkgYnkgQ2hyaXN0aWFuIFN1bGxpdmFuIDxjc0BldWZvcmljLmNvPiB8IENvcHlyaWdodCAoYykgMjAxMlxuICogQHZlcnNpb24gMS4wLjBcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgbG9nZ2VyID0gbnVsbDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihBZ2dyZWdhdGlvbiwgQ3Vyc29yLCBTZWxlY3RvciwgU2VsZWN0b3JNYXRjaGVyLCBPYmplY3RJZCwgRXZlbnRFbWl0dGVyLCBMb2dnZXIsIF8pIHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb2xsZWN0aW9uXG4gICAgICogXG4gICAgICogQG1vZHVsZSBDb2xsZWN0aW9uXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHNpbmNlIDAuMC4xXG4gICAgICogXG4gICAgICogQGNsYXNzZGVzYyBDb2xsZWN0aW9uIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjb2xsZWN0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIERhdGFiYXNlIG9iamVjdFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gICAgICogXG4gICAgICovXG4gICAgdmFyIGRhdGFiYXNlID0gbnVsbDtcbiAgICBjbGFzcyBDb2xsZWN0aW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICAvLyB2YXIgQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucykge1xuICAgICAgICBjb25zdHJ1Y3RvcihkYiwgY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHN1cGVyKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDb2xsZWN0aW9uKSkgcmV0dXJuIG5ldyBDb2xsZWN0aW9uKGRiLCBjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc05pbChkYikpIGxvZ2dlci50aHJvdyhcImRiIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNOaWwoY29sbGVjdGlvbk5hbWUpKSBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uTmFtZSBwYXJhbWV0ZXIgcmVxdWlyZWRcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpIHx8ICFfLmlzUGxhaW5PYmplY3Qob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKGNvbGxlY3Rpb25OYW1lKTtcbiAgICAgICAgXG4gICAgICAgICAgICAvLyB0aGlzLmRiID0gZGI7XG4gICAgICAgICAgICBkYXRhYmFzZSA9IGRiO1xuICAgICAgICAgICAgdGhpcy5uYW1lID0gY29sbGVjdGlvbk5hbWU7XG4gICAgICAgICAgICB0aGlzLmRhdGFiYXNlTmFtZSA9IGRiLmRhdGFiYXNlTmFtZTtcbiAgICAgICAgICAgIHRoaXMuZnVsbE5hbWUgPSB0aGlzLmRhdGFiYXNlTmFtZSArICcuJyArIHRoaXMubmFtZTtcbiAgICAgICAgICAgIHRoaXMuZG9jcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5kb2NfaW5kZXhlcyA9IHt9O1xuICAgICAgICAgICAgdGhpcy5zbmFwc2hvdHMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMub3B0cyA9IHt9OyAvLyBEZWZhdWx0IG9wdGlvbnNcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXy5tZXJnZSh0aGlzLm9wdHMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB0aGlzLmVtaXQgPSBkYi5lbWl0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBlbWl0KG5hbWUsIGFyZ3MsIGNiKSB7XG4gICAgICAgICAgICBzdXBlci5lbWl0KG5hbWUsIGFyZ3MsIGNiLCBkYXRhYmFzZS5fc3RvcmVzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBUT0RPIGVuZm9yY2UgcnVsZSB0aGF0IGZpZWxkIG5hbWVzIGNhbid0IHN0YXJ0IHdpdGggJyQnIG9yIGNvbnRhaW4gJy4nXG4gICAgLy8gKHJlYWwgbW9uZ29kYiBkb2VzIGluIGZhY3QgZW5mb3JjZSB0aGlzKVxuICAgIC8vIFRPRE8gcG9zc2libHkgZW5mb3JjZSB0aGF0ICd1bmRlZmluZWQnIGRvZXMgbm90IGFwcGVhciAod2UgYXNzdW1lXG4gICAgLy8gdGhpcyBpbiBvdXIgaGFuZGxpbmcgb2YgbnVsbCBhbmQgJGV4aXN0cylcbiAgICAvKipcbiAgICAgKiBJbnNlcnRzIGEgZG9jdW1lbnQgaW50byB0aGUgY29sbGVjdGlvblxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiNpbnNlcnRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZG9jIC0gRG9jdW1lbnQgdG8gYmUgaW5zZXJ0ZWRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5jaGFpbj1mYWxzZV0gLSBJZiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBzbyBpdCBjYW4gYmUgY2hhaW5lZCB3aXRoIG90aGVyIG1ldGhvZHNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R8Q29sbGVjdGlvbn0gSWYgXCJvcHRpb25zLmNoYWluXCIgc2V0IHRvIFwidHJ1ZVwiIHJldHVybnMgdGhpcyBpbnN0YW5jZSwgb3RoZXJ3aXNlIHJldHVybnMgdGhlIGluc2VydGVkIGRvY3VtZW50XG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24gKGRvYywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoZG9jKSkgbG9nZ2VyLnRocm93KFwiZG9jIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc1BsYWluT2JqZWN0KGRvYykpIGxvZ2dlci50aHJvdyhcImRvYyBtdXN0IGJlIGFuIG9iamVjdFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0aW5nIGEgc2FmZSBjb3B5IG9mIHRoZSBkb2N1bWVudFxuICAgICAgICB2YXIgX2RvYyA9IF8uY2xvbmVEZWVwKGRvYyk7XG4gICAgXG4gICAgICAgIC8vIElmIHRoZSBkb2N1bWVudCBjb21lcyB3aXRoIGEgbnVtYmVyIElELCBwYXJzZSBpdCB0byBTdHJpbmdcbiAgICAgICAgaWYgKF8uaXNOdW1iZXIoX2RvYy5faWQpKSB7XG4gICAgICAgICAgICBfZG9jLl9pZCA9IF8udG9TdHJpbmcoX2RvYy5faWQpO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIGlmIChfLmlzTmlsKF9kb2MuX2lkKSB8fCAoIV9kb2MuX2lkIGluc3RhbmNlb2YgT2JqZWN0SWQgJiYgKCFfLmlzU3RyaW5nKF9kb2MuX2lkKSB8fCAhX2RvYy5faWQubGVuZ3RoKSkpIHtcbiAgICAgICAgICAgIF9kb2MuX2lkID0gbmV3IE9iamVjdElkKCk7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy8gQWRkIG9wdGlvbnMgdG8gbW9yZSBkYXRlc1xuICAgICAgICBfZG9jLnRpbWVzdGFtcCA9IG5ldyBPYmplY3RJZCgpLmdlbmVyYXRpb25UaW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gUmV2ZXJzZVxuICAgICAgICB0aGlzLmRvY19pbmRleGVzW18udG9TdHJpbmcoX2RvYy5faWQpXSA9IHRoaXMuZG9jcy5sZW5ndGg7XG4gICAgICAgIHRoaXMuZG9jcy5wdXNoKF9kb2MpO1xuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFwiaW5zZXJ0XCIgZXZlbnQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfmluc2VydFxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gZG9jIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGRvY3VtZW50IGluc2VydGVkXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAnaW5zZXJ0JyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIGRvYzogX2RvY1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIF9kb2MpO1xuICAgIFxuICAgICAgICBpZiAob3B0aW9ucy5jaGFpbikgcmV0dXJuIHRoaXM7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gX2RvYztcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEluc2VydHMgc2V2ZXJhbCBkb2N1bWVudHMgaW50byB0aGUgY29sbGVjdGlvblxuICAgICAqIFxuICAgICAqIEBtZXRob2QgQ29sbGVjdGlvbiNidWxrSW5zZXJ0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtBcnJheX0gZG9jcyAtIERvY3VtZW50cyB0byBiZSBpbnNlcnRlZFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNoYWluPWZhbHNlXSAtIElmIHNldCB0byBcInRydWVcIiByZXR1cm5zIHRoaXMgaW5zdGFuY2UsIHNvIGl0IGNhbiBiZSBjaGFpbmVkIHdpdGggb3RoZXIgbWV0aG9kc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHJldHVybnMge09iamVjdHxDb2xsZWN0aW9ufSBJZiBcIm9wdGlvbnMuY2hhaW5cIiBzZXQgdG8gXCJ0cnVlXCIgcmV0dXJucyB0aGlzIGluc3RhbmNlLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgaW5zZXJ0ZWQgZG9jdW1lbnRcbiAgICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5idWxrSW5zZXJ0ID0gZnVuY3Rpb24gKGRvY3MsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKGRvY3MpKSBsb2dnZXIudGhyb3coXCJkb2NzIHBhcmFtZXRlciByZXF1aXJlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc0FycmF5KGRvY3MpKSBsb2dnZXIudGhyb3coXCJkb2NzIG11c3QgYmUgYW4gYXJyYXlcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgIFxuICAgICAgICB2YXIgX2RvY3MgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZG9jcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IGRvYyA9IGRvY3NbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIF9kb2NzLnB1c2godGhpcy5pbnNlcnQoZG9jLCBvcHRpb25zKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgX2RvY3MpO1xuICAgIFxuICAgICAgICBpZiAob3B0aW9ucy5jaGFpbikgcmV0dXJuIHRoaXM7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gX2RvY3M7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBGaW5kcyBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDb2xsZWN0aW9uI2ZpbmRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtzZWxlY3Rpb249e31dIC0gVGhlIHNlbGVjdGlvbiBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbZmllbGRzPXt9XSAtIFRoZSBmaWVsZHMgb2YgdGhlIGRvY3VtZW50IHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnNraXBdIC0gTnVtYmVyIG9mIGRvY3VtZW50cyB0byBiZSBza2lwcGVkXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmxpbWl0XSAtIE1heCBudW1iZXIgb2YgZG9jdW1lbnRzIHRvIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtvcHRpb25zLmZpZWxkc10gLSBTYW1lIGFzIFwiZmllbGRzXCIgcGFyYW1ldGVyIChpZiBib3RoIHBhc3NlZCwgXCJvcHRpb25zLmZpZWxkc1wiIHdpbGwgYmUgaWdub3JlZClcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmZvcmNlRmV0Y2g9ZmFsc2VdIC0gSWYgc2V0IHRvJ1widHJ1ZVwiIHJldHVybnMgdGhlIGFycmF5IG9mIGRvY3VtZW50cyBhbHJlYWR5IGZldGNoZWRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHJldHVybnMge0FycmF5fEN1cnNvcn0gSWYgXCJvcHRpb25zLmZvcmNlRmV0Y2hcIiBzZXQgdG8gdHJ1ZSByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMsIG90aGVyd2lzZSByZXR1cm5zIGEgY3Vyc29yXG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgbGV0IHBhcmFtcyA9IF9lbnN1cmVGaW5kUGFyYW1zKHtcbiAgICAgICAgICAgIHNlbGVjdGlvbjogc2VsZWN0aW9uLCBcbiAgICAgICAgICAgIGZpZWxkczogZmllbGRzLFxuICAgICAgICAgICAgb3B0aW9uczogb3B0aW9ucywgXG4gICAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBzZWxlY3Rpb24gPSBwYXJhbXMuc2VsZWN0aW9uO1xuICAgICAgICBmaWVsZHMgPSBwYXJhbXMuZmllbGRzO1xuICAgICAgICBvcHRpb25zID0gcGFyYW1zLm9wdGlvbnM7XG4gICAgICAgIGNhbGxiYWNrID0gcGFyYW1zLmNhbGxiYWNrO1xuICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogXCJmaW5kXCIgZXZlbnQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfmZpbmRcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb2xsZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbGxlY3Rpb25cbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdGlvbiBvZiB0aGUgcXVlcnlcbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgc2hvd2VkIGluIHRoZSBxdWVyeVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgJ2ZpbmQnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICBmaWVsZHM6IGZpZWxkc1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgdmFyIGN1cnNvciA9IG5ldyBDdXJzb3IodGhpcy5kb2NzLCBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICAvLyBQYXNzIHRoZSBjdXJzb3IgZmV0Y2hlZCB0byB0aGUgY2FsbGJhY2tcbiAgICAgICAgLy8gQWRkIFtvcHRpb25zLm5vRmV0Y2hDYWxsYmFjayA9IHRydWVdXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgY3Vyc29yLmZldGNoKCkpO1xuICAgIFxuICAgICAgICBpZiAob3B0aW9ucy5mb3JjZUZldGNoKSB7XG4gICAgICAgICAgICByZXR1cm4gY3Vyc29yLmZldGNoKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gY3Vyc29yO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBGaW5kcyB0aGUgZmlyc3QgbWF0Y2hpbmcgZG9jdW1lbnRcbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIENvbGxlY3Rpb24jZmluZE9uZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheXxTdHJpbmd9IFtmaWVsZHM9e31dIC0gVGhlIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQgdG8gc2hvd1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2tpcF0gLSBOdW1iZXIgb2YgZG9jdW1lbnRzIHRvIGJlIHNraXBwZWRcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubGltaXRdIC0gTWF4IG51bWJlciBvZiBkb2N1bWVudHMgdG8gZGlzcGxheVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW29wdGlvbnMuZmllbGRzXSAtIFNhbWUgYXMgXCJmaWVsZHNcIiBwYXJhbWV0ZXIgKGlmIGJvdGggcGFzc2VkLCBcIm9wdGlvbnMuZmllbGRzXCIgd2lsbCBiZSBpZ25vcmVkKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBmaXJzdCBtYXRjaGluZyBkb2N1bWVudCBvZiB0aGUgY29sbGVjdGlvblxuICAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLmZpbmRPbmUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBmaWVsZHMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGxldCBwYXJhbXMgPSBfZW5zdXJlRmluZFBhcmFtcyh7XG4gICAgICAgICAgICBzZWxlY3Rpb246IHNlbGVjdGlvbiwgXG4gICAgICAgICAgICBmaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgICAgIG9wdGlvbnM6IG9wdGlvbnMsIFxuICAgICAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgc2VsZWN0aW9uID0gcGFyYW1zLnNlbGVjdGlvbjtcbiAgICAgICAgZmllbGRzID0gcGFyYW1zLmZpZWxkcztcbiAgICAgICAgb3B0aW9ucyA9IHBhcmFtcy5vcHRpb25zO1xuICAgICAgICBjYWxsYmFjayA9IHBhcmFtcy5jYWxsYmFjaztcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcImZpbmRPbmVcIiBldmVudC5cbiAgICAgICAgICpcbiAgICAgICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+ZmluZE9uZVxuICAgICAgICAgKiBcbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gc2VsZWN0b3IgLSBUaGUgc2VsZWN0aW9uIG9mIHRoZSBxdWVyeVxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBzaG93ZWQgaW4gdGhlIHF1ZXJ5XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAnZmluZE9uZScsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgIGZpZWxkczogZmllbGRzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICB2YXIgY3Vyc29yID0gbmV3IEN1cnNvcih0aGlzLmRvY3MsIHNlbGVjdGlvbiwgZmllbGRzLCBvcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIHZhciByZXMgPSBudWxsO1xuICAgICAgICBcbiAgICAgICAgaWYgKGN1cnNvci5oYXNOZXh0KCkpIHtcbiAgICAgICAgICAgIHJlcyA9IGN1cnNvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBhc3MgdGhlIGN1cnNvciBmZXRjaGVkIHRvIHRoZSBjYWxsYmFja1xuICAgICAgICAvLyBBZGQgW29wdGlvbnMubm9GZXRjaENhbGxiYWNrID0gdHJ1ZV1cbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgb25lIG9yIG1hbnkgZG9jdW1lbnRzXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDb2xsZWN0aW9uI3VwZGF0ZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW3VwZGF0ZT17fV0gLSBUaGUgdXBkYXRlIG9wZXJhdGlvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudXBkYXRlQXNNb25nbz10cnVlXSAtIEJ5IGRlZmF1bHQ6IFxuICAgICAqICAgICAgSWYgdGhlIFt1cGRhdGVdIG9iamVjdCBjb250YWlucyB1cGRhdGUgb3BlcmF0b3IgbW9kaWZpZXJzLCBzdWNoIGFzIHRob3NlIHVzaW5nIHRoZSBcIiRzZXRcIiBtb2RpZmllciwgdGhlbjpcbiAgICAgKiAgICAgICAgICA8dWw+XG4gICAgICogICAgICAgICAgICAgIDxsaT5UaGUgW3VwZGF0ZV0gb2JqZWN0IG11c3QgY29udGFpbiBvbmx5IHVwZGF0ZSBvcGVyYXRvciBleHByZXNzaW9uczwvbGk+XG4gICAgICogICAgICAgICAgICAgIDxsaT5UaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIHVwZGF0ZXMgb25seSB0aGUgY29ycmVzcG9uZGluZyBmaWVsZHMgaW4gdGhlIGRvY3VtZW50PC9saT5cbiAgICAgKiAgICAgICAgICA8dWw+XG4gICAgICogICAgICBJZiB0aGUgW3VwZGF0ZV0gb2JqZWN0IGNvbnRhaW5zIG9ubHkgXCJmaWVsZDogdmFsdWVcIiBleHByZXNzaW9ucywgdGhlbjpcbiAgICAgKiAgICAgICAgICA8dWw+XG4gICAgICogICAgICAgICAgICAgIDxsaT5UaGUgQ29sbGVjdGlvbiN1cGRhdGUgbWV0aG9kIHJlcGxhY2VzIHRoZSBtYXRjaGluZyBkb2N1bWVudCB3aXRoIHRoZSBbdXBkYXRlXSBvYmplY3QuIFRoZSBDb2xsZWN0aW9uI3VwZGF0ZSBtZXRob2QgZG9lcyBub3QgcmVwbGFjZSB0aGUgXCJfaWRcIiB2YWx1ZTwvbGk+XG4gICAgICogICAgICAgICAgICAgIDxsaT5Db2xsZWN0aW9uI3VwZGF0ZSBjYW5ub3QgdXBkYXRlIG11bHRpcGxlIGRvY3VtZW50czwvbGk+XG4gICAgICogICAgICAgICAgPHVsPlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5vdmVycmlkZT1mYWxzZV0gLSBSZXBsYWNlcyB0aGUgd2hvbGUgZG9jdW1lbnQgKG9ubHkgYXBsbGllcyB3aGVuIFt1cGRhdGVBc01vbmdvPWZhbHNlXSlcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudXBzZXJ0PWZhbHNlXSAtIENyZWF0ZXMgYSBuZXcgZG9jdW1lbnQgd2hlbiBubyBkb2N1bWVudCBtYXRjaGVzIHRoZSBxdWVyeSBjcml0ZXJpYVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5tdWx0aT1mYWxzZV0gLSBVcGRhdGVzIG11bHRpcGxlIGRvY3VtZW50cyB0aGF0IG1lZXQgdGhlIGNyaXRlcmlhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHRoZSB1cGRhdGUvaW5zZXJ0IChpZiB1cHNlcnQ9dHJ1ZSkgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCB1cGRhdGUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHNlbGVjdGlvbikpIHNlbGVjdGlvbiA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwodXBkYXRlKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3Qgc3BlY2lmeSB0aGUgdXBkYXRlIG9wZXJhdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSB7XG4gICAgICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIHNraXA6IDAsXG4gICAgICAgICAgICAgICAgbGltaXQ6IDE1ICAgLy8gZm9yIG5vIGxpbWl0IHBhc3MgW29wdGlvbnMubGltaXQgPSAtMV1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0aW9uKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3Qgc3BlY2lmeSB0aGUgdXBkYXRlIG9wZXJhdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24odXBkYXRlKSkgbG9nZ2VyLnRocm93KFwiWW91IG11c3Qgc3BlY2lmeSB0aGUgdXBkYXRlIG9wZXJhdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGFyZSB1c2luZyBhbiBvYmplY3RJZFxuICAgICAgICBpZihzZWxlY3Rpb24gaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICAgICAgc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgICAgIF9pZDogc2VsZWN0aW9uXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgICAgIHZhciByZXMgPSBudWxsO1xuICAgIFxuICAgICAgICB2YXIgZG9jcyA9IG51bGw7XG4gICAgICAgIGlmIChvcHRpb25zLm11bHRpKSB7XG4gICAgICAgICAgICBkb2NzID0gdGhpcy5maW5kKHNlbGVjdGlvbiwgbnVsbCwgeyBmb3JjZUZldGNoOiB0cnVlIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jcyA9IHRoaXMuZmluZE9uZShzZWxlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChkb2NzKSkge1xuICAgICAgICAgICAgZG9jcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIV8uaXNBcnJheShkb2NzKSkge1xuICAgICAgICAgICAgZG9jcyA9IFtkb2NzXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGRvY3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy51cHNlcnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5zZXJ0ZWQgPSB0aGlzLmluc2VydCh1cGRhdGUpO1xuICAgIFxuICAgICAgICAgICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogW2luc2VydGVkXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiAxXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBObyBkb2N1bWVudHMgZm91bmRcbiAgICAgICAgICAgICAgICByZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciB1cGRhdGVkRG9jcyA9IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvY3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZG9jID0gZG9jc1tpXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgb3ZlcnJpZGUgPSBudWxsO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBoYXNNb2RpZmllciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSUU3IGRvZXNuJ3Qgc3VwcG9ydCBpbmRleGluZyBpbnRvIHN0cmluZ3MgKGVnLCBrZXlbMF0gb3Iga2V5LmluZGV4T2YoJyQnKSApLCBzbyB1c2Ugc3Vic3RyLlxuICAgICAgICAgICAgICAgICAgICAvLyBUZXN0aW5nIG92ZXIgdGhlIGZpcnN0IGxldHRlcjpcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICBCZXN0cyByZXN1bHQgd2l0aCAxZTggbG9vcHMgPT4ga2V5WzBdKH4zcykgPiBzdWJzdHIofjVzKSA+IHJlZ2V4cCh+NnMpID4gaW5kZXhPZih+MTZzKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1vZGlmaWVyID0gKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RpZmllcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzTW9kaWZpZXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy51cGRhdGVBc01vbmdvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFzTW9kaWZpZXIgJiYgIW1vZGlmaWVyKSBsb2dnZXIudGhyb3coXCJBbGwgdXBkYXRlIGZpZWxkcyBtdXN0IGJlIGFuIHVwZGF0ZSBvcGVyYXRvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNNb2RpZmllciAmJiBvcHRpb25zLm11bHRpKSBsb2dnZXIudGhyb3coXCJZb3UgY2FuIG5vdCB1cGRhdGUgc2V2ZXJhbCBkb2N1bWVudHMgd2hlbiBubyB1cGRhdGUgb3BlcmF0b3JzIGFyZSBpbmNsdWRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhc01vZGlmaWVyKSBvdmVycmlkZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc01vZGlmaWVyKSBvdmVycmlkZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdmVycmlkZSA9ICEhb3B0aW9ucy5vdmVycmlkZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgX2RvY1VwZGF0ZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKG92ZXJyaWRlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE92ZXJyaWRlcyB0aGUgZG9jdW1lbnQgZXhjZXB0IGZvciB0aGUgXCJfaWRcIlxuICAgICAgICAgICAgICAgICAgICBfZG9jVXBkYXRlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2lkOiBkb2MuX2lkXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBNdXN0IGlnbm9yZSBmaWVsZHMgc3RhcnRpbmcgd2l0aCAnJCcsICcuJy4uLlxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnIHx8IC9cXC4vZy50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgVGhlIGZpZWxkICR7a2V5fSBjYW4gbm90IGJlZ2luIHdpdGggJyQnIG9yIGNvbnRhaW4gJy4nYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kb2NVcGRhdGVba2V5XSA9IHVwZGF0ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgX2RvY1VwZGF0ZSA9IF8uY2xvbmVEZWVwKGRvYyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdmFsID0gdXBkYXRlW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZG9jVXBkYXRlID0gX2FwcGx5TW9kaWZpZXIoX2RvY1VwZGF0ZSwga2V5LCB2YWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaXNOaWwoX2RvY1VwZGF0ZVtrZXldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ICE9PSAnX2lkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RvY1VwZGF0ZVtrZXldID0gdmFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oXCJUaGUgZmllbGQgJ19pZCcgY2FuIG5vdCBiZSB1cGRhdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYFRoZSBkb2N1bWVudCBkb2VzIG5vdCBjb250YWlucyB0aGUgZmllbGQgJHtrZXl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHVwZGF0ZWREb2NzLnB1c2goX2RvY1VwZGF0ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbGV0IGlkeCA9IHRoaXMuZG9jX2luZGV4ZXNbX2RvY1VwZGF0ZS5faWRdO1xuICAgICAgICAgICAgICAgIHRoaXMuZG9jc1tpZHhdID0gX2RvY1VwZGF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBcInVwZGF0ZVwiIGV2ZW50LlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfnVwZGF0ZVxuICAgICAgICAgICAgICogXG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uXG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gc2VsZWN0b3IgLSBUaGUgc2VsZWN0aW9uIG9mIHRoZSBxdWVyeVxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IG1vZGlmaWVyIC0gVGhlIG1vZGlmaWVyIHVzZWQgaW4gdGhlIHF1ZXJ5XG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZG9jcyAtIFRoZSB1cGRhdGVkL2luc2VydGVkIGRvY3VtZW50cyBpbmZvcm1hdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAgICAgJ3VwZGF0ZScsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBtb2RpZmllcjogdXBkYXRlLFxuICAgICAgICAgICAgICAgICAgICBkb2NzOiB1cGRhdGVkRG9jc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJlcyA9IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogdXBkYXRlZERvY3MsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiB1cGRhdGVkRG9jcy5sZW5ndGhcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGluc2VydGVkOiB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xuICAgIFxuICAgIHZhciBfYXBwbHlNb2RpZmllciA9IGZ1bmN0aW9uKF9kb2NVcGRhdGUsIGtleSwgdmFsKSB7XG4gICAgICAgIHZhciBkb2MgPSBfLmNsb25lRGVlcChfZG9jVXBkYXRlKTtcbiAgICAgICAgLy8gdmFyIG1vZCA9IF9tb2RpZmllcnNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgaWYgKCFfbW9kaWZpZXJzW2tleV0pIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhgSW52YWxpZCBtb2RpZmllciBzcGVjaWZpZWQ6ICR7a2V5fWApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBrZXlwYXRoIGluIHZhbCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gdmFsW2tleXBhdGhdO1xuICAgICAgICAgICAgdmFyIGtleXBhcnRzID0ga2V5cGF0aC5zcGxpdCgnLicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBfbW9kaWZ5KGRvYywga2V5cGFydHMsIHZhbHVlLCBrZXkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB2YXIgbm9fY3JlYXRlID0gISFDb2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVyc1trZXldO1xuICAgICAgICAgICAgLy8gdmFyIGZvcmJpZF9hcnJheSA9IChrZXkgPT09IFwiJHJlbmFtZVwiKTtcbiAgICAgICAgICAgIC8vIHZhciB0YXJnZXQgPSBDb2xsZWN0aW9uLl9maW5kTW9kVGFyZ2V0KF9kb2NVcGRhdGUsIGtleXBhcnRzLCBub19jcmVhdGUsIGZvcmJpZF9hcnJheSk7XG4gICAgICAgICAgICAvLyB2YXIgZmllbGQgPSBrZXlwYXJ0cy5wb3AoKTtcbiAgICBcbiAgICAgICAgICAgIC8vIG1vZCh0YXJnZXQsIGZpZWxkLCB2YWx1ZSwga2V5cGF0aCwgX2RvY1VwZGF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkb2M7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgX21vZGlmeSA9IGZ1bmN0aW9uKGRvY3VtZW50LCBrZXlwYXJ0cywgdmFsdWUsIGtleSwgbGV2ZWwgPSAwKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSBsZXZlbDsgaSA8IGtleXBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgcGF0aCA9IGtleXBhcnRzW2ldO1xuICAgICAgICAgICAgbGV0IGlzTnVtZXJpYyA9IC9eWzAtOV0rJC8udGVzdChwYXRoKTtcbiAgICAgICAgICAgIGxldCB0YXJnZXQgPSBkb2N1bWVudFtwYXRoXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNyZWF0ZSA9IF8uaGFzSW4oQ29sbGVjdGlvbi5fbm9DcmVhdGVNb2RpZmllcnMsIGtleSkgPyBmYWxzZSA6IHRydWU7XG4gICAgICAgICAgICBpZiAoIWNyZWF0ZSAmJiAoIV8uaXNPYmplY3QoZG9jdW1lbnQpIHx8IF8uaXNOaWwodGFyZ2V0KSkpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coYFRoZSBlbGVtZW50IFwiJHtwYXRofVwiIG11c3QgZXhpc3RzIGluIFwiJHtKU09OLnN0cmluZ2lmeShkb2N1bWVudCl9XCJgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShkb2N1bWVudCkpIHtcbiAgICAgICAgICAgICAgICAvLyBEbyBub3QgYWxsb3cgJHJlbmFtZSBvbiBhcnJheXNcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSBcIiRyZW5hbWVcIikgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gT25seSBsZXQgdGhlIHVzZSBvZiBcImFycmF5ZmllbGQuPG51bWVyaWNfaW5kZXg+LnN1YmZpZWxkXCJcbiAgICAgICAgICAgICAgICBpZiAoaXNOdW1lcmljKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGggPSBfLnRvTnVtYmVyKHBhdGgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhgVGhlIGZpZWxkIFwiJHtwYXRofVwiIGNhbiBub3QgYmUgYXBwZW5kZWQgdG8gYW4gYXJyYXlgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRmlsbCB0aGUgYXJyYXkgdG8gdGhlIGRlc2lyZWQgbGVuZ3RoXG4gICAgICAgICAgICAgICAgd2hpbGUgKGRvY3VtZW50Lmxlbmd0aCA8IHBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQucHVzaChudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpIDwga2V5cGFydHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgYXJlIGFjY2Vzc2luZyB3aXRoIFwiYXJyYXlGaWVsZC48bnVtZXJpY19pbmRleD5cIlxuICAgICAgICAgICAgICAgICAgICBpZiAoXy5pc0Zpbml0ZShfLnRvTnVtYmVyKGtleXBhcnRzW2kgKyAxXSkpKSB7ICAvLyAgfHwga2V5cGFydHNbaSArIDFdID09PSAnJCcgIC8vIFRPRE8gXCJhcnJheUZpZWxkLiRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0gW107XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBkb2N1bWVudFtwYXRoXSA9IF9tb2RpZnkodGFyZ2V0LCBrZXlwYXJ0cywgdmFsdWUsIGtleSwgbGV2ZWwgKyAxKTtcbiAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9jdW1lbnQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9tb2RpZmllcnNba2V5XShkb2N1bWVudCwgcGF0aCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBkb2N1bWVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBvbmUgb3IgbWFueSBkb2N1bWVudHNcbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIENvbGxlY3Rpb24jcmVtb3ZlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl8U3RyaW5nfSBbc2VsZWN0aW9uPXt9XSAtIFRoZSBzZWxlY3Rpb24gZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuanVzdE9uZT1mYWxzZV0gLSBEZWxldGVzIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIHRoZSBzZWxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggdGhlIGRlbGV0ZWQgZG9jdW1lbnRzXG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKHNlbGVjdGlvbiwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoc2VsZWN0aW9uKSkgc2VsZWN0aW9uID0ge307XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHNlbGVjdGlvbikpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gc2VsZWN0aW9uO1xuICAgICAgICAgICAgc2VsZWN0aW9uID0ge307XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7IGp1c3RPbmU6IGZhbHNlIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB3ZSBhcmUgbm90IHBhc3NpbmcgYSBzZWxlY3Rpb24gYW5kIHdlIGFyZSBub3QgcmVtb3ZpbmcganVzdCBvbmUsIGlzIHRoZSBzYW1lIGFzIGEgZHJvcFxuICAgICAgICBpZiAoT2JqZWN0LnNpemUoc2VsZWN0aW9uKSA9PT0gMCAmJiAhb3B0aW9ucy5qdXN0T25lKSByZXR1cm4gdGhpcy5kcm9wKG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBhcmUgdXNpbmcgYW4gb2JqZWN0SWRcbiAgICAgICAgaWYoc2VsZWN0aW9uIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgICAgIHNlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBfaWQ6IHNlbGVjdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGN1cnNvciA9IHRoaXMuZmluZChzZWxlY3Rpb24pO1xuICAgICAgICBcbiAgICAgICAgdmFyIGRvY3MgPSBbXTtcbiAgICAgICAgY3Vyc29yLmZvckVhY2goZG9jID0+IHtcbiAgICAgICAgICAgIHZhciBpZHggPSB0aGlzLmRvY19pbmRleGVzW2RvYy5faWRdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5kb2NfaW5kZXhlc1tkb2MuX2lkXTtcbiAgICAgICAgICAgIHRoaXMuZG9jcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZG9jcy5wdXNoKGRvYyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFwicmVtb3ZlXCIgZXZlbnQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfnJlbW92ZVxuICAgICAgICAgKiBcbiAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvblxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gc2VsZWN0b3IgLSBUaGUgc2VsZWN0aW9uIG9mIHRoZSBxdWVyeVxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gZG9jcyAtIFRoZSBkZWxldGVkIGRvY3VtZW50cyBpbmZvcm1hdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgJ3JlbW92ZScsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgIGRvY3M6IGRvY3NcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgZG9jcyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZG9jcztcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEFsaWFzIGZvciB7QGxpbmsgQ29sbGVjdGlvbiNyZW1vdmV9XG4gICAgICogXG4gICAgICogQG1ldGhvZCBDb2xsZWN0aW9uI2RlbGV0ZVxuICAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZShzZWxlY3Rpb24sIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICB9O1xuICAgICBcbiAgICAgLyoqXG4gICAgICogQWxpYXMgZm9yIHtAbGluayBDb2xsZWN0aW9uI3JlbW92ZX1cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIENvbGxlY3Rpb24jZGVzdHJveVxuICAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmUoc2VsZWN0aW9uLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBEcm9wcyBhIGNvbGxlY3Rpb25cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIENvbGxlY3Rpb24jZHJvcFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuZHJvcEluZGV4ZXM9ZmFsc2VdIC0gVHJ1ZSBpZiB3ZSB3YW50IHRvIGRyb3AgdGhlIGluZGV4ZXMgdG9vXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLndyaXRlQ29uY2Vybj1udWxsXSAtIEFuIG9iamVjdCBleHByZXNzaW5nIHRoZSB3cml0ZSBjb25jZXJuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRydWUgd2hlbiB0aGUgY29sbGVjdGlvbiBpcyBkcm9wcGVkXG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuZG9jX2luZGV4ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5kb2NzID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAob3B0aW9ucy5kcm9wSW5kZXhlcykge30gLy8gVE9ET1xuICAgICAgICBcbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgJ2Ryb3BDb2xsZWN0aW9uJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLFxuICAgICAgICAgICAgICAgIGluZGV4ZXM6ICEhb3B0aW9ucy5kcm9wSW5kZXhlc1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5zZXJ0IG9yIHVwZGF0ZSBhIGRvY3VtZW50LiBJZiB0aGUgZG9jdW1lbnQgaGFzIGFuIFwiX2lkXCIgaXMgYW4gdXBkYXRlICh3aXRoIHVwc2VydCksIGlmIG5vdCBpcyBhbiBpbnNlcnQuXG4gICAgICogXG4gICAgICogQG1ldGhvZCBDb2xsZWN0aW9uI3NhdmVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZG9jIC0gRG9jdW1lbnQgdG8gYmUgaW5zZXJ0ZWQvdXBkYXRlZFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5kcm9wSW5kZXhlcz1mYWxzZV0gLSBUcnVlIGlmIHdlIHdhbnQgdG8gZHJvcCB0aGUgaW5kZXhlcyB0b29cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMud3JpdGVDb25jZXJuPW51bGxdIC0gQW4gb2JqZWN0IGV4cHJlc3NpbmcgdGhlIHdyaXRlIGNvbmNlcm5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHJldHVybnMge09iamVjdH0gVHJ1ZSB3aGVuIHRoZSBjb2xsZWN0aW9uIGlzIGRyb3BwZWRcbiAgICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24oZG9jLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoXy5pc05pbChkb2MpIHx8IF8uaXNGdW5jdGlvbihkb2MpKSBsb2dnZXIudGhyb3coXCJZb3UgbXVzdCBwYXNzIGEgZG9jdW1lbnRcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgaWYgKF8uaGFzSW4oZG9jLCAnX2lkJykpIHtcbiAgICAgICAgICAgIG9wdGlvbnMudXBzZXJ0ID0gdHJ1ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlKFxuICAgICAgICAgICAgICAgIHsgX2lkOiBkb2MuX2lkIH0sXG4gICAgICAgICAgICAgICAgZG9jLFxuICAgICAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnNlcnQoZG9jLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICogQGlnbm9yZVxuICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuZW5zdXJlSW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy9UT0RPIEltcGxlbWVudCBFbnN1cmVJbmRleFxuICAgICAgICBsb2dnZXIudGhyb3coJ0NvbGxlY3Rpb24jZW5zdXJlSW5kZXggdW5pbXBsZW1lbnRlZCBieSBkcml2ZXInKTtcbiAgICB9O1xuICAgIFxuICAgIC8vIFRPRE8gZG9jdW1lbnQgKGF0IHNvbWUgcG9pbnQpXG4gICAgLy8gVE9ETyB0ZXN0XG4gICAgLy8gVE9ETyBvYnZpb3VzbHkgdGhpcyBwYXJ0aWN1bGFyIGltcGxlbWVudGF0aW9uIHdpbGwgbm90IGJlIHZlcnkgZWZmaWNpZW50XG4gICAgLyoqXG4gICAgKiBAaWdub3JlXG4gICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5iYWNrdXAgPSBmdW5jdGlvbiAoYmFja3VwSUQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24oYmFja3VwSUQpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGJhY2t1cElEO1xuICAgICAgICAgICAgYmFja3VwSUQgPSBuZXcgT2JqZWN0SWQoKS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIV8uaXNOaWwoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBsb2dnZXIudGhyb3coXCJjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgXG4gICAgICAgIHRoaXMuc25hcHNob3RzW2JhY2t1cElEXSA9IF8uY2xvbmVEZWVwKHRoaXMuZG9jcyk7XG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICdzbmFwc2hvdCcsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICBiYWNrdXBJRDogYmFja3VwSUQsXG4gICAgICAgICAgICAgICAgZG9jdW1lbnRzOiB0aGlzLnNuYXBzaG90c1tiYWNrdXBJRF0gXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgXG4gICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICBiYWNrdXBJRDogYmFja3VwSUQsXG4gICAgICAgICAgICBkb2N1bWVudHM6IHRoaXMuc25hcHNob3RzW2JhY2t1cElEXVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gICAgXG4gICAgLy8gTGlzdHMgYXZhaWxhYmxlIEJhY2t1cHNcbiAgICAvKipcbiAgICAqIEBpZ25vcmVcbiAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLmJhY2t1cHMgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGJhY2t1cHMgPSBbXTtcbiAgICBcbiAgICAgICAgZm9yIChsZXQgaWQgaW4gdGhpcy5zbmFwc2hvdHMpIHtcbiAgICAgICAgICAgIGJhY2t1cHMucHVzaCh7aWQ6IGlkLCBkb2N1bWVudHM6IHRoaXMuc25hcHNob3RzW2lkXX0pO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCwgYmFja3Vwcyk7XG4gICAgXG4gICAgICAgIHJldHVybiBiYWNrdXBzO1xuICAgIH07XG4gICAgXG4gICAgLy8gTGlzdHMgYXZhaWxhYmxlIEJhY2t1cHNcbiAgICAvKipcbiAgICAqIEBpZ25vcmVcbiAgICAqL1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlLnJlbW92ZUJhY2t1cCA9IGZ1bmN0aW9uIChiYWNrdXBJRCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihiYWNrdXBJRCkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gYmFja3VwSUQ7XG4gICAgICAgICAgICBiYWNrdXBJRCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc05pbChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgIGxldCByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChiYWNrdXBJRCkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuc25hcHNob3RzW18udG9TdHJpbmcoYmFja3VwSUQpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzdWx0ID0gYmFja3VwSUQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNuYXBzaG90cyA9IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXN1bHQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgICBcbiAgICBcbiAgICAvLyBSZXN0b3JlIHRoZSBzbmFwc2hvdC4gSWYgbm8gc25hcHNob3QgZXhpc3RzLCByYWlzZSBhbiBleGNlcHRpb247XG4gICAgLyoqXG4gICAgKiBAaWdub3JlXG4gICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5yZXN0b3JlID0gZnVuY3Rpb24gKGJhY2t1cElELCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGJhY2t1cElEKSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBiYWNrdXBJRDtcbiAgICAgICAgICAgIGJhY2t1cElEID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzTmlsKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgbG9nZ2VyLnRocm93KFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHNuYXBzaG90Q291bnQgPSBPYmplY3Quc2l6ZSh0aGlzLnNuYXBzaG90cyk7XG4gICAgICAgIHZhciBiYWNrdXBEYXRhID0gbnVsbDtcbiAgICBcbiAgICAgICAgaWYgKHNuYXBzaG90Q291bnQgPT09IDApIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIlRoZXJlIGlzIG5vIHNuYXBzaG90c1wiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghYmFja3VwSUQpIHtcbiAgICAgICAgICAgICAgICBpZiAoc25hcHNob3RDb3VudCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhcIk5vIGJhY2t1cElEIHBhc3NlZC4gUmVzdG9yaW5nIHRoZSBvbmx5IHNuYXBzaG90XCIpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmV0cmlldmUgdGhlIG9ubHkgc25hcHNob3RcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHRoaXMuc25hcHNob3RzKSBiYWNrdXBJRCA9IGtleTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJUaGUgYXJlIHNldmVyYWwgc25hcHNob3RzLiBQbGVhc2Ugc3BlY2lmeSBvbmUgYmFja3VwSURcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBiYWNrdXBEYXRhID0gdGhpcy5zbmFwc2hvdHNbYmFja3VwSURdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiAoIWJhY2t1cERhdGEpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhgVW5rbm93biBCYWNrdXAgSUQ6ICR7YmFja3VwSUR9YCk7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgdGhpcy5kb2NzID0gYmFja3VwRGF0YTtcbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgJ3Jlc3RvcmUnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMsXG4gICAgICAgICAgICAgICAgYmFja3VwSUQ6IGJhY2t1cElEXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgXG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCk7XG4gICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyBhZ2dyZWdhdGUgdmFsdWVzIGZvciB0aGUgZGF0YSBpbiBhIGNvbGxlY3Rpb25cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIENvbGxlY3Rpb24jYWdncmVnYXRlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGlwZWxpbmUgLSBBIHNlcXVlbmNlIG9mIGRhdGEgYWdncmVnYXRpb24gb3BlcmF0aW9ucyBvciBzdGFnZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5mb3JjZUZldGNoPWZhbHNlXSAtIElmIHNldCB0bydcInRydWVcIiByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMgYWxyZWFkeSBmZXRjaGVkXG4gICAgICogXG4gICAgICogQHJldHVybnMge0FycmF5fEN1cnNvcn0gSWYgXCJvcHRpb25zLmZvcmNlRmV0Y2hcIiBzZXQgdG8gdHJ1ZSByZXR1cm5zIHRoZSBhcnJheSBvZiBkb2N1bWVudHMsIG90aGVyd2lzZSByZXR1cm5zIGEgY3Vyc29yXG4gICAgICovXG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuYWdncmVnYXRlID0gZnVuY3Rpb24ocGlwZWxpbmUsIG9wdGlvbnMgPSB7IGZvcmNlRmV0Y2g6IGZhbHNlIH0pIHtcbiAgICAgICAgaWYgKF8uaXNOaWwocGlwZWxpbmUpIHx8ICFfLmlzQXJyYXkocGlwZWxpbmUpKSBsb2dnZXIudGhyb3coJ1RoZSBcInBpcGVsaW5lXCIgcGFyYW0gbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGFnZ3JlZ2F0aW9uID0gbmV3IEFnZ3JlZ2F0aW9uKHBpcGVsaW5lKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGlwZWxpbmUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBzdGFnZSA9IHBpcGVsaW5lW2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gc3RhZ2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSAhPT0gJyQnKSBsb2dnZXIudGhyb3coXCJUaGUgcGlwZWxpbmUgc3RhZ2VzIG11c3QgYmVnaW4gd2l0aCAnJCdcIik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFhZ2dyZWdhdGlvbi52YWxpZFN0YWdlKGtleSkpIGxvZ2dlci50aHJvdyhgSW52YWxpZCBzdGFnZSBcIiR7a2V5fVwiYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciByZXN1bHQgPSBhZ2dyZWdhdGlvbi5hZ2dyZWdhdGUodGhpcyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0OyAgLy8gY2hhbmdlIHRvIGN1cnNvclxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgKiBAaWdub3JlXG4gICAgKi9cbiAgICBDb2xsZWN0aW9uLl9ub0NyZWF0ZU1vZGlmaWVycyA9IHtcbiAgICAgICAgJHVuc2V0OiB0cnVlLFxuICAgICAgICAkcG9wOiB0cnVlLFxuICAgICAgICAkcmVuYW1lOiB0cnVlLFxuICAgICAgICAkcHVsbDogdHJ1ZSxcbiAgICAgICAgJHB1bGxBbGw6IHRydWVcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICogQGlnbm9yZVxuICAgICovXG4gICAgdmFyIF9tb2RpZmllcnMgPSB7XG4gICAgICAgICRpbmM6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgICAgIGlmICghXy5pc051bWJlcihhcmcpKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiTW9kaWZpZXIgJGluYyBhbGxvd2VkIGZvciBudW1iZXJzIG9ubHlcIik7XG4gICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFfLmlzTnVtYmVyKHRhcmdldFtmaWVsZF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkNhbm5vdCBhcHBseSAkaW5jIG1vZGlmaWVyIHRvIG5vbi1udW1iZXJcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgICAgIHRhcmdldFtmaWVsZF0gKz0gYXJnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIFxuICAgICAgICAkc2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gXy5jbG9uZURlZXAoYXJnKTtcbiAgICAgICAgfSxcbiAgICBcbiAgICAgICAgJHVuc2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgICAgICAgICBpZiAoIV8uaXNOaWwodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0YXJnZXRbZmllbGRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICBcbiAgICAgICAgJHB1c2g6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICBcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHgpKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFthcmddO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRwdXNoIG1vZGlmaWVyIHRvIG5vbi1hcnJheVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgeC5wdXNoKF8uY2xvbmVEZWVwKGFyZykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIFxuICAgICAgICAkcHVzaEFsbDogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgICAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNOaWwoeCkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgeC5wdXNoKGFyZ1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIFxuICAgICAgICAkYWRkVG9TZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgICAgIHZhciB4ID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICBcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHgpKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFthcmddO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghXy5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiQ2Fubm90IGFwcGx5ICRhZGRUb1NldCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBpc0VhY2ggPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc1BsYWluT2JqZWN0KGFyZykpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgayBpbiBhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrID09PSBcIiRlYWNoXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0VhY2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWVzID0gaXNFYWNoID8gYXJnW1wiJGVhY2hcIl0gOiBbYXJnXTtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2godmFsdWVzLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoU2VsZWN0b3JNYXRjaGVyLmVxdWFsKHZhbHVlLCB4W2ldKSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIHgucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgXG4gICAgICAgICRwb3A6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkgfHwgXy5pc05pbCh0YXJnZXRbZmllbGRdKSkgcmV0dXJuO1xuICAgIFxuICAgICAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuICAgIFxuICAgICAgICAgICAgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJHBvcCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzTnVtYmVyKGFyZykgJiYgYXJnIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICB4LnNwbGljZSgwLCAxKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB4LnBvcCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICBcbiAgICAgICAgJHB1bGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkgfHwgXy5pc05pbCh0YXJnZXRbZmllbGRdKSkgcmV0dXJuO1xuICAgIFxuICAgICAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuICAgIFxuICAgICAgICAgICAgaWYgKCFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJDYW5ub3QgYXBwbHkgJHB1bGwvcHVsbEFsbCBtb2RpZmllciB0byBub24tYXJyYXlcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBvdXQgPSBbXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIiAmJiAhKGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBYWFggd291bGQgYmUgbXVjaCBuaWNlciB0byBjb21waWxlIHRoaXMgb25jZSwgcmF0aGVyIHRoYW5cbiAgICAgICAgICAgICAgICAgICAgLy8gZm9yIGVhY2ggZG9jdW1lbnQgd2UgbW9kaWZ5Li4gYnV0IHVzdWFsbHkgd2UncmUgbm90XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vZGlmeWluZyB0aGF0IG1hbnkgZG9jdW1lbnRzLCBzbyB3ZSdsbCBsZXQgaXQgc2xpZGUgZm9yXG4gICAgICAgICAgICAgICAgICAgIC8vIG5vd1xuICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBYWFggX2NvbXBpbGVTZWxlY3RvciBpc24ndCB1cCBmb3IgdGhlIGpvYiwgYmVjYXVzZSB3ZSBuZWVkXG4gICAgICAgICAgICAgICAgICAgIC8vIHRvIHBlcm1pdCBzdHVmZiBsaWtlIHskcHVsbDoge2E6IHskZ3Q6IDR9fX0uLiBzb21ldGhpbmdcbiAgICAgICAgICAgICAgICAgICAgLy8gbGlrZSB7JGd0OiA0fSBpcyBub3Qgbm9ybWFsbHkgYSBjb21wbGV0ZSBzZWxlY3Rvci5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hdGNoID0gbmV3IFNlbGVjdG9yKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX19tYXRjaGluZ19fXCI6IGFyZ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgX2RvY18gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX19tYXRjaGluZ19fOiB4W2ldXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRjaC50ZXN0KF9kb2NfKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHhbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIVNlbGVjdG9yTWF0Y2hlci5lcXVhbCh4W2ldLCBhcmcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG91dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICBcbiAgICAgICAgJHB1bGxBbGw6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHRhcmdldCkgfHwgXy5pc05pbCh0YXJnZXRbZmllbGRdKSkgcmV0dXJuO1xuICAgIFxuICAgICAgICAgICAgdmFyIHggPSB0YXJnZXRbZmllbGRdO1xuICAgIFxuICAgICAgICAgICAgaWYgKCFfLmlzTmlsKHgpICYmICFfLmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIudGhyb3coXCJNb2RpZmllciAkcHVzaEFsbC9wdWxsQWxsIGFsbG93ZWQgZm9yIGFycmF5cyBvbmx5XCIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghXy5pc05pbCh4KSkge1xuICAgICAgICAgICAgICAgIHZhciBvdXQgPSBbXTtcbiAgICBcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGV4Y2x1ZGUgPSBmYWxzZTtcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBhcmcubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChTZWxlY3Rvck1hdGNoZXIuZXF1YWwoeFtpXSwgYXJnW2pdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghZXhjbHVkZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goeFtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG91dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICBcbiAgICAgICAgJHJlbmFtZTogZnVuY3Rpb24gKHRhcmdldCwgZmllbGQsIHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoZmllbGQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gaWRlYSB3aHkgbW9uZ28gaGFzIHRoaXMgcmVzdHJpY3Rpb24uLlxuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIlRoZSBuZXcgZmllbGQgbmFtZSBtdXN0IGJlIGRpZmZlcmVudFwiKTtcbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyh2YWx1ZSkgfHwgdmFsdWUudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIlRoZSBuZXcgbmFtZSBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZ1wiKTtcbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIHRhcmdldFt2YWx1ZV0gPSB0YXJnZXRbZmllbGRdO1xuICAgICAgICAgICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG4gICAgICAgIH0sXG4gICAgXG4gICAgICAgICRiaXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAgICAgICAgIC8vIFhYWCBtb25nbyBvbmx5IHN1cHBvcnRzICRiaXQgb24gaW50ZWdlcnMsIGFuZCB3ZSBvbmx5IHN1cHBvcnRcbiAgICAgICAgICAgIC8vIG5hdGl2ZSBqYXZhc2NyaXB0IG51bWJlcnMgKGRvdWJsZXMpIHNvIGZhciwgc28gd2UgY2FuJ3Qgc3VwcG9ydCAkYml0XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCIkYml0IGlzIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICogQGlnbm9yZVxuICAgICovXG4gICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUpIHtcbiAgICAgICAgaWYgKCFfLmlzU3RyaW5nKGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lIG11c3QgYmUgYSBTdHJpbmdcIik7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgaWYgKCFjb2xsZWN0aW9uTmFtZSB8fCBjb2xsZWN0aW9uTmFtZS5pbmRleE9mKCcuLicpICE9PSAtMSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KFwiY29sbGVjdGlvbiBuYW1lcyBjYW5ub3QgYmUgZW1wdHlcIik7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgaWYgKGNvbGxlY3Rpb25OYW1lLmluZGV4T2YoJyQnKSAhPT0gLTEgJiYgY29sbGVjdGlvbk5hbWUubWF0Y2goLygoXlxcJGNtZCl8KG9wbG9nXFwuXFwkbWFpbikpLykgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgbXVzdCBub3QgY29udGFpbiAnJCdcIik7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgaWYgKGNvbGxlY3Rpb25OYW1lLm1hdGNoKC9ec3lzdGVtXFwuLykgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcImNvbGxlY3Rpb24gbmFtZXMgbXVzdCBub3Qgc3RhcnQgd2l0aCAnc3lzdGVtLicgKHJlc2VydmVkIGZvciBpbnRlcm5hbCB1c2UpXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoY29sbGVjdGlvbk5hbWUubWF0Y2goL15cXC58XFwuJC8pICE9PSBudWxsKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJjb2xsZWN0aW9uIG5hbWVzIG11c3Qgbm90IHN0YXJ0IG9yIGVuZCB3aXRoICcuJ1wiKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgKiBAaWdub3JlXG4gICAgKi9cbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5yZW5hbWUgPSBmdW5jdGlvbihuZXdOYW1lKSB7XG4gICAgICAgIGlmIChfLmlzU3RyaW5nKG5ld05hbWUpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5uYW1lICE9PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKG5ld05hbWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBkYk5hbWUgPSB0aGlzLm5hbWUuc3BsaXQoJy4nKS5sZW5ndGggPiAxID8gdGhpcy5uYW1lLnNwbGl0KCcuJylbMF0gOiAnJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWUgPSBuZXdOYW1lO1xuICAgICAgICAgICAgICAgIHRoaXMuZnVsbE5hbWUgPSBkYk5hbWUgKyAnLicgKyB0aGlzLm5hbWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFcnJvclxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBzaXplIG9mIGFuIG9iamVjdC5cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIE9iamVjdCNzaXplXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBvYmplY3RcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgc2l6ZSBvZiB0aGUgb2JqZWN0XG4gICAgICovXG4gICAgT2JqZWN0LnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgdmFyIHNpemUgPSAwLCBcbiAgICAgICAgICAgIGtleTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2l6ZTtcbiAgICB9O1xuICAgIFxuICAgIHZhciBfZW5zdXJlRmluZFBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAvLyBzZWxlY3Rpb24sIGZpZWxkcywgb3B0aW9ucywgY2FsbGJhY2tcbiAgICAgICAgaWYgKF8uaXNOaWwocGFyYW1zLnNlbGVjdGlvbikpIHBhcmFtcy5zZWxlY3Rpb24gPSB7fTtcbiAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwocGFyYW1zLnNlbGVjdGlvbikpIHBhcmFtcy5zZWxlY3Rpb24gPSB7fTtcbiAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwocGFyYW1zLmZpZWxkcykpIHBhcmFtcy5maWVsZHMgPSBbXTtcbiAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwocGFyYW1zLm9wdGlvbnMpKSB7XG4gICAgICAgICAgICBwYXJhbXMub3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBza2lwOiAwLFxuICAgICAgICAgICAgICAgIGxpbWl0OiAxNSAvLyBmb3Igbm8gbGltaXQgcGFzcyBbb3B0aW9ucy5saW1pdCA9IC0xXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICAvLyBjYWxsYmFjayBhcyBmaXJzdCBwYXJhbWV0ZXJcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihwYXJhbXMuc2VsZWN0aW9uKSkge1xuICAgICAgICAgICAgcGFyYW1zLmNhbGxiYWNrID0gcGFyYW1zLnNlbGVjdGlvbjtcbiAgICAgICAgICAgIHBhcmFtcy5zZWxlY3Rpb24gPSB7fTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICAvLyBjYWxsYmFjayBhcyBzZWNvbmQgcGFyYW1ldGVyXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ocGFyYW1zLmZpZWxkcykpIHtcbiAgICAgICAgICAgIHBhcmFtcy5jYWxsYmFjayA9IHBhcmFtcy5maWVsZHM7XG4gICAgICAgICAgICBwYXJhbXMuZmllbGRzID0gW107XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy8gY2FsbGJhY2sgYXMgdGhpcmQgcGFyYW1ldGVyXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ocGFyYW1zLm9wdGlvbnMpKSB7XG4gICAgICAgICAgICBwYXJhbXMuY2FsbGJhY2sgPSBwYXJhbXMub3B0aW9ucztcbiAgICAgICAgICAgIHBhcmFtcy5vcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy8gQ2hlY2sgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGFyZSB1c2luZyBhbiBvYmplY3RJZFxuICAgICAgICBpZiAocGFyYW1zLnNlbGVjdGlvbiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgICAgICBwYXJhbXMuc2VsZWN0aW9uID0ge1xuICAgICAgICAgICAgICAgIF9pZDogcGFyYW1zLnNlbGVjdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICBpZiAoIV8uaXNOaWwocGFyYW1zLmNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKHBhcmFtcy5jYWxsYmFjaykpIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICBpZiAocGFyYW1zLm9wdGlvbnMuZmllbGRzKSB7XG4gICAgICAgICAgICBpZiAoXy5pc05pbChwYXJhbXMuZmllbGRzKSB8fCBwYXJhbXMuZmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5maWVsZHMgPSBwYXJhbXMub3B0aW9ucy5maWVsZHM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKFwiRmllbGRzIGFscmVhZHkgcHJlc2VudC4gSWdub3JpbmcgJ29wdGlvbnMuZmllbGRzJy5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgfTtcbiAgICBcbiAgICByZXR1cm4gQ29sbGVjdGlvbjtcbn07Il19
