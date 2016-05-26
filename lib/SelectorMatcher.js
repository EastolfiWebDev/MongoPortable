"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Logger = require("./utils/Logger"),
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

                throw Error("Parameter 'document' required");
            }

            logger.debug('document -> not null');

            for (var i = 0; i < this.clauses.length; i++) {
                var clause = this.clauses[i];

                if (clause.kind === 'function') {
                    logger.debug('clause -> function');

                    _match = clause.value.call(document);
                } else if (clause.kind === 'plain') {
                    logger.debug('clause -> plain on field "' + clause.key + '" and value = ' + clause.value);

                    _match = _testClause(clause, document[clause.key]);

                    logger.debug('clause result -> ' + _match);
                } else if (clause.kind === 'object') {
                    logger.debug('clause -> object on field "' + clause.key.join('.') + '" and value = ' + clause.value);

                    _match = _testObjectClause(clause, document, _.clone(clause.key).reverse());

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
            if ((typeof array === "undefined" ? "undefined" : _typeof(array)) !== "object") {
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
                if (typeof a === 'number' || typeof a === 'string' || typeof a === 'boolean' || a === undefined || a === null) return a === b;

                if (typeof a === 'function') return false;

                // OK, typeof a === 'object'
                if ((typeof b === "undefined" ? "undefined" : _typeof(b)) !== 'object') return false;

                // arrays
                if (a instanceof Array) {
                    if (!(b instanceof Array)) return false;

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
            if (_.isArray(value)) {
                for (var i = 0; i < value.length; i++) {
                    if (func(value[i])) return true;
                }

                // fall through!
            }

            return func(value);
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

            if (aType.number !== bType.number) {
                // TODO need to implement this once we implement Symbol or
                // integers, or once we implement both Date and Timestamp
                throw Error("Missing type coercion logic in _cmp");
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

                return SelectorMatcher.equal(_value, JSON.stringify(clause.value));
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

    if (_.isRegExp(value)) {
        return _testOperatorClause(clause, { $regex: clause.value });
    } else {
        for (var key in clause.value) {
            if (!_testOperatorConstraint(key, clause.value[key], clause.value, value, clause)) {
                return false;
            }
        }

        return true;
    }
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
            throw Error("$text unimplemented");
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

            var _opt = '';
            if (_.hasIn(clauseValue, '$options')) {
                _opt = clauseValue['$options'];

                if (/^gim/.test(_opt)) {
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
            if (_.isRegExp(regexp)) {
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
            logger.debug('testing operator $gt');

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
    _types: [{ alias: 'minKey', number: -1, order: 1, isType: null }, { alias: 'null', number: 10, order: 2, isType: null }, { alias: 'int', number: 16, order: 3, isType: _.isInteger }, { alias: 'long', number: 18, order: 3, isType: _.isNumber }, { alias: 'double', number: 1, order: 3, isType: _.isNumber }, { alias: 'number', number: null, order: 3, isType: _.isNumber }, { alias: 'symbol', number: 14, order: 4, isType: null }, { alias: 'string', number: 2, order: 4, isType: _.isString }, { alias: 'object', number: 3, order: 5, isType: _.isPlainObject }, { alias: 'array', number: 4, order: 6, isType: _.isArray }, { alias: 'binData', number: 5, order: 7, isType: null }, { alias: 'objectId', number: 7, order: 8, isTypefnc: null }, { alias: 'bool', number: 8, order: 9, isType: _.isBoolean }, { alias: 'date', number: 9, order: 10, isTypefnc: _.isDate }, // format
    { alias: 'timestamp', number: 17, order: 11, isType: _.isDate }, // format
    { alias: 'regex', number: 11, order: 12, isType: _.isRegExp }, { alias: 'maxKey', number: 127, order: 13, isType: null }

    // 		undefined 6
    // 		dbPointer
    // 		javascript
    // 		javascriptWithScope
    // 		function
    ],

    getByNumber: function getByNumber(num) {
        for (var i = 0; i < this._types.length; i++) {
            if (this._types[i].number === num) return this._types[i];
        }

        throw Error("Unaccepted BSON type number");
    },
    getByAlias: function getByAlias(alias) {
        for (var i = 0; i < this._types.length; i++) {
            if (this._types[i].alias === alias) return this._types[i];
        }

        throw Error("Unaccepted BSON type alias");
    },
    getByValue: function getByValue(val) {
        if (_.isNumber(val)) return this.getByAlias("double");

        if (_.isString(val)) return this.getByAlias("string");

        if (_.isBoolean(val)) return this.getByAlias("bool");

        if (_.isArray(val)) return this.getByAlias("array");

        if (_.isNull(val)) return this.getByAlias("null");

        if (_.isRegExp(val)) return this.getByAlias("regex");

        if (_.isPlainObject(val)) return this.getByAlias("object");

        throw Error("Unaccepted BSON type");

        // if (_.isFunction(val)) return this.getByAlias("double");
    }
};

module.exports = SelectorMatcher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9TZWxlY3Rvck1hdGNoZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQSxJQUFJLFNBQVMsUUFBUSxnQkFBUixDQUFiO0lBQ0ksSUFBSSxRQUFRLFFBQVIsQ0FEUjs7QUFHQSxJQUFJLFNBQVMsSUFBYjs7SUFFTSxlO0FBQ0wsNkJBQVksUUFBWixFQUFzQjtBQUFBOztBQUNmLGFBQUssT0FBTCxHQUFlLFNBQVMsT0FBeEI7O0FBRUEsaUJBQVMsT0FBTyxRQUFoQjtBQUNOOzs7OzZCQUVJLFEsRUFBVTtBQUNkLG1CQUFPLEtBQVAsQ0FBYSw4QkFBYjs7QUFFQSxnQkFBSSxTQUFTLElBQWI7O0FBRUEsZ0JBQUksRUFBRSxLQUFGLENBQVEsUUFBUixDQUFKLEVBQXVCO0FBQ3RCLHVCQUFPLEtBQVAsQ0FBYSxrQkFBYjs7QUFFQSxzQkFBTSxNQUFNLCtCQUFOLENBQU47QUFDQTs7QUFFRCxtQkFBTyxLQUFQLENBQWEsc0JBQWI7O0FBRUEsaUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxLQUFLLE9BQUwsQ0FBYSxNQUFqQyxFQUF5QyxHQUF6QyxFQUE4QztBQUM3QyxvQkFBSSxTQUFTLEtBQUssT0FBTCxDQUFhLENBQWIsQ0FBYjs7QUFFQSxvQkFBSSxPQUFPLElBQVAsS0FBZ0IsVUFBcEIsRUFBZ0M7QUFDL0IsMkJBQU8sS0FBUCxDQUFhLG9CQUFiOztBQUVBLDZCQUFTLE9BQU8sS0FBUCxDQUFhLElBQWIsQ0FBa0IsUUFBbEIsQ0FBVDtBQUNBLGlCQUpELE1BSU8sSUFBSSxPQUFPLElBQVAsS0FBZ0IsT0FBcEIsRUFBNkI7QUFDbkMsMkJBQU8sS0FBUCxDQUFhLCtCQUErQixPQUFPLEdBQXRDLEdBQTRDLGdCQUE1QyxHQUErRCxPQUFPLEtBQW5GOztBQUVBLDZCQUFTLFlBQVksTUFBWixFQUFvQixTQUFTLE9BQU8sR0FBaEIsQ0FBcEIsQ0FBVDs7QUFFQSwyQkFBTyxLQUFQLENBQWEsc0JBQXNCLE1BQW5DO0FB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LENBQVosRUFBZSxLQUFmLEtBQXlCLEtBQTdCLEVBQW9DLE9BQU8sS0FBSyxNQUFMLENBQVksQ0FBWixDQUFQO0FBQ3BDOztBQUVELGNBQU0sTUFBTSw0QkFBTixDQUFOO0FBQ0EsS0F4Q2M7QUF5Q2YsZ0JBQVksb0JBQVMsR0FBVCxFQUFjO0FBQ3RCLFlBQUksRUFBRSxRQUFGLENBQVcsR0FBWCxDQUFKLEVBQXFCLE9BQU8sS0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQVA7O0FBRWxCLFlBQUksRUFBRSxRQUFGLENBQVcsR0FBWCxDQUFKLEVBQXFCLE9BQU8sS0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQVA7O0FBRXJCLFlBQUksRUFBRSxTQUFGLENBQVksR0FBWixDQUFKLEVBQXNCLE9BQU8sS0FBSyxVQUFMLENBQWdCLE1BQWhCLENBQVA7O0FBRXRCLFlBQUksRUFBRSxPQUFGLENBQVUsR0FBVixDQUFKLEVBQW9CLE9BQU8sS0FBSyxVQUFMLENBQWdCLE9BQWhCLENBQVA7O0FBRXBCLFlBQUksRUFBRSxNQUFGLENBQVMsR0FBVCxDQUFKLEVBQW1CLE9BQU8sS0FBSyxVQUFMLENBQWdCLE1BQWhCLENBQVA7O0FBRW5CLFlBQUksRUFBRSxRQUFGLENBQVcsR0FBWCxDQUFKLEVBQXFCLE9BQU8sS0FBSyxVQUFMLENBQWdCLE9BQWhCLENBQVA7O0FBRXJCLFlBQUksRUFBRSxhQUFGLENBQWdCLEdBQWhCLENBQUosRUFBMEIsT0FBTyxLQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsQ0FBUDs7QUFFMUIsY0FBTSxNQUFNLHNCQUFOLENBQU47OztBQUdOO0FBM0RjLENBQWhCOztBQThEQSxPQUFPLE9BQVAsR0FBaUIsZUFBakIiLCJmaWxlIjoiU2VsZWN0b3JNYXRjaGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIExvZ2dlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0xvZ2dlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKTtcbiAgICBcbnZhciBsb2dnZXIgPSBudWxsO1xuXG5jbGFzcyBTZWxlY3Rvck1hdGNoZXIge1xuXHRjb25zdHJ1Y3RvcihzZWxlY3Rvcikge1xuICAgICAgICB0aGlzLmNsYXVzZXMgPSBzZWxlY3Rvci5jbGF1c2VzO1xuXG4gICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcblx0fVxuXHRcblx0dGVzdChkb2N1bWVudCkge1xuXHRcdGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIFNlbGVjdG9yTWF0Y2hlci0+dGVzdCcpO1xuXHRcdFxuXHRcdHZhciBfbWF0Y2ggPSB0cnVlO1xuXG5cdFx0aWYgKF8uaXNOaWwoZG9jdW1lbnQpKSB7XG5cdFx0XHRsb2dnZXIuZGVidWcoJ2RvY3VtZW50IC0+IG51bGwnKTtcblx0XHRcdFxuXHRcdFx0dGhyb3cgRXJyb3IoXCJQYXJhbWV0ZXIgJ2RvY3VtZW50JyByZXF1aXJlZFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0bG9nZ2VyLmRlYnVnKCdkb2N1bWVudCAtPiBub3QgbnVsbCcpO1xuXHRcdFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jbGF1c2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgY2xhdXNlID0gdGhpcy5jbGF1c2VzW2ldO1xuXHRcdFx0XG5cdFx0XHRpZiAoY2xhdXNlLmtpbmQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgLT4gZnVuY3Rpb24nKTtcblx0XHRcdFx0XG5cdFx0XHRcdF9tYXRjaCA9IGNsYXVzZS52YWx1ZS5jYWxsKGRvY3VtZW50KTtcblx0XHRcdH0gZWxzZSBpZiAoY2xhdXNlLmtpbmQgPT09ICdwbGFpbicpIHtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgLT4gcGxhaW4gb24gZmllbGQgXCInICsgY2xhdXNlLmtleSArICdcIiBhbmQgdmFsdWUgPSAnICsgY2xhdXNlLnZhbHVlKTtcblx0XHRcdFx0XG5cdFx0XHRcdF9tYXRjaCA9IF90ZXN0Q2xhdXNlKGNsYXVzZSwgZG9jdW1lbnRbY2xhdXNlLmtleV0pO1xuXHRcdFx0XHRcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgcmVzdWx0IC0+ICcgKyBfbWF0Y2gpO1xuXHRcdFx0fSBlbHNlIGlmIChjbGF1c2Uua2luZCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgLT4gb2JqZWN0IG9uIGZpZWxkIFwiJyArIChjbGF1c2Uua2V5LmpvaW4oJy4nKSkgKyAnXCIgYW5kIHZhbHVlID0gJyArIGNsYXVzZS52YWx1ZSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRfbWF0Y2ggPSBfdGVzdE9iamVjdENsYXVzZShjbGF1c2UsIGRvY3VtZW50LCBfLmNsb25lKGNsYXVzZS5rZXkpLnJldmVyc2UoKSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZSByZXN1bHQgLT4gJyArIF9tYXRjaCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC8vIElmIGFueSB0ZXN0IGNhc2UgZmFpbHMsIHRoZSBkb2N1bWVudCB3aWxsIG5vdCBtYXRjaFxuXHRcdFx0aWYgKF9tYXRjaCA9PT0gZmFsc2UgfHwgX21hdGNoID09PSAnZmFsc2UnKSB7XG5cdFx0XHRcdGxvZ2dlci5kZWJ1ZygndGhlIGRvY3VtZW50IGRvIG5vdCBtYXRjaGVzJyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8vIEV2ZXJ5dGhpbmcgbWF0Y2hlc1xuXHRcdGxvZ2dlci5kZWJ1ZygndGhlIGRvY3VtZW50IG1hdGNoZXMnKTtcblx0XHRcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRcblx0c3RhdGljIGFsbChhcnJheSwgdmFsdWUpIHtcbiAgICAgICAgLy8gJGFsbCBpcyBvbmx5IG1lYW5pbmdmdWwgb24gYXJyYXlzXG4gICAgICAgIGlmICghKGFycmF5IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUT0RPIHNob3VsZCB1c2UgYSBjYW5vbmljYWxpemluZyByZXByZXNlbnRhdGlvbiwgc28gdGhhdCB3ZVxuICAgICAgICAvLyBkb24ndCBnZXQgc2NyZXdlZCBieSBrZXkgb3JkZXJcbiAgICAgICAgdmFyIHBhcnRzID0ge307XG4gICAgICAgIHZhciByZW1haW5pbmcgPSAwO1xuXG4gICAgICAgIF8uZm9yRWFjaCh2YWx1ZSwgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFyIGhhc2ggPSBKU09OLnN0cmluZ2lmeSh2YWwpO1xuXG4gICAgICAgICAgICBpZiAoIShoYXNoIGluIHBhcnRzKSkge1xuICAgICAgICAgICAgICAgIHBhcnRzW2hhc2hdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZW1haW5pbmcrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGhhc2ggPSBKU09OLnN0cmluZ2lmeShhcnJheVtpXSk7XG4gICAgICAgICAgICBpZiAocGFydHNbaGFzaF0pIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcGFydHNbaGFzaF07XG4gICAgICAgICAgICAgICAgcmVtYWluaW5nLS07XG5cbiAgICAgICAgICAgICAgICBpZiAoMCA9PT0gcmVtYWluaW5nKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cdFxuXHRzdGF0aWMgaW4oYXJyYXksIHZhbHVlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYXJyYXkgIT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIC8vIG9wdGltaXphdGlvbjogdXNlIHNjYWxhciBlcXVhbGl0eSAoZmFzdClcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJyYXkgPT09IHZhbHVlW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbm9wZSwgaGF2ZSB0byB1c2UgZGVlcCBlcXVhbGl0eVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChTZWxlY3Rvck1hdGNoZXIuZXF1YWwoYXJyYXksIHZhbHVlW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblx0XG5cdC8vIGRlZXAgZXF1YWxpdHkgdGVzdDogdXNlIGZvciBsaXRlcmFsIGRvY3VtZW50IGFuZCBhcnJheSBtYXRjaGVzXG5cdHN0YXRpYyBlcXVhbChhcnJheSwgcXZhbCkge1xuICAgICAgICB2YXIgbWF0Y2ggPSBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgLy8gc2NhbGFyc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBhID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgYSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIGEgPT09ICdib29sZWFuJyB8fCBhID09PSB1bmRlZmluZWQgfHwgYSA9PT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgYSA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBPSywgdHlwZW9mIGEgPT09ICdvYmplY3QnXG4gICAgICAgICAgICBpZiAodHlwZW9mIGIgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIGFycmF5c1xuICAgICAgICAgICAgaWYgKGEgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgIGlmICghKGIgaW5zdGFuY2VvZiBBcnJheSkpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKGFbaV0sYltpXSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gb2JqZWN0c1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIHZhciB1bm1hdGNoZWRfYl9rZXlzID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gYilcbiAgICAgICAgICAgIHVubWF0Y2hlZF9iX2tleXMrKztcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gYSkge1xuICAgICAgICAgICAgaWYgKCEoeCBpbiBiKSB8fCAhbWF0Y2goYVt4XSwgYlt4XSkpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB1bm1hdGNoZWRfYl9rZXlzLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdW5tYXRjaGVkX2Jfa2V5cyA9PT0gMDtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvLyBGb2xsb3cgTW9uZ28gaW4gY29uc2lkZXJpbmcga2V5IG9yZGVyIHRvIGJlIHBhcnQgb2ZcbiAgICAgICAgICAgIC8vIGVxdWFsaXR5LiBLZXkgZW51bWVyYXRpb24gb3JkZXIgaXMgYWN0dWFsbHkgbm90IGRlZmluZWQgaW5cbiAgICAgICAgICAgIC8vIHRoZSBlY21hc2NyaXB0IHNwZWMgYnV0IGluIHByYWN0aWNlIG1vc3QgaW1wbGVtZW50YXRpb25zXG4gICAgICAgICAgICAvLyBwcmVzZXJ2ZSBpdC4gKFRoZSBleGNlcHRpb24gaXMgQ2hyb21lLCB3aGljaCBwcmVzZXJ2ZXMgaXRcbiAgICAgICAgICAgIC8vIHVzdWFsbHksIGJ1dCBub3QgZm9yIGtleXMgdGhhdCBwYXJzZSBhcyBpbnRzLilcbiAgICAgICAgICAgIHZhciBiX2tleXMgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgYXJyYXkgaW4gYikge1xuICAgICAgICAgICAgICAgIGJfa2V5cy5wdXNoKGJbYXJyYXldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgYXJyYXkgaW4gYSkge1xuICAgICAgICAgICAgICAgIGlmIChpID49IGJfa2V5cy5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmICghbWF0Y2goYVthcnJheV0sIGJfa2V5c1tpXSkpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpICE9PSBiX2tleXMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBtYXRjaChhcnJheSwgcXZhbCk7XG4gICAgfVxuXHRcblx0Ly8gaWYgeCBpcyBub3QgYW4gYXJyYXksIHRydWUgaWZmIGYoeCkgaXMgdHJ1ZS4gaWYgeCBpcyBhbiBhcnJheSxcbiAgICAvLyB0cnVlIGlmZiBmKHkpIGlzIHRydWUgZm9yIGFueSB5IGluIHguXG4gICAgLy9cbiAgICAvLyB0aGlzIGlzIHRoZSB3YXkgbW9zdCBtb25nbyBvcGVyYXRvcnMgKGxpa2UgJGd0LCAkbW9kLCAkdHlwZS4uKVxuICAgIC8vIHRyZWF0IHRoZWlyIGFyZ3VtZW50cy5cbiAgICBzdGF0aWMgbWF0Y2hlcyh2YWx1ZSwgZnVuYykge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChmdW5jKHZhbHVlW2ldKSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmdW5jKHZhbHVlKTtcbiAgICB9XG5cdFxuXHQvLyBsaWtlIF9tYXRjaGVzLCBidXQgaWYgeCBpcyBhbiBhcnJheSwgaXQncyB0cnVlIG5vdCBvbmx5IGlmIGYoeSlcbiAgICAvLyBpcyB0cnVlIGZvciBzb21lIHkgaW4geCwgYnV0IGFsc28gaWYgZih4KSBpcyB0cnVlLlxuICAgIC8vXG4gICAgLy8gdGhpcyBpcyB0aGUgd2F5IG1vbmdvIHZhbHVlIGNvbXBhcmlzb25zIHVzdWFsbHkgd29yaywgbGlrZSB7eDpcbiAgICAvLyA0fSwge3g6IFs0XX0sIG9yIHt4OiB7JGluOiBbMSwyLDNdfX0uXG4gICAgc3RhdGljIG1hdGNoZXNfcGx1cyh2YWx1ZSwgZnVuYykge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChmdW5jKHZhbHVlW2ldKSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGZhbGwgdGhyb3VnaCFcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmdW5jKHZhbHVlKTtcbiAgICB9XG5cdFxuXHQvLyBjb21wYXJlIHR3byB2YWx1ZXMgb2YgdW5rbm93biB0eXBlIGFjY29yZGluZyB0byBCU09OIG9yZGVyaW5nXG4gICAgLy8gc2VtYW50aWNzLiAoYXMgYW4gZXh0ZW5zaW9uLCBjb25zaWRlciAndW5kZWZpbmVkJyB0byBiZSBsZXNzIHRoYW5cbiAgICAvLyBhbnkgb3RoZXIgdmFsdWUuKVxuICAgIC8vIHJldHVybiBuZWdhdGl2ZSBpZiBhIGlzIGxlc3MsIHBvc2l0aXZlIGlmIGIgaXMgbGVzcywgb3IgMCBpZiBlcXVhbFxuICAgIHN0YXRpYyBjbXAoYSwgYikge1xuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChhKSkgcmV0dXJuIGIgPT09IHVuZGVmaW5lZCA/IDAgOiAtMTtcblxuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChiKSkgcmV0dXJuIDE7XG5cdFx0XG4gICAgICAgIHZhciBhVHlwZSA9IEJzb25UeXBlcy5nZXRCeVZhbHVlKGEpO1xuICAgICAgICB2YXIgYlR5cGUgPSBCc29uVHlwZXMuZ2V0QnlWYWx1ZShiKTtcblxuICAgICAgICBpZiAoYVR5cGUub3JkZXIgIT09IGJUeXBlLm9yZGVyKSByZXR1cm4gYVR5cGUub3JkZXIgPCBiVHlwZS5vcmRlciA/IC0xIDogMTtcblxuICAgICAgICBpZiAoYVR5cGUubnVtYmVyICE9PSBiVHlwZS5udW1iZXIpIHtcbiAgICAgICAgICAgIC8vIFRPRE8gbmVlZCB0byBpbXBsZW1lbnQgdGhpcyBvbmNlIHdlIGltcGxlbWVudCBTeW1ib2wgb3JcbiAgICAgICAgICAgIC8vIGludGVnZXJzLCBvciBvbmNlIHdlIGltcGxlbWVudCBib3RoIERhdGUgYW5kIFRpbWVzdGFtcFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJNaXNzaW5nIHR5cGUgY29lcmNpb24gbG9naWMgaW4gX2NtcFwiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOdW1iZXIoYSkpIHJldHVybiBhIC0gYjtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzU3RyaW5nKGEpKSByZXR1cm4gYSA8IGIgPyAtMSA6IChhID09PSBiID8gMCA6IDEpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNCb29sZWFuKGEpKSB7XG4gICAgICAgICAgICBpZiAoYSkgcmV0dXJuIGIgPyAwIDogMTtcblxuICAgICAgICAgICAgcmV0dXJuIGIgPyAtMSA6IDA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQXJyYXkoYSkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyA7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpID09PSBhLmxlbmd0aCkgcmV0dXJuIChpID09PSBiLmxlbmd0aCkgPyAwIDogLTE7XG5cbiAgICAgICAgICAgICAgICBpZiAoaSA9PT0gYi5sZW5ndGgpIHJldHVybiAxO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgdmFyIHMgPSBTZWxlY3Rvck1hdGNoZXIuY21wKGFbaV0sIGJbaV0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHMgIT09IDApIHJldHVybiBzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc051bGwoYSkpIHJldHVybiAwO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNSZWdFeHAoYSkpIHRocm93IEVycm9yKFwiU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIHJlZ3VsYXIgZXhwcmVzc2lvblwiKTsgLy8gVE9ET1xuICAgICAgICBcbiAgICAgICAgLy8gaWYgKF8uaXNGdW5jdGlvbihhKSkgcmV0dXJuIHt0eXBlOiAxMywgb3JkZXI6IDEwMCwgZm5jOiBfLmlzRnVuY3Rpb259O1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNQbGFpbk9iamVjdChhKSkge1xuICAgICAgICAgICAgdmFyIHRvX2FycmF5ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2gob2JqW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcCh0b19hcnJheShhKSwgdG9fYXJyYXkoYikpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZG91YmxlXG4gICAgICAgIC8vIGlmICh0YSA9PT0gMSkgIHJldHVybiBhIC0gYjtcblxuICAgICAgICAvLyBzdHJpbmdcbiAgICAgICAgLy8gaWYgKHRiID09PSAyKSByZXR1cm4gYSA8IGIgPyAtMSA6IChhID09PSBiID8gMCA6IDEpO1xuXG4gICAgICAgIC8vIE9iamVjdFxuICAgICAgICAvLyBpZiAodGEgPT09IDMpIHtcbiAgICAgICAgLy8gICAgIC8vIHRoaXMgY291bGQgYmUgbXVjaCBtb3JlIGVmZmljaWVudCBpbiB0aGUgZXhwZWN0ZWQgY2FzZSAuLi5cbiAgICAgICAgLy8gICAgIHZhciB0b19hcnJheSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgLy8gICAgICAgICB2YXIgcmV0ID0gW107XG5cbiAgICAgICAgLy8gICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIC8vICAgICAgICAgICAgIHJldC5wdXNoKGtleSk7XG4gICAgICAgIC8vICAgICAgICAgICAgIHJldC5wdXNoKG9ialtrZXldKTtcbiAgICAgICAgLy8gICAgICAgICB9XG5cbiAgICAgICAgLy8gICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAvLyAgICAgfTtcblxuICAgICAgICAvLyAgICAgcmV0dXJuIFNlbGVjdG9yLl9mLl9jbXAodG9fYXJyYXkoYSksIHRvX2FycmF5KGIpKTtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIEFycmF5XG4gICAgICAgIC8vIGlmICh0YSA9PT0gNCkge1xuICAgICAgICAvLyAgICAgZm9yICh2YXIgaSA9IDA7IDsgaSsrKSB7XG4gICAgICAgIC8vICAgICAgICAgaWYgKGkgPT09IGEubGVuZ3RoKSByZXR1cm4gKGkgPT09IGIubGVuZ3RoKSA/IDAgOiAtMTtcblxuICAgICAgICAvLyAgICAgICAgIGlmIChpID09PSBiLmxlbmd0aCkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIC8vICAgICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG5cbiAgICAgICAgLy8gICAgICAgICB2YXIgcyA9IFNlbGVjdG9yLl9mLl9jbXAoYVtpXSwgYltpXSk7XG5cbiAgICAgICAgLy8gICAgICAgICBpZiAocyAhPT0gMCkgcmV0dXJuIHM7XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyA1OiBiaW5hcnkgZGF0YVxuICAgICAgICAvLyA3OiBvYmplY3QgaWRcblxuICAgICAgICAvLyBib29sZWFuXG4gICAgICAgIC8vIGlmICh0YSA9PT0gOCkge1xuICAgICAgICAvLyAgICAgaWYgKGEpIHJldHVybiBiID8gMCA6IDE7XG5cbiAgICAgICAgLy8gICAgIHJldHVybiBiID8gLTEgOiAwO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gOTogZGF0ZVxuXG4gICAgICAgIC8vIG51bGxcbiAgICAgICAgLy8gaWYgKHRhID09PSAxMCkgcmV0dXJuIDA7XG5cbiAgICAgICAgLy8gcmVnZXhwXG4gICAgICAgIC8vIGlmICh0YSA9PT0gMTEpIHtcbiAgICAgICAgLy8gICAgIHRocm93IEVycm9yKFwiU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIHJlZ3VsYXIgZXhwcmVzc2lvblwiKTsgLy8gVE9ET1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gMTM6IGphdmFzY3JpcHQgY29kZVxuICAgICAgICAvLyAxNDogc3ltYm9sXG4gICAgICAgIC8vIDE1OiBqYXZhc2NyaXB0IGNvZGUgd2l0aCBzY29wZVxuICAgICAgICAvLyAxNjogMzItYml0IGludGVnZXJcbiAgICAgICAgLy8gMTc6IHRpbWVzdGFtcFxuICAgICAgICAvLyAxODogNjQtYml0IGludGVnZXJcbiAgICAgICAgLy8gMjU1OiBtaW5rZXlcbiAgICAgICAgLy8gMTI3OiBtYXhrZXlcblxuICAgICAgICAvLyBqYXZhc2NyaXB0IGNvZGVcbiAgICAgICAgLy8gaWYgKHRhID09PSAxMykge1xuICAgICAgICAvLyAgICAgdGhyb3cgRXJyb3IoXCJTb3J0aW5nIG5vdCBzdXBwb3J0ZWQgb24gSmF2YXNjcmlwdCBjb2RlXCIpOyAvLyBUT0RPXG4gICAgICAgIC8vIH1cbiAgICB9XG59XG5cbnZhciBfdGVzdENsYXVzZSA9IGZ1bmN0aW9uKGNsYXVzZSwgdmFsKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdDYWxsZWQgX3Rlc3RDbGF1c2UnKTtcbiAgICBcbiAgICAvLyB2YXIgX3ZhbCA9IGNsYXVzZS52YWx1ZTtcbiAgICBcbiAgICAvLyBpZiBSZWdFeHAgfHwgJCAtPiBPcGVyYXRvclxuICAgIFxuICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIubWF0Y2hlc19wbHVzKHZhbCwgZnVuY3Rpb24oX3ZhbHVlKSB7XG4gICAgICAgIC8vIFRPRE8gb2JqZWN0IGlkcywgZGF0ZXMsIHRpbWVzdGFtcHM/XG4gICAgICAgIHN3aXRjaCAoY2xhdXNlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ251bGwnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBOdWxsIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvUXVlcnlpbmcrYW5kK251bGxzXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNOaWwoX3ZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncmVnZXhwJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgUmVnRXhwIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIF90ZXN0T3BlcmF0b3JDbGF1c2UoY2xhdXNlLCBfdmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnbGl0ZXJhbF9vYmplY3QnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBMaXRlcmFsIE9iamVjdCBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuZXF1YWwoX3ZhbHVlLCBKU09OLnN0cmluZ2lmeShjbGF1c2UudmFsdWUpKTtcbiAgICAgICAgICAgIGNhc2UgJ29wZXJhdG9yX29iamVjdCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IE9wZXJhdG9yIE9iamVjdCBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBfdGVzdE9wZXJhdG9yQ2xhdXNlKGNsYXVzZSwgX3ZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IFN0cmluZyBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBfLnRvU3RyaW5nKF92YWx1ZSkgPT09IF8udG9TdHJpbmcoY2xhdXNlLnZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IE51bWJlciBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBfLnRvTnVtYmVyKF92YWx1ZSkgPT09IF8udG9OdW1iZXIoY2xhdXNlLnZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBCb29sZWFuIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIChfLmlzQm9vbGVhbihfdmFsdWUpICYmIF8uaXNCb29sZWFuKGNsYXVzZS52YWx1ZSkgJiYgKF92YWx1ZSA9PT0gY2xhdXNlLnZhbHVlKSk7XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IEZ1bmN0aW9uIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgdmFsdWUgdHlwZSBpbiBxdWVyeVwiKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgdmFsdWUgdHlwZSBpbiBxdWVyeVwiKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxudmFyIF90ZXN0T2JqZWN0Q2xhdXNlID0gZnVuY3Rpb24oY2xhdXNlLCBkb2MsIGtleSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIF90ZXN0T2JqZWN0Q2xhdXNlJyk7XG4gICAgXG4gICAgdmFyIHZhbCA9IG51bGw7XG4gICAgXG4gICAgaWYgKGtleS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBwYXRoID0ga2V5LnBvcCgpO1xuICAgICAgICB2YWwgPSBkb2NbcGF0aF07XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIuZGVidWcoJ2NoZWNrIG9uIGZpZWxkICcgKyBwYXRoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRPRE8gYWRkIF8uaXNOdW1iZXIodmFsKSBhbmQgdHJlYXQgaXQgYXMgYW4gYXJyYXlcbiAgICAgICAgaWYgKHZhbCkge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZyh2YWwpO1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdnb2luZyBkZWVwZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIF90ZXN0T2JqZWN0Q2xhdXNlKGNsYXVzZSwgdmFsLCBrZXkpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdsb3dlc3QgcGF0aDogJyArIHBhdGgpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIF90ZXN0Q2xhdXNlKGNsYXVzZSwgZG9jKTtcbiAgICB9XG59O1xuXG52YXIgX3Rlc3RPcGVyYXRvckNsYXVzZSA9IGZ1bmN0aW9uKGNsYXVzZSwgdmFsdWUpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZCBfdGVzdE9wZXJhdG9yQ2xhdXNlJyk7XG4gICAgXG4gICAgaWYgKF8uaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBfdGVzdE9wZXJhdG9yQ2xhdXNlKGNsYXVzZSwgeyRyZWdleDogY2xhdXNlLnZhbHVlfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGNsYXVzZS52YWx1ZSkge1xuICAgICAgICAgICAgaWYgKCFfdGVzdE9wZXJhdG9yQ29uc3RyYWludChrZXksIGNsYXVzZS52YWx1ZVtrZXldLCBjbGF1c2UudmFsdWUsIHZhbHVlLCBjbGF1c2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59O1xuXG52YXIgX3Rlc3RPcGVyYXRvckNvbnN0cmFpbnQgPSBmdW5jdGlvbiAoa2V5LCBvcGVyYXRvclZhbHVlLCBjbGF1c2VWYWx1ZSwgZG9jVmFsLCBjbGF1c2UpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZCBfdGVzdE9wZXJhdG9yQ29uc3RyYWludCcpO1xuICAgIFxuICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgIC8vIENvbXBhcmlzb24gUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIGNhc2UgJyRndCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGd0Jyk7XG5cbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuY21wKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSkgPiAwO1xuICAgICAgICBjYXNlICckbHQnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRsdCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpIDwgMDtcbiAgICAgICAgY2FzZSAnJGd0ZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGd0ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpID49IDA7XG4gICAgICAgIGNhc2UgJyRsdGUnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRsdGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5jbXAoZG9jVmFsLCBvcGVyYXRvclZhbHVlKSA8PSAwO1xuICAgICAgICBjYXNlICckZXEnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRlcScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmVxdWFsKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSk7XG4gICAgICAgIGNhc2UgJyRuZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG5lJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiAhU2VsZWN0b3JNYXRjaGVyLmVxdWFsKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSk7XG4gICAgICAgIGNhc2UgJyRpbic6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGluJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuaW4oZG9jVmFsLCBvcGVyYXRvclZhbHVlKTtcbiAgICAgICAgY2FzZSAnJG5pbic6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG5pbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gIVNlbGVjdG9yTWF0Y2hlci5pbihkb2NWYWwsIG9wZXJhdG9yVmFsdWUpO1xuICAgICAgICAvLyBMb2dpY2FsIFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICBjYXNlICckbm90JzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbm90Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vICRvciwgJGFuZCwgJG5vciBhcmUgaW4gdGhlICdvcGVyYXRvcicga2luZCB0cmVhdG1lbnRcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICB2YXIgX2NsYXVzZSA9IHtcbiAgICAgICAgICAgICAgICBraW5kOiAncGxhaW4nLFxuICAgICAgICAgICAgICAgIGtleTogY2xhdXNlLmtleSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogb3BlcmF0b3JWYWx1ZSxcbiAgICAgICAgICAgICAgICB0eXBlOiBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgX3BhcmVudCA9IGNsYXVzZS52YWx1ZTtcbiAgICAgICAgICAgIHZhciBfa2V5ID0gXG4gICAgICAgICAgICByZXR1cm4gIShfdGVzdENsYXVzZShfY2xhdXNlLCBkb2NWYWwpKTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkdGV4dCB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICAvLyBFbGVtZW50IFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICBjYXNlICckZXhpc3RzJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkZXhpc3RzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBvcGVyYXRvclZhbHVlID8gIV8uaXNVbmRlZmluZWQoZG9jVmFsKSA6IF8uaXNVbmRlZmluZWQoZG9jVmFsKTtcbiAgICAgICAgY2FzZSAnJHR5cGUnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICR0eXBlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vICR0eXBlOiAxIGlzIHRydWUgZm9yIGFuIGFycmF5IGlmIGFueSBlbGVtZW50IGluIHRoZSBhcnJheSBpcyBvZlxuICAgICAgICAgICAgLy8gdHlwZSAxLiBidXQgYW4gYXJyYXkgZG9lc24ndCBoYXZlIHR5cGUgYXJyYXkgdW5sZXNzIGl0IGNvbnRhaW5zXG4gICAgICAgICAgICAvLyBhbiBhcnJheS4uXG4gICAgICAgICAgICAvLyB2YXIgU2VsZWN0b3IuX2YuX3R5cGUoZG9jVmFsKTtcbiAgICAgICAgICAgIC8vIHJldHVybiBTZWxlY3Rvci5fZi5fdHlwZShkb2NWYWwpLnR5cGUgPT09IG9wZXJhdG9yVmFsdWU7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIiR0eXBlIHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgIC8vIEV2YWx1YXRpb24gUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIGNhc2UgJyRtb2QnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRtb2QnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGRvY1ZhbCAlIG9wZXJhdG9yVmFsdWVbMF0gPT09IG9wZXJhdG9yVmFsdWVbMV07XG4gICAgICAgIGNhc2UgJyRvcHRpb25zJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkb3B0aW9ucyAoaWdub3JlZCknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWdub3JlLCBhcyBpdCBpcyB0byB0aGUgUmVnRXhwXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgY2FzZSAnJHJlZ2V4JzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkcmVnZXgnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIF9vcHQgPSAnJztcbiAgICAgICAgICAgIGlmIChfLmhhc0luKGNsYXVzZVZhbHVlLCAnJG9wdGlvbnMnKSkge1xuICAgICAgICAgICAgICAgIF9vcHQgPSBjbGF1c2VWYWx1ZVsnJG9wdGlvbnMnXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoL15naW0vLnRlc3QoX29wdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9nLCBpLCBtLCB4LCBzXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE8gbW9uZ28gdXNlcyBQQ1JFIGFuZCBzdXBwb3J0cyBzb21lIGFkZGl0aW9uYWwgZmxhZ3M6ICd4JyBhbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gJ3MnLiBqYXZhc2NyaXB0IGRvZXNuJ3Qgc3VwcG9ydCB0aGVtLiBzbyB0aGlzIGlzIGEgZGl2ZXJnZW5jZVxuICAgICAgICAgICAgICAgICAgICAvLyBiZXR3ZWVuIG91ciBiZWhhdmlvciBhbmQgbW9uZ28ncyBiZWhhdmlvci4gaWRlYWxseSB3ZSB3b3VsZFxuICAgICAgICAgICAgICAgICAgICAvLyBpbXBsZW1lbnQgeCBhbmQgcyBieSB0cmFuc2Zvcm1pbmcgdGhlIHJlZ2V4cCwgYnV0IG5vdCB0b2RheS4uXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIk9ubHkgdGhlIGksIG0sIGFuZCBnIHJlZ2V4cCBvcHRpb25zIGFyZSBzdXBwb3J0ZWRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXZpZXcgZmxhZ3MgLT4gZyAmIG1cbiAgICAgICAgICAgIHZhciByZWdleHAgPSBvcGVyYXRvclZhbHVlO1xuICAgICAgICAgICAgaWYgKF8uaXNSZWdFeHAocmVnZXhwKSkge1xuICAgICAgICAgICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwLnNvdXJjZSwgX29wdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwLCBfb3B0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHJlZ2V4cC50ZXN0KGRvY1ZhbCk7XG4gICAgICAgIGNhc2UgJyR0ZXh0JzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkdGV4dCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkdGV4dCB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICBjYXNlICckd2hlcmUnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICR3aGVyZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkd2hlcmUgdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgLy8gR2Vvc3BhdGlhbCBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgLy8gVE9ETyAtPiBpbiBvcGVyYXRvciBraW5kXG4gICAgICAgIC8vIFF1ZXJ5IE9wZXJhdG9yIEFycmF5XG4gICAgICAgIGNhc2UgJyRhbGwnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRhbGwnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5hbGwob3BlcmF0b3JWYWx1ZSwgZG9jVmFsKSA+IDA7XG4gICAgICAgIGNhc2UgJyRlbGVtTWF0Y2gnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRndCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkZWxlbU1hdGNoIHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgIGNhc2UgJyRzaXplJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkc2l6ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gXy5pc0FycmF5KGRvY1ZhbCkgJiYgZG9jVmFsLmxlbmd0aCA9PT0gb3BlcmF0b3JWYWx1ZTtcbiAgICAgICAgLy8gQml0d2lzZSBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgLy8gVE9ET1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICcgKyBrZXkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVucmVjb2duaXplZCBrZXkgaW4gc2VsZWN0b3I6IFwiICsga2V5KTtcbiAgICB9XG59O1xuXG52YXIgQnNvblR5cGVzID0ge1xuXHRfdHlwZXM6IFtcblx0XHR7IGFsaWFzOiAnbWluS2V5JywgbnVtYmVyOiAtMSwgb3JkZXI6IDEsIGlzVHlwZTogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdudWxsJywgbnVtYmVyOiAxMCwgb3JkZXI6IDIsIGlzVHlwZTogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdpbnQnLCBudW1iZXI6IDE2LCBvcmRlcjogMywgaXNUeXBlOiBfLmlzSW50ZWdlciB9LFxuXHRcdHsgYWxpYXM6ICdsb25nJywgbnVtYmVyOiAxOCwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc051bWJlciB9LFxuXHRcdHsgYWxpYXM6ICdkb3VibGUnLCBudW1iZXI6IDEsIG9yZGVyOiAzLCBpc1R5cGU6IF8uaXNOdW1iZXIgfSxcblx0XHR7IGFsaWFzOiAnbnVtYmVyJywgbnVtYmVyOiBudWxsLCBvcmRlcjogMywgaXNUeXBlOiBfLmlzTnVtYmVyIH0sXG5cdFx0eyBhbGlhczogJ3N5bWJvbCcsIG51bWJlcjogMTQsIG9yZGVyOiA0LCBpc1R5cGU6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnc3RyaW5nJywgbnVtYmVyOiAyLCBvcmRlcjogNCwgaXNUeXBlOiBfLmlzU3RyaW5nIH0sXG5cdFx0eyBhbGlhczogJ29iamVjdCcsIG51bWJlcjogMywgb3JkZXI6IDUsIGlzVHlwZTogXy5pc1BsYWluT2JqZWN0IH0sXG5cdFx0eyBhbGlhczogJ2FycmF5JywgbnVtYmVyOiA0LCBvcmRlcjogNiwgaXNUeXBlOiBfLmlzQXJyYXkgfSxcblx0XHR7IGFsaWFzOiAnYmluRGF0YScsIG51bWJlcjogNSwgb3JkZXI6IDcsIGlzVHlwZTogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdvYmplY3RJZCcsIG51bWJlcjogNywgb3JkZXI6IDgsIGlzVHlwZWZuYzogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdib29sJywgbnVtYmVyOiA4LCBvcmRlcjogOSwgaXNUeXBlOiBfLmlzQm9vbGVhbiB9LFxuXHRcdHsgYWxpYXM6ICdkYXRlJywgbnVtYmVyOiA5LCBvcmRlcjogMTAsIGlzVHlwZWZuYzogXy5pc0RhdGUgfSwgICAgICAgICAvLyBmb3JtYXRcblx0XHR7IGFsaWFzOiAndGltZXN0YW1wJywgbnVtYmVyOiAxNywgb3JkZXI6IDExLCBpc1R5cGU6IF8uaXNEYXRlIH0sICAgLy8gZm9ybWF0XG5cdFx0eyBhbGlhczogJ3JlZ2V4JywgbnVtYmVyOiAxMSwgb3JkZXI6IDEyLCBpc1R5cGU6IF8uaXNSZWdFeHAgfSxcblx0XHR7IGFsaWFzOiAnbWF4S2V5JywgbnVtYmVyOiAxMjcsIG9yZGVyOiAxMywgaXNUeXBlOiBudWxsIH1cblx0XHRcbi8vIFx0XHR1bmRlZmluZWQgNlxuLy8gXHRcdGRiUG9pbnRlclxuLy8gXHRcdGphdmFzY3JpcHRcbi8vIFx0XHRqYXZhc2NyaXB0V2l0aFNjb3BlXG4vLyBcdFx0ZnVuY3Rpb25cblx0XSxcblx0XG5cdGdldEJ5TnVtYmVyOiBmdW5jdGlvbihudW0pIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3R5cGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAodGhpcy5fdHlwZXNbaV0ubnVtYmVyID09PSBudW0pIHJldHVybiB0aGlzLl90eXBlc1tpXTtcblx0XHR9XG5cdFx0XG5cdFx0dGhyb3cgRXJyb3IoXCJVbmFjY2VwdGVkIEJTT04gdHlwZSBudW1iZXJcIik7XG5cdH0sXG5cdGdldEJ5QWxpYXM6IGZ1bmN0aW9uKGFsaWFzKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl90eXBlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKHRoaXMuX3R5cGVzW2ldLmFsaWFzID09PSBhbGlhcykgcmV0dXJuIHRoaXMuX3R5cGVzW2ldO1xuXHRcdH1cblx0XHRcblx0XHR0aHJvdyBFcnJvcihcIlVuYWNjZXB0ZWQgQlNPTiB0eXBlIGFsaWFzXCIpO1xuXHR9LFxuXHRnZXRCeVZhbHVlOiBmdW5jdGlvbih2YWwpIHtcblx0ICAgIGlmIChfLmlzTnVtYmVyKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJkb3VibGVcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1N0cmluZyh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwic3RyaW5nXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNCb29sZWFuKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJib29sXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwiYXJyYXlcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc051bGwodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcIm51bGxcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1JlZ0V4cCh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwicmVnZXhcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1BsYWluT2JqZWN0KHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJvYmplY3RcIik7XG4gICAgICAgIFxuICAgICAgICB0aHJvdyBFcnJvcihcIlVuYWNjZXB0ZWQgQlNPTiB0eXBlXCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gaWYgKF8uaXNGdW5jdGlvbih2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwiZG91YmxlXCIpO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yTWF0Y2hlcjsiXX0=
