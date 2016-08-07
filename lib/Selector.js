'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var logger = null;

module.exports = function (ObjectId, SelectorMatcher, Logger, _) {
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
            key: 'test',
            value: function test(doc) {
                return this.selector_compiled.test(doc);
            }
        }, {
            key: 'compile',
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
            key: 'compileSort',
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
            key: 'compileFields',
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
            key: 'isSelectorCompiled',
            value: function isSelectorCompiled(selector) {
                if (!_.isNil(selector) && (selector instanceof SelectorMatcher || selector instanceof Selector && selector.selector_compiled instanceof SelectorMatcher)) {
                    return true;
                } else {
                    return false;
                }
            }
        }, {
            key: 'matches',
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

    return Selector;
};
//# sourceMappingURL=data:application/json;base64,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QWMsZ0JBQWQ7QUFDSCxhQUpELE1BSU87QUFDSCx1QkFBTyxLQUFQLENBQWEseURBQWI7O0FBRUEsdUJBQU8sSUFBUCxHQUFjLGlCQUFkO0FBQ0g7QUFDSixTQWxCTSxNQWtCQSxJQUFJLGlCQUFpQixRQUFyQixFQUErQjtBQUNsQyxtQkFBTyxLQUFQLENBQWEsbUNBQWI7O0FBRUEsbUJBQU8sSUFBUCxHQUFjLFFBQWQ7QUFDQSxtQkFBTyxLQUFQLEdBQWUsTUFBTSxRQUFOLEVBQWY7QUFDSCxTQUxNLE1BS0E7QUFDSCxtQkFBTyxJQUFQLEdBQWMsYUFBZDtBQUNIOztBQUVELFlBQUksUUFBUSxRQUFRLEtBQVIsQ0FBYyxHQUFkLENBQVo7QUFDQSxZQUFJLE1BQU0sTUFBTixHQUFlLENBQW5CLEVBQXNCO0FBQ2xCLG1CQUFPLEtBQVAsQ0FBYSw0REFBYjs7QUFFQSxtQkFBTyxJQUFQLEdBQWMsUUFBZDtBQUNBLG1CQUFPLEdBQVAsR0FBYSxLQUFiO0FBQ0gsU0FMRCxNQUtPO0FBQ0gsbUJBQU8sS0FBUCxDQUFhLGlEQUFiOztBQUVBLG1CQUFPLElBQVAsR0FBYyxPQUFkO0FBQ0EsbUJBQU8sR0FBUCxHQUFhLE1BQU0sQ0FBTixDQUFiO0FBQ0g7O0FBRUQsZUFBTyxLQUFQLENBQWEscUJBQXFCLEtBQUssU0FBTCxDQUFlLE1BQWYsQ0FBbEM7O0FBRUEsZUFBTyxNQUFQO0FBQ0gsS0F4RkQ7O0FBMEZBLGFBQVMsY0FBVCxHQUEwQixPQUExQjtBQUNBLGFBQVMsYUFBVCxHQUF5QixNQUF6QjtBQUNBLGFBQVMsY0FBVCxHQUEwQixPQUExQjtBQUNBLGFBQVMsa0JBQVQsR0FBOEIsU0FBOUI7O0FBRUEsV0FBTyxRQUFQO0FBQ0gsQ0F6Y0QiLCJmaWxlIjoiU2VsZWN0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgbG9nZ2VyID0gbnVsbDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihPYmplY3RJZCwgU2VsZWN0b3JNYXRjaGVyLCBMb2dnZXIsIF8pIHtcbiAgICBcbiAgICBjbGFzcyBTZWxlY3RvciB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHNlbGVjdG9yLCB0eXBlID0gU2VsZWN0b3IuTUFUQ0hfU0VMRUNUT1IpIHtcbiAgICAgICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zZWxlY3Rvcl9jb21waWxlZCA9IG51bGw7XG4gICAgXHRcdFxuICAgIFx0XHRpZiAodHlwZSA9PT0gU2VsZWN0b3IuTUFUQ0hfU0VMRUNUT1IpIHtcbiAgICBcdFx0XHR0aGlzLnNlbGVjdG9yX2NvbXBpbGVkID0gdGhpcy5jb21waWxlKHNlbGVjdG9yKTtcbiAgICBcdFx0fSBlbHNlIGlmICh0eXBlID09PSBTZWxlY3Rvci5TT1JUX1NFTEVDVE9SKSB7XG4gICAgXHRcdFx0cmV0dXJuIHRoaXMuY29tcGlsZVNvcnQoc2VsZWN0b3IpO1xuICAgIFx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFNlbGVjdG9yLkZJRUxEX1NFTEVDVE9SKSB7XG4gICAgXHRcdFx0cmV0dXJuIHRoaXMuY29tcGlsZUZpZWxkcyhzZWxlY3RvciwgZmFsc2UpO1xuICAgIFx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFNlbGVjdG9yLkFHR19GSUVMRF9TRUxFQ1RPUikge1xuICAgIFx0XHRcdHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoc2VsZWN0b3IsIHRydWUpO1xuICAgIFx0XHR9IGVsc2Uge1xuICAgIFx0XHRcdGxvZ2dlci50aHJvdyhcIllvdSBuZWVkIHRvIHNwZWNpZnkgdGhlIHNlbGVjdG9yIHR5cGVcIik7XG4gICAgXHRcdH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGVzdChkb2MpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkLnRlc3QoZG9jKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29tcGlsZShzZWxlY3Rvcikge1xuICAgIFx0XHRpZiAoXy5pc05pbChzZWxlY3RvcikpIHtcbiAgICBcdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IG51bGwnKTtcbiAgICBcdFx0XHRcbiAgICBcdFx0XHRzZWxlY3RvciA9IHt9O1xuICAgIFx0XHR9IGVsc2Uge1xuICAgIFx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gbm90IG51bGwnKTtcbiAgICBcdFx0XHRcbiAgICBcdFx0XHRpZiAoIXNlbGVjdG9yIHx8IChfLmhhc0luKHNlbGVjdG9yLCAnX2lkJykgJiYgIXNlbGVjdG9yLl9pZCkpIHtcbiAgICBcdFx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gZmFsc2UgdmFsdWUgfHwgeyBfaWQ6IGZhbHNlIHZhbHVlIH0nKTtcbiAgICBcdFx0XHRcdFxuICAgIFx0XHRcdFx0c2VsZWN0b3IgPSB7XG4gICAgXHRcdFx0XHRcdF9pZDogZmFsc2VcbiAgICBcdFx0XHRcdH07XG4gICAgXHRcdFx0fVxuICAgIFx0XHR9XG4gICAgXHRcdFxuICAgIFx0XHRpZiAoXy5pc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuICAgIFx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gZnVuY3Rpb24oZG9jKSB7IC4uLiB9Jyk7XG4gICAgXHRcdFx0XG4gICAgXHRcdFx0Ly9faW5pdEZ1bmN0aW9uLmNhbGwobWF0Y2hlciwgc2VsZWN0b3IpO1xuICAgIFx0XHRcdHRoaXMuY2xhdXNlcyA9IFt7XG4gICAgXHRcdFx0XHRraW5kOiAnZnVuY3Rpb24nLFxuICAgIFx0XHRcdFx0dmFsdWU6IHNlbGVjdG9yXG4gICAgXHRcdFx0fV07XG4gICAgXHRcdFx0XG4gICAgXHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2VzIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeSh0aGlzLmNsYXVzZXMpKTtcbiAgICBcdFx0fSBlbHNlIGlmIChfLmlzU3RyaW5nKHNlbGVjdG9yKSB8fCBfLmlzTnVtYmVyKHNlbGVjdG9yKSkge1xuICAgIFx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gXCIxMjM0NTY3ODlcIiB8fCAxMjM0NTY3OTgnKTtcbiAgICBcdFx0XHRcbiAgICBcdFx0XHRzZWxlY3RvciA9IHtcbiAgICBcdFx0XHRcdF9pZDogc2VsZWN0b3JcbiAgICBcdFx0XHR9O1xuICAgIFx0XHRcdFxuICAgIFx0XHRcdC8vX2luaXRPYmplY3QuY2FsbChtYXRjaGVyLCBzZWxlY3Rvcik7XG4gICAgXHRcdFx0dGhpcy5jbGF1c2VzID0gX2J1aWxkU2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIFx0XHRcdFxuICAgIFx0XHRcdGxvZ2dlci5kZWJ1ZygnY2xhdXNlcyBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkodGhpcy5jbGF1c2VzKSk7XG4gICAgXHRcdH0gZWxzZSB7XG4gICAgXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiB7IGZpZWxkOiB2YWx1ZSB9Jyk7XG4gICAgXHRcdFx0XG4gICAgXHRcdFx0Ly9faW5pdE9iamVjdC5jYWxsKG1hdGNoZXIsIHNlbGVjdG9yKTtcbiAgICBcdFx0XHR0aGlzLmNsYXVzZXMgPSBfYnVpbGRTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgXHRcdFx0XG4gICAgXHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2VzIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeSh0aGlzLmNsYXVzZXMpKTtcbiAgICBcdFx0fVxuICAgIFx0XHRcbiAgICBcdFx0dmFyIG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyKHRoaXMpO1xuICAgIFx0XHRcbiAgICBcdFx0cmV0dXJuIG1hdGNoZXI7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbXBpbGVTb3J0KHNwZWMpIHtcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHNwZWMpKSAge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBrZXlzID0gW107XG4gICAgICAgICAgICB2YXIgYXNjID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzU3RyaW5nKHNwZWMpKSB7XG4gICAgICAgICAgICAgICAgc3BlYyA9IHNwZWMucmVwbGFjZSgvKCApKy9pZywgJyAnKS50cmltKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHNwZWMuaW5kZXhPZignLCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIGNvbW1hcyBieSBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KHNwZWMucmVwbGFjZSgvLC9pZywgJyAnKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVjLmluZGV4T2YoJyAnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHNwZWMuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmllbGQgPSBmaWVsZHNbaV0udHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGZpZWxkID09PSAnZGVzYycgIHx8IGZpZWxkID09PSAnYXNjJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZmllbGQgPT09ICctMScgICAgfHwgZmllbGQgPT09ICcxJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZmllbGQgPT09ICdmYWxzZScgfHwgZmllbGQgPT09ICd0cnVlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgc29ydCBzcGVjaWZpY2F0aW9uOiBcIiwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IF8udG9TdHJpbmcoZmllbGRzW2krMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnZGVzYycgfHwgbmV4dCA9PT0gJ2FzYycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGZpZWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNjLnB1c2goKG5leHQgPT09ICdhc2MnKSA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXh0ID09PSAnLTEnIHx8IG5leHQgPT09ICcxJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCgobmV4dCA9PT0gJzEnKSA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXh0ID09PSAnZmFsc2UnIHx8IG5leHQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCgobmV4dCA9PT0gJ3RydWUnKSA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGZpZWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNjLnB1c2godHJ1ZSk7IC8vIERlZmF1bHQgc29ydFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vLnNvcnQoXCJmaWVsZDFcIilcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChzcGVjKTtcbiAgICAgICAgICAgICAgICAgICAgYXNjLnB1c2godHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzQXJyYXkoc3BlYykpIHtcbiAgICAgICAgICAgICAgICAvLyBKb2luIHRoZSBhcnJheSB3aXRoIHNwYWNlcywgYW5kIHRyZWF0IGl0IGFzIGEgc3BhY2VkLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlU29ydChzcGVjLmpvaW4oJyAnKSk7XG4gICAgICAgICAgICAgICAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBzcGVjLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIGlmIChfLmlzU3RyaW5nKHNwZWNbaV0pKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBrZXlzLnB1c2goc3BlY1tpXSk7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBhc2MucHVzaCh0cnVlKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIGtleXMucHVzaChzcGVjW2ldWzBdKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIGFzYy5wdXNoKHNwZWNbaV1bMV0gIT09IFwiZGVzY1wiKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc1BsYWluT2JqZWN0KHNwZWMpKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBOZXN0ZWQgcGF0aCAtPiAuc29ydCh7IFwiZmllbGQxLmZpZWxkMTJcIjogXCJhc2NcIiB9KVxuICAgICAgICAgICAgICAgIHZhciBfc3BlYyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcGVjKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLmhhc0luKHNwZWMsIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goc3BlY1trZXldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlU29ydChfc3BlYyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHNvcnQgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICAgICAvLyByZXR1cm4ge2tleXM6IGtleXMsIGFzYzogYXNjfTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSAhPT0gMCAmJiB4ICE9PSAwKSByZXR1cm4geDsgICAvLyBOb24gcmVhY2hhYmxlP1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIHggPSBTZWxlY3Rvci5fZi5fY21wKGFbSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSldLCBiW0pTT04uc3RyaW5naWZ5KGtleXNbaV0pXSk7XG4gICAgICAgICAgICAgICAgICAgIHggPSBTZWxlY3Rvck1hdGNoZXIuY21wKGFba2V5c1tpXV0sIGJba2V5c1tpXV0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhc2NbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHggKj0gLTE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBldmFsKCkgZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUgaW4gSUU4LCBub3IgZG9lcyB0aGUgc3BlYyBzYXkgaXRcbiAgICAgICAgICAgIC8vIHNob3VsZC4gQXNzaWduIHRvIGEgbG9jYWwgdG8gZ2V0IHRoZSB2YWx1ZSwgaW5zdGVhZC5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gdmFyIF9mdW5jO1xuICAgICAgICAgICAgLy8gdmFyIGNvZGUgPSBcIl9mdW5jID0gKGZ1bmN0aW9uKGMpe3JldHVybiBmdW5jdGlvbihhLGIpe3ZhciB4O1wiO1xuICAgICAgICAgICAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyAgICAgaWYgKGkgIT09IDApIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgY29kZSArPSBcImlmKHghPT0wKXJldHVybiB4O1wiO1xuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgXG4gICAgICAgICAgICAvLyAgICAgY29kZSArPSBcIng9XCIgKyAoYXNjW2ldID8gXCJcIiA6IFwiLVwiKSArIFwiYyhhW1wiICsgSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSkgKyBcIl0sYltcIiArIEpTT04uc3RyaW5naWZ5KGtleXNbaV0pICsgXCJdKTtcIjtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgXG4gICAgICAgICAgICAvLyBjb2RlICs9IFwicmV0dXJuIHg7fTt9KVwiO1xuICAgICAgICBcbiAgICAgICAgICAgIC8vIGV2YWwoY29kZSk7XG4gICAgICAgIFxuICAgICAgICAgICAgLy8gcmV0dXJuIF9mdW5jKFNlbGVjdG9yLl9mLl9jbXApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb21waWxlRmllbGRzKHNwZWMsIGFnZ3JlZ2F0aW9uKSB7XG4gICAgICAgICAgICB2YXIgcHJvamVjdGlvbiA9IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc05pbChzcGVjKSkgcmV0dXJuIHByb2plY3Rpb247XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzU3RyaW5nKHNwZWMpKSB7XG4gICAgICAgICAgICAgICAgLy8gdHJpbSBzdXJyb3VuZGluZyBhbmQgaW5uZXIgc3BhY2VzXG4gICAgICAgICAgICAgICAgc3BlYyA9IHNwZWMucmVwbGFjZSgvKCApKy9pZywgJyAnKS50cmltKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVwbGFjZSB0aGUgY29tbWFzIGJ5IHNwYWNlc1xuICAgICAgICAgICAgICAgIGlmIChzcGVjLmluZGV4T2YoJywnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVwbGFjZSBjb21tYXMgYnkgc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKHNwZWMucmVwbGFjZSgvLC9pZywgJyAnKSwgYWdncmVnYXRpb24pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3BlYy5pbmRleE9mKCcgJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmaWVsZHMgPSBzcGVjLnNwbGl0KCcgJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IHRoZSBmaWVsZCBmcm9tIHRoZSBzcGVjICh3ZSB3aWxsIGJlIHdvcmtpbmcgd2l0aCBwYWlycylcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tpXS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSBmaXJzdCBpcyBub3QgYSBmaWVsZCwgdGhyb3cgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoZmllbGQgPT09ICctMScgICAgfHwgZmllbGQgPT09ICcxJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZmllbGQgPT09ICdmYWxzZScgfHwgZmllbGQgPT09ICd0cnVlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgZmllbGRzIHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgbmV4dCBpdGVtIG9mIHRoZSBwYWlyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5leHQgPSBfLnRvU3RyaW5nKGZpZWxkc1tpKzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCA9PT0gJy0xJyB8fCBuZXh0ID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICctMScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IF9rZXkgaW4gcHJvamVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZCAhPT0gJ19pZCcgJiYgcHJvamVjdGlvbltfa2V5XSA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHByb2plY3Rpb24gY2Fubm90IGNvbnRhaW4gYm90aCBpbmNsdWRlIGFuZCBleGNsdWRlIHNwZWNpZmljYXRpb25zXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmV4dCA9PT0gJ2ZhbHNlJyB8fCBuZXh0ID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZCA9PT0gJ19pZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHByb2plY3Rpb24gY2Fubm90IGNvbnRhaW4gYm90aCBpbmNsdWRlIGFuZCBleGNsdWRlIHNwZWNpZmljYXRpb25zXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhZ2dyZWdhdGlvbiAmJiBuZXh0LmluZGV4T2YoJyQnKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IG5leHQucmVwbGFjZSgnJCcsICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVjLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8uZmluZCh7fSwgXCJmaWVsZDFcIilcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bc3BlY10gPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHNwZWMpKSB7XG4gICAgICAgICAgICAgICAgLy8gSm9pbiB0aGUgYXJyYXkgd2l0aCBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZUZpZWxkcyhzcGVjLmpvaW4oJyAnKSwgYWdncmVnYXRpb24pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3Qoc3BlYykpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIE5lc3RlZCBwYXRoIC0+IC5maW5kKHt9LCB7IFwiZmllbGQxLmZpZWxkMTJcIjogXCJhc2NcIiB9KVxuICAgICAgICAgICAgICAgIHZhciBfc3BlYyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcGVjKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLmhhc0luKHNwZWMsIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9zcGVjLnB1c2goc3BlY1trZXldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKF9zcGVjLCBhZ2dyZWdhdGlvbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIGZpZWxkcyBzcGVjaWZpY2F0aW9uOiBcIiwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gcHJvamVjdGlvbjtcbiAgICAgICAgfVxuICAgIFx0XG4gICAgXHQvKiBTVEFUSUMgTUVUSE9EUyAqL1xuICAgIFx0c3RhdGljIGlzU2VsZWN0b3JDb21waWxlZChzZWxlY3Rvcikge1xuICAgIFx0XHRpZiAoIV8uaXNOaWwoc2VsZWN0b3IpICYmIChcbiAgICBcdFx0ICAgIHNlbGVjdG9yIGluc3RhbmNlb2YgU2VsZWN0b3JNYXRjaGVyIHx8IChzZWxlY3RvciBpbnN0YW5jZW9mIFNlbGVjdG9yICYmIFxuICAgIFx0XHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yLnNlbGVjdG9yX2NvbXBpbGVkIGluc3RhbmNlb2YgU2VsZWN0b3JNYXRjaGVyKVxuICAgIFx0ICAgICkpIHtcbiAgICBcdFx0XHRyZXR1cm4gdHJ1ZTtcbiAgICBcdFx0fSBlbHNlIHtcbiAgICBcdFx0XHRyZXR1cm4gZmFsc2U7XG4gICAgXHRcdH1cbiAgICBcdH1cbiAgICBcdFxuICAgIFx0c3RhdGljIG1hdGNoZXMoc2VsZWN0b3IsIGRvYykge1xuICAgICAgICAgICAgcmV0dXJuIChuZXcgU2VsZWN0b3Ioc2VsZWN0b3IpKS50ZXN0KGRvYyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgdmFyIF9idWlsZFNlbGVjdG9yID0gZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICBcdGxvZ2dlci5kZWJ1ZygnQ2FsbGVkOiBfYnVpbGRTZWxlY3RvcicpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGNsYXVzZXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzZWxlY3Rvcikge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gc2VsZWN0b3Jba2V5XTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleS5jaGFyQXQoMCkgPT09ICckJykge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gb3BlcmF0b3IgPT4geyAkYW5kOiBbey4uLn0sIHsuLi59XSB9Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY2xhdXNlcy5wdXNoKF9idWlsZERvY3VtZW50U2VsZWN0b3Ioa2V5LCB2YWx1ZSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IHBsYWluID0+IHsgZmllbGQxOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjbGF1c2VzLnB1c2goX2J1aWxkS2V5cGF0aFNlbGVjdG9yKGtleSwgdmFsdWUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNsYXVzZXM7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgX2J1aWxkRG9jdW1lbnRTZWxlY3RvciA9IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGNsYXVzZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgICAgIGNhc2UgJyRvcic6XG4gICAgICAgICAgICBjYXNlICckYW5kJzpcbiAgICAgICAgICAgIGNhc2UgJyRub3InOlxuICAgICAgICAgICAgICAgIGNsYXVzZS5rZXkgPSBrZXkucmVwbGFjZSgvXFwkLywgJycpO1xuICAgICAgICAgICAgICAgIC8vIFRoZSByZXN0IHdpbGwgYmUgaGFuZGxlZCBieSAnX29wZXJhdG9yXydcbiAgICAgICAgICAgIGNhc2UgJ19vcGVyYXRvcl8nOlxuICAgICAgICAgICAgICAgIC8vIEdlbmVyaWMgaGFuZGxlciBmb3Igb3BlcmF0b3JzICgkb3IsICRhbmQsICRub3IpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY2xhdXNlLmtpbmQgPSAnb3BlcmF0b3InO1xuICAgICAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ2FycmF5JztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjbGF1c2UudmFsdWUgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXVzZS52YWx1ZSA9IF8udW5pb24oY2xhdXNlLnZhbHVlLCBfYnVpbGRTZWxlY3Rvcih2YWx1ZVtpXSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJVbnJlY29naXplZCBrZXkgaW4gc2VsZWN0b3I6IFwiLCBrZXkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUT0RPIGNhc2VzOiAkd2hlcmUsICRlbGVtTWF0Y2hcbiAgICAgICAgXG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShjbGF1c2UpKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjbGF1c2U7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgX2J1aWxkS2V5cGF0aFNlbGVjdG9yID0gZnVuY3Rpb24gKGtleXBhdGgsIHZhbHVlKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnQ2FsbGVkOiBfYnVpbGRLZXlwYXRoU2VsZWN0b3InKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBjbGF1c2UgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGNsYXVzZS52YWx1ZSA9IHZhbHVlO1xuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwodmFsdWUpKSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIG51bGwnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnbnVsbCc7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgUmVnRXhwJyk7XG4gICAgXG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdyZWdleHAnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgc291cmNlID0gdmFsdWUudG9TdHJpbmcoKS5zcGxpdCgnLycpO1xuICAgIFxuICAgICAgICAgICAgY2xhdXNlLnZhbHVlID0ge1xuICAgICAgICAgICAgICAgICRyZWdleDogc291cmNlWzFdICAgLy8gVGhlIGZpcnN0IGl0ZW0gc3BsaXR0ZWQgaXMgYW4gZW1wdHkgc3RyaW5nXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc291cmNlWzJdICE9IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBjbGF1c2UudmFsdWVbXCIkb3B0aW9uc1wiXSA9IHNvdXJjZVsyXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIEFycmF5Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ2FycmF5JztcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBTdHJpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnc3RyaW5nJztcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBOdW1iZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnbnVtYmVyJztcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgQm9vbGVhbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdib29sZWFuJztcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIEZ1bmN0aW9uJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ2Z1bmN0aW9uJztcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3QodmFsdWUpKSB7XG4gICAgICAgICAgICB2YXIgbGl0ZXJhbE9iamVjdCA9IHRydWU7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5LmNoYXJBdCgwKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpdGVyYWxPYmplY3QgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobGl0ZXJhbE9iamVjdCkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgT2JqZWN0ID0+IHsgZmllbGQ6IHsgZmllbGRfMTogPHZhbHVlPiwgZmllbGRfMjogPHZhbHVlPiB9IH0nKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdsaXRlcmFsX29iamVjdCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgT3BlcmF0b3IgPT4geyBmaWVsZDogeyAkZ3Q6IDIsICRsdCA1IH0gfScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ29wZXJhdG9yX29iamVjdCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBPYmplY3RJZCAtPiBTdHJpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnc3RyaW5nJztcbiAgICAgICAgICAgIGNsYXVzZS52YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdfX2ludmFsaWRfXyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBwYXJ0cyA9IGtleXBhdGguc3BsaXQoJy4nKTtcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG92ZXIgT2JqZWN0IGZpZWxkID0+IHsgXCJmaWVsZDEuZmllbGQxXzJcIjogPHZhbHVlPiB9Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS5raW5kID0gJ29iamVjdCc7XG4gICAgICAgICAgICBjbGF1c2Uua2V5ID0gcGFydHM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvdmVyIFBsYWluIGZpZWxkID0+IHsgXCJmaWVsZFwiOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLmtpbmQgPSAncGxhaW4nO1xuICAgICAgICAgICAgY2xhdXNlLmtleSA9IHBhcnRzWzBdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBjcmVhdGVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY2xhdXNlKSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2xhdXNlO1xuICAgIH07XG4gICAgXG4gICAgU2VsZWN0b3IuTUFUQ0hfU0VMRUNUT1IgPSAnbWF0Y2gnO1xuICAgIFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IgPSAnc29ydCc7XG4gICAgU2VsZWN0b3IuRklFTERfU0VMRUNUT1IgPSAnZmllbGQnO1xuICAgIFNlbGVjdG9yLkFHR19GSUVMRF9TRUxFQ1RPUiA9ICdwcm9qZWN0JztcbiAgICBcbiAgICByZXR1cm4gU2VsZWN0b3I7XG59OyJdfQ==
