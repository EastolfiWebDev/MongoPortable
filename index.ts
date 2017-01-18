import { MongoPortable } from "./src/core";

try {
    if (window) {
        window["MongoPortable"] = MongoPortable;
    }
} catch(e) { /* window not found -> not a browser environment */ }

export { MongoPortable };