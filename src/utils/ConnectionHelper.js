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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var jsw_logger_1 = require("jsw-logger");
var Connection = (function () {
    function Connection(pName, pId, pInstance) {
        this.name = pName;
        this.id = pId;
        this.instance = pInstance;
    }
    return Connection;
}());
exports.Connection = Connection;
var ConnectionHelper = (function () {
    function ConnectionHelper() {
        // private _pool: Array<{name: string, id: any, instance: MongoPortable}>;
        this._pool = [];
    }
    ConnectionHelper.prototype.addConnection = function (name, id, instance) {
        if (!this.hasConnection(name)) {
            this._pool.push(new Connection(name, id, instance));
        }
    };
    ConnectionHelper.prototype.getConnection = function (name) {
        try {
            for (var _a = __values(this._pool), _b = _a.next(); !_b.done; _b = _a.next()) {
                var conn = _b.value;
                if (conn.name === name) {
                    return conn;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return null;
        var e_1, _c;
    };
    ConnectionHelper.prototype.dropConnection = function (name) {
        try {
            for (var _a = __values(this._pool.entries()), _b = _a.next(); !_b.done; _b = _a.next()) {
                var _c = __read(_b.value, 2), i = _c[0], conn = _c[1];
                if (conn.name === name) {
                    this._pool.splice(i, 1);
                    return true;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return false;
        var e_2, _d;
    };
    ConnectionHelper.prototype.hasConnection = function (name) {
        try {
            for (var _a = __values(this._pool), _b = _a.next(); !_b.done; _b = _a.next()) {
                var conn = _b.value;
                if (conn.name === name) {
                    return true;
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return false;
        var e_3, _c;
    };
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
    ConnectionHelper.prototype.validateDatabaseName = function (name) {
        var logger = jsw_logger_1.JSWLogger.instance;
        if (_.isNil(name) || !_.isString(name) || name.length === 0) {
            logger.throw("database name must be a non empty string");
        }
        var invalidChars = [" ", ".", "$", "/", "\\"];
        for (var i = 0; i < invalidChars.length; i++) {
            if (name.indexOf(invalidChars[i]) != -1) {
                logger.throw("database names cannot contain the character \"" + invalidChars[i] + "\"");
                return false;
            }
        }
        return true;
    };
    return ConnectionHelper;
}());
exports.ConnectionHelper = ConnectionHelper;
//# sourceMappingURL=ConnectionHelper.js.map