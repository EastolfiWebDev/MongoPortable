"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var jsw_logger_1 = require("jsw-logger");
var EventEmitter = /** @class */ (function () {
    function EventEmitter(options) {
        this.logger = jsw_logger_1.JSWLogger.getInstance(options.log || {});
    }
    EventEmitter.prototype.emit = function (event, args, stores) {
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
        // Send event to all the stores registered
        _.forEach(stores, function (store) {
            if (_.isFunction(store[event])) {
                store[event](args);
            }
        });
    };
    return EventEmitter;
}());
exports.EventEmitter = EventEmitter;
//# sourceMappingURL=EventEmitter.js.map