"use strict";

var Logger = require("./utils/Logger"),
    _ = require("lodash");

var SelectorMatcher = function SelectorMatcher(selector) {
    this.selector = selector;

    this.clauses = [];
};

SelectorMatcher.prototype.test = function (document) {
    Logger.debug('Called SelectorMatcher->test');

    var _match = true;

    if (_.isNil(document)) {
        Logger.debug('document -> null');

        throw Error("Parameter 'document' required");
    }

    Logger.debug('document -> not null');

    for (var i = 0; i < this.clauses.length; i++) {
        var clause = this.clauses[i];

        if (clause.kind === 'function') {
            Logger.debug('clause -> function');

            _match = clause.value.call(document);
        } else if (clause.kind === 'plain') {
            Logger.debug('clause -> plain on field "' + clause.key + '" and value = ' + clause.value);

            _match = _testClause(this.selector, clause, document[clause.key]);

            Logger.debug('clause result -> ' + _match);
        } else if (clause.kind === 'object') {
            Logger.debug('clause -> object on field "' + clause.key.join('.') + '" and value = ' + clause.value);

            _match = _testObjectClause(this.selector, clause, document, _.clone(clause.key).reverse());

            Logger.debug('clause result -> ' + _match);
        }

        // If any test case fails, the document will not match
        if (_match === false || _match === 'false') {
            Logger.debug('the document do not matches');

            return false;
        }
    }

    // Everything matches
    Logger.debug('the document matches');

    return true;
};

var _testClause = function _testClause(selector, clause, val) {
    Logger.debug('Called _testClause');

    // var _val = clause.value;

    // if RegExp || $ -> Operator

    return selector._f._matches_plus(val, function (_value) {
        // TODO object ids, dates, timestamps?
        switch (clause.type) {
            case 'null':
                Logger.debug('test Null equality');

                // http://www.mongodb.org/display/DOCS/Querying+and+nulls
                if (_.isNil(_value)) {
                    return true;
                } else {
                    return false;
                }
            case 'regexp':
                Logger.debug('test RegExp equality');

                return _testOperatorClause(selector, clause, _value);
            case 'literal_object':
                Logger.debug('test Literal Object equality');

                return selector._f._equal(_value, JSON.stringify(clause.value));
            case 'operator_object':
                Logger.debug('test Operator Object equality');

                return _testOperatorClause(selector, clause, _value);
            case 'string':
                Logger.debug('test String equality');

                return _.toString(_value) === _.toString(clause.value);
            case 'number':
                Logger.debug('test Number equality');

                return _.toNumber(_value) === _.toNumber(clause.value);
            case 'boolean':
                Logger.debug('test Boolean equality');

                return _.isBoolean(_value) && _.isBoolean(clause.value) && _value === clause.value;
            case 'function':
                Logger.debug('test Function equality');

                throw Error("Bad value type in query");
            default:
                throw Error("Bad value type in query");
        }
    });
};

var _testObjectClause = function _testObjectClause(selector, clause, doc, key) {
    Logger.debug('Called _testObjectClause');

    var val = null;

    if (key.length > 0) {
        var path = key.pop();
        val = doc[path];

        Logger.debug('check on field ' + path);

        // TODO add _.isNumber(val) and treat it as an array
        if (val) {
            Logger.log(val);
            Logger.debug('going deeper');

            return _testObjectClause(selector, clause, val, key);
        }
    } else {
        Logger.debug('lowest path: ' + path);

        return _testClause(selector, clause, doc);
    }
};

var _testOperatorClause = function _testOperatorClause(selector, clause, value) {
    Logger.debug('Called _testOperatorClause');

    if (_.isRegExp(value)) {
        return _testOperatorClause(selector, clause, { $regex: clause.value });
    } else {
        for (var key in clause.value) {
            if (!_testOperatorConstraint(selector, key, clause.value[key], clause.value, value, clause)) {
                return false;
            }
        }

        return true;
    }
};

