/***
 * @file MongoPortable.js - based on Monglo ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 *
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */
import { JSWLogger } from "jsw-logger";
import * as _ from "lodash";
import * as Promise from "promise";

import { Options } from "./Options";

import { Collection } from "../collection";
import { ObjectId } from "../document";
import { EventEmitter } from "../emitter";
import { ConnectionHelper, IConnection, Utils } from "../utils";

/***
 * MongoPortable
 *
 * @module MongoPortable
 * @since 0.0.1
 *
 * @classdesc Portable database with persistence and MongoDB-like API
 *
 * @param  {string} databaseName - Name of the database.
 */
export class MongoPortable extends EventEmitter {
	private static _connHelper: ConnectionHelper = new ConnectionHelper();
	// static version = "0.0.1";

	public pkFactory;

	protected logger: JSWLogger;

	private _collections: {};
	private _stores: Array<object | (() => object)>;
	private _databaseName: string;

	constructor(databaseName: string, options: any) {
		super(options || { log: {} });

		this.logger = JSWLogger.instance;

		// If we have already this instance, return it
		if (MongoPortable._connHelper.hasConnection(databaseName)) {
			return MongoPortable._connHelper.getConnection(databaseName).instance;
		} else {
			this._collections = {};
			this._stores = [];

			// Check ddbb name format
			MongoPortable._connHelper.validateDatabaseName(databaseName);

			this._databaseName = databaseName;

			MongoPortable._connHelper.addConnection(databaseName, new ObjectId(), this);
		}
	}

	public emit(name: string, args: object): Promise<void> {
		return super.emit(name, args, this._stores);
	}

	/***
	 * Middleware functions
	 *
	 * @param  {String} name - Name of the middleware:
	 *	  <ul>
	 *		  <li>"store": Add a custom store</li>
	 *	  </ul>
	 * @param  {Object|Function} fn - Function to implement the middleware
	 */
	public use(name: string, obj: any): void {
		switch (name) {
			case "store":
				this._stores.push(obj);
				break;
		}
	}

	/***
	 * Adds a custom stores for remote and local persistence
	 *
	 * @param {Object|Function} store - The custom store
	 *
	 * @returns {MongoPortable} this - The current Instance
	 */
	public addStore(store: object|(() => object)): MongoPortable {
		if (_.isNil(store)) { this.logger.throw("missing \"store\" parameter"); }

		if (_.isFunction(store)) {
			this._stores.push(store());
		} else if (_.isObject(store)) {
			this._stores.push(store);
		} else {
			this.logger.throw("\"store\" must be a function or object");
		}

		return this;
	}

	/***
	 * Returns a cursor to all the collection information.
	 *
	 * @param {String} [collectionName=null] - the collection name we wish to retrieve the information from.
	 * @param {Function} [callback=null] - Callback function to be called at the end with the results
	 *
	 * @returns {Array}
	 *
	 * @todo Implement
	 */
	public collectionsInfo(collectionName, callback?) {
		this.logger.throw("Not implemented yet");
	}

	/***
	 * Alias for {@link MongoPortable#collections}
	 *
	 * @method MongoPortable#fetchCollections
	 */
	public fetchCollections(options: { collectionName?: string, namesOnly?: boolean } = {}, callback?: ((collections: Collection[]) => void)): Collection[] {
		return this.collections(options, callback);
	}

