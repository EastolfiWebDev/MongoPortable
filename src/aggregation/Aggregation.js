"use strict";
/**
 * @file Cursor.js - based on Monglo#Cursor ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 *
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var jsw_logger_1 = require("jsw-logger");
var selector_1 = require("../selector");
var collection_1 = require("../collection");
var stages = {
    '$project': true,
    '$match': true,
    '$redact': false,
    '$limit': false,
    '$skip': false,
    '$unwind': false,
    '$group': true,
    '$sample': false,
    '$sort': true,
    '$geoNear': false,
    '$lookup': false,
    '$out': false,
    '$indexStats': false
};
var group_operators = {
    $sum: function (documents, new_id, new_field, value, isCount) {
        var new_docs = {};
        for (var i = 0; i < documents.length; i++) {
            var doc = documents[i];
            var val = value;
            if (!isCount) {
                val = doc[value.substr(1, value.length)] || 0;
            }
            if (_.hasIn(doc, new_id)) {
                var _id = doc[new_id];
                if (!_.hasIn(new_docs, _id)) {
                    new_docs[_id] = (_a = {
                            _id: _id
                        },
                        _a[new_field] = _.toNumber(val),
                        _a);
                }
                else {
                    new_docs[_id][new_field] += _.toNumber(val);
                }
            }
        }
        return new_docs;
        var _a;
    },
    $avg: function (documents, new_id, new_field, value, isCount) {
        var new_docs = {};
        for (var i = 0; i < documents.length; i++) {
            var doc = documents[i];
            var val = value;
            if (!isCount) {
                val = doc[value.substr(1, value.length)] || 0;
            }
            if (_.hasIn(doc, new_id) || _.isNull(new_id)) {
                var _id = doc[new_id] || null;
                if (!_.hasIn(new_docs, _id)) {
                    new_docs[_id] = (_a = {
                            _id: _id
                        },
                        _a[new_field] = _.toNumber(val),
                        _a.__COUNT__ = 1,
                        _a);
                }
                else {
                    new_docs[_id][new_field] += _.toNumber(val);
                    new_docs[_id].__COUNT__++;
                }
            }
        }
        for (var key in new_docs) {
            new_docs[key][new_field] = new_docs[key][new_field] / new_docs[key].__COUNT__;
            delete new_docs[key].__COUNT__;
        }
        return new_docs;
        var _a;
    }
};
var do_single_group = function (group_id, group_stage, documents) {
    // var operators = {};
    var docs = {};
    for (var field in group_stage) {
        if (field !== '_id') {
            // handle group field
            // let group_key = key;
            var group_field = group_stage[field];
            for (var key in group_field) {
                if (!_.hasIn(group_operators, key))
                    this.logger.throw("Unknown accumulator operator \"" + key + "\" for group stage");
                // loop through all documents
                // var new_docs = {};
                // for (let i = 0; i < documents.length; i++) {
                //     let doc = documents[i];
                //     if (_.hasIn(doc, group_id)) {
                //         let _id = doc[group_id];
                //         if (!_.hasIn(new_docs, _id)) {
                //             new_docs[_id] = {
                //                 _id: _id,
                //                 [new_field]: value
                //             };
                //         } else {
                //             new_docs[_id][new_field] += value;
                //         }
                //     }
                // }
                // if (!_.hasIn(operators, key)) operators[key] = [];
                // operators[key].push({
                //     new_field: field,
                //     value: group_field[key]
                // });
                var count = true;
                if (_.isString(group_field[key])) {
                    if (group_field[key].substr(0, 1) !== '$')
                        this.logger.throw("Field names references in a right side assignement must be preceded by '$'");
                    if (!_.isFinite(_.toNumber(group_field[key]))) {
                        count = false;
                    }
                }
                var operator = group_operators[key];
                _.merge(docs, operator(documents, group_id, field, group_field[key], count));
                break;
            }
        }
    }
    return _.values(docs);
};
var do_complex_group = function () {
};
var do_sort = function (documents, sort_stage) {
    return documents.sort(new selector_1.Selector(sort_stage, selector_1.Selector.SORT_SELECTOR));
};
var do_match = function (documents, match_stage) {
    var cursor = new collection_1.Cursor(documents, match_stage);
    return cursor.fetch();
};
var do_group = function (documents, group_stage) {
    if (!_.hasIn(group_stage, '_id'))
        this.logger.throw('The field "_id" is required in the "$group" stage');
    var new_id = group_stage['_id'];
    if (!_.isNull(new_id)) {
        if (new_id.substr(0, 1) !== '$') {
            this.logger.throw("Field names references in a right side assignement must be preceded by '$'");
        }
        else {
            new_id = new_id.substr(1, new_id.length);
        }
    }
    if (_.isPlainObject(new_id)) {
        // complex_id
        // do_complex_group();
    }
    else {
        // single_id
        return do_single_group(new_id, group_stage, documents);
    }
};
var do_project = function (documents, project_stage) {
    return collection_1.Cursor.project(documents, project_stage, true);
};
var Aggregation = /** @class */ (function () {
    function Aggregation(pipeline) {
        this.logger = jsw_logger_1.JSWLogger.instance;
        this.pipeline = pipeline;
    }
    Aggregation.prototype.aggregate = function (collection) {
        var docs = collection.docs;
        for (var i = 0; i < this.pipeline.length; i++) {
            var stage = this.pipeline[i];
            for (var key in stage) {
                switch (key) {
                    case '$project':
                        docs = do_project(docs, stage[key]);
                        break;
                    case '$match':
                        docs = do_match(docs, stage[key]);
                        break;
                    case '$group':
                        docs = do_group(docs, stage[key]);
                        break;
                    case '$sort':
                        docs = do_sort(docs, stage[key]);
                        break;
                }
            }
        }
        return docs; // move to cursor
    };
    Aggregation.prototype.validStage = function (stage) {
        if (!_.hasIn(stages, stage))
            return this.logger.throw("Unknown stage \"" + stage + "\"");
        if (stages[stage] === false)
            return this.logger.throw("Unsupported stage \"" + stage + "\"");
        return true;
    };
    return Aggregation;
}());
exports.Aggregation = Aggregation;
//# sourceMappingURL=Aggregation.js.map