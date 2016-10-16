'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var logger = null;

module.exports = function (Logger, _) {
    var SelectorMatcher = function () {
        function SelectorMatcher(selector) {
            _classCallCheck(this, SelectorMatcher);

            this.clauses = selector.clauses;

            logger = Logger.instance;
        }

        _createClass(SelectorMatcher, [{
            key: 'test',
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
                        logger.debug('clause -> plain on field "' + clause.key + '" and value = ' + JSON.stringify(clause.value));

                        _match = _testClause(clause, document[clause.key]);

                        logger.debug('clause result -> ' + _match);
                    } else if (clause.kind === 'object') {
                        logger.debug('clause -> object on field "' + clause.key.join('.') + '" and value = ' + JSON.stringify(clause.value));

                        _match = _testObjectClause(clause, document, _.clone(clause.key).reverse());

                        logger.debug('clause result -> ' + _match);
                    } else if (clause.kind === 'operator') {
                        logger.debug('clause -> operator \'' + clause.key + '\'');

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
            key: 'all',
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
            key: 'in',
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
            key: 'equal',
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
            key: 'matches',
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
            key: 'matches_plus',
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
            key: 'cmp',
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

    return SelectorMatcher;
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlNlbGVjdG9yTWF0Y2hlci5qcyJdLCJuYW1lcyI6WyJsb2dnZXIiLCJtb2R1bGUiLCJleHBvcnRzIiwiTG9nZ2VyIiwiXyIsIlNlbGVjdG9yTWF0Y2hlciIsInNlbGVjdG9yIiwiY2xhdXNlcyIsImluc3RhbmNlIiwiZG9jdW1lbnQiLCJkZWJ1ZyIsIl9tYXRjaCIsImlzTmlsIiwidGhyb3ciLCJpIiwibGVuZ3RoIiwiY2xhdXNlIiwia2luZCIsInZhbHVlIiwiY2FsbCIsImtleSIsIkpTT04iLCJzdHJpbmdpZnkiLCJfdGVzdENsYXVzZSIsImpvaW4iLCJfdGVzdE9iamVjdENsYXVzZSIsImNsb25lIiwicmV2ZXJzZSIsIl90ZXN0TG9naWNhbENsYXVzZSIsImFycmF5IiwiQXJyYXkiLCJwYXJ0cyIsInJlbWFpbmluZyIsImZvckVhY2giLCJ2YWwiLCJoYXNoIiwiaXNPYmplY3QiLCJlcXVhbCIsInF2YWwiLCJtYXRjaCIsImEiLCJiIiwiaXNOdW1iZXIiLCJpc1N0cmluZyIsImlzQm9vbGVhbiIsImlzRnVuY3Rpb24iLCJpc0FycmF5IiwiYl9rZXlzIiwicHVzaCIsImZ1bmMiLCJtYXRjaGVzIiwiaXNVbmRlZmluZWQiLCJ1bmRlZmluZWQiLCJhVHlwZSIsIkJzb25UeXBlcyIsImdldEJ5VmFsdWUiLCJiVHlwZSIsIm9yZGVyIiwibnVtYmVyIiwiaXNTeW1ib2wiLCJzIiwiY21wIiwiaXNOdWxsIiwiaXNSZWdFeHAiLCJFcnJvciIsImlzUGxhaW5PYmplY3QiLCJ0b19hcnJheSIsIm9iaiIsInJldCIsIm1hdGNoZXNfcGx1cyIsIl92YWx1ZSIsInR5cGUiLCJfdGVzdE9wZXJhdG9yQ2xhdXNlIiwidG9TdHJpbmciLCJ0b051bWJlciIsImluZGV4T2YiLCJkb2MiLCJwYXRoIiwicG9wIiwibG9nIiwiX21hdGNoZXIiLCJ0ZXN0IiwiX3Rlc3RPcGVyYXRvckNvbnN0cmFpbnQiLCJvcGVyYXRvclZhbHVlIiwiY2xhdXNlVmFsdWUiLCJkb2NWYWwiLCJpbiIsIl9vcHQiLCJoYXNJbiIsInJlZ2V4cCIsIlJlZ0V4cCIsInNvdXJjZSIsImFsbCIsIl90eXBlcyIsImFsaWFzIiwiaXNUeXBlIiwiaXNJbnRlZ2VyIiwiaXNUeXBlZm5jIiwiaXNEYXRlIiwiZ2V0QnlBbGlhcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSUEsU0FBUyxJQUFiOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCLFVBQVNDLE1BQVQsRUFBaUJDLENBQWpCLEVBQW9CO0FBQUEsUUFFM0JDLGVBRjJCO0FBR2hDLGlDQUFZQyxRQUFaLEVBQXNCO0FBQUE7O0FBQ2YsaUJBQUtDLE9BQUwsR0FBZUQsU0FBU0MsT0FBeEI7O0FBRUFQLHFCQUFTRyxPQUFPSyxRQUFoQjtBQUNOOztBQVArQjtBQUFBO0FBQUEsaUNBUzNCQyxRQVQyQixFQVNqQjtBQUNkVCx1QkFBT1UsS0FBUCxDQUFhLDhCQUFiOztBQUVBLG9CQUFJQyxTQUFTLEtBQWI7O0FBRUEsb0JBQUlQLEVBQUVRLEtBQUYsQ0FBUUgsUUFBUixDQUFKLEVBQXVCO0FBQ3RCVCwyQkFBT1UsS0FBUCxDQUFhLGtCQUFiOztBQUVBViwyQkFBT2EsS0FBUCxDQUFhLCtCQUFiO0FBQ0E7O0FBRURiLHVCQUFPVSxLQUFQLENBQWEsc0JBQWI7O0FBRUEscUJBQUssSUFBSUksSUFBSSxDQUFiLEVBQWdCQSxJQUFJLEtBQUtQLE9BQUwsQ0FBYVEsTUFBakMsRUFBeUNELEdBQXpDLEVBQThDO0FBQzdDLHdCQUFJRSxTQUFTLEtBQUtULE9BQUwsQ0FBYU8sQ0FBYixDQUFiOztBQUVBLHdCQUFJRSxPQUFPQyxJQUFQLEtBQWdCLFVBQXBCLEVBQWdDO0FBQy9CakIsK0JBQU9VLEtBQVAsQ0FBYSxvQkFBYjs7QUFFQUMsaUNBQVNLLE9BQU9FLEtBQVAsQ0FBYUMsSUFBYixDQUFrQixJQUFsQixFQUF3QlYsUUFBeEIsQ0FBVDtBQUNBLHFCQUpELE1BSU8sSUFBSU8sT0FBT0MsSUFBUCxLQUFnQixPQUFwQixFQUE2QjtBQUNuQ2pCLCtCQUFPVSxLQUFQLGdDQUEw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QUFKLEVBQW9CLE9BQU8sS0FBS2lFLFVBQUwsQ0FBZ0IsT0FBaEIsQ0FBUDs7QUFFcEIsZ0JBQUkvRixFQUFFMEQsTUFBRixDQUFTNUIsR0FBVCxDQUFKLEVBQW1CLE9BQU8sS0FBS2lFLFVBQUwsQ0FBZ0IsTUFBaEIsQ0FBUDs7QUFFbkIsZ0JBQUkvRixFQUFFMkQsUUFBRixDQUFXN0IsR0FBWCxDQUFKLEVBQXFCLE9BQU8sS0FBS2lFLFVBQUwsQ0FBZ0IsT0FBaEIsQ0FBUDs7QUFFckIsZ0JBQUkvRixFQUFFNkQsYUFBRixDQUFnQi9CLEdBQWhCLENBQUosRUFBMEIsT0FBTyxLQUFLaUUsVUFBTCxDQUFnQixRQUFoQixDQUFQOztBQUUxQixnQkFBSS9GLEVBQUV1RCxRQUFGLENBQVd6QixHQUFYLENBQUosRUFBcUIsT0FBTyxLQUFLaUUsVUFBTCxDQUFnQixRQUFoQixDQUFQOztBQUVyQixrQkFBTW5DLE1BQU0sc0JBQU4sQ0FBTjtBQUNOO0FBbERjLEtBQWhCOztBQXFEQSxXQUFPM0QsZUFBUDtBQUNILENBaHNCRCIsImZpbGUiOiJTZWxlY3Rvck1hdGNoZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgbG9nZ2VyID0gbnVsbDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihMb2dnZXIsIF8pIHtcblxuICAgIGNsYXNzIFNlbGVjdG9yTWF0Y2hlciB7XG4gICAgXHRjb25zdHJ1Y3RvcihzZWxlY3Rvcikge1xuICAgICAgICAgICAgdGhpcy5jbGF1c2VzID0gc2VsZWN0b3IuY2xhdXNlcztcbiAgICBcbiAgICAgICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICBcdH1cbiAgICBcdFxuICAgIFx0dGVzdChkb2N1bWVudCkge1xuICAgIFx0XHRsb2dnZXIuZGVidWcoJ0NhbGxlZCBTZWxlY3Rvck1hdGNoZXItPnRlc3QnKTtcbiAgICBcdFx0XG4gICAgXHRcdHZhciBfbWF0Y2ggPSBmYWxzZTtcbiAgICBcbiAgICBcdFx0aWYgKF8uaXNOaWwoZG9jdW1lbnQpKSB7XG4gICAgXHRcdFx0bG9nZ2VyLmRlYnVnKCdkb2N1bWVudCAtPiBudWxsJyk7XG4gICAgXHRcdFx0XG4gICAgXHRcdFx0bG9nZ2VyLnRocm93KFwiUGFyYW1ldGVyICdkb2N1bWVudCcgcmVxdWlyZWRcIik7XG4gICAgXHRcdH1cbiAgICBcdFx0XG4gICAgXHRcdGxvZ2dlci5kZWJ1ZygnZG9jdW1lbnQgLT4gbm90IG51bGwnKTtcbiAgICBcdFx0XG4gICAgXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jbGF1c2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgXHRcdFx0dmFyIGNsYXVzZSA9IHRoaXMuY2xhdXNlc1tpXTtcbiAgICBcdFx0XHRcbiAgICBcdFx0XHRpZiAoY2xhdXNlLmtpbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICBcdFx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlIC0+IGZ1bmN0aW9uJyk7XG4gICAgXHRcdFx0XHRcbiAgICBcdFx0XHRcdF9tYXRjaCA9IGNsYXVzZS52YWx1ZS5jYWxsKG51bGwsIGRvY3VtZW50KTtcbiAgICBcdFx0XHR9IGVsc2UgaWYgKGNsYXVzZS5raW5kID09PSAncGxhaW4nKSB7XG4gICAgXHRcdFx0XHRsb2dnZXIuZGVidWcoYGNsYXVzZSAtPiBwbGFpbiBvbiBmaWVsZCBcIiR7Y2xhdXNlLmtleX1cIiBhbmQgdmFsdWUgPSAke0pTT04uc3RyaW5naWZ5KGNsYXVzZS52YWx1ZSl9YCk7XG4gICAgXHRcdFx0XHRcbiAgICBcdFx0XHRcdF9tYXRjaCA9IF90ZXN0Q2xhdXNlKGNsYXVzZSwgZG9jdW1lbnRbY2xhdXNlLmtleV0pO1xuICAgIFx0XHRcdFx0XG4gICAgXHRcdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZSByZXN1bHQgLT4gJyArIF9tYXRjaCk7XG4gICAgXHRcdFx0fSBlbHNlIGlmIChjbGF1c2Uua2luZCA9PT0gJ29iamVjdCcpIHtcbiAgICBcdFx0XHRcdGxvZ2dlci5kZWJ1ZyhgY2xhdXNlIC0+IG9iamVjdCBvbiBmaWVsZCBcIiR7Y2xhdXNlLmtleS5qb2luKCcuJyl9XCIgYW5kIHZhbHVlID0gJHtKU09OLnN0cmluZ2lmeShjbGF1c2UudmFsdWUpfWApO1xuICAgIFx0XHRcdFx0XG4gICAgXHRcdFx0XHRfbWF0Y2ggPSBfdGVzdE9iamVjdENsYXVzZShjbGF1c2UsIGRvY3VtZW50LCBfLmNsb25lKGNsYXVzZS5rZXkpLnJldmVyc2UoKSk7XG4gICAgXHRcdFx0XHRcbiAgICBcdFx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlIHJlc3VsdCAtPiAnICsgX21hdGNoKTtcbiAgICBcdFx0XHR9IGVsc2UgaWYgKGNsYXVzZS5raW5kID09PSAnb3BlcmF0b3InKSB7XG4gICAgXHRcdFx0ICAgIGxvZ2dlci5kZWJ1ZyhgY2xhdXNlIC0+IG9wZXJhdG9yICcke2NsYXVzZS5rZXl9J2ApO1xuICAgIFx0XHRcdCAgICBcbiAgICBcdFx0XHQgICAgX21hdGNoID0gX3Rlc3RMb2dpY2FsQ2xhdXNlKGNsYXVzZSwgZG9jdW1lbnQsIGNsYXVzZS5rZXkpO1xuICAgIFx0XHQgICAgICAgIFxuICAgIFx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgcmVzdWx0IC0+ICcgKyBfbWF0Y2gpO1xuICAgIFx0XHRcdH1cbiAgICBcdFx0XHRcbiAgICBcdFx0XHQvLyBJZiBhbnkgdGVzdCBjYXNlIGZhaWxzLCB0aGUgZG9jdW1lbnQgd2lsbCBub3QgbWF0Y2hcbiAgICBcdFx0XHRpZiAoX21hdGNoID09PSBmYWxzZSB8fCBfbWF0Y2ggPT09ICdmYWxzZScpIHtcbiAgICBcdFx0XHRcdGxvZ2dlci5kZWJ1ZygndGhlIGRvY3VtZW50IGRvIG5vdCBtYXRjaGVzJyk7XG4gICAgXHRcdFx0XHRcbiAgICBcdFx0XHRcdHJldHVybiBmYWxzZTtcbiAgICBcdFx0XHR9XG4gICAgXHRcdH1cbiAgICBcdFx0XG4gICAgXHRcdC8vIEV2ZXJ5dGhpbmcgbWF0Y2hlc1xuICAgIFx0XHRsb2dnZXIuZGVidWcoJ3RoZSBkb2N1bWVudCBtYXRjaGVzJyk7XG4gICAgXHRcdFxuICAgIFx0XHRyZXR1cm4gdHJ1ZTtcbiAgICBcdH1cbiAgICBcdFxuICAgIFx0c3RhdGljIGFsbChhcnJheSwgdmFsdWUpIHtcbiAgICAgICAgICAgIC8vICRhbGwgaXMgb25seSBtZWFuaW5nZnVsIG9uIGFycmF5c1xuICAgICAgICAgICAgaWYgKCEoYXJyYXkgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAvLyBUT0RPIHNob3VsZCB1c2UgYSBjYW5vbmljYWxpemluZyByZXByZXNlbnRhdGlvbiwgc28gdGhhdCB3ZVxuICAgICAgICAgICAgLy8gZG9uJ3QgZ2V0IHNjcmV3ZWQgYnkga2V5IG9yZGVyXG4gICAgICAgICAgICB2YXIgcGFydHMgPSB7fTtcbiAgICAgICAgICAgIHZhciByZW1haW5pbmcgPSAwO1xuICAgIFxuICAgICAgICAgICAgXy5mb3JFYWNoKHZhbHVlLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhhc2ggPSBKU09OLnN0cmluZ2lmeSh2YWwpO1xuICAgIFxuICAgICAgICAgICAgICAgIGlmICghKGhhc2ggaW4gcGFydHMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnRzW2hhc2hdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVtYWluaW5nKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhhc2ggPSBKU09OLnN0cmluZ2lmeShhcnJheVtpXSk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzW2hhc2hdKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJ0c1toYXNoXTtcbiAgICAgICAgICAgICAgICAgICAgcmVtYWluaW5nLS07XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICgwID09PSByZW1haW5pbmcpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIFx0XG4gICAgXHRzdGF0aWMgaW4oYXJyYXksIHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoIV8uaXNPYmplY3QoYXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgLy8gb3B0aW1pemF0aW9uOiB1c2Ugc2NhbGFyIGVxdWFsaXR5IChmYXN0KVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFycmF5ID09PSB2YWx1ZVtpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBub3BlLCBoYXZlIHRvIHVzZSBkZWVwIGVxdWFsaXR5XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoU2VsZWN0b3JNYXRjaGVyLmVxdWFsKGFycmF5LCB2YWx1ZVtpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIFx0XG4gICAgXHQvLyBkZWVwIGVxdWFsaXR5IHRlc3Q6IHVzZSBmb3IgbGl0ZXJhbCBkb2N1bWVudCBhbmQgYXJyYXkgbWF0Y2hlc1xuICAgIFx0c3RhdGljIGVxdWFsKGFycmF5LCBxdmFsKSB7XG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgIC8vIHNjYWxhcnNcbiAgICAgICAgICAgICAgICBpZiAoXy5pc051bWJlcihhKSB8fCBfLmlzU3RyaW5nKGEpIHx8IF8uaXNCb29sZWFuKGEpIHx8IF8uaXNOaWwoYSkpIHJldHVybiBhID09PSBiO1xuICAgIFxuICAgICAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24oYSkpIHJldHVybiBmYWxzZTsgIC8vIE5vdCBhbGxvd2VkIHlldFxuICAgIFxuICAgICAgICAgICAgICAgIC8vIE9LLCB0eXBlb2YgYSA9PT0gJ29iamVjdCdcbiAgICAgICAgICAgICAgICBpZiAoIV8uaXNPYmplY3QoYikpIHJldHVybiBmYWxzZTtcbiAgICBcbiAgICAgICAgICAgICAgICAvLyBhcnJheXNcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghXy5pc0FycmF5KGIpKSByZXR1cm4gZmFsc2U7XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKGFbaV0sYltpXSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0c1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgdmFyIHVubWF0Y2hlZF9iX2tleXMgPSAwO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHggaW4gYilcbiAgICAgICAgICAgICAgICAgICAgdW5tYXRjaGVkX2Jfa2V5cysrO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHggaW4gYSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoISh4IGluIGIpIHx8ICFtYXRjaChhW3hdLCBiW3hdKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgdW5tYXRjaGVkX2Jfa2V5cy0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdW5tYXRjaGVkX2Jfa2V5cyA9PT0gMDtcbiAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIC8vIEZvbGxvdyBNb25nbyBpbiBjb25zaWRlcmluZyBrZXkgb3JkZXIgdG8gYmUgcGFydCBvZlxuICAgICAgICAgICAgICAgIC8vIGVxdWFsaXR5LiBLZXkgZW51bWVyYXRpb24gb3JkZXIgaXMgYWN0dWFsbHkgbm90IGRlZmluZWQgaW5cbiAgICAgICAgICAgICAgICAvLyB0aGUgZWNtYXNjcmlwdCBzcGVjIGJ1dCBpbiBwcmFjdGljZSBtb3N0IGltcGxlbWVudGF0aW9uc1xuICAgICAgICAgICAgICAgIC8vIHByZXNlcnZlIGl0LiAoVGhlIGV4Y2VwdGlvbiBpcyBDaHJvbWUsIHdoaWNoIHByZXNlcnZlcyBpdFxuICAgICAgICAgICAgICAgIC8vIHVzdWFsbHksIGJ1dCBub3QgZm9yIGtleXMgdGhhdCBwYXJzZSBhcyBpbnRzLilcbiAgICAgICAgICAgICAgICB2YXIgYl9rZXlzID0gW107XG4gICAgXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXJyYXkgaW4gYikge1xuICAgICAgICAgICAgICAgICAgICBiX2tleXMucHVzaChiW2FycmF5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhcnJheSBpbiBhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID49IGJfa2V5cy5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRjaChhW2FycmF5XSwgYl9rZXlzW2ldKSkgcmV0dXJuIGZhbHNlO1xuICAgIFxuICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpICE9PSBiX2tleXMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9O1xuICAgIFxuICAgICAgICAgICAgcmV0dXJuIG1hdGNoKGFycmF5LCBxdmFsKTtcbiAgICAgICAgfVxuICAgIFx0XG4gICAgXHQvLyBpZiB4IGlzIG5vdCBhbiBhcnJheSwgdHJ1ZSBpZmYgZih4KSBpcyB0cnVlLiBpZiB4IGlzIGFuIGFycmF5LFxuICAgICAgICAvLyB0cnVlIGlmZiBmKHkpIGlzIHRydWUgZm9yIGFueSB5IGluIHguXG4gICAgICAgIC8vXG4gICAgICAgIC8vIHRoaXMgaXMgdGhlIHdheSBtb3N0IG1vbmdvIG9wZXJhdG9ycyAobGlrZSAkZ3QsICRtb2QsICR0eXBlLi4pXG4gICAgICAgIC8vIHRyZWF0IHRoZWlyIGFyZ3VtZW50cy5cbiAgICAgICAgc3RhdGljIG1hdGNoZXModmFsdWUsIGZ1bmMpIHtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnVuYyh2YWx1ZVtpXSkpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICByZXR1cm4gZnVuYyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICBcdFxuICAgIFx0Ly8gbGlrZSBfbWF0Y2hlcywgYnV0IGlmIHggaXMgYW4gYXJyYXksIGl0J3MgdHJ1ZSBub3Qgb25seSBpZiBmKHkpXG4gICAgICAgIC8vIGlzIHRydWUgZm9yIHNvbWUgeSBpbiB4LCBidXQgYWxzbyBpZiBmKHgpIGlzIHRydWUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIHRoaXMgaXMgdGhlIHdheSBtb25nbyB2YWx1ZSBjb21wYXJpc29ucyB1c3VhbGx5IHdvcmssIGxpa2Uge3g6XG4gICAgICAgIC8vIDR9LCB7eDogWzRdfSwgb3Ige3g6IHskaW46IFsxLDIsM119fS5cbiAgICAgICAgc3RhdGljIG1hdGNoZXNfcGx1cyh2YWx1ZSwgZnVuYykge1xuICAgICAgICAgICAgLy8gaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIC8vICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIGlmIChmdW5jKHZhbHVlW2ldKSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgIFxuICAgICAgICAgICAgLy8gICAgIC8vIGZhbGwgdGhyb3VnaCFcbiAgICAgICAgICAgIC8vIH1cbiAgICBcbiAgICAgICAgICAgIC8vIHJldHVybiBmdW5jKHZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIubWF0Y2hlcyh2YWx1ZSwgZnVuYykgfHwgZnVuYyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICBcdFxuICAgIFx0Ly8gY29tcGFyZSB0d28gdmFsdWVzIG9mIHVua25vd24gdHlwZSBhY2NvcmRpbmcgdG8gQlNPTiBvcmRlcmluZ1xuICAgICAgICAvLyBzZW1hbnRpY3MuIChhcyBhbiBleHRlbnNpb24sIGNvbnNpZGVyICd1bmRlZmluZWQnIHRvIGJlIGxlc3MgdGhhblxuICAgICAgICAvLyBhbnkgb3RoZXIgdmFsdWUuKVxuICAgICAgICAvLyByZXR1cm4gbmVnYXRpdmUgaWYgYSBpcyBsZXNzLCBwb3NpdGl2ZSBpZiBiIGlzIGxlc3MsIG9yIDAgaWYgZXF1YWxcbiAgICAgICAgc3RhdGljIGNtcChhLCBiKSB7XG4gICAgICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChhKSkgcmV0dXJuIGIgPT09IHVuZGVmaW5lZCA/IDAgOiAtMTtcbiAgICBcbiAgICAgICAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGIpKSByZXR1cm4gMTtcbiAgICBcdFx0XG4gICAgICAgICAgICB2YXIgYVR5cGUgPSBCc29uVHlwZXMuZ2V0QnlWYWx1ZShhKTtcbiAgICAgICAgICAgIHZhciBiVHlwZSA9IEJzb25UeXBlcy5nZXRCeVZhbHVlKGIpO1xuICAgIFxuICAgICAgICAgICAgaWYgKGFUeXBlLm9yZGVyICE9PSBiVHlwZS5vcmRlcikgcmV0dXJuIGFUeXBlLm9yZGVyIDwgYlR5cGUub3JkZXIgPyAtMSA6IDE7XG4gICAgXG4gICAgICAgICAgICAvLyBTYW1lIHNvcnQgb3JkZXIsIGJ1dCBkaXN0aW5jdCB2YWx1ZSB0eXBlXG4gICAgICAgICAgICBpZiAoYVR5cGUubnVtYmVyICE9PSBiVHlwZS5udW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBDdXJyZW50bHksIFN5bWJvbHMgY2FuIG5vdCBiZSBzb3J0ZXJlZCBpbiBKUywgc28gd2UgYXJlIHNldHRpbmcgdGhlIFN5bWJvbCBhcyBncmVhdGVyXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNTeW1ib2woYSkpIHJldHVybiAxO1xuICAgICAgICAgICAgICAgIGlmIChfLmlzU3ltYm9sKGIpKSByZXR1cm4gLTE7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBJbnRlZ2VyLCBEYXRlIGFuZCBUaW1lc3RhbXBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNOdW1iZXIoYSkpIHJldHVybiBhIC0gYjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNTdHJpbmcoYSkpIHJldHVybiBhIDwgYiA/IC0xIDogKGEgPT09IGIgPyAwIDogMSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzQm9vbGVhbihhKSkge1xuICAgICAgICAgICAgICAgIGlmIChhKSByZXR1cm4gYiA/IDAgOiAxO1xuICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBiID8gLTEgOiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KGEpKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID09PSBhLmxlbmd0aCkgcmV0dXJuIChpID09PSBiLmxlbmd0aCkgPyAwIDogLTE7XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChpID09PSBiLmxlbmd0aCkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gYS5sZW5ndGggLSBiLmxlbmd0aDtcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIHMgPSBTZWxlY3Rvck1hdGNoZXIuY21wKGFbaV0sIGJbaV0pO1xuICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAocyAhPT0gMCkgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc051bGwoYSkpIHJldHVybiAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc1JlZ0V4cChhKSkgdGhyb3cgRXJyb3IoXCJTb3J0aW5nIG5vdCBzdXBwb3J0ZWQgb24gcmVndWxhciBleHByZXNzaW9uXCIpOyAvLyBUT0RPXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGlmIChfLmlzRnVuY3Rpb24oYSkpIHJldHVybiB7dHlwZTogMTMsIG9yZGVyOiAxMDAsIGZuYzogXy5pc0Z1bmN0aW9ufTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNQbGFpbk9iamVjdChhKSkge1xuICAgICAgICAgICAgICAgIHZhciB0b19hcnJheSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgIFxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXQucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2gob2JqW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcCh0b19hcnJheShhKSwgdG9fYXJyYXkoYikpO1xuICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgLy8gZG91YmxlXG4gICAgICAgICAgICAvLyBpZiAodGEgPT09IDEpICByZXR1cm4gYSAtIGI7XG4gICAgXG4gICAgICAgICAgICAvLyBzdHJpbmdcbiAgICAgICAgICAgIC8vIGlmICh0YiA9PT0gMikgcmV0dXJuIGEgPCBiID8gLTEgOiAoYSA9PT0gYiA/IDAgOiAxKTtcbiAgICBcbiAgICAgICAgICAgIC8vIE9iamVjdFxuICAgICAgICAgICAgLy8gaWYgKHRhID09PSAzKSB7XG4gICAgICAgICAgICAvLyAgICAgLy8gdGhpcyBjb3VsZCBiZSBtdWNoIG1vcmUgZWZmaWNpZW50IGluIHRoZSBleHBlY3RlZCBjYXNlIC4uLlxuICAgICAgICAgICAgLy8gICAgIHZhciB0b19hcnJheSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgIFxuICAgICAgICAgICAgLy8gICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICByZXQucHVzaChrZXkpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgcmV0LnB1c2gob2JqW2tleV0pO1xuICAgICAgICAgICAgLy8gICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAvLyAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAvLyAgICAgfTtcbiAgICBcbiAgICAgICAgICAgIC8vICAgICByZXR1cm4gU2VsZWN0b3IuX2YuX2NtcCh0b19hcnJheShhKSwgdG9fYXJyYXkoYikpO1xuICAgICAgICAgICAgLy8gfVxuICAgIFxuICAgICAgICAgICAgLy8gQXJyYXlcbiAgICAgICAgICAgIC8vIGlmICh0YSA9PT0gNCkge1xuICAgICAgICAgICAgLy8gICAgIGZvciAodmFyIGkgPSAwOyA7IGkrKykge1xuICAgICAgICAgICAgLy8gICAgICAgICBpZiAoaSA9PT0gYS5sZW5ndGgpIHJldHVybiAoaSA9PT0gYi5sZW5ndGgpID8gMCA6IC0xO1xuICAgIFxuICAgICAgICAgICAgLy8gICAgICAgICBpZiAoaSA9PT0gYi5sZW5ndGgpIHJldHVybiAxO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIC8vICAgICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG4gICAgXG4gICAgICAgICAgICAvLyAgICAgICAgIHZhciBzID0gU2VsZWN0b3IuX2YuX2NtcChhW2ldLCBiW2ldKTtcbiAgICBcbiAgICAgICAgICAgIC8vICAgICAgICAgaWYgKHMgIT09IDApIHJldHVybiBzO1xuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgIC8vIH1cbiAgICBcbiAgICAgICAgICAgIC8vIDU6IGJpbmFyeSBkYXRhXG4gICAgICAgICAgICAvLyA3OiBvYmplY3QgaWRcbiAgICBcbiAgICAgICAgICAgIC8vIGJvb2xlYW5cbiAgICAgICAgICAgIC8vIGlmICh0YSA9PT0gOCkge1xuICAgICAgICAgICAgLy8gICAgIGlmIChhKSByZXR1cm4gYiA/IDAgOiAxO1xuICAgIFxuICAgICAgICAgICAgLy8gICAgIHJldHVybiBiID8gLTEgOiAwO1xuICAgICAgICAgICAgLy8gfVxuICAgIFxuICAgICAgICAgICAgLy8gOTogZGF0ZVxuICAgIFxuICAgICAgICAgICAgLy8gbnVsbFxuICAgICAgICAgICAgLy8gaWYgKHRhID09PSAxMCkgcmV0dXJuIDA7XG4gICAgXG4gICAgICAgICAgICAvLyByZWdleHBcbiAgICAgICAgICAgIC8vIGlmICh0YSA9PT0gMTEpIHtcbiAgICAgICAgICAgIC8vICAgICB0aHJvdyBFcnJvcihcIlNvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiByZWd1bGFyIGV4cHJlc3Npb25cIik7IC8vIFRPRE9cbiAgICAgICAgICAgIC8vIH1cbiAgICBcbiAgICAgICAgICAgIC8vIDEzOiBqYXZhc2NyaXB0IGNvZGVcbiAgICAgICAgICAgIC8vIDE0OiBzeW1ib2xcbiAgICAgICAgICAgIGlmIChfLmlzU3ltYm9sKGEpKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3VycmVudGx5LCBTeW1ib2xzIGNhbiBub3QgYmUgc29ydGVyZWQgaW4gSlMsIHNvIHdlIGFyZSByZXR1cm5pbmcgYW4gZXF1YWxpdHlcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIDE1OiBqYXZhc2NyaXB0IGNvZGUgd2l0aCBzY29wZVxuICAgICAgICAgICAgLy8gMTY6IDMyLWJpdCBpbnRlZ2VyXG4gICAgICAgICAgICAvLyAxNzogdGltZXN0YW1wXG4gICAgICAgICAgICAvLyAxODogNjQtYml0IGludGVnZXJcbiAgICAgICAgICAgIC8vIDI1NTogbWlua2V5XG4gICAgICAgICAgICAvLyAxMjc6IG1heGtleVxuICAgIFxuICAgICAgICAgICAgLy8gamF2YXNjcmlwdCBjb2RlXG4gICAgICAgICAgICAvLyBpZiAodGEgPT09IDEzKSB7XG4gICAgICAgICAgICAvLyAgICAgdGhyb3cgRXJyb3IoXCJTb3J0aW5nIG5vdCBzdXBwb3J0ZWQgb24gSmF2YXNjcmlwdCBjb2RlXCIpOyAvLyBUT0RPXG4gICAgICAgICAgICAvLyB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgdmFyIF90ZXN0Q2xhdXNlID0gZnVuY3Rpb24oY2xhdXNlLCB2YWwpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdDYWxsZWQgX3Rlc3RDbGF1c2UnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHZhciBfdmFsID0gY2xhdXNlLnZhbHVlO1xuICAgICAgICBcbiAgICAgICAgLy8gaWYgUmVnRXhwIHx8ICQgLT4gT3BlcmF0b3JcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIubWF0Y2hlc19wbHVzKHZhbCwgZnVuY3Rpb24oX3ZhbHVlKSB7XG4gICAgICAgICAgICAvLyBUT0RPIG9iamVjdCBpZHMsIGRhdGVzLCB0aW1lc3RhbXBzP1xuICAgICAgICAgICAgc3dpdGNoIChjbGF1c2UudHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ251bGwnOlxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgTnVsbCBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvUXVlcnlpbmcrYW5kK251bGxzXG4gICAgICAgICAgICAgICAgICAgIGlmIChfLmlzTmlsKF92YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSAncmVnZXhwJzpcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IFJlZ0V4cCBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF90ZXN0T3BlcmF0b3JDbGF1c2UoY2xhdXNlLCBfdmFsdWUpO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2xpdGVyYWxfb2JqZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IExpdGVyYWwgT2JqZWN0IGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmVxdWFsKF92YWx1ZSwgY2xhdXNlLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBjYXNlICdvcGVyYXRvcl9vYmplY3QnOlxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgT3BlcmF0b3IgT2JqZWN0IGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX3Rlc3RPcGVyYXRvckNsYXVzZShjbGF1c2UsIF92YWx1ZSk7XG4gICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IFN0cmluZyBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF8udG9TdHJpbmcoX3ZhbHVlKSA9PT0gXy50b1N0cmluZyhjbGF1c2UudmFsdWUpO1xuICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBOdW1iZXIgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfLnRvTnVtYmVyKF92YWx1ZSkgPT09IF8udG9OdW1iZXIoY2xhdXNlLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IEJvb2xlYW4gZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoXy5pc0Jvb2xlYW4oX3ZhbHVlKSAmJiBfLmlzQm9vbGVhbihjbGF1c2UudmFsdWUpICYmIChfdmFsdWUgPT09IGNsYXVzZS52YWx1ZSkpO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IEJvb2xlYW4gZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIHR5cGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheShfdmFsdWUpICYmIF8uaXNBcnJheShjbGF1c2UudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBsZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfdmFsdWUubGVuZ3RoID09PSBjbGF1c2UudmFsdWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaXRlbXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF92YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xhdXNlLnZhbHVlLmluZGV4T2YoX3ZhbHVlW2ldKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgRnVuY3Rpb24gZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHZhbHVlIHR5cGUgaW4gcXVlcnlcIik7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgdmFsdWUgdHlwZSBpbiBxdWVyeVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgX3Rlc3RPYmplY3RDbGF1c2UgPSBmdW5jdGlvbihjbGF1c2UsIGRvYywga2V5KSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIF90ZXN0T2JqZWN0Q2xhdXNlJyk7XG4gICAgICAgIFxuICAgICAgICB2YXIgdmFsID0gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGlmIChrZXkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIHBhdGggPSBrZXkucG9wKCk7XG4gICAgICAgICAgICB2YWwgPSBkb2NbcGF0aF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2hlY2sgb24gZmllbGQgJyArIHBhdGgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUT0RPIGFkZCBfLmlzTnVtYmVyKHZhbCkgYW5kIHRyZWF0IGl0IGFzIGFuIGFycmF5XG4gICAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmxvZyh2YWwpO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnZ29pbmcgZGVlcGVyJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIF90ZXN0T2JqZWN0Q2xhdXNlKGNsYXVzZSwgdmFsLCBrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdsb3dlc3QgcGF0aDogJyArIHBhdGgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gX3Rlc3RDbGF1c2UoY2xhdXNlLCBkb2MpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB2YXIgX3Rlc3RMb2dpY2FsQ2xhdXNlID0gZnVuY3Rpb24oY2xhdXNlLCBkb2MsIGtleSkge1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IG51bGw7XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNsYXVzZS52YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IF9tYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcih7IGNsYXVzZXM6IFtjbGF1c2UudmFsdWVbaV1dIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2FuZCc6XG4gICAgICAgICAgICAgICAgICAgIC8vIFRydWUgdW5sZXNzIGl0IGhhcyBvbmUgdGhhdCBkbyBub3QgbWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNOaWwobWF0Y2hlcykpIG1hdGNoZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfbWF0Y2hlci50ZXN0KGRvYykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnb3InOlxuICAgICAgICAgICAgICAgICAgICAvLyBGYWxzZSB1bmxlc3MgaXQgaGFzIG9uZSBtYXRjaCBhdCBsZWFzdFxuICAgICAgICAgICAgICAgICAgICBpZiAoXy5pc05pbChtYXRjaGVzKSkgbWF0Y2hlcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9tYXRjaGVyLnRlc3QoZG9jKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbWF0Y2hlcyB8fCBmYWxzZTtcbiAgICB9O1xuICAgIFxuICAgIHZhciBfdGVzdE9wZXJhdG9yQ2xhdXNlID0gZnVuY3Rpb24oY2xhdXNlLCB2YWx1ZSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZCBfdGVzdE9wZXJhdG9yQ2xhdXNlJyk7XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gY2xhdXNlLnZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoIV90ZXN0T3BlcmF0b3JDb25zdHJhaW50KGtleSwgY2xhdXNlLnZhbHVlW2tleV0sIGNsYXVzZS52YWx1ZSwgdmFsdWUsIGNsYXVzZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgXG4gICAgdmFyIF90ZXN0T3BlcmF0b3JDb25zdHJhaW50ID0gZnVuY3Rpb24gKGtleSwgb3BlcmF0b3JWYWx1ZSwgY2xhdXNlVmFsdWUsIGRvY1ZhbCwgY2xhdXNlKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIF90ZXN0T3BlcmF0b3JDb25zdHJhaW50Jyk7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgICAgLy8gQ29tcGFyaXNvbiBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgICAgIGNhc2UgJyRndCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRndCcpO1xuICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuY21wKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSkgPiAwO1xuICAgICAgICAgICAgY2FzZSAnJGx0JzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGx0Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5jbXAoZG9jVmFsLCBvcGVyYXRvclZhbHVlKSA8IDA7XG4gICAgICAgICAgICBjYXNlICckZ3RlJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGd0ZScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuY21wKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSkgPj0gMDtcbiAgICAgICAgICAgIGNhc2UgJyRsdGUnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbHRlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5jbXAoZG9jVmFsLCBvcGVyYXRvclZhbHVlKSA8PSAwO1xuICAgICAgICAgICAgY2FzZSAnJGVxJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGVxJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5lcXVhbChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnJG5lJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG5lJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuICFTZWxlY3Rvck1hdGNoZXIuZXF1YWwoZG9jVmFsLCBvcGVyYXRvclZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJyRpbic6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRpbicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuaW4oZG9jVmFsLCBvcGVyYXRvclZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJyRuaW4nOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbmluJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuICFTZWxlY3Rvck1hdGNoZXIuaW4oZG9jVmFsLCBvcGVyYXRvclZhbHVlKTtcbiAgICAgICAgICAgIC8vIExvZ2ljYWwgUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgICAgICBjYXNlICckbm90JzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG5vdCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vICRvciwgJGFuZCwgJG5vciBhcmUgaW4gdGhlICdvcGVyYXRvcicga2luZCB0cmVhdG1lbnRcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgIHZhciBfY2xhdXNlID0ge1xuICAgICAgICAgICAgICAgICAgICBraW5kOiAncGxhaW4nLFxuICAgICAgICAgICAgICAgICAgICBrZXk6IGNsYXVzZS5rZXksXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBvcGVyYXRvclZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBfcGFyZW50ID0gY2xhdXNlLnZhbHVlO1xuICAgICAgICAgICAgICAgIHZhciBfa2V5ID0gXG4gICAgICAgICAgICAgICAgcmV0dXJuICEoX3Rlc3RDbGF1c2UoX2NsYXVzZSwgZG9jVmFsKSk7XG4gICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiJG5vdCB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICAgICAgLy8gRWxlbWVudCBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgICAgIGNhc2UgJyRleGlzdHMnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkZXhpc3RzJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wZXJhdG9yVmFsdWUgPyAhXy5pc1VuZGVmaW5lZChkb2NWYWwpIDogXy5pc1VuZGVmaW5lZChkb2NWYWwpO1xuICAgICAgICAgICAgY2FzZSAnJHR5cGUnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkdHlwZScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vICR0eXBlOiAxIGlzIHRydWUgZm9yIGFuIGFycmF5IGlmIGFueSBlbGVtZW50IGluIHRoZSBhcnJheSBpcyBvZlxuICAgICAgICAgICAgICAgIC8vIHR5cGUgMS4gYnV0IGFuIGFycmF5IGRvZXNuJ3QgaGF2ZSB0eXBlIGFycmF5IHVubGVzcyBpdCBjb250YWluc1xuICAgICAgICAgICAgICAgIC8vIGFuIGFycmF5Li5cbiAgICAgICAgICAgICAgICAvLyB2YXIgU2VsZWN0b3IuX2YuX3R5cGUoZG9jVmFsKTtcbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gU2VsZWN0b3IuX2YuX3R5cGUoZG9jVmFsKS50eXBlID09PSBvcGVyYXRvclZhbHVlO1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiJHR5cGUgdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgICAgIC8vIEV2YWx1YXRpb24gUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgICAgICBjYXNlICckbW9kJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG1vZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBkb2NWYWwgJSBvcGVyYXRvclZhbHVlWzBdID09PSBvcGVyYXRvclZhbHVlWzFdO1xuICAgICAgICAgICAgY2FzZSAnJG9wdGlvbnMnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkb3B0aW9ucyAoaWdub3JlZCknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUsIGFzIGl0IGlzIHRvIHRoZSBSZWdFeHBcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGNhc2UgJyRyZWdleCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRyZWdleCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBfb3B0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoXy5oYXNJbihjbGF1c2VWYWx1ZSwgJyRvcHRpb25zJykpIHtcbiAgICAgICAgICAgICAgICAgICAgX29wdCA9IGNsYXVzZVZhbHVlWyckb3B0aW9ucyddO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKC9beHNdLy50ZXN0KF9vcHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2csIGksIG0sIHgsIHNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE8gbW9uZ28gdXNlcyBQQ1JFIGFuZCBzdXBwb3J0cyBzb21lIGFkZGl0aW9uYWwgZmxhZ3M6ICd4JyBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICdzJy4gamF2YXNjcmlwdCBkb2Vzbid0IHN1cHBvcnQgdGhlbS4gc28gdGhpcyBpcyBhIGRpdmVyZ2VuY2VcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJldHdlZW4gb3VyIGJlaGF2aW9yIGFuZCBtb25nbydzIGJlaGF2aW9yLiBpZGVhbGx5IHdlIHdvdWxkXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpbXBsZW1lbnQgeCBhbmQgcyBieSB0cmFuc2Zvcm1pbmcgdGhlIHJlZ2V4cCwgYnV0IG5vdCB0b2RheS4uXG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiT25seSB0aGUgaSwgbSwgYW5kIGcgcmVnZXhwIG9wdGlvbnMgYXJlIHN1cHBvcnRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZXZpZXcgZmxhZ3MgLT4gZyAmIG1cbiAgICAgICAgICAgICAgICB2YXIgcmVnZXhwID0gb3BlcmF0b3JWYWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoXy5pc1JlZ0V4cChyZWdleHApICYmIF8uaXNOaWwoX29wdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlZ2V4cC50ZXN0KGRvY1ZhbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzTmlsKF9vcHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNSZWdFeHAocmVnZXhwKSkge1xuICAgICAgICAgICAgICAgICAgICByZWdleHAgPSBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIF9vcHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwLCBfb3B0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlZ2V4cC50ZXN0KGRvY1ZhbCk7XG4gICAgICAgICAgICBjYXNlICckdGV4dCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICR0ZXh0Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBpbXBsZW1lbnRcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIiR0ZXh0IHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgICAgICBjYXNlICckd2hlcmUnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkd2hlcmUnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiJHdoZXJlIHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgICAgICAvLyBHZW9zcGF0aWFsIFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICAgICAgLy8gVE9ETyAtPiBpbiBvcGVyYXRvciBraW5kXG4gICAgICAgICAgICAvLyBRdWVyeSBPcGVyYXRvciBBcnJheVxuICAgICAgICAgICAgY2FzZSAnJGFsbCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRhbGwnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmFsbChvcGVyYXRvclZhbHVlLCBkb2NWYWwpID4gMDtcbiAgICAgICAgICAgIGNhc2UgJyRlbGVtTWF0Y2gnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkZWxlbU1hdGNoJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBpbXBsZW1lbnRcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIiRlbGVtTWF0Y2ggdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgICAgIGNhc2UgJyRzaXplJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHNpemUnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gXy5pc0FycmF5KGRvY1ZhbCkgJiYgZG9jVmFsLmxlbmd0aCA9PT0gb3BlcmF0b3JWYWx1ZTtcbiAgICAgICAgICAgIC8vIEJpdHdpc2UgUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgICAgICAvLyBUT0RPXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAnICsga2V5KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVucmVjb2duaXplZCBrZXkgaW4gc2VsZWN0b3I6IFwiICsga2V5KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgdmFyIEJzb25UeXBlcyA9IHtcbiAgICBcdF90eXBlczogW1xuICAgIFx0XHR7IGFsaWFzOiAnbWluS2V5JywgbnVtYmVyOiAtMSwgb3JkZXI6IDEsIGlzVHlwZTogbnVsbCB9LFxuICAgIFx0XHR7IGFsaWFzOiAnbnVsbCcsIG51bWJlcjogMTAsIG9yZGVyOiAyLCBpc1R5cGU6IG51bGwgfSxcbiAgICBcdFx0eyBhbGlhczogJ2ludCcsIG51bWJlcjogMTYsIG9yZGVyOiAzLCBpc1R5cGU6IF8uaXNJbnRlZ2VyIH0sXG4gICAgXHRcdHsgYWxpYXM6ICdsb25nJywgbnVtYmVyOiAxOCwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc051bWJlciB9LFxuICAgIFx0XHR7IGFsaWFzOiAnZG91YmxlJywgbnVtYmVyOiAxLCBvcmRlcjogMywgaXNUeXBlOiBfLmlzTnVtYmVyIH0sXG4gICAgXHRcdHsgYWxpYXM6ICdudW1iZXInLCBudW1iZXI6IG51bGwsIG9yZGVyOiAzLCBpc1R5cGU6IF8uaXNOdW1iZXIgfSxcbiAgICBcdFx0eyBhbGlhczogJ3N0cmluZycsIG51bWJlcjogMiwgb3JkZXI6IDQsIGlzVHlwZTogXy5pc1N0cmluZyB9LFxuICAgIFx0XHR7IGFsaWFzOiAnc3ltYm9sJywgbnVtYmVyOiAxNCwgb3JkZXI6IDQsIGlzVHlwZTogXy5pc1N5bWJvbCB9LFxuICAgIFx0XHR7IGFsaWFzOiAnb2JqZWN0JywgbnVtYmVyOiAzLCBvcmRlcjogNSwgaXNUeXBlOiBfLmlzUGxhaW5PYmplY3QgfSxcbiAgICBcdFx0eyBhbGlhczogJ2FycmF5JywgbnVtYmVyOiA0LCBvcmRlcjogNiwgaXNUeXBlOiBfLmlzQXJyYXkgfSxcbiAgICBcdFx0eyBhbGlhczogJ2JpbkRhdGEnLCBudW1iZXI6IDUsIG9yZGVyOiA3LCBpc1R5cGU6IG51bGwgfSxcbiAgICBcdFx0eyBhbGlhczogJ29iamVjdElkJywgbnVtYmVyOiA3LCBvcmRlcjogOCwgaXNUeXBlZm5jOiBudWxsIH0sXG4gICAgXHRcdHsgYWxpYXM6ICdib29sJywgbnVtYmVyOiA4LCBvcmRlcjogOSwgaXNUeXBlOiBfLmlzQm9vbGVhbiB9LFxuICAgIFx0XHR7IGFsaWFzOiAnZGF0ZScsIG51bWJlcjogOSwgb3JkZXI6IDEwLCBpc1R5cGVmbmM6IF8uaXNEYXRlIH0sICAgICAgICAgLy8gZm9ybWF0XG4gICAgXHRcdHsgYWxpYXM6ICd0aW1lc3RhbXAnLCBudW1iZXI6IDE3LCBvcmRlcjogMTEsIGlzVHlwZTogXy5pc0RhdGUgfSwgICAvLyBmb3JtYXRcbiAgICBcdFx0eyBhbGlhczogJ3JlZ2V4JywgbnVtYmVyOiAxMSwgb3JkZXI6IDEyLCBpc1R5cGU6IF8uaXNSZWdFeHAgfSxcbiAgICBcdFx0eyBhbGlhczogJ21heEtleScsIG51bWJlcjogMTI3LCBvcmRlcjogMTMsIGlzVHlwZTogbnVsbCB9XG4gICAgXHRcdFxuICAgIC8vIFx0XHR1bmRlZmluZWQgNlxuICAgIC8vIFx0XHRkYlBvaW50ZXJcbiAgICAvLyBcdFx0amF2YXNjcmlwdFxuICAgIC8vIFx0XHRqYXZhc2NyaXB0V2l0aFNjb3BlXG4gICAgLy8gXHRcdGZ1bmN0aW9uXG4gICAgXHRdLFxuICAgIFx0XG4gICAgXHRnZXRCeUFsaWFzOiBmdW5jdGlvbihhbGlhcykge1xuICAgIFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3R5cGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgXHRcdFx0aWYgKHRoaXMuX3R5cGVzW2ldLmFsaWFzID09PSBhbGlhcykgcmV0dXJuIHRoaXMuX3R5cGVzW2ldO1xuICAgIFx0XHR9XG4gICAgXHR9LFxuICAgIFx0Z2V0QnlWYWx1ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgXHQgICAgaWYgKF8uaXNOdW1iZXIodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcImRvdWJsZVwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNTdHJpbmcodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcInN0cmluZ1wiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNCb29sZWFuKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJib29sXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJhcnJheVwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNOdWxsKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJudWxsXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc1JlZ0V4cCh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwicmVnZXhcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzUGxhaW5PYmplY3QodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcIm9iamVjdFwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNTeW1ib2wodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcInN5bWJvbFwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJVbmFjY2VwdGVkIEJTT04gdHlwZVwiKTtcbiAgICBcdH1cbiAgICB9O1xuICAgIFxuICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXI7XG59OyJdfQ==
