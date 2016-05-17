"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Logger = require("./Logger"),
    _ = require("lodash");

var EventEmitter = function () {
    function EventEmitter() {
        _classCallCheck(this, EventEmitter);
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

            Logger.info('Emitting store event ' + name);
            Logger.debug(args);

            // Send event to all the stores registered
            _.forEach(this._stores, function (fn) {
                if (_.isFunction(fn[command])) {
                    fn[command](args, cb);
                } else if (_.isFunction(fn.all)) {
                    args.name = name;
                    fn.all(args, cb);
                }
            });
        }
    }]);

    return EventEmitter;
}();

module.exports = EventEmitter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9FdmVudEVtaXR0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSSxTQUFTLFFBQVEsVUFBUixDQUFiO0lBQ0ksSUFBSSxRQUFRLFFBQVIsQ0FEUjs7SUFHTSxZO0FBQ0YsNEJBQWM7QUFBQTtBQUViOzs7OzZCQUVJLEksRUFBTSxJLEVBQU0sRSxFQUFJLE0sRUFBUTtBQUN6QixnQkFBSSxFQUFFLEtBQUYsQ0FBUSxJQUFSLEtBQWlCLENBQUMsRUFBRSxRQUFGLENBQVcsSUFBWCxDQUF0QixFQUF3QztBQUNwQyxzQkFBTSxJQUFJLEtBQUosQ0FBVSxlQUFWLENBQU47QUFDSDs7QUFFRCxnQkFBSSxFQUFFLEtBQUYsQ0FBUSxJQUFSLENBQUosRUFBbUI7QUFDZix1QkFBTyxFQUFQO0FBQ0EscUJBQUssSUFBTDtBQUNIOztBQUVELGdCQUFJLEVBQUUsS0FBRixDQUFRLEVBQVIsQ0FBSixFQUFpQjtBQUNiLHFCQUFLLElBQUw7QUFDSDs7QUFFRCxnQkFBSSxFQUFFLFVBQUYsQ0FBYSxJQUFiLENBQUosRUFBd0I7QUFDcEIscUJBQUssSUFBTDtBQUNBLHVCQUFPLEVBQVA7QUFDSDs7QUFFRCxnQkFBSSxDQUFDLEVBQUUsS0FBRixDQUFRLE1BQVIsQ0FBRCxJQUFvQixFQUFFLE9BQUYsQ0FBVSxNQUFWLENBQXhCLEVBQTJDO0FBQ3ZDLHFCQUFLLE9BQUwsR0FBZSxNQUFmO0FBQ0g7O0FBRUQsZ0JBQUksVUFBVSxJQUFkOztBQUVBLG1CQUFPLElBQVAsQ0FBWSwwQkFBMEIsSUFBdEM7QUFDQSxtQkFBTyxLQUFQLENBQWEsSUFBYjs7O0FBR0EsY0FBRSxPQUFGLENBQVUsS0FBSyxPQUFmLEVBQXdCLFVBQVUsRUFBVixFQUFjO0FBQ2xDLG9CQUFJLEVBQUUsVUFBRixDQUFhLEdBQUcsT0FBSCxDQUFiLENBQUosRUFBK0I7QUFDM0IsdUJBQUcsT0FBSCxFQUFZLElBQVosRUFBa0IsRUFBbEI7QUFDSCxpQkFGRCxNQUVPLElBQUksRUFBRSxVQUFGLENBQWEsR0FBRyxHQUFoQixDQUFKLEVBQTBCO0FBQzdCLHlCQUFLLElBQUwsR0FBWSxJQUFaO0FBQ0EsdUJBQUcsR0FBSCxDQUFPLElBQVAsRUFBYSxFQUFiO0FBQ0g7QUFDSixhQVBEO0FBUUg7Ozs7OztBQUdMLE9BQU8sT0FBUCxHQUFpQixZQUFqQiIsImZpbGUiOiJFdmVudEVtaXR0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgTG9nZ2VyID0gcmVxdWlyZShcIi4vTG9nZ2VyXCIpLFxuICAgIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpO1xuICAgIFxuY2xhc3MgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgXG4gICAgfVxuICAgIFxuICAgIGVtaXQobmFtZSwgYXJncywgY2IsIHN0b3Jlcykge1xuICAgICAgICBpZiAoXy5pc05pbChuYW1lKSB8fCAhXy5pc1N0cmluZyhuYW1lKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3Igb24gbmFtZVwiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoYXJncykpIHtcbiAgICAgICAgICAgIGFyZ3MgPSB7fTtcbiAgICAgICAgICAgIGNiID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNOaWwoY2IpKSB7XG4gICAgICAgICAgICBjYiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24oYXJncykpIHtcbiAgICAgICAgICAgIGNiID0gYXJncztcbiAgICAgICAgICAgIGFyZ3MgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFfLmlzTmlsKHN0b3JlcykgJiYgXy5pc0FycmF5KHN0b3JlcykpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JlcyA9IHN0b3JlcztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGNvbW1hbmQgPSBuYW1lO1xuICAgIFxuICAgICAgICBMb2dnZXIuaW5mbygnRW1pdHRpbmcgc3RvcmUgZXZlbnQgJyArIG5hbWUpO1xuICAgICAgICBMb2dnZXIuZGVidWcoYXJncyk7XG4gICAgXG4gICAgICAgIC8vIFNlbmQgZXZlbnQgdG8gYWxsIHRoZSBzdG9yZXMgcmVnaXN0ZXJlZFxuICAgICAgICBfLmZvckVhY2godGhpcy5fc3RvcmVzLCBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24oZm5bY29tbWFuZF0pKSB7XG4gICAgICAgICAgICAgICAgZm5bY29tbWFuZF0oYXJncywgY2IpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24oZm4uYWxsKSkge1xuICAgICAgICAgICAgICAgIGFyZ3MubmFtZSA9IG5hbWU7XG4gICAgICAgICAgICAgICAgZm4uYWxsKGFyZ3MsIGNiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjsiXX0=
