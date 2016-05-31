"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Logger = require("./Logger"),
    _ = require("lodash");

var logger = null;

var EventEmitter = function () {
    function EventEmitter() {
        _classCallCheck(this, EventEmitter);

        logger = Logger.instance;
    }

    _createClass(EventEmitter, [{
        key: "emit",
        value: function emit(name, args, cb, stores) {
            if (_.isNil(name) || !_.isString(name)) {
                throw new Error("Error on name");
            }

            if (_.isNil(args)) {
                args = {};
                cb = null;
            }

            if (_.isNil(cb)) {
                cb = null;
            }

            if (_.isFunction(args)) {
                cb = args;
                args = {};
            }

            if (!_.isNil(stores) && _.isArray(stores)) {
                this._stores = stores;
            }

            var command = name;

            logger.info('Emitting store event ' + name);
            logger.debug(args);

            // Send event to all the stores registered
            _.forEach(this._stores, function (fn) {
                if (_.isFunction(fn[command])) {
                    fn[command](args, cb);
                }
            });
        }
    }]);

    return EventEmitter;
}();

module.exports = EventEmitter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9FdmVudEVtaXR0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSSxTQUFTLFFBQVEsVUFBUixDQUFiO0lBQ0ksSUFBSSxRQUFRLFFBQVIsQ0FEUjs7QUFHQSxJQUFJLFNBQVMsSUFBYjs7SUFFTSxZO0FBQ0YsNEJBQWM7QUFBQTs7QUFDVixpQkFBUyxPQUFPLFFBQWhCO0FBQ0g7Ozs7NkJBRUksSSxFQUFNLEksRUFBTSxFLEVBQUksTSxFQUFRO0FBQ3pCLGdCQUFJLEVBQUUsS0FBRixDQUFRLElBQVIsS0FBaUIsQ0FBQyxFQUFFLFFBQUYsQ0FBVyxJQUFYLENBQXRCLEVBQXdDO0FBQ3BDLHNCQUFNLElBQUksS0FBSixDQUFVLGVBQVYsQ0FBTjtBQUNIOztBQUVELGdCQUFJLEVBQUUsS0FBRixDQUFRLElBQVIsQ0FBSixFQUFtQjtBQUNmLHVCQUFPLEVBQVA7QUFDQSxxQkFBSyxJQUFMO0FBQ0g7O0FBRUQsZ0JBQUksRUFBRSxLQUFGLENBQVEsRUFBUixDQUFKLEVBQWlCO0FBQ2IscUJBQUssSUFBTDtBQUNIOztBQUVELGdCQUFJLEVBQUUsVUFBRixDQUFhLElBQWIsQ0FBSixFQUF3QjtBQUNwQixxQkFBSyxJQUFMO0FBQ0EsdUJBQU8sRUFBUDtBQUNIOztBQUVELGdCQUFJLENBQUMsRUFBRSxLQUFGLENBQVEsTUFBUixDQUFELElBQW9CLEVBQUUsT0FBRixDQUFVLE1BQVYsQ0FBeEIsRUFBMkM7QUFDdkMscUJBQUssT0FBTCxHQUFlLE1BQWY7QUFDSDs7QUFFRCxnQkFBSSxVQUFVLElBQWQ7O0FBRUEsbUJBQU8sSUFBUCxDQUFZLDBCQUEwQixJQUF0QztBQUNBLG1CQUFPLEtBQVAsQ0FBYSxJQUFiOzs7QUFHQSxjQUFFLE9BQUYsQ0FBVSxLQUFLLE9BQWYsRUFBd0IsVUFBVSxFQUFWLEVBQWM7QUFDbEMsb0JBQUksRUFBRSxVQUFGLENBQWEsR0FBRyxPQUFILENBQWIsQ0FBSixFQUErQjtBQUMzQix1QkFBRyxPQUFILEVBQVksSUFBWixFQUFrQixFQUFsQjtBQUNIO0FBQ0osYUFKRDtBQUtIOzs7Ozs7QUFHTCxPQUFPLE9BQVAsR0FBaUIsWUFBakIiLCJmaWxlIjoiRXZlbnRFbWl0dGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIExvZ2dlciA9IHJlcXVpcmUoXCIuL0xvZ2dlclwiKSxcbiAgICBfID0gcmVxdWlyZShcImxvZGFzaFwiKTtcbiAgICBcbnZhciBsb2dnZXIgPSBudWxsO1xuXG5jbGFzcyBFdmVudEVtaXR0ZXIge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgfVxuICAgIFxuICAgIGVtaXQobmFtZSwgYXJncywgY2IsIHN0b3Jlcykge1xuICAgICAgICBpZiAoXy5pc05pbChuYW1lKSB8fCAhXy5pc1N0cmluZyhuYW1lKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3Igb24gbmFtZVwiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoYXJncykpIHtcbiAgICAgICAgICAgIGFyZ3MgPSB7fTtcbiAgICAgICAgICAgIGNiID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoY2IpKSB7XG4gICAgICAgICAgICBjYiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24oYXJncykpIHtcbiAgICAgICAgICAgIGNiID0gYXJncztcbiAgICAgICAgICAgIGFyZ3MgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzTmlsKHN0b3JlcykgJiYgXy5pc0FycmF5KHN0b3JlcykpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JlcyA9IHN0b3JlcztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGNvbW1hbmQgPSBuYW1lO1xuICAgIFxuICAgICAgICBsb2dnZXIuaW5mbygnRW1pdHRpbmcgc3RvcmUgZXZlbnQgJyArIG5hbWUpO1xuICAgICAgICBsb2dnZXIuZGVidWcoYXJncyk7XG4gICAgXG4gICAgICAgIC8vIFNlbmQgZXZlbnQgdG8gYWxsIHRoZSBzdG9yZXMgcmVnaXN0ZXJlZFxuICAgICAgICBfLmZvckVhY2godGhpcy5fc3RvcmVzLCBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24oZm5bY29tbWFuZF0pKSB7XG4gICAgICAgICAgICAgICAgZm5bY29tbWFuZF0oYXJncywgY2IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyOyJdfQ==
