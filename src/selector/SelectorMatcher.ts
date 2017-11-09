import { JSWLogger } from "jsw-logger";
import * as _ from "lodash";

export class SelectorMatcher {
	public clauses;

	protected logger: JSWLogger;

	constructor(selector) {
		this.clauses = selector.clauses;

		this.logger = JSWLogger.instance;
	}

	public test(document) {
		this.logger.debug("Called SelectorMatcher->test");

		let _match: boolean = false;

		if (_.isNil(document)) {
			this.logger.debug("document -> null");

			this.logger.throw("Parameter \"document\" required");
		}

		this.logger.debug("document -> not null");

		for (const clause of this.clauses) {
			if (clause.kind === "function") {
				this.logger.debug("clause -> function");

				_match = clause.value.call(null, document);
			} else if (clause.kind === "plain") {
				this.logger.debug(`clause -> plain on field "${clause.key}" and value = ${JSON.stringify(clause.value)}`);

				_match = testClause(clause, document[clause.key]);

				this.logger.debug("clause result -> " + _match);
			} else if (clause.kind === "object") {
				this.logger.debug(`clause -> object on field "${clause.key.join(".")}" and value = ${JSON.stringify(clause.value)}`);

				_match = testObjectClause(clause, document, _.clone(clause.key).reverse());

				this.logger.debug("clause result -> " + _match);
			} else if (clause.kind === "operator") {
				this.logger.debug(`clause -> operator "${clause.key}"`);

				_match = testLogicalClause(clause, document, clause.key);

				this.logger.debug("clause result -> " + _match);
			}

			// If any test case fails, the document will not match
			if (_match === false/* || <string>_match === "false"*/) {
				this.logger.debug("the document do not matches");

				return false;
			}
		}

		// Everything matches
		this.logger.debug("the document matches");

		return true;
	}

	public static all(arr, value) {
		// $all is only meaningful on arrays
		if (!(arr instanceof Array)) {
			return false;
		}

		// TODO should use a canonicalizing representation, so that we
		// don"t get screwed by key order
		const parts = {};
		let remaining = 0;

		_.forEach(value, (val) => {
			const hash = JSON.stringify(val);

			if (!(hash in parts)) {
				parts[hash] = true;
				remaining++;
			}
		});

		for (const item of arr) {
			const hash = JSON.stringify(item);
			if (parts[hash]) {
				delete parts[hash];
				remaining--;

				if (0 === remaining) { return true; }
			}
		}

		return false;
	}

	public static in(arr, value) {
		if (!_.isObject(arr)) {
			// optimization: use scalar equality (fast)
			for (const item of value) {
				if (arr === item) {
					return true;
				}
			}

			return false;
		} else {
			// nope, have to use deep equality
			for (const item of value) {
				if (SelectorMatcher.equal(arr, item)) {
					return true;
				}
			}

			return false;
		}
	}

	// deep equality test: use for literal document and array matches
	public static equal(arr, qval) {
		const match = (valA, valB) => {
			// scalars
			if (_.isNumber(valA) || _.isString(valA) || _.isBoolean(valA) || _.isNil(valA)) { return valA === valB; }

			if (_.isFunction(valA)) { return false; }  // Not allowed yet

			// OK, typeof valA === "object"
			if (!_.isObject(valB)) { return false; }

			// arrays
			if (_.isArray(valA)) {
				if (!_.isArray(valB)) { return false; }

				if (valA.length !== valB.length) { return false; }

				for (let i = 0; i < valA.length; i++) {
					if (!match(valA[i], valB[i])) { return false; }
				}

				return true;
			}

			// objects
			/*
			var unmatched_b_keys = 0;
			for (var x in b)
				unmatched_b_keys++;
			for (var x in a) {
				if (!(x in b) || !match(a[x], b[x]))
					return false;
				unmatched_b_keys--;
			}
			return unmatched_b_keys === 0;
			*/
			// Follow Mongo in considering key order to be part of
			// equality. Key enumeration order is actually not defined in
			// the ecmascript spec but in practice most implementations
			// preserve it. (The exception is Chrome, which preserves it
			// usually, but not for keys that parse as ints.)
			const bKeys = [];

			for (const item of Object.keys(valB)) {
				bKeys.push(valB[item]);
			}

			let index = 0;
			for (const item of Object.keys(valA)) {
				if (index >= bKeys.length) { return false; }

				if (!match(valA[item], bKeys[index])) { return false; }

				index++;
			}
			if (index !== bKeys.length) { return false; }

			return true;
		};

		return match(arr, qval);
	}

