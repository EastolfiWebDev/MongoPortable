var Logger = require("jsw-logger"),
    _ = require("lodash"),
    SelectorMatcher = require("./SelectorMatcher");
    
var logger = null;

class Selector {
    constructor(selector, type = Selector.MATCH_SELECTOR) {
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
    
    test(doc) {
        return this.selector_compiled.test(doc);
    }
    
    compile(selector) {
		if (_.isNil(selector)) {
			logger.debug('selector -> null');
			
			selector = {};
		} else {
			logger.debug('selector -> not null');
			
			if (!selector || (_.hasIn(selector, '_id') && !selector._id)) {
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
    
    compileSort(spec) {
        if (_.isNil(spec))  {
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
                    
                    if ((field === 'desc'  || field === 'asc') ||
                        (field === '-1'    || field === '1') ||
                        (field === 'false' || field === 'true')) {
                            
                        throw Error("Bad sort specification: ", JSON.stringify(spec));
                    } else {
                        var next = _.toString(fields[i+1]);
                        
                        if (next === 'desc' || next === 'asc') {
                            keys.push(field);
                            asc.push((next === 'asc') ? true : false);
                            
                            i++;
                        } else if (next === '-1' || next === '1') {
                            keys.push(field);
                            asc.push((next === '1') ? true : false);
                            
                            i++;
                        } else if (next === 'false' || next === 'true') {
                            keys.push(field);
                            asc.push((next === 'true') ? true : false);
                            
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
        return function(a, b) {
            var x = 0;
            
            for (var i = 0; i < keys.length; i++) {
                if (i !== 0 && x !== 0) return x;   // Non reachable?
                
                
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
    
    compileFields(spec) {
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
                    
                    if ((field === '-1'    || field === '1') ||
                        (field === 'false' || field === 'true')) {
                            
                        throw Error("Bad fields specification: ", JSON.stringify(spec));
                    } else {
                        var next = _.toString(fields[i+1]);
                        
                        if (next === '-1' || next === '1') {
                            if (next === '-1') {
                                for (let _key in projection) {
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
	static isSelectorCompiled(selector) {
		if (!_.isNil(selector) && (
		    selector instanceof SelectorMatcher || (selector instanceof Selector && 
		                                            selector.selector_compiled instanceof SelectorMatcher)
	    )) {
			return true;
		} else {
			return false;
		}
	}
	
	static matches(selector, doc) {
        return (new Selector(selector)).test(doc);
    }
}

var _buildSelector = function(selector) {
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

var _buildDocumentSelector = function(key, value) {
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
            for (let i = 0; i < value.length; i++) {
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

var _buildKeypathSelector = function (keypath, value) {
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
            $regex: source[1]   // The first item splitted is an empty string
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