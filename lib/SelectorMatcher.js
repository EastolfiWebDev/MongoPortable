"use strict";

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9TZWxlY3Rvck1hdGNoZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSSxTQUFTLFFBQVEsZ0JBQVIsQ0FBYjtJQUNJLElBQUksUUFBUSxRQUFSLENBRFI7O0FBR0EsSUFBSSxTQUFTLElBQWI7O0lBRU0sZTtBQUNMLDZCQUFZLFFBQVosRUFBc0I7QUFBQTs7QUFDZixhQUFLLE9BQUwsR0FBZSxTQUFTLE9BQXhCOztBQUVBLGlCQUFTLE9BQU8sUUFBaEI7QUFDTjs7Ozs2QkFFSSxRLEVBQVU7QUFDZCxtQkFBTyxLQUFQLENBQWEsOEJBQWI7O0FBRUEsZ0JBQUksU0FBUyxJQUFiOztBQUVBLGdCQUFJLEVBQUUsS0FBRixDQUFRLFFBQVIsQ0FBSixFQUF1QjtBQUN0Qix1QkFBTyxLQUFQLENBQWEsa0JBQWI7O0FBRUEsdUJBQU8sS0FBUCxDQUFhLCtCQUFiO0FBQ0E7O0FBRUQsbUJBQU8sS0FBUCxDQUFhLHNCQUFiOztBQUVBLGlCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksS0FBSyxPQUFMLENBQWEsTUFBakMsRUFBeUMsR0FBekMsRUFBOEM7QUFDN0Msb0JBQUksU0FBUyxLQUFLLE9BQUwsQ0FBYSxDQUFiLENBQWI7O0FBRUEsb0JBQUksT0FBTyxJQUFQLEtBQWdCLFVBQXBCLEVBQWdDO0FBQy9CLDJCQUFPLEtBQVAsQ0FBYSxvQkFBYjs7QUFFQSw2QkFBUyxPQUFPLEtBQVAsQ0FBYSxJQUFiLENBQWtCLElBQWxCLEVBQXdCLFFBQXhCLENBQVQ7QUFDQSxpQkFKRCxNQUlPLElBQUksT0FBTyxJQUFQLEtBQWdCLE9BQXBCLEVBQTZCO0FBQ25DLDJCQUFPLEtBQVAsaUNBQTBDLE9BQU8sR0FBakQsdUJBQXFFLEtBQUssU0FBTCxDQUFlLE9BQU8sS0FBdEIsQ0FBckU7O0FBRUEsNkJBQVMsWUFBWSxNQUFaLEVBQW9CLFNBQVMsT0FBTyxHQUFoQixDQUFwQixDQUFUOztBQUVBLDJCQUFPLEtBQVAsQ0FBYSxz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QixZQUFJLEVBQUUsT0FBRixDQUFVLEdBQVYsQ0FBSixFQUFvQixPQUFPLEtBQUssVUFBTCxDQUFnQixPQUFoQixDQUFQOztBQUVwQixZQUFJLEVBQUUsTUFBRixDQUFTLEdBQVQsQ0FBSixFQUFtQixPQUFPLEtBQUssVUFBTCxDQUFnQixNQUFoQixDQUFQOztBQUVuQixZQUFJLEVBQUUsUUFBRixDQUFXLEdBQVgsQ0FBSixFQUFxQixPQUFPLEtBQUssVUFBTCxDQUFnQixPQUFoQixDQUFQOztBQUVyQixZQUFJLEVBQUUsYUFBRixDQUFnQixHQUFoQixDQUFKLEVBQTBCLE9BQU8sS0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQVA7O0FBRTFCLFlBQUksRUFBRSxRQUFGLENBQVcsR0FBWCxDQUFKLEVBQXFCLE9BQU8sS0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQVA7O0FBRXJCLGNBQU0sTUFBTSxzQkFBTixDQUFOO0FBQ047QUFsRGMsQ0FBaEI7O0FBcURBLE9BQU8sT0FBUCxHQUFpQixlQUFqQiIsImZpbGUiOiJTZWxlY3Rvck1hdGNoZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgTG9nZ2VyID0gcmVxdWlyZShcIi4vdXRpbHMvTG9nZ2VyXCIpLFxuICAgIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpO1xuICAgIFxudmFyIGxvZ2dlciA9IG51bGw7XG5cbmNsYXNzIFNlbGVjdG9yTWF0Y2hlciB7XG5cdGNvbnN0cnVjdG9yKHNlbGVjdG9yKSB7XG4gICAgICAgIHRoaXMuY2xhdXNlcyA9IHNlbGVjdG9yLmNsYXVzZXM7XG5cbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuXHR9XG5cdFxuXHR0ZXN0KGRvY3VtZW50KSB7XG5cdFx0bG9nZ2VyLmRlYnVnKCdDYWxsZWQgU2VsZWN0b3JNYXRjaGVyLT50ZXN0Jyk7XG5cdFx0XG5cdFx0dmFyIF9tYXRjaCA9IHRydWU7XG5cblx0XHRpZiAoXy5pc05pbChkb2N1bWVudCkpIHtcblx0XHRcdGxvZ2dlci5kZWJ1ZygnZG9jdW1lbnQgLT4gbnVsbCcpO1xuXHRcdFx0XG5cdFx0XHRsb2dnZXIudGhyb3coXCJQYXJhbWV0ZXIgJ2RvY3VtZW50JyByZXF1aXJlZFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0bG9nZ2VyLmRlYnVnKCdkb2N1bWVudCAtPiBub3QgbnVsbCcpO1xuXHRcdFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jbGF1c2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgY2xhdXNlID0gdGhpcy5jbGF1c2VzW2ldO1xuXHRcdFx0XG5cdFx0XHRpZiAoY2xhdXNlLmtpbmQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgLT4gZnVuY3Rpb24nKTtcblx0XHRcdFx0XG5cdFx0XHRcdF9tYXRjaCA9IGNsYXVzZS52YWx1ZS5jYWxsKG51bGwsIGRvY3VtZW50KTtcblx0XHRcdH0gZWxzZSBpZiAoY2xhdXNlLmtpbmQgPT09ICdwbGFpbicpIHtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKGBjbGF1c2UgLT4gcGxhaW4gb24gZmllbGQgXCIke2NsYXVzZS5rZXl9XCIgYW5kIHZhbHVlID0gJHtKU09OLnN0cmluZ2lmeShjbGF1c2UudmFsdWUpfWApO1xuXHRcdFx0XHRcblx0XHRcdFx0X21hdGNoID0gX3Rlc3RDbGF1c2UoY2xhdXNlLCBkb2N1bWVudFtjbGF1c2Uua2V5XSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZSByZXN1bHQgLT4gJyArIF9tYXRjaCk7XG5cdFx0XHR9IGVsc2UgaWYgKGNsYXVzZS5raW5kID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRsb2dnZXIuZGVidWcoYGNsYXVzZSAtPiBvYmplY3Qgb24gZmllbGQgXCIke2NsYXVzZS5rZXkuam9pbignLicpfVwiIGFuZCB2YWx1ZSA9ICR7SlNPTi5zdHJpbmdpZnkoY2xhdXNlLnZhbHVlKX1gKTtcblx0XHRcdFx0XG5cdFx0XHRcdF9tYXRjaCA9IF90ZXN0T2JqZWN0Q2xhdXNlKGNsYXVzZSwgZG9jdW1lbnQsIF8uY2xvbmUoY2xhdXNlLmtleSkucmV2ZXJzZSgpKTtcblx0XHRcdFx0XG5cdFx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlIHJlc3VsdCAtPiAnICsgX21hdGNoKTtcblx0XHRcdH0gZWxzZSBpZiAoY2xhdXNlLmtpbmQgPT09ICdvcGVyYXRvcicpIHtcblx0XHRcdCAgICBsb2dnZXIuZGVidWcoYGNsYXVzZSAtPiBvcGVyYXRvciAnJHtjbGF1c2Uua2V5fSdgKTtcblx0XHRcdCAgICBcblx0XHQgICAgICAgIGxldCBfbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXIoeyBjbGF1c2VzOiBjbGF1c2UudmFsdWUgfSk7XG5cdFx0ICAgICAgICBcblx0XHQgICAgICAgIF9tYXRjaCA9IF9tYXRjaGVyLnRlc3QoZG9jdW1lbnQpO1xuXHRcdCAgICAgICAgXG5cdFx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlIHJlc3VsdCAtPiAnICsgX21hdGNoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Ly8gSWYgYW55IHRlc3QgY2FzZSBmYWlscywgdGhlIGRvY3VtZW50IHdpbGwgbm90IG1hdGNoXG5cdFx0XHRpZiAoX21hdGNoID09PSBmYWxzZSB8fCBfbWF0Y2ggPT09ICdmYWxzZScpIHtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCd0aGUgZG9jdW1lbnQgZG8gbm90IG1hdGNoZXMnKTtcblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0Ly8gRXZlcnl0aGluZyBtYXRjaGVzXG5cdFx0bG9nZ2VyLmRlYnVnKCd0aGUgZG9jdW1lbnQgbWF0Y2hlcycpO1xuXHRcdFxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdFxuXHRzdGF0aWMgYWxsKGFycmF5LCB2YWx1ZSkge1xuICAgICAgICAvLyAkYWxsIGlzIG9ubHkgbWVhbmluZ2Z1bCBvbiBhcnJheXNcbiAgICAgICAgaWYgKCEoYXJyYXkgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE8gc2hvdWxkIHVzZSBhIGNhbm9uaWNhbGl6aW5nIHJlcHJlc2VudGF0aW9uLCBzbyB0aGF0IHdlXG4gICAgICAgIC8vIGRvbid0IGdldCBzY3Jld2VkIGJ5IGtleSBvcmRlclxuICAgICAgICB2YXIgcGFydHMgPSB7fTtcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IDA7XG5cbiAgICAgICAgXy5mb3JFYWNoKHZhbHVlLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YXIgaGFzaCA9IEpTT04uc3RyaW5naWZ5KHZhbCk7XG5cbiAgICAgICAgICAgIGlmICghKGhhc2ggaW4gcGFydHMpKSB7XG4gICAgICAgICAgICAgICAgcGFydHNbaGFzaF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlbWFpbmluZysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaGFzaCA9IEpTT04uc3RyaW5naWZ5KGFycmF5W2ldKTtcbiAgICAgICAgICAgIGlmIChwYXJ0c1toYXNoXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJ0c1toYXNoXTtcbiAgICAgICAgICAgICAgICByZW1haW5pbmctLTtcblxuICAgICAgICAgICAgICAgIGlmICgwID09PSByZW1haW5pbmcpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblx0XG5cdHN0YXRpYyBpbihhcnJheSwgdmFsdWUpIHtcbiAgICAgICAgaWYgKCFfLmlzT2JqZWN0KGFycmF5KSkge1xuICAgICAgICAgICAgLy8gb3B0aW1pemF0aW9uOiB1c2Ugc2NhbGFyIGVxdWFsaXR5IChmYXN0KVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChhcnJheSA9PT0gdmFsdWVbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBub3BlLCBoYXZlIHRvIHVzZSBkZWVwIGVxdWFsaXR5XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKFNlbGVjdG9yTWF0Y2hlci5lcXVhbChhcnJheSwgdmFsdWVbaV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXHRcblx0Ly8gZGVlcCBlcXVhbGl0eSB0ZXN0OiB1c2UgZm9yIGxpdGVyYWwgZG9jdW1lbnQgYW5kIGFycmF5IG1hdGNoZXNcblx0c3RhdGljIGVxdWFsKGFycmF5LCBxdmFsKSB7XG4gICAgICAgIHZhciBtYXRjaCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAvLyBzY2FsYXJzXG4gICAgICAgICAgICBpZiAoXy5pc051bWJlcihhKSB8fCBfLmlzU3RyaW5nKGEpIHx8IF8uaXNCb29sZWFuKGEpIHx8IF8uaXNOaWwoYSkpIHJldHVybiBhID09PSBiO1xuXG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGEpKSByZXR1cm4gZmFsc2U7ICAvLyBOb3QgYWxsb3dlZCB5ZXRcblxuICAgICAgICAgICAgLy8gT0ssIHR5cGVvZiBhID09PSAnb2JqZWN0J1xuICAgICAgICAgICAgaWYgKCFfLmlzT2JqZWN0KGIpKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIGFycmF5c1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShhKSkge1xuICAgICAgICAgICAgICAgIGlmICghXy5pc0FycmF5KGIpKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRjaChhW2ldLGJbaV0pKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIG9iamVjdHNcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICB2YXIgdW5tYXRjaGVkX2Jfa2V5cyA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIGIpXG4gICAgICAgICAgICAgICAgdW5tYXRjaGVkX2Jfa2V5cysrO1xuICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBhKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoeCBpbiBiKSB8fCAhbWF0Y2goYVt4XSwgYlt4XSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB1bm1hdGNoZWRfYl9rZXlzLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdW5tYXRjaGVkX2Jfa2V5cyA9PT0gMDtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvLyBGb2xsb3cgTW9uZ28gaW4gY29uc2lkZXJpbmcga2V5IG9yZGVyIHRvIGJlIHBhcnQgb2ZcbiAgICAgICAgICAgIC8vIGVxdWFsaXR5LiBLZXkgZW51bWVyYXRpb24gb3JkZXIgaXMgYWN0dWFsbHkgbm90IGRlZmluZWQgaW5cbiAgICAgICAgICAgIC8vIHRoZSBlY21hc2NyaXB0IHNwZWMgYnV0IGluIHByYWN0aWNlIG1vc3QgaW1wbGVtZW50YXRpb25zXG4gICAgICAgICAgICAvLyBwcmVzZXJ2ZSBpdC4gKFRoZSBleGNlcHRpb24gaXMgQ2hyb21lLCB3aGljaCBwcmVzZXJ2ZXMgaXRcbiAgICAgICAgICAgIC8vIHVzdWFsbHksIGJ1dCBub3QgZm9yIGtleXMgdGhhdCBwYXJzZSBhcyBpbnRzLilcbiAgICAgICAgICAgIHZhciBiX2tleXMgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgYXJyYXkgaW4gYikge1xuICAgICAgICAgICAgICAgIGJfa2V5cy5wdXNoKGJbYXJyYXldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgYXJyYXkgaW4gYSkge1xuICAgICAgICAgICAgICAgIGlmIChpID49IGJfa2V5cy5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmICghbWF0Y2goYVthcnJheV0sIGJfa2V5c1tpXSkpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpICE9PSBiX2tleXMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBtYXRjaChhcnJheSwgcXZhbCk7XG4gICAgfVxuXHRcblx0Ly8gaWYgeCBpcyBub3QgYW4gYXJyYXksIHRydWUgaWZmIGYoeCkgaXMgdHJ1ZS4gaWYgeCBpcyBhbiBhcnJheSxcbiAgICAvLyB0cnVlIGlmZiBmKHkpIGlzIHRydWUgZm9yIGFueSB5IGluIHguXG4gICAgLy9cbiAgICAvLyB0aGlzIGlzIHRoZSB3YXkgbW9zdCBtb25nbyBvcGVyYXRvcnMgKGxpa2UgJGd0LCAkbW9kLCAkdHlwZS4uKVxuICAgIC8vIHRyZWF0IHRoZWlyIGFyZ3VtZW50cy5cbiAgICBzdGF0aWMgbWF0Y2hlcyh2YWx1ZSwgZnVuYykge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChmdW5jKHZhbHVlW2ldKSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmdW5jKHZhbHVlKTtcbiAgICB9XG5cdFxuXHQvLyBsaWtlIF9tYXRjaGVzLCBidXQgaWYgeCBpcyBhbiBhcnJheSwgaXQncyB0cnVlIG5vdCBvbmx5IGlmIGYoeSlcbiAgICAvLyBpcyB0cnVlIGZvciBzb21lIHkgaW4geCwgYnV0IGFsc28gaWYgZih4KSBpcyB0cnVlLlxuICAgIC8vXG4gICAgLy8gdGhpcyBpcyB0aGUgd2F5IG1vbmdvIHZhbHVlIGNvbXBhcmlzb25zIHVzdWFsbHkgd29yaywgbGlrZSB7eDpcbiAgICAvLyA0fSwge3g6IFs0XX0sIG9yIHt4OiB7JGluOiBbMSwyLDNdfX0uXG4gICAgc3RhdGljIG1hdGNoZXNfcGx1cyh2YWx1ZSwgZnVuYykge1xuICAgICAgICAvLyBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAvLyAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyAgICAgICAgIGlmIChmdW5jKHZhbHVlW2ldKSkgcmV0dXJuIHRydWU7XG4gICAgICAgIC8vICAgICB9XG5cbiAgICAgICAgLy8gICAgIC8vIGZhbGwgdGhyb3VnaCFcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIHJldHVybiBmdW5jKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5tYXRjaGVzKHZhbHVlLCBmdW5jKSB8fCBmdW5jKHZhbHVlKTtcbiAgICB9XG5cdFxuXHQvLyBjb21wYXJlIHR3byB2YWx1ZXMgb2YgdW5rbm93biB0eXBlIGFjY29yZGluZyB0byBCU09OIG9yZGVyaW5nXG4gICAgLy8gc2VtYW50aWNzLiAoYXMgYW4gZXh0ZW5zaW9uLCBjb25zaWRlciAndW5kZWZpbmVkJyB0byBiZSBsZXNzIHRoYW5cbiAgICAvLyBhbnkgb3RoZXIgdmFsdWUuKVxuICAgIC8vIHJldHVybiBuZWdhdGl2ZSBpZiBhIGlzIGxlc3MsIHBvc2l0aXZlIGlmIGIgaXMgbGVzcywgb3IgMCBpZiBlcXVhbFxuICAgIHN0YXRpYyBjbXAoYSwgYikge1xuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChhKSkgcmV0dXJuIGIgPT09IHVuZGVmaW5lZCA/IDAgOiAtMTtcblxuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChiKSkgcmV0dXJuIDE7XG5cdFx0XG4gICAgICAgIHZhciBhVHlwZSA9IEJzb25UeXBlcy5nZXRCeVZhbHVlKGEpO1xuICAgICAgICB2YXIgYlR5cGUgPSBCc29uVHlwZXMuZ2V0QnlWYWx1ZShiKTtcblxuICAgICAgICBpZiAoYVR5cGUub3JkZXIgIT09IGJUeXBlLm9yZGVyKSByZXR1cm4gYVR5cGUub3JkZXIgPCBiVHlwZS5vcmRlciA/IC0xIDogMTtcblxuICAgICAgICAvLyBTYW1lIHNvcnQgb3JkZXIsIGJ1dCBkaXN0aW5jdCB2YWx1ZSB0eXBlXG4gICAgICAgIGlmIChhVHlwZS5udW1iZXIgIT09IGJUeXBlLm51bWJlcikge1xuICAgICAgICAgICAgLy8gQ3VycmVudGx5LCBTeW1ib2xzIGNhbiBub3QgYmUgc29ydGVyZWQgaW4gSlMsIHNvIHdlIGFyZSBzZXR0aW5nIHRoZSBTeW1ib2wgYXMgZ3JlYXRlclxuICAgICAgICAgICAgaWYgKF8uaXNTeW1ib2woYSkpIHJldHVybiAxO1xuICAgICAgICAgICAgaWYgKF8uaXNTeW1ib2woYikpIHJldHVybiAtMTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVE9ETyBJbnRlZ2VyLCBEYXRlIGFuZCBUaW1lc3RhbXBcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOdW1iZXIoYSkpIHJldHVybiBhIC0gYjtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzU3RyaW5nKGEpKSByZXR1cm4gYSA8IGIgPyAtMSA6IChhID09PSBiID8gMCA6IDEpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNCb29sZWFuKGEpKSB7XG4gICAgICAgICAgICBpZiAoYSkgcmV0dXJuIGIgPyAwIDogMTtcblxuICAgICAgICAgICAgcmV0dXJuIGIgPyAtMSA6IDA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQXJyYXkoYSkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyA7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpID09PSBhLmxlbmd0aCkgcmV0dXJuIChpID09PSBiLmxlbmd0aCkgPyAwIDogLTE7XG5cbiAgICAgICAgICAgICAgICBpZiAoaSA9PT0gYi5sZW5ndGgpIHJldHVybiAxO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgdmFyIHMgPSBTZWxlY3Rvck1hdGNoZXIuY21wKGFbaV0sIGJbaV0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHMgIT09IDApIHJldHVybiBzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc051bGwoYSkpIHJldHVybiAwO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNSZWdFeHAoYSkpIHRocm93IEVycm9yKFwiU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIHJlZ3VsYXIgZXhwcmVzc2lvblwiKTsgLy8gVE9ET1xuICAgICAgICBcbiAgICAgICAgLy8gaWYgKF8uaXNGdW5jdGlvbihhKSkgcmV0dXJuIHt0eXBlOiAxMywgb3JkZXI6IDEwMCwgZm5jOiBfLmlzRnVuY3Rpb259O1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNQbGFpbk9iamVjdChhKSkge1xuICAgICAgICAgICAgdmFyIHRvX2FycmF5ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2gob2JqW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcCh0b19hcnJheShhKSwgdG9fYXJyYXkoYikpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZG91YmxlXG4gICAgICAgIC8vIGlmICh0YSA9PT0gMSkgIHJldHVybiBhIC0gYjtcblxuICAgICAgICAvLyBzdHJpbmdcbiAgICAgICAgLy8gaWYgKHRiID09PSAyKSByZXR1cm4gYSA8IGIgPyAtMSA6IChhID09PSBiID8gMCA6IDEpO1xuXG4gICAgICAgIC8vIE9iamVjdFxuICAgICAgICAvLyBpZiAodGEgPT09IDMpIHtcbiAgICAgICAgLy8gICAgIC8vIHRoaXMgY291bGQgYmUgbXVjaCBtb3JlIGVmZmljaWVudCBpbiB0aGUgZXhwZWN0ZWQgY2FzZSAuLi5cbiAgICAgICAgLy8gICAgIHZhciB0b19hcnJheSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgLy8gICAgICAgICB2YXIgcmV0ID0gW107XG5cbiAgICAgICAgLy8gICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIC8vICAgICAgICAgICAgIHJldC5wdXNoKGtleSk7XG4gICAgICAgIC8vICAgICAgICAgICAgIHJldC5wdXNoKG9ialtrZXldKTtcbiAgICAgICAgLy8gICAgICAgICB9XG5cbiAgICAgICAgLy8gICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAvLyAgICAgfTtcblxuICAgICAgICAvLyAgICAgcmV0dXJuIFNlbGVjdG9yLl9mLl9jbXAodG9fYXJyYXkoYSksIHRvX2FycmF5KGIpKTtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIEFycmF5XG4gICAgICAgIC8vIGlmICh0YSA9PT0gNCkge1xuICAgICAgICAvLyAgICAgZm9yICh2YXIgaSA9IDA7IDsgaSsrKSB7XG4gICAgICAgIC8vICAgICAgICAgaWYgKGkgPT09IGEubGVuZ3RoKSByZXR1cm4gKGkgPT09IGIubGVuZ3RoKSA/IDAgOiAtMTtcblxuICAgICAgICAvLyAgICAgICAgIGlmIChpID09PSBiLmxlbmd0aCkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIC8vICAgICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG5cbiAgICAgICAgLy8gICAgICAgICB2YXIgcyA9IFNlbGVjdG9yLl9mLl9jbXAoYVtpXSwgYltpXSk7XG5cbiAgICAgICAgLy8gICAgICAgICBpZiAocyAhPT0gMCkgcmV0dXJuIHM7XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyA1OiBiaW5hcnkgZGF0YVxuICAgICAgICAvLyA3OiBvYmplY3QgaWRcblxuICAgICAgICAvLyBib29sZWFuXG4gICAgICAgIC8vIGlmICh0YSA9PT0gOCkge1xuICAgICAgICAvLyAgICAgaWYgKGEpIHJldHVybiBiID8gMCA6IDE7XG5cbiAgICAgICAgLy8gICAgIHJldHVybiBiID8gLTEgOiAwO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gOTogZGF0ZVxuXG4gICAgICAgIC8vIG51bGxcbiAgICAgICAgLy8gaWYgKHRhID09PSAxMCkgcmV0dXJuIDA7XG5cbiAgICAgICAgLy8gcmVnZXhwXG4gICAgICAgIC8vIGlmICh0YSA9PT0gMTEpIHtcbiAgICAgICAgLy8gICAgIHRocm93IEVycm9yKFwiU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIHJlZ3VsYXIgZXhwcmVzc2lvblwiKTsgLy8gVE9ET1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gMTM6IGphdmFzY3JpcHQgY29kZVxuICAgICAgICAvLyAxNDogc3ltYm9sXG4gICAgICAgIGlmIChfLmlzU3ltYm9sKGEpKSB7XG4gICAgICAgICAgICAvLyBDdXJyZW50bHksIFN5bWJvbHMgY2FuIG5vdCBiZSBzb3J0ZXJlZCBpbiBKUywgc28gd2UgYXJlIHJldHVybmluZyBhbiBlcXVhbGl0eVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgLy8gMTU6IGphdmFzY3JpcHQgY29kZSB3aXRoIHNjb3BlXG4gICAgICAgIC8vIDE2OiAzMi1iaXQgaW50ZWdlclxuICAgICAgICAvLyAxNzogdGltZXN0YW1wXG4gICAgICAgIC8vIDE4OiA2NC1iaXQgaW50ZWdlclxuICAgICAgICAvLyAyNTU6IG1pbmtleVxuICAgICAgICAvLyAxMjc6IG1heGtleVxuXG4gICAgICAgIC8vIGphdmFzY3JpcHQgY29kZVxuICAgICAgICAvLyBpZiAodGEgPT09IDEzKSB7XG4gICAgICAgIC8vICAgICB0aHJvdyBFcnJvcihcIlNvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiBKYXZhc2NyaXB0IGNvZGVcIik7IC8vIFRPRE9cbiAgICAgICAgLy8gfVxuICAgIH1cbn1cblxudmFyIF90ZXN0Q2xhdXNlID0gZnVuY3Rpb24oY2xhdXNlLCB2YWwpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZCBfdGVzdENsYXVzZScpO1xuICAgIFxuICAgIC8vIHZhciBfdmFsID0gY2xhdXNlLnZhbHVlO1xuICAgIFxuICAgIC8vIGlmIFJlZ0V4cCB8fCAkIC0+IE9wZXJhdG9yXG4gICAgXG4gICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5tYXRjaGVzX3BsdXModmFsLCBmdW5jdGlvbihfdmFsdWUpIHtcbiAgICAgICAgLy8gVE9ETyBvYmplY3QgaWRzLCBkYXRlcywgdGltZXN0YW1wcz9cbiAgICAgICAgc3dpdGNoIChjbGF1c2UudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnbnVsbCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IE51bGwgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9RdWVyeWluZythbmQrbnVsbHNcbiAgICAgICAgICAgICAgICBpZiAoXy5pc05pbChfdmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdyZWdleHAnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBSZWdFeHAgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gX3Rlc3RPcGVyYXRvckNsYXVzZShjbGF1c2UsIF92YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdsaXRlcmFsX29iamVjdCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IExpdGVyYWwgT2JqZWN0IGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5lcXVhbChfdmFsdWUsIGNsYXVzZS52YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdvcGVyYXRvcl9vYmplY3QnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBPcGVyYXRvciBPYmplY3QgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gX3Rlc3RPcGVyYXRvckNsYXVzZShjbGF1c2UsIF92YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBTdHJpbmcgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gXy50b1N0cmluZyhfdmFsdWUpID09PSBfLnRvU3RyaW5nKGNsYXVzZS52YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBOdW1iZXIgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gXy50b051bWJlcihfdmFsdWUpID09PSBfLnRvTnVtYmVyKGNsYXVzZS52YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgQm9vbGVhbiBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiAoXy5pc0Jvb2xlYW4oX3ZhbHVlKSAmJiBfLmlzQm9vbGVhbihjbGF1c2UudmFsdWUpICYmIChfdmFsdWUgPT09IGNsYXVzZS52YWx1ZSkpO1xuICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBCb29sZWFuIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgdHlwZVxuICAgICAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoX3ZhbHVlKSAmJiBfLmlzQXJyYXkoY2xhdXNlLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBsZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgaWYgKF92YWx1ZS5sZW5ndGggPT09IGNsYXVzZS52YWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGl0ZW1zXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF92YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGF1c2UudmFsdWUuaW5kZXhPZihfdmFsdWVbaV0pID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IEZ1bmN0aW9uIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgdmFsdWUgdHlwZSBpbiBxdWVyeVwiKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgdmFsdWUgdHlwZSBpbiBxdWVyeVwiKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxudmFyIF90ZXN0T2JqZWN0Q2xhdXNlID0gZnVuY3Rpb24oY2xhdXNlLCBkb2MsIGtleSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIF90ZXN0T2JqZWN0Q2xhdXNlJyk7XG4gICAgXG4gICAgdmFyIHZhbCA9IG51bGw7XG4gICAgXG4gICAgaWYgKGtleS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBwYXRoID0ga2V5LnBvcCgpO1xuICAgICAgICB2YWwgPSBkb2NbcGF0aF07XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIuZGVidWcoJ2NoZWNrIG9uIGZpZWxkICcgKyBwYXRoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRPRE8gYWRkIF8uaXNOdW1iZXIodmFsKSBhbmQgdHJlYXQgaXQgYXMgYW4gYXJyYXlcbiAgICAgICAgaWYgKHZhbCkge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZyh2YWwpO1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdnb2luZyBkZWVwZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIF90ZXN0T2JqZWN0Q2xhdXNlKGNsYXVzZSwgdmFsLCBrZXkpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdsb3dlc3QgcGF0aDogJyArIHBhdGgpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIF90ZXN0Q2xhdXNlKGNsYXVzZSwgZG9jKTtcbiAgICB9XG59O1xuXG52YXIgX3Rlc3RPcGVyYXRvckNsYXVzZSA9IGZ1bmN0aW9uKGNsYXVzZSwgdmFsdWUpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZCBfdGVzdE9wZXJhdG9yQ2xhdXNlJyk7XG4gICAgXG4gICAgZm9yICh2YXIga2V5IGluIGNsYXVzZS52YWx1ZSkge1xuICAgICAgICBpZiAoIV90ZXN0T3BlcmF0b3JDb25zdHJhaW50KGtleSwgY2xhdXNlLnZhbHVlW2tleV0sIGNsYXVzZS52YWx1ZSwgdmFsdWUsIGNsYXVzZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbnZhciBfdGVzdE9wZXJhdG9yQ29uc3RyYWludCA9IGZ1bmN0aW9uIChrZXksIG9wZXJhdG9yVmFsdWUsIGNsYXVzZVZhbHVlLCBkb2NWYWwsIGNsYXVzZSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIF90ZXN0T3BlcmF0b3JDb25zdHJhaW50Jyk7XG4gICAgXG4gICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgLy8gQ29tcGFyaXNvbiBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgY2FzZSAnJGd0JzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkZ3QnKTtcblxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5jbXAoZG9jVmFsLCBvcGVyYXRvclZhbHVlKSA+IDA7XG4gICAgICAgIGNhc2UgJyRsdCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGx0Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuY21wKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSkgPCAwO1xuICAgICAgICBjYXNlICckZ3RlJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkZ3RlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuY21wKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSkgPj0gMDtcbiAgICAgICAgY2FzZSAnJGx0ZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGx0ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpIDw9IDA7XG4gICAgICAgIGNhc2UgJyRlcSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGVxJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuZXF1YWwoZG9jVmFsLCBvcGVyYXRvclZhbHVlKTtcbiAgICAgICAgY2FzZSAnJG5lJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbmUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuICFTZWxlY3Rvck1hdGNoZXIuZXF1YWwoZG9jVmFsLCBvcGVyYXRvclZhbHVlKTtcbiAgICAgICAgY2FzZSAnJGluJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkaW4nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5pbihkb2NWYWwsIG9wZXJhdG9yVmFsdWUpO1xuICAgICAgICBjYXNlICckbmluJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbmluJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiAhU2VsZWN0b3JNYXRjaGVyLmluKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSk7XG4gICAgICAgIC8vIExvZ2ljYWwgUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIGNhc2UgJyRub3QnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRub3QnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gJG9yLCAkYW5kLCAkbm9yIGFyZSBpbiB0aGUgJ29wZXJhdG9yJyBraW5kIHRyZWF0bWVudFxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIHZhciBfY2xhdXNlID0ge1xuICAgICAgICAgICAgICAgIGtpbmQ6ICdwbGFpbicsXG4gICAgICAgICAgICAgICAga2V5OiBjbGF1c2Uua2V5LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBvcGVyYXRvclZhbHVlLFxuICAgICAgICAgICAgICAgIHR5cGU6IFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBfcGFyZW50ID0gY2xhdXNlLnZhbHVlO1xuICAgICAgICAgICAgdmFyIF9rZXkgPSBcbiAgICAgICAgICAgIHJldHVybiAhKF90ZXN0Q2xhdXNlKF9jbGF1c2UsIGRvY1ZhbCkpO1xuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIiRub3QgdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgLy8gRWxlbWVudCBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgY2FzZSAnJGV4aXN0cyc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGV4aXN0cycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gb3BlcmF0b3JWYWx1ZSA/ICFfLmlzVW5kZWZpbmVkKGRvY1ZhbCkgOiBfLmlzVW5kZWZpbmVkKGRvY1ZhbCk7XG4gICAgICAgIGNhc2UgJyR0eXBlJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkdHlwZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyAkdHlwZTogMSBpcyB0cnVlIGZvciBhbiBhcnJheSBpZiBhbnkgZWxlbWVudCBpbiB0aGUgYXJyYXkgaXMgb2ZcbiAgICAgICAgICAgIC8vIHR5cGUgMS4gYnV0IGFuIGFycmF5IGRvZXNuJ3QgaGF2ZSB0eXBlIGFycmF5IHVubGVzcyBpdCBjb250YWluc1xuICAgICAgICAgICAgLy8gYW4gYXJyYXkuLlxuICAgICAgICAgICAgLy8gdmFyIFNlbGVjdG9yLl9mLl90eXBlKGRvY1ZhbCk7XG4gICAgICAgICAgICAvLyByZXR1cm4gU2VsZWN0b3IuX2YuX3R5cGUoZG9jVmFsKS50eXBlID09PSBvcGVyYXRvclZhbHVlO1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkdHlwZSB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICAvLyBFdmFsdWF0aW9uIFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICBjYXNlICckbW9kJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbW9kJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBkb2NWYWwgJSBvcGVyYXRvclZhbHVlWzBdID09PSBvcGVyYXRvclZhbHVlWzFdO1xuICAgICAgICBjYXNlICckb3B0aW9ucyc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG9wdGlvbnMgKGlnbm9yZWQpJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElnbm9yZSwgYXMgaXQgaXMgdG8gdGhlIFJlZ0V4cFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIGNhc2UgJyRyZWdleCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHJlZ2V4Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBfb3B0ID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChfLmhhc0luKGNsYXVzZVZhbHVlLCAnJG9wdGlvbnMnKSkge1xuICAgICAgICAgICAgICAgIF9vcHQgPSBjbGF1c2VWYWx1ZVsnJG9wdGlvbnMnXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoL1t4c10vLnRlc3QoX29wdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9nLCBpLCBtLCB4LCBzXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE8gbW9uZ28gdXNlcyBQQ1JFIGFuZCBzdXBwb3J0cyBzb21lIGFkZGl0aW9uYWwgZmxhZ3M6ICd4JyBhbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gJ3MnLiBqYXZhc2NyaXB0IGRvZXNuJ3Qgc3VwcG9ydCB0aGVtLiBzbyB0aGlzIGlzIGEgZGl2ZXJnZW5jZVxuICAgICAgICAgICAgICAgICAgICAvLyBiZXR3ZWVuIG91ciBiZWhhdmlvciBhbmQgbW9uZ28ncyBiZWhhdmlvci4gaWRlYWxseSB3ZSB3b3VsZFxuICAgICAgICAgICAgICAgICAgICAvLyBpbXBsZW1lbnQgeCBhbmQgcyBieSB0cmFuc2Zvcm1pbmcgdGhlIHJlZ2V4cCwgYnV0IG5vdCB0b2RheS4uXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIk9ubHkgdGhlIGksIG0sIGFuZCBnIHJlZ2V4cCBvcHRpb25zIGFyZSBzdXBwb3J0ZWRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXZpZXcgZmxhZ3MgLT4gZyAmIG1cbiAgICAgICAgICAgIHZhciByZWdleHAgPSBvcGVyYXRvclZhbHVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc1JlZ0V4cChyZWdleHApICYmIF8uaXNOaWwoX29wdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVnZXhwLnRlc3QoZG9jVmFsKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc05pbChfb3B0KSkge1xuICAgICAgICAgICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc1JlZ0V4cChyZWdleHApKSB7XG4gICAgICAgICAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChyZWdleHAuc291cmNlLCBfb3B0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChyZWdleHAsIF9vcHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gcmVnZXhwLnRlc3QoZG9jVmFsKTtcbiAgICAgICAgY2FzZSAnJHRleHQnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICR0ZXh0Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIiR0ZXh0IHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgIGNhc2UgJyR3aGVyZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHdoZXJlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIiR3aGVyZSB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICAvLyBHZW9zcGF0aWFsIFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICAvLyBUT0RPIC0+IGluIG9wZXJhdG9yIGtpbmRcbiAgICAgICAgLy8gUXVlcnkgT3BlcmF0b3IgQXJyYXlcbiAgICAgICAgY2FzZSAnJGFsbCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGFsbCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmFsbChvcGVyYXRvclZhbHVlLCBkb2NWYWwpID4gMDtcbiAgICAgICAgY2FzZSAnJGVsZW1NYXRjaCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGVsZW1NYXRjaCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkZWxlbU1hdGNoIHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgIGNhc2UgJyRzaXplJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkc2l6ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gXy5pc0FycmF5KGRvY1ZhbCkgJiYgZG9jVmFsLmxlbmd0aCA9PT0gb3BlcmF0b3JWYWx1ZTtcbiAgICAgICAgLy8gQml0d2lzZSBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgLy8gVE9ET1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICcgKyBrZXkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVucmVjb2duaXplZCBrZXkgaW4gc2VsZWN0b3I6IFwiICsga2V5KTtcbiAgICB9XG59O1xuXG52YXIgQnNvblR5cGVzID0ge1xuXHRfdHlwZXM6IFtcblx0XHR7IGFsaWFzOiAnbWluS2V5JywgbnVtYmVyOiAtMSwgb3JkZXI6IDEsIGlzVHlwZTogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdudWxsJywgbnVtYmVyOiAxMCwgb3JkZXI6IDIsIGlzVHlwZTogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdpbnQnLCBudW1iZXI6IDE2LCBvcmRlcjogMywgaXNUeXBlOiBfLmlzSW50ZWdlciB9LFxuXHRcdHsgYWxpYXM6ICdsb25nJywgbnVtYmVyOiAxOCwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc051bWJlciB9LFxuXHRcdHsgYWxpYXM6ICdkb3VibGUnLCBudW1iZXI6IDEsIG9yZGVyOiAzLCBpc1R5cGU6IF8uaXNOdW1iZXIgfSxcblx0XHR7IGFsaWFzOiAnbnVtYmVyJywgbnVtYmVyOiBudWxsLCBvcmRlcjogMywgaXNUeXBlOiBfLmlzTnVtYmVyIH0sXG5cdFx0eyBhbGlhczogJ3N0cmluZycsIG51bWJlcjogMiwgb3JkZXI6IDQsIGlzVHlwZTogXy5pc1N0cmluZyB9LFxuXHRcdHsgYWxpYXM6ICdzeW1ib2wnLCBudW1iZXI6IDE0LCBvcmRlcjogNCwgaXNUeXBlOiBfLmlzU3ltYm9sIH0sXG5cdFx0eyBhbGlhczogJ29iamVjdCcsIG51bWJlcjogMywgb3JkZXI6IDUsIGlzVHlwZTogXy5pc1BsYWluT2JqZWN0IH0sXG5cdFx0eyBhbGlhczogJ2FycmF5JywgbnVtYmVyOiA0LCBvcmRlcjogNiwgaXNUeXBlOiBfLmlzQXJyYXkgfSxcblx0XHR7IGFsaWFzOiAnYmluRGF0YScsIG51bWJlcjogNSwgb3JkZXI6IDcsIGlzVHlwZTogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdvYmplY3RJZCcsIG51bWJlcjogNywgb3JkZXI6IDgsIGlzVHlwZWZuYzogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdib29sJywgbnVtYmVyOiA4LCBvcmRlcjogOSwgaXNUeXBlOiBfLmlzQm9vbGVhbiB9LFxuXHRcdHsgYWxpYXM6ICdkYXRlJywgbnVtYmVyOiA5LCBvcmRlcjogMTAsIGlzVHlwZWZuYzogXy5pc0RhdGUgfSwgICAgICAgICAvLyBmb3JtYXRcblx0XHR7IGFsaWFzOiAndGltZXN0YW1wJywgbnVtYmVyOiAxNywgb3JkZXI6IDExLCBpc1R5cGU6IF8uaXNEYXRlIH0sICAgLy8gZm9ybWF0XG5cdFx0eyBhbGlhczogJ3JlZ2V4JywgbnVtYmVyOiAxMSwgb3JkZXI6IDEyLCBpc1R5cGU6IF8uaXNSZWdFeHAgfSxcblx0XHR7IGFsaWFzOiAnbWF4S2V5JywgbnVtYmVyOiAxMjcsIG9yZGVyOiAxMywgaXNUeXBlOiBudWxsIH1cblx0XHRcbi8vIFx0XHR1bmRlZmluZWQgNlxuLy8gXHRcdGRiUG9pbnRlclxuLy8gXHRcdGphdmFzY3JpcHRcbi8vIFx0XHRqYXZhc2NyaXB0V2l0aFNjb3BlXG4vLyBcdFx0ZnVuY3Rpb25cblx0XSxcblx0XG5cdGdldEJ5QWxpYXM6IGZ1bmN0aW9uKGFsaWFzKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl90eXBlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKHRoaXMuX3R5cGVzW2ldLmFsaWFzID09PSBhbGlhcykgcmV0dXJuIHRoaXMuX3R5cGVzW2ldO1xuXHRcdH1cblx0fSxcblx0Z2V0QnlWYWx1ZTogZnVuY3Rpb24odmFsKSB7XG5cdCAgICBpZiAoXy5pc051bWJlcih2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwiZG91YmxlXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcInN0cmluZ1wiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQm9vbGVhbih2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwiYm9vbFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcImFycmF5XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOdWxsKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJudWxsXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNSZWdFeHAodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcInJlZ2V4XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNQbGFpbk9iamVjdCh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwib2JqZWN0XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTeW1ib2wodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcInN5bWJvbFwiKTtcbiAgICAgICAgXG4gICAgICAgIHRocm93IEVycm9yKFwiVW5hY2NlcHRlZCBCU09OIHR5cGVcIik7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JNYXRjaGVyOyJdfQ==
