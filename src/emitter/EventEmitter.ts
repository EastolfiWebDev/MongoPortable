import * as _           from "lodash";
import { JSWLogger }    from "jsw-logger";

import { Options }      from "../core";

export class EventEmitter {
    protected logger: JSWLogger;
    
    constructor(options: Options) {
		options = options || new Options();
		
        this.logger = JSWLogger.getInstance(options.log || {});
    }
    
    emit(event:string, args:Object, stores: Array<Object|Function>) {
        if (_.isNil(event) || !_.isString(event)) {
            throw new Error("Parameter \"event\" must be an string");
        }
        
        if (_.isNil(args)) {
            args = {};
            stores = [];
        }
        
        if (_.isArray(args)) {
            stores = <Array<Object>>args;
            args = {};
        }
        
        this.logger.info(`Emitting store event "${event}"`);
        this.logger.debug(JSON.stringify(args));
    
        // Send event to all the stores registered
        _.forEach(stores, store => {
            if (_.isFunction(store[event])) {
                store[event](args);
            }
        });
    }
}