import * as _ 				from "lodash";
import { JSWLogger } 		from "jsw-logger";

import { MongoPortable } 	from "../core/index";

export class Connection {
	name: string;
	id: any;
	instance: MongoPortable;
	
	constructor(pName: string, pId: any, pInstance: MongoPortable) {
		this.name = pName;
		this.id = pId;
		this.instance = pInstance;
	}
}

export class ConnectionHelper {
    // private _pool: Array<{name: string, id: any, instance: MongoPortable}>;
	private _pool: Array<Connection> = [];
    
    constructor() { }
    
    addConnection(name: string, id:any, instance: MongoPortable) {
        if (!this.hasConnection(name)) {
            this._pool.push(new Connection(name, id, instance));
        }
    }
    
    getConnection(name: string): Connection {
        for (let conn of this._pool) {
            if (conn.name === name) {
                return conn;
            }
        }
        
        return null;
    }
    
    dropConnection(name: string): boolean {
		for (let [i, conn] of this._pool.entries()) {
            if (conn.name === name) {
                this._pool.splice(i, 1);
                
                return true;
            }
        }
        
        return false;
    }
    
    hasConnection(name: string): boolean {
		for (let conn of this._pool) {
            if (conn.name === name) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Validates the database name
     * 
     * @method MongoPortable#_validateDatabaseName
     * @private
     * 
     * @param {String} databaseName - The name of the database to validate
     * 
     * @return {Boolean} "true" if the name is valid
     */
    validateDatabaseName(name: string): boolean {
        let logger = JSWLogger.instance;
        
        if (!_.isString(name)) logger.throw("database name must be a string");
    
        if (name.length === 0) logger.throw("database name cannot be the empty string");
    
        let invalidChars = [" ", ".", "$", "/", "\\"];
        for(let i = 0; i < invalidChars.length; i++) {
            if(name.indexOf(invalidChars[i]) != -1) {
                logger.throw(`database names cannot contain the character "${invalidChars[i]}"`);
				
				return false;
            }
        }
        
        return true;
    }
}