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

            var _match = false;

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

                    _match = _testLogicalClause(clause, document, clause.key);

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

var _testLogicalClause = function _testLogicalClause(clause, doc, key) {
    var matches = null;

    for (var i = 0; i < clause.value.length; i++) {
        var _matcher = new SelectorMatcher({ clauses: [clause.value[i]] });

        switch (key) {
            case 'and':
                // True unless it has one that do not match
                if (_.isNil(matches)) matches = true;

                if (!_matcher.test(doc)) {
                    return false;
                }

                break;
            case 'or':
                // False unless it has one match at least
                if (_.isNil(matches)) matches = false;

                if (_matcher.test(doc)) {
                    return true;
                }

                break;
        }
    }

    return matches || false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9TZWxlY3Rvck1hdGNoZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSSxTQUFTLFFBQVEsWUFBUixDQUFiO0lBQ0ksSUFBSSxRQUFRLFFBQVIsQ0FEUjs7QUFHQSxJQUFJLFNBQVMsSUFBYjs7SUFFTSxlO0FBQ0wsNkJBQVksUUFBWixFQUFzQjtBQUFBOztBQUNmLGFBQUssT0FBTCxHQUFlLFNBQVMsT0FBeEI7O0FBRUEsaUJBQVMsT0FBTyxRQUFoQjtBQUNOOzs7OzZCQUVJLFEsRUFBVTtBQUNkLG1CQUFPLEtBQVAsQ0FBYSw4QkFBYjs7QUFFQSxnQkFBSSxTQUFTLEtBQWI7O0FBRUEsZ0JBQUksRUFBRSxLQUFGLENBQVEsUUFBUixDQUFKLEVBQXVCO0FBQ3RCLHVCQUFPLEtBQVAsQ0FBYSxrQkFBYjs7QUFFQSx1QkFBTyxLQUFQLENBQWEsK0JBQWI7QUFDQTs7QUFFRCxtQkFBTyxLQUFQLENBQWEsc0JBQWI7O0FBRUEsaUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxLQUFLLE9BQUwsQ0FBYSxNQUFqQyxFQUF5QyxHQUF6QyxFQUE4QztBQUM3QyxvQkFBSSxTQUFTLEtBQUssT0FBTCxDQUFhLENBQWIsQ0FBYjs7QUFFQSxvQkFBSSxPQUFPLElBQVAsS0FBZ0IsVUFBcEIsRUFBZ0M7QUFDL0IsMkJBQU8sS0FBUCxDQUFhLG9CQUFiOztBQUVBLDZCQUFTLE9BQU8sS0FBUCxDQUFhLElBQWIsQ0FBa0IsSUFBbEIsRUFBd0IsUUFBeEIsQ0FBVDtBQUNBLGlCQUpELE1BSU8sSUFBSSxPQUFPLElBQVAsS0FBZ0IsT0FBcEIsRUFBNkI7QUFDbkMsMkJBQU8sS0FBUCxpQ0FBMEMsT0FBTyxHQUFqRCx1QkFBcUUsS0FBSyxTQUFMLENBQWUsT0FBTyxLQUF0QixDQUFyRTs7QUFFQSw2QkFBUyxZQUFZLE1BQVosRUFBb0IsU0FBUyxPQUFPLEdBQWhCLENBQXBCLENBQVQ7O0FBRUEsMkJBQU8sS0FBUCxDQUFhLHNC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QixPQUFPLEtBQUssVUFBTCxDQUFnQixRQUFoQixDQUFQOztBQUVyQixjQUFNLE1BQU0sc0JBQU4sQ0FBTjtBQUNOO0FBbERjLENBQWhCOztBQXFEQSxPQUFPLE9BQVAsR0FBaUIsZUFBakIiLCJmaWxlIjoiU2VsZWN0b3JNYXRjaGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIExvZ2dlciA9IHJlcXVpcmUoXCJqc3ctbG9nZ2VyXCIpLFxuICAgIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpO1xuICAgIFxudmFyIGxvZ2dlciA9IG51bGw7XG5cbmNsYXNzIFNlbGVjdG9yTWF0Y2hlciB7XG5cdGNvbnN0cnVjdG9yKHNlbGVjdG9yKSB7XG4gICAgICAgIHRoaXMuY2xhdXNlcyA9IHNlbGVjdG9yLmNsYXVzZXM7XG5cbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuXHR9XG5cdFxuXHR0ZXN0KGRvY3VtZW50KSB7XG5cdFx0bG9nZ2VyLmRlYnVnKCdDYWxsZWQgU2VsZWN0b3JNYXRjaGVyLT50ZXN0Jyk7XG5cdFx0XG5cdFx0dmFyIF9tYXRjaCA9IGZhbHNlO1xuXG5cdFx0aWYgKF8uaXNOaWwoZG9jdW1lbnQpKSB7XG5cdFx0XHRsb2dnZXIuZGVidWcoJ2RvY3VtZW50IC0+IG51bGwnKTtcblx0XHRcdFxuXHRcdFx0bG9nZ2VyLnRocm93KFwiUGFyYW1ldGVyICdkb2N1bWVudCcgcmVxdWlyZWRcIik7XG5cdFx0fVxuXHRcdFxuXHRcdGxvZ2dlci5kZWJ1ZygnZG9jdW1lbnQgLT4gbm90IG51bGwnKTtcblx0XHRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2xhdXNlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGNsYXVzZSA9IHRoaXMuY2xhdXNlc1tpXTtcblx0XHRcdFxuXHRcdFx0aWYgKGNsYXVzZS5raW5kID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlIC0+IGZ1bmN0aW9uJyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRfbWF0Y2ggPSBjbGF1c2UudmFsdWUuY2FsbChudWxsLCBkb2N1bWVudCk7XG5cdFx0XHR9IGVsc2UgaWYgKGNsYXVzZS5raW5kID09PSAncGxhaW4nKSB7XG5cdFx0XHRcdGxvZ2dlci5kZWJ1ZyhgY2xhdXNlIC0+IHBsYWluIG9uIGZpZWxkIFwiJHtjbGF1c2Uua2V5fVwiIGFuZCB2YWx1ZSA9ICR7SlNPTi5zdHJpbmdpZnkoY2xhdXNlLnZhbHVlKX1gKTtcblx0XHRcdFx0XG5cdFx0XHRcdF9tYXRjaCA9IF90ZXN0Q2xhdXNlKGNsYXVzZSwgZG9jdW1lbnRbY2xhdXNlLmtleV0pO1xuXHRcdFx0XHRcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgcmVzdWx0IC0+ICcgKyBfbWF0Y2gpO1xuXHRcdFx0fSBlbHNlIGlmIChjbGF1c2Uua2luZCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKGBjbGF1c2UgLT4gb2JqZWN0IG9uIGZpZWxkIFwiJHtjbGF1c2Uua2V5LmpvaW4oJy4nKX1cIiBhbmQgdmFsdWUgPSAke0pTT04uc3RyaW5naWZ5KGNsYXVzZS52YWx1ZSl9YCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRfbWF0Y2ggPSBfdGVzdE9iamVjdENsYXVzZShjbGF1c2UsIGRvY3VtZW50LCBfLmNsb25lKGNsYXVzZS5rZXkpLnJldmVyc2UoKSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZSByZXN1bHQgLT4gJyArIF9tYXRjaCk7XG5cdFx0XHR9IGVsc2UgaWYgKGNsYXVzZS5raW5kID09PSAnb3BlcmF0b3InKSB7XG5cdFx0XHQgICAgbG9nZ2VyLmRlYnVnKGBjbGF1c2UgLT4gb3BlcmF0b3IgJyR7Y2xhdXNlLmtleX0nYCk7XG5cdFx0XHQgICAgXG5cdFx0XHQgICAgX21hdGNoID0gX3Rlc3RMb2dpY2FsQ2xhdXNlKGNsYXVzZSwgZG9jdW1lbnQsIGNsYXVzZS5rZXkpO1xuXHRcdCAgICAgICAgXG5cdFx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlIHJlc3VsdCAtPiAnICsgX21hdGNoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Ly8gSWYgYW55IHRlc3QgY2FzZSBmYWlscywgdGhlIGRvY3VtZW50IHdpbGwgbm90IG1hdGNoXG5cdFx0XHRpZiAoX21hdGNoID09PSBmYWxzZSB8fCBfbWF0Y2ggPT09ICdmYWxzZScpIHtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCd0aGUgZG9jdW1lbnQgZG8gbm90IG1hdGNoZXMnKTtcblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0Ly8gRXZlcnl0aGluZyBtYXRjaGVzXG5cdFx0bG9nZ2VyLmRlYnVnKCd0aGUgZG9jdW1lbnQgbWF0Y2hlcycpO1xuXHRcdFxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdFxuXHRzdGF0aWMgYWxsKGFycmF5LCB2YWx1ZSkge1xuICAgICAgICAvLyAkYWxsIGlzIG9ubHkgbWVhbmluZ2Z1bCBvbiBhcnJheXNcbiAgICAgICAgaWYgKCEoYXJyYXkgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE8gc2hvdWxkIHVzZSBhIGNhbm9uaWNhbGl6aW5nIHJlcHJlc2VudGF0aW9uLCBzbyB0aGF0IHdlXG4gICAgICAgIC8vIGRvbid0IGdldCBzY3Jld2VkIGJ5IGtleSBvcmRlclxuICAgICAgICB2YXIgcGFydHMgPSB7fTtcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IDA7XG5cbiAgICAgICAgXy5mb3JFYWNoKHZhbHVlLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YXIgaGFzaCA9IEpTT04uc3RyaW5naWZ5KHZhbCk7XG5cbiAgICAgICAgICAgIGlmICghKGhhc2ggaW4gcGFydHMpKSB7XG4gICAgICAgICAgICAgICAgcGFydHNbaGFzaF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlbWFpbmluZysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaGFzaCA9IEpTT04uc3RyaW5naWZ5KGFycmF5W2ldKTtcbiAgICAgICAgICAgIGlmIChwYXJ0c1toYXNoXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJ0c1toYXNoXTtcbiAgICAgICAgICAgICAgICByZW1haW5pbmctLTtcblxuICAgICAgICAgICAgICAgIGlmICgwID09PSByZW1haW5pbmcpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblx0XG5cdHN0YXRpYyBpbihhcnJheSwgdmFsdWUpIHtcbiAgICAgICAgaWYgKCFfLmlzT2JqZWN0KGFycmF5KSkge1xuICAgICAgICAgICAgLy8gb3B0aW1pemF0aW9uOiB1c2Ugc2NhbGFyIGVxdWFsaXR5IChmYXN0KVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChhcnJheSA9PT0gdmFsdWVbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBub3BlLCBoYXZlIHRvIHVzZSBkZWVwIGVxdWFsaXR5XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yTWF0Y2hlci5lcXVhbChhcnJheSwgdmFsdWVbaV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXHRcblx0Ly8gZGVlcCBlcXVhbGl0eSB0ZXN0OiB1c2UgZm9yIGxpdGVyYWwgZG9jdW1lbnQgYW5kIGFycmF5IG1hdGNoZXNcblx0c3RhdGljIGVxdWFsKGFycmF5LCBxdmFsKSB7XG4gICAgICAgIHZhciBtYXRjaCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAvLyBzY2FsYXJzXG4gICAgICAgICAgICBpZiAoXy5pc051bWJlcihhKSB8fCBfLmlzU3RyaW5nKGEpIHx8IF8uaXNCb29sZWFuKGEpIHx8IF8uaXNOaWwoYSkpIHJldHVybiBhID09PSBiO1xuXG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGEpKSByZXR1cm4gZmFsc2U7ICAvLyBOb3QgYWxsb3dlZCB5ZXRcblxuICAgICAgICAgICAgLy8gT0ssIHR5cGVvZiBhID09PSAnb2JqZWN0J1xuICAgICAgICAgICAgaWYgKCFfLmlzT2JqZWN0KGIpKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIGFycmF5c1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShhKSkge1xuICAgICAgICAgICAgICAgIGlmICghXy5pc0FycmF5KGIpKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRjaChhW2ldLGJbaV0pKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIG9iamVjdHNcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICB2YXIgdW5tYXRjaGVkX2Jfa2V5cyA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIGIpXG4gICAgICAgICAgICAgICAgdW5tYXRjaGVkX2Jfa2V5cysrO1xuICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBhKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoeCBpbiBiKSB8fCAhbWF0Y2goYVt4XSwgYlt4XSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB1bm1hdGNoZWRfYl9rZXlzLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdW5tYXRjaGVkX2Jfa2V5cyA9PT0gMDtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvLyBGb2xsb3cgTW9uZ28gaW4gY29uc2lkZXJpbmcga2V5IG9yZGVyIHRvIGJlIHBhcnQgb2ZcbiAgICAgICAgICAgIC8vIGVxdWFsaXR5LiBLZXkgZW51bWVyYXRpb24gb3JkZXIgaXMgYWN0dWFsbHkgbm90IGRlZmluZWQgaW5cbiAgICAgICAgICAgIC8vIHRoZSBlY21hc2NyaXB0IHNwZWMgYnV0IGluIHByYWN0aWNlIG1vc3QgaW1wbGVtZW50YXRpb25zXG4gICAgICAgICAgICAvLyBwcmVzZXJ2ZSBpdC4gKFRoZSBleGNlcHRpb24gaXMgQ2hyb21lLCB3aGljaCBwcmVzZXJ2ZXMgaXRcbiAgICAgICAgICAgIC8vIHVzdWFsbHksIGJ1dCBub3QgZm9yIGtleXMgdGhhdCBwYXJzZSBhcyBpbnRzLilcbiAgICAgICAgICAgIHZhciBiX2tleXMgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgYXJyYXkgaW4gYikge1xuICAgICAgICAgICAgICAgIGJfa2V5cy5wdXNoKGJbYXJyYXldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgYXJyYXkgaW4gYSkge1xuICAgICAgICAgICAgICAgIGlmIChpID49IGJfa2V5cy5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmICghbWF0Y2goYVthcnJheV0sIGJfa2V5c1tpXSkpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpICE9PSBiX2tleXMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBtYXRjaChhcnJheSwgcXZhbCk7XG4gICAgfVxuXHRcblx0Ly8gaWYgeCBpcyBub3QgYW4gYXJyYXksIHRydWUgaWZmIGYoeCkgaXMgdHJ1ZS4gaWYgeCBpcyBhbiBhcnJheSxcbiAgICAvLyB0cnVlIGlmZiBmKHkpIGlzIHRydWUgZm9yIGFueSB5IGluIHguXG4gICAgLy9cbiAgICAvLyB0aGlzIGlzIHRoZSB3YXkgbW9zdCBtb25nbyBvcGVyYXRvcnMgKGxpa2UgJGd0LCAkbW9kLCAkdHlwZS4uKVxuICAgIC8vIHRyZWF0IHRoZWlyIGFyZ3VtZW50cy5cbiAgICBzdGF0aWMgbWF0Y2hlcyh2YWx1ZSwgZnVuYykge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChmdW5jKHZhbHVlW2ldKSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmdW5jKHZhbHVlKTtcbiAgICB9XG5cdFxuXHQvLyBsaWtlIF9tYXRjaGVzLCBidXQgaWYgeCBpcyBhbiBhcnJheSwgaXQncyB0cnVlIG5vdCBvbmx5IGlmIGYoeSlcbiAgICAvLyBpcyB0cnVlIGZvciBzb21lIHkgaW4geCwgYnV0IGFsc28gaWYgZih4KSBpcyB0cnVlLlxuICAgIC8vXG4gICAgLy8gdGhpcyBpcyB0aGUgd2F5IG1vbmdvIHZhbHVlIGNvbXBhcmlzb25zIHVzdWFsbHkgd29yaywgbGlrZSB7eDpcbiAgICAvLyA0fSwge3g6IFs0XX0sIG9yIHt4OiB7JGluOiBbMSwyLDNdfX0uXG4gICAgc3RhdGljIG1hdGNoZXNfcGx1cyh2YWx1ZSwgZnVuYykge1xuICAgICAgICAvLyBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAvLyAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyAgICAgICAgIGlmIChmdW5jKHZhbHVlW2ldKSkgcmV0dXJuIHRydWU7XG4gICAgICAgIC8vICAgICB9XG5cbiAgICAgICAgLy8gICAgIC8vIGZhbGwgdGhyb3VnaCFcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIHJldHVybiBmdW5jKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5tYXRjaGVzKHZhbHVlLCBmdW5jKSB8fCBmdW5jKHZhbHVlKTtcbiAgICB9XG5cdFxuXHQvLyBjb21wYXJlIHR3byB2YWx1ZXMgb2YgdW5rbm93biB0eXBlIGFjY29yZGluZyB0byBCU09OIG9yZGVyaW5nXG4gICAgLy8gc2VtYW50aWNzLiAoYXMgYW4gZXh0ZW5zaW9uLCBjb25zaWRlciAndW5kZWZpbmVkJyB0byBiZSBsZXNzIHRoYW5cbiAgICAvLyBhbnkgb3RoZXIgdmFsdWUuKVxuICAgIC8vIHJldHVybiBuZWdhdGl2ZSBpZiBhIGlzIGxlc3MsIHBvc2l0aXZlIGlmIGIgaXMgbGVzcywgb3IgMCBpZiBlcXVhbFxuICAgIHN0YXRpYyBjbXAoYSwgYikge1xuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChhKSkgcmV0dXJuIGIgPT09IHVuZGVmaW5lZCA/IDAgOiAtMTtcblxuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChiKSkgcmV0dXJuIDE7XG5cdFx0XG4gICAgICAgIHZhciBhVHlwZSA9IEJzb25UeXBlcy5nZXRCeVZhbHVlKGEpO1xuICAgICAgICB2YXIgYlR5cGUgPSBCc29uVHlwZXMuZ2V0QnlWYWx1ZShiKTtcblxuICAgICAgICBpZiAoYVR5cGUub3JkZXIgIT09IGJUeXBlLm9yZGVyKSByZXR1cm4gYVR5cGUub3JkZXIgPCBiVHlwZS5vcmRlciA/IC0xIDogMTtcblxuICAgICAgICAvLyBTYW1lIHNvcnQgb3JkZXIsIGJ1dCBkaXN0aW5jdCB2YWx1ZSB0eXBlXG4gICAgICAgIGlmIChhVHlwZS5udW1iZXIgIT09IGJUeXBlLm51bWJlcikge1xuICAgICAgICAgICAgLy8gQ3VycmVudGx5LCBTeW1ib2xzIGNhbiBub3QgYmUgc29ydGVyZWQgaW4gSlMsIHNvIHdlIGFyZSBzZXR0aW5nIHRoZSBTeW1ib2wgYXMgZ3JlYXRlclxuICAgICAgICAgICAgaWYgKF8uaXNTeW1ib2woYSkpIHJldHVybiAxO1xuICAgICAgICAgICAgaWYgKF8uaXNTeW1ib2woYikpIHJldHVybiAtMTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVE9ETyBJbnRlZ2VyLCBEYXRlIGFuZCBUaW1lc3RhbXBcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOdW1iZXIoYSkpIHJldHVybiBhIC0gYjtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzU3RyaW5nKGEpKSByZXR1cm4gYSA8IGIgPyAtMSA6IChhID09PSBiID8gMCA6IDEpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNCb29sZWFuKGEpKSB7XG4gICAgICAgICAgICBpZiAoYSkgcmV0dXJuIGIgPyAwIDogMTtcblxuICAgICAgICAgICAgcmV0dXJuIGIgPyAtMSA6IDA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQXJyYXkoYSkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyA7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpID09PSBhLmxlbmd0aCkgcmV0dXJuIChpID09PSBiLmxlbmd0aCkgPyAwIDogLTE7XG5cbiAgICAgICAgICAgICAgICBpZiAoaSA9PT0gYi5sZW5ndGgpIHJldHVybiAxO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgdmFyIHMgPSBTZWxlY3Rvck1hdGNoZXIuY21wKGFbaV0sIGJbaV0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHMgIT09IDApIHJldHVybiBzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc051bGwoYSkpIHJldHVybiAwO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNSZWdFeHAoYSkpIHRocm93IEVycm9yKFwiU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIHJlZ3VsYXIgZXhwcmVzc2lvblwiKTsgLy8gVE9ET1xuICAgICAgICBcbiAgICAgICAgLy8gaWYgKF8uaXNGdW5jdGlvbihhKSkgcmV0dXJuIHt0eXBlOiAxMywgb3JkZXI6IDEwMCwgZm5jOiBfLmlzRnVuY3Rpb259O1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNQbGFpbk9iamVjdChhKSkge1xuICAgICAgICAgICAgdmFyIHRvX2FycmF5ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2gob2JqW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcCh0b19hcnJheShhKSwgdG9fYXJyYXkoYikpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZG91YmxlXG4gICAgICAgIC8vIGlmICh0YSA9PT0gMSkgIHJldHVybiBhIC0gYjtcblxuICAgICAgICAvLyBzdHJpbmdcbiAgICAgICAgLy8gaWYgKHRiID09PSAyKSByZXR1cm4gYSA8IGIgPyAtMSA6IChhID09PSBiID8gMCA6IDEpO1xuXG4gICAgICAgIC8vIE9iamVjdFxuICAgICAgICAvLyBpZiAodGEgPT09IDMpIHtcbiAgICAgICAgLy8gICAgIC8vIHRoaXMgY291bGQgYmUgbXVjaCBtb3JlIGVmZmljaWVudCBpbiB0aGUgZXhwZWN0ZWQgY2FzZSAuLi5cbiAgICAgICAgLy8gICAgIHZhciB0b19hcnJheSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgLy8gICAgICAgICB2YXIgcmV0ID0gW107XG5cbiAgICAgICAgLy8gICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIC8vICAgICAgICAgICAgIHJldC5wdXNoKGtleSk7XG4gICAgICAgIC8vICAgICAgICAgICAgIHJldC5wdXNoKG9ialtrZXldKTtcbiAgICAgICAgLy8gICAgICAgICB9XG5cbiAgICAgICAgLy8gICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAvLyAgICAgfTtcblxuICAgICAgICAvLyAgICAgcmV0dXJuIFNlbGVjdG9yLl9mLl9jbXAodG9fYXJyYXkoYSksIHRvX2FycmF5KGIpKTtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIEFycmF5XG4gICAgICAgIC8vIGlmICh0YSA9PT0gNCkge1xuICAgICAgICAvLyAgICAgZm9yICh2YXIgaSA9IDA7IDsgaSsrKSB7XG4gICAgICAgIC8vICAgICAgICAgaWYgKGkgPT09IGEubGVuZ3RoKSByZXR1cm4gKGkgPT09IGIubGVuZ3RoKSA/IDAgOiAtMTtcblxuICAgICAgICAvLyAgICAgICAgIGlmIChpID09PSBiLmxlbmd0aCkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIC8vICAgICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG5cbiAgICAgICAgLy8gICAgICAgICB2YXIgcyA9IFNlbGVjdG9yLl9mLl9jbXAoYVtpXSwgYltpXSk7XG5cbiAgICAgICAgLy8gICAgICAgICBpZiAocyAhPT0gMCkgcmV0dXJuIHM7XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyA1OiBiaW5hcnkgZGF0YVxuICAgICAgICAvLyA3OiBvYmplY3QgaWRcblxuICAgICAgICAvLyBib29sZWFuXG4gICAgICAgIC8vIGlmICh0YSA9PT0gOCkge1xuICAgICAgICAvLyAgICAgaWYgKGEpIHJldHVybiBiID8gMCA6IDE7XG5cbiAgICAgICAgLy8gICAgIHJldHVybiBiID8gLTEgOiAwO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gOTogZGF0ZVxuXG4gICAgICAgIC8vIG51bGxcbiAgICAgICAgLy8gaWYgKHRhID09PSAxMCkgcmV0dXJuIDA7XG5cbiAgICAgICAgLy8gcmVnZXhwXG4gICAgICAgIC8vIGlmICh0YSA9PT0gMTEpIHtcbiAgICAgICAgLy8gICAgIHRocm93IEVycm9yKFwiU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIHJlZ3VsYXIgZXhwcmVzc2lvblwiKTsgLy8gVE9ET1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gMTM6IGphdmFzY3JpcHQgY29kZVxuICAgICAgICAvLyAxNDogc3ltYm9sXG4gICAgICAgIGlmIChfLmlzU3ltYm9sKGEpKSB7XG4gICAgICAgICAgICAvLyBDdXJyZW50bHksIFN5bWJvbHMgY2FuIG5vdCBiZSBzb3J0ZXJlZCBpbiBKUywgc28gd2UgYXJlIHJldHVybmluZyBhbiBlcXVhbGl0eVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgLy8gMTU6IGphdmFzY3JpcHQgY29kZSB3aXRoIHNjb3BlXG4gICAgICAgIC8vIDE2OiAzMi1iaXQgaW50ZWdlclxuICAgICAgICAvLyAxNzogdGltZXN0YW1wXG4gICAgICAgIC8vIDE4OiA2NC1iaXQgaW50ZWdlclxuICAgICAgICAvLyAyNTU6IG1pbmtleVxuICAgICAgICAvLyAxMjc6IG1heGtleVxuXG4gICAgICAgIC8vIGphdmFzY3JpcHQgY29kZVxuICAgICAgICAvLyBpZiAodGEgPT09IDEzKSB7XG4gICAgICAgIC8vICAgICB0aHJvdyBFcnJvcihcIlNvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiBKYXZhc2NyaXB0IGNvZGVcIik7IC8vIFRPRE9cbiAgICAgICAgLy8gfVxuICAgIH1cbn1cblxudmFyIF90ZXN0Q2xhdXNlID0gZnVuY3Rpb24oY2xhdXNlLCB2YWwpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZCBfdGVzdENsYXVzZScpO1xuICAgIFxuICAgIC8vIHZhciBfdmFsID0gY2xhdXNlLnZhbHVlO1xuICAgIFxuICAgIC8vIGlmIFJlZ0V4cCB8fCAkIC0+IE9wZXJhdG9yXG4gICAgXG4gICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5tYXRjaGVzX3BsdXModmFsLCBmdW5jdGlvbihfdmFsdWUpIHtcbiAgICAgICAgLy8gVE9ETyBvYmplY3QgaWRzLCBkYXRlcywgdGltZXN0YW1wcz9cbiAgICAgICAgc3dpdGNoIChjbGF1c2UudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnbnVsbCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IE51bGwgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9RdWVyeWluZythbmQrbnVsbHNcbiAgICAgICAgICAgICAgICBpZiAoXy5pc05pbChfdmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdyZWdleHAnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBSZWdFeHAgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gX3Rlc3RPcGVyYXRvckNsYXVzZShjbGF1c2UsIF92YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdsaXRlcmFsX29iamVjdCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IExpdGVyYWwgT2JqZWN0IGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5lcXVhbChfdmFsdWUsIGNsYXVzZS52YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdvcGVyYXRvcl9vYmplY3QnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBPcGVyYXRvciBPYmplY3QgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gX3Rlc3RPcGVyYXRvckNsYXVzZShjbGF1c2UsIF92YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBTdHJpbmcgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gXy50b1N0cmluZyhfdmFsdWUpID09PSBfLnRvU3RyaW5nKGNsYXVzZS52YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBOdW1iZXIgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gXy50b051bWJlcihfdmFsdWUpID09PSBfLnRvTnVtYmVyKGNsYXVzZS52YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgQm9vbGVhbiBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiAoXy5pc0Jvb2xlYW4oX3ZhbHVlKSAmJiBfLmlzQm9vbGVhbihjbGF1c2UudmFsdWUpICYmIChfdmFsdWUgPT09IGNsYXVzZS52YWx1ZSkpO1xuICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBCb29sZWFuIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgdHlwZVxuICAgICAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoX3ZhbHVlKSAmJiBfLmlzQXJyYXkoY2xhdXNlLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBsZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgaWYgKF92YWx1ZS5sZW5ndGggPT09IGNsYXVzZS52YWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGl0ZW1zXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF92YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGF1c2UudmFsdWUuaW5kZXhPZihfdmFsdWVbaV0pID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IEZ1bmN0aW9uIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgdmFsdWUgdHlwZSBpbiBxdWVyeVwiKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgdmFsdWUgdHlwZSBpbiBxdWVyeVwiKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxudmFyIF90ZXN0T2JqZWN0Q2xhdXNlID0gZnVuY3Rpb24oY2xhdXNlLCBkb2MsIGtleSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIF90ZXN0T2JqZWN0Q2xhdXNlJyk7XG4gICAgXG4gICAgdmFyIHZhbCA9IG51bGw7XG4gICAgXG4gICAgaWYgKGtleS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBwYXRoID0ga2V5LnBvcCgpO1xuICAgICAgICB2YWwgPSBkb2NbcGF0aF07XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIuZGVidWcoJ2NoZWNrIG9uIGZpZWxkICcgKyBwYXRoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRPRE8gYWRkIF8uaXNOdW1iZXIodmFsKSBhbmQgdHJlYXQgaXQgYXMgYW4gYXJyYXlcbiAgICAgICAgaWYgKHZhbCkge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZyh2YWwpO1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdnb2luZyBkZWVwZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIF90ZXN0T2JqZWN0Q2xhdXNlKGNsYXVzZSwgdmFsLCBrZXkpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdsb3dlc3QgcGF0aDogJyArIHBhdGgpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIF90ZXN0Q2xhdXNlKGNsYXVzZSwgZG9jKTtcbiAgICB9XG59O1xuXG52YXIgX3Rlc3RMb2dpY2FsQ2xhdXNlID0gZnVuY3Rpb24oY2xhdXNlLCBkb2MsIGtleSkge1xuICAgIHZhciBtYXRjaGVzID0gbnVsbDtcbiAgICBcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNsYXVzZS52YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgX21hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyKHsgY2xhdXNlczogW2NsYXVzZS52YWx1ZVtpXV0gfSk7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgICAgY2FzZSAnYW5kJzpcbiAgICAgICAgICAgICAgICAvLyBUcnVlIHVubGVzcyBpdCBoYXMgb25lIHRoYXQgZG8gbm90IG1hdGNoXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNOaWwobWF0Y2hlcykpIG1hdGNoZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghX21hdGNoZXIudGVzdChkb2MpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvcic6XG4gICAgICAgICAgICAgICAgLy8gRmFsc2UgdW5sZXNzIGl0IGhhcyBvbmUgbWF0Y2ggYXQgbGVhc3RcbiAgICAgICAgICAgICAgICBpZiAoXy5pc05pbChtYXRjaGVzKSkgbWF0Y2hlcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChfbWF0Y2hlci50ZXN0KGRvYykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBtYXRjaGVzIHx8IGZhbHNlO1xufTtcblxudmFyIF90ZXN0T3BlcmF0b3JDbGF1c2UgPSBmdW5jdGlvbihjbGF1c2UsIHZhbHVlKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdDYWxsZWQgX3Rlc3RPcGVyYXRvckNsYXVzZScpO1xuICAgIFxuICAgIGZvciAodmFyIGtleSBpbiBjbGF1c2UudmFsdWUpIHtcbiAgICAgICAgaWYgKCFfdGVzdE9wZXJhdG9yQ29uc3RyYWludChrZXksIGNsYXVzZS52YWx1ZVtrZXldLCBjbGF1c2UudmFsdWUsIHZhbHVlLCBjbGF1c2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG52YXIgX3Rlc3RPcGVyYXRvckNvbnN0cmFpbnQgPSBmdW5jdGlvbiAoa2V5LCBvcGVyYXRvclZhbHVlLCBjbGF1c2VWYWx1ZSwgZG9jVmFsLCBjbGF1c2UpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZCBfdGVzdE9wZXJhdG9yQ29uc3RyYWludCcpO1xuICAgIFxuICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgIC8vIENvbXBhcmlzb24gUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIGNhc2UgJyRndCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGd0Jyk7XG5cbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuY21wKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSkgPiAwO1xuICAgICAgICBjYXNlICckbHQnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRsdCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpIDwgMDtcbiAgICAgICAgY2FzZSAnJGd0ZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGd0ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpID49IDA7XG4gICAgICAgIGNhc2UgJyRsdGUnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRsdGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5jbXAoZG9jVmFsLCBvcGVyYXRvclZhbHVlKSA8PSAwO1xuICAgICAgICBjYXNlICckZXEnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRlcScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmVxdWFsKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSk7XG4gICAgICAgIGNhc2UgJyRuZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG5lJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiAhU2VsZWN0b3JNYXRjaGVyLmVxdWFsKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSk7XG4gICAgICAgIGNhc2UgJyRpbic6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGluJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuaW4oZG9jVmFsLCBvcGVyYXRvclZhbHVlKTtcbiAgICAgICAgY2FzZSAnJG5pbic6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG5pbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gIVNlbGVjdG9yTWF0Y2hlci5pbihkb2NWYWwsIG9wZXJhdG9yVmFsdWUpO1xuICAgICAgICAvLyBMb2dpY2FsIFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICBjYXNlICckbm90JzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbm90Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vICRvciwgJGFuZCwgJG5vciBhcmUgaW4gdGhlICdvcGVyYXRvcicga2luZCB0cmVhdG1lbnRcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICB2YXIgX2NsYXVzZSA9IHtcbiAgICAgICAgICAgICAgICBraW5kOiAncGxhaW4nLFxuICAgICAgICAgICAgICAgIGtleTogY2xhdXNlLmtleSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogb3BlcmF0b3JWYWx1ZSxcbiAgICAgICAgICAgICAgICB0eXBlOiBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgX3BhcmVudCA9IGNsYXVzZS52YWx1ZTtcbiAgICAgICAgICAgIHZhciBfa2V5ID0gXG4gICAgICAgICAgICByZXR1cm4gIShfdGVzdENsYXVzZShfY2xhdXNlLCBkb2NWYWwpKTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkbm90IHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgIC8vIEVsZW1lbnQgUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIGNhc2UgJyRleGlzdHMnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRleGlzdHMnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIG9wZXJhdG9yVmFsdWUgPyAhXy5pc1VuZGVmaW5lZChkb2NWYWwpIDogXy5pc1VuZGVmaW5lZChkb2NWYWwpO1xuICAgICAgICBjYXNlICckdHlwZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHR5cGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gJHR5cGU6IDEgaXMgdHJ1ZSBmb3IgYW4gYXJyYXkgaWYgYW55IGVsZW1lbnQgaW4gdGhlIGFycmF5IGlzIG9mXG4gICAgICAgICAgICAvLyB0eXBlIDEuIGJ1dCBhbiBhcnJheSBkb2Vzbid0IGhhdmUgdHlwZSBhcnJheSB1bmxlc3MgaXQgY29udGFpbnNcbiAgICAgICAgICAgIC8vIGFuIGFycmF5Li5cbiAgICAgICAgICAgIC8vIHZhciBTZWxlY3Rvci5fZi5fdHlwZShkb2NWYWwpO1xuICAgICAgICAgICAgLy8gcmV0dXJuIFNlbGVjdG9yLl9mLl90eXBlKGRvY1ZhbCkudHlwZSA9PT0gb3BlcmF0b3JWYWx1ZTtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiJHR5cGUgdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgLy8gRXZhbHVhdGlvbiBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgY2FzZSAnJG1vZCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG1vZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZG9jVmFsICUgb3BlcmF0b3JWYWx1ZVswXSA9PT0gb3BlcmF0b3JWYWx1ZVsxXTtcbiAgICAgICAgY2FzZSAnJG9wdGlvbnMnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRvcHRpb25zIChpZ25vcmVkKScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZ25vcmUsIGFzIGl0IGlzIHRvIHRoZSBSZWdFeHBcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBjYXNlICckcmVnZXgnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRyZWdleCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgX29wdCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoXy5oYXNJbihjbGF1c2VWYWx1ZSwgJyRvcHRpb25zJykpIHtcbiAgICAgICAgICAgICAgICBfb3B0ID0gY2xhdXNlVmFsdWVbJyRvcHRpb25zJ107XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKC9beHNdLy50ZXN0KF9vcHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vZywgaSwgbSwgeCwgc1xuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPIG1vbmdvIHVzZXMgUENSRSBhbmQgc3VwcG9ydHMgc29tZSBhZGRpdGlvbmFsIGZsYWdzOiAneCcgYW5kXG4gICAgICAgICAgICAgICAgICAgIC8vICdzJy4gamF2YXNjcmlwdCBkb2Vzbid0IHN1cHBvcnQgdGhlbS4gc28gdGhpcyBpcyBhIGRpdmVyZ2VuY2VcbiAgICAgICAgICAgICAgICAgICAgLy8gYmV0d2VlbiBvdXIgYmVoYXZpb3IgYW5kIG1vbmdvJ3MgYmVoYXZpb3IuIGlkZWFsbHkgd2Ugd291bGRcbiAgICAgICAgICAgICAgICAgICAgLy8gaW1wbGVtZW50IHggYW5kIHMgYnkgdHJhbnNmb3JtaW5nIHRoZSByZWdleHAsIGJ1dCBub3QgdG9kYXkuLlxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJPbmx5IHRoZSBpLCBtLCBhbmQgZyByZWdleHAgb3B0aW9ucyBhcmUgc3VwcG9ydGVkXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmV2aWV3IGZsYWdzIC0+IGcgJiBtXG4gICAgICAgICAgICB2YXIgcmVnZXhwID0gb3BlcmF0b3JWYWx1ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNSZWdFeHAocmVnZXhwKSAmJiBfLmlzTmlsKF9vcHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlZ2V4cC50ZXN0KGRvY1ZhbCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNOaWwoX29wdCkpIHtcbiAgICAgICAgICAgICAgICByZWdleHAgPSBuZXcgUmVnRXhwKHJlZ2V4cCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNSZWdFeHAocmVnZXhwKSkge1xuICAgICAgICAgICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwLnNvdXJjZSwgX29wdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwLCBfb3B0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHJlZ2V4cC50ZXN0KGRvY1ZhbCk7XG4gICAgICAgIGNhc2UgJyR0ZXh0JzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkdGV4dCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkdGV4dCB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICBjYXNlICckd2hlcmUnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICR3aGVyZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkd2hlcmUgdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgLy8gR2Vvc3BhdGlhbCBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgLy8gVE9ETyAtPiBpbiBvcGVyYXRvciBraW5kXG4gICAgICAgIC8vIFF1ZXJ5IE9wZXJhdG9yIEFycmF5XG4gICAgICAgIGNhc2UgJyRhbGwnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRhbGwnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5hbGwob3BlcmF0b3JWYWx1ZSwgZG9jVmFsKSA+IDA7XG4gICAgICAgIGNhc2UgJyRlbGVtTWF0Y2gnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRlbGVtTWF0Y2gnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVE9ETyBpbXBsZW1lbnRcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiJGVsZW1NYXRjaCB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICBjYXNlICckc2l6ZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHNpemUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIF8uaXNBcnJheShkb2NWYWwpICYmIGRvY1ZhbC5sZW5ndGggPT09IG9wZXJhdG9yVmFsdWU7XG4gICAgICAgIC8vIEJpdHdpc2UgUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIC8vIFRPRE9cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAnICsga2V5KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJVbnJlY29nbml6ZWQga2V5IGluIHNlbGVjdG9yOiBcIiArIGtleSk7XG4gICAgfVxufTtcblxudmFyIEJzb25UeXBlcyA9IHtcblx0X3R5cGVzOiBbXG5cdFx0eyBhbGlhczogJ21pbktleScsIG51bWJlcjogLTEsIG9yZGVyOiAxLCBpc1R5cGU6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnbnVsbCcsIG51bWJlcjogMTAsIG9yZGVyOiAyLCBpc1R5cGU6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnaW50JywgbnVtYmVyOiAxNiwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc0ludGVnZXIgfSxcblx0XHR7IGFsaWFzOiAnbG9uZycsIG51bWJlcjogMTgsIG9yZGVyOiAzLCBpc1R5cGU6IF8uaXNOdW1iZXIgfSxcblx0XHR7IGFsaWFzOiAnZG91YmxlJywgbnVtYmVyOiAxLCBvcmRlcjogMywgaXNUeXBlOiBfLmlzTnVtYmVyIH0sXG5cdFx0eyBhbGlhczogJ251bWJlcicsIG51bWJlcjogbnVsbCwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc051bWJlciB9LFxuXHRcdHsgYWxpYXM6ICdzdHJpbmcnLCBudW1iZXI6IDIsIG9yZGVyOiA0LCBpc1R5cGU6IF8uaXNTdHJpbmcgfSxcblx0XHR7IGFsaWFzOiAnc3ltYm9sJywgbnVtYmVyOiAxNCwgb3JkZXI6IDQsIGlzVHlwZTogXy5pc1N5bWJvbCB9LFxuXHRcdHsgYWxpYXM6ICdvYmplY3QnLCBudW1iZXI6IDMsIG9yZGVyOiA1LCBpc1R5cGU6IF8uaXNQbGFpbk9iamVjdCB9LFxuXHRcdHsgYWxpYXM6ICdhcnJheScsIG51bWJlcjogNCwgb3JkZXI6IDYsIGlzVHlwZTogXy5pc0FycmF5IH0sXG5cdFx0eyBhbGlhczogJ2JpbkRhdGEnLCBudW1iZXI6IDUsIG9yZGVyOiA3LCBpc1R5cGU6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnb2JqZWN0SWQnLCBudW1iZXI6IDcsIG9yZGVyOiA4LCBpc1R5cGVmbmM6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnYm9vbCcsIG51bWJlcjogOCwgb3JkZXI6IDksIGlzVHlwZTogXy5pc0Jvb2xlYW4gfSxcblx0XHR7IGFsaWFzOiAnZGF0ZScsIG51bWJlcjogOSwgb3JkZXI6IDEwLCBpc1R5cGVmbmM6IF8uaXNEYXRlIH0sICAgICAgICAgLy8gZm9ybWF0XG5cdFx0eyBhbGlhczogJ3RpbWVzdGFtcCcsIG51bWJlcjogMTcsIG9yZGVyOiAxMSwgaXNUeXBlOiBfLmlzRGF0ZSB9LCAgIC8vIGZvcm1hdFxuXHRcdHsgYWxpYXM6ICdyZWdleCcsIG51bWJlcjogMTEsIG9yZGVyOiAxMiwgaXNUeXBlOiBfLmlzUmVnRXhwIH0sXG5cdFx0eyBhbGlhczogJ21heEtleScsIG51bWJlcjogMTI3LCBvcmRlcjogMTMsIGlzVHlwZTogbnVsbCB9XG5cdFx0XG4vLyBcdFx0dW5kZWZpbmVkIDZcbi8vIFx0XHRkYlBvaW50ZXJcbi8vIFx0XHRqYXZhc2NyaXB0XG4vLyBcdFx0amF2YXNjcmlwdFdpdGhTY29wZVxuLy8gXHRcdGZ1bmN0aW9uXG5cdF0sXG5cdFxuXHRnZXRCeUFsaWFzOiBmdW5jdGlvbihhbGlhcykge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fdHlwZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmICh0aGlzLl90eXBlc1tpXS5hbGlhcyA9PT0gYWxpYXMpIHJldHVybiB0aGlzLl90eXBlc1tpXTtcblx0XHR9XG5cdH0sXG5cdGdldEJ5VmFsdWU6IGZ1bmN0aW9uKHZhbCkge1xuXHQgICAgaWYgKF8uaXNOdW1iZXIodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcImRvdWJsZVwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzU3RyaW5nKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJzdHJpbmdcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Jvb2xlYW4odmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcImJvb2xcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJhcnJheVwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTnVsbCh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwibnVsbFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzUmVnRXhwKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJyZWdleFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzUGxhaW5PYmplY3QodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcIm9iamVjdFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzU3ltYm9sKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJzeW1ib2xcIik7XG4gICAgICAgIFxuICAgICAgICB0aHJvdyBFcnJvcihcIlVuYWNjZXB0ZWQgQlNPTiB0eXBlXCIpO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yTWF0Y2hlcjsiXX0=