var _testOperatorConstraint = function _testOperatorConstraint(selector, key, operatorValue, clauseValue, docVal, clause) {
    Logger.debug('Called _testOperatorConstraint');

    switch (key) {
        // Comparison Query Operators
        case '$gt':
            Logger.debug('testing operator $gt');

            return selector._f._cmp(docVal, operatorValue) > 0;
        case '$lt':
            Logger.debug('testing operator $lt');

            return selector._f._cmp(docVal, operatorValue) < 0;
        case '$gte':
            Logger.debug('testing operator $gte');

            return selector._f._cmp(docVal, operatorValue) >= 0;
        case '$lte':
            Logger.debug('testing operator $lte');

            return selector._f._cmp(docVal, operatorValue) <= 0;
        case '$eq':
            Logger.debug('testing operator $eq');

            return selector._f._equal(docVal, operatorValue);
        case '$ne':
            Logger.debug('testing operator $ne');

            return !selector._f._equal(docVal, operatorValue);
        case '$in':
            Logger.debug('testing operator $in');

            return selector._f._in(docVal, operatorValue);
        case '$nin':
            Logger.debug('testing operator $nin');

            return !selector._f._in(docVal, operatorValue);
        // Logical Query Operators
        case '$not':
            Logger.debug('testing operator $not');

            // $or, $and, $nor are in the 'operator' kind treatment
            /*
            var _clause = {
                kind: 'plain',
                key: clause.key,
                value: operatorValue,
                type: 
            };
            var _parent = clause.value;
            var _key = 
            return !(_testClause(_clause, docVal));
            */
            // TODO implement
            throw Error("$text unimplemented");
        // Element Query Operators
        case '$exists':
            Logger.debug('testing operator $exists');

            return operatorValue ? !_.isUndefined(docVal) : _.isUndefined(docVal);
        case '$type':
            Logger.debug('testing operator $type');

            // $type: 1 is true for an array if any element in the array is of
            // type 1. but an array doesn't have type array unless it contains
            // an array..
            // var Selector._f._type(docVal);
            // return Selector._f._type(docVal).type === operatorValue;
            throw Error("$type unimplemented");
        // Evaluation Query Operators
        case '$mod':
            Logger.debug('testing operator $mod');

            return docVal % operatorValue[0] === operatorValue[1];
        case '$options':
            Logger.debug('testing operator $options (ignored)');

            // Ignore, as it is to the RegExp
            return true;
        case '$regex':
            Logger.debug('testing operator $regex');

            var _opt = '';
            if (_.hasIn(clauseValue, '$options')) {
                _opt = clauseValue['$options'];

                if (/^gim/.test(_opt)) {
                    //g, i, m, x, s
                    // TODO mongo uses PCRE and supports some additional flags: 'x' and
                    // 's'. javascript doesn't support them. so this is a divergence
                    // between our behavior and mongo's behavior. ideally we would
                    // implement x and s by transforming the regexp, but not today..

                    throw Error("Only the i, m, and g regexp options are supported");
                }
            }

            // Review flags -> g & m
            var regexp = operatorValue;
            if (_.isRegExp(regexp)) {
                regexp = new RegExp(regexp.source, _opt);
            } else {
                regexp = new RegExp(regexp, _opt);
            }

            return regexp.test(docVal);
        case '$text':
            Logger.debug('testing operator $text');

            // TODO implement
            throw Error("$text unimplemented");
        case '$where':
            Logger.debug('testing operator $where');

            // TODO implement
            throw Error("$where unimplemented");
        // Geospatial Query Operators
        // TODO -> in operator kind
        // Query Operator Array
        case '$all':
            Logger.debug('testing operator $all');

            return selector._f._all(operatorValue, docVal) > 0;
        case '$elemMatch':
            Logger.debug('testing operator $gt');

            // TODO implement
            throw Error("$elemMatch unimplemented");
        case '$size':
            Logger.debug('testing operator $size');

            return _.isArray(docVal) && docVal.length === operatorValue;
        // Bitwise Query Operators
        // TODO
        default:
            Logger.debug('testing operator ' + key);

            throw Error("Unrecognized key in selector: " + key);
    }
};

