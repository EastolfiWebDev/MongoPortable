"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @file Cursor.js - based on Monglo#Cursor ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var _ = require("lodash"),
    Logger = require("jsw-logger");

var logger = null;

var stages = {
    '$project': false,
    '$match': false,
    '$redact': false,
    '$limit': false,
    '$skip': false,
    '$unwind': false,
    '$group': true,
    '$sample': false,
    '$sort': false,
    '$geoNear': false,
    '$lookup': false,
    '$out': false,
    '$indexStats': false
};

var group_operators = {
    $sum: function $sum(documents, new_id, new_field, value, isCount) {
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
                    new_docs[_id] = _defineProperty({
                        _id: _id
                    }, new_field, _.toNumber(val));
                } else {
                    new_docs[_id][new_field] += _.toNumber(val);
                }
            }
        }

        return new_docs;
    },

    $avg: function $avg(documents, new_id, new_field, value, isCount) {
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
                    var _new_docs$_id2;

                    new_docs[_id] = (_new_docs$_id2 = {
                        _id: _id
                    }, _defineProperty(_new_docs$_id2, new_field, _.toNumber(val)), _defineProperty(_new_docs$_id2, "__COUNT__", 1), _new_docs$_id2);
                } else {
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
    }
};

var do_single_group = function do_single_group(group_id, group_stage, documents) {
    // var operators = {};

    var docs = {};

    for (var field in group_stage) {
        if (field !== '_id') {
            // handle group field
            // let group_key = key;
            var group_field = group_stage[field];

            for (var key in group_field) {
                if (!_.hasIn(group_operators, key)) logger.throw("Unknown accumulator operator \"" + key + "\" for group stage");

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
                    if (group_field[key].substr(0, 1) !== '$') logger.throw("Field names references in a right side assignement must be preceded by '$'");

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

var do_complex_group = function do_complex_group() {};

var do_group = function do_group(documents, group_stage) {
    if (!_.hasIn(group_stage, '_id')) logger.throw('The field "_id" is required in the "$group" stage');

    var new_id = group_stage['_id'];

    if (_.isPlainObject(new_id)) {
        // complex_id
        // do_complex_group();
    } else {
            // single_id
            return do_single_group(new_id, group_stage, documents);
        }
};

var Aggregation = function () {
    function Aggregation(pipeline) {
        _classCallCheck(this, Aggregation);

        logger = Logger.instance;

        this.pipeline = pipeline;
    }

    _createClass(Aggregation, [{
        key: "aggregate",
        value: function aggregate(collection) {
            for (var i = 0; i < this.pipeline.length; i++) {
                var stage = this.pipeline[i];

                for (var key in stage) {
                    switch (key) {
                        case '$group':
                            return do_group(collection.docs, stage[key]);
                    }
                }
            }
        }
    }, {
        key: "validStage",
        value: function validStage(stage) {
            if (!_.hasIn(stages, stage)) return logger.throw("Unknown stage \"" + stage + "\"");

            if (stages[stage] === false) return logger.throw("Unsupported stage \"" + stage + "\"");

            return true;
        }
    }]);

    return Aggregation;
}();

module.exports = Aggregation;
//# sourceMappingURL=data:application/json;base64,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QUEvQixRQUFQOztBQUU3QixnQkFBSSxPQUFPLEtBQVAsTUFBa0IsS0FBdEIsRUFBNkIsT0FBTyxPQUFPLEtBQVAsMEJBQW1DLEtBQW5DLFFBQVA7O0FBRTdCLG1CQUFPLElBQVA7QUFDSDs7Ozs7O0FBSUwsT0FBTyxPQUFQLEdBQWlCLFdBQWpCIiwiZmlsZSI6IkFnZ3JlZ2F0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBDdXJzb3IuanMgLSBiYXNlZCBvbiBNb25nbG8jQ3Vyc29yICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIiksXG4gICAgTG9nZ2VyID0gcmVxdWlyZShcImpzdy1sb2dnZXJcIik7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcblxudmFyIHN0YWdlcyA9IHtcbiAgICAnJHByb2plY3QnOiBmYWxzZSxcbiAgICAnJG1hdGNoJzogZmFsc2UsXG4gICAgJyRyZWRhY3QnOiBmYWxzZSxcbiAgICAnJGxpbWl0JzogZmFsc2UsXG4gICAgJyRza2lwJzogZmFsc2UsXG4gICAgJyR1bndpbmQnOiBmYWxzZSxcbiAgICAnJGdyb3VwJzogdHJ1ZSxcbiAgICAnJHNhbXBsZSc6IGZhbHNlLFxuICAgICckc29ydCc6IGZhbHNlLFxuICAgICckZ2VvTmVhcic6IGZhbHNlLFxuICAgICckbG9va3VwJzogZmFsc2UsXG4gICAgJyRvdXQnOiBmYWxzZSxcbiAgICAnJGluZGV4U3RhdHMnOiBmYWxzZVxufTtcblxudmFyIGdyb3VwX29wZXJhdG9ycyA9IHtcbiAgICAkc3VtOiBmdW5jdGlvbihkb2N1bWVudHMsIG5ld19pZCwgbmV3X2ZpZWxkLCB2YWx1ZSwgaXNDb3VudCkge1xuICAgICAgICB2YXIgbmV3X2RvY3MgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZG9jdW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgZG9jID0gZG9jdW1lbnRzW2ldO1xuICAgICAgICAgICAgbGV0IHZhbCA9IHZhbHVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWlzQ291bnQpIHtcbiAgICAgICAgICAgICAgICB2YWwgPSBkb2NbdmFsdWUuc3Vic3RyKDEsIHZhbHVlLmxlbmd0aCldIHx8IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmhhc0luKGRvYywgbmV3X2lkKSkge1xuICAgICAgICAgICAgICAgIGxldCBfaWQgPSBkb2NbbmV3X2lkXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIV8uaGFzSW4obmV3X2RvY3MsIF9pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3X2RvY3NbX2lkXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9pZDogX2lkLFxuICAgICAgICAgICAgICAgICAgICAgICAgW25ld19maWVsZF06IF8udG9OdW1iZXIodmFsKVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld19kb2NzW19pZF1bbmV3X2ZpZWxkXSArPSBfLnRvTnVtYmVyKHZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3X2RvY3M7XG4gICAgfSxcbiAgICBcbiAgICAkYXZnOiBmdW5jdGlvbihkb2N1bWVudHMsIG5ld19pZCwgbmV3X2ZpZWxkLCB2YWx1ZSwgaXNDb3VudCkge1xuICAgICAgICB2YXIgbmV3X2RvY3MgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZG9jdW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgZG9jID0gZG9jdW1lbnRzW2ldO1xuICAgICAgICAgICAgbGV0IHZhbCA9IHZhbHVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWlzQ291bnQpIHtcbiAgICAgICAgICAgICAgICB2YWwgPSBkb2NbdmFsdWUuc3Vic3RyKDEsIHZhbHVlLmxlbmd0aCldIHx8IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmhhc0luKGRvYywgbmV3X2lkKSB8fCBfLmlzTnVsbChuZXdfaWQpKSB7XG4gICAgICAgICAgICAgICAgbGV0IF9pZCA9IGRvY1tuZXdfaWRdIHx8IG51bGw7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFfLmhhc0luKG5ld19kb2NzLCBfaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld19kb2NzW19pZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfaWQ6IF9pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFtuZXdfZmllbGRdOiBfLnRvTnVtYmVyKHZhbCksXG4gICAgICAgICAgICAgICAgICAgICAgICBfX0NPVU5UX186IDFcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuZXdfZG9jc1tfaWRdW25ld19maWVsZF0gKz0gXy50b051bWJlcih2YWwpO1xuICAgICAgICAgICAgICAgICAgICBuZXdfZG9jc1tfaWRdLl9fQ09VTlRfXysrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQga2V5IGluIG5ld19kb2NzKSB7XG4gICAgICAgICAgICBuZXdfZG9jc1trZXldW25ld19maWVsZF0gPSBuZXdfZG9jc1trZXldW25ld19maWVsZF0gLyBuZXdfZG9jc1trZXldLl9fQ09VTlRfXztcbiAgICAgICAgICAgIGRlbGV0ZSBuZXdfZG9jc1trZXldLl9fQ09VTlRfXztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ld19kb2NzO1xuICAgIH0gXG59O1xuXG52YXIgZG9fc2luZ2xlX2dyb3VwID0gZnVuY3Rpb24oZ3JvdXBfaWQsIGdyb3VwX3N0YWdlLCBkb2N1bWVudHMpIHtcbiAgICAvLyB2YXIgb3BlcmF0b3JzID0ge307XG4gICAgXG4gICAgbGV0IGRvY3MgPSB7fTtcbiAgICBcbiAgICBmb3IgKGxldCBmaWVsZCBpbiBncm91cF9zdGFnZSkge1xuICAgICAgICBpZiAoZmllbGQgIT09ICdfaWQnKSB7XG4gICAgICAgICAgICAvLyBoYW5kbGUgZ3JvdXAgZmllbGRcbiAgICAgICAgICAgIC8vIGxldCBncm91cF9rZXkgPSBrZXk7XG4gICAgICAgICAgICBsZXQgZ3JvdXBfZmllbGQgPSBncm91cF9zdGFnZVtmaWVsZF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiBncm91cF9maWVsZCkge1xuICAgICAgICAgICAgICAgIGlmICghXy5oYXNJbihncm91cF9vcGVyYXRvcnMsIGtleSkpIGxvZ2dlci50aHJvdyhgVW5rbm93biBhY2N1bXVsYXRvciBvcGVyYXRvciBcIiR7a2V5fVwiIGZvciBncm91cCBzdGFnZWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIGxvb3AgdGhyb3VnaCBhbGwgZG9jdW1lbnRzXG4gICAgICAgICAgICAgICAgLy8gdmFyIG5ld19kb2NzID0ge307XG4gICAgICAgICAgICAgICAgLy8gZm9yIChsZXQgaSA9IDA7IGkgPCBkb2N1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgbGV0IGRvYyA9IGRvY3VtZW50c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gICAgIGlmIChfLmhhc0luKGRvYywgZ3JvdXBfaWQpKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBsZXQgX2lkID0gZG9jW2dyb3VwX2lkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgaWYgKCFfLmhhc0luKG5ld19kb2NzLCBfaWQpKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgbmV3X2RvY3NbX2lkXSA9IHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgX2lkOiBfaWQsXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIFtuZXdfZmllbGRdOiB2YWx1ZVxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgIG5ld19kb2NzW19pZF1bbmV3X2ZpZWxkXSArPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBpZiAoIV8uaGFzSW4ob3BlcmF0b3JzLCBrZXkpKSBvcGVyYXRvcnNba2V5XSA9IFtdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIG9wZXJhdG9yc1trZXldLnB1c2goe1xuICAgICAgICAgICAgICAgIC8vICAgICBuZXdfZmllbGQ6IGZpZWxkLFxuICAgICAgICAgICAgICAgIC8vICAgICB2YWx1ZTogZ3JvdXBfZmllbGRba2V5XVxuICAgICAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNTdHJpbmcoZ3JvdXBfZmllbGRba2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdyb3VwX2ZpZWxkW2tleV0uc3Vic3RyKDAsIDEpICE9PSAnJCcpIGxvZ2dlci50aHJvdyhcIkZpZWxkIG5hbWVzIHJlZmVyZW5jZXMgaW4gYSByaWdodCBzaWRlIGFzc2lnbmVtZW50IG11c3QgYmUgcHJlY2VkZWQgYnkgJyQnXCIpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmlzRmluaXRlKF8udG9OdW1iZXIoZ3JvdXBfZmllbGRba2V5XSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGxldCBvcGVyYXRvciA9IGdyb3VwX29wZXJhdG9yc1trZXldO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIF8ubWVyZ2UoZG9jcywgb3BlcmF0b3IoZG9jdW1lbnRzLCBncm91cF9pZCwgZmllbGQsIGdyb3VwX2ZpZWxkW2tleV0sIGNvdW50KSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIF8udmFsdWVzKGRvY3MpO1xufTtcblxudmFyIGRvX2NvbXBsZXhfZ3JvdXAgPSBmdW5jdGlvbigpIHtcbiAgICBcbn07XG5cbnZhciBkb19ncm91cCA9IGZ1bmN0aW9uKGRvY3VtZW50cywgZ3JvdXBfc3RhZ2UpIHtcbiAgICBpZiAoIV8uaGFzSW4oZ3JvdXBfc3RhZ2UsICdfaWQnKSkgbG9nZ2VyLnRocm93KCdUaGUgZmllbGQgXCJfaWRcIiBpcyByZXF1aXJlZCBpbiB0aGUgXCIkZ3JvdXBcIiBzdGFnZScpO1xuICAgIFxuICAgIGxldCBuZXdfaWQgPSBncm91cF9zdGFnZVsnX2lkJ107XG4gICAgICAgICAgICAgICAgXG4gICAgaWYgKF8uaXNQbGFpbk9iamVjdChuZXdfaWQpKSB7XG4gICAgICAgIC8vIGNvbXBsZXhfaWRcbiAgICAgICAgLy8gZG9fY29tcGxleF9ncm91cCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNpbmdsZV9pZFxuICAgICAgICByZXR1cm4gZG9fc2luZ2xlX2dyb3VwKG5ld19pZCwgZ3JvdXBfc3RhZ2UsIGRvY3VtZW50cyk7XG4gICAgfVxufTtcblxuY2xhc3MgQWdncmVnYXRpb24ge1xuICAgIGNvbnN0cnVjdG9yKHBpcGVsaW5lKSB7XG4gICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucGlwZWxpbmUgPSBwaXBlbGluZTtcbiAgICB9XG4gICAgXG4gICAgYWdncmVnYXRlKGNvbGxlY3Rpb24pIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnBpcGVsaW5lLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgc3RhZ2UgPSB0aGlzLnBpcGVsaW5lW2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gc3RhZ2UpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICckZ3JvdXAnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRvX2dyb3VwKGNvbGxlY3Rpb24uZG9jcywgc3RhZ2Vba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHZhbGlkU3RhZ2Uoc3RhZ2UpIHtcbiAgICAgICAgaWYgKCFfLmhhc0luKHN0YWdlcywgc3RhZ2UpKSByZXR1cm4gbG9nZ2VyLnRocm93KGBVbmtub3duIHN0YWdlIFwiJHtzdGFnZX1cImApO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0YWdlc1tzdGFnZV0gPT09IGZhbHNlKSByZXR1cm4gbG9nZ2VyLnRocm93KGBVbnN1cHBvcnRlZCBzdGFnZSBcIiR7c3RhZ2V9XCJgKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IEFnZ3JlZ2F0aW9uOyJdfQ==
