import { JSWLogger } from "jsw-logger";
import * as _ from "lodash";
import * as Promise from "promise";

import { Cursor } from "./Cursor";

import { Aggregation } from "../aggregation";
import { ObjectId } from "../document";
import { EventEmitter } from "../emitter";
import { Selector, SelectorMatcher } from "../selector";

/**
 * Gets the size of an object.
 *
 * @param obj - The object
 *
 * @returns The size of the object
 */
const getObjectSize = (obj) => {
	let size = 0;
	let key;

	for (key in obj) {
		if (obj.hasOwnProperty(key)) {
			size++;
		}
	}

	return size;
};

// module.exports = function(Aggregation, Cursor, Selector, SelectorMatcher, ObjectId, EventEmitter, Logger, _) {

/**
 * Collection
 *
 * @module Collection
 * @constructor
 * @since 0.0.1
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 *
 * @classdesc Collection class that maps a MongoDB-like collection
 */
let database = null;
export class Collection /*extends EventEmitter*/ {
	public static _noCreateModifiers = {
		$unset: true,
		$pop: true,
		$rename: true,
		$pull: true,
		$pullAll: true
	};

	public name;
	public databaseName;
	public fullName;
	public docs;
	// tslint:disable-next-line:variable-name
	public doc_indexes;
	public snapshots;
	// opts;
	public emit: ((name: string, args: object) => Promise<void>);

	protected logger: JSWLogger;

	// var Collection = function(db, collectionName, options) {

	/**
	 * @param db - Database object
	 * @param collectionName - The name of the collection
	 */
	constructor(db, collectionName/*, options*/) {
		// super(options.log || {});
		// super();

		if (!(this instanceof Collection)) { return new Collection(db, collectionName/*, options*/); }

		this.logger = JSWLogger.instance;

		if (_.isNil(db)) { this.logger.throw("db parameter required"); }

		if (_.isNil(collectionName)) { this.logger.throw("collectionName parameter required"); }

		// if (_.isNil(options) || !_.isPlainObject(options)) options = {};

		Collection.checkCollectionName(collectionName);

		// this.db = db;
		database = db;
		this.name = collectionName;
		this.databaseName = db._databaseName;
		this.fullName = this.databaseName + "." + this.name;
		this.docs = [];
		this.doc_indexes = {};
		this.snapshots = [];
		// this.opts = {}; // Default options

		// _.merge(this.opts, options);

		this.emit = (name, args): Promise<void> => {
			return db.emit(name, args);
		};
	}

	// emit(name, args) {
	// 	 super.emit(name, args, database._stores);
	// }

	// TODO enforce rule that field names can't start with '$' or contain '.'
	// (real mongodb does in fact enforce this)
	// TODO possibly enforce that 'undefined' does not appear (we assume
	// this in our handling of null and $exists)

	/**
	 * Inserts a document into the collection
	 *
	 * @emits [[MongoPortable.insert]]
	 *
	 * @param doc - Document to be inserted
	 * @param options
	 * @param callback - Callback function to be called at the end with the results
	 *
	 * @returns Promise with the inserted document
	 */
	public insert(doc, options, callback?): Promise<any> {
		const self = this;

		return new Promise((resolve, reject) => {
			// REJECT
			if (_.isNil(doc)) { self.logger.throw("doc parameter required"); }

			if (!_.isPlainObject(doc)) { self.logger.throw("doc must be an object"); }

			if (_.isNil(options)) { options = {}; }

			if (_.isFunction(options)) {
				callback = options;
				options = {};
			}

			if (!_.isNil(callback) && !_.isFunction(callback)) { self.logger.throw("callback must be a function"); }

			// Creating a safe copy of the document
			const _doc = _.cloneDeep(doc);

			// If the document comes with a number ID, parse it to String
			if (_.isNumber(_doc._id)) {
				_doc._id = _.toString(_doc._id);
			}

			if (_.isNil(_doc._id) || (!(_doc._id instanceof ObjectId) && (!_.isString(_doc._id) || !_doc._id.length))) {
				_doc._id = new ObjectId();
			}

			// Add options to more dates
			_doc.timestamp = new ObjectId().generationTime;

			// Reverse
			self.doc_indexes[_.toString(_doc._id)] = self.docs.length;
			self.docs.push(_doc);

			self.emit("insert", {
				collection: self,
				doc: _doc
			}).then(() => {
				if (callback) { callback(null, _doc); }

				resolve(_doc);
			}).catch((error) => {
				// EXCEPTION UTIL
				if (callback) { callback(error, null); }

				reject(error);
			});
		});
	}

