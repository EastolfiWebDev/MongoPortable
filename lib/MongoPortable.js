'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @file MongoPortable.js - based on Monglo ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */
var _ = require('lodash'),
    EventEmitter = require("./utils/EventEmitter"),
    ObjectId = require('./ObjectId'),
    Collection = require('./Collection'),
    Logger = require("./utils/Logger");

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
    } else if (_.isPlainObject(store)) {
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
        self.emit('createCollection', {
            connection: self,
            collection: self._collections[collectionName]
        });

        existing = true;
    } else {
        self._collections[collectionName] = new Collection(self, collectionName, self.pkFactory, options);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9Nb25nb1BvcnRhYmxlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFRQSxJQUFJLElBQUksUUFBUSxRQUFSLENBQVI7SUFDSSxlQUFlLFFBQVEsc0JBQVIsQ0FEbkI7SUFFSSxXQUFXLFFBQVEsWUFBUixDQUZmO0lBR0ksYUFBYSxRQUFRLGNBQVIsQ0FIakI7SUFJSSxTQUFTLFFBQVEsZ0JBQVIsQ0FKYjs7QUFNQSxJQUFJLFNBQVMsSUFBYjs7Ozs7Ozs7Ozs7Ozs7SUFhTSxhOzs7QUFDRiwyQkFBWSxZQUFaLEVBQXdDO0FBQUE7O0FBQUEsWUFBZCxPQUFjLHlEQUFKLEVBQUk7O0FBQUE7O0FBQUE7O0FBR3BDLFlBQUksRUFBRSxpQkFBZ0IsYUFBbEIsQ0FBSixFQUFzQyxjQUFPLElBQUksYUFBSixDQUFrQixZQUFsQixDQUFQOztBQUV0QyxZQUFJLFFBQVEsR0FBWixFQUFpQjtBQUNiLHFCQUFTLE9BQU8sV0FBUCxDQUFtQixRQUFRLEdBQTNCLENBQVQ7QUFDSCxTQUZELE1BRU87QUFDSCxxQkFBUyxPQUFPLFFBQWhCO0FBQ0g7OztBQUdELGNBQUssWUFBTCxHQUFvQixFQUFwQjtBQUNBLGNBQUssT0FBTCxHQUFlLEVBQWY7O0FBRUEsWUFBSSxDQUFDLGNBQWMsV0FBbkIsRUFBZ0M7QUFDNUIsMEJBQWMsV0FBZCxHQUE0QixFQUE1QjtBQUNIOzs7QUFHRCw4QkFBc0IsWUFBdEI7Ozs7QUFJQSxZQUFJLGNBQWMsV0FBZCxDQUEwQixZQUExQixDQUFKLEVBQTZDO0FBQ3pDLG1CQUFPLEtBQVAsQ0FBYSx3QkFBYjtBQUNIOztBQUVELGNBQUssWUFBTCxHQUFvQixZQUFwQjs7QUFFQSxzQkFBYyxXQUFkLENBQTBCLFlBQTFCLElBQTBDLElBQUksUUFBSixFQUExQztBQTlCb0M7QUErQnZDOzs7RUFoQ3VCLFk7Ozs7Ozs7Ozs7QUF5QzVCLGNBQWMsV0FBZCxHQUE0QixFQUE1Qjs7Ozs7Ozs7OztBQVVBLGNBQWMs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VyxPQUFYLENBQUQsSUFBd0IsQ0FBQyxFQUFFLFFBQUYsQ0FBVyxPQUFYLENBQTdCLEVBQWtEO0FBQzlDLG1CQUFPLElBQVA7QUFDSDs7O0FBR0QsWUFBSSxXQUFXLE9BQWYsRUFBd0I7QUFDcEIsbUJBQU8sSUFBUDtBQUNIOzs7O0FBSUQsWUFBSSxLQUFLLGNBQUwsQ0FBb0IsT0FBcEIsQ0FBSixFQUFrQztBQUM5QixpQkFBSyxPQUFMLElBQWdCLEtBQUssT0FBTCxDQUFoQjtBQUNBLG1CQUFPLEtBQUssT0FBTCxDQUFQO0FBQ0g7O0FBRUQsZUFBTyxJQUFQO0FBQ0g7QUF2QkwsQ0FISiIsImZpbGUiOiJNb25nb1BvcnRhYmxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBNb25nb1BvcnRhYmxlLmpzIC0gYmFzZWQgb24gTW9uZ2xvICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xudmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKSxcbiAgICBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi91dGlscy9FdmVudEVtaXR0ZXJcIiksXG4gICAgT2JqZWN0SWQgPSByZXF1aXJlKCcuL09iamVjdElkJyksXG4gICAgQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4vQ29sbGVjdGlvbicpLFxuICAgIExvZ2dlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0xvZ2dlclwiKTtcbiAgICBcbnZhciBsb2dnZXIgPSBudWxsO1xuICAgIFxuLyoqXG4gKiBNb25nb1BvcnRhYmxlXG4gKiBcbiAqIEBtb2R1bGUgTW9uZ29Qb3J0YWJsZVxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2luY2UgMC4wLjFcbiAqIFxuICogQGNsYXNzZGVzYyBQb3J0YWJsZSBkYXRhYmFzZSB3aXRoIHBlcnNpc3RlbmNlIGFuZCBNb25nb0RCLWxpa2UgQVBJXG4gKiBcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhYmFzZU5hbWUgLSBOYW1lIG9mIHRoZSBkYXRhYmFzZS5cbiAqL1xuY2xhc3MgTW9uZ29Qb3J0YWJsZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gICAgY29uc3RydWN0b3IoZGF0YWJhc2VOYW1lLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNb25nb1BvcnRhYmxlKSkgcmV0dXJuIG5ldyBNb25nb1BvcnRhYmxlKGRhdGFiYXNlTmFtZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAob3B0aW9ucy5sb2cpIHtcbiAgICAgICAgICAgIGxvZ2dlciA9IExvZ2dlci5nZXRJbnN0YW5jZShvcHRpb25zLmxvZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6aW5nIHZhcmlhYmxlc1xuICAgICAgICB0aGlzLl9jb2xsZWN0aW9ucyA9IHt9O1xuICAgICAgICB0aGlzLl9zdG9yZXMgPSBbXTtcbiAgICBcbiAgICAgICAgaWYgKCFNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zKSB7XG4gICAgICAgICAgICBNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGRkYmIgbmFtZSBmb3JtYXRcbiAgICAgICAgX3ZhbGlkYXRlRGF0YWJhc2VOYW1lKGRhdGFiYXNlTmFtZSk7XG4gICAgXG4gICAgICAgIC8vVGVtcCBwYXRjaCB1bnRpbCBJIGZpZ3VyZSBvdXQgaG93IGZhciBJIHdhbnQgdG8gdGFrZSB0aGUgaW1wbGVtZW50YXRpb247XG4gICAgICAgIC8vIEZJWE1FXG4gICAgICAgIGlmIChNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zW2RhdGFiYXNlTmFtZV0pIHtcbiAgICAgICAgICAgIGxvZ2dlci50aHJvdygnZGIgbmFtZSBhbHJlYWR5IGluIHVzZScpO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIHRoaXMuZGF0YWJhc2VOYW1lID0gZGF0YWJhc2VOYW1lO1xuICAgIFxuICAgICAgICBNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zW2RhdGFiYXNlTmFtZV0gPSBuZXcgT2JqZWN0SWQoKTtcbiAgICB9XG59XG5cbi8qKlxuICogQ29ubmVjdGlvbiBQb29sXG4gKiBcbiAqIEBtZW1iZXJvZiBNb25nb1BvcnRhYmxlXG4gKiBAc3RhdGljXG4gKi9cbk1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnMgPSB7fTtcblxuLy8gTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuX19wcm90b19fID0gRXZlbnRFbWl0dGVyLnByb3RvO1xuXG4vKipcbiAqIFZlcnNpb24gTnVtYmVyXG4gKiBcbiAqIEBtZW1iZXJvZiBNb25nb1BvcnRhYmxlXG4gKiBAc3RhdGljXG4gKi9cbk1vbmdvUG9ydGFibGUudmVyc2lvbiA9ICcwLjAuMSc7XG5cbi8qKlxuICogTWlkZGxld2FyZSBmdW5jdGlvbnNcbiAqIFxuICogQHBhcmFtICB7U3RyaW5nfSBuYW1lIC0gTmFtZSBvZiB0aGUgbWlkZGxld2FyZTpcbiAqICAgICAgPHVsPlxuICogICAgICAgICAgPGxpPlwic3RvcmVcIjogQWRkIGEgY3VzdG9tIHN0b3JlPC9saT5cbiAqICAgICAgPC91bD5cbiAqIEBwYXJhbSAge09iamVjdHxGdW5jdGlvbn0gZm4gLSBGdW5jdGlvbiB0byBpbXBsZW1lbnQgdGhlIG1pZGRsZXdhcmVcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24obmFtZSwgb2JqKSB7XG4gICAgc3dpdGNoKG5hbWUpIHtcbiAgICAgICAgY2FzZSAnc3RvcmUnOlxuICAgICAgICAgICAgdGhpcy5fc3RvcmVzLnB1c2gob2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn07XG5cbi8qKlxuICogQWRkcyBhIGN1c3RvbSBzdG9yZXMgZm9yIHJlbW90ZSBhbmQgbG9jYWwgcGVyc2lzdGVuY2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdHxGdW5jdGlvbn0gc3RvcmUgLSBUaGUgY3VzdG9tIHN0b3JlXG4gKiBcbiAqIEByZXR1cm5zIHtNb25nb1BvcnRhYmxlfSB0aGlzIC0gVGhlIGN1cnJlbnQgSW5zdGFuY2VcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuYWRkU3RvcmUgPSBmdW5jdGlvbiAoc3RvcmUpIHtcbiAgICBpZiAoXy5pc05pbChzdG9yZSkpIGxvZ2dlci50aHJvdyhcInN0b3JlIG11c3QgYmUgaW5jbHVkZWRcIik7XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbihzdG9yZSkpIHtcbiAgICAgICAgdGhpcy5fc3RvcmVzLnB1c2gobmV3IHN0b3JlKCkpO1xuICAgIH0gZWxzZSBpZiAoXy5pc1BsYWluT2JqZWN0KHN0b3JlKSkge1xuICAgICAgICB0aGlzLl9zdG9yZXMucHVzaChzdG9yZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KFwic3RvcmUgbXVzdCBiZSBhIGZ1bmN0aW9uIG9yIG9iamVjdFwiKTtcbiAgICB9XG4gICAgXG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIGN1cnNvciB0byBhbGwgdGhlIGNvbGxlY3Rpb24gaW5mb3JtYXRpb24uXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfSBbY29sbGVjdGlvbk5hbWU9bnVsbF0gLSB0aGUgY29sbGVjdGlvbiBuYW1lIHdlIHdpc2ggdG8gcmV0cmlldmUgdGhlIGluZm9ybWF0aW9uIGZyb20uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbnNJbmZvID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGNhbGxiYWNrKSB7XG4gICAgbG9nZ2VyLnRocm93KFwiTm90IGltcGxlbWVudGVkIHlldFwiKTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25zfVxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjZmV0Y2hDb2xsZWN0aW9uc1xuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5mZXRjaENvbGxlY3Rpb25zID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9ucyhvcHRpb25zLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgbGlzdCBvZiBhbGwgY29sbGVjdGlvbiBmb3IgdGhlIHNwZWNpZmllZCBkYlxuICpcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9uc1xuICogXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMubmFtZXNPbmx5PWZhbHNlXSAtIFJldHVybiBvbmx5IHRoZSBjb2xsZWN0aW9ucyBuYW1lc1xuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IFtvcHRpb25zLmNvbGxlY3Rpb25OYW1lPW51bGxdIC0gVGhlIGNvbGxlY3Rpb24gbmFtZSB3ZSB3aXNoIHRvIGZpbHRlciBieVxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKlxuICogQHJldHVybiB7QXJyYXl9IFxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoY2FsbGJhY2spICYmIF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIFxuICAgIHZhciBjb2xsZWN0aW9uTGlzdCA9IFtdO1xuICAgIGZvciAodmFyIG5hbWUgaW4gc2VsZi5fY29sbGVjdGlvbnMpIHtcbiAgICAgICAgLy8gT25seSBhZGQgdGhlIHJlcXVlc3RlZCBjb2xsZWN0aW9ucyAvL1RPRE8gQWRkIGFycmF5IHR5cGVcbiAgICAgICAgaWYgKG9wdGlvbnMuY29sbGVjdGlvbk5hbWUpIHtcbiAgICAgICAgICAgIGlmIChuYW1lLnRvTG93ZXJDYXNlKCkgPT09IG9wdGlvbnMuY29sbGVjdGlvbk5hbWUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm5hbWVzT25seSkge1xuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uTGlzdC5wdXNoKG5hbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25MaXN0LnB1c2goc2VsZi5fY29sbGVjdGlvbnNbbmFtZV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLm5hbWVzT25seSkge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25MaXN0LnB1c2gobmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25MaXN0LnB1c2goc2VsZi5fY29sbGVjdGlvbnNbbmFtZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhjb2xsZWN0aW9uTGlzdCk7XG4gICAgXG4gICAgcmV0dXJuIGNvbGxlY3Rpb25MaXN0O1xufTtcblxuIC8qKlxuICogR2V0IHRoZSBsaXN0IG9mIGFsbCBjb2xsZWN0aW9uIG5hbWVzIGZvciB0aGUgc3BlY2lmaWVkIGRiLCBcbiAqICBieSBjYWxsaW5nIE1vbmdvUG9ydGFibGUjY29sbGVjdGlvbnMgd2l0aCBbb3B0aW9ucy5uYW1lc09ubHkgPSB0cnVlXVxuICpcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9uTmFtZXNcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9ucy5cbiAqIFxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IFtvcHRpb25zLmNvbGxlY3Rpb25OYW1lPW51bGxdIC0gVGhlIGNvbGxlY3Rpb24gbmFtZSB3ZSB3aXNoIHRvIGZpbHRlciBieS5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICpcbiAqIEByZXR1cm4ge0FycmF5fVxuICogXG4gKiB7QGxpbmsgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9uc31cbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbk5hbWVzID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChjYWxsYmFjaykgJiYgXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICBcbiAgICBpZiAoIW9wdGlvbnMubmFtZXNPbmx5KSBvcHRpb25zLm5hbWVzT25seSA9IHRydWU7XG4gICAgXG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbnMob3B0aW9ucywgY2FsbGJhY2spO1xufTtcblxuXG4vKipcbiAqIENyZWF0ZXMgYSBjb2xsZWN0aW9uIG9uIGEgc2VydmVyIHByZS1hbGxvY2F0aW5nIHNwYWNlLCBuZWVkIHRvIGNyZWF0ZSBmLmV4IGNhcHBlZCBjb2xsZWN0aW9ucy5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gdGhlIGNvbGxlY3Rpb24gbmFtZSB3ZSB3aXNoIHRvIGFjY2Vzcy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSByZXR1cm5zIG9wdGlvbiByZXN1bHRzLlxuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW58T2JqZWN0fSBbb3B0aW9ucy5zYWZlPWZhbHNlXSBFeGVjdXRlcyB3aXRoIGEgZ2V0TGFzdEVycm9yIGNvbW1hbmQgcmV0dXJuaW5nIHRoZSByZXN1bHRzIG9mIHRoZSBjb21tYW5kIG9uIE1vbmdvTW9uZ2xvOlxuICogICAgICA8dWw+XG4gKiAgICAgICAgICA8bGk+dHJ1ZTwvbGk+XG4gKiAgICAgICAgICA8bGk+ZmFsc2U8L2xpPlxuICogICAgICAgICAgPGxpPnsgdzoge051bWJlcn0sIHd0aW1lb3V0OiB7TnVtYmVyfX08L2xpPlxuICogICAgICAgICAgPGxpPnsgZnN5bmM6IHRydWUgfTwvbGk+XG4gKiAgICAgIDwvdWw+XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnNlcmlhbGl6ZUZ1bmN0aW9ucz1mYWxzZV0gLSBTZXJpYWxpemUgZnVuY3Rpb25zIG9uIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMucmF3PWZhbHNlXSAtIFBlcmZvcm0gYWxsIG9wZXJhdGlvbnMgdXNpbmcgcmF3IGJzb24gb2JqZWN0cy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgT2JqZWN0SWQgcHJpbWFyeSBrZXkgZ2VuZXJhdGlvbi5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuY2FwcGVkPWZhbHNlXSAtIENyZWF0ZSBhIGNhcHBlZCBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnNpemU9NDA5Nl0gLSBUaGUgc2l6ZSBvZiB0aGUgY2FwcGVkIGNvbGxlY3Rpb24gaW4gYnl0ZXMuXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWF4PTUwMF0gLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgZG9jdW1lbnRzIGluIHRoZSBjYXBwZWQgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuYXV0b0luZGV4SWQ9ZmFsc2VdIC0gQ3JlYXRlIGFuIGluZGV4IG9uIHRoZSBfaWQgZmllbGQgb2YgdGhlIGRvY3VtZW50LCBub3QgY3JlYXRlZCBhdXRvbWF0aWNhbGx5IG9uIGNhcHBlZCBjb2xsZWN0aW9ucy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5yZWFkUHJlZmVyZW5jZT1SZWFkUHJlZmVyZW5jZS5QUklNQVJZXSAtIFRlIHByZWZlcmVkIHJlYWQgcHJlZmVyZW5jZTpcbiAqICAgICAgPHVsPlxuICogICAgICAgICAgPGxpPlJlYWRQcmVmZXJlbmNlLlBSSU1BUlk8L2xpPlxuICogICAgICAgICAgPGxpPlJlYWRQcmVmZXJlbmNlLlBSSU1BUllfUFJFRkVSUkVEPC9saT5cbiAqICAgICAgICAgIDxsaT5SZWFkUHJlZmVyZW5jZS5TRUNPTkRBUlk8L2xpPlxuICogICAgICAgICAgPGxpPlJlYWRQcmVmZXJlbmNlLlNFQ09OREFSWV9QUkVGRVJSRUQ8L2xpPlxuICogICAgICAgICAgPGxpPlJlYWRQcmVmZXJlbmNlLk5FQVJFU1Q8L2xpPlxuICogICAgICA8L3VsPlxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEBmaXJlcyB7QGxpbmsgTW9uZ29TdG9yZSNjcmVhdGVDb2xsZWN0aW9ufVxuICogXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZXhpc3RpbmcgPSBmYWxzZTtcbiAgICAvLyB2YXIgY29sbGVjdGlvbjtcbiAgICAvLyB2YXIgY29sbGVjdGlvbkZ1bGxOYW1lID0gIHNlbGYuZGF0YWJhc2VOYW1lICsgXCIuXCIgKyBjb2xsZWN0aW9uTmFtZTtcblxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpe1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ29sbGVjdGlvbiBhbHJlYWR5IGluIG1lbW9yeSwgbGV0cyBjcmVhdGUgaXRcbiAgICBpZiAoc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdKSB7XG4gICAgICAgIHNlbGYuZW1pdChcbiAgICAgICAgICAgICdjcmVhdGVDb2xsZWN0aW9uJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uOiBzZWxmLFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIGV4aXN0aW5nID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0gPSBuZXcgQ29sbGVjdGlvbihzZWxmLCBjb2xsZWN0aW9uTmFtZSwgc2VsZi5wa0ZhY3RvcnksIG9wdGlvbnMpO1xuICAgICAgICBzZWxmLmVtaXQoXG4gICAgICAgICAgICAnY3JlYXRlQ29sbGVjdGlvbicsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbjogc2VsZixcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFleGlzdGluZykge1xuICAgICAgICAvLyBMZXR0aW5nIGFjY2VzcyB0aGUgY29sbGVjdGlvbiBieSA8TW9uZ29Qb3J0YWJsZSBpbnN0YW5jZT4uPENPTF9OQU1FPlxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUsIGNvbGxlY3Rpb25OYW1lLCB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICB2YWx1ZTogc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvLyByZXR1cm4gc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdO1xuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdKTtcblxuICAgIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV07XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciB7QGxpbmsgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9ufVxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjY3JlYXRlQ29sbGVjdGlvblxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jcmVhdGVDb2xsZWN0aW9uID0gTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbjtcblxuLyoqXG4gKiBEcm9wIGEgY29sbGVjdGlvbiBmcm9tIHRoZSBkYXRhYmFzZSwgcmVtb3ZpbmcgaXQgcGVybWFuZW50bHkuIE5ldyBhY2Nlc3NlcyB3aWxsIGNyZWF0ZSBhIG5ldyBjb2xsZWN0aW9uLlxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjZHJvcENvbGxlY3Rpb25cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB3ZSB3aXNoIHRvIGRyb3AuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtCb29sZWFufSBcInRydWVcIiBpZiBkcm9wcGVkIHN1Y2Nlc3NmdWxseVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5kcm9wQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmIChzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0pIHtcbiAgICAgICAgLy8gRHJvcCB0aGUgY29sbGVjdGlvblxuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAnZHJvcENvbGxlY3Rpb24nLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbm46IHRoaXMsXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBkZWxldGUgc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbXNnID0gXCJObyBjb2xsZWN0aW9uIGZvdW5kXCI7XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIuZXJyb3IobXNnKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhuZXcgRXJyb3IobXNnKSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW5hbWUgYSBjb2xsZWN0aW9uLlxuICpcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNyZW5hbWVDb2xsZWN0aW9uXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfSBmcm9tQ29sbGVjdGlvbiAtIFRoZSBuYW1lIG9mIHRoZSBjdXJyZW50IGNvbGxlY3Rpb24gd2Ugd2lzaCB0byByZW5hbWUuXG4gKiBAcGFyYW0ge1N0cmluZ30gdG9Db2xsZWN0aW9uIC0gVGhlIG5ldyBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7Qm9vbGVhbnxDb2xsZWN0aW9ufSBUaGUgY29sbGVjdGlvbiBpZiByZW5hbWVkIHN1Y2Nlc3NmdWxseSBvciBmYWxzZSBpZiBub3RcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUucmVuYW1lQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGZyb21Db2xsZWN0aW9uLCB0b0NvbGxlY3Rpb24sIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKF8uaXNTdHJpbmcoZnJvbUNvbGxlY3Rpb24pICYmIF8uaXNTdHJpbmcodG9Db2xsZWN0aW9uKSAmJiBmcm9tQ29sbGVjdGlvbiAhPT0gdG9Db2xsZWN0aW9uKSB7XG4gICAgICAgIC8vIEV4ZWN1dGUgdGhlIGNvbW1hbmQsIHJldHVybiB0aGUgbmV3IHJlbmFtZWQgY29sbGVjdGlvbiBpZiBzdWNjZXNzZnVsXG4gICAgICAgIENvbGxlY3Rpb24uY2hlY2tDb2xsZWN0aW9uTmFtZSh0b0NvbGxlY3Rpb24pO1xuICAgICAgICBcbiAgICAgICAgaWYgKHNlbGYuX2NvbGxlY3Rpb25zW2Zyb21Db2xsZWN0aW9uXSkge1xuICAgICAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgICAgICdyZW5hbWVDb2xsZWN0aW9uJyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbm46IHNlbGYsXG4gICAgICAgICAgICAgICAgICAgIGZyb206IGZyb21Db2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICB0bzogdG9Db2xsZWN0aW9uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIHJlbmFtZWQgPSBzZWxmLl9jb2xsZWN0aW9uc1tmcm9tQ29sbGVjdGlvbl0ucmVuYW1lKHRvQ29sbGVjdGlvbik7XG4gICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9ucy5yZW5hbWVQcm9wZXJ0eShmcm9tQ29sbGVjdGlvbiwgdG9Db2xsZWN0aW9uKTtcbiAgICAgICAgICAgIHNlbGYucmVuYW1lUHJvcGVydHkoZnJvbUNvbGxlY3Rpb24sIHRvQ29sbGVjdGlvbik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhudWxsLCByZW5hbWVkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHJlbmFtZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgbXNnID0gXCJObyBjb2xsZWN0aW9uIGZvdW5kXCI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihtc2cpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgY2FsbGJhY2sobmV3IEVycm9yKG1zZyksIG51bGwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgbXNnID0gXCJUaGUgcGFyYW1zIGFyZSBpbnZhbGlkXCI7XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIuZXJyb3IobXNnKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhuZXcgRXJyb3IobXNnKSwgbnVsbCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuXG4vKipcbiAqIENyZWF0ZXMgYW4gaW5kZXggb24gdGhlIGNvbGxlY3Rpb24uXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNjcmVhdGVJbmRleFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIE5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdG8gY3JlYXRlIHRoZSBpbmRleCBvbi5cbiAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZE9yU3BlYyAtIEZpZWxkT3JTcGVjIHRoYXQgZGVmaW5lcyB0aGUgaW5kZXguXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zIGR1cmluZyB1cGRhdGUuXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbnxPYmplY3R9IFtvcHRpb25zLnNhZmU9ZmFsc2VdIEV4ZWN1dGVzIHdpdGggYSBnZXRMYXN0RXJyb3IgY29tbWFuZCByZXR1cm5pbmcgdGhlIHJlc3VsdHMgb2YgdGhlIGNvbW1hbmQgb24gTW9uZ29Nb25nbG86XG4gKiAgICAgIDx1bD5cbiAqICAgICAgICAgIDxsaT50cnVlPC9saT5cbiAqICAgICAgICAgIDxsaT5mYWxzZTwvbGk+XG4gKiAgICAgICAgICA8bGk+eyB3OiB7TnVtYmVyfSwgd3RpbWVvdXQ6IHtOdW1iZXJ9fTwvbGk+XG4gKiAgICAgICAgICA8bGk+eyBmc3luYzogdHJ1ZSB9PC9saT5cbiAqICAgICAgPC91bD4gXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnVuaXF1ZT1mYWxzZV0gLSBDcmVhdGVzIGFuIHVuaXF1ZSBpbmRleFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5zcGFyc2U9ZmFsc2VdIC0gQ3JlYXRlcyBhIHNwYXJzZSBpbmRleFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5iYWNrZ3JvdW5kPWZhbHNlXSAtIENyZWF0ZXMgdGhlIGluZGV4IGluIHRoZSBiYWNrZ3JvdW5kLCB5aWVsZGluZyB3aGVuZXZlciBwb3NzaWJsZVxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5kcm9wRHVwcz1mYWxzZV0gLSBBIHVuaXF1ZSBpbmRleCBjYW5ub3QgYmUgY3JlYXRlZCBvbiBhIGtleSB0aGF0IGhhcyBwcmUtZXhpc3RpbmcgZHVwbGljYXRlIHZhbHVlcy4gSWYgeW91IHdvdWxkIGxpa2UgdG8gY3JlYXRlIHRoZSBpbmRleCBhbnl3YXksIGtlZXBpbmcgdGhlIGZpcnN0IGRvY3VtZW50IHRoZSBkYXRhYmFzZSBpbmRleGVzIGFuZCBkZWxldGluZyBhbGwgc3Vic2VxdWVudCBkb2N1bWVudHMgdGhhdCBoYXZlIGR1cGxpY2F0ZSB2YWx1ZVxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm1pbj1udWxsXSAtIEZvciBnZW9zcGF0aWFsIGluZGV4ZXMgc2V0IHRoZSBsb3dlciBib3VuZCBmb3IgdGhlIGNvLW9yZGluYXRlc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm1heD1udWxsXSAtIEZvciBnZW9zcGF0aWFsIGluZGV4ZXMgc2V0IHRoZSBoaWdoIGJvdW5kIGZvciB0aGUgY28tb3JkaW5hdGVzXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudj1udWxsXSAtIFNwZWNpZnkgdGhlIGZvcm1hdCB2ZXJzaW9uIG9mIHRoZSBpbmRleGVzXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuZXhwaXJlQWZ0ZXJTZWNvbmRzPW51bGxdIC0gQWxsb3dzIHlvdSB0byBleHBpcmUgZGF0YSBvbiBpbmRleGVzIGFwcGxpZWQgdG8gYSBkYXRhIChNb25nb0RCIDIuMiBvciBoaWdoZXIpXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMubmFtZT1udWxsXSAtIE92ZXJyaWRlIHRoZSBhdXRvZ2VuZXJhdGVkIGluZGV4IG5hbWUgKHVzZWZ1bCBpZiB0aGUgcmVzdWx0aW5nIG5hbWUgaXMgbGFyZ2VyIHRoYW4gMTI4IGJ5dGVzKVxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jcmVhdGVJbmRleCA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBmaWVsZE9yU3BlYywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBsb2dnZXIudGhyb3coJ05vdCBpbXBsZW1lbnRlZCB5ZXQhJyk7XG59O1xuXG4vKipcbiAqIEVuc3VyZXMgdGhhdCBhbiBpbmRleCBleGlzdHMsIGlmIGl0IGRvZXMgbm90IGl0IGNyZWF0ZXMgaXRcbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2Vuc3VyZUluZGV4XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gTmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0byBjcmVhdGUgdGhlIGluZGV4IG9uLlxuICogQHBhcmFtIHtPYmplY3R9IGZpZWxkT3JTcGVjIC0gRmllbGRPclNwZWMgdGhhdCBkZWZpbmVzIHRoZSBpbmRleC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnMgZHVyaW5nIHVwZGF0ZS5cbiAqIFxuICogQHBhcmFtIHtCb29sZWFufE9iamVjdH0gW29wdGlvbnMuc2FmZT1mYWxzZV0gLSBFeGVjdXRlcyB3aXRoIGEgZ2V0TGFzdEVycm9yIGNvbW1hbmQgcmV0dXJuaW5nIHRoZSByZXN1bHRzIG9mIHRoZSBjb21tYW5kIG9uIE1vbmdvTW9uZ2xvOlxuICogICAgICA8dWw+XG4gKiAgICAgICAgICA8bGk+dHJ1ZTwvbGk+XG4gKiAgICAgICAgICA8bGk+ZmFsc2U8L2xpPlxuICogICAgICAgICAgPGxpPnsgdzoge051bWJlcn0sIHd0aW1lb3V0OiB7TnVtYmVyfX08L2xpPlxuICogICAgICAgICAgPGxpPnsgZnN5bmM6IHRydWUgfTwvbGk+XG4gKiAgICAgIDwvdWw+XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnVuaXF1ZT1mYWxzZV0gLSBDcmVhdGVzIGFuIHVuaXF1ZSBpbmRleFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5zcGFyc2U9ZmFsc2VdIC0gQ3JlYXRlcyBhIHNwYXJzZSBpbmRleFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5iYWNrZ3JvdW5kPWZhbHNlXSAtIENyZWF0ZXMgdGhlIGluZGV4IGluIHRoZSBiYWNrZ3JvdW5kLCB5aWVsZGluZyB3aGVuZXZlciBwb3NzaWJsZVxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5kcm9wRHVwcz1mYWxzZV0gLSBBIHVuaXF1ZSBpbmRleCBjYW5ub3QgYmUgY3JlYXRlZCBvbiBhIGtleSB0aGF0IGhhcyBwcmUtZXhpc3RpbmcgZHVwbGljYXRlIHZhbHVlcy4gSWYgeW91IHdvdWxkIGxpa2UgdG8gY3JlYXRlIHRoZSBpbmRleCBhbnl3YXksIGtlZXBpbmcgdGhlIGZpcnN0IGRvY3VtZW50IHRoZSBkYXRhYmFzZSBpbmRleGVzIGFuZCBkZWxldGluZyBhbGwgc3Vic2VxdWVudCBkb2N1bWVudHMgdGhhdCBoYXZlIGR1cGxpY2F0ZSB2YWx1ZVxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm1pbl0gLSBGb3IgZ2Vvc3BhdGlhbCBpbmRleGVzIHNldCB0aGUgbG93ZXIgYm91bmQgZm9yIHRoZSBjby1vcmRpbmF0ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5tYXhdIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGhpZ2ggYm91bmQgZm9yIHRoZSBjby1vcmRpbmF0ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy52XSAtIFNwZWNpZnkgdGhlIGZvcm1hdCB2ZXJzaW9uIG9mIHRoZSBpbmRleGVzXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuZXhwaXJlQWZ0ZXJTZWNvbmRzXSAtIEFsbG93cyB5b3UgdG8gZXhwaXJlIGRhdGEgb24gaW5kZXhlcyBhcHBsaWVkIHRvIGEgZGF0YSAoTW9uZ29EQiAyLjIgb3IgaGlnaGVyKVxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLm5hbWVdIC0gT3ZlcnJpZGUgdGhlIGF1dG9nZW5lcmF0ZWQgaW5kZXggbmFtZSAodXNlZnVsIGlmIHRoZSByZXN1bHRpbmcgbmFtZSBpcyBsYXJnZXIgdGhhbiAxMjggYnl0ZXMpXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmVuc3VyZUluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGZpZWxkT3JTcGVjLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGxvZ2dlci50aHJvdygnTm90IGltcGxlbWVudGVkIHlldCEnKTtcbn07XG5cbi8qKlxuICogRHJvcCBhbiBpbmRleCBvbiBhIGNvbGxlY3Rpb24uXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNkcm9wSW5kZXhcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB3aGVyZSB0aGUgY29tbWFuZCB3aWxsIGRyb3AgYW4gaW5kZXguXG4gKiBAcGFyYW0ge1N0cmluZ30gaW5kZXhOYW1lIC0gTmFtZSBvZiB0aGUgaW5kZXggdG8gZHJvcC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmRyb3BJbmRleCA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBpbmRleE5hbWUsIGNhbGxiYWNrKSB7XG4gICAgbG9nZ2VyLnRocm93KCdOb3QgaW1wbGVtZW50ZWQgeWV0IScpO1xufTtcblxuLyoqXG4gKiBSZWluZGV4IGFsbCBpbmRleGVzIG9uIHRoZSBjb2xsZWN0aW9uXG4gKiBXYXJuaW5nOiBcInJlSW5kZXhcIiBpcyBhIGJsb2NraW5nIG9wZXJhdGlvbiAoaW5kZXhlcyBhcmUgcmVidWlsdCBpbiB0aGUgZm9yZWdyb3VuZCkgYW5kIHdpbGwgYmUgc2xvdyBmb3IgbGFyZ2UgY29sbGVjdGlvbnMuXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNyZUluZGV4XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdG8gcmVpbmRleFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLnJlSW5kZXggPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgY2FsbGJhY2spIHtcbiAgICBsb2dnZXIudGhyb3coJ05vdCBpbXBsZW1lbnRlZCB5ZXQhJyk7XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGlzIGNvbGxlY3Rpb25zIGluZGV4IGluZm8uXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNpbmRleEluZm9ybWF0aW9uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEFkZGl0aW9uYWwgb3B0aW9ucyBkdXJpbmcgdXBkYXRlLlxuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtmdWxsPWZhbHNlXSAtIFJldHVybnMgdGhlIGZ1bGwgcmF3IGluZGV4IGluZm9ybWF0aW9uLlxuICogQHBhcmFtIHtTdHJpbmd9IFtyZWFkUHJlZmVyZW5jZV0gLSBUaGUgcHJlZmVycmVkIHJlYWQgcHJlZmVyZW5jZSAoKFNlcnZlci5QUklNQVJZLCBTZXJ2ZXIuUFJJTUFSWV9QUkVGRVJSRUQsIFNlcnZlci5TRUNPTkRBUlksIFNlcnZlci5TRUNPTkRBUllfUFJFRkVSUkVELCBTZXJ2ZXIuTkVBUkVTVCkuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmluZGV4SW5mb3JtYXRpb24gPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBsb2dnZXIudGhyb3coJ05vdCBpbXBsZW1lbnRlZCB5ZXQhJyk7XG59O1xuXG4vKipcbiAqIERyb3AgdGhlIHdob2xlIGRhdGFiYXNlLlxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjZHJvcERhdGFiYXNlXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJuIHtCb29sZWFufSBcInRydWVcIiBpZiBkcm9wcGVkIHN1Y2Nlc3NmdWxseVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5kcm9wRGF0YWJhc2UgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmIChNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zW3RoaXMuZGF0YWJhc2VOYW1lXSkge1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAnZHJvcERhdGFiYXNlJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25uOiB0aGlzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBkZWxldGUgTW9uZ29Qb3J0YWJsZS5jb25uZWN0aW9uc1t0aGlzLmRhdGFiYXNlTmFtZV07XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9jb2xsZWN0aW9ucyA9IFtdO1xuICAgICAgICB0aGlzLl9zdG9yZXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhudWxsLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBtc2cgPSAnVGhhdCBkYXRhYmFzZSBubyBsb25nZXIgZXhpc3RzJztcbiAgICAgICAgXG4gICAgICAgIGxvZ2dlci5lcnJvcihtc2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG5ldyBFcnJvcihtc2cpLCBmYWxzZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLyoqXG4gKiBEZXJlZmVyZW5jZSBhIGRicmVmLCBhZ2FpbnN0IGEgZGJcbiAqXG4gKiBAcGFyYW0ge0RCUmVmfSBkYlJlZiBkYiByZWZlcmVuY2Ugb2JqZWN0IHdlIHdpc2ggdG8gcmVzb2x2ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEB0b2RvIEltcGxlbWVudFxuICogXG4gKiBAaWdub3JlXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmRlcmVmZXJlbmNlID0gZnVuY3Rpb24oZGJSZWYsIGNhbGxiYWNrKSB7XG4gICAgLy8gVE9ET1xuICAgIC8vIHZhciBkYiA9IHRoaXM7XG5cbiAgICAvLyAvLyBJZiB3ZSBoYXZlIGEgZGIgcmVmZXJlbmNlIHRoZW4gbGV0J3MgZ2V0IHRoZSBkYiBmaXJzdFxuICAgIC8vIGlmIChkYlJlZi5kYiAhPT0gbnVsbCkgZGIgPSB0aGlzLmRiKGRiUmVmLmRiKTtcblxuICAgIC8vIC8vIEZldGNoIHRoZSBjb2xsZWN0aW9uIGFuZCBmaW5kIHRoZSByZWZlcmVuY2VcbiAgICAvLyB2YXIgY29sbGVjdGlvbiA9IE1vbmdsby5jb2xsZWN0aW9uKGRiUmVmLm5hbWVzcGFjZSk7XG5cbiAgICAvLyBjb2xsZWN0aW9uLmZpbmRPbmUoeydfaWQnOmRiUmVmLm9pZH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gICAgLy8gICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICAvLyB9KTtcbn07XG5cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhlIGRhdGFiYXNlIG5hbWVcbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI192YWxpZGF0ZURhdGFiYXNlTmFtZVxuICogQHByaXZhdGVcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGRhdGFiYXNlTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBkYXRhYmFzZSB0byB2YWxpZGF0ZVxuICogXG4gKiBAcmV0dXJuIHtCb29sZWFufSBcInRydWVcIiBpZiB0aGUgbmFtZSBpcyB2YWxpZFxuICovXG52YXIgX3ZhbGlkYXRlRGF0YWJhc2VOYW1lID0gZnVuY3Rpb24oZGF0YWJhc2VOYW1lKSB7XG4gICAgaWYgKCFfLmlzU3RyaW5nKGRhdGFiYXNlTmFtZSkpIGxvZ2dlci50aHJvdyhcImRhdGFiYXNlIG5hbWUgbXVzdCBiZSBhIHN0cmluZ1wiKTtcblxuICAgIGlmIChkYXRhYmFzZU5hbWUubGVuZ3RoID09PSAwKSBsb2dnZXIudGhyb3coXCJkYXRhYmFzZSBuYW1lIGNhbm5vdCBiZSB0aGUgZW1wdHkgc3RyaW5nXCIpO1xuXG4gICAgdmFyIGludmFsaWRDaGFycyA9IFtcIiBcIiwgXCIuXCIsIFwiJFwiLCBcIi9cIiwgXCJcXFxcXCJdO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBpbnZhbGlkQ2hhcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYoZGF0YWJhc2VOYW1lLmluZGV4T2YoaW52YWxpZENoYXJzW2ldKSAhPSAtMSkge1xuICAgICAgICAgICAgbG9nZ2VyLnRocm93KGBkYXRhYmFzZSBuYW1lcyBjYW5ub3QgY29udGFpbiB0aGUgY2hhcmFjdGVyIFwiJHtpbnZhbGlkQ2hhcnNbaV19XCJgKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW9uZ29Qb3J0YWJsZTtcblxuLyoqXG4gKiBSZW5hbWVzIGFuIG9iamVjdCBwcm9wZXJ0eS5cbiAqIFxuICogQG1ldGhvZCBPYmplY3QjcmVuYW1lUHJvcGVydHlcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IG9sZE5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgcHJvcGVydHkgdG8gcmVuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ30gbmV3TmFtZSAtIFRoZSBuZXcgbmFtZSBvZiB0aGUgcHJvcGVydHlcbiAqIFxuICogQHJldHVybnMge3RoaXN9IFRoZSBjYWxsZWQgb2JqZWN0XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShcbiAgICBPYmplY3QucHJvdG90eXBlLCBcbiAgICAncmVuYW1lUHJvcGVydHknLFxuICAgIHtcbiAgICAgICAgd3JpdGFibGUgOiBmYWxzZSwgLy8gQ2Fubm90IGFsdGVyIHRoaXMgcHJvcGVydHlcbiAgICAgICAgZW51bWVyYWJsZSA6IGZhbHNlLCAvLyBXaWxsIG5vdCBzaG93IHVwIGluIGEgZm9yLWluIGxvb3AuXG4gICAgICAgIGNvbmZpZ3VyYWJsZSA6IGZhbHNlLCAvLyBDYW5ub3QgYmUgZGVsZXRlZCB2aWEgdGhlIGRlbGV0ZSBvcGVyYXRvclxuICAgICAgICB2YWx1ZSA6IGZ1bmN0aW9uIChvbGROYW1lLCBuZXdOYW1lKSB7XG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nIGlmIHNvbWUgbmFtZSBpcyBtaXNzaW5nIG9yIGlzIG5vdCBhbiBzdHJpbmdcbiAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhvbGROYW1lKSB8fCAhXy5pc1N0cmluZyhuZXdOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nIGlmIHRoZSBuYW1lcyBhcmUgdGhlIHNhbWVcbiAgICAgICAgICAgIGlmIChvbGROYW1lID09IG5ld05hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHRoZSBvbGQgcHJvcGVydHkgbmFtZSB0byBcbiAgICAgICAgICAgIC8vIGF2b2lkIGEgUmVmZXJlbmNlRXJyb3IgaW4gc3RyaWN0IG1vZGUuXG4gICAgICAgICAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShvbGROYW1lKSkge1xuICAgICAgICAgICAgICAgIHRoaXNbbmV3TmFtZV0gPSB0aGlzW29sZE5hbWVdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzW29sZE5hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbik7Il19
