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
            } else {
                regexp = new RegExp(regexp.source, _opt);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9TZWxlY3Rvck1hdGNoZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSSxTQUFTLFFBQVEsZ0JBQVIsQ0FBYjtJQUNJLElBQUksUUFBUSxRQUFSLENBRFI7O0FBR0EsSUFBSSxTQUFTLElBQWI7O0lBRU0sZTtBQUNMLDZCQUFZLFFBQVosRUFBc0I7QUFBQTs7QUFDZixhQUFLLE9BQUwsR0FBZSxTQUFTLE9BQXhCOztBQUVBLGlCQUFTLE9BQU8sUUFBaEI7QUFDTjs7Ozs2QkFFSSxRLEVBQVU7QUFDZCxtQkFBTyxLQUFQLENBQWEsOEJBQWI7O0FBRUEsZ0JBQUksU0FBUyxJQUFiOztBQUVBLGdCQUFJLEVBQUUsS0FBRixDQUFRLFFBQVIsQ0FBSixFQUF1QjtBQUN0Qix1QkFBTyxLQUFQLENBQWEsa0JBQWI7O0FBRUEsdUJBQU8sS0FBUCxDQUFhLCtCQUFiO0FBQ0E7O0FBRUQsbUJBQU8sS0FBUCxDQUFhLHNCQUFiOztBQUVBLGlCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksS0FBSyxPQUFMLENBQWEsTUFBakMsRUFBeUMsR0FBekMsRUFBOEM7QUFDN0Msb0JBQUksU0FBUyxLQUFLLE9BQUwsQ0FBYSxDQUFiLENBQWI7O0FBRUEsb0JBQUksT0FBTyxJQUFQLEtBQWdCLFVBQXBCLEVBQWdDO0FBQy9CLDJCQUFPLEtBQVAsQ0FBYSxvQkFBYjs7QUFFQSw2QkFBUyxPQUFPLEtBQVAsQ0FBYSxJQUFiLENBQWtCLElBQWxCLEVBQXdCLFFBQXhCLENBQVQ7QUFDQSxpQkFKRCxNQUlPLElBQUksT0FBTyxJQUFQLEtBQWdCLE9BQXBCLEVBQTZCO0FBQ25DLDJCQUFPLEtBQVAsaUNBQTBDLE9BQU8sR0FBakQsdUJBQXFFLEtBQUssU0FBTCxDQUFlLE9BQU8sS0FBdEIsQ0FBckU7O0FBRUEsNkJBQVMsWUFBWSxNQUFaLEVBQW9CLFNBQVMsT0FBTyxHQUFoQixDQUFwQixDQUFUOztBQUVBLDJCQUFPLEtBQVAsQ0FBYSxz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VCxDQUFKLEVBQW1CLE9BQU8sS0FBSyxVQUFMLENBQWdCLE1BQWhCLENBQVA7O0FBRW5CLFlBQUksRUFBRSxRQUFGLENBQVcsR0FBWCxDQUFKLEVBQXFCLE9BQU8sS0FBSyxVQUFMLENBQWdCLE9BQWhCLENBQVA7O0FBRXJCLFlBQUksRUFBRSxhQUFGLENBQWdCLEdBQWhCLENBQUosRUFBMEIsT0FBTyxLQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsQ0FBUDs7QUFFMUIsWUFBSSxFQUFFLFFBQUYsQ0FBVyxHQUFYLENBQUosRUFBcUIsT0FBTyxLQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsQ0FBUDs7QUFFckIsY0FBTSxNQUFNLHNCQUFOLENBQU47QUFDTjtBQWxEYyxDQUFoQjs7QUFxREEsT0FBTyxPQUFQLEdBQWlCLGVBQWpCIiwiZmlsZSI6IlNlbGVjdG9yTWF0Y2hlci5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBMb2dnZXIgPSByZXF1aXJlKFwiLi91dGlscy9Mb2dnZXJcIiksXG4gICAgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIik7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcblxuY2xhc3MgU2VsZWN0b3JNYXRjaGVyIHtcblx0Y29uc3RydWN0b3Ioc2VsZWN0b3IpIHtcbiAgICAgICAgdGhpcy5jbGF1c2VzID0gc2VsZWN0b3IuY2xhdXNlcztcblxuICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG5cdH1cblx0XG5cdHRlc3QoZG9jdW1lbnQpIHtcblx0XHRsb2dnZXIuZGVidWcoJ0NhbGxlZCBTZWxlY3Rvck1hdGNoZXItPnRlc3QnKTtcblx0XHRcblx0XHR2YXIgX21hdGNoID0gdHJ1ZTtcblxuXHRcdGlmIChfLmlzTmlsKGRvY3VtZW50KSkge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdkb2N1bWVudCAtPiBudWxsJyk7XG5cdFx0XHRcblx0XHRcdGxvZ2dlci50aHJvdyhcIlBhcmFtZXRlciAnZG9jdW1lbnQnIHJlcXVpcmVkXCIpO1xuXHRcdH1cblx0XHRcblx0XHRsb2dnZXIuZGVidWcoJ2RvY3VtZW50IC0+IG5vdCBudWxsJyk7XG5cdFx0XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsYXVzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjbGF1c2UgPSB0aGlzLmNsYXVzZXNbaV07XG5cdFx0XHRcblx0XHRcdGlmIChjbGF1c2Uua2luZCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZSAtPiBmdW5jdGlvbicpO1xuXHRcdFx0XHRcblx0XHRcdFx0X21hdGNoID0gY2xhdXNlLnZhbHVlLmNhbGwobnVsbCwgZG9jdW1lbnQpO1xuXHRcdFx0fSBlbHNlIGlmIChjbGF1c2Uua2luZCA9PT0gJ3BsYWluJykge1xuXHRcdFx0XHRsb2dnZXIuZGVidWcoYGNsYXVzZSAtPiBwbGFpbiBvbiBmaWVsZCBcIiR7Y2xhdXNlLmtleX1cIiBhbmQgdmFsdWUgPSAke0pTT04uc3RyaW5naWZ5KGNsYXVzZS52YWx1ZSl9YCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRfbWF0Y2ggPSBfdGVzdENsYXVzZShjbGF1c2UsIGRvY3VtZW50W2NsYXVzZS5rZXldKTtcblx0XHRcdFx0XG5cdFx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlIHJlc3VsdCAtPiAnICsgX21hdGNoKTtcblx0XHRcdH0gZWxzZSBpZiAoY2xhdXNlLmtpbmQgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdGxvZ2dlci5kZWJ1ZyhgY2xhdXNlIC0+IG9iamVjdCBvbiBmaWVsZCBcIiR7Y2xhdXNlLmtleS5qb2luKCcuJyl9XCIgYW5kIHZhbHVlID0gJHtKU09OLnN0cmluZ2lmeShjbGF1c2UudmFsdWUpfWApO1xuXHRcdFx0XHRcblx0XHRcdFx0X21hdGNoID0gX3Rlc3RPYmplY3RDbGF1c2UoY2xhdXNlLCBkb2N1bWVudCwgXy5jbG9uZShjbGF1c2Uua2V5KS5yZXZlcnNlKCkpO1xuXHRcdFx0XHRcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgcmVzdWx0IC0+ICcgKyBfbWF0Y2gpO1xuXHRcdFx0fSBlbHNlIGlmIChjbGF1c2Uua2luZCA9PT0gJ29wZXJhdG9yJykge1xuXHRcdFx0ICAgIGxvZ2dlci5kZWJ1ZyhgY2xhdXNlIC0+IG9wZXJhdG9yICcke2NsYXVzZS5rZXl9J2ApO1xuXHRcdFx0ICAgIFxuXHRcdCAgICAgICAgbGV0IF9tYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcih7IGNsYXVzZXM6IGNsYXVzZS52YWx1ZSB9KTtcblx0XHQgICAgICAgIFxuXHRcdCAgICAgICAgX21hdGNoID0gX21hdGNoZXIudGVzdChkb2N1bWVudCk7XG5cdFx0ICAgICAgICBcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgcmVzdWx0IC0+ICcgKyBfbWF0Y2gpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQvLyBJZiBhbnkgdGVzdCBjYXNlIGZhaWxzLCB0aGUgZG9jdW1lbnQgd2lsbCBub3QgbWF0Y2hcblx0XHRcdGlmIChfbWF0Y2ggPT09IGZhbHNlIHx8IF9tYXRjaCA9PT0gJ2ZhbHNlJykge1xuXHRcdFx0XHRsb2dnZXIuZGVidWcoJ3RoZSBkb2N1bWVudCBkbyBub3QgbWF0Y2hlcycpO1xuXHRcdFx0XHRcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvLyBFdmVyeXRoaW5nIG1hdGNoZXNcblx0XHRsb2dnZXIuZGVidWcoJ3RoZSBkb2N1bWVudCBtYXRjaGVzJyk7XG5cdFx0XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0XG5cdHN0YXRpYyBhbGwoYXJyYXksIHZhbHVlKSB7XG4gICAgICAgIC8vICRhbGwgaXMgb25seSBtZWFuaW5nZnVsIG9uIGFycmF5c1xuICAgICAgICBpZiAoIShhcnJheSBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVE9ETyBzaG91bGQgdXNlIGEgY2Fub25pY2FsaXppbmcgcmVwcmVzZW50YXRpb24sIHNvIHRoYXQgd2VcbiAgICAgICAgLy8gZG9uJ3QgZ2V0IHNjcmV3ZWQgYnkga2V5IG9yZGVyXG4gICAgICAgIHZhciBwYXJ0cyA9IHt9O1xuICAgICAgICB2YXIgcmVtYWluaW5nID0gMDtcblxuICAgICAgICBfLmZvckVhY2godmFsdWUsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHZhciBoYXNoID0gSlNPTi5zdHJpbmdpZnkodmFsKTtcblxuICAgICAgICAgICAgaWYgKCEoaGFzaCBpbiBwYXJ0cykpIHtcbiAgICAgICAgICAgICAgICBwYXJ0c1toYXNoXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVtYWluaW5nKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBoYXNoID0gSlNPTi5zdHJpbmdpZnkoYXJyYXlbaV0pO1xuICAgICAgICAgICAgaWYgKHBhcnRzW2hhc2hdKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHBhcnRzW2hhc2hdO1xuICAgICAgICAgICAgICAgIHJlbWFpbmluZy0tO1xuXG4gICAgICAgICAgICAgICAgaWYgKDAgPT09IHJlbWFpbmluZykgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXHRcblx0c3RhdGljIGluKGFycmF5LCB2YWx1ZSkge1xuICAgICAgICBpZiAoIV8uaXNPYmplY3QoYXJyYXkpKSB7XG4gICAgICAgICAgICAvLyBvcHRpbWl6YXRpb246IHVzZSBzY2FsYXIgZXF1YWxpdHkgKGZhc3QpXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFycmF5ID09PSB2YWx1ZVtpXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vcGUsIGhhdmUgdG8gdXNlIGRlZXAgZXF1YWxpdHlcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoU2VsZWN0b3JNYXRjaGVyLmVxdWFsKGFycmF5LCB2YWx1ZVtpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cdFxuXHQvLyBkZWVwIGVxdWFsaXR5IHRlc3Q6IHVzZSBmb3IgbGl0ZXJhbCBkb2N1bWVudCBhbmQgYXJyYXkgbWF0Y2hlc1xuXHRzdGF0aWMgZXF1YWwoYXJyYXksIHF2YWwpIHtcbiAgICAgICAgdmFyIG1hdGNoID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgIC8vIHNjYWxhcnNcbiAgICAgICAgICAgIGlmIChfLmlzTnVtYmVyKGEpIHx8IF8uaXNTdHJpbmcoYSkgfHwgXy5pc0Jvb2xlYW4oYSkgfHwgXy5pc05pbChhKSkgcmV0dXJuIGEgPT09IGI7XG5cbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24oYSkpIHJldHVybiBmYWxzZTsgIC8vIE5vdCBhbGxvd2VkIHlldFxuXG4gICAgICAgICAgICAvLyBPSywgdHlwZW9mIGEgPT09ICdvYmplY3QnXG4gICAgICAgICAgICBpZiAoIV8uaXNPYmplY3QoYikpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgLy8gYXJyYXlzXG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KGEpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFfLmlzQXJyYXkoYikpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKGFbaV0sYltpXSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gb2JqZWN0c1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIHZhciB1bm1hdGNoZWRfYl9rZXlzID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gYilcbiAgICAgICAgICAgICAgICB1bm1hdGNoZWRfYl9rZXlzKys7XG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoISh4IGluIGIpIHx8ICFtYXRjaChhW3hdLCBiW3hdKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIHVubWF0Y2hlZF9iX2tleXMtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB1bm1hdGNoZWRfYl9rZXlzID09PSAwO1xuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIC8vIEZvbGxvdyBNb25nbyBpbiBjb25zaWRlcmluZyBrZXkgb3JkZXIgdG8gYmUgcGFydCBvZlxuICAgICAgICAgICAgLy8gZXF1YWxpdHkuIEtleSBlbnVtZXJhdGlvbiBvcmRlciBpcyBhY3R1YWxseSBub3QgZGVmaW5lZCBpblxuICAgICAgICAgICAgLy8gdGhlIGVjbWFzY3JpcHQgc3BlYyBidXQgaW4gcHJhY3RpY2UgbW9zdCBpbXBsZW1lbnRhdGlvbnNcbiAgICAgICAgICAgIC8vIHByZXNlcnZlIGl0LiAoVGhlIGV4Y2VwdGlvbiBpcyBDaHJvbWUsIHdoaWNoIHByZXNlcnZlcyBpdFxuICAgICAgICAgICAgLy8gdXN1YWxseSwgYnV0IG5vdCBmb3Iga2V5cyB0aGF0IHBhcnNlIGFzIGludHMuKVxuICAgICAgICAgICAgdmFyIGJfa2V5cyA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBhcnJheSBpbiBiKSB7XG4gICAgICAgICAgICAgICAgYl9rZXlzLnB1c2goYlthcnJheV0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBhcnJheSBpbiBhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgPj0gYl9rZXlzLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaChhW2FycmF5XSwgYl9rZXlzW2ldKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGkgIT09IGJfa2V5cy5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIG1hdGNoKGFycmF5LCBxdmFsKTtcbiAgICB9XG5cdFxuXHQvLyBpZiB4IGlzIG5vdCBhbiBhcnJheSwgdHJ1ZSBpZmYgZih4KSBpcyB0cnVlLiBpZiB4IGlzIGFuIGFycmF5LFxuICAgIC8vIHRydWUgaWZmIGYoeSkgaXMgdHJ1ZSBmb3IgYW55IHkgaW4geC5cbiAgICAvL1xuICAgIC8vIHRoaXMgaXMgdGhlIHdheSBtb3N0IG1vbmdvIG9wZXJhdG9ycyAobGlrZSAkZ3QsICRtb2QsICR0eXBlLi4pXG4gICAgLy8gdHJlYXQgdGhlaXIgYXJndW1lbnRzLlxuICAgIHN0YXRpYyBtYXRjaGVzKHZhbHVlLCBmdW5jKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZ1bmModmFsdWVbaV0pKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZ1bmModmFsdWUpO1xuICAgIH1cblx0XG5cdC8vIGxpa2UgX21hdGNoZXMsIGJ1dCBpZiB4IGlzIGFuIGFycmF5LCBpdCdzIHRydWUgbm90IG9ubHkgaWYgZih5KVxuICAgIC8vIGlzIHRydWUgZm9yIHNvbWUgeSBpbiB4LCBidXQgYWxzbyBpZiBmKHgpIGlzIHRydWUuXG4gICAgLy9cbiAgICAvLyB0aGlzIGlzIHRoZSB3YXkgbW9uZ28gdmFsdWUgY29tcGFyaXNvbnMgdXN1YWxseSB3b3JrLCBsaWtlIHt4OlxuICAgIC8vIDR9LCB7eDogWzRdfSwgb3Ige3g6IHskaW46IFsxLDIsM119fS5cbiAgICBzdGF0aWMgbWF0Y2hlc19wbHVzKHZhbHVlLCBmdW5jKSB7XG4gICAgICAgIC8vIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIC8vICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vICAgICAgICAgaWYgKGZ1bmModmFsdWVbaV0pKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgLy8gICAgIH1cblxuICAgICAgICAvLyAgICAgLy8gZmFsbCB0aHJvdWdoIVxuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gcmV0dXJuIGZ1bmModmFsdWUpO1xuICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLm1hdGNoZXModmFsdWUsIGZ1bmMpIHx8IGZ1bmModmFsdWUpO1xuICAgIH1cblx0XG5cdC8vIGNvbXBhcmUgdHdvIHZhbHVlcyBvZiB1bmtub3duIHR5cGUgYWNjb3JkaW5nIHRvIEJTT04gb3JkZXJpbmdcbiAgICAvLyBzZW1hbnRpY3MuIChhcyBhbiBleHRlbnNpb24sIGNvbnNpZGVyICd1bmRlZmluZWQnIHRvIGJlIGxlc3MgdGhhblxuICAgIC8vIGFueSBvdGhlciB2YWx1ZS4pXG4gICAgLy8gcmV0dXJuIG5lZ2F0aXZlIGlmIGEgaXMgbGVzcywgcG9zaXRpdmUgaWYgYiBpcyBsZXNzLCBvciAwIGlmIGVxdWFsXG4gICAgc3RhdGljIGNtcChhLCBiKSB7XG4gICAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGEpKSByZXR1cm4gYiA9PT0gdW5kZWZpbmVkID8gMCA6IC0xO1xuXG4gICAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGIpKSByZXR1cm4gMTtcblx0XHRcbiAgICAgICAgdmFyIGFUeXBlID0gQnNvblR5cGVzLmdldEJ5VmFsdWUoYSk7XG4gICAgICAgIHZhciBiVHlwZSA9IEJzb25UeXBlcy5nZXRCeVZhbHVlKGIpO1xuXG4gICAgICAgIGlmIChhVHlwZS5vcmRlciAhPT0gYlR5cGUub3JkZXIpIHJldHVybiBhVHlwZS5vcmRlciA8IGJUeXBlLm9yZGVyID8gLTEgOiAxO1xuXG4gICAgICAgIC8vIFNhbWUgc29ydCBvcmRlciwgYnV0IGRpc3RpbmN0IHZhbHVlIHR5cGVcbiAgICAgICAgaWYgKGFUeXBlLm51bWJlciAhPT0gYlR5cGUubnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBDdXJyZW50bHksIFN5bWJvbHMgY2FuIG5vdCBiZSBzb3J0ZXJlZCBpbiBKUywgc28gd2UgYXJlIHNldHRpbmcgdGhlIFN5bWJvbCBhcyBncmVhdGVyXG4gICAgICAgICAgICBpZiAoXy5pc1N5bWJvbChhKSkgcmV0dXJuIDE7XG4gICAgICAgICAgICBpZiAoXy5pc1N5bWJvbChiKSkgcmV0dXJuIC0xO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUT0RPIEludGVnZXIsIERhdGUgYW5kIFRpbWVzdGFtcFxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc051bWJlcihhKSkgcmV0dXJuIGEgLSBiO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcoYSkpIHJldHVybiBhIDwgYiA/IC0xIDogKGEgPT09IGIgPyAwIDogMSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Jvb2xlYW4oYSkpIHtcbiAgICAgICAgICAgIGlmIChhKSByZXR1cm4gYiA/IDAgOiAxO1xuXG4gICAgICAgICAgICByZXR1cm4gYiA/IC0xIDogMDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNBcnJheShhKSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IGEubGVuZ3RoKSByZXR1cm4gKGkgPT09IGIubGVuZ3RoKSA/IDAgOiAtMTtcblxuICAgICAgICAgICAgICAgIGlmIChpID09PSBiLmxlbmd0aCkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICB2YXIgcyA9IFNlbGVjdG9yTWF0Y2hlci5jbXAoYVtpXSwgYltpXSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocyAhPT0gMCkgcmV0dXJuIHM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTnVsbChhKSkgcmV0dXJuIDA7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1JlZ0V4cChhKSkgdGhyb3cgRXJyb3IoXCJTb3J0aW5nIG5vdCBzdXBwb3J0ZWQgb24gcmVndWxhciBleHByZXNzaW9uXCIpOyAvLyBUT0RPXG4gICAgICAgIFxuICAgICAgICAvLyBpZiAoXy5pc0Z1bmN0aW9uKGEpKSByZXR1cm4ge3R5cGU6IDEzLCBvcmRlcjogMTAwLCBmbmM6IF8uaXNGdW5jdGlvbn07XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1BsYWluT2JqZWN0KGEpKSB7XG4gICAgICAgICAgICB2YXIgdG9fYXJyYXkgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChvYmpba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuY21wKHRvX2FycmF5KGEpLCB0b19hcnJheShiKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkb3VibGVcbiAgICAgICAgLy8gaWYgKHRhID09PSAxKSAgcmV0dXJuIGEgLSBiO1xuXG4gICAgICAgIC8vIHN0cmluZ1xuICAgICAgICAvLyBpZiAodGIgPT09IDIpIHJldHVybiBhIDwgYiA/IC0xIDogKGEgPT09IGIgPyAwIDogMSk7XG5cbiAgICAgICAgLy8gT2JqZWN0XG4gICAgICAgIC8vIGlmICh0YSA9PT0gMykge1xuICAgICAgICAvLyAgICAgLy8gdGhpcyBjb3VsZCBiZSBtdWNoIG1vcmUgZWZmaWNpZW50IGluIHRoZSBleHBlY3RlZCBjYXNlIC4uLlxuICAgICAgICAvLyAgICAgdmFyIHRvX2FycmF5ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAvLyAgICAgICAgIHZhciByZXQgPSBbXTtcblxuICAgICAgICAvLyAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgcmV0LnB1c2goa2V5KTtcbiAgICAgICAgLy8gICAgICAgICAgICAgcmV0LnB1c2gob2JqW2tleV0pO1xuICAgICAgICAvLyAgICAgICAgIH1cblxuICAgICAgICAvLyAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIC8vICAgICB9O1xuXG4gICAgICAgIC8vICAgICByZXR1cm4gU2VsZWN0b3IuX2YuX2NtcCh0b19hcnJheShhKSwgdG9fYXJyYXkoYikpO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gQXJyYXlcbiAgICAgICAgLy8gaWYgKHRhID09PSA0KSB7XG4gICAgICAgIC8vICAgICBmb3IgKHZhciBpID0gMDsgOyBpKyspIHtcbiAgICAgICAgLy8gICAgICAgICBpZiAoaSA9PT0gYS5sZW5ndGgpIHJldHVybiAoaSA9PT0gYi5sZW5ndGgpID8gMCA6IC0xO1xuXG4gICAgICAgIC8vICAgICAgICAgaWYgKGkgPT09IGIubGVuZ3RoKSByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgLy8gICAgICAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gYS5sZW5ndGggLSBiLmxlbmd0aDtcblxuICAgICAgICAvLyAgICAgICAgIHZhciBzID0gU2VsZWN0b3IuX2YuX2NtcChhW2ldLCBiW2ldKTtcblxuICAgICAgICAvLyAgICAgICAgIGlmIChzICE9PSAwKSByZXR1cm4gcztcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIDU6IGJpbmFyeSBkYXRhXG4gICAgICAgIC8vIDc6IG9iamVjdCBpZFxuXG4gICAgICAgIC8vIGJvb2xlYW5cbiAgICAgICAgLy8gaWYgKHRhID09PSA4KSB7XG4gICAgICAgIC8vICAgICBpZiAoYSkgcmV0dXJuIGIgPyAwIDogMTtcblxuICAgICAgICAvLyAgICAgcmV0dXJuIGIgPyAtMSA6IDA7XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyA5OiBkYXRlXG5cbiAgICAgICAgLy8gbnVsbFxuICAgICAgICAvLyBpZiAodGEgPT09IDEwKSByZXR1cm4gMDtcblxuICAgICAgICAvLyByZWdleHBcbiAgICAgICAgLy8gaWYgKHRhID09PSAxMSkge1xuICAgICAgICAvLyAgICAgdGhyb3cgRXJyb3IoXCJTb3J0aW5nIG5vdCBzdXBwb3J0ZWQgb24gcmVndWxhciBleHByZXNzaW9uXCIpOyAvLyBUT0RPXG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyAxMzogamF2YXNjcmlwdCBjb2RlXG4gICAgICAgIC8vIDE0OiBzeW1ib2xcbiAgICAgICAgaWYgKF8uaXNTeW1ib2woYSkpIHtcbiAgICAgICAgICAgIC8vIEN1cnJlbnRseSwgU3ltYm9scyBjYW4gbm90IGJlIHNvcnRlcmVkIGluIEpTLCBzbyB3ZSBhcmUgcmV0dXJuaW5nIGFuIGVxdWFsaXR5XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICAvLyAxNTogamF2YXNjcmlwdCBjb2RlIHdpdGggc2NvcGVcbiAgICAgICAgLy8gMTY6IDMyLWJpdCBpbnRlZ2VyXG4gICAgICAgIC8vIDE3OiB0aW1lc3RhbXBcbiAgICAgICAgLy8gMTg6IDY0LWJpdCBpbnRlZ2VyXG4gICAgICAgIC8vIDI1NTogbWlua2V5XG4gICAgICAgIC8vIDEyNzogbWF4a2V5XG5cbiAgICAgICAgLy8gamF2YXNjcmlwdCBjb2RlXG4gICAgICAgIC8vIGlmICh0YSA9PT0gMTMpIHtcbiAgICAgICAgLy8gICAgIHRocm93IEVycm9yKFwiU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIEphdmFzY3JpcHQgY29kZVwiKTsgLy8gVE9ET1xuICAgICAgICAvLyB9XG4gICAgfVxufVxuXG52YXIgX3Rlc3RDbGF1c2UgPSBmdW5jdGlvbihjbGF1c2UsIHZhbCkge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIF90ZXN0Q2xhdXNlJyk7XG4gICAgXG4gICAgLy8gdmFyIF92YWwgPSBjbGF1c2UudmFsdWU7XG4gICAgXG4gICAgLy8gaWYgUmVnRXhwIHx8ICQgLT4gT3BlcmF0b3JcbiAgICBcbiAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLm1hdGNoZXNfcGx1cyh2YWwsIGZ1bmN0aW9uKF92YWx1ZSkge1xuICAgICAgICAvLyBUT0RPIG9iamVjdCBpZHMsIGRhdGVzLCB0aW1lc3RhbXBzP1xuICAgICAgICBzd2l0Y2ggKGNsYXVzZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdudWxsJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgTnVsbCBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1F1ZXJ5aW5nK2FuZCtudWxsc1xuICAgICAgICAgICAgICAgIGlmIChfLmlzTmlsKF92YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3JlZ2V4cCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IFJlZ0V4cCBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBfdGVzdE9wZXJhdG9yQ2xhdXNlKGNsYXVzZSwgX3ZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ2xpdGVyYWxfb2JqZWN0JzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgTGl0ZXJhbCBPYmplY3QgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmVxdWFsKF92YWx1ZSwgY2xhdXNlLnZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ29wZXJhdG9yX29iamVjdCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IE9wZXJhdG9yIE9iamVjdCBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBfdGVzdE9wZXJhdG9yQ2xhdXNlKGNsYXVzZSwgX3ZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IFN0cmluZyBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBfLnRvU3RyaW5nKF92YWx1ZSkgPT09IF8udG9TdHJpbmcoY2xhdXNlLnZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IE51bWJlciBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBfLnRvTnVtYmVyKF92YWx1ZSkgPT09IF8udG9OdW1iZXIoY2xhdXNlLnZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBCb29sZWFuIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIChfLmlzQm9vbGVhbihfdmFsdWUpICYmIF8uaXNCb29sZWFuKGNsYXVzZS52YWx1ZSkgJiYgKF92YWx1ZSA9PT0gY2xhdXNlLnZhbHVlKSk7XG4gICAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IEJvb2xlYW4gZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDaGVjayB0eXBlXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheShfdmFsdWUpICYmIF8uaXNBcnJheShjbGF1c2UudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGxlbmd0aFxuICAgICAgICAgICAgICAgICAgICBpZiAoX3ZhbHVlLmxlbmd0aCA9PT0gY2xhdXNlLnZhbHVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaXRlbXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX3ZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsYXVzZS52YWx1ZS5pbmRleE9mKF92YWx1ZVtpXSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgRnVuY3Rpb24gZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCB2YWx1ZSB0eXBlIGluIHF1ZXJ5XCIpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCB2YWx1ZSB0eXBlIGluIHF1ZXJ5XCIpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG52YXIgX3Rlc3RPYmplY3RDbGF1c2UgPSBmdW5jdGlvbihjbGF1c2UsIGRvYywga2V5KSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdDYWxsZWQgX3Rlc3RPYmplY3RDbGF1c2UnKTtcbiAgICBcbiAgICB2YXIgdmFsID0gbnVsbDtcbiAgICBcbiAgICBpZiAoa2V5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIHBhdGggPSBrZXkucG9wKCk7XG4gICAgICAgIHZhbCA9IGRvY1twYXRoXTtcbiAgICAgICAgXG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2hlY2sgb24gZmllbGQgJyArIHBhdGgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVE9ETyBhZGQgXy5pc051bWJlcih2YWwpIGFuZCB0cmVhdCBpdCBhcyBhbiBhcnJheVxuICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nKHZhbCk7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2dvaW5nIGRlZXBlcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gX3Rlc3RPYmplY3RDbGF1c2UoY2xhdXNlLCB2YWwsIGtleSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2xvd2VzdCBwYXRoOiAnICsgcGF0aCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gX3Rlc3RDbGF1c2UoY2xhdXNlLCBkb2MpO1xuICAgIH1cbn07XG5cbnZhciBfdGVzdE9wZXJhdG9yQ2xhdXNlID0gZnVuY3Rpb24oY2xhdXNlLCB2YWx1ZSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIF90ZXN0T3BlcmF0b3JDbGF1c2UnKTtcbiAgICBcbiAgICBmb3IgKHZhciBrZXkgaW4gY2xhdXNlLnZhbHVlKSB7XG4gICAgICAgIGlmICghX3Rlc3RPcGVyYXRvckNvbnN0cmFpbnQoa2V5LCBjbGF1c2UudmFsdWVba2V5XSwgY2xhdXNlLnZhbHVlLCB2YWx1ZSwgY2xhdXNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0cnVlO1xufTtcblxudmFyIF90ZXN0T3BlcmF0b3JDb25zdHJhaW50ID0gZnVuY3Rpb24gKGtleSwgb3BlcmF0b3JWYWx1ZSwgY2xhdXNlVmFsdWUsIGRvY1ZhbCwgY2xhdXNlKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdDYWxsZWQgX3Rlc3RPcGVyYXRvckNvbnN0cmFpbnQnKTtcbiAgICBcbiAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAvLyBDb21wYXJpc29uIFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICBjYXNlICckZ3QnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRndCcpO1xuXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpID4gMDtcbiAgICAgICAgY2FzZSAnJGx0JzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbHQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5jbXAoZG9jVmFsLCBvcGVyYXRvclZhbHVlKSA8IDA7XG4gICAgICAgIGNhc2UgJyRndGUnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRndGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5jbXAoZG9jVmFsLCBvcGVyYXRvclZhbHVlKSA+PSAwO1xuICAgICAgICBjYXNlICckbHRlJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbHRlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuY21wKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSkgPD0gMDtcbiAgICAgICAgY2FzZSAnJGVxJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkZXEnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5lcXVhbChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpO1xuICAgICAgICBjYXNlICckbmUnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRuZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gIVNlbGVjdG9yTWF0Y2hlci5lcXVhbChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpO1xuICAgICAgICBjYXNlICckaW4nOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRpbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmluKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSk7XG4gICAgICAgIGNhc2UgJyRuaW4nOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRuaW4nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuICFTZWxlY3Rvck1hdGNoZXIuaW4oZG9jVmFsLCBvcGVyYXRvclZhbHVlKTtcbiAgICAgICAgLy8gTG9naWNhbCBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgY2FzZSAnJG5vdCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG5vdCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyAkb3IsICRhbmQsICRub3IgYXJlIGluIHRoZSAnb3BlcmF0b3InIGtpbmQgdHJlYXRtZW50XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgdmFyIF9jbGF1c2UgPSB7XG4gICAgICAgICAgICAgICAga2luZDogJ3BsYWluJyxcbiAgICAgICAgICAgICAgICBrZXk6IGNsYXVzZS5rZXksXG4gICAgICAgICAgICAgICAgdmFsdWU6IG9wZXJhdG9yVmFsdWUsXG4gICAgICAgICAgICAgICAgdHlwZTogXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIF9wYXJlbnQgPSBjbGF1c2UudmFsdWU7XG4gICAgICAgICAgICB2YXIgX2tleSA9IFxuICAgICAgICAgICAgcmV0dXJuICEoX3Rlc3RDbGF1c2UoX2NsYXVzZSwgZG9jVmFsKSk7XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgLy8gVE9ETyBpbXBsZW1lbnRcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiJG5vdCB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICAvLyBFbGVtZW50IFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICBjYXNlICckZXhpc3RzJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkZXhpc3RzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBvcGVyYXRvclZhbHVlID8gIV8uaXNVbmRlZmluZWQoZG9jVmFsKSA6IF8uaXNVbmRlZmluZWQoZG9jVmFsKTtcbiAgICAgICAgY2FzZSAnJHR5cGUnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICR0eXBlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vICR0eXBlOiAxIGlzIHRydWUgZm9yIGFuIGFycmF5IGlmIGFueSBlbGVtZW50IGluIHRoZSBhcnJheSBpcyBvZlxuICAgICAgICAgICAgLy8gdHlwZSAxLiBidXQgYW4gYXJyYXkgZG9lc24ndCBoYXZlIHR5cGUgYXJyYXkgdW5sZXNzIGl0IGNvbnRhaW5zXG4gICAgICAgICAgICAvLyBhbiBhcnJheS4uXG4gICAgICAgICAgICAvLyB2YXIgU2VsZWN0b3IuX2YuX3R5cGUoZG9jVmFsKTtcbiAgICAgICAgICAgIC8vIHJldHVybiBTZWxlY3Rvci5fZi5fdHlwZShkb2NWYWwpLnR5cGUgPT09IG9wZXJhdG9yVmFsdWU7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIiR0eXBlIHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgIC8vIEV2YWx1YXRpb24gUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIGNhc2UgJyRtb2QnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRtb2QnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGRvY1ZhbCAlIG9wZXJhdG9yVmFsdWVbMF0gPT09IG9wZXJhdG9yVmFsdWVbMV07XG4gICAgICAgIGNhc2UgJyRvcHRpb25zJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkb3B0aW9ucyAoaWdub3JlZCknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWdub3JlLCBhcyBpdCBpcyB0byB0aGUgUmVnRXhwXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgY2FzZSAnJHJlZ2V4JzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkcmVnZXgnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIF9vcHQgPSBudWxsO1xuICAgICAgICAgICAgaWYgKF8uaGFzSW4oY2xhdXNlVmFsdWUsICckb3B0aW9ucycpKSB7XG4gICAgICAgICAgICAgICAgX29wdCA9IGNsYXVzZVZhbHVlWyckb3B0aW9ucyddO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgvW3hzXS8udGVzdChfb3B0KSkge1xuICAgICAgICAgICAgICAgICAgICAvL2csIGksIG0sIHgsIHNcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyBtb25nbyB1c2VzIFBDUkUgYW5kIHN1cHBvcnRzIHNvbWUgYWRkaXRpb25hbCBmbGFnczogJ3gnIGFuZFxuICAgICAgICAgICAgICAgICAgICAvLyAncycuIGphdmFzY3JpcHQgZG9lc24ndCBzdXBwb3J0IHRoZW0uIHNvIHRoaXMgaXMgYSBkaXZlcmdlbmNlXG4gICAgICAgICAgICAgICAgICAgIC8vIGJldHdlZW4gb3VyIGJlaGF2aW9yIGFuZCBtb25nbydzIGJlaGF2aW9yLiBpZGVhbGx5IHdlIHdvdWxkXG4gICAgICAgICAgICAgICAgICAgIC8vIGltcGxlbWVudCB4IGFuZCBzIGJ5IHRyYW5zZm9ybWluZyB0aGUgcmVnZXhwLCBidXQgbm90IHRvZGF5Li5cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiT25seSB0aGUgaSwgbSwgYW5kIGcgcmVnZXhwIG9wdGlvbnMgYXJlIHN1cHBvcnRlZFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJldmlldyBmbGFncyAtPiBnICYgbVxuICAgICAgICAgICAgdmFyIHJlZ2V4cCA9IG9wZXJhdG9yVmFsdWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzUmVnRXhwKHJlZ2V4cCkgJiYgXy5pc05pbChfb3B0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZWdleHAudGVzdChkb2NWYWwpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzTmlsKF9vcHQpKSB7XG4gICAgICAgICAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChyZWdleHApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWdleHAgPSBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIF9vcHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gcmVnZXhwLnRlc3QoZG9jVmFsKTtcbiAgICAgICAgY2FzZSAnJHRleHQnOlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICR0ZXh0Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIiR0ZXh0IHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgIGNhc2UgJyR3aGVyZSc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHdoZXJlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIiR3aGVyZSB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICAvLyBHZW9zcGF0aWFsIFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICAvLyBUT0RPIC0+IGluIG9wZXJhdG9yIGtpbmRcbiAgICAgICAgLy8gUXVlcnkgT3BlcmF0b3IgQXJyYXlcbiAgICAgICAgY2FzZSAnJGFsbCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGFsbCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmFsbChvcGVyYXRvclZhbHVlLCBkb2NWYWwpID4gMDtcbiAgICAgICAgY2FzZSAnJGVsZW1NYXRjaCc6XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGVsZW1NYXRjaCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkZWxlbU1hdGNoIHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgIGNhc2UgJyRzaXplJzpcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkc2l6ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gXy5pc0FycmF5KGRvY1ZhbCkgJiYgZG9jVmFsLmxlbmd0aCA9PT0gb3BlcmF0b3JWYWx1ZTtcbiAgICAgICAgLy8gQml0d2lzZSBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgLy8gVE9ET1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICcgKyBrZXkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVucmVjb2duaXplZCBrZXkgaW4gc2VsZWN0b3I6IFwiICsga2V5KTtcbiAgICB9XG59O1xuXG52YXIgQnNvblR5cGVzID0ge1xuXHRfdHlwZXM6IFtcblx0XHR7IGFsaWFzOiAnbWluS2V5JywgbnVtYmVyOiAtMSwgb3JkZXI6IDEsIGlzVHlwZTogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdudWxsJywgbnVtYmVyOiAxMCwgb3JkZXI6IDIsIGlzVHlwZTogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdpbnQnLCBudW1iZXI6IDE2LCBvcmRlcjogMywgaXNUeXBlOiBfLmlzSW50ZWdlciB9LFxuXHRcdHsgYWxpYXM6ICdsb25nJywgbnVtYmVyOiAxOCwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc051bWJlciB9LFxuXHRcdHsgYWxpYXM6ICdkb3VibGUnLCBudW1iZXI6IDEsIG9yZGVyOiAzLCBpc1R5cGU6IF8uaXNOdW1iZXIgfSxcblx0XHR7IGFsaWFzOiAnbnVtYmVyJywgbnVtYmVyOiBudWxsLCBvcmRlcjogMywgaXNUeXBlOiBfLmlzTnVtYmVyIH0sXG5cdFx0eyBhbGlhczogJ3N0cmluZycsIG51bWJlcjogMiwgb3JkZXI6IDQsIGlzVHlwZTogXy5pc1N0cmluZyB9LFxuXHRcdHsgYWxpYXM6ICdzeW1ib2wnLCBudW1iZXI6IDE0LCBvcmRlcjogNCwgaXNUeXBlOiBfLmlzU3ltYm9sIH0sXG5cdFx0eyBhbGlhczogJ29iamVjdCcsIG51bWJlcjogMywgb3JkZXI6IDUsIGlzVHlwZTogXy5pc1BsYWluT2JqZWN0IH0sXG5cdFx0eyBhbGlhczogJ2FycmF5JywgbnVtYmVyOiA0LCBvcmRlcjogNiwgaXNUeXBlOiBfLmlzQXJyYXkgfSxcblx0XHR7IGFsaWFzOiAnYmluRGF0YScsIG51bWJlcjogNSwgb3JkZXI6IDcsIGlzVHlwZTogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdvYmplY3RJZCcsIG51bWJlcjogNywgb3JkZXI6IDgsIGlzVHlwZWZuYzogbnVsbCB9LFxuXHRcdHsgYWxpYXM6ICdib29sJywgbnVtYmVyOiA4LCBvcmRlcjogOSwgaXNUeXBlOiBfLmlzQm9vbGVhbiB9LFxuXHRcdHsgYWxpYXM6ICdkYXRlJywgbnVtYmVyOiA5LCBvcmRlcjogMTAsIGlzVHlwZWZuYzogXy5pc0RhdGUgfSwgICAgICAgICAvLyBmb3JtYXRcblx0XHR7IGFsaWFzOiAndGltZXN0YW1wJywgbnVtYmVyOiAxNywgb3JkZXI6IDExLCBpc1R5cGU6IF8uaXNEYXRlIH0sICAgLy8gZm9ybWF0XG5cdFx0eyBhbGlhczogJ3JlZ2V4JywgbnVtYmVyOiAxMSwgb3JkZXI6IDEyLCBpc1R5cGU6IF8uaXNSZWdFeHAgfSxcblx0XHR7IGFsaWFzOiAnbWF4S2V5JywgbnVtYmVyOiAxMjcsIG9yZGVyOiAxMywgaXNUeXBlOiBudWxsIH1cblx0XHRcbi8vIFx0XHR1bmRlZmluZWQgNlxuLy8gXHRcdGRiUG9pbnRlclxuLy8gXHRcdGphdmFzY3JpcHRcbi8vIFx0XHRqYXZhc2NyaXB0V2l0aFNjb3BlXG4vLyBcdFx0ZnVuY3Rpb25cblx0XSxcblx0XG5cdGdldEJ5QWxpYXM6IGZ1bmN0aW9uKGFsaWFzKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl90eXBlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKHRoaXMuX3R5cGVzW2ldLmFsaWFzID09PSBhbGlhcykgcmV0dXJuIHRoaXMuX3R5cGVzW2ldO1xuXHRcdH1cblx0fSxcblx0Z2V0QnlWYWx1ZTogZnVuY3Rpb24odmFsKSB7XG5cdCAgICBpZiAoXy5pc051bWJlcih2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwiZG91YmxlXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcInN0cmluZ1wiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQm9vbGVhbih2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwiYm9vbFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcImFycmF5XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOdWxsKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJudWxsXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNSZWdFeHAodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcInJlZ2V4XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNQbGFpbk9iamVjdCh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwib2JqZWN0XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTeW1ib2wodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcInN5bWJvbFwiKTtcbiAgICAgICAgXG4gICAgICAgIHRocm93IEVycm9yKFwiVW5hY2NlcHRlZCBCU09OIHR5cGVcIik7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JNYXRjaGVyOyJdfQ==
