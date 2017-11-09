/**
 * @file Cursor.js - based on Monglo#Cursor ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 *
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

import { JSWLogger } from "jsw-logger";
import * as _ from "lodash";

import { Cursor } from "../collection";
import { Selector } from "../selector";

const stages = {
	$project: true,
	$match: true,
	$redact: false,
	$limit: false,
	$skip: false,
	$unwind: false,
	$group: true,
	$sample: false,
	$sort: true,
	$geoNear: false,
	$lookup: false,
	$out: false,
	$indexStats: false
};

const groupOperators = {
	$sum(documents, newId, newField, value, isCount) {
		const newDocs = {};

		for (const doc of documents) {
			let val = value;

			if (!isCount) {
				val = doc[value.substr(1, value.length)] || 0;
			}

			if (_.hasIn(doc, newId)) {
				const _id = doc[newId];

				if (!_.hasIn(newDocs, _id)) {
					newDocs[_id] = {
						_id,
						[newField]: _.toNumber(val)
					};
				} else {
					newDocs[_id][newField] += _.toNumber(val);
				}
			}
		}

		return newDocs;
	},

	$avg(documents, newId, newField, value, isCount) {
		const newDocs = {};

		for (const doc of documents) {
			let val = value;

			if (!isCount) {
				val = doc[value.substr(1, value.length)] || 0;
			}

			if (_.hasIn(doc, newId) || _.isNull(newId)) {
				const _id = doc[newId] || null;

				if (!_.hasIn(newDocs, _id)) {
					newDocs[_id] = {
						_id,
						[newField]: _.toNumber(val),
						__COUNT__: 1
					};
				} else {
					newDocs[_id][newField] += _.toNumber(val);
					newDocs[_id].__COUNT__++;
				}
			}
		}

		for (const key of Object.keys(newDocs)) {
			newDocs[key][newField] = newDocs[key][newField] / newDocs[key].__COUNT__;
			delete newDocs[key].__COUNT__;
		}

		return newDocs;
	}
};

const doSingleGroup = (groupId, groupStage, documents) => {
	// var operators = {};

	const docs = {};

	for (const field in groupStage) {
		if (field !== "_id") {
			// handle group field
			// let group_key = key;
			const groupField = groupStage[field];

			for (const key of Object.keys(groupField)) {
				if (!_.hasIn(groupOperators, key)) { this.logger.throw(`Unknown accumulator operator "${key}" for group stage`); }

				// loop through all documents
				// var newDocs = {};
				// for (let i = 0; i < documents.length; i++) {
				// 	 let doc = documents[i];

				// 	 if (_.hasIn(doc, groupId)) {
				// 		 let _id = doc[groupId];

				// 		 if (!_.hasIn(newDocs, _id)) {
				// 			 newDocs[_id] = {
				// 				 _id: _id,
				// 				 [newField]: value
				// 			 };
				// 		 } else {
				// 			 newDocs[_id][newField] += value;
				// 		 }
				// 	 }
				// }

				// if (!_.hasIn(operators, key)) operators[key] = [];

				// operators[key].push({
				// 	 newField: field,
				// 	 value: groupField[key]
				// });

				let count = true;
				if (_.isString(groupField[key])) {
					if (groupField[key].substr(0, 1) !== "$") { this.logger.throw("Field names references in a right side assignement must be preceded by '$'"); }

					if (!_.isFinite(_.toNumber(groupField[key]))) {
						count = false;
					}
				}

				const operator = groupOperators[key];

				_.merge(docs, operator(documents, groupId, field, groupField[key], count));

				break;
			}
		}
	}

	return _.values(docs);
};

const doComplexGroup = () => {
	// TODO
};

const doSort = (documents, sortStage) => {
	return documents.sort(new Selector(sortStage, Selector.SORT_SELECTOR));
};

const doMatch = (documents, matchStage) => {
	const cursor = new Cursor(documents, matchStage);

	return cursor.fetch();
};

const doGroup = (documents, groupStage) => {
	if (!_.hasIn(groupStage, "_id")) { this.logger.throw('The field "_id" is required in the "$group" stage'); }

	let newId = groupStage._id;

	if (!_.isNull(newId)) {
		if (newId.substr(0, 1) !== "$") {
			this.logger.throw("Field names references in a right side assignement must be preceded by '$'");
		} else {
			newId = newId.substr(1, newId.length);
		}
	}

	if (_.isPlainObject(newId)) {
		// complex_id
		// doComplexGroup();
	} else {
		// single_id
		return doSingleGroup(newId, groupStage, documents);
	}
};

const doProject = (documents, projectStage) => {
	return Cursor.project(documents, projectStage, true);
};

export class Aggregation {
	public pipeline;

	protected logger: JSWLogger;

	constructor(pipeline) {
		this.logger = JSWLogger.instance;

		this.pipeline = pipeline;
	}

	public aggregate(collection) {
		let docs = collection.docs;

		for (const stage of this.pipeline) {
			for (const key of Object.keys(stage)) {
				switch (key) {
					case "$project":
						docs = doProject(docs, stage[key]);

						break;
					case "$match":
						docs = doMatch(docs, stage[key]);

						break;
					case "$group":
						docs = doGroup(docs, stage[key]);

						break;
					case "$sort":
						docs = doSort(docs, stage[key]);

						break;
				}
			}
		}

		return docs;	// move to cursor
	}

	public validStage(stage) {
		if (!_.hasIn(stages, stage)) { return this.logger.throw(`Unknown stage "${stage}"`); }

		if (stages[stage] === false) { return this.logger.throw(`Unsupported stage "${stage}"`); }

		return true;
	}
}
