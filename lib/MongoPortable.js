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
 * @param  {Function} fn - Function to implement the middleware
 */
MongoPortable.prototype.use = function (name, fn) {
    switch (name) {
        case 'store':
            this._stores.push(fn);
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
 * @todo Not implemented yet
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
        // Letting access the collection by MongoPortable.<COL_NAME>
        Object.defineProperty(MongoPortable.prototype, collectionName, {
            enumerable: true,
            configurable: true,
            get: function get() {
                return self._collections[collectionName];
            },
            set: function set(v) {
                self._collections[collectionName] = v;
            }
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
 * @todo Not implemented yet
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9Nb25nb1BvcnRhYmxlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFRQSxJQUFJLElBQUksUUFBUSxRQUFSLENBQVI7SUFDSSxlQUFlLFFBQVEsc0JBQVIsQ0FEbkI7SUFFSSxXQUFXLFFBQVEsWUFBUixDQUZmO0lBR0ksYUFBYSxRQUFRLGNBQVIsQ0FIakI7SUFJSSxTQUFTLFFBQVEsZ0JBQVIsQ0FKYjs7Ozs7Ozs7Ozs7Ozs7SUFpQk0sYTs7O0FBQ0YsMkJBQVksWUFBWixFQUEwQjtBQUFBOztBQUFBOztBQUFBOzs7O0FBSXRCLFlBQUksRUFBRSxpQkFBZ0IsYUFBbEIsQ0FBSixFQUFzQyxjQUFPLElBQUksYUFBSixDQUFrQixZQUFsQixDQUFQOzs7QUFHdEMsOEJBQXNCLFlBQXRCOzs7QUFHQSxjQUFLLFlBQUwsR0FBb0IsRUFBcEI7QUFDQSxjQUFLLE9BQUwsR0FBZSxFQUFmOztBQUVBLFlBQUksQ0FBQyxjQUFjLFdBQW5CLEVBQWdDO0FBQzVCLDBCQUFjLFdBQWQsR0FBNEIsRUFBNUI7QUFDSDs7OztBQUlELFlBQUksY0FBYyxXQUFkLENBQTBCLFlBQTFCLENBQUosRUFBNkM7QUFDekMsa0JBQU0sSUFBSSxLQUFKLENBQVUsd0JBQVYsQ0FBTjtBQUNIOztBQUVELGNBQUssWUFBTCxHQUFvQixZQUFwQjs7QUFFQSxzQkFBYyxXQUFkLENBQTBCLFlBQTFCLElBQTBDLElBQUksUUFBSixFQUExQztBQXpCc0I7QUEwQnpCOzs7RUEzQnVCLFk7Ozs7Ozs7Ozs7QUFvQzVCLGNBQWMsV0FBZCxHQUE0QixFQUE1Qjs7Ozs7Ozs7OztBQVVBLGNBQWMsT0FBZCxHQUF3QixPQUF4Qjs7Ozs7Ozs7Ozs7QUFXQSxjQUFjLFNBQWQsQ0FBd0IsR0FBeEIsR0FBOEIsVUFBUyxJQUFULEVBQWUsRUFBZixFQUFtQjtBQUM3QyxZQUFPLElBQVA7QUFDSSxhQUFLLE9BQUw7QUFDSSxpQkFBSyxPQUFMLENBQWEsSUFBYixDQUFr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QVUsT0FBVixFQUFtQixPQUFuQixFQUE0QjtBQUNoQyxZQUFJLENBQUMsRUFBRSxRQUFGLENBQVcsT0FBWCxDQUFELElBQXdCLENBQUMsRUFBRSxRQUFGLENBQVcsT0FBWCxDQUE3QixFQUFrRDtBQUM5QyxtQkFBTyxJQUFQO0FBQ0g7OztBQUdELFlBQUksV0FBVyxPQUFmLEVBQXdCO0FBQ3BCLG1CQUFPLElBQVA7QUFDSDs7OztBQUlELFlBQUksS0FBSyxjQUFMLENBQW9CLE9BQXBCLENBQUosRUFBa0M7QUFDOUIsaUJBQUssT0FBTCxJQUFnQixLQUFLLE9BQUwsQ0FBaEI7QUFDQSxtQkFBTyxLQUFLLE9BQUwsQ0FBUDtBQUNIOztBQUVELGVBQU8sSUFBUDtBQUNIO0FBdEJMLENBSEoiLCJmaWxlIjoiTW9uZ29Qb3J0YWJsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgTW9uZ29Qb3J0YWJsZS5qcyAtIGJhc2VkIG9uIE1vbmdsbyAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAwLjAuMVxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyksXG4gICAgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4vdXRpbHMvRXZlbnRFbWl0dGVyXCIpLFxuICAgIE9iamVjdElkID0gcmVxdWlyZSgnLi9PYmplY3RJZCcpLFxuICAgIENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL0NvbGxlY3Rpb24nKSxcbiAgICBMb2dnZXIgPSByZXF1aXJlKFwiLi91dGlscy9Mb2dnZXJcIik7XG4gICAgXG4vKipcbiAqIE1vbmdvUG9ydGFibGVcbiAqIFxuICogQG1vZHVsZSBNb25nb1BvcnRhYmxlXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzaW5jZSAwLjAuMVxuICogXG4gKiBAY2xhc3NkZXNjIFBvcnRhYmxlIGRhdGFiYXNlIHdpdGggcGVyc2lzdGVuY2UgYW5kIE1vbmdvREItbGlrZSBBUElcbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGFiYXNlTmFtZSAtIE5hbWUgb2YgdGhlIGRhdGFiYXNlLlxuICovXG5jbGFzcyBNb25nb1BvcnRhYmxlIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhYmFzZU5hbWUpIHtcbiAgICAgICAgLy8gSW5zdGFudGlhdGVzIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTW9uZ29Qb3J0YWJsZSkpIHJldHVybiBuZXcgTW9uZ29Qb3J0YWJsZShkYXRhYmFzZU5hbWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZGRiYiBuYW1lIGZvcm1hdFxuICAgICAgICBfdmFsaWRhdGVEYXRhYmFzZU5hbWUoZGF0YWJhc2VOYW1lKTtcbiAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6aW5nIHZhcmlhYmxlc1xuICAgICAgICB0aGlzLl9jb2xsZWN0aW9ucyA9IHt9O1xuICAgICAgICB0aGlzLl9zdG9yZXMgPSBbXTtcbiAgICBcbiAgICAgICAgaWYgKCFNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zKSB7XG4gICAgICAgICAgICBNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zID0ge307XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy9UZW1wIHBhdGNoIHVudGlsIEkgZmlndXJlIG91dCBob3cgZmFyIEkgd2FudCB0byB0YWtlIHRoZSBpbXBsZW1lbnRhdGlvbjtcbiAgICAgICAgLy8gRklYTUVcbiAgICAgICAgaWYgKE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnNbZGF0YWJhc2VOYW1lXSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdkYiBuYW1lIGFscmVhZHkgaW4gdXNlJyk7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgdGhpcy5kYXRhYmFzZU5hbWUgPSBkYXRhYmFzZU5hbWU7XG4gICAgXG4gICAgICAgIE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnNbZGF0YWJhc2VOYW1lXSA9IG5ldyBPYmplY3RJZCgpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBDb25uZWN0aW9uIFBvb2xcbiAqIFxuICogQG1lbWJlcm9mIE1vbmdvUG9ydGFibGVcbiAqIEBzdGF0aWNcbiAqL1xuTW9uZ29Qb3J0YWJsZS5jb25uZWN0aW9ucyA9IHt9O1xuXG4vLyBNb25nb1BvcnRhYmxlLnByb3RvdHlwZS5fX3Byb3RvX18gPSBFdmVudEVtaXR0ZXIucHJvdG87XG5cbi8qKlxuICogVmVyc2lvbiBOdW1iZXJcbiAqIFxuICogQG1lbWJlcm9mIE1vbmdvUG9ydGFibGVcbiAqIEBzdGF0aWNcbiAqL1xuTW9uZ29Qb3J0YWJsZS52ZXJzaW9uID0gJzAuMC4xJztcblxuLyoqXG4gKiBNaWRkbGV3YXJlIGZ1bmN0aW9uc1xuICogXG4gKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWUgLSBOYW1lIG9mIHRoZSBtaWRkbGV3YXJlOlxuICogICAgICA8dWw+XG4gKiAgICAgICAgICA8bGk+XCJzdG9yZVwiOiBBZGQgYSBjdXN0b20gc3RvcmU8L2xpPlxuICogICAgICA8L3VsPlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuIC0gRnVuY3Rpb24gdG8gaW1wbGVtZW50IHRoZSBtaWRkbGV3YXJlXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XG4gICAgc3dpdGNoKG5hbWUpIHtcbiAgICAgICAgY2FzZSAnc3RvcmUnOlxuICAgICAgICAgICAgdGhpcy5fc3RvcmVzLnB1c2goZm4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBZGRzIGEgY3VzdG9tIHN0b3JlcyBmb3IgcmVtb3RlIGFuZCBsb2NhbCBwZXJzaXN0ZW5jZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fEZ1bmN0aW9ufSBzdG9yZSAtIFRoZSBjdXN0b20gc3RvcmVcbiAqIFxuICogQHJldHVybnMge01vbmdvUG9ydGFibGV9IHRoaXMgLSBUaGUgY3VycmVudCBJbnN0YW5jZVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5hZGRTdG9yZSA9IGZ1bmN0aW9uIChzdG9yZSkge1xuICAgIGlmIChfLmlzTmlsKHN0b3JlKSkgdGhyb3cgbmV3IEVycm9yKFwic3RvcmUgbXVzdCBiZSBpbmNsdWRlZFwiKTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHN0b3JlKSkge1xuICAgICAgICB0aGlzLl9zdG9yZXMucHVzaChuZXcgc3RvcmUoKSk7XG4gICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3Qoc3RvcmUpKSB7XG4gICAgICAgIHRoaXMuX3N0b3Jlcy5wdXNoKHN0b3JlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJzdG9yZSBtdXN0IGJlIGEgZnVuY3Rpb24gb3Igb2JqZWN0XCIpO1xuICAgIH1cbiAgICBcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgY3Vyc29yIHRvIGFsbCB0aGUgY29sbGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW2NvbGxlY3Rpb25OYW1lPW51bGxdIC0gdGhlIGNvbGxlY3Rpb24gbmFtZSB3ZSB3aXNoIHRvIHJldHJpZXZlIHRoZSBpbmZvcm1hdGlvbiBmcm9tLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKiBcbiAqIEB0b2RvIE5vdCBpbXBsZW1lbnRlZCB5ZXRcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbnNJbmZvID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkIHlldFwiKTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25zfVxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjZmV0Y2hDb2xsZWN0aW9uc1xuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5mZXRjaENvbGxlY3Rpb25zID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9ucyhvcHRpb25zLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgbGlzdCBvZiBhbGwgY29sbGVjdGlvbiBmb3IgdGhlIHNwZWNpZmllZCBkYlxuICpcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9uc1xuICogXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMubmFtZXNPbmx5PWZhbHNlXSAtIFJldHVybiBvbmx5IHRoZSBjb2xsZWN0aW9ucyBuYW1lc1xuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IFtvcHRpb25zLmNvbGxlY3Rpb25OYW1lPW51bGxdIC0gVGhlIGNvbGxlY3Rpb24gbmFtZSB3ZSB3aXNoIHRvIGZpbHRlciBieVxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKlxuICogQHJldHVybiB7QXJyYXl9IFxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKF8uaXNOaWwoY2FsbGJhY2spICYmIF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIFxuICAgIHZhciBjb2xsZWN0aW9uTGlzdCA9IFtdO1xuICAgIGZvciAodmFyIG5hbWUgaW4gc2VsZi5fY29sbGVjdGlvbnMpIHtcbiAgICAgICAgLy8gT25seSBhZGQgdGhlIHJlcXVlc3RlZCBjb2xsZWN0aW9ucyAvL1RPRE8gQWRkIGFycmF5IHR5cGVcbiAgICAgICAgaWYgKG9wdGlvbnMuY29sbGVjdGlvbk5hbWUpIHtcbiAgICAgICAgICAgIGlmIChuYW1lLnRvTG93ZXJDYXNlKCkgPT09IG9wdGlvbnMuY29sbGVjdGlvbk5hbWUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm5hbWVzT25seSkge1xuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uTGlzdC5wdXNoKG5hbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25MaXN0LnB1c2goc2VsZi5fY29sbGVjdGlvbnNbbmFtZV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLm5hbWVzT25seSkge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25MaXN0LnB1c2gobmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25MaXN0LnB1c2goc2VsZi5fY29sbGVjdGlvbnNbbmFtZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhjb2xsZWN0aW9uTGlzdCk7XG4gICAgXG4gICAgcmV0dXJuIGNvbGxlY3Rpb25MaXN0O1xufTtcblxuIC8qKlxuICogR2V0IHRoZSBsaXN0IG9mIGFsbCBjb2xsZWN0aW9uIG5hbWVzIGZvciB0aGUgc3BlY2lmaWVkIGRiLCBcbiAqICBieSBjYWxsaW5nIE1vbmdvUG9ydGFibGUjY29sbGVjdGlvbnMgd2l0aCBbb3B0aW9ucy5uYW1lc09ubHkgPSB0cnVlXVxuICpcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9uTmFtZXNcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9ucy5cbiAqIFxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IFtvcHRpb25zLmNvbGxlY3Rpb25OYW1lPW51bGxdIC0gVGhlIGNvbGxlY3Rpb24gbmFtZSB3ZSB3aXNoIHRvIGZpbHRlciBieS5cbiAqIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICpcbiAqIEByZXR1cm4ge0FycmF5fVxuICogXG4gKiB7QGxpbmsgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9uc31cbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbk5hbWVzID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChjYWxsYmFjaykgJiYgXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICBcbiAgICBpZiAoIW9wdGlvbnMubmFtZXNPbmx5KSBvcHRpb25zLm5hbWVzT25seSA9IHRydWU7XG4gICAgXG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbnMob3B0aW9ucywgY2FsbGJhY2spO1xufTtcblxuXG4vKipcbiAqIENyZWF0ZXMgYSBjb2xsZWN0aW9uIG9uIGEgc2VydmVyIHByZS1hbGxvY2F0aW5nIHNwYWNlLCBuZWVkIHRvIGNyZWF0ZSBmLmV4IGNhcHBlZCBjb2xsZWN0aW9ucy5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gdGhlIGNvbGxlY3Rpb24gbmFtZSB3ZSB3aXNoIHRvIGFjY2Vzcy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSByZXR1cm5zIG9wdGlvbiByZXN1bHRzLlxuICogXG4gKiBAcGFyYW0ge0Jvb2xlYW58T2JqZWN0fSBbb3B0aW9ucy5zYWZlPWZhbHNlXSBFeGVjdXRlcyB3aXRoIGEgZ2V0TGFzdEVycm9yIGNvbW1hbmQgcmV0dXJuaW5nIHRoZSByZXN1bHRzIG9mIHRoZSBjb21tYW5kIG9uIE1vbmdvTW9uZ2xvOlxuICogICAgICA8dWw+XG4gKiAgICAgICAgICA8bGk+dHJ1ZTwvbGk+XG4gKiAgICAgICAgICA8bGk+ZmFsc2U8L2xpPlxuICogICAgICAgICAgPGxpPnsgdzoge051bWJlcn0sIHd0aW1lb3V0OiB7TnVtYmVyfX08L2xpPlxuICogICAgICAgICAgPGxpPnsgZnN5bmM6IHRydWUgfTwvbGk+XG4gKiAgICAgIDwvdWw+XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnNlcmlhbGl6ZUZ1bmN0aW9ucz1mYWxzZV0gLSBTZXJpYWxpemUgZnVuY3Rpb25zIG9uIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMucmF3PWZhbHNlXSAtIFBlcmZvcm0gYWxsIG9wZXJhdGlvbnMgdXNpbmcgcmF3IGJzb24gb2JqZWN0cy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgT2JqZWN0SWQgcHJpbWFyeSBrZXkgZ2VuZXJhdGlvbi5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuY2FwcGVkPWZhbHNlXSAtIENyZWF0ZSBhIGNhcHBlZCBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnNpemU9NDA5Nl0gLSBUaGUgc2l6ZSBvZiB0aGUgY2FwcGVkIGNvbGxlY3Rpb24gaW4gYnl0ZXMuXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWF4PTUwMF0gLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgZG9jdW1lbnRzIGluIHRoZSBjYXBwZWQgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuYXV0b0luZGV4SWQ9ZmFsc2VdIC0gQ3JlYXRlIGFuIGluZGV4IG9uIHRoZSBfaWQgZmllbGQgb2YgdGhlIGRvY3VtZW50LCBub3QgY3JlYXRlZCBhdXRvbWF0aWNhbGx5IG9uIGNhcHBlZCBjb2xsZWN0aW9ucy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5yZWFkUHJlZmVyZW5jZT1SZWFkUHJlZmVyZW5jZS5QUklNQVJZXSAtIFRlIHByZWZlcmVkIHJlYWQgcHJlZmVyZW5jZTpcbiAqICAgICAgPHVsPlxuICogICAgICAgICAgPGxpPlJlYWRQcmVmZXJlbmNlLlBSSU1BUlk8L2xpPlxuICogICAgICAgICAgPGxpPlJlYWRQcmVmZXJlbmNlLlBSSU1BUllfUFJFRkVSUkVEPC9saT5cbiAqICAgICAgICAgIDxsaT5SZWFkUHJlZmVyZW5jZS5TRUNPTkRBUlk8L2xpPlxuICogICAgICAgICAgPGxpPlJlYWRQcmVmZXJlbmNlLlNFQ09OREFSWV9QUkVGRVJSRUQ8L2xpPlxuICogICAgICAgICAgPGxpPlJlYWRQcmVmZXJlbmNlLk5FQVJFU1Q8L2xpPlxuICogICAgICA8L3VsPlxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEBmaXJlcyB7QGxpbmsgTW9uZ29TdG9yZSNjcmVhdGVDb2xsZWN0aW9ufVxuICogXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZXhpc3RpbmcgPSBmYWxzZTtcbiAgICAvLyB2YXIgY29sbGVjdGlvbjtcbiAgICAvLyB2YXIgY29sbGVjdGlvbkZ1bGxOYW1lID0gIHNlbGYuZGF0YWJhc2VOYW1lICsgXCIuXCIgKyBjb2xsZWN0aW9uTmFtZTtcblxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpe1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ29sbGVjdGlvbiBhbHJlYWR5IGluIG1lbW9yeSwgbGV0cyBjcmVhdGUgaXRcbiAgICBpZiAoc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdKSB7XG4gICAgICAgIHNlbGYuZW1pdChcbiAgICAgICAgICAgICdjcmVhdGVDb2xsZWN0aW9uJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uOiBzZWxmLFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIGV4aXN0aW5nID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0gPSBuZXcgQ29sbGVjdGlvbihzZWxmLCBjb2xsZWN0aW9uTmFtZSwgc2VsZi5wa0ZhY3RvcnksIG9wdGlvbnMpO1xuICAgICAgICBzZWxmLmVtaXQoXG4gICAgICAgICAgICAnY3JlYXRlQ29sbGVjdGlvbicsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbjogc2VsZixcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFleGlzdGluZykge1xuICAgICAgICAvLyBMZXR0aW5nIGFjY2VzcyB0aGUgY29sbGVjdGlvbiBieSBNb25nb1BvcnRhYmxlLjxDT0xfTkFNRT5cbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE1vbmdvUG9ydGFibGUucHJvdG90eXBlLCBjb2xsZWN0aW9uTmFtZSwge1xuICAgICAgICAgICAgZW51bWVyYWJsZSA6IHRydWUsXG4gICAgICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8vIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV07XG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0pO1xuXG4gICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIHtAbGluayBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb259XG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNjcmVhdGVDb2xsZWN0aW9uXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmNyZWF0ZUNvbGxlY3Rpb24gPSBNb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9uO1xuXG4vKipcbiAqIERyb3AgYSBjb2xsZWN0aW9uIGZyb20gdGhlIGRhdGFiYXNlLCByZW1vdmluZyBpdCBwZXJtYW5lbnRseS4gTmV3IGFjY2Vzc2VzIHdpbGwgY3JlYXRlIGEgbmV3IGNvbGxlY3Rpb24uXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNkcm9wQ29sbGVjdGlvblxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHdlIHdpc2ggdG8gZHJvcC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge0Jvb2xlYW59IFwidHJ1ZVwiIGlmIGRyb3BwZWQgc3VjY2Vzc2Z1bGx5XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmRyb3BDb2xsZWN0aW9uID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXSkge1xuICAgICAgICAvLyBEcm9wIHRoZSBjb2xsZWN0aW9uXG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICdkcm9wQ29sbGVjdGlvbicsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29ubjogdGhpcyxcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGRlbGV0ZSBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV07XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2sgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgY2FsbGJhY2soKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBtc2cgPSBcIk5vIGNvbGxlY3Rpb24gZm91bmRcIjtcbiAgICAgICAgXG4gICAgICAgIExvZ2dlci5lcnJvcihtc2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG5ldyBFcnJvcihtc2cpKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbmFtZSBhIGNvbGxlY3Rpb24uXG4gKlxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI3JlbmFtZUNvbGxlY3Rpb25cbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IGZyb21Db2xsZWN0aW9uIC0gVGhlIG5hbWUgb2YgdGhlIGN1cnJlbnQgY29sbGVjdGlvbiB3ZSB3aXNoIHRvIHJlbmFtZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSB0b0NvbGxlY3Rpb24gLSBUaGUgbmV3IG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtCb29sZWFufENvbGxlY3Rpb259IFRoZSBjb2xsZWN0aW9uIGlmIHJlbmFtZWQgc3VjY2Vzc2Z1bGx5IG9yIGZhbHNlIGlmIG5vdFxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5yZW5hbWVDb2xsZWN0aW9uID0gZnVuY3Rpb24oZnJvbUNvbGxlY3Rpb24sIHRvQ29sbGVjdGlvbiwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoXy5pc1N0cmluZyhmcm9tQ29sbGVjdGlvbikgJiYgXy5pc1N0cmluZyh0b0NvbGxlY3Rpb24pICYmIGZyb21Db2xsZWN0aW9uICE9PSB0b0NvbGxlY3Rpb24pIHtcbiAgICAgICAgLy8gRXhlY3V0ZSB0aGUgY29tbWFuZCwgcmV0dXJuIHRoZSBuZXcgcmVuYW1lZCBjb2xsZWN0aW9uIGlmIHN1Y2Nlc3NmdWxcbiAgICAgICAgQ29sbGVjdGlvbi5jaGVja0NvbGxlY3Rpb25OYW1lKHRvQ29sbGVjdGlvbik7XG4gICAgICAgIFxuICAgICAgICBpZiAoc2VsZi5fY29sbGVjdGlvbnNbZnJvbUNvbGxlY3Rpb25dKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAgICAgJ3JlbmFtZUNvbGxlY3Rpb24nLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29ubjogc2VsZixcbiAgICAgICAgICAgICAgICAgICAgZnJvbTogZnJvbUNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRvOiB0b0NvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgcmVuYW1lZCA9IHNlbGYuX2NvbGxlY3Rpb25zW2Zyb21Db2xsZWN0aW9uXS5yZW5hbWUodG9Db2xsZWN0aW9uKTtcbiAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb25zLnJlbmFtZVByb3BlcnR5KGZyb21Db2xsZWN0aW9uLCB0b0NvbGxlY3Rpb24pO1xuICAgICAgICAgICAgc2VsZi5yZW5hbWVQcm9wZXJ0eShmcm9tQ29sbGVjdGlvbiwgdG9Db2xsZWN0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG51bGwsIHJlbmFtZWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gcmVuYW1lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBtc2cgPSBcIk5vIGNvbGxlY3Rpb24gZm91bmRcIjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgTG9nZ2VyLmVycm9yKG1zZyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhuZXcgRXJyb3IobXNnKSwgbnVsbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBtc2cgPSBcIlRoZSBwYXJhbXMgYXJlIGludmFsaWRcIjtcbiAgICAgICAgXG4gICAgICAgIExvZ2dlci5lcnJvcihtc2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG5ldyBFcnJvcihtc2cpLCBudWxsKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogQ3JlYXRlcyBhbiBpbmRleCBvbiB0aGUgY29sbGVjdGlvbi5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NyZWF0ZUluZGV4XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gTmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0byBjcmVhdGUgdGhlIGluZGV4IG9uLlxuICogQHBhcmFtIHtPYmplY3R9IGZpZWxkT3JTcGVjIC0gRmllbGRPclNwZWMgdGhhdCBkZWZpbmVzIHRoZSBpbmRleC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnMgZHVyaW5nIHVwZGF0ZS5cbiAqIFxuICogQHBhcmFtIHtCb29sZWFufE9iamVjdH0gW29wdGlvbnMuc2FmZT1mYWxzZV0gRXhlY3V0ZXMgd2l0aCBhIGdldExhc3RFcnJvciBjb21tYW5kIHJldHVybmluZyB0aGUgcmVzdWx0cyBvZiB0aGUgY29tbWFuZCBvbiBNb25nb01vbmdsbzpcbiAqICAgICAgPHVsPlxuICogICAgICAgICAgPGxpPnRydWU8L2xpPlxuICogICAgICAgICAgPGxpPmZhbHNlPC9saT5cbiAqICAgICAgICAgIDxsaT57IHc6IHtOdW1iZXJ9LCB3dGltZW91dDoge051bWJlcn19PC9saT5cbiAqICAgICAgICAgIDxsaT57IGZzeW5jOiB0cnVlIH08L2xpPlxuICogICAgICA8L3VsPiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMudW5pcXVlPWZhbHNlXSAtIENyZWF0ZXMgYW4gdW5pcXVlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnNwYXJzZT1mYWxzZV0gLSBDcmVhdGVzIGEgc3BhcnNlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmJhY2tncm91bmQ9ZmFsc2VdIC0gQ3JlYXRlcyB0aGUgaW5kZXggaW4gdGhlIGJhY2tncm91bmQsIHlpZWxkaW5nIHdoZW5ldmVyIHBvc3NpYmxlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmRyb3BEdXBzPWZhbHNlXSAtIEEgdW5pcXVlIGluZGV4IGNhbm5vdCBiZSBjcmVhdGVkIG9uIGEga2V5IHRoYXQgaGFzIHByZS1leGlzdGluZyBkdXBsaWNhdGUgdmFsdWVzLiBJZiB5b3Ugd291bGQgbGlrZSB0byBjcmVhdGUgdGhlIGluZGV4IGFueXdheSwga2VlcGluZyB0aGUgZmlyc3QgZG9jdW1lbnQgdGhlIGRhdGFiYXNlIGluZGV4ZXMgYW5kIGRlbGV0aW5nIGFsbCBzdWJzZXF1ZW50IGRvY3VtZW50cyB0aGF0IGhhdmUgZHVwbGljYXRlIHZhbHVlXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWluPW51bGxdIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGxvd2VyIGJvdW5kIGZvciB0aGUgY28tb3JkaW5hdGVzXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWF4PW51bGxdIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGhpZ2ggYm91bmQgZm9yIHRoZSBjby1vcmRpbmF0ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy52PW51bGxdIC0gU3BlY2lmeSB0aGUgZm9ybWF0IHZlcnNpb24gb2YgdGhlIGluZGV4ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5leHBpcmVBZnRlclNlY29uZHM9bnVsbF0gLSBBbGxvd3MgeW91IHRvIGV4cGlyZSBkYXRhIG9uIGluZGV4ZXMgYXBwbGllZCB0byBhIGRhdGEgKE1vbmdvREIgMi4yIG9yIGhpZ2hlcilcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5uYW1lPW51bGxdIC0gT3ZlcnJpZGUgdGhlIGF1dG9nZW5lcmF0ZWQgaW5kZXggbmFtZSAodXNlZnVsIGlmIHRoZSByZXN1bHRpbmcgbmFtZSBpcyBsYXJnZXIgdGhhbiAxMjggYnl0ZXMpXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY3JlYXRlSW5kZXggPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgZmllbGRPclNwZWMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQgeWV0IScpO1xufTtcblxuLyoqXG4gKiBFbnN1cmVzIHRoYXQgYW4gaW5kZXggZXhpc3RzLCBpZiBpdCBkb2VzIG5vdCBpdCBjcmVhdGVzIGl0XG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNlbnN1cmVJbmRleFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIE5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdG8gY3JlYXRlIHRoZSBpbmRleCBvbi5cbiAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZE9yU3BlYyAtIEZpZWxkT3JTcGVjIHRoYXQgZGVmaW5lcyB0aGUgaW5kZXguXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zIGR1cmluZyB1cGRhdGUuXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbnxPYmplY3R9IFtvcHRpb25zLnNhZmU9ZmFsc2VdIC0gRXhlY3V0ZXMgd2l0aCBhIGdldExhc3RFcnJvciBjb21tYW5kIHJldHVybmluZyB0aGUgcmVzdWx0cyBvZiB0aGUgY29tbWFuZCBvbiBNb25nb01vbmdsbzpcbiAqICAgICAgPHVsPlxuICogICAgICAgICAgPGxpPnRydWU8L2xpPlxuICogICAgICAgICAgPGxpPmZhbHNlPC9saT5cbiAqICAgICAgICAgIDxsaT57IHc6IHtOdW1iZXJ9LCB3dGltZW91dDoge051bWJlcn19PC9saT5cbiAqICAgICAgICAgIDxsaT57IGZzeW5jOiB0cnVlIH08L2xpPlxuICogICAgICA8L3VsPlxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy51bmlxdWU9ZmFsc2VdIC0gQ3JlYXRlcyBhbiB1bmlxdWUgaW5kZXhcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuc3BhcnNlPWZhbHNlXSAtIENyZWF0ZXMgYSBzcGFyc2UgaW5kZXhcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuYmFja2dyb3VuZD1mYWxzZV0gLSBDcmVhdGVzIHRoZSBpbmRleCBpbiB0aGUgYmFja2dyb3VuZCwgeWllbGRpbmcgd2hlbmV2ZXIgcG9zc2libGVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuZHJvcER1cHM9ZmFsc2VdIC0gQSB1bmlxdWUgaW5kZXggY2Fubm90IGJlIGNyZWF0ZWQgb24gYSBrZXkgdGhhdCBoYXMgcHJlLWV4aXN0aW5nIGR1cGxpY2F0ZSB2YWx1ZXMuIElmIHlvdSB3b3VsZCBsaWtlIHRvIGNyZWF0ZSB0aGUgaW5kZXggYW55d2F5LCBrZWVwaW5nIHRoZSBmaXJzdCBkb2N1bWVudCB0aGUgZGF0YWJhc2UgaW5kZXhlcyBhbmQgZGVsZXRpbmcgYWxsIHN1YnNlcXVlbnQgZG9jdW1lbnRzIHRoYXQgaGF2ZSBkdXBsaWNhdGUgdmFsdWVcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5taW5dIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGxvd2VyIGJvdW5kIGZvciB0aGUgY28tb3JkaW5hdGVzXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWF4XSAtIEZvciBnZW9zcGF0aWFsIGluZGV4ZXMgc2V0IHRoZSBoaWdoIGJvdW5kIGZvciB0aGUgY28tb3JkaW5hdGVzXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudl0gLSBTcGVjaWZ5IHRoZSBmb3JtYXQgdmVyc2lvbiBvZiB0aGUgaW5kZXhlc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmV4cGlyZUFmdGVyU2Vjb25kc10gLSBBbGxvd3MgeW91IHRvIGV4cGlyZSBkYXRhIG9uIGluZGV4ZXMgYXBwbGllZCB0byBhIGRhdGEgKE1vbmdvREIgMi4yIG9yIGhpZ2hlcilcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5uYW1lXSAtIE92ZXJyaWRlIHRoZSBhdXRvZ2VuZXJhdGVkIGluZGV4IG5hbWUgKHVzZWZ1bCBpZiB0aGUgcmVzdWx0aW5nIG5hbWUgaXMgbGFyZ2VyIHRoYW4gMTI4IGJ5dGVzKVxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmVuc3VyZUluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGZpZWxkT3JTcGVjLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkIHlldCEnKTtcbn07XG5cbi8qKlxuICogRHJvcCBhbiBpbmRleCBvbiBhIGNvbGxlY3Rpb24uXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNkcm9wSW5kZXhcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB3aGVyZSB0aGUgY29tbWFuZCB3aWxsIGRyb3AgYW4gaW5kZXguXG4gKiBAcGFyYW0ge1N0cmluZ30gaW5kZXhOYW1lIC0gTmFtZSBvZiB0aGUgaW5kZXggdG8gZHJvcC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZHJvcEluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGluZGV4TmFtZSwgY2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCB5ZXQhJyk7XG59O1xuXG4vKipcbiAqIFJlaW5kZXggYWxsIGluZGV4ZXMgb24gdGhlIGNvbGxlY3Rpb25cbiAqIFdhcm5pbmc6IFwicmVJbmRleFwiIGlzIGEgYmxvY2tpbmcgb3BlcmF0aW9uIChpbmRleGVzIGFyZSByZWJ1aWx0IGluIHRoZSBmb3JlZ3JvdW5kKSBhbmQgd2lsbCBiZSBzbG93IGZvciBsYXJnZSBjb2xsZWN0aW9ucy5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI3JlSW5kZXhcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0byByZWluZGV4XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5yZUluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQgeWV0IScpO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhpcyBjb2xsZWN0aW9ucyBpbmRleCBpbmZvLlxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjaW5kZXhJbmZvcm1hdGlvblxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBBZGRpdGlvbmFsIG9wdGlvbnMgZHVyaW5nIHVwZGF0ZS5cbiAqIFxuICogQHBhcmFtIHtCb29sZWFufSBbZnVsbD1mYWxzZV0gLSBSZXR1cm5zIHRoZSBmdWxsIHJhdyBpbmRleCBpbmZvcm1hdGlvbi5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbcmVhZFByZWZlcmVuY2VdIC0gVGhlIHByZWZlcnJlZCByZWFkIHByZWZlcmVuY2UgKChTZXJ2ZXIuUFJJTUFSWSwgU2VydmVyLlBSSU1BUllfUFJFRkVSUkVELCBTZXJ2ZXIuU0VDT05EQVJZLCBTZXJ2ZXIuU0VDT05EQVJZX1BSRUZFUlJFRCwgU2VydmVyLk5FQVJFU1QpLlxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmluZGV4SW5mb3JtYXRpb24gPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCB5ZXQhJyk7XG59O1xuXG4vKipcbiAqIERyb3AgdGhlIHdob2xlIGRhdGFiYXNlLlxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjZHJvcERhdGFiYXNlXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJuIHtCb29sZWFufSBcInRydWVcIiBpZiBkcm9wcGVkIHN1Y2Nlc3NmdWxseVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5kcm9wRGF0YWJhc2UgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmIChNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zW3RoaXMuZGF0YWJhc2VOYW1lXSkge1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAnZHJvcERhdGFiYXNlJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25uOiB0aGlzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBkZWxldGUgTW9uZ29Qb3J0YWJsZS5jb25uZWN0aW9uc1t0aGlzLmRhdGFiYXNlTmFtZV07XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9jb2xsZWN0aW9ucyA9IFtdO1xuICAgICAgICB0aGlzLl9zdG9yZXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhudWxsLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBtc2cgPSAnVGhhdCBkYXRhYmFzZSBubyBsb25nZXIgZXhpc3RzJztcbiAgICAgICAgXG4gICAgICAgIExvZ2dlci5lcnJvcihtc2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG5ldyBFcnJvcihtc2cpLCBmYWxzZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLyoqXG4gKiBEZXJlZmVyZW5jZSBhIGRicmVmLCBhZ2FpbnN0IGEgZGJcbiAqXG4gKiBAcGFyYW0ge0RCUmVmfSBkYlJlZiBkYiByZWZlcmVuY2Ugb2JqZWN0IHdlIHdpc2ggdG8gcmVzb2x2ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEB0b2RvIE5vdCBpbXBsZW1lbnRlZCB5ZXRcbiAqIFxuICogQGlnbm9yZVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5kZXJlZmVyZW5jZSA9IGZ1bmN0aW9uKGRiUmVmLCBjYWxsYmFjaykge1xuICAgIC8vIFRPRE9cbiAgICAvLyB2YXIgZGIgPSB0aGlzO1xuXG4gICAgLy8gLy8gSWYgd2UgaGF2ZSBhIGRiIHJlZmVyZW5jZSB0aGVuIGxldCdzIGdldCB0aGUgZGIgZmlyc3RcbiAgICAvLyBpZiAoZGJSZWYuZGIgIT09IG51bGwpIGRiID0gdGhpcy5kYihkYlJlZi5kYik7XG5cbiAgICAvLyAvLyBGZXRjaCB0aGUgY29sbGVjdGlvbiBhbmQgZmluZCB0aGUgcmVmZXJlbmNlXG4gICAgLy8gdmFyIGNvbGxlY3Rpb24gPSBNb25nbG8uY29sbGVjdGlvbihkYlJlZi5uYW1lc3BhY2UpO1xuXG4gICAgLy8gY29sbGVjdGlvbi5maW5kT25lKHsnX2lkJzpkYlJlZi5vaWR9LCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgIC8vICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdCk7XG4gICAgLy8gfSk7XG59O1xuXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoZSBkYXRhYmFzZSBuYW1lXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNfdmFsaWRhdGVEYXRhYmFzZU5hbWVcbiAqIEBwcml2YXRlXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhYmFzZU5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgZGF0YWJhc2UgdG8gdmFsaWRhdGVcbiAqIFxuICogQHJldHVybiB7Qm9vbGVhbn0gXCJ0cnVlXCIgaWYgdGhlIG5hbWUgaXMgdmFsaWRcbiAqL1xudmFyIF92YWxpZGF0ZURhdGFiYXNlTmFtZSA9IGZ1bmN0aW9uKGRhdGFiYXNlTmFtZSkge1xuICAgIGlmICghXy5pc1N0cmluZyhkYXRhYmFzZU5hbWUpKSB0aHJvdyBuZXcgRXJyb3IoXCJkYXRhYmFzZSBuYW1lIG11c3QgYmUgYSBzdHJpbmdcIik7XG5cbiAgICBpZiAoZGF0YWJhc2VOYW1lLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKFwiZGF0YWJhc2UgbmFtZSBjYW5ub3QgYmUgdGhlIGVtcHR5IHN0cmluZ1wiKTtcblxuICAgIHZhciBpbnZhbGlkQ2hhcnMgPSBbXCIgXCIsIFwiLlwiLCBcIiRcIiwgXCIvXCIsIFwiXFxcXFwiXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgaW52YWxpZENoYXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmKGRhdGFiYXNlTmFtZS5pbmRleE9mKGludmFsaWRDaGFyc1tpXSkgIT0gLTEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImRhdGFiYXNlIG5hbWVzIGNhbm5vdCBjb250YWluIHRoZSBjaGFyYWN0ZXIgJ1wiICsgaW52YWxpZENoYXJzW2ldICsgXCInXCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0cnVlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb25nb1BvcnRhYmxlO1xuXG4vKipcbiAqIFJlbmFtZXMgYW4gb2JqZWN0IHByb3BlcnR5LlxuICogXG4gKiBAbWV0aG9kIE9iamVjdCNyZW5hbWVQcm9wZXJ0eVxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gb2xkTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB0byByZW5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBuZXdOYW1lIC0gVGhlIG5ldyBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxuICogXG4gKiBAcmV0dXJucyB7dGhpc30gVGhlIGNhbGxlZCBvYmplY3RcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFxuICAgIE9iamVjdC5wcm90b3R5cGUsIFxuICAgICdyZW5hbWVQcm9wZXJ0eScsXG4gICAge1xuICAgICAgICB3cml0YWJsZSA6IGZhbHNlLCAvLyBDYW5ub3QgYWx0ZXIgdGhpcyBwcm9wZXJ0eVxuICAgICAgICBlbnVtZXJhYmxlIDogZmFsc2UsIC8vIFdpbGwgbm90IHNob3cgdXAgaW4gYSBmb3ItaW4gbG9vcC5cbiAgICAgICAgY29uZmlndXJhYmxlIDogZmFsc2UsIC8vIENhbm5vdCBiZSBkZWxldGVkIHZpYSB0aGUgZGVsZXRlIG9wZXJhdG9yXG4gICAgICAgIHZhbHVlIDogZnVuY3Rpb24gKG9sZE5hbWUsIG5ld05hbWUpIHtcbiAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhvbGROYW1lKSB8fCAhXy5pc1N0cmluZyhuZXdOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nIGlmIHRoZSBuYW1lcyBhcmUgdGhlIHNhbWVcbiAgICAgICAgICAgIGlmIChvbGROYW1lID09IG5ld05hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHRoZSBvbGQgcHJvcGVydHkgbmFtZSB0byBcbiAgICAgICAgICAgIC8vIGF2b2lkIGEgUmVmZXJlbmNlRXJyb3IgaW4gc3RyaWN0IG1vZGUuXG4gICAgICAgICAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShvbGROYW1lKSkge1xuICAgICAgICAgICAgICAgIHRoaXNbbmV3TmFtZV0gPSB0aGlzW29sZE5hbWVdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzW29sZE5hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbik7Il19
