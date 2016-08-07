'use strict';

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

var logger = null;

module.exports = function (Selector, Cursor, Logger, _) {

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
                        }, _defineProperty(_new_docs$_id2, new_field, _.toNumber(val)), _defineProperty(_new_docs$_id2, '__COUNT__', 1), _new_docs$_id2);
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
                    if (!_.hasIn(group_operators, key)) logger.throw('Unknown accumulator operator "' + key + '" for group stage');

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

    var do_project = function do_project(documents, project_stage) {
        return Cursor.project(documents, project_stage, true);
    };

    var Aggregation = function () {
        function Aggregation(pipeline) {
            _classCallCheck(this, Aggregation);

            logger = Logger.instance;

            this.pipeline = pipeline;
        }

        _createClass(Aggregation, [{
            key: 'aggregate',
            value: function aggregate(collection) {
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
            }
        }, {
            key: 'validStage',
            value: function validStage(stage) {
                if (!_.hasIn(stages, stage)) return logger.throw('Unknown stage "' + stage + '"');

                if (stages[stage] === false) return logger.throw('Unsupported stage "' + stage + '"');

                return true;
            }
        }]);

        return Aggregation;
    }();

    return Aggregation;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9BZ2dyZWdhdGlvbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQVNBLElBQUksU0FBUyxJQUFiOztBQUVBLE9BQU8sT0FBUCxHQUFpQixVQUFTLFFBQVQsRUFBbUIsTUFBbkIsRUFBMkIsTUFBM0IsRUFBbUMsQ0FBbkMsRUFBc0M7O0FBRW5ELFFBQUksU0FBUztBQUNULG9CQUFZLElBREg7QUFFVCxrQkFBVSxJQUZEO0FBR1QsbUJBQVcsS0FIRjtBQUlULGtCQUFVLEtBSkQ7QUFLVCxpQkFBUyxLQUxBO0FBTVQsbUJBQVcsS0FORjtBQU9ULGtCQUFVLElBUEQ7QUFRVCxtQkFBVyxLQVJGO0FBU1QsaUJBQVMsSUFUQTtBQVVULG9CQUFZLEtBVkg7QUFXVCxtQkFBVyxLQVhGO0FBWVQsZ0JBQVEsS0FaQztBQWFULHVCQUFlO0FBYk4sS0FBYjs7QUFnQkEsUUFBSSxrQkFBa0I7QUFDbEIsY0FBTSxjQUFTLFNBQVQsRUFBb0IsTUFBcEIsRUFBNEIsU0FBNUIsRUFBdUMsS0FBdkMsRUFBOEMsT0FBOUMsRUFBdUQ7QUFDekQsZ0JBQUksV0FBVyxFQUFmOztBQUVBLGlCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksVUFBVSxNQUE5QixFQUFzQyxHQUF0QyxFQUEyQztBQUN2QyxvQkFBSSxNQUFNLFVBQVUsQ0FBVixDQUFWO0FBQ0Esb0JBQUksTUFBTSxLQUFWOztBQUVBLG9CQUFJLENBQUMsT0FBTCxFQUFjO0FBQ1YsMEJBQU0sSUFBSSxNQUFNLE1BQU4sQ0FBYSxDQUFiLEVBQWdCLE1BQU0sTUFBdEIsQ0FBSixLQUFzQyxDQUE1QztBQUNIOztBQUVELG9CQUFJLEVBQUUsS0FBRixDQUFRLEdBQVIsRUFBYSxNQUFiLENBQUosRUFBMEI7QUFDdEIsd0JBQUksTUFBTSxJQUFJLE1BQUosQ0FBVjs7QUFFQSx3QkFBSSxDQUFDLEVBQUUsS0FBRixDQUFRLFFBQVIsRUFBa0IsR0FBbEIsQ0FBTCxFQUE2QjtBQUN6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QkFBSSxDQUFDLEVBQUUsS0FBRixDQUFRLE1BQVIsRUFBZ0IsS0FBaEIsQ0FBTCxFQUE2QixPQUFPLE9BQU8sS0FBUCxxQkFBK0IsS0FBL0IsT0FBUDs7QUFFN0Isb0JBQUksT0FBTyxLQUFQLE1BQWtCLEtBQXRCLEVBQTZCLE9BQU8sT0FBTyxLQUFQLHlCQUFtQyxLQUFuQyxPQUFQOztBQUU3Qix1QkFBTyxJQUFQO0FBQ0g7QUFwTzhDOztBQUFBO0FBQUE7O0FBd09uRCxXQUFPLFdBQVA7QUFDSCxDQXpPRCIsImZpbGUiOiJBZ2dyZWdhdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgQ3Vyc29yLmpzIC0gYmFzZWQgb24gTW9uZ2xvI0N1cnNvciAoe0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Nb25nbG99KSBieSBDaHJpc3RpYW4gU3VsbGl2YW4gPGNzQGV1Zm9yaWMuY28+IHwgQ29weXJpZ2h0IChjKSAyMDEyXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogXG4gKiBAYXV0aG9yIEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAyMDE2IEVkdWFyZG8gQXN0b2xmaSA8ZWR1YXJkby5hc3RvbGZpOTFAZ21haWwuY29tPlxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIGxvZ2dlciA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oU2VsZWN0b3IsIEN1cnNvciwgTG9nZ2VyLCBfKSB7XG4gICAgXG4gICAgdmFyIHN0YWdlcyA9IHtcbiAgICAgICAgJyRwcm9qZWN0JzogdHJ1ZSxcbiAgICAgICAgJyRtYXRjaCc6IHRydWUsXG4gICAgICAgICckcmVkYWN0JzogZmFsc2UsXG4gICAgICAgICckbGltaXQnOiBmYWxzZSxcbiAgICAgICAgJyRza2lwJzogZmFsc2UsXG4gICAgICAgICckdW53aW5kJzogZmFsc2UsXG4gICAgICAgICckZ3JvdXAnOiB0cnVlLFxuICAgICAgICAnJHNhbXBsZSc6IGZhbHNlLFxuICAgICAgICAnJHNvcnQnOiB0cnVlLFxuICAgICAgICAnJGdlb05lYXInOiBmYWxzZSxcbiAgICAgICAgJyRsb29rdXAnOiBmYWxzZSxcbiAgICAgICAgJyRvdXQnOiBmYWxzZSxcbiAgICAgICAgJyRpbmRleFN0YXRzJzogZmFsc2VcbiAgICB9O1xuICAgIFxuICAgIHZhciBncm91cF9vcGVyYXRvcnMgPSB7XG4gICAgICAgICRzdW06IGZ1bmN0aW9uKGRvY3VtZW50cywgbmV3X2lkLCBuZXdfZmllbGQsIHZhbHVlLCBpc0NvdW50KSB7XG4gICAgICAgICAgICB2YXIgbmV3X2RvY3MgPSB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkb2N1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgZG9jID0gZG9jdW1lbnRzW2ldO1xuICAgICAgICAgICAgICAgIGxldCB2YWwgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWlzQ291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsID0gZG9jW3ZhbHVlLnN1YnN0cigxLCB2YWx1ZS5sZW5ndGgpXSB8fCAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoXy5oYXNJbihkb2MsIG5ld19pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IF9pZCA9IGRvY1tuZXdfaWRdO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmhhc0luKG5ld19kb2NzLCBfaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdfZG9jc1tfaWRdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9pZDogX2lkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtuZXdfZmllbGRdOiBfLnRvTnVtYmVyKHZhbClcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdfZG9jc1tfaWRdW25ld19maWVsZF0gKz0gXy50b051bWJlcih2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gbmV3X2RvY3M7XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICAkYXZnOiBmdW5jdGlvbihkb2N1bWVudHMsIG5ld19pZCwgbmV3X2ZpZWxkLCB2YWx1ZSwgaXNDb3VudCkge1xuICAgICAgICAgICAgdmFyIG5ld19kb2NzID0ge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZG9jdW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IGRvYyA9IGRvY3VtZW50c1tpXTtcbiAgICAgICAgICAgICAgICBsZXQgdmFsID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFpc0NvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbCA9IGRvY1t2YWx1ZS5zdWJzdHIoMSwgdmFsdWUubGVuZ3RoKV0gfHwgMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKF8uaGFzSW4oZG9jLCBuZXdfaWQpIHx8IF8uaXNOdWxsKG5ld19pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IF9pZCA9IGRvY1tuZXdfaWRdIHx8IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaGFzSW4obmV3X2RvY3MsIF9pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld19kb2NzW19pZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2lkOiBfaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgW25ld19maWVsZF06IF8udG9OdW1iZXIodmFsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfX0NPVU5UX186IDFcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdfZG9jc1tfaWRdW25ld19maWVsZF0gKz0gXy50b051bWJlcih2YWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3X2RvY3NbX2lkXS5fX0NPVU5UX18rKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIG5ld19kb2NzKSB7XG4gICAgICAgICAgICAgICAgbmV3X2RvY3Nba2V5XVtuZXdfZmllbGRdID0gbmV3X2RvY3Nba2V5XVtuZXdfZmllbGRdIC8gbmV3X2RvY3Nba2V5XS5fX0NPVU5UX187XG4gICAgICAgICAgICAgICAgZGVsZXRlIG5ld19kb2NzW2tleV0uX19DT1VOVF9fO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gbmV3X2RvY3M7XG4gICAgICAgIH0gXG4gICAgfTtcbiAgICBcbiAgICB2YXIgZG9fc2luZ2xlX2dyb3VwID0gZnVuY3Rpb24oZ3JvdXBfaWQsIGdyb3VwX3N0YWdlLCBkb2N1bWVudHMpIHtcbiAgICAgICAgLy8gdmFyIG9wZXJhdG9ycyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgbGV0IGRvY3MgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGZpZWxkIGluIGdyb3VwX3N0YWdlKSB7XG4gICAgICAgICAgICBpZiAoZmllbGQgIT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gaGFuZGxlIGdyb3VwIGZpZWxkXG4gICAgICAgICAgICAgICAgLy8gbGV0IGdyb3VwX2tleSA9IGtleTtcbiAgICAgICAgICAgICAgICBsZXQgZ3JvdXBfZmllbGQgPSBncm91cF9zdGFnZVtmaWVsZF07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIGdyb3VwX2ZpZWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghXy5oYXNJbihncm91cF9vcGVyYXRvcnMsIGtleSkpIGxvZ2dlci50aHJvdyhgVW5rbm93biBhY2N1bXVsYXRvciBvcGVyYXRvciBcIiR7a2V5fVwiIGZvciBncm91cCBzdGFnZWApO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gbG9vcCB0aHJvdWdoIGFsbCBkb2N1bWVudHNcbiAgICAgICAgICAgICAgICAgICAgLy8gdmFyIG5ld19kb2NzID0ge307XG4gICAgICAgICAgICAgICAgICAgIC8vIGZvciAobGV0IGkgPSAwOyBpIDwgZG9jdW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBsZXQgZG9jID0gZG9jdW1lbnRzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBpZiAoXy5oYXNJbihkb2MsIGdyb3VwX2lkKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIGxldCBfaWQgPSBkb2NbZ3JvdXBfaWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIGlmICghXy5oYXNJbihuZXdfZG9jcywgX2lkKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICBuZXdfZG9jc1tfaWRdID0ge1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgX2lkOiBfaWQsXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBbbmV3X2ZpZWxkXTogdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICBuZXdfZG9jc1tfaWRdW25ld19maWVsZF0gKz0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBpZiAoIV8uaGFzSW4ob3BlcmF0b3JzLCBrZXkpKSBvcGVyYXRvcnNba2V5XSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gb3BlcmF0b3JzW2tleV0ucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBuZXdfZmllbGQ6IGZpZWxkLFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgdmFsdWU6IGdyb3VwX2ZpZWxkW2tleV1cbiAgICAgICAgICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoXy5pc1N0cmluZyhncm91cF9maWVsZFtrZXldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdyb3VwX2ZpZWxkW2tleV0uc3Vic3RyKDAsIDEpICE9PSAnJCcpIGxvZ2dlci50aHJvdyhcIkZpZWxkIG5hbWVzIHJlZmVyZW5jZXMgaW4gYSByaWdodCBzaWRlIGFzc2lnbmVtZW50IG11c3QgYmUgcHJlY2VkZWQgYnkgJyQnXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaXNGaW5pdGUoXy50b051bWJlcihncm91cF9maWVsZFtrZXldKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBsZXQgb3BlcmF0b3IgPSBncm91cF9vcGVyYXRvcnNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIF8ubWVyZ2UoZG9jcywgb3BlcmF0b3IoZG9jdW1lbnRzLCBncm91cF9pZCwgZmllbGQsIGdyb3VwX2ZpZWxkW2tleV0sIGNvdW50KSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBfLnZhbHVlcyhkb2NzKTtcbiAgICB9O1xuICAgIFxuICAgIHZhciBkb19jb21wbGV4X2dyb3VwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgIH07XG4gICAgXG4gICAgdmFyIGRvX3NvcnQgPSBmdW5jdGlvbihkb2N1bWVudHMsIHNvcnRfc3RhZ2UpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50cy5zb3J0KG5ldyBTZWxlY3Rvcihzb3J0X3N0YWdlLCBTZWxlY3Rvci5TT1JUX1NFTEVDVE9SKSk7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgZG9fbWF0Y2ggPSBmdW5jdGlvbihkb2N1bWVudHMsIG1hdGNoX3N0YWdlKSB7XG4gICAgICAgIHZhciBjdXJzb3IgPSBuZXcgQ3Vyc29yKGRvY3VtZW50cywgbWF0Y2hfc3RhZ2UpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGN1cnNvci5mZXRjaCgpO1xuICAgIH07XG4gICAgXG4gICAgdmFyIGRvX2dyb3VwID0gZnVuY3Rpb24oZG9jdW1lbnRzLCBncm91cF9zdGFnZSkge1xuICAgICAgICBpZiAoIV8uaGFzSW4oZ3JvdXBfc3RhZ2UsICdfaWQnKSkgbG9nZ2VyLnRocm93KCdUaGUgZmllbGQgXCJfaWRcIiBpcyByZXF1aXJlZCBpbiB0aGUgXCIkZ3JvdXBcIiBzdGFnZScpO1xuICAgICAgICBcbiAgICAgICAgbGV0IG5ld19pZCA9IGdyb3VwX3N0YWdlWydfaWQnXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc051bGwobmV3X2lkKSkge1xuICAgICAgICAgICAgaWYgKG5ld19pZC5zdWJzdHIoMCwgMSkgIT09ICckJykge1xuICAgICAgICAgICAgICAgIGxvZ2dlci50aHJvdyhcIkZpZWxkIG5hbWVzIHJlZmVyZW5jZXMgaW4gYSByaWdodCBzaWRlIGFzc2lnbmVtZW50IG11c3QgYmUgcHJlY2VkZWQgYnkgJyQnXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXdfaWQgPSBuZXdfaWQuc3Vic3RyKDEsIG5ld19pZC5sZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiAoXy5pc1BsYWluT2JqZWN0KG5ld19pZCkpIHtcbiAgICAgICAgICAgIC8vIGNvbXBsZXhfaWRcbiAgICAgICAgICAgIC8vIGRvX2NvbXBsZXhfZ3JvdXAoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNpbmdsZV9pZFxuICAgICAgICAgICAgcmV0dXJuIGRvX3NpbmdsZV9ncm91cChuZXdfaWQsIGdyb3VwX3N0YWdlLCBkb2N1bWVudHMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB2YXIgZG9fcHJvamVjdCA9IGZ1bmN0aW9uKGRvY3VtZW50cywgcHJvamVjdF9zdGFnZSkge1xuICAgICAgICByZXR1cm4gQ3Vyc29yLnByb2plY3QoZG9jdW1lbnRzLCBwcm9qZWN0X3N0YWdlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgY2xhc3MgQWdncmVnYXRpb24ge1xuICAgICAgICBjb25zdHJ1Y3RvcihwaXBlbGluZSkge1xuICAgICAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnBpcGVsaW5lID0gcGlwZWxpbmU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGFnZ3JlZ2F0ZShjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgICB2YXIgZG9jcyA9IGNvbGxlY3Rpb24uZG9jcztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnBpcGVsaW5lLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YWdlID0gdGhpcy5waXBlbGluZVtpXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gc3RhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJyRwcm9qZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2NzID0gZG9fcHJvamVjdChkb2NzLCBzdGFnZVtrZXldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJyRtYXRjaCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jcyA9IGRvX21hdGNoKGRvY3MsIHN0YWdlW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnJGdyb3VwJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2NzID0gZG9fZ3JvdXAoZG9jcywgc3RhZ2Vba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICckc29ydCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jcyA9IGRvX3NvcnQoZG9jcywgc3RhZ2Vba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBkb2NzOyAgICAvLyBtb3ZlIHRvIGN1cnNvclxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YWxpZFN0YWdlKHN0YWdlKSB7XG4gICAgICAgICAgICBpZiAoIV8uaGFzSW4oc3RhZ2VzLCBzdGFnZSkpIHJldHVybiBsb2dnZXIudGhyb3coYFVua25vd24gc3RhZ2UgXCIke3N0YWdlfVwiYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzdGFnZXNbc3RhZ2VdID09PSBmYWxzZSkgcmV0dXJuIGxvZ2dlci50aHJvdyhgVW5zdXBwb3J0ZWQgc3RhZ2UgXCIke3N0YWdlfVwiYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIFxuICAgIHJldHVybiBBZ2dyZWdhdGlvbjtcbn07Il19
