import { JSWLogger } from "jsw-logger";
import * as _ from "lodash";

import { Selector } from "../selector";

/*
class Options {
	public skip: number;
	public limit: number;
	public sort;

	private __defaultOptions = {
		skip: 0,
		limit: 15,
		sort: null
	};

	constructor(options?: any) {
		if (_.isNil(options)) {
			options = {};
		}

		this.skip = (options.skip ? options.skip : this.__defaultOptions.skip);
		this.limit = (options.limit ? options.limit : this.__defaultOptions.limit);
		this.sort = (options.sort ? options.sort : this.__defaultOptions.sort);
	}
}
*/

/***
 * Cursor
 *
 * @module Cursor
 * @since 0.0.1
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 * @classdesc Cursor class that maps a MongoDB-like cursor
 */
export class Cursor {
	public static COLSCAN = "colscan";
	public static IDXSCAN = "idxscan";

	public documents;
	public selector;
	public fields;
	public skipValue;
	public limitValue;
	public sortValue;
	public sorted: boolean = false;
	public selectorCompiled;
	public selectorId;
	public fetchMode;
	public indexes = null;
	public sortCompiled;
	public dbObjects;
	public cursorPosition;

	protected logger: JSWLogger;

	private defaultOptions = {
		skip: 0,
		limit: 15,
		sort: null
	};

	/***
	 * @param {MongoPortable} db - Additional options
	 * @param {Array} documents - The list of documents
	 * @param {Object|Array|String} [selection={}] - The selection for matching documents
	 * @param {Object|Array|String} [fields={}] - The fields of the document to show
	 * @param {Object} [options] - Database object
	 *
	 * @param {Object} [options.pkFactory=null] - Object overriding the basic "ObjectId" primary key generation.
	 */
	constructor(documents, selection, fields?, options: object = {}) {
		this.documents = documents;
		this.selector = selection;

		const opts = _.assign({}, this.defaultOptions, options);

		this.skipValue = opts.skip;
		this.limitValue = opts.limit;
		this.sortValue = opts.sort;

		this.logger = JSWLogger.instance;

		/**** ADD IDX ****/
		if (Selector.isSelectorCompiled(this.selector)) {
			this.selectorCompiled = this.selector;
		} else {
			this.selectorCompiled = new Selector(this.selector, Selector.MATCH_SELECTOR);
		}

		for (const clause of this.selectorCompiled.clauses) {
			if (clause.key === "_id") {
				this.selectorId = clause.value;
			}
		}

		for (const clause of this.selectorCompiled.clauses) {
			if (clause.key === "_id") {
				const val = clause.value;

				if (_.isString(val) || _.isNumber(val)) {
					this.selectorId = val;
				}
			}
		}

		/**** ADD IDX ****/

		this.fetchMode = Cursor.COLSCAN || Cursor.IDXSCAN;
		// this.indexes = null;//findUsableIndexes();

		// if (cursor.fetchMode === Cursor.COLSCAN) {
		// 	 // COLSCAN, wi will iterate over all documents
		// 	 docs = _.cloneDeep(cursor.collection.docs);
		// } else if (cursor.fetchMode === Cursor.IDXSCAN) {
		// 	 // IDXSCAN, wi will iterate over all needed documents
		// 	 for (let i = 0; i < cursor.indexes.length; i++) {
		// 		 let index = cursor.indexes[i];

		// 		 for (let i = index.start; i < index.end; i++) {
		// 			 let idx_id = cursor.collection.getIndex(index.name)[i];

		// 			 docs.push(cursor.collection.docs[idx_id]);
		// 		 }
		// 	 }
		// }

		this.fields = new Selector(fields, Selector.FIELD_SELECTOR);

		this.sortCompiled = new Selector(this.sortValue, Selector.SORT_SELECTOR);

		this.dbObjects = null;
		this.cursorPosition = 0;
	}

