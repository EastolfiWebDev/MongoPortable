"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Logger = require("./utils/Logger"),
    _ = require("lodash"),
    SelectorMatcher = require("./SelectorMatcher");

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
            return this.compileFields(selector);
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
        value: function compileFields(spec) {
            var projection = {};

            if (_.isNil(spec)) return projection;

            if (_.isString(spec)) {
                spec = spec.replace(/( )+/ig, ' ').trim();

                if (spec.indexOf(',') !== -1) {
                    // Replace commas by spaces, and treat it as a spaced-separated string
                    return this.compileFields(spec.replace(/,/ig, ' '));
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
                return this.compileFields(spec.join(' '));
            } else if (_.isPlainObject(spec)) {
                // TODO Nested path -> .find({}, { "field1.field12": "asc" })
                var _spec = [];
                for (var key in spec) {
                    if (_.hasIn(spec, key)) {
                        _spec.push(key);
                        _spec.push(spec[key]);
                    }
                }

                return this.compileFields(_spec);
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

            clause.value = _buildSelector(value);

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

module.exports = Selector;
//# sourceMappingURL=data:application/json;base64,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ZXF1aXJlKFwiLi91dGlscy9Mb2dnZXJcIiksXG4gICAgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIiksXG4gICAgU2VsZWN0b3JNYXRjaGVyID0gcmVxdWlyZShcIi4vU2VsZWN0b3JNYXRjaGVyXCIpO1xuICAgIFxudmFyIGxvZ2dlciA9IG51bGw7XG5cbmNsYXNzIFNlbGVjdG9yIHtcbiAgICBjb25zdHJ1Y3RvcihzZWxlY3RvciwgdHlwZSA9IFNlbGVjdG9yLk1BVENIX1NFTEVDVE9SKSB7XG4gICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2VsZWN0b3JfY29tcGlsZWQgPSBudWxsO1xuXHRcdFxuXHRcdGlmICh0eXBlID09PSBTZWxlY3Rvci5NQVRDSF9TRUxFQ1RPUikge1xuXHRcdFx0dGhpcy5zZWxlY3Rvcl9jb21waWxlZCA9IHRoaXMuY29tcGlsZShzZWxlY3Rvcik7XG5cdFx0fSBlbHNlIGlmICh0eXBlID09PSBTZWxlY3Rvci5TT1JUX1NFTEVDVE9SKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb21waWxlU29ydChzZWxlY3Rvcik7XG5cdFx0fSBlbHNlIGlmICh0eXBlID09PSBTZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUikge1xuXHRcdFx0cmV0dXJuIHRoaXMuY29tcGlsZUZpZWxkcyhzZWxlY3Rvcik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvZ2dlci50aHJvdyhcIllvdSBuZWVkIHRvIHNwZWNpZnkgdGhlIHNlbGVjdG9yIHR5cGVcIik7XG5cdFx0fVxuICAgIH1cbiAgICBcbiAgICB0ZXN0KGRvYykge1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3Rvcl9jb21waWxlZC50ZXN0KGRvYyk7XG4gICAgfVxuICAgIFxuICAgIGNvbXBpbGUoc2VsZWN0b3IpIHtcblx0XHRpZiAoXy5pc05pbChzZWxlY3RvcikpIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gbnVsbCcpO1xuXHRcdFx0XG5cdFx0XHRzZWxlY3RvciA9IHt9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IG5vdCBudWxsJyk7XG5cdFx0XHRcblx0XHRcdGlmICghc2VsZWN0b3IgfHwgKF8uaGFzSW4oc2VsZWN0b3IsICdfaWQnKSAmJiAhc2VsZWN0b3IuX2lkKSkge1xuXHRcdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IGZhbHNlIHZhbHVlIHx8IHsgX2lkOiBmYWxzZSB2YWx1ZSB9Jyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRzZWxlY3RvciA9IHtcblx0XHRcdFx0XHRfaWQ6IGZhbHNlXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG5cdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IGZ1bmN0aW9uKGRvYykgeyAuLi4gfScpO1xuXHRcdFx0XG5cdFx0XHQvL19pbml0RnVuY3Rpb24uY2FsbChtYXRjaGVyLCBzZWxlY3Rvcik7XG5cdFx0XHR0aGlzLmNsYXVzZXMgPSBbe1xuXHRcdFx0XHRraW5kOiAnZnVuY3Rpb24nLFxuXHRcdFx0XHR2YWx1ZTogc2VsZWN0b3Jcblx0XHRcdH1dO1xuXHRcdFx0XG5cdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZXMgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMuY2xhdXNlcykpO1xuXHRcdH0gZWxzZSBpZiAoXy5pc1N0cmluZyhzZWxlY3RvcikgfHwgXy5pc051bWJlcihzZWxlY3RvcikpIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gXCIxMjM0NTY3ODlcIiB8fCAxMjM0NTY3OTgnKTtcblx0XHRcdFxuXHRcdFx0c2VsZWN0b3IgPSB7XG5cdFx0XHRcdF9pZDogc2VsZWN0b3Jcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdC8vX2luaXRPYmplY3QuY2FsbChtYXRjaGVyLCBzZWxlY3Rvcik7XG5cdFx0XHR0aGlzLmNsYXVzZXMgPSBfYnVpbGRTZWxlY3RvcihzZWxlY3Rvcik7XG5cdFx0XHRcblx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlcyBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkodGhpcy5jbGF1c2VzKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4geyBmaWVsZDogdmFsdWUgfScpO1xuXHRcdFx0XG5cdFx0XHQvL19pbml0T2JqZWN0LmNhbGwobWF0Y2hlciwgc2VsZWN0b3IpO1xuXHRcdFx0dGhpcy5jbGF1c2VzID0gX2J1aWxkU2VsZWN0b3Ioc2VsZWN0b3IpO1xuXHRcdFx0XG5cdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZXMgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMuY2xhdXNlcykpO1xuXHRcdH1cblx0XHRcblx0XHR2YXIgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXIodGhpcyk7XG5cdFx0XG5cdFx0cmV0dXJuIG1hdGNoZXI7XG4gICAgfVxuICAgIFxuICAgIGNvbXBpbGVTb3J0KHNwZWMpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoc3BlYykpICB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgdmFyIGFzYyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcoc3BlYykpIHtcbiAgICAgICAgICAgIHNwZWMgPSBzcGVjLnJlcGxhY2UoLyggKSsvaWcsICcgJykudHJpbSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc3BlYy5pbmRleE9mKCcsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVwbGFjZSBjb21tYXMgYnkgc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KHNwZWMucmVwbGFjZSgvLC9pZywgJyAnKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNwZWMuaW5kZXhPZignICcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZHMgPSBzcGVjLnNwbGl0KCcgJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpZWxkID0gZmllbGRzW2ldLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZmllbGQgPT09ICdkZXNjJyAgfHwgZmllbGQgPT09ICdhc2MnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGZpZWxkID09PSAnLTEnICAgIHx8IGZpZWxkID09PSAnMScpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoZmllbGQgPT09ICdmYWxzZScgfHwgZmllbGQgPT09ICd0cnVlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHNvcnQgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gXy50b1N0cmluZyhmaWVsZHNbaSsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnZGVzYycgfHwgbmV4dCA9PT0gJ2FzYycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKChuZXh0ID09PSAnYXNjJykgPyB0cnVlIDogZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmV4dCA9PT0gJy0xJyB8fCBuZXh0ID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKChuZXh0ID09PSAnMScpID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5leHQgPT09ICdmYWxzZScgfHwgbmV4dCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGZpZWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCgobmV4dCA9PT0gJ3RydWUnKSA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKHRydWUpOyAvLyBEZWZhdWx0IHNvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8uc29ydChcImZpZWxkMVwiKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGtleXMucHVzaChzcGVjKTtcbiAgICAgICAgICAgICAgICBhc2MucHVzaCh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChfLmlzQXJyYXkoc3BlYykpIHtcbiAgICAgICAgICAgIC8vIEpvaW4gdGhlIGFycmF5IHdpdGggc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZVNvcnQoc3BlYy5qb2luKCcgJykpO1xuICAgICAgICAgICAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBzcGVjLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyAgICAgaWYgKF8uaXNTdHJpbmcoc3BlY1tpXSkpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAga2V5cy5wdXNoKHNwZWNbaV0pO1xuICAgICAgICAgICAgLy8gICAgICAgICBhc2MucHVzaCh0cnVlKTtcbiAgICAgICAgICAgIC8vICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gICAgICAgICBrZXlzLnB1c2goc3BlY1tpXVswXSk7XG4gICAgICAgICAgICAvLyAgICAgICAgIGFzYy5wdXNoKHNwZWNbaV1bMV0gIT09IFwiZGVzY1wiKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc1BsYWluT2JqZWN0KHNwZWMpKSB7XG4gICAgICAgICAgICAvLyBUT0RPIE5lc3RlZCBwYXRoIC0+IC5zb3J0KHsgXCJmaWVsZDEuZmllbGQxMlwiOiBcImFzY1wiIH0pXG4gICAgICAgICAgICB2YXIgX3NwZWMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcGVjKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaGFzSW4oc3BlYywga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBfc3BlYy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goc3BlY1trZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KF9zcGVjKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHNvcnQgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICAvLyByZXR1cm4ge2tleXM6IGtleXMsIGFzYzogYXNjfTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIHZhciB4ID0gMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgIT09IDAgJiYgeCAhPT0gMCkgcmV0dXJuIHg7ICAgLy8gTm9uIHJlYWNoYWJsZT9cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyB4ID0gU2VsZWN0b3IuX2YuX2NtcChhW0pTT04uc3RyaW5naWZ5KGtleXNbaV0pXSwgYltKU09OLnN0cmluZ2lmeShrZXlzW2ldKV0pO1xuICAgICAgICAgICAgICAgIHggPSBTZWxlY3Rvck1hdGNoZXIuY21wKGFba2V5c1tpXV0sIGJba2V5c1tpXV0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghYXNjW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIHggKj0gLTE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIGV2YWwoKSBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZSBpbiBJRTgsIG5vciBkb2VzIHRoZSBzcGVjIHNheSBpdFxuICAgICAgICAvLyBzaG91bGQuIEFzc2lnbiB0byBhIGxvY2FsIHRvIGdldCB0aGUgdmFsdWUsIGluc3RlYWQuXG4gICAgICAgIFxuICAgICAgICAvLyB2YXIgX2Z1bmM7XG4gICAgICAgIC8vIHZhciBjb2RlID0gXCJfZnVuYyA9IChmdW5jdGlvbihjKXtyZXR1cm4gZnVuY3Rpb24oYSxiKXt2YXIgeDtcIjtcbiAgICAgICAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vICAgICBpZiAoaSAhPT0gMCkge1xuICAgICAgICAvLyAgICAgICAgIGNvZGUgKz0gXCJpZih4IT09MClyZXR1cm4geDtcIjtcbiAgICAgICAgLy8gICAgIH1cbiAgICBcbiAgICAgICAgLy8gICAgIGNvZGUgKz0gXCJ4PVwiICsgKGFzY1tpXSA/IFwiXCIgOiBcIi1cIikgKyBcImMoYVtcIiArIEpTT04uc3RyaW5naWZ5KGtleXNbaV0pICsgXCJdLGJbXCIgKyBKU09OLnN0cmluZ2lmeShrZXlzW2ldKSArIFwiXSk7XCI7XG4gICAgICAgIC8vIH1cbiAgICBcbiAgICAgICAgLy8gY29kZSArPSBcInJldHVybiB4O307fSlcIjtcbiAgICBcbiAgICAgICAgLy8gZXZhbChjb2RlKTtcbiAgICBcbiAgICAgICAgLy8gcmV0dXJuIF9mdW5jKFNlbGVjdG9yLl9mLl9jbXApO1xuICAgIH1cbiAgICBcbiAgICBjb21waWxlRmllbGRzKHNwZWMpIHtcbiAgICAgICAgdmFyIHByb2plY3Rpb24gPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKHNwZWMpKSByZXR1cm4gcHJvamVjdGlvbjtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzU3RyaW5nKHNwZWMpKSB7XG4gICAgICAgICAgICBzcGVjID0gc3BlYy5yZXBsYWNlKC8oICkrL2lnLCAnICcpLnRyaW0oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNwZWMuaW5kZXhPZignLCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIFJlcGxhY2UgY29tbWFzIGJ5IHNwYWNlcywgYW5kIHRyZWF0IGl0IGFzIGEgc3BhY2VkLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKHNwZWMucmVwbGFjZSgvLC9pZywgJyAnKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNwZWMuaW5kZXhPZignICcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZHMgPSBzcGVjLnNwbGl0KCcgJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpZWxkID0gZmllbGRzW2ldLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZmllbGQgPT09ICctMScgICAgfHwgZmllbGQgPT09ICcxJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChmaWVsZCA9PT0gJ2ZhbHNlJyB8fCBmaWVsZCA9PT0gJ3RydWUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgZmllbGRzIHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IF8udG9TdHJpbmcoZmllbGRzW2krMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCA9PT0gJy0xJyB8fCBuZXh0ID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCA9PT0gJy0xJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBfa2V5IGluIHByb2plY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZCAhPT0gJ19pZCcgJiYgcHJvamVjdGlvbltfa2V5XSA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkEgcHJvamVjdGlvbiBjYW5ub3QgY29udGFpbiBib3RoIGluY2x1ZGUgYW5kIGV4Y2x1ZGUgc3BlY2lmaWNhdGlvbnNcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5leHQgPT09ICdmYWxzZScgfHwgbmV4dCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkID09PSAnX2lkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkEgcHJvamVjdGlvbiBjYW5ub3QgY29udGFpbiBib3RoIGluY2x1ZGUgYW5kIGV4Y2x1ZGUgc3BlY2lmaWNhdGlvbnNcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVjLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLy5maW5kKHt9LCBcImZpZWxkMVwiKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25bc3BlY10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheShzcGVjKSkge1xuICAgICAgICAgICAgLy8gSm9pbiB0aGUgYXJyYXkgd2l0aCBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKHNwZWMuam9pbignICcpKTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3Qoc3BlYykpIHtcbiAgICAgICAgICAgIC8vIFRPRE8gTmVzdGVkIHBhdGggLT4gLmZpbmQoe30sIHsgXCJmaWVsZDEuZmllbGQxMlwiOiBcImFzY1wiIH0pXG4gICAgICAgICAgICB2YXIgX3NwZWMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcGVjKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaGFzSW4oc3BlYywga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBfc3BlYy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goc3BlY1trZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoX3NwZWMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgZmllbGRzIHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBwcm9qZWN0aW9uO1xuICAgIH1cblx0XG5cdC8qIFNUQVRJQyBNRVRIT0RTICovXG5cdHN0YXRpYyBpc1NlbGVjdG9yQ29tcGlsZWQoc2VsZWN0b3IpIHtcblx0XHRpZiAoIV8uaXNOaWwoc2VsZWN0b3IpICYmIChcblx0XHQgICAgc2VsZWN0b3IgaW5zdGFuY2VvZiBTZWxlY3Rvck1hdGNoZXIgfHwgKHNlbGVjdG9yIGluc3RhbmNlb2YgU2VsZWN0b3IgJiYgXG5cdFx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rvci5zZWxlY3Rvcl9jb21waWxlZCBpbnN0YW5jZW9mIFNlbGVjdG9yTWF0Y2hlcilcblx0ICAgICkpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cdFxuXHRzdGF0aWMgbWF0Y2hlcyhzZWxlY3RvciwgZG9jKSB7XG4gICAgICAgIHJldHVybiAobmV3IFNlbGVjdG9yKHNlbGVjdG9yKSkudGVzdChkb2MpO1xuICAgIH1cbn1cblxudmFyIF9idWlsZFNlbGVjdG9yID0gZnVuY3Rpb24oc2VsZWN0b3IpIHtcblx0bG9nZ2VyLmRlYnVnKCdDYWxsZWQ6IF9idWlsZFNlbGVjdG9yJyk7XG4gICAgXG4gICAgdmFyIGNsYXVzZXMgPSBbXTtcbiAgICBcbiAgICBmb3IgKHZhciBrZXkgaW4gc2VsZWN0b3IpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gc2VsZWN0b3Jba2V5XTtcbiAgICAgICAgXG4gICAgICAgIGlmIChrZXkuY2hhckF0KDApID09PSAnJCcpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gb3BlcmF0b3IgPT4geyAkYW5kOiBbey4uLn0sIHsuLi59XSB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZXMucHVzaChfYnVpbGREb2N1bWVudFNlbGVjdG9yKGtleSwgdmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gcGxhaW4gPT4geyBmaWVsZDE6IDx2YWx1ZT4gfScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2VzLnB1c2goX2J1aWxkS2V5cGF0aFNlbGVjdG9yKGtleSwgdmFsdWUpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gY2xhdXNlcztcbn07XG5cbnZhciBfYnVpbGREb2N1bWVudFNlbGVjdG9yID0gZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgIHZhciBjbGF1c2UgPSB7fTtcbiAgICBcbiAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICBjYXNlICckb3InOlxuICAgICAgICBjYXNlICckYW5kJzpcbiAgICAgICAgY2FzZSAnJG5vcic6XG4gICAgICAgICAgICBjbGF1c2Uua2V5ID0ga2V5LnJlcGxhY2UoL1xcJC8sICcnKTtcbiAgICAgICAgICAgIC8vIFRoZSByZXN0IHdpbGwgYmUgaGFuZGxlZCBieSAnX29wZXJhdG9yXydcbiAgICAgICAgY2FzZSAnX29wZXJhdG9yXyc6XG4gICAgICAgICAgICAvLyBHZW5lcmljIGhhbmRsZXIgZm9yIG9wZXJhdG9ycyAoJG9yLCAkYW5kLCAkbm9yKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2Uua2luZCA9ICdvcGVyYXRvcic7XG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdhcnJheSc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS52YWx1ZSA9IF9idWlsZFNlbGVjdG9yKHZhbHVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVucmVjb2dpemVkIGtleSBpbiBzZWxlY3RvcjogXCIsIGtleSk7XG4gICAgfVxuICAgIFxuICAgIC8vIFRPRE8gY2FzZXM6ICR3aGVyZSwgJGVsZW1NYXRjaFxuICAgIFxuICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShjbGF1c2UpKTtcbiAgICBcbiAgICByZXR1cm4gY2xhdXNlO1xufTtcblxudmFyIF9idWlsZEtleXBhdGhTZWxlY3RvciA9IGZ1bmN0aW9uIChrZXlwYXRoLCB2YWx1ZSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkOiBfYnVpbGRLZXlwYXRoU2VsZWN0b3InKTtcbiAgICBcbiAgICB2YXIgY2xhdXNlID0ge307XG4gICAgXG4gICAgY2xhdXNlLnZhbHVlID0gdmFsdWU7XG4gICAgXG4gICAgaWYgKF8uaXNOaWwodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgbnVsbCcpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnbnVsbCc7XG4gICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIFJlZ0V4cCcpO1xuXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ3JlZ2V4cCc7XG4gICAgICAgIFxuICAgICAgICB2YXIgc291cmNlID0gdmFsdWUudG9TdHJpbmcoKS5zcGxpdCgnLycpO1xuXG4gICAgICAgIGNsYXVzZS52YWx1ZSA9IHtcbiAgICAgICAgICAgICRyZWdleDogc291cmNlWzFdICAgLy8gVGhlIGZpcnN0IGl0ZW0gc3BsaXR0ZWQgaXMgYW4gZW1wdHkgc3RyaW5nXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAoc291cmNlWzJdICE9IFwiXCIpIHtcbiAgICAgICAgICAgIGNsYXVzZS52YWx1ZVtcIiRvcHRpb25zXCJdID0gc291cmNlWzJdO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgQXJyYXknKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ2FycmF5JztcbiAgICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgU3RyaW5nJyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdzdHJpbmcnO1xuICAgIH0gZWxzZSBpZiAoXy5pc051bWJlcih2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBOdW1iZXInKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ251bWJlcic7XG4gICAgfSBlbHNlIGlmIChfLmlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBCb29sZWFuJyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdib29sZWFuJztcbiAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBGdW5jdGlvbicpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnZnVuY3Rpb24nO1xuICAgIH0gZWxzZSBpZiAoXy5pc1BsYWluT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICB2YXIgbGl0ZXJhbE9iamVjdCA9IHRydWU7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGtleS5jaGFyQXQoMCkgPT09ICckJykge1xuICAgICAgICAgICAgICAgIGxpdGVyYWxPYmplY3QgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGxpdGVyYWxPYmplY3QpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgT2JqZWN0ID0+IHsgZmllbGQ6IHsgZmllbGRfMTogPHZhbHVlPiwgZmllbGRfMjogPHZhbHVlPiB9IH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnbGl0ZXJhbF9vYmplY3QnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBPcGVyYXRvciA9PiB7IGZpZWxkOiB7ICRndDogMiwgJGx0IDUgfSB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ29wZXJhdG9yX29iamVjdCc7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjbGF1c2UudHlwZSA9ICdfX2ludmFsaWRfXyc7XG4gICAgfVxuICAgIFxuICAgIHZhciBwYXJ0cyA9IGtleXBhdGguc3BsaXQoJy4nKTtcbiAgICBpZiAocGFydHMubGVuZ3RoID4gMSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvdmVyIE9iamVjdCBmaWVsZCA9PiB7IFwiZmllbGQxLmZpZWxkMV8yXCI6IDx2YWx1ZT4gfScpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLmtpbmQgPSAnb2JqZWN0JztcbiAgICAgICAgY2xhdXNlLmtleSA9IHBhcnRzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG92ZXIgUGxhaW4gZmllbGQgPT4geyBcImZpZWxkXCI6IDx2YWx1ZT4gfScpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLmtpbmQgPSAncGxhaW4nO1xuICAgICAgICBjbGF1c2Uua2V5ID0gcGFydHNbMF07XG4gICAgfVxuICAgIFxuICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShjbGF1c2UpKTtcbiAgICBcbiAgICByZXR1cm4gY2xhdXNlO1xufTtcblxuU2VsZWN0b3IuTUFUQ0hfU0VMRUNUT1IgPSAnbWF0Y2gnO1xuU2VsZWN0b3IuU09SVF9TRUxFQ1RPUiA9ICdzb3J0JztcblNlbGVjdG9yLkZJRUxEX1NFTEVDVE9SID0gJ2ZpZWxkJztcblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvcjsiXX0=
