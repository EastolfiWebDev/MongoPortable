
var Logger = require("./utils/Logger"),
    _ = require("lodash");
    

var SelectorMatcher = function(selector) {
    this.selector = selector;
    
    this.clauses = [];
};

SelectorMatcher.prototype.test = function(document) {
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
            Logger.debug('clause -> object on field "' + (clause.key.join('.')) + '" and value = ' + clause.value);
            
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

var _testClause = function(selector, clause, val) {
    Logger.debug('Called _testClause');
    
    // var _val = clause.value;
    
    // if RegExp || $ -> Operator
    
    return selector._f._matches_plus(val, function(_value) {
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
                
                return (_.isBoolean(_value) && _.isBoolean(clause.value) && (_value === clause.value));
            case 'function':
                Logger.debug('test Function equality');
                
                throw Error("Bad value type in query");
            default:
                throw Error("Bad value type in query");
        }
    });
};

var _testObjectClause = function(selector, clause, doc, key) {
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

var _testOperatorClause = function(selector, clause, value) {
    Logger.debug('Called _testOperatorClause');
    
    if (_.isRegExp(value)) {
        return _testOperatorClause(selector, clause, {$regex: clause.value});
    } else {
        for (var key in clause.value) {
            if (!_testOperatorConstraint(selector, key, clause.value[key], clause.value, value, clause)) {
                return false;
            }
        }
        
        return true;
    }
};

var _testOperatorConstraint = function (selector, key, operatorValue, clauseValue, docVal, clause) {
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