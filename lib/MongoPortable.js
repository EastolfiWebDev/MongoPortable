'use strict';

/**
 * @file MongoPortable.js - based on Monglo ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 0.0.1
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */
var _ = require('lodash'),
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
var MongoPortable = function MongoPortable(databaseName) {
    if (!(this instanceof MongoPortable)) return new MongoPortable(databaseName);

    // Check ddbb name format
    _validateDatabaseName(databaseName);

    // Initializing variables
    this._collections = {};
    this._stores = [];

    if (!MongoPortable.connections) {
        MongoPortable.connections = {};
    }

    //Temp patch until I figure out how far I want to take the implementation;
    // FIXME
    if (MongoPortable.connections[databaseName]) {
        throw new Error('db name already in use');
    }

    this.databaseName = databaseName;

    MongoPortable.connections[databaseName] = new ObjectId();
};

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
 * Emits an event over all the stores loaded
 * 
 * @method MongoPortable#_emit
 * @private
 * 
 * @param  {String} name - Name of the event to fire
 * @param  {Object} args - Parameters to pass with the event
 * @param {Function} [cb=null] - Callback function to be called at the end with the results
 */
MongoPortable.prototype._emit = function (name, args, cb) {
    var self = this;
    var command = name;

    // Send event to all the stores registered
    _.forEach(self._stores, function (fn) {
        if ('function' === typeof fn[command]) {
            fn[command](args, cb);
        } else if ('function' === typeof fn.all) {
            args.name = name;
            fn.all(args, cb);
        }
    });
};

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
        self._emit('createCollection', {
            connection: self,
            collection: self._collections[collectionName]
        });

        existing = true;
    } else {
        self._collections[collectionName] = new Collection(self, collectionName, self.pkFactory, options);
        self._emit('createCollection', {
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
        this._emit('dropCollection', {
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
            this._emit('renameCollection', {
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
        this._emit('dropDatabase', {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9Nb25nb1BvcnRhYmxlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFRQSxJQUFJLElBQUksUUFBUSxRQUFSLENBQVI7SUFDSSxXQUFXLFFBQVEsWUFBUixDQURmO0lBRUksYUFBYSxRQUFRLGNBQVIsQ0FGakI7SUFHSSxTQUFTLFFBQVEsZ0JBQVIsQ0FIYjs7Ozs7Ozs7Ozs7OztBQWdCQSxJQUFJLGdCQUFnQixTQUFoQixhQUFnQixDQUFTLFlBQVQsRUFBdUI7QUFDdkMsUUFBSSxFQUFFLGdCQUFnQixhQUFsQixDQUFKLEVBQXNDLE9BQU8sSUFBSSxhQUFKLENBQWtCLFlBQWxCLENBQVA7OztBQUd0QywwQkFBc0IsWUFBdEI7OztBQUdBLFNBQUssWUFBTCxHQUFvQixFQUFwQjtBQUNBLFNBQUssT0FBTCxHQUFlLEVBQWY7O0FBRUEsUUFBSSxDQUFDLGNBQWMsV0FBbkIsRUFBZ0M7QUFDNUIsc0JBQWMsV0FBZCxHQUE0QixFQUE1QjtBQUNIOzs7O0FBSUQsUUFBSSxjQUFjLFdBQWQsQ0FBMEIsWUFBMUIsQ0FBSixFQUE2QztBQUN6QyxjQUFNLElBQUksS0FBSixDQUFVLHdCQUFWLENBQU47QUFDSDs7QUFFRCxTQUFLLFlBQUwsR0FBb0IsWUFBcEI7O0FBRUEsa0JBQWMsV0FBZCxDQUEwQixZQUExQixJQUEwQyxJQUFJLFFBQUosRUFBMUM7QUFDSCxDQXZCRDs7Ozs7Ozs7QUErQkEsY0FBYyxXQUFkLEdBQTRCLEVBQTVCOzs7Ozs7Ozs7O0FBVUEsY0FBYyxPQUFkLEdBQXdCLE9BQXhCOzs7Ozs7Ozs7Ozs7QUFZQSxjQUFjLFNBQWQsQ0FBd0IsS0FBeEIsR0FBZ0MsVUFBUyxJQUFULEVBQWUsSUFBZixFQUFxQixFQUFyQixFQUF5QjtBQUNyRCxRQUFJLE9BQU8sSUFBWDtBQUNBLFFBQUksVUFBVSxJQUFkOzs7QUFHQSxNQUFFLE9BQUYsQ0FBVSxLQUFLLE9BQWYsRUFBd0IsVUFBUyxFQUFULEVBQWE7QUFDakMsWUFBSSxl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QyxHQUF4QyxFQUE2QztBQUN6QyxZQUFHLGFBQWEsT0FBYixDQUFxQixhQUFhLENBQWIsQ0FBckIsS0FBeUMsQ0FBQyxDQUE3QyxFQUFnRDtBQUM1QyxrQkFBTSxJQUFJLEtBQUosQ0FBVSxrREFBa0QsYUFBYSxDQUFiLENBQWxELEdBQW9FLEdBQTlFLENBQU47QUFDSDtBQUNKOztBQUVELFdBQU8sSUFBUDtBQUNILENBYkQ7O0FBZUEsT0FBTyxPQUFQLEdBQWlCLGFBQWpCOzs7Ozs7Ozs7Ozs7QUFZQSxPQUFPLGNBQVAsQ0FDSSxPQUFPLFNBRFgsRUFFSSxnQkFGSixFQUdJO0FBQ0ksY0FBVyxLQURmLEU7QUFFSSxnQkFBYSxLQUZqQixFO0FBR0ksa0JBQWUsS0FIbkIsRTtBQUlJLFdBQVEsZUFBVSxPQUFWLEVBQW1CLE9BQW5CLEVBQTRCO0FBQ2hDLFlBQUksQ0FBQyxFQUFFLFFBQUYsQ0FBVyxPQUFYLENBQUQsSUFBd0IsQ0FBQyxFQUFFLFFBQUYsQ0FBVyxPQUFYLENBQTdCLEVBQWtEO0FBQzlDLG1CQUFPLElBQVA7QUFDSDs7O0FBR0QsWUFBSSxXQUFXLE9BQWYsRUFBd0I7QUFDcEIsbUJBQU8sSUFBUDtBQUNIOzs7O0FBSUQsWUFBSSxLQUFLLGNBQUwsQ0FBb0IsT0FBcEIsQ0FBSixFQUFrQztBQUM5QixpQkFBSyxPQUFMLElBQWdCLEtBQUssT0FBTCxDQUFoQjtBQUNBLG1CQUFPLEtBQUssT0FBTCxDQUFQO0FBQ0g7O0FBRUQsZUFBTyxJQUFQO0FBQ0g7QUF0QkwsQ0FISiIsImZpbGUiOiJNb25nb1BvcnRhYmxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBNb25nb1BvcnRhYmxlLmpzIC0gYmFzZWQgb24gTW9uZ2xvICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDAuMC4xXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xudmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKSxcbiAgICBPYmplY3RJZCA9IHJlcXVpcmUoJy4vT2JqZWN0SWQnKSxcbiAgICBDb2xsZWN0aW9uID0gcmVxdWlyZSgnLi9Db2xsZWN0aW9uJyksXG4gICAgTG9nZ2VyID0gcmVxdWlyZShcIi4vdXRpbHMvTG9nZ2VyXCIpO1xuICAgIFxuLyoqXG4gKiBNb25nb1BvcnRhYmxlXG4gKiBcbiAqIEBtb2R1bGUgTW9uZ29Qb3J0YWJsZVxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2luY2UgMC4wLjFcbiAqIFxuICogQGNsYXNzZGVzYyBQb3J0YWJsZSBkYXRhYmFzZSB3aXRoIHBlcnNpc3RlbmNlIGFuZCBNb25nb0RCLWxpa2UgQVBJXG4gKiBcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhYmFzZU5hbWUgLSBOYW1lIG9mIHRoZSBkYXRhYmFzZS5cbiAqL1xudmFyIE1vbmdvUG9ydGFibGUgPSBmdW5jdGlvbihkYXRhYmFzZU5hbWUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTW9uZ29Qb3J0YWJsZSkpIHJldHVybiBuZXcgTW9uZ29Qb3J0YWJsZShkYXRhYmFzZU5hbWUpO1xuICAgIFxuICAgIC8vIENoZWNrIGRkYmIgbmFtZSBmb3JtYXRcbiAgICBfdmFsaWRhdGVEYXRhYmFzZU5hbWUoZGF0YWJhc2VOYW1lKTtcblxuICAgIC8vIEluaXRpYWxpemluZyB2YXJpYWJsZXNcbiAgICB0aGlzLl9jb2xsZWN0aW9ucyA9IHt9O1xuICAgIHRoaXMuX3N0b3JlcyA9IFtdO1xuXG4gICAgaWYgKCFNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zKSB7XG4gICAgICAgIE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICAvL1RlbXAgcGF0Y2ggdW50aWwgSSBmaWd1cmUgb3V0IGhvdyBmYXIgSSB3YW50IHRvIHRha2UgdGhlIGltcGxlbWVudGF0aW9uO1xuICAgIC8vIEZJWE1FXG4gICAgaWYgKE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnNbZGF0YWJhc2VOYW1lXSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2RiIG5hbWUgYWxyZWFkeSBpbiB1c2UnKTtcbiAgICB9XG5cbiAgICB0aGlzLmRhdGFiYXNlTmFtZSA9IGRhdGFiYXNlTmFtZTtcblxuICAgIE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnNbZGF0YWJhc2VOYW1lXSA9IG5ldyBPYmplY3RJZCgpO1xufTtcblxuLyoqXG4gKiBDb25uZWN0aW9uIFBvb2xcbiAqIFxuICogQG1lbWJlcm9mIE1vbmdvUG9ydGFibGVcbiAqIEBzdGF0aWNcbiAqL1xuTW9uZ29Qb3J0YWJsZS5jb25uZWN0aW9ucyA9IHt9O1xuXG4vLyBNb25nb1BvcnRhYmxlLnByb3RvdHlwZS5fX3Byb3RvX18gPSBFdmVudEVtaXR0ZXIucHJvdG87XG5cbi8qKlxuICogVmVyc2lvbiBOdW1iZXJcbiAqIFxuICogQG1lbWJlcm9mIE1vbmdvUG9ydGFibGVcbiAqIEBzdGF0aWNcbiAqL1xuTW9uZ29Qb3J0YWJsZS52ZXJzaW9uID0gJzAuMC4xJztcblxuLyoqXG4gKiBFbWl0cyBhbiBldmVudCBvdmVyIGFsbCB0aGUgc3RvcmVzIGxvYWRlZFxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjX2VtaXRcbiAqIEBwcml2YXRlXG4gKiBcbiAqIEBwYXJhbSAge1N0cmluZ30gbmFtZSAtIE5hbWUgb2YgdGhlIGV2ZW50IHRvIGZpcmVcbiAqIEBwYXJhbSAge09iamVjdH0gYXJncyAtIFBhcmFtZXRlcnMgdG8gcGFzcyB3aXRoIHRoZSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5fZW1pdCA9IGZ1bmN0aW9uKG5hbWUsIGFyZ3MsIGNiKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBjb21tYW5kID0gbmFtZTtcblxuICAgIC8vIFNlbmQgZXZlbnQgdG8gYWxsIHRoZSBzdG9yZXMgcmVnaXN0ZXJlZFxuICAgIF8uZm9yRWFjaChzZWxmLl9zdG9yZXMsIGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgZm5bY29tbWFuZF0pIHtcbiAgICAgICAgICAgIGZuW2NvbW1hbmRdKGFyZ3MsIGNiKTtcbiAgICAgICAgfSBlbHNlIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgZm4uYWxsKSB7XG4gICAgICAgICAgICBhcmdzLm5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgZm4uYWxsKGFyZ3MsIGNiKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBNaWRkbGV3YXJlIGZ1bmN0aW9uc1xuICogXG4gKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWUgLSBOYW1lIG9mIHRoZSBtaWRkbGV3YXJlOlxuICogICAgICA8dWw+XG4gKiAgICAgICAgICA8bGk+XCJzdG9yZVwiOiBBZGQgYSBjdXN0b20gc3RvcmU8L2xpPlxuICogICAgICA8L3VsPlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuIC0gRnVuY3Rpb24gdG8gaW1wbGVtZW50IHRoZSBtaWRkbGV3YXJlXG4gKi9cblxuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgICBzd2l0Y2gobmFtZSkge1xuICAgICAgICBjYXNlICdzdG9yZSc6XG4gICAgICAgICAgICB0aGlzLl9zdG9yZXMucHVzaChmbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG59O1xuXG4vKipcbiAqIEFkZHMgYSBjdXN0b20gc3RvcmVzIGZvciByZW1vdGUgYW5kIGxvY2FsIHBlcnNpc3RlbmNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R8RnVuY3Rpb259IHN0b3JlIC0gVGhlIGN1c3RvbSBzdG9yZVxuICogXG4gKiBAcmV0dXJucyB7TW9uZ29Qb3J0YWJsZX0gdGhpcyAtIFRoZSBjdXJyZW50IEluc3RhbmNlXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmFkZFN0b3JlID0gZnVuY3Rpb24gKHN0b3JlKSB7XG4gICAgaWYgKF8uaXNOaWwoc3RvcmUpKSB0aHJvdyBuZXcgRXJyb3IoXCJzdG9yZSBtdXN0IGJlIGluY2x1ZGVkXCIpO1xuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc3RvcmUpKSB7XG4gICAgICAgIHRoaXMuX3N0b3Jlcy5wdXNoKG5ldyBzdG9yZSgpKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNQbGFpbk9iamVjdChzdG9yZSkpIHtcbiAgICAgICAgdGhpcy5fc3RvcmVzLnB1c2goc3RvcmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInN0b3JlIG11c3QgYmUgYSBmdW5jdGlvbiBvciBvYmplY3RcIik7XG4gICAgfVxuICAgIFxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBjdXJzb3IgdG8gYWxsIHRoZSBjb2xsZWN0aW9uIGluZm9ybWF0aW9uLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbY29sbGVjdGlvbk5hbWU9bnVsbF0gLSB0aGUgY29sbGVjdGlvbiBuYW1lIHdlIHdpc2ggdG8gcmV0cmlldmUgdGhlIGluZm9ybWF0aW9uIGZyb20uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqIFxuICogQHRvZG8gTm90IGltcGxlbWVudGVkIHlldFxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9uc0luZm8gPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgY2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQgeWV0XCIpO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3Ige0BsaW5rIE1vbmdvUG9ydGFibGUjY29sbGVjdGlvbnN9XG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNmZXRjaENvbGxlY3Rpb25zXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmZldGNoQ29sbGVjdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb25zKG9wdGlvbnMsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSBsaXN0IG9mIGFsbCBjb2xsZWN0aW9uIGZvciB0aGUgc3BlY2lmaWVkIGRiXG4gKlxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25zXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5uYW1lc09ubHk9ZmFsc2VdIC0gUmV0dXJuIG9ubHkgdGhlIGNvbGxlY3Rpb25zIG5hbWVzXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gW29wdGlvbnMuY29sbGVjdGlvbk5hbWU9bnVsbF0gLSBUaGUgY29sbGVjdGlvbiBuYW1lIHdlIHdpc2ggdG8gZmlsdGVyIGJ5XG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmNvbGxlY3Rpb25zID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoXy5pc05pbChjYWxsYmFjaykgJiYgXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICB9XG4gICAgXG4gICAgaWYgKF8uaXNOaWwob3B0aW9ucykpIG9wdGlvbnMgPSB7fTtcbiAgICBcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXG4gICAgdmFyIGNvbGxlY3Rpb25MaXN0ID0gW107XG4gICAgZm9yICh2YXIgbmFtZSBpbiBzZWxmLl9jb2xsZWN0aW9ucykge1xuICAgICAgICAvLyBPbmx5IGFkZCB0aGUgcmVxdWVzdGVkIGNvbGxlY3Rpb25zIC8vVE9ETyBBZGQgYXJyYXkgdHlwZVxuICAgICAgICBpZiAob3B0aW9ucy5jb2xsZWN0aW9uTmFtZSkge1xuICAgICAgICAgICAgaWYgKG5hbWUudG9Mb3dlckNhc2UoKSA9PT0gb3B0aW9ucy5jb2xsZWN0aW9uTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMubmFtZXNPbmx5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25MaXN0LnB1c2gobmFtZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbkxpc3QucHVzaChzZWxmLl9jb2xsZWN0aW9uc1tuYW1lXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubmFtZXNPbmx5KSB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbkxpc3QucHVzaChuYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbkxpc3QucHVzaChzZWxmLl9jb2xsZWN0aW9uc1tuYW1lXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGNvbGxlY3Rpb25MaXN0KTtcbiAgICBcbiAgICByZXR1cm4gY29sbGVjdGlvbkxpc3Q7XG59O1xuXG4gLyoqXG4gKiBHZXQgdGhlIGxpc3Qgb2YgYWxsIGNvbGxlY3Rpb24gbmFtZXMgZm9yIHRoZSBzcGVjaWZpZWQgZGIsIFxuICogIGJ5IGNhbGxpbmcgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9ucyB3aXRoIFtvcHRpb25zLm5hbWVzT25seSA9IHRydWVdXG4gKlxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25OYW1lc1xuICogXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zLlxuICogXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gW29wdGlvbnMuY29sbGVjdGlvbk5hbWU9bnVsbF0gLSBUaGUgY29sbGVjdGlvbiBuYW1lIHdlIHdpc2ggdG8gZmlsdGVyIGJ5LlxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKlxuICogQHJldHVybiB7QXJyYXl9XG4gKiBcbiAqIHtAbGluayBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25zfVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9uTmFtZXMgPSBmdW5jdGlvbihvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmIChfLmlzTmlsKGNhbGxiYWNrKSAmJiBfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIH1cbiAgICBcbiAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgIFxuICAgIGlmICghb3B0aW9ucy5uYW1lc09ubHkpIG9wdGlvbnMubmFtZXNPbmx5ID0gdHJ1ZTtcbiAgICBcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9ucyhvcHRpb25zLCBjYWxsYmFjayk7XG59O1xuXG5cbi8qKlxuICogQ3JlYXRlcyBhIGNvbGxlY3Rpb24gb24gYSBzZXJ2ZXIgcHJlLWFsbG9jYXRpbmcgc3BhY2UsIG5lZWQgdG8gY3JlYXRlIGYuZXggY2FwcGVkIGNvbGxlY3Rpb25zLlxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjY29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSB0aGUgY29sbGVjdGlvbiBuYW1lIHdlIHdpc2ggdG8gYWNjZXNzLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIHJldHVybnMgb3B0aW9uIHJlc3VsdHMuXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbnxPYmplY3R9IFtvcHRpb25zLnNhZmU9ZmFsc2VdIEV4ZWN1dGVzIHdpdGggYSBnZXRMYXN0RXJyb3IgY29tbWFuZCByZXR1cm5pbmcgdGhlIHJlc3VsdHMgb2YgdGhlIGNvbW1hbmQgb24gTW9uZ29Nb25nbG86XG4gKiAgICAgIDx1bD5cbiAqICAgICAgICAgIDxsaT50cnVlPC9saT5cbiAqICAgICAgICAgIDxsaT5mYWxzZTwvbGk+XG4gKiAgICAgICAgICA8bGk+eyB3OiB7TnVtYmVyfSwgd3RpbWVvdXQ6IHtOdW1iZXJ9fTwvbGk+XG4gKiAgICAgICAgICA8bGk+eyBmc3luYzogdHJ1ZSB9PC9saT5cbiAqICAgICAgPC91bD5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuc2VyaWFsaXplRnVuY3Rpb25zPWZhbHNlXSAtIFNlcmlhbGl6ZSBmdW5jdGlvbnMgb24gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5yYXc9ZmFsc2VdIC0gUGVyZm9ybSBhbGwgb3BlcmF0aW9ucyB1c2luZyByYXcgYnNvbiBvYmplY3RzLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLnBrRmFjdG9yeT1udWxsXSAtIE9iamVjdCBvdmVycmlkaW5nIHRoZSBiYXNpYyBPYmplY3RJZCBwcmltYXJ5IGtleSBnZW5lcmF0aW9uLlxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5jYXBwZWQ9ZmFsc2VdIC0gQ3JlYXRlIGEgY2FwcGVkIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2l6ZT00MDk2XSAtIFRoZSBzaXplIG9mIHRoZSBjYXBwZWQgY29sbGVjdGlvbiBpbiBieXRlcy5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5tYXg9NTAwXSAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBkb2N1bWVudHMgaW4gdGhlIGNhcHBlZCBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5hdXRvSW5kZXhJZD1mYWxzZV0gLSBDcmVhdGUgYW4gaW5kZXggb24gdGhlIF9pZCBmaWVsZCBvZiB0aGUgZG9jdW1lbnQsIG5vdCBjcmVhdGVkIGF1dG9tYXRpY2FsbHkgb24gY2FwcGVkIGNvbGxlY3Rpb25zLlxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLnJlYWRQcmVmZXJlbmNlPVJlYWRQcmVmZXJlbmNlLlBSSU1BUlldIC0gVGUgcHJlZmVyZWQgcmVhZCBwcmVmZXJlbmNlOlxuICogICAgICA8dWw+XG4gKiAgICAgICAgICA8bGk+UmVhZFByZWZlcmVuY2UuUFJJTUFSWTwvbGk+XG4gKiAgICAgICAgICA8bGk+UmVhZFByZWZlcmVuY2UuUFJJTUFSWV9QUkVGRVJSRUQ8L2xpPlxuICogICAgICAgICAgPGxpPlJlYWRQcmVmZXJlbmNlLlNFQ09OREFSWTwvbGk+XG4gKiAgICAgICAgICA8bGk+UmVhZFByZWZlcmVuY2UuU0VDT05EQVJZX1BSRUZFUlJFRDwvbGk+XG4gKiAgICAgICAgICA8bGk+UmVhZFByZWZlcmVuY2UuTkVBUkVTVDwvbGk+XG4gKiAgICAgIDwvdWw+XG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQGZpcmVzIHtAbGluayBNb25nb1N0b3JlI2NyZWF0ZUNvbGxlY3Rpb259XG4gKiBcbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9uID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBleGlzdGluZyA9IGZhbHNlO1xuICAgIC8vIHZhciBjb2xsZWN0aW9uO1xuICAgIC8vIHZhciBjb2xsZWN0aW9uRnVsbE5hbWUgPSAgc2VsZi5kYXRhYmFzZU5hbWUgKyBcIi5cIiArIGNvbGxlY3Rpb25OYW1lO1xuXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSl7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIH1cbiAgICBcbiAgICAvLyBDb2xsZWN0aW9uIGFscmVhZHkgaW4gbWVtb3J5LCBsZXRzIGNyZWF0ZSBpdFxuICAgIGlmIChzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0pIHtcbiAgICAgICAgc2VsZi5fZW1pdChcbiAgICAgICAgICAgICdjcmVhdGVDb2xsZWN0aW9uJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uOiBzZWxmLFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIGV4aXN0aW5nID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0gPSBuZXcgQ29sbGVjdGlvbihzZWxmLCBjb2xsZWN0aW9uTmFtZSwgc2VsZi5wa0ZhY3RvcnksIG9wdGlvbnMpO1xuICAgICAgICBzZWxmLl9lbWl0KFxuICAgICAgICAgICAgJ2NyZWF0ZUNvbGxlY3Rpb24nLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb246IHNlbGYsXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuICAgIFxuICAgIGlmICghZXhpc3RpbmcpIHtcbiAgICAgICAgLy8gTGV0dGluZyBhY2Nlc3MgdGhlIGNvbGxlY3Rpb24gYnkgTW9uZ29Qb3J0YWJsZS48Q09MX05BTUU+XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShNb25nb1BvcnRhYmxlLnByb3RvdHlwZSwgY29sbGVjdGlvbk5hbWUsIHtcbiAgICAgICAgICAgIGVudW1lcmFibGUgOiB0cnVlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXSA9IHY7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvLyByZXR1cm4gc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdO1xuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdKTtcblxuICAgIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV07XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciB7QGxpbmsgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9ufVxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjY3JlYXRlQ29sbGVjdGlvblxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jcmVhdGVDb2xsZWN0aW9uID0gTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbjtcblxuLyoqXG4gKiBEcm9wIGEgY29sbGVjdGlvbiBmcm9tIHRoZSBkYXRhYmFzZSwgcmVtb3ZpbmcgaXQgcGVybWFuZW50bHkuIE5ldyBhY2Nlc3NlcyB3aWxsIGNyZWF0ZSBhIG5ldyBjb2xsZWN0aW9uLlxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjZHJvcENvbGxlY3Rpb25cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB3ZSB3aXNoIHRvIGRyb3AuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiBcbiAqIEByZXR1cm5zIHtCb29sZWFufSBcInRydWVcIiBpZiBkcm9wcGVkIHN1Y2Nlc3NmdWxseVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5kcm9wQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmIChzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0pIHtcbiAgICAgICAgLy8gRHJvcCB0aGUgY29sbGVjdGlvblxuICAgICAgICB0aGlzLl9lbWl0KFxuICAgICAgICAgICAgJ2Ryb3BDb2xsZWN0aW9uJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25uOiB0aGlzLFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgZGVsZXRlIHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjaygpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG1zZyA9IFwiTm8gY29sbGVjdGlvbiBmb3VuZFwiO1xuICAgICAgICBcbiAgICAgICAgTG9nZ2VyLmVycm9yKG1zZyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2sgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgY2FsbGJhY2sobmV3IEVycm9yKG1zZykpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVuYW1lIGEgY29sbGVjdGlvbi5cbiAqXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjcmVuYW1lQ29sbGVjdGlvblxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gZnJvbUNvbGxlY3Rpb24gLSBUaGUgbmFtZSBvZiB0aGUgY3VycmVudCBjb2xsZWN0aW9uIHdlIHdpc2ggdG8gcmVuYW1lLlxuICogQHBhcmFtIHtTdHJpbmd9IHRvQ29sbGVjdGlvbiAtIFRoZSBuZXcgbmFtZSBvZiB0aGUgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqIFxuICogQHJldHVybnMge0Jvb2xlYW58Q29sbGVjdGlvbn0gVGhlIGNvbGxlY3Rpb24gaWYgcmVuYW1lZCBzdWNjZXNzZnVsbHkgb3IgZmFsc2UgaWYgbm90XG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLnJlbmFtZUNvbGxlY3Rpb24gPSBmdW5jdGlvbihmcm9tQ29sbGVjdGlvbiwgdG9Db2xsZWN0aW9uLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmIChfLmlzU3RyaW5nKGZyb21Db2xsZWN0aW9uKSAmJiBfLmlzU3RyaW5nKHRvQ29sbGVjdGlvbikgJiYgZnJvbUNvbGxlY3Rpb24gIT09IHRvQ29sbGVjdGlvbikge1xuICAgICAgICAvLyBFeGVjdXRlIHRoZSBjb21tYW5kLCByZXR1cm4gdGhlIG5ldyByZW5hbWVkIGNvbGxlY3Rpb24gaWYgc3VjY2Vzc2Z1bFxuICAgICAgICBDb2xsZWN0aW9uLmNoZWNrQ29sbGVjdGlvbk5hbWUodG9Db2xsZWN0aW9uKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzZWxmLl9jb2xsZWN0aW9uc1tmcm9tQ29sbGVjdGlvbl0pIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXQoXG4gICAgICAgICAgICAgICAgJ3JlbmFtZUNvbGxlY3Rpb24nLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29ubjogc2VsZixcbiAgICAgICAgICAgICAgICAgICAgZnJvbTogZnJvbUNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRvOiB0b0NvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgcmVuYW1lZCA9IHNlbGYuX2NvbGxlY3Rpb25zW2Zyb21Db2xsZWN0aW9uXS5yZW5hbWUodG9Db2xsZWN0aW9uKTtcbiAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb25zLnJlbmFtZVByb3BlcnR5KGZyb21Db2xsZWN0aW9uLCB0b0NvbGxlY3Rpb24pO1xuICAgICAgICAgICAgc2VsZi5yZW5hbWVQcm9wZXJ0eShmcm9tQ29sbGVjdGlvbiwgdG9Db2xsZWN0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG51bGwsIHJlbmFtZWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gcmVuYW1lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBtc2cgPSBcIk5vIGNvbGxlY3Rpb24gZm91bmRcIjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgTG9nZ2VyLmVycm9yKG1zZyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhuZXcgRXJyb3IobXNnKSwgbnVsbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBtc2cgPSBcIlRoZSBwYXJhbXMgYXJlIGludmFsaWRcIjtcbiAgICAgICAgXG4gICAgICAgIExvZ2dlci5lcnJvcihtc2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG5ldyBFcnJvcihtc2cpLCBudWxsKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogQ3JlYXRlcyBhbiBpbmRleCBvbiB0aGUgY29sbGVjdGlvbi5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NyZWF0ZUluZGV4XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gTmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0byBjcmVhdGUgdGhlIGluZGV4IG9uLlxuICogQHBhcmFtIHtPYmplY3R9IGZpZWxkT3JTcGVjIC0gRmllbGRPclNwZWMgdGhhdCBkZWZpbmVzIHRoZSBpbmRleC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnMgZHVyaW5nIHVwZGF0ZS5cbiAqIFxuICogQHBhcmFtIHtCb29sZWFufE9iamVjdH0gW29wdGlvbnMuc2FmZT1mYWxzZV0gRXhlY3V0ZXMgd2l0aCBhIGdldExhc3RFcnJvciBjb21tYW5kIHJldHVybmluZyB0aGUgcmVzdWx0cyBvZiB0aGUgY29tbWFuZCBvbiBNb25nb01vbmdsbzpcbiAqICAgICAgPHVsPlxuICogICAgICAgICAgPGxpPnRydWU8L2xpPlxuICogICAgICAgICAgPGxpPmZhbHNlPC9saT5cbiAqICAgICAgICAgIDxsaT57IHc6IHtOdW1iZXJ9LCB3dGltZW91dDoge051bWJlcn19PC9saT5cbiAqICAgICAgICAgIDxsaT57IGZzeW5jOiB0cnVlIH08L2xpPlxuICogICAgICA8L3VsPiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMudW5pcXVlPWZhbHNlXSAtIENyZWF0ZXMgYW4gdW5pcXVlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnNwYXJzZT1mYWxzZV0gLSBDcmVhdGVzIGEgc3BhcnNlIGluZGV4XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmJhY2tncm91bmQ9ZmFsc2VdIC0gQ3JlYXRlcyB0aGUgaW5kZXggaW4gdGhlIGJhY2tncm91bmQsIHlpZWxkaW5nIHdoZW5ldmVyIHBvc3NpYmxlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmRyb3BEdXBzPWZhbHNlXSAtIEEgdW5pcXVlIGluZGV4IGNhbm5vdCBiZSBjcmVhdGVkIG9uIGEga2V5IHRoYXQgaGFzIHByZS1leGlzdGluZyBkdXBsaWNhdGUgdmFsdWVzLiBJZiB5b3Ugd291bGQgbGlrZSB0byBjcmVhdGUgdGhlIGluZGV4IGFueXdheSwga2VlcGluZyB0aGUgZmlyc3QgZG9jdW1lbnQgdGhlIGRhdGFiYXNlIGluZGV4ZXMgYW5kIGRlbGV0aW5nIGFsbCBzdWJzZXF1ZW50IGRvY3VtZW50cyB0aGF0IGhhdmUgZHVwbGljYXRlIHZhbHVlXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWluPW51bGxdIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGxvd2VyIGJvdW5kIGZvciB0aGUgY28tb3JkaW5hdGVzXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWF4PW51bGxdIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGhpZ2ggYm91bmQgZm9yIHRoZSBjby1vcmRpbmF0ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy52PW51bGxdIC0gU3BlY2lmeSB0aGUgZm9ybWF0IHZlcnNpb24gb2YgdGhlIGluZGV4ZXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5leHBpcmVBZnRlclNlY29uZHM9bnVsbF0gLSBBbGxvd3MgeW91IHRvIGV4cGlyZSBkYXRhIG9uIGluZGV4ZXMgYXBwbGllZCB0byBhIGRhdGEgKE1vbmdvREIgMi4yIG9yIGhpZ2hlcilcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5uYW1lPW51bGxdIC0gT3ZlcnJpZGUgdGhlIGF1dG9nZW5lcmF0ZWQgaW5kZXggbmFtZSAodXNlZnVsIGlmIHRoZSByZXN1bHRpbmcgbmFtZSBpcyBsYXJnZXIgdGhhbiAxMjggYnl0ZXMpXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY3JlYXRlSW5kZXggPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgZmllbGRPclNwZWMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQgeWV0IScpO1xufTtcblxuLyoqXG4gKiBFbnN1cmVzIHRoYXQgYW4gaW5kZXggZXhpc3RzLCBpZiBpdCBkb2VzIG5vdCBpdCBjcmVhdGVzIGl0XG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNlbnN1cmVJbmRleFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIE5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdG8gY3JlYXRlIHRoZSBpbmRleCBvbi5cbiAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZE9yU3BlYyAtIEZpZWxkT3JTcGVjIHRoYXQgZGVmaW5lcyB0aGUgaW5kZXguXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zIGR1cmluZyB1cGRhdGUuXG4gKiBcbiAqIEBwYXJhbSB7Qm9vbGVhbnxPYmplY3R9IFtvcHRpb25zLnNhZmU9ZmFsc2VdIC0gRXhlY3V0ZXMgd2l0aCBhIGdldExhc3RFcnJvciBjb21tYW5kIHJldHVybmluZyB0aGUgcmVzdWx0cyBvZiB0aGUgY29tbWFuZCBvbiBNb25nb01vbmdsbzpcbiAqICAgICAgPHVsPlxuICogICAgICAgICAgPGxpPnRydWU8L2xpPlxuICogICAgICAgICAgPGxpPmZhbHNlPC9saT5cbiAqICAgICAgICAgIDxsaT57IHc6IHtOdW1iZXJ9LCB3dGltZW91dDoge051bWJlcn19PC9saT5cbiAqICAgICAgICAgIDxsaT57IGZzeW5jOiB0cnVlIH08L2xpPlxuICogICAgICA8L3VsPlxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy51bmlxdWU9ZmFsc2VdIC0gQ3JlYXRlcyBhbiB1bmlxdWUgaW5kZXhcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuc3BhcnNlPWZhbHNlXSAtIENyZWF0ZXMgYSBzcGFyc2UgaW5kZXhcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuYmFja2dyb3VuZD1mYWxzZV0gLSBDcmVhdGVzIHRoZSBpbmRleCBpbiB0aGUgYmFja2dyb3VuZCwgeWllbGRpbmcgd2hlbmV2ZXIgcG9zc2libGVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuZHJvcER1cHM9ZmFsc2VdIC0gQSB1bmlxdWUgaW5kZXggY2Fubm90IGJlIGNyZWF0ZWQgb24gYSBrZXkgdGhhdCBoYXMgcHJlLWV4aXN0aW5nIGR1cGxpY2F0ZSB2YWx1ZXMuIElmIHlvdSB3b3VsZCBsaWtlIHRvIGNyZWF0ZSB0aGUgaW5kZXggYW55d2F5LCBrZWVwaW5nIHRoZSBmaXJzdCBkb2N1bWVudCB0aGUgZGF0YWJhc2UgaW5kZXhlcyBhbmQgZGVsZXRpbmcgYWxsIHN1YnNlcXVlbnQgZG9jdW1lbnRzIHRoYXQgaGF2ZSBkdXBsaWNhdGUgdmFsdWVcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5taW5dIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGxvd2VyIGJvdW5kIGZvciB0aGUgY28tb3JkaW5hdGVzXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWF4XSAtIEZvciBnZW9zcGF0aWFsIGluZGV4ZXMgc2V0IHRoZSBoaWdoIGJvdW5kIGZvciB0aGUgY28tb3JkaW5hdGVzXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudl0gLSBTcGVjaWZ5IHRoZSBmb3JtYXQgdmVyc2lvbiBvZiB0aGUgaW5kZXhlc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmV4cGlyZUFmdGVyU2Vjb25kc10gLSBBbGxvd3MgeW91IHRvIGV4cGlyZSBkYXRhIG9uIGluZGV4ZXMgYXBwbGllZCB0byBhIGRhdGEgKE1vbmdvREIgMi4yIG9yIGhpZ2hlcilcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5uYW1lXSAtIE92ZXJyaWRlIHRoZSBhdXRvZ2VuZXJhdGVkIGluZGV4IG5hbWUgKHVzZWZ1bCBpZiB0aGUgcmVzdWx0aW5nIG5hbWUgaXMgbGFyZ2VyIHRoYW4gMTI4IGJ5dGVzKVxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmVuc3VyZUluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGZpZWxkT3JTcGVjLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkIHlldCEnKTtcbn07XG5cbi8qKlxuICogRHJvcCBhbiBpbmRleCBvbiBhIGNvbGxlY3Rpb24uXG4gKiBcbiAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNkcm9wSW5kZXhcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB3aGVyZSB0aGUgY29tbWFuZCB3aWxsIGRyb3AgYW4gaW5kZXguXG4gKiBAcGFyYW0ge1N0cmluZ30gaW5kZXhOYW1lIC0gTmFtZSBvZiB0aGUgaW5kZXggdG8gZHJvcC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZHJvcEluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGluZGV4TmFtZSwgY2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCB5ZXQhJyk7XG59O1xuXG4vKipcbiAqIFJlaW5kZXggYWxsIGluZGV4ZXMgb24gdGhlIGNvbGxlY3Rpb25cbiAqIFdhcm5pbmc6IFwicmVJbmRleFwiIGlzIGEgYmxvY2tpbmcgb3BlcmF0aW9uIChpbmRleGVzIGFyZSByZWJ1aWx0IGluIHRoZSBmb3JlZ3JvdW5kKSBhbmQgd2lsbCBiZSBzbG93IGZvciBsYXJnZSBjb2xsZWN0aW9ucy5cbiAqIFxuICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI3JlSW5kZXhcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0byByZWluZGV4XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKiovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5yZUluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQgeWV0IScpO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhpcyBjb2xsZWN0aW9ucyBpbmRleCBpbmZvLlxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjaW5kZXhJbmZvcm1hdGlvblxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBBZGRpdGlvbmFsIG9wdGlvbnMgZHVyaW5nIHVwZGF0ZS5cbiAqIFxuICogQHBhcmFtIHtCb29sZWFufSBbZnVsbD1mYWxzZV0gLSBSZXR1cm5zIHRoZSBmdWxsIHJhdyBpbmRleCBpbmZvcm1hdGlvbi5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbcmVhZFByZWZlcmVuY2VdIC0gVGhlIHByZWZlcnJlZCByZWFkIHByZWZlcmVuY2UgKChTZXJ2ZXIuUFJJTUFSWSwgU2VydmVyLlBSSU1BUllfUFJFRkVSUkVELCBTZXJ2ZXIuU0VDT05EQVJZLCBTZXJ2ZXIuU0VDT05EQVJZX1BSRUZFUlJFRCwgU2VydmVyLk5FQVJFU1QpLlxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gKi9cbk1vbmdvUG9ydGFibGUucHJvdG90eXBlLmluZGV4SW5mb3JtYXRpb24gPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCB5ZXQhJyk7XG59O1xuXG4vKipcbiAqIERyb3AgdGhlIHdob2xlIGRhdGFiYXNlLlxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjZHJvcERhdGFiYXNlXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAcmV0dXJuIHtCb29sZWFufSBcInRydWVcIiBpZiBkcm9wcGVkIHN1Y2Nlc3NmdWxseVxuICovXG5Nb25nb1BvcnRhYmxlLnByb3RvdHlwZS5kcm9wRGF0YWJhc2UgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmIChNb25nb1BvcnRhYmxlLmNvbm5lY3Rpb25zW3RoaXMuZGF0YWJhc2VOYW1lXSkge1xuICAgICAgICB0aGlzLl9lbWl0KFxuICAgICAgICAgICAgJ2Ryb3BEYXRhYmFzZScsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29ubjogdGhpc1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgZGVsZXRlIE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnNbdGhpcy5kYXRhYmFzZU5hbWVdO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5fY29sbGVjdGlvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5fc3RvcmVzID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGJhY2sgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgY2FsbGJhY2sobnVsbCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgbXNnID0gJ1RoYXQgZGF0YWJhc2Ugbm8gbG9uZ2VyIGV4aXN0cyc7XG4gICAgICAgIFxuICAgICAgICBMb2dnZXIuZXJyb3IobXNnKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhuZXcgRXJyb3IobXNnKSwgZmFsc2UpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8qKlxuICogRGVyZWZlcmVuY2UgYSBkYnJlZiwgYWdhaW5zdCBhIGRiXG4gKlxuICogQHBhcmFtIHtEQlJlZn0gZGJSZWYgZGIgcmVmZXJlbmNlIG9iamVjdCB3ZSB3aXNoIHRvIHJlc29sdmUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICogXG4gKiBAdG9kbyBOb3QgaW1wbGVtZW50ZWQgeWV0XG4gKiBcbiAqIEBpZ25vcmVcbiAqL1xuTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZGVyZWZlcmVuY2UgPSBmdW5jdGlvbihkYlJlZiwgY2FsbGJhY2spIHtcbiAgICAvLyBUT0RPXG4gICAgLy8gdmFyIGRiID0gdGhpcztcblxuICAgIC8vIC8vIElmIHdlIGhhdmUgYSBkYiByZWZlcmVuY2UgdGhlbiBsZXQncyBnZXQgdGhlIGRiIGZpcnN0XG4gICAgLy8gaWYgKGRiUmVmLmRiICE9PSBudWxsKSBkYiA9IHRoaXMuZGIoZGJSZWYuZGIpO1xuXG4gICAgLy8gLy8gRmV0Y2ggdGhlIGNvbGxlY3Rpb24gYW5kIGZpbmQgdGhlIHJlZmVyZW5jZVxuICAgIC8vIHZhciBjb2xsZWN0aW9uID0gTW9uZ2xvLmNvbGxlY3Rpb24oZGJSZWYubmFtZXNwYWNlKTtcblxuICAgIC8vIGNvbGxlY3Rpb24uZmluZE9uZSh7J19pZCc6ZGJSZWYub2lkfSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAvLyAgICAgY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgIC8vIH0pO1xufTtcblxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGUgZGF0YWJhc2UgbmFtZVxuICogXG4gKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjX3ZhbGlkYXRlRGF0YWJhc2VOYW1lXG4gKiBAcHJpdmF0ZVxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gZGF0YWJhc2VOYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGRhdGFiYXNlIHRvIHZhbGlkYXRlXG4gKiBcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFwidHJ1ZVwiIGlmIHRoZSBuYW1lIGlzIHZhbGlkXG4gKi9cbnZhciBfdmFsaWRhdGVEYXRhYmFzZU5hbWUgPSBmdW5jdGlvbihkYXRhYmFzZU5hbWUpIHtcbiAgICBpZiAoIV8uaXNTdHJpbmcoZGF0YWJhc2VOYW1lKSkgdGhyb3cgbmV3IEVycm9yKFwiZGF0YWJhc2UgbmFtZSBtdXN0IGJlIGEgc3RyaW5nXCIpO1xuXG4gICAgaWYgKGRhdGFiYXNlTmFtZS5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcihcImRhdGFiYXNlIG5hbWUgY2Fubm90IGJlIHRoZSBlbXB0eSBzdHJpbmdcIik7XG5cbiAgICB2YXIgaW52YWxpZENoYXJzID0gW1wiIFwiLCBcIi5cIiwgXCIkXCIsIFwiL1wiLCBcIlxcXFxcIl07XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGludmFsaWRDaGFycy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZihkYXRhYmFzZU5hbWUuaW5kZXhPZihpbnZhbGlkQ2hhcnNbaV0pICE9IC0xKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJkYXRhYmFzZSBuYW1lcyBjYW5ub3QgY29udGFpbiB0aGUgY2hhcmFjdGVyICdcIiArIGludmFsaWRDaGFyc1tpXSArIFwiJ1wiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW9uZ29Qb3J0YWJsZTtcblxuLyoqXG4gKiBSZW5hbWVzIGFuIG9iamVjdCBwcm9wZXJ0eS5cbiAqIFxuICogQG1ldGhvZCBPYmplY3QjcmVuYW1lUHJvcGVydHlcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd9IG9sZE5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgcHJvcGVydHkgdG8gcmVuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ30gbmV3TmFtZSAtIFRoZSBuZXcgbmFtZSBvZiB0aGUgcHJvcGVydHlcbiAqIFxuICogQHJldHVybnMge3RoaXN9IFRoZSBjYWxsZWQgb2JqZWN0XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShcbiAgICBPYmplY3QucHJvdG90eXBlLCBcbiAgICAncmVuYW1lUHJvcGVydHknLFxuICAgIHtcbiAgICAgICAgd3JpdGFibGUgOiBmYWxzZSwgLy8gQ2Fubm90IGFsdGVyIHRoaXMgcHJvcGVydHlcbiAgICAgICAgZW51bWVyYWJsZSA6IGZhbHNlLCAvLyBXaWxsIG5vdCBzaG93IHVwIGluIGEgZm9yLWluIGxvb3AuXG4gICAgICAgIGNvbmZpZ3VyYWJsZSA6IGZhbHNlLCAvLyBDYW5ub3QgYmUgZGVsZXRlZCB2aWEgdGhlIGRlbGV0ZSBvcGVyYXRvclxuICAgICAgICB2YWx1ZSA6IGZ1bmN0aW9uIChvbGROYW1lLCBuZXdOYW1lKSB7XG4gICAgICAgICAgICBpZiAoIV8uaXNTdHJpbmcob2xkTmFtZSkgfHwgIV8uaXNTdHJpbmcobmV3TmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRG8gbm90aGluZyBpZiB0aGUgbmFtZXMgYXJlIHRoZSBzYW1lXG4gICAgICAgICAgICBpZiAob2xkTmFtZSA9PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciB0aGUgb2xkIHByb3BlcnR5IG5hbWUgdG8gXG4gICAgICAgICAgICAvLyBhdm9pZCBhIFJlZmVyZW5jZUVycm9yIGluIHN0cmljdCBtb2RlLlxuICAgICAgICAgICAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkob2xkTmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzW25ld05hbWVdID0gdGhpc1tvbGROYW1lXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpc1tvbGROYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG4pOyJdfQ==
