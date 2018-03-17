"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var Promise = require("promise");
var jsw_logger_1 = require("jsw-logger");
var EventEmitter = /** @class */ (function () {
    function EventEmitter(options) {
        if (options === void 0) { options = {}; }
        this.options = {
            log: {},
            autoRejectTimeout: 60000
        };
        this.options = Object.assign({}, this.options, options);
        this.logger = jsw_logger_1.JSWLogger.getInstance(this.options.log);
    }
    EventEmitter.prototype.emit = function (event, args, stores) {
        var _this = this;
        if (stores === void 0) { stores = []; }
        if (_.isNil(event) || !_.isString(event)) {
            throw new Error("Parameter \"event\" must be an string");
        }
        if (_.isNil(args)) {
            args = {};
            stores = [];
        }
        if (_.isArray(args)) {
            stores = args;
            args = {};
        }
        this.logger.info("Emitting store event \"" + event + "\"");
        this.logger.debug(JSON.stringify(args));
        var storesToEmit = stores.length;
        return new Promise(function (resolve, reject) {
            if (stores.length === 0) {
                resolve();
            }
            var storesEmitted = 0;
            // add to options
            var timeout = setTimeout(function () {
                reject();
            }, _this.options.autoRejectTimeout);
            try {
                // Send event to all the stores registered
                for (var stores_1 = __values(stores), stores_1_1 = stores_1.next(); !stores_1_1.done; stores_1_1 = stores_1.next()) {
                    var store = stores_1_1.value;
                    // Watch out
                    if (_.isFunction(store[event])) {
                        store[event](args)
                            .then(function () {
                            storesEmitted++;
                            // Watch out
                            if (storesEmitted === storesToEmit) {
                                clearTimeout(timeout);
                                resolve();
                            }
                        }).catch(function (error) {
                            clearTimeout(timeout);
                            reject(error);
                        });
                    }
                    else {
                        // Skip store call
                        storesEmitted++;
                        // Watch out
                        if (storesEmitted === storesToEmit) {
                            clearTimeout(timeout);
                            resolve();
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (stores_1_1 && !stores_1_1.done && (_a = stores_1.return)) _a.call(stores_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var e_1, _a;
        });
    };
    return EventEmitter;
}());
exports.EventEmitter = EventEmitter;
//# sourceMappingURL=EventEmitter.js.map