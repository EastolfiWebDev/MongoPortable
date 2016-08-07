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
//# sourceMappingURL=data:application/json;base64,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Q0FBUyxHQUFULENBQUosRUFBbUIsT0FBTyxLQUFLLFVBQUwsQ0FBZ0IsTUFBaEIsQ0FBUDs7QUFFbkIsZ0JBQUksRUFBRSxRQUFGLENBQVcsR0FBWCxDQUFKLEVBQXFCLE9BQU8sS0FBSyxVQUFMLENBQWdCLE9BQWhCLENBQVA7O0FBRXJCLGdCQUFJLEVBQUUsYUFBRixDQUFnQixHQUFoQixDQUFKLEVBQTBCLE9BQU8sS0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQVA7O0FBRTFCLGdCQUFJLEVBQUUsUUFBRixDQUFXLEdBQVgsQ0FBSixFQUFxQixPQUFPLEtBQUssVUFBTCxDQUFnQixRQUFoQixDQUFQOztBQUVyQixrQkFBTSxNQUFNLHNCQUFOLENBQU47QUFDTjtBQWxEYyxLQUFoQjs7QUFxREEsV0FBTyxlQUFQO0FBQ0gsQ0Foc0JEIiwiZmlsZSI6IlNlbGVjdG9yTWF0Y2hlci5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBsb2dnZXIgPSBudWxsO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKExvZ2dlciwgXykge1xuXG4gICAgY2xhc3MgU2VsZWN0b3JNYXRjaGVyIHtcbiAgICBcdGNvbnN0cnVjdG9yKHNlbGVjdG9yKSB7XG4gICAgICAgICAgICB0aGlzLmNsYXVzZXMgPSBzZWxlY3Rvci5jbGF1c2VzO1xuICAgIFxuICAgICAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgIFx0fVxuICAgIFx0XG4gICAgXHR0ZXN0KGRvY3VtZW50KSB7XG4gICAgXHRcdGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIFNlbGVjdG9yTWF0Y2hlci0+dGVzdCcpO1xuICAgIFx0XHRcbiAgICBcdFx0dmFyIF9tYXRjaCA9IGZhbHNlO1xuICAgIFxuICAgIFx0XHRpZiAoXy5pc05pbChkb2N1bWVudCkpIHtcbiAgICBcdFx0XHRsb2dnZXIuZGVidWcoJ2RvY3VtZW50IC0+IG51bGwnKTtcbiAgICBcdFx0XHRcbiAgICBcdFx0XHRsb2dnZXIudGhyb3coXCJQYXJhbWV0ZXIgJ2RvY3VtZW50JyByZXF1aXJlZFwiKTtcbiAgICBcdFx0fVxuICAgIFx0XHRcbiAgICBcdFx0bG9nZ2VyLmRlYnVnKCdkb2N1bWVudCAtPiBub3QgbnVsbCcpO1xuICAgIFx0XHRcbiAgICBcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsYXVzZXMubGVuZ3RoOyBpKyspIHtcbiAgICBcdFx0XHR2YXIgY2xhdXNlID0gdGhpcy5jbGF1c2VzW2ldO1xuICAgIFx0XHRcdFxuICAgIFx0XHRcdGlmIChjbGF1c2Uua2luZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIFx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgLT4gZnVuY3Rpb24nKTtcbiAgICBcdFx0XHRcdFxuICAgIFx0XHRcdFx0X21hdGNoID0gY2xhdXNlLnZhbHVlLmNhbGwobnVsbCwgZG9jdW1lbnQpO1xuICAgIFx0XHRcdH0gZWxzZSBpZiAoY2xhdXNlLmtpbmQgPT09ICdwbGFpbicpIHtcbiAgICBcdFx0XHRcdGxvZ2dlci5kZWJ1ZyhgY2xhdXNlIC0+IHBsYWluIG9uIGZpZWxkIFwiJHtjbGF1c2Uua2V5fVwiIGFuZCB2YWx1ZSA9ICR7SlNPTi5zdHJpbmdpZnkoY2xhdXNlLnZhbHVlKX1gKTtcbiAgICBcdFx0XHRcdFxuICAgIFx0XHRcdFx0X21hdGNoID0gX3Rlc3RDbGF1c2UoY2xhdXNlLCBkb2N1bWVudFtjbGF1c2Uua2V5XSk7XG4gICAgXHRcdFx0XHRcbiAgICBcdFx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlIHJlc3VsdCAtPiAnICsgX21hdGNoKTtcbiAgICBcdFx0XHR9IGVsc2UgaWYgKGNsYXVzZS5raW5kID09PSAnb2JqZWN0Jykge1xuICAgIFx0XHRcdFx0bG9nZ2VyLmRlYnVnKGBjbGF1c2UgLT4gb2JqZWN0IG9uIGZpZWxkIFwiJHtjbGF1c2Uua2V5LmpvaW4oJy4nKX1cIiBhbmQgdmFsdWUgPSAke0pTT04uc3RyaW5naWZ5KGNsYXVzZS52YWx1ZSl9YCk7XG4gICAgXHRcdFx0XHRcbiAgICBcdFx0XHRcdF9tYXRjaCA9IF90ZXN0T2JqZWN0Q2xhdXNlKGNsYXVzZSwgZG9jdW1lbnQsIF8uY2xvbmUoY2xhdXNlLmtleSkucmV2ZXJzZSgpKTtcbiAgICBcdFx0XHRcdFxuICAgIFx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2UgcmVzdWx0IC0+ICcgKyBfbWF0Y2gpO1xuICAgIFx0XHRcdH0gZWxzZSBpZiAoY2xhdXNlLmtpbmQgPT09ICdvcGVyYXRvcicpIHtcbiAgICBcdFx0XHQgICAgbG9nZ2VyLmRlYnVnKGBjbGF1c2UgLT4gb3BlcmF0b3IgJyR7Y2xhdXNlLmtleX0nYCk7XG4gICAgXHRcdFx0ICAgIFxuICAgIFx0XHRcdCAgICBfbWF0Y2ggPSBfdGVzdExvZ2ljYWxDbGF1c2UoY2xhdXNlLCBkb2N1bWVudCwgY2xhdXNlLmtleSk7XG4gICAgXHRcdCAgICAgICAgXG4gICAgXHRcdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZSByZXN1bHQgLT4gJyArIF9tYXRjaCk7XG4gICAgXHRcdFx0fVxuICAgIFx0XHRcdFxuICAgIFx0XHRcdC8vIElmIGFueSB0ZXN0IGNhc2UgZmFpbHMsIHRoZSBkb2N1bWVudCB3aWxsIG5vdCBtYXRjaFxuICAgIFx0XHRcdGlmIChfbWF0Y2ggPT09IGZhbHNlIHx8IF9tYXRjaCA9PT0gJ2ZhbHNlJykge1xuICAgIFx0XHRcdFx0bG9nZ2VyLmRlYnVnKCd0aGUgZG9jdW1lbnQgZG8gbm90IG1hdGNoZXMnKTtcbiAgICBcdFx0XHRcdFxuICAgIFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuICAgIFx0XHRcdH1cbiAgICBcdFx0fVxuICAgIFx0XHRcbiAgICBcdFx0Ly8gRXZlcnl0aGluZyBtYXRjaGVzXG4gICAgXHRcdGxvZ2dlci5kZWJ1ZygndGhlIGRvY3VtZW50IG1hdGNoZXMnKTtcbiAgICBcdFx0XG4gICAgXHRcdHJldHVybiB0cnVlO1xuICAgIFx0fVxuICAgIFx0XG4gICAgXHRzdGF0aWMgYWxsKGFycmF5LCB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gJGFsbCBpcyBvbmx5IG1lYW5pbmdmdWwgb24gYXJyYXlzXG4gICAgICAgICAgICBpZiAoIShhcnJheSBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIC8vIFRPRE8gc2hvdWxkIHVzZSBhIGNhbm9uaWNhbGl6aW5nIHJlcHJlc2VudGF0aW9uLCBzbyB0aGF0IHdlXG4gICAgICAgICAgICAvLyBkb24ndCBnZXQgc2NyZXdlZCBieSBrZXkgb3JkZXJcbiAgICAgICAgICAgIHZhciBwYXJ0cyA9IHt9O1xuICAgICAgICAgICAgdmFyIHJlbWFpbmluZyA9IDA7XG4gICAgXG4gICAgICAgICAgICBfLmZvckVhY2godmFsdWUsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgaGFzaCA9IEpTT04uc3RyaW5naWZ5KHZhbCk7XG4gICAgXG4gICAgICAgICAgICAgICAgaWYgKCEoaGFzaCBpbiBwYXJ0cykpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFydHNbaGFzaF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZW1haW5pbmcrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaGFzaCA9IEpTT04uc3RyaW5naWZ5KGFycmF5W2ldKTtcbiAgICAgICAgICAgICAgICBpZiAocGFydHNbaGFzaF0pIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHBhcnRzW2hhc2hdO1xuICAgICAgICAgICAgICAgICAgICByZW1haW5pbmctLTtcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPT09IHJlbWFpbmluZykgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgXHRcbiAgICBcdHN0YXRpYyBpbihhcnJheSwgdmFsdWUpIHtcbiAgICAgICAgICAgIGlmICghXy5pc09iamVjdChhcnJheSkpIHtcbiAgICAgICAgICAgICAgICAvLyBvcHRpbWl6YXRpb246IHVzZSBzY2FsYXIgZXF1YWxpdHkgKGZhc3QpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJyYXkgPT09IHZhbHVlW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5vcGUsIGhhdmUgdG8gdXNlIGRlZXAgZXF1YWxpdHlcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChTZWxlY3Rvck1hdGNoZXIuZXF1YWwoYXJyYXksIHZhbHVlW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgXHRcbiAgICBcdC8vIGRlZXAgZXF1YWxpdHkgdGVzdDogdXNlIGZvciBsaXRlcmFsIGRvY3VtZW50IGFuZCBhcnJheSBtYXRjaGVzXG4gICAgXHRzdGF0aWMgZXF1YWwoYXJyYXksIHF2YWwpIHtcbiAgICAgICAgICAgIHZhciBtYXRjaCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgLy8gc2NhbGFyc1xuICAgICAgICAgICAgICAgIGlmIChfLmlzTnVtYmVyKGEpIHx8IF8uaXNTdHJpbmcoYSkgfHwgXy5pc0Jvb2xlYW4oYSkgfHwgXy5pc05pbChhKSkgcmV0dXJuIGEgPT09IGI7XG4gICAgXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihhKSkgcmV0dXJuIGZhbHNlOyAgLy8gTm90IGFsbG93ZWQgeWV0XG4gICAgXG4gICAgICAgICAgICAgICAgLy8gT0ssIHR5cGVvZiBhID09PSAnb2JqZWN0J1xuICAgICAgICAgICAgICAgIGlmICghXy5pc09iamVjdChiKSkgcmV0dXJuIGZhbHNlO1xuICAgIFxuICAgICAgICAgICAgICAgIC8vIGFycmF5c1xuICAgICAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoYSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmlzQXJyYXkoYikpIHJldHVybiBmYWxzZTtcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgIFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2goYVtpXSxiW2ldKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgICAgICAvLyBvYmplY3RzXG4gICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICB2YXIgdW5tYXRjaGVkX2Jfa2V5cyA9IDA7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBiKVxuICAgICAgICAgICAgICAgICAgICB1bm1hdGNoZWRfYl9rZXlzKys7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghKHggaW4gYikgfHwgIW1hdGNoKGFbeF0sIGJbeF0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB1bm1hdGNoZWRfYl9rZXlzLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB1bm1hdGNoZWRfYl9rZXlzID09PSAwO1xuICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgLy8gRm9sbG93IE1vbmdvIGluIGNvbnNpZGVyaW5nIGtleSBvcmRlciB0byBiZSBwYXJ0IG9mXG4gICAgICAgICAgICAgICAgLy8gZXF1YWxpdHkuIEtleSBlbnVtZXJhdGlvbiBvcmRlciBpcyBhY3R1YWxseSBub3QgZGVmaW5lZCBpblxuICAgICAgICAgICAgICAgIC8vIHRoZSBlY21hc2NyaXB0IHNwZWMgYnV0IGluIHByYWN0aWNlIG1vc3QgaW1wbGVtZW50YXRpb25zXG4gICAgICAgICAgICAgICAgLy8gcHJlc2VydmUgaXQuIChUaGUgZXhjZXB0aW9uIGlzIENocm9tZSwgd2hpY2ggcHJlc2VydmVzIGl0XG4gICAgICAgICAgICAgICAgLy8gdXN1YWxseSwgYnV0IG5vdCBmb3Iga2V5cyB0aGF0IHBhcnNlIGFzIGludHMuKVxuICAgICAgICAgICAgICAgIHZhciBiX2tleXMgPSBbXTtcbiAgICBcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhcnJheSBpbiBiKSB7XG4gICAgICAgICAgICAgICAgICAgIGJfa2V5cy5wdXNoKGJbYXJyYXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGFycmF5IGluIGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPj0gYl9rZXlzLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKGFbYXJyYXldLCBiX2tleXNbaV0pKSByZXR1cm4gZmFsc2U7XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGkgIT09IGJfa2V5cy5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH07XG4gICAgXG4gICAgICAgICAgICByZXR1cm4gbWF0Y2goYXJyYXksIHF2YWwpO1xuICAgICAgICB9XG4gICAgXHRcbiAgICBcdC8vIGlmIHggaXMgbm90IGFuIGFycmF5LCB0cnVlIGlmZiBmKHgpIGlzIHRydWUuIGlmIHggaXMgYW4gYXJyYXksXG4gICAgICAgIC8vIHRydWUgaWZmIGYoeSkgaXMgdHJ1ZSBmb3IgYW55IHkgaW4geC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gdGhpcyBpcyB0aGUgd2F5IG1vc3QgbW9uZ28gb3BlcmF0b3JzIChsaWtlICRndCwgJG1vZCwgJHR5cGUuLilcbiAgICAgICAgLy8gdHJlYXQgdGhlaXIgYXJndW1lbnRzLlxuICAgICAgICBzdGF0aWMgbWF0Y2hlcyh2YWx1ZSwgZnVuYykge1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmdW5jKHZhbHVlW2ldKSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIHJldHVybiBmdW5jKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIFx0XG4gICAgXHQvLyBsaWtlIF9tYXRjaGVzLCBidXQgaWYgeCBpcyBhbiBhcnJheSwgaXQncyB0cnVlIG5vdCBvbmx5IGlmIGYoeSlcbiAgICAgICAgLy8gaXMgdHJ1ZSBmb3Igc29tZSB5IGluIHgsIGJ1dCBhbHNvIGlmIGYoeCkgaXMgdHJ1ZS5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gdGhpcyBpcyB0aGUgd2F5IG1vbmdvIHZhbHVlIGNvbXBhcmlzb25zIHVzdWFsbHkgd29yaywgbGlrZSB7eDpcbiAgICAgICAgLy8gNH0sIHt4OiBbNF19LCBvciB7eDogeyRpbjogWzEsMiwzXX19LlxuICAgICAgICBzdGF0aWMgbWF0Y2hlc19wbHVzKHZhbHVlLCBmdW5jKSB7XG4gICAgICAgICAgICAvLyBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgLy8gICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgaWYgKGZ1bmModmFsdWVbaV0pKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgXG4gICAgICAgICAgICAvLyAgICAgLy8gZmFsbCB0aHJvdWdoIVxuICAgICAgICAgICAgLy8gfVxuICAgIFxuICAgICAgICAgICAgLy8gcmV0dXJuIGZ1bmModmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5tYXRjaGVzKHZhbHVlLCBmdW5jKSB8fCBmdW5jKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIFx0XG4gICAgXHQvLyBjb21wYXJlIHR3byB2YWx1ZXMgb2YgdW5rbm93biB0eXBlIGFjY29yZGluZyB0byBCU09OIG9yZGVyaW5nXG4gICAgICAgIC8vIHNlbWFudGljcy4gKGFzIGFuIGV4dGVuc2lvbiwgY29uc2lkZXIgJ3VuZGVmaW5lZCcgdG8gYmUgbGVzcyB0aGFuXG4gICAgICAgIC8vIGFueSBvdGhlciB2YWx1ZS4pXG4gICAgICAgIC8vIHJldHVybiBuZWdhdGl2ZSBpZiBhIGlzIGxlc3MsIHBvc2l0aXZlIGlmIGIgaXMgbGVzcywgb3IgMCBpZiBlcXVhbFxuICAgICAgICBzdGF0aWMgY21wKGEsIGIpIHtcbiAgICAgICAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGEpKSByZXR1cm4gYiA9PT0gdW5kZWZpbmVkID8gMCA6IC0xO1xuICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNVbmRlZmluZWQoYikpIHJldHVybiAxO1xuICAgIFx0XHRcbiAgICAgICAgICAgIHZhciBhVHlwZSA9IEJzb25UeXBlcy5nZXRCeVZhbHVlKGEpO1xuICAgICAgICAgICAgdmFyIGJUeXBlID0gQnNvblR5cGVzLmdldEJ5VmFsdWUoYik7XG4gICAgXG4gICAgICAgICAgICBpZiAoYVR5cGUub3JkZXIgIT09IGJUeXBlLm9yZGVyKSByZXR1cm4gYVR5cGUub3JkZXIgPCBiVHlwZS5vcmRlciA/IC0xIDogMTtcbiAgICBcbiAgICAgICAgICAgIC8vIFNhbWUgc29ydCBvcmRlciwgYnV0IGRpc3RpbmN0IHZhbHVlIHR5cGVcbiAgICAgICAgICAgIGlmIChhVHlwZS5udW1iZXIgIT09IGJUeXBlLm51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIEN1cnJlbnRseSwgU3ltYm9scyBjYW4gbm90IGJlIHNvcnRlcmVkIGluIEpTLCBzbyB3ZSBhcmUgc2V0dGluZyB0aGUgU3ltYm9sIGFzIGdyZWF0ZXJcbiAgICAgICAgICAgICAgICBpZiAoXy5pc1N5bWJvbChhKSkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNTeW1ib2woYikpIHJldHVybiAtMTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUT0RPIEludGVnZXIsIERhdGUgYW5kIFRpbWVzdGFtcFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc051bWJlcihhKSkgcmV0dXJuIGEgLSBiO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc1N0cmluZyhhKSkgcmV0dXJuIGEgPCBiID8gLTEgOiAoYSA9PT0gYiA/IDAgOiAxKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNCb29sZWFuKGEpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGEpIHJldHVybiBiID8gMCA6IDE7XG4gICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGIgPyAtMSA6IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoYSkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IGEubGVuZ3RoKSByZXR1cm4gKGkgPT09IGIubGVuZ3RoKSA/IDAgOiAtMTtcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IGIubGVuZ3RoKSByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xuICAgIFxuICAgICAgICAgICAgICAgICAgICB2YXIgcyA9IFNlbGVjdG9yTWF0Y2hlci5jbXAoYVtpXSwgYltpXSk7XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChzICE9PSAwKSByZXR1cm4gcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzTnVsbChhKSkgcmV0dXJuIDA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzUmVnRXhwKGEpKSB0aHJvdyBFcnJvcihcIlNvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiByZWd1bGFyIGV4cHJlc3Npb25cIik7IC8vIFRPRE9cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gaWYgKF8uaXNGdW5jdGlvbihhKSkgcmV0dXJuIHt0eXBlOiAxMywgb3JkZXI6IDEwMCwgZm5jOiBfLmlzRnVuY3Rpb259O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc1BsYWluT2JqZWN0KGEpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvX2FycmF5ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXQucHVzaChvYmpba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICB9O1xuICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuY21wKHRvX2FycmF5KGEpLCB0b19hcnJheShiKSk7XG4gICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAvLyBkb3VibGVcbiAgICAgICAgICAgIC8vIGlmICh0YSA9PT0gMSkgIHJldHVybiBhIC0gYjtcbiAgICBcbiAgICAgICAgICAgIC8vIHN0cmluZ1xuICAgICAgICAgICAgLy8gaWYgKHRiID09PSAyKSByZXR1cm4gYSA8IGIgPyAtMSA6IChhID09PSBiID8gMCA6IDEpO1xuICAgIFxuICAgICAgICAgICAgLy8gT2JqZWN0XG4gICAgICAgICAgICAvLyBpZiAodGEgPT09IDMpIHtcbiAgICAgICAgICAgIC8vICAgICAvLyB0aGlzIGNvdWxkIGJlIG11Y2ggbW9yZSBlZmZpY2llbnQgaW4gdGhlIGV4cGVjdGVkIGNhc2UgLi4uXG4gICAgICAgICAgICAvLyAgICAgdmFyIHRvX2FycmF5ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgLy8gICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgXG4gICAgICAgICAgICAvLyAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHJldC5wdXNoKGtleSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICByZXQucHVzaChvYmpba2V5XSk7XG4gICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIC8vICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIC8vICAgICB9O1xuICAgIFxuICAgICAgICAgICAgLy8gICAgIHJldHVybiBTZWxlY3Rvci5fZi5fY21wKHRvX2FycmF5KGEpLCB0b19hcnJheShiKSk7XG4gICAgICAgICAgICAvLyB9XG4gICAgXG4gICAgICAgICAgICAvLyBBcnJheVxuICAgICAgICAgICAgLy8gaWYgKHRhID09PSA0KSB7XG4gICAgICAgICAgICAvLyAgICAgZm9yICh2YXIgaSA9IDA7IDsgaSsrKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIGlmIChpID09PSBhLmxlbmd0aCkgcmV0dXJuIChpID09PSBiLmxlbmd0aCkgPyAwIDogLTE7XG4gICAgXG4gICAgICAgICAgICAvLyAgICAgICAgIGlmIChpID09PSBiLmxlbmd0aCkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gICAgICAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gYS5sZW5ndGggLSBiLmxlbmd0aDtcbiAgICBcbiAgICAgICAgICAgIC8vICAgICAgICAgdmFyIHMgPSBTZWxlY3Rvci5fZi5fY21wKGFbaV0sIGJbaV0pO1xuICAgIFxuICAgICAgICAgICAgLy8gICAgICAgICBpZiAocyAhPT0gMCkgcmV0dXJuIHM7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gfVxuICAgIFxuICAgICAgICAgICAgLy8gNTogYmluYXJ5IGRhdGFcbiAgICAgICAgICAgIC8vIDc6IG9iamVjdCBpZFxuICAgIFxuICAgICAgICAgICAgLy8gYm9vbGVhblxuICAgICAgICAgICAgLy8gaWYgKHRhID09PSA4KSB7XG4gICAgICAgICAgICAvLyAgICAgaWYgKGEpIHJldHVybiBiID8gMCA6IDE7XG4gICAgXG4gICAgICAgICAgICAvLyAgICAgcmV0dXJuIGIgPyAtMSA6IDA7XG4gICAgICAgICAgICAvLyB9XG4gICAgXG4gICAgICAgICAgICAvLyA5OiBkYXRlXG4gICAgXG4gICAgICAgICAgICAvLyBudWxsXG4gICAgICAgICAgICAvLyBpZiAodGEgPT09IDEwKSByZXR1cm4gMDtcbiAgICBcbiAgICAgICAgICAgIC8vIHJlZ2V4cFxuICAgICAgICAgICAgLy8gaWYgKHRhID09PSAxMSkge1xuICAgICAgICAgICAgLy8gICAgIHRocm93IEVycm9yKFwiU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIHJlZ3VsYXIgZXhwcmVzc2lvblwiKTsgLy8gVE9ET1xuICAgICAgICAgICAgLy8gfVxuICAgIFxuICAgICAgICAgICAgLy8gMTM6IGphdmFzY3JpcHQgY29kZVxuICAgICAgICAgICAgLy8gMTQ6IHN5bWJvbFxuICAgICAgICAgICAgaWYgKF8uaXNTeW1ib2woYSkpIHtcbiAgICAgICAgICAgICAgICAvLyBDdXJyZW50bHksIFN5bWJvbHMgY2FuIG5vdCBiZSBzb3J0ZXJlZCBpbiBKUywgc28gd2UgYXJlIHJldHVybmluZyBhbiBlcXVhbGl0eVxuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gMTU6IGphdmFzY3JpcHQgY29kZSB3aXRoIHNjb3BlXG4gICAgICAgICAgICAvLyAxNjogMzItYml0IGludGVnZXJcbiAgICAgICAgICAgIC8vIDE3OiB0aW1lc3RhbXBcbiAgICAgICAgICAgIC8vIDE4OiA2NC1iaXQgaW50ZWdlclxuICAgICAgICAgICAgLy8gMjU1OiBtaW5rZXlcbiAgICAgICAgICAgIC8vIDEyNzogbWF4a2V5XG4gICAgXG4gICAgICAgICAgICAvLyBqYXZhc2NyaXB0IGNvZGVcbiAgICAgICAgICAgIC8vIGlmICh0YSA9PT0gMTMpIHtcbiAgICAgICAgICAgIC8vICAgICB0aHJvdyBFcnJvcihcIlNvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiBKYXZhc2NyaXB0IGNvZGVcIik7IC8vIFRPRE9cbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICB2YXIgX3Rlc3RDbGF1c2UgPSBmdW5jdGlvbihjbGF1c2UsIHZhbCkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZCBfdGVzdENsYXVzZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gdmFyIF92YWwgPSBjbGF1c2UudmFsdWU7XG4gICAgICAgIFxuICAgICAgICAvLyBpZiBSZWdFeHAgfHwgJCAtPiBPcGVyYXRvclxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5tYXRjaGVzX3BsdXModmFsLCBmdW5jdGlvbihfdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIFRPRE8gb2JqZWN0IGlkcywgZGF0ZXMsIHRpbWVzdGFtcHM/XG4gICAgICAgICAgICBzd2l0Y2ggKGNsYXVzZS50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnbnVsbCc6XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBOdWxsIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9RdWVyeWluZythbmQrbnVsbHNcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNOaWwoX3ZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlICdyZWdleHAnOlxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgUmVnRXhwIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX3Rlc3RPcGVyYXRvckNsYXVzZShjbGF1c2UsIF92YWx1ZSk7XG4gICAgICAgICAgICAgICAgY2FzZSAnbGl0ZXJhbF9vYmplY3QnOlxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgTGl0ZXJhbCBPYmplY3QgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuZXF1YWwoX3ZhbHVlLCBjbGF1c2UudmFsdWUpO1xuICAgICAgICAgICAgICAgIGNhc2UgJ29wZXJhdG9yX29iamVjdCc6XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBPcGVyYXRvciBPYmplY3QgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGVzdE9wZXJhdG9yQ2xhdXNlKGNsYXVzZSwgX3ZhbHVlKTtcbiAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgU3RyaW5nIGVxdWFsaXR5Jyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXy50b1N0cmluZyhfdmFsdWUpID09PSBfLnRvU3RyaW5nKGNsYXVzZS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0IE51bWJlciBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF8udG9OdW1iZXIoX3ZhbHVlKSA9PT0gXy50b051bWJlcihjbGF1c2UudmFsdWUpO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgQm9vbGVhbiBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChfLmlzQm9vbGVhbihfdmFsdWUpICYmIF8uaXNCb29sZWFuKGNsYXVzZS52YWx1ZSkgJiYgKF92YWx1ZSA9PT0gY2xhdXNlLnZhbHVlKSk7XG4gICAgICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3QgQm9vbGVhbiBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgdHlwZVxuICAgICAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KF92YWx1ZSkgJiYgXy5pc0FycmF5KGNsYXVzZS52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF92YWx1ZS5sZW5ndGggPT09IGNsYXVzZS52YWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpdGVtc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX3ZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGF1c2UudmFsdWUuaW5kZXhPZihfdmFsdWVbaV0pID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdCBGdW5jdGlvbiBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgdmFsdWUgdHlwZSBpbiBxdWVyeVwiKTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCB2YWx1ZSB0eXBlIGluIHF1ZXJ5XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFxuICAgIHZhciBfdGVzdE9iamVjdENsYXVzZSA9IGZ1bmN0aW9uKGNsYXVzZSwgZG9jLCBrZXkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdDYWxsZWQgX3Rlc3RPYmplY3RDbGF1c2UnKTtcbiAgICAgICAgXG4gICAgICAgIHZhciB2YWwgPSBudWxsO1xuICAgICAgICBcbiAgICAgICAgaWYgKGtleS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgcGF0aCA9IGtleS5wb3AoKTtcbiAgICAgICAgICAgIHZhbCA9IGRvY1twYXRoXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjaGVjayBvbiBmaWVsZCAnICsgcGF0aCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRPRE8gYWRkIF8uaXNOdW1iZXIodmFsKSBhbmQgdHJlYXQgaXQgYXMgYW4gYXJyYXlcbiAgICAgICAgICAgIGlmICh2YWwpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIubG9nKHZhbCk7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdnb2luZyBkZWVwZXInKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gX3Rlc3RPYmplY3RDbGF1c2UoY2xhdXNlLCB2YWwsIGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2xvd2VzdCBwYXRoOiAnICsgcGF0aCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBfdGVzdENsYXVzZShjbGF1c2UsIGRvYyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHZhciBfdGVzdExvZ2ljYWxDbGF1c2UgPSBmdW5jdGlvbihjbGF1c2UsIGRvYywga2V5KSB7XG4gICAgICAgIHZhciBtYXRjaGVzID0gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2xhdXNlLnZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgX21hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyKHsgY2xhdXNlczogW2NsYXVzZS52YWx1ZVtpXV0gfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnYW5kJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ1ZSB1bmxlc3MgaXQgaGFzIG9uZSB0aGF0IGRvIG5vdCBtYXRjaFxuICAgICAgICAgICAgICAgICAgICBpZiAoXy5pc05pbChtYXRjaGVzKSkgbWF0Y2hlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIV9tYXRjaGVyLnRlc3QoZG9jKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdvcic6XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbHNlIHVubGVzcyBpdCBoYXMgb25lIG1hdGNoIGF0IGxlYXN0XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLmlzTmlsKG1hdGNoZXMpKSBtYXRjaGVzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoX21hdGNoZXIudGVzdChkb2MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBtYXRjaGVzIHx8IGZhbHNlO1xuICAgIH07XG4gICAgXG4gICAgdmFyIF90ZXN0T3BlcmF0b3JDbGF1c2UgPSBmdW5jdGlvbihjbGF1c2UsIHZhbHVlKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkIF90ZXN0T3BlcmF0b3JDbGF1c2UnKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBjbGF1c2UudmFsdWUpIHtcbiAgICAgICAgICAgIGlmICghX3Rlc3RPcGVyYXRvckNvbnN0cmFpbnQoa2V5LCBjbGF1c2UudmFsdWVba2V5XSwgY2xhdXNlLnZhbHVlLCB2YWx1ZSwgY2xhdXNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgX3Rlc3RPcGVyYXRvckNvbnN0cmFpbnQgPSBmdW5jdGlvbiAoa2V5LCBvcGVyYXRvclZhbHVlLCBjbGF1c2VWYWx1ZSwgZG9jVmFsLCBjbGF1c2UpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdDYWxsZWQgX3Rlc3RPcGVyYXRvckNvbnN0cmFpbnQnKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgICAgICAvLyBDb21wYXJpc29uIFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICAgICAgY2FzZSAnJGd0JzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGd0Jyk7XG4gICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5jbXAoZG9jVmFsLCBvcGVyYXRvclZhbHVlKSA+IDA7XG4gICAgICAgICAgICBjYXNlICckbHQnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbHQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpIDwgMDtcbiAgICAgICAgICAgIGNhc2UgJyRndGUnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkZ3RlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5jbXAoZG9jVmFsLCBvcGVyYXRvclZhbHVlKSA+PSAwO1xuICAgICAgICAgICAgY2FzZSAnJGx0ZSc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRsdGUnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmNtcChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpIDw9IDA7XG4gICAgICAgICAgICBjYXNlICckZXEnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkZXEnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gU2VsZWN0b3JNYXRjaGVyLmVxdWFsKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSk7XG4gICAgICAgICAgICBjYXNlICckbmUnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbmUnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gIVNlbGVjdG9yTWF0Y2hlci5lcXVhbChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnJGluJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGluJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlci5pbihkb2NWYWwsIG9wZXJhdG9yVmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnJG5pbic6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRuaW4nKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gIVNlbGVjdG9yTWF0Y2hlci5pbihkb2NWYWwsIG9wZXJhdG9yVmFsdWUpO1xuICAgICAgICAgICAgLy8gTG9naWNhbCBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgICAgIGNhc2UgJyRub3QnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbm90Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gJG9yLCAkYW5kLCAkbm9yIGFyZSBpbiB0aGUgJ29wZXJhdG9yJyBraW5kIHRyZWF0bWVudFxuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgdmFyIF9jbGF1c2UgPSB7XG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6ICdwbGFpbicsXG4gICAgICAgICAgICAgICAgICAgIGtleTogY2xhdXNlLmtleSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG9wZXJhdG9yVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIF9wYXJlbnQgPSBjbGF1c2UudmFsdWU7XG4gICAgICAgICAgICAgICAgdmFyIF9rZXkgPSBcbiAgICAgICAgICAgICAgICByZXR1cm4gIShfdGVzdENsYXVzZShfY2xhdXNlLCBkb2NWYWwpKTtcbiAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkbm90IHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgICAgICAvLyBFbGVtZW50IFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICAgICAgY2FzZSAnJGV4aXN0cyc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRleGlzdHMnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gb3BlcmF0b3JWYWx1ZSA/ICFfLmlzVW5kZWZpbmVkKGRvY1ZhbCkgOiBfLmlzVW5kZWZpbmVkKGRvY1ZhbCk7XG4gICAgICAgICAgICBjYXNlICckdHlwZSc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICR0eXBlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gJHR5cGU6IDEgaXMgdHJ1ZSBmb3IgYW4gYXJyYXkgaWYgYW55IGVsZW1lbnQgaW4gdGhlIGFycmF5IGlzIG9mXG4gICAgICAgICAgICAgICAgLy8gdHlwZSAxLiBidXQgYW4gYXJyYXkgZG9lc24ndCBoYXZlIHR5cGUgYXJyYXkgdW5sZXNzIGl0IGNvbnRhaW5zXG4gICAgICAgICAgICAgICAgLy8gYW4gYXJyYXkuLlxuICAgICAgICAgICAgICAgIC8vIHZhciBTZWxlY3Rvci5fZi5fdHlwZShkb2NWYWwpO1xuICAgICAgICAgICAgICAgIC8vIHJldHVybiBTZWxlY3Rvci5fZi5fdHlwZShkb2NWYWwpLnR5cGUgPT09IG9wZXJhdG9yVmFsdWU7XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkdHlwZSB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICAgICAgLy8gRXZhbHVhdGlvbiBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgICAgIGNhc2UgJyRtb2QnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbW9kJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvY1ZhbCAlIG9wZXJhdG9yVmFsdWVbMF0gPT09IG9wZXJhdG9yVmFsdWVbMV07XG4gICAgICAgICAgICBjYXNlICckb3B0aW9ucyc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRvcHRpb25zIChpZ25vcmVkKScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElnbm9yZSwgYXMgaXQgaXMgdG8gdGhlIFJlZ0V4cFxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgY2FzZSAnJHJlZ2V4JzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHJlZ2V4Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIF9vcHQgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChfLmhhc0luKGNsYXVzZVZhbHVlLCAnJG9wdGlvbnMnKSkge1xuICAgICAgICAgICAgICAgICAgICBfb3B0ID0gY2xhdXNlVmFsdWVbJyRvcHRpb25zJ107XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoL1t4c10vLnRlc3QoX29wdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vZywgaSwgbSwgeCwgc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyBtb25nbyB1c2VzIFBDUkUgYW5kIHN1cHBvcnRzIHNvbWUgYWRkaXRpb25hbCBmbGFnczogJ3gnIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gJ3MnLiBqYXZhc2NyaXB0IGRvZXNuJ3Qgc3VwcG9ydCB0aGVtLiBzbyB0aGlzIGlzIGEgZGl2ZXJnZW5jZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYmV0d2VlbiBvdXIgYmVoYXZpb3IgYW5kIG1vbmdvJ3MgYmVoYXZpb3IuIGlkZWFsbHkgd2Ugd291bGRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGltcGxlbWVudCB4IGFuZCBzIGJ5IHRyYW5zZm9ybWluZyB0aGUgcmVnZXhwLCBidXQgbm90IHRvZGF5Li5cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJPbmx5IHRoZSBpLCBtLCBhbmQgZyByZWdleHAgb3B0aW9ucyBhcmUgc3VwcG9ydGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJldmlldyBmbGFncyAtPiBnICYgbVxuICAgICAgICAgICAgICAgIHZhciByZWdleHAgPSBvcGVyYXRvclZhbHVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChfLmlzUmVnRXhwKHJlZ2V4cCkgJiYgXy5pc05pbChfb3B0KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVnZXhwLnRlc3QoZG9jVmFsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNOaWwoX29wdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChyZWdleHApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc1JlZ0V4cChyZWdleHApKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwLnNvdXJjZSwgX29wdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChyZWdleHAsIF9vcHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVnZXhwLnRlc3QoZG9jVmFsKTtcbiAgICAgICAgICAgIGNhc2UgJyR0ZXh0JzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHRleHQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiJHRleHQgdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgICAgIGNhc2UgJyR3aGVyZSc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICR3aGVyZScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCIkd2hlcmUgdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgICAgIC8vIEdlb3NwYXRpYWwgUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgICAgICAvLyBUT0RPIC0+IGluIG9wZXJhdG9yIGtpbmRcbiAgICAgICAgICAgIC8vIFF1ZXJ5IE9wZXJhdG9yIEFycmF5XG4gICAgICAgICAgICBjYXNlICckYWxsJzpcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGFsbCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvck1hdGNoZXIuYWxsKG9wZXJhdG9yVmFsdWUsIGRvY1ZhbCkgPiAwO1xuICAgICAgICAgICAgY2FzZSAnJGVsZW1NYXRjaCc6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRlbGVtTWF0Y2gnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiJGVsZW1NYXRjaCB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICAgICAgY2FzZSAnJHNpemUnOlxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkc2l6ZScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBfLmlzQXJyYXkoZG9jVmFsKSAmJiBkb2NWYWwubGVuZ3RoID09PSBvcGVyYXRvclZhbHVlO1xuICAgICAgICAgICAgLy8gQml0d2lzZSBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgICAgIC8vIFRPRE9cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICcgKyBrZXkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiVW5yZWNvZ25pemVkIGtleSBpbiBzZWxlY3RvcjogXCIgKyBrZXkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB2YXIgQnNvblR5cGVzID0ge1xuICAgIFx0X3R5cGVzOiBbXG4gICAgXHRcdHsgYWxpYXM6ICdtaW5LZXknLCBudW1iZXI6IC0xLCBvcmRlcjogMSwgaXNUeXBlOiBudWxsIH0sXG4gICAgXHRcdHsgYWxpYXM6ICdudWxsJywgbnVtYmVyOiAxMCwgb3JkZXI6IDIsIGlzVHlwZTogbnVsbCB9LFxuICAgIFx0XHR7IGFsaWFzOiAnaW50JywgbnVtYmVyOiAxNiwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc0ludGVnZXIgfSxcbiAgICBcdFx0eyBhbGlhczogJ2xvbmcnLCBudW1iZXI6IDE4LCBvcmRlcjogMywgaXNUeXBlOiBfLmlzTnVtYmVyIH0sXG4gICAgXHRcdHsgYWxpYXM6ICdkb3VibGUnLCBudW1iZXI6IDEsIG9yZGVyOiAzLCBpc1R5cGU6IF8uaXNOdW1iZXIgfSxcbiAgICBcdFx0eyBhbGlhczogJ251bWJlcicsIG51bWJlcjogbnVsbCwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc051bWJlciB9LFxuICAgIFx0XHR7IGFsaWFzOiAnc3RyaW5nJywgbnVtYmVyOiAyLCBvcmRlcjogNCwgaXNUeXBlOiBfLmlzU3RyaW5nIH0sXG4gICAgXHRcdHsgYWxpYXM6ICdzeW1ib2wnLCBudW1iZXI6IDE0LCBvcmRlcjogNCwgaXNUeXBlOiBfLmlzU3ltYm9sIH0sXG4gICAgXHRcdHsgYWxpYXM6ICdvYmplY3QnLCBudW1iZXI6IDMsIG9yZGVyOiA1LCBpc1R5cGU6IF8uaXNQbGFpbk9iamVjdCB9LFxuICAgIFx0XHR7IGFsaWFzOiAnYXJyYXknLCBudW1iZXI6IDQsIG9yZGVyOiA2LCBpc1R5cGU6IF8uaXNBcnJheSB9LFxuICAgIFx0XHR7IGFsaWFzOiAnYmluRGF0YScsIG51bWJlcjogNSwgb3JkZXI6IDcsIGlzVHlwZTogbnVsbCB9LFxuICAgIFx0XHR7IGFsaWFzOiAnb2JqZWN0SWQnLCBudW1iZXI6IDcsIG9yZGVyOiA4LCBpc1R5cGVmbmM6IG51bGwgfSxcbiAgICBcdFx0eyBhbGlhczogJ2Jvb2wnLCBudW1iZXI6IDgsIG9yZGVyOiA5LCBpc1R5cGU6IF8uaXNCb29sZWFuIH0sXG4gICAgXHRcdHsgYWxpYXM6ICdkYXRlJywgbnVtYmVyOiA5LCBvcmRlcjogMTAsIGlzVHlwZWZuYzogXy5pc0RhdGUgfSwgICAgICAgICAvLyBmb3JtYXRcbiAgICBcdFx0eyBhbGlhczogJ3RpbWVzdGFtcCcsIG51bWJlcjogMTcsIG9yZGVyOiAxMSwgaXNUeXBlOiBfLmlzRGF0ZSB9LCAgIC8vIGZvcm1hdFxuICAgIFx0XHR7IGFsaWFzOiAncmVnZXgnLCBudW1iZXI6IDExLCBvcmRlcjogMTIsIGlzVHlwZTogXy5pc1JlZ0V4cCB9LFxuICAgIFx0XHR7IGFsaWFzOiAnbWF4S2V5JywgbnVtYmVyOiAxMjcsIG9yZGVyOiAxMywgaXNUeXBlOiBudWxsIH1cbiAgICBcdFx0XG4gICAgLy8gXHRcdHVuZGVmaW5lZCA2XG4gICAgLy8gXHRcdGRiUG9pbnRlclxuICAgIC8vIFx0XHRqYXZhc2NyaXB0XG4gICAgLy8gXHRcdGphdmFzY3JpcHRXaXRoU2NvcGVcbiAgICAvLyBcdFx0ZnVuY3Rpb25cbiAgICBcdF0sXG4gICAgXHRcbiAgICBcdGdldEJ5QWxpYXM6IGZ1bmN0aW9uKGFsaWFzKSB7XG4gICAgXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fdHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICBcdFx0XHRpZiAodGhpcy5fdHlwZXNbaV0uYWxpYXMgPT09IGFsaWFzKSByZXR1cm4gdGhpcy5fdHlwZXNbaV07XG4gICAgXHRcdH1cbiAgICBcdH0sXG4gICAgXHRnZXRCeVZhbHVlOiBmdW5jdGlvbih2YWwpIHtcbiAgICBcdCAgICBpZiAoXy5pc051bWJlcih2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwiZG91YmxlXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc1N0cmluZyh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwic3RyaW5nXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc0Jvb2xlYW4odmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcImJvb2xcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcImFycmF5XCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc051bGwodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcIm51bGxcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzUmVnRXhwKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJyZWdleFwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNQbGFpbk9iamVjdCh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwib2JqZWN0XCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc1N5bWJvbCh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwic3ltYm9sXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVuYWNjZXB0ZWQgQlNPTiB0eXBlXCIpO1xuICAgIFx0fVxuICAgIH07XG4gICAgXG4gICAgcmV0dXJuIFNlbGVjdG9yTWF0Y2hlcjtcbn07Il19
