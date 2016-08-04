"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Logger = require("jsw-logger"),
    _ = require("lodash"),
    SelectorMatcher = require("./SelectorMatcher"),
    ObjectId = require("./ObjectId");

var logger = null;

var Selector = function () {
    function Selector(selector) {
        var type = arguments.length <= 1 || arguments[1] === undefined ? Selector.MATCH_SELECTOR : arguments[1];

        _classCallCheck(this, Selector);

        logger = Logger.instance;

        this.selector_compiled = null;

        if (type === Selector.MATCH_SELECTOR) {
            this.selector_compiled = this.compile(selector);
        } else if (type === Selector.SORT_SELECTOR) {
            return this.compileSort(selector);
        } else if (type === Selector.FIELD_SELECTOR) {
            return this.compileFields(selector, false);
        } else if (type === Selector.AGG_FIELD_SELECTOR) {
            return this.compileFields(selector, true);
        } else {
            logger.throw("You need to specify the selector type");
        }
    }

    _createClass(Selector, [{
        key: "test",
        value: function test(doc) {
            return this.selector_compiled.test(doc);
        }
    }, {
        key: "compile",
        value: function compile(selector) {
            if (_.isNil(selector)) {
                logger.debug('selector -> null');

                selector = {};
            } else {
                logger.debug('selector -> not null');

                if (!selector || _.hasIn(selector, '_id') && !selector._id) {
                    logger.debug('selector -> false value || { _id: false value }');

                    selector = {
                        _id: false
                    };
                }
            }

            if (_.isFunction(selector)) {
                logger.debug('selector -> function(doc) { ... }');

                //_initFunction.call(matcher, selector);
                this.clauses = [{
                    kind: 'function',
                    value: selector
                }];

                logger.debug('clauses created: ' + JSON.stringify(this.clauses));
            } else if (_.isString(selector) || _.isNumber(selector)) {
                logger.debug('selector -> "123456789" || 123456798');

                selector = {
                    _id: selector
                };

                //_initObject.call(matcher, selector);
                this.clauses = _buildSelector(selector);

                logger.debug('clauses created: ' + JSON.stringify(this.clauses));
            } else {
                logger.debug('selector -> { field: value }');

                //_initObject.call(matcher, selector);
                this.clauses = _buildSelector(selector);

                logger.debug('clauses created: ' + JSON.stringify(this.clauses));
            }

            var matcher = new SelectorMatcher(this);

            return matcher;
        }
    }, {
        key: "compileSort",
        value: function compileSort(spec) {
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
                    return this.compileSort(spec.replace(/,/ig, ' '));
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
                return this.compileSort(spec.join(' '));
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

                    return this.compileSort(_spec);
                } else {
                    throw Error("Bad sort specification: ", JSON.stringify(spec));
                }

            // return {keys: keys, asc: asc};
            return function (a, b) {
                var x = 0;

                for (var i = 0; i < keys.length; i++) {
                    if (i !== 0 && x !== 0) return x; // Non reachable?

                    // x = Selector._f._cmp(a[JSON.stringify(keys[i])], b[JSON.stringify(keys[i])]);
                    x = SelectorMatcher.cmp(a[keys[i]], b[keys[i]]);

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
        }
    }, {
        key: "compileFields",
        value: function compileFields(spec, aggregation) {
            var projection = {};

            if (_.isNil(spec)) return projection;

            if (_.isString(spec)) {
                // trim surrounding and inner spaces
                spec = spec.replace(/( )+/ig, ' ').trim();

                // Replace the commas by spaces
                if (spec.indexOf(',') !== -1) {
                    // Replace commas by spaces, and treat it as a spaced-separated string
                    return this.compileFields(spec.replace(/,/ig, ' '), aggregation);
                } else if (spec.indexOf(' ') !== -1) {
                    var fields = spec.split(' ');

                    for (var i = 0; i < fields.length; i++) {
                        // Get the field from the spec (we will be working with pairs)
                        var field = fields[i].trim();

                        // If the first is not a field, throw error
                        if (field === '-1' || field === '1' || field === 'false' || field === 'true') {

                            throw Error("Bad fields specification: ", JSON.stringify(spec));
                        } else {
                            // Get the next item of the pair
                            var next = _.toString(fields[i + 1]);

                            if (next === '-1' || next === '1') {
                                if (next === '-1') {
                                    for (var _key in projection) {
                                        if (field !== '_id' && projection[_key] === 1) {
                                            throw new Error("A projection cannot contain both include and exclude specifications");
                                        }
                                    }

                                    projection[field] = -1;
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
                            } else if (aggregation && next.indexOf('$') === 0) {
                                projection[field] = next.replace('$', '');

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
                return this.compileFields(spec.join(' '), aggregation);
            } else if (_.isPlainObject(spec)) {
                // TODO Nested path -> .find({}, { "field1.field12": "asc" })
                var _spec = [];
                for (var key in spec) {
                    if (_.hasIn(spec, key)) {
                        _spec.push(key);
                        _spec.push(spec[key]);
                    }
                }

                return this.compileFields(_spec, aggregation);
            } else {
                throw Error("Bad fields specification: ", JSON.stringify(spec));
            }

            return projection;
        }

        /* STATIC METHODS */

    }], [{
        key: "isSelectorCompiled",
        value: function isSelectorCompiled(selector) {
            if (!_.isNil(selector) && (selector instanceof SelectorMatcher || selector instanceof Selector && selector.selector_compiled instanceof SelectorMatcher)) {
                return true;
            } else {
                return false;
            }
        }
    }, {
        key: "matches",
        value: function matches(selector, doc) {
            return new Selector(selector).test(doc);
        }
    }]);

    return Selector;
}();

var _buildSelector = function _buildSelector(selector) {
    logger.debug('Called: _buildSelector');

    var clauses = [];

    for (var key in selector) {
        var value = selector[key];

        if (key.charAt(0) === '$') {
            logger.debug('selector -> operator => { $and: [{...}, {...}] }');

            clauses.push(_buildDocumentSelector(key, value));
        } else {
            logger.debug('selector -> plain => { field1: <value> }');

            clauses.push(_buildKeypathSelector(key, value));
        }
    }

    return clauses;
};

var _buildDocumentSelector = function _buildDocumentSelector(key, value) {
    var clause = {};

    switch (key) {
        case '$or':
        case '$and':
        case '$nor':
            clause.key = key.replace(/\$/, '');
        // The rest will be handled by '_operator_'
        case '_operator_':
            // Generic handler for operators ($or, $and, $nor)

            clause.kind = 'operator';
            clause.type = 'array';

            clause.value = [];
            for (var i = 0; i < value.length; i++) {
                clause.value = _.union(clause.value, _buildSelector(value[i]));
            }

            break;
        default:
            throw Error("Unrecogized key in selector: ", key);
    }

    // TODO cases: $where, $elemMatch

    logger.debug('clause created: ' + JSON.stringify(clause));

    return clause;
};

var _buildKeypathSelector = function _buildKeypathSelector(keypath, value) {
    logger.debug('Called: _buildKeypathSelector');

    var clause = {};

    clause.value = value;

    if (_.isNil(value)) {
        logger.debug('clause of type null');

        clause.type = 'null';
    } else if (_.isRegExp(value)) {
        logger.debug('clause of type RegExp');

        clause.type = 'regexp';

        var source = value.toString().split('/');

        clause.value = {
            $regex: source[1] // The first item splitted is an empty string
        };

        if (source[2] != "") {
            clause.value["$options"] = source[2];
        }
    } else if (_.isArray(value)) {
        logger.debug('clause of type Array');

        clause.type = 'array';
    } else if (_.isString(value)) {
        logger.debug('clause of type String');

        clause.type = 'string';
    } else if (_.isNumber(value)) {
        logger.debug('clause of type Number');

        clause.type = 'number';
    } else if (_.isBoolean(value)) {
        logger.debug('clause of type Boolean');

        clause.type = 'boolean';
    } else if (_.isFunction(value)) {
        logger.debug('clause of type Function');

        clause.type = 'function';
    } else if (_.isPlainObject(value)) {
        var literalObject = true;
        for (var key in value) {
            if (key.charAt(0) === '$') {
                literalObject = false;
                break;
            }
        }

        if (literalObject) {
            logger.debug('clause of type Object => { field: { field_1: <value>, field_2: <value> } }');

            clause.type = 'literal_object';
        } else {
            logger.debug('clause of type Operator => { field: { $gt: 2, $lt 5 } }');

            clause.type = 'operator_object';
        }
    } else if (value instanceof ObjectId) {
        logger.debug('clause of type ObjectId -> String');

        clause.type = 'string';
        clause.value = value.toString();
    } else {
        clause.type = '__invalid__';
    }

    var parts = keypath.split('.');
    if (parts.length > 1) {
        logger.debug('clause over Object field => { "field1.field1_2": <value> }');

        clause.kind = 'object';
        clause.key = parts;
    } else {
        logger.debug('clause over Plain field => { "field": <value> }');

        clause.kind = 'plain';
        clause.key = parts[0];
    }

    logger.debug('clause created: ' + JSON.stringify(clause));

    return clause;
};

Selector.MATCH_SELECTOR = 'match';
Selector.SORT_SELECTOR = 'sort';
Selector.FIELD_SELECTOR = 'field';
Selector.AGG_FIELD_SELECTOR = 'project';

module.exports = Selector;
//# sourceMappingURL=data:application/json;base64,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LEtBQVAsR0FBZSxNQUFNLFFBQU4sRUFBZjtBQUNILEtBTE0sTUFLQTtBQUNILGVBQU8sSUFBUCxHQUFjLGFBQWQ7QUFDSDs7QUFFRCxRQUFJLFFBQVEsUUFBUSxLQUFSLENBQWMsR0FBZCxDQUFaO0FBQ0EsUUFBSSxNQUFNLE1BQU4sR0FBZSxDQUFuQixFQUFzQjtBQUNsQixlQUFPLEtBQVAsQ0FBYSw0REFBYjs7QUFFQSxlQUFPLElBQVAsR0FBYyxRQUFkO0FBQ0EsZUFBTyxHQUFQLEdBQWEsS0FBYjtBQUNILEtBTEQsTUFLTztBQUNILGVBQU8sS0FBUCxDQUFhLGlEQUFiOztBQUVBLGVBQU8sSUFBUCxHQUFjLE9BQWQ7QUFDQSxlQUFPLEdBQVAsR0FBYSxNQUFNLENBQU4sQ0FBYjtBQUNIOztBQUVELFdBQU8sS0FBUCxDQUFhLHFCQUFxQixLQUFLLFNBQUwsQ0FBZSxNQUFmLENBQWxDOztBQUVBLFdBQU8sTUFBUDtBQUNILENBeEZEOztBQTBGQSxTQUFTLGNBQVQsR0FBMEIsT0FBMUI7QUFDQSxTQUFTLGFBQVQsR0FBeUIsTUFBekI7QUFDQSxTQUFTLGNBQVQsR0FBMEIsT0FBMUI7QUFDQSxTQUFTLGtCQUFULEdBQThCLFNBQTlCOztBQUVBLE9BQU8sT0FBUCxHQUFpQixRQUFqQiIsImZpbGUiOiJTZWxlY3Rvci5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBMb2dnZXIgPSByZXF1aXJlKFwianN3LWxvZ2dlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKSxcbiAgICBTZWxlY3Rvck1hdGNoZXIgPSByZXF1aXJlKFwiLi9TZWxlY3Rvck1hdGNoZXJcIiksXG4gICAgT2JqZWN0SWQgPSByZXF1aXJlKFwiLi9PYmplY3RJZFwiKTtcbiAgICBcbnZhciBsb2dnZXIgPSBudWxsO1xuXG5jbGFzcyBTZWxlY3RvciB7XG4gICAgY29uc3RydWN0b3Ioc2VsZWN0b3IsIHR5cGUgPSBTZWxlY3Rvci5NQVRDSF9TRUxFQ1RPUikge1xuICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkID0gbnVsbDtcblx0XHRcblx0XHRpZiAodHlwZSA9PT0gU2VsZWN0b3IuTUFUQ0hfU0VMRUNUT1IpIHtcblx0XHRcdHRoaXMuc2VsZWN0b3JfY29tcGlsZWQgPSB0aGlzLmNvbXBpbGUoc2VsZWN0b3IpO1xuXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gU2VsZWN0b3IuU09SVF9TRUxFQ1RPUikge1xuXHRcdFx0cmV0dXJuIHRoaXMuY29tcGlsZVNvcnQoc2VsZWN0b3IpO1xuXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gU2VsZWN0b3IuRklFTERfU0VMRUNUT1IpIHtcblx0XHRcdHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoc2VsZWN0b3IsIGZhbHNlKTtcblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFNlbGVjdG9yLkFHR19GSUVMRF9TRUxFQ1RPUikge1xuXHRcdFx0cmV0dXJuIHRoaXMuY29tcGlsZUZpZWxkcyhzZWxlY3RvciwgdHJ1ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvZ2dlci50aHJvdyhcIllvdSBuZWVkIHRvIHNwZWNpZnkgdGhlIHNlbGVjdG9yIHR5cGVcIik7XG5cdFx0fVxuICAgIH1cbiAgICBcbiAgICB0ZXN0KGRvYykge1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3Rvcl9jb21waWxlZC50ZXN0KGRvYyk7XG4gICAgfVxuICAgIFxuICAgIGNvbXBpbGUoc2VsZWN0b3IpIHtcblx0XHRpZiAoXy5pc05pbChzZWxlY3RvcikpIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gbnVsbCcpO1xuXHRcdFx0XG5cdFx0XHRzZWxlY3RvciA9IHt9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IG5vdCBudWxsJyk7XG5cdFx0XHRcblx0XHRcdGlmICghc2VsZWN0b3IgfHwgKF8uaGFzSW4oc2VsZWN0b3IsICdfaWQnKSAmJiAhc2VsZWN0b3IuX2lkKSkge1xuXHRcdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IGZhbHNlIHZhbHVlIHx8IHsgX2lkOiBmYWxzZSB2YWx1ZSB9Jyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRzZWxlY3RvciA9IHtcblx0XHRcdFx0XHRfaWQ6IGZhbHNlXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG5cdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IGZ1bmN0aW9uKGRvYykgeyAuLi4gfScpO1xuXHRcdFx0XG5cdFx0XHQvL19pbml0RnVuY3Rpb24uY2FsbChtYXRjaGVyLCBzZWxlY3Rvcik7XG5cdFx0XHR0aGlzLmNsYXVzZXMgPSBbe1xuXHRcdFx0XHRraW5kOiAnZnVuY3Rpb24nLFxuXHRcdFx0XHR2YWx1ZTogc2VsZWN0b3Jcblx0XHRcdH1dO1xuXHRcdFx0XG5cdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZXMgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMuY2xhdXNlcykpO1xuXHRcdH0gZWxzZSBpZiAoXy5pc1N0cmluZyhzZWxlY3RvcikgfHwgXy5pc051bWJlcihzZWxlY3RvcikpIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gXCIxMjM0NTY3ODlcIiB8fCAxMjM0NTY3OTgnKTtcblx0XHRcdFxuXHRcdFx0c2VsZWN0b3IgPSB7XG5cdFx0XHRcdF9pZDogc2VsZWN0b3Jcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdC8vX2luaXRPYmplY3QuY2FsbChtYXRjaGVyLCBzZWxlY3Rvcik7XG5cdFx0XHR0aGlzLmNsYXVzZXMgPSBfYnVpbGRTZWxlY3RvcihzZWxlY3Rvcik7XG5cdFx0XHRcblx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlcyBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkodGhpcy5jbGF1c2VzKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4geyBmaWVsZDogdmFsdWUgfScpO1xuXHRcdFx0XG5cdFx0XHQvL19pbml0T2JqZWN0LmNhbGwobWF0Y2hlciwgc2VsZWN0b3IpO1xuXHRcdFx0dGhpcy5jbGF1c2VzID0gX2J1aWxkU2VsZWN0b3Ioc2VsZWN0b3IpO1xuXHRcdFx0XG5cdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZXMgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMuY2xhdXNlcykpO1xuXHRcdH1cblx0XHRcblx0XHR2YXIgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXIodGhpcyk7XG5cdFx0XG5cdFx0cmV0dXJuIG1hdGNoZXI7XG4gICAgfVxuICAgIFxuICAgIGNvbXBpbGVTb3J0KHNwZWMpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoc3BlYykpICB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgdmFyIGFzYyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcoc3BlYykpIHtcbiAgICAgICAgICAgIHNwZWMgPSBzcGVjLnJlcGxhY2UoLyggKSsvaWcsICcgJykudHJpbSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc3BlYy5pbmRleE9mKCcsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVwbGFjZSBjb21tYXMgYnkgc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KHNwZWMucmVwbGFjZSgvLC9pZywgJyAnKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNwZWMuaW5kZXhPZignICcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZHMgPSBzcGVjLnNwbGl0KCcgJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpZWxkID0gZmllbGRzW2ldLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZmllbGQgPT09ICdkZXNjJyAgfHwgZmllbGQgPT09ICdhc2MnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGZpZWxkID09PSAnLTEnICAgIHx8IGZpZWxkID09PSAnMScpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoZmllbGQgPT09ICdmYWxzZScgfHwgZmllbGQgPT09ICd0cnVlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHNvcnQgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gXy50b1N0cmluZyhmaWVsZHNbaSsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnZGVzYycgfHwgbmV4dCA9PT0gJ2FzYycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKChuZXh0ID09PSAnYXNjJykgPyB0cnVlIDogZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmV4dCA9PT0gJy0xJyB8fCBuZXh0ID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKChuZXh0ID09PSAnMScpID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5leHQgPT09ICdmYWxzZScgfHwgbmV4dCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGZpZWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCgobmV4dCA9PT0gJ3RydWUnKSA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKHRydWUpOyAvLyBEZWZhdWx0IHNvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8uc29ydChcImZpZWxkMVwiKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGtleXMucHVzaChzcGVjKTtcbiAgICAgICAgICAgICAgICBhc2MucHVzaCh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChfLmlzQXJyYXkoc3BlYykpIHtcbiAgICAgICAgICAgIC8vIEpvaW4gdGhlIGFycmF5IHdpdGggc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZVNvcnQoc3BlYy5qb2luKCcgJykpO1xuICAgICAgICAgICAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBzcGVjLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyAgICAgaWYgKF8uaXNTdHJpbmcoc3BlY1tpXSkpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAga2V5cy5wdXNoKHNwZWNbaV0pO1xuICAgICAgICAgICAgLy8gICAgICAgICBhc2MucHVzaCh0cnVlKTtcbiAgICAgICAgICAgIC8vICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gICAgICAgICBrZXlzLnB1c2goc3BlY1tpXVswXSk7XG4gICAgICAgICAgICAvLyAgICAgICAgIGFzYy5wdXNoKHNwZWNbaV1bMV0gIT09IFwiZGVzY1wiKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc1BsYWluT2JqZWN0KHNwZWMpKSB7XG4gICAgICAgICAgICAvLyBUT0RPIE5lc3RlZCBwYXRoIC0+IC5zb3J0KHsgXCJmaWVsZDEuZmllbGQxMlwiOiBcImFzY1wiIH0pXG4gICAgICAgICAgICB2YXIgX3NwZWMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcGVjKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaGFzSW4oc3BlYywga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBfc3BlYy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goc3BlY1trZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KF9zcGVjKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHNvcnQgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICAvLyByZXR1cm4ge2tleXM6IGtleXMsIGFzYzogYXNjfTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIHZhciB4ID0gMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgIT09IDAgJiYgeCAhPT0gMCkgcmV0dXJuIHg7ICAgLy8gTm9uIHJlYWNoYWJsZT9cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyB4ID0gU2VsZWN0b3IuX2YuX2NtcChhW0pTT04uc3RyaW5naWZ5KGtleXNbaV0pXSwgYltKU09OLnN0cmluZ2lmeShrZXlzW2ldKV0pO1xuICAgICAgICAgICAgICAgIHggPSBTZWxlY3Rvck1hdGNoZXIuY21wKGFba2V5c1tpXV0sIGJba2V5c1tpXV0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghYXNjW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIHggKj0gLTE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIGV2YWwoKSBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZSBpbiBJRTgsIG5vciBkb2VzIHRoZSBzcGVjIHNheSBpdFxuICAgICAgICAvLyBzaG91bGQuIEFzc2lnbiB0byBhIGxvY2FsIHRvIGdldCB0aGUgdmFsdWUsIGluc3RlYWQuXG4gICAgICAgIFxuICAgICAgICAvLyB2YXIgX2Z1bmM7XG4gICAgICAgIC8vIHZhciBjb2RlID0gXCJfZnVuYyA9IChmdW5jdGlvbihjKXtyZXR1cm4gZnVuY3Rpb24oYSxiKXt2YXIgeDtcIjtcbiAgICAgICAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vICAgICBpZiAoaSAhPT0gMCkge1xuICAgICAgICAvLyAgICAgICAgIGNvZGUgKz0gXCJpZih4IT09MClyZXR1cm4geDtcIjtcbiAgICAgICAgLy8gICAgIH1cbiAgICBcbiAgICAgICAgLy8gICAgIGNvZGUgKz0gXCJ4PVwiICsgKGFzY1tpXSA/IFwiXCIgOiBcIi1cIikgKyBcImMoYVtcIiArIEpTT04uc3RyaW5naWZ5KGtleXNbaV0pICsgXCJdLGJbXCIgKyBKU09OLnN0cmluZ2lmeShrZXlzW2ldKSArIFwiXSk7XCI7XG4gICAgICAgIC8vIH1cbiAgICBcbiAgICAgICAgLy8gY29kZSArPSBcInJldHVybiB4O307fSlcIjtcbiAgICBcbiAgICAgICAgLy8gZXZhbChjb2RlKTtcbiAgICBcbiAgICAgICAgLy8gcmV0dXJuIF9mdW5jKFNlbGVjdG9yLl9mLl9jbXApO1xuICAgIH1cbiAgICBcbiAgICBjb21waWxlRmllbGRzKHNwZWMsIGFnZ3JlZ2F0aW9uKSB7XG4gICAgICAgIHZhciBwcm9qZWN0aW9uID0ge307XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChzcGVjKSkgcmV0dXJuIHByb2plY3Rpb247XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1N0cmluZyhzcGVjKSkge1xuICAgICAgICAgICAgLy8gdHJpbSBzdXJyb3VuZGluZyBhbmQgaW5uZXIgc3BhY2VzXG4gICAgICAgICAgICBzcGVjID0gc3BlYy5yZXBsYWNlKC8oICkrL2lnLCAnICcpLnRyaW0oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVwbGFjZSB0aGUgY29tbWFzIGJ5IHNwYWNlc1xuICAgICAgICAgICAgaWYgKHNwZWMuaW5kZXhPZignLCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIFJlcGxhY2UgY29tbWFzIGJ5IHNwYWNlcywgYW5kIHRyZWF0IGl0IGFzIGEgc3BhY2VkLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKHNwZWMucmVwbGFjZSgvLC9pZywgJyAnKSwgYWdncmVnYXRpb24pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVjLmluZGV4T2YoJyAnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRzID0gc3BlYy5zcGxpdCgnICcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgZmllbGQgZnJvbSB0aGUgc3BlYyAod2Ugd2lsbCBiZSB3b3JraW5nIHdpdGggcGFpcnMpXG4gICAgICAgICAgICAgICAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tpXS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgZmlyc3QgaXMgbm90IGEgZmllbGQsIHRocm93IGVycm9yXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZmllbGQgPT09ICctMScgICAgfHwgZmllbGQgPT09ICcxJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChmaWVsZCA9PT0gJ2ZhbHNlJyB8fCBmaWVsZCA9PT0gJ3RydWUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgZmllbGRzIHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIG5leHQgaXRlbSBvZiB0aGUgcGFpclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5leHQgPSBfLnRvU3RyaW5nKGZpZWxkc1tpKzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICctMScgfHwgbmV4dCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICctMScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgX2tleSBpbiBwcm9qZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmllbGQgIT09ICdfaWQnICYmIHByb2plY3Rpb25bX2tleV0gPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHByb2plY3Rpb24gY2Fubm90IGNvbnRhaW4gYm90aCBpbmNsdWRlIGFuZCBleGNsdWRlIHNwZWNpZmljYXRpb25zXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXh0ID09PSAnZmFsc2UnIHx8IG5leHQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZCA9PT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHByb2plY3Rpb24gY2Fubm90IGNvbnRhaW4gYm90aCBpbmNsdWRlIGFuZCBleGNsdWRlIHNwZWNpZmljYXRpb25zXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFnZ3JlZ2F0aW9uICYmIG5leHQuaW5kZXhPZignJCcpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSBuZXh0LnJlcGxhY2UoJyQnLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNwZWMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vLmZpbmQoe30sIFwiZmllbGQxXCIpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbltzcGVjXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHNwZWMpKSB7XG4gICAgICAgICAgICAvLyBKb2luIHRoZSBhcnJheSB3aXRoIHNwYWNlcywgYW5kIHRyZWF0IGl0IGFzIGEgc3BhY2VkLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoc3BlYy5qb2luKCcgJyksIGFnZ3JlZ2F0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3Qoc3BlYykpIHtcbiAgICAgICAgICAgIC8vIFRPRE8gTmVzdGVkIHBhdGggLT4gLmZpbmQoe30sIHsgXCJmaWVsZDEuZmllbGQxMlwiOiBcImFzY1wiIH0pXG4gICAgICAgICAgICB2YXIgX3NwZWMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcGVjKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaGFzSW4oc3BlYywga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBfc3BlYy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goc3BlY1trZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoX3NwZWMsIGFnZ3JlZ2F0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIGZpZWxkcyBzcGVjaWZpY2F0aW9uOiBcIiwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcHJvamVjdGlvbjtcbiAgICB9XG5cdFxuXHQvKiBTVEFUSUMgTUVUSE9EUyAqL1xuXHRzdGF0aWMgaXNTZWxlY3RvckNvbXBpbGVkKHNlbGVjdG9yKSB7XG5cdFx0aWYgKCFfLmlzTmlsKHNlbGVjdG9yKSAmJiAoXG5cdFx0ICAgIHNlbGVjdG9yIGluc3RhbmNlb2YgU2VsZWN0b3JNYXRjaGVyIHx8IChzZWxlY3RvciBpbnN0YW5jZW9mIFNlbGVjdG9yICYmIFxuXHRcdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3Iuc2VsZWN0b3JfY29tcGlsZWQgaW5zdGFuY2VvZiBTZWxlY3Rvck1hdGNoZXIpXG5cdCAgICApKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXHRcblx0c3RhdGljIG1hdGNoZXMoc2VsZWN0b3IsIGRvYykge1xuICAgICAgICByZXR1cm4gKG5ldyBTZWxlY3RvcihzZWxlY3RvcikpLnRlc3QoZG9jKTtcbiAgICB9XG59XG5cbnZhciBfYnVpbGRTZWxlY3RvciA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG5cdGxvZ2dlci5kZWJ1ZygnQ2FsbGVkOiBfYnVpbGRTZWxlY3RvcicpO1xuICAgIFxuICAgIHZhciBjbGF1c2VzID0gW107XG4gICAgXG4gICAgZm9yICh2YXIga2V5IGluIHNlbGVjdG9yKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHNlbGVjdG9yW2tleV07XG4gICAgICAgIFxuICAgICAgICBpZiAoa2V5LmNoYXJBdCgwKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IG9wZXJhdG9yID0+IHsgJGFuZDogW3suLi59LCB7Li4ufV0gfScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2VzLnB1c2goX2J1aWxkRG9jdW1lbnRTZWxlY3RvcihrZXksIHZhbHVlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IHBsYWluID0+IHsgZmllbGQxOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlcy5wdXNoKF9idWlsZEtleXBhdGhTZWxlY3RvcihrZXksIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGNsYXVzZXM7XG59O1xuXG52YXIgX2J1aWxkRG9jdW1lbnRTZWxlY3RvciA9IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICB2YXIgY2xhdXNlID0ge307XG4gICAgXG4gICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgY2FzZSAnJG9yJzpcbiAgICAgICAgY2FzZSAnJGFuZCc6XG4gICAgICAgIGNhc2UgJyRub3InOlxuICAgICAgICAgICAgY2xhdXNlLmtleSA9IGtleS5yZXBsYWNlKC9cXCQvLCAnJyk7XG4gICAgICAgICAgICAvLyBUaGUgcmVzdCB3aWxsIGJlIGhhbmRsZWQgYnkgJ19vcGVyYXRvcl8nXG4gICAgICAgIGNhc2UgJ19vcGVyYXRvcl8nOlxuICAgICAgICAgICAgLy8gR2VuZXJpYyBoYW5kbGVyIGZvciBvcGVyYXRvcnMgKCRvciwgJGFuZCwgJG5vcilcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLmtpbmQgPSAnb3BlcmF0b3InO1xuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnYXJyYXknO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2UudmFsdWUgPSBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjbGF1c2UudmFsdWUgPSBfLnVuaW9uKGNsYXVzZS52YWx1ZSwgX2J1aWxkU2VsZWN0b3IodmFsdWVbaV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVucmVjb2dpemVkIGtleSBpbiBzZWxlY3RvcjogXCIsIGtleSk7XG4gICAgfVxuICAgIFxuICAgIC8vIFRPRE8gY2FzZXM6ICR3aGVyZSwgJGVsZW1NYXRjaFxuICAgIFxuICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShjbGF1c2UpKTtcbiAgICBcbiAgICByZXR1cm4gY2xhdXNlO1xufTtcblxudmFyIF9idWlsZEtleXBhdGhTZWxlY3RvciA9IGZ1bmN0aW9uIChrZXlwYXRoLCB2YWx1ZSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkOiBfYnVpbGRLZXlwYXRoU2VsZWN0b3InKTtcbiAgICBcbiAgICB2YXIgY2xhdXNlID0ge307XG4gICAgXG4gICAgY2xhdXNlLnZhbHVlID0gdmFsdWU7XG4gICAgXG4gICAgaWYgKF8uaXNOaWwodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgbnVsbCcpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnbnVsbCc7XG4gICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIFJlZ0V4cCcpO1xuXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ3JlZ2V4cCc7XG4gICAgICAgIFxuICAgICAgICB2YXIgc291cmNlID0gdmFsdWUudG9TdHJpbmcoKS5zcGxpdCgnLycpO1xuXG4gICAgICAgIGNsYXVzZS52YWx1ZSA9IHtcbiAgICAgICAgICAgICRyZWdleDogc291cmNlWzFdICAgLy8gVGhlIGZpcnN0IGl0ZW0gc3BsaXR0ZWQgaXMgYW4gZW1wdHkgc3RyaW5nXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAoc291cmNlWzJdICE9IFwiXCIpIHtcbiAgICAgICAgICAgIGNsYXVzZS52YWx1ZVtcIiRvcHRpb25zXCJdID0gc291cmNlWzJdO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgQXJyYXknKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ2FycmF5JztcbiAgICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgU3RyaW5nJyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdzdHJpbmcnO1xuICAgIH0gZWxzZSBpZiAoXy5pc051bWJlcih2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBOdW1iZXInKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ251bWJlcic7XG4gICAgfSBlbHNlIGlmIChfLmlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBCb29sZWFuJyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdib29sZWFuJztcbiAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBGdW5jdGlvbicpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnZnVuY3Rpb24nO1xuICAgIH0gZWxzZSBpZiAoXy5pc1BsYWluT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICB2YXIgbGl0ZXJhbE9iamVjdCA9IHRydWU7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGtleS5jaGFyQXQoMCkgPT09ICckJykge1xuICAgICAgICAgICAgICAgIGxpdGVyYWxPYmplY3QgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGxpdGVyYWxPYmplY3QpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgT2JqZWN0ID0+IHsgZmllbGQ6IHsgZmllbGRfMTogPHZhbHVlPiwgZmllbGRfMjogPHZhbHVlPiB9IH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnbGl0ZXJhbF9vYmplY3QnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBPcGVyYXRvciA9PiB7IGZpZWxkOiB7ICRndDogMiwgJGx0IDUgfSB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ29wZXJhdG9yX29iamVjdCc7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0SWQpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBPYmplY3RJZCAtPiBTdHJpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ3N0cmluZyc7XG4gICAgICAgIGNsYXVzZS52YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnX19pbnZhbGlkX18nO1xuICAgIH1cbiAgICBcbiAgICB2YXIgcGFydHMgPSBrZXlwYXRoLnNwbGl0KCcuJyk7XG4gICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb3ZlciBPYmplY3QgZmllbGQgPT4geyBcImZpZWxkMS5maWVsZDFfMlwiOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS5raW5kID0gJ29iamVjdCc7XG4gICAgICAgIGNsYXVzZS5rZXkgPSBwYXJ0cztcbiAgICB9IGVsc2Uge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvdmVyIFBsYWluIGZpZWxkID0+IHsgXCJmaWVsZFwiOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS5raW5kID0gJ3BsYWluJztcbiAgICAgICAgY2xhdXNlLmtleSA9IHBhcnRzWzBdO1xuICAgIH1cbiAgICBcbiAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY2xhdXNlKSk7XG4gICAgXG4gICAgcmV0dXJuIGNsYXVzZTtcbn07XG5cblNlbGVjdG9yLk1BVENIX1NFTEVDVE9SID0gJ21hdGNoJztcblNlbGVjdG9yLlNPUlRfU0VMRUNUT1IgPSAnc29ydCc7XG5TZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUiA9ICdmaWVsZCc7XG5TZWxlY3Rvci5BR0dfRklFTERfU0VMRUNUT1IgPSAncHJvamVjdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3I7Il19
