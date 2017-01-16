import * as _ from "lodash";

class Utils {
    static renameObjectProperty(obj, property, newName) {
        // Do nothing if some name is missing or is not an string
        if (!_.isString(property) || !_.isString(newName)) {
            return obj;
        }
        
        // Do nothing if the names are the same
        if (property == newName) {
            return obj;
        }
        
        // Check for the old property name to 
        // avoid a ReferenceError in strict mode.
        if (obj.hasOwnProperty(property)) {
            obj[newName] = obj[property];
            delete obj[property];
        }
        
        return obj;
    }
}

export { Utils };