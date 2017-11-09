import * as _ from "lodash";

export class Utils {
	/*
	 DO NOT MUTATES!
	 */
	public static renameObjectProperty(obj, property, newName) {
		const newObj = _.cloneDeep(obj);

		// Do nothing if some name is missing or is not an string
		if (!_.isString(property) || !_.isString(newName)) {
			return newObj;
		}

		// Do nothing if the names are the same
		if (property === newName) {
			return newObj;
		}

		// Check for the old property name to
		// avoid a ReferenceError in strict mode.
		if (newObj.hasOwnProperty(property)) {
			newObj[newName] = newObj[property];
			delete newObj[property];
		}

		return newObj;
	}
}
