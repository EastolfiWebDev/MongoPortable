"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Logger = require("jsw-logger"),
    _ = require("lodash");

var logger = null;

var SelectorMatcher = function () {
    function SelectorMatcher(selector) {
        _classCallCheck(this, SelectorMatcher);

        this.clauses = selector.clauses;

        logger = Logger.instance;
    }

    _createClass(SelectorMatcher, [{
        key: "test",
        value: function test(document) {
            logger.debug('Called SelectorMatcher->test');

            var _match = true;

            if (_.isNil(document)) {
                logger.debug('document -> null');

                logger.throw("Parameter 'document' required");
            }

            logger.debug('document -> not null');

            for (var i = 0; i < this.clauses.length; i++) {
                var clause = this.clauses[i];

                if (clause.kind === 'function') {
                    logger.debug('clause -> function');

                    _match = clause.value.call(null, document);
                } else if (clause.kind === 'plain') {
                    logger.debug("clause -> plain on field \"" + clause.key + "\" and value = " + JSON.stringify(clause.value));

                    _match = _testClause(clause, document[clause.key]);

                    logger.debug('clause result -> ' + _match);
                } else if (clause.kind === 'object') {
                    logger.debug("clause -> object on field \"" + clause.key.join('.') + "\" and value = " + JSON.stringify(clause.value));

                    _match = _testObjectClause(clause, document, _.clone(clause.key).reverse());

                    logger.debug('clause result -> ' + _match);
                } else if (clause.kind === 'operator') {
                    logger.debug("clause -> operator '" + clause.key + "'");

                    var _matcher = new SelectorMatcher({ clauses: clause.value });

                    _match = _matcher.test(document);

                    logger.debug('clause result -> ' + _match);
                }

                // If any test case fails, the document will not match
                if (_match === false || _match === 'false') {
                    logger.debug('the document do not matches');

                    return false;
                }
            }

            // Everything matches
            logger.debug('the document matches');

            return true;
        }
    }], [{
        key: "all",
        value: function all(array, value) {
            // $all is only meaningful on arrays
            if (!(array instanceof Array)) {
                return false;
            }

            // TODO should use a canonicalizing representation, so that we
            // don't get screwed by key order
            var parts = {};
            var remaining = 0;

            _.forEach(value, function (val) {
                var hash = JSON.stringify(val);

                if (!(hash in parts)) {
                    parts[hash] = true;
                    remaining++;
                }
            });

            for (var i = 0; i < array.length; i++) {
                var hash = JSON.stringify(array[i]);
                if (parts[hash]) {
                    delete parts[hash];
                    remaining--;

                    if (0 === remaining) return true;
                }
            }

            return false;
        }
    }, {
        key: "in",
        value: function _in(array, value) {
            if (!_.isObject(array)) {
                // optimization: use scalar equality (fast)
                for (var i = 0; i < value.length; i++) {
                    if (array === value[i]) {
                        return true;
                    }
                }

                return false;
            } else {
                // nope, have to use deep equality
                for (var i = 0; i < value.length; i++) {
                    if (SelectorMatcher.equal(array, value[i])) {
                        return true;
                    }
                }

                return false;
            }
        }

        // deep equality test: use for literal document and array matches

    }, {
        key: "equal",
        value: function equal(array, qval) {
            var match = function match(a, b) {
                // scalars
                if (_.isNumber(a) || _.isString(a) || _.isBoolean(a) || _.isNil(a)) return a === b;

                if (_.isFunction(a)) return false; // Not allowed yet

                // OK, typeof a === 'object'
                if (!_.isObject(b)) return false;

                // arrays
                if (_.isArray(a)) {
                    if (!_.isArray(b)) return false;

                    if (a.length !== b.length) return false;

                    for (var _i = 0; _i < a.length; _i++) {
                        if (!match(a[_i], b[_i])) return false;
                    }

                    return true;
                }

                // objects
                /*
                var unmatched_b_keys = 0;
                for (var x in b)
                    unmatched_b_keys++;
                for (var x in a) {
                    if (!(x in b) || !match(a[x], b[x]))
                        return false;
                    unmatched_b_keys--;
                }
                return unmatched_b_keys === 0;
                */
                // Follow Mongo in considering key order to be part of
                // equality. Key enumeration order is actually not defined in
                // the ecmascript spec but in practice most implementations
                // preserve it. (The exception is Chrome, which preserves it
                // usually, but not for keys that parse as ints.)
                var b_keys = [];

                for (var array in b) {
                    b_keys.push(b[array]);
                }

                var i = 0;
                for (var _array in a) {
                    if (i >= b_keys.length) return false;

                    if (!match(a[_array], b_keys[i])) return false;

                    i++;
                }
                if (i !== b_keys.length) return false;

                return true;
            };

            return match(array, qval);
        }

        // if x is not an array, true iff f(x) is true. if x is an array,
        // true iff f(y) is true for any y in x.
        //
        // this is the way most mongo operators (like $gt, $mod, $type..)
        // treat their arguments.

    }, {
        key: "matches",
        value: function matches(value, func) {
            if (_.isArray(value)) {
                for (var i = 0; i < value.length; i++) {
                    if (func(value[i])) return true;
                }

                return false;
            }

            return func(value);
        }

        // like _matches, but if x is an array, it's true not only if f(y)
        // is true for some y in x, but also if f(x) is true.
        //
        // this is the way mongo value comparisons usually work, like {x:
        // 4}, {x: [4]}, or {x: {$in: [1,2,3]}}.

    }, {
        key: "matches_plus",
        value: function matches_plus(value, func) {
            // if (_.isArray(value)) {
            //     for (var i = 0; i < value.length; i++) {
            //         if (func(value[i])) return true;
            //     }

            //     // fall through!
            // }

            // return func(value);
            return SelectorMatcher.matches(value, func) || func(value);
        }

        // compare two values of unknown type according to BSON ordering
        // semantics. (as an extension, consider 'undefined' to be less than
        // any other value.)
        // return negative if a is less, positive if b is less, or 0 if equal

    }, {
        key: "cmp",
        value: function cmp(a, b) {
            if (_.isUndefined(a)) return b === undefined ? 0 : -1;

            if (_.isUndefined(b)) return 1;

            var aType = BsonTypes.getByValue(a);
            var bType = BsonTypes.getByValue(b);

            if (aType.order !== bType.order) return aType.order < bType.order ? -1 : 1;

            // Same sort order, but distinct value type
            if (aType.number !== bType.number) {
                // Currently, Symbols can not be sortered in JS, so we are setting the Symbol as greater
                if (_.isSymbol(a)) return 1;
                if (_.isSymbol(b)) return -1;

                // TODO Integer, Date and Timestamp
            }

            if (_.isNumber(a)) return a - b;

            if (_.isString(a)) return a < b ? -1 : a === b ? 0 : 1;

            if (_.isBoolean(a)) {
                if (a) return b ? 0 : 1;

                return b ? -1 : 0;
            }

            if (_.isArray(a)) {
                for (var i = 0;; i++) {
                    if (i === a.length) return i === b.length ? 0 : -1;

                    if (i === b.length) return 1;

                    if (a.length !== b.length) return a.length - b.length;

                    var s = SelectorMatcher.cmp(a[i], b[i]);

                    if (s !== 0) return s;
                }
            }

            if (_.isNull(a)) return 0;

            if (_.isRegExp(a)) throw Error("Sorting not supported on regular expression"); // TODO

            // if (_.isFunction(a)) return {type: 13, order: 100, fnc: _.isFunction};

            if (_.isPlainObject(a)) {
                var to_array = function to_array(obj) {
                    var ret = [];

                    for (var key in obj) {
                        ret.push(key);
                        ret.push(obj[key]);
                    }

                    return ret;
                };

                return SelectorMatcher.cmp(to_array(a), to_array(b));
            }

            // double
            // if (ta === 1)  return a - b;

            // string
            // if (tb === 2) return a < b ? -1 : (a === b ? 0 : 1);

            // Object
            // if (ta === 3) {
            //     // this could be much more efficient in the expected case ...
            //     var to_array = function (obj) {
            //         var ret = [];

            //         for (var key in obj) {
            //             ret.push(key);
            //             ret.push(obj[key]);
            //         }

            //         return ret;
            //     };

            //     return Selector._f._cmp(to_array(a), to_array(b));
            // }

            // Array
            // if (ta === 4) {
            //     for (var i = 0; ; i++) {
            //         if (i === a.length) return (i === b.length) ? 0 : -1;

            //         if (i === b.length) return 1;

            //         if (a.length !== b.length) return a.length - b.length;

            //         var s = Selector._f._cmp(a[i], b[i]);

            //         if (s !== 0) return s;
            //     }
            // }

            // 5: binary data
            // 7: object id

            // boolean
            // if (ta === 8) {
            //     if (a) return b ? 0 : 1;

            //     return b ? -1 : 0;
            // }

            // 9: date

            // null
            // if (ta === 10) return 0;

            // regexp
            // if (ta === 11) {
            //     throw Error("Sorting not supported on regular expression"); // TODO
            // }

            // 13: javascript code
            // 14: symbol
            if (_.isSymbol(a)) {
                // Currently, Symbols can not be sortered in JS, so we are returning an equality
                return 0;
            }
            // 15: javascript code with scope
            // 16: 32-bit integer
            // 17: timestamp
            // 18: 64-bit integer
            // 255: minkey
            // 127: maxkey

            // javascript code
            // if (ta === 13) {
            //     throw Error("Sorting not supported on Javascript code"); // TODO
            // }
        }
    }]);

    return SelectorMatcher;
}();

