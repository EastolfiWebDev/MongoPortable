"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Logger = require("./utils/Logger"),
    _ = require("lodash"),
    SelectorMatcher = require("./SelectorMatcher");

var logger = null;

var Selector = function () {
    function Selector(selector) {
        var type = arguments.length <= 1 || arguments[1] === undefined ? Selector.MATCH_SELECTOR : arguments[1];

        _classCallCheck(this, Selector);

        logger = Logger.instance;

        this.selector_compiled = null;

        if (type === Selector.MATCH_SELECTOR) {
            this.selector_compiled = this.compile(selector);
        } else if (type === Selector.SORT_SELECTOR) {
            return this.compileSort(selector);
        } else if (type === Selector.FIELD_SELECTOR) {
            return this.compileFields(selector);
        } else {
            logger.throw("You need to specify the selector type");
        }
    }

    _createClass(Selector, [{
        key: "test",
        value: function test(doc) {
            return this.selector_compiled.test(doc);
        }
    }, {
        key: "compile",
        value: function compile(selector) {
            if (_.isNil(selector)) {
                logger.debug('selector -> null');

                selector = {};
            } else {
                logger.debug('selector -> not null');

                if (!selector || _.hasIn(selector, '_id') && !selector._id) {
                    logger.debug('selector -> false value || { _id: false value }');

                    selector = {
                        _id: false
                    };
                }
            }

            if (_.isFunction(selector)) {
                logger.debug('selector -> function(doc) { ... }');

                //_initFunction.call(matcher, selector);
                this.clauses = [{
                    kind: 'function',
                    value: selector
                }];

                logger.debug('clauses created: ' + JSON.stringify(this.clauses));
            } else if (_.isString(selector) || _.isNumber(selector)) {
                logger.debug('selector -> "123456789" || 123456798');

                selector = {
                    _id: selector
                };

                //_initObject.call(matcher, selector);
                this.clauses = _buildSelector(selector);

                logger.debug('clauses created: ' + JSON.stringify(this.clauses));
            } else {
                logger.debug('selector -> { field: value }');

                //_initObject.call(matcher, selector);
                this.clauses = _buildSelector(selector);

                logger.debug('clauses created: ' + JSON.stringify(this.clauses));
            }

            var matcher = new SelectorMatcher(this);

            return matcher;
        }
    }, {
        key: "compileSort",
        value: function compileSort(spec) {
            if (_.isNil(spec)) {
                return function () {
                    return 0;
                };
            }

            var keys = [];
            var asc = [];

            if (_.isString(spec)) {
                spec = spec.replace(/( )+/ig, ' ').trim();

                if (spec.indexOf(',') !== -1) {
                    // Replace commas by spaces, and treat it as a spaced-separated string
                    return this.compileSort(spec.replace(/,/ig, ' '));
                } else if (spec.indexOf(' ') !== -1) {
                    var fields = spec.split(' ');

                    for (var i = 0; i < fields.length; i++) {
                        var field = fields[i].trim();

                        if (field === 'desc' || field === 'asc' || field === '-1' || field === '1' || field === 'false' || field === 'true') {

                            throw Error("Bad sort specification: ", JSON.stringify(spec));
                        } else {
                            var next = _.toString(fields[i + 1]);

                            if (next === 'desc' || next === 'asc') {
                                keys.push(field);
                                asc.push(next === 'asc' ? true : false);

                                i++;
                            } else if (next === '-1' || next === '1') {
                                keys.push(field);
                                asc.push(next === '1' ? true : false);

                                i++;
                            } else if (next === 'false' || next === 'true') {
                                keys.push(field);
                                asc.push(next === 'true' ? true : false);

                                i++;
                            } else {
                                keys.push(field);
                                asc.push(true); // Default sort
                            }
                        }
                    }
                } else {
                        //.sort("field1")

                        keys.push(spec);
                        asc.push(true);
                    }
            } else if (_.isArray(spec)) {
                // Join the array with spaces, and treat it as a spaced-separated string
                return this.compileSort(spec.join(' '));
                // for (var i = 0; i < spec.length; i++) {
                //     if (_.isString(spec[i])) {
                //         keys.push(spec[i]);
                //         asc.push(true);
                //     } else {
                //         keys.push(spec[i][0]);
                //         asc.push(spec[i][1] !== "desc");
                //     }
                // }
            } else if (_.isPlainObject(spec)) {
                    // TODO Nested path -> .sort({ "field1.field12": "asc" })
                    var _spec = [];
                    for (var key in spec) {
                        if (_.hasIn(spec, key)) {
                            _spec.push(key);
                            _spec.push(spec[key]);
                        }
                    }

                    return this.compileSort(_spec);
                } else {
                    throw Error("Bad sort specification: ", JSON.stringify(spec));
                }

            // return {keys: keys, asc: asc};
            return function (a, b) {
                var x = 0;

                for (var i = 0; i < keys.length; i++) {
                    if (i !== 0 && x !== 0) return x; // Non reachable?

                    // x = Selector._f._cmp(a[JSON.stringify(keys[i])], b[JSON.stringify(keys[i])]);
                    x = SelectorMatcher.cmp(a[keys[i]], b[keys[i]]);

                    if (!asc[i]) {
                        x *= -1;
                    }
                }

                return x;
            };

            // eval() does not return a value in IE8, nor does the spec say it
            // should. Assign to a local to get the value, instead.

            // var _func;
            // var code = "_func = (function(c){return function(a,b){var x;";
            // for (var i = 0; i < keys.length; i++) {
            //     if (i !== 0) {
            //         code += "if(x!==0)return x;";
            //     }

            //     code += "x=" + (asc[i] ? "" : "-") + "c(a[" + JSON.stringify(keys[i]) + "],b[" + JSON.stringify(keys[i]) + "]);";
            // }

            // code += "return x;};})";

            // eval(code);

            // return _func(Selector._f._cmp);
        }
    }, {
        key: "compileFields",
        value: function compileFields(spec) {
            var projection = {};

            if (_.isString(spec)) {
                spec = spec.replace(/( )+/ig, ' ').trim();

                if (spec.indexOf(',') !== -1) {
                    // Replace commas by spaces, and treat it as a spaced-separated string
                    return this.compileFields(spec.replace(/,/ig, ' '));
                } else if (spec.indexOf(' ') !== -1) {
                    var fields = spec.split(' ');

                    for (var i = 0; i < fields.length; i++) {
                        var field = fields[i].trim();

                        if (field === '-1' || field === '1' || field === 'false' || field === 'true') {

                            throw Error("Bad fields specification: ", JSON.stringify(spec));
                        } else {
                            var next = _.toString(fields[i + 1]);

                            if (next === '-1' || next === '1') {
                                if (next === '-1') {
                                    if (field === '_id') {
                                        projection[field] = -1;
                                    } else {
                                        throw new Error("A projection cannot contain both include and exclude specifications");
                                    }
                                } else {
                                    projection[field] = 1;
                                }

                                i++;
                            } else if (next === 'false' || next === 'true') {
                                if (next === 'false') {
                                    if (field === '_id') {
                                        projection[field] = -1;
                                    } else {
                                        throw new Error("A projection cannot contain both include and exclude specifications");
                                    }
                                } else {
                                    projection[field] = 1;
                                }

                                i++;
                            } else {
                                projection[field] = 1;
                            }
                        }
                    }
                } else if (spec.length > 0) {
                    //.find({}, "field1")

                    projection[spec] = 1;
                }
            } else if (_.isArray(spec)) {
                // Join the array with spaces, and treat it as a spaced-separated string
                return this.compileFields(spec.join(' '));
            } else if (_.isPlainObject(spec)) {
                // TODO Nested path -> .find({}, { "field1.field12": "asc" })
                var _spec = [];
                for (var key in spec) {
                    if (_.hasIn(spec, key)) {
                        _spec.push(key);
                        _spec.push(spec[key]);
                    }
                }

                return this.compileFields(_spec);
            } else {
                throw Error("Bad fields specification: ", JSON.stringify(spec));
            }

            return projection;
        }

        /* STATIC METHODS */

    }], [{
        key: "isSelectorCompiled",
        value: function isSelectorCompiled(selector) {
            if (!_.isNil(selector) && (selector instanceof SelectorMatcher || selector instanceof Selector && selector.selector_compiled instanceof SelectorMatcher)) {
                return true;
            } else {
                return false;
            }
        }
    }, {
        key: "matches",
        value: function matches(selector, doc) {
            return new Selector(selector).test(doc);
        }
    }]);

    return Selector;
}();

