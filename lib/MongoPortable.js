'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @file MongoPortable.js - based on Monglo ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 0.0.1
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

        _classCallCheck(this, MongoPortable);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MongoPortable).call(this));
        // Instantiates super constructor


        if (!(_this instanceof MongoPortable)) return _ret = new MongoPortable(databaseName), _possibleConstructorReturn(_this, _ret);

        // Check ddbb name format
        _validateDatabaseName(databaseName);

        // Initializing variables
        _this._collections = {};
        _this._stores = [];

        if (!MongoPortable.connections) {
            MongoPortable.connections = {};
        }

        //Temp patch until I figure out how far I want to take the implementation;
        // FIXME
        if (MongoPortable.connections[databaseName]) {
            throw new Error('db name already in use');
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
    if (_.isNil(store)) throw new Error("store must be included");

    if (_.isFunction(store)) {
        this._stores.push(new store());
    } else if (_.isPlainObject(store)) {
        this._stores.push(store);
    } else {
        throw new Error("store must be a function or object");
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
    throw new Error("Not implemented yet");
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

        Logger.error(msg);

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

            Logger.error(msg);

            if (callback && _.isFunction(callback)) callback(new Error(msg), null);

            return false;
        }
    } else {
        var _msg = "The params are invalid";

        Logger.error(_msg);

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
    throw new Error('Not implemented yet!');
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
    throw new Error('Not implemented yet!');
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
    throw new Error('Not implemented yet!');
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
    throw new Error('Not implemented yet!');
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
    throw new Error('Not implemented yet!');
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

        Logger.error(msg);

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
    if (!_.isString(databaseName)) throw new Error("database name must be a string");

    if (databaseName.length === 0) throw new Error("database name cannot be the empty string");

    var invalidChars = [" ", ".", "$", "/", "\\"];
    for (var i = 0; i < invalidChars.length; i++) {
        if (databaseName.indexOf(invalidChars[i]) != -1) {
            throw new Error("database names cannot contain the character '" + invalidChars[i] + "'");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9Nb25nb1BvcnRhYmxlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFRQSxJQUFJLElBQUksUUFBUSxRQUFSLENBQVI7SUFDSSxlQUFlLFFBQVEsc0JBQVIsQ0FEbkI7SUFFSSxXQUFXLFFBQVEsWUFBUixDQUZmO0lBR0ksYUFBYSxRQUFRLGNBQVIsQ0FIakI7SUFJSSxTQUFTLFFBQVEsZ0JBQVIsQ0FKYjs7Ozs7Ozs7Ozs7Ozs7SUFpQk0sYTs7O0FBQ0YsMkJBQVksWUFBWixFQUEwQjtBQUFBOztBQUFBOztBQUFBOzs7O0FBSXRCLFlBQUksRUFBRSxpQkFBZ0IsYUFBbEIsQ0FBSixFQUFzQyxjQUFPLElBQUksYUFBSixDQUFrQixZQUFsQixDQUFQOzs7QUFHdEMsOEJBQXNCLFlBQXRCOzs7QUFHQSxjQUFLLFlBQUwsR0FBb0IsRUFBcEI7QUFDQSxjQUFLLE9BQUwsR0FBZSxFQUFmOztBQUVBLFlBQUksQ0FBQyxjQUFjLFdBQW5CLEVBQWdDO0FBQzVCLDBCQUFjLFdBQWQsR0FBNEIsRUFBNUI7QUFDSDs7OztBQUlELFlBQUksY0FBYyxXQUFkLENBQTBCLFlBQTFCLENBQUosRUFBNkM7QUFDekMsa0JBQU0sSUFBSSxLQUFKLENBQVUsd0JBQVYsQ0FBTjtBQUNIOztBQUVELGNBQUssWUFBTCxHQUFvQixZQUFwQjs7QUFFQSxzQkFBYyxXQUFkLENBQTBCLFlBQTFCLElBQTBDLElBQUksUUFBSixFQUExQztBQXpCc0I7QUEwQnpCOzs7RUEzQnVCLFk7Ozs7Ozs7Ozs7QUFvQzVCLGNBQWMsV0FBZCxHQUE0QixFQUE1Qjs7Ozs7Ozs7OztBQVVBLGNBQWMsT0FBZCxHQUF3QixPQUF4Qjs7Ozs7Ozs7Ozs7QUFXQSxjQUFjLFNBQWQsQ0FBd0IsR0FBeEIsR0FBOEIsVUFBUyxJQUFULEVBQWUsR0FBZixFQUFvQjtBQUM5QyxZQUFPLElBQVA7QUFDSSxhQUFLLE9BQUw7QUFDSSxpQkFBSyxPQUFMLENBQWEsSUFBYixDQUFr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QUMsRUFBRSxRQUFGLENBQVcsT0FBWCxDQUE3QixFQUFrRDtBQUM5QyxtQkFBTyxJQUFQO0FBQ0g7OztBQUdELFlBQUksV0FBVyxPQUFmLEVBQXdCO0FBQ3BCLG1CQUFPLElBQVA7QUFDSDs7OztBQUlELFlBQUksS0FBSyxjQUFMLENBQW9CLE9BQXBCLENBQUosRUFBa0M7QUFDOUIsaUJBQUssT0FBTCxJQUFnQixLQUFLLE9BQUwsQ0FBaEI7QUFDQSxtQkFBTyxLQUFLLE9BQUwsQ0FBUDtBQUNIOztBQUVELGVBQU8sSUFBUDtBQUNIO0FBdkJMLENBSEoiLCJmaWxlIjoiTW9uZ29Qb3J0YWJsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgTW9uZ29Qb3J0YWJsZS5qcyAtIGJhc2VkIG9uIE1vbmdsbyAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAwLjAuMVxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyksXG4gICAgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4vdXRpbHMvRXZlbnRFbWl0dGVyXCIpLFxuICAgIE9iamVjdElkID0gcmVxdWlyZSgnLi9PYmplY3RJZCcpLFxuICAgIENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL0NvbGxlY3Rpb24nKSxcbiAgICBMb2dnZXIgPSByZXF1aXJlKFwiLi91dGlscy9Mb2dnZXJcIik7XG4gICAgXG4vKipcbiAqIE1vbmdvUG9ydGFibGVcbiAqIFxuICogQG1vZHVsZSBNb25nb1BvcnRhYmxlXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzaW5jZSAwLjAuMVxuICogXG4gKiBAY2xhc3NkZXNjIFBvcnRhYmxlIGRhdGFiYXNlIHdpdGggcGVyc2lzdGVuY2UgYW5kIE1vbmdvREItbGlrZSBBUElcbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGFiYXNlTmFtZSAtIE5hbWUgb2YgdGhlIGRhdGFiYXNlLlxuICovXG5jbGFzcyBNb25nb1BvcnRhYmxlIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhYmFzZU5hbWUpIHtcbiAgICAgICAgLy8gSW5zdGFudGlhdGVzIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTW9uZ29Qb3J0YWJsZSkpIHJldHVybiBuZXcgTW9uZ29Qb3J0YWJsZShkYXRhYmFzZU5hbWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZGRiYiBuYW1lIGZvcm1hdFxuICAgICAgICBfdmFsaWRhdGVEYXRhYmFzZU5hbWUoZGF0YWJhc2VOYW1lKTtcbiAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6aW5nIHZhcmlhYmxlc1xuICAgICAgICB0aGlzLl9jb2xsZWN0aW9ucyA9IHt9O1xuICAgICAgICB0aGlzLl9zdG9yZXMgPSBbXTtcbiAgICBcbiAgICAgICAgaWYgKCFNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zKSB7XG4gICAgICAgICAgICBNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zID0ge307XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy9UZW1wIHBhdGNoIHVudGlsIEkgZmlndXJlIG91dCBob3cgZmFyIEkgd2FudCB0byB0YWtlIHRoZSBpbXBsZW1lbnRhdGlvbjtcbiAgICAgICAgLy8gRklYTUVcbiAgICAgICAgaWYgKE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnNbZGF0YWJhc2VOYW1lXSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdkYiBuYW1lIGFscmVhZHkgaW4gdXNlJyk7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgdGhpcy5kYXRhYmFzZU5hbWUgPSBkYXRhYmFzZU5hbWU7XG4gICAgXG4gICAgICAgIE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnNbZGF0YWJhc2VOYW1lXSA9IG5ldyBPYmplY3RJZCgpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBDb25uZWN0aW9uIFBvb2xcbiAqIFxuICogQG1lbWJlcm9mIE1vbmdvUG9ydGFibGVcbiAqIEBzdGF0aWNcbiAqL1xuTW9uZ29Qb3J0YWJsZS5jb25uZWN0aW9ucyA9IHt9O1xuXG4vLyBNb25nb1BvcnRhYmxlLnByb3RvdHlwZS5fX3Byb3RvX18gPSBFdmVudEVtaXR0ZXIucHJvdG87XG5cbi8qKlxuICogVmVyc2lvbiBOdW1iZXJcbiAqIFxuICogQG1lbWJlcm9mIE1vbmdvUG9ydGFibGVcbiAqIEBzdGF0aWNcbiAqL1xuTW9uZ29Qb3J0YWJsZS52ZXJzaW9uID0gJzAuMC4xJztcblxuLyoqXG4gKiBNaWRkbGV3YXJlIGZ1bmN0aW9uc1xuICogXG4gKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWUgLSBOYW1lIG9mIHRoZSBtaWRkbGV3YXJlOlxuICogICAgICA8dWw+XG4gKiAgICAgICAgICA8bGk+XCJzdG9yZVwiOiBBZGQgYSBjdXN0b20gc3RvcmU8L2xpPlxuICogICAgICA8L3VsPlxuICogQHBhcmFtICB7T2JqZWN0fEZ1bmN0aW9ufSBmbiAtIEZ1bmN0aW9uIHRvIGltcGxlbWVudCB0aGUgbWlkZGxld2FyZVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS51c2UgPSBmdW5jdGlvbihuYW1lLCBvYmopIHtcbiAgICBzd2l0Y2gobmFtZSkge1xuICAgICAgICBjYXNlICdzdG9yZSc6XG4gICAgICAgICAgICB0aGlzLl9zdG9yZXMucHVzaChvYmopO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBZGRzIGEgY3VzdG9tIHN0b3JlcyBmb3IgcmVtb3RlIGFuZCBsb2NhbCBwZXJzaXN0ZW5jZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fEZ1bmN0aW9ufSBzdG9yZSAtIFRoZSBjdXN0b20gc3RvcmVcbiAqIFxuICogQHJldHVybnMge01vbmdvUG9ydGFibGV9IHRoaXMgLSBUaGUgY3VycmVudCBJbnN0YW5jZVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5hZGRTdG9yZSA9IGZ1bmN0aW9uIChzdG9yZSkge1xuICAgIGlmIChfLmlzTmlsKHN0b3JlKSkgdGhyb3cgbmV3IEVycm9yKFwic3RvcmUgbXVzdCBiZSBpbmNsdWRlZFwiKTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHN0b3JlKSkge1xuICAgICAgICB0aGlzLl9zdG9yZXMucHVzaChuZXcgc3RvcmUoKSk7XG4gICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3Qoc3RvcmUpKSB7XG4gICAgICAgIHRoaXMuX3N0b3Jlcy5wdXNoKHN0b3JlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJzdG9yZSBtdXN0IGJlIGEgZnVuY3Rpb24gb3Igb2JqZWN0XCIpO1xuICAgIH1cbiAgICBcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgY3Vyc29yIHRvIGFsbCB0aGUgY29sbGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IFtjb2xsZWN0aW9uTmFtZT1udWxsXSAtIHRoZSBjb2xsZWN0aW9uIG5hbWUgd2Ugd2lzaCB0byByZXRyaWV2ZSB0aGUgaW5mb3JtYXRpb24gZnJvbS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge0FycmF5fVxuICpcbiAqIEB0b2RvIEltcGxlbWVudFxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9uc0luZm8gPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgY2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQgeWV0XCIpO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3Ige0BsaW5rIE1vbmdvUG9ydGFibGUjY29sbGVjdGlvbnN9XG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNmZXRjaENvbGxlY3Rpb25zXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmZldGNoQ29sbGVjdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb25zKG9wdGlvbnMsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSBsaXN0IG9mIGFsbCBjb2xsZWN0aW9uIGZvciB0aGUgc3BlY2lmaWVkIGRiXG4gKlxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25zXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5uYW1lc09ubHk9ZmFsc2VdIC0gUmV0dXJuIG9ubHkgdGhlIGNvbGxlY3Rpb25zIG5hbWVzXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gW29wdGlvbnMuY29sbGVjdGlvbk5hbWU9bnVsbF0gLSBUaGUgY29sbGVjdGlvbiBuYW1lIHdlIHdpc2ggdG8gZmlsdGVyIGJ5XG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmNvbGxlY3Rpb25zID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChjYWxsYmFjaykgJiYgXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICBcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXG4gICAgdmFyIGNvbGxlY3Rpb25MaXN0ID0gW107XG4gICAgZm9yICh2YXIgbmFtZSBpbiBzZWxmLl9jb2xsZWN0aW9ucykge1xuICAgICAgICAvLyBPbmx5IGFkZCB0aGUgcmVxdWVzdGVkIGNvbGxlY3Rpb25zIC8vVE9ETyBBZGQgYXJyYXkgdHlwZVxuICAgICAgICBpZiAob3B0aW9ucy5jb2xsZWN0aW9uTmFtZSkge1xuICAgICAgICAgICAgaWYgKG5hbWUudG9Mb3dlckNhc2UoKSA9PT0gb3B0aW9ucy5jb2xsZWN0aW9uTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMubmFtZXNPbmx5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25MaXN0LnB1c2gobmFtZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbkxpc3QucHVzaChzZWxmLl9jb2xsZWN0aW9uc1tuYW1lXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubmFtZXNPbmx5KSB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbkxpc3QucHVzaChuYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbkxpc3QucHVzaChzZWxmLl9jb2xsZWN0aW9uc1tuYW1lXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGNvbGxlY3Rpb25MaXN0KTtcbiAgICBcbiAgICByZXR1cm4gY29sbGVjdGlvbkxpc3Q7XG59O1xuXG4gLyoqXG4gKiBHZXQgdGhlIGxpc3Qgb2YgYWxsIGNvbGxlY3Rpb24gbmFtZXMgZm9yIHRoZSBzcGVjaWZpZWQgZGIsIFxuICogIGJ5IGNhbGxpbmcgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9ucyB3aXRoIFtvcHRpb25zLm5hbWVzT25seSA9IHRydWVdXG4gKlxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25OYW1lc1xuICogXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zLlxuICogXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gW29wdGlvbnMuY29sbGVjdGlvbk5hbWU9bnVsbF0gLSBUaGUgY29sbGVjdGlvbiBuYW1lIHdlIHdpc2ggdG8gZmlsdGVyIGJ5LlxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKlxuICogQHJldHVybiB7QXJyYXl9XG4gKiBcbiAqIHtAbGluayBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25zfVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9uTmFtZXMgPSBmdW5jdGlvbihvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGNhbGxiYWNrKSAmJiBfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgIFxuICAgIGlmICghb3B0aW9ucy5uYW1lc09ubHkpIG9wdGlvbnMubmFtZXNPbmx5ID0gdHJ1ZTtcbiAgICBcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9ucyhvcHRpb25zLCBjYWxsYmFjayk7XG59O1xuXG5cbi8qKlxuICogQ3JlYXRlcyBhIGNvbGxlY3Rpb24gb24gYSBzZXJ2ZXIgcHJlLWFsbG9jYXRpbmcgc3BhY2UsIG5lZWQgdG8gY3JlYXRlIGYuZXggY2FwcGVkIGNvbGxlY3Rpb25zLlxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjY29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSB0aGUgY29sbGVjdGlvbiBuYW1lIHdlIHdpc2ggdG8gYWNjZXNzLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIHJldHVybnMgb3B0aW9uIHJlc3VsdHMuXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbnxPYmplY3R9IFtvcHRpb25zLnNhZmU9ZmFsc2VdIEV4ZWN1dGVzIHdpdGggYSBnZXRMYXN0RXJyb3IgY29tbWFuZCByZXR1cm5pbmcgdGhlIHJlc3VsdHMgb2YgdGhlIGNvbW1hbmQgb24gTW9uZ29Nb25nbG86XG4gKiAgICAgIDx1bD5cbiAqICAgICAgICAgIDxsaT50cnVlPC9saT5cbiAqICAgICAgICAgIDxsaT5mYWxzZTwvbGk+XG4gKiAgICAgICAgICA8bGk+eyB3OiB7TnVtYmVyfSwgd3RpbWVvdXQ6IHtOdW1iZXJ9fTwvbGk+XG4gKiAgICAgICAgICA8bGk+eyBmc3luYzogdHJ1ZSB9PC9saT5cbiAqICAgICAgPC91bD5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuc2VyaWFsaXplRnVuY3Rpb25zPWZhbHNlXSAtIFNlcmlhbGl6ZSBmdW5jdGlvbnMgb24gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5yYXc9ZmFsc2VdIC0gUGVyZm9ybSBhbGwgb3BlcmF0aW9ucyB1c2luZyByYXcgYnNvbiBvYmplY3RzLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLnBrRmFjdG9yeT1udWxsXSAtIE9iamVjdCBvdmVycmlkaW5nIHRoZSBiYXNpYyBPYmplY3RJZCBwcmltYXJ5IGtleSBnZW5lcmF0aW9uLlxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5jYXBwZWQ9ZmFsc2VdIC0gQ3JlYXRlIGEgY2FwcGVkIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2l6ZT00MDk2XSAtIFRoZSBzaXplIG9mIHRoZSBjYXBwZWQgY29sbGVjdGlvbiBpbiBieXRlcy5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5tYXg9NTAwXSAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBkb2N1bWVudHMgaW4gdGhlIGNhcHBlZCBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5hdXRvSW5kZXhJZD1mYWxzZV0gLSBDcmVhdGUgYW4gaW5kZXggb24gdGhlIF9pZCBmaWVsZCBvZiB0aGUgZG9jdW1lbnQsIG5vdCBjcmVhdGVkIGF1dG9tYXRpY2FsbHkgb24gY2FwcGVkIGNvbGxlY3Rpb25zLlxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLnJlYWRQcmVmZXJlbmNlPVJlYWRQcmVmZXJlbmNlLlBSSU1BUlldIC0gVGUgcHJlZmVyZWQgcmVhZCBwcmVmZXJlbmNlOlxuICogICAgICA8dWw+XG4gKiAgICAgICAgICA8bGk+UmVhZFByZWZlcmVuY2UuUFJJTUFSWTwvbGk+XG4gKiAgICAgICAgICA8bGk+UmVhZFByZWZlcmVuY2UuUFJJTUFSWV9QUkVGRVJSRUQ8L2xpPlxuICogICAgICAgICAgPGxpPlJlYWRQcmVmZXJlbmNlLlNFQ09OREFSWTwvbGk+XG4gKiAgICAgICAgICA8bGk+UmVhZFByZWZlcmVuY2UuU0VDT05EQVJZX1BSRUZFUlJFRDwvbGk+XG4gKiAgICAgICAgICA8bGk+UmVhZFByZWZlcmVuY2UuTkVBUkVTVDwvbGk+XG4gKiAgICAgIDwvdWw+XG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQGZpcmVzIHtAbGluayBNb25nb1N0b3JlI2NyZWF0ZUNvbGxlY3Rpb259XG4gKiBcbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9uID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBleGlzdGluZyA9IGZhbHNlO1xuICAgIC8vIHZhciBjb2xsZWN0aW9uO1xuICAgIC8vIHZhciBjb2xsZWN0aW9uRnVsbE5hbWUgPSAgc2VsZi5kYXRhYmFzZU5hbWUgKyBcIi5cIiArIGNvbGxlY3Rpb25OYW1lO1xuXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSl7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIH1cbiAgICBcbiAgICAvLyBDb2xsZWN0aW9uIGFscmVhZHkgaW4gbWVtb3J5LCBsZXRzIGNyZWF0ZSBpdFxuICAgIGlmIChzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0pIHtcbiAgICAgICAgc2VsZi5lbWl0KFxuICAgICAgICAgICAgJ2NyZWF0ZUNvbGxlY3Rpb24nLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb246IHNlbGYsXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgZXhpc3RpbmcgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXSA9IG5ldyBDb2xsZWN0aW9uKHNlbGYsIGNvbGxlY3Rpb25OYW1lLCBzZWxmLnBrRmFjdG9yeSwgb3B0aW9ucyk7XG4gICAgICAgIHNlbGYuZW1pdChcbiAgICAgICAgICAgICdjcmVhdGVDb2xsZWN0aW9uJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uOiBzZWxmLFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWV4aXN0aW5nKSB7XG4gICAgICAgIC8vIExldHRpbmcgYWNjZXNzIHRoZSBjb2xsZWN0aW9uIGJ5IDxNb25nb1BvcnRhYmxlIGluc3RhbmNlPi48Q09MX05BTUU+XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShNb25nb1BvcnRhYmxlLnByb3RvdHlwZSwgY29sbGVjdGlvbk5hbWUsIHtcbiAgICAgICAgICAgIGVudW1lcmFibGUgOiB0cnVlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHZhbHVlOiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8vIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV07XG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0pO1xuXG4gICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb259XG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNjcmVhdGVDb2xsZWN0aW9uXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmNyZWF0ZUNvbGxlY3Rpb24gPSBNb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9uO1xuXG4vKipcbiAqIERyb3AgYSBjb2xsZWN0aW9uIGZyb20gdGhlIGRhdGFiYXNlLCByZW1vdmluZyBpdCBwZXJtYW5lbnRseS4gTmV3IGFjY2Vzc2VzIHdpbGwgY3JlYXRlIGEgbmV3IGNvbGxlY3Rpb24uXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNkcm9wQ29sbGVjdGlvblxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHdlIHdpc2ggdG8gZHJvcC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge0Jvb2xlYW59IFwidHJ1ZVwiIGlmIGRyb3BwZWQgc3VjY2Vzc2Z1bGx5XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmRyb3BDb2xsZWN0aW9uID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXSkge1xuICAgICAgICAvLyBEcm9wIHRoZSBjb2xsZWN0aW9uXG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICdkcm9wQ29sbGVjdGlvbicsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29ubjogdGhpcyxcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGRlbGV0ZSBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV07XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2sgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgY2FsbGJhY2soKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBtc2cgPSBcIk5vIGNvbGxlY3Rpb24gZm91bmRcIjtcbiAgICAgICAgXG4gICAgICAgIExvZ2dlci5lcnJvcihtc2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG5ldyBFcnJvcihtc2cpKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbmFtZSBhIGNvbGxlY3Rpb24uXG4gKlxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI3JlbmFtZUNvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGZyb21Db2xsZWN0aW9uIC0gVGhlIG5hbWUgb2YgdGhlIGN1cnJlbnQgY29sbGVjdGlvbiB3ZSB3aXNoIHRvIHJlbmFtZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSB0b0NvbGxlY3Rpb24gLSBUaGUgbmV3IG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtCb29sZWFufENvbGxlY3Rpb259IFRoZSBjb2xsZWN0aW9uIGlmIHJlbmFtZWQgc3VjY2Vzc2Z1bGx5IG9yIGZhbHNlIGlmIG5vdFxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5yZW5hbWVDb2xsZWN0aW9uID0gZnVuY3Rpb24oZnJvbUNvbGxlY3Rpb24sIHRvQ29sbGVjdGlvbiwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoXy5pc1N0cmluZyhmcm9tQ29sbGVjdGlvbikgJiYgXy5pc1N0cmluZyh0b0NvbGxlY3Rpb24pICYmIGZyb21Db2xsZWN0aW9uICE9PSB0b0NvbGxlY3Rpb24pIHtcbiAgICAgICAgLy8gRXhlY3V0ZSB0aGUgY29tbWFuZCwgcmV0dXJuIHRoZSBuZXcgcmVuYW1lZCBjb2xsZWN0aW9uIGlmIHN1Y2Nlc3NmdWxcbiAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKHRvQ29sbGVjdGlvbik7XG4gICAgICAgIFxuICAgICAgICBpZiAoc2VsZi5fY29sbGVjdGlvbnNbZnJvbUNvbGxlY3Rpb25dKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAgICAgJ3JlbmFtZUNvbGxlY3Rpb24nLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29ubjogc2VsZixcbiAgICAgICAgICAgICAgICAgICAgZnJvbTogZnJvbUNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRvOiB0b0NvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgcmVuYW1lZCA9IHNlbGYuX2NvbGxlY3Rpb25zW2Zyb21Db2xsZWN0aW9uXS5yZW5hbWUodG9Db2xsZWN0aW9uKTtcbiAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb25zLnJlbmFtZVByb3BlcnR5KGZyb21Db2xsZWN0aW9uLCB0b0NvbGxlY3Rpb24pO1xuICAgICAgICAgICAgc2VsZi5yZW5hbWVQcm9wZXJ0eShmcm9tQ29sbGVjdGlvbiwgdG9Db2xsZWN0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG51bGwsIHJlbmFtZWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gcmVuYW1lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBtc2cgPSBcIk5vIGNvbGxlY3Rpb24gZm91bmRcIjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgTG9nZ2VyLmVycm9yKG1zZyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhuZXcgRXJyb3IobXNnKSwgbnVsbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBtc2cgPSBcIlRoZSBwYXJhbXMgYXJlIGludmFsaWRcIjtcbiAgICAgICAgXG4gICAgICAgIExvZ2dlci5lcnJvcihtc2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG5ldyBFcnJvcihtc2cpLCBudWxsKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogQ3JlYXRlcyBhbiBpbmRleCBvbiB0aGUgY29sbGVjdGlvbi5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NyZWF0ZUluZGV4XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gTmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0byBjcmVhdGUgdGhlIGluZGV4IG9uLlxuICogQHBhcmFtIHtPYmplY3R9IGZpZWxkT3JTcGVjIC0gRmllbGRPclNwZWMgdGhhdCBkZWZpbmVzIHRoZSBpbmRleC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnMgZHVyaW5nIHVwZGF0ZS5cbiAqIFxuICogQHBhcmFtIHtCb29sZWFufE9iamVjdH0gW29wdGlvbnMuc2FmZT1mYWxzZV0gRXhlY3V0ZXMgd2l0aCBhIGdldExhc3RFcnJvciBjb21tYW5kIHJldHVybmluZyB0aGUgcmVzdWx0cyBvZiB0aGUgY29tbWFuZCBvbiBNb25nb01vbmdsbzpcbiAqICAgICAgPHVsPlxuICogICAgICAgICAgPGxpPnRydWU8L2xpPlxuICogICAgICAgICAgPGxpPmZhbHNlPC9saT5cbiAqICAgICAgICAgIDxsaT57IHc6IHtOdW1iZXJ9LCB3dGltZW91dDoge051bWJlcn19PC9saT5cbiAqICAgICAgICAgIDxsaT57IGZzeW5jOiB0cnVlIH08L2xpPlxuICogICAgICA8L3VsPiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMudW5pcXVlPWZhbHNlXSAtIENyZWF0ZXMgYW4gdW5pcXVlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnNwYXJzZT1mYWxzZV0gLSBDcmVhdGVzIGEgc3BhcnNlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmJhY2tncm91bmQ9ZmFsc2VdIC0gQ3JlYXRlcyB0aGUgaW5kZXggaW4gdGhlIGJhY2tncm91bmQsIHlpZWxkaW5nIHdoZW5ldmVyIHBvc3NpYmxlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmRyb3BEdXBzPWZhbHNlXSAtIEEgdW5pcXVlIGluZGV4IGNhbm5vdCBiZSBjcmVhdGVkIG9uIGEga2V5IHRoYXQgaGFzIHByZS1leGlzdGluZyBkdXBsaWNhdGUgdmFsdWVzLiBJZiB5b3Ugd291bGQgbGlrZSB0byBjcmVhdGUgdGhlIGluZGV4IGFueXdheSwga2VlcGluZyB0aGUgZmlyc3QgZG9jdW1lbnQgdGhlIGRhdGFiYXNlIGluZGV4ZXMgYW5kIGRlbGV0aW5nIGFsbCBzdWJzZXF1ZW50IGRvY3VtZW50cyB0aGF0IGhhdmUgZHVwbGljYXRlIHZhbHVlXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWluPW51bGxdIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGxvd2VyIGJvdW5kIGZvciB0aGUgY28tb3JkaW5hdGVzXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWF4PW51bGxdIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGhpZ2ggYm91bmQgZm9yIHRoZSBjby1vcmRpbmF0ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy52PW51bGxdIC0gU3BlY2lmeSB0aGUgZm9ybWF0IHZlcnNpb24gb2YgdGhlIGluZGV4ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5leHBpcmVBZnRlclNlY29uZHM9bnVsbF0gLSBBbGxvd3MgeW91IHRvIGV4cGlyZSBkYXRhIG9uIGluZGV4ZXMgYXBwbGllZCB0byBhIGRhdGEgKE1vbmdvREIgMi4yIG9yIGhpZ2hlcilcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5uYW1lPW51bGxdIC0gT3ZlcnJpZGUgdGhlIGF1dG9nZW5lcmF0ZWQgaW5kZXggbmFtZSAodXNlZnVsIGlmIHRoZSByZXN1bHRpbmcgbmFtZSBpcyBsYXJnZXIgdGhhbiAxMjggYnl0ZXMpXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHRvZG8gSW1wbGVtZW50XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmNyZWF0ZUluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGZpZWxkT3JTcGVjLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkIHlldCEnKTtcbn07XG5cbi8qKlxuICogRW5zdXJlcyB0aGF0IGFuIGluZGV4IGV4aXN0cywgaWYgaXQgZG9lcyBub3QgaXQgY3JlYXRlcyBpdFxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjZW5zdXJlSW5kZXhcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBOYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHRvIGNyZWF0ZSB0aGUgaW5kZXggb24uXG4gKiBAcGFyYW0ge09iamVjdH0gZmllbGRPclNwZWMgLSBGaWVsZE9yU3BlYyB0aGF0IGRlZmluZXMgdGhlIGluZGV4LlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9ucyBkdXJpbmcgdXBkYXRlLlxuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW58T2JqZWN0fSBbb3B0aW9ucy5zYWZlPWZhbHNlXSAtIEV4ZWN1dGVzIHdpdGggYSBnZXRMYXN0RXJyb3IgY29tbWFuZCByZXR1cm5pbmcgdGhlIHJlc3VsdHMgb2YgdGhlIGNvbW1hbmQgb24gTW9uZ29Nb25nbG86XG4gKiAgICAgIDx1bD5cbiAqICAgICAgICAgIDxsaT50cnVlPC9saT5cbiAqICAgICAgICAgIDxsaT5mYWxzZTwvbGk+XG4gKiAgICAgICAgICA8bGk+eyB3OiB7TnVtYmVyfSwgd3RpbWVvdXQ6IHtOdW1iZXJ9fTwvbGk+XG4gKiAgICAgICAgICA8bGk+eyBmc3luYzogdHJ1ZSB9PC9saT5cbiAqICAgICAgPC91bD5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMudW5pcXVlPWZhbHNlXSAtIENyZWF0ZXMgYW4gdW5pcXVlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnNwYXJzZT1mYWxzZV0gLSBDcmVhdGVzIGEgc3BhcnNlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmJhY2tncm91bmQ9ZmFsc2VdIC0gQ3JlYXRlcyB0aGUgaW5kZXggaW4gdGhlIGJhY2tncm91bmQsIHlpZWxkaW5nIHdoZW5ldmVyIHBvc3NpYmxlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmRyb3BEdXBzPWZhbHNlXSAtIEEgdW5pcXVlIGluZGV4IGNhbm5vdCBiZSBjcmVhdGVkIG9uIGEga2V5IHRoYXQgaGFzIHByZS1leGlzdGluZyBkdXBsaWNhdGUgdmFsdWVzLiBJZiB5b3Ugd291bGQgbGlrZSB0byBjcmVhdGUgdGhlIGluZGV4IGFueXdheSwga2VlcGluZyB0aGUgZmlyc3QgZG9jdW1lbnQgdGhlIGRhdGFiYXNlIGluZGV4ZXMgYW5kIGRlbGV0aW5nIGFsbCBzdWJzZXF1ZW50IGRvY3VtZW50cyB0aGF0IGhhdmUgZHVwbGljYXRlIHZhbHVlXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWluXSAtIEZvciBnZW9zcGF0aWFsIGluZGV4ZXMgc2V0IHRoZSBsb3dlciBib3VuZCBmb3IgdGhlIGNvLW9yZGluYXRlc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm1heF0gLSBGb3IgZ2Vvc3BhdGlhbCBpbmRleGVzIHNldCB0aGUgaGlnaCBib3VuZCBmb3IgdGhlIGNvLW9yZGluYXRlc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnZdIC0gU3BlY2lmeSB0aGUgZm9ybWF0IHZlcnNpb24gb2YgdGhlIGluZGV4ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5leHBpcmVBZnRlclNlY29uZHNdIC0gQWxsb3dzIHlvdSB0byBleHBpcmUgZGF0YSBvbiBpbmRleGVzIGFwcGxpZWQgdG8gYSBkYXRhIChNb25nb0RCIDIuMiBvciBoaWdoZXIpXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMubmFtZV0gLSBPdmVycmlkZSB0aGUgYXV0b2dlbmVyYXRlZCBpbmRleCBuYW1lICh1c2VmdWwgaWYgdGhlIHJlc3VsdGluZyBuYW1lIGlzIGxhcmdlciB0aGFuIDEyOCBieXRlcylcbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZW5zdXJlSW5kZXggPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgZmllbGRPclNwZWMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQgeWV0IScpO1xufTtcblxuLyoqXG4gKiBEcm9wIGFuIGluZGV4IG9uIGEgY29sbGVjdGlvbi5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2Ryb3BJbmRleFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHdoZXJlIHRoZSBjb21tYW5kIHdpbGwgZHJvcCBhbiBpbmRleC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBpbmRleE5hbWUgLSBOYW1lIG9mIHRoZSBpbmRleCB0byBkcm9wLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZHJvcEluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGluZGV4TmFtZSwgY2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCB5ZXQhJyk7XG59O1xuXG4vKipcbiAqIFJlaW5kZXggYWxsIGluZGV4ZXMgb24gdGhlIGNvbGxlY3Rpb25cbiAqIFdhcm5pbmc6IFwicmVJbmRleFwiIGlzIGEgYmxvY2tpbmcgb3BlcmF0aW9uIChpbmRleGVzIGFyZSByZWJ1aWx0IGluIHRoZSBmb3JlZ3JvdW5kKSBhbmQgd2lsbCBiZSBzbG93IGZvciBsYXJnZSBjb2xsZWN0aW9ucy5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI3JlSW5kZXhcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0byByZWluZGV4XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEB0b2RvIEltcGxlbWVudFxuICoqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUucmVJbmRleCA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBjYWxsYmFjaykge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkIHlldCEnKTtcbn07XG5cbi8qKlxuICogUmV0cmlldmVzIHRoaXMgY29sbGVjdGlvbnMgaW5kZXggaW5mby5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2luZGV4SW5mb3JtYXRpb25cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQWRkaXRpb25hbCBvcHRpb25zIGR1cmluZyB1cGRhdGUuXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2Z1bGw9ZmFsc2VdIC0gUmV0dXJucyB0aGUgZnVsbCByYXcgaW5kZXggaW5mb3JtYXRpb24uXG4gKiBAcGFyYW0ge1N0cmluZ30gW3JlYWRQcmVmZXJlbmNlXSAtIFRoZSBwcmVmZXJyZWQgcmVhZCBwcmVmZXJlbmNlICgoU2VydmVyLlBSSU1BUlksIFNlcnZlci5QUklNQVJZX1BSRUZFUlJFRCwgU2VydmVyLlNFQ09OREFSWSwgU2VydmVyLlNFQ09OREFSWV9QUkVGRVJSRUQsIFNlcnZlci5ORUFSRVNUKS5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAdG9kbyBJbXBsZW1lbnRcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuaW5kZXhJbmZvcm1hdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkIHlldCEnKTtcbn07XG5cbi8qKlxuICogRHJvcCB0aGUgd2hvbGUgZGF0YWJhc2UuXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNkcm9wRGF0YWJhc2VcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFwidHJ1ZVwiIGlmIGRyb3BwZWQgc3VjY2Vzc2Z1bGx5XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmRyb3BEYXRhYmFzZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYgKE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnNbdGhpcy5kYXRhYmFzZU5hbWVdKSB7XG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICdkcm9wRGF0YWJhc2UnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbm46IHRoaXNcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGRlbGV0ZSBNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zW3RoaXMuZGF0YWJhc2VOYW1lXTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX2NvbGxlY3Rpb25zID0gW107XG4gICAgICAgIHRoaXMuX3N0b3JlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IG1zZyA9ICdUaGF0IGRhdGFiYXNlIG5vIGxvbmdlciBleGlzdHMnO1xuICAgICAgICBcbiAgICAgICAgTG9nZ2VyLmVycm9yKG1zZyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2sgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgY2FsbGJhY2sobmV3IEVycm9yKG1zZyksIGZhbHNlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIERlcmVmZXJlbmNlIGEgZGJyZWYsIGFnYWluc3QgYSBkYlxuICpcbiAqIEBwYXJhbSB7REJSZWZ9IGRiUmVmIGRiIHJlZmVyZW5jZSBvYmplY3Qgd2Ugd2lzaCB0byByZXNvbHZlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHRvZG8gSW1wbGVtZW50XG4gKiBcbiAqIEBpZ25vcmVcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZGVyZWZlcmVuY2UgPSBmdW5jdGlvbihkYlJlZiwgY2FsbGJhY2spIHtcbiAgICAvLyBUT0RPXG4gICAgLy8gdmFyIGRiID0gdGhpcztcblxuICAgIC8vIC8vIElmIHdlIGhhdmUgYSBkYiByZWZlcmVuY2UgdGhlbiBsZXQncyBnZXQgdGhlIGRiIGZpcnN0XG4gICAgLy8gaWYgKGRiUmVmLmRiICE9PSBudWxsKSBkYiA9IHRoaXMuZGIoZGJSZWYuZGIpO1xuXG4gICAgLy8gLy8gRmV0Y2ggdGhlIGNvbGxlY3Rpb24gYW5kIGZpbmQgdGhlIHJlZmVyZW5jZVxuICAgIC8vIHZhciBjb2xsZWN0aW9uID0gTW9uZ2xvLmNvbGxlY3Rpb24oZGJSZWYubmFtZXNwYWNlKTtcblxuICAgIC8vIGNvbGxlY3Rpb24uZmluZE9uZSh7J19pZCc6ZGJSZWYub2lkfSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAvLyAgICAgY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgIC8vIH0pO1xufTtcblxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGUgZGF0YWJhc2UgbmFtZVxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjX3ZhbGlkYXRlRGF0YWJhc2VOYW1lXG4gKiBAcHJpdmF0ZVxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gZGF0YWJhc2VOYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGRhdGFiYXNlIHRvIHZhbGlkYXRlXG4gKiBcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFwidHJ1ZVwiIGlmIHRoZSBuYW1lIGlzIHZhbGlkXG4gKi9cbnZhciBfdmFsaWRhdGVEYXRhYmFzZU5hbWUgPSBmdW5jdGlvbihkYXRhYmFzZU5hbWUpIHtcbiAgICBpZiAoIV8uaXNTdHJpbmcoZGF0YWJhc2VOYW1lKSkgdGhyb3cgbmV3IEVycm9yKFwiZGF0YWJhc2UgbmFtZSBtdXN0IGJlIGEgc3RyaW5nXCIpO1xuXG4gICAgaWYgKGRhdGFiYXNlTmFtZS5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcihcImRhdGFiYXNlIG5hbWUgY2Fubm90IGJlIHRoZSBlbXB0eSBzdHJpbmdcIik7XG5cbiAgICB2YXIgaW52YWxpZENoYXJzID0gW1wiIFwiLCBcIi5cIiwgXCIkXCIsIFwiL1wiLCBcIlxcXFxcIl07XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGludmFsaWRDaGFycy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZihkYXRhYmFzZU5hbWUuaW5kZXhPZihpbnZhbGlkQ2hhcnNbaV0pICE9IC0xKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJkYXRhYmFzZSBuYW1lcyBjYW5ub3QgY29udGFpbiB0aGUgY2hhcmFjdGVyICdcIiArIGludmFsaWRDaGFyc1tpXSArIFwiJ1wiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW9uZ29Qb3J0YWJsZTtcblxuLyoqXG4gKiBSZW5hbWVzIGFuIG9iamVjdCBwcm9wZXJ0eS5cbiAqIFxuICogQG1ldGhvZCBPYmplY3QjcmVuYW1lUHJvcGVydHlcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IG9sZE5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgcHJvcGVydHkgdG8gcmVuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ30gbmV3TmFtZSAtIFRoZSBuZXcgbmFtZSBvZiB0aGUgcHJvcGVydHlcbiAqIFxuICogQHJldHVybnMge3RoaXN9IFRoZSBjYWxsZWQgb2JqZWN0XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShcbiAgICBPYmplY3QucHJvdG90eXBlLCBcbiAgICAncmVuYW1lUHJvcGVydHknLFxuICAgIHtcbiAgICAgICAgd3JpdGFibGUgOiBmYWxzZSwgLy8gQ2Fubm90IGFsdGVyIHRoaXMgcHJvcGVydHlcbiAgICAgICAgZW51bWVyYWJsZSA6IGZhbHNlLCAvLyBXaWxsIG5vdCBzaG93IHVwIGluIGEgZm9yLWluIGxvb3AuXG4gICAgICAgIGNvbmZpZ3VyYWJsZSA6IGZhbHNlLCAvLyBDYW5ub3QgYmUgZGVsZXRlZCB2aWEgdGhlIGRlbGV0ZSBvcGVyYXRvclxuICAgICAgICB2YWx1ZSA6IGZ1bmN0aW9uIChvbGROYW1lLCBuZXdOYW1lKSB7XG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nIGlmIHNvbWUgbmFtZSBpcyBtaXNzaW5nIG9yIGlzIG5vdCBhbiBzdHJpbmdcbiAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhvbGROYW1lKSB8fCAhXy5pc1N0cmluZyhuZXdOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nIGlmIHRoZSBuYW1lcyBhcmUgdGhlIHNhbWVcbiAgICAgICAgICAgIGlmIChvbGROYW1lID09IG5ld05hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHRoZSBvbGQgcHJvcGVydHkgbmFtZSB0byBcbiAgICAgICAgICAgIC8vIGF2b2lkIGEgUmVmZXJlbmNlRXJyb3IgaW4gc3RyaWN0IG1vZGUuXG4gICAgICAgICAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShvbGROYW1lKSkge1xuICAgICAgICAgICAgICAgIHRoaXNbbmV3TmFtZV0gPSB0aGlzW29sZE5hbWVdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzW29sZE5hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbik7Il19