var _testClause = function _testClause(clause, val) {
    logger.debug('Called _testClause');

    // var _val = clause.value;

    // if RegExp || $ -> Operator

    return SelectorMatcher.matches_plus(val, function (_value) {
        // TODO object ids, dates, timestamps?
        switch (clause.type) {
            case 'null':
                logger.debug('test Null equality');

                // http://www.mongodb.org/display/DOCS/Querying+and+nulls
                if (_.isNil(_value)) {
                    return true;
                } else {
                    return false;
                }
            case 'regexp':
                logger.debug('test RegExp equality');

                return _testOperatorClause(clause, _value);
            case 'literal_object':
                logger.debug('test Literal Object equality');

                return SelectorMatcher.equal(_value, clause.value);
            case 'operator_object':
                logger.debug('test Operator Object equality');

                return _testOperatorClause(clause, _value);
            case 'string':
                logger.debug('test String equality');

                return _.toString(_value) === _.toString(clause.value);
            case 'number':
                logger.debug('test Number equality');

                return _.toNumber(_value) === _.toNumber(clause.value);
            case 'boolean':
                logger.debug('test Boolean equality');

                return _.isBoolean(_value) && _.isBoolean(clause.value) && _value === clause.value;
            case 'array':
                logger.debug('test Boolean equality');

                // Check type
                if (_.isArray(_value) && _.isArray(clause.value)) {
                    // Check length
                    if (_value.length === clause.value.length) {
                        // Check items
                        for (var i = 0; i < _value.length; i++) {
                            if (clause.value.indexOf(_value[i]) === -1) {
                                return false;
                            }
                        }

                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            case 'function':
                logger.debug('test Function equality');

                throw Error("Bad value type in query");
            default:
                throw Error("Bad value type in query");
        }
    });
};

var _testObjectClause = function _testObjectClause(clause, doc, key) {
    logger.debug('Called _testObjectClause');

    var val = null;

    if (key.length > 0) {
        var path = key.pop();
        val = doc[path];

        logger.debug('check on field ' + path);

        // TODO add _.isNumber(val) and treat it as an array
        if (val) {
            logger.log(val);
            logger.debug('going deeper');

            return _testObjectClause(clause, val, key);
        }
    } else {
        logger.debug('lowest path: ' + path);

        return _testClause(clause, doc);
    }
};

var _testOperatorClause = function _testOperatorClause(clause, value) {
    logger.debug('Called _testOperatorClause');

    for (var key in clause.value) {
        if (!_testOperatorConstraint(key, clause.value[key], clause.value, value, clause)) {
            return false;
        }
    }

    return true;
};

var _testOperatorConstraint = function _testOperatorConstraint(key, operatorValue, clauseValue, docVal, clause) {
    logger.debug('Called _testOperatorConstraint');

    switch (key) {
        // Comparison Query Operators
        case '$gt':
            logger.debug('testing operator $gt');

            return SelectorMatcher.cmp(docVal, operatorValue) > 0;
        case '$lt':
            logger.debug('testing operator $lt');

            return SelectorMatcher.cmp(docVal, operatorValue) < 0;
        case '$gte':
            logger.debug('testing operator $gte');

            return SelectorMatcher.cmp(docVal, operatorValue) >= 0;
        case '$lte':
            logger.debug('testing operator $lte');

            return SelectorMatcher.cmp(docVal, operatorValue) <= 0;
        case '$eq':
            logger.debug('testing operator $eq');

            return SelectorMatcher.equal(docVal, operatorValue);
        case '$ne':
            logger.debug('testing operator $ne');

            return !SelectorMatcher.equal(docVal, operatorValue);
        case '$in':
            logger.debug('testing operator $in');

            return SelectorMatcher.in(docVal, operatorValue);
        case '$nin':
            logger.debug('testing operator $nin');

            return !SelectorMatcher.in(docVal, operatorValue);
        // Logical Query Operators
        case '$not':
            logger.debug('testing operator $not');

            // $or, $and, $nor are in the 'operator' kind treatment
            /*
            var _clause = {
                kind: 'plain',
                key: clause.key,
                value: operatorValue,
                type: 
            };
            var _parent = clause.value;
            var _key = 
            return !(_testClause(_clause, docVal));
            */
            // TODO implement
            throw Error("$not unimplemented");
        // Element Query Operators
        case '$exists':
            logger.debug('testing operator $exists');

            return operatorValue ? !_.isUndefined(docVal) : _.isUndefined(docVal);
        case '$type':
            logger.debug('testing operator $type');

            // $type: 1 is true for an array if any element in the array is of
            // type 1. but an array doesn't have type array unless it contains
            // an array..
            // var Selector._f._type(docVal);
            // return Selector._f._type(docVal).type === operatorValue;
            throw Error("$type unimplemented");
        // Evaluation Query Operators
        case '$mod':
            logger.debug('testing operator $mod');

            return docVal % operatorValue[0] === operatorValue[1];
        case '$options':
            logger.debug('testing operator $options (ignored)');

            // Ignore, as it is to the RegExp
            return true;
        case '$regex':
            logger.debug('testing operator $regex');

            var _opt = null;
            if (_.hasIn(clauseValue, '$options')) {
                _opt = clauseValue['$options'];

                if (/[xs]/.test(_opt)) {
                    //g, i, m, x, s
                    // TODO mongo uses PCRE and supports some additional flags: 'x' and
                    // 's'. javascript doesn't support them. so this is a divergence
                    // between our behavior and mongo's behavior. ideally we would
                    // implement x and s by transforming the regexp, but not today..

                    throw Error("Only the i, m, and g regexp options are supported");
                }
            }

            // Review flags -> g & m
            var regexp = operatorValue;

            if (_.isRegExp(regexp) && _.isNil(_opt)) {
                return regexp.test(docVal);
            } else if (_.isNil(_opt)) {
                regexp = new RegExp(regexp);
            } else if (_.isRegExp(regexp)) {
                regexp = new RegExp(regexp.source, _opt);
            } else {
                regexp = new RegExp(regexp, _opt);
            }

            return regexp.test(docVal);
        case '$text':
            logger.debug('testing operator $text');

            // TODO implement
            throw Error("$text unimplemented");
        case '$where':
            logger.debug('testing operator $where');

            // TODO implement
            throw Error("$where unimplemented");
        // Geospatial Query Operators
        // TODO -> in operator kind
        // Query Operator Array
        case '$all':
            logger.debug('testing operator $all');

            return SelectorMatcher.all(operatorValue, docVal) > 0;
        case '$elemMatch':
            logger.debug('testing operator $elemMatch');

            // TODO implement
            throw Error("$elemMatch unimplemented");
        case '$size':
            logger.debug('testing operator $size');

            return _.isArray(docVal) && docVal.length === operatorValue;
        // Bitwise Query Operators
        // TODO
        default:
            logger.debug('testing operator ' + key);

            throw Error("Unrecognized key in selector: " + key);
    }
};

var BsonTypes = {
    _types: [{ alias: 'minKey', number: -1, order: 1, isType: null }, { alias: 'null', number: 10, order: 2, isType: null }, { alias: 'int', number: 16, order: 3, isType: _.isInteger }, { alias: 'long', number: 18, order: 3, isType: _.isNumber }, { alias: 'double', number: 1, order: 3, isType: _.isNumber }, { alias: 'number', number: null, order: 3, isType: _.isNumber }, { alias: 'string', number: 2, order: 4, isType: _.isString }, { alias: 'symbol', number: 14, order: 4, isType: _.isSymbol }, { alias: 'object', number: 3, order: 5, isType: _.isPlainObject }, { alias: 'array', number: 4, order: 6, isType: _.isArray }, { alias: 'binData', number: 5, order: 7, isType: null }, { alias: 'objectId', number: 7, order: 8, isTypefnc: null }, { alias: 'bool', number: 8, order: 9, isType: _.isBoolean }, { alias: 'date', number: 9, order: 10, isTypefnc: _.isDate }, // format
    { alias: 'timestamp', number: 17, order: 11, isType: _.isDate }, // format
    { alias: 'regex', number: 11, order: 12, isType: _.isRegExp }, { alias: 'maxKey', number: 127, order: 13, isType: null }

    // 		undefined 6
    // 		dbPointer
    // 		javascript
    // 		javascriptWithScope
    // 		function
    ],

    getByAlias: function getByAlias(alias) {
        for (var i = 0; i < this._types.length; i++) {
            if (this._types[i].alias === alias) return this._types[i];
        }
    },
    getByValue: function getByValue(val) {
        if (_.isNumber(val)) return this.getByAlias("double");

        if (_.isString(val)) return this.getByAlias("string");

        if (_.isBoolean(val)) return this.getByAlias("bool");

        if (_.isArray(val)) return this.getByAlias("array");

        if (_.isNull(val)) return this.getByAlias("null");

        if (_.isRegExp(val)) return this.getByAlias("regex");

        if (_.isPlainObject(val)) return this.getByAlias("object");

        if (_.isSymbol(val)) return this.getByAlias("symbol");

        throw Error("Unaccepted BSON type");
    }
};

module.exports = SelectorMatcher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9TZWxlY3Rvck1hdGNoZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSSxTQUFTLFFBQVEsWUFBUixDQUFiO0lBQ0ksSUFBSSxRQUFRLFFBQVIsQ0FEUjs7QUFHQSxJQUFJLFNBQVMsSUFBYjs7SUFFTSxlO0FBQ0wsNkJBQVksUUFBWixFQUFzQjtBQUFBOztBQUNmLGFBQUssT0FBTCxHQUFlLFNBQVMsT0FBeEI7O0FBRUEsaUJBQVMsT0FBTyxRQUFoQjtBQUNOOzs7OzZCQUVJLFEsRUFBVTtBQUNkLG1CQUFPLEtBQVAsQ0FBYSw4QkFBYjs7QUFFQSxnQkFBSSxTQUFTLElBQWI7O0FBRUEsZ0JBQUksRUFBRSxLQUFGLENBQVEsUUFBUixDQUFKLEVBQXVCO0FBQ3RCLHVCQUFPLEtBQVAsQ0FBYSxrQkFBYjs7QUFFQSx1QkFBTyxLQUFQLENBQWEsK0JBQWI7QUFDQTs7QUFFRCxtQkFBTyxLQUFQLENBQWEsc0JBQWI7O0FBRUEsaUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxLQUFLLE9BQUwsQ0FBYSxNQUFqQyxFQUF5QyxHQUF6QyxFQUE4QztBQUM3QyxvQkFBSSxTQUFTLEtBQUssT0FBTCxDQUFhLENBQWIsQ0FBYjs7QUFFQSxvQkFBSSxPQUFPLElBQVAsS0FBZ0IsVUFBcEIsRUFBZ0M7QUFDL0IsMkJBQU8sS0FBUCxDQUFhLG9CQUFiOztBQUVBLDZCQUFTLE9BQU8sS0FBUCxDQUFhLElBQWIsQ0FBa0IsSUFBbEIsRUFBd0IsUUFBeEIsQ0FBVDtBQUNBLGlCQUpELE1BSU8sSUFBSSxPQUFPLElBQVAsS0FBZ0IsT0FBcEIsRUFBNkI7QUFDbkMsMkJBQU8sS0FBUCxpQ0FBMEMsT0FBTyxHQUFqRCx1QkFBcUUsS0FBSyxTQUFMLENBQWUsT0FBTyxLQUF0QixDQUFyRTs7QUFFQSw2QkFBUyxZQUFZLE1BQVosRUFBb0IsU0FBUyxPQUFPLEdBQWhCLENBQXBCLENBQVQ7O0FBRUEsMkJBQU8sS0FBUCxDQUFhLHNCQUFzQixNQUFuQztBQUNBLGlCQU5NLE1BTUEsSUFBSSxPQUFPLElBQVAsS0FBZ0IsUUFBcEIsRUFBOEI7QUFDcEMsMkJBQU8sS0FBUCxrQ0FBMkMsT0FBTyxHQUFQLENBQVcsSUFBWCxDQUFnQixHQUFoQixDQUEzQyx1QkFBZ0YsS0FBSyxTQUFMLENBQWUsT0FBTyxLQUF0QixDQUFoRjs7QUFFQSw2QkFBUyxrQkFBa0IsTUFBbEIsRUFBMEIsUUFBMUIsRUFBb0MsRUFBRSxLQUFGLENBQVEsT0FBTyxHQUFmLEVBQW9CLE9BQXBCLEVBQXBDLENBQVQ7O0FBRUEsMkJBQU8sS0FBUCxDQUFhLHNCQUFzQixNQUFuQztBQUNBLGlCQU5NLE1BTUEsSUFBSSxPQUFPLElBQVAsS0FBZ0IsVUFBcEIsRUFBZ0M7QUFDbkMsMkJBQU8sS0FBUCwwQkFBb0MsT0FBTyxHQUEzQzs7QUFFRyx3QkFBSSxXQUFXLElBQUksZUFBSixDQUFvQixFQUFFLFNBQVMsT0FBTyxLQUFsQixFQUFwQixDQUFmOztBQUVBLDZCQUFTLFNBQVMsSUFBVCxDQUFjLFFBQWQsQ0FBVDs7QUFFTiwyQkFBTyxLQUFQLENBQWEsc0JBQXNCLE1BQW5DO0FBQ0E7OztBQUdELG9CQUFJLFdBQVcsS0FBWCxJQUFvQixXQUFXLE9BQW5DLEVBQTRDO0FBQzNDLDJCQUFPLEtBQVAsQ0FBYSw2QkFBYjs7QUFFQSwyQkFBTyxLQUFQO0FBQ0E7QUFDRDs7O0FBR0QsbUJBQU8sS0FBUCxDQUFhLHNCQUFiOztBQUVBLG1CQUFPLElBQVA7QUFDQTs7OzRCQUVVLEssRUFBTyxLLEVBQU87O0FBRWxCLGdCQUFJLEVBQUUsaUJBQWlCLEtBQW5CLENBQUosRUFBK0I7QUFDM0IsdUJBQU8sS0FBUDtBQUNIOzs7O0FBSUQsZ0JBQUksUUFBUSxFQUFaO0FBQ0EsZ0JBQUksWUFBWSxDQUFoQjs7QUFFQSxjQUFFLE9BQUYsQ0FBVSxLQUFWLEVBQWlCLFVBQVUsR0FBVixFQUFlO0FBQzVCLG9CQUFJLE9BQU8sS0FBSyxTQUFMLENBQWUsR0FBZixDQUFYOztBQUVBLG9CQUFJLEVBQUUsUUFBUSxLQUFWLENBQUosRUFBc0I7QUFDbEIsMEJBQU0sSUFBTixJQUFjLElBQWQ7QUFDQTtBQUNIO0FBQ0osYUFQRDs7QUFTQSxpQkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE1BQU0sTUFBMUIsRUFBa0MsR0FBbEMsRUFBdUM7QUFDbkMsb0JBQUksT0FBTyxLQUFLLFNBQUwsQ0FBZSxNQUFNLENBQU4sQ0FBZixDQUFYO0FBQ0Esb0JBQUksTUFBTSxJQUFOLENBQUosRUFBaUI7QUFDYiwyQkFBTyxNQUFNLElBQU4sQ0FBUDtBQUNBOztBQUVBLHdCQUFJLE1BQU0sU0FBVixFQUFxQixPQUFPLElBQVA7QUFDeEI7QUFDSjs7QUFFRCxtQkFBTyxLQUFQO0FBQ0g7Ozs0QkFFTSxLLEVBQU8sSyxFQUFPO0FBQ2pCLGdCQUFJLENBQUMsRUFBRSxRQUFGLENBQVcsS0FBWCxDQUFMLEVBQXdCOztBQUVwQixxQkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE1BQU0sTUFBMUIsRUFBa0MsR0FBbEMsRUFBdUM7QUFDbkMsd0JBQUksVUFBVSxNQUFNLENBQU4sQ0FBZCxFQUF3QjtBQUNwQiwrQkFBTyxJQUFQO0FBQ0g7QUFDSjs7QUFFRCx1QkFBTyxLQUFQO0FBQ0gsYUFURCxNQVNPOztBQUVILHFCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksTUFBTSxNQUExQixFQUFrQyxHQUFsQyxFQUF1QztBQUNuQyx3QkFBSSxnQkFBZ0IsS0FBaEIsQ0FBc0IsS0FBdEIsRUFBNkIsTUFBTSxDQUFOLENBQTdCLENBQUosRUFBNEM7QUFDeEMsK0JBQU8sSUFBUDtBQUNIO0FBQ0o7O0FBRUQsdUJBQU8sS0FBUDtBQUNIO0FBQ0o7Ozs7Ozs4QkFHUyxLLEVBQU8sSSxFQUFNO0FBQ25CLGdCQUFJLFFBQVEsU0FBUixLQUFRLENBQVUsQ0FBVixFQUFhLENBQWIsRUFBZ0I7O0FBRXhCLG9CQUFJLEVBQUUsUUFBRixDQUFXLENBQVgsS0FBaUIsRUFBRSxRQUFGLENBQVcsQ0FBWCxDQUFqQixJQUFrQyxFQUFFLFNBQUYsQ0FBWSxDQUFaLENBQWxDLElBQW9ELEVBQUUsS0FBRixDQUFRLENBQVIsQ0FBeEQsRUFBb0UsT0FBTyxNQUFNLENBQWI7O0FBRXBFLG9CQUFJLEVBQUUsVUFBRixDQUFhLENBQWIsQ0FBSixFQUFxQixPQUFPLEtBQVAsQzs7O0FBR3JCLG9CQUFJLENBQUMsRUFBRSxRQUFGLENBQVcsQ0FBWCxDQUFMLEVBQW9CLE9BQU8sS0FBUDs7O0FBR3BCLG9CQUFJLEVBQUUsT0FBRixDQUFVLENBQVYsQ0FBSixFQUFrQjtBQUNkLHdCQUFJLENBQUMsRUFBRSxPQUFGLENBQVUsQ0FBVixDQUFMLEVBQW1CLE9BQU8sS0FBUDs7QUFFbkIsd0JBQUksRUFBRSxNQUFGLEtBQWEsRUFBRSxNQUFuQixFQUEyQixPQUFPLEtBQVA7O0FBRTNCLHlCQUFLLElBQUksS0FBSSxDQUFiLEVBQWdCLEtBQUksRUFBRSxNQUF0QixFQUE4QixJQUE5QixFQUFtQztBQUMvQiw0QkFBSSxDQUFDLE1BQU0sRUFBRSxFQUFGLENBQU4sRUFBVyxFQUFFLEVBQUYsQ0FBWCxDQUFMLEVBQXVCLE9BQU8sS0FBUDtBQUMxQjs7QUFFRCwyQkFBTyxJQUFQO0FBQ0g7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFtQkQsb0JBQUksU0FBUyxFQUFiOztBQUVBLHFCQUFLLElBQUksS0FBVCxJQUFrQixDQUFsQixFQUFxQjtBQUNqQiwyQkFBTyxJQUFQLENBQVksRUFBRSxLQUFGLENBQVo7QUFDSDs7QUFFRCxvQkFBSSxJQUFJLENBQVI7QUFDQSxxQkFBSyxJQUFJLE1BQVQsSUFBa0IsQ0FBbEIsRUFBcUI7QUFDakIsd0JBQUksS0FBSyxPQUFPLE1BQWhCLEVBQXdCLE9BQU8sS0FBUDs7QUFFeEIsd0JBQUksQ0FBQyxNQUFNLEVBQUUsTUFBRixDQUFOLEVBQWdCLE9BQU8sQ0FBUCxDQUFoQixDQUFMLEVBQWlDLE9BQU8sS0FBUDs7QUFFakM7QUFDSDtBQUNELG9CQUFJLE1BQU0sT0FBTyxNQUFqQixFQUF5QixPQUFPLEtBQVA7O0FBRXpCLHVCQUFPLElBQVA7QUFDSCxhQXhERDs7QUEwREEsbUJBQU8sTUFBTSxLQUFOLEVBQWEsSUFBYixDQUFQO0FBQ0g7Ozs7Ozs7Ozs7Z0NBT2MsSyxFQUFPLEksRUFBTTtBQUN4QixnQkFBSSxFQUFFLE9BQUYsQ0FBVSxLQUFWLENBQUosRUFBc0I7QUFDbEIscUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxNQUFNLE1BQTFCLEVBQWtDLEdBQWxDLEVBQXVDO0FBQ25DLHdCQUFJLEtBQUssTUFBTSxDQUFOLENBQUwsQ0FBSixFQUFvQixPQUFPLElBQVA7QUFDdkI7O0FBRUQsdUJBQU8sS0FBUDtBQUNIOztBQUVELG1CQUFPLEtBQUssS0FBTCxDQUFQO0FBQ0g7Ozs7Ozs7Ozs7cUNBT21CLEssRUFBTyxJLEVBQU07Ozs7Ozs7Ozs7QUFVN0IsbUJBQU8sZ0JBQWdCLE9BQWhCLENBQXdCLEtBQXhCLEVBQStCLElBQS9CLEtBQXdDLEtBQUssS0FBTCxDQUEvQztBQUNIOzs7Ozs7Ozs7NEJBTVUsQyxFQUFHLEMsRUFBRztBQUNiLGdCQUFJLEVBQUUsV0FBRixDQUFjLENBQWQsQ0FBSixFQUFzQixPQUFPLE1BQU0sU0FBTixHQUFrQixDQUFsQixHQUFzQixDQUFDLENBQTlCOztBQUV0QixnQkFBSSxFQUFFLFdBQUYsQ0FBYyxDQUFkLENBQUosRUFBc0IsT0FBTyxDQUFQOztBQUV0QixnQkFBSSxRQUFRLFVBQVUsVUFBVixDQUFxQixDQUFyQixDQUFaO0FBQ0EsZ0JBQUksUUFBUSxVQUFVLFVBQVYsQ0FBcUIsQ0FBckIsQ0FBWjs7QUFFQSxnQkFBSSxNQUFNLEtBQU4sS0FBZ0IsTUFBTSxLQUExQixFQUFpQyxPQUFPLE1BQU0sS0FBTixHQUFjLE1BQU0sS0FBcEIsR0FBNEIsQ0FBQyxDQUE3QixHQUFpQyxDQUF4Qzs7O0FBR2pDLGdCQUFJLE1BQU0sTUFBTixLQUFpQixNQUFNLE1BQTNCLEVBQW1DOztBQUUvQixvQkFBSSxFQUFFLFFBQUYsQ0FBVyxDQUFYLENBQUosRUFBbUIsT0FBTyxDQUFQO0FBQ25CLG9CQUFJLEVBQUUsUUFBRixDQUFXLENBQVgsQ0FBSixFQUFtQixPQUFPLENBQUMsQ0FBUjs7O0FBR3RCOztBQUVELGdCQUFJLEVBQUUsUUFBRixDQUFXLENBQVgsQ0FBSixFQUFtQixPQUFPLElBQUksQ0FBWDs7QUFFbkIsZ0JBQUksRUFBRSxRQUFGLENBQVcsQ0FBWCxDQUFKLEVBQW1CLE9BQU8sSUFBSSxDQUFKLEdBQVEsQ0FBQyxDQUFULEdBQWMsTUFBTSxDQUFOLEdBQVUsQ0FBVixHQUFjLENBQW5DOztBQUVuQixnQkFBSSxFQUFFLFNBQUYsQ0FBWSxDQUFaLENBQUosRUFBb0I7QUFDaEIsb0JBQUksQ0FBSixFQUFPLE9BQU8sSUFBSSxDQUFKLEdBQVEsQ0FBZjs7QUFFUCx1QkFBTyxJQUFJLENBQUMsQ0FBTCxHQUFTLENBQWhCO0FBQ0g7O0FBRUQsZ0JBQUksRUFBRSxPQUFGLENBQVUsQ0FBVixDQUFKLEVBQWtCO0FBQ2QscUJBQUssSUFBSSxJQUFJLENBQWIsR0FBa0IsR0FBbEIsRUFBdUI7QUFDbkIsd0JBQUksTUFBTSxFQUFFLE1BQVosRUFBb0IsT0FBUSxNQUFNLEVBQUUsTUFBVCxHQUFtQixDQUFuQixHQUF1QixDQUFDLENBQS9COztBQUVwQix3QkFBSSxNQUFNLEVBQUUsTUFBWixFQUFvQixPQUFPLENBQVA7O0FBRXBCLHdCQUFJLEVBQUUsTUFBRixLQUFhLEVBQUUsTUFBbkIsRUFBMkIsT0FBTyxFQUFFLE1BQUYsR0FBVyxFQUFFLE1BQXBCOztBQUUzQix3QkFBSSxJQUFJLGdCQUFnQixHQUFoQixDQUFvQixFQUFFLENBQUYsQ0FBcEIsRUFBMEIsRUFBRSxDQUFGLENBQTFCLENBQVI7O0FBRUEsd0JBQUksTUFBTSxDQUFWLEVBQWEsT0FBTyxDQUFQO0FBQ2hCO0FBQ0o7O0FBRUQsZ0JBQUksRUFBRSxNQUFGLENBQVMsQ0FBVCxDQUFKLEVBQWlCLE9BQU8sQ0FBUDs7QUFFakIsZ0JBQUksRUFBRSxRQUFGLENBQVcsQ0FBWCxDQUFKLEVBQW1CLE1BQU0sTUFBTSw2Q0FBTixDQUFOLEM7Ozs7QUFJbkIsZ0JBQUksRUFBRSxhQUFGLENBQWdCLENBQWhCLENBQUosRUFBd0I7QUFDcEIsb0JBQUksV0FBVyxTQUFYLFFBQVcsQ0FBVSxHQUFWLEVBQWU7QUFDMUIsd0JBQUksTUFBTSxFQUFWOztBQUVBLHlCQUFLLElBQUksR0FBVCxJQUFnQixHQUFoQixFQUFxQjtBQUNqQiw0QkFBSSxJQUFKLENBQVMsR0FBVDtBQUNBLDRCQUFJLElBQUosQ0FBUyxJQUFJLEdBQUosQ0FBVDtBQUNIOztBQUVELDJCQUFPLEdBQVA7QUFDSCxpQkFURDs7QUFXQSx1QkFBTyxnQkFBZ0IsR0FBaEIsQ0FBb0IsU0FBUyxDQUFULENBQXBCLEVBQWlDLFNBQVMsQ0FBVCxDQUFqQyxDQUFQO0FBQ0g7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBOERELGdCQUFJLEVBQUUsUUFBRixDQUFXLENBQVgsQ0FBSixFQUFtQjs7QUFFZix1QkFBTyxDQUFQO0FBQ0g7Ozs7Ozs7Ozs7OztBQVlKOzs7Ozs7QUFHTCxJQUFJLGNBQWMsU0FBZCxXQUFjLENBQVMsTUFBVCxFQUFpQixHQUFqQixFQUFzQjtBQUNwQyxXQUFPLEtBQVAsQ0FBYSxvQkFBYjs7Ozs7O0FBTUEsV0FBTyxnQkFBZ0IsWUFBaEIsQ0FBNkIsR0FBN0IsRUFBa0MsVUFBUyxNQUFULEVBQWlCOztBQUV0RCxnQkFBUSxPQUFPLElBQWY7QUFDSSxpQkFBSyxNQUFMO0FBQ0ksdUJBQU8sS0FBUCxDQUFhLG9CQUFiOzs7QUFHQSxvQkFBSSxFQUFFLEtBQUYsQ0FBUSxNQUFSLENBQUosRUFBcUI7QUFDakIsMkJBQU8sSUFBUDtBQUNILGlCQUZELE1BRU87QUFDSCwyQkFBTyxLQUFQO0FBQ0g7QUFDTCxpQkFBSyxRQUFMO0FBQ0ksdUJBQU8sS0FBUCxDQUFhLHNCQUFiOztBQUVBLHVCQUFPLG9CQUFvQixNQUFwQixFQUE0QixNQUE1QixDQUFQO0FBQ0osaUJBQUssZ0JBQUw7QUFDSSx1QkFBTyxLQUFQLENBQWEsOEJBQWI7O0FBRUEsdUJBQU8sZ0JBQWdCLEtBQWhCLENBQXNCLE1BQXRCLEVBQThCLE9BQU8sS0FBckMsQ0FBUDtBQUNKLGlCQUFLLGlCQUFMO0FBQ0ksdUJBQU8sS0FBUCxDQUFhLCtCQUFiOztBQUVBLHVCQUFPLG9CQUFvQixNQUFwQixFQUE0QixNQUE1QixDQUFQO0FBQ0osaUJBQUssUUFBTDtBQUNJLHVCQUFPLEtBQVAsQ0FBYSxzQkFBYjs7QUFFQSx1QkFBTyxFQUFFLFFBQUYsQ0FBVyxNQUFYLE1BQXVCLEVBQUUsUUFBRixDQUFXLE9BQU8sS0FBbEIsQ0FBOUI7QUFDSixpQkFBSyxRQUFMO0FBQ0ksdUJBQU8sS0FBUCxDQUFhLHNCQUFiOztBQUVBLHVCQUFPLEVBQUUsUUFBRixDQUFXLE1BQVgsTUFBdUIsRUFBRSxRQUFGLENBQVcsT0FBTyxLQUFsQixDQUE5QjtBQUNKLGlCQUFLLFNBQUw7QUFDSSx1QkFBTyxLQUFQLENBQWEsdUJBQWI7O0FBRUEsdUJBQVEsRUFBRSxTQUFGLENBQVksTUFBWixLQUF1QixFQUFFLFNBQUYsQ0FBWSxPQUFPLEtBQW5CLENBQXZCLElBQXFELFdBQVcsT0FBTyxLQUEvRTtBQUNKLGlCQUFLLE9BQUw7QUFDSSx1QkFBTyxLQUFQLENBQWEsdUJBQWI7OztBQUdBLG9CQUFJLEVBQUUsT0FBRixDQUFVLE1BQVYsS0FBcUIsRUFBRSxPQUFGLENBQVUsT0FBTyxLQUFqQixDQUF6QixFQUFrRDs7QUFFOUMsd0JBQUksT0FBTyxNQUFQLEtBQWtCLE9BQU8sS0FBUCxDQUFhLE1BQW5DLEVBQTJDOztBQUV2Qyw2QkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE9BQU8sTUFBM0IsRUFBbUMsR0FBbkMsRUFBd0M7QUFDcEMsZ0NBQUksT0FBTyxLQUFQLENBQWEsT0FBYixDQUFxQixPQUFPLENBQVAsQ0FBckIsTUFBb0MsQ0FBQyxDQUF6QyxFQUE0QztBQUN4Qyx1Q0FBTyxLQUFQO0FBQ0g7QUFDSjs7QUFFRCwrQkFBTyxJQUFQO0FBQ0gscUJBVEQsTUFTTztBQUNILCtCQUFPLEtBQVA7QUFDSDtBQUNKLGlCQWRELE1BY087QUFDSCwyQkFBTyxLQUFQO0FBQ0g7QUFDTCxpQkFBSyxVQUFMO0FBQ0ksdUJBQU8sS0FBUCxDQUFhLHdCQUFiOztBQUVBLHNCQUFNLE1BQU0seUJBQU4sQ0FBTjtBQUNKO0FBQ0ksc0JBQU0sTUFBTSx5QkFBTixDQUFOO0FBNURSO0FBOERILEtBaEVNLENBQVA7QUFpRUgsQ0F4RUQ7O0FBMEVBLElBQUksb0JBQW9CLFNBQXBCLGlCQUFvQixDQUFTLE1BQVQsRUFBaUIsR0FBakIsRUFBc0IsR0FBdEIsRUFBMkI7QUFDL0MsV0FBTyxLQUFQLENBQWEsMEJBQWI7O0FBRUEsUUFBSSxNQUFNLElBQVY7O0FBRUEsUUFBSSxJQUFJLE1BQUosR0FBYSxDQUFqQixFQUFvQjtBQUNoQixZQUFJLE9BQU8sSUFBSSxHQUFKLEVBQVg7QUFDQSxjQUFNLElBQUksSUFBSixDQUFOOztBQUVBLGVBQU8sS0FBUCxDQUFhLG9CQUFvQixJQUFqQzs7O0FBR0EsWUFBSSxHQUFKLEVBQVM7QUFDTCxtQkFBTyxHQUFQLENBQVcsR0FBWDtBQUNBLG1CQUFPLEtBQVAsQ0FBYSxjQUFiOztBQUVBLG1CQUFPLGtCQUFrQixNQUFsQixFQUEwQixHQUExQixFQUErQixHQUEvQixDQUFQO0FBQ0g7QUFDSixLQWJELE1BYU87QUFDSCxlQUFPLEtBQVAsQ0FBYSxrQkFBa0IsSUFBL0I7O0FBRUEsZUFBTyxZQUFZLE1BQVosRUFBb0IsR0FBcEIsQ0FBUDtBQUNIO0FBQ0osQ0F2QkQ7O0FBeUJBLElBQUksc0JBQXNCLFNBQXRCLG1CQUFzQixDQUFTLE1BQVQsRUFBaUIsS0FBakIsRUFBd0I7QUFDOUMsV0FBTyxLQUFQLENBQWEsNEJBQWI7O0FBRUEsU0FBSyxJQUFJLEdBQVQsSUFBZ0IsT0FBTyxLQUF2QixFQUE4QjtBQUMxQixZQUFJLENBQUMsd0JBQXdCLEdBQXhCLEVBQTZCLE9BQU8sS0FBUCxDQUFhLEdBQWIsQ0FBN0IsRUFBZ0QsT0FBTyxLQUF2RCxFQUE4RCxLQUE5RCxFQUFxRSxNQUFyRSxDQUFMLEVBQW1GO0FBQy9FLG1CQUFPLEtBQVA7QUFDSDtBQUNKOztBQUVELFdBQU8sSUFBUDtBQUNILENBVkQ7O0FBWUEsSUFBSSwwQkFBMEIsU0FBMUIsdUJBQTBCLENBQVUsR0FBVixFQUFlLGFBQWYsRUFBOEIsV0FBOUIsRUFBMkMsTUFBM0MsRUFBbUQsTUFBbkQsRUFBMkQ7QUFDckYsV0FBTyxLQUFQLENBQWEsZ0NBQWI7O0FBRUEsWUFBUSxHQUFSOztBQUVJLGFBQUssS0FBTDtBQUNJLG1CQUFPLEtBQVAsQ0FBYSxzQkFBYjs7QUFFQSxtQkFBTyxnQkFBZ0IsR0FBaEIsQ0FBb0IsTUFBcEIsRUFBNEIsYUFBNUIsSUFBNkMsQ0FBcEQ7QUFDSixhQUFLLEtBQUw7QUFDSSxtQkFBTyxLQUFQLENBQWEsc0JBQWI7O0FBRUEsbUJBQU8sZ0JBQWdCLEdBQWhCLENBQW9CLE1BQXBCLEVBQTRCLGFBQTVCLElBQTZDLENBQXBEO0FBQ0osYUFBSyxNQUFMO0FBQ0ksbUJBQU8sS0FBUCxDQUFhLHVCQUFiOztBQUVBLG1CQUFPLGdCQUFnQixHQUFoQixDQUFvQixNQUFwQixFQUE0QixhQUE1QixLQUE4QyxDQUFyRDtBQUNKLGFBQUssTUFBTDtBQUNJLG1CQUFPLEtBQVAsQ0FBYSx1QkFBYjs7QUFFQSxtQkFBTyxnQkFBZ0IsR0FBaEIsQ0FBb0IsTUFBcEIsRUFBNEIsYUFBNUIsS0FBOEMsQ0FBckQ7QUFDSixhQUFLLEtBQUw7QUFDSSxtQkFBTyxLQUFQLENBQWEsc0JBQWI7O0FBRUEsbUJBQU8sZ0JBQWdCLEtBQWhCLENBQXNCLE1BQXRCLEVBQThCLGFBQTlCLENBQVA7QUFDSixhQUFLLEtBQUw7QUFDSSxtQkFBTyxLQUFQLENBQWEsc0JBQWI7O0FBRUEsbUJBQU8sQ0FBQyxnQkFBZ0IsS0FBaEIsQ0FBc0IsTUFBdEIsRUFBOEIsYUFBOUIsQ0FBUjtBQUNKLGFBQUssS0FBTDtBQUNJLG1CQUFPLEtBQVAsQ0FBYSxzQkFBYjs7QUFFQSxtQkFBTyxnQkFBZ0IsRUFBaEIsQ0FBbUIsTUFBbkIsRUFBMkIsYUFBM0IsQ0FBUDtBQUNKLGFBQUssTUFBTDtBQUNJLG1CQUFPLEtBQVAsQ0FBYSx1QkFBYjs7QUFFQSxtQkFBTyxDQUFDLGdCQUFnQixFQUFoQixDQUFtQixNQUFuQixFQUEyQixhQUEzQixDQUFSOztBQUVKLGFBQUssTUFBTDtBQUNJLG1CQUFPLEtBQVAsQ0FBYSx1QkFBYjs7Ozs7Ozs7Ozs7Ozs7O0FBZUEsa0JBQU0sTUFBTSxvQkFBTixDQUFOOztBQUVKLGFBQUssU0FBTDtBQUNJLG1CQUFPLEtBQVAsQ0FBYSwwQkFBYjs7QUFFQSxtQkFBTyxnQkFBZ0IsQ0FBQyxFQUFFLFdBQUYsQ0FBYyxNQUFkLENBQWpCLEdBQXlDLEVBQUUsV0FBRixDQUFjLE1BQWQsQ0FBaEQ7QUFDSixhQUFLLE9BQUw7QUFDSSxtQkFBTyxLQUFQLENBQWEsd0JBQWI7Ozs7Ozs7QUFPQSxrQkFBTSxNQUFNLHFCQUFOLENBQU47O0FBRUosYUFBSyxNQUFMO0FBQ0ksbUJBQU8sS0FBUCxDQUFhLHVCQUFiOztBQUVBLG1CQUFPLFNBQVMsY0FBYyxDQUFkLENBQVQsS0FBOEIsY0FBYyxDQUFkLENBQXJDO0FBQ0osYUFBSyxVQUFMO0FBQ0ksbUJBQU8sS0FBUCxDQUFhLHFDQUFiOzs7QUFHQSxtQkFBTyxJQUFQO0FBQ0osYUFBSyxRQUFMO0FBQ0ksbUJBQU8sS0FBUCxDQUFhLHlCQUFiOztBQUVBLGdCQUFJLE9BQU8sSUFBWDtBQUNBLGdCQUFJLEVBQUUsS0FBRixDQUFRLFdBQVIsRUFBcUIsVUFBckIsQ0FBSixFQUFzQztBQUNsQyx1QkFBTyxZQUFZLFVBQVosQ0FBUDs7QUFFQSxvQkFBSSxPQUFPLElBQVAsQ0FBWSxJQUFaLENBQUosRUFBdUI7Ozs7Ozs7QUFPbkIsMEJBQU0sTUFBTSxtREFBTixDQUFOO0FBQ0g7QUFDSjs7O0FBR0QsZ0JBQUksU0FBUyxhQUFiOztBQUVBLGdCQUFJLEVBQUUsUUFBRixDQUFXLE1BQVgsS0FBc0IsRUFBRSxLQUFGLENBQVEsSUFBUixDQUExQixFQUF5QztBQUNyQyx1QkFBTyxPQUFPLElBQVAsQ0FBWSxNQUFaLENBQVA7QUFDSCxhQUZELE1BRU8sSUFBSSxFQUFFLEtBQUYsQ0FBUSxJQUFSLENBQUosRUFBbUI7QUFDdEIseUJBQVMsSUFBSSxNQUFKLENBQVcsTUFBWCxDQUFUO0FBQ0gsYUFGTSxNQUVBLElBQUksRUFBRSxRQUFGLENBQVcsTUFBWCxDQUFKLEVBQXdCO0FBQzNCLHlCQUFTLElBQUksTUFBSixDQUFXLE9BQU8sTUFBbEIsRUFBMEIsSUFBMUIsQ0FBVDtBQUNILGFBRk0sTUFFQTtBQUNILHlCQUFTLElBQUksTUFBSixDQUFXLE1BQVgsRUFBbUIsSUFBbkIsQ0FBVDtBQUNIOztBQUVELG1CQUFPLE9BQU8sSUFBUCxDQUFZLE1BQVosQ0FBUDtBQUNKLGFBQUssT0FBTDtBQUNJLG1CQUFPLEtBQVAsQ0FBYSx3QkFBYjs7O0FBR0Esa0JBQU0sTUFBTSxxQkFBTixDQUFOO0FBQ0osYUFBSyxRQUFMO0FBQ0ksbUJBQU8sS0FBUCxDQUFhLHlCQUFiOzs7QUFHQSxrQkFBTSxNQUFNLHNCQUFOLENBQU47Ozs7QUFJSixhQUFLLE1BQUw7QUFDSSxtQkFBTyxLQUFQLENBQWEsdUJBQWI7O0FBRUEsbUJBQU8sZ0JBQWdCLEdBQWhCLENBQW9CLGFBQXBCLEVBQW1DLE1BQW5DLElBQTZDLENBQXBEO0FBQ0osYUFBSyxZQUFMO0FBQ0ksbUJBQU8sS0FBUCxDQUFhLDZCQUFiOzs7QUFHQSxrQkFBTSxNQUFNLDBCQUFOLENBQU47QUFDSixhQUFLLE9BQUw7QUFDSSxtQkFBTyxLQUFQLENBQWEsd0JBQWI7O0FBRUEsbUJBQU8sRUFBRSxPQUFGLENBQVUsTUFBVixLQUFxQixPQUFPLE1BQVAsS0FBa0IsYUFBOUM7OztBQUdKO0FBQ0ksbUJBQU8sS0FBUCxDQUFhLHNCQUFzQixHQUFuQzs7QUFFQSxrQkFBTSxNQUFNLG1DQUFtQyxHQUF6QyxDQUFOO0FBM0lSO0FBNklILENBaEpEOztBQWtKQSxJQUFJLFlBQVk7QUFDZixZQUFRLENBQ1AsRUFBRSxPQUFPLFFBQVQsRUFBbUIsUUFBUSxDQUFDLENBQTVCLEVBQStCLE9BQU8sQ0FBdEMsRUFBeUMsUUFBUSxJQUFqRCxFQURPLEVBRVAsRUFBRSxPQUFPLE1BQVQsRUFBaUIsUUFBUSxFQUF6QixFQUE2QixPQUFPLENBQXBDLEVBQXVDLFFBQVEsSUFBL0MsRUFGTyxFQUdQLEVBQUUsT0FBTyxLQUFULEVBQWdCLFFBQVEsRUFBeEIsRUFBNEIsT0FBTyxDQUFuQyxFQUFzQyxRQUFRLEVBQUUsU0FBaEQsRUFITyxFQUlQLEVBQUUsT0FBTyxNQUFULEVBQWlCLFFBQVEsRUFBekIsRUFBNkIsT0FBTyxDQUFwQyxFQUF1QyxRQUFRLEVBQUUsUUFBakQsRUFKTyxFQUtQLEVBQUUsT0FBTyxRQUFULEVBQW1CLFFBQVEsQ0FBM0IsRUFBOEIsT0FBTyxDQUFyQyxFQUF3QyxRQUFRLEVBQUUsUUFBbEQsRUFMTyxFQU1QLEVBQUUsT0FBTyxRQUFULEVBQW1CLFFBQVEsSUFBM0IsRUFBaUMsT0FBTyxDQUF4QyxFQUEyQyxRQUFRLEVBQUUsUUFBckQsRUFOTyxFQU9QLEVBQUUsT0FBTyxRQUFULEVBQW1CLFFBQVEsQ0FBM0IsRUFBOEIsT0FBTyxDQUFyQyxFQUF3QyxRQUFRLEVBQUUsUUFBbEQsRUFQTyxFQVFQLEVBQUUsT0FBTyxRQUFULEVBQW1CLFFBQVEsRUFBM0IsRUFBK0IsT0FBTyxDQUF0QyxFQUF5QyxRQUFRLEVBQUUsUUFBbkQsRUFSTyxFQVNQLEVBQUUsT0FBTyxRQUFULEVBQW1CLFFBQVEsQ0FBM0IsRUFBOEIsT0FBTyxDQUFyQyxFQUF3QyxRQUFRLEVBQUUsYUFBbEQsRUFUTyxFQVVQLEVBQUUsT0FBTyxPQUFULEVBQWtCLFFBQVEsQ0FBMUIsRUFBNkIsT0FBTyxDQUFwQyxFQUF1QyxRQUFRLEVBQUUsT0FBakQsRUFWTyxFQVdQLEVBQUUsT0FBTyxTQUFULEVBQW9CLFFBQVEsQ0FBNUIsRUFBK0IsT0FBTyxDQUF0QyxFQUF5QyxRQUFRLElBQWpELEVBWE8sRUFZUCxFQUFFLE9BQU8sVUFBVCxFQUFxQixRQUFRLENBQTdCLEVBQWdDLE9BQU8sQ0FBdkMsRUFBMEMsV0FBVyxJQUFyRCxFQVpPLEVBYVAsRUFBRSxPQUFPLE1BQVQsRUFBaUIsUUFBUSxDQUF6QixFQUE0QixPQUFPLENBQW5DLEVBQXNDLFFBQVEsRUFBRSxTQUFoRCxFQWJPLEVBY1AsRUFBRSxPQUFPLE1BQVQsRUFBaUIsUUFBUSxDQUF6QixFQUE0QixPQUFPLEVBQW5DLEVBQXVDLFdBQVcsRUFBRSxNQUFwRCxFQWRPLEU7QUFlUCxNQUFFLE9BQU8sV0FBVCxFQUFzQixRQUFRLEVBQTlCLEVBQWtDLE9BQU8sRUFBekMsRUFBNkMsUUFBUSxFQUFFLE1BQXZELEVBZk8sRTtBQWdCUCxNQUFFLE9BQU8sT0FBVCxFQUFrQixRQUFRLEVBQTFCLEVBQThCLE9BQU8sRUFBckMsRUFBeUMsUUFBUSxFQUFFLFFBQW5ELEVBaEJPLEVBaUJQLEVBQUUsT0FBTyxRQUFULEVBQW1CLFFBQVEsR0FBM0IsRUFBZ0MsT0FBTyxFQUF2QyxFQUEyQyxRQUFRLElBQW5EOzs7Ozs7O0FBakJPLEtBRE87O0FBMkJmLGdCQUFZLG9CQUFTLEtBQVQsRUFBZ0I7QUFDM0IsYUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLEtBQUssTUFBTCxDQUFZLE1BQWhDLEVBQXdDLEdBQXhDLEVBQTZDO0FBQzVDLGdCQUFJLEtBQUssTUFBTCxDQUFZLENBQVosRUFBZSxLQUFmLEtBQXlCLEtBQTdCLEVBQW9DLE9BQU8sS0FBSyxNQUFMLENBQVksQ0FBWixDQUFQO0FBQ3BDO0FBQ0QsS0EvQmM7QUFnQ2YsZ0JBQVksb0JBQVMsR0FBVCxFQUFjO0FBQ3RCLFlBQUksRUFBRSxRQUFGLENBQVcsR0FBWCxDQUFKLEVBQXFCLE9BQU8sS0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQVA7O0FBRWxCLFlBQUksRUFBRSxRQUFGLENBQVcsR0FBWCxDQUFKLEVBQXFCLE9BQU8sS0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQVA7O0FBRXJCLFlBQUksRUFBRSxTQUFGLENBQVksR0FBWixDQUFKLEVBQXNCLE9BQU8sS0FBSyxVQUFMLENBQWdCLE1BQWhCLENBQVA7O0FBRXRCLFlBQUksRUFBRSxPQUFGLENBQVUsR0FBVixDQUFKLEVBQW9CLE9BQU8sS0FBSyxVQUFMLENBQWdCLE9BQWhCLENBQVA7O0FBRXBCLFlBQUksRUFBRSxNQUFGLENBQVMsR0FBVCxDQUFKLEVBQW1CLE9BQU8sS0FBSyxVQUFMLENBQWdCLE1BQWhCLENBQVA7O0FBRW5CLFlBQUksRUFBRSxRQUFGLENBQVcsR0FBWCxDQUFKLEVBQXFCLE9BQU8sS0FBSyxVQUFMLENBQWdCLE9BQWhCLENBQVA7O0FBRXJCLFlBQUksRUFBRSxhQUFGLENBQWdCLEdBQWhCLENBQUosRUFBMEIsT0FBTyxLQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsQ0FBUDs7QUFFMUIsWUFBSSxFQUFFLFFBQUYsQ0FBVyxHQUFYLENBQUosRUFBcUIsT0FBTyxLQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsQ0FBUDs7QUFFckIsY0FBTSxNQUFNLHNCQUFOLENBQU47QUFDTjtBQWxEYyxDQUFoQjs7QUFxREEsT0FBTyxPQUFQLEdBQWlCLGVBQWpCIiwiZmlsZSI6IlNlbGVjdG9yTWF0Y2hlci5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBMb2dnZXIgPSByZXF1aXJlKFwianN3LWxvZ2dlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKTtcbiAgICBcbnZhciBsb2dnZXIgPSBudWxsO1xuXG5jbGFzcyBTZWxlY3Rvck1hdGNoZXIge1xuXHRjb25zdHJ1Y3RvcihzZWxlY3Rvcikge1xuICAgICAgICB0aGlzLmNsYXVzZXMgPSBzZWxlY3Rvci5jbGF1c2VzO1xuXG4gICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcblx0fVxuXHRcblx0dGVzdChkb2N1bWVudCkge1xuXHRcdGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIFNlbGVjdG9yTWF0Y2hlci0+dGVzdCcpO1xuXHRcdFxuXHRcdHZhciBfbWF0Y2ggPSB0cnVlO1xuXG5cdFx0aWYgKF8uaXNOaWwoZG9jdW1lbnQpKSB7XG5cdFx0XHRsb2dnZXIuZGVidWcoJ2RvY3VtZW50IC0+IG51bGwnKTtcblx0XHRcdFxuXHRcdFx0bG9nZ2VyLnRocm93KFwiUGFyYW1ldGVyICdkb2N1bWVudCcgcmVxdWlyZWRcIik7XG5cdFx0fVxuXHRcdFxuXHRcdGxvZ2dlci5kZWJ1ZygnZG9jdW1lbnQgLT4gbm90IG51bGwnKTtcblx0XHRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2xhdXNlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGNsYXVzZSA9IHRoaXMuY2xhdXNlc1tpXTtcblx0XHRcdFxuXHRcdFx0aWYgKGNsYXVzZS5raW5kID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlIC0+IGZ1bmN0aW9uJyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRfbWF0Y2ggPSBjbGF1c2UudmFsdWUuY2FsbChudWxsLCBkb2N1bWVudCk7XG5cdFx0XHR9IGVsc2UgaWYgKGNsYXVzZS5raW5kID09PSAncGxhaW4nKSB7XG5cdFx0XHRcdGxvZ2dlci5kZWJ1ZyhgY2xhdXNlIC0+IHBsYWluIG9uIGZpZWxkIFwiJHtjbGF1c2Uua2V5fVwiIGFuZCB2YWx1ZSA9ICR7SlNPTi5zdHJpbmdpZnkoY2xhdXNlLnZhbHVlKX1gKTtcblx0XHRcdFx0XG5cdFx0XHRcdF9tYXRjaCA9IF90ZXN0Q2xhdXNlKGNsYXVzZSwgZG9jdW1lbnRbY2xhdXNlLmtleV0pO1xuXHRcdFx0XHRcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgcmVzdWx0IC0+ICcgKyBfbWF0Y2gpO1xuXHRcdFx0fSBlbHNlIGlmIChjbGF1c2Uua2luZCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKGBjbGF1c2UgLT4gb2JqZWN0IG9uIGZpZWxkIFwiJHtjbGF1c2Uua2V5LmpvaW4oJy4nKX1cIiBhbmQgdmFsdWUgPSAke0pTT04uc3RyaW5naWZ5KGNsYXVzZS52YWx1ZSl9YCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRfbWF0Y2ggPSBfdGVzdE9iamVjdENsYXVzZShjbGF1c2UsIGRvY3VtZW50LCBfLmNsb25lKGNsYXVzZS5rZXkpLnJldmVyc2UoKSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZSByZXN1bHQgLT4gJyArIF9tYXRjaCk7XG5cdFx0XHR9IGVsc2UgaWYgKGNsYXVzZS5raW5kID09PSAnb3BlcmF0b3InKSB7XG5cdFx0XHQgICAgbG9nZ2VyLmRlYnVnKGBjbGF1c2UgLT4gb3BlcmF0b3IgJyR7Y2xhdXNlLmtleX0nYCk7XG5cdFx0XHQgICAgXG5cdFx0ICAgICAgICBsZXQgX21hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyKHsgY2xhdXNlczogY2xhdXNlLnZhbHVlIH0pO1xuXHRcdCAgICAgICAgXG5cdFx0ICAgICAgICBfbWF0Y2ggPSBfbWF0Y2hlci50ZXN0KGRvY3VtZW50KTtcblx0XHQgICAgICAgIFxuXHRcdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZSByZXN1bHQgLT4gJyArIF9tYXRjaCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC8vIElmIGFueSB0ZXN0IGNhc2UgZmFpbHMsIHRoZSBkb2N1bWVudCB3aWxsIG5vdCBtYXRjaFxuXHRcdFx0aWYgKF9tYXRjaCA9PT0gZmFsc2UgfHwgX21hdGNoID09PSAnZmFsc2UnKSB7XG5cdFx0XHRcdGxvZ2dlci5kZWJ1ZygndGhlIGRvY3VtZW50IGRvIG5vdCBtYXRjaGVzJyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8vIEV2ZXJ5dGhpbmcgbWF0Y2hlc1xuXHRcdGxvZ2dlci5kZWJ1ZygndGhlIGRvY3VtZW50IG1hdGNoZXMnKTtcblx0XHRcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRcblx0c3RhdGljIGFsbChhcnJheSwgdmFsdWUpIHtcbiAgICAgICAgLy8gJGFsbCBpcyBvbmx5IG1lYW5pbmdmdWwgb24gYXJyYXlzXG4gICAgICAgIGlmICghKGFycmF5IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUT0RPIHNob3VsZCB1c2UgYSBjYW5vbmljYWxpemluZyByZXByZXNlbnRhdGlvbiwgc28gdGhhdCB3ZVxuICAgICAgICAvLyBkb24ndCBnZXQgc2NyZXdlZCBieSBrZXkgb3JkZXJcbiAgICAgICAgdmFyIHBhcnRzID0ge307XG4gICAgICAgIHZhciByZW1haW5pbmcgPSAwO1xuXG4gICAgICAgIF8uZm9yRWFjaCh2YWx1ZSwgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFyIGhhc2ggPSBKU09OLnN0cmluZ2lmeSh2YWwpO1xuXG4gICAgICAgICAgICBpZiAoIShoYXNoIGluIHBhcnRzKSkge1xuICAgICAgICAgICAgICAgIHBhcnRzW2hhc2hdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZW1haW5pbmcrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGhhc2ggPSBKU09OLnN0cmluZ2lmeShhcnJheVtpXSk7XG4gICAgICAgICAgICBpZiAocGFydHNbaGFzaF0pIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcGFydHNbaGFzaF07XG4gICAgICAgICAgICAgICAgcmVtYWluaW5nLS07XG5cbiAgICAgICAgICAgICAgICBpZiAoMCA9PT0gcmVtYWluaW5nKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cdFxuXHRzdGF0aWMgaW4oYXJyYXksIHZhbHVlKSB7XG4gICAgICAgIGlmICghXy5pc09iamVjdChhcnJheSkpIHtcbiAgICAgICAgICAgIC8vIG9wdGltaXphdGlvbjogdXNlIHNjYWxhciBlcXVhbGl0eSAoZmFzdClcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJyYXkgPT09IHZhbHVlW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbm9wZSwgaGF2ZSB0byB1c2UgZGVlcCBlcXVhbGl0eVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChTZWxlY3Rvck1hdGNoZXIuZXF1YWwoYXJyYXksIHZhbHVlW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblx0XG5cdC8vIGRlZXAgZXF1YWxpdHkgdGVzdDogdXNlIGZvciBsaXRlcmFsIGRvY3VtZW50IGFuZCBhcnJheSBtYXRjaGVzXG5cdHN0YXRpYyBlcXVhbChhcnJheSwgcXZhbCkge1xuICAgICAgICB2YXIgbWF0Y2ggPSBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgLy8gc2NhbGFyc1xuICAgICAgICAgICAgaWYgKF8uaXNOdW1iZXIoYSkgfHwgXy5pc1N0cmluZyhhKSB8fCBfLmlzQm9vbGVhbihhKSB8fCBfLmlzTmlsKGEpKSByZXR1cm4gYSA9PT0gYjtcblxuICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihhKSkgcmV0dXJuIGZhbHNlOyAgLy8gTm90IGFsbG93ZWQgeWV0XG5cbiAgICAgICAgICAgIC8vIE9LLCB0eXBlb2YgYSA9PT0gJ29iamVjdCdcbiAgICAgICAgICAgIGlmICghXy5pc09iamVjdChiKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBhcnJheXNcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoYSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIV8uaXNBcnJheShiKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2goYVtpXSxiW2ldKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBvYmplY3RzXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgdmFyIHVubWF0Y2hlZF9iX2tleXMgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBiKVxuICAgICAgICAgICAgICAgIHVubWF0Y2hlZF9iX2tleXMrKztcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gYSkge1xuICAgICAgICAgICAgICAgIGlmICghKHggaW4gYikgfHwgIW1hdGNoKGFbeF0sIGJbeF0pKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgdW5tYXRjaGVkX2Jfa2V5cy0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHVubWF0Y2hlZF9iX2tleXMgPT09IDA7XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgLy8gRm9sbG93IE1vbmdvIGluIGNvbnNpZGVyaW5nIGtleSBvcmRlciB0byBiZSBwYXJ0IG9mXG4gICAgICAgICAgICAvLyBlcXVhbGl0eS4gS2V5IGVudW1lcmF0aW9uIG9yZGVyIGlzIGFjdHVhbGx5IG5vdCBkZWZpbmVkIGluXG4gICAgICAgICAgICAvLyB0aGUgZWNtYXNjcmlwdCBzcGVjIGJ1dCBpbiBwcmFjdGljZSBtb3N0IGltcGxlbWVudGF0aW9uc1xuICAgICAgICAgICAgLy8gcHJlc2VydmUgaXQuIChUaGUgZXhjZXB0aW9uIGlzIENocm9tZSwgd2hpY2ggcHJlc2VydmVzIGl0XG4gICAgICAgICAgICAvLyB1c3VhbGx5LCBidXQgbm90IGZvciBrZXlzIHRoYXQgcGFyc2UgYXMgaW50cy4pXG4gICAgICAgICAgICB2YXIgYl9rZXlzID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGFycmF5IGluIGIpIHtcbiAgICAgICAgICAgICAgICBiX2tleXMucHVzaChiW2FycmF5XSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IGFycmF5IGluIGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoaSA+PSBiX2tleXMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKGFbYXJyYXldLCBiX2tleXNbaV0pKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaSAhPT0gYl9rZXlzLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbWF0Y2goYXJyYXksIHF2YWwpO1xuICAgIH1cblx0XG5cdC8vIGlmIHggaXMgbm90IGFuIGFycmF5LCB0cnVlIGlmZiBmKHgpIGlzIHRydWUuIGlmIHggaXMgYW4gYXJyYXksXG4gICAgLy8gdHJ1ZSBpZmYgZih5KSBpcyB0cnVlIGZvciBhbnkgeSBpbiB4LlxuICAgIC8vXG4gICAgLy8gdGhpcyBpcyB0aGUgd2F5IG1vc3QgbW9uZ28gb3BlcmF0b3JzIChsaWtlICRndCwgJG1vZCwgJHR5cGUuLilcbiAgICAvLyB0cmVhdCB0aGVpciBhcmd1bWVudHMuXG4gICAgc3RhdGljIG1hdGNoZXModmFsdWUsIGZ1bmMpIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoZnVuYyh2YWx1ZVtpXSkpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZnVuYyh2YWx1ZSk7XG4gICAgfVxuXHRcblx0Ly8gbGlrZSBfbWF0Y2hlcywgYnV0IGlmIHggaXMgYW4gYXJyYXksIGl0J3MgdHJ1ZSBub3Qgb25seSBpZiBmKHkpXG4gICAgLy8gaXMgdHJ1ZSBmb3Igc29tZSB5IGluIHgsIGJ1dCBhbHNvIGlmIGYoeCkgaXMgdHJ1ZS5cbiAgICAvL1xuICAgIC8vIHRoaXMgaXMgdGhlIHdheSBtb25nbyB2YWx1ZSBjb21wYXJpc29ucyB1c3VhbGx5IHdvcmssIGxpa2Uge3g6XG4gICAgLy8gNH0sIHt4OiBbNF19LCBvciB7eDogeyRpbjogWzEsMiwzXX19LlxuICAgIHN0YXRpYyBtYXRjaGVzX3BsdXModmFsdWUsIGZ1bmMpIHtcbiAgICAgICAgLy8gaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgLy8gICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gICAgICAgICBpZiAoZnVuYyh2YWx1ZVtpXSkpIHJldHVybiB0cnVlO1xuICAgICAgICAvLyAgICAgfVxuXG4gICAgICAgIC8vICAgICAvLyBmYWxsIHRocm91Z2ghXG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyByZXR1cm4gZnVuYyh2YWx1ZSk7XG4gICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIubWF0Y2hlcyh2YWx1ZSwgZnVuYykgfHwgZnVuYyh2YWx1ZSk7XG4gICAgfVxuXHRcblx0Ly8gY29tcGFyZSB0d28gdmFsdWVzIG9mIHVua25vd24gdHlwZSBhY2NvcmRpbmcgdG8gQlNPTiBvcmRlcmluZ1xuICAgIC8vIHNlbWFudGljcy4gKGFzIGFuIGV4dGVuc2lvbiwgY29uc2lkZXIgJ3VuZGVmaW5lZCcgdG8gYmUgbGVzcyB0aGFuXG4gICAgLy8gYW55IG90aGVyIHZhbHVlLilcbiAgICAvLyByZXR1cm4gbmVnYXRpdmUgaWYgYSBpcyBsZXNzLCBwb3NpdGl2ZSBpZiBiIGlzIGxlc3MsIG9yIDAgaWYgZXF1YWxcbiAgICBzdGF0aWMgY21wKGEsIGIpIHtcbiAgICAgICAgaWYgKF8uaXNVbmRlZmluZWQoYSkpIHJldHVybiBiID09PSB1bmRlZmluZWQgPyAwIDogLTE7XG5cbiAgICAgICAgaWYgKF8uaXNVbmRlZmluZWQoYikpIHJldHVybiAxO1xuXHRcdFxuICAgICAgICB2YXIgYVR5cGUgPSBCc29uVHlwZXMuZ2V0QnlWYWx1ZShhKTtcbiAgICAgICAgdmFyIGJUeXBlID0gQnNvblR5cGVzLmdldEJ5VmFsdWUoYik7XG5cbiAgICAgICAgaWYgKGFUeXBlLm9yZGVyICE9PSBiVHlwZS5vcmRlcikgcmV0dXJuIGFUeXBlLm9yZGVyIDwgYlR5cGUub3JkZXIgPyAtMSA6IDE7XG5cbiAgICAgICAgLy8gU2FtZSBzb3J0IG9yZGVyLCBidXQgZGlzdGluY3QgdmFsdWUgdHlwZVxuICAgICAgICBpZiAoYVR5cGUubnVtYmVyICE9PSBiVHlwZS5udW1iZXIpIHtcbiAgICAgICAgICAgIC8vIEN1cnJlbnRseSwgU3ltYm9scyBjYW4gbm90IGJlIHNvcnRlcmVkIGluIEpTLCBzbyB3ZSBhcmUgc2V0dGluZyB0aGUgU3ltYm9sIGFzIGdyZWF0ZXJcbiAgICAgICAgICAgIGlmIChfLmlzU3ltYm9sKGEpKSByZXR1cm4gMTtcbiAgICAgICAgICAgIGlmIChfLmlzU3ltYm9sKGIpKSByZXR1cm4gLTE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRPRE8gSW50ZWdlciwgRGF0ZSBhbmQgVGltZXN0YW1wXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTnVtYmVyKGEpKSByZXR1cm4gYSAtIGI7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1N0cmluZyhhKSkgcmV0dXJuIGEgPCBiID8gLTEgOiAoYSA9PT0gYiA/IDAgOiAxKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQm9vbGVhbihhKSkge1xuICAgICAgICAgICAgaWYgKGEpIHJldHVybiBiID8gMCA6IDE7XG5cbiAgICAgICAgICAgIHJldHVybiBiID8gLTEgOiAwO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0FycmF5KGEpKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PT0gYS5sZW5ndGgpIHJldHVybiAoaSA9PT0gYi5sZW5ndGgpID8gMCA6IC0xO1xuXG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IGIubGVuZ3RoKSByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gYS5sZW5ndGggLSBiLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIHZhciBzID0gU2VsZWN0b3JNYXRjaGVyLmNtcChhW2ldLCBiW2ldKTtcblxuICAgICAgICAgICAgICAgIGlmIChzICE9PSAwKSByZXR1cm4gcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOdWxsKGEpKSByZXR1cm4gMDtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzUmVnRXhwKGEpKSB0aHJvdyBFcnJvcihcIlNvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiByZWd1bGFyIGV4cHJlc3Npb25cIik7IC8vIFRPRE9cbiAgICAgICAgXG4gICAgICAgIC8vIGlmIChfLmlzRnVuY3Rpb24oYSkpIHJldHVybiB7dHlwZTogMTMsIG9yZGVyOiAxMDAsIGZuYzogXy5pc0Z1bmN0aW9ufTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzUGxhaW5PYmplY3QoYSkpIHtcbiAgICAgICAgICAgIHZhciB0b19hcnJheSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKG9ialtrZXldKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5jbXAodG9fYXJyYXkoYSksIHRvX2FycmF5KGIpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRvdWJsZVxuICAgICAgICAvLyBpZiAodGEgPT09IDEpICByZXR1cm4gYSAtIGI7XG5cbiAgICAgICAgLy8gc3RyaW5nXG4gICAgICAgIC8vIGlmICh0YiA9PT0gMikgcmV0dXJuIGEgPCBiID8gLTEgOiAoYSA9PT0gYiA/IDAgOiAxKTtcblxuICAgICAgICAvLyBPYmplY3RcbiAgICAgICAgLy8gaWYgKHRhID09PSAzKSB7XG4gICAgICAgIC8vICAgICAvLyB0aGlzIGNvdWxkIGJlIG11Y2ggbW9yZSBlZmZpY2llbnQgaW4gdGhlIGV4cGVjdGVkIGNhc2UgLi4uXG4gICAgICAgIC8vICAgICB2YXIgdG9fYXJyYXkgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIC8vICAgICAgICAgdmFyIHJldCA9IFtdO1xuXG4gICAgICAgIC8vICAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAvLyAgICAgICAgICAgICByZXQucHVzaChrZXkpO1xuICAgICAgICAvLyAgICAgICAgICAgICByZXQucHVzaChvYmpba2V5XSk7XG4gICAgICAgIC8vICAgICAgICAgfVxuXG4gICAgICAgIC8vICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgLy8gICAgIH07XG5cbiAgICAgICAgLy8gICAgIHJldHVybiBTZWxlY3Rvci5fZi5fY21wKHRvX2FycmF5KGEpLCB0b19hcnJheShiKSk7XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyBBcnJheVxuICAgICAgICAvLyBpZiAodGEgPT09IDQpIHtcbiAgICAgICAgLy8gICAgIGZvciAodmFyIGkgPSAwOyA7IGkrKykge1xuICAgICAgICAvLyAgICAgICAgIGlmIChpID09PSBhLmxlbmd0aCkgcmV0dXJuIChpID09PSBiLmxlbmd0aCkgPyAwIDogLTE7XG5cbiAgICAgICAgLy8gICAgICAgICBpZiAoaSA9PT0gYi5sZW5ndGgpIHJldHVybiAxO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAvLyAgICAgICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xuXG4gICAgICAgIC8vICAgICAgICAgdmFyIHMgPSBTZWxlY3Rvci5fZi5fY21wKGFbaV0sIGJbaV0pO1xuXG4gICAgICAgIC8vICAgICAgICAgaWYgKHMgIT09IDApIHJldHVybiBzO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gNTogYmluYXJ5IGRhdGFcbiAgICAgICAgLy8gNzogb2JqZWN0IGlkXG5cbiAgICAgICAgLy8gYm9vbGVhblxuICAgICAgICAvLyBpZiAodGEgPT09IDgpIHtcbiAgICAgICAgLy8gICAgIGlmIChhKSByZXR1cm4gYiA/IDAgOiAxO1xuXG4gICAgICAgIC8vICAgICByZXR1cm4gYiA/IC0xIDogMDtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIDk6IGRhdGVcblxuICAgICAgICAvLyBudWxsXG4gICAgICAgIC8vIGlmICh0YSA9PT0gMTApIHJldHVybiAwO1xuXG4gICAgICAgIC8vIHJlZ2V4cFxuICAgICAgICAvLyBpZiAodGEgPT09IDExKSB7XG4gICAgICAgIC8vICAgICB0aHJvdyBFcnJvcihcIlNvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiByZWd1bGFyIGV4cHJlc3Npb25cIik7IC8vIFRPRE9cbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIDEzOiBqYXZhc2NyaXB0IGNvZGVcbiAgICAgICAgLy8gMTQ6IHN5bWJvbFxuICAgICAgICBpZiAoXy5pc1N5bWJvbChhKSkge1xuICAgICAgICAgICAgLy8gQ3VycmVudGx5LCBTeW1ib2xzIGNhbiBub3QgYmUgc29ydGVyZWQgaW4gSlMsIHNvIHdlIGFyZSByZXR1cm5pbmcgYW4gZXF1YWxpdHlcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIC8vIDE1OiBqYXZhc2NyaXB0IGNvZGUgd2l0aCBzY29wZVxuICAgICAgICAvLyAxNjogMzItYml0IGludGVnZXJcbiAgICAgICAgLy8gMTc6IHRpbWVzdGFtcFxuICAgICAgICAvLyAxODogNjQtYml0IGludGVnZXJcbiAgICAgICAgLy8gMjU1OiBtaW5rZXlcbiAgICAgICAgLy8gMTI3OiBtYXhrZXlcblxuICAgICAgICAvLyBqYXZhc2NyaXB0IGNvZGVcbiAgICAgICAgLy8gaWYgKHRhID09PSAxMykge1xuICAgICAgICAvLyAgICAgdGhyb3cgRXJyb3IoXCJTb3J0aW5nIG5vdCBzdXBwb3J0ZWQgb24gSmF2YXNjcmlwdCBjb2RlXCIpOyAvLyBUT0RPXG4gICAgICAgIC8vIH1cbiAgICB9XG59XG5cbnZhciBfdGVzdENsYXVzZSA9IGZ1bmN0aW9uKGNsYXVzZSwgdmFsKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdDYWxsZWQgX3Rlc3RDbGF1c2UnKTtcbiAgICBcbiAgICAvLyB2YXIgX3ZhbCA9IGNsYXVzZS52YWx1ZTtcbiAgICBcbiAgICAvLyBpZiBSZWdFeHAgfHwgJCAtPiBPcGVyYXRvclxuICAgIFxuICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIubWF0Y2hlc19wbHVzKHZhbCwgZnVuY3Rpb24oX3ZhbHVlKSB7XG4gICAgICAgIC8vIFRPRE8gb2JqZWN0IGlkcywgZGF0ZXMsIHRpbWVzdGFtcHM/XG4gICAgICAgIHN3aXRjaCAoY2xhdXNlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ251bGwnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBOdWxsIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvUXVlcnlpbmcrYW5kK251bGxzXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNOaWwoX3ZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncmVnZXhwJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgUmVnRXhwIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIF90ZXN0T3BlcmF0b3JDbGF1c2UoY2xhdXNlLCBfdmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnbGl0ZXJhbF9vYmplY3QnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBMaXRlcmFsIE9iamVjdCBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuZXF1YWwoX3ZhbHVlLCBjbGF1c2UudmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnb3BlcmF0b3Jfb2JqZWN0JzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgT3BlcmF0b3IgT2JqZWN0IGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIF90ZXN0T3BlcmF0b3JDbGF1c2UoY2xhdXNlLCBfdmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgU3RyaW5nIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIF8udG9TdHJpbmcoX3ZhbHVlKSA9PT0gXy50b1N0cmluZyhjbGF1c2UudmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgTnVtYmVyIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIF8udG9OdW1iZXIoX3ZhbHVlKSA9PT0gXy50b051bWJlcihjbGF1c2UudmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IEJvb2xlYW4gZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gKF8uaXNCb29sZWFuKF92YWx1ZSkgJiYgXy5pc0Jvb2xlYW4oY2xhdXNlLnZhbHVlKSAmJiAoX3ZhbHVlID09PSBjbGF1c2UudmFsdWUpKTtcbiAgICAgICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgQm9vbGVhbiBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIHR5cGVcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KF92YWx1ZSkgJiYgXy5pc0FycmF5KGNsYXVzZS52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgbGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIGlmIChfdmFsdWUubGVuZ3RoID09PSBjbGF1c2UudmFsdWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpdGVtc1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xhdXNlLnZhbHVlLmluZGV4T2YoX3ZhbHVlW2ldKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBGdW5jdGlvbiBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHZhbHVlIHR5cGUgaW4gcXVlcnlcIik7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHZhbHVlIHR5cGUgaW4gcXVlcnlcIik7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbnZhciBfdGVzdE9iamVjdENsYXVzZSA9IGZ1bmN0aW9uKGNsYXVzZSwgZG9jLCBrZXkpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZCBfdGVzdE9iamVjdENsYXVzZScpO1xuICAgIFxuICAgIHZhciB2YWwgPSBudWxsO1xuICAgIFxuICAgIGlmIChrZXkubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgcGF0aCA9IGtleS5wb3AoKTtcbiAgICAgICAgdmFsID0gZG9jW3BhdGhdO1xuICAgICAgICBcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjaGVjayBvbiBmaWVsZCAnICsgcGF0aCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUT0RPIGFkZCBfLmlzTnVtYmVyKHZhbCkgYW5kIHRyZWF0IGl0IGFzIGFuIGFycmF5XG4gICAgICAgIGlmICh2YWwpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2codmFsKTtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnZ29pbmcgZGVlcGVyJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBfdGVzdE9iamVjdENsYXVzZShjbGF1c2UsIHZhbCwga2V5KTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnbG93ZXN0IHBhdGg6ICcgKyBwYXRoKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBfdGVzdENsYXVzZShjbGF1c2UsIGRvYyk7XG4gICAgfVxufTtcblxudmFyIF90ZXN0T3BlcmF0b3JDbGF1c2UgPSBmdW5jdGlvbihjbGF1c2UsIHZhbHVlKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdDYWxsZWQgX3Rlc3RPcGVyYXRvckNsYXVzZScpO1xuICAgIFxuICAgIGZvciAodmFyIGtleSBpbiBjbGF1c2UudmFsdWUpIHtcbiAgICAgICAgaWYgKCFfdGVzdE9wZXJhdG9yQ29uc3RyYWludChrZXksIGNsYXVzZS52YWx1ZVtrZXldLCBjbGF1c2UudmFsdWUsIHZhbHVlLCBjbGF1c2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG52YXIgX3Rlc3RPcGVyYXRvckNvbnN0cmFpbnQgPSBmdW5jdGlvbiAoa2V5LCBvcGVyYXRvclZhbHVlLCBjbGF1c2VWYWx1ZSwgZG9jVmFsLCBjbGF1c2UpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZCBfdGVzdE9wZXJhdG9yQ29uc3RyYWludCcpO1xuICAgIFxuICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgIC8vIENvbXBhcmlzb24gUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIGNhc2UgJyRndCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGd0Jyk7XG5cbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuY21wKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSkgPiAwO1xuICAgICAgICBjYXNlICckbHQnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRsdCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpIDwgMDtcbiAgICAgICAgY2FzZSAnJGd0ZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGd0ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpID49IDA7XG4gICAgICAgIGNhc2UgJyRsdGUnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRsdGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5jbXAoZG9jVmFsLCBvcGVyYXRvclZhbHVlKSA8PSAwO1xuICAgICAgICBjYXNlICckZXEnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRlcScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmVxdWFsKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSk7XG4gICAgICAgIGNhc2UgJyRuZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG5lJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiAhU2VsZWN0b3JNYXRjaGVyLmVxdWFsKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSk7XG4gICAgICAgIGNhc2UgJyRpbic6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGluJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuaW4oZG9jVmFsLCBvcGVyYXRvclZhbHVlKTtcbiAgICAgICAgY2FzZSAnJG5pbic6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG5pbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gIVNlbGVjdG9yTWF0Y2hlci5pbihkb2NWYWwsIG9wZXJhdG9yVmFsdWUpO1xuICAgICAgICAvLyBMb2dpY2FsIFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICBjYXNlICckbm90JzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbm90Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vICRvciwgJGFuZCwgJG5vciBhcmUgaW4gdGhlICdvcGVyYXRvcicga2luZCB0cmVhdG1lbnRcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICB2YXIgX2NsYXVzZSA9IHtcbiAgICAgICAgICAgICAgICBraW5kOiAncGxhaW4nLFxuICAgICAgICAgICAgICAgIGtleTogY2xhdXNlLmtleSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogb3BlcmF0b3JWYWx1ZSxcbiAgICAgICAgICAgICAgICB0eXBlOiBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgX3BhcmVudCA9IGNsYXVzZS52YWx1ZTtcbiAgICAgICAgICAgIHZhciBfa2V5ID0gXG4gICAgICAgICAgICByZXR1cm4gIShfdGVzdENsYXVzZShfY2xhdXNlLCBkb2NWYWwpKTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkbm90IHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgIC8vIEVsZW1lbnQgUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIGNhc2UgJyRleGlzdHMnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRleGlzdHMnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIG9wZXJhdG9yVmFsdWUgPyAhXy5pc1VuZGVmaW5lZChkb2NWYWwpIDogXy5pc1VuZGVmaW5lZChkb2NWYWwpO1xuICAgICAgICBjYXNlICckdHlwZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHR5cGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gJHR5cGU6IDEgaXMgdHJ1ZSBmb3IgYW4gYXJyYXkgaWYgYW55IGVsZW1lbnQgaW4gdGhlIGFycmF5IGlzIG9mXG4gICAgICAgICAgICAvLyB0eXBlIDEuIGJ1dCBhbiBhcnJheSBkb2Vzbid0IGhhdmUgdHlwZSBhcnJheSB1bmxlc3MgaXQgY29udGFpbnNcbiAgICAgICAgICAgIC8vIGFuIGFycmF5Li5cbiAgICAgICAgICAgIC8vIHZhciBTZWxlY3Rvci5fZi5fdHlwZShkb2NWYWwpO1xuICAgICAgICAgICAgLy8gcmV0dXJuIFNlbGVjdG9yLl9mLl90eXBlKGRvY1ZhbCkudHlwZSA9PT0gb3BlcmF0b3JWYWx1ZTtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiJHR5cGUgdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgLy8gRXZhbHVhdGlvbiBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgY2FzZSAnJG1vZCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG1vZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZG9jVmFsICUgb3BlcmF0b3JWYWx1ZVswXSA9PT0gb3BlcmF0b3JWYWx1ZVsxXTtcbiAgICAgICAgY2FzZSAnJG9wdGlvbnMnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRvcHRpb25zIChpZ25vcmVkKScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZ25vcmUsIGFzIGl0IGlzIHRvIHRoZSBSZWdFeHBcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBjYXNlICckcmVnZXgnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRyZWdleCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgX29wdCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoXy5oYXNJbihjbGF1c2VWYWx1ZSwgJyRvcHRpb25zJykpIHtcbiAgICAgICAgICAgICAgICBfb3B0ID0gY2xhdXNlVmFsdWVbJyRvcHRpb25zJ107XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKC9beHNdLy50ZXN0KF9vcHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vZywgaSwgbSwgeCwgc1xuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPIG1vbmdvIHVzZXMgUENSRSBhbmQgc3VwcG9ydHMgc29tZSBhZGRpdGlvbmFsIGZsYWdzOiAneCcgYW5kXG4gICAgICAgICAgICAgICAgICAgIC8vICdzJy4gamF2YXNjcmlwdCBkb2Vzbid0IHN1cHBvcnQgdGhlbS4gc28gdGhpcyBpcyBhIGRpdmVyZ2VuY2VcbiAgICAgICAgICAgICAgICAgICAgLy8gYmV0d2VlbiBvdXIgYmVoYXZpb3IgYW5kIG1vbmdvJ3MgYmVoYXZpb3IuIGlkZWFsbHkgd2Ugd291bGRcbiAgICAgICAgICAgICAgICAgICAgLy8gaW1wbGVtZW50IHggYW5kIHMgYnkgdHJhbnNmb3JtaW5nIHRoZSByZWdleHAsIGJ1dCBub3QgdG9kYXkuLlxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJPbmx5IHRoZSBpLCBtLCBhbmQgZyByZWdleHAgb3B0aW9ucyBhcmUgc3VwcG9ydGVkXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmV2aWV3IGZsYWdzIC0+IGcgJiBtXG4gICAgICAgICAgICB2YXIgcmVnZXhwID0gb3BlcmF0b3JWYWx1ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNSZWdFeHAocmVnZXhwKSAmJiBfLmlzTmlsKF9vcHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlZ2V4cC50ZXN0KGRvY1ZhbCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNOaWwoX29wdCkpIHtcbiAgICAgICAgICAgICAgICByZWdleHAgPSBuZXcgUmVnRXhwKHJlZ2V4cCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNSZWdFeHAocmVnZXhwKSkge1xuICAgICAgICAgICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwLnNvdXJjZSwgX29wdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwLCBfb3B0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHJlZ2V4cC50ZXN0KGRvY1ZhbCk7XG4gICAgICAgIGNhc2UgJyR0ZXh0JzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkdGV4dCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkdGV4dCB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICBjYXNlICckd2hlcmUnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICR3aGVyZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkd2hlcmUgdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgLy8gR2Vvc3BhdGlhbCBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgLy8gVE9ETyAtPiBpbiBvcGVyYXRvciBraW5kXG4gICAgICAgIC8vIFF1ZXJ5IE9wZXJhdG9yIEFycmF5XG4gICAgICAgIGNhc2UgJyRhbGwnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRhbGwnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5hbGwob3BlcmF0b3JWYWx1ZSwgZG9jVmFsKSA+IDA7XG4gICAgICAgIGNhc2UgJyRlbGVtTWF0Y2gnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRlbGVtTWF0Y2gnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVE9ETyBpbXBsZW1lbnRcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiJGVsZW1NYXRjaCB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICBjYXNlICckc2l6ZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHNpemUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIF8uaXNBcnJheShkb2NWYWwpICYmIGRvY1ZhbC5sZW5ndGggPT09IG9wZXJhdG9yVmFsdWU7XG4gICAgICAgIC8vIEJpdHdpc2UgUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIC8vIFRPRE9cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAnICsga2V5KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJVbnJlY29nbml6ZWQga2V5IGluIHNlbGVjdG9yOiBcIiArIGtleSk7XG4gICAgfVxufTtcblxudmFyIEJzb25UeXBlcyA9IHtcblx0X3R5cGVzOiBbXG5cdFx0eyBhbGlhczogJ21pbktleScsIG51bWJlcjogLTEsIG9yZGVyOiAxLCBpc1R5cGU6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnbnVsbCcsIG51bWJlcjogMTAsIG9yZGVyOiAyLCBpc1R5cGU6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnaW50JywgbnVtYmVyOiAxNiwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc0ludGVnZXIgfSxcblx0XHR7IGFsaWFzOiAnbG9uZycsIG51bWJlcjogMTgsIG9yZGVyOiAzLCBpc1R5cGU6IF8uaXNOdW1iZXIgfSxcblx0XHR7IGFsaWFzOiAnZG91YmxlJywgbnVtYmVyOiAxLCBvcmRlcjogMywgaXNUeXBlOiBfLmlzTnVtYmVyIH0sXG5cdFx0eyBhbGlhczogJ251bWJlcicsIG51bWJlcjogbnVsbCwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc051bWJlciB9LFxuXHRcdHsgYWxpYXM6ICdzdHJpbmcnLCBudW1iZXI6IDIsIG9yZGVyOiA0LCBpc1R5cGU6IF8uaXNTdHJpbmcgfSxcblx0XHR7IGFsaWFzOiAnc3ltYm9sJywgbnVtYmVyOiAxNCwgb3JkZXI6IDQsIGlzVHlwZTogXy5pc1N5bWJvbCB9LFxuXHRcdHsgYWxpYXM6ICdvYmplY3QnLCBudW1iZXI6IDMsIG9yZGVyOiA1LCBpc1R5cGU6IF8uaXNQbGFpbk9iamVjdCB9LFxuXHRcdHsgYWxpYXM6ICdhcnJheScsIG51bWJlcjogNCwgb3JkZXI6IDYsIGlzVHlwZTogXy5pc0FycmF5IH0sXG5cdFx0eyBhbGlhczogJ2JpbkRhdGEnLCBudW1iZXI6IDUsIG9yZGVyOiA3LCBpc1R5cGU6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnb2JqZWN0SWQnLCBudW1iZXI6IDcsIG9yZGVyOiA4LCBpc1R5cGVmbmM6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnYm9vbCcsIG51bWJlcjogOCwgb3JkZXI6IDksIGlzVHlwZTogXy5pc0Jvb2xlYW4gfSxcblx0XHR7IGFsaWFzOiAnZGF0ZScsIG51bWJlcjogOSwgb3JkZXI6IDEwLCBpc1R5cGVmbmM6IF8uaXNEYXRlIH0sICAgICAgICAgLy8gZm9ybWF0XG5cdFx0eyBhbGlhczogJ3RpbWVzdGFtcCcsIG51bWJlcjogMTcsIG9yZGVyOiAxMSwgaXNUeXBlOiBfLmlzRGF0ZSB9LCAgIC8vIGZvcm1hdFxuXHRcdHsgYWxpYXM6ICdyZWdleCcsIG51bWJlcjogMTEsIG9yZGVyOiAxMiwgaXNUeXBlOiBfLmlzUmVnRXhwIH0sXG5cdFx0eyBhbGlhczogJ21heEtleScsIG51bWJlcjogMTI3LCBvcmRlcjogMTMsIGlzVHlwZTogbnVsbCB9XG5cdFx0XG4vLyBcdFx0dW5kZWZpbmVkIDZcbi8vIFx0XHRkYlBvaW50ZXJcbi8vIFx0XHRqYXZhc2NyaXB0XG4vLyBcdFx0amF2YXNjcmlwdFdpdGhTY29wZVxuLy8gXHRcdGZ1bmN0aW9uXG5cdF0sXG5cdFxuXHRnZXRCeUFsaWFzOiBmdW5jdGlvbihhbGlhcykge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fdHlwZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmICh0aGlzLl90eXBlc1tpXS5hbGlhcyA9PT0gYWxpYXMpIHJldHVybiB0aGlzLl90eXBlc1tpXTtcblx0XHR9XG5cdH0sXG5cdGdldEJ5VmFsdWU6IGZ1bmN0aW9uKHZhbCkge1xuXHQgICAgaWYgKF8uaXNOdW1iZXIodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcImRvdWJsZVwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzU3RyaW5nKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJzdHJpbmdcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Jvb2xlYW4odmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcImJvb2xcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJhcnJheVwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTnVsbCh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwibnVsbFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzUmVnRXhwKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJyZWdleFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzUGxhaW5PYmplY3QodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcIm9iamVjdFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzU3ltYm9sKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJzeW1ib2xcIik7XG4gICAgICAgIFxuICAgICAgICB0aHJvdyBFcnJvcihcIlVuYWNjZXB0ZWQgQlNPTiB0eXBlXCIpO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yTWF0Y2hlcjsiXX0=
