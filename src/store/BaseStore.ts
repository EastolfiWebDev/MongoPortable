import * as Promise from "promise";

import { IAbstractStore } from "./IAbstractStore";

export class BaseStore implements IAbstractStore {
	public createCollection(event): boolean | Promise<boolean> {
		return Promise.resolve(true);
	}

	public insert(event): boolean | Promise<boolean> {
		return Promise.resolve(true);
	}

	public save(event): object | Promise<object> {
		return Promise.resolve({});
	}

	public all(event): object | Promise<object> {
		return Promise.resolve({});
	}

	public find(event): object | Promise<object> {
		return Promise.resolve({});
	}

	public findOne(event): object | Promise<object> {
		return Promise.resolve({});
	}

	public update(event): boolean | Promise<boolean> {
		return Promise.resolve(true);
	}

	public remove(event): boolean | Promise<boolean> {
		return Promise.resolve(true);
	}

	public ensureIndex(event): object | Promise<object> {
		return Promise.resolve({});
	}

	public backup(event): object | Promise<object> {
		return Promise.resolve({});
	}

	public backups(event): object | Promise<object> {
		return Promise.resolve({});
	}

	public removeBackup(event): object | Promise<object> {
		return Promise.resolve({});
	}

	public restore(event): object | Promise<object> {
		return Promise.resolve({});
	}
}
