"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsw_logger_1 = require("jsw-logger");
var _ = require("lodash");
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
        try {
            for (var _a = __values(this.clauses), _b = _a.next(); !_b.done; _b = _a.next()) {
                var clause = _b.value;
                if (clause.kind === "function") {
                    this.logger.debug("clause -> function");
                    _match = clause.value.call(null, document);
                }
                else if (clause.kind === "plain") {
                    this.logger.debug("clause -> plain on field \"" + clause.key + "\" and value = " + JSON.stringify(clause.value));
                    _match = testClause(clause, document[clause.key]);
                    this.logger.debug("clause result -> " + _match);
                }
                else if (clause.kind === "object") {
                    this.logger.debug("clause -> object on field \"" + clause.key.join(".") + "\" and value = " + JSON.stringify(clause.value));
                    _match = testObjectClause(clause, document, _.clone(clause.key).reverse());
                    this.logger.debug("clause result -> " + _match);
                }
                else if (clause.kind === "operator") {
                    this.logger.debug("clause -> operator \"" + clause.key + "\"");
                    _match = testLogicalClause(clause, document, clause.key);
                    this.logger.debug("clause result -> " + _match);
                }
                // If any test case fails, the document will not match
                if (_match === false /* || <string>_match === "false"*/) {
                    this.logger.debug("the document do not matches");
                    return false;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // Everything matches
        this.logger.debug("the document matches");
        return true;
        var e_1, _c;
    };
    SelectorMatcher.all = function (arr, value) {
        // $all is only meaningful on arrays
        if (!(arr instanceof Array)) {
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
        try {
            for (var arr_1 = __values(arr), arr_1_1 = arr_1.next(); !arr_1_1.done; arr_1_1 = arr_1.next()) {
                var item = arr_1_1.value;
                var hash = JSON.stringify(item);
                if (parts[hash]) {
                    delete parts[hash];
                    remaining--;
                    if (0 === remaining) {
                        return true;
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (arr_1_1 && !arr_1_1.done && (_a = arr_1.return)) _a.call(arr_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return false;
        var e_2, _a;
    };
    SelectorMatcher.in = function (arr, value) {
        if (!_.isObject(arr)) {
            try {
                // optimization: use scalar equality (fast)
                for (var value_1 = __values(value), value_1_1 = value_1.next(); !value_1_1.done; value_1_1 = value_1.next()) {
                    var item = value_1_1.value;
                    if (arr === item) {
                        return true;
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (value_1_1 && !value_1_1.done && (_a = value_1.return)) _a.call(value_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return false;
        }
        else {
            try {
                // nope, have to use deep equality
                for (var value_2 = __values(value), value_2_1 = value_2.next(); !value_2_1.done; value_2_1 = value_2.next()) {
                    var item = value_2_1.value;
                    if (SelectorMatcher.equal(arr, item)) {
                        return true;
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (value_2_1 && !value_2_1.done && (_b = value_2.return)) _b.call(value_2);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return false;
        }
        var e_3, _a, e_4, _b;
    };
    // deep equality test: use for literal document and array matches
    SelectorMatcher.equal = function (arr, qval) {
        var match = function (valA, valB) {
            // scalars
            if (_.isNumber(valA) || _.isString(valA) || _.isBoolean(valA) || _.isNil(valA)) {
                return valA === valB;
            }
            if (_.isFunction(valA)) {
                return false;
            } // Not allowed yet
            // OK, typeof valA === "object"
            if (!_.isObject(valB)) {
                return false;
            }
            // arrays
            if (_.isArray(valA)) {
                if (!_.isArray(valB)) {
                    return false;
                }
                if (valA.length !== valB.length) {
                    return false;
                }
                for (var i = 0; i < valA.length; i++) {
                    if (!match(valA[i], valB[i])) {
                        return false;
                    }
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
            var bKeys = [];
            try {
                for (var _a = __values(Object.keys(valB)), _b = _a.next(); !_b.done; _b = _a.next()) {
                    var item = _b.value;
                    bKeys.push(valB[item]);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                }
                finally { if (e_5) throw e_5.error; }
            }
            var index = 0;
            try {
                for (var _d = __values(Object.keys(valA)), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var item = _e.value;
                    if (index >= bKeys.length) {
                        return false;
                    }
                    if (!match(valA[item], bKeys[index])) {
                        return false;
                    }
                    index++;
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_f = _d.return)) _f.call(_d);
                }
                finally { if (e_6) throw e_6.error; }
            }
            if (index !== bKeys.length) {
                return false;
            }
            return true;
            var e_5, _c, e_6, _f;
        };
        return match(arr, qval);
    };
    // if x is not an array, true iff f(x) is true. if x is an array,
    // true iff f(y) is true for any y in x.
    //
    // this is the way most mongo operators (like $gt, $mod, $type..)
    // treat their arguments.
    SelectorMatcher.matches = function (value, func) {
        if (_.isArray(value)) {
            try {
                for (var value_3 = __values(value), value_3_1 = value_3.next(); !value_3_1.done; value_3_1 = value_3.next()) {
                    var item = value_3_1.value;
                    if (func(item)) {
                        return true;
                    }
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (value_3_1 && !value_3_1.done && (_a = value_3.return)) _a.call(value_3);
                }
                finally { if (e_7) throw e_7.error; }
            }
            return false;
        }
        return func(value);
        var e_7, _a;
    };
    // like _matches, but if x is an array, it"s true not only if f(y)
    // is true for some y in x, but also if f(x) is true.
    //
    // this is the way mongo value comparisons usually work, like {x:
    // 4}, {x: [4]}, or {x: {$in: [1,2,3]}}.
    SelectorMatcher.matches_plus = function (value, func) {
        // if (_.isArray(value)) {
        // 	 for (var i = 0; i < value.length; i++) {
        // 		 if (func(value[i])) return true;
        // 	 }
        // 	 // fall through!
        // }
        // return func(value);
        return SelectorMatcher.matches(value, func) || func(value);
    };
    // compare two values of unknown type according to BSON ordering
    // semantics. (as an extension, consider "undefined" to be less than
    // any other value.)
    // return negative if v is less, positive if valueB is less, or 0 if equal
    SelectorMatcher.cmp = function (valueA, valueB) {
        if (_.isUndefined(valueA)) {
            return valueB === undefined ? 0 : -1;
        }
        if (_.isUndefined(valueB)) {
            return 1;
        }
        var aType = BSON_TYPES.getByValue(valueA);
        var bType = BSON_TYPES.getByValue(valueB);
        if (aType.order !== bType.order) {
            return aType.order < bType.order ? -1 : 1;
        }
        // Same sort order, but distinct value type
        if (aType.number !== bType.number) {
            // Currently, Symbols can not be sortered in JS, so we are setting the Symbol as greater
            if (_.isSymbol(valueA)) {
                return 1;
            }
            if (_.isSymbol(valueB)) {
                return -1;
            }
            // TODO Integer, Date and Timestamp
        }
        if (_.isNumber(valueA)) {
            return valueA - valueB;
        }
        if (_.isString(valueA)) {
            return valueA < valueB ? -1 : (valueA === valueA ? 0 : 1);
        }
        if (_.isBoolean(valueA)) {
            if (valueA) {
                return valueB ? 0 : 1;
            }
            return valueB ? -1 : 0;
        }
        if (_.isArray(valueA)) {
            for (var i = 0;; i++) {
                if (i === valueA.length) {
                    return (i === valueB.length) ? 0 : -1;
                }
                if (i === valueB.length) {
                    return 1;
                }
                if (valueA.length !== valueB.length) {
                    return valueA.length - valueB.length;
                }
                var result = SelectorMatcher.cmp(valueA[i], valueB[i]);
                if (result !== 0) {
                    return result;
                }
            }
        }
        if (_.isNull(valueA)) {
            return 0;
        }
        if (_.isRegExp(valueA)) {
            throw Error("Sorting not supported on regular expression");
        } // TODO
        // if (_.isFunction(valueA)) return {type: 13, order: 100, fnc: _.isFunction};
        if (_.isPlainObject(valueA)) {
            var toArray = function (obj) {
                var ret = [];
                try {
                    for (var _a = __values(Object.keys(obj)), _b = _a.next(); !_b.done; _b = _a.next()) {
                        var key = _b.value;
                        ret.push(key);
                        ret.push(obj[key]);
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
                return ret;
                var e_8, _c;
            };
            return SelectorMatcher.cmp(toArray(valueA), toArray(valueB));
        }
        // double
        // if (ta === 1)  return a - b;
        // string
        // if (tb === 2) return a < b ? -1 : (a === b ? 0 : 1);
        // Object
        // if (ta === 3) {
        // 	 // this could be much more efficient in the expected case ...
        // 	 var to_array = function (obj) {
        // 		 var ret = [];
        // 		 for (var key in obj) {
        // 			 ret.push(key);
        // 			 ret.push(obj[key]);
        // 		 }
        // 		 return ret;
        // 	 };
        // 	 return Selector._f._cmp(to_array(a), to_array(b));
        // }
        // Array
        // if (ta === 4) {
        // 	 for (var i = 0; ; i++) {
        // 		 if (i === a.length) return (i === b.length) ? 0 : -1;
        // 		 if (i === b.length) return 1;
        // 		 if (a.length !== b.length) return a.length - b.length;
        // 		 var s = Selector._f._cmp(a[i], b[i]);
        // 		 if (s !== 0) return s;
        // 	 }
        // }
        // 5: binary data
        // 7: object id
        // boolean
        // if (ta === 8) {
        // 	 if (a) return b ? 0 : 1;
        // 	 return b ? -1 : 0;
        // }
        // 9: date
        // null
        // if (ta === 10) return 0;
        // regexp
        // if (ta === 11) {
        // 	 throw Error("Sorting not supported on regular expression"); // TODO
        // }
        // 13: javascript code
        // 14: symbol
        if (_.isSymbol(valueA)) {
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
        // 	 throw Error("Sorting not supported on Javascript code"); // TODO
        // }
    };
    return SelectorMatcher;
}());
exports.SelectorMatcher = SelectorMatcher;
var testClause = function (clause, val) {
    jsw_logger_1.JSWLogger.instance.debug("Called testClause");
    // var _val = clause.value;
    // if RegExp || $ -> Operator
    return SelectorMatcher.matches_plus(val, function (value) {
        // TODO object ids, dates, timestamps?
        switch (clause.type) {
            case "null":
                jsw_logger_1.JSWLogger.instance.debug("test Null equality");
                // http://www.mongodb.org/display/DOCS/Querying+and+nulls
                if (_.isNil(value)) {
                    return true;
                }
                else {
                    return false;
                }
            case "regexp":
                jsw_logger_1.JSWLogger.instance.debug("test RegExp equality");
                return testOperatorClause(clause, value);
            case "literal_object":
                jsw_logger_1.JSWLogger.instance.debug("test Literal Object equality");
                return SelectorMatcher.equal(value, clause.value);
            case "operator_object":
                jsw_logger_1.JSWLogger.instance.debug("test Operator Object equality");
                return testOperatorClause(clause, value);
            case "string":
                jsw_logger_1.JSWLogger.instance.debug("test String equality");
                return _.toString(value) === _.toString(clause.value);
            case "number":
                jsw_logger_1.JSWLogger.instance.debug("test Number equality");
                return _.toNumber(value) === _.toNumber(clause.value);
            case "boolean":
                jsw_logger_1.JSWLogger.instance.debug("test Boolean equality");
                return (_.isBoolean(value) && _.isBoolean(clause.value) && (value === clause.value));
            case "array":
                jsw_logger_1.JSWLogger.instance.debug("test Boolean equality");
                // Check type
                if (_.isArray(value) && _.isArray(clause.value)) {
                    // Check length
                    if (value.length === clause.value.length) {
                        try {
                            // Check items
                            for (var value_4 = __values(value), value_4_1 = value_4.next(); !value_4_1.done; value_4_1 = value_4.next()) {
                                var item = value_4_1.value;
                                if (clause.value.indexOf(item) === -1) {
                                    return false;
                                }
                            }
                        }
                        catch (e_9_1) { e_9 = { error: e_9_1 }; }
                        finally {
                            try {
                                if (value_4_1 && !value_4_1.done && (_a = value_4.return)) _a.call(value_4);
                            }
                            finally { if (e_9) throw e_9.error; }
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
                break;
            default:
                jsw_logger_1.JSWLogger.instance.throw("Bad value type in query");
        }
        var e_9, _a;
    });
};
var testObjectClause = function (clause, doc, key) {
    jsw_logger_1.JSWLogger.instance.debug("Called testObjectClause");
    var val = null;
    var path = null;
    if (key.length > 0) {
        path = key.pop();
        val = doc[path];
        jsw_logger_1.JSWLogger.instance.debug("check on field " + path);
        // TODO add _.isNumber(val) and treat it as an array
        if (val) {
            jsw_logger_1.JSWLogger.instance.log(val);
            jsw_logger_1.JSWLogger.instance.debug("going deeper");
            return testObjectClause(clause, val, key);
        }
    }
    else {
        jsw_logger_1.JSWLogger.instance.debug("lowest path: " + path);
        return testClause(clause, doc);
    }
};
var testLogicalClause = function (clause, doc, key) {
    var matches = null;
    try {
        for (var _a = __values(clause.value), _b = _a.next(); !_b.done; _b = _a.next()) {
            var clauseValue = _b.value;
            var matcher = new SelectorMatcher({ clauses: [clauseValue] });
            switch (key) {
                case "and":
                    // True unless it has one that do not match
                    if (_.isNil(matches)) {
                        matches = true;
                    }
                    if (!matcher.test(doc)) {
                        return false;
                    }
                    break;
                case "or":
                    // False unless it has one match at least
                    if (_.isNil(matches)) {
                        matches = false;
                    }
                    if (matcher.test(doc)) {
                        return true;
                    }
                    break;
            }
        }
    }
    catch (e_10_1) { e_10 = { error: e_10_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
        }
        finally { if (e_10) throw e_10.error; }
    }
    return matches || false;
    var e_10, _c;
};
var testOperatorClause = function (clause, value) {
    jsw_logger_1.JSWLogger.instance.debug("Called testOperatorClause");
    try {
        for (var _a = __values(Object.keys(clause.value)), _b = _a.next(); !_b.done; _b = _a.next()) {
            var key = _b.value;
            if (!testOperatorConstraint(key, clause.value[key], clause.value, value, clause)) {
                return false;
            }
        }
    }
    catch (e_11_1) { e_11 = { error: e_11_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
        }
        finally { if (e_11) throw e_11.error; }
    }
    return true;
    var e_11, _c;
};
var testOperatorConstraint = function (key, operatorValue, clauseValue, docVal, clause) {
    jsw_logger_1.JSWLogger.instance.debug("Called testOperatorConstraint");
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
            return !(testClause(_clause, docVal));
            */
            // TODO implement
            jsw_logger_1.JSWLogger.instance.throw("$not unimplemented");
            break;
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
            break;
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
                _opt = clauseValue.$options;
                if (/[xs]/.test(_opt)) {
                    // g, i, m, x, s
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
var BSON_TYPES = {
    types: [
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
        try {
            for (var _a = __values(this.types), _b = _a.next(); !_b.done; _b = _a.next()) {
                var type = _b.value;
                if (type.alias === alias) {
                    return type;
                }
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_12) throw e_12.error; }
        }
        var e_12, _c;
    },
    getByValue: function (val) {
        if (_.isNumber(val)) {
            return this.getByAlias("double");
        }
        if (_.isString(val)) {
            return this.getByAlias("string");
        }
        if (_.isBoolean(val)) {
            return this.getByAlias("bool");
        }
        if (_.isArray(val)) {
            return this.getByAlias("array");
        }
        if (_.isNull(val)) {
            return this.getByAlias("null");
        }
        if (_.isRegExp(val)) {
            return this.getByAlias("regex");
        }
        if (_.isPlainObject(val)) {
            return this.getByAlias("object");
        }
        if (_.isSymbol(val)) {
            return this.getByAlias("symbol");
        }
        jsw_logger_1.JSWLogger.instance.throw("Unaccepted BSON type");
    }
};
//# sourceMappingURL=SelectorMatcher.js.map