module.exports = SelectorMatcher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9TZWxlY3Rvck1hdGNoZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSxJQUFJLFNBQVMsUUFBUSxnQkFBUixDQUFiO0lBQ0ksSUFBSSxRQUFRLFFBQVIsQ0FEUjs7QUFJQSxJQUFJLGtCQUFrQixTQUFsQixlQUFrQixDQUFTLFFBQVQsRUFBbUI7QUFDckMsU0FBSyxRQUFMLEdBQWdCLFFBQWhCOztBQUVBLFNBQUssT0FBTCxHQUFlLEVBQWY7QUFDSCxDQUpEOztBQU1BLGdCQUFnQixTQUFoQixDQUEwQixJQUExQixHQUFpQyxVQUFTLFFBQVQsRUFBbUI7QUFDaEQsV0FBTyxLQUFQLENBQWEsOEJBQWI7O0FBRUEsUUFBSSxTQUFTLElBQWI7O0FBRUEsUUFBSSxFQUFFLEtBQUYsQ0FBUSxRQUFSLENBQUosRUFBdUI7QUFDbkIsZUFBTyxLQUFQLENBQWEsa0JBQWI7O0FBRUEsY0FBTSxNQUFNLCtCQUFOLENBQU47QUFDSDs7QUFFRCxXQUFPLEtBQVAsQ0FBYSxzQkFBYjs7QUFFQSxTQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksS0FBSyxPQUFMLENBQWEsTUFBakMsRUFBeUMsR0FBekMsRUFBOEM7QUFDMUMsWUFBSSxTQUFTLEtBQUssT0FBTCxDQUFhLENBQWIsQ0FBYjs7QUFFQSxZQUFJLE9BQU8sSUFBUCxLQUFnQixVQUFwQixFQUFnQztBQUM1QixtQkFBTyxLQUFQLENBQWEsb0JBQWI7O0FBRUEscUJBQVMsT0FBTyxLQUFQLENBQWEsSUFBYixDQUFrQixRQUFsQixDQUFUO0FBQ0gsU0FKRCxNQUlPLElBQUksT0FBTyxJQUFQLEtBQWdCLE9BQXBCLEVBQTZCO0FBQ2hDLG1CQUFPLEtBQVAsQ0FBYSwrQkFBK0IsT0FBTyxHQUF0QyxHQUE0QyxnQkFBNUMsR0FBK0QsT0FBTyxLQUFuRjs7QUFFQSxxQkFBUyxZQUFZLEtBQUssUUFBakIsRUFBMkIsTUFBM0IsRUFBbUMsU0FBUyxPQUFPLEdBQWhCLENBQW5DLENBQVQ7O0FB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SUFBUCxDQUFZLE1BQVosQ0FBUDtBQUNKLGFBQUssT0FBTDtBQUNJLG1CQUFPLEtBQVAsQ0FBYSx3QkFBYjs7O0FBR0Esa0JBQU0sTUFBTSxxQkFBTixDQUFOO0FBQ0osYUFBSyxRQUFMO0FBQ0ksbUJBQU8sS0FBUCxDQUFhLHlCQUFiOzs7QUFHQSxrQkFBTSxNQUFNLHNCQUFOLENBQU47Ozs7QUFJSixhQUFLLE1BQUw7QUFDSSxtQkFBTyxLQUFQLENBQWEsdUJBQWI7O0FBRUEsbUJBQU8sU0FBUyxFQUFULENBQVksSUFBWixDQUFpQixhQUFqQixFQUFnQyxNQUFoQyxJQUEwQyxDQUFqRDtBQUNKLGFBQUssWUFBTDtBQUNJLG1CQUFPLEtBQVAsQ0FBYSxzQkFBYjs7O0FBR0Esa0JBQU0sTUFBTSwwQkFBTixDQUFOO0FBQ0osYUFBSyxPQUFMO0FBQ0ksbUJBQU8sS0FBUCxDQUFhLHdCQUFiOztBQUVBLG1CQUFPLEVBQUUsT0FBRixDQUFVLE1BQVYsS0FBcUIsT0FBTyxNQUFQLEtBQWtCLGFBQTlDOzs7QUFHSjtBQUNJLG1CQUFPLEtBQVAsQ0FBYSxzQkFBc0IsR0FBbkM7O0FBRUEsa0JBQU0sTUFBTSxtQ0FBbUMsR0FBekMsQ0FBTjtBQXRJUjtBQXdJSCxDQTNJRDs7QUE2SUEsT0FBTyxPQUFQLEdBQWlCLGVBQWpCIiwiZmlsZSI6IlNlbGVjdG9yTWF0Y2hlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxudmFyIExvZ2dlciA9IHJlcXVpcmUoXCIuL3V0aWxzL0xvZ2dlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKTtcbiAgICBcblxudmFyIFNlbGVjdG9yTWF0Y2hlciA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgdGhpcy5zZWxlY3RvciA9IHNlbGVjdG9yO1xuICAgIFxuICAgIHRoaXMuY2xhdXNlcyA9IFtdO1xufTtcblxuU2VsZWN0b3JNYXRjaGVyLnByb3RvdHlwZS50ZXN0ID0gZnVuY3Rpb24oZG9jdW1lbnQpIHtcbiAgICBMb2dnZXIuZGVidWcoJ0NhbGxlZCBTZWxlY3Rvck1hdGNoZXItPnRlc3QnKTtcbiAgICBcbiAgICB2YXIgX21hdGNoID0gdHJ1ZTtcblxuICAgIGlmIChfLmlzTmlsKGRvY3VtZW50KSkge1xuICAgICAgICBMb2dnZXIuZGVidWcoJ2RvY3VtZW50IC0+IG51bGwnKTtcbiAgICAgICAgXG4gICAgICAgIHRocm93IEVycm9yKFwiUGFyYW1ldGVyICdkb2N1bWVudCcgcmVxdWlyZWRcIik7XG4gICAgfVxuICAgIFxuICAgIExvZ2dlci5kZWJ1ZygnZG9jdW1lbnQgLT4gbm90IG51bGwnKTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2xhdXNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2xhdXNlID0gdGhpcy5jbGF1c2VzW2ldO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNsYXVzZS5raW5kID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ2NsYXVzZSAtPiBmdW5jdGlvbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBfbWF0Y2ggPSBjbGF1c2UudmFsdWUuY2FsbChkb2N1bWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY2xhdXNlLmtpbmQgPT09ICdwbGFpbicpIHtcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygnY2xhdXNlIC0+IHBsYWluIG9uIGZpZWxkIFwiJyArIGNsYXVzZS5rZXkgKyAnXCIgYW5kIHZhbHVlID0gJyArIGNsYXVzZS52YWx1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIF9tYXRjaCA9IF90ZXN0Q2xhdXNlKHRoaXMuc2VsZWN0b3IsIGNsYXVzZSwgZG9jdW1lbnRbY2xhdXNlLmtleV0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ2NsYXVzZSByZXN1bHQgLT4gJyArIF9tYXRjaCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY2xhdXNlLmtpbmQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ2NsYXVzZSAtPiBvYmplY3Qgb24gZmllbGQgXCInICsgKGNsYXVzZS5rZXkuam9pbignLicpKSArICdcIiBhbmQgdmFsdWUgPSAnICsgY2xhdXNlLnZhbHVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgX21hdGNoID0gX3Rlc3RPYmplY3RDbGF1c2UodGhpcy5zZWxlY3RvciwgY2xhdXNlLCBkb2N1bWVudCwgXy5jbG9uZShjbGF1c2Uua2V5KS5yZXZlcnNlKCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ2NsYXVzZSByZXN1bHQgLT4gJyArIF9tYXRjaCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIGFueSB0ZXN0IGNhc2UgZmFpbHMsIHRoZSBkb2N1bWVudCB3aWxsIG5vdCBtYXRjaFxuICAgICAgICBpZiAoX21hdGNoID09PSBmYWxzZSB8fCBfbWF0Y2ggPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygndGhlIGRvY3VtZW50IGRvIG5vdCBtYXRjaGVzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBFdmVyeXRoaW5nIG1hdGNoZXNcbiAgICBMb2dnZXIuZGVidWcoJ3RoZSBkb2N1bWVudCBtYXRjaGVzJyk7XG4gICAgXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG52YXIgX3Rlc3RDbGF1c2UgPSBmdW5jdGlvbihzZWxlY3RvciwgY2xhdXNlLCB2YWwpIHtcbiAgICBMb2dnZXIuZGVidWcoJ0NhbGxlZCBfdGVzdENsYXVzZScpO1xuICAgIFxuICAgIC8vIHZhciBfdmFsID0gY2xhdXNlLnZhbHVlO1xuICAgIFxuICAgIC8vIGlmIFJlZ0V4cCB8fCAkIC0+IE9wZXJhdG9yXG4gICAgXG4gICAgcmV0dXJuIHNlbGVjdG9yLl9mLl9tYXRjaGVzX3BsdXModmFsLCBmdW5jdGlvbihfdmFsdWUpIHtcbiAgICAgICAgLy8gVE9ETyBvYmplY3QgaWRzLCBkYXRlcywgdGltZXN0YW1wcz9cbiAgICAgICAgc3dpdGNoIChjbGF1c2UudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnbnVsbCc6XG4gICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKCd0ZXN0IE51bGwgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9RdWVyeWluZythbmQrbnVsbHNcbiAgICAgICAgICAgICAgICBpZiAoXy5pc05pbChfdmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdyZWdleHAnOlxuICAgICAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygndGVzdCBSZWdFeHAgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gX3Rlc3RPcGVyYXRvckNsYXVzZShzZWxlY3RvciwgY2xhdXNlLCBfdmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnbGl0ZXJhbF9vYmplY3QnOlxuICAgICAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygndGVzdCBMaXRlcmFsIE9iamVjdCBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBzZWxlY3Rvci5fZi5fZXF1YWwoX3ZhbHVlLCBKU09OLnN0cmluZ2lmeShjbGF1c2UudmFsdWUpKTtcbiAgICAgICAgICAgIGNhc2UgJ29wZXJhdG9yX29iamVjdCc6XG4gICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKCd0ZXN0IE9wZXJhdG9yIE9iamVjdCBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBfdGVzdE9wZXJhdG9yQ2xhdXNlKHNlbGVjdG9yLCBjbGF1c2UsIF92YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygndGVzdCBTdHJpbmcgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gXy50b1N0cmluZyhfdmFsdWUpID09PSBfLnRvU3RyaW5nKGNsYXVzZS52YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygndGVzdCBOdW1iZXIgZXF1YWxpdHknKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gXy50b051bWJlcihfdmFsdWUpID09PSBfLnRvTnVtYmVyKGNsYXVzZS52YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3Rlc3QgQm9vbGVhbiBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiAoXy5pc0Jvb2xlYW4oX3ZhbHVlKSAmJiBfLmlzQm9vbGVhbihjbGF1c2UudmFsdWUpICYmIChfdmFsdWUgPT09IGNsYXVzZS52YWx1ZSkpO1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygndGVzdCBGdW5jdGlvbiBlcXVhbGl0eScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHZhbHVlIHR5cGUgaW4gcXVlcnlcIik7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiQmFkIHZhbHVlIHR5cGUgaW4gcXVlcnlcIik7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbnZhciBfdGVzdE9iamVjdENsYXVzZSA9IGZ1bmN0aW9uKHNlbGVjdG9yLCBjbGF1c2UsIGRvYywga2V5KSB7XG4gICAgTG9nZ2VyLmRlYnVnKCdDYWxsZWQgX3Rlc3RPYmplY3RDbGF1c2UnKTtcbiAgICBcbiAgICB2YXIgdmFsID0gbnVsbDtcbiAgICBcbiAgICBpZiAoa2V5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIHBhdGggPSBrZXkucG9wKCk7XG4gICAgICAgIHZhbCA9IGRvY1twYXRoXTtcbiAgICAgICAgXG4gICAgICAgIExvZ2dlci5kZWJ1ZygnY2hlY2sgb24gZmllbGQgJyArIHBhdGgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVE9ETyBhZGQgXy5pc051bWJlcih2YWwpIGFuZCB0cmVhdCBpdCBhcyBhbiBhcnJheVxuICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICBMb2dnZXIubG9nKHZhbCk7XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ2dvaW5nIGRlZXBlcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gX3Rlc3RPYmplY3RDbGF1c2Uoc2VsZWN0b3IsIGNsYXVzZSwgdmFsLCBrZXkpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgTG9nZ2VyLmRlYnVnKCdsb3dlc3QgcGF0aDogJyArIHBhdGgpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIF90ZXN0Q2xhdXNlKHNlbGVjdG9yLCBjbGF1c2UsIGRvYyk7XG4gICAgfVxufTtcblxudmFyIF90ZXN0T3BlcmF0b3JDbGF1c2UgPSBmdW5jdGlvbihzZWxlY3RvciwgY2xhdXNlLCB2YWx1ZSkge1xuICAgIExvZ2dlci5kZWJ1ZygnQ2FsbGVkIF90ZXN0T3BlcmF0b3JDbGF1c2UnKTtcbiAgICBcbiAgICBpZiAoXy5pc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIF90ZXN0T3BlcmF0b3JDbGF1c2Uoc2VsZWN0b3IsIGNsYXVzZSwgeyRyZWdleDogY2xhdXNlLnZhbHVlfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGNsYXVzZS52YWx1ZSkge1xuICAgICAgICAgICAgaWYgKCFfdGVzdE9wZXJhdG9yQ29uc3RyYWludChzZWxlY3Rvciwga2V5LCBjbGF1c2UudmFsdWVba2V5XSwgY2xhdXNlLnZhbHVlLCB2YWx1ZSwgY2xhdXNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufTtcblxudmFyIF90ZXN0T3BlcmF0b3JDb25zdHJhaW50ID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBrZXksIG9wZXJhdG9yVmFsdWUsIGNsYXVzZVZhbHVlLCBkb2NWYWwsIGNsYXVzZSkge1xuICAgIExvZ2dlci5kZWJ1ZygnQ2FsbGVkIF90ZXN0T3BlcmF0b3JDb25zdHJhaW50Jyk7XG4gICAgXG4gICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgLy8gQ29tcGFyaXNvbiBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgY2FzZSAnJGd0JzpcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkZ3QnKTtcblxuICAgICAgICAgICAgcmV0dXJuIHNlbGVjdG9yLl9mLl9jbXAoZG9jVmFsLCBvcGVyYXRvclZhbHVlKSA+IDA7XG4gICAgICAgIGNhc2UgJyRsdCc6XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGx0Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBzZWxlY3Rvci5fZi5fY21wKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSkgPCAwO1xuICAgICAgICBjYXNlICckZ3RlJzpcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkZ3RlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBzZWxlY3Rvci5fZi5fY21wKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSkgPj0gMDtcbiAgICAgICAgY2FzZSAnJGx0ZSc6XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGx0ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gc2VsZWN0b3IuX2YuX2NtcChkb2NWYWwsIG9wZXJhdG9yVmFsdWUpIDw9IDA7XG4gICAgICAgIGNhc2UgJyRlcSc6XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGVxJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBzZWxlY3Rvci5fZi5fZXF1YWwoZG9jVmFsLCBvcGVyYXRvclZhbHVlKTtcbiAgICAgICAgY2FzZSAnJG5lJzpcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbmUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuICFzZWxlY3Rvci5fZi5fZXF1YWwoZG9jVmFsLCBvcGVyYXRvclZhbHVlKTtcbiAgICAgICAgY2FzZSAnJGluJzpcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkaW4nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHNlbGVjdG9yLl9mLl9pbihkb2NWYWwsIG9wZXJhdG9yVmFsdWUpO1xuICAgICAgICBjYXNlICckbmluJzpcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygndGVzdGluZyBvcGVyYXRvciAkbmluJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiAhc2VsZWN0b3IuX2YuX2luKGRvY1ZhbCwgb3BlcmF0b3JWYWx1ZSk7XG4gICAgICAgIC8vIExvZ2ljYWwgUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIGNhc2UgJyRub3QnOlxuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRub3QnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gJG9yLCAkYW5kLCAkbm9yIGFyZSBpbiB0aGUgJ29wZXJhdG9yJyBraW5kIHRyZWF0bWVudFxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIHZhciBfY2xhdXNlID0ge1xuICAgICAgICAgICAgICAgIGtpbmQ6ICdwbGFpbicsXG4gICAgICAgICAgICAgICAga2V5OiBjbGF1c2Uua2V5LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBvcGVyYXRvclZhbHVlLFxuICAgICAgICAgICAgICAgIHR5cGU6IFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBfcGFyZW50ID0gY2xhdXNlLnZhbHVlO1xuICAgICAgICAgICAgdmFyIF9rZXkgPSBcbiAgICAgICAgICAgIHJldHVybiAhKF90ZXN0Q2xhdXNlKF9jbGF1c2UsIGRvY1ZhbCkpO1xuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIiR0ZXh0IHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgIC8vIEVsZW1lbnQgUXVlcnkgT3BlcmF0b3JzXG4gICAgICAgIGNhc2UgJyRleGlzdHMnOlxuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRleGlzdHMnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIG9wZXJhdG9yVmFsdWUgPyAhXy5pc1VuZGVmaW5lZChkb2NWYWwpIDogXy5pc1VuZGVmaW5lZChkb2NWYWwpO1xuICAgICAgICBjYXNlICckdHlwZSc6XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHR5cGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gJHR5cGU6IDEgaXMgdHJ1ZSBmb3IgYW4gYXJyYXkgaWYgYW55IGVsZW1lbnQgaW4gdGhlIGFycmF5IGlzIG9mXG4gICAgICAgICAgICAvLyB0eXBlIDEuIGJ1dCBhbiBhcnJheSBkb2Vzbid0IGhhdmUgdHlwZSBhcnJheSB1bmxlc3MgaXQgY29udGFpbnNcbiAgICAgICAgICAgIC8vIGFuIGFycmF5Li5cbiAgICAgICAgICAgIC8vIHZhciBTZWxlY3Rvci5fZi5fdHlwZShkb2NWYWwpO1xuICAgICAgICAgICAgLy8gcmV0dXJuIFNlbGVjdG9yLl9mLl90eXBlKGRvY1ZhbCkudHlwZSA9PT0gb3BlcmF0b3JWYWx1ZTtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiJHR5cGUgdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgLy8gRXZhbHVhdGlvbiBRdWVyeSBPcGVyYXRvcnNcbiAgICAgICAgY2FzZSAnJG1vZCc6XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJG1vZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZG9jVmFsICUgb3BlcmF0b3JWYWx1ZVswXSA9PT0gb3BlcmF0b3JWYWx1ZVsxXTtcbiAgICAgICAgY2FzZSAnJG9wdGlvbnMnOlxuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRvcHRpb25zIChpZ25vcmVkKScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZ25vcmUsIGFzIGl0IGlzIHRvIHRoZSBSZWdFeHBcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBjYXNlICckcmVnZXgnOlxuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRyZWdleCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgX29wdCA9ICcnO1xuICAgICAgICAgICAgaWYgKF8uaGFzSW4oY2xhdXNlVmFsdWUsICckb3B0aW9ucycpKSB7XG4gICAgICAgICAgICAgICAgX29wdCA9IGNsYXVzZVZhbHVlWyckb3B0aW9ucyddO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgvXmdpbS8udGVzdChfb3B0KSkge1xuICAgICAgICAgICAgICAgICAgICAvL2csIGksIG0sIHgsIHNcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyBtb25nbyB1c2VzIFBDUkUgYW5kIHN1cHBvcnRzIHNvbWUgYWRkaXRpb25hbCBmbGFnczogJ3gnIGFuZFxuICAgICAgICAgICAgICAgICAgICAvLyAncycuIGphdmFzY3JpcHQgZG9lc24ndCBzdXBwb3J0IHRoZW0uIHNvIHRoaXMgaXMgYSBkaXZlcmdlbmNlXG4gICAgICAgICAgICAgICAgICAgIC8vIGJldHdlZW4gb3VyIGJlaGF2aW9yIGFuZCBtb25nbydzIGJlaGF2aW9yLiBpZGVhbGx5IHdlIHdvdWxkXG4gICAgICAgICAgICAgICAgICAgIC8vIGltcGxlbWVudCB4IGFuZCBzIGJ5IHRyYW5zZm9ybWluZyB0aGUgcmVnZXhwLCBidXQgbm90IHRvZGF5Li5cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiT25seSB0aGUgaSwgbSwgYW5kIGcgcmVnZXhwIG9wdGlvbnMgYXJlIHN1cHBvcnRlZFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJldmlldyBmbGFncyAtPiBnICYgbVxuICAgICAgICAgICAgdmFyIHJlZ2V4cCA9IG9wZXJhdG9yVmFsdWU7XG4gICAgICAgICAgICBpZiAoXy5pc1JlZ0V4cChyZWdleHApKSB7XG4gICAgICAgICAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChyZWdleHAuc291cmNlLCBfb3B0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChyZWdleHAsIF9vcHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gcmVnZXhwLnRlc3QoZG9jVmFsKTtcbiAgICAgICAgY2FzZSAnJHRleHQnOlxuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICR0ZXh0Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIiR0ZXh0IHVuaW1wbGVtZW50ZWRcIik7XG4gICAgICAgIGNhc2UgJyR3aGVyZSc6XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJHdoZXJlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIiR3aGVyZSB1bmltcGxlbWVudGVkXCIpO1xuICAgICAgICAvLyBHZW9zcGF0aWFsIFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICAvLyBUT0RPIC0+IGluIG9wZXJhdG9yIGtpbmRcbiAgICAgICAgLy8gUXVlcnkgT3BlcmF0b3IgQXJyYXlcbiAgICAgICAgY2FzZSAnJGFsbCc6XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGFsbCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gc2VsZWN0b3IuX2YuX2FsbChvcGVyYXRvclZhbHVlLCBkb2NWYWwpID4gMDtcbiAgICAgICAgY2FzZSAnJGVsZW1NYXRjaCc6XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJGd0Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIiRlbGVtTWF0Y2ggdW5pbXBsZW1lbnRlZFwiKTtcbiAgICAgICAgY2FzZSAnJHNpemUnOlxuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKCd0ZXN0aW5nIG9wZXJhdG9yICRzaXplJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBfLmlzQXJyYXkoZG9jVmFsKSAmJiBkb2NWYWwubGVuZ3RoID09PSBvcGVyYXRvclZhbHVlO1xuICAgICAgICAvLyBCaXR3aXNlIFF1ZXJ5IE9wZXJhdG9yc1xuICAgICAgICAvLyBUT0RPXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoJ3Rlc3Rpbmcgb3BlcmF0b3IgJyArIGtleSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiVW5yZWNvZ25pemVkIGtleSBpbiBzZWxlY3RvcjogXCIgKyBrZXkpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JNYXRjaGVyOyJdfQ==
