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
//# sourceMappingURL=data:application/json;base64,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LE9BQTFCO0FBQ0EsU0FBUyxhQUFULEdBQXlCLE1BQXpCO0FBQ0EsU0FBUyxjQUFULEdBQTBCLE9BQTFCOztBQUVBLE9BQU8sT0FBUCxHQUFpQixRQUFqQiIsImZpbGUiOiJTZWxlY3Rvci5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBMb2dnZXIgPSByZXF1aXJlKFwianN3LWxvZ2dlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKSxcbiAgICBTZWxlY3Rvck1hdGNoZXIgPSByZXF1aXJlKFwiLi9TZWxlY3Rvck1hdGNoZXJcIik7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcblxuY2xhc3MgU2VsZWN0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHNlbGVjdG9yLCB0eXBlID0gU2VsZWN0b3IuTUFUQ0hfU0VMRUNUT1IpIHtcbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZWxlY3Rvcl9jb21waWxlZCA9IG51bGw7XG5cdFx0XG5cdFx0aWYgKHR5cGUgPT09IFNlbGVjdG9yLk1BVENIX1NFTEVDVE9SKSB7XG5cdFx0XHR0aGlzLnNlbGVjdG9yX2NvbXBpbGVkID0gdGhpcy5jb21waWxlKHNlbGVjdG9yKTtcblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpIHtcblx0XHRcdHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KHNlbGVjdG9yKTtcblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFNlbGVjdG9yLkZJRUxEX1NFTEVDVE9SKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKHNlbGVjdG9yKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nZ2VyLnRocm93KFwiWW91IG5lZWQgdG8gc3BlY2lmeSB0aGUgc2VsZWN0b3IgdHlwZVwiKTtcblx0XHR9XG4gICAgfVxuICAgIFxuICAgIHRlc3QoZG9jKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkLnRlc3QoZG9jKTtcbiAgICB9XG4gICAgXG4gICAgY29tcGlsZShzZWxlY3Rvcikge1xuXHRcdGlmIChfLmlzTmlsKHNlbGVjdG9yKSkge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBudWxsJyk7XG5cdFx0XHRcblx0XHRcdHNlbGVjdG9yID0ge307XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gbm90IG51bGwnKTtcblx0XHRcdFxuXHRcdFx0aWYgKCFzZWxlY3RvciB8fCAoXy5oYXNJbihzZWxlY3RvciwgJ19pZCcpICYmICFzZWxlY3Rvci5faWQpKSB7XG5cdFx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gZmFsc2UgdmFsdWUgfHwgeyBfaWQ6IGZhbHNlIHZhbHVlIH0nKTtcblx0XHRcdFx0XG5cdFx0XHRcdHNlbGVjdG9yID0ge1xuXHRcdFx0XHRcdF9pZDogZmFsc2Vcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0aWYgKF8uaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcblx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gZnVuY3Rpb24oZG9jKSB7IC4uLiB9Jyk7XG5cdFx0XHRcblx0XHRcdC8vX2luaXRGdW5jdGlvbi5jYWxsKG1hdGNoZXIsIHNlbGVjdG9yKTtcblx0XHRcdHRoaXMuY2xhdXNlcyA9IFt7XG5cdFx0XHRcdGtpbmQ6ICdmdW5jdGlvbicsXG5cdFx0XHRcdHZhbHVlOiBzZWxlY3RvclxuXHRcdFx0fV07XG5cdFx0XHRcblx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlcyBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkodGhpcy5jbGF1c2VzKSk7XG5cdFx0fSBlbHNlIGlmIChfLmlzU3RyaW5nKHNlbGVjdG9yKSB8fCBfLmlzTnVtYmVyKHNlbGVjdG9yKSkge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBcIjEyMzQ1Njc4OVwiIHx8IDEyMzQ1Njc5OCcpO1xuXHRcdFx0XG5cdFx0XHRzZWxlY3RvciA9IHtcblx0XHRcdFx0X2lkOiBzZWxlY3RvclxuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0Ly9faW5pdE9iamVjdC5jYWxsKG1hdGNoZXIsIHNlbGVjdG9yKTtcblx0XHRcdHRoaXMuY2xhdXNlcyA9IF9idWlsZFNlbGVjdG9yKHNlbGVjdG9yKTtcblx0XHRcdFxuXHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2VzIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeSh0aGlzLmNsYXVzZXMpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiB7IGZpZWxkOiB2YWx1ZSB9Jyk7XG5cdFx0XHRcblx0XHRcdC8vX2luaXRPYmplY3QuY2FsbChtYXRjaGVyLCBzZWxlY3Rvcik7XG5cdFx0XHR0aGlzLmNsYXVzZXMgPSBfYnVpbGRTZWxlY3RvcihzZWxlY3Rvcik7XG5cdFx0XHRcblx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlcyBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkodGhpcy5jbGF1c2VzKSk7XG5cdFx0fVxuXHRcdFxuXHRcdHZhciBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcih0aGlzKTtcblx0XHRcblx0XHRyZXR1cm4gbWF0Y2hlcjtcbiAgICB9XG4gICAgXG4gICAgY29tcGlsZVNvcnQoc3BlYykge1xuICAgICAgICBpZiAoXy5pc05pbChzcGVjKSkgIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICB2YXIgYXNjID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc1N0cmluZyhzcGVjKSkge1xuICAgICAgICAgICAgc3BlYyA9IHNwZWMucmVwbGFjZSgvKCApKy9pZywgJyAnKS50cmltKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzcGVjLmluZGV4T2YoJywnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIGNvbW1hcyBieSBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZVNvcnQoc3BlYy5yZXBsYWNlKC8sL2lnLCAnICcpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3BlYy5pbmRleE9mKCcgJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHNwZWMuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmllbGQgPSBmaWVsZHNbaV0udHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKChmaWVsZCA9PT0gJ2Rlc2MnICB8fCBmaWVsZCA9PT0gJ2FzYycpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoZmllbGQgPT09ICctMScgICAgfHwgZmllbGQgPT09ICcxJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChmaWVsZCA9PT0gJ2ZhbHNlJyB8fCBmaWVsZCA9PT0gJ3RydWUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgc29ydCBzcGVjaWZpY2F0aW9uOiBcIiwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5leHQgPSBfLnRvU3RyaW5nKGZpZWxkc1tpKzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICdkZXNjJyB8fCBuZXh0ID09PSAnYXNjJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNjLnB1c2goKG5leHQgPT09ICdhc2MnKSA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXh0ID09PSAnLTEnIHx8IG5leHQgPT09ICcxJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNjLnB1c2goKG5leHQgPT09ICcxJykgPyB0cnVlIDogZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmV4dCA9PT0gJ2ZhbHNlJyB8fCBuZXh0ID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKChuZXh0ID09PSAndHJ1ZScpID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNjLnB1c2godHJ1ZSk7IC8vIERlZmF1bHQgc29ydFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLy5zb3J0KFwiZmllbGQxXCIpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAga2V5cy5wdXNoKHNwZWMpO1xuICAgICAgICAgICAgICAgIGFzYy5wdXNoKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheShzcGVjKSkge1xuICAgICAgICAgICAgLy8gSm9pbiB0aGUgYXJyYXkgd2l0aCBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlU29ydChzcGVjLmpvaW4oJyAnKSk7XG4gICAgICAgICAgICAvLyBmb3IgKHZhciBpID0gMDsgaSA8IHNwZWMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vICAgICBpZiAoXy5pc1N0cmluZyhzcGVjW2ldKSkge1xuICAgICAgICAgICAgLy8gICAgICAgICBrZXlzLnB1c2goc3BlY1tpXSk7XG4gICAgICAgICAgICAvLyAgICAgICAgIGFzYy5wdXNoKHRydWUpO1xuICAgICAgICAgICAgLy8gICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIGtleXMucHVzaChzcGVjW2ldWzBdKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgYXNjLnB1c2goc3BlY1tpXVsxXSAhPT0gXCJkZXNjXCIpO1xuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3Qoc3BlYykpIHtcbiAgICAgICAgICAgIC8vIFRPRE8gTmVzdGVkIHBhdGggLT4gLnNvcnQoeyBcImZpZWxkMS5maWVsZDEyXCI6IFwiYXNjXCIgfSlcbiAgICAgICAgICAgIHZhciBfc3BlYyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNwZWMpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5oYXNJbihzcGVjLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgX3NwZWMucHVzaChzcGVjW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZVNvcnQoX3NwZWMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgc29ydCBzcGVjaWZpY2F0aW9uOiBcIiwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIC8vIHJldHVybiB7a2V5czoga2V5cywgYXNjOiBhc2N9O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaSAhPT0gMCAmJiB4ICE9PSAwKSByZXR1cm4geDsgICAvLyBOb24gcmVhY2hhYmxlP1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIHggPSBTZWxlY3Rvci5fZi5fY21wKGFbSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSldLCBiW0pTT04uc3RyaW5naWZ5KGtleXNbaV0pXSk7XG4gICAgICAgICAgICAgICAgeCA9IFNlbGVjdG9yTWF0Y2hlci5jbXAoYVtrZXlzW2ldXSwgYltrZXlzW2ldXSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFhc2NbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgeCAqPSAtMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gZXZhbCgpIGRvZXMgbm90IHJldHVybiBhIHZhbHVlIGluIElFOCwgbm9yIGRvZXMgdGhlIHNwZWMgc2F5IGl0XG4gICAgICAgIC8vIHNob3VsZC4gQXNzaWduIHRvIGEgbG9jYWwgdG8gZ2V0IHRoZSB2YWx1ZSwgaW5zdGVhZC5cbiAgICAgICAgXG4gICAgICAgIC8vIHZhciBfZnVuYztcbiAgICAgICAgLy8gdmFyIGNvZGUgPSBcIl9mdW5jID0gKGZ1bmN0aW9uKGMpe3JldHVybiBmdW5jdGlvbihhLGIpe3ZhciB4O1wiO1xuICAgICAgICAvLyBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gICAgIGlmIChpICE9PSAwKSB7XG4gICAgICAgIC8vICAgICAgICAgY29kZSArPSBcImlmKHghPT0wKXJldHVybiB4O1wiO1xuICAgICAgICAvLyAgICAgfVxuICAgIFxuICAgICAgICAvLyAgICAgY29kZSArPSBcIng9XCIgKyAoYXNjW2ldID8gXCJcIiA6IFwiLVwiKSArIFwiYyhhW1wiICsgSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSkgKyBcIl0sYltcIiArIEpTT04uc3RyaW5naWZ5KGtleXNbaV0pICsgXCJdKTtcIjtcbiAgICAgICAgLy8gfVxuICAgIFxuICAgICAgICAvLyBjb2RlICs9IFwicmV0dXJuIHg7fTt9KVwiO1xuICAgIFxuICAgICAgICAvLyBldmFsKGNvZGUpO1xuICAgIFxuICAgICAgICAvLyByZXR1cm4gX2Z1bmMoU2VsZWN0b3IuX2YuX2NtcCk7XG4gICAgfVxuICAgIFxuICAgIGNvbXBpbGVGaWVsZHMoc3BlYykge1xuICAgICAgICB2YXIgcHJvamVjdGlvbiA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoc3BlYykpIHJldHVybiBwcm9qZWN0aW9uO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcoc3BlYykpIHtcbiAgICAgICAgICAgIHNwZWMgPSBzcGVjLnJlcGxhY2UoLyggKSsvaWcsICcgJykudHJpbSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc3BlYy5pbmRleE9mKCcsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVwbGFjZSBjb21tYXMgYnkgc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoc3BlYy5yZXBsYWNlKC8sL2lnLCAnICcpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3BlYy5pbmRleE9mKCcgJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHNwZWMuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmllbGQgPSBmaWVsZHNbaV0udHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKChmaWVsZCA9PT0gJy0xJyAgICB8fCBmaWVsZCA9PT0gJzEnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGZpZWxkID09PSAnZmFsc2UnIHx8IGZpZWxkID09PSAndHJ1ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCBmaWVsZHMgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gXy50b1N0cmluZyhmaWVsZHNbaSsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnLTEnIHx8IG5leHQgPT09ICcxJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnLTEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IF9rZXkgaW4gcHJvamVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkICE9PSAnX2lkJyAmJiBwcm9qZWN0aW9uW19rZXldID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQSBwcm9qZWN0aW9uIGNhbm5vdCBjb250YWluIGJvdGggaW5jbHVkZSBhbmQgZXhjbHVkZSBzcGVjaWZpY2F0aW9uc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmV4dCA9PT0gJ2ZhbHNlJyB8fCBuZXh0ID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmllbGQgPT09ICdfaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQSBwcm9qZWN0aW9uIGNhbm5vdCBjb250YWluIGJvdGggaW5jbHVkZSBhbmQgZXhjbHVkZSBzcGVjaWZpY2F0aW9uc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNwZWMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vLmZpbmQoe30sIFwiZmllbGQxXCIpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbltzcGVjXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHNwZWMpKSB7XG4gICAgICAgICAgICAvLyBKb2luIHRoZSBhcnJheSB3aXRoIHNwYWNlcywgYW5kIHRyZWF0IGl0IGFzIGEgc3BhY2VkLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoc3BlYy5qb2luKCcgJykpO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNQbGFpbk9iamVjdChzcGVjKSkge1xuICAgICAgICAgICAgLy8gVE9ETyBOZXN0ZWQgcGF0aCAtPiAuZmluZCh7fSwgeyBcImZpZWxkMS5maWVsZDEyXCI6IFwiYXNjXCIgfSlcbiAgICAgICAgICAgIHZhciBfc3BlYyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNwZWMpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5oYXNJbihzcGVjLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgX3NwZWMucHVzaChzcGVjW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZUZpZWxkcyhfc3BlYyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCBmaWVsZHMgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHByb2plY3Rpb247XG4gICAgfVxuXHRcblx0LyogU1RBVElDIE1FVEhPRFMgKi9cblx0c3RhdGljIGlzU2VsZWN0b3JDb21waWxlZChzZWxlY3Rvcikge1xuXHRcdGlmICghXy5pc05pbChzZWxlY3RvcikgJiYgKFxuXHRcdCAgICBzZWxlY3RvciBpbnN0YW5jZW9mIFNlbGVjdG9yTWF0Y2hlciB8fCAoc2VsZWN0b3IgaW5zdGFuY2VvZiBTZWxlY3RvciAmJiBcblx0XHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yLnNlbGVjdG9yX2NvbXBpbGVkIGluc3RhbmNlb2YgU2VsZWN0b3JNYXRjaGVyKVxuXHQgICAgKSkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblx0XG5cdHN0YXRpYyBtYXRjaGVzKHNlbGVjdG9yLCBkb2MpIHtcbiAgICAgICAgcmV0dXJuIChuZXcgU2VsZWN0b3Ioc2VsZWN0b3IpKS50ZXN0KGRvYyk7XG4gICAgfVxufVxuXG52YXIgX2J1aWxkU2VsZWN0b3IgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuXHRsb2dnZXIuZGVidWcoJ0NhbGxlZDogX2J1aWxkU2VsZWN0b3InKTtcbiAgICBcbiAgICB2YXIgY2xhdXNlcyA9IFtdO1xuICAgIFxuICAgIGZvciAodmFyIGtleSBpbiBzZWxlY3Rvcikge1xuICAgICAgICB2YXIgdmFsdWUgPSBzZWxlY3RvcltrZXldO1xuICAgICAgICBcbiAgICAgICAgaWYgKGtleS5jaGFyQXQoMCkgPT09ICckJykge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBvcGVyYXRvciA9PiB7ICRhbmQ6IFt7Li4ufSwgey4uLn1dIH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlcy5wdXNoKF9idWlsZERvY3VtZW50U2VsZWN0b3Ioa2V5LCB2YWx1ZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBwbGFpbiA9PiB7IGZpZWxkMTogPHZhbHVlPiB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZXMucHVzaChfYnVpbGRLZXlwYXRoU2VsZWN0b3Ioa2V5LCB2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBjbGF1c2VzO1xufTtcblxudmFyIF9idWlsZERvY3VtZW50U2VsZWN0b3IgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgdmFyIGNsYXVzZSA9IHt9O1xuICAgIFxuICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgIGNhc2UgJyRvcic6XG4gICAgICAgIGNhc2UgJyRhbmQnOlxuICAgICAgICBjYXNlICckbm9yJzpcbiAgICAgICAgICAgIGNsYXVzZS5rZXkgPSBrZXkucmVwbGFjZSgvXFwkLywgJycpO1xuICAgICAgICAgICAgLy8gVGhlIHJlc3Qgd2lsbCBiZSBoYW5kbGVkIGJ5ICdfb3BlcmF0b3JfJ1xuICAgICAgICBjYXNlICdfb3BlcmF0b3JfJzpcbiAgICAgICAgICAgIC8vIEdlbmVyaWMgaGFuZGxlciBmb3Igb3BlcmF0b3JzICgkb3IsICRhbmQsICRub3IpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS5raW5kID0gJ29wZXJhdG9yJztcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ2FycmF5JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnZhbHVlID0gW107XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY2xhdXNlLnZhbHVlID0gXy51bmlvbihjbGF1c2UudmFsdWUsIF9idWlsZFNlbGVjdG9yKHZhbHVlW2ldKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJVbnJlY29naXplZCBrZXkgaW4gc2VsZWN0b3I6IFwiLCBrZXkpO1xuICAgIH1cbiAgICBcbiAgICAvLyBUT0RPIGNhc2VzOiAkd2hlcmUsICRlbGVtTWF0Y2hcbiAgICBcbiAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY2xhdXNlKSk7XG4gICAgXG4gICAgcmV0dXJuIGNsYXVzZTtcbn07XG5cbnZhciBfYnVpbGRLZXlwYXRoU2VsZWN0b3IgPSBmdW5jdGlvbiAoa2V5cGF0aCwgdmFsdWUpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NhbGxlZDogX2J1aWxkS2V5cGF0aFNlbGVjdG9yJyk7XG4gICAgXG4gICAgdmFyIGNsYXVzZSA9IHt9O1xuICAgIFxuICAgIGNsYXVzZS52YWx1ZSA9IHZhbHVlO1xuICAgIFxuICAgIGlmIChfLmlzTmlsKHZhbHVlKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIG51bGwnKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ251bGwnO1xuICAgIH0gZWxzZSBpZiAoXy5pc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBSZWdFeHAnKTtcblxuICAgICAgICBjbGF1c2UudHlwZSA9ICdyZWdleHAnO1xuICAgICAgICBcbiAgICAgICAgdmFyIHNvdXJjZSA9IHZhbHVlLnRvU3RyaW5nKCkuc3BsaXQoJy8nKTtcblxuICAgICAgICBjbGF1c2UudmFsdWUgPSB7XG4gICAgICAgICAgICAkcmVnZXg6IHNvdXJjZVsxXSAgIC8vIFRoZSBmaXJzdCBpdGVtIHNwbGl0dGVkIGlzIGFuIGVtcHR5IHN0cmluZ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHNvdXJjZVsyXSAhPSBcIlwiKSB7XG4gICAgICAgICAgICBjbGF1c2UudmFsdWVbXCIkb3B0aW9uc1wiXSA9IHNvdXJjZVsyXTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIEFycmF5Jyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdhcnJheSc7XG4gICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIFN0cmluZycpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnc3RyaW5nJztcbiAgICB9IGVsc2UgaWYgKF8uaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgTnVtYmVyJyk7XG4gICAgICAgIFxuICAgICAgICBjbGF1c2UudHlwZSA9ICdudW1iZXInO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgQm9vbGVhbicpO1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnYm9vbGVhbic7XG4gICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgRnVuY3Rpb24nKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS50eXBlID0gJ2Z1bmN0aW9uJztcbiAgICB9IGVsc2UgaWYgKF8uaXNQbGFpbk9iamVjdCh2YWx1ZSkpIHtcbiAgICAgICAgdmFyIGxpdGVyYWxPYmplY3QgPSB0cnVlO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChrZXkuY2hhckF0KDApID09PSAnJCcpIHtcbiAgICAgICAgICAgICAgICBsaXRlcmFsT2JqZWN0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChsaXRlcmFsT2JqZWN0KSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIE9iamVjdCA9PiB7IGZpZWxkOiB7IGZpZWxkXzE6IDx2YWx1ZT4sIGZpZWxkXzI6IDx2YWx1ZT4gfSB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ2xpdGVyYWxfb2JqZWN0JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgT3BlcmF0b3IgPT4geyBmaWVsZDogeyAkZ3Q6IDIsICRsdCA1IH0gfScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdvcGVyYXRvcl9vYmplY3QnO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2xhdXNlLnR5cGUgPSAnX19pbnZhbGlkX18nO1xuICAgIH1cbiAgICBcbiAgICB2YXIgcGFydHMgPSBrZXlwYXRoLnNwbGl0KCcuJyk7XG4gICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb3ZlciBPYmplY3QgZmllbGQgPT4geyBcImZpZWxkMS5maWVsZDFfMlwiOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS5raW5kID0gJ29iamVjdCc7XG4gICAgICAgIGNsYXVzZS5rZXkgPSBwYXJ0cztcbiAgICB9IGVsc2Uge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvdmVyIFBsYWluIGZpZWxkID0+IHsgXCJmaWVsZFwiOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS5raW5kID0gJ3BsYWluJztcbiAgICAgICAgY2xhdXNlLmtleSA9IHBhcnRzWzBdO1xuICAgIH1cbiAgICBcbiAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY2xhdXNlKSk7XG4gICAgXG4gICAgcmV0dXJuIGNsYXVzZTtcbn07XG5cblNlbGVjdG9yLk1BVENIX1NFTEVDVE9SID0gJ21hdGNoJztcblNlbGVjdG9yLlNPUlRfU0VMRUNUT1IgPSAnc29ydCc7XG5TZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUiA9ICdmaWVsZCc7XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3I7Il19
