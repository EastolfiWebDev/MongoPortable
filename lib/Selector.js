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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbImxvZ2dlciIsIm1vZHVsZSIsImV4cG9ydHMiLCJPYmplY3RJZCIsIlNlbGVjdG9yTWF0Y2hlciIsIkxvZ2dlciIsIl8iLCJTZWxlY3RvciIsInNlbGVjdG9yIiwidHlwZSIsIk1BVENIX1NFTEVDVE9SIiwiaW5zdGFuY2UiLCJzZWxlY3Rvcl9jb21waWxlZCIsImNvbXBpbGUiLCJTT1JUX1NFTEVDVE9SIiwiY29tcGlsZVNvcnQiLCJGSUVMRF9TRUxFQ1RPUiIsImNvbXBpbGVGaWVsZHMiLCJBR0dfRklFTERfU0VMRUNUT1IiLCJ0aHJvdyIsImRvYyIsInRlc3QiLCJpc05pbCIsImRlYnVnIiwiaGFzSW4iLCJfaWQiLCJpc0Z1bmN0aW9uIiwiY2xhdXNlcyIsImtpbmQiLCJ2YWx1ZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJpc1N0cmluZyIsImlzTnVtYmVyIiwiX2J1aWxkU2VsZWN0b3IiLCJtYXRjaGVyIiwic3BlYyIsImtleXMiLCJhc2MiLCJyZXBsYWNlIiwidHJpbSIsImluZGV4T2YiLCJmaWVsZHMiLCJzcGxpdCIsImkiLCJsZW5ndGgiLCJmaWVsZCIsIkVycm9yIiwibmV4dCIsInRvU3RyaW5nIiwicHVzaCIsImlzQXJyYXkiLCJqb2luIiwiaXNQbGFpbk9iamVjdCIsIl9zcGVjIiwia2V5IiwiYSIsImIiLCJ4IiwiY21wIiwiYWdncmVnYXRpb24iLCJwcm9qZWN0aW9uIiwiX2tleSIsImNoYXJBdCIsIl9idWlsZERvY3VtZW50U2VsZWN0b3IiLCJfYnVpbGRLZXlwYXRoU2VsZWN0b3IiLCJjbGF1c2UiLCJ1bmlvbiIsImtleXBhdGgiLCJpc1JlZ0V4cCIsInNvdXJjZSIsIiRyZWdleCIsImlzQm9vbGVhbiIsImxpdGVyYWxPYmplY3QiLCJwYXJ0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSUEsU0FBUyxJQUFiOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCLFVBQVNDLFFBQVQsRUFBbUJDLGVBQW5C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SW9CLGlCQUFpQjFCLFFBQXJCLEVBQStCO0FBQ2xDSCxtQkFBT3VCLEtBQVAsQ0FBYSxtQ0FBYjs7QUFFQTJDLG1CQUFPekQsSUFBUCxHQUFjLFFBQWQ7QUFDQXlELG1CQUFPckMsS0FBUCxHQUFlQSxNQUFNb0IsUUFBTixFQUFmO0FBQ0gsU0FMTSxNQUtBO0FBQ0hpQixtQkFBT3pELElBQVAsR0FBYyxhQUFkO0FBQ0g7O0FBRUQsWUFBSWlFLFFBQVFOLFFBQVF6QixLQUFSLENBQWMsR0FBZCxDQUFaO0FBQ0EsWUFBSStCLE1BQU03QixNQUFOLEdBQWUsQ0FBbkIsRUFBc0I7QUFDbEI3QyxtQkFBT3VCLEtBQVAsQ0FBYSw0REFBYjs7QUFFQTJDLG1CQUFPdEMsSUFBUCxHQUFjLFFBQWQ7QUFDQXNDLG1CQUFPWCxHQUFQLEdBQWFtQixLQUFiO0FBQ0gsU0FMRCxNQUtPO0FBQ0gxRSxtQkFBT3VCLEtBQVAsQ0FBYSxpREFBYjs7QUFFQTJDLG1CQUFPdEMsSUFBUCxHQUFjLE9BQWQ7QUFDQXNDLG1CQUFPWCxHQUFQLEdBQWFtQixNQUFNLENBQU4sQ0FBYjtBQUNIOztBQUVEMUUsZUFBT3VCLEtBQVAsQ0FBYSxxQkFBcUJPLEtBQUtDLFNBQUwsQ0FBZW1DLE1BQWYsQ0FBbEM7O0FBRUEsZUFBT0EsTUFBUDtBQUNILEtBeEZEOztBQTBGQTNELGFBQVNHLGNBQVQsR0FBMEIsT0FBMUI7QUFDQUgsYUFBU08sYUFBVCxHQUF5QixNQUF6QjtBQUNBUCxhQUFTUyxjQUFULEdBQTBCLE9BQTFCO0FBQ0FULGFBQVNXLGtCQUFULEdBQThCLFNBQTlCOztBQUVBLFdBQU9YLFFBQVA7QUFDSCxDQXpjRCIsImZpbGUiOiJTZWxlY3Rvci5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBsb2dnZXIgPSBudWxsO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKE9iamVjdElkLCBTZWxlY3Rvck1hdGNoZXIsIExvZ2dlciwgXykge1xuICAgIFxuICAgIGNsYXNzIFNlbGVjdG9yIHtcbiAgICAgICAgY29uc3RydWN0b3Ioc2VsZWN0b3IsIHR5cGUgPSBTZWxlY3Rvci5NQVRDSF9TRUxFQ1RPUikge1xuICAgICAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNlbGVjdG9yX2NvbXBpbGVkID0gbnVsbDtcbiAgICBcdFx0XG4gICAgXHRcdGlmICh0eXBlID09PSBTZWxlY3Rvci5NQVRDSF9TRUxFQ1RPUikge1xuICAgIFx0XHRcdHRoaXMuc2VsZWN0b3JfY29tcGlsZWQgPSB0aGlzLmNvbXBpbGUoc2VsZWN0b3IpO1xuICAgIFx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFNlbGVjdG9yLlNPUlRfU0VMRUNUT1IpIHtcbiAgICBcdFx0XHRyZXR1cm4gdGhpcy5jb21waWxlU29ydChzZWxlY3Rvcik7XG4gICAgXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gU2VsZWN0b3IuRklFTERfU0VMRUNUT1IpIHtcbiAgICBcdFx0XHRyZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKHNlbGVjdG9yLCBmYWxzZSk7XG4gICAgXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gU2VsZWN0b3IuQUdHX0ZJRUxEX1NFTEVDVE9SKSB7XG4gICAgXHRcdFx0cmV0dXJuIHRoaXMuY29tcGlsZUZpZWxkcyhzZWxlY3RvciwgdHJ1ZSk7XG4gICAgXHRcdH0gZWxzZSB7XG4gICAgXHRcdFx0bG9nZ2VyLnRocm93KFwiWW91IG5lZWQgdG8gc3BlY2lmeSB0aGUgc2VsZWN0b3IgdHlwZVwiKTtcbiAgICBcdFx0fVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0ZXN0KGRvYykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JfY29tcGlsZWQudGVzdChkb2MpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb21waWxlKHNlbGVjdG9yKSB7XG4gICAgXHRcdGlmIChfLmlzTmlsKHNlbGVjdG9yKSkge1xuICAgIFx0XHRcdGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gbnVsbCcpO1xuICAgIFx0XHRcdFxuICAgIFx0XHRcdHNlbGVjdG9yID0ge307XG4gICAgXHRcdH0gZWxzZSB7XG4gICAgXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBub3QgbnVsbCcpO1xuICAgIFx0XHRcdFxuICAgIFx0XHRcdGlmICghc2VsZWN0b3IgfHwgKF8uaGFzSW4oc2VsZWN0b3IsICdfaWQnKSAmJiAhc2VsZWN0b3IuX2lkKSkge1xuICAgIFx0XHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBmYWxzZSB2YWx1ZSB8fCB7IF9pZDogZmFsc2UgdmFsdWUgfScpO1xuICAgIFx0XHRcdFx0XG4gICAgXHRcdFx0XHRzZWxlY3RvciA9IHtcbiAgICBcdFx0XHRcdFx0X2lkOiBmYWxzZVxuICAgIFx0XHRcdFx0fTtcbiAgICBcdFx0XHR9XG4gICAgXHRcdH1cbiAgICBcdFx0XG4gICAgXHRcdGlmIChfLmlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBmdW5jdGlvbihkb2MpIHsgLi4uIH0nKTtcbiAgICBcdFx0XHRcbiAgICBcdFx0XHQvL19pbml0RnVuY3Rpb24uY2FsbChtYXRjaGVyLCBzZWxlY3Rvcik7XG4gICAgXHRcdFx0dGhpcy5jbGF1c2VzID0gW3tcbiAgICBcdFx0XHRcdGtpbmQ6ICdmdW5jdGlvbicsXG4gICAgXHRcdFx0XHR2YWx1ZTogc2VsZWN0b3JcbiAgICBcdFx0XHR9XTtcbiAgICBcdFx0XHRcbiAgICBcdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZXMgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMuY2xhdXNlcykpO1xuICAgIFx0XHR9IGVsc2UgaWYgKF8uaXNTdHJpbmcoc2VsZWN0b3IpIHx8IF8uaXNOdW1iZXIoc2VsZWN0b3IpKSB7XG4gICAgXHRcdFx0bG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBcIjEyMzQ1Njc4OVwiIHx8IDEyMzQ1Njc5OCcpO1xuICAgIFx0XHRcdFxuICAgIFx0XHRcdHNlbGVjdG9yID0ge1xuICAgIFx0XHRcdFx0X2lkOiBzZWxlY3RvclxuICAgIFx0XHRcdH07XG4gICAgXHRcdFx0XG4gICAgXHRcdFx0Ly9faW5pdE9iamVjdC5jYWxsKG1hdGNoZXIsIHNlbGVjdG9yKTtcbiAgICBcdFx0XHR0aGlzLmNsYXVzZXMgPSBfYnVpbGRTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgXHRcdFx0XG4gICAgXHRcdFx0bG9nZ2VyLmRlYnVnKCdjbGF1c2VzIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeSh0aGlzLmNsYXVzZXMpKTtcbiAgICBcdFx0fSBlbHNlIHtcbiAgICBcdFx0XHRsb2dnZXIuZGVidWcoJ3NlbGVjdG9yIC0+IHsgZmllbGQ6IHZhbHVlIH0nKTtcbiAgICBcdFx0XHRcbiAgICBcdFx0XHQvL19pbml0T2JqZWN0LmNhbGwobWF0Y2hlciwgc2VsZWN0b3IpO1xuICAgIFx0XHRcdHRoaXMuY2xhdXNlcyA9IF9idWlsZFNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBcdFx0XHRcbiAgICBcdFx0XHRsb2dnZXIuZGVidWcoJ2NsYXVzZXMgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMuY2xhdXNlcykpO1xuICAgIFx0XHR9XG4gICAgXHRcdFxuICAgIFx0XHR2YXIgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXIodGhpcyk7XG4gICAgXHRcdFxuICAgIFx0XHRyZXR1cm4gbWF0Y2hlcjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29tcGlsZVNvcnQoc3BlYykge1xuICAgICAgICAgICAgaWYgKF8uaXNOaWwoc3BlYykpICB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgICAgIHZhciBhc2MgPSBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNTdHJpbmcoc3BlYykpIHtcbiAgICAgICAgICAgICAgICBzcGVjID0gc3BlYy5yZXBsYWNlKC8oICkrL2lnLCAnICcpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoc3BlYy5pbmRleE9mKCcsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlcGxhY2UgY29tbWFzIGJ5IHNwYWNlcywgYW5kIHRyZWF0IGl0IGFzIGEgc3BhY2VkLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZVNvcnQoc3BlYy5yZXBsYWNlKC8sL2lnLCAnICcpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNwZWMuaW5kZXhPZignICcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmllbGRzID0gc3BlYy5zcGxpdCgnICcpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tpXS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoZmllbGQgPT09ICdkZXNjJyAgfHwgZmllbGQgPT09ICdhc2MnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChmaWVsZCA9PT0gJy0xJyAgICB8fCBmaWVsZCA9PT0gJzEnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChmaWVsZCA9PT0gJ2ZhbHNlJyB8fCBmaWVsZCA9PT0gJ3RydWUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCBzb3J0IHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gXy50b1N0cmluZyhmaWVsZHNbaSsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPT09ICdkZXNjJyB8fCBuZXh0ID09PSAnYXNjJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCgobmV4dCA9PT0gJ2FzYycpID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5leHQgPT09ICctMScgfHwgbmV4dCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKChuZXh0ID09PSAnMScpID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5leHQgPT09ICdmYWxzZScgfHwgbmV4dCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzYy5wdXNoKChuZXh0ID09PSAndHJ1ZScpID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZmllbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCh0cnVlKTsgLy8gRGVmYXVsdCBzb3J0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8uc29ydChcImZpZWxkMVwiKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKHNwZWMpO1xuICAgICAgICAgICAgICAgICAgICBhc2MucHVzaCh0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheShzcGVjKSkge1xuICAgICAgICAgICAgICAgIC8vIEpvaW4gdGhlIGFycmF5IHdpdGggc3BhY2VzLCBhbmQgdHJlYXQgaXQgYXMgYSBzcGFjZWQtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KHNwZWMuam9pbignICcpKTtcbiAgICAgICAgICAgICAgICAvLyBmb3IgKHZhciBpID0gMDsgaSA8IHNwZWMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgaWYgKF8uaXNTdHJpbmcoc3BlY1tpXSkpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIGtleXMucHVzaChzcGVjW2ldKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIGFzYy5wdXNoKHRydWUpO1xuICAgICAgICAgICAgICAgIC8vICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAga2V5cy5wdXNoKHNwZWNbaV1bMF0pO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgYXNjLnB1c2goc3BlY1tpXVsxXSAhPT0gXCJkZXNjXCIpO1xuICAgICAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3Qoc3BlYykpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIE5lc3RlZCBwYXRoIC0+IC5zb3J0KHsgXCJmaWVsZDEuZmllbGQxMlwiOiBcImFzY1wiIH0pXG4gICAgICAgICAgICAgICAgdmFyIF9zcGVjID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNwZWMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaGFzSW4oc3BlYywga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3NwZWMucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgX3NwZWMucHVzaChzcGVjW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVTb3J0KF9zcGVjKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgc29ydCBzcGVjaWZpY2F0aW9uOiBcIiwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgIC8vIHJldHVybiB7a2V5czoga2V5cywgYXNjOiBhc2N9O1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IDA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9PSAwICYmIHggIT09IDApIHJldHVybiB4OyAgIC8vIE5vbiByZWFjaGFibGU/XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8geCA9IFNlbGVjdG9yLl9mLl9jbXAoYVtKU09OLnN0cmluZ2lmeShrZXlzW2ldKV0sIGJbSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSldKTtcbiAgICAgICAgICAgICAgICAgICAgeCA9IFNlbGVjdG9yTWF0Y2hlci5jbXAoYVtrZXlzW2ldXSwgYltrZXlzW2ldXSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWFzY1tpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgeCAqPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGV2YWwoKSBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZSBpbiBJRTgsIG5vciBkb2VzIHRoZSBzcGVjIHNheSBpdFxuICAgICAgICAgICAgLy8gc2hvdWxkLiBBc3NpZ24gdG8gYSBsb2NhbCB0byBnZXQgdGhlIHZhbHVlLCBpbnN0ZWFkLlxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB2YXIgX2Z1bmM7XG4gICAgICAgICAgICAvLyB2YXIgY29kZSA9IFwiX2Z1bmMgPSAoZnVuY3Rpb24oYyl7cmV0dXJuIGZ1bmN0aW9uKGEsYil7dmFyIHg7XCI7XG4gICAgICAgICAgICAvLyBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vICAgICBpZiAoaSAhPT0gMCkge1xuICAgICAgICAgICAgLy8gICAgICAgICBjb2RlICs9IFwiaWYoeCE9PTApcmV0dXJuIHg7XCI7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgIC8vICAgICBjb2RlICs9IFwieD1cIiArIChhc2NbaV0gPyBcIlwiIDogXCItXCIpICsgXCJjKGFbXCIgKyBKU09OLnN0cmluZ2lmeShrZXlzW2ldKSArIFwiXSxiW1wiICsgSlNPTi5zdHJpbmdpZnkoa2V5c1tpXSkgKyBcIl0pO1wiO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICBcbiAgICAgICAgICAgIC8vIGNvZGUgKz0gXCJyZXR1cm4geDt9O30pXCI7XG4gICAgICAgIFxuICAgICAgICAgICAgLy8gZXZhbChjb2RlKTtcbiAgICAgICAgXG4gICAgICAgICAgICAvLyByZXR1cm4gX2Z1bmMoU2VsZWN0b3IuX2YuX2NtcCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbXBpbGVGaWVsZHMoc3BlYywgYWdncmVnYXRpb24pIHtcbiAgICAgICAgICAgIHZhciBwcm9qZWN0aW9uID0ge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKHNwZWMpKSByZXR1cm4gcHJvamVjdGlvbjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNTdHJpbmcoc3BlYykpIHtcbiAgICAgICAgICAgICAgICAvLyB0cmltIHN1cnJvdW5kaW5nIGFuZCBpbm5lciBzcGFjZXNcbiAgICAgICAgICAgICAgICBzcGVjID0gc3BlYy5yZXBsYWNlKC8oICkrL2lnLCAnICcpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIHRoZSBjb21tYXMgYnkgc3BhY2VzXG4gICAgICAgICAgICAgICAgaWYgKHNwZWMuaW5kZXhPZignLCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIGNvbW1hcyBieSBzcGFjZXMsIGFuZCB0cmVhdCBpdCBhcyBhIHNwYWNlZC1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoc3BlYy5yZXBsYWNlKC8sL2lnLCAnICcpLCBhZ2dyZWdhdGlvbik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVjLmluZGV4T2YoJyAnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHNwZWMuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIGZpZWxkIGZyb20gdGhlIHNwZWMgKHdlIHdpbGwgYmUgd29ya2luZyB3aXRoIHBhaXJzKVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpZWxkID0gZmllbGRzW2ldLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGZpcnN0IGlzIG5vdCBhIGZpZWxkLCB0aHJvdyBlcnJvclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChmaWVsZCA9PT0gJy0xJyAgICB8fCBmaWVsZCA9PT0gJzEnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChmaWVsZCA9PT0gJ2ZhbHNlJyB8fCBmaWVsZCA9PT0gJ3RydWUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkJhZCBmaWVsZHMgc3BlY2lmaWNhdGlvbjogXCIsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IHRoZSBuZXh0IGl0ZW0gb2YgdGhlIHBhaXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IF8udG9TdHJpbmcoZmllbGRzW2krMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSAnLTEnIHx8IG5leHQgPT09ICcxJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCA9PT0gJy0xJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgX2tleSBpbiBwcm9qZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkICE9PSAnX2lkJyAmJiBwcm9qZWN0aW9uW19rZXldID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkEgcHJvamVjdGlvbiBjYW5ub3QgY29udGFpbiBib3RoIGluY2x1ZGUgYW5kIGV4Y2x1ZGUgc3BlY2lmaWNhdGlvbnNcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltmaWVsZF0gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXh0ID09PSAnZmFsc2UnIHx8IG5leHQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkID09PSAnX2lkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkEgcHJvamVjdGlvbiBjYW5ub3QgY29udGFpbiBib3RoIGluY2x1ZGUgYW5kIGV4Y2x1ZGUgc3BlY2lmaWNhdGlvbnNcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0aW9uW2ZpZWxkXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFnZ3JlZ2F0aW9uICYmIG5leHQuaW5kZXhPZignJCcpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gbmV4dC5yZXBsYWNlKCckJywgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Rpb25bZmllbGRdID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNwZWMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLy5maW5kKHt9LCBcImZpZWxkMVwiKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcHJvamVjdGlvbltzcGVjXSA9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzQXJyYXkoc3BlYykpIHtcbiAgICAgICAgICAgICAgICAvLyBKb2luIHRoZSBhcnJheSB3aXRoIHNwYWNlcywgYW5kIHRyZWF0IGl0IGFzIGEgc3BhY2VkLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlRmllbGRzKHNwZWMuam9pbignICcpLCBhZ2dyZWdhdGlvbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNQbGFpbk9iamVjdChzcGVjKSkge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gTmVzdGVkIHBhdGggLT4gLmZpbmQoe30sIHsgXCJmaWVsZDEuZmllbGQxMlwiOiBcImFzY1wiIH0pXG4gICAgICAgICAgICAgICAgdmFyIF9zcGVjID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNwZWMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaGFzSW4oc3BlYywga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3NwZWMucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgX3NwZWMucHVzaChzcGVjW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVGaWVsZHMoX3NwZWMsIGFnZ3JlZ2F0aW9uKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgZmllbGRzIHNwZWNpZmljYXRpb246IFwiLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBwcm9qZWN0aW9uO1xuICAgICAgICB9XG4gICAgXHRcbiAgICBcdC8qIFNUQVRJQyBNRVRIT0RTICovXG4gICAgXHRzdGF0aWMgaXNTZWxlY3RvckNvbXBpbGVkKHNlbGVjdG9yKSB7XG4gICAgXHRcdGlmICghXy5pc05pbChzZWxlY3RvcikgJiYgKFxuICAgIFx0XHQgICAgc2VsZWN0b3IgaW5zdGFuY2VvZiBTZWxlY3Rvck1hdGNoZXIgfHwgKHNlbGVjdG9yIGluc3RhbmNlb2YgU2VsZWN0b3IgJiYgXG4gICAgXHRcdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3Iuc2VsZWN0b3JfY29tcGlsZWQgaW5zdGFuY2VvZiBTZWxlY3Rvck1hdGNoZXIpXG4gICAgXHQgICAgKSkge1xuICAgIFx0XHRcdHJldHVybiB0cnVlO1xuICAgIFx0XHR9IGVsc2Uge1xuICAgIFx0XHRcdHJldHVybiBmYWxzZTtcbiAgICBcdFx0fVxuICAgIFx0fVxuICAgIFx0XG4gICAgXHRzdGF0aWMgbWF0Y2hlcyhzZWxlY3RvciwgZG9jKSB7XG4gICAgICAgICAgICByZXR1cm4gKG5ldyBTZWxlY3RvcihzZWxlY3RvcikpLnRlc3QoZG9jKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICB2YXIgX2J1aWxkU2VsZWN0b3IgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgIFx0bG9nZ2VyLmRlYnVnKCdDYWxsZWQ6IF9idWlsZFNlbGVjdG9yJyk7XG4gICAgICAgIFxuICAgICAgICB2YXIgY2xhdXNlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNlbGVjdG9yKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBzZWxlY3RvcltrZXldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5LmNoYXJBdCgwKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdzZWxlY3RvciAtPiBvcGVyYXRvciA9PiB7ICRhbmQ6IFt7Li4ufSwgey4uLn1dIH0nKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjbGF1c2VzLnB1c2goX2J1aWxkRG9jdW1lbnRTZWxlY3RvcihrZXksIHZhbHVlKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1Zygnc2VsZWN0b3IgLT4gcGxhaW4gPT4geyBmaWVsZDE6IDx2YWx1ZT4gfScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNsYXVzZXMucHVzaChfYnVpbGRLZXlwYXRoU2VsZWN0b3Ioa2V5LCB2YWx1ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2xhdXNlcztcbiAgICB9O1xuICAgIFxuICAgIHZhciBfYnVpbGREb2N1bWVudFNlbGVjdG9yID0gZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YXIgY2xhdXNlID0ge307XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgICAgY2FzZSAnJG9yJzpcbiAgICAgICAgICAgIGNhc2UgJyRhbmQnOlxuICAgICAgICAgICAgY2FzZSAnJG5vcic6XG4gICAgICAgICAgICAgICAgY2xhdXNlLmtleSA9IGtleS5yZXBsYWNlKC9cXCQvLCAnJyk7XG4gICAgICAgICAgICAgICAgLy8gVGhlIHJlc3Qgd2lsbCBiZSBoYW5kbGVkIGJ5ICdfb3BlcmF0b3JfJ1xuICAgICAgICAgICAgY2FzZSAnX29wZXJhdG9yXyc6XG4gICAgICAgICAgICAgICAgLy8gR2VuZXJpYyBoYW5kbGVyIGZvciBvcGVyYXRvcnMgKCRvciwgJGFuZCwgJG5vcilcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjbGF1c2Uua2luZCA9ICdvcGVyYXRvcic7XG4gICAgICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnYXJyYXknO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNsYXVzZS52YWx1ZSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhdXNlLnZhbHVlID0gXy51bmlvbihjbGF1c2UudmFsdWUsIF9idWlsZFNlbGVjdG9yKHZhbHVlW2ldKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVucmVjb2dpemVkIGtleSBpbiBzZWxlY3RvcjogXCIsIGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRPRE8gY2FzZXM6ICR3aGVyZSwgJGVsZW1NYXRjaFxuICAgICAgICBcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2UgY3JlYXRlZDogJyArIEpTT04uc3RyaW5naWZ5KGNsYXVzZSkpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNsYXVzZTtcbiAgICB9O1xuICAgIFxuICAgIHZhciBfYnVpbGRLZXlwYXRoU2VsZWN0b3IgPSBmdW5jdGlvbiAoa2V5cGF0aCwgdmFsdWUpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdDYWxsZWQ6IF9idWlsZEtleXBhdGhTZWxlY3RvcicpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGNsYXVzZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgY2xhdXNlLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgbnVsbCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdudWxsJztcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBSZWdFeHAnKTtcbiAgICBcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ3JlZ2V4cCc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSB2YWx1ZS50b1N0cmluZygpLnNwbGl0KCcvJyk7XG4gICAgXG4gICAgICAgICAgICBjbGF1c2UudmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgJHJlZ2V4OiBzb3VyY2VbMV0gICAvLyBUaGUgZmlyc3QgaXRlbSBzcGxpdHRlZCBpcyBhbiBlbXB0eSBzdHJpbmdcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzb3VyY2VbMl0gIT0gXCJcIikge1xuICAgICAgICAgICAgICAgIGNsYXVzZS52YWx1ZVtcIiRvcHRpb25zXCJdID0gc291cmNlWzJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgQXJyYXknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnYXJyYXknO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIFN0cmluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdzdHJpbmcnO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIE51bWJlcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdudW1iZXInO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNCb29sZWFuKHZhbHVlKSkge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBCb29sZWFuJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ2Jvb2xlYW4nO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG9mIHR5cGUgRnVuY3Rpb24nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnZnVuY3Rpb24nO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNQbGFpbk9iamVjdCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhciBsaXRlcmFsT2JqZWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXkuY2hhckF0KDApID09PSAnJCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbGl0ZXJhbE9iamVjdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChsaXRlcmFsT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBPYmplY3QgPT4geyBmaWVsZDogeyBmaWVsZF8xOiA8dmFsdWU+LCBmaWVsZF8yOiA8dmFsdWU+IH0gfScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ2xpdGVyYWxfb2JqZWN0JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb2YgdHlwZSBPcGVyYXRvciA9PiB7IGZpZWxkOiB7ICRndDogMiwgJGx0IDUgfSB9Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY2xhdXNlLnR5cGUgPSAnb3BlcmF0b3Jfb2JqZWN0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2NsYXVzZSBvZiB0eXBlIE9iamVjdElkIC0+IFN0cmluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2UudHlwZSA9ICdzdHJpbmcnO1xuICAgICAgICAgICAgY2xhdXNlLnZhbHVlID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNsYXVzZS50eXBlID0gJ19faW52YWxpZF9fJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHBhcnRzID0ga2V5cGF0aC5zcGxpdCgnLicpO1xuICAgICAgICBpZiAocGFydHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjbGF1c2Ugb3ZlciBPYmplY3QgZmllbGQgPT4geyBcImZpZWxkMS5maWVsZDFfMlwiOiA8dmFsdWU+IH0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xhdXNlLmtpbmQgPSAnb2JqZWN0JztcbiAgICAgICAgICAgIGNsYXVzZS5rZXkgPSBwYXJ0cztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIG92ZXIgUGxhaW4gZmllbGQgPT4geyBcImZpZWxkXCI6IDx2YWx1ZT4gfScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbGF1c2Uua2luZCA9ICdwbGFpbic7XG4gICAgICAgICAgICBjbGF1c2Uua2V5ID0gcGFydHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY2xhdXNlIGNyZWF0ZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShjbGF1c2UpKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjbGF1c2U7XG4gICAgfTtcbiAgICBcbiAgICBTZWxlY3Rvci5NQVRDSF9TRUxFQ1RPUiA9ICdtYXRjaCc7XG4gICAgU2VsZWN0b3IuU09SVF9TRUxFQ1RPUiA9ICdzb3J0JztcbiAgICBTZWxlY3Rvci5GSUVMRF9TRUxFQ1RPUiA9ICdmaWVsZCc7XG4gICAgU2VsZWN0b3IuQUdHX0ZJRUxEX1NFTEVDVE9SID0gJ3Byb2plY3QnO1xuICAgIFxuICAgIHJldHVybiBTZWxlY3Rvcjtcbn07Il19
