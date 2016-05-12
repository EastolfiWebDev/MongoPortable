"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/**
 * @file Selector.js - based on Monglo#Selector ({@link https://github.com/Monglo}) by Christian Sullivan <cs@euforic.co> | Copyright (c) 2012
 * @version 0.0.1
 * @ignore
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var Logger = require("./utils/Logger"),
    _ = require("lodash"),
    SelectorMatcher = require("./SelectorMatcher");

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

/**
 * Selector
 * @ignore
 * 
 * @module Selector
 * @constructor
 * @since 0.0.1
 * 
 * @classdesc Cursor class that maps a MongoDB-like cursor
 * 
 * @param {MongoPortable} db - Additional options
 * @param {Collection} collection - The collection instance
 * @param {Object|Array|String} [selection={}] - The selection for matching documents
 * @param {Object|Array|String} [fields={}] - The fields of the document to show
 * @param {Object} [options] - Database object
 * 
 * @param {Object} [options.pkFactory=null] - Object overriding the basic "ObjectId" primary key generation.
 * 
 */
var Selector = {};

// helpers used by compiled selector code
Selector._f = {
    // TODO for _all and _in, consider building 'inquery' at compile time..

    _all: function _all(x, qval) {
        // $all is only meaningful on arrays
        if (!(x instanceof Array)) {
            return false;
        }

        // TODO should use a canonicalizing representation, so that we
        // don't get screwed by key order
        var parts = {};
        var remaining = 0;

        _.forEach(qval, function (q) {
            var hash = JSON.stringify(q);

            if (!(hash in parts)) {
                parts[hash] = true;
                remaining++;
            }
        });

        for (var i = 0; i < x.length; i++) {
            var hash = JSON.stringify(x[i]);
            if (parts[hash]) {
                delete parts[hash];
                remaining--;

                if (0 === remaining) return true;
            }
        }

        return false;
    },

    _in: function _in(x, qval) {
        if ((typeof x === "undefined" ? "undefined" : _typeof(x)) !== "object") {
            // optimization: use scalar equality (fast)
            for (var i = 0; i < qval.length; i++) {
                if (x === qval[i]) {
                    return true;
                }
            }

            return false;
        } else {
            // nope, have to use deep equality
            for (var i = 0; i < qval.length; i++) {
                if (Selector._f._equal(x, qval[i])) {
                    return true;
                }
            }

            return false;
        }
    },

    /*
        undefined: -1
        null: 0,
        number: 1,
        string: 2,
        object: 3
        array: 4,
        boolean: 7,
        regexp: 9,
        function: 100,
    */

    // _type: function (v) {
    //     if (_.isNumber(v)) return {type: 1, order: 1, fnc: _.isNumber};

    //     if (_.isString(v)) return {type: 2, order: 2, fnc: _.isString};

    //     if (_.isBoolean(v)) return {type: 8, order: 7, fnc: _.isBoolean};

    //     if (_.isArray(v)) return {type: 4, order: 4, fnc: _.isArray};

    //     if (_.isNull(v)) return {type: 10, order: 0, fnc: _.isNull};

    //     if (_.isRegExp(v)) return {type: 11, order: 9, fnc: _.isRegExp};

    //     if (_.isFunction(v)) return {type: 13, order: 100, fnc: _.isFunction};

    //     if (_.isPlainObject(v)) return {type: 3, order: 3, fnc: _.isPlainObject};

    //     throw Error("Unsupported type for sorting");

    //     // if (typeof v === "number") return 1;

    //     // if (typeof v === "string") return 2;

    //     // if (typeof v === "boolean") return 8;

    //     // if (v instanceof Array) return 4;

    //     // if (v === null) return 10;

    //     // if (v instanceof RegExp) return 11;

    //     // note that typeof(/x/) === "function"
    //     // if (typeof v === "function") return 13;

    //     // return 3; // object

    //     // TODO support some/all of these:
    //     // 5, binary data
    //     // 7, object id
    //     // 9, date
    //     // 14, symbol
    //     // 15, javascript code with scope
    //     // 16, 18: 32-bit/64-bit integer
    //     // 17, timestamp
    //     // 255, minkey
    //     // 127, maxkey
    // },

    // deep equality test: use for literal document and array matches
    _equal: function _equal(x, qval) {
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

                for (var i = 0; i < a.length; i++) {
                    if (!match(a[i], b[i])) return false;
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

            for (var x in b) {
                b_keys.push(b[x]);
            }

            var i = 0;
            for (var x in a) {
                if (i >= b_keys.length) return false;

                if (!match(a[x], b_keys[i])) return false;

                i++;
            }
            if (i !== b_keys.length) return false;

            return true;
        };

        return match(x, qval);
    },

    // if x is not an array, true iff f(x) is true. if x is an array,
    // true iff f(y) is true for any y in x.
    //
    // this is the way most mongo operators (like $gt, $mod, $type..)
    // treat their arguments.
    _matches: function _matches(x, f) {
        if (x instanceof Array) {
            for (var i = 0; i < x.length; i++) {
                if (f(x[i])) return true;
            }

            return false;
        }

        return f(x);
    },

    // like _matches, but if x is an array, it's true not only if f(y)
    // is true for some y in x, but also if f(x) is true.
    //
    // this is the way mongo value comparisons usually work, like {x:
    // 4}, {x: [4]}, or {x: {$in: [1,2,3]}}.
    _matches_plus: function _matches_plus(x, f) {
        if (x instanceof Array) {
            for (var i = 0; i < x.length; i++) {
                if (f(x[i])) return true;
            }

            // fall through!
        }

        return f(x);
    },

    // maps a type code to a value that can be used to sort values of
    // different types
    // _typeorder: function (t) {
    //     // http://www.mongodb.org/display/DOCS/What+is+the+Compare+Order+for+BSON+Types
    //     // TODO what is the correct sort position for Javascript code?
    //     // ('100' in the matrix below)
    //     // TODO minkey/maxkey
    //     return [-1, 1, 2, 3, 4, 5, -1, 6, 7, 8, 0, 9, -1, 100, 2, 100, 1, 8, 1][t];
    // },

    // compare two values of unknown type according to BSON ordering
    // semantics. (as an extension, consider 'undefined' to be less than
    // any other value.)
    // return negative if a is less, positive if b is less, or 0 if equal
    _cmp: function _cmp(a, b) {
        if (_.isUndefined(a)) return b === undefined ? 0 : -1;

        if (_.isUndefined(b)) return 1;

        // var ta = Selector._f._type(a);
        // var tb = Selector._f._type(b);
        // var oa = Selector._f._typeorder(ta);
        // var ob = Selector._f._typeorder(tb);
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

                var s = Selector._f._cmp(a[i], b[i]);

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

            return Selector._f._cmp(to_array(a), to_array(b));
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
};

Selector.isCompiled = function (selector) {
    if (_.isNil(selector)) return false;

    if (selector instanceof SelectorMatcher) return true;

    return false;
};

// True if the given document matches the given selector.
Selector._matches = function (selector, doc) {
    return Selector._compileSelector(selector).test(doc);
};

Selector._compileSelector = function (selector) {
    var _selector = new SelectorMatcher(this);

    if (_.isNil(selector)) {
        Logger.debug('selector -> null');

        selector = {};
    } else {
        Logger.debug('selector -> not null');

        if (!selector || _.hasIn(selector, '_id')) {
            Logger.debug('selector -> false value || { _id: false value }');

            if (!selector._id) {
                Logger.debug('selector -> false value');

                selector = {
                    _id: false
                };
            } else {
                Logger.debug('selector -> { _id: false value }');

                selector = {
                    _id: _.toString(selector)
                };
            }
        }
    }

    if (_.isFunction(selector)) {
        Logger.debug('selector -> function(doc) { ... }');

        _initFunction.call(_selector, selector);
    } else if (_.isString(selector) || _.isNumber(selector)) {
        Logger.debug('selector -> "123456789" || 123456798');

        selector = {
            _id: selector
        };

        _initObject.call(_selector, selector);
    } else {
        Logger.debug('selector -> { field: value }');

        _initObject.call(_selector, selector);
    }

    return _selector;
};

/**
 * .sort("field1") -> field1 asc
 * .sort("field1 desc") -> field1 desc
 * .sort("field1 field2") -> field1 asc, field2 asc
 * .sort("field1 -1") -> field1 desc
 * .sort("field1 -1, field2 desc") -> field1 desc, field2 desc
 * .sort("field1 true, field2 false") -> field1 asc, field2 desc
 * 
 * .sort(["field1"]) -> field1 asc
 * .sort(["field1", "field2 desc"]) -> field1 asc, field2 desc
 * .sort([["field1", -1], ["field2", "asc"]]) -> field1 desc, field2 asc
 * 
 * .sort({"field1": -1, "field2": "asc"}) -> field1 desc, field2 asc
 * 
 */
//arr.sort(function(a, b, c, d) { console.log(a, b, c, d); return a < b;})
Selector._compileSort = function (spec) {
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
            return Selector._compileSort(spec.replace(/,/ig, ' '));
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
        return Selector._compileSort(spec.join(' '));
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

            return Selector._compileSort(_spec);
        } else {
            throw Error("Bad sort specification: ", JSON.stringify(spec));
        }

    if (keys.length === 0) {
        return function () {
            return 0;
        };
    }

    // return {keys: keys, asc: asc};
    return function (a, b) {
        var x = 0;

        for (var i = 0; i < keys.length; i++) {
            if (i !== 0 && x !== 0) return x; // Non reachable?

            // x = Selector._f._cmp(a[JSON.stringify(keys[i])], b[JSON.stringify(keys[i])]);
            x = Selector._f._cmp(a[keys[i]], b[keys[i]]);

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
};

Selector._compileFields = function (spec) {
    var projection = {};

    if (_.isString(spec)) {
        spec = spec.replace(/( )+/ig, ' ').trim();

        if (spec.indexOf(',') !== -1) {
            // Replace commas by spaces, and treat it as a spaced-separated string
            return Selector._compileFields(spec.replace(/,/ig, ' '));
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
        return Selector._compileFields(spec.join(' '));
    } else if (_.isPlainObject(spec)) {
        // TODO Nested path -> .sort({ "field1.field12": "asc" })
        var _spec = [];
        for (var key in spec) {
            if (_.hasIn(spec, key)) {
                _spec.push(key);
                _spec.push(spec[key]);
            }
        }

        return Selector._compileFields(_spec);
    } else {
        throw Error("Bad sort specification: ", JSON.stringify(spec));
    }

    return projection;
};

// TODO implement ordinal indexing: 'people.2.name'

Selector._exprForSelector = function (selector) {
    Logger.debug('Called: _exprForSelector');

    var clauses = [];

    for (var key in selector) {
        var value = selector[key];

        if (key.charAt(0) === '$') {
            Logger.debug('selector -> operator => { $and: [{...}, {...}] }');

            clauses.push(Selector._exprForDocumentPredicate(key, value));
        } else {
            Logger.debug('selector -> plain => { field1: <value> }');

            clauses.push(Selector._exprForKeypathPredicate(key, value));
        }
    }

    return clauses;
};

Selector._exprForDocumentPredicate = function (key, value) {
    var clause = {};

    switch (key) {
        case '$or':
            clause.key = 'or';

        // The rest will be handled by '_operator_'
        case '$and':
            clause.key = 'and';

        // The rest will be handled by '_operator_'
        case '$nor':
            clause.key = 'nor';

        // The rest will be handled by '_operator_'
        case '_operator_':
            // Generic handler for operators ($or, $and, $nor)

            clause.kind = 'operator';
            clause.type = 'array';

            var clauses = [];

            _.forEach(value, function (_val) {
                clauses.push(Selector._exprForSelector(_val));
            });

            clause.value = clauses;

            break;
        default:
            throw Error("Unrecogized key in selector: ", key);
    }

    // TODO cases: $where, $elemMatch

    Logger.debug('clause created: ' + JSON.stringify(clause));

    return clause;
};

Selector._exprForKeypathPredicate = function (keypath, value) {
    Logger.debug('Called: _exprForKeypathPredicate');

    var clause = {};

    clause.value = value;

    if (_.isNil(value)) {
        Logger.debug('clause of type null');

        clause.type = 'null';
    } else if (_.isRegExp(value)) {
        Logger.debug('clause of type RegExp');

        clause.type = 'regexp';
    } else if (_.isArray(value)) {
        Logger.debug('clause of type Array');

        clause.type = 'array';
    } else if (_.isString(value)) {
        Logger.debug('clause of type String');

        clause.type = 'string';
    } else if (_.isNumber(value)) {
        Logger.debug('clause of type Number');

        clause.type = 'number';
    } else if (_.isBoolean(value)) {
        Logger.debug('clause of type Boolean');

        clause.type = 'boolean';
    } else if (_.isFunction(value)) {
        Logger.debug('clause of type Function');

        throw Error("Bad value type in query");
    } else if (_.isPlainObject(value)) {
        var literalObject = true;
        for (var key in value) {
            if (key.charAt(0) === '$') {
                literalObject = false;
                break;
            }
        }

        if (literalObject) {
            Logger.debug('clause of type Object => { field: { field_1: <value>, field_2: <value> } }');

            clause.type = 'literal_object';
        } else {
            Logger.debug('clause of type Operator => { field: { $gt: 2, $lt 5 } }');

            clause.type = 'operator_object';
        }
    }

    var parts = keypath.split('.');
    if (parts.length > 1) {
        Logger.debug('clause over Object field => { "field1.field1_2": <value> }');

        clause.kind = 'object';
        clause.key = parts;
    } else {
        Logger.debug('clause over Plain field => { "field": <value> }');

        clause.kind = 'plain';
        clause.key = parts[0];
    }

    Logger.debug('clause created: ' + JSON.stringify(clause));

    return clause;
};

/**
 * @ignore
 */
var _initObject = function _initObject(selector) {
    Logger.debug('Called: _initObject');

    this.clauses = Selector._exprForSelector(selector);

    Logger.debug('clauses created: ' + JSON.stringify(this.clauses));
};

/**
 * @ignore
 */
var _initFunction = function _initFunction(selector) {
    this.clauses.push({
        kind: 'function',
        value: selector
    });
};

module.exports = Selector;
//# sourceMappingURL=data:application/json;base64,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QUssU0FBTCxDQUFlLEtBQUssT0FBcEIsQ0FBbkM7QUFDSCxDQU5EOzs7OztBQVdBLElBQUksZ0JBQWdCLFNBQWhCLGFBQWdCLENBQVMsUUFBVCxFQUFtQjtBQUNuQyxTQUFLLE9BQUwsQ0FBYSxJQUFiLENBQWtCO0FBQ2QsY0FBTSxVQURRO0FBRWQsZUFBTztBQUZPLEtBQWxCO0FBSUgsQ0FMRDs7QUFPQSxPQUFPLE9BQVAsR0FBaUIsUUFBakIiLCJmaWxlIjoiU2VsZWN0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIFNlbGVjdG9yLmpzIC0gYmFzZWQgb24gTW9uZ2xvI1NlbGVjdG9yICh7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL01vbmdsb30pIGJ5IENocmlzdGlhbiBTdWxsaXZhbiA8Y3NAZXVmb3JpYy5jbz4gfCBDb3B5cmlnaHQgKGMpIDIwMTJcbiAqIEB2ZXJzaW9uIDAuMC4xXG4gKiBAaWdub3JlXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZShcIi4vdXRpbHMvTG9nZ2VyXCIpLFxuICAgIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpLFxuICAgIFNlbGVjdG9yTWF0Y2hlciA9IHJlcXVpcmUoXCIuL1NlbGVjdG9yTWF0Y2hlclwiKTtcblxudmFyIEJzb25UeXBlcyA9IHtcblx0X3R5cGVzOiBbXG5cdFx0eyBhbGlhczogJ21pbktleScsIG51bWJlcjogLTEsIG9yZGVyOiAxLCBpc1R5cGU6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnbnVsbCcsIG51bWJlcjogMTAsIG9yZGVyOiAyLCBpc1R5cGU6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnaW50JywgbnVtYmVyOiAxNiwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc0ludGVnZXIgfSxcblx0XHR7IGFsaWFzOiAnbG9uZycsIG51bWJlcjogMTgsIG9yZGVyOiAzLCBpc1R5cGU6IF8uaXNOdW1iZXIgfSxcblx0XHR7IGFsaWFzOiAnZG91YmxlJywgbnVtYmVyOiAxLCBvcmRlcjogMywgaXNUeXBlOiBfLmlzTnVtYmVyIH0sXG5cdFx0eyBhbGlhczogJ251bWJlcicsIG51bWJlcjogbnVsbCwgb3JkZXI6IDMsIGlzVHlwZTogXy5pc051bWJlciB9LFxuXHRcdHsgYWxpYXM6ICdzeW1ib2wnLCBudW1iZXI6IDE0LCBvcmRlcjogNCwgaXNUeXBlOiBudWxsIH0sXG5cdFx0eyBhbGlhczogJ3N0cmluZycsIG51bWJlcjogMiwgb3JkZXI6IDQsIGlzVHlwZTogXy5pc1N0cmluZyB9LFxuXHRcdHsgYWxpYXM6ICdvYmplY3QnLCBudW1iZXI6IDMsIG9yZGVyOiA1LCBpc1R5cGU6IF8uaXNQbGFpbk9iamVjdCB9LFxuXHRcdHsgYWxpYXM6ICdhcnJheScsIG51bWJlcjogNCwgb3JkZXI6IDYsIGlzVHlwZTogXy5pc0FycmF5IH0sXG5cdFx0eyBhbGlhczogJ2JpbkRhdGEnLCBudW1iZXI6IDUsIG9yZGVyOiA3LCBpc1R5cGU6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnb2JqZWN0SWQnLCBudW1iZXI6IDcsIG9yZGVyOiA4LCBpc1R5cGVmbmM6IG51bGwgfSxcblx0XHR7IGFsaWFzOiAnYm9vbCcsIG51bWJlcjogOCwgb3JkZXI6IDksIGlzVHlwZTogXy5pc0Jvb2xlYW4gfSxcblx0XHR7IGFsaWFzOiAnZGF0ZScsIG51bWJlcjogOSwgb3JkZXI6IDEwLCBpc1R5cGVmbmM6IF8uaXNEYXRlIH0sICAgICAgICAgLy8gZm9ybWF0XG5cdFx0eyBhbGlhczogJ3RpbWVzdGFtcCcsIG51bWJlcjogMTcsIG9yZGVyOiAxMSwgaXNUeXBlOiBfLmlzRGF0ZSB9LCAgIC8vIGZvcm1hdFxuXHRcdHsgYWxpYXM6ICdyZWdleCcsIG51bWJlcjogMTEsIG9yZGVyOiAxMiwgaXNUeXBlOiBfLmlzUmVnRXhwIH0sXG5cdFx0eyBhbGlhczogJ21heEtleScsIG51bWJlcjogMTI3LCBvcmRlcjogMTMsIGlzVHlwZTogbnVsbCB9XG5cdFx0XG4vLyBcdFx0dW5kZWZpbmVkIDZcbi8vIFx0XHRkYlBvaW50ZXJcbi8vIFx0XHRqYXZhc2NyaXB0XG4vLyBcdFx0amF2YXNjcmlwdFdpdGhTY29wZVxuLy8gXHRcdGZ1bmN0aW9uXG5cdF0sXG5cdFxuXHRnZXRCeU51bWJlcjogZnVuY3Rpb24obnVtKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl90eXBlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKHRoaXMuX3R5cGVzW2ldLm51bWJlciA9PT0gbnVtKSByZXR1cm4gdGhpcy5fdHlwZXNbaV07XG5cdFx0fVxuXHRcdFxuXHRcdHRocm93IEVycm9yKFwiVW5hY2NlcHRlZCBCU09OIHR5cGUgbnVtYmVyXCIpO1xuXHR9LFxuXHRnZXRCeUFsaWFzOiBmdW5jdGlvbihhbGlhcykge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fdHlwZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmICh0aGlzLl90eXBlc1tpXS5hbGlhcyA9PT0gYWxpYXMpIHJldHVybiB0aGlzLl90eXBlc1tpXTtcblx0XHR9XG5cdFx0XG5cdFx0dGhyb3cgRXJyb3IoXCJVbmFjY2VwdGVkIEJTT04gdHlwZSBhbGlhc1wiKTtcblx0fSxcblx0Z2V0QnlWYWx1ZTogZnVuY3Rpb24odmFsKSB7XG5cdCAgICBpZiAoXy5pc051bWJlcih2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwiZG91YmxlXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcInN0cmluZ1wiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQm9vbGVhbih2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwiYm9vbFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcImFycmF5XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOdWxsKHZhbCkpIHJldHVybiB0aGlzLmdldEJ5QWxpYXMoXCJudWxsXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNSZWdFeHAodmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcInJlZ2V4XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNQbGFpbk9iamVjdCh2YWwpKSByZXR1cm4gdGhpcy5nZXRCeUFsaWFzKFwib2JqZWN0XCIpO1xuICAgICAgICBcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJVbmFjY2VwdGVkIEJTT04gdHlwZVwiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGlmIChfLmlzRnVuY3Rpb24odmFsKSkgcmV0dXJuIHRoaXMuZ2V0QnlBbGlhcyhcImRvdWJsZVwiKTtcblx0fVxufTtcblxuXG4vKipcbiAqIFNlbGVjdG9yXG4gKiBAaWdub3JlXG4gKiBcbiAqIEBtb2R1bGUgU2VsZWN0b3JcbiAqIEBjb25zdHJ1Y3RvclxuICogQHNpbmNlIDAuMC4xXG4gKiBcbiAqIEBjbGFzc2Rlc2MgQ3Vyc29yIGNsYXNzIHRoYXQgbWFwcyBhIE1vbmdvREItbGlrZSBjdXJzb3JcbiAqIFxuICogQHBhcmFtIHtNb25nb1BvcnRhYmxlfSBkYiAtIEFkZGl0aW9uYWwgb3B0aW9uc1xuICogQHBhcmFtIHtDb2xsZWN0aW9ufSBjb2xsZWN0aW9uIC0gVGhlIGNvbGxlY3Rpb24gaW5zdGFuY2VcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW3NlbGVjdGlvbj17fV0gLSBUaGUgc2VsZWN0aW9uIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fFN0cmluZ30gW2ZpZWxkcz17fV0gLSBUaGUgZmllbGRzIG9mIHRoZSBkb2N1bWVudCB0byBzaG93XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gRGF0YWJhc2Ugb2JqZWN0XG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5wa0ZhY3Rvcnk9bnVsbF0gLSBPYmplY3Qgb3ZlcnJpZGluZyB0aGUgYmFzaWMgXCJPYmplY3RJZFwiIHByaW1hcnkga2V5IGdlbmVyYXRpb24uXG4gKiBcbiAqL1xudmFyIFNlbGVjdG9yID0ge307XG5cbi8vIGhlbHBlcnMgdXNlZCBieSBjb21waWxlZCBzZWxlY3RvciBjb2RlXG5TZWxlY3Rvci5fZiA9IHtcbiAgICAvLyBUT0RPIGZvciBfYWxsIGFuZCBfaW4sIGNvbnNpZGVyIGJ1aWxkaW5nICdpbnF1ZXJ5JyBhdCBjb21waWxlIHRpbWUuLlxuXG4gICAgX2FsbDogZnVuY3Rpb24gKHgsIHF2YWwpIHtcbiAgICAgICAgLy8gJGFsbCBpcyBvbmx5IG1lYW5pbmdmdWwgb24gYXJyYXlzXG4gICAgICAgIGlmICghKHggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE8gc2hvdWxkIHVzZSBhIGNhbm9uaWNhbGl6aW5nIHJlcHJlc2VudGF0aW9uLCBzbyB0aGF0IHdlXG4gICAgICAgIC8vIGRvbid0IGdldCBzY3Jld2VkIGJ5IGtleSBvcmRlclxuICAgICAgICB2YXIgcGFydHMgPSB7fTtcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IDA7XG5cbiAgICAgICAgXy5mb3JFYWNoKHF2YWwsIGZ1bmN0aW9uIChxKSB7XG4gICAgICAgICAgICB2YXIgaGFzaCA9IEpTT04uc3RyaW5naWZ5KHEpO1xuXG4gICAgICAgICAgICBpZiAoIShoYXNoIGluIHBhcnRzKSkge1xuICAgICAgICAgICAgICAgIHBhcnRzW2hhc2hdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZW1haW5pbmcrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaGFzaCA9IEpTT04uc3RyaW5naWZ5KHhbaV0pO1xuICAgICAgICAgICAgaWYgKHBhcnRzW2hhc2hdKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHBhcnRzW2hhc2hdO1xuICAgICAgICAgICAgICAgIHJlbWFpbmluZy0tO1xuXG4gICAgICAgICAgICAgICAgaWYgKDAgPT09IHJlbWFpbmluZykgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIF9pbjogZnVuY3Rpb24gKHgsIHF2YWwpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB4ICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAvLyBvcHRpbWl6YXRpb246IHVzZSBzY2FsYXIgZXF1YWxpdHkgKGZhc3QpXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHF2YWwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoeCA9PT0gcXZhbFtpXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vcGUsIGhhdmUgdG8gdXNlIGRlZXAgZXF1YWxpdHlcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcXZhbC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChTZWxlY3Rvci5fZi5fZXF1YWwoeCwgcXZhbFtpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qXG4gICAgICAgIHVuZGVmaW5lZDogLTFcbiAgICAgICAgbnVsbDogMCxcbiAgICAgICAgbnVtYmVyOiAxLFxuICAgICAgICBzdHJpbmc6IDIsXG4gICAgICAgIG9iamVjdDogM1xuICAgICAgICBhcnJheTogNCxcbiAgICAgICAgYm9vbGVhbjogNyxcbiAgICAgICAgcmVnZXhwOiA5LFxuICAgICAgICBmdW5jdGlvbjogMTAwLFxuICAgICovXG4gICAgXG4gICAgLy8gX3R5cGU6IGZ1bmN0aW9uICh2KSB7XG4gICAgLy8gICAgIGlmIChfLmlzTnVtYmVyKHYpKSByZXR1cm4ge3R5cGU6IDEsIG9yZGVyOiAxLCBmbmM6IF8uaXNOdW1iZXJ9O1xuICAgICAgICBcbiAgICAvLyAgICAgaWYgKF8uaXNTdHJpbmcodikpIHJldHVybiB7dHlwZTogMiwgb3JkZXI6IDIsIGZuYzogXy5pc1N0cmluZ307XG4gICAgICAgIFxuICAgIC8vICAgICBpZiAoXy5pc0Jvb2xlYW4odikpIHJldHVybiB7dHlwZTogOCwgb3JkZXI6IDcsIGZuYzogXy5pc0Jvb2xlYW59O1xuICAgICAgICBcbiAgICAvLyAgICAgaWYgKF8uaXNBcnJheSh2KSkgcmV0dXJuIHt0eXBlOiA0LCBvcmRlcjogNCwgZm5jOiBfLmlzQXJyYXl9O1xuICAgICAgICBcbiAgICAvLyAgICAgaWYgKF8uaXNOdWxsKHYpKSByZXR1cm4ge3R5cGU6IDEwLCBvcmRlcjogMCwgZm5jOiBfLmlzTnVsbH07XG4gICAgICAgIFxuICAgIC8vICAgICBpZiAoXy5pc1JlZ0V4cCh2KSkgcmV0dXJuIHt0eXBlOiAxMSwgb3JkZXI6IDksIGZuYzogXy5pc1JlZ0V4cH07XG4gICAgICAgIFxuICAgIC8vICAgICBpZiAoXy5pc0Z1bmN0aW9uKHYpKSByZXR1cm4ge3R5cGU6IDEzLCBvcmRlcjogMTAwLCBmbmM6IF8uaXNGdW5jdGlvbn07XG4gICAgICAgIFxuICAgIC8vICAgICBpZiAoXy5pc1BsYWluT2JqZWN0KHYpKSByZXR1cm4ge3R5cGU6IDMsIG9yZGVyOiAzLCBmbmM6IF8uaXNQbGFpbk9iamVjdH07XG4gICAgICAgIFxuICAgIC8vICAgICB0aHJvdyBFcnJvcihcIlVuc3VwcG9ydGVkIHR5cGUgZm9yIHNvcnRpbmdcIik7XG4gICAgICAgIFxuICAgIC8vICAgICAvLyBpZiAodHlwZW9mIHYgPT09IFwibnVtYmVyXCIpIHJldHVybiAxO1xuXG4gICAgLy8gICAgIC8vIGlmICh0eXBlb2YgdiA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIDI7XG5cbiAgICAvLyAgICAgLy8gaWYgKHR5cGVvZiB2ID09PSBcImJvb2xlYW5cIikgcmV0dXJuIDg7XG5cbiAgICAvLyAgICAgLy8gaWYgKHYgaW5zdGFuY2VvZiBBcnJheSkgcmV0dXJuIDQ7XG5cbiAgICAvLyAgICAgLy8gaWYgKHYgPT09IG51bGwpIHJldHVybiAxMDtcblxuICAgIC8vICAgICAvLyBpZiAodiBpbnN0YW5jZW9mIFJlZ0V4cCkgcmV0dXJuIDExO1xuXG4gICAgLy8gICAgIC8vIG5vdGUgdGhhdCB0eXBlb2YoL3gvKSA9PT0gXCJmdW5jdGlvblwiXG4gICAgLy8gICAgIC8vIGlmICh0eXBlb2YgdiA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gMTM7XG5cbiAgICAvLyAgICAgLy8gcmV0dXJuIDM7IC8vIG9iamVjdFxuXG4gICAgLy8gICAgIC8vIFRPRE8gc3VwcG9ydCBzb21lL2FsbCBvZiB0aGVzZTpcbiAgICAvLyAgICAgLy8gNSwgYmluYXJ5IGRhdGFcbiAgICAvLyAgICAgLy8gNywgb2JqZWN0IGlkXG4gICAgLy8gICAgIC8vIDksIGRhdGVcbiAgICAvLyAgICAgLy8gMTQsIHN5bWJvbFxuICAgIC8vICAgICAvLyAxNSwgamF2YXNjcmlwdCBjb2RlIHdpdGggc2NvcGVcbiAgICAvLyAgICAgLy8gMTYsIDE4OiAzMi1iaXQvNjQtYml0IGludGVnZXJcbiAgICAvLyAgICAgLy8gMTcsIHRpbWVzdGFtcFxuICAgIC8vICAgICAvLyAyNTUsIG1pbmtleVxuICAgIC8vICAgICAvLyAxMjcsIG1heGtleVxuICAgIC8vIH0sXG5cbiAgICAvLyBkZWVwIGVxdWFsaXR5IHRlc3Q6IHVzZSBmb3IgbGl0ZXJhbCBkb2N1bWVudCBhbmQgYXJyYXkgbWF0Y2hlc1xuICAgIF9lcXVhbDogZnVuY3Rpb24gKHgsIHF2YWwpIHtcbiAgICAgICAgdmFyIG1hdGNoID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgIC8vIHNjYWxhcnNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIGEgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBhID09PSAnYm9vbGVhbicgfHwgYSA9PT0gdW5kZWZpbmVkIHx8IGEgPT09IG51bGwpIHJldHVybiBhID09PSBiO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGEgPT09ICdmdW5jdGlvbicpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgLy8gT0ssIHR5cGVvZiBhID09PSAnb2JqZWN0J1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBiICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBhcnJheXNcbiAgICAgICAgICAgIGlmIChhIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShiIGluc3RhbmNlb2YgQXJyYXkpKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRjaChhW2ldLGJbaV0pKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIG9iamVjdHNcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICB2YXIgdW5tYXRjaGVkX2Jfa2V5cyA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIGIpXG4gICAgICAgICAgICB1bm1hdGNoZWRfYl9rZXlzKys7XG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIGEpIHtcbiAgICAgICAgICAgIGlmICghKHggaW4gYikgfHwgIW1hdGNoKGFbeF0sIGJbeF0pKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgdW5tYXRjaGVkX2Jfa2V5cy0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHVubWF0Y2hlZF9iX2tleXMgPT09IDA7XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgLy8gRm9sbG93IE1vbmdvIGluIGNvbnNpZGVyaW5nIGtleSBvcmRlciB0byBiZSBwYXJ0IG9mXG4gICAgICAgICAgICAvLyBlcXVhbGl0eS4gS2V5IGVudW1lcmF0aW9uIG9yZGVyIGlzIGFjdHVhbGx5IG5vdCBkZWZpbmVkIGluXG4gICAgICAgICAgICAvLyB0aGUgZWNtYXNjcmlwdCBzcGVjIGJ1dCBpbiBwcmFjdGljZSBtb3N0IGltcGxlbWVudGF0aW9uc1xuICAgICAgICAgICAgLy8gcHJlc2VydmUgaXQuIChUaGUgZXhjZXB0aW9uIGlzIENocm9tZSwgd2hpY2ggcHJlc2VydmVzIGl0XG4gICAgICAgICAgICAvLyB1c3VhbGx5LCBidXQgbm90IGZvciBrZXlzIHRoYXQgcGFyc2UgYXMgaW50cy4pXG4gICAgICAgICAgICB2YXIgYl9rZXlzID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gYikge1xuICAgICAgICAgICAgICAgIGJfa2V5cy5wdXNoKGJbeF0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoaSA+PSBiX2tleXMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKGFbeF0sIGJfa2V5c1tpXSkpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpICE9PSBiX2tleXMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBtYXRjaCh4LCBxdmFsKTtcbiAgICB9LFxuXG4gICAgLy8gaWYgeCBpcyBub3QgYW4gYXJyYXksIHRydWUgaWZmIGYoeCkgaXMgdHJ1ZS4gaWYgeCBpcyBhbiBhcnJheSxcbiAgICAvLyB0cnVlIGlmZiBmKHkpIGlzIHRydWUgZm9yIGFueSB5IGluIHguXG4gICAgLy9cbiAgICAvLyB0aGlzIGlzIHRoZSB3YXkgbW9zdCBtb25nbyBvcGVyYXRvcnMgKGxpa2UgJGd0LCAkbW9kLCAkdHlwZS4uKVxuICAgIC8vIHRyZWF0IHRoZWlyIGFyZ3VtZW50cy5cbiAgICBfbWF0Y2hlczogZnVuY3Rpb24gKHgsIGYpIHtcbiAgICAgICAgaWYgKHggaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGYoeFtpXSkpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZih4KTtcbiAgICB9LFxuXG4gICAgLy8gbGlrZSBfbWF0Y2hlcywgYnV0IGlmIHggaXMgYW4gYXJyYXksIGl0J3MgdHJ1ZSBub3Qgb25seSBpZiBmKHkpXG4gICAgLy8gaXMgdHJ1ZSBmb3Igc29tZSB5IGluIHgsIGJ1dCBhbHNvIGlmIGYoeCkgaXMgdHJ1ZS5cbiAgICAvL1xuICAgIC8vIHRoaXMgaXMgdGhlIHdheSBtb25nbyB2YWx1ZSBjb21wYXJpc29ucyB1c3VhbGx5IHdvcmssIGxpa2Uge3g6XG4gICAgLy8gNH0sIHt4OiBbNF19LCBvciB7eDogeyRpbjogWzEsMiwzXX19LlxuICAgIF9tYXRjaGVzX3BsdXM6IGZ1bmN0aW9uICh4LCBmKSB7XG4gICAgICAgIGlmICh4IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChmKHhbaV0pKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZmFsbCB0aHJvdWdoIVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGYoeCk7XG4gICAgfSxcblxuICAgIC8vIG1hcHMgYSB0eXBlIGNvZGUgdG8gYSB2YWx1ZSB0aGF0IGNhbiBiZSB1c2VkIHRvIHNvcnQgdmFsdWVzIG9mXG4gICAgLy8gZGlmZmVyZW50IHR5cGVzXG4gICAgLy8gX3R5cGVvcmRlcjogZnVuY3Rpb24gKHQpIHtcbiAgICAvLyAgICAgLy8gaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvV2hhdCtpcyt0aGUrQ29tcGFyZStPcmRlcitmb3IrQlNPTitUeXBlc1xuICAgIC8vICAgICAvLyBUT0RPIHdoYXQgaXMgdGhlIGNvcnJlY3Qgc29ydCBwb3NpdGlvbiBmb3IgSmF2YXNjcmlwdCBjb2RlP1xuICAgIC8vICAgICAvLyAoJzEwMCcgaW4gdGhlIG1hdHJpeCBiZWxvdylcbiAgICAvLyAgICAgLy8gVE9ETyBtaW5rZXkvbWF4a2V5XG4gICAgLy8gICAgIHJldHVybiBbLTEsIDEsIDIsIDMsIDQsIDUsIC0xLCA2LCA3LCA4LCAwLCA5LCAtMSwgMTAwLCAyLCAxMDAsIDEsIDgsIDFdW3RdO1xuICAgIC8vIH0sXG5cbiAgICAvLyBjb21wYXJlIHR3byB2YWx1ZXMgb2YgdW5rbm93biB0eXBlIGFjY29yZGluZyB0byBCU09OIG9yZGVyaW5nXG4gICAgLy8gc2VtYW50aWNzLiAoYXMgYW4gZXh0ZW5zaW9uLCBjb25zaWRlciAndW5kZWZpbmVkJyB0byBiZSBsZXNzIHRoYW5cbiAgICAvLyBhbnkgb3RoZXIgdmFsdWUuKVxuICAgIC8vIHJldHVybiBuZWdhdGl2ZSBpZiBhIGlzIGxlc3MsIHBvc2l0aXZlIGlmIGIgaXMgbGVzcywgb3IgMCBpZiBlcXVhbFxuICAgIF9jbXA6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGEpKSByZXR1cm4gYiA9PT0gdW5kZWZpbmVkID8gMCA6IC0xO1xuXG4gICAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGIpKSByZXR1cm4gMTtcblxuICAgICAgICAvLyB2YXIgdGEgPSBTZWxlY3Rvci5fZi5fdHlwZShhKTtcbiAgICAgICAgLy8gdmFyIHRiID0gU2VsZWN0b3IuX2YuX3R5cGUoYik7XG4gICAgICAgIC8vIHZhciBvYSA9IFNlbGVjdG9yLl9mLl90eXBlb3JkZXIodGEpO1xuICAgICAgICAvLyB2YXIgb2IgPSBTZWxlY3Rvci5fZi5fdHlwZW9yZGVyKHRiKTtcbiAgICAgICAgdmFyIGFUeXBlID0gQnNvblR5cGVzLmdldEJ5VmFsdWUoYSk7XG4gICAgICAgIHZhciBiVHlwZSA9IEJzb25UeXBlcy5nZXRCeVZhbHVlKGIpO1xuXG4gICAgICAgIGlmIChhVHlwZS5vcmRlciAhPT0gYlR5cGUub3JkZXIpIHJldHVybiBhVHlwZS5vcmRlciA8IGJUeXBlLm9yZGVyID8gLTEgOiAxO1xuXG4gICAgICAgIGlmIChhVHlwZS5udW1iZXIgIT09IGJUeXBlLm51bWJlcikge1xuICAgICAgICAgICAgLy8gVE9ETyBuZWVkIHRvIGltcGxlbWVudCB0aGlzIG9uY2Ugd2UgaW1wbGVtZW50IFN5bWJvbCBvclxuICAgICAgICAgICAgLy8gaW50ZWdlcnMsIG9yIG9uY2Ugd2UgaW1wbGVtZW50IGJvdGggRGF0ZSBhbmQgVGltZXN0YW1wXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIk1pc3NpbmcgdHlwZSBjb2VyY2lvbiBsb2dpYyBpbiBfY21wXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc051bWJlcihhKSkgcmV0dXJuIGEgLSBiO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcoYSkpIHJldHVybiBhIDwgYiA/IC0xIDogKGEgPT09IGIgPyAwIDogMSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Jvb2xlYW4oYSkpIHtcbiAgICAgICAgICAgIGlmIChhKSByZXR1cm4gYiA/IDAgOiAxO1xuXG4gICAgICAgICAgICByZXR1cm4gYiA/IC0xIDogMDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNBcnJheShhKSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IGEubGVuZ3RoKSByZXR1cm4gKGkgPT09IGIubGVuZ3RoKSA/IDAgOiAtMTtcblxuICAgICAgICAgICAgICAgIGlmIChpID09PSBiLmxlbmd0aCkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICB2YXIgcyA9IFNlbGVjdG9yLl9mLl9jbXAoYVtpXSwgYltpXSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocyAhPT0gMCkgcmV0dXJuIHM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTnVsbChhKSkgcmV0dXJuIDA7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1JlZ0V4cChhKSkgdGhyb3cgRXJyb3IoXCJTb3J0aW5nIG5vdCBzdXBwb3J0ZWQgb24gcmVndWxhciBleHByZXNzaW9uXCIpOyAvLyBUT0RPXG4gICAgICAgIFxuICAgICAgICAvLyBpZiAoXy5pc0Z1bmN0aW9uKGEpKSByZXR1cm4ge3R5cGU6IDEzLCBvcmRlcjogMTAwLCBmbmM6IF8uaXNGdW5jdGlvbn07XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1BsYWluT2JqZWN0KGEpKSB7XG4gICAgICAgICAgICB2YXIgdG9fYXJyYXkgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChvYmpba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBTZWxlY3Rvci5fZi5fY21wKHRvX2FycmF5KGEpLCB0b19hcnJheShiKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkb3VibGVcbiAgICAgICAgLy8gaWYgKHRhID09PSAxKSAgcmV0dXJuIGEgLSBiO1xuXG4gICAgICAgIC8vIHN0cmluZ1xuICAgICAgICAvLyBpZiAodGIgPT09IDIpIHJldHVybiBhIDwgYiA/IC0xIDogKGEgPT09IGIgPyAwIDogMSk7XG5cbiAgICAgICAgLy8gT2JqZWN0XG4gICAgICAgIC8vIGlmICh0YSA9PT0gMykge1xuICAgICAgICAvLyAgICAgLy8gdGhpcyBjb3VsZCBiZSBtdWNoIG1vcmUgZWZmaWNpZW50IGluIHRoZSBleHBlY3RlZCBjYXNlIC4uLlxuICAgICAgICAvLyAgICAgdmFyIHRvX2FycmF5ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAvLyAgICAgICAgIHZhciByZXQgPSBbXTtcblxuICAgICAgICAvLyAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgcmV0LnB1c2goa2V5KTtcbiAgICAgICAgLy8gICAgICAgICAgICAgcmV0LnB1c2gob2JqW2tleV0pO1xuICAgICAgICAvLyAgICAgICAgIH1cblxuICAgICAgICAvLyAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIC8vICAgICB9O1xuXG4gICAgICAgIC8vICAgICByZXR1cm4gU2VsZWN0b3IuX2YuX2NtcCh0b19hcnJheShhKSwgdG9fYXJyYXkoYikpO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gQXJyYXlcbiAgICAgICAgLy8gaWYgKHRhID09PSA0KSB7XG4gICAgICAgIC8vICAgICBmb3IgKHZhciBpID0gMDsgOyBpKyspIHtcbiAgICAgICAgLy8gICAgICAgICBpZiAoaSA9PT0gYS5sZW5ndGgpIHJldHVybiAoaSA9PT0gYi5sZW5ndGgpID8gMCA6IC0xO1xuXG4gICAgICAgIC8vICAgICAgICAgaWYgKGkgPT09IGIubGVuZ3RoKSByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgLy8gICAgICAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gYS5sZW5ndGggLSBiLmxlbmd0aDtcblxuICAgICAgICAvLyAgICAgICAgIHZhciBzID0gU2VsZWN0b3IuX2YuX2NtcChhW2ldLCBiW2ldKTtcblxuICAgICAgICAvLyAgICAgICAgIGlmIChzICE9PSAwKSByZXR1cm4gcztcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIDU6IGJpbmFyeSBkYXRhXG4gICAgICAgIC8vIDc6IG9iamVjdCBpZFxuXG4gICAgICAgIC8vIGJvb2xlYW5cbiAgICAgICAgLy8gaWYgKHRhID09PSA4KSB7XG4gICAgICAgIC8vICAgICBpZiAoYSkgcmV0dXJuIGIgPyAwIDogMTtcblxuICAgICAgICAvLyAgICAgcmV0dXJuIGIgPyAtMSA6IDA7XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyA5OiBkYXRlXG5cbiAgICAgICAgLy8gbnVsbFxuICAgICAgICAvLyBpZiAodGEgPT09IDEwKSByZXR1cm4gMDtcblxuICAgICAgICAvLyByZWdleHBcbiAgICAgICAgLy8gaWYgKHRhID09PSAxMSkge1xuICAgICAgICAvLyAgICAgdGhyb3cgRXJyb3IoXCJTb3J0aW5nIG5vdCBzdXBwb3J0ZWQgb24gcmVndWxhciBleHByZXNzaW9uXCIpOyAvLyBUT0RPXG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyAxMzogamF2YXNjcmlwdCBjb2RlXG4gICAgICAgIC8vIDE0OiBzeW1ib2xcbiAgICAgICAgLy8gMTU6IGphdmFzY3JpcHQgY29kZSB3aXRoIHNjb3BlXG4gICAgICAgIC8vIDE2OiAzMi1iaXQgaW50ZWdlclxuICAgICAgICAvLyAxNzogdGltZXN0YW1wXG4gICAgICAgIC8vIDE4OiA2NC1iaXQgaW50ZWdlclxuICAgICAgICAvLyAyNTU6IG1pbmtleVxuICAgICAgICAvLyAxMjc6IG1heGtleVxuXG4gICAgICAgIC8vIGphdmFzY3JpcHQgY29kZVxuICAgICAgICAvLyBpZiAodGEgPT09IDEzKSB7XG4gICAgICAgIC8vICAgICB0aHJvdyBFcnJvcihcIlNvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiBKYXZhc2NyaXB0IGNvZGVcIik7IC8vIFRPRE9cbiAgICAgICAgLy8gfVxuICAgIH1cbn07XG5cblNlbGVjdG9yLmlzQ29tcGlsZWQgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBpZiAoXy5pc05pbChzZWxlY3RvcikpIHJldHVybiBmYWxzZTtcbiAgICBcbiAgICBpZiAoc2VsZWN0b3IgaW5zdGFuY2VvZiBTZWxlY3Rvck1hdGNoZXIpIHJldHVybiB0cnVlO1xuICAgIFxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8vIFRydWUgaWYgdGhlIGdpdmVuIGRvY3VtZW50IG1hdGNoZXMgdGhlIGdpdmVuIHNlbGVjdG9yLlxuU2VsZWN0b3IuX21hdGNoZXMgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIGRvYykge1xuICAgIHJldHVybiBTZWxlY3Rvci5fY29tcGlsZVNlbGVjdG9yKHNlbGVjdG9yKS50ZXN0KGRvYyk7XG59O1xuXG5TZWxlY3Rvci5fY29tcGlsZVNlbGVjdG9yID0gZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICB2YXIgX3NlbGVjdG9yID0gbmV3IFNlbGVjdG9yTWF0Y2hlcih0aGlzKTtcblxuICAgIGlmIChfLmlzTmlsKHNlbGVjdG9yKSkge1xuICAgICAgICBMb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IG51bGwnKTtcbiAgICAgICAgXG4gICAgICAgIHNlbGVjdG9yID0ge307XG4gICAgfSBlbHNlIHtcbiAgICAgICAgTG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBub3QgbnVsbCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFzZWxlY3RvciB8fCBfLmhhc0luKHNlbGVjdG9yLCAnX2lkJykpIHtcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gZmFsc2UgdmFsdWUgfHwgeyBfaWQ6IGZhbHNlIHZhbHVlIH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFzZWxlY3Rvci5faWQpIHtcbiAgICAgICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IGZhbHNlIHZhbHVlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgc2VsZWN0b3IgPSB7XG4gICAgICAgICAgICAgICAgICAgIF9pZDogZmFsc2VcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IHsgX2lkOiBmYWxzZSB2YWx1ZSB9Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgc2VsZWN0b3IgPSB7XG4gICAgICAgICAgICAgICAgICAgIF9pZDogXy50b1N0cmluZyhzZWxlY3RvcilcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgICAgIExvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gZnVuY3Rpb24oZG9jKSB7IC4uLiB9Jyk7XG4gICAgICAgIFxuICAgICAgICBfaW5pdEZ1bmN0aW9uLmNhbGwoX3NlbGVjdG9yLCBzZWxlY3Rvcik7XG4gICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKHNlbGVjdG9yKSB8fCBfLmlzTnVtYmVyKHNlbGVjdG9yKSkge1xuICAgICAgICBMb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IFwiMTIzNDU2Nzg5XCIgfHwgMTIzNDU2Nzk4Jyk7XG4gICAgICAgIFxuICAgICAgICBzZWxlY3RvciA9IHtcbiAgICAgICAgICAgIF9pZDogc2VsZWN0b3JcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIF9pbml0T2JqZWN0LmNhbGwoX3NlbGVjdG9yLCBzZWxlY3Rvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgTG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiB7IGZpZWxkOiB2YWx1ZSB9Jyk7XG4gICAgICAgIFxuICAgICAgICBfaW5pdE9iamVjdC5jYWxsKF9zZWxlY3Rvciwgc2VsZWN0b3IpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gX3NlbGVjdG9yO1xufTtcblxuLyoqXG4gKiAuc29ydChcImZpZWxkMVwiKSAtPiBmaWVsZDEgYXNjXG4gKiAuc29ydChcImZpZWxkMSBkZXNjXCIpIC0+IGZpZWxkMSBkZXNjXG4gKiAuc29ydChcImZpZWxkMSBmaWVsZDJcIikgLT4gZmllbGQxIGFzYywgZmllbGQyIGFzY1xuICogLnNvcnQoXCJmaWVsZDEgLTFcIikgLT4gZmllbGQxIGRlc2NcbiAqIC5zb3J0KFwiZmllbGQxIC0xLCBmaWVsZDIgZGVzY1wiKSAtPiBmaWVsZDEgZGVzYywgZmllbGQyIGRlc2NcbiAqIC5zb3J0KFwiZmllbGQxIHRydWUsIGZpZWxkMiBmYWxzZVwiKSAtPiBmaWVsZDEgYXNjLCBmaWVsZDIgZGVzY1xuICogXG4gKiAuc29ydChbXCJmaWVsZDFcIl0pIC0+IGZpZWxkMSBhc2NcbiAqIC5zb3J0KFtcImZpZWxkMVwiLCBcImZpZWxkMiBkZXNjXCJdKSAtPiBmaWVsZDEgYXNjLCBmaWVsZDIgZGVzY1xuICogLnNvcnQoW1tcImZpZWxkMVwiLCAtMV0sIFtcImZpZWxkMlwiLCBcImFzY1wiXV0pIC0+IGZpZWxkMSBkZXNjLCBmaWVsZDIgYXNjXG4gKiBcbiAqIC5zb3J0KHtcImZpZWxkMVwiOiAtMSwgXCJmaWVsZDJcIjogXCJhc2NcIn0pIC0+IGZpZWxkMSBkZXNjLCBmaWVsZDIgYXNjXG4gKiBcbiAqL1xuLy9hcnIuc29ydChmdW5jdGlvbihhLCBiLCBjLCBkKSB7IGNvbnNvbGUubG9nKGEsIGIsIGMsIGQpOyByZXR1cm4gYSA8IGI7fSlcblNlbGVjdG9yLl9jb21waWxlU29ydCA9IGZ1bmN0aW9uIChzcGVjKSB7XG4gICAgaWYgKF8uaXNOaWwoc3BlYykpICB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICB2YXIgYXNjID0gW107XG4gICAgXG4gICAgaWYgKF8uaXNTdHJpbmcoc3BlYykpIHtcbiAgICAgICAgc3BlYyA9IHNwZWMucmVwbGFjZSgvKCApKy9pZywgJyAnKS50cmltKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoc3BlYy5pbmRleE9mKCcsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAvLyBSZXBsYWNlIGNvbW1hcyBieSBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICByZXR1cm4gU2VsZWN0b3IuX2NvbXBpbGVTb3J0KHNwZWMucmVwbGFjZSgvLC9pZywgJyAnKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3BlYy5pbmRleE9mKCcgJykgIT09IC0xKSB7XG4gICAgICAgICAgICB2YXIgZmllbGRzID0gc3BlYy5zcGxpdCgnICcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tpXS50cmltKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKChmaWVsZCA9PT0gJ2Rlc2MnICB8fCBmaWVsZCA9PT0gJ2FzYycpIHx8XG4gICAgICAgICAgICAgICAgICAgIChmaWVsZCA9PT0gJy0xJyAgICB8fCBmaWVsZCA9PT0gJzEnKSB8fFxuICAgICAgICAgICAgICAgICAgICAoZmllbGQgPT09ICdmYWxzZScgfHwgZmllbGQgPT09ICd0cnVlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCBzb3J0IHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5leHQgPSBfLnRvU3RyaW5nKGZpZWxkc1tpKzFdKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnZGVzYycgfHwgbmV4dCA9PT0gJ2FzYycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCgobmV4dCA9PT0gJ2FzYycpID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5leHQgPT09ICctMScgfHwgbmV4dCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNjLnB1c2goKG5leHQgPT09ICcxJykgPyB0cnVlIDogZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmV4dCA9PT0gJ2ZhbHNlJyB8fCBuZXh0ID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCgobmV4dCA9PT0gJ3RydWUnKSA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCh0cnVlKTsgLy8gRGVmYXVsdCBzb3J0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLy5zb3J0KFwiZmllbGQxXCIpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGtleXMucHVzaChzcGVjKTtcbiAgICAgICAgICAgIGFzYy5wdXNoKHRydWUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChfLmlzQXJyYXkoc3BlYykpIHtcbiAgICAgICAgLy8gSm9pbiB0aGUgYXJyYXkgd2l0aCBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgIHJldHVybiBTZWxlY3Rvci5fY29tcGlsZVNvcnQoc3BlYy5qb2luKCcgJykpO1xuICAgICAgICAvLyBmb3IgKHZhciBpID0gMDsgaSA8IHNwZWMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gICAgIGlmIChfLmlzU3RyaW5nKHNwZWNbaV0pKSB7XG4gICAgICAgIC8vICAgICAgICAga2V5cy5wdXNoKHNwZWNbaV0pO1xuICAgICAgICAvLyAgICAgICAgIGFzYy5wdXNoKHRydWUpO1xuICAgICAgICAvLyAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gICAgICAgICBrZXlzLnB1c2goc3BlY1tpXVswXSk7XG4gICAgICAgIC8vICAgICAgICAgYXNjLnB1c2goc3BlY1tpXVsxXSAhPT0gXCJkZXNjXCIpO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9XG4gICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3Qoc3BlYykpIHtcbiAgICAgICAgLy8gVE9ETyBOZXN0ZWQgcGF0aCAtPiAuc29ydCh7IFwiZmllbGQxLmZpZWxkMTJcIjogXCJhc2NcIiB9KVxuICAgICAgICB2YXIgX3NwZWMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNwZWMpIHtcbiAgICAgICAgICAgIGlmIChfLmhhc0luKHNwZWMsIGtleSkpIHtcbiAgICAgICAgICAgICAgICBfc3BlYy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgX3NwZWMucHVzaChzcGVjW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gU2VsZWN0b3IuX2NvbXBpbGVTb3J0KF9zcGVjKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCBzb3J0IHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgfVxuXG4gICAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLy8gcmV0dXJuIHtrZXlzOiBrZXlzLCBhc2M6IGFzY307XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaSAhPT0gMCAmJiB4ICE9PSAwKSByZXR1cm4geDsgICAvLyBOb24gcmVhY2hhYmxlP1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHggPSBTZWxlY3Rvci5fZi5fY21wKGFbSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSldLCBiW0pTT04uc3RyaW5naWZ5KGtleXNbaV0pXSk7XG4gICAgICAgICAgICB4ID0gU2VsZWN0b3IuX2YuX2NtcChhW2tleXNbaV1dLCBiW2tleXNbaV1dKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFhc2NbaV0pIHtcbiAgICAgICAgICAgICAgICB4ICo9IC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geDtcbiAgICB9O1xuICAgIFxuICAgIC8vIGV2YWwoKSBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZSBpbiBJRTgsIG5vciBkb2VzIHRoZSBzcGVjIHNheSBpdFxuICAgIC8vIHNob3VsZC4gQXNzaWduIHRvIGEgbG9jYWwgdG8gZ2V0IHRoZSB2YWx1ZSwgaW5zdGVhZC5cbiAgICBcbiAgICAvLyB2YXIgX2Z1bmM7XG4gICAgLy8gdmFyIGNvZGUgPSBcIl9mdW5jID0gKGZ1bmN0aW9uKGMpe3JldHVybiBmdW5jdGlvbihhLGIpe3ZhciB4O1wiO1xuICAgIC8vIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgICBpZiAoaSAhPT0gMCkge1xuICAgIC8vICAgICAgICAgY29kZSArPSBcImlmKHghPT0wKXJldHVybiB4O1wiO1xuICAgIC8vICAgICB9XG5cbiAgICAvLyAgICAgY29kZSArPSBcIng9XCIgKyAoYXNjW2ldID8gXCJcIiA6IFwiLVwiKSArIFwiYyhhW1wiICsgSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSkgKyBcIl0sYltcIiArIEpTT04uc3RyaW5naWZ5KGtleXNbaV0pICsgXCJdKTtcIjtcbiAgICAvLyB9XG5cbiAgICAvLyBjb2RlICs9IFwicmV0dXJuIHg7fTt9KVwiO1xuXG4gICAgLy8gZXZhbChjb2RlKTtcblxuICAgIC8vIHJldHVybiBfZnVuYyhTZWxlY3Rvci5fZi5fY21wKTtcbn07XG5cblNlbGVjdG9yLl9jb21waWxlRmllbGRzID0gZnVuY3Rpb24gKHNwZWMpIHtcbiAgICB2YXIgcHJvamVjdGlvbiA9IHt9O1xuICAgIFxuICAgIGlmIChfLmlzU3RyaW5nKHNwZWMpKSB7XG4gICAgICAgIHNwZWMgPSBzcGVjLnJlcGxhY2UoLyggKSsvaWcsICcgJykudHJpbSgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHNwZWMuaW5kZXhPZignLCcpICE9PSAtMSkge1xuICAgICAgICAgICAgLy8gUmVwbGFjZSBjb21tYXMgYnkgc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgcmV0dXJuIFNlbGVjdG9yLl9jb21waWxlRmllbGRzKHNwZWMucmVwbGFjZSgvLC9pZywgJyAnKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3BlYy5pbmRleE9mKCcgJykgIT09IC0xKSB7XG4gICAgICAgICAgICB2YXIgZmllbGRzID0gc3BlYy5zcGxpdCgnICcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tpXS50cmltKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKChmaWVsZCA9PT0gJy0xJyAgICB8fCBmaWVsZCA9PT0gJzEnKSB8fFxuICAgICAgICAgICAgICAgICAgICAoZmllbGQgPT09ICdmYWxzZScgfHwgZmllbGQgPT09ICd0cnVlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCBmaWVsZHMgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IF8udG9TdHJpbmcoZmllbGRzW2krMV0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICctMScgfHwgbmV4dCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCA9PT0gJy0xJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZCA9PT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHByb2plY3Rpb24gY2Fubm90IGNvbnRhaW4gYm90aCBpbmNsdWRlIGFuZCBleGNsdWRlIHNwZWNpZmljYXRpb25zXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmV4dCA9PT0gJ2ZhbHNlJyB8fCBuZXh0ID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkID09PSAnX2lkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkEgcHJvamVjdGlvbiBjYW5ub3QgY29udGFpbiBib3RoIGluY2x1ZGUgYW5kIGV4Y2x1ZGUgc3BlY2lmaWNhdGlvbnNcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChzcGVjLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vLmZpbmQoe30sIFwiZmllbGQxXCIpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHByb2plY3Rpb25bc3BlY10gPSAxO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChfLmlzQXJyYXkoc3BlYykpIHtcbiAgICAgICAgLy8gSm9pbiB0aGUgYXJyYXkgd2l0aCBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgIHJldHVybiBTZWxlY3Rvci5fY29tcGlsZUZpZWxkcyhzcGVjLmpvaW4oJyAnKSk7XG4gICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3Qoc3BlYykpIHtcbiAgICAgICAgLy8gVE9ETyBOZXN0ZWQgcGF0aCAtPiAuc29ydCh7IFwiZmllbGQxLmZpZWxkMTJcIjogXCJhc2NcIiB9KVxuICAgICAgICB2YXIgX3NwZWMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNwZWMpIHtcbiAgICAgICAgICAgIGlmIChfLmhhc0luKHNwZWMsIGtleSkpIHtcbiAgICAgICAgICAgICAgICBfc3BlYy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgX3NwZWMucHVzaChzcGVjW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gU2VsZWN0b3IuX2NvbXBpbGVGaWVsZHMoX3NwZWMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiQmFkIHNvcnQgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHByb2plY3Rpb247XG59O1xuXG4vLyBUT0RPIGltcGxlbWVudCBvcmRpbmFsIGluZGV4aW5nOiAncGVvcGxlLjIubmFtZSdcblxuU2VsZWN0b3IuX2V4cHJGb3JTZWxlY3RvciA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIExvZ2dlci5kZWJ1ZygnQ2FsbGVkOiBfZXhwckZvclNlbGVjdG9yJyk7XG4gICAgXG4gICAgdmFyIGNsYXVzZXMgPSBbXTtcbiAgICBcbiAgICBmb3IgKHZhciBrZXkgaW4gc2VsZWN0b3IpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gc2VsZWN0b3Jba2V5XTtcbiAgICAgICAgXG4gICAgICAgIGlmIChrZXkuY2hhckF0KDApID09PSAnJCcpIHtcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gb3BlcmF0b3IgPT4geyAkYW5kOiBbey4uLn0sIHsuLi59XSB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZXMucHVzaChTZWxlY3Rvci5fZXhwckZvckRvY3VtZW50UHJlZGljYXRlKGtleSwgdmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gcGxhaW4gPT4geyBmaWVsZDE6IDx2YWx1ZT4gfScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2VzLnB1c2goU2VsZWN0b3IuX2V4cHJGb3JLZXlwYXRoUHJlZGljYXRlKGtleSwgdmFsdWUpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gY2xhdXNlcztcbn07XG5cblNlbGVjdG9yLl9leHByRm9yRG9jdW1lbnRQcmVkaWNhdGUgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgdmFyIGNsYXVzZSA9IHt9O1xuICAgIFxuICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgIGNhc2UgJyRvcic6XG4gICAgICAgICAgICBjbGF1c2Uua2V5ID0gJ29yJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhlIHJlc3Qgd2lsbCBiZSBoYW5kbGVkIGJ5ICdfb3BlcmF0b3JfJ1xuICAgICAgICBjYXNlICckYW5kJzpcbiAgICAgICAgICAgIGNsYXVzZS5rZXkgPSAnYW5kJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhlIHJlc3Qgd2lsbCBiZSBoYW5kbGVkIGJ5ICdfb3BlcmF0b3JfJ1xuICAgICAgICBjYXNlICckbm9yJzpcbiAgICAgICAgICAgIGNsYXVzZS5rZXkgPSAnbm9yJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhlIHJlc3Qgd2lsbCBiZSBoYW5kbGVkIGJ5ICdfb3BlcmF0b3JfJ1xuICAgICAgICBjYXNlICdfb3BlcmF0b3JfJzpcbiAgICAgICAgICAgIC8vIEdlbmVyaWMgaGFuZGxlciBmb3Igb3BlcmF0b3JzICgkb3IsICRhbmQsICRub3IpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS5raW5kID0gJ29wZXJhdG9yJztcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ2FycmF5JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNsYXVzZXMgPSBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXy5mb3JFYWNoKHZhbHVlLCBmdW5jdGlvbihfdmFsKSB7XG4gICAgICAgICAgICAgICAgY2xhdXNlcy5wdXNoKFNlbGVjdG9yLl9leHByRm9yU2VsZWN0b3IoX3ZhbCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS52YWx1ZSA9IGNsYXVzZXM7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJVbnJlY29naXplZCBrZXkgaW4gc2VsZWN0b3I6IFwiLCBrZXkpO1xuICAgIH1cbiAgICBcbiAgICAvLyBUT0RPIGNhc2VzOiAkd2hlcmUsICRlbGVtTWF0Y2hcbiAgICBcbiAgICBMb2dnZXIuZGVidWcoJ2NsYXVzZSBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY2xhdXNlKSk7XG4gICAgXG4gICAgcmV0dXJuIGNsYXVzZTtcbn07XG5cblNlbGVjdG9yLl9leHByRm9yS2V5cGF0aFByZWRpY2F0ZSA9IGZ1bmN0aW9uIChrZXlwYXRoLCB2YWx1ZSkge1xuICAgIExvZ2dlci5kZWJ1ZygnQ2FsbGVkOiBfZXhwckZvcktleXBhdGhQcmVkaWNhdGUnKTtcbiAgICBcbiAgICB2YXIgY2xhdXNlID0ge307XG4gICAgXG4gICAgY2xhdXNlLnZhbHVlID0gdmFsdWU7XG4gICAgXG4gICAgaWYgKF8uaXNOaWwodmFsdWUpKSB7XG4gICAgICAgIExvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgbnVsbCcpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnbnVsbCc7XG4gICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgICBMb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIFJlZ0V4cCcpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAncmVnZXhwJztcbiAgICB9IGVsc2UgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgTG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBBcnJheScpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnYXJyYXknO1xuICAgIH0gZWxzZSBpZiAoXy5pc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgTG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBTdHJpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ3N0cmluZyc7XG4gICAgfSBlbHNlIGlmIChfLmlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICBMb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIE51bWJlcicpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnbnVtYmVyJztcbiAgICB9IGVsc2UgaWYgKF8uaXNCb29sZWFuKHZhbHVlKSkge1xuICAgICAgICBMb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIEJvb2xlYW4nKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ2Jvb2xlYW4nO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICBMb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIEZ1bmN0aW9uJyk7XG4gICAgICAgIFxuICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCB2YWx1ZSB0eXBlIGluIHF1ZXJ5XCIpO1xuICAgIH0gZWxzZSBpZiAoXy5pc1BsYWluT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICB2YXIgbGl0ZXJhbE9iamVjdCA9IHRydWU7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGtleS5jaGFyQXQoMCkgPT09ICckJykge1xuICAgICAgICAgICAgICAgIGxpdGVyYWxPYmplY3QgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGxpdGVyYWxPYmplY3QpIHtcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgT2JqZWN0ID0+IHsgZmllbGQ6IHsgZmllbGRfMTogPHZhbHVlPiwgZmllbGRfMjogPHZhbHVlPiB9IH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnbGl0ZXJhbF9vYmplY3QnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBPcGVyYXRvciA9PiB7IGZpZWxkOiB7ICRndDogMiwgJGx0IDUgfSB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ29wZXJhdG9yX29iamVjdCc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgdmFyIHBhcnRzID0ga2V5cGF0aC5zcGxpdCgnLicpO1xuICAgIGlmIChwYXJ0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIExvZ2dlci5kZWJ1ZygnY2xhdXNlIG92ZXIgT2JqZWN0IGZpZWxkID0+IHsgXCJmaWVsZDEuZmllbGQxXzJcIjogPHZhbHVlPiB9Jyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2Uua2luZCA9ICdvYmplY3QnO1xuICAgICAgICBjbGF1c2Uua2V5ID0gcGFydHM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgTG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb3ZlciBQbGFpbiBmaWVsZCA9PiB7IFwiZmllbGRcIjogPHZhbHVlPiB9Jyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2Uua2luZCA9ICdwbGFpbic7XG4gICAgICAgIGNsYXVzZS5rZXkgPSBwYXJ0c1swXTtcbiAgICB9XG4gICAgXG4gICAgTG9nZ2VyLmRlYnVnKCdjbGF1c2UgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KGNsYXVzZSkpO1xuICAgIFxuICAgIHJldHVybiBjbGF1c2U7XG59O1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xudmFyIF9pbml0T2JqZWN0ID0gZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICBMb2dnZXIuZGVidWcoJ0NhbGxlZDogX2luaXRPYmplY3QnKTtcbiAgICBcbiAgICB0aGlzLmNsYXVzZXMgPSBTZWxlY3Rvci5fZXhwckZvclNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBcbiAgICBMb2dnZXIuZGVidWcoJ2NsYXVzZXMgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMuY2xhdXNlcykpO1xufTtcblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbnZhciBfaW5pdEZ1bmN0aW9uID0gZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICB0aGlzLmNsYXVzZXMucHVzaCh7XG4gICAgICAgIGtpbmQ6ICdmdW5jdGlvbicsXG4gICAgICAgIHZhbHVlOiBzZWxlY3RvclxuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvcjsiXX0=