	/***
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
	public collections(options: { collectionName?: string, namesOnly?: boolean } = {}, callback?: ((collections: Collection[]) => void)): Collection[] {
		// Review type check
		if (_.isNil(callback) && _.isFunction(options)) {
			callback = options as ((collections: Collection[]) => void);
			options = null;
		}

		if (_.isNil(options)) { options = {}; }

		const collectionList = [];
		for (const name of Object.keys(this._collections)) {
			// Only add the requested collections //TODO Add array type
			if (options.collectionName) {
				if (name.toLowerCase() === options.collectionName.toLowerCase()) {
					if (options.namesOnly) {
						collectionList.push(name);
					} else {
						collectionList.push(this._collections[name]);
					}
				}
			} else {
				if (options.namesOnly) {
					collectionList.push(name);
				} else {
					collectionList.push(this._collections[name]);
				}
			}
		}

		if (callback) { callback(collectionList); }

		return collectionList;
	}

	/***
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
	public collectionNames(options: { collectionName?: string, namesOnly?: boolean } = { namesOnly: true }, callback?: ((collections: Collection[]) => void)): Collection[] {
		// Review type check
		if (_.isNil(callback) && _.isFunction(options)) {
			callback = options as ((collections: Collection[]) => void);
			options = null;
		}

		if (_.isNil(options)) { options = {}; }

		options.namesOnly = true;

		return this.collections(options, callback);
	}

	/***
	 * Creates a collection on a server pre-allocating space, need to create f.ex capped collections.
	 *
	 * @method MongoPortable#collection
	 *
	 * @param {String} collectionName - the collection name we wish to access.
	 * @param {Object} [options] - returns option results.
	 *
	 * @param {Boolean|Object} [options.safe=false] Executes with a getLastError command returning the results of the command on MongoMonglo:
	 *	  <ul>
	 *		  <li>true</li>
	 *		  <li>false</li>
	 *		  <li>{ w: {Number}, wtimeout: {Number}}</li>
	 *		  <li>{ fsync: true }</li>
	 *	  </ul>
	 * @param {Boolean} [options.serializeFunctions=false] - Serialize functions on the document.
	 * @param {Boolean} [options.raw=false] - Perform all operations using raw bson objects.
	 * @param {Object} [options.pkFactory=null] - Object overriding the basic ObjectId primary key generation.
	 * @param {Boolean} [options.capped=false] - Create a capped collection.
	 * @param {Number} [options.size=4096] - The size of the capped collection in bytes.
	 * @param {Number} [options.max=500] - The maximum number of documents in the capped collection.
	 * @param {Boolean} [options.autoIndexId=false] - Create an index on the _id field of the document, not created automatically on capped collections.
	 * @param {String} [options.readPreference=ReadPreference.PRIMARY] - Te prefered read preference:
	 *	  <ul>
	 *		  <li>ReadPreference.PRIMARY</li>
	 *		  <li>ReadPreference.PRIMARY_PREFERRED</li>
	 *		  <li>ReadPreference.SECONDARY</li>
	 *		  <li>ReadPreference.SECONDARY_PREFERRED</li>
	 *		  <li>ReadPreference.NEAREST</li>
	 *	  </ul>
	 *
	 * @param {Function} [callback=null] - Callback function to be called at the end with the results
	 *
	 * @fires {@link MongoStore#createCollection}
	 *
	 * @returns {Promise<Collection>}
	 */
	public collection(collectionName: string, options: {} = {}, callback?: ((error: Error, collection: Collection) => void)): Promise<Collection> {
		return new Promise((resolve, reject) => {
			let existing = true;
			// var collection;
			// var collectionFullName =  self.databaseName + "." + collectionName;
			/*
			if (_.isFunction(options)) {
				callback = options;
				options = {};
			} else {
				options = options || {};
			}*/

			if (!this._collections[collectionName]) {
				this._collections[collectionName] = new Collection(this, collectionName/*, this.pkFactory*//*, options*/);

				existing = false;
			}

			/***
			 * "createCollection" event.
			 *
			 * @event MongoPortable~createCollection
			 *
			 * @property {Object} connection - Information about the current database connection
			 * @property {Object} collection - Information about the collection created
			 */
			this.emit("createCollection", {
				connection: this,
				collection: this._collections[collectionName]
			}).then(() => {
				if (!existing) {
					// Letting access the collection by <MongoPortable instance>.<COL_NAME>
					Object.defineProperty(MongoPortable.prototype, collectionName, {
						enumerable: true,
						configurable: true,
						writable: false,
						value: this._collections[collectionName]
					});
				}

				// return self._collections[collectionName];
				if (callback) { callback(null, this._collections[collectionName]); }

				resolve(this._collections[collectionName]);
			}).catch((error) => {
				if (callback) { callback(error, null); }

				reject(error);
			});
		});
	}

