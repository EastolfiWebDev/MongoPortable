import { MongoPortable } from "./src/core";
import { BaseStore } from "./src/store"

try {
	if (window) {
		window["MongoPortable"] = MongoPortable;
	}
} catch (e) { /* window not found -> not a browser environment */ }

export { MongoPortable, BaseStore };