	/**
	 * Inserts several documents into the collection
	 *
	 * @param docs - Documents to be inserted
	 * @param options
	 * @param callback - Callback function to be called at the end with the results
	 *
	 * @returns Promise with the inserted documents
	 */
	public bulkInsert = function(docs, options, callback?) {
		const self = this;

		return new Promise((resolve, reject) => {
			if (_.isNil(docs)) { self.logger.throw("docs parameter required"); }

			if (!_.isArray(docs)) { self.logger.throw("docs must be an array"); }

			if (_.isNil(options)) { options = {}; }

			if (_.isFunction(options)) {
				callback = options;
				options = {};
			}

			if (!_.isNil(callback) && !_.isFunction(callback)) { self.logger.throw("callback must be a function"); }

			const promises = [];

			for (const doc of docs) {
				promises.push(self.insert(doc, options));
			}

			Promise.all(promises)
				.then((_docs) => {
					if (callback) { callback(null, _docs); }

					resolve(docs);
				}).catch((error) => {
					if (callback) { callback(error, null); }

					reject(error);
				});
		});
	};

	/**
	 * Finds all matching documents
	 *
	 * @fires [[MongoPortable.find]]
	 *
	 * @param selection - The selection for matching documents
	 * @param fields - The fields of the document to show
	 * @param options
	 * @param options.skip - Number of documents to be skipped
	 * @param options.limit - Max number of documents to display
	 * @param options.doNotFetch - If set to "true" returns the cursor not fetched
	 * @param callback - Callback function to be called at the end with the results
	 *
	 * @returns Returns a promise with the documents (or cursor if "options.forceFetch" set to true)
	 */
	public find(
		selection: object, fields: object,
		options: {
			skip?: number, limit?: number, /*fields: object, */doNotFecth?: boolean
		} = {
			doNotFecth: false
		},
		callback?: ((error: Error, result: Cursor|object[]) => void)
	): Promise<object[] | Cursor> {
		const self = this;

		return new Promise((resolve, reject) => {
			self.emit("find", {
				collection: self,
				selector: selection,
				fields
			}).then(() => {
				const cursor = new Cursor(self.docs, selection, fields, options);

				// Pass the cursor fetched to the callback
				if (options.doNotFecth) {
					if (callback) { callback(null, cursor); }

					resolve(cursor);
				} else {
					const docs = cursor.fetch();

					if (callback) { callback(null, docs); }

					resolve(docs);
				}
			}).catch((error) => {
				if (callback) { callback(error, null); }

				reject(error);
			});
		});
	}

	/**
	 * Finds the first matching document
	 *
	 * @fires [[MongoPortable.findOne]]
	 *
	 * @param selection - The selection for matching documents
	 * @param fields - The fields of the document to show
	 * @param options
	 * @param options.skip - Number of documents to be skipped
	 * @param options.limit - Max number of documents to display
	 * @param options.fields - Same as "fields" parameter (if both passed, "options.fields" will be ignored)
	 *
	 * @param callback - Callback function to be called at the end with the results
	 *
	 * @returns {Promise<Object>} Returns a promise with the first matching document of the collection
	 */
	public findOne(
		selection: object, fields: object,
		options: {
			skip?: number, limit?: number, /*fields: object, */doNotFecth?: boolean
		} = {
			doNotFecth: false
		},
		callback?: ((error: Error, result: object) => void)
	): Promise<object> {
		const self = this;

		return new Promise((resolve, reject) => {
			/*const params = ensureFindParams({
				selection,
				fields,
				options,
				callback
			});

			selection = params.selection;
			fields = params.fields;
			options = params.options;
			callback = params.callback;*/

			self.emit("findOne", {
				collection: self,
				selector: selection,
				fields
			}).then(() => {
				const cursor = new Cursor(self.docs, selection, fields, options);

				let res = null;

				if (cursor.hasNext()) {
					res = cursor.next();
				}

				if (callback) { callback(null, res); }

				resolve(res);
			}).catch((error) => {
				if (callback) { callback(error, null); }

				reject(error);
			});
		});
	}