var _buildSelector = function _buildSelector(selector) {
    logger.debug('Called: _buildSelector');

    var clauses = [];

    for (var key in selector) {
        var value = selector[key];

        if (key.charAt(0) === '$') {
            logger.debug('selector -> operator => { $and: [{...}, {...}] }');

            clauses.push(_buildDocumentSelector(key, value));
        } else {
            logger.debug('selector -> plain => { field1: <value> }');

            clauses.push(_buildKeypathSelector(key, value));
        }
    }

    return clauses;
};

var _buildDocumentSelector = function _buildDocumentSelector(key, value) {
    var clause = {};

    switch (key) {
        case '$or':
        case '$and':
        case '$nor':
            clause.key = key.replace(/\$/, '');
        // The rest will be handled by '_operator_'
        case '_operator_':
            // Generic handler for operators ($or, $and, $nor)

            clause.kind = 'operator';
            clause.type = 'array';

            clause.value = _buildSelector(value);

            break;
        default:
            throw Error("Unrecogized key in selector: ", key);
    }

    // TODO cases: $where, $elemMatch

    logger.debug('clause created: ' + JSON.stringify(clause));

    return clause;
};

var _buildKeypathSelector = function _buildKeypathSelector(keypath, value) {
    logger.debug('Called: _buildKeypathSelector');

    var clause = {};

    clause.value = value;

    if (_.isNil(value)) {
        logger.debug('clause of type null');

        clause.type = 'null';
    } else if (_.isRegExp(value)) {
        logger.debug('clause of type RegExp');

        clause.type = 'regexp';

        var source = value.toString().split('/');

        clause.value = {
            $regex: source[1] // The first item splitted is an empty string
        };

        if (source[2] != "") {
            clause.value["$options"] = source[2];
        }
    } else if (_.isArray(value)) {
        logger.debug('clause of type Array');

        clause.type = 'array';
    } else if (_.isString(value)) {
        logger.debug('clause of type String');

        clause.type = 'string';
    } else if (_.isNumber(value)) {
        logger.debug('clause of type Number');

        clause.type = 'number';
    } else if (_.isBoolean(value)) {
        logger.debug('clause of type Boolean');

        clause.type = 'boolean';
    } else if (_.isFunction(value)) {
        logger.debug('clause of type Function');

        clause.type = 'function';
    } else if (_.isPlainObject(value)) {
        var literalObject = true;
        for (var key in value) {
            if (key.charAt(0) === '$') {
                literalObject = false;
                break;
            }
        }

        if (literalObject) {
            logger.debug('clause of type Object => { field: { field_1: <value>, field_2: <value> } }');

            clause.type = 'literal_object';
        } else {
            logger.debug('clause of type Operator => { field: { $gt: 2, $lt 5 } }');

            clause.type = 'operator_object';
        }
    } else {
        clause.type = '__invalid__';
    }

    var parts = keypath.split('.');
    if (parts.length > 1) {
        logger.debug('clause over Object field => { "field1.field1_2": <value> }');

        clause.kind = 'object';
        clause.key = parts;
    } else {
        logger.debug('clause over Plain field => { "field": <value> }');

        clause.kind = 'plain';
        clause.key = parts[0];
    }

    logger.debug('clause created: ' + JSON.stringify(clause));

    return clause;
};

Selector.MATCH_SELECTOR = 'match';
Selector.SORT_SELECTOR = 'sort';
Selector.FIELD_SELECTOR = 'field';

