import * as _ from "lodash";
import * as Promise from "promise";

import { JSWLogger } from "jsw-logger";

export class EventEmitter {
	public options: any = {
		log: {}
	};

	protected logger: JSWLogger;

	constructor(options: any = {}) {

		this.options.autoRejectTimeout = options.autoRejectTimeout || 60000;

		this.logger = JSWLogger.getInstance(this.options.log);
	}

	public emit(event: string, args: object, stores: Array<object | (() => object)> = []): Promise<void> {
		if (_.isNil(event) || !_.isString(event)) {
			throw new Error("Parameter \"event\" must be an string");
		}

		if (_.isNil(args)) {
			args = {};
			stores = [];
		}

		if (_.isArray(args)) {
			stores = args as object[];
			args = {};
		}

		this.logger.info(`Emitting store event "${event}"`);
		this.logger.debug(JSON.stringify(args));

		const storesToEmit = stores.length;

		return new Promise((resolve, reject) => {
			if (stores.length === 0) { resolve(); }

			let storesEmitted = 0;

			// add to options
			const timeout = setTimeout(() => {
				reject();
			}, this.options.autoRejectTimeout);

			// Send event to all the stores registered
			for (const store of stores) {
				// Watch out
				if (_.isFunction(store[event])) {

					store[event](args)
						.then(() => {
							storesEmitted++;

							// Watch out
							if (storesEmitted === storesToEmit) {
								clearTimeout(timeout);

								resolve();
							}
						}).catch((error) => {
							clearTimeout(timeout);

							reject(error);
						});
				} else {
					// Skip store call
					storesEmitted++;

					// Watch out
					if (storesEmitted === storesToEmit) {
						clearTimeout(timeout);

						resolve();
					}
				}
			}
		});
	}
}