	/***
	 * Alias for {@link MongoPortable#collection}
	 *
	 * @method MongoPortable#createCollection
	 */
	public createCollection(collectionName: string, options: {} = {}, callback?: ((error: Error, collection: Collection) => void)): Promise<Collection> {
		return this.collection(collectionName, options, callback);
	}

	/***
	 * Drop a collection from the database, removing it permanently. New accesses will create a new collection.
	 *
	 * @method MongoPortable#dropCollection
	 *
	 * @param  {String} collectionName - The name of the collection we wish to drop.
	 * @param {Function} [callback=null] - Callback function to be called at the end with the results
	 *
	 * @returns {Promise<Boolean>} Promise with "true" if dropped successfully
	 */
	public dropCollection(collectionName: string, callback?: ((error: Error, dropped: boolean) => void)): Promise<boolean> {
		return new Promise((resolve, reject) => {
			if (this._collections[collectionName]) {
				// Drop the collection
				this.emit("dropCollection", {
					conn: this,
					collection: this._collections[collectionName]
				}).then(() => {
					delete this._collections[collectionName];

					if (callback && _.isFunction(callback)) { callback(null, true); }

					resolve(true);
				}).catch((error) => {
					if (callback && _.isFunction(callback)) { callback(error, false); }

					reject(error);
				});

			} else {
				const error = new Error("No collection found");

				this.logger.throw(error);

				if (callback && _.isFunction(callback)) { callback(error, false); }

				reject(error);
			}
		});
	}

