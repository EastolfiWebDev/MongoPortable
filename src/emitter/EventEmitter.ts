import * as _           from "lodash";
import * as Promise     from "promise";
import { JSWLogger }    from "jsw-logger";

export class EventEmitter {
    protected logger: JSWLogger;
    options: any = {
        log: {}
    };
    
    constructor(options: any = {}) {
		
		this.options.autoRejectTimeout = options.autoRejectTimeout || 60000;
		
        this.logger = JSWLogger.getInstance(this.options.log);
    }
    
    emit(event:string, args:Object, stores: Array<Object|Function> = []): Promise<void> {
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
    
        let storesToEmit = stores.length;
        
        return new Promise((resolve, reject) => {
            if (stores.length === 0) resolve();
            
            let storesEmitted = 0;
            
            // add to options
            let timeout = setTimeout(() => {
                reject();
            }, this.options.autoRejectTimeout);
            
            // Send event to all the stores registered
            for (let store of stores) {
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
                    });
                }
            }
        });
    }
}