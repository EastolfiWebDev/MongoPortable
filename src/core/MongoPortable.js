"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @file MongoPortable.js - based on Monglo ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 *
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */
var _ = require("lodash");
var Promise = require("promise");
var jsw_logger_1 = require("jsw-logger");
var emitter_1 = require("../emitter");
var collection_1 = require("../collection");
var document_1 = require("../document");
var utils_1 = require("../utils");
/**
 * MongoPortable
 *
 * @module MongoPortable
 * @since 0.0.1
 *
 * @classdesc Portable database with persistence and MongoDB-like API
 *
 * @param {string} databaseName - Name of the database.
 */
var MongoPortable = /** @class */ (function (_super) {
    __extends(MongoPortable, _super);
    function MongoPortable(databaseName, options) {
        var _this = _super.call(this, options || { log: {} }) || this;
        /**
         * Alias for {@link MongoPortable#collection}
         *
         * @method MongoPortable#createCollection
         */
        _this.createCollection = _this.collection;
        _this.logger = jsw_logger_1.JSWLogger.instance;
        // If we have already this instance, return it
        if (MongoPortable._connHelper.hasConnection(databaseName)) {
            return MongoPortable._connHelper.getConnection(databaseName).instance;
        }
        else {
            _this._collections = {};
            _this._stores = [];
            // Check ddbb name format
            MongoPortable._connHelper.validateDatabaseName(databaseName);
            _this._databaseName = databaseName;
            MongoPortable._connHelper.addConnection(databaseName, new document_1.ObjectId(), _this);
        }
        return _this;
    }
    MongoPortable.prototype.emit = function (name, args) {
        return _super.prototype.emit.call(this, name, args, this._stores);
    };
    /**
     * Middleware functions
     *
     * @param  {String} name - Name of the middleware:
     *      <ul>
     *          <li>"store": Add a custom store</li>
     *      </ul>
     * @param  {Object|Function} fn - Function to implement the middleware
     */
    MongoPortable.prototype.use = function (name, obj) {
        switch (name) {
            case "store":
                this._stores.push(obj);
                break;
        }
    };
    /**
     * Adds a custom stores for remote and local persistence
     *
     * @param {Object|Function} store - The custom store
     *
     * @returns {MongoPortable} this - The current Instance
     */
    MongoPortable.prototype.addStore = function (store) {
        if (_.isNil(store))
            this.logger.throw("missing \"store\" parameter");
        if (_.isFunction(store)) {
            this._stores.push(new store());
        }
        else if (_.isObject(store)) {
            this._stores.push(store);
        }
        else {
            this.logger.throw("\"store\" must be a function or object");
        }
        return this;
    };
    /**
     * Retrieves the instance of that DDBB name
     *
     * @param {String} name - The DDBB name
     *
     * @return {MongoPortable} - The DDBB instance
     */
    MongoPortable.getInstance = function (name) {
        if (!_.isNil(name)) {
            return MongoPortable._connHelper.getConnection(name);
        }
        return null;
    };
    /**
     * Returns a cursor to all the collection information.
     *
     * @param {String} [collectionName=null] - the collection name we wish to retrieve the information from.
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @returns {Array}
     *
     * @todo Implement
     */
    MongoPortable.prototype.collectionsInfo = function (collectionName, callback) {
        this.logger.throw("Not implemented yet");
    };
    /**
     * Alias for {@link MongoPortable#collections}
     *
     * @method MongoPortable#fetchCollections
     */
    MongoPortable.prototype.fetchCollections = function (options, callback) {
        return this.collections(options, callback);
    };
    /**
     * Get the list of all collection for the specified db
     *
     * @method MongoPortable#collections
     *
     * @param {Object} [options] - Additional options
     *
     * @param {Boolean} [options.namesOnly=false] - Return only the collections names
     * @param {String|Array} [options.collectionName=null] - The collection name we wish to filter by
     *
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @return {Array}
     */
    MongoPortable.prototype.collections = function (options, callback) {
        if (_.isNil(callback) && _.isFunction(options)) {
            callback = options;
        }
        if (_.isNil(options))
            options = {};
        var self = this;
        var collectionList = [];
        for (var name in self._collections) {
            // Only add the requested collections //TODO Add array type
            if (options.collectionName) {
                if (name.toLowerCase() === options.collectionName.toLowerCase()) {
                    if (options.namesOnly) {
                        collectionList.push(name);
                    }
                    else {
                        collectionList.push(self._collections[name]);
                    }
                }
            }
            else {
                if (options.namesOnly) {
                    collectionList.push(name);
                }
                else {
                    collectionList.push(self._collections[name]);
                }
            }
        }
        if (callback)
            callback(collectionList);
        return collectionList;
    };
    /**
     * Get the list of all collection names for the specified db,
     *  by calling MongoPortable#collections with [options.namesOnly = true]
     *
     * @method MongoPortable#collectionNames
     *
     * @param {Object} [options] - Additional options.
     *
     * @param {String|Array} [options.collectionName=null] - The collection name we wish to filter by.
     *
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @return {Array}
     *
     * {@link MongoPortable#collections}
     */
    MongoPortable.prototype.collectionNames = function (options, callback) {
        if (_.isNil(callback) && _.isFunction(options)) {
            callback = options;
        }
        if (_.isNil(options))
            options = {};
        options.namesOnly = true;
        return this.collections(options, callback);
    };
    /**
     * Creates a collection on a server pre-allocating space, need to create f.ex capped collections.
     *
     * @method MongoPortable#collection
     *
     * @param {String} collectionName - the collection name we wish to access.
     * @param {Object} [options] - returns option results.
     *
     * @param {Boolean|Object} [options.safe=false] Executes with a getLastError command returning the results of the command on MongoMonglo:
     *      <ul>
     *          <li>true</li>
     *          <li>false</li>
     *          <li>{ w: {Number}, wtimeout: {Number}}</li>
     *          <li>{ fsync: true }</li>
     *      </ul>
     * @param {Boolean} [options.serializeFunctions=false] - Serialize functions on the document.
     * @param {Boolean} [options.raw=false] - Perform all operations using raw bson objects.
     * @param {Object} [options.pkFactory=null] - Object overriding the basic ObjectId primary key generation.
     * @param {Boolean} [options.capped=false] - Create a capped collection.
     * @param {Number} [options.size=4096] - The size of the capped collection in bytes.
     * @param {Number} [options.max=500] - The maximum number of documents in the capped collection.
     * @param {Boolean} [options.autoIndexId=false] - Create an index on the _id field of the document, not created automatically on capped collections.
     * @param {String} [options.readPreference=ReadPreference.PRIMARY] - Te prefered read preference:
     *      <ul>
     *          <li>ReadPreference.PRIMARY</li>
     *          <li>ReadPreference.PRIMARY_PREFERRED</li>
     *          <li>ReadPreference.SECONDARY</li>
     *          <li>ReadPreference.SECONDARY_PREFERRED</li>
     *          <li>ReadPreference.NEAREST</li>
     *      </ul>
     *
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @fires {@link MongoStore#createCollection}
     *
     * @returns {Promise<Collection>}
     */
    MongoPortable.prototype.collection = function (collectionName, options, callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var existing = true;
            // var collection;
            // var collectionFullName =  self.databaseName + "." + collectionName;
            if (_.isFunction(options)) {
                callback = options;
                options = {};
            }
            else {
                options = options || {};
            }
            if (!_this._collections[collectionName]) {
                _this._collections[collectionName] = new collection_1.Collection(_this, collectionName /*, this.pkFactory*/ /*, options*/);
                existing = false;
            }
            /**
             * "createCollection" event.
             *
             * @event MongoPortable~createCollection
             *
             * @property {Object} connection - Information about the current database connection
             * @property {Object} collection - Information about the collection created
             */
            _this.emit("createCollection", {
                connection: _this,
                collection: _this._collections[collectionName]
            }).then(function () {
                if (!existing) {
                    // Letting access the collection by <MongoPortable instance>.<COL_NAME>
                    Object.defineProperty(MongoPortable.prototype, collectionName, {
                        enumerable: true,
                        configurable: true,
                        writable: false,
                        value: _this._collections[collectionName]
                    });
                }
                // return self._collections[collectionName];
                if (callback)
                    callback(null, _this._collections[collectionName]);
                resolve(_this._collections[collectionName]);
            }).catch(function (error) {
                if (callback)
                    callback(error, null);
                reject(error);
            });
        });
    };
    /**
     * Drop a collection from the database, removing it permanently. New accesses will create a new collection.
     *
     * @method MongoPortable#dropCollection
     *
     * @param {String} collectionName - The name of the collection we wish to drop.
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @returns {Promise<Boolean>} Promise with "true" if dropped successfully
     */
    MongoPortable.prototype.dropCollection = function (collectionName, callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this._collections[collectionName]) {
                // Drop the collection
                _this.emit("dropCollection", {
                    conn: _this,
                    collection: _this._collections[collectionName]
                }).then(function () {
                    delete _this._collections[collectionName];
                    if (callback && _.isFunction(callback))
                        callback(null, true);
                    resolve(true);
                }).catch(function (error) {
                    if (callback && _.isFunction(callback))
                        callback(error, false);
                    reject(error);
                });
            }
            else {
                var error = new Error("No collection found");
                _this.logger.throw(error);
                if (callback && _.isFunction(callback))
                    callback(error, false);
                reject(error);
            }
        });
    };
    /**
     * Rename a collection.
     *
     * @method MongoPortable#renameCollection
     *
     * @param {String} fromCollection - The name of the current collection we wish to rename.
     * @param {String} toCollection - The new name of the collection.
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @returns {Promise<Collection>} Promise with the renamed collection
     */
    MongoPortable.prototype.renameCollection = function (fromCollection, toCollection, callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_.isString(fromCollection) || !_.isString(toCollection) || fromCollection === toCollection) {
                var error = new Error("You should pass two different string names");
                _this.logger.throw(error);
                if (callback && _.isFunction(callback))
                    callback(error, null);
                reject(error);
            }
            else {
                collection_1.Collection.checkCollectionName(toCollection);
                if (_this._collections[fromCollection]) {
                    _this.emit("renameCollection", {
                        conn: _this,
                        from: fromCollection,
                        to: toCollection
                    }).then(function () {
                        var renamed = _this._collections[fromCollection].rename(toCollection);
                        if (renamed) {
                            utils_1.Utils.renameObjectProperty(_this._collections, fromCollection, toCollection);
                            // this._collections.renameProperty(fromCollection, toCollection);
                            // this.renameProperty(fromCollection, toCollection);
                            utils_1.Utils.renameObjectProperty(_this, fromCollection, toCollection);
                            if (callback && _.isFunction(callback))
                                callback(null, renamed);
                            resolve(renamed);
                        }
                        else {
                            reject(new Error("Could not rename collection"));
                        }
                    }).catch(function (error) {
                        _this.logger.throw(error);
                        if (callback && _.isFunction(callback))
                            callback(error, null);
                        reject(error);
                    });
                }
                else {
                    var error = new Error("No collection found");
                    _this.logger.throw(error);
                    if (callback && _.isFunction(callback))
                        callback(error, null);
                    reject(error);
                }
            }
        });
    };
    /**
     * Creates an index on the collection.
     *
     * @method MongoPortable#createIndex
     *
     * @param {String} collectionName - Name of the collection to create the index on.
     * @param {Object} fieldOrSpec - FieldOrSpec that defines the index.
     * @param {Object} [options] - Additional options during update.
     *
     * @param {Boolean|Object} [options.safe=false] Executes with a getLastError command returning the results of the command on MongoMonglo:
     *      <ul>
     *          <li>true</li>
     *          <li>false</li>
     *          <li>{ w: {Number}, wtimeout: {Number}}</li>
     *          <li>{ fsync: true }</li>
     *      </ul>
     * @param {Boolean} [options.unique=false] - Creates an unique index
     * @param {Boolean} [options.sparse=false] - Creates a sparse index
     * @param {Boolean} [options.background=false] - Creates the index in the background, yielding whenever possible
     * @param {Boolean} [options.dropDups=false] - A unique index cannot be created on a key that has pre-existing duplicate values. If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value
     * @param {Number} [options.min=null] - For geospatial indexes set the lower bound for the co-ordinates
     * @param {Number} [options.max=null] - For geospatial indexes set the high bound for the co-ordinates
     * @param {Number} [options.v=null] - Specify the format version of the indexes
     * @param {Number} [options.expireAfterSeconds=null] - Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher)
     * @param {String} [options.name=null] - Override the autogenerated index name (useful if the resulting name is larger than 128 bytes)
     *
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @todo Implement
     */
    MongoPortable.prototype.createIndex = function (collectionName, fieldOrSpec, options, callback) {
        this.logger.throw("Not implemented yet!");
    };
    /**
     * Ensures that an index exists, if it does not it creates it
     *
     * @method MongoPortable#ensureIndex
     *
     * @param {String} collectionName - Name of the collection to create the index on.
     * @param {Object} fieldOrSpec - FieldOrSpec that defines the index.
     * @param {Object} [options] - Additional options during update.
     *
     * @param {Boolean|Object} [options.safe=false] - Executes with a getLastError command returning the results of the command on MongoMonglo:
     *      <ul>
     *          <li>true</li>
     *          <li>false</li>
     *          <li>{ w: {Number}, wtimeout: {Number}}</li>
     *          <li>{ fsync: true }</li>
     *      </ul>
     * @param {Boolean} [options.unique=false] - Creates an unique index
     * @param {Boolean} [options.sparse=false] - Creates a sparse index
     * @param {Boolean} [options.background=false] - Creates the index in the background, yielding whenever possible
     * @param {Boolean} [options.dropDups=false] - A unique index cannot be created on a key that has pre-existing duplicate values. If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value
     * @param {Number} [options.min] - For geospatial indexes set the lower bound for the co-ordinates
     * @param {Number} [options.max] - For geospatial indexes set the high bound for the co-ordinates
     * @param {Number} [options.v] - Specify the format version of the indexes
     * @param {Number} [options.expireAfterSeconds] - Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher)
     * @param {String} [options.name] - Override the autogenerated index name (useful if the resulting name is larger than 128 bytes)
     *
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @todo Implement
     */
    MongoPortable.prototype.ensureIndex = function (collectionName, fieldOrSpec, options, callback) {
        this.logger.throw("Not implemented yet!");
    };
    /**
     * Drop an index on a collection.
     *
     * @method MongoPortable#dropIndex
     *
     * @param {String} collectionName - The name of the collection where the command will drop an index.
     * @param {String} indexName - Name of the index to drop.
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @todo Implement
     */
    MongoPortable.prototype.dropIndex = function (collectionName, indexName, callback) {
        this.logger.throw("Not implemented yet!");
    };
    /**
     * Reindex all indexes on the collection
     * Warning: "reIndex" is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
     *
     * @method MongoPortable#reIndex
     *
     * @param {String} collectionName - The name of the collection to reindex
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @todo Implement
     **/
    MongoPortable.prototype.reIndex = function (collectionName, callback) {
        this.logger.throw("Not implemented yet!");
    };
    /**
     * Retrieves this collections index info.
     *
     * @method MongoPortable#indexInformation
     *
     * @param {String} collectionName - The name of the collection.
     * @param {Object} [options] Additional options during update.
     *
     * @param {Boolean} [full=false] - Returns the full raw index information.
     * @param {String} [readPreference] - The preferred read preference ((Server.PRIMARY, Server.PRIMARY_PREFERRED, Server.SECONDARY, Server.SECONDARY_PREFERRED, Server.NEAREST).
     *
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @todo Implement
     */
    MongoPortable.prototype.indexInformation = function (collectionName, options, callback) {
        this.logger.throw("Not implemented yet!");
    };
    /**
     * Drop the whole database.
     *
     * @method MongoPortable#dropDatabase
     *
     * @param {Function} [callback=null] - Callback function to be called at the end with the results
     *
     * @return {Promise<Boolean>} Promise with "true" if dropped successfully
     */
    MongoPortable.prototype.dropDatabase = function (callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (MongoPortable._connHelper.hasConnection(_this._databaseName)) {
                _this.emit("dropDatabase", {
                    conn: _this
                }).then(function () {
                    MongoPortable._connHelper.dropConnection(_this._databaseName);
                    _this._collections = [];
                    _this._stores = [];
                    if (callback && _.isFunction(callback))
                        callback(null, true);
                    resolve(true);
                });
            }
            else {
                var error = new Error("That database no longer exists");
                _this.logger.throw(error);
                if (callback && _.isFunction(callback))
                    callback(error, false);
                reject(error);
            }
        });
    };
    /**
     * Dereference a dbref, against a db
     *
     * @param {DBRef} dbRef db reference object we wish to resolve.
     * @param {Function} [callback=null] Callback function to be called at the end with the results
     *
     * @todo Implement
     *
     * @ignore
     */
    MongoPortable.prototype.dereference = function (dbRef, callback) {
        // TODO
        // var db = this;
        // // If we have a db reference then let"s get the db first
        // if (dbRef.db !== null) db = this.db(dbRef.db);
        // // Fetch the collection and find the reference
        // var collection = Monglo.collection(dbRef.namespace);
        // collection.findOne({"_id":dbRef.oid}, function(err, result) {
        //     callback(err, result);
        // });
    };
    MongoPortable._connHelper = new utils_1.ConnectionHelper();
    return MongoPortable;
}(emitter_1.EventEmitter));
exports.MongoPortable = MongoPortable;
//# sourceMappingURL=MongoPortable.js.map