	/**
	 * Updates one or many documents
	 *
	 * @fires [[MongoPortable.update]]
	 *
	 * @param selection - The selection for matching documents
	 * @param update - The update operation
	 * @param options
	 * @param options.updateAsMongo - By default:
	 * @param options.override - Replaces the whole document (only apllies when [updateAsMongo=false])
	 * @param options.upsert - Creates a new document when no document matches the query criteria
	 * @param options.multi - Updates multiple documents that meet the criteria
	 * @param callback - Callback function to be called at the end with the results
	 *
	 * @returns Returns a promise with the update/insert (if upsert=true) information
	 */
	public update(
		selection: any, update: any,
		options: {
			updateAsMongo?: boolean, override?: boolean, upsert?: boolean,
			multi?: boolean, skip?: number, limit?: number
		} = {
			updateAsMongo: false, override: false, upsert: false,
			multi: false
		},
		callback?: ((error: Error, result: object) => void)
	): Promise<any> {
		const self = this;

		return new Promise((resolve, reject) => {
			/*if (_.isNil(selection)) { selection = {}; }

			if (_.isNil(update)) { self.logger.throw("You must specify the update operation"); }

			if (_.isNil(options)) {
				options = {
					skip: 0,
					limit: 15   // for no limit pass [options.limit = -1]
				};
			}

			if (_.isFunction(selection)) { self.logger.throw("You must specify the update operation"); }

			if (_.isFunction(update)) { self.logger.throw("You must specify the update operation"); }

			if (_.isFunction(options)) {
				callback = options;
				options = {};
			}*/

			// Force to fetch the results
			const findOptions = _.assign({}, options, { doNotFecth: false });

			// Check special case where we are using an objectId
			if (selection instanceof ObjectId) {
				selection = {
					_id: selection
				};
			}

			if (!_.isNil(callback) && !_.isFunction(callback)) { self.logger.throw("callback must be a function"); }

			const res = null;

			// var docs = null;
			if (options.multi) {
				// docs = self.find(selection, null, { forceFetch: true });
				self.find(selection, null, findOptions/*, { forceFetch: true }*/)
					.then(onDocsFound)
					.catch(doReject);
			} else {
				// docs = self.findOne(selection);
				self.findOne(selection, null, findOptions, null/*callback*/)
					.then(onDocsFound)
					.catch(doReject);
			}

			function onDocsFound(docs: object | object[]) {
				if (_.isNil(docs)) {
					docs = [];
				}

				if (!_.isArray(docs)) {
					docs = [docs];
				}

				if ((docs as object[]).length === 0) {
					if (options.upsert) {
						self.insert(update, null, null/*callback*/)
							.then((inserted) => {
								doResolve({
									updated: {
										documents: null,
										count: 0
									},
									inserted: {
										documents: [inserted],
										count: 1
									}
								});
							}).catch(doReject);

						// res = {
						// 	 updated: {
						// 		 documents: null,
						// 		 count: 0
						// 	 },
						// 	 inserted: {
						// 		 documents: [inserted],
						// 		 count: 1
						// 	 }
						// };
					} else {
						// No documents found
						/*res = */doResolve({
							updated: {
								documents: null,
								count: 0
							},
							inserted: {
								documents: null,
								count: 0
							}
						});
					}
				} else {
					const updatedDocs = [];

					for (let i = 0; i < (docs as object[]).length; i++) {
						const doc = docs[i];

						let override = null;

						let hasModifier = false;

						for (const key of Object.keys(update)) {
							// IE7 doesn't support indexing into strings (eg, key[0] or key.indexOf('$') ), so use substr.
							// Testing over the first letter:
							// 	  Bests result with 1e8 loops => key[0](~3s) > substr(~5s) > regexp(~6s) > indexOf(~16s)

							const modifier = (key.substr(0, 1) === "$");
							if (modifier) {
								hasModifier = true;
							}

							if (options.updateAsMongo) {
								if (hasModifier && !modifier) { self.logger.throw("All update fields must be an update operator"); }

								if (!hasModifier && options.multi) { self.logger.throw("You can not update several documents when no update operators are included"); }

								if (hasModifier) { override = false; }

								if (!hasModifier) { override = true; }
							} else {
								override = !!options.override;
							}
						}

						let _docUpdate = null;

						if (override) {
							// Overrides the document except for the "_id"
							_docUpdate = {
								_id: doc._id
							};

							// Must ignore fields starting with '$', '.'...
							for (const key of Object.keys(update)) {
								if (key.substr(0, 1) === "$" || /\./g.test(key)) {
									self.logger.warn(`The field ${key} can not begin with '$' or contain '.'`);
								} else {
									_docUpdate[key] = update[key];
								}
							}
						} else {
							_docUpdate = _.cloneDeep(doc);

							for (const key of Object.keys(update)) {
								const val = update[key];

								if (key.substr(0, 1) === "$") {
									_docUpdate = applyModifier(_docUpdate, key, val);
								} else {
									if (!_.isNil(_docUpdate[key])) {
										if (key !== "_id") {
											_docUpdate[key] = val;
										} else {
											self.logger.warn("The field '_id' can not be updated");
										}
									} else {
										self.logger.warn(`The document does not contains the field ${key}`);
									}
								}
							}
						}

						updatedDocs.push(_docUpdate);

						const idx = self.doc_indexes[_docUpdate._id];
						self.docs[idx] = _docUpdate;
					}

					self.emit("update", {
						collection: self,
						selector: selection,
						modifier: update,
						docs: updatedDocs
					}).then(() => {
						doResolve({
							updated: {
								documents: updatedDocs,
								count: updatedDocs.length
							},
							inserted: {
								documents: null,
								count: 0
							}
						});
					}).catch((error) => {
						doReject(error);
					});

					// res = {
					// 	 updated: {
					// 		 documents: updatedDocs,
					// 		 count: updatedDocs.length
					// 	 },
					// 	 inserted: {
					// 		 documents: null,
					// 		 count: 0
					// 	 }
					// };
				}

				// if (callback) callback(null, res);

				// return res;
			}

			function doResolve(result) {
				if (callback) { callback(null, result); }

				resolve(result);
			}
			function doReject(error) {
				if (callback) { callback(error, null); }

				reject(error);
			}

		});
	}

	/**
	 * Removes one or many documents
	 *
	 * @fires [[MongoPortable.remove]]
	 *
	 * @param selection - The selection for matching documents
	 * @param options
	 * @param options.justOne - Deletes the first occurrence of the selection
	 *
	 * @param callback - Callback function to be called at the end with the results
	 *
	 * @returns Promise with the deleted documents
	 */
	public remove(selection, options, callback?): Promise<object[]> {
		const self = this;

		if (_.isNil(selection)) { selection = {}; }

		if (_.isFunction(selection)) {
			callback = selection;
			selection = {};
		}

		if (_.isFunction(options)) {
			callback = options;
			options = {};
		}

		if (_.isNil(options)) { options = { justOne: false }; }

		// If we are not passing a selection and we are not removing just one, is the same as a drop
		if (getObjectSize(selection) === 0 && !options.justOne) {
			return self.drop(options, callback);
		} else {
			return new Promise((resolve, reject) => {
				// Check special case where we are using an objectId
				if (selection instanceof ObjectId) {
					selection = {
						_id: selection
					};
				}

				if (!_.isNil(callback) && !_.isFunction(callback)) { self.logger.throw("callback must be a function"); }

				self.find(selection, null, null, callback)
					.then((documents: any[]) => {
						const docs = [];

						for (const doc of documents) {
							const idx = self.doc_indexes[doc._id];

							delete self.doc_indexes[doc._id];
							self.docs.splice(idx, 1);

							docs.push(doc);
						}

						self.emit("remove", {
							collection: self,
							selector: selection,
							docs
						}).then(() => {
							if (callback) { callback(null, docs); }

							resolve(docs);
						}).catch((error) => {
							if (callback) { callback(error, null); }

							reject(error);
						});

					}).catch((error) => {
						if (callback) { callback(error, null); }

						reject(error);
					});
			});
		}
	}

