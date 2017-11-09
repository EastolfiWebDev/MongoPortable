import * as Promise from "promise";

export interface IAbstractStore {
	createCollection(event): boolean | Promise<boolean>;

	insert(event): boolean | Promise<boolean>;

	save(event): object | Promise<object>;

	all(event): object | Promise<object>;

	find(event): object | Promise<object>;

	findOne(event): object | Promise<object>;

	update(event): boolean | Promise<boolean>;

	remove(event): boolean | Promise<boolean>;

	ensureIndex(event): object | Promise<object>;

	backup(event): object | Promise<object>;

	backups(event): object | Promise<object>;

	removeBackup(event): object | Promise<object>;

	restore(event): object | Promise<object>;
}
