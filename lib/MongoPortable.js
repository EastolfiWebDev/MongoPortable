'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @file MongoPortable.js - based on Monglo ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */
var _ = require('lodash'),
    EventEmitter = require("./utils/EventEmitter"),
    ObjectId = require('./ObjectId'),
    Collection = require('./Collection'),
    Logger = require("jsw-logger");

var logger = null;

/**
 * MongoPortable
 * 
 * @module MongoPortable
 * @constructor
 * @since 0.0.1
 * 
 * @classdesc Portable database with persistence and MongoDB-like API
 * 
 * @param {string} databaseName - Name of the database.
 */

var MongoPortable = function (_EventEmitter) {
    _inherits(MongoPortable, _EventEmitter);

    function MongoPortable(databaseName) {
        var _ret;

        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        _classCallCheck(this, MongoPortable);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MongoPortable).call(this));

        if (!(_this instanceof MongoPortable)) return _ret = new MongoPortable(databaseName), _possibleConstructorReturn(_this, _ret);

        if (options.log) {
            logger = Logger.getInstance(options.log);
        } else {
            logger = Logger.instance;
        }

        // Initializing variables
        _this._collections = {};
        _this._stores = [];

        if (!MongoPortable.connections) {
            MongoPortable.connections = {};
        }

        // Check ddbb name format
        _validateDatabaseName(databaseName);

        //Temp patch until I figure out how far I want to take the implementation;
        // FIXME
        if (MongoPortable.connections[databaseName]) {
            logger.throw('db name already in use');
        }

        _this.databaseName = databaseName;

        MongoPortable.connections[databaseName] = new ObjectId();
        return _this;
    }

    return MongoPortable;
}(EventEmitter);

/**
 * Connection Pool
 * 
 * @memberof MongoPortable
 * @static
 */


MongoPortable.connections = {};

// MongoPortable.prototype.__proto__ = EventEmitter.proto;

/**
 * Version Number
 * 
 * @memberof MongoPortable
 * @static
 */
MongoPortable.version = '0.0.1';

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
        case 'store':
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
    if (_.isNil(store)) logger.throw("store must be included");

    if (_.isFunction(store)) {
        this._stores.push(new store());
    } else if (_.isObject(store)) {
        this._stores.push(store);
    } else {
        logger.throw("store must be a function or object");
    }

    return this;
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
    logger.throw("Not implemented yet");
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

    if (_.isNil(options)) options = {};

    var self = this;

    var collectionList = [];
    for (var name in self._collections) {
        // Only add the requested collections //TODO Add array type
        if (options.collectionName) {
            if (name.toLowerCase() === options.collectionName.toLowerCase()) {
                if (options.namesOnly) {
                    collectionList.push(name);
                } else {
                    collectionList.push(self._collections[name]);
                }
            }
        } else {
            if (options.namesOnly) {
                collectionList.push(name);
            } else {
                collectionList.push(self._collections[name]);
            }
        }
    }

    if (callback) callback(collectionList);

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

    if (_.isNil(options)) options = {};

    if (!options.namesOnly) options.namesOnly = true;

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
 * @returns {Collection}
 */
MongoPortable.prototype.collection = function (collectionName, options, callback) {
    var self = this;
    var existing = false;
    // var collection;
    // var collectionFullName =  self.databaseName + "." + collectionName;

    if (_.isFunction(options)) {
        callback = options;
        options = {};
    } else {
        options = options || {};
    }

    // Collection already in memory, lets create it
    if (self._collections[collectionName]) {
        /**
         * "createCollection" event.
         *
         * @event MongoPortable~createCollection
         * 
         * @property {Object} connection - Information about the current database connection
         * @property {Object} collection - Information about the collection created
         */
        self.emit('createCollection', {
            connection: self,
            collection: self._collections[collectionName]
        });

        existing = true;
    } else {
        self._collections[collectionName] = new Collection(self, collectionName, self.pkFactory, options);
        /**
         * "createCollection" event.
         *
         * @event MongoPortable~createCollection
         * 
         * @property {Object} connection - Information about the current database connection
         * @property {Object} collection - Information about the collection created
         */
        self.emit('createCollection', {
            connection: self,
            collection: self._collections[collectionName]
        });
    }

    if (!existing) {
        // Letting access the collection by <MongoPortable instance>.<COL_NAME>
        Object.defineProperty(MongoPortable.prototype, collectionName, {
            enumerable: true,
            configurable: true,
            writable: false,
            value: self._collections[collectionName]
        });
    }

    // return self._collections[collectionName];
    if (callback) callback(self._collections[collectionName]);

    return self._collections[collectionName];
};

/**
 * Alias for {@link MongoPortable#collection}
 * 
 * @method MongoPortable#createCollection
 */
MongoPortable.prototype.createCollection = MongoPortable.prototype.collection;

/**
 * Drop a collection from the database, removing it permanently. New accesses will create a new collection.
 * 
 * @method MongoPortable#dropCollection
 *
 * @param {String} collectionName - The name of the collection we wish to drop.
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @returns {Boolean} "true" if dropped successfully
 */
