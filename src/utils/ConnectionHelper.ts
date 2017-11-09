import { JSWLogger } from "jsw-logger";
import * as _ from "lodash";

import { MongoPortable } from "../core/index";

export interface IConnection {
	name: string;
	id: any;
	instance: MongoPortable;
}

export class ConnectionHelper {
	// private _pool: Array<{name: string, id: any, instance: MongoPortable}>;
	private _pool: IConnection[] = [];

	constructor() {
		// Do nothing
	}

	public addConnection(name: string, id: any, instance: MongoPortable) {
		if (!this.hasConnection(name)) {
			this._pool.push(
				{
					name, id, instance
				} as IConnection
				// new Connection(name, id, instance)
			);
		}
	}

	public getConnection(name: string): IConnection {
		for (const conn of this._pool) {
			if (conn.name === name) {
				return conn;
			}
		}

		return null;
	}

	public dropConnection(name: string): boolean {
		for (const [i, conn] of this._pool.entries()) {
			if (conn.name === name) {
				this._pool.splice(i, 1);

				return true;
			}
		}

		return false;
	}

	public hasConnection(name: string): boolean {
		for (const conn of this._pool) {
			if (conn.name === name) {
				return true;
			}
		}

		return false;
	}

	/***
	 * Validates the database name
	 *
	 * @method MongoPortable#_validateDatabaseName
	 * @private
	 *
	 * @param {String} databaseName - The name of the database to validate
	 *
	 * @return {Boolean} "true" if the name is valid
	 */
	public validateDatabaseName(name: string): boolean {
		const logger = JSWLogger.instance;

		if (_.isNil(name) || !_.isString(name) || name.length === 0) {
			logger.throw("database name must be a non empty string");
		}

		const invalidChars = [" ", ".", "$", "/", "\\"];
		for (const invalidChar of invalidChars) {
			if (name.indexOf(invalidChar) !== -1) {
				logger.throw(`database names cannot contain the character "${invalidChar}"`);

				return false;
			}
		}

		return true;
	}
}