	/***
	 * Moves a cursor to the begining
	 *
	 * @method Cursor#rewind
	 */
	public rewind() {
		this.dbObjects = null;
		this.cursorPosition = 0;
	}

	/***
	 * Iterates over the cursor, calling a callback function
	 *
	 * @method Cursor#forEach
	 *
	 * @param {Function} [callback=null] - Callback function to be called for each document
	 */
	public forEach(callback) {
		const docs = this.fetchAll();

		for (const doc of docs) {
			callback(doc);
		}
	}

	/***
	 * Iterates over the cursor, returning a new array with the documents affected by the callback function
	 *
	 * @method Cursor#map
	 *
	 * @param {Function} [callback=null] - Callback function to be called for each document
	 *
	 * @returns {Array} The documents after being affected with the callback function
	 */
	public map(callback) {
		const res = [];

		this.forEach((doc) => {
			res.push(callback(doc));
		});

		return res;
	}

	/***
	 * Checks if the cursor has one document to be fetched
	 *
	 * @method Cursor#hasNext
	 *
	 * @returns {Boolean} True if we can fetch one more document
	 */
	public hasNext() {
		return (this.cursorPosition < this.documents.length);
	}

	/***
	 * Alias for {@link Cursor#fetchOne}
	 *
	 * @method Cursor#next
	 */
	public next() {
		return this.fetchOne();
	}

	/***
	 * Alias for {@link Cursor#fetchAll}
	 *
	 * @method Cursor#fetch
	 */
	public fetch() {
		return this.fetchAll();
	}

	/***
	 * Fetch all documents in the cursor
	 *
	 * @method Cursor#fetchAll
	 *
	 * @returns {Array} All the documents contained in the cursor
	 */
	public fetchAll() {
		return getDocuments(this, false) || [];
	}

	/***
	 * Retrieves the next document in the cursor
	 *
	 * @method Cursor#fetchOne
	 *
	 * @returns {Object} The next document in the cursor
	 */
	public fetchOne() {
		return getDocuments(this, true);
	}

	/***
	 * Obtains the total of documents of the cursor
	 *
	 * @method Cursor#count
	 *
	 * @returns {Number} The total of documents in the cursor
	 */
	public count() {
		return this.fetchAll().length;
	}

	/***
	 * Set the sorting of the cursor
	 *
	 * @method Cursor#sort
	 *
	 * @param {Object|Array|String} spec - The sorting specification
	 *
	 * @returns {Cursor} This instance so it can be chained with other methods
	 */
	public setSorting(spec) {
		if (_.isNil(spec)) { this.logger.throw("You need to specify a sorting"); }

		if (spec) {
			this.sortValue = spec;
			this.sortCompiled = (new Selector(spec, Selector.SORT_SELECTOR));
		}

		return this;
	}

	/***
	 * Applies a sorting on the cursor
	 *
	 * @method Cursor#sort
	 *
	 * @param {Object|Array|String} spec - The sorting specification
	 *
	 * @returns {Cursor} This instance so it can be chained with other methods
	 */
	public sort(spec) {
		let _sort = this.sortCompiled || null;

		if (spec) {
			_sort = new Selector(spec, Selector.SORT_SELECTOR);
		}

		if (_sort) {
			if (!_.isNil(this.dbObjects) && _.isArray(this.dbObjects)) {
				this.dbObjects = this.dbObjects.sort(_sort);
				this.sorted = true;
			} else {
				this.setSorting(spec);
			}
		}

		return this;
	}

	/***
	 * Set the number of document to skip when fetching the cursor
	 *
	 * @method Cursor#skip
	 *
	 * @param {Number} skip - The number of documents to skip
	 *
	 * @returns {Cursor} This instance so it can be chained with other methods
	 */
	public skip(skip) {
		if (_.isNil(skip) || _.isNaN(skip)) { throw new Error("Must pass a number"); }

		this.skipValue = skip;

		return this;
	}

