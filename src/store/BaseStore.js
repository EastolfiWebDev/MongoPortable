"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Promise = require("promise");
var BaseStore = /** @class */ (function () {
    function BaseStore() {
    }
    BaseStore.prototype.createCollection = function (event) {
        return Promise.resolve(true);
    };
    BaseStore.prototype.insert = function (event) {
        return Promise.resolve(true);
    };
    BaseStore.prototype.save = function (event) {
        return Promise.resolve({});
    };
    BaseStore.prototype.all = function (event) {
        return Promise.resolve({});
    };
    BaseStore.prototype.find = function (event) {
        return Promise.resolve({});
    };
    BaseStore.prototype.findOne = function (event) {
        return Promise.resolve({});
    };
    BaseStore.prototype.update = function (event) {
        return Promise.resolve(true);
    };
    BaseStore.prototype.remove = function (event) {
        return Promise.resolve(true);
    };
    BaseStore.prototype.ensureIndex = function (event) {
        return Promise.resolve({});
    };
    BaseStore.prototype.backup = function (event) {
        return Promise.resolve({});
    };
    BaseStore.prototype.backups = function (event) {
        return Promise.resolve({});
    };
    BaseStore.prototype.removeBackup = function (event) {
        return Promise.resolve({});
    };
    BaseStore.prototype.restore = function (event) {
        return Promise.resolve({});
    };
    return BaseStore;
}());
exports.BaseStore = BaseStore;
//# sourceMappingURL=BaseStore.js.map