	/**
	 * Alias for [[Collection.remove]]
	 */
	public delete(selection, options, callback?): Promise<object[]> {
		return this.remove(selection, options, callback);
	}

	/**
	 * Alias for [[Collection.remove]]
	 */
	public destroy(selection, options, callback?): Promise<object[]> {
		return this.remove(selection, options, callback);
	}

	/**
	 * Drops a collection
	 *
	 * @param options
	 * @param options.dropIndexes - True if we want to drop the indexes too
	 * @param callback - Callback function to be called at the end with the results
	 *
	 * @returns Promise with the deleted documents
	 */
	public drop(options: { dropIndexes: boolean } = { dropIndexes: false }, callback?): Promise<object[]> {
		const self = this;

		return new Promise((resolve, reject) => {
			if (_.isNil(options)) {
				options = { dropIndexes: false };
			}

			if (_.isFunction(options)) {
				callback = options;
				options = { dropIndexes: false };
			}

			if (!_.isNil(callback) && !_.isFunction(callback)) {
				self.logger.throw("callback must be a function");
			}

			self.find(null, null, { limit: -1 }).then((docs) => {
				self.doc_indexes = {};
				self.docs = [];

				if (options.dropIndexes) {
					// TODO
				}

				self.emit("dropCollection", {
					collection: self,
					indexes: !!options.dropIndexes
				}).then(() => {
					if (callback) { callback(null, docs); }

					resolve(docs as object[]);
				}).catch((error) => {
					if (callback) { callback(error, false); }

					reject();
				});
			}).catch((error) => {
				if (callback) { callback(error, false); }

				reject();
			});

		});
	}

	/**
	 * Insert or update a document. If the document has an "_id" is an update (with upsert), if not is an insert.
	 *
	 * @param doc - Document to be inserted/updated
	 * @param options
	 * @param options.dropIndexes - True if we want to drop the indexes too
	 * @param callback - Callback function to be called at the end with the results
	 *
	 * @returns Returns a promise with the inserted document or the update information
	 */
	public save(doc, options, callback?): Promise<any> {
		if (_.isNil(doc) || _.isFunction(doc)) { this.logger.throw("You must pass a document"); }

		if (_.isFunction(options)) {
			callback = options;
			options = {};
		}

		if (_.isNil(options)) {
			options = {};
		}

		if (_.hasIn(doc, "_id")) {
			options.upsert = true;

			return this.update(
				{ _id: doc._id },
				doc,
				options,
				callback
			);
		} else {
			return this.insert(doc, options, callback);
		}
	}

	public ensureIndex() {
		// TODO Implement EnsureIndex
		this.logger.throw("Collection#ensureIndex unimplemented by driver");
	}

	// TODO document (at some point)
	// TODO test
	// TODO obviously this particular implementation will not be very efficient

	public backup(backupID, callback?): Promise<any> {
		const self = this;

		return new Promise((resolve, reject) => {
			if (_.isFunction(backupID)) {
				callback = backupID;
				backupID = new ObjectId().toString();
			}

			if (!_.isNil(callback) && !_.isFunction(callback)) { self.logger.throw("callback must be a function"); }

			self.snapshots[backupID] = _.cloneDeep(self.docs);

			self.emit("snapshot", {
				collection: self,
				backupID,
				documents: self.snapshots[backupID]
			}).then(() => {
				const result = {
					backupID,
					documents: self.snapshots[backupID]
				};

				if (callback) { callback(null, result); }

				resolve(result);
			}).catch((error) => {
				if (callback) { callback(error, null); }

				reject(error);
			});
		});
	}