	/***
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
	public renameCollection(fromCollection: string, toCollection: string, callback?: ((error: Error, collection: Collection) => void)): Promise<Collection> {
		return new Promise((resolve, reject) => {
			if (!_.isString(fromCollection) || !_.isString(toCollection) || fromCollection === toCollection) {
				const error = new Error("You should pass two different string names");

				this.logger.throw(error);

				if (callback && _.isFunction(callback)) { callback(error, null); }

				reject(error);
			} else {
				Collection.checkCollectionName(toCollection);

				if (this._collections[fromCollection]) {
					this.emit("renameCollection", {
						conn: this,
						from: fromCollection,
						to: toCollection
					}).then(() => {
						const renamed = this._collections[fromCollection].rename(toCollection);

						if (renamed) {
							Utils.renameObjectProperty(this._collections, fromCollection, toCollection);
							// this._collections.renameProperty(fromCollection, toCollection);
							// this.renameProperty(fromCollection, toCollection);
							Utils.renameObjectProperty(this, fromCollection, toCollection);

							if (callback && _.isFunction(callback)) { callback(null, renamed); }

							resolve(renamed);
						} else {
							reject(new Error("Could not rename collection"));
						}
					}).catch((error) => {
						this.logger.throw(error);

						if (callback && _.isFunction(callback)) { callback(error, null); }

						reject(error);
					});
				} else {
					const error = new Error("No collection found");

					this.logger.throw(error);

					if (callback && _.isFunction(callback)) { callback(error, null); }

					reject(error);
				}
			}
		});
	}

	/***
	 * Creates an index on the collection.
	 *
	 * @method MongoPortable#createIndex
	 *
	 * @param {String} collectionName - Name of the collection to create the index on.
	 * @param {Object} fieldOrSpec - FieldOrSpec that defines the index.
	 * @param {Object} [options] - Additional options during update.
	 *
	 * @param {Boolean|Object} [options.safe=false] Executes with a getLastError command returning the results of the command on MongoMonglo:
	 *	  <ul>
	 *		  <li>true</li>
	 *		  <li>false</li>
	 *		  <li>{ w: {Number}, wtimeout: {Number}}</li>
	 *		  <li>{ fsync: true }</li>
	 *	  </ul>
	 * @param {Boolean} [options.unique=false] - Creates an unique index
	 * @param {Boolean} [options.sparse=false] - Creates a sparse index
	 * @param {Boolean} [options.background=false] - Creates the index in the background, yielding whenever possible
	 * @param {Boolean} [options.dropDups=false] - A unique index cannot be created on a key that has pre-existing duplicate values.
	 * 		If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value
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
	public createIndex(collectionName, fieldOrSpec, options, callback) {
		this.logger.throw("Not implemented yet!");
	}

	/***
	 * Ensures that an index exists, if it does not it creates it
	 *
	 * @method MongoPortable#ensureIndex
	 *
	 * @param {String} collectionName - Name of the collection to create the index on.
	 * @param {Object} fieldOrSpec - FieldOrSpec that defines the index.
	 * @param {Object} [options] - Additional options during update.
	 *
	 * @param {Boolean|Object} [options.safe=false] - Executes with a getLastError command returning the results of the command on MongoMonglo:
	 *	  <ul>
	 *		  <li>true</li>
	 *		  <li>false</li>
	 *		  <li>{ w: {Number}, wtimeout: {Number}}</li>
	 *		  <li>{ fsync: true }</li>
	 *	  </ul>
	 * @param {Boolean} [options.unique=false] - Creates an unique index
	 * @param {Boolean} [options.sparse=false] - Creates a sparse index
	 * @param {Boolean} [options.background=false] - Creates the index in the background, yielding whenever possible
	 * @param {Boolean} [options.dropDups=false] - A unique index cannot be created on a key that has pre-existing duplicate values.
	 * 		If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value
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
	public ensureIndex(collectionName, fieldOrSpec, options, callback) {
		this.logger.throw("Not implemented yet!");
	}

	/***
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
	public dropIndex(collectionName, indexName, callback) {
		this.logger.throw("Not implemented yet!");
	}

	/***
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
	public reIndex(collectionName, callback) {
		this.logger.throw("Not implemented yet!");
	}

	/***
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
	public indexInformation(collectionName, options, callback) {
		this.logger.throw("Not implemented yet!");
	}

	/***
	 * Drop the whole database.
	 *
	 * @method MongoPortable#dropDatabase
	 *
	 * @param {Function} [callback=null] - Callback function to be called at the end with the results
	 *
	 * @return {Promise<Boolean>} Promise with "true" if dropped successfully
	 */
	public dropDatabase(callback?: ((error: Error, dropped: boolean) => void)): Promise<boolean> {
		return new Promise((resolve, reject) => {
			if (MongoPortable._connHelper.hasConnection(this._databaseName)) {
				this.emit("dropDatabase", {
					conn: this
				}).then(() => {
					MongoPortable._connHelper.dropConnection(this._databaseName);

					this._collections = [];
					this._stores = [];

					if (callback && _.isFunction(callback)) { callback(null, true); }

					resolve(true);
				});
			} else {
				const error = new Error("That database no longer exists");

				this.logger.throw(error);

				if (callback && _.isFunction(callback)) { callback(error, false); }

				reject(error);
			}
		});
	}

	/***
	 * Dereference a dbref, against a db
	 *
	 * @param {DBRef} dbRef db reference object we wish to resolve.
	 * @param {Function} [callback=null] Callback function to be called at the end with the results
	 *
	 * @todo Implement
	 *
	 * @ignore
	 */
	public dereference(dbRef, callback) {
		// TODO
		// var db = this;

		// // If we have a db reference then let"s get the db first
		// if (dbRef.db !== null) db = this.db(dbRef.db);

		// // Fetch the collection and find the reference
		// var collection = Monglo.collection(dbRef.namespace);

		// collection.findOne({"_id":dbRef.oid}, function(err, result) {
		// 	 callback(err, result);
		// });
	}

	/***
	 * Retrieves the instance of that DDBB name
	 *
	 * @param {String} name - The DDBB name
	 *
	 * @return {MongoPortable} - The DDBB instance
	 */
	public static getInstance(name: string): IConnection {
		if (!_.isNil(name)) {
			return MongoPortable._connHelper.getConnection(name);
		}

		return null;
	}
}