module.exports = Selector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9TZWxlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxJQUFJLFNBQVMsUUFBUSxnQkFBUixDQUFiO0lBQ0ksSUFBSSxRQUFRLFFBQVIsQ0FEUjtJQUVJLGtCQUFrQixRQUFRLG1CQUFSLENBRnRCOztBQUlBLElBQUksU0FBUyxJQUFiOztJQUVNLFE7QUFDRixzQkFBWSxRQUFaLEVBQXNEO0FBQUEsWUFBaEMsSUFBZ0MseURBQXpCLFNBQVMsY0FBZ0I7O0FBQUE7O0FBQ2xELGlCQUFTLE9BQU8sUUFBaEI7O0FBRUEsYUFBSyxpQkFBTCxHQUF5QixJQUF6Qjs7QUFFTixZQUFJLFNBQVMsU0FBUyxjQUF0QixFQUFzQztBQUNyQyxpQkFBSyxpQkFBTCxHQUF5QixLQUFLLE9BQUwsQ0FBYSxRQUFiLENBQXpCO0FBQ0EsU0FGRCxNQUVPLElBQUksU0FBUyxTQUFTLGFBQXRCLEVBQXFDO0FBQzNDLG1CQUFPLEtBQUssV0FBTCxDQUFpQixRQUFqQixDQUFQO0FBQ0EsU0FGTSxNQUVBLElBQUksU0FBUyxTQUFTLGNBQXRCLEVBQXNDO0FBQzVDLG1CQUFPLEtBQUssYUFBTCxDQUFtQixRQUFuQixDQUFQO0FBQ0EsU0FGTSxNQUVBO0FBQ04sbUJBQU8sS0FBUCxDQUFhLHVDQUFiO0FBQ0E7QUFDRTs7Ozs2QkFFSSxHLEVBQUs7QUFDTixtQkFBTyxLQUFLLGlCQUFMLENBQXVCLElBQXZCLENBQTRCLEdBQTVCLENBQVA7QUFDSDs7O2dDQUVPLFEsRUFBVTtBQUNwQixnQkFBSSxFQUFFLEtBQUYsQ0FBUSxRQUFSLENBQUosRUFBdUI7QUFDdEIsdUJBQU8sS0FBUCxDQUFhLGtCQUFiOztBQUVBLDJCQUFXLEVBQVg7QUFDQSxhQUpELE1BSU87QUFDTix1QkFBTyxLQUFQLENBQWEsc0JBQWI7O0FBRUEsb0JBQUksQ0FBQyxRQUFELElBQWMsRUFBRSxLQUFGLENBQVEsUUFBUixFQUFrQixLQUFsQixLQUE0QixDQUFDLFNBQVMsR0FBeEQsRUFBOEQ7QUFDN0QsMkJBQU8sS0FBUCxDQUFhLGlEQUFiOztBQUVBLCtCQUFXO0FBQ1YsNkJBQUs7QUFESyxxQkFBWDtBQUdBO0FBQ0Q7O0FBRUQsZ0JBQUksRUFBRSxVQUFGLENBQWEsUUFBYixDQUFKLEVBQTRCO0FBQzNCLHVCQUFPLEtBQVAsQ0FBYSxtQ0FBYjs7O0FBR0EscUJBQUssT0FBTCxHQUFlLENBQUM7QUFDZiwwQkFBTSxVQURTO0FBRWYsMkJBQU87QUFGUSxpQkFBRCxDQUFmOztBQUtBLHVCQUFPLEtBQVAsQ0FBYSxzQkFBc0IsS0FBSyxTQUFMLENBQWUsS0FBSyxPQUFwQixDQUFuQztBQUNBLGFBVkQsTUFVTyxJQUFJLEVBQUUsUUFBRixDQUFXLFFBQVgsS0FBd0IsRUFBRSxRQUFGLENBQVcsUUFBWCxDQUE1QixFQUFrRDtBQUN4RCx1QkFBTyxLQUFQLENBQWEsc0NBQWI7O0FBRUEsMkJBQVc7QUFDVix5QkFBSztBQURLLGlCQUFYOzs7QUFLQSxxQkFBSyxPQUFMLEdBQWUsZUFBZSxRQUFmLENBQWY7O0FBRUEsdUJBQU8sS0FBUCxDQUFhLHNCQUFzQixLQUFLLFNBQUwsQ0FBZSxLQUFLLE9BQXBCLENBQW5DO0FBQ0EsYUFYTSxNQVdBO0FBQ04sdUJBQU8sS0FBUCxDQUFhLDhCQUFiOzs7QUFHQSxxQkFBSyxPQUFMLEdBQWUsZUFBZSxRQUFmLENBQWY7O0FBRUEsdUJBQU8sS0FBUCxDQUFhLHNCQUFzQixLQUFLLFNBQUwsQ0FBZSxLQUFLLE9BQXBCLENBQW5DO0FBQ0E7O0FBRUQsZ0JBQUksVUFBVSxJQUFJLGVBQUosQ0FBb0IsSUFBcEIsQ0FBZDs7QUFFQSxtQkFBTyxPQUFQO0FBQ0c7OztvQ0FFVyxJLEVBQU07QUFDZCxnQkFBSSxFQUFFLEtBQUYsQ0FBUSxJQUFSLENBQUosRUFBb0I7QUFDaEIsdUJBQU8sWUFBWTtBQUNmLDJCQUFPLENBQVA7QUFDSCxpQkFGRDtBQUdIOztBQUVELGdCQUFJLE9BQU8sRUFBWDtBQUNBLGdCQUFJLE1BQU0sRUFBVjs7QUFFQSxnQkFBSSxFQUFFLFFBQUYsQ0FBVyxJQUFYLENBQUosRUFBc0I7QUFDbEIsdUJBQU8sS0FBSyxPQUFMLENBQWEsUUFBYixFQUF1QixHQUF2QixFQUE0QixJQUE1QixFQUFQOztBQUVBLG9CQUFJLEtBQUssT0FBTCxDQUFhLEdBQWIsTUFBc0IsQ0FBQyxDQUEzQixFQUE4Qjs7QUFFMUIsMkJBQU8sS0FBSyxXQUFMLENBQWlCLEtBQUssT0FBTCxDQUFhLEtBQWIsRUFBb0IsR0FBcEIsQ0FBakIsQ0FBUDtBQUNILGlCQUhELE1BR08sSUFBSSxLQUFLLE9BQUwsQ0FBYSxHQUFiLE1BQXNCLENBQUMsQ0FBM0IsRUFBOEI7QUFDakMsd0JBQUksU0FBUyxLQUFLLEtBQUwsQ0FBVyxHQUFYLENBQWI7O0FBRUEseUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxPQUFPLE1BQTNCLEVBQW1DLEdBQW5DLEVBQXdDO0FBQ3BDLDRCQUFJLFFBQVEsT0FBTyxDQUFQLEVBQVUsSUFBVixFQUFaOztBQUVBLDRCQUFLLFVBQVUsTUFBVixJQUFxQixVQUFVLEtBQWhDLElBQ0MsVUFBVSxJQUFWLElBQXFCLFVBQVUsR0FEaEMsSUFFQyxVQUFVLE9BQVYsSUFBcUIsVUFBVSxNQUZwQyxFQUU2Qzs7QUFFekMsa0NBQU0sTUFBTSwwQkFBTixFQUFrQyxLQUFLLFNBQUwsQ0FBZSxJQUFmLENBQWxDLENBQU47QUFDSCx5QkFMRCxNQUtPO0FBQ0gsZ0NBQUksT0FBTyxFQUFFLFFBQUYsQ0FBVyxPQUFPLElBQUUsQ0FBVCxDQUFYLENBQVg7O0FBRUEsZ0NBQUksU0FBUyxNQUFULElBQW1CLFNBQVMsS0FBaEMsRUFBdUM7QUFDbkMscUNBQUssSUFBTCxDQUFVLEtBQVY7QUFDQSxvQ0FBSSxJQUFKLENBQVUsU0FBUyxLQUFWLEdBQW1CLElBQW5CLEdBQTBCLEtBQW5DOztBQUVBO0FBQ0gsNkJBTEQsTUFLTyxJQUFJLFNBQVMsSUFBVCxJQUFpQixTQUFTLEdBQTlCLEVBQW1DO0FBQ3RDLHFDQUFLLElBQUwsQ0FBVSxLQUFWO0FBQ0Esb0NBQUksSUFBSixDQUFVLFNBQVMsR0FBVixHQUFpQixJQUFqQixHQUF3QixLQUFqQzs7QUFFQTtBQUNILDZCQUxNLE1BS0EsSUFBSSxTQUFTLE9BQVQsSUFBb0IsU0FBUyxNQUFqQyxFQUF5QztBQUM1QyxxQ0FBSyxJQUFMLENBQVUsS0FBVjtBQUNBLG9DQUFJLElBQUosQ0FBVSxTQUFTLE1BQVYsR0FBb0IsSUFBcEIsR0FBMkIsS0FBcEM7O0FBRUE7QUFDSCw2QkFMTSxNQUtBO0FBQ0gscUNBQUssSUFBTCxDQUFVLEtBQVY7QUFDQSxvQ0FBSSxJQUFKLENBQVMsSUFBVCxFO0FBQ0g7QUFDSjtBQUNKO0FBQ0osaUJBbkNNLE1BbUNBOzs7QUFHSCw2QkFBSyxJQUFMLENBQVUsSUFBVjtBQUNBLDRCQUFJLElBQUosQ0FBUyxJQUFUO0FBQ0g7QUFDSixhQS9DRCxNQStDTyxJQUFJLEVBQUUsT0FBRixDQUFVLElBQVYsQ0FBSixFQUFxQjs7QUFFeEIsdUJBQU8sS0FBSyxXQUFMLENBQWlCLEtBQUssSUFBTCxDQUFVLEdBQVYsQ0FBakIsQ0FBUDs7Ozs7Ozs7OztBQVVILGFBWk0sTUFZQSxJQUFJLEVBQUUsYUFBRixDQUFnQixJQUFoQixDQUFKLEVBQTJCOztBQUU5Qix3QkFBSSxRQUFRLEVBQVo7QUFDQSx5QkFBSyxJQUFJLEdBQVQsSUFBZ0IsSUFBaEIsRUFBc0I7QUFDbEIsNEJBQUksRUFBRSxLQUFGLENBQVEsSUFBUixFQUFjLEdBQWQsQ0FBSixFQUF3QjtBQUNwQixrQ0FBTSxJQUFOLENBQVcsR0FBWDtBQUNBLGtDQUFNLElBQU4sQ0FBVyxLQUFLLEdBQUwsQ0FBWDtBQUNIO0FBQ0o7O0FBRUQsMkJBQU8sS0FBSyxXQUFMLENBQWlCLEtBQWpCLENBQVA7QUFDSCxpQkFYTSxNQVdBO0FBQ0gsMEJBQU0sTUFBTSwwQkFBTixFQUFrQyxLQUFLLFNBQUwsQ0FBZSxJQUFmLENBQWxDLENBQU47QUFDSDs7O0FBR0QsbUJBQU8sVUFBUyxDQUFULEVBQVksQ0FBWixFQUFlO0FBQ2xCLG9CQUFJLElBQUksQ0FBUjs7QUFFQSxxQkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLEtBQUssTUFBekIsRUFBaUMsR0FBakMsRUFBc0M7QUFDbEMsd0JBQUksTUFBTSxDQUFOLElBQVcsTUFBTSxDQUFyQixFQUF3QixPQUFPLENBQVAsQzs7O0FBSXhCLHdCQUFJLGdCQUFnQixHQUFoQixDQUFvQixFQUFFLEtBQUssQ0FBTCxDQUFGLENBQXBCLEVBQWdDLEVBQUUsS0FBSyxDQUFMLENBQUYsQ0FBaEMsQ0FBSjs7QUFFQSx3QkFBSSxDQUFDLElBQUksQ0FBSixDQUFMLEVBQWE7QUFDVCw2QkFBSyxDQUFDLENBQU47QUFDSDtBQUNKOztBQUVELHVCQUFPLENBQVA7QUFDSCxhQWhCRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFvQ0g7OztzQ0FFYSxJLEVBQU07QUFDaEIsZ0JBQUksYUFBYSxFQUFqQjs7QUFFQSxnQkFBSSxFQUFFLFFBQUYsQ0FBVyxJQUFYLENBQUosRUFBc0I7QUFDbEIsdUJBQU8sS0FBSyxPQUFMLENBQWEsUUFBYixFQUF1QixHQUF2QixFQUE0QixJQUE1QixFQUFQOztBQUVBLG9CQUFJLEtBQUssT0FBTCxDQUFhLEdBQWIsTUFBc0IsQ0FBQyxDQUEzQixFQUE4Qjs7QUFFMUIsMkJBQU8sS0FBSyxhQUFMLENBQW1CLEtBQUssT0FBTCxDQUFhLEtBQWIsRUFBb0IsR0FBcEIsQ0FBbkIsQ0FBUDtBQUNILGlCQUhELE1BR08sSUFBSSxLQUFLLE9BQUwsQ0FBYSxHQUFiLE1BQXNCLENBQUMsQ0FBM0IsRUFBOEI7QUFDakMsd0JBQUksU0FBUyxLQUFLLEtBQUwsQ0FBVyxHQUFYLENBQWI7O0FBRUEseUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxPQUFPLE1BQTNCLEVBQW1DLEdBQW5DLEVBQXdDO0FBQ3BDLDRCQUFJLFFBQVEsT0FBTyxDQUFQLEVBQVUsSUFBVixFQUFaOztBQUVBLDRCQUFLLFVBQVUsSUFBVixJQUFxQixVQUFVLEdBQWhDLElBQ0MsVUFBVSxPQUFWLElBQXFCLFVBQVUsTUFEcEMsRUFDNkM7O0FBRXpDLGtDQUFNLE1BQU0sNEJBQU4sRUFBb0MsS0FBSyxTQUFMLENBQWUsSUFBZixDQUFwQyxDQUFOO0FBQ0gseUJBSkQsTUFJTztBQUNILGdDQUFJLE9BQU8sRUFBRSxRQUFGLENBQVcsT0FBTyxJQUFFLENBQVQsQ0FBWCxDQUFYOztBQUVBLGdDQUFJLFNBQVMsSUFBVCxJQUFpQixTQUFTLEdBQTlCLEVBQW1DO0FBQy9CLG9DQUFJLFNBQVMsSUFBYixFQUFtQjtBQUNmLHdDQUFJLFVBQVUsS0FBZCxFQUFxQjtBQUNqQixtREFBVyxLQUFYLElBQW9CLENBQUMsQ0FBckI7QUFDSCxxQ0FGRCxNQUVPO0FBQ0gsOENBQU0sSUFBSSxLQUFKLENBQVUscUVBQVYsQ0FBTjtBQUNIO0FBQ0osaUNBTkQsTUFNTztBQUNILCtDQUFXLEtBQVgsSUFBb0IsQ0FBcEI7QUFDSDs7QUFFRDtBQUNILDZCQVpELE1BWU8sSUFBSSxTQUFTLE9BQVQsSUFBb0IsU0FBUyxNQUFqQyxFQUF5QztBQUM1QyxvQ0FBSSxTQUFTLE9BQWIsRUFBc0I7QUFDbEIsd0NBQUksVUFBVSxLQUFkLEVBQXFCO0FBQ2pCLG1EQUFXLEtBQVgsSUFBb0IsQ0FBQyxDQUFyQjtBQUNILHFDQUZELE1BRU87QUFDSCw4Q0FBTSxJQUFJLEtBQUosQ0FBVSxxRUFBVixDQUFOO0FBQ0g7QUFDSixpQ0FORCxNQU1PO0FBQ0gsK0NBQVcsS0FBWCxJQUFvQixDQUFwQjtBQUNIOztBQUVEO0FBQ0gsNkJBWk0sTUFZQTtBQUNILDJDQUFXLEtBQVgsSUFBb0IsQ0FBcEI7QUFDSDtBQUNKO0FBQ0o7QUFDSixpQkExQ00sTUEwQ0EsSUFBSSxLQUFLLE1BQUwsR0FBYyxDQUFsQixFQUFxQjs7O0FBR3hCLCtCQUFXLElBQVgsSUFBbUIsQ0FBbkI7QUFDSDtBQUNKLGFBckRELE1BcURPLElBQUksRUFBRSxPQUFGLENBQVUsSUFBVixDQUFKLEVBQXFCOztBQUV4Qix1QkFBTyxLQUFLLGFBQUwsQ0FBbUIsS0FBSyxJQUFMLENBQVUsR0FBVixDQUFuQixDQUFQO0FBQ0gsYUFITSxNQUdBLElBQUksRUFBRSxhQUFGLENBQWdCLElBQWhCLENBQUosRUFBMkI7O0FBRTlCLG9CQUFJLFFBQVEsRUFBWjtBQUNBLHFCQUFLLElBQUksR0FBVCxJQUFnQixJQUFoQixFQUFzQjtBQUNsQix3QkFBSSxFQUFFLEtBQUYsQ0FBUSxJQUFSLEVBQWMsR0FBZCxDQUFKLEVBQXdCO0FBQ3BCLDhCQUFNLElBQU4sQ0FBVyxHQUFYO0FBQ0EsOEJBQU0sSUFBTixDQUFXLEtBQUssR0FBTCxDQUFYO0FBQ0g7QUFDSjs7QUFFRCx1QkFBTyxLQUFLLGFBQUwsQ0FBbUIsS0FBbkIsQ0FBUDtBQUNILGFBWE0sTUFXQTtBQUNILHNCQUFNLE1BQU0sNEJBQU4sRUFBb0MsS0FBSyxTQUFMLENBQWUsSUFBZixDQUFwQyxDQUFOO0FBQ0g7O0FBRUQsbUJBQU8sVUFBUDtBQUNIOzs7Ozs7MkNBR3NCLFEsRUFBVTtBQUNuQyxnQkFBSSxDQUFDLEVBQUUsS0FBRixDQUFRLFFBQVIsQ0FBRCxLQUNBLG9CQUFvQixlQUFwQixJQUF3QyxvQkFBb0IsUUFBcEIsSUFDQSxTQUFTLGlCQUFULFlBQXNDLGVBRjlFLENBQUosRUFHTTtBQUNMLHVCQUFPLElBQVA7QUFDQSxhQUxELE1BS087QUFDTix1QkFBTyxLQUFQO0FBQ0E7QUFDRDs7O2dDQUVjLFEsRUFBVSxHLEVBQUs7QUFDdkIsbUJBQVEsSUFBSSxRQUFKLENBQWEsUUFBYixDQUFELENBQXlCLElBQXpCLENBQThCLEdBQTlCLENBQVA7QUFDSDs7Ozs7O0FBR0wsSUFBSSxpQkFBaUIsU0FBakIsY0FBaUIsQ0FBUyxRQUFULEVBQW1CO0FBQ3ZDLFdBQU8sS0FBUCxDQUFhLHdCQUFiOztBQUVHLFFBQUksVUFBVSxFQUFkOztBQUVBLFNBQUssSUFBSSxHQUFULElBQWdCLFFBQWhCLEVBQTBCO0FBQ3RCLFlBQUksUUFBUSxTQUFTLEdBQVQsQ0FBWjs7QUFFQSxZQUFJLElBQUksTUFBSixDQUFXLENBQVgsTUFBa0IsR0FBdEIsRUFBMkI7QUFDdkIsbUJBQU8sS0FBUCxDQUFhLGtEQUFiOztBQUVBLG9CQUFRLElBQVIsQ0FBYSx1QkFBdUIsR0FBdkIsRUFBNEIsS0FBNUIsQ0FBYjtBQUNILFNBSkQsTUFJTztBQUNILG1CQUFPLEtBQVAsQ0FBYSwwQ0FBYjs7QUFFQSxvQkFBUSxJQUFSLENBQWEsc0JBQXNCLEdBQXRCLEVBQTJCLEtBQTNCLENBQWI7QUFDSDtBQUNKOztBQUVELFdBQU8sT0FBUDtBQUNILENBcEJEOztBQXNCQSxJQUFJLHlCQUF5QixTQUF6QixzQkFBeUIsQ0FBUyxHQUFULEVBQWMsS0FBZCxFQUFxQjtBQUM5QyxRQUFJLFNBQVMsRUFBYjs7QUFFQSxZQUFRLEdBQVI7QUFDSSxhQUFLLEtBQUw7QUFDQSxhQUFLLE1BQUw7QUFDQSxhQUFLLE1BQUw7QUFDSSxtQkFBTyxHQUFQLEdBQWEsSUFBSSxPQUFKLENBQVksSUFBWixFQUFrQixFQUFsQixDQUFiOztBQUVKLGFBQUssWUFBTDs7O0FBR0ksbUJBQU8sSUFBUCxHQUFjLFVBQWQ7QUFDQSxtQkFBTyxJQUFQLEdBQWMsT0FBZDs7QUFFQSxtQkFBTyxLQUFQLEdBQWUsZUFBZSxLQUFmLENBQWY7O0FBRUE7QUFDSjtBQUNJLGtCQUFNLE1BQU0sK0JBQU4sRUFBdUMsR0FBdkMsQ0FBTjtBQWhCUjs7OztBQXFCQSxXQUFPLEtBQVAsQ0FBYSxxQkFBcUIsS0FBSyxTQUFMLENBQWUsTUFBZixDQUFsQzs7QUFFQSxXQUFPLE1BQVA7QUFDSCxDQTNCRDs7QUE2QkEsSUFBSSx3QkFBd0IsU0FBeEIscUJBQXdCLENBQVUsT0FBVixFQUFtQixLQUFuQixFQUEwQjtBQUNsRCxXQUFPLEtBQVAsQ0FBYSwrQkFBYjs7QUFFQSxRQUFJLFNBQVMsRUFBYjs7QUFFQSxXQUFPLEtBQVAsR0FBZSxLQUFmOztBQUVBLFFBQUksRUFBRSxLQUFGLENBQVEsS0FBUixDQUFKLEVBQW9CO0FBQ2hCLGVBQU8sS0FBUCxDQUFhLHFCQUFiOztBQUVBLGVBQU8sSUFBUCxHQUFjLE1BQWQ7QUFDSCxLQUpELE1BSU8sSUFBSSxFQUFFLFFBQUYsQ0FBVyxLQUFYLENBQUosRUFBdUI7QUFDMUIsZUFBTyxLQUFQLENBQWEsdUJBQWI7O0FBRUEsZUFBTyxJQUFQLEdBQWMsUUFBZDs7QUFFQSxZQUFJLFNBQVMsTUFBTSxRQUFOLEdBQWlCLEtBQWpCLENBQXVCLEdBQXZCLENBQWI7O0FBRUEsZUFBTyxLQUFQLEdBQWU7QUFDWCxvQkFBUSxPQUFPLENBQVAsQztBQURHLFNBQWY7O0FBSUEsWUFBSSxPQUFPLENBQVAsS0FBYSxFQUFqQixFQUFxQjtBQUNqQixtQkFBTyxLQUFQLENBQWEsVUFBYixJQUEyQixPQUFPLENBQVAsQ0FBM0I7QUFDSDtBQUNKLEtBZE0sTUFjQSxJQUFJLEVBQUUsT0FBRixDQUFVLEtBQVYsQ0FBSixFQUFzQjtBQUN6QixlQUFPLEtBQVAsQ0FBYSxzQkFBYjs7QUFFQSxlQUFPLElBQVAsR0FBYyxPQUFkO0FBQ0gsS0FKTSxNQUlBLElBQUksRUFBRSxRQUFGLENBQVcsS0FBWCxDQUFKLEVBQXVCO0FBQzFCLGVBQU8sS0FBUCxDQUFhLHVCQUFiOztBQUVBLGVBQU8sSUFBUCxHQUFjLFFBQWQ7QUFDSCxLQUpNLE1BSUEsSUFBSSxFQUFFLFFBQUYsQ0FBVyxLQUFYLENBQUosRUFBdUI7QUFDMUIsZUFBTyxLQUFQLENBQWEsdUJBQWI7O0FBRUEsZUFBTyxJQUFQLEdBQWMsUUFBZDtBQUNILEtBSk0sTUFJQSxJQUFJLEVBQUUsU0FBRixDQUFZLEtBQVosQ0FBSixFQUF3QjtBQUMzQixlQUFPLEtBQVAsQ0FBYSx3QkFBYjs7QUFFQSxlQUFPLElBQVAsR0FBYyxTQUFkO0FBQ0gsS0FKTSxNQUlBLElBQUksRUFBRSxVQUFGLENBQWEsS0FBYixDQUFKLEVBQXlCO0FBQzVCLGVBQU8sS0FBUCxDQUFhLHlCQUFiOztBQUVBLGVBQU8sSUFBUCxHQUFjLFVBQWQ7QUFDSCxLQUpNLE1BSUEsSUFBSSxFQUFFLGFBQUYsQ0FBZ0IsS0FBaEIsQ0FBSixFQUE0QjtBQUMvQixZQUFJLGdCQUFnQixJQUFwQjtBQUNBLGFBQUssSUFBSSxHQUFULElBQWdCLEtBQWhCLEVBQXVCO0FBQ25CLGdCQUFJLElBQUksTUFBSixDQUFXLENBQVgsTUFBa0IsR0FBdEIsRUFBMkI7QUFDdkIsZ0NBQWdCLEtBQWhCO0FBQ0E7QUFDSDtBQUNKOztBQUVELFlBQUksYUFBSixFQUFtQjtBQUNmLG1CQUFPLEtBQVAsQ0FBYSw0RUFBYjs7QUFFQSxtQkFBTyxJQUFQLEdBQWMsZ0JBQWQ7QUFDSCxTQUpELE1BSU87QUFDSCxtQkFBTyxLQUFQLENBQWEseURBQWI7O0FBRUEsbUJBQU8sSUFBUCxHQUFjLGlCQUFkO0FBQ0g7QUFDSixLQWxCTSxNQWtCQTtBQUNILGVBQU8sSUFBUCxHQUFjLGFBQWQ7QUFDSDs7QUFFRCxRQUFJLFFBQVEsUUFBUSxLQUFSLENBQWMsR0FBZCxDQUFaO0FBQ0EsUUFBSSxNQUFNLE1BQU4sR0FBZSxDQUFuQixFQUFzQjtBQUNsQixlQUFPLEtBQVAsQ0FBYSw0REFBYjs7QUFFQSxlQUFPLElBQVAsR0FBYyxRQUFkO0FBQ0EsZUFBTyxHQUFQLEdBQWEsS0FBYjtBQUNILEtBTEQsTUFLTztBQUNILGVBQU8sS0FBUCxDQUFhLGlEQUFiOztBQUVBLGVBQU8sSUFBUCxHQUFjLE9BQWQ7QUFDQSxlQUFPLEdBQVAsR0FBYSxNQUFNLENBQU4sQ0FBYjtBQUNIOztBQUVELFdBQU8sS0FBUCxDQUFhLHFCQUFxQixLQUFLLFNBQUwsQ0FBZSxNQUFmLENBQWxDOztBQUVBLFdBQU8sTUFBUDtBQUNILENBbkZEOztBQXFGQSxTQUFTLGNBQVQsR0FBMEIsT0FBMUI7QUFDQSxTQUFTLGFBQVQsR0FBeUIsTUFBekI7QUFDQSxTQUFTLGNBQVQsR0FBMEIsT0FBMUI7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLFFBQWpCIiwiZmlsZSI6IlNlbGVjdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIExvZ2dlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0xvZ2dlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKSxcbiAgICBTZWxlY3Rvck1hdGNoZXIgPSByZXF1aXJlKFwiLi9TZWxlY3Rvck1hdGNoZXJcIik7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcblxuY2xhc3MgU2VsZWN0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHNlbGVjdG9yLCB0eXBlID0gU2VsZWN0b3IuTUFUQ0hfU0VMRUNUT1IpIHtcbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZWxlY3Rvcl9jb21waWxlZCA9IG51bGw7XG5cdFx0XG5cdFx0aWYgKHR5cGUgPT09IFNlbGVjdG9yLk1BVENIX1NFTEVDVE9SKSB7XG5cdFx0XHR0aGlzLnNlbGVjdG9yX2NvbXBpbGVkID0gdGhpcy5jb21waWxlKHNlbGVjdG9yKTtcblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpIHtcblx0XHRcdHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KHNlbGVjdG9yKTtcblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFNlbGVjdG9yLkZJRUxEX1NFTEVDVE9SKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKHNlbGVjdG9yKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nZ2VyLnRocm93KFwiWW91IG5lZWQgdG8gc3BlY2lmeSB0aGUgc2VsZWN0b3IgdHlwZVwiKTtcblx0XHR9XG4gICAgfVxuICAgIFxuICAgIHRlc3QoZG9jKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkLnRlc3QoZG9jKTtcbiAgICB9XG4gICAgXG4gICAgY29tcGlsZShzZWxlY3Rvcikge1xuXHRcdGlmIChfLmlzTmlsKHNlbGVjdG9yKSkge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBudWxsJyk7XG5cdFx0XHRcblx0XHRcdHNlbGVjdG9yID0ge307XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gbm90IG51bGwnKTtcblx0XHRcdFxuXHRcdFx0aWYgKCFzZWxlY3RvciB8fCAoXy5oYXNJbihzZWxlY3RvciwgJ19pZCcpICYmICFzZWxlY3Rvci5faWQpKSB7XG5cdFx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gZmFsc2UgdmFsdWUgfHwgeyBfaWQ6IGZhbHNlIHZhbHVlIH0nKTtcblx0XHRcdFx0XG5cdFx0XHRcdHNlbGVjdG9yID0ge1xuXHRcdFx0XHRcdF9pZDogZmFsc2Vcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0aWYgKF8uaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gZnVuY3Rpb24oZG9jKSB7IC4uLiB9Jyk7XG5cdFx0XHRcblx0XHRcdC8vX2luaXRGdW5jdGlvbi5jYWxsKG1hdGNoZXIsIHNlbGVjdG9yKTtcblx0XHRcdHRoaXMuY2xhdXNlcyA9IFt7XG5cdFx0XHRcdGtpbmQ6ICdmdW5jdGlvbicsXG5cdFx0XHRcdHZhbHVlOiBzZWxlY3RvclxuXHRcdFx0fV07XG5cdFx0XHRcblx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlcyBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkodGhpcy5jbGF1c2VzKSk7XG5cdFx0fSBlbHNlIGlmIChfLmlzU3RyaW5nKHNlbGVjdG9yKSB8fCBfLmlzTnVtYmVyKHNlbGVjdG9yKSkge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBcIjEyMzQ1Njc4OVwiIHx8IDEyMzQ1Njc5OCcpO1xuXHRcdFx0XG5cdFx0XHRzZWxlY3RvciA9IHtcblx0XHRcdFx0X2lkOiBzZWxlY3RvclxuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0Ly9faW5pdE9iamVjdC5jYWxsKG1hdGNoZXIsIHNlbGVjdG9yKTtcblx0XHRcdHRoaXMuY2xhdXNlcyA9IF9idWlsZFNlbGVjdG9yKHNlbGVjdG9yKTtcblx0XHRcdFxuXHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2VzIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeSh0aGlzLmNsYXVzZXMpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiB7IGZpZWxkOiB2YWx1ZSB9Jyk7XG5cdFx0XHRcblx0XHRcdC8vX2luaXRPYmplY3QuY2FsbChtYXRjaGVyLCBzZWxlY3Rvcik7XG5cdFx0XHR0aGlzLmNsYXVzZXMgPSBfYnVpbGRTZWxlY3RvcihzZWxlY3Rvcik7XG5cdFx0XHRcblx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlcyBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkodGhpcy5jbGF1c2VzKSk7XG5cdFx0fVxuXHRcdFxuXHRcdHZhciBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcih0aGlzKTtcblx0XHRcblx0XHRyZXR1cm4gbWF0Y2hlcjtcbiAgICB9XG4gICAgXG4gICAgY29tcGlsZVNvcnQoc3BlYykge1xuICAgICAgICBpZiAoXy5pc05pbChzcGVjKSkgIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICB2YXIgYXNjID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1N0cmluZyhzcGVjKSkge1xuICAgICAgICAgICAgc3BlYyA9IHNwZWMucmVwbGFjZSgvKCApKy9pZywgJyAnKS50cmltKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzcGVjLmluZGV4T2YoJywnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIGNvbW1hcyBieSBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZVNvcnQoc3BlYy5yZXBsYWNlKC8sL2lnLCAnICcpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3BlYy5pbmRleE9mKCcgJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHNwZWMuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmllbGQgPSBmaWVsZHNbaV0udHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKChmaWVsZCA9PT0gJ2Rlc2MnICB8fCBmaWVsZCA9PT0gJ2FzYycpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoZmllbGQgPT09ICctMScgICAgfHwgZmllbGQgPT09ICcxJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChmaWVsZCA9PT0gJ2ZhbHNlJyB8fCBmaWVsZCA9PT0gJ3RydWUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgc29ydCBzcGVjaWZpY2F0aW9uOiBcIiwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5leHQgPSBfLnRvU3RyaW5nKGZpZWxkc1tpKzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICdkZXNjJyB8fCBuZXh0ID09PSAnYXNjJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNjLnB1c2goKG5leHQgPT09ICdhc2MnKSA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXh0ID09PSAnLTEnIHx8IG5leHQgPT09ICcxJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNjLnB1c2goKG5leHQgPT09ICcxJykgPyB0cnVlIDogZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmV4dCA9PT0gJ2ZhbHNlJyB8fCBuZXh0ID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKChuZXh0ID09PSAndHJ1ZScpID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNjLnB1c2godHJ1ZSk7IC8vIERlZmF1bHQgc29ydFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLy5zb3J0KFwiZmllbGQxXCIpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAga2V5cy5wdXNoKHNwZWMpO1xuICAgICAgICAgICAgICAgIGFzYy5wdXNoKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheShzcGVjKSkge1xuICAgICAgICAgICAgLy8gSm9pbiB0aGUgYXJyYXkgd2l0aCBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlU29ydChzcGVjLmpvaW4oJyAnKSk7XG4gICAgICAgICAgICAvLyBmb3IgKHZhciBpID0gMDsgaSA8IHNwZWMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vICAgICBpZiAoXy5pc1N0cmluZyhzcGVjW2ldKSkge1xuICAgICAgICAgICAgLy8gICAgICAgICBrZXlzLnB1c2goc3BlY1tpXSk7XG4gICAgICAgICAgICAvLyAgICAgICAgIGFzYy5wdXNoKHRydWUpO1xuICAgICAgICAgICAgLy8gICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIGtleXMucHVzaChzcGVjW2ldWzBdKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgYXNjLnB1c2goc3BlY1tpXVsxXSAhPT0gXCJkZXNjXCIpO1xuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3Qoc3BlYykpIHtcbiAgICAgICAgICAgIC8vIFRPRE8gTmVzdGVkIHBhdGggLT4gLnNvcnQoeyBcImZpZWxkMS5maWVsZDEyXCI6IFwiYXNjXCIgfSlcbiAgICAgICAgICAgIHZhciBfc3BlYyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNwZWMpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5oYXNJbihzcGVjLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgX3NwZWMucHVzaChzcGVjW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZVNvcnQoX3NwZWMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgc29ydCBzcGVjaWZpY2F0aW9uOiBcIiwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIC8vIHJldHVybiB7a2V5czoga2V5cywgYXNjOiBhc2N9O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaSAhPT0gMCAmJiB4ICE9PSAwKSByZXR1cm4geDsgICAvLyBOb24gcmVhY2hhYmxlP1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIHggPSBTZWxlY3Rvci5fZi5fY21wKGFbSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSldLCBiW0pTT04uc3RyaW5naWZ5KGtleXNbaV0pXSk7XG4gICAgICAgICAgICAgICAgeCA9IFNlbGVjdG9yTWF0Y2hlci5jbXAoYVtrZXlzW2ldXSwgYltrZXlzW2ldXSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFhc2NbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgeCAqPSAtMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gZXZhbCgpIGRvZXMgbm90IHJldHVybiBhIHZhbHVlIGluIElFOCwgbm9yIGRvZXMgdGhlIHNwZWMgc2F5IGl0XG4gICAgICAgIC8vIHNob3VsZC4gQXNzaWduIHRvIGEgbG9jYWwgdG8gZ2V0IHRoZSB2YWx1ZSwgaW5zdGVhZC5cbiAgICAgICAgXG4gICAgICAgIC8vIHZhciBfZnVuYztcbiAgICAgICAgLy8gdmFyIGNvZGUgPSBcIl9mdW5jID0gKGZ1bmN0aW9uKGMpe3JldHVybiBmdW5jdGlvbihhLGIpe3ZhciB4O1wiO1xuICAgICAgICAvLyBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gICAgIGlmIChpICE9PSAwKSB7XG4gICAgICAgIC8vICAgICAgICAgY29kZSArPSBcImlmKHghPT0wKXJldHVybiB4O1wiO1xuICAgICAgICAvLyAgICAgfVxuICAgIFxuICAgICAgICAvLyAgICAgY29kZSArPSBcIng9XCIgKyAoYXNjW2ldID8gXCJcIiA6IFwiLVwiKSArIFwiYyhhW1wiICsgSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSkgKyBcIl0sYltcIiArIEpTT04uc3RyaW5naWZ5KGtleXNbaV0pICsgXCJdKTtcIjtcbiAgICAgICAgLy8gfVxuICAgIFxuICAgICAgICAvLyBjb2RlICs9IFwicmV0dXJuIHg7fTt9KVwiO1xuICAgIFxuICAgICAgICAvLyBldmFsKGNvZGUpO1xuICAgIFxuICAgICAgICAvLyByZXR1cm4gX2Z1bmMoU2VsZWN0b3IuX2YuX2NtcCk7XG4gICAgfVxuICAgIFxuICAgIGNvbXBpbGVGaWVsZHMoc3BlYykge1xuICAgICAgICB2YXIgcHJvamVjdGlvbiA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcoc3BlYykpIHtcbiAgICAgICAgICAgIHNwZWMgPSBzcGVjLnJlcGxhY2UoLyggKSsvaWcsICcgJykudHJpbSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc3BlYy5pbmRleE9mKCcsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVwbGFjZSBjb21tYXMgYnkgc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoc3BlYy5yZXBsYWNlKC8sL2lnLCAnICcpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3BlYy5pbmRleE9mKCcgJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHNwZWMuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmllbGQgPSBmaWVsZHNbaV0udHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKChmaWVsZCA9PT0gJy0xJyAgICB8fCBmaWVsZCA9PT0gJzEnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGZpZWxkID09PSAnZmFsc2UnIHx8IGZpZWxkID09PSAndHJ1ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCBmaWVsZHMgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gXy50b1N0cmluZyhmaWVsZHNbaSsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnLTEnIHx8IG5leHQgPT09ICcxJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnLTEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZCA9PT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHByb2plY3Rpb24gY2Fubm90IGNvbnRhaW4gYm90aCBpbmNsdWRlIGFuZCBleGNsdWRlIHNwZWNpZmljYXRpb25zXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5leHQgPT09ICdmYWxzZScgfHwgbmV4dCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkID09PSAnX2lkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkEgcHJvamVjdGlvbiBjYW5ub3QgY29udGFpbiBib3RoIGluY2x1ZGUgYW5kIGV4Y2x1ZGUgc3BlY2lmaWNhdGlvbnNcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVjLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLy5maW5kKHt9LCBcImZpZWxkMVwiKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25bc3BlY10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheShzcGVjKSkge1xuICAgICAgICAgICAgLy8gSm9pbiB0aGUgYXJyYXkgd2l0aCBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKHNwZWMuam9pbignICcpKTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3Qoc3BlYykpIHtcbiAgICAgICAgICAgIC8vIFRPRE8gTmVzdGVkIHBhdGggLT4gLmZpbmQoe30sIHsgXCJmaWVsZDEuZmllbGQxMlwiOiBcImFzY1wiIH0pXG4gICAgICAgICAgICB2YXIgX3NwZWMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcGVjKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaGFzSW4oc3BlYywga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBfc3BlYy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goc3BlY1trZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoX3NwZWMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgZmllbGRzIHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBwcm9qZWN0aW9uO1xuICAgIH1cblx0XG5cdC8qIFNUQVRJQyBNRVRIT0RTICovXG5cdHN0YXRpYyBpc1NlbGVjdG9yQ29tcGlsZWQoc2VsZWN0b3IpIHtcblx0XHRpZiAoIV8uaXNOaWwoc2VsZWN0b3IpICYmIChcblx0XHQgICAgc2VsZWN0b3IgaW5zdGFuY2VvZiBTZWxlY3Rvck1hdGNoZXIgfHwgKHNlbGVjdG9yIGluc3RhbmNlb2YgU2VsZWN0b3IgJiYgXG5cdFx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rvci5zZWxlY3Rvcl9jb21waWxlZCBpbnN0YW5jZW9mIFNlbGVjdG9yTWF0Y2hlcilcblx0ICAgICkpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cdFxuXHRzdGF0aWMgbWF0Y2hlcyhzZWxlY3RvciwgZG9jKSB7XG4gICAgICAgIHJldHVybiAobmV3IFNlbGVjdG9yKHNlbGVjdG9yKSkudGVzdChkb2MpO1xuICAgIH1cbn1cblxudmFyIF9idWlsZFNlbGVjdG9yID0gZnVuY3Rpb24oc2VsZWN0b3IpIHtcblx0bG9nZ2VyLmRlYnVnKCdDYWxsZWQ6IF9idWlsZFNlbGVjdG9yJyk7XG4gICAgXG4gICAgdmFyIGNsYXVzZXMgPSBbXTtcbiAgICBcbiAgICBmb3IgKHZhciBrZXkgaW4gc2VsZWN0b3IpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gc2VsZWN0b3Jba2V5XTtcbiAgICAgICAgXG4gICAgICAgIGlmIChrZXkuY2hhckF0KDApID09PSAnJCcpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gb3BlcmF0b3IgPT4geyAkYW5kOiBbey4uLn0sIHsuLi59XSB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZXMucHVzaChfYnVpbGREb2N1bWVudFNlbGVjdG9yKGtleSwgdmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gcGxhaW4gPT4geyBmaWVsZDE6IDx2YWx1ZT4gfScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2VzLnB1c2goX2J1aWxkS2V5cGF0aFNlbGVjdG9yKGtleSwgdmFsdWUpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gY2xhdXNlcztcbn07XG5cbnZhciBfYnVpbGREb2N1bWVudFNlbGVjdG9yID0gZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgIHZhciBjbGF1c2UgPSB7fTtcbiAgICBcbiAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICBjYXNlICckb3InOlxuICAgICAgICBjYXNlICckYW5kJzpcbiAgICAgICAgY2FzZSAnJG5vcic6XG4gICAgICAgICAgICBjbGF1c2Uua2V5ID0ga2V5LnJlcGxhY2UoL1xcJC8sICcnKTtcbiAgICAgICAgICAgIC8vIFRoZSByZXN0IHdpbGwgYmUgaGFuZGxlZCBieSAnX29wZXJhdG9yXydcbiAgICAgICAgY2FzZSAnX29wZXJhdG9yXyc6XG4gICAgICAgICAgICAvLyBHZW5lcmljIGhhbmRsZXIgZm9yIG9wZXJhdG9ycyAoJG9yLCAkYW5kLCAkbm9yKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2Uua2luZCA9ICdvcGVyYXRvcic7XG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdhcnJheSc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS52YWx1ZSA9IF9idWlsZFNlbGVjdG9yKHZhbHVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVucmVjb2dpemVkIGtleSBpbiBzZWxlY3RvcjogXCIsIGtleSk7XG4gICAgfVxuICAgIFxuICAgIC8vIFRPRE8gY2FzZXM6ICR3aGVyZSwgJGVsZW1NYXRjaFxuICAgIFxuICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShjbGF1c2UpKTtcbiAgICBcbiAgICByZXR1cm4gY2xhdXNlO1xufTtcblxudmFyIF9idWlsZEtleXBhdGhTZWxlY3RvciA9IGZ1bmN0aW9uIChrZXlwYXRoLCB2YWx1ZSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkOiBfYnVpbGRLZXlwYXRoU2VsZWN0b3InKTtcbiAgICBcbiAgICB2YXIgY2xhdXNlID0ge307XG4gICAgXG4gICAgY2xhdXNlLnZhbHVlID0gdmFsdWU7XG4gICAgXG4gICAgaWYgKF8uaXNOaWwodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgbnVsbCcpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnbnVsbCc7XG4gICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIFJlZ0V4cCcpO1xuXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ3JlZ2V4cCc7XG4gICAgICAgIFxuICAgICAgICB2YXIgc291cmNlID0gdmFsdWUudG9TdHJpbmcoKS5zcGxpdCgnLycpO1xuXG4gICAgICAgIGNsYXVzZS52YWx1ZSA9IHtcbiAgICAgICAgICAgICRyZWdleDogc291cmNlWzFdICAgLy8gVGhlIGZpcnN0IGl0ZW0gc3BsaXR0ZWQgaXMgYW4gZW1wdHkgc3RyaW5nXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAoc291cmNlWzJdICE9IFwiXCIpIHtcbiAgICAgICAgICAgIGNsYXVzZS52YWx1ZVtcIiRvcHRpb25zXCJdID0gc291cmNlWzJdO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgQXJyYXknKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ2FycmF5JztcbiAgICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgU3RyaW5nJyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdzdHJpbmcnO1xuICAgIH0gZWxzZSBpZiAoXy5pc051bWJlcih2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBOdW1iZXInKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ251bWJlcic7XG4gICAgfSBlbHNlIGlmIChfLmlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBCb29sZWFuJyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdib29sZWFuJztcbiAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBGdW5jdGlvbicpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnZnVuY3Rpb24nO1xuICAgIH0gZWxzZSBpZiAoXy5pc1BsYWluT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICB2YXIgbGl0ZXJhbE9iamVjdCA9IHRydWU7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGtleS5jaGFyQXQoMCkgPT09ICckJykge1xuICAgICAgICAgICAgICAgIGxpdGVyYWxPYmplY3QgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGxpdGVyYWxPYmplY3QpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgT2JqZWN0ID0+IHsgZmllbGQ6IHsgZmllbGRfMTogPHZhbHVlPiwgZmllbGRfMjogPHZhbHVlPiB9IH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnbGl0ZXJhbF9vYmplY3QnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBPcGVyYXRvciA9PiB7IGZpZWxkOiB7ICRndDogMiwgJGx0IDUgfSB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ29wZXJhdG9yX29iamVjdCc7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjbGF1c2UudHlwZSA9ICdfX2ludmFsaWRfXyc7XG4gICAgfVxuICAgIFxuICAgIHZhciBwYXJ0cyA9IGtleXBhdGguc3BsaXQoJy4nKTtcbiAgICBpZiAocGFydHMubGVuZ3RoID4gMSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvdmVyIE9iamVjdCBmaWVsZCA9PiB7IFwiZmllbGQxLmZpZWxkMV8yXCI6IDx2YWx1ZT4gfScpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLmtpbmQgPSAnb2JqZWN0JztcbiAgICAgICAgY2xhdXNlLmtleSA9IHBhcnRzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG92ZXIgUGxhaW4gZmllbGQgPT4geyBcImZpZWxkXCI6IDx2YWx1ZT4gfScpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLmtpbmQgPSAncGxhaW4nO1xuICAgICAgICBjbGF1c2Uua2V5ID0gcGFydHNbMF07XG4gICAgfVxuICAgIFxuICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShjbGF1c2UpKTtcbiAgICBcbiAgICByZXR1cm4gY2xhdXNlO1xufTtcblxuU2VsZWN0b3IuTUFUQ0hfU0VMRUNUT1IgPSAnbWF0Y2gnO1xuU2VsZWN0b3IuU09SVF9TRUxFQ1RPUiA9ICdzb3J0JztcblNlbGVjdG9yLkZJRUxEX1NFTEVDVE9SID0gJ2ZpZWxkJztcblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvcjsiXX0=