	/**
	 * Lists available Backups
	 */
	public backups(/*callback*/) {
		// if (!_.isNil(callback) && !_.isFunction(callback)) this.logger.throw("callback must be a function");

		const backups = [];

		for (const id of Object.keys(this.snapshots)) {
			backups.push({ id, documents: this.snapshots[id] });
		}

		// if (callback) callback(null, backups);

		return backups;
	}

	public removeBackup(backupID/*, callback*/): string {
		// if (_.isFunction(backupID)) {
		// 	 callback = backupID;
		// 	 backupID = null;
		// }

		if (_.isNil(backupID)) { this.logger.throw("backupID required"); }

		// if (!_.isNil(callback) && !_.isFunction(callback)) this.logger.throw("callback must be a function");

		let result = null;

		if (backupID) {
			delete this.snapshots[_.toString(backupID)];

			result = backupID;
			// } else {
			// 	 this.snapshots = {};

			// 	 result = true;
		}

		// if (callback) callback(null, result);

		return result;
	}

	/**
	 * @TO-DO
	 */
	public clearBackups() {
		// TODO
	}

	/**
	 * Restore the snapshot. If no snapshot exists, raise an exception;
	 */
	public restore(backupID, callback): Promise<string> {
		const self = this;

		return new Promise((resolve, reject) => {
			if (_.isFunction(backupID)) {
				callback = backupID;
				backupID = null;
			}

			if (!_.isNil(callback) && !_.isFunction(callback)) { self.logger.throw("callback must be a function"); }

			const snapshotCount = getObjectSize(self.snapshots);
			let backupData = null;

			if (snapshotCount === 0) {
				self.logger.throw("There is no snapshots");
			} else {
				if (!backupID) {
					if (snapshotCount === 1) {
						self.logger.info("No backupID passed. Restoring the only snapshot");

						// Retrieve the only snapshot
						for (const key of Object.keys(self.snapshots)) { backupID = key; }
					} else {
						self.logger.throw("The are several snapshots. Please specify one backupID");
					}
				}
			}

			backupData = self.snapshots[backupID];

			if (!backupData) {
				self.logger.throw(`Unknown Backup ID: ${backupID}`);
			}

			self.docs = backupData;

			self.emit("restore", {
				collection: self,
				backupID
			}).then(() => {
				if (callback) { callback(null, backupID); }

				resolve(backupID);
			}).catch((error) => {
				if (callback) { callback(error, null); }

				reject(error);
			});
		});
	}

	/**
	 * Calculates aggregate values for the data in a collection
	 *
	 * @param pipeline - A sequence of data aggregation operations or stages
	 * @param options
	 * @param options.forceFetch - If set to'"true" returns the array of documents already fetched
	 *
	 * @returns If "options.forceFetch" set to true returns the array of documents, otherwise returns a cursor
	 */
	public aggregate(pipeline, options = { forceFetch: false }) {
		if (_.isNil(pipeline) || !_.isArray(pipeline)) { this.logger.throw('The "pipeline" param must be an array'); }

		const aggregation = new Aggregation(pipeline);

		for (const stage of pipeline) {
			for (const key of Object.keys(stage)) {
				if (key.substr(0, 1) !== "$") { this.logger.throw("The pipeline stages must begin with '$'"); }

				if (!aggregation.validStage(key)) { this.logger.throw(`Invalid stage "${key}"`); }

				break;
			}
		}

		const result = aggregation.aggregate(this);

		return result;  // change to cursor
	}

	public rename(newName) {
		if (_.isString(newName)) {
			if (this.name !== newName) {
				Collection.checkCollectionName(newName);

				const dbName = this.name.split(".").length > 1 ? this.name.split(".")[0] : "";

				this.name = newName;
				this.fullName = dbName + "." + this.name;

				return this;
			}
		} else {
			// Error
			return null;
		}
	}

	public static checkCollectionName(collectionName) {
		if (!_.isString(collectionName)) {
			JSWLogger.instance.throw("collection name must be a String");
		}

		if (!collectionName || collectionName.indexOf("..") !== -1) {
			JSWLogger.instance.throw("collection names cannot be empty");
		}

		if (collectionName.indexOf("$") !== -1 && collectionName.match(/((^\$cmd)|(oplog\.\$main))/) === null) {
			JSWLogger.instance.throw("collection names must not contain '$'");
		}

		if (collectionName.match(/^system\./) !== null) {
			JSWLogger.instance.throw("collection names must not start with 'system.' (reserved for internal use)");
		}

		if (collectionName.match(/^\.|\.$/) !== null) {
			JSWLogger.instance.throw("collection names must not start or end with '.'");
		}
	}
}