MongoPortable.prototype.dropCollection = function (collectionName, callback) {
    var self = this;

    if (self._collections[collectionName]) {
        // Drop the collection
        this.emit('dropCollection', {
            conn: this,
            collection: self._collections[collectionName]
        });

        delete self._collections[collectionName];

        if (callback && _.isFunction(callback)) callback();

        return true;
    } else {
        var msg = "No collection found";

        logger.error(msg);

        if (callback && _.isFunction(callback)) callback(new Error(msg));

        return false;
    }
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
 * @returns {Boolean|Collection} The collection if renamed successfully or false if not
 */
MongoPortable.prototype.renameCollection = function (fromCollection, toCollection, callback) {
    var self = this;

    if (_.isString(fromCollection) && _.isString(toCollection) && fromCollection !== toCollection) {
        // Execute the command, return the new renamed collection if successful
        Collection.checkCollectionName(toCollection);

        if (self._collections[fromCollection]) {
            this.emit('renameCollection', {
                conn: self,
                from: fromCollection,
                to: toCollection
            });

            var renamed = self._collections[fromCollection].rename(toCollection);
            self._collections.renameProperty(fromCollection, toCollection);
            self.renameProperty(fromCollection, toCollection);

            if (callback && _.isFunction(callback)) callback(null, renamed);

            return renamed;
        } else {
            var msg = "No collection found";

            logger.error(msg);

            if (callback && _.isFunction(callback)) callback(new Error(msg), null);

            return false;
        }
    } else {
        var _msg = "The params are invalid";

        logger.error(_msg);

        if (callback && _.isFunction(callback)) callback(new Error(_msg), null);

        return false;
    }
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
    logger.throw('Not implemented yet!');
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
    logger.throw('Not implemented yet!');
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
    logger.throw('Not implemented yet!');
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
    logger.throw('Not implemented yet!');
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
    logger.throw('Not implemented yet!');
};

/**
 * Drop the whole database.
 * 
 * @method MongoPortable#dropDatabase
 *
 * @param {Function} [callback=null] - Callback function to be called at the end with the results
 * 
 * @return {Boolean} "true" if dropped successfully
 */
MongoPortable.prototype.dropDatabase = function (callback) {
    if (MongoPortable.connections[this.databaseName]) {
        this.emit('dropDatabase', {
            conn: this
        });

        delete MongoPortable.connections[this.databaseName];

        this._collections = [];
        this._stores = [];

        if (callback && _.isFunction(callback)) callback(null, true);

        return true;
    } else {
        var msg = 'That database no longer exists';

        logger.error(msg);

        if (callback && _.isFunction(callback)) callback(new Error(msg), false);

        return false;
    }
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

    // // If we have a db reference then let's get the db first
    // if (dbRef.db !== null) db = this.db(dbRef.db);

    // // Fetch the collection and find the reference
    // var collection = Monglo.collection(dbRef.namespace);

    // collection.findOne({'_id':dbRef.oid}, function(err, result) {
    //     callback(err, result);
    // });
};

/**
 * Validates the database name
 * 
 * @method MongoPortable#_validateDatabaseName
 * @private
 * 
 * @param {String} databaseName - The name of the database to validate
 * 
 * @return {Boolean} "true" if the name is valid
 */
var _validateDatabaseName = function _validateDatabaseName(databaseName) {
    if (!_.isString(databaseName)) logger.throw("database name must be a string");

    if (databaseName.length === 0) logger.throw("database name cannot be the empty string");

    var invalidChars = [" ", ".", "$", "/", "\\"];
    for (var i = 0; i < invalidChars.length; i++) {
        if (databaseName.indexOf(invalidChars[i]) != -1) {
            logger.throw('database names cannot contain the character "' + invalidChars[i] + '"');
        }
    }

    return true;
};

module.exports = MongoPortable;

/**
 * Renames an object property.
 * 
 * @method Object#renameProperty
 * 
 * @param {String} oldName - The name of the property to rename
 * @param {String} newName - The new name of the property
 * 
 * @returns {this} The called object
 */
Object.defineProperty(Object.prototype, 'renameProperty', {
    writable: false, // Cannot alter this property
    enumerable: false, // Will not show up in a for-in loop.
    configurable: false, // Cannot be deleted via the delete operator
    value: function value(oldName, newName) {
        // Do nothing if some name is missing or is not an string
        if (!_.isString(oldName) || !_.isString(newName)) {
            return this;
        }

        // Do nothing if the names are the same
        if (oldName == newName) {
            return this;
        }

        // Check for the old property name to
        // avoid a ReferenceError in strict mode.
        if (this.hasOwnProperty(oldName)) {
            this[newName] = this[oldName];
            delete this[oldName];
        }

        return this;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9Nb25nb1BvcnRhYmxlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFRQSxJQUFJLElBQUksUUFBUSxRQUFSLENBQVI7SUFDSSxlQUFlLFFBQVEsc0JBQVIsQ0FEbkI7SUFFSSxXQUFXLFFBQVEsWUFBUixDQUZmO0lBR0ksYUFBYSxRQUFRLGNBQVIsQ0FIakI7SUFJSSxTQUFTLFFBQVEsWUFBUixDQUpiOztBQU1BLElBQUksU0FBUyxJQUFiOzs7Ozs7Ozs7Ozs7OztJQWFNLGE7OztBQUNGLDJCQUFZLFlBQVosRUFBd0M7QUFBQTs7QUFBQSxZQUFkLE9BQWMseURBQUosRUFBSTs7QUFBQTs7QUFBQTs7QUFHcEMsWUFBSSxFQUFFLGlCQUFnQixhQUFsQixDQUFKLEVBQXNDLGNBQU8sSUFBSSxhQUFKLENBQWtCLFlBQWxCLENBQVA7O0FBRXRDLFlBQUksUUFBUSxHQUFaLEVBQWlCO0FBQ2IscUJBQVMsT0FBTyxXQUFQLENBQW1CLFFBQVEsR0FBM0IsQ0FBVDtBQUNILFNBRkQsTUFFTztBQUNILHFCQUFTLE9BQU8sUUFBaEI7QUFDSDs7O0FBR0QsY0FBSyxZQUFMLEdBQW9CLEVBQXBCO0FBQ0EsY0FBSyxPQUFMLEdBQWUsRUFBZjs7QUFFQSxZQUFJLENBQUMsY0FBYyxXQUFuQixFQUFnQztBQUM1QiwwQkFBYyxXQUFkLEdBQTRCLEVBQTVCO0FBQ0g7OztBQUdELDhCQUFzQixZQUF0Qjs7OztBQUlBLFlBQUksY0FBYyxXQUFkLENBQTBCLFlBQTFCLENBQUosRUFBNkM7QUFDekMsbUJBQU8sS0FBUCxDQUFhLHdCQUFiO0FBQ0g7O0FBRUQsY0FBSyxZQUFMLEdBQW9CLFlBQXBCOztBQUVBLHNCQUFjLFdBQWQsQ0FBMEIsWUFBMUIsSUFBMEMsSUFBSSxRQUFKLEVBQTFDO0FBOUJvQztBQStCdkM7OztFQWhDdUIsWTs7Ozs7Ozs7OztBQXlDNUIsY0FBYyxXQUFkLEdBQTRCLEVBQTVCOzs7Ozs7Ozs7O0FBVUEsY0FBYyxP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QyxFQUFFLFFBQUYsQ0FBVyxPQUFYLENBQUQsSUFBd0IsQ0FBQyxFQUFFLFFBQUYsQ0FBVyxPQUFYLENBQTdCLEVBQWtEO0FBQzlDLG1CQUFPLElBQVA7QUFDSDs7O0FBR0QsWUFBSSxXQUFXLE9BQWYsRUFBd0I7QUFDcEIsbUJBQU8sSUFBUDtBQUNIOzs7O0FBSUQsWUFBSSxLQUFLLGNBQUwsQ0FBb0IsT0FBcEIsQ0FBSixFQUFrQztBQUM5QixpQkFBSyxPQUFMLElBQWdCLEtBQUssT0FBTCxDQUFoQjtBQUNBLG1CQUFPLEtBQUssT0FBTCxDQUFQO0FBQ0g7O0FBRUQsZUFBTyxJQUFQO0FBQ0g7QUF2QkwsQ0FISiIsImZpbGUiOiJNb25nb1BvcnRhYmxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBNb25nb1BvcnRhYmxlLmpzIC0gYmFzZWQgb24gTW9uZ2xvICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlYXN0b2xmaTkxQGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgMjAxNiBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyksXG4gICAgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4vdXRpbHMvRXZlbnRFbWl0dGVyXCIpLFxuICAgIE9iamVjdElkID0gcmVxdWlyZSgnLi9PYmplY3RJZCcpLFxuICAgIENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL0NvbGxlY3Rpb24nKSxcbiAgICBMb2dnZXIgPSByZXF1aXJlKFwianN3LWxvZ2dlclwiKTtcbiAgICBcbnZhciBsb2dnZXIgPSBudWxsO1xuICAgIFxuLyoqXG4gKiBNb25nb1BvcnRhYmxlXG4gKiBcbiAqIEBtb2R1bGUgTW9uZ29Qb3J0YWJsZVxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2luY2UgMC4wLjFcbiAqIFxuICogQGNsYXNzZGVzYyBQb3J0YWJsZSBkYXRhYmFzZSB3aXRoIHBlcnNpc3RlbmNlIGFuZCBNb25nb0RCLWxpa2UgQVBJXG4gKiBcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhYmFzZU5hbWUgLSBOYW1lIG9mIHRoZSBkYXRhYmFzZS5cbiAqL1xuY2xhc3MgTW9uZ29Qb3J0YWJsZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gICAgY29uc3RydWN0b3IoZGF0YWJhc2VOYW1lLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNb25nb1BvcnRhYmxlKSkgcmV0dXJuIG5ldyBNb25nb1BvcnRhYmxlKGRhdGFiYXNlTmFtZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAob3B0aW9ucy5sb2cpIHtcbiAgICAgICAgICAgIGxvZ2dlciA9IExvZ2dlci5nZXRJbnN0YW5jZShvcHRpb25zLmxvZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6aW5nIHZhcmlhYmxlc1xuICAgICAgICB0aGlzLl9jb2xsZWN0aW9ucyA9IHt9O1xuICAgICAgICB0aGlzLl9zdG9yZXMgPSBbXTtcbiAgICBcbiAgICAgICAgaWYgKCFNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zKSB7XG4gICAgICAgICAgICBNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGRkYmIgbmFtZSBmb3JtYXRcbiAgICAgICAgX3ZhbGlkYXRlRGF0YWJhc2VOYW1lKGRhdGFiYXNlTmFtZSk7XG4gICAgXG4gICAgICAgIC8vVGVtcCBwYXRjaCB1bnRpbCBJIGZpZ3VyZSBvdXQgaG93IGZhciBJIHdhbnQgdG8gdGFrZSB0aGUgaW1wbGVtZW50YXRpb247XG4gICAgICAgIC8vIEZJWE1FXG4gICAgICAgIGlmIChNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zW2RhdGFiYXNlTmFtZV0pIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdygnZGIgbmFtZSBhbHJlYWR5IGluIHVzZScpO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIHRoaXMuZGF0YWJhc2VOYW1lID0gZGF0YWJhc2VOYW1lO1xuICAgIFxuICAgICAgICBNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zW2RhdGFiYXNlTmFtZV0gPSBuZXcgT2JqZWN0SWQoKTtcbiAgICB9XG59XG5cbi8qKlxuICogQ29ubmVjdGlvbiBQb29sXG4gKiBcbiAqIEBtZW1iZXJvZiBNb25nb1BvcnRhYmxlXG4gKiBAc3RhdGljXG4gKi9cbk1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnMgPSB7fTtcblxuLy8gTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuX19wcm90b19fID0gRXZlbnRFbWl0dGVyLnByb3RvO1xuXG4vKipcbiAqIFZlcnNpb24gTnVtYmVyXG4gKiBcbiAqIEBtZW1iZXJvZiBNb25nb1BvcnRhYmxlXG4gKiBAc3RhdGljXG4gKi9cbk1vbmdvUG9ydGFibGUudmVyc2lvbiA9ICcwLjAuMSc7XG5cbi8qKlxuICogTWlkZGxld2FyZSBmdW5jdGlvbnNcbiAqIFxuICogQHBhcmFtICB7U3RyaW5nfSBuYW1lIC0gTmFtZSBvZiB0aGUgbWlkZGxld2FyZTpcbiAqICAgICAgPHVsPlxuICogICAgICAgICAgPGxpPlwic3RvcmVcIjogQWRkIGEgY3VzdG9tIHN0b3JlPC9saT5cbiAqICAgICAgPC91bD5cbiAqIEBwYXJhbSAge09iamVjdHxGdW5jdGlvbn0gZm4gLSBGdW5jdGlvbiB0byBpbXBsZW1lbnQgdGhlIG1pZGRsZXdhcmVcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24obmFtZSwgb2JqKSB7XG4gICAgc3dpdGNoKG5hbWUpIHtcbiAgICAgICAgY2FzZSAnc3RvcmUnOlxuICAgICAgICAgICAgdGhpcy5fc3RvcmVzLnB1c2gob2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn07XG5cbi8qKlxuICogQWRkcyBhIGN1c3RvbSBzdG9yZXMgZm9yIHJlbW90ZSBhbmQgbG9jYWwgcGVyc2lzdGVuY2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdHxGdW5jdGlvbn0gc3RvcmUgLSBUaGUgY3VzdG9tIHN0b3JlXG4gKiBcbiAqIEByZXR1cm5zIHtNb25nb1BvcnRhYmxlfSB0aGlzIC0gVGhlIGN1cnJlbnQgSW5zdGFuY2VcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuYWRkU3RvcmUgPSBmdW5jdGlvbiAoc3RvcmUpIHtcbiAgICBpZiAoXy5pc05pbChzdG9yZSkpIGxvZ2dlci50aHJvdyhcInN0b3JlIG11c3QgYmUgaW5jbHVkZWRcIik7XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihzdG9yZSkpIHtcbiAgICAgICAgdGhpcy5fc3RvcmVzLnB1c2gobmV3IHN0b3JlKCkpO1xuICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdChzdG9yZSkpIHtcbiAgICAgICAgdGhpcy5fc3RvcmVzLnB1c2goc3RvcmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci50aHJvdyhcInN0b3JlIG11c3QgYmUgYSBmdW5jdGlvbiBvciBvYmplY3RcIik7XG4gICAgfVxuICAgIFxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBjdXJzb3IgdG8gYWxsIHRoZSBjb2xsZWN0aW9uIGluZm9ybWF0aW9uLlxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gW2NvbGxlY3Rpb25OYW1lPW51bGxdIC0gdGhlIGNvbGxlY3Rpb24gbmFtZSB3ZSB3aXNoIHRvIHJldHJpZXZlIHRoZSBpbmZvcm1hdGlvbiBmcm9tLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKlxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmNvbGxlY3Rpb25zSW5mbyA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBjYWxsYmFjaykge1xuICAgIGxvZ2dlci50aHJvdyhcIk5vdCBpbXBsZW1lbnRlZCB5ZXRcIik7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciB7QGxpbmsgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9uc31cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2ZldGNoQ29sbGVjdGlvbnNcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZmV0Y2hDb2xsZWN0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbnMob3B0aW9ucywgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIGxpc3Qgb2YgYWxsIGNvbGxlY3Rpb24gZm9yIHRoZSBzcGVjaWZpZWQgZGJcbiAqXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjY29sbGVjdGlvbnNcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLm5hbWVzT25seT1mYWxzZV0gLSBSZXR1cm4gb25seSB0aGUgY29sbGVjdGlvbnMgbmFtZXNcbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBbb3B0aW9ucy5jb2xsZWN0aW9uTmFtZT1udWxsXSAtIFRoZSBjb2xsZWN0aW9uIG5hbWUgd2Ugd2lzaCB0byBmaWx0ZXIgYnlcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICpcbiAqIEByZXR1cm4ge0FycmF5fSBcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGNhbGxiYWNrKSAmJiBfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgIFxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBcbiAgICB2YXIgY29sbGVjdGlvbkxpc3QgPSBbXTtcbiAgICBmb3IgKHZhciBuYW1lIGluIHNlbGYuX2NvbGxlY3Rpb25zKSB7XG4gICAgICAgIC8vIE9ubHkgYWRkIHRoZSByZXF1ZXN0ZWQgY29sbGVjdGlvbnMgLy9UT0RPIEFkZCBhcnJheSB0eXBlXG4gICAgICAgIGlmIChvcHRpb25zLmNvbGxlY3Rpb25OYW1lKSB7XG4gICAgICAgICAgICBpZiAobmFtZS50b0xvd2VyQ2FzZSgpID09PSBvcHRpb25zLmNvbGxlY3Rpb25OYW1lLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5uYW1lc09ubHkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbkxpc3QucHVzaChuYW1lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uTGlzdC5wdXNoKHNlbGYuX2NvbGxlY3Rpb25zW25hbWVdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5uYW1lc09ubHkpIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uTGlzdC5wdXNoKG5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uTGlzdC5wdXNoKHNlbGYuX2NvbGxlY3Rpb25zW25hbWVdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soY29sbGVjdGlvbkxpc3QpO1xuICAgIFxuICAgIHJldHVybiBjb2xsZWN0aW9uTGlzdDtcbn07XG5cbiAvKipcbiAqIEdldCB0aGUgbGlzdCBvZiBhbGwgY29sbGVjdGlvbiBuYW1lcyBmb3IgdGhlIHNwZWNpZmllZCBkYiwgXG4gKiAgYnkgY2FsbGluZyBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25zIHdpdGggW29wdGlvbnMubmFtZXNPbmx5ID0gdHJ1ZV1cbiAqXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjY29sbGVjdGlvbk5hbWVzXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnMuXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBbb3B0aW9ucy5jb2xsZWN0aW9uTmFtZT1udWxsXSAtIFRoZSBjb2xsZWN0aW9uIG5hbWUgd2Ugd2lzaCB0byBmaWx0ZXIgYnkuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIFxuICoge0BsaW5rIE1vbmdvUG9ydGFibGUjY29sbGVjdGlvbnN9XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmNvbGxlY3Rpb25OYW1lcyA9IGZ1bmN0aW9uKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoY2FsbGJhY2spICYmIF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgXG4gICAgaWYgKCFvcHRpb25zLm5hbWVzT25seSkgb3B0aW9ucy5uYW1lc09ubHkgPSB0cnVlO1xuICAgIFxuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb25zKG9wdGlvbnMsIGNhbGxiYWNrKTtcbn07XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgY29sbGVjdGlvbiBvbiBhIHNlcnZlciBwcmUtYWxsb2NhdGluZyBzcGFjZSwgbmVlZCB0byBjcmVhdGUgZi5leCBjYXBwZWQgY29sbGVjdGlvbnMuXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9uXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIHRoZSBjb2xsZWN0aW9uIG5hbWUgd2Ugd2lzaCB0byBhY2Nlc3MuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gcmV0dXJucyBvcHRpb24gcmVzdWx0cy5cbiAqIFxuICogQHBhcmFtIHtCb29sZWFufE9iamVjdH0gW29wdGlvbnMuc2FmZT1mYWxzZV0gRXhlY3V0ZXMgd2l0aCBhIGdldExhc3RFcnJvciBjb21tYW5kIHJldHVybmluZyB0aGUgcmVzdWx0cyBvZiB0aGUgY29tbWFuZCBvbiBNb25nb01vbmdsbzpcbiAqICAgICAgPHVsPlxuICogICAgICAgICAgPGxpPnRydWU8L2xpPlxuICogICAgICAgICAgPGxpPmZhbHNlPC9saT5cbiAqICAgICAgICAgIDxsaT57IHc6IHtOdW1iZXJ9LCB3dGltZW91dDoge051bWJlcn19PC9saT5cbiAqICAgICAgICAgIDxsaT57IGZzeW5jOiB0cnVlIH08L2xpPlxuICogICAgICA8L3VsPlxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5zZXJpYWxpemVGdW5jdGlvbnM9ZmFsc2VdIC0gU2VyaWFsaXplIGZ1bmN0aW9ucyBvbiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnJhdz1mYWxzZV0gLSBQZXJmb3JtIGFsbCBvcGVyYXRpb25zIHVzaW5nIHJhdyBic29uIG9iamVjdHMuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMucGtGYWN0b3J5PW51bGxdIC0gT2JqZWN0IG92ZXJyaWRpbmcgdGhlIGJhc2ljIE9iamVjdElkIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNhcHBlZD1mYWxzZV0gLSBDcmVhdGUgYSBjYXBwZWQgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5zaXplPTQwOTZdIC0gVGhlIHNpemUgb2YgdGhlIGNhcHBlZCBjb2xsZWN0aW9uIGluIGJ5dGVzLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm1heD01MDBdIC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIGRvY3VtZW50cyBpbiB0aGUgY2FwcGVkIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmF1dG9JbmRleElkPWZhbHNlXSAtIENyZWF0ZSBhbiBpbmRleCBvbiB0aGUgX2lkIGZpZWxkIG9mIHRoZSBkb2N1bWVudCwgbm90IGNyZWF0ZWQgYXV0b21hdGljYWxseSBvbiBjYXBwZWQgY29sbGVjdGlvbnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMucmVhZFByZWZlcmVuY2U9UmVhZFByZWZlcmVuY2UuUFJJTUFSWV0gLSBUZSBwcmVmZXJlZCByZWFkIHByZWZlcmVuY2U6XG4gKiAgICAgIDx1bD5cbiAqICAgICAgICAgIDxsaT5SZWFkUHJlZmVyZW5jZS5QUklNQVJZPC9saT5cbiAqICAgICAgICAgIDxsaT5SZWFkUHJlZmVyZW5jZS5QUklNQVJZX1BSRUZFUlJFRDwvbGk+XG4gKiAgICAgICAgICA8bGk+UmVhZFByZWZlcmVuY2UuU0VDT05EQVJZPC9saT5cbiAqICAgICAgICAgIDxsaT5SZWFkUHJlZmVyZW5jZS5TRUNPTkRBUllfUFJFRkVSUkVEPC9saT5cbiAqICAgICAgICAgIDxsaT5SZWFkUHJlZmVyZW5jZS5ORUFSRVNUPC9saT5cbiAqICAgICAgPC91bD5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAZmlyZXMge0BsaW5rIE1vbmdvU3RvcmUjY3JlYXRlQ29sbGVjdGlvbn1cbiAqIFxuICogQHJldHVybnMge0NvbGxlY3Rpb259XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmNvbGxlY3Rpb24gPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGV4aXN0aW5nID0gZmFsc2U7XG4gICAgLy8gdmFyIGNvbGxlY3Rpb247XG4gICAgLy8gdmFyIGNvbGxlY3Rpb25GdWxsTmFtZSA9ICBzZWxmLmRhdGFiYXNlTmFtZSArIFwiLlwiICsgY29sbGVjdGlvbk5hbWU7XG5cbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKXtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfSBlbHNlIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgfVxuICAgIFxuICAgIC8vIENvbGxlY3Rpb24gYWxyZWFkeSBpbiBtZW1vcnksIGxldHMgY3JlYXRlIGl0XG4gICAgaWYgKHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogXCJjcmVhdGVDb2xsZWN0aW9uXCIgZXZlbnQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfmNyZWF0ZUNvbGxlY3Rpb25cbiAgICAgICAgICogXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb25uZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnQgZGF0YWJhc2UgY29ubmVjdGlvblxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uIGNyZWF0ZWRcbiAgICAgICAgICovXG4gICAgICAgIHNlbGYuZW1pdChcbiAgICAgICAgICAgICdjcmVhdGVDb2xsZWN0aW9uJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uOiBzZWxmLFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIGV4aXN0aW5nID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0gPSBuZXcgQ29sbGVjdGlvbihzZWxmLCBjb2xsZWN0aW9uTmFtZSwgc2VsZi5wa0ZhY3RvcnksIG9wdGlvbnMpO1xuICAgICAgICAvKipcbiAgICAgICAgICogXCJjcmVhdGVDb2xsZWN0aW9uXCIgZXZlbnQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBldmVudCBNb25nb1BvcnRhYmxlfmNyZWF0ZUNvbGxlY3Rpb25cbiAgICAgICAgICogXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb25uZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnQgZGF0YWJhc2UgY29ubmVjdGlvblxuICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29sbGVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb2xsZWN0aW9uIGNyZWF0ZWRcbiAgICAgICAgICovXG4gICAgICAgIHNlbGYuZW1pdChcbiAgICAgICAgICAgICdjcmVhdGVDb2xsZWN0aW9uJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uOiBzZWxmLFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWV4aXN0aW5nKSB7XG4gICAgICAgIC8vIExldHRpbmcgYWNjZXNzIHRoZSBjb2xsZWN0aW9uIGJ5IDxNb25nb1BvcnRhYmxlIGluc3RhbmNlPi48Q09MX05BTUU+XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShNb25nb1BvcnRhYmxlLnByb3RvdHlwZSwgY29sbGVjdGlvbk5hbWUsIHtcbiAgICAgICAgICAgIGVudW1lcmFibGUgOiB0cnVlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHZhbHVlOiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8vIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV07XG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0pO1xuXG4gICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb259XG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNjcmVhdGVDb2xsZWN0aW9uXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmNyZWF0ZUNvbGxlY3Rpb24gPSBNb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9uO1xuXG4vKipcbiAqIERyb3AgYSBjb2xsZWN0aW9uIGZyb20gdGhlIGRhdGFiYXNlLCByZW1vdmluZyBpdCBwZXJtYW5lbnRseS4gTmV3IGFjY2Vzc2VzIHdpbGwgY3JlYXRlIGEgbmV3IGNvbGxlY3Rpb24uXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNkcm9wQ29sbGVjdGlvblxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHdlIHdpc2ggdG8gZHJvcC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge0Jvb2xlYW59IFwidHJ1ZVwiIGlmIGRyb3BwZWQgc3VjY2Vzc2Z1bGx5XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmRyb3BDb2xsZWN0aW9uID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXSkge1xuICAgICAgICAvLyBEcm9wIHRoZSBjb2xsZWN0aW9uXG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICdkcm9wQ29sbGVjdGlvbicsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29ubjogdGhpcyxcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGRlbGV0ZSBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV07XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2sgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgY2FsbGJhY2soKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBtc2cgPSBcIk5vIGNvbGxlY3Rpb24gZm91bmRcIjtcbiAgICAgICAgXG4gICAgICAgIGxvZ2dlci5lcnJvcihtc2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG5ldyBFcnJvcihtc2cpKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbmFtZSBhIGNvbGxlY3Rpb24uXG4gKlxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI3JlbmFtZUNvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGZyb21Db2xsZWN0aW9uIC0gVGhlIG5hbWUgb2YgdGhlIGN1cnJlbnQgY29sbGVjdGlvbiB3ZSB3aXNoIHRvIHJlbmFtZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSB0b0NvbGxlY3Rpb24gLSBUaGUgbmV3IG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtCb29sZWFufENvbGxlY3Rpb259IFRoZSBjb2xsZWN0aW9uIGlmIHJlbmFtZWQgc3VjY2Vzc2Z1bGx5IG9yIGZhbHNlIGlmIG5vdFxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5yZW5hbWVDb2xsZWN0aW9uID0gZnVuY3Rpb24oZnJvbUNvbGxlY3Rpb24sIHRvQ29sbGVjdGlvbiwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoXy5pc1N0cmluZyhmcm9tQ29sbGVjdGlvbikgJiYgXy5pc1N0cmluZyh0b0NvbGxlY3Rpb24pICYmIGZyb21Db2xsZWN0aW9uICE9PSB0b0NvbGxlY3Rpb24pIHtcbiAgICAgICAgLy8gRXhlY3V0ZSB0aGUgY29tbWFuZCwgcmV0dXJuIHRoZSBuZXcgcmVuYW1lZCBjb2xsZWN0aW9uIGlmIHN1Y2Nlc3NmdWxcbiAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKHRvQ29sbGVjdGlvbik7XG4gICAgICAgIFxuICAgICAgICBpZiAoc2VsZi5fY29sbGVjdGlvbnNbZnJvbUNvbGxlY3Rpb25dKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAgICAgJ3JlbmFtZUNvbGxlY3Rpb24nLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29ubjogc2VsZixcbiAgICAgICAgICAgICAgICAgICAgZnJvbTogZnJvbUNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRvOiB0b0NvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgcmVuYW1lZCA9IHNlbGYuX2NvbGxlY3Rpb25zW2Zyb21Db2xsZWN0aW9uXS5yZW5hbWUodG9Db2xsZWN0aW9uKTtcbiAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb25zLnJlbmFtZVByb3BlcnR5KGZyb21Db2xsZWN0aW9uLCB0b0NvbGxlY3Rpb24pO1xuICAgICAgICAgICAgc2VsZi5yZW5hbWVQcm9wZXJ0eShmcm9tQ29sbGVjdGlvbiwgdG9Db2xsZWN0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG51bGwsIHJlbmFtZWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gcmVuYW1lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBtc2cgPSBcIk5vIGNvbGxlY3Rpb24gZm91bmRcIjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKG1zZyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhuZXcgRXJyb3IobXNnKSwgbnVsbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBtc2cgPSBcIlRoZSBwYXJhbXMgYXJlIGludmFsaWRcIjtcbiAgICAgICAgXG4gICAgICAgIGxvZ2dlci5lcnJvcihtc2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG5ldyBFcnJvcihtc2cpLCBudWxsKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogQ3JlYXRlcyBhbiBpbmRleCBvbiB0aGUgY29sbGVjdGlvbi5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NyZWF0ZUluZGV4XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gTmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0byBjcmVhdGUgdGhlIGluZGV4IG9uLlxuICogQHBhcmFtIHtPYmplY3R9IGZpZWxkT3JTcGVjIC0gRmllbGRPclNwZWMgdGhhdCBkZWZpbmVzIHRoZSBpbmRleC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnMgZHVyaW5nIHVwZGF0ZS5cbiAqIFxuICogQHBhcmFtIHtCb29sZWFufE9iamVjdH0gW29wdGlvbnMuc2FmZT1mYWxzZV0gRXhlY3V0ZXMgd2l0aCBhIGdldExhc3RFcnJvciBjb21tYW5kIHJldHVybmluZyB0aGUgcmVzdWx0cyBvZiB0aGUgY29tbWFuZCBvbiBNb25nb01vbmdsbzpcbiAqICAgICAgPHVsPlxuICogICAgICAgICAgPGxpPnRydWU8L2xpPlxuICogICAgICAgICAgPGxpPmZhbHNlPC9saT5cbiAqICAgICAgICAgIDxsaT57IHc6IHtOdW1iZXJ9LCB3dGltZW91dDoge051bWJlcn19PC9saT5cbiAqICAgICAgICAgIDxsaT57IGZzeW5jOiB0cnVlIH08L2xpPlxuICogICAgICA8L3VsPiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMudW5pcXVlPWZhbHNlXSAtIENyZWF0ZXMgYW4gdW5pcXVlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnNwYXJzZT1mYWxzZV0gLSBDcmVhdGVzIGEgc3BhcnNlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmJhY2tncm91bmQ9ZmFsc2VdIC0gQ3JlYXRlcyB0aGUgaW5kZXggaW4gdGhlIGJhY2tncm91bmQsIHlpZWxkaW5nIHdoZW5ldmVyIHBvc3NpYmxlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmRyb3BEdXBzPWZhbHNlXSAtIEEgdW5pcXVlIGluZGV4IGNhbm5vdCBiZSBjcmVhdGVkIG9uIGEga2V5IHRoYXQgaGFzIHByZS1leGlzdGluZyBkdXBsaWNhdGUgdmFsdWVzLiBJZiB5b3Ugd291bGQgbGlrZSB0byBjcmVhdGUgdGhlIGluZGV4IGFueXdheSwga2VlcGluZyB0aGUgZmlyc3QgZG9jdW1lbnQgdGhlIGRhdGFiYXNlIGluZGV4ZXMgYW5kIGRlbGV0aW5nIGFsbCBzdWJzZXF1ZW50IGRvY3VtZW50cyB0aGF0IGhhdmUgZHVwbGljYXRlIHZhbHVlXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWluPW51bGxdIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGxvd2VyIGJvdW5kIGZvciB0aGUgY28tb3JkaW5hdGVzXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWF4PW51bGxdIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGhpZ2ggYm91bmQgZm9yIHRoZSBjby1vcmRpbmF0ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy52PW51bGxdIC0gU3BlY2lmeSB0aGUgZm9ybWF0IHZlcnNpb24gb2YgdGhlIGluZGV4ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5leHBpcmVBZnRlclNlY29uZHM9bnVsbF0gLSBBbGxvd3MgeW91IHRvIGV4cGlyZSBkYXRhIG9uIGluZGV4ZXMgYXBwbGllZCB0byBhIGRhdGEgKE1vbmdvREIgMi4yIG9yIGhpZ2hlcilcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5uYW1lPW51bGxdIC0gT3ZlcnJpZGUgdGhlIGF1dG9nZW5lcmF0ZWQgaW5kZXggbmFtZSAodXNlZnVsIGlmIHRoZSByZXN1bHRpbmcgbmFtZSBpcyBsYXJnZXIgdGhhbiAxMjggYnl0ZXMpXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmNyZWF0ZUluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGZpZWxkT3JTcGVjLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGxvZ2dlci50aHJvdygnTm90IGltcGxlbWVudGVkIHlldCEnKTtcbn07XG5cbi8qKlxuICogRW5zdXJlcyB0aGF0IGFuIGluZGV4IGV4aXN0cywgaWYgaXQgZG9lcyBub3QgaXQgY3JlYXRlcyBpdFxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjZW5zdXJlSW5kZXhcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBOYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHRvIGNyZWF0ZSB0aGUgaW5kZXggb24uXG4gKiBAcGFyYW0ge09iamVjdH0gZmllbGRPclNwZWMgLSBGaWVsZE9yU3BlYyB0aGF0IGRlZmluZXMgdGhlIGluZGV4LlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9ucyBkdXJpbmcgdXBkYXRlLlxuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW58T2JqZWN0fSBbb3B0aW9ucy5zYWZlPWZhbHNlXSAtIEV4ZWN1dGVzIHdpdGggYSBnZXRMYXN0RXJyb3IgY29tbWFuZCByZXR1cm5pbmcgdGhlIHJlc3VsdHMgb2YgdGhlIGNvbW1hbmQgb24gTW9uZ29Nb25nbG86XG4gKiAgICAgIDx1bD5cbiAqICAgICAgICAgIDxsaT50cnVlPC9saT5cbiAqICAgICAgICAgIDxsaT5mYWxzZTwvbGk+XG4gKiAgICAgICAgICA8bGk+eyB3OiB7TnVtYmVyfSwgd3RpbWVvdXQ6IHtOdW1iZXJ9fTwvbGk+XG4gKiAgICAgICAgICA8bGk+eyBmc3luYzogdHJ1ZSB9PC9saT5cbiAqICAgICAgPC91bD5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMudW5pcXVlPWZhbHNlXSAtIENyZWF0ZXMgYW4gdW5pcXVlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnNwYXJzZT1mYWxzZV0gLSBDcmVhdGVzIGEgc3BhcnNlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmJhY2tncm91bmQ9ZmFsc2VdIC0gQ3JlYXRlcyB0aGUgaW5kZXggaW4gdGhlIGJhY2tncm91bmQsIHlpZWxkaW5nIHdoZW5ldmVyIHBvc3NpYmxlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmRyb3BEdXBzPWZhbHNlXSAtIEEgdW5pcXVlIGluZGV4IGNhbm5vdCBiZSBjcmVhdGVkIG9uIGEga2V5IHRoYXQgaGFzIHByZS1leGlzdGluZyBkdXBsaWNhdGUgdmFsdWVzLiBJZiB5b3Ugd291bGQgbGlrZSB0byBjcmVhdGUgdGhlIGluZGV4IGFueXdheSwga2VlcGluZyB0aGUgZmlyc3QgZG9jdW1lbnQgdGhlIGRhdGFiYXNlIGluZGV4ZXMgYW5kIGRlbGV0aW5nIGFsbCBzdWJzZXF1ZW50IGRvY3VtZW50cyB0aGF0IGhhdmUgZHVwbGljYXRlIHZhbHVlXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWluXSAtIEZvciBnZW9zcGF0aWFsIGluZGV4ZXMgc2V0IHRoZSBsb3dlciBib3VuZCBmb3IgdGhlIGNvLW9yZGluYXRlc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm1heF0gLSBGb3IgZ2Vvc3BhdGlhbCBpbmRleGVzIHNldCB0aGUgaGlnaCBib3VuZCBmb3IgdGhlIGNvLW9yZGluYXRlc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnZdIC0gU3BlY2lmeSB0aGUgZm9ybWF0IHZlcnNpb24gb2YgdGhlIGluZGV4ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5leHBpcmVBZnRlclNlY29uZHNdIC0gQWxsb3dzIHlvdSB0byBleHBpcmUgZGF0YSBvbiBpbmRleGVzIGFwcGxpZWQgdG8gYSBkYXRhIChNb25nb0RCIDIuMiBvciBoaWdoZXIpXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMubmFtZV0gLSBPdmVycmlkZSB0aGUgYXV0b2dlbmVyYXRlZCBpbmRleCBuYW1lICh1c2VmdWwgaWYgdGhlIHJlc3VsdGluZyBuYW1lIGlzIGxhcmdlciB0aGFuIDEyOCBieXRlcylcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZW5zdXJlSW5kZXggPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgZmllbGRPclNwZWMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgbG9nZ2VyLnRocm93KCdOb3QgaW1wbGVtZW50ZWQgeWV0IScpO1xufTtcblxuLyoqXG4gKiBEcm9wIGFuIGluZGV4IG9uIGEgY29sbGVjdGlvbi5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2Ryb3BJbmRleFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHdoZXJlIHRoZSBjb21tYW5kIHdpbGwgZHJvcCBhbiBpbmRleC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBpbmRleE5hbWUgLSBOYW1lIG9mIHRoZSBpbmRleCB0byBkcm9wLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZHJvcEluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGluZGV4TmFtZSwgY2FsbGJhY2spIHtcbiAgICBsb2dnZXIudGhyb3coJ05vdCBpbXBsZW1lbnRlZCB5ZXQhJyk7XG59O1xuXG4vKipcbiAqIFJlaW5kZXggYWxsIGluZGV4ZXMgb24gdGhlIGNvbGxlY3Rpb25cbiAqIFdhcm5pbmc6IFwicmVJbmRleFwiIGlzIGEgYmxvY2tpbmcgb3BlcmF0aW9uIChpbmRleGVzIGFyZSByZWJ1aWx0IGluIHRoZSBmb3JlZ3JvdW5kKSBhbmQgd2lsbCBiZSBzbG93IGZvciBsYXJnZSBjb2xsZWN0aW9ucy5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI3JlSW5kZXhcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0byByZWluZGV4XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEB0b2RvIEltcGxlbWVudFxuICoqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUucmVJbmRleCA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBjYWxsYmFjaykge1xuICAgIGxvZ2dlci50aHJvdygnTm90IGltcGxlbWVudGVkIHlldCEnKTtcbn07XG5cbi8qKlxuICogUmV0cmlldmVzIHRoaXMgY29sbGVjdGlvbnMgaW5kZXggaW5mby5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2luZGV4SW5mb3JtYXRpb25cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQWRkaXRpb25hbCBvcHRpb25zIGR1cmluZyB1cGRhdGUuXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2Z1bGw9ZmFsc2VdIC0gUmV0dXJucyB0aGUgZnVsbCByYXcgaW5kZXggaW5mb3JtYXRpb24uXG4gKiBAcGFyYW0ge1N0cmluZ30gW3JlYWRQcmVmZXJlbmNlXSAtIFRoZSBwcmVmZXJyZWQgcmVhZCBwcmVmZXJlbmNlICgoU2VydmVyLlBSSU1BUlksIFNlcnZlci5QUklNQVJZX1BSRUZFUlJFRCwgU2VydmVyLlNFQ09OREFSWSwgU2VydmVyLlNFQ09OREFSWV9QUkVGRVJSRUQsIFNlcnZlci5ORUFSRVNUKS5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuaW5kZXhJbmZvcm1hdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGxvZ2dlci50aHJvdygnTm90IGltcGxlbWVudGVkIHlldCEnKTtcbn07XG5cbi8qKlxuICogRHJvcCB0aGUgd2hvbGUgZGF0YWJhc2UuXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNkcm9wRGF0YWJhc2VcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFwidHJ1ZVwiIGlmIGRyb3BwZWQgc3VjY2Vzc2Z1bGx5XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmRyb3BEYXRhYmFzZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYgKE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnNbdGhpcy5kYXRhYmFzZU5hbWVdKSB7XG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICdkcm9wRGF0YWJhc2UnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbm46IHRoaXNcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGRlbGV0ZSBNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zW3RoaXMuZGF0YWJhc2VOYW1lXTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX2NvbGxlY3Rpb25zID0gW107XG4gICAgICAgIHRoaXMuX3N0b3JlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IG1zZyA9ICdUaGF0IGRhdGFiYXNlIG5vIGxvbmdlciBleGlzdHMnO1xuICAgICAgICBcbiAgICAgICAgbG9nZ2VyLmVycm9yKG1zZyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2sgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgY2FsbGJhY2sobmV3IEVycm9yKG1zZyksIGZhbHNlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIERlcmVmZXJlbmNlIGEgZGJyZWYsIGFnYWluc3QgYSBkYlxuICpcbiAqIEBwYXJhbSB7REJSZWZ9IGRiUmVmIGRiIHJlZmVyZW5jZSBvYmplY3Qgd2Ugd2lzaCB0byByZXNvbHZlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHRvZG8gSW1wbGVtZW50XG4gKiBcbiAqIEBpZ25vcmVcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZGVyZWZlcmVuY2UgPSBmdW5jdGlvbihkYlJlZiwgY2FsbGJhY2spIHtcbiAgICAvLyBUT0RPXG4gICAgLy8gdmFyIGRiID0gdGhpcztcblxuICAgIC8vIC8vIElmIHdlIGhhdmUgYSBkYiByZWZlcmVuY2UgdGhlbiBsZXQncyBnZXQgdGhlIGRiIGZpcnN0XG4gICAgLy8gaWYgKGRiUmVmLmRiICE9PSBudWxsKSBkYiA9IHRoaXMuZGIoZGJSZWYuZGIpO1xuXG4gICAgLy8gLy8gRmV0Y2ggdGhlIGNvbGxlY3Rpb24gYW5kIGZpbmQgdGhlIHJlZmVyZW5jZVxuICAgIC8vIHZhciBjb2xsZWN0aW9uID0gTW9uZ2xvLmNvbGxlY3Rpb24oZGJSZWYubmFtZXNwYWNlKTtcblxuICAgIC8vIGNvbGxlY3Rpb24uZmluZE9uZSh7J19pZCc6ZGJSZWYub2lkfSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAvLyAgICAgY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgIC8vIH0pO1xufTtcblxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGUgZGF0YWJhc2UgbmFtZVxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjX3ZhbGlkYXRlRGF0YWJhc2VOYW1lXG4gKiBAcHJpdmF0ZVxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gZGF0YWJhc2VOYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGRhdGFiYXNlIHRvIHZhbGlkYXRlXG4gKiBcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFwidHJ1ZVwiIGlmIHRoZSBuYW1lIGlzIHZhbGlkXG4gKi9cbnZhciBfdmFsaWRhdGVEYXRhYmFzZU5hbWUgPSBmdW5jdGlvbihkYXRhYmFzZU5hbWUpIHtcbiAgICBpZiAoIV8uaXNTdHJpbmcoZGF0YWJhc2VOYW1lKSkgbG9nZ2VyLnRocm93KFwiZGF0YWJhc2UgbmFtZSBtdXN0IGJlIGEgc3RyaW5nXCIpO1xuXG4gICAgaWYgKGRhdGFiYXNlTmFtZS5sZW5ndGggPT09IDApIGxvZ2dlci50aHJvdyhcImRhdGFiYXNlIG5hbWUgY2Fubm90IGJlIHRoZSBlbXB0eSBzdHJpbmdcIik7XG5cbiAgICB2YXIgaW52YWxpZENoYXJzID0gW1wiIFwiLCBcIi5cIiwgXCIkXCIsIFwiL1wiLCBcIlxcXFxcIl07XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGludmFsaWRDaGFycy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZihkYXRhYmFzZU5hbWUuaW5kZXhPZihpbnZhbGlkQ2hhcnNbaV0pICE9IC0xKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coYGRhdGFiYXNlIG5hbWVzIGNhbm5vdCBjb250YWluIHRoZSBjaGFyYWN0ZXIgXCIke2ludmFsaWRDaGFyc1tpXX1cImApO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0cnVlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb25nb1BvcnRhYmxlO1xuXG4vKipcbiAqIFJlbmFtZXMgYW4gb2JqZWN0IHByb3BlcnR5LlxuICogXG4gKiBAbWV0aG9kIE9iamVjdCNyZW5hbWVQcm9wZXJ0eVxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gb2xkTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB0byByZW5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBuZXdOYW1lIC0gVGhlIG5ldyBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxuICogXG4gKiBAcmV0dXJucyB7dGhpc30gVGhlIGNhbGxlZCBvYmplY3RcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFxuICAgIE9iamVjdC5wcm90b3R5cGUsIFxuICAgICdyZW5hbWVQcm9wZXJ0eScsXG4gICAge1xuICAgICAgICB3cml0YWJsZSA6IGZhbHNlLCAvLyBDYW5ub3QgYWx0ZXIgdGhpcyBwcm9wZXJ0eVxuICAgICAgICBlbnVtZXJhYmxlIDogZmFsc2UsIC8vIFdpbGwgbm90IHNob3cgdXAgaW4gYSBmb3ItaW4gbG9vcC5cbiAgICAgICAgY29uZmlndXJhYmxlIDogZmFsc2UsIC8vIENhbm5vdCBiZSBkZWxldGVkIHZpYSB0aGUgZGVsZXRlIG9wZXJhdG9yXG4gICAgICAgIHZhbHVlIDogZnVuY3Rpb24gKG9sZE5hbWUsIG5ld05hbWUpIHtcbiAgICAgICAgICAgIC8vIERvIG5vdGhpbmcgaWYgc29tZSBuYW1lIGlzIG1pc3Npbmcgb3IgaXMgbm90IGFuIHN0cmluZ1xuICAgICAgICAgICAgaWYgKCFfLmlzU3RyaW5nKG9sZE5hbWUpIHx8ICFfLmlzU3RyaW5nKG5ld05hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERvIG5vdGhpbmcgaWYgdGhlIG5hbWVzIGFyZSB0aGUgc2FtZVxuICAgICAgICAgICAgaWYgKG9sZE5hbWUgPT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgdGhlIG9sZCBwcm9wZXJ0eSBuYW1lIHRvIFxuICAgICAgICAgICAgLy8gYXZvaWQgYSBSZWZlcmVuY2VFcnJvciBpbiBzdHJpY3QgbW9kZS5cbiAgICAgICAgICAgIGlmICh0aGlzLmhhc093blByb3BlcnR5KG9sZE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tuZXdOYW1lXSA9IHRoaXNbb2xkTmFtZV07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXNbb2xkTmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuKTsiXX0=