	/***
	 * Set the max number of document to fetch
	 *
	 * @method Cursor#limit
	 *
	 * @param {Number} limit - The max number of documents
	 *
	 * @returns {Cursor} This instance so it can be chained with other methods
	 */
	public limit(limit) {
		if (_.isNil(limit) || _.isNaN(limit)) { throw new Error("Must pass a number"); }

		this.limitValue = limit;

		return this;
	}

	/***
	 * @todo Implement
	 */
	public batchSize() {
		// Controls the number of documents MongoDB will return to the client in a single network message.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public close() {
		// Close a cursor and free associated server resources.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public comment() {
		// Attaches a comment to the query to allow for traceability in the logs and the system.profile collection.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public explain() {
		// Reports on the query execution plan for a cursor.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public hint() {
		// Forces MongoDB to use a specific index for a query.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public itcount() {
		// Computes the total number of documents in the cursor client-side by fetching and iterating the result set.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public maxScan() {
		// Specifies the maximum number of items to scan; documents for collection scans, keys for index scans.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public maxTimeMS() {
		// Specifies a cumulative time limit in milliseconds for processing operations on a cursor.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public max() {
		// Specifies an exclusive upper index bound for a cursor. For use with cursor.hint()
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public min() {
		// Specifies an inclusive lower index bound for a cursor. For use with cursor.hint()
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public noCursorTimeout() {
		// Instructs the server to avoid closing a cursor automatically after a period of inactivity.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public objsLeftInBatch() {
		// Returns the number of documents left in the current cursor batch.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public pretty() {
		// Configures the cursor to display results in an easy-to-read format.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public readConcern() {
		// Specifies a read concern for a find() operation.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public readPref() {
		// Specifies a read preference to a cursor to control how the client directs queries to a replica set.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public returnKey() {
		// Modifies the cursor to return index keys rather than the documents.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public showRecordId() {
		// Adds an internal storage engine ID field to each document returned by the cursor.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public size() {
		// Returns a count of the documents in the cursor after applying skip() and limit() methods.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public snapshot() {
		// Forces the cursor to use the index on the _id field. Ensures that the cursor returns each document,
		// with regards to the value of the _id field, only once.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public tailable() {
		// Marks the cursor as tailable. Only valid for cursors over capped collections.
		throw new Error("Not yet implemented");
	}

	/***
	 * @todo Implement
	 */
	public toArray() {
		// Returns an array that contains all documents returned by the cursor.
		throw new Error("Not yet implemented");
	}

	public static sort(doc, fields) {
		// Sort the elements of a cursor
		throw new Error("Not yet implemented");
	}

	/***
	 * Projects the fields of one or several documents, changing the output
	 *
	 * @method Cursor.project
	 *
	 * @param {Array|Object} doc - The document/s that will be projected
	 * @param {String|Array|Object} spec - Fields projection specification. Can be an space/comma separated list, an array, or an object
	 *
	 * @returns {Array|Object} The document/s after the projection
	 */
	public static project(doc, spec, aggregation = false) {
		// if (_.isNil(doc)) this.logger.throw("doc param required");
		// if (_.isNil(spec)) this.logger.throw("spec param required");

		let fields = null;
		if (aggregation) {
			fields = new Selector(spec, Selector.AGG_FIELD_SELECTOR);
		} else {
			fields = new Selector(spec, Selector.FIELD_SELECTOR);
		}

		if (_.isArray(doc)) {
			for (let i = 0; i < doc.length; i++) {
				doc[i] = mapFields(doc[i], fields);
			}

			return doc;
		} else {
			return mapFields(doc, fields);
		}
	}
}

const mapFields = (doc, fields) => {
	let _doc = _.cloneDeep(doc);

	if (!_.isNil(fields) && _.isPlainObject(fields) && !_.isEqual(fields, {})) {
		let showId = true;
		let showing = null;

		// Whether if we showing the _id field
		if (_.hasIn(fields, "_id") && fields._id === -1) {
			showId = false;
		}

		for (const field in fields) {
			// Whether if we are showing or hidding fields
			if (field !== "_id") {
				if (fields[field] === 1) {
					showing = true;
					break;
				} else if (fields[field] === -1) {
					showing = false;
					break;
				}
			}
		}

		let tmp = null;

		for (const field of Object.keys(fields)) {
			if (tmp === null) {
				if (showing) {
					tmp = {};
				} else {
					tmp = _.cloneDeep(doc);
				}
			}

			// Add or remove the field
			if (fields[field] === 1 || fields[field] === -1) {
				// Show the field
				if (showing) {
					tmp[field] = doc[field];
				} else {
					// Hide the field
					delete tmp[field];
				}
			} else {
				// Show the new field (rename)
				tmp[field] = doc[fields[field]];
			}
		}

		// Add or remove the _id field
		if (showId) {
			tmp._id = doc._id;
		} else {
			delete tmp._id;
		}

		_doc = tmp;
	}

	return _doc;
};

/***
 * Retrieves one or all the documents in the cursor
 *
 * @method getDocuments
 * @private
 *
 * @param {Cursor} cursor - The cursor with the documents
 * @param {Boolean} [justOne=false] - Whether it retrieves one or all the documents
 *
 * @returns {Array|Object} If [justOne=true] returns the next document, otherwise returns all the documents
 */
const getDocuments = (cursor, justOne = false) => {
	let docs = [];

	if (cursor.fetchMode === Cursor.COLSCAN) {
		// COLSCAN, wi will iterate over all documents
		docs = _.cloneDeep(cursor.documents);
	} else if (cursor.fetchMode === Cursor.IDXSCAN) {
		// IDXSCAN, wi will iterate over all needed documents
		for (const index of cursor) {
			for (let i = index.start; i < index.end; i++) {
				// let idxId = cursor.collection.getIndex(index.name)[i];
				const idxId = index.index[i];

				docs.push(cursor.documents[idxId]);
			}
		}
	}

	// if (cursor.selectorId) {
	// 	 if (_.hasIn(cursor.collection.doc_indexes, _.toString(cursor.selectorId))) {
	// 		 let idx = cursor.collection.doc_indexes[_.toString(cursor.selectorId)];

	// 		 return Cursor.project(cursor.collection.docs[idx], cursor.fields);
	// 	 } else {
	// 		 if (justOne) {
	// 			 return null;
	// 		 } else {
	// 			 return [];
	// 		 }
	// 	 }
	// }

	// TODO add warning when sort/skip/limit and fetching one
	// TODO add warning when skip/limit without order
	// TODO index
	while (cursor.cursorPosition < docs.length) {
		let _doc = docs[cursor.cursorPosition];
		cursor.cursorPosition++;

		if (cursor.selectorCompiled.test(_doc)) {
			if (_.isNil(cursor.dbObjects)) { cursor.dbObjects = []; }

			_doc = Cursor.project(_doc, cursor.fields);

			cursor.dbObjects.push(_doc);

			if (justOne) {
				// Add force sort
				return _doc;
			}
		}
	}

	if (_.isNil(cursor.dbObjects)) { return null; }

	if (!cursor.sorted && hasSorting(cursor)) { cursor.sort(); }

	const idxFrom = cursor.skipValue;
	const idxTo = cursor.limitValue !== -1 ? (cursor.limitValue + idxFrom) : cursor.dbObjects.length;

	return cursor.dbObjects.slice(idxFrom, idxTo);

};

/***
 * Checks if a cursor has a sorting defined
 *
 * @method hasSorting
 * @private
 *
 * @param {Cursor} cursor - The cursor
 *
 * @returns {Boolean} Whether the cursor has sorting or not
 */
const hasSorting = (cursor) => {
	if (_.isNil(cursor.sortValue)) { return false; }

	return true;
};