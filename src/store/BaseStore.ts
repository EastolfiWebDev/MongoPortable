import * as Promise from "promise";

import { IAbstractStore } from "./IAbstractStore";

export class BaseStore implements IAbstractStore {
	createCollection(event): boolean | Promise<boolean> {
		return Promise.resolve(true);
	}
	
    insert(event): boolean | Promise<boolean> {
		return Promise.resolve(true);
	}
    
    save(event): object | Promise<object> {
		return Promise.resolve({});
	}

    all(event): object | Promise<object> {
		return Promise.resolve({});
	}
    
    find(event): object | Promise<object> {
		return Promise.resolve({});
	}
    
    findOne(event): object | Promise<object> {
		return Promise.resolve({});
	}
    
    update(event): boolean | Promise<boolean> {
		return Promise.resolve(true);
	}
    
    remove(event): boolean | Promise<boolean> {
		return Promise.resolve(true);
	}
    
    ensureIndex(event): object | Promise<object> {
		return Promise.resolve({});
	}
    
    backup(event): object | Promise<object> {
		return Promise.resolve({});
	}
    
    backups(event): object | Promise<object> {
		return Promise.resolve({});
	}
    
    removeBackup(event): object | Promise<object> {
		return Promise.resolve({});
	}
    
    restore(event): object | Promise<object> {
		return Promise.resolve({});
	}
}