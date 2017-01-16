"use strict";
var MongoPortable_1 = require("./src/MongoPortable");
exports.MongoPortable = MongoPortable_1.MongoPortable;
try {
    if (window) {
        window["MongoPortable"] = MongoPortable_1.MongoPortable;
    }
}
catch (e) { }

//# sourceMappingURL=index.js.map
