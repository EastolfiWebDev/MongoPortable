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
            if (this.selector_compiled) {
                return this.selector_compiled.test(doc);
            } else {
                logger.throw("Selector is not compiled");
            }
        }
    }, {
        key: "compile",
        value: function compile(selector) {
            if (_.isNil(selector)) {
                logger.debug('selector -> null');

                selector = {};
            } else {
                logger.debug('selector -> not null');

                if (!selector || _.hasIn(selector, '_id')) {
                    logger.debug('selector -> false value || { _id: false value }');

                    if (!selector._id) {
                        logger.debug('selector -> false value');

                        selector = {
                            _id: false
                        };
                    } else {
                        logger.debug('selector -> { _id: false value }');

                        selector = {
                            _id: _.toString(selector)
                        };
                    }
                }
            }

            if (_.isFunction(selector)) {
                logger.debug('selector -> function(doc) { ... }');

                //_initFunction.call(matcher, selector);
                this.clauses.push({
                    kind: 'function',
                    value: selector
                });

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
                return this.compileFields(spec.join(' '));
            } else if (_.isPlainObject(spec)) {
                // TODO Nested path -> .sort({ "field1.field12": "asc" })
                var _spec = [];
                for (var key in spec) {
                    if (_.hasIn(spec, key)) {
                        _spec.push(key);
                        _spec.push(spec[key]);
                    }
                }

                return this.compileFields(_spec);
            } else {
                throw Error("Bad sort specification: ", JSON.stringify(spec));
            }

            return projection;
        }

        /* STATIC METHODS */

    }], [{
        key: "isSelectorCompiled",
        value: function isSelectorCompiled(selector) {
            if (!_.isNil(selector) && selector instanceof SelectorMatcher) {
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
                clauses.push(_buildSelector(_val));
            });

            clause.value = clauses;

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
            logger.debug('clause of type Object => { field: { field_1: <value>, field_2: <value> } }');

            clause.type = 'literal_object';
        } else {
            logger.debug('clause of type Operator => { field: { $gt: 2, $lt 5 } }');

            clause.type = 'operator_object';
        }
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
//# sourceMappingURL=data:application/json;base64,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dG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIExvZ2dlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0xvZ2dlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKSxcbiAgICBTZWxlY3Rvck1hdGNoZXIgPSByZXF1aXJlKFwiLi9TZWxlY3Rvck1hdGNoZXJcIik7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcblxuY2xhc3MgU2VsZWN0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHNlbGVjdG9yLCB0eXBlID0gU2VsZWN0b3IuTUFUQ0hfU0VMRUNUT1IpIHtcbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZWxlY3Rvcl9jb21waWxlZCA9IG51bGw7XG5cdFx0XG5cdFx0aWYgKHR5cGUgPT09IFNlbGVjdG9yLk1BVENIX1NFTEVDVE9SKSB7XG5cdFx0XHR0aGlzLnNlbGVjdG9yX2NvbXBpbGVkID0gdGhpcy5jb21waWxlKHNlbGVjdG9yKTtcblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpIHtcblx0XHRcdHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KHNlbGVjdG9yKTtcblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFNlbGVjdG9yLkZJRUxEX1NFTEVDVE9SKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKHNlbGVjdG9yKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nZ2VyLnRocm93KFwiWW91IG5lZWQgdG8gc3BlY2lmeSB0aGUgc2VsZWN0b3IgdHlwZVwiKTtcblx0XHR9XG4gICAgfVxuICAgIFxuICAgIHRlc3QoZG9jKSB7XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdG9yX2NvbXBpbGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3Rvcl9jb21waWxlZC50ZXN0KGRvYyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIudGhyb3coXCJTZWxlY3RvciBpcyBub3QgY29tcGlsZWRcIik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgY29tcGlsZShzZWxlY3Rvcikge1xuXHRcdGlmIChfLmlzTmlsKHNlbGVjdG9yKSkge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBudWxsJyk7XG5cdFx0XHRcblx0XHRcdHNlbGVjdG9yID0ge307XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gbm90IG51bGwnKTtcblx0XHRcdFxuXHRcdFx0aWYgKCFzZWxlY3RvciB8fCBfLmhhc0luKHNlbGVjdG9yLCAnX2lkJykpIHtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBmYWxzZSB2YWx1ZSB8fCB7IF9pZDogZmFsc2UgdmFsdWUgfScpO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCFzZWxlY3Rvci5faWQpIHtcblx0XHRcdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IGZhbHNlIHZhbHVlJyk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0c2VsZWN0b3IgPSB7XG5cdFx0XHRcdFx0XHRfaWQ6IGZhbHNlXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IHsgX2lkOiBmYWxzZSB2YWx1ZSB9Jyk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0c2VsZWN0b3IgPSB7XG5cdFx0XHRcdFx0XHRfaWQ6IF8udG9TdHJpbmcoc2VsZWN0b3IpXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHRpZiAoXy5pc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBmdW5jdGlvbihkb2MpIHsgLi4uIH0nKTtcblx0XHRcdFxuXHRcdFx0Ly9faW5pdEZ1bmN0aW9uLmNhbGwobWF0Y2hlciwgc2VsZWN0b3IpO1xuXHRcdFx0dGhpcy5jbGF1c2VzLnB1c2goe1xuXHRcdFx0XHRraW5kOiAnZnVuY3Rpb24nLFxuXHRcdFx0XHR2YWx1ZTogc2VsZWN0b3Jcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZXMgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMuY2xhdXNlcykpO1xuXHRcdH0gZWxzZSBpZiAoXy5pc1N0cmluZyhzZWxlY3RvcikgfHwgXy5pc051bWJlcihzZWxlY3RvcikpIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gXCIxMjM0NTY3ODlcIiB8fCAxMjM0NTY3OTgnKTtcblx0XHRcdFxuXHRcdFx0c2VsZWN0b3IgPSB7XG5cdFx0XHRcdF9pZDogc2VsZWN0b3Jcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdC8vX2luaXRPYmplY3QuY2FsbChtYXRjaGVyLCBzZWxlY3Rvcik7XG5cdFx0XHR0aGlzLmNsYXVzZXMgPSBfYnVpbGRTZWxlY3RvcihzZWxlY3Rvcik7XG5cdFx0XHRcblx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlcyBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkodGhpcy5jbGF1c2VzKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4geyBmaWVsZDogdmFsdWUgfScpO1xuXHRcdFx0XG5cdFx0XHQvL19pbml0T2JqZWN0LmNhbGwobWF0Y2hlciwgc2VsZWN0b3IpO1xuXHRcdFx0dGhpcy5jbGF1c2VzID0gX2J1aWxkU2VsZWN0b3Ioc2VsZWN0b3IpO1xuXHRcdFx0XG5cdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZXMgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMuY2xhdXNlcykpO1xuXHRcdH1cblx0XHRcblx0XHR2YXIgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXIodGhpcyk7XG5cdFx0XG5cdFx0cmV0dXJuIG1hdGNoZXI7XG4gICAgfVxuICAgIFxuICAgIGNvbXBpbGVTb3J0KHNwZWMpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoc3BlYykpICB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgdmFyIGFzYyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcoc3BlYykpIHtcbiAgICAgICAgICAgIHNwZWMgPSBzcGVjLnJlcGxhY2UoLyggKSsvaWcsICcgJykudHJpbSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc3BlYy5pbmRleE9mKCcsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVwbGFjZSBjb21tYXMgYnkgc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KHNwZWMucmVwbGFjZSgvLC9pZywgJyAnKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNwZWMuaW5kZXhPZignICcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZHMgPSBzcGVjLnNwbGl0KCcgJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpZWxkID0gZmllbGRzW2ldLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZmllbGQgPT09ICdkZXNjJyAgfHwgZmllbGQgPT09ICdhc2MnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGZpZWxkID09PSAnLTEnICAgIHx8IGZpZWxkID09PSAnMScpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoZmllbGQgPT09ICdmYWxzZScgfHwgZmllbGQgPT09ICd0cnVlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHNvcnQgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gXy50b1N0cmluZyhmaWVsZHNbaSsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnZGVzYycgfHwgbmV4dCA9PT0gJ2FzYycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKChuZXh0ID09PSAnYXNjJykgPyB0cnVlIDogZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmV4dCA9PT0gJy0xJyB8fCBuZXh0ID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKChuZXh0ID09PSAnMScpID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5leHQgPT09ICdmYWxzZScgfHwgbmV4dCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGZpZWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCgobmV4dCA9PT0gJ3RydWUnKSA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKHRydWUpOyAvLyBEZWZhdWx0IHNvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8uc29ydChcImZpZWxkMVwiKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGtleXMucHVzaChzcGVjKTtcbiAgICAgICAgICAgICAgICBhc2MucHVzaCh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChfLmlzQXJyYXkoc3BlYykpIHtcbiAgICAgICAgICAgIC8vIEpvaW4gdGhlIGFycmF5IHdpdGggc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZVNvcnQoc3BlYy5qb2luKCcgJykpO1xuICAgICAgICAgICAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBzcGVjLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyAgICAgaWYgKF8uaXNTdHJpbmcoc3BlY1tpXSkpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAga2V5cy5wdXNoKHNwZWNbaV0pO1xuICAgICAgICAgICAgLy8gICAgICAgICBhc2MucHVzaCh0cnVlKTtcbiAgICAgICAgICAgIC8vICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gICAgICAgICBrZXlzLnB1c2goc3BlY1tpXVswXSk7XG4gICAgICAgICAgICAvLyAgICAgICAgIGFzYy5wdXNoKHNwZWNbaV1bMV0gIT09IFwiZGVzY1wiKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc1BsYWluT2JqZWN0KHNwZWMpKSB7XG4gICAgICAgICAgICAvLyBUT0RPIE5lc3RlZCBwYXRoIC0+IC5zb3J0KHsgXCJmaWVsZDEuZmllbGQxMlwiOiBcImFzY1wiIH0pXG4gICAgICAgICAgICB2YXIgX3NwZWMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcGVjKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaGFzSW4oc3BlYywga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBfc3BlYy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goc3BlY1trZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KF9zcGVjKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHNvcnQgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyByZXR1cm4ge2tleXM6IGtleXMsIGFzYzogYXNjfTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIHZhciB4ID0gMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgIT09IDAgJiYgeCAhPT0gMCkgcmV0dXJuIHg7ICAgLy8gTm9uIHJlYWNoYWJsZT9cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyB4ID0gU2VsZWN0b3IuX2YuX2NtcChhW0pTT04uc3RyaW5naWZ5KGtleXNbaV0pXSwgYltKU09OLnN0cmluZ2lmeShrZXlzW2ldKV0pO1xuICAgICAgICAgICAgICAgIHggPSBTZWxlY3Rvck1hdGNoZXIuY21wKGFba2V5c1tpXV0sIGJba2V5c1tpXV0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghYXNjW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIHggKj0gLTE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIGV2YWwoKSBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZSBpbiBJRTgsIG5vciBkb2VzIHRoZSBzcGVjIHNheSBpdFxuICAgICAgICAvLyBzaG91bGQuIEFzc2lnbiB0byBhIGxvY2FsIHRvIGdldCB0aGUgdmFsdWUsIGluc3RlYWQuXG4gICAgICAgIFxuICAgICAgICAvLyB2YXIgX2Z1bmM7XG4gICAgICAgIC8vIHZhciBjb2RlID0gXCJfZnVuYyA9IChmdW5jdGlvbihjKXtyZXR1cm4gZnVuY3Rpb24oYSxiKXt2YXIgeDtcIjtcbiAgICAgICAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vICAgICBpZiAoaSAhPT0gMCkge1xuICAgICAgICAvLyAgICAgICAgIGNvZGUgKz0gXCJpZih4IT09MClyZXR1cm4geDtcIjtcbiAgICAgICAgLy8gICAgIH1cbiAgICBcbiAgICAgICAgLy8gICAgIGNvZGUgKz0gXCJ4PVwiICsgKGFzY1tpXSA/IFwiXCIgOiBcIi1cIikgKyBcImMoYVtcIiArIEpTT04uc3RyaW5naWZ5KGtleXNbaV0pICsgXCJdLGJbXCIgKyBKU09OLnN0cmluZ2lmeShrZXlzW2ldKSArIFwiXSk7XCI7XG4gICAgICAgIC8vIH1cbiAgICBcbiAgICAgICAgLy8gY29kZSArPSBcInJldHVybiB4O307fSlcIjtcbiAgICBcbiAgICAgICAgLy8gZXZhbChjb2RlKTtcbiAgICBcbiAgICAgICAgLy8gcmV0dXJuIF9mdW5jKFNlbGVjdG9yLl9mLl9jbXApO1xuICAgIH1cbiAgICBcbiAgICBjb21waWxlRmllbGRzKHNwZWMpIHtcbiAgICAgICAgdmFyIHByb2plY3Rpb24gPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzU3RyaW5nKHNwZWMpKSB7XG4gICAgICAgICAgICBzcGVjID0gc3BlYy5yZXBsYWNlKC8oICkrL2lnLCAnICcpLnRyaW0oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNwZWMuaW5kZXhPZignLCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIFJlcGxhY2UgY29tbWFzIGJ5IHNwYWNlcywgYW5kIHRyZWF0IGl0IGFzIGEgc3BhY2VkLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKHNwZWMucmVwbGFjZSgvLC9pZywgJyAnKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNwZWMuaW5kZXhPZignICcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZHMgPSBzcGVjLnNwbGl0KCcgJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpZWxkID0gZmllbGRzW2ldLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZmllbGQgPT09ICctMScgICAgfHwgZmllbGQgPT09ICcxJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChmaWVsZCA9PT0gJ2ZhbHNlJyB8fCBmaWVsZCA9PT0gJ3RydWUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgZmllbGRzIHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IF8udG9TdHJpbmcoZmllbGRzW2krMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCA9PT0gJy0xJyB8fCBuZXh0ID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCA9PT0gJy0xJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmllbGQgPT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQSBwcm9qZWN0aW9uIGNhbm5vdCBjb250YWluIGJvdGggaW5jbHVkZSBhbmQgZXhjbHVkZSBzcGVjaWZpY2F0aW9uc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXh0ID09PSAnZmFsc2UnIHx8IG5leHQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZCA9PT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHByb2plY3Rpb24gY2Fubm90IGNvbnRhaW4gYm90aCBpbmNsdWRlIGFuZCBleGNsdWRlIHNwZWNpZmljYXRpb25zXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3BlYy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8uZmluZCh7fSwgXCJmaWVsZDFcIilcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW3NwZWNdID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChfLmlzQXJyYXkoc3BlYykpIHtcbiAgICAgICAgICAgIC8vIEpvaW4gdGhlIGFycmF5IHdpdGggc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZUZpZWxkcyhzcGVjLmpvaW4oJyAnKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc1BsYWluT2JqZWN0KHNwZWMpKSB7XG4gICAgICAgICAgICAvLyBUT0RPIE5lc3RlZCBwYXRoIC0+IC5zb3J0KHsgXCJmaWVsZDEuZmllbGQxMlwiOiBcImFzY1wiIH0pXG4gICAgICAgICAgICB2YXIgX3NwZWMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcGVjKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaGFzSW4oc3BlYywga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBfc3BlYy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goc3BlY1trZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoX3NwZWMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgc29ydCBzcGVjaWZpY2F0aW9uOiBcIiwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcHJvamVjdGlvbjtcbiAgICB9XG5cdFxuXHQvKiBTVEFUSUMgTUVUSE9EUyAqL1xuXHRzdGF0aWMgaXNTZWxlY3RvckNvbXBpbGVkKHNlbGVjdG9yKSB7XG5cdFx0aWYgKCFfLmlzTmlsKHNlbGVjdG9yKSAmJiBzZWxlY3RvciBpbnN0YW5jZW9mIFNlbGVjdG9yTWF0Y2hlcikge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblx0XG5cdHN0YXRpYyBtYXRjaGVzKHNlbGVjdG9yLCBkb2MpIHtcbiAgICAgICAgcmV0dXJuIChuZXcgU2VsZWN0b3Ioc2VsZWN0b3IpKS50ZXN0KGRvYyk7XG4gICAgfVxufVxuXG52YXIgX2J1aWxkU2VsZWN0b3IgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuXHRsb2dnZXIuZGVidWcoJ0NhbGxlZDogX2J1aWxkU2VsZWN0b3InKTtcbiAgICBcbiAgICB2YXIgY2xhdXNlcyA9IFtdO1xuICAgIFxuICAgIGZvciAodmFyIGtleSBpbiBzZWxlY3Rvcikge1xuICAgICAgICB2YXIgdmFsdWUgPSBzZWxlY3RvcltrZXldO1xuICAgICAgICBcbiAgICAgICAgaWYgKGtleS5jaGFyQXQoMCkgPT09ICckJykge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBvcGVyYXRvciA9PiB7ICRhbmQ6IFt7Li4ufSwgey4uLn1dIH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlcy5wdXNoKF9idWlsZERvY3VtZW50U2VsZWN0b3Ioa2V5LCB2YWx1ZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBwbGFpbiA9PiB7IGZpZWxkMTogPHZhbHVlPiB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZXMucHVzaChfYnVpbGRLZXlwYXRoU2VsZWN0b3Ioa2V5LCB2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBjbGF1c2VzO1xufTtcblxudmFyIF9idWlsZERvY3VtZW50U2VsZWN0b3IgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgdmFyIGNsYXVzZSA9IHt9O1xuICAgIFxuICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgIGNhc2UgJyRvcic6XG4gICAgICAgICAgICBjbGF1c2Uua2V5ID0gJ29yJztcbiAgICAgICAgICAgIC8vIFRoZSByZXN0IHdpbGwgYmUgaGFuZGxlZCBieSAnX29wZXJhdG9yXydcbiAgICAgICAgY2FzZSAnJGFuZCc6XG4gICAgICAgICAgICBjbGF1c2Uua2V5ID0gJ2FuZCc7XG4gICAgICAgICAgICAvLyBUaGUgcmVzdCB3aWxsIGJlIGhhbmRsZWQgYnkgJ19vcGVyYXRvcl8nXG4gICAgICAgIGNhc2UgJyRub3InOlxuICAgICAgICAgICAgY2xhdXNlLmtleSA9ICdub3InO1xuICAgICAgICAgICAgLy8gVGhlIHJlc3Qgd2lsbCBiZSBoYW5kbGVkIGJ5ICdfb3BlcmF0b3JfJ1xuICAgICAgICBjYXNlICdfb3BlcmF0b3JfJzpcbiAgICAgICAgICAgIC8vIEdlbmVyaWMgaGFuZGxlciBmb3Igb3BlcmF0b3JzICgkb3IsICRhbmQsICRub3IpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS5raW5kID0gJ29wZXJhdG9yJztcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ2FycmF5JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNsYXVzZXMgPSBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXy5mb3JFYWNoKHZhbHVlLCBmdW5jdGlvbihfdmFsKSB7XG4gICAgICAgICAgICAgICAgY2xhdXNlcy5wdXNoKF9idWlsZFNlbGVjdG9yKF92YWwpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2UudmFsdWUgPSBjbGF1c2VzO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiVW5yZWNvZ2l6ZWQga2V5IGluIHNlbGVjdG9yOiBcIiwga2V5KTtcbiAgICB9XG4gICAgXG4gICAgLy8gVE9ETyBjYXNlczogJHdoZXJlLCAkZWxlbU1hdGNoXG4gICAgXG4gICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2UgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KGNsYXVzZSkpO1xuICAgIFxuICAgIHJldHVybiBjbGF1c2U7XG59O1xuXG52YXIgX2J1aWxkS2V5cGF0aFNlbGVjdG9yID0gZnVuY3Rpb24gKGtleXBhdGgsIHZhbHVlKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdDYWxsZWQ6IF9idWlsZEtleXBhdGhTZWxlY3RvcicpO1xuICAgIFxuICAgIHZhciBjbGF1c2UgPSB7fTtcbiAgICBcbiAgICBjbGF1c2UudmFsdWUgPSB2YWx1ZTtcbiAgICBcbiAgICBpZiAoXy5pc05pbCh2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBudWxsJyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdudWxsJztcbiAgICB9IGVsc2UgaWYgKF8uaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgUmVnRXhwJyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdyZWdleHAnO1xuICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIEFycmF5Jyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdhcnJheSc7XG4gICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIFN0cmluZycpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnc3RyaW5nJztcbiAgICB9IGVsc2UgaWYgKF8uaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgTnVtYmVyJyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdudW1iZXInO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgQm9vbGVhbicpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnYm9vbGVhbic7XG4gICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgRnVuY3Rpb24nKTtcbiAgICAgICAgXG4gICAgICAgIHRocm93IEVycm9yKFwiQmFkIHZhbHVlIHR5cGUgaW4gcXVlcnlcIik7XG4gICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3QodmFsdWUpKSB7XG4gICAgICAgIHZhciBsaXRlcmFsT2JqZWN0ID0gdHJ1ZTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoa2V5LmNoYXJBdCgwKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICAgICAgbGl0ZXJhbE9iamVjdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAobGl0ZXJhbE9iamVjdCkge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBPYmplY3QgPT4geyBmaWVsZDogeyBmaWVsZF8xOiA8dmFsdWU+LCBmaWVsZF8yOiA8dmFsdWU+IH0gfScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdsaXRlcmFsX29iamVjdCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIE9wZXJhdG9yID0+IHsgZmllbGQ6IHsgJGd0OiAyLCAkbHQgNSB9IH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnb3BlcmF0b3Jfb2JqZWN0JztcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICB2YXIgcGFydHMgPSBrZXlwYXRoLnNwbGl0KCcuJyk7XG4gICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb3ZlciBPYmplY3QgZmllbGQgPT4geyBcImZpZWxkMS5maWVsZDFfMlwiOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS5raW5kID0gJ29iamVjdCc7XG4gICAgICAgIGNsYXVzZS5rZXkgPSBwYXJ0cztcbiAgICB9IGVsc2Uge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvdmVyIFBsYWluIGZpZWxkID0+IHsgXCJmaWVsZFwiOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS5raW5kID0gJ3BsYWluJztcbiAgICAgICAgY2xhdXNlLmtleSA9IHBhcnRzWzBdO1xuICAgIH1cbiAgICBcbiAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY2xhdXNlKSk7XG4gICAgXG4gICAgcmV0dXJuIGNsYXVzZTtcbn07XG5cblNlbGVjdG9yLk1BVENIX1NFTEVDVE9SID0gJ21hdGNoJztcblNlbGVjdG9yLlNPUlRfU0VMRUNUT1IgPSAnc29ydCc7XG5TZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUiA9ICdmaWVsZCc7XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3I7Il19