	// if x is not an array, true iff f(x) is true. if x is an array,
	// true iff f(y) is true for any y in x.
	//
	// this is the way most mongo operators (like $gt, $mod, $type..)
	// treat their arguments.
	public static matches(value, func) {
		if (_.isArray(value)) {
			for (const item of value) {
				if (func(item)) { return true; }
			}

			return false;
		}

		return func(value);
	}

	// like _matches, but if x is an array, it"s true not only if f(y)
	// is true for some y in x, but also if f(x) is true.
	//
	// this is the way mongo value comparisons usually work, like {x:
	// 4}, {x: [4]}, or {x: {$in: [1,2,3]}}.
	public static matches_plus(value, func) {
		// if (_.isArray(value)) {
		// 	 for (var i = 0; i < value.length; i++) {
		// 		 if (func(value[i])) return true;
		// 	 }

		// 	 // fall through!
		// }

		// return func(value);
		return SelectorMatcher.matches(value, func) || func(value);
	}

	// compare two values of unknown type according to BSON ordering
	// semantics. (as an extension, consider "undefined" to be less than
	// any other value.)
	// return negative if v is less, positive if valueB is less, or 0 if equal
	public static cmp(valueA, valueB) {
		if (_.isUndefined(valueA)) { return valueB === undefined ? 0 : -1; }

		if (_.isUndefined(valueB)) { return 1; }

		const aType = BSON_TYPES.getByValue(valueA);
		const bType = BSON_TYPES.getByValue(valueB);

		if (aType.order !== bType.order) { return aType.order < bType.order ? -1 : 1; }

		// Same sort order, but distinct value type
		if (aType.number !== bType.number) {
			// Currently, Symbols can not be sortered in JS, so we are setting the Symbol as greater
			if (_.isSymbol(valueA)) { return 1; }
			if (_.isSymbol(valueB)) { return -1; }

			// TODO Integer, Date and Timestamp
		}

		if (_.isNumber(valueA)) { return valueA - valueB; }

		if (_.isString(valueA)) { return valueA < valueB ? -1 : (valueA === valueA ? 0 : 1); }

		if (_.isBoolean(valueA)) {
			if (valueA) { return valueB ? 0 : 1; }

			return valueB ? -1 : 0;
		}

		if (_.isArray(valueA)) {
			for (let i = 0; ; i++) {
				if (i === valueA.length) { return (i === valueB.length) ? 0 : -1; }

				if (i === valueB.length) { return 1; }

				if (valueA.length !== valueB.length) { return valueA.length - valueB.length; }

				const result = SelectorMatcher.cmp(valueA[i], valueB[i]);

				if (result !== 0) {
					return result;
				}
			}
		}

		if (_.isNull(valueA)) { return 0; }

		if (_.isRegExp(valueA)) { throw Error("Sorting not supported on regular expression"); } // TODO

		// if (_.isFunction(valueA)) return {type: 13, order: 100, fnc: _.isFunction};

		if (_.isPlainObject(valueA)) {
			const toArray = (obj) => {
				const ret = [];

				for (const key of Object.keys(obj)) {
					ret.push(key);
					ret.push(obj[key]);
				}

				return ret;
			};

			return SelectorMatcher.cmp(toArray(valueA), toArray(valueB));
		}

		// double
		// if (ta === 1)  return a - b;

		// string
		// if (tb === 2) return a < b ? -1 : (a === b ? 0 : 1);

		// Object
		// if (ta === 3) {
		// 	 // this could be much more efficient in the expected case ...
		// 	 var to_array = function (obj) {
		// 		 var ret = [];

		// 		 for (var key in obj) {
		// 			 ret.push(key);
		// 			 ret.push(obj[key]);
		// 		 }

		// 		 return ret;
		// 	 };

		// 	 return Selector._f._cmp(to_array(a), to_array(b));
		// }

		// Array
		// if (ta === 4) {
		// 	 for (var i = 0; ; i++) {
		// 		 if (i === a.length) return (i === b.length) ? 0 : -1;

		// 		 if (i === b.length) return 1;

		// 		 if (a.length !== b.length) return a.length - b.length;

		// 		 var s = Selector._f._cmp(a[i], b[i]);

		// 		 if (s !== 0) return s;
		// 	 }
		// }

		// 5: binary data
		// 7: object id

		// boolean
		// if (ta === 8) {
		// 	 if (a) return b ? 0 : 1;

		// 	 return b ? -1 : 0;
		// }

		// 9: date

		// null
		// if (ta === 10) return 0;

		// regexp
		// if (ta === 11) {
		// 	 throw Error("Sorting not supported on regular expression"); // TODO
		// }

		// 13: javascript code
		// 14: symbol
		if (_.isSymbol(valueA)) {
			// Currently, Symbols can not be sortered in JS, so we are returning an equality
			return 0;
		}
		// 15: javascript code with scope
		// 16: 32-bit integer
		// 17: timestamp
		// 18: 64-bit integer
		// 255: minkey
		// 127: maxkey

		// javascript code
		// if (ta === 13) {
		// 	 throw Error("Sorting not supported on Javascript code"); // TODO
		// }
	}
}

const testClause = (clause, val) => {
	JSWLogger.instance.debug("Called testClause");

	// var _val = clause.value;

	// if RegExp || $ -> Operator

	return SelectorMatcher.matches_plus(val, (value) => {
		// TODO object ids, dates, timestamps?
		switch (clause.type) {
			case "null":
				JSWLogger.instance.debug("test Null equality");

				// http://www.mongodb.org/display/DOCS/Querying+and+nulls
				if (_.isNil(value)) {
					return true;
				} else {
					return false;
				}
			case "regexp":
				JSWLogger.instance.debug("test RegExp equality");

				return testOperatorClause(clause, value);
			case "literal_object":
				JSWLogger.instance.debug("test Literal Object equality");

				return SelectorMatcher.equal(value, clause.value);
			case "operator_object":
				JSWLogger.instance.debug("test Operator Object equality");

				return testOperatorClause(clause, value);
			case "string":
				JSWLogger.instance.debug("test String equality");

				return _.toString(value) === _.toString(clause.value);
			case "number":
				JSWLogger.instance.debug("test Number equality");

				return _.toNumber(value) === _.toNumber(clause.value);
			case "boolean":
				JSWLogger.instance.debug("test Boolean equality");

				return (_.isBoolean(value) && _.isBoolean(clause.value) && (value === clause.value));
			case "array":
				JSWLogger.instance.debug("test Boolean equality");

				// Check type
				if (_.isArray(value) && _.isArray(clause.value)) {
					// Check length
					if (value.length === clause.value.length) {
						// Check items
						for (const item of value) {
							if (clause.value.indexOf(item) === -1) {
								return false;
							}
						}

						return true;
					} else {
						return false;
					}
				} else {
					return false;
				}
			case "function":
				JSWLogger.instance.debug("test Function equality");

				JSWLogger.instance.throw("Bad value type in query");

				break;
			default:
				JSWLogger.instance.throw("Bad value type in query");
		}
	});
};

const testObjectClause = (clause, doc, key) => {
	JSWLogger.instance.debug("Called testObjectClause");

	let val = null;
	let path = null;

	if (key.length > 0) {
		path = key.pop();
		val = doc[path];

		JSWLogger.instance.debug("check on field " + path);

		// TODO add _.isNumber(val) and treat it as an array
		if (val) {
			JSWLogger.instance.log(val);
			JSWLogger.instance.debug("going deeper");

			return testObjectClause(clause, val, key);
		}
	} else {
		JSWLogger.instance.debug("lowest path: " + path);

		return testClause(clause, doc);
	}
};

const testLogicalClause = (clause, doc, key) => {
	let matches = null;

	for (const clauseValue of clause.value) {
		const matcher = new SelectorMatcher({ clauses: [clauseValue] });

		switch (key) {
			case "and":
				// True unless it has one that do not match
				if (_.isNil(matches)) { matches = true; }

				if (!matcher.test(doc)) {
					return false;
				}

				break;
			case "or":
				// False unless it has one match at least
				if (_.isNil(matches)) { matches = false; }

				if (matcher.test(doc)) {
					return true;
				}

				break;
		}
	}

	return matches || false;
};

const testOperatorClause = (clause, value) => {
	JSWLogger.instance.debug("Called testOperatorClause");

	for (const key of Object.keys(clause.value)) {
		if (!testOperatorConstraint(key, clause.value[key], clause.value, value, clause)) {
			return false;
		}
	}

	return true;
};

const testOperatorConstraint = (key, operatorValue, clauseValue, docVal, clause) => {
	JSWLogger.instance.debug("Called testOperatorConstraint");

	switch (key) {
		// Comparison Query Operators
		case "$gt":
			JSWLogger.instance.debug("testing operator $gt");

			return SelectorMatcher.cmp(docVal, operatorValue) > 0;
		case "$lt":
			JSWLogger.instance.debug("testing operator $lt");

			return SelectorMatcher.cmp(docVal, operatorValue) < 0;
		case "$gte":
			JSWLogger.instance.debug("testing operator $gte");

			return SelectorMatcher.cmp(docVal, operatorValue) >= 0;
		case "$lte":
			JSWLogger.instance.debug("testing operator $lte");

			return SelectorMatcher.cmp(docVal, operatorValue) <= 0;
		case "$eq":
			JSWLogger.instance.debug("testing operator $eq");

			return SelectorMatcher.equal(docVal, operatorValue);
		case "$ne":
			JSWLogger.instance.debug("testing operator $ne");

			return !SelectorMatcher.equal(docVal, operatorValue);
		case "$in":
			JSWLogger.instance.debug("testing operator $in");

			return SelectorMatcher.in(docVal, operatorValue);
		case "$nin":
			JSWLogger.instance.debug("testing operator $nin");

			return !SelectorMatcher.in(docVal, operatorValue);
		// Logical Query Operators
		case "$not":
			JSWLogger.instance.debug("testing operator $not");

			// $or, $and, $nor are in the "operator" kind treatment
			/*
			var _clause = {
				kind: "plain",
				key: clause.key,
				value: operatorValue,
				type:
			};
			var _parent = clause.value;
			var _key =
			return !(testClause(_clause, docVal));
			*/
			// TODO implement
			JSWLogger.instance.throw("$not unimplemented");

			break;
		// Element Query Operators
		case "$exists":
			JSWLogger.instance.debug("testing operator $exists");

			return operatorValue ? !_.isUndefined(docVal) : _.isUndefined(docVal);
		case "$type":
			JSWLogger.instance.debug("testing operator $type");

			// $type: 1 is true for an array if any element in the array is of
			// type 1. but an array doesn"t have type array unless it contains
			// an array..
			// var Selector._f._type(docVal);
			// return Selector._f._type(docVal).type === operatorValue;
			JSWLogger.instance.throw("$type unimplemented");

			break;
		// Evaluation Query Operators
		case "$mod":
			JSWLogger.instance.debug("testing operator $mod");

			return docVal % operatorValue[0] === operatorValue[1];
		case "$options":
			JSWLogger.instance.debug("testing operator $options (ignored)");

			// Ignore, as it is to the RegExp
			return true;
		case "$regex":
			JSWLogger.instance.debug("testing operator $regex");

			let _opt = null;
			if (_.hasIn(clauseValue, "$options")) {
				_opt = clauseValue.$options;

				if (/[xs]/.test(_opt)) {
					// g, i, m, x, s
					// TODO mongo uses PCRE and supports some additional flags: "x" and
					// "s". javascript doesn"t support them. so this is a divergence
					// between our behavior and mongo"s behavior. ideally we would
					// implement x and s by transforming the regexp, but not today..

					JSWLogger.instance.throw("Only the i, m, and g regexp options are supported");
				}
			}

			// Review flags -> g & m
			let regexp = operatorValue;

			if (_.isRegExp(regexp) && _.isNil(_opt)) {
				return regexp.test(docVal);
			} else if (_.isNil(_opt)) {
				regexp = new RegExp(regexp);
			} else if (_.isRegExp(regexp)) {
				regexp = new RegExp(regexp.source, _opt);
			} else {
				regexp = new RegExp(regexp, _opt);
			}

			return regexp.test(docVal);
		case "$text":
			JSWLogger.instance.debug("testing operator $text");

			// TODO implement
			throw Error("$text unimplemented");
		case "$where":
			JSWLogger.instance.debug("testing operator $where");

			// TODO implement
			throw Error("$where unimplemented");
		// Geospatial Query Operators
		// TODO -> in operator kind
		// Query Operator Array
		case "$all":
			JSWLogger.instance.debug("testing operator $all");

			// return SelectorMatcher.all(operatorValue, docVal) > 0;
			return SelectorMatcher.all(operatorValue, docVal);
		case "$elemMatch":
			JSWLogger.instance.debug("testing operator $elemMatch");

			// TODO implement
			throw Error("$elemMatch unimplemented");
		case "$size":
			JSWLogger.instance.debug("testing operator $size");

			return _.isArray(docVal) && docVal.length === operatorValue;
		// Bitwise Query Operators
		// TODO
		default:
			JSWLogger.instance.debug("testing operator " + key);

			JSWLogger.instance.throw("Unrecognized key in selector: " + key);
	}
};

const BSON_TYPES = {
	types: [
		{ alias: "minKey", number: -1, order: 1, isType: null },
		{ alias: "null", number: 10, order: 2, isType: null },
		{ alias: "int", number: 16, order: 3, isType: _.isInteger },
		{ alias: "long", number: 18, order: 3, isType: _.isNumber },
		{ alias: "double", number: 1, order: 3, isType: _.isNumber },
		{ alias: "number", number: null, order: 3, isType: _.isNumber },
		{ alias: "string", number: 2, order: 4, isType: _.isString },
		{ alias: "symbol", number: 14, order: 4, isType: _.isSymbol },
		{ alias: "object", number: 3, order: 5, isType: _.isPlainObject },
		{ alias: "array", number: 4, order: 6, isType: _.isArray },
		{ alias: "binData", number: 5, order: 7, isType: null },
		{ alias: "objectId", number: 7, order: 8, isTypefnc: null },
		{ alias: "bool", number: 8, order: 9, isType: _.isBoolean },
		{ alias: "date", number: 9, order: 10, isTypefnc: _.isDate },		   // format
		{ alias: "timestamp", number: 17, order: 11, isType: _.isDate },		// format
		{ alias: "regex", number: 11, order: 12, isType: _.isRegExp },
		{ alias: "maxKey", number: 127, order: 13, isType: null }

		// 		undefined 6
		// 		dbPointer
		// 		javascript
		// 		javascriptWithScope
		// 		function
	],

	getByAlias(alias) {
		for (const type of this.types) {
			if (type.alias === alias) { return type; }
		}
	},

	getByValue(val) {
		if (_.isNumber(val)) { return this.getByAlias("double"); }

		if (_.isString(val)) { return this.getByAlias("string"); }

		if (_.isBoolean(val)) { return this.getByAlias("bool"); }

		if (_.isArray(val)) { return this.getByAlias("array"); }

		if (_.isNull(val)) { return this.getByAlias("null"); }

		if (_.isRegExp(val)) { return this.getByAlias("regex"); }

		if (_.isPlainObject(val)) { return this.getByAlias("object"); }

		if (_.isSymbol(val)) { return this.getByAlias("symbol"); }

		JSWLogger.instance.throw("Unaccepted BSON type");
	}
};