const applyModifier = (_docUpdate, key, val) => {
	const doc = _.cloneDeep(_docUpdate);
	// var mod = modifiers[key];

	if (!modifiers[key]) {
		JSWLogger.instance.throw(`Invalid modifier specified: ${key}`);
	}

	for (const keypath of Object.keys(val)) {
		const value = val[keypath];
		const keyparts = keypath.split(".");

		modify(doc, keyparts, value, key);

		// var no_create = !!Collection._noCreateModifiers[key];
		// var forbid_array = (key === "$rename");
		// var target = Collection._findModTarget(_docUpdate, keyparts, no_create, forbid_array);
		// var field = keyparts.pop();

		// mod(target, field, value, keypath, _docUpdate);
	}

	return doc;
};

const modify = (document, keyparts, value, key, level = 0) => {
	for (let i = level; i < keyparts.length; i++) {
		let path = keyparts[i];
		const isNumeric = /^[0-9]+$/.test(path);
		let target = document[path];

		const create = _.hasIn(Collection._noCreateModifiers, key) ? false : true;
		if (!create && (!_.isObject(document) || _.isNil(target))) {
			JSWLogger.instance.throw(`The element "${path}" must exists in "${JSON.stringify(document)}"`);
		}

		if (_.isArray(document)) {
			// Do not allow $rename on arrays
			if (key === "$rename") { return null; }

			// Only let the use of "arrayfield.<numeric_index>.subfield"
			if (isNumeric) {
				path = _.toNumber(path);
			} else {
				JSWLogger.instance.throw(`The field "${path}" can not be appended to an array`);
			}

			// Fill the array to the desired length
			while (document.length < path) {
				document.push(null);
			}
		}

		if (i < keyparts.length - 1) {
			if (_.isNil(target)) {
				// If we are accessing with "arrayField.<numeric_index>"
				if (_.isFinite(_.toNumber(keyparts[i + 1]))) {  //  || keyparts[i + 1] === '$'  // TODO "arrayField.$"
					target = [];
				} else {
					target = {};
				}
			}

			document[path] = modify(target, keyparts, value, key, level + 1);

			return document;
		} else {
			modifiers[key](document, path, value);

			return document;
		}
	}
};

const modifiers = {
	$inc(target, field, arg) {
		if (!_.isNumber(arg)) {
			JSWLogger.instance.throw("Modifier $inc allowed for numbers only");
		}

		if (field in target) {
			if (!_.isNumber(target[field])) {
				JSWLogger.instance.throw("Cannot apply $inc modifier to non-number");
			}

			target[field] += arg;
		} else {
			target[field] = arg;
		}
	},

	$set(target, field, arg) {
		target[field] = _.cloneDeep(arg);
	},

	$unset(target, field, arg) {
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

	$push(target, field, arg) {
		const fieldTarget = target[field];

		if (_.isNil(fieldTarget)) {
			target[field] = [arg];
		} else if (!_.isArray(fieldTarget)) {
			JSWLogger.instance.throw("Cannot apply $push modifier to non-array");
		} else {
			fieldTarget.push(_.cloneDeep(arg));
		}
	},

	$pushAll(target, field, arg) {
		const fieldTarget = target[field];

		if (_.isNil(fieldTarget)) {
			target[field] = arg;
		} else if (!_.isArray(fieldTarget)) {
			JSWLogger.instance.throw("Modifier $pushAll/pullAll allowed for arrays only");
		} else {
			for (const argValue of arg) {
				fieldTarget.push(argValue);
			}
		}
	},

	$addToSet(target, field, arg) {
		const fieldTarget = target[field];

		if (_.isNil(fieldTarget)) {
			target[field] = [arg];
		} else if (!_.isArray(fieldTarget)) {
			JSWLogger.instance.throw("Cannot apply $addToSet modifier to non-array");
		} else {
			let isEach = false;
			if (_.isPlainObject(arg)) {
				for (const key of Object.keys(arg)) {
					if (key === "$each") {
						isEach = true;
					}

					break;
				}
			}

			const values = isEach ? arg.$each : [arg];
			_.forEach(values, (value) => {
				for (const fieldTargetValue of fieldTarget) {
					if (SelectorMatcher.equal(value, fieldTargetValue)) { return; }
				}

				fieldTarget.push(value);
			});
		}
	},

	$pop(target, field, arg) {
		if (_.isNil(target) || _.isNil(target[field])) { return; }

		const fieldTarget = target[field];

		if (!_.isArray(fieldTarget)) {
			JSWLogger.instance.throw("Cannot apply $pop modifier to non-array");
		} else {
			if (_.isNumber(arg) && arg < 0) {
				fieldTarget.splice(0, 1);
			} else {
				fieldTarget.pop();
			}
		}
	},

	$pull(target, field, arg) {
		if (_.isNil(target) || _.isNil(target[field])) { return; }

		const fieldTarget = target[field];

		if (!_.isArray(fieldTarget)) {
			JSWLogger.instance.throw("Cannot apply $pull/pullAll modifier to non-array");
		} else {
			const out = [];

			if (typeof arg === "object" && !(arg instanceof Array)) {
				// XXX would be much nicer to compile this once, rather than
				// for each document we modify.. but usually we're not
				// modifying that many documents, so we'll let it slide for
				// now

				// XXX _compileSelector isn't up for the job, because we need
				// to permit stuff like {$pull: {a: {$gt: 4}}}.. something
				// like {$gt: 4} is not normally a complete selector.
				const match = new Selector({
					__matching__: arg
				});
				for (const fieldTargetValue of fieldTarget) {
					const doc = {
						__matching__: fieldTargetValue
					};
					if (!match.test(doc)) {
						out.push(fieldTargetValue);
					}
				}
			} else {
				for (const fieldTargetValue of fieldTarget) {
					if (!SelectorMatcher.equal(fieldTargetValue, arg)) {
						out.push(fieldTargetValue);
					}
				}
			}

			target[field] = out;
		}
	},

	$pullAll(target, field, arg) {
		if (_.isNil(target) || _.isNil(target[field])) { return; }

		const fieldTarget = target[field];

		if (!_.isNil(fieldTarget) && !_.isArray(fieldTarget)) {
			JSWLogger.instance.throw("Modifier $pushAll/pullAll allowed for arrays only");
		} else if (!_.isNil(fieldTarget)) {
			const out = [];

			for (const fieldTargetValue of fieldTarget) {
				let exclude = false;

				for (const argValue of arg) {
					if (SelectorMatcher.equal(fieldTargetValue, argValue)) {
						exclude = true;

						break;
					}
				}

				if (!exclude) {
					out.push(fieldTargetValue);
				}
			}

			target[field] = out;
		}
	},

	$rename(target, field, value) {
		if (field === value) {
			// no idea why mongo has this restriction..
			JSWLogger.instance.throw("The new field name must be different");
		}

		if (!_.isString(value) || value.trim() === "") {
			JSWLogger.instance.throw("The new name must be a non-empty string");
		}

		target[value] = target[field];
		delete target[field];
	},

	$bit(target, field, arg) {
		// XXX mongo only supports $bit on integers, and we only support
		// native javascript numbers (doubles) so far, so we can't support $bit
		JSWLogger.instance.throw("$bit is not supported");
	}
};

const ensureFindParams = (params) => {
	// selection, fields, options, callback
	if (_.isNil(params.selection)) { params.selection = {}; }

	if (_.isNil(params.fields)) { params.fields = []; }

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
		JSWLogger.instance.throw("callback must be a function");
	}

	if (params.options.fields) {
		if (_.isNil(params.fields) || params.fields.length === 0) {
			params.fields = params.options.fields;
		} else {
			JSWLogger.instance.warn("Fields already present. Ignoring 'options.fields'.");
		}
	}

	return params;
};
