"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var jsw_logger_1 = require("jsw-logger");
var SelectorMatcher = /** @class */ (function () {
    function SelectorMatcher(selector) {
        this.clauses = selector.clauses;
        this.logger = jsw_logger_1.JSWLogger.instance;
    }
    SelectorMatcher.prototype.test = function (document) {
        this.logger.debug("Called SelectorMatcher->test");
        var _match = false;
        if (_.isNil(document)) {
            this.logger.debug("document -> null");
            this.logger.throw("Parameter \"document\" required");
        }
        this.logger.debug("document -> not null");
        for (var i = 0; i < this.clauses.length; i++) {
            var clause = this.clauses[i];
            if (clause.kind === "function") {
                this.logger.debug("clause -> function");
                _match = clause.value.call(null, document);
            }
            else if (clause.kind === "plain") {
                this.logger.debug("clause -> plain on field \"" + clause.key + "\" and value = " + JSON.stringify(clause.value));
                _match = _testClause(clause, document[clause.key]);
                this.logger.debug("clause result -> " + _match);
            }
            else if (clause.kind === "object") {
                this.logger.debug("clause -> object on field \"" + clause.key.join(".") + "\" and value = " + JSON.stringify(clause.value));
                _match = _testObjectClause(clause, document, _.clone(clause.key).reverse());
                this.logger.debug("clause result -> " + _match);
            }
            else if (clause.kind === "operator") {
                this.logger.debug("clause -> operator \"" + clause.key + "\"");
                _match = _testLogicalClause(clause, document, clause.key);
                this.logger.debug("clause result -> " + _match);
            }
            // If any test case fails, the document will not match
            if (_match === false /* || <string>_match === "false"*/) {
                this.logger.debug("the document do not matches");
                return false;
            }
        }
        // Everything matches
        this.logger.debug("the document matches");
        return true;
    };
    SelectorMatcher.all = function (array, value) {
        // $all is only meaningful on arrays
        if (!(array instanceof Array)) {
            return false;
        }
        // TODO should use a canonicalizing representation, so that we
        // don"t get screwed by key order
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
                if (0 === remaining)
                    return true;
            }
        }
        return false;
    };
    SelectorMatcher.in = function (array, value) {
        if (!_.isObject(array)) {
            // optimization: use scalar equality (fast)
            for (var i = 0; i < value.length; i++) {
                if (array === value[i]) {
                    return true;
                }
            }
            return false;
        }
        else {
            // nope, have to use deep equality
            for (var i = 0; i < value.length; i++) {
                if (SelectorMatcher.equal(array, value[i])) {
                    return true;
                }
            }
            return false;
        }
    };
    // deep equality test: use for literal document and array matches
    SelectorMatcher.equal = function (array, qval) {
        var match = function (a, b) {
            // scalars
            if (_.isNumber(a) || _.isString(a) || _.isBoolean(a) || _.isNil(a))
                return a === b;
            if (_.isFunction(a))
                return false; // Not allowed yet
            // OK, typeof a === "object"
            if (!_.isObject(b))
                return false;
            // arrays
            if (_.isArray(a)) {
                if (!_.isArray(b))
                    return false;
                if (a.length !== b.length)
                    return false;
                for (var i_1 = 0; i_1 < a.length; i_1++) {
                    if (!match(a[i_1], b[i_1]))
                        return false;
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
            for (var array_1 in a) {
                if (i >= b_keys.length)
                    return false;
                if (!match(a[array_1], b_keys[i]))
                    return false;
                i++;
            }
            if (i !== b_keys.length)
                return false;
            return true;
        };
        return match(array, qval);
    };
    // if x is not an array, true iff f(x) is true. if x is an array,
    // true iff f(y) is true for any y in x.
    //
    // this is the way most mongo operators (like $gt, $mod, $type..)
    // treat their arguments.
    SelectorMatcher.matches = function (value, func) {
        if (_.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                if (func(value[i]))
                    return true;
            }
            return false;
        }
        return func(value);
    };
    // like _matches, but if x is an array, it"s true not only if f(y)
    // is true for some y in x, but also if f(x) is true.
    //
    // this is the way mongo value comparisons usually work, like {x:
    // 4}, {x: [4]}, or {x: {$in: [1,2,3]}}.
    SelectorMatcher.matches_plus = function (value, func) {
        // if (_.isArray(value)) {
        //     for (var i = 0; i < value.length; i++) {
        //         if (func(value[i])) return true;
        //     }
        //     // fall through!
        // }
        // return func(value);
        return SelectorMatcher.matches(value, func) || func(value);
    };
    // compare two values of unknown type according to BSON ordering
    // semantics. (as an extension, consider "undefined" to be less than
    // any other value.)
    // return negative if a is less, positive if b is less, or 0 if equal
    SelectorMatcher.cmp = function (a, b) {
        if (_.isUndefined(a))
            return b === undefined ? 0 : -1;
        if (_.isUndefined(b))
            return 1;
        var aType = BsonTypes.getByValue(a);
        var bType = BsonTypes.getByValue(b);
        if (aType.order !== bType.order)
            return aType.order < bType.order ? -1 : 1;
        // Same sort order, but distinct value type
        if (aType.number !== bType.number) {
            // Currently, Symbols can not be sortered in JS, so we are setting the Symbol as greater
            if (_.isSymbol(a))
                return 1;
            if (_.isSymbol(b))
                return -1;
            // TODO Integer, Date and Timestamp
        }
        if (_.isNumber(a))
            return a - b;
        if (_.isString(a))
            return a < b ? -1 : (a === b ? 0 : 1);
        if (_.isBoolean(a)) {
            if (a)
                return b ? 0 : 1;
            return b ? -1 : 0;
        }
        if (_.isArray(a)) {
            for (var i = 0;; i++) {
                if (i === a.length)
                    return (i === b.length) ? 0 : -1;
                if (i === b.length)
                    return 1;
                if (a.length !== b.length)
                    return a.length - b.length;
                var s = SelectorMatcher.cmp(a[i], b[i]);
                if (s !== 0)
                    return s;
            }
        }
        if (_.isNull(a))
            return 0;
        if (_.isRegExp(a))
            throw Error("Sorting not supported on regular expression"); // TODO
        // if (_.isFunction(a)) return {type: 13, order: 100, fnc: _.isFunction};
        if (_.isPlainObject(a)) {
            var to_array = function (obj) {
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
    };
    return SelectorMatcher;
}());
exports.SelectorMatcher = SelectorMatcher;
var _testClause = function (clause, val) {
    jsw_logger_1.JSWLogger.instance.debug("Called _testClause");
    // var _val = clause.value;
    // if RegExp || $ -> Operator
    return SelectorMatcher.matches_plus(val, function (_value) {
        // TODO object ids, dates, timestamps?
        switch (clause.type) {
            case "null":
                jsw_logger_1.JSWLogger.instance.debug("test Null equality");
                // http://www.mongodb.org/display/DOCS/Querying+and+nulls
                if (_.isNil(_value)) {
                    return true;
                }
                else {
                    return false;
                }
            case "regexp":
                jsw_logger_1.JSWLogger.instance.debug("test RegExp equality");
                return _testOperatorClause(clause, _value);
            case "literal_object":
                jsw_logger_1.JSWLogger.instance.debug("test Literal Object equality");
                return SelectorMatcher.equal(_value, clause.value);
            case "operator_object":
                jsw_logger_1.JSWLogger.instance.debug("test Operator Object equality");
                return _testOperatorClause(clause, _value);
            case "string":
                jsw_logger_1.JSWLogger.instance.debug("test String equality");
                return _.toString(_value) === _.toString(clause.value);
            case "number":
                jsw_logger_1.JSWLogger.instance.debug("test Number equality");
                return _.toNumber(_value) === _.toNumber(clause.value);
            case "boolean":
                jsw_logger_1.JSWLogger.instance.debug("test Boolean equality");
                return (_.isBoolean(_value) && _.isBoolean(clause.value) && (_value === clause.value));
            case "array":
                jsw_logger_1.JSWLogger.instance.debug("test Boolean equality");
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
                    }
                    else {
                        return false;
                    }
                }
                else {
                    return false;
                }
            case "function":
                jsw_logger_1.JSWLogger.instance.debug("test Function equality");
                jsw_logger_1.JSWLogger.instance.throw("Bad value type in query");
            default:
                jsw_logger_1.JSWLogger.instance.throw("Bad value type in query");
        }
    });
};
var _testObjectClause = function (clause, doc, key) {
    jsw_logger_1.JSWLogger.instance.debug("Called _testObjectClause");
    var val = null;
    if (key.length > 0) {
        var path = key.pop();
        val = doc[path];
        jsw_logger_1.JSWLogger.instance.debug("check on field " + path);
        // TODO add _.isNumber(val) and treat it as an array
        if (val) {
            jsw_logger_1.JSWLogger.instance.log(val);
            jsw_logger_1.JSWLogger.instance.debug("going deeper");
            return _testObjectClause(clause, val, key);
        }
    }
    else {
        jsw_logger_1.JSWLogger.instance.debug("lowest path: " + path);
        return _testClause(clause, doc);
    }
};
var _testLogicalClause = function (clause, doc, key) {
    var matches = null;
    for (var i = 0; i < clause.value.length; i++) {
        var _matcher = new SelectorMatcher({ clauses: [clause.value[i]] });
        switch (key) {
            case "and":
                // True unless it has one that do not match
                if (_.isNil(matches))
                    matches = true;
                if (!_matcher.test(doc)) {
                    return false;
                }
                break;
            case "or":
                // False unless it has one match at least
                if (_.isNil(matches))
                    matches = false;
                if (_matcher.test(doc)) {
                    return true;
                }
                break;
        }
    }
    return matches || false;
};
var _testOperatorClause = function (clause, value) {
    jsw_logger_1.JSWLogger.instance.debug("Called _testOperatorClause");
    for (var key in clause.value) {
        if (!_testOperatorConstraint(key, clause.value[key], clause.value, value, clause)) {
            return false;
        }
    }
    return true;
};
var _testOperatorConstraint = function (key, operatorValue, clauseValue, docVal, clause) {
    jsw_logger_1.JSWLogger.instance.debug("Called _testOperatorConstraint");
    switch (key) {
        // Comparison Query Operators
        case "$gt":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $gt");
            return SelectorMatcher.cmp(docVal, operatorValue) > 0;
        case "$lt":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $lt");
            return SelectorMatcher.cmp(docVal, operatorValue) < 0;
        case "$gte":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $gte");
            return SelectorMatcher.cmp(docVal, operatorValue) >= 0;
        case "$lte":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $lte");
            return SelectorMatcher.cmp(docVal, operatorValue) <= 0;
        case "$eq":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $eq");
            return SelectorMatcher.equal(docVal, operatorValue);
        case "$ne":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $ne");
            return !SelectorMatcher.equal(docVal, operatorValue);
        case "$in":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $in");
            return SelectorMatcher.in(docVal, operatorValue);
        case "$nin":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $nin");
            return !SelectorMatcher.in(docVal, operatorValue);
        // Logical Query Operators
        case "$not":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $not");
            // $or, $and, $nor are in the "operator" kind treatment
            /*
            var _clause = {
                kind: "plain",
                key: clause.key,
                value: operatorValue,
                type:
            };
            var _parent = clause.value;
            var _key =
            return !(_testClause(_clause, docVal));
            */
            // TODO implement
            jsw_logger_1.JSWLogger.instance.throw("$not unimplemented");
        // Element Query Operators
        case "$exists":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $exists");
            return operatorValue ? !_.isUndefined(docVal) : _.isUndefined(docVal);
        case "$type":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $type");
            // $type: 1 is true for an array if any element in the array is of
            // type 1. but an array doesn"t have type array unless it contains
            // an array..
            // var Selector._f._type(docVal);
            // return Selector._f._type(docVal).type === operatorValue;
            jsw_logger_1.JSWLogger.instance.throw("$type unimplemented");
        // Evaluation Query Operators
        case "$mod":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $mod");
            return docVal % operatorValue[0] === operatorValue[1];
        case "$options":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $options (ignored)");
            // Ignore, as it is to the RegExp
            return true;
        case "$regex":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $regex");
            var _opt = null;
            if (_.hasIn(clauseValue, "$options")) {
                _opt = clauseValue["$options"];
                if (/[xs]/.test(_opt)) {
                    //g, i, m, x, s
                    // TODO mongo uses PCRE and supports some additional flags: "x" and
                    // "s". javascript doesn"t support them. so this is a divergence
                    // between our behavior and mongo"s behavior. ideally we would
                    // implement x and s by transforming the regexp, but not today..
                    jsw_logger_1.JSWLogger.instance.throw("Only the i, m, and g regexp options are supported");
                }
            }
            // Review flags -> g & m
            var regexp = operatorValue;
            if (_.isRegExp(regexp) && _.isNil(_opt)) {
                return regexp.test(docVal);
            }
            else if (_.isNil(_opt)) {
                regexp = new RegExp(regexp);
            }
            else if (_.isRegExp(regexp)) {
                regexp = new RegExp(regexp.source, _opt);
            }
            else {
                regexp = new RegExp(regexp, _opt);
            }
            return regexp.test(docVal);
        case "$text":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $text");
            // TODO implement
            throw Error("$text unimplemented");
        case "$where":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $where");
            // TODO implement
            throw Error("$where unimplemented");
        // Geospatial Query Operators
        // TODO -> in operator kind
        // Query Operator Array
        case "$all":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $all");
            // return SelectorMatcher.all(operatorValue, docVal) > 0;
            return SelectorMatcher.all(operatorValue, docVal);
        case "$elemMatch":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $elemMatch");
            // TODO implement
            throw Error("$elemMatch unimplemented");
        case "$size":
            jsw_logger_1.JSWLogger.instance.debug("testing operator $size");
            return _.isArray(docVal) && docVal.length === operatorValue;
        // Bitwise Query Operators
        // TODO
        default:
            jsw_logger_1.JSWLogger.instance.debug("testing operator " + key);
            jsw_logger_1.JSWLogger.instance.throw("Unrecognized key in selector: " + key);
    }
};
var BsonTypes = {
    _types: [
        { alias: "minKey", number: -1, order: 1, isType: null },
        { alias: "null", number: 10, order: 2, isType: null },
        { alias: "int", number: 16, order: 3, isType: _.isInteger },
        { alias: "long", number: 18, order: 3, isType: _.isNumber },
        { alias: "double", number: 1, order: 3, isType: _.isNumber },
        { alias: "number", number: null, order: 3, isType: _.isNumber },
        { alias: "string", number: 2, order: 4, isType: _.isString },
        { alias: "symbol", number: 14, order: 4, isType: _.isSymbol },
        { alias: "object", number: 3, order: 5, isType: _.isPlainObject },
        { alias: "array", number: 4, order: 6, isType: _.isArray },
        { alias: "binData", number: 5, order: 7, isType: null },
        { alias: "objectId", number: 7, order: 8, isTypefnc: null },
        { alias: "bool", number: 8, order: 9, isType: _.isBoolean },
        { alias: "date", number: 9, order: 10, isTypefnc: _.isDate },
        { alias: "timestamp", number: 17, order: 11, isType: _.isDate },
        { alias: "regex", number: 11, order: 12, isType: _.isRegExp },
        { alias: "maxKey", number: 127, order: 13, isType: null }
        // 		undefined 6
        // 		dbPointer
        // 		javascript
        // 		javascriptWithScope
        // 		function
    ],
    getByAlias: function (alias) {
        for (var i = 0; i < this._types.length; i++) {
            if (this._types[i].alias === alias)
                return this._types[i];
        }
    },
    getByValue: function (val) {
        if (_.isNumber(val))
            return this.getByAlias("double");
        if (_.isString(val))
            return this.getByAlias("string");
        if (_.isBoolean(val))
            return this.getByAlias("bool");
        if (_.isArray(val))
            return this.getByAlias("array");
        if (_.isNull(val))
            return this.getByAlias("null");
        if (_.isRegExp(val))
            return this.getByAlias("regex");
        if (_.isPlainObject(val))
            return this.getByAlias("object");
        if (_.isSymbol(val))
            return this.getByAlias("symbol");
        jsw_logger_1.JSWLogger.instance.throw("Unaccepted BSON type");
    }
};
//# sourceMappingURL=SelectorMatcher.js.map