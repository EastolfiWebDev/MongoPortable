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
    Logger = require("jsw-logger"),
    Cursor = require("./Cursor"),
    Selector = require("./Selector");

var logger = null;

var stages = {
    '$project': false,
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

var do_sort = function do_sort(documents, sort_stage) {
    return documents.sort(new Selector(sort_stage, Selector.SORT_SELECTOR));
};

var do_match = function do_match(documents, match_stage) {
    var cursor = new Cursor(documents, match_stage);

    return cursor.fetch();
};

var do_group = function do_group(documents, group_stage) {
    if (!_.hasIn(group_stage, '_id')) logger.throw('The field "_id" is required in the "$group" stage');

    var new_id = group_stage['_id'];

    if (!_.isNull(new_id)) {
        if (new_id.substr(0, 1) !== '$') {
            logger.throw("Field names references in a right side assignement must be preceded by '$'");
        } else {
            new_id = new_id.substr(1, new_id.length);
        }
    }

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
            var docs = collection.docs;

            for (var i = 0; i < this.pipeline.length; i++) {
                var stage = this.pipeline[i];

                for (var key in stage) {
                    switch (key) {
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
//# sourceMappingURL=data:application/json;base64,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b250ZW50IjpbIi8qKlxuICogQGZpbGUgQ3Vyc29yLmpzIC0gYmFzZWQgb24gTW9uZ2xvI0N1cnNvciAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpLFxuICAgIExvZ2dlciA9IHJlcXVpcmUoXCJqc3ctbG9nZ2VyXCIpLFxuICAgIEN1cnNvciA9IHJlcXVpcmUoXCIuL0N1cnNvclwiKSxcbiAgICBTZWxlY3RvciA9IHJlcXVpcmUoXCIuL1NlbGVjdG9yXCIpO1xuICAgIFxudmFyIGxvZ2dlciA9IG51bGw7XG5cbnZhciBzdGFnZXMgPSB7XG4gICAgJyRwcm9qZWN0JzogZmFsc2UsXG4gICAgJyRtYXRjaCc6IHRydWUsXG4gICAgJyRyZWRhY3QnOiBmYWxzZSxcbiAgICAnJGxpbWl0JzogZmFsc2UsXG4gICAgJyRza2lwJzogZmFsc2UsXG4gICAgJyR1bndpbmQnOiBmYWxzZSxcbiAgICAnJGdyb3VwJzogdHJ1ZSxcbiAgICAnJHNhbXBsZSc6IGZhbHNlLFxuICAgICckc29ydCc6IHRydWUsXG4gICAgJyRnZW9OZWFyJzogZmFsc2UsXG4gICAgJyRsb29rdXAnOiBmYWxzZSxcbiAgICAnJG91dCc6IGZhbHNlLFxuICAgICckaW5kZXhTdGF0cyc6IGZhbHNlXG59O1xuXG52YXIgZ3JvdXBfb3BlcmF0b3JzID0ge1xuICAgICRzdW06IGZ1bmN0aW9uKGRvY3VtZW50cywgbmV3X2lkLCBuZXdfZmllbGQsIHZhbHVlLCBpc0NvdW50KSB7XG4gICAgICAgIHZhciBuZXdfZG9jcyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkb2N1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBkb2MgPSBkb2N1bWVudHNbaV07XG4gICAgICAgICAgICBsZXQgdmFsID0gdmFsdWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghaXNDb3VudCkge1xuICAgICAgICAgICAgICAgIHZhbCA9IGRvY1t2YWx1ZS5zdWJzdHIoMSwgdmFsdWUubGVuZ3RoKV0gfHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaGFzSW4oZG9jLCBuZXdfaWQpKSB7XG4gICAgICAgICAgICAgICAgbGV0IF9pZCA9IGRvY1tuZXdfaWRdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghXy5oYXNJbihuZXdfZG9jcywgX2lkKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXdfZG9jc1tfaWRdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2lkOiBfaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBbbmV3X2ZpZWxkXTogXy50b051bWJlcih2YWwpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3X2RvY3NbX2lkXVtuZXdfZmllbGRdICs9IF8udG9OdW1iZXIodmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBuZXdfZG9jcztcbiAgICB9LFxuICAgIFxuICAgICRhdmc6IGZ1bmN0aW9uKGRvY3VtZW50cywgbmV3X2lkLCBuZXdfZmllbGQsIHZhbHVlLCBpc0NvdW50KSB7XG4gICAgICAgIHZhciBuZXdfZG9jcyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkb2N1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBkb2MgPSBkb2N1bWVudHNbaV07XG4gICAgICAgICAgICBsZXQgdmFsID0gdmFsdWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghaXNDb3VudCkge1xuICAgICAgICAgICAgICAgIHZhbCA9IGRvY1t2YWx1ZS5zdWJzdHIoMSwgdmFsdWUubGVuZ3RoKV0gfHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaGFzSW4oZG9jLCBuZXdfaWQpIHx8IF8uaXNOdWxsKG5ld19pZCkpIHtcbiAgICAgICAgICAgICAgICBsZXQgX2lkID0gZG9jW25ld19pZF0gfHwgbnVsbDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIV8uaGFzSW4obmV3X2RvY3MsIF9pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3X2RvY3NbX2lkXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9pZDogX2lkLFxuICAgICAgICAgICAgICAgICAgICAgICAgW25ld19maWVsZF06IF8udG9OdW1iZXIodmFsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9fQ09VTlRfXzogMVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld19kb2NzW19pZF1bbmV3X2ZpZWxkXSArPSBfLnRvTnVtYmVyKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIG5ld19kb2NzW19pZF0uX19DT1VOVF9fKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCBrZXkgaW4gbmV3X2RvY3MpIHtcbiAgICAgICAgICAgIG5ld19kb2NzW2tleV1bbmV3X2ZpZWxkXSA9IG5ld19kb2NzW2tleV1bbmV3X2ZpZWxkXSAvIG5ld19kb2NzW2tleV0uX19DT1VOVF9fO1xuICAgICAgICAgICAgZGVsZXRlIG5ld19kb2NzW2tleV0uX19DT1VOVF9fO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3X2RvY3M7XG4gICAgfSBcbn07XG5cbnZhciBkb19zaW5nbGVfZ3JvdXAgPSBmdW5jdGlvbihncm91cF9pZCwgZ3JvdXBfc3RhZ2UsIGRvY3VtZW50cykge1xuICAgIC8vIHZhciBvcGVyYXRvcnMgPSB7fTtcbiAgICBcbiAgICBsZXQgZG9jcyA9IHt9O1xuICAgIFxuICAgIGZvciAobGV0IGZpZWxkIGluIGdyb3VwX3N0YWdlKSB7XG4gICAgICAgIGlmIChmaWVsZCAhPT0gJ19pZCcpIHtcbiAgICAgICAgICAgIC8vIGhhbmRsZSBncm91cCBmaWVsZFxuICAgICAgICAgICAgLy8gbGV0IGdyb3VwX2tleSA9IGtleTtcbiAgICAgICAgICAgIGxldCBncm91cF9maWVsZCA9IGdyb3VwX3N0YWdlW2ZpZWxkXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIGdyb3VwX2ZpZWxkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFfLmhhc0luKGdyb3VwX29wZXJhdG9ycywga2V5KSkgbG9nZ2VyLnRocm93KGBVbmtub3duIGFjY3VtdWxhdG9yIG9wZXJhdG9yIFwiJHtrZXl9XCIgZm9yIGdyb3VwIHN0YWdlYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gbG9vcCB0aHJvdWdoIGFsbCBkb2N1bWVudHNcbiAgICAgICAgICAgICAgICAvLyB2YXIgbmV3X2RvY3MgPSB7fTtcbiAgICAgICAgICAgICAgICAvLyBmb3IgKGxldCBpID0gMDsgaSA8IGRvY3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vICAgICBsZXQgZG9jID0gZG9jdW1lbnRzW2ldO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyAgICAgaWYgKF8uaGFzSW4oZG9jLCBncm91cF9pZCkpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIGxldCBfaWQgPSBkb2NbZ3JvdXBfaWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBpZiAoIV8uaGFzSW4obmV3X2RvY3MsIF9pZCkpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICBuZXdfZG9jc1tfaWRdID0ge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBfaWQ6IF9pZCxcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgW25ld19maWVsZF06IHZhbHVlXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgbmV3X2RvY3NbX2lkXVtuZXdfZmllbGRdICs9IHZhbHVlO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIGlmICghXy5oYXNJbihvcGVyYXRvcnMsIGtleSkpIG9wZXJhdG9yc1trZXldID0gW107XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gb3BlcmF0b3JzW2tleV0ucHVzaCh7XG4gICAgICAgICAgICAgICAgLy8gICAgIG5ld19maWVsZDogZmllbGQsXG4gICAgICAgICAgICAgICAgLy8gICAgIHZhbHVlOiBncm91cF9maWVsZFtrZXldXG4gICAgICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbGV0IGNvdW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc1N0cmluZyhncm91cF9maWVsZFtrZXldKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ3JvdXBfZmllbGRba2V5XS5zdWJzdHIoMCwgMSkgIT09ICckJykgbG9nZ2VyLnRocm93KFwiRmllbGQgbmFtZXMgcmVmZXJlbmNlcyBpbiBhIHJpZ2h0IHNpZGUgYXNzaWduZW1lbnQgbXVzdCBiZSBwcmVjZWRlZCBieSAnJCdcIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaXNGaW5pdGUoXy50b051bWJlcihncm91cF9maWVsZFtrZXldKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbGV0IG9wZXJhdG9yID0gZ3JvdXBfb3BlcmF0b3JzW2tleV07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXy5tZXJnZShkb2NzLCBvcGVyYXRvcihkb2N1bWVudHMsIGdyb3VwX2lkLCBmaWVsZCwgZ3JvdXBfZmllbGRba2V5XSwgY291bnQpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gXy52YWx1ZXMoZG9jcyk7XG59O1xuXG52YXIgZG9fY29tcGxleF9ncm91cCA9IGZ1bmN0aW9uKCkge1xuICAgIFxufTtcblxudmFyIGRvX3NvcnQgPSBmdW5jdGlvbihkb2N1bWVudHMsIHNvcnRfc3RhZ2UpIHtcbiAgICByZXR1cm4gZG9jdW1lbnRzLnNvcnQobmV3IFNlbGVjdG9yKHNvcnRfc3RhZ2UsIFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpKTtcbn07XG5cbnZhciBkb19tYXRjaCA9IGZ1bmN0aW9uKGRvY3VtZW50cywgbWF0Y2hfc3RhZ2UpIHtcbiAgICB2YXIgY3Vyc29yID0gbmV3IEN1cnNvcihkb2N1bWVudHMsIG1hdGNoX3N0YWdlKTtcbiAgICBcbiAgICByZXR1cm4gY3Vyc29yLmZldGNoKCk7XG59O1xuXG52YXIgZG9fZ3JvdXAgPSBmdW5jdGlvbihkb2N1bWVudHMsIGdyb3VwX3N0YWdlKSB7XG4gICAgaWYgKCFfLmhhc0luKGdyb3VwX3N0YWdlLCAnX2lkJykpIGxvZ2dlci50aHJvdygnVGhlIGZpZWxkIFwiX2lkXCIgaXMgcmVxdWlyZWQgaW4gdGhlIFwiJGdyb3VwXCIgc3RhZ2UnKTtcbiAgICBcbiAgICBsZXQgbmV3X2lkID0gZ3JvdXBfc3RhZ2VbJ19pZCddO1xuICAgIFxuICAgIGlmICghXy5pc051bGwobmV3X2lkKSkge1xuICAgICAgICBpZiAobmV3X2lkLnN1YnN0cigwLCAxKSAhPT0gJyQnKSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJGaWVsZCBuYW1lcyByZWZlcmVuY2VzIGluIGEgcmlnaHQgc2lkZSBhc3NpZ25lbWVudCBtdXN0IGJlIHByZWNlZGVkIGJ5ICckJ1wiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ld19pZCA9IG5ld19pZC5zdWJzdHIoMSwgbmV3X2lkLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgaWYgKF8uaXNQbGFpbk9iamVjdChuZXdfaWQpKSB7XG4gICAgICAgIC8vIGNvbXBsZXhfaWRcbiAgICAgICAgLy8gZG9fY29tcGxleF9ncm91cCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNpbmdsZV9pZFxuICAgICAgICByZXR1cm4gZG9fc2luZ2xlX2dyb3VwKG5ld19pZCwgZ3JvdXBfc3RhZ2UsIGRvY3VtZW50cyk7XG4gICAgfVxufTtcblxuY2xhc3MgQWdncmVnYXRpb24ge1xuICAgIGNvbnN0cnVjdG9yKHBpcGVsaW5lKSB7XG4gICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucGlwZWxpbmUgPSBwaXBlbGluZTtcbiAgICB9XG4gICAgXG4gICAgYWdncmVnYXRlKGNvbGxlY3Rpb24pIHtcbiAgICAgICAgdmFyIGRvY3MgPSBjb2xsZWN0aW9uLmRvY3M7XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucGlwZWxpbmUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBzdGFnZSA9IHRoaXMucGlwZWxpbmVbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiBzdGFnZSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJyRtYXRjaCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2NzID0gZG9fbWF0Y2goZG9jcywgc3RhZ2Vba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICckZ3JvdXAnOlxuICAgICAgICAgICAgICAgICAgICAgICAgZG9jcyA9IGRvX2dyb3VwKGRvY3MsIHN0YWdlW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnJHNvcnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgZG9jcyA9IGRvX3NvcnQoZG9jcywgc3RhZ2Vba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGRvY3M7ICAgIC8vIG1vdmUgdG8gY3Vyc29yXG4gICAgfVxuICAgIFxuICAgIHZhbGlkU3RhZ2Uoc3RhZ2UpIHtcbiAgICAgICAgaWYgKCFfLmhhc0luKHN0YWdlcywgc3RhZ2UpKSByZXR1cm4gbG9nZ2VyLnRocm93KGBVbmtub3duIHN0YWdlIFwiJHtzdGFnZX1cImApO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0YWdlc1tzdGFnZV0gPT09IGZhbHNlKSByZXR1cm4gbG9nZ2VyLnRocm93KGBVbnN1cHBvcnRlZCBzdGFnZSBcIiR7c3RhZ2V9XCJgKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IEFnZ3JlZ2F0aW9uOyJdfQ==
