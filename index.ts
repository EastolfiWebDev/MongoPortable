import { MongoPortable } from "./src/MongoPortable";

try {
    if (window) {
        window["MongoPortable"] = MongoPortable;
    }
} catch(e) { /* window not found -> not a browser environment */ }

export { MongoPortable };