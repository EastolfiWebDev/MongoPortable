"use strict";
/**
 * @file Cursor.js - based on Monglo#Cursor ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 *
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var jsw_logger_1 = require("jsw-logger");
var _ = require("lodash");
var collection_1 = require("../collection");
var selector_1 = require("../selector");
var stages = {
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
var groupOperators = {
    $sum: function (documents, newId, newField, value, isCount) {
        var newDocs = {};
        try {
            for (var documents_1 = __values(documents), documents_1_1 = documents_1.next(); !documents_1_1.done; documents_1_1 = documents_1.next()) {
                var doc = documents_1_1.value;
                var val = value;
                if (!isCount) {
                    val = doc[value.substr(1, value.length)] || 0;
                }
                if (_.hasIn(doc, newId)) {
                    var _id = doc[newId];
                    if (!_.hasIn(newDocs, _id)) {
                        newDocs[_id] = (_a = {
                                _id: _id
                            },
                            _a[newField] = _.toNumber(val),
                            _a);
                    }
                    else {
                        newDocs[_id][newField] += _.toNumber(val);
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (documents_1_1 && !documents_1_1.done && (_b = documents_1.return)) _b.call(documents_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return newDocs;
        var e_1, _b, _a;
    },
    $avg: function (documents, newId, newField, value, isCount) {
        var newDocs = {};
        try {
            for (var documents_2 = __values(documents), documents_2_1 = documents_2.next(); !documents_2_1.done; documents_2_1 = documents_2.next()) {
                var doc = documents_2_1.value;
                var val = value;
                if (!isCount) {
                    val = doc[value.substr(1, value.length)] || 0;
                }
                if (_.hasIn(doc, newId) || _.isNull(newId)) {
                    var _id = doc[newId] || null;
                    if (!_.hasIn(newDocs, _id)) {
                        newDocs[_id] = (_a = {
                                _id: _id
                            },
                            _a[newField] = _.toNumber(val),
                            _a.__COUNT__ = 1,
                            _a);
                    }
                    else {
                        newDocs[_id][newField] += _.toNumber(val);
                        newDocs[_id].__COUNT__++;
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (documents_2_1 && !documents_2_1.done && (_b = documents_2.return)) _b.call(documents_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
        try {
            for (var _c = __values(Object.keys(newDocs)), _d = _c.next(); !_d.done; _d = _c.next()) {
                var key = _d.value;
                newDocs[key][newField] = newDocs[key][newField] / newDocs[key].__COUNT__;
                delete newDocs[key].__COUNT__;
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_e = _c.return)) _e.call(_c);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return newDocs;
        var e_2, _b, _a, e_3, _e;
    }
};
var doSingleGroup = function (groupId, groupStage, documents) {
    // var operators = {};
    var docs = {};
    for (var field in groupStage) {
        if (field !== "_id") {
            // handle group field
            // let group_key = key;
            var groupField = groupStage[field];
            try {
                for (var _a = __values(Object.keys(groupField)), _b = _a.next(); !_b.done; _b = _a.next()) {
                    var key = _b.value;
                    if (!_.hasIn(groupOperators, key)) {
                        _this.logger.throw("Unknown accumulator operator \"" + key + "\" for group stage");
                    }
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
                    var count = true;
                    if (_.isString(groupField[key])) {
                        if (groupField[key].substr(0, 1) !== "$") {
                            _this.logger.throw("Field names references in a right side assignement must be preceded by '$'");
                        }
                        if (!_.isFinite(_.toNumber(groupField[key]))) {
                            count = false;
                        }
                    }
                    var operator = groupOperators[key];
                    _.merge(docs, operator(documents, groupId, field, groupField[key], count));
                    break;
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
    }
    return _.values(docs);
    var e_4, _c;
};
var doComplexGroup = function () {
    // TODO
};
var doSort = function (documents, sortStage) {
    return documents.sort(new selector_1.Selector(sortStage, selector_1.Selector.SORT_SELECTOR));
};
var doMatch = function (documents, matchStage) {
    var cursor = new collection_1.Cursor(documents, matchStage);
    return cursor.fetch();
};
var doGroup = function (documents, groupStage) {
    if (!_.hasIn(groupStage, "_id")) {
        _this.logger.throw('The field "_id" is required in the "$group" stage');
    }
    var newId = groupStage._id;
    if (!_.isNull(newId)) {
        if (newId.substr(0, 1) !== "$") {
            _this.logger.throw("Field names references in a right side assignement must be preceded by '$'");
        }
        else {
            newId = newId.substr(1, newId.length);
        }
    }
    if (_.isPlainObject(newId)) {
        // complex_id
        // doComplexGroup();
    }
    else {
        // single_id
        return doSingleGroup(newId, groupStage, documents);
    }
};
var doProject = function (documents, projectStage) {
    return collection_1.Cursor.project(documents, projectStage, true);
};
var Aggregation = /** @class */ (function () {
    function Aggregation(pipeline) {
        this.logger = jsw_logger_1.JSWLogger.instance;
        this.pipeline = pipeline;
    }
    Aggregation.prototype.aggregate = function (collection) {
        var docs = collection.docs;
        try {
            for (var _a = __values(this.pipeline), _b = _a.next(); !_b.done; _b = _a.next()) {
                var stage = _b.value;
                try {
                    for (var _c = __values(Object.keys(stage)), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var key = _d.value;
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
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_e = _c.return)) _e.call(_c);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_f = _a.return)) _f.call(_a);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return docs; // move to cursor
        var e_6, _f, e_5, _e;
    };
    Aggregation.prototype.validStage = function (stage) {
        if (!_.hasIn(stages, stage)) {
            return this.logger.throw("Unknown stage \"" + stage + "\"");
        }
        if (stages[stage] === false) {
            return this.logger.throw("Unsupported stage \"" + stage + "\"");
        }
        return true;
    };
    return Aggregation;
}());
exports.Aggregation = Aggregation;
//# sourceMappingURL=Aggregation.js.map