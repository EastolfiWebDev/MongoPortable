"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var Utils = (function () {
    function Utils() {
    }
    /*
     DO NOT MUTATES!
     */
    Utils.renameObjectProperty = function (obj, property, newName) {
        var newObj = _.cloneDeep(obj);
        // Do nothing if some name is missing or is not an string
        if (!_.isString(property) || !_.isString(newName)) {
            return newObj;
        }
        // Do nothing if the names are the same
        if (property == newName) {
            return newObj;
        }
        // Check for the old property name to 
        // avoid a ReferenceError in strict mode.
        if (newObj.hasOwnProperty(property)) {
            newObj[newName] = newObj[property];
            delete newObj[property];
        }
        return newObj;
    };
    return Utils;
}());
exports.Utils = Utils;
//# sourceMappingURL=Utils.js.map