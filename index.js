"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("./src/core");
exports.MongoPortable = core_1.MongoPortable;
var store_1 = require("./src/store");
exports.BaseStore = store_1.BaseStore;
try {
    if (window) {
        window["MongoPortable"] = core_1.MongoPortable;
    }
}
catch (e) { }
//# sourceMappingURL=index.js.map