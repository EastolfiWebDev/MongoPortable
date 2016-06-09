"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Logger = require("jsw-logger"),
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
//# sourceMappingURL=data:application/json;base64,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cXVpcmUoXCJqc3ctbG9nZ2VyXCIpLFxuICAgIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpLFxuICAgIFNlbGVjdG9yTWF0Y2hlciA9IHJlcXVpcmUoXCIuL1NlbGVjdG9yTWF0Y2hlclwiKTtcbiAgICBcbnZhciBsb2dnZXIgPSBudWxsO1xuXG5jbGFzcyBTZWxlY3RvciB7XG4gICAgY29uc3RydWN0b3Ioc2VsZWN0b3IsIHR5cGUgPSBTZWxlY3Rvci5NQVRDSF9TRUxFQ1RPUikge1xuICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkID0gbnVsbDtcblx0XHRcblx0XHRpZiAodHlwZSA9PT0gU2VsZWN0b3IuTUFUQ0hfU0VMRUNUT1IpIHtcblx0XHRcdHRoaXMuc2VsZWN0b3JfY29tcGlsZWQgPSB0aGlzLmNvbXBpbGUoc2VsZWN0b3IpO1xuXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gU2VsZWN0b3IuU09SVF9TRUxFQ1RPUikge1xuXHRcdFx0cmV0dXJuIHRoaXMuY29tcGlsZVNvcnQoc2VsZWN0b3IpO1xuXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gU2VsZWN0b3IuRklFTERfU0VMRUNUT1IpIHtcblx0XHRcdHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoc2VsZWN0b3IpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsb2dnZXIudGhyb3coXCJZb3UgbmVlZCB0byBzcGVjaWZ5IHRoZSBzZWxlY3RvciB0eXBlXCIpO1xuXHRcdH1cbiAgICB9XG4gICAgXG4gICAgdGVzdChkb2MpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JfY29tcGlsZWQudGVzdChkb2MpO1xuICAgIH1cbiAgICBcbiAgICBjb21waWxlKHNlbGVjdG9yKSB7XG5cdFx0aWYgKF8uaXNOaWwoc2VsZWN0b3IpKSB7XG5cdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IG51bGwnKTtcblx0XHRcdFxuXHRcdFx0c2VsZWN0b3IgPSB7fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBub3QgbnVsbCcpO1xuXHRcdFx0XG5cdFx0XHRpZiAoIXNlbGVjdG9yIHx8IChfLmhhc0luKHNlbGVjdG9yLCAnX2lkJykgJiYgIXNlbGVjdG9yLl9pZCkpIHtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBmYWxzZSB2YWx1ZSB8fCB7IF9pZDogZmFsc2UgdmFsdWUgfScpO1xuXHRcdFx0XHRcblx0XHRcdFx0c2VsZWN0b3IgPSB7XG5cdFx0XHRcdFx0X2lkOiBmYWxzZVxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHRpZiAoXy5pc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBmdW5jdGlvbihkb2MpIHsgLi4uIH0nKTtcblx0XHRcdFxuXHRcdFx0Ly9faW5pdEZ1bmN0aW9uLmNhbGwobWF0Y2hlciwgc2VsZWN0b3IpO1xuXHRcdFx0dGhpcy5jbGF1c2VzID0gW3tcblx0XHRcdFx0a2luZDogJ2Z1bmN0aW9uJyxcblx0XHRcdFx0dmFsdWU6IHNlbGVjdG9yXG5cdFx0XHR9XTtcblx0XHRcdFxuXHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2VzIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeSh0aGlzLmNsYXVzZXMpKTtcblx0XHR9IGVsc2UgaWYgKF8uaXNTdHJpbmcoc2VsZWN0b3IpIHx8IF8uaXNOdW1iZXIoc2VsZWN0b3IpKSB7XG5cdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IFwiMTIzNDU2Nzg5XCIgfHwgMTIzNDU2Nzk4Jyk7XG5cdFx0XHRcblx0XHRcdHNlbGVjdG9yID0ge1xuXHRcdFx0XHRfaWQ6IHNlbGVjdG9yXG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHQvL19pbml0T2JqZWN0LmNhbGwobWF0Y2hlciwgc2VsZWN0b3IpO1xuXHRcdFx0dGhpcy5jbGF1c2VzID0gX2J1aWxkU2VsZWN0b3Ioc2VsZWN0b3IpO1xuXHRcdFx0XG5cdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZXMgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMuY2xhdXNlcykpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IHsgZmllbGQ6IHZhbHVlIH0nKTtcblx0XHRcdFxuXHRcdFx0Ly9faW5pdE9iamVjdC5jYWxsKG1hdGNoZXIsIHNlbGVjdG9yKTtcblx0XHRcdHRoaXMuY2xhdXNlcyA9IF9idWlsZFNlbGVjdG9yKHNlbGVjdG9yKTtcblx0XHRcdFxuXHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2VzIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeSh0aGlzLmNsYXVzZXMpKTtcblx0XHR9XG5cdFx0XG5cdFx0dmFyIG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyKHRoaXMpO1xuXHRcdFxuXHRcdHJldHVybiBtYXRjaGVyO1xuICAgIH1cbiAgICBcbiAgICBjb21waWxlU29ydChzcGVjKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHNwZWMpKSAge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBrZXlzID0gW107XG4gICAgICAgIHZhciBhc2MgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzU3RyaW5nKHNwZWMpKSB7XG4gICAgICAgICAgICBzcGVjID0gc3BlYy5yZXBsYWNlKC8oICkrL2lnLCAnICcpLnRyaW0oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNwZWMuaW5kZXhPZignLCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIFJlcGxhY2UgY29tbWFzIGJ5IHNwYWNlcywgYW5kIHRyZWF0IGl0IGFzIGEgc3BhY2VkLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlU29ydChzcGVjLnJlcGxhY2UoLywvaWcsICcgJykpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVjLmluZGV4T2YoJyAnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRzID0gc3BlYy5zcGxpdCgnICcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tpXS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoKGZpZWxkID09PSAnZGVzYycgIHx8IGZpZWxkID09PSAnYXNjJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChmaWVsZCA9PT0gJy0xJyAgICB8fCBmaWVsZCA9PT0gJzEnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGZpZWxkID09PSAnZmFsc2UnIHx8IGZpZWxkID09PSAndHJ1ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCBzb3J0IHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IF8udG9TdHJpbmcoZmllbGRzW2krMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCA9PT0gJ2Rlc2MnIHx8IG5leHQgPT09ICdhc2MnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGZpZWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCgobmV4dCA9PT0gJ2FzYycpID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5leHQgPT09ICctMScgfHwgbmV4dCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGZpZWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCgobmV4dCA9PT0gJzEnKSA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXh0ID09PSAnZmFsc2UnIHx8IG5leHQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNjLnB1c2goKG5leHQgPT09ICd0cnVlJykgPyB0cnVlIDogZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGZpZWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCh0cnVlKTsgLy8gRGVmYXVsdCBzb3J0XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vLnNvcnQoXCJmaWVsZDFcIilcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBrZXlzLnB1c2goc3BlYyk7XG4gICAgICAgICAgICAgICAgYXNjLnB1c2godHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHNwZWMpKSB7XG4gICAgICAgICAgICAvLyBKb2luIHRoZSBhcnJheSB3aXRoIHNwYWNlcywgYW5kIHRyZWF0IGl0IGFzIGEgc3BhY2VkLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KHNwZWMuam9pbignICcpKTtcbiAgICAgICAgICAgIC8vIGZvciAodmFyIGkgPSAwOyBpIDwgc3BlYy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgLy8gICAgIGlmIChfLmlzU3RyaW5nKHNwZWNbaV0pKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIGtleXMucHVzaChzcGVjW2ldKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgYXNjLnB1c2godHJ1ZSk7XG4gICAgICAgICAgICAvLyAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vICAgICAgICAga2V5cy5wdXNoKHNwZWNbaV1bMF0pO1xuICAgICAgICAgICAgLy8gICAgICAgICBhc2MucHVzaChzcGVjW2ldWzFdICE9PSBcImRlc2NcIik7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gfVxuICAgICAgICB9IGVsc2UgaWYgKF8uaXNQbGFpbk9iamVjdChzcGVjKSkge1xuICAgICAgICAgICAgLy8gVE9ETyBOZXN0ZWQgcGF0aCAtPiAuc29ydCh7IFwiZmllbGQxLmZpZWxkMTJcIjogXCJhc2NcIiB9KVxuICAgICAgICAgICAgdmFyIF9zcGVjID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3BlYykge1xuICAgICAgICAgICAgICAgIGlmIChfLmhhc0luKHNwZWMsIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgX3NwZWMucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICBfc3BlYy5wdXNoKHNwZWNba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlU29ydChfc3BlYyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCBzb3J0IHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy8gcmV0dXJuIHtrZXlzOiBrZXlzLCBhc2M6IGFzY307XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICB2YXIgeCA9IDA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpICE9PSAwICYmIHggIT09IDApIHJldHVybiB4OyAgIC8vIE5vbiByZWFjaGFibGU/XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8geCA9IFNlbGVjdG9yLl9mLl9jbXAoYVtKU09OLnN0cmluZ2lmeShrZXlzW2ldKV0sIGJbSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSldKTtcbiAgICAgICAgICAgICAgICB4ID0gU2VsZWN0b3JNYXRjaGVyLmNtcChhW2tleXNbaV1dLCBiW2tleXNbaV1dKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWFzY1tpXSkge1xuICAgICAgICAgICAgICAgICAgICB4ICo9IC0xO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBldmFsKCkgZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUgaW4gSUU4LCBub3IgZG9lcyB0aGUgc3BlYyBzYXkgaXRcbiAgICAgICAgLy8gc2hvdWxkLiBBc3NpZ24gdG8gYSBsb2NhbCB0byBnZXQgdGhlIHZhbHVlLCBpbnN0ZWFkLlxuICAgICAgICBcbiAgICAgICAgLy8gdmFyIF9mdW5jO1xuICAgICAgICAvLyB2YXIgY29kZSA9IFwiX2Z1bmMgPSAoZnVuY3Rpb24oYyl7cmV0dXJuIGZ1bmN0aW9uKGEsYil7dmFyIHg7XCI7XG4gICAgICAgIC8vIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyAgICAgaWYgKGkgIT09IDApIHtcbiAgICAgICAgLy8gICAgICAgICBjb2RlICs9IFwiaWYoeCE9PTApcmV0dXJuIHg7XCI7XG4gICAgICAgIC8vICAgICB9XG4gICAgXG4gICAgICAgIC8vICAgICBjb2RlICs9IFwieD1cIiArIChhc2NbaV0gPyBcIlwiIDogXCItXCIpICsgXCJjKGFbXCIgKyBKU09OLnN0cmluZ2lmeShrZXlzW2ldKSArIFwiXSxiW1wiICsgSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSkgKyBcIl0pO1wiO1xuICAgICAgICAvLyB9XG4gICAgXG4gICAgICAgIC8vIGNvZGUgKz0gXCJyZXR1cm4geDt9O30pXCI7XG4gICAgXG4gICAgICAgIC8vIGV2YWwoY29kZSk7XG4gICAgXG4gICAgICAgIC8vIHJldHVybiBfZnVuYyhTZWxlY3Rvci5fZi5fY21wKTtcbiAgICB9XG4gICAgXG4gICAgY29tcGlsZUZpZWxkcyhzcGVjKSB7XG4gICAgICAgIHZhciBwcm9qZWN0aW9uID0ge307XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChzcGVjKSkgcmV0dXJuIHByb2plY3Rpb247XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1N0cmluZyhzcGVjKSkge1xuICAgICAgICAgICAgc3BlYyA9IHNwZWMucmVwbGFjZSgvKCApKy9pZywgJyAnKS50cmltKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzcGVjLmluZGV4T2YoJywnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIGNvbW1hcyBieSBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZUZpZWxkcyhzcGVjLnJlcGxhY2UoLywvaWcsICcgJykpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVjLmluZGV4T2YoJyAnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRzID0gc3BlYy5zcGxpdCgnICcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tpXS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoKGZpZWxkID09PSAnLTEnICAgIHx8IGZpZWxkID09PSAnMScpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoZmllbGQgPT09ICdmYWxzZScgfHwgZmllbGQgPT09ICd0cnVlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIGZpZWxkcyBzcGVjaWZpY2F0aW9uOiBcIiwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5leHQgPSBfLnRvU3RyaW5nKGZpZWxkc1tpKzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICctMScgfHwgbmV4dCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICctMScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgX2tleSBpbiBwcm9qZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmllbGQgIT09ICdfaWQnICYmIHByb2plY3Rpb25bX2tleV0gPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHByb2plY3Rpb24gY2Fubm90IGNvbnRhaW4gYm90aCBpbmNsdWRlIGFuZCBleGNsdWRlIHNwZWNpZmljYXRpb25zXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXh0ID09PSAnZmFsc2UnIHx8IG5leHQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZCA9PT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHByb2plY3Rpb24gY2Fubm90IGNvbnRhaW4gYm90aCBpbmNsdWRlIGFuZCBleGNsdWRlIHNwZWNpZmljYXRpb25zXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3BlYy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8uZmluZCh7fSwgXCJmaWVsZDFcIilcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW3NwZWNdID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChfLmlzQXJyYXkoc3BlYykpIHtcbiAgICAgICAgICAgIC8vIEpvaW4gdGhlIGFycmF5IHdpdGggc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZUZpZWxkcyhzcGVjLmpvaW4oJyAnKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc1BsYWluT2JqZWN0KHNwZWMpKSB7XG4gICAgICAgICAgICAvLyBUT0RPIE5lc3RlZCBwYXRoIC0+IC5maW5kKHt9LCB7IFwiZmllbGQxLmZpZWxkMTJcIjogXCJhc2NcIiB9KVxuICAgICAgICAgICAgdmFyIF9zcGVjID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3BlYykge1xuICAgICAgICAgICAgICAgIGlmIChfLmhhc0luKHNwZWMsIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgX3NwZWMucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICBfc3BlYy5wdXNoKHNwZWNba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKF9zcGVjKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIGZpZWxkcyBzcGVjaWZpY2F0aW9uOiBcIiwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcHJvamVjdGlvbjtcbiAgICB9XG5cdFxuXHQvKiBTVEFUSUMgTUVUSE9EUyAqL1xuXHRzdGF0aWMgaXNTZWxlY3RvckNvbXBpbGVkKHNlbGVjdG9yKSB7XG5cdFx0aWYgKCFfLmlzTmlsKHNlbGVjdG9yKSAmJiAoXG5cdFx0ICAgIHNlbGVjdG9yIGluc3RhbmNlb2YgU2VsZWN0b3JNYXRjaGVyIHx8IChzZWxlY3RvciBpbnN0YW5jZW9mIFNlbGVjdG9yICYmIFxuXHRcdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3Iuc2VsZWN0b3JfY29tcGlsZWQgaW5zdGFuY2VvZiBTZWxlY3Rvck1hdGNoZXIpXG5cdCAgICApKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXHRcblx0c3RhdGljIG1hdGNoZXMoc2VsZWN0b3IsIGRvYykge1xuICAgICAgICByZXR1cm4gKG5ldyBTZWxlY3RvcihzZWxlY3RvcikpLnRlc3QoZG9jKTtcbiAgICB9XG59XG5cbnZhciBfYnVpbGRTZWxlY3RvciA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG5cdGxvZ2dlci5kZWJ1ZygnQ2FsbGVkOiBfYnVpbGRTZWxlY3RvcicpO1xuICAgIFxuICAgIHZhciBjbGF1c2VzID0gW107XG4gICAgXG4gICAgZm9yICh2YXIga2V5IGluIHNlbGVjdG9yKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHNlbGVjdG9yW2tleV07XG4gICAgICAgIFxuICAgICAgICBpZiAoa2V5LmNoYXJBdCgwKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IG9wZXJhdG9yID0+IHsgJGFuZDogW3suLi59LCB7Li4ufV0gfScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2VzLnB1c2goX2J1aWxkRG9jdW1lbnRTZWxlY3RvcihrZXksIHZhbHVlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IHBsYWluID0+IHsgZmllbGQxOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlcy5wdXNoKF9idWlsZEtleXBhdGhTZWxlY3RvcihrZXksIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGNsYXVzZXM7XG59O1xuXG52YXIgX2J1aWxkRG9jdW1lbnRTZWxlY3RvciA9IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICB2YXIgY2xhdXNlID0ge307XG4gICAgXG4gICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgY2FzZSAnJG9yJzpcbiAgICAgICAgY2FzZSAnJGFuZCc6XG4gICAgICAgIGNhc2UgJyRub3InOlxuICAgICAgICAgICAgY2xhdXNlLmtleSA9IGtleS5yZXBsYWNlKC9cXCQvLCAnJyk7XG4gICAgICAgICAgICAvLyBUaGUgcmVzdCB3aWxsIGJlIGhhbmRsZWQgYnkgJ19vcGVyYXRvcl8nXG4gICAgICAgIGNhc2UgJ19vcGVyYXRvcl8nOlxuICAgICAgICAgICAgLy8gR2VuZXJpYyBoYW5kbGVyIGZvciBvcGVyYXRvcnMgKCRvciwgJGFuZCwgJG5vcilcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLmtpbmQgPSAnb3BlcmF0b3InO1xuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnYXJyYXknO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2UudmFsdWUgPSBfYnVpbGRTZWxlY3Rvcih2YWx1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJVbnJlY29naXplZCBrZXkgaW4gc2VsZWN0b3I6IFwiLCBrZXkpO1xuICAgIH1cbiAgICBcbiAgICAvLyBUT0RPIGNhc2VzOiAkd2hlcmUsICRlbGVtTWF0Y2hcbiAgICBcbiAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY2xhdXNlKSk7XG4gICAgXG4gICAgcmV0dXJuIGNsYXVzZTtcbn07XG5cbnZhciBfYnVpbGRLZXlwYXRoU2VsZWN0b3IgPSBmdW5jdGlvbiAoa2V5cGF0aCwgdmFsdWUpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZDogX2J1aWxkS2V5cGF0aFNlbGVjdG9yJyk7XG4gICAgXG4gICAgdmFyIGNsYXVzZSA9IHt9O1xuICAgIFxuICAgIGNsYXVzZS52YWx1ZSA9IHZhbHVlO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKHZhbHVlKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIG51bGwnKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ251bGwnO1xuICAgIH0gZWxzZSBpZiAoXy5pc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBSZWdFeHAnKTtcblxuICAgICAgICBjbGF1c2UudHlwZSA9ICdyZWdleHAnO1xuICAgICAgICBcbiAgICAgICAgdmFyIHNvdXJjZSA9IHZhbHVlLnRvU3RyaW5nKCkuc3BsaXQoJy8nKTtcblxuICAgICAgICBjbGF1c2UudmFsdWUgPSB7XG4gICAgICAgICAgICAkcmVnZXg6IHNvdXJjZVsxXSAgIC8vIFRoZSBmaXJzdCBpdGVtIHNwbGl0dGVkIGlzIGFuIGVtcHR5IHN0cmluZ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHNvdXJjZVsyXSAhPSBcIlwiKSB7XG4gICAgICAgICAgICBjbGF1c2UudmFsdWVbXCIkb3B0aW9uc1wiXSA9IHNvdXJjZVsyXTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIEFycmF5Jyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdhcnJheSc7XG4gICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIFN0cmluZycpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnc3RyaW5nJztcbiAgICB9IGVsc2UgaWYgKF8uaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgTnVtYmVyJyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdudW1iZXInO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgQm9vbGVhbicpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnYm9vbGVhbic7XG4gICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgRnVuY3Rpb24nKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ2Z1bmN0aW9uJztcbiAgICB9IGVsc2UgaWYgKF8uaXNQbGFpbk9iamVjdCh2YWx1ZSkpIHtcbiAgICAgICAgdmFyIGxpdGVyYWxPYmplY3QgPSB0cnVlO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChrZXkuY2hhckF0KDApID09PSAnJCcpIHtcbiAgICAgICAgICAgICAgICBsaXRlcmFsT2JqZWN0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChsaXRlcmFsT2JqZWN0KSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIE9iamVjdCA9PiB7IGZpZWxkOiB7IGZpZWxkXzE6IDx2YWx1ZT4sIGZpZWxkXzI6IDx2YWx1ZT4gfSB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ2xpdGVyYWxfb2JqZWN0JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgT3BlcmF0b3IgPT4geyBmaWVsZDogeyAkZ3Q6IDIsICRsdCA1IH0gfScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdvcGVyYXRvcl9vYmplY3QnO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnX19pbnZhbGlkX18nO1xuICAgIH1cbiAgICBcbiAgICB2YXIgcGFydHMgPSBrZXlwYXRoLnNwbGl0KCcuJyk7XG4gICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb3ZlciBPYmplY3QgZmllbGQgPT4geyBcImZpZWxkMS5maWVsZDFfMlwiOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS5raW5kID0gJ29iamVjdCc7XG4gICAgICAgIGNsYXVzZS5rZXkgPSBwYXJ0cztcbiAgICB9IGVsc2Uge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvdmVyIFBsYWluIGZpZWxkID0+IHsgXCJmaWVsZFwiOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS5raW5kID0gJ3BsYWluJztcbiAgICAgICAgY2xhdXNlLmtleSA9IHBhcnRzWzBdO1xuICAgIH1cbiAgICBcbiAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY2xhdXNlKSk7XG4gICAgXG4gICAgcmV0dXJuIGNsYXVzZTtcbn07XG5cblNlbGVjdG9yLk1BVENIX1NFTEVDVE9SID0gJ21hdGNoJztcblNlbGVjdG9yLlNPUlRfU0VMRUNUT1IgPSAnc29ydCc7XG5TZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUiA9ICdmaWVsZCc7XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3I7Il19
