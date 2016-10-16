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

var logger = null;

module.exports = function (Collection, ObjectId, EventEmitter, Logger, _) {

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

    if (!Object.prototype.renameProperty) {
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
    }

    return MongoPortable;
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk1vbmdvUG9ydGFibGUuanMiXSwibmFtZXMiOlsibG9nZ2VyIiwibW9kdWxlIiwiZXhwb3J0cyIsIkNvbGxlY3Rpb24iLCJPYmplY3RJZCIsIkV2ZW50RW1pdHRlciIsIkxvZ2dlciIsIl8iLCJNb25nb1BvcnRhYmxlIiwiZGF0YWJhc2VOYW1lIiwib3B0aW9ucyIsImxvZyIsImdldEluc3RhbmNlIiwiaW5zdGFuY2UiLCJfY29sbGVjdGlvbnMiLCJfc3RvcmVzIiwiY29ubmVjdGlvbnMiLCJfdmFsaWRhdGVEYXRhYmFzZU5hbWUiLCJ0aHJvdyIsInZlcnNpb24iLCJwcm90b3R5cGUiLCJ1c2UiLCJuYW1lIiwib2JqIiwicHVzaCIsImFkZFN0b3JlIiwic3RvcmUiLCJpc05pbCIsImlzRnVuY3Rpb24iLCJpc09iamVjdCIsImNvbGxlY3Rpb25zSW5mbyIsImNvbGxlY3Rpb25OYW1lIiwiY2FsbGJhY2siLCJmZXRjaENvbGxlY3Rpb25zIiwiY29sbGVjdGlvbnMiLCJzZWxmIiwiY29sbGVjdGlvbkxpc3QiLCJ0b0xvd2VyQ2FzZSIsIm5hbWVzT25seSIsImNvbGxlY3Rpb25OYW1lcyIsImNvbGxlY3Rpb24iLCJleGlzdGluZyIsImVtaXQiLCJjb25uZWN0aW9uIiwicGtGYWN0b3J5IiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJlbnVtZXJhYmxlIiwiY29uZmlndXJhYmxlIiwid3JpdGFibGUiLCJ2YWx1ZSIsImNyZWF0ZUNvbGxlY3Rpb24iLCJkcm9wQ29sbGVjdGlvbiIsImNvbm4iLCJtc2ciLCJlcnJvciIsIkVycm9yIiwicmVuYW1lQ29sbGVjdGlvbiIsImZyb21Db2xsZWN0aW9uIiwidG9Db2xsZWN0aW9uIiwiaXNTdHJpbmciLCJjaGVja0NvbGxlY3Rpb25OYW1lIiwiZnJvbSIsInRvIiwicmVuYW1lZCIsInJlbmFtZSIsInJlbmFtZVByb3BlcnR5IiwiY3JlYXRlSW5kZXgiLCJmaWVsZE9yU3BlYyIsImVuc3VyZUluZGV4IiwiZHJvcEluZGV4IiwiaW5kZXhOYW1lIiwicmVJbmRleCIsImluZGV4SW5mb3JtYXRpb24iLCJkcm9wRGF0YWJhc2UiLCJkZXJlZmVyZW5jZSIsImRiUmVmIiwibGVuZ3RoIiwiaW52YWxpZENoYXJzIiwiaSIsImluZGV4T2YiLCJvbGROYW1lIiwibmV3TmFtZSIsImhhc093blByb3BlcnR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7Ozs7Ozs7QUFTQSxJQUFJQSxTQUFTLElBQWI7O0FBRUFDLE9BQU9DLE9BQVAsR0FBaUIsVUFBU0MsVUFBVCxFQUFxQkMsUUFBckIsRUFBK0JDLFlBQS9CLEVBQTZDQyxNQUE3QyxFQUFxREMsQ0FBckQsRUFBd0Q7O0FBRXJFOzs7Ozs7Ozs7OztBQUZxRSxRQWEvREMsYUFiK0Q7QUFBQTs7QUFjakUsK0JBQVlDLFlBQVosRUFBd0M7QUFBQTs7QUFBQSxnQkFBZEMsT0FBYyx5REFBSixFQUFJOztBQUFBOztBQUFBOztBQUdwQyxnQkFBSSxFQUFFLGlCQUFnQkYsYUFBbEIsQ0FBSixFQUFzQyxjQUFPLElBQUlBLGFBQUosQ0FBa0JDLFlBQWxCLENBQVA7O0FBRXRDLGdCQUFJQyxRQUFRQyxHQUFaLEVBQWlCO0FBQ2JYLHlCQUFTTSxPQUFPTSxXQUFQLENBQW1CRixRQUFRQyxHQUEzQixDQUFUO0FBQ0gsYUFGRCxNQUVPO0FBQ0hYLHlCQUFTTSxPQUFPTyxRQUFoQjtBQUNIOztBQUVEO0FBQ0Esa0JBQUtDLFlBQUwsR0FBb0IsRUFBcEI7QUFDQSxrQkFBS0MsT0FBTCxHQUFlLEVBQWY7O0FBRUEsZ0JBQUksQ0FBQ1AsY0FBY1EsV0FBbkIsRUFBZ0M7QUFDNUJSLDhCQUFjUSxXQUFkLEdBQTRCLEVBQTVCO0FBQ0g7O0FBRUQ7QUFDQUMsa0NBQXNCUixZQUF0Qjs7QUFFQTtBQUNBO0FBQ0EsZ0JBQUlELGNBQWNRLFdBQWQsQ0FBMEJQLFlBQTFCLENBQUosRUFBNkM7QUFDekNULHVCQUFPa0IsS0FBUCxDQUFhLHdCQUFiO0FBQ0g7O0FBRUQsa0JBQUtULFlBQUwsR0FBb0JBLFlBQXBC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SixFQUdJO0FBQ0k2QixzQkFBVyxLQURmLEVBQ3NCO0FBQ2xCRix3QkFBYSxLQUZqQixFQUV3QjtBQUNwQkMsMEJBQWUsS0FIbkIsRUFHMEI7QUFDdEJFLG1CQUFRLGVBQVUrQixPQUFWLEVBQW1CQyxPQUFuQixFQUE0QjtBQUNoQztBQUNBLG9CQUFJLENBQUMzRSxFQUFFcUQsUUFBRixDQUFXcUIsT0FBWCxDQUFELElBQXdCLENBQUMxRSxFQUFFcUQsUUFBRixDQUFXc0IsT0FBWCxDQUE3QixFQUFrRDtBQUM5QywyQkFBTyxJQUFQO0FBQ0g7O0FBRUQ7QUFDQSxvQkFBSUQsV0FBV0MsT0FBZixFQUF3QjtBQUNwQiwyQkFBTyxJQUFQO0FBQ0g7O0FBRUQ7QUFDQTtBQUNBLG9CQUFJLEtBQUtDLGNBQUwsQ0FBb0JGLE9BQXBCLENBQUosRUFBa0M7QUFDOUIseUJBQUtDLE9BQUwsSUFBZ0IsS0FBS0QsT0FBTCxDQUFoQjtBQUNBLDJCQUFPLEtBQUtBLE9BQUwsQ0FBUDtBQUNIOztBQUVELHVCQUFPLElBQVA7QUFDSDtBQXZCTCxTQUhKO0FBNkJIOztBQUVELFdBQU96RSxhQUFQO0FBQ0gsQ0FucEJEIiwiZmlsZSI6Ik1vbmdvUG9ydGFibGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIE1vbmdvUG9ydGFibGUuanMgLSBiYXNlZCBvbiBNb25nbG8gKHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vTW9uZ2xvfSkgYnkgQ2hyaXN0aWFuIFN1bGxpdmFuIDxjc0BldWZvcmljLmNvPiB8IENvcHlyaWdodCAoYykgMjAxMlxuICogQHZlcnNpb24gMS4wLjBcbiAqIFxuICogQGF1dGhvciBFZHVhcmRvIEFzdG9sZmkgPGVhc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuICAgIFxudmFyIGxvZ2dlciA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ29sbGVjdGlvbiwgT2JqZWN0SWQsIEV2ZW50RW1pdHRlciwgTG9nZ2VyLCBfKSB7XG4gICAgICAgIFxuICAgIC8qKlxuICAgICAqIE1vbmdvUG9ydGFibGVcbiAgICAgKiBcbiAgICAgKiBAbW9kdWxlIE1vbmdvUG9ydGFibGVcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAc2luY2UgMC4wLjFcbiAgICAgKiBcbiAgICAgKiBAY2xhc3NkZXNjIFBvcnRhYmxlIGRhdGFiYXNlIHdpdGggcGVyc2lzdGVuY2UgYW5kIE1vbmdvREItbGlrZSBBUElcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGF0YWJhc2VOYW1lIC0gTmFtZSBvZiB0aGUgZGF0YWJhc2UuXG4gICAgICovXG4gICAgY2xhc3MgTW9uZ29Qb3J0YWJsZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGRhdGFiYXNlTmFtZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgICAgICBzdXBlcigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTW9uZ29Qb3J0YWJsZSkpIHJldHVybiBuZXcgTW9uZ29Qb3J0YWJsZShkYXRhYmFzZU5hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5sb2cpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIgPSBMb2dnZXIuZ2V0SW5zdGFuY2Uob3B0aW9ucy5sb2cpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6aW5nIHZhcmlhYmxlc1xuICAgICAgICAgICAgdGhpcy5fY29sbGVjdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgICAgIGlmICghTW9uZ29Qb3J0YWJsZS5jb25uZWN0aW9ucykge1xuICAgICAgICAgICAgICAgIE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgZGRiYiBuYW1lIGZvcm1hdFxuICAgICAgICAgICAgX3ZhbGlkYXRlRGF0YWJhc2VOYW1lKGRhdGFiYXNlTmFtZSk7XG4gICAgICAgIFxuICAgICAgICAgICAgLy9UZW1wIHBhdGNoIHVudGlsIEkgZmlndXJlIG91dCBob3cgZmFyIEkgd2FudCB0byB0YWtlIHRoZSBpbXBsZW1lbnRhdGlvbjtcbiAgICAgICAgICAgIC8vIEZJWE1FXG4gICAgICAgICAgICBpZiAoTW9uZ29Qb3J0YWJsZS5jb25uZWN0aW9uc1tkYXRhYmFzZU5hbWVdKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnRocm93KCdkYiBuYW1lIGFscmVhZHkgaW4gdXNlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAgICAgdGhpcy5kYXRhYmFzZU5hbWUgPSBkYXRhYmFzZU5hbWU7XG4gICAgICAgIFxuICAgICAgICAgICAgTW9uZ29Qb3J0YWJsZS5jb25uZWN0aW9uc1tkYXRhYmFzZU5hbWVdID0gbmV3IE9iamVjdElkKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ29ubmVjdGlvbiBQb29sXG4gICAgICogXG4gICAgICogQG1lbWJlcm9mIE1vbmdvUG9ydGFibGVcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgTW9uZ29Qb3J0YWJsZS5jb25uZWN0aW9ucyA9IHt9O1xuICAgIFxuICAgIC8vIE1vbmdvUG9ydGFibGUucHJvdG90eXBlLl9fcHJvdG9fXyA9IEV2ZW50RW1pdHRlci5wcm90bztcbiAgICBcbiAgICAvKipcbiAgICAgKiBWZXJzaW9uIE51bWJlclxuICAgICAqIFxuICAgICAqIEBtZW1iZXJvZiBNb25nb1BvcnRhYmxlXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIE1vbmdvUG9ydGFibGUudmVyc2lvbiA9ICcwLjAuMSc7XG4gICAgXG4gICAgLyoqXG4gICAgICogTWlkZGxld2FyZSBmdW5jdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWUgLSBOYW1lIG9mIHRoZSBtaWRkbGV3YXJlOlxuICAgICAqICAgICAgPHVsPlxuICAgICAqICAgICAgICAgIDxsaT5cInN0b3JlXCI6IEFkZCBhIGN1c3RvbSBzdG9yZTwvbGk+XG4gICAgICogICAgICA8L3VsPlxuICAgICAqIEBwYXJhbSAge09iamVjdHxGdW5jdGlvbn0gZm4gLSBGdW5jdGlvbiB0byBpbXBsZW1lbnQgdGhlIG1pZGRsZXdhcmVcbiAgICAgKi9cbiAgICBNb25nb1BvcnRhYmxlLnByb3RvdHlwZS51c2UgPSBmdW5jdGlvbihuYW1lLCBvYmopIHtcbiAgICAgICAgc3dpdGNoKG5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0b3JlJzpcbiAgICAgICAgICAgICAgICB0aGlzLl9zdG9yZXMucHVzaChvYmopO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGRzIGEgY3VzdG9tIHN0b3JlcyBmb3IgcmVtb3RlIGFuZCBsb2NhbCBwZXJzaXN0ZW5jZVxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R8RnVuY3Rpb259IHN0b3JlIC0gVGhlIGN1c3RvbSBzdG9yZVxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtNb25nb1BvcnRhYmxlfSB0aGlzIC0gVGhlIGN1cnJlbnQgSW5zdGFuY2VcbiAgICAgKi9cbiAgICBNb25nb1BvcnRhYmxlLnByb3RvdHlwZS5hZGRTdG9yZSA9IGZ1bmN0aW9uIChzdG9yZSkge1xuICAgICAgICBpZiAoXy5pc05pbChzdG9yZSkpIGxvZ2dlci50aHJvdyhcInN0b3JlIG11c3QgYmUgaW5jbHVkZWRcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHN0b3JlKSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmVzLnB1c2gobmV3IHN0b3JlKCkpO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNPYmplY3Qoc3RvcmUpKSB7XG4gICAgICAgICAgICB0aGlzLl9zdG9yZXMucHVzaChzdG9yZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJzdG9yZSBtdXN0IGJlIGEgZnVuY3Rpb24gb3Igb2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgIFxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBjdXJzb3IgdG8gYWxsIHRoZSBjb2xsZWN0aW9uIGluZm9ybWF0aW9uLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbY29sbGVjdGlvbk5hbWU9bnVsbF0gLSB0aGUgY29sbGVjdGlvbiBuYW1lIHdlIHdpc2ggdG8gcmV0cmlldmUgdGhlIGluZm9ybWF0aW9uIGZyb20uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKlxuICAgICAqIEB0b2RvIEltcGxlbWVudFxuICAgICAqL1xuICAgIE1vbmdvUG9ydGFibGUucHJvdG90eXBlLmNvbGxlY3Rpb25zSW5mbyA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBjYWxsYmFjaykge1xuICAgICAgICBsb2dnZXIudGhyb3coXCJOb3QgaW1wbGVtZW50ZWQgeWV0XCIpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQWxpYXMgZm9yIHtAbGluayBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25zfVxuICAgICAqIFxuICAgICAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNmZXRjaENvbGxlY3Rpb25zXG4gICAgICovXG4gICAgTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZmV0Y2hDb2xsZWN0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb25zKG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgbGlzdCBvZiBhbGwgY29sbGVjdGlvbiBmb3IgdGhlIHNwZWNpZmllZCBkYlxuICAgICAqXG4gICAgICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMubmFtZXNPbmx5PWZhbHNlXSAtIFJldHVybiBvbmx5IHRoZSBjb2xsZWN0aW9ucyBuYW1lc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBbb3B0aW9ucy5jb2xsZWN0aW9uTmFtZT1udWxsXSAtIFRoZSBjb2xsZWN0aW9uIG5hbWUgd2Ugd2lzaCB0byBmaWx0ZXIgYnlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtBcnJheX0gXG4gICAgICovXG4gICAgTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoXy5pc05pbChjYWxsYmFjaykgJiYgXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKG9wdGlvbnMpKSBvcHRpb25zID0ge307XG4gICAgICAgIFxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICB2YXIgY29sbGVjdGlvbkxpc3QgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgbmFtZSBpbiBzZWxmLl9jb2xsZWN0aW9ucykge1xuICAgICAgICAgICAgLy8gT25seSBhZGQgdGhlIHJlcXVlc3RlZCBjb2xsZWN0aW9ucyAvL1RPRE8gQWRkIGFycmF5IHR5cGVcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmNvbGxlY3Rpb25OYW1lKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWUudG9Mb3dlckNhc2UoKSA9PT0gb3B0aW9ucy5jb2xsZWN0aW9uTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm5hbWVzT25seSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbkxpc3QucHVzaChuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25MaXN0LnB1c2goc2VsZi5fY29sbGVjdGlvbnNbbmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5uYW1lc09ubHkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbkxpc3QucHVzaChuYW1lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uTGlzdC5wdXNoKHNlbGYuX2NvbGxlY3Rpb25zW25hbWVdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhjb2xsZWN0aW9uTGlzdCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY29sbGVjdGlvbkxpc3Q7XG4gICAgfTtcbiAgICBcbiAgICAgLyoqXG4gICAgICogR2V0IHRoZSBsaXN0IG9mIGFsbCBjb2xsZWN0aW9uIG5hbWVzIGZvciB0aGUgc3BlY2lmaWVkIGRiLCBcbiAgICAgKiAgYnkgY2FsbGluZyBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb25zIHdpdGggW29wdGlvbnMubmFtZXNPbmx5ID0gdHJ1ZV1cbiAgICAgKlxuICAgICAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9uTmFtZXNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBbb3B0aW9ucy5jb2xsZWN0aW9uTmFtZT1udWxsXSAtIFRoZSBjb2xsZWN0aW9uIG5hbWUgd2Ugd2lzaCB0byBmaWx0ZXIgYnkuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqXG4gICAgICogQHJldHVybiB7QXJyYXl9XG4gICAgICogXG4gICAgICoge0BsaW5rIE1vbmdvUG9ydGFibGUjY29sbGVjdGlvbnN9XG4gICAgICovXG4gICAgTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbk5hbWVzID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoY2FsbGJhY2spICYmIF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChvcHRpb25zKSkgb3B0aW9ucyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKCFvcHRpb25zLm5hbWVzT25seSkgb3B0aW9ucy5uYW1lc09ubHkgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbnMob3B0aW9ucywgY2FsbGJhY2spO1xuICAgIH07XG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGNvbGxlY3Rpb24gb24gYSBzZXJ2ZXIgcHJlLWFsbG9jYXRpbmcgc3BhY2UsIG5lZWQgdG8gY3JlYXRlIGYuZXggY2FwcGVkIGNvbGxlY3Rpb25zLlxuICAgICAqIFxuICAgICAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNjb2xsZWN0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gdGhlIGNvbGxlY3Rpb24gbmFtZSB3ZSB3aXNoIHRvIGFjY2Vzcy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gcmV0dXJucyBvcHRpb24gcmVzdWx0cy5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW58T2JqZWN0fSBbb3B0aW9ucy5zYWZlPWZhbHNlXSBFeGVjdXRlcyB3aXRoIGEgZ2V0TGFzdEVycm9yIGNvbW1hbmQgcmV0dXJuaW5nIHRoZSByZXN1bHRzIG9mIHRoZSBjb21tYW5kIG9uIE1vbmdvTW9uZ2xvOlxuICAgICAqICAgICAgPHVsPlxuICAgICAqICAgICAgICAgIDxsaT50cnVlPC9saT5cbiAgICAgKiAgICAgICAgICA8bGk+ZmFsc2U8L2xpPlxuICAgICAqICAgICAgICAgIDxsaT57IHc6IHtOdW1iZXJ9LCB3dGltZW91dDoge051bWJlcn19PC9saT5cbiAgICAgKiAgICAgICAgICA8bGk+eyBmc3luYzogdHJ1ZSB9PC9saT5cbiAgICAgKiAgICAgIDwvdWw+XG4gICAgICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5zZXJpYWxpemVGdW5jdGlvbnM9ZmFsc2VdIC0gU2VyaWFsaXplIGZ1bmN0aW9ucyBvbiB0aGUgZG9jdW1lbnQuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5yYXc9ZmFsc2VdIC0gUGVyZm9ybSBhbGwgb3BlcmF0aW9ucyB1c2luZyByYXcgYnNvbiBvYmplY3RzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgT2JqZWN0SWQgcHJpbWFyeSBrZXkgZ2VuZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNhcHBlZD1mYWxzZV0gLSBDcmVhdGUgYSBjYXBwZWQgY29sbGVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc2l6ZT00MDk2XSAtIFRoZSBzaXplIG9mIHRoZSBjYXBwZWQgY29sbGVjdGlvbiBpbiBieXRlcy5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMubWF4PTUwMF0gLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgZG9jdW1lbnRzIGluIHRoZSBjYXBwZWQgY29sbGVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmF1dG9JbmRleElkPWZhbHNlXSAtIENyZWF0ZSBhbiBpbmRleCBvbiB0aGUgX2lkIGZpZWxkIG9mIHRoZSBkb2N1bWVudCwgbm90IGNyZWF0ZWQgYXV0b21hdGljYWxseSBvbiBjYXBwZWQgY29sbGVjdGlvbnMuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLnJlYWRQcmVmZXJlbmNlPVJlYWRQcmVmZXJlbmNlLlBSSU1BUlldIC0gVGUgcHJlZmVyZWQgcmVhZCBwcmVmZXJlbmNlOlxuICAgICAqICAgICAgPHVsPlxuICAgICAqICAgICAgICAgIDxsaT5SZWFkUHJlZmVyZW5jZS5QUklNQVJZPC9saT5cbiAgICAgKiAgICAgICAgICA8bGk+UmVhZFByZWZlcmVuY2UuUFJJTUFSWV9QUkVGRVJSRUQ8L2xpPlxuICAgICAqICAgICAgICAgIDxsaT5SZWFkUHJlZmVyZW5jZS5TRUNPTkRBUlk8L2xpPlxuICAgICAqICAgICAgICAgIDxsaT5SZWFkUHJlZmVyZW5jZS5TRUNPTkRBUllfUFJFRkVSUkVEPC9saT5cbiAgICAgKiAgICAgICAgICA8bGk+UmVhZFByZWZlcmVuY2UuTkVBUkVTVDwvbGk+XG4gICAgICogICAgICA8L3VsPlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAZmlyZXMge0BsaW5rIE1vbmdvU3RvcmUjY3JlYXRlQ29sbGVjdGlvbn1cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAgICAgKi9cbiAgICBNb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jb2xsZWN0aW9uID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGV4aXN0aW5nID0gZmFsc2U7XG4gICAgICAgIC8vIHZhciBjb2xsZWN0aW9uO1xuICAgICAgICAvLyB2YXIgY29sbGVjdGlvbkZ1bGxOYW1lID0gIHNlbGYuZGF0YWJhc2VOYW1lICsgXCIuXCIgKyBjb2xsZWN0aW9uTmFtZTtcbiAgICBcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihvcHRpb25zKSl7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdGlvbiBhbHJlYWR5IGluIG1lbW9yeSwgbGV0cyBjcmVhdGUgaXRcbiAgICAgICAgaWYgKHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXSkge1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBcImNyZWF0ZUNvbGxlY3Rpb25cIiBldmVudC5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBAZXZlbnQgTW9uZ29Qb3J0YWJsZX5jcmVhdGVDb2xsZWN0aW9uXG4gICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb25uZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnQgZGF0YWJhc2UgY29ubmVjdGlvblxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGNvbGxlY3Rpb24gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29sbGVjdGlvbiBjcmVhdGVkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGYuZW1pdChcbiAgICAgICAgICAgICAgICAnY3JlYXRlQ29sbGVjdGlvbicsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uOiBzZWxmLFxuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgIFxuICAgICAgICAgICAgZXhpc3RpbmcgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdID0gbmV3IENvbGxlY3Rpb24oc2VsZiwgY29sbGVjdGlvbk5hbWUsIHNlbGYucGtGYWN0b3J5LCBvcHRpb25zKTtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogXCJjcmVhdGVDb2xsZWN0aW9uXCIgZXZlbnQuXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogQGV2ZW50IE1vbmdvUG9ydGFibGV+Y3JlYXRlQ29sbGVjdGlvblxuICAgICAgICAgICAgICogXG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY29ubmVjdGlvbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IGRhdGFiYXNlIGNvbm5lY3Rpb25cbiAgICAgICAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb2xsZWN0aW9uIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbGxlY3Rpb24gY3JlYXRlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWxmLmVtaXQoXG4gICAgICAgICAgICAgICAgJ2NyZWF0ZUNvbGxlY3Rpb24nLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbjogc2VsZixcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjogc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFleGlzdGluZykge1xuICAgICAgICAgICAgLy8gTGV0dGluZyBhY2Nlc3MgdGhlIGNvbGxlY3Rpb24gYnkgPE1vbmdvUG9ydGFibGUgaW5zdGFuY2U+LjxDT0xfTkFNRT5cbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShNb25nb1BvcnRhYmxlLnByb3RvdHlwZSwgY29sbGVjdGlvbk5hbWUsIHtcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXTtcbiAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0pO1xuICAgIFxuICAgICAgICByZXR1cm4gc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQWxpYXMgZm9yIHtAbGluayBNb25nb1BvcnRhYmxlI2NvbGxlY3Rpb259XG4gICAgICogXG4gICAgICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2NyZWF0ZUNvbGxlY3Rpb25cbiAgICAgKi9cbiAgICBNb25nb1BvcnRhYmxlLnByb3RvdHlwZS5jcmVhdGVDb2xsZWN0aW9uID0gTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY29sbGVjdGlvbjtcbiAgICBcbiAgICAvKipcbiAgICAgKiBEcm9wIGEgY29sbGVjdGlvbiBmcm9tIHRoZSBkYXRhYmFzZSwgcmVtb3ZpbmcgaXQgcGVybWFuZW50bHkuIE5ldyBhY2Nlc3NlcyB3aWxsIGNyZWF0ZSBhIG5ldyBjb2xsZWN0aW9uLlxuICAgICAqIFxuICAgICAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNkcm9wQ29sbGVjdGlvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gd2Ugd2lzaCB0byBkcm9wLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gXCJ0cnVlXCIgaWYgZHJvcHBlZCBzdWNjZXNzZnVsbHlcbiAgICAgKi9cbiAgICBNb25nb1BvcnRhYmxlLnByb3RvdHlwZS5kcm9wQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXG4gICAgICAgIGlmIChzZWxmLl9jb2xsZWN0aW9uc1tjb2xsZWN0aW9uTmFtZV0pIHtcbiAgICAgICAgICAgIC8vIERyb3AgdGhlIGNvbGxlY3Rpb25cbiAgICAgICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICAgICAnZHJvcENvbGxlY3Rpb24nLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29ubjogdGhpcyxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjogc2VsZi5fY29sbGVjdGlvbnNbY29sbGVjdGlvbk5hbWVdXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVsZXRlIHNlbGYuX2NvbGxlY3Rpb25zW2NvbGxlY3Rpb25OYW1lXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG1zZyA9IFwiTm8gY29sbGVjdGlvbiBmb3VuZFwiO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IobXNnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIGNhbGxiYWNrKG5ldyBFcnJvcihtc2cpKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5hbWUgYSBjb2xsZWN0aW9uLlxuICAgICAqXG4gICAgICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI3JlbmFtZUNvbGxlY3Rpb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZnJvbUNvbGxlY3Rpb24gLSBUaGUgbmFtZSBvZiB0aGUgY3VycmVudCBjb2xsZWN0aW9uIHdlIHdpc2ggdG8gcmVuYW1lLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB0b0NvbGxlY3Rpb24gLSBUaGUgbmV3IG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufENvbGxlY3Rpb259IFRoZSBjb2xsZWN0aW9uIGlmIHJlbmFtZWQgc3VjY2Vzc2Z1bGx5IG9yIGZhbHNlIGlmIG5vdFxuICAgICAqL1xuICAgIE1vbmdvUG9ydGFibGUucHJvdG90eXBlLnJlbmFtZUNvbGxlY3Rpb24gPSBmdW5jdGlvbihmcm9tQ29sbGVjdGlvbiwgdG9Db2xsZWN0aW9uLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXG4gICAgICAgIGlmIChfLmlzU3RyaW5nKGZyb21Db2xsZWN0aW9uKSAmJiBfLmlzU3RyaW5nKHRvQ29sbGVjdGlvbikgJiYgZnJvbUNvbGxlY3Rpb24gIT09IHRvQ29sbGVjdGlvbikge1xuICAgICAgICAgICAgLy8gRXhlY3V0ZSB0aGUgY29tbWFuZCwgcmV0dXJuIHRoZSBuZXcgcmVuYW1lZCBjb2xsZWN0aW9uIGlmIHN1Y2Nlc3NmdWxcbiAgICAgICAgICAgIENvbGxlY3Rpb24uY2hlY2tDb2xsZWN0aW9uTmFtZSh0b0NvbGxlY3Rpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2VsZi5fY29sbGVjdGlvbnNbZnJvbUNvbGxlY3Rpb25dKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgICAgICAgICAncmVuYW1lQ29sbGVjdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm46IHNlbGYsXG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tOiBmcm9tQ29sbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvOiB0b0NvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIHJlbmFtZWQgPSBzZWxmLl9jb2xsZWN0aW9uc1tmcm9tQ29sbGVjdGlvbl0ucmVuYW1lKHRvQ29sbGVjdGlvbik7XG4gICAgICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbnMucmVuYW1lUHJvcGVydHkoZnJvbUNvbGxlY3Rpb24sIHRvQ29sbGVjdGlvbik7XG4gICAgICAgICAgICAgICAgc2VsZi5yZW5hbWVQcm9wZXJ0eShmcm9tQ29sbGVjdGlvbiwgdG9Db2xsZWN0aW9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgY2FsbGJhY2sobnVsbCwgcmVuYW1lZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlbmFtZWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBtc2cgPSBcIk5vIGNvbGxlY3Rpb24gZm91bmRcIjtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IobXNnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgY2FsbGJhY2sobmV3IEVycm9yKG1zZyksIG51bGwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBtc2cgPSBcIlRoZSBwYXJhbXMgYXJlIGludmFsaWRcIjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKG1zZyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhuZXcgRXJyb3IobXNnKSwgbnVsbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBpbmRleCBvbiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjY3JlYXRlSW5kZXhcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIE5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdG8gY3JlYXRlIHRoZSBpbmRleCBvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmllbGRPclNwZWMgLSBGaWVsZE9yU3BlYyB0aGF0IGRlZmluZXMgdGhlIGluZGV4LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnMgZHVyaW5nIHVwZGF0ZS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW58T2JqZWN0fSBbb3B0aW9ucy5zYWZlPWZhbHNlXSBFeGVjdXRlcyB3aXRoIGEgZ2V0TGFzdEVycm9yIGNvbW1hbmQgcmV0dXJuaW5nIHRoZSByZXN1bHRzIG9mIHRoZSBjb21tYW5kIG9uIE1vbmdvTW9uZ2xvOlxuICAgICAqICAgICAgPHVsPlxuICAgICAqICAgICAgICAgIDxsaT50cnVlPC9saT5cbiAgICAgKiAgICAgICAgICA8bGk+ZmFsc2U8L2xpPlxuICAgICAqICAgICAgICAgIDxsaT57IHc6IHtOdW1iZXJ9LCB3dGltZW91dDoge051bWJlcn19PC9saT5cbiAgICAgKiAgICAgICAgICA8bGk+eyBmc3luYzogdHJ1ZSB9PC9saT5cbiAgICAgKiAgICAgIDwvdWw+IFxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMudW5pcXVlPWZhbHNlXSAtIENyZWF0ZXMgYW4gdW5pcXVlIGluZGV4XG4gICAgICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5zcGFyc2U9ZmFsc2VdIC0gQ3JlYXRlcyBhIHNwYXJzZSBpbmRleFxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuYmFja2dyb3VuZD1mYWxzZV0gLSBDcmVhdGVzIHRoZSBpbmRleCBpbiB0aGUgYmFja2dyb3VuZCwgeWllbGRpbmcgd2hlbmV2ZXIgcG9zc2libGVcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmRyb3BEdXBzPWZhbHNlXSAtIEEgdW5pcXVlIGluZGV4IGNhbm5vdCBiZSBjcmVhdGVkIG9uIGEga2V5IHRoYXQgaGFzIHByZS1leGlzdGluZyBkdXBsaWNhdGUgdmFsdWVzLiBJZiB5b3Ugd291bGQgbGlrZSB0byBjcmVhdGUgdGhlIGluZGV4IGFueXdheSwga2VlcGluZyB0aGUgZmlyc3QgZG9jdW1lbnQgdGhlIGRhdGFiYXNlIGluZGV4ZXMgYW5kIGRlbGV0aW5nIGFsbCBzdWJzZXF1ZW50IGRvY3VtZW50cyB0aGF0IGhhdmUgZHVwbGljYXRlIHZhbHVlXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm1pbj1udWxsXSAtIEZvciBnZW9zcGF0aWFsIGluZGV4ZXMgc2V0IHRoZSBsb3dlciBib3VuZCBmb3IgdGhlIGNvLW9yZGluYXRlc1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5tYXg9bnVsbF0gLSBGb3IgZ2Vvc3BhdGlhbCBpbmRleGVzIHNldCB0aGUgaGlnaCBib3VuZCBmb3IgdGhlIGNvLW9yZGluYXRlc1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy52PW51bGxdIC0gU3BlY2lmeSB0aGUgZm9ybWF0IHZlcnNpb24gb2YgdGhlIGluZGV4ZXNcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuZXhwaXJlQWZ0ZXJTZWNvbmRzPW51bGxdIC0gQWxsb3dzIHlvdSB0byBleHBpcmUgZGF0YSBvbiBpbmRleGVzIGFwcGxpZWQgdG8gYSBkYXRhIChNb25nb0RCIDIuMiBvciBoaWdoZXIpXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLm5hbWU9bnVsbF0gLSBPdmVycmlkZSB0aGUgYXV0b2dlbmVyYXRlZCBpbmRleCBuYW1lICh1c2VmdWwgaWYgdGhlIHJlc3VsdGluZyBuYW1lIGlzIGxhcmdlciB0aGFuIDEyOCBieXRlcylcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuY3JlYXRlSW5kZXggPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgZmllbGRPclNwZWMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdygnTm90IGltcGxlbWVudGVkIHlldCEnKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEVuc3VyZXMgdGhhdCBhbiBpbmRleCBleGlzdHMsIGlmIGl0IGRvZXMgbm90IGl0IGNyZWF0ZXMgaXRcbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjZW5zdXJlSW5kZXhcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIE5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdG8gY3JlYXRlIHRoZSBpbmRleCBvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmllbGRPclNwZWMgLSBGaWVsZE9yU3BlYyB0aGF0IGRlZmluZXMgdGhlIGluZGV4LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnMgZHVyaW5nIHVwZGF0ZS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW58T2JqZWN0fSBbb3B0aW9ucy5zYWZlPWZhbHNlXSAtIEV4ZWN1dGVzIHdpdGggYSBnZXRMYXN0RXJyb3IgY29tbWFuZCByZXR1cm5pbmcgdGhlIHJlc3VsdHMgb2YgdGhlIGNvbW1hbmQgb24gTW9uZ29Nb25nbG86XG4gICAgICogICAgICA8dWw+XG4gICAgICogICAgICAgICAgPGxpPnRydWU8L2xpPlxuICAgICAqICAgICAgICAgIDxsaT5mYWxzZTwvbGk+XG4gICAgICogICAgICAgICAgPGxpPnsgdzoge051bWJlcn0sIHd0aW1lb3V0OiB7TnVtYmVyfX08L2xpPlxuICAgICAqICAgICAgICAgIDxsaT57IGZzeW5jOiB0cnVlIH08L2xpPlxuICAgICAqICAgICAgPC91bD5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnVuaXF1ZT1mYWxzZV0gLSBDcmVhdGVzIGFuIHVuaXF1ZSBpbmRleFxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuc3BhcnNlPWZhbHNlXSAtIENyZWF0ZXMgYSBzcGFyc2UgaW5kZXhcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmJhY2tncm91bmQ9ZmFsc2VdIC0gQ3JlYXRlcyB0aGUgaW5kZXggaW4gdGhlIGJhY2tncm91bmQsIHlpZWxkaW5nIHdoZW5ldmVyIHBvc3NpYmxlXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5kcm9wRHVwcz1mYWxzZV0gLSBBIHVuaXF1ZSBpbmRleCBjYW5ub3QgYmUgY3JlYXRlZCBvbiBhIGtleSB0aGF0IGhhcyBwcmUtZXhpc3RpbmcgZHVwbGljYXRlIHZhbHVlcy4gSWYgeW91IHdvdWxkIGxpa2UgdG8gY3JlYXRlIHRoZSBpbmRleCBhbnl3YXksIGtlZXBpbmcgdGhlIGZpcnN0IGRvY3VtZW50IHRoZSBkYXRhYmFzZSBpbmRleGVzIGFuZCBkZWxldGluZyBhbGwgc3Vic2VxdWVudCBkb2N1bWVudHMgdGhhdCBoYXZlIGR1cGxpY2F0ZSB2YWx1ZVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5taW5dIC0gRm9yIGdlb3NwYXRpYWwgaW5kZXhlcyBzZXQgdGhlIGxvd2VyIGJvdW5kIGZvciB0aGUgY28tb3JkaW5hdGVzXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm1heF0gLSBGb3IgZ2Vvc3BhdGlhbCBpbmRleGVzIHNldCB0aGUgaGlnaCBib3VuZCBmb3IgdGhlIGNvLW9yZGluYXRlc1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy52XSAtIFNwZWNpZnkgdGhlIGZvcm1hdCB2ZXJzaW9uIG9mIHRoZSBpbmRleGVzXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmV4cGlyZUFmdGVyU2Vjb25kc10gLSBBbGxvd3MgeW91IHRvIGV4cGlyZSBkYXRhIG9uIGluZGV4ZXMgYXBwbGllZCB0byBhIGRhdGEgKE1vbmdvREIgMi4yIG9yIGhpZ2hlcilcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMubmFtZV0gLSBPdmVycmlkZSB0aGUgYXV0b2dlbmVyYXRlZCBpbmRleCBuYW1lICh1c2VmdWwgaWYgdGhlIHJlc3VsdGluZyBuYW1lIGlzIGxhcmdlciB0aGFuIDEyOCBieXRlcylcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZW5zdXJlSW5kZXggPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgZmllbGRPclNwZWMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGxvZ2dlci50aHJvdygnTm90IGltcGxlbWVudGVkIHlldCEnKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIERyb3AgYW4gaW5kZXggb24gYSBjb2xsZWN0aW9uLlxuICAgICAqIFxuICAgICAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNkcm9wSW5kZXhcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHdoZXJlIHRoZSBjb21tYW5kIHdpbGwgZHJvcCBhbiBpbmRleC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gaW5kZXhOYW1lIC0gTmFtZSBvZiB0aGUgaW5kZXggdG8gZHJvcC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICovXG4gICAgTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZHJvcEluZGV4ID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGluZGV4TmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KCdOb3QgaW1wbGVtZW50ZWQgeWV0IScpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogUmVpbmRleCBhbGwgaW5kZXhlcyBvbiB0aGUgY29sbGVjdGlvblxuICAgICAqIFdhcm5pbmc6IFwicmVJbmRleFwiIGlzIGEgYmxvY2tpbmcgb3BlcmF0aW9uIChpbmRleGVzIGFyZSByZWJ1aWx0IGluIHRoZSBmb3JlZ3JvdW5kKSBhbmQgd2lsbCBiZSBzbG93IGZvciBsYXJnZSBjb2xsZWN0aW9ucy5cbiAgICAgKiBcbiAgICAgKiBAbWV0aG9kIE1vbmdvUG9ydGFibGUjcmVJbmRleFxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdG8gcmVpbmRleFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCB0aGUgZW5kIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAdG9kbyBJbXBsZW1lbnRcbiAgICAgKiovXG4gICAgTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUucmVJbmRleCA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lLCBjYWxsYmFjaykge1xuICAgICAgICBsb2dnZXIudGhyb3coJ05vdCBpbXBsZW1lbnRlZCB5ZXQhJyk7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhpcyBjb2xsZWN0aW9ucyBpbmRleCBpbmZvLlxuICAgICAqIFxuICAgICAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNpbmRleEluZm9ybWF0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEFkZGl0aW9uYWwgb3B0aW9ucyBkdXJpbmcgdXBkYXRlLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2Z1bGw9ZmFsc2VdIC0gUmV0dXJucyB0aGUgZnVsbCByYXcgaW5kZXggaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFtyZWFkUHJlZmVyZW5jZV0gLSBUaGUgcHJlZmVycmVkIHJlYWQgcHJlZmVyZW5jZSAoKFNlcnZlci5QUklNQVJZLCBTZXJ2ZXIuUFJJTUFSWV9QUkVGRVJSRUQsIFNlcnZlci5TRUNPTkRBUlksIFNlcnZlci5TRUNPTkRBUllfUFJFRkVSUkVELCBTZXJ2ZXIuTkVBUkVTVCkuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqIFxuICAgICAqIEB0b2RvIEltcGxlbWVudFxuICAgICAqL1xuICAgIE1vbmdvUG9ydGFibGUucHJvdG90eXBlLmluZGV4SW5mb3JtYXRpb24gPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgbG9nZ2VyLnRocm93KCdOb3QgaW1wbGVtZW50ZWQgeWV0IScpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogRHJvcCB0aGUgd2hvbGUgZGF0YWJhc2UuXG4gICAgICogXG4gICAgICogQG1ldGhvZCBNb25nb1BvcnRhYmxlI2Ryb3BEYXRhYmFzZVxuICAgICAqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2l0aCB0aGUgcmVzdWx0c1xuICAgICAqIFxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFwidHJ1ZVwiIGlmIGRyb3BwZWQgc3VjY2Vzc2Z1bGx5XG4gICAgICovXG4gICAgTW9uZ29Qb3J0YWJsZS5wcm90b3R5cGUuZHJvcERhdGFiYXNlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnNbdGhpcy5kYXRhYmFzZU5hbWVdKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAgICAgJ2Ryb3BEYXRhYmFzZScsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb25uOiB0aGlzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVsZXRlIE1vbmdvUG9ydGFibGUuY29ubmVjdGlvbnNbdGhpcy5kYXRhYmFzZU5hbWVdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLl9jb2xsZWN0aW9ucyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5fc3RvcmVzID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSBjYWxsYmFjayhudWxsLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgbXNnID0gJ1RoYXQgZGF0YWJhc2Ugbm8gbG9uZ2VyIGV4aXN0cyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihtc2cpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkgY2FsbGJhY2sobmV3IEVycm9yKG1zZyksIGZhbHNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXJlZmVyZW5jZSBhIGRicmVmLCBhZ2FpbnN0IGEgZGJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7REJSZWZ9IGRiUmVmIGRiIHJlZmVyZW5jZSBvYmplY3Qgd2Ugd2lzaCB0byByZXNvbHZlLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSByZXN1bHRzXG4gICAgICogXG4gICAgICogQHRvZG8gSW1wbGVtZW50XG4gICAgICogXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIE1vbmdvUG9ydGFibGUucHJvdG90eXBlLmRlcmVmZXJlbmNlID0gZnVuY3Rpb24oZGJSZWYsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIFRPRE9cbiAgICAgICAgLy8gdmFyIGRiID0gdGhpcztcbiAgICBcbiAgICAgICAgLy8gLy8gSWYgd2UgaGF2ZSBhIGRiIHJlZmVyZW5jZSB0aGVuIGxldCdzIGdldCB0aGUgZGIgZmlyc3RcbiAgICAgICAgLy8gaWYgKGRiUmVmLmRiICE9PSBudWxsKSBkYiA9IHRoaXMuZGIoZGJSZWYuZGIpO1xuICAgIFxuICAgICAgICAvLyAvLyBGZXRjaCB0aGUgY29sbGVjdGlvbiBhbmQgZmluZCB0aGUgcmVmZXJlbmNlXG4gICAgICAgIC8vIHZhciBjb2xsZWN0aW9uID0gTW9uZ2xvLmNvbGxlY3Rpb24oZGJSZWYubmFtZXNwYWNlKTtcbiAgICBcbiAgICAgICAgLy8gY29sbGVjdGlvbi5maW5kT25lKHsnX2lkJzpkYlJlZi5vaWR9LCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgICAgICAvLyAgICAgY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgICAgICAvLyB9KTtcbiAgICB9O1xuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlcyB0aGUgZGF0YWJhc2UgbmFtZVxuICAgICAqIFxuICAgICAqIEBtZXRob2QgTW9uZ29Qb3J0YWJsZSNfdmFsaWRhdGVEYXRhYmFzZU5hbWVcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhYmFzZU5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgZGF0YWJhc2UgdG8gdmFsaWRhdGVcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBcInRydWVcIiBpZiB0aGUgbmFtZSBpcyB2YWxpZFxuICAgICAqL1xuICAgIHZhciBfdmFsaWRhdGVEYXRhYmFzZU5hbWUgPSBmdW5jdGlvbihkYXRhYmFzZU5hbWUpIHtcbiAgICAgICAgaWYgKCFfLmlzU3RyaW5nKGRhdGFiYXNlTmFtZSkpIGxvZ2dlci50aHJvdyhcImRhdGFiYXNlIG5hbWUgbXVzdCBiZSBhIHN0cmluZ1wiKTtcbiAgICBcbiAgICAgICAgaWYgKGRhdGFiYXNlTmFtZS5sZW5ndGggPT09IDApIGxvZ2dlci50aHJvdyhcImRhdGFiYXNlIG5hbWUgY2Fubm90IGJlIHRoZSBlbXB0eSBzdHJpbmdcIik7XG4gICAgXG4gICAgICAgIHZhciBpbnZhbGlkQ2hhcnMgPSBbXCIgXCIsIFwiLlwiLCBcIiRcIiwgXCIvXCIsIFwiXFxcXFwiXTtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGludmFsaWRDaGFycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYoZGF0YWJhc2VOYW1lLmluZGV4T2YoaW52YWxpZENoYXJzW2ldKSAhPSAtMSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhgZGF0YWJhc2UgbmFtZXMgY2Fubm90IGNvbnRhaW4gdGhlIGNoYXJhY3RlciBcIiR7aW52YWxpZENoYXJzW2ldfVwiYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgXG4gICAgaWYgKCFPYmplY3QucHJvdG90eXBlLnJlbmFtZVByb3BlcnR5KSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW5hbWVzIGFuIG9iamVjdCBwcm9wZXJ0eS5cbiAgICAgICAgICogXG4gICAgICAgICAqIEBtZXRob2QgT2JqZWN0I3JlbmFtZVByb3BlcnR5XG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2xkTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB0byByZW5hbWVcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG5ld05hbWUgLSBUaGUgbmV3IG5hbWUgb2YgdGhlIHByb3BlcnR5XG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcmV0dXJucyB7dGhpc30gVGhlIGNhbGxlZCBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShcbiAgICAgICAgICAgIE9iamVjdC5wcm90b3R5cGUsIFxuICAgICAgICAgICAgJ3JlbmFtZVByb3BlcnR5JyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB3cml0YWJsZSA6IGZhbHNlLCAvLyBDYW5ub3QgYWx0ZXIgdGhpcyBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgIGVudW1lcmFibGUgOiBmYWxzZSwgLy8gV2lsbCBub3Qgc2hvdyB1cCBpbiBhIGZvci1pbiBsb29wLlxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IGZhbHNlLCAvLyBDYW5ub3QgYmUgZGVsZXRlZCB2aWEgdGhlIGRlbGV0ZSBvcGVyYXRvclxuICAgICAgICAgICAgICAgIHZhbHVlIDogZnVuY3Rpb24gKG9sZE5hbWUsIG5ld05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRG8gbm90aGluZyBpZiBzb21lIG5hbWUgaXMgbWlzc2luZyBvciBpcyBub3QgYW4gc3RyaW5nXG4gICAgICAgICAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhvbGROYW1lKSB8fCAhXy5pc1N0cmluZyhuZXdOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIERvIG5vdGhpbmcgaWYgdGhlIG5hbWVzIGFyZSB0aGUgc2FtZVxuICAgICAgICAgICAgICAgICAgICBpZiAob2xkTmFtZSA9PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHRoZSBvbGQgcHJvcGVydHkgbmFtZSB0byBcbiAgICAgICAgICAgICAgICAgICAgLy8gYXZvaWQgYSBSZWZlcmVuY2VFcnJvciBpbiBzdHJpY3QgbW9kZS5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkob2xkTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbbmV3TmFtZV0gPSB0aGlzW29sZE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXNbb2xkTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIE1vbmdvUG9ydGFibGU7XG59OyJdfQ==
