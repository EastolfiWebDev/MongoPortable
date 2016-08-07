"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var logger = null;

module.exports = function (Logger, _) {
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

    return EventEmitter;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9FdmVudEVtaXR0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSSxTQUFTLElBQWI7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLFVBQVMsTUFBVCxFQUFpQixDQUFqQixFQUFvQjtBQUFBLFFBRTNCLFlBRjJCO0FBRzdCLGdDQUFjO0FBQUE7O0FBQ1YscUJBQVMsT0FBTyxRQUFoQjtBQUNIOztBQUw0QjtBQUFBO0FBQUEsaUNBT3hCLElBUHdCLEVBT2xCLElBUGtCLEVBT1osRUFQWSxFQU9SLE1BUFEsRUFPQTtBQUN6QixvQkFBSSxFQUFFLEtBQUYsQ0FBUSxJQUFSLEtBQWlCLENBQUMsRUFBRSxRQUFGLENBQVcsSUFBWCxDQUF0QixFQUF3QztBQUNwQywwQkFBTSxJQUFJLEtBQUosQ0FBVSxlQUFWLENBQU47QUFDSDs7QUFFRCxvQkFBSSxFQUFFLEtBQUYsQ0FBUSxJQUFSLENBQUosRUFBbUI7QUFDZiwyQkFBTyxFQUFQO0FBQ0EseUJBQUssSUFBTDtBQUNIOztBQUVELG9CQUFJLEVBQUUsS0FBRixDQUFRLEVBQVIsQ0FBSixFQUFpQjtBQUNiLHlCQUFLLElBQUw7QUFDSDs7QUFFRCxvQkFBSSxFQUFFLFVBQUYsQ0FBYSxJQUFiLENBQUosRUFBd0I7QUFDcEIseUJBQUssSUFBTDtBQUNBLDJCQUFPLEVBQVA7QUFDSDs7QUFFRCxvQkFBSSxDQUFDLEVBQUUsS0FBRixDQUFRLE1BQVIsQ0FBRCxJQUFvQixFQUFFLE9BQUYsQ0FBVSxNQUFWLENBQXhCLEVBQTJDO0FBQ3ZDLHlCQUFLLE9BQUwsR0FBZSxNQUFmO0FBQ0g7O0FBRUQsb0JBQUksVUFBVSxJQUFkOztBQUVBLHVCQUFPLElBQVAsQ0FBWSwwQkFBMEIsSUFBdEM7QUFDQSx1QkFBTyxLQUFQLENBQWEsSUFBYjs7O0FBR0Esa0JBQUUsT0FBRixDQUFVLEtBQUssT0FBZixFQUF3QixVQUFVLEVBQVYsRUFBYztBQUNsQyx3QkFBSSxFQUFFLFVBQUYsQ0FBYSxHQUFHLE9BQUgsQ0FBYixDQUFKLEVBQStCO0FBQzNCLDJCQUFHLE9BQUgsRUFBWSxJQUFaLEVBQWtCLEVBQWxCO0FBQ0g7QUFDSixpQkFKRDtBQUtIO0FBekM0Qjs7QUFBQTtBQUFBOztBQTRDakMsV0FBTyxZQUFQO0FBQ0gsQ0E3Q0QiLCJmaWxlIjoiRXZlbnRFbWl0dGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGxvZ2dlciA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oTG9nZ2VyLCBfKSB7XG4gICAgXG4gICAgY2xhc3MgRXZlbnRFbWl0dGVyIHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICBsb2dnZXIgPSBMb2dnZXIuaW5zdGFuY2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGVtaXQobmFtZSwgYXJncywgY2IsIHN0b3Jlcykge1xuICAgICAgICAgICAgaWYgKF8uaXNOaWwobmFtZSkgfHwgIV8uaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciBvbiBuYW1lXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc05pbChhcmdzKSkge1xuICAgICAgICAgICAgICAgIGFyZ3MgPSB7fTtcbiAgICAgICAgICAgICAgICBjYiA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKGNiKSkge1xuICAgICAgICAgICAgICAgIGNiID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihhcmdzKSkge1xuICAgICAgICAgICAgICAgIGNiID0gYXJncztcbiAgICAgICAgICAgICAgICBhcmdzID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghXy5pc05pbChzdG9yZXMpICYmIF8uaXNBcnJheShzdG9yZXMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RvcmVzID0gc3RvcmVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY29tbWFuZCA9IG5hbWU7XG4gICAgICAgIFxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ0VtaXR0aW5nIHN0b3JlIGV2ZW50ICcgKyBuYW1lKTtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZyhhcmdzKTtcbiAgICAgICAgXG4gICAgICAgICAgICAvLyBTZW5kIGV2ZW50IHRvIGFsbCB0aGUgc3RvcmVzIHJlZ2lzdGVyZWRcbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLl9zdG9yZXMsIGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24oZm5bY29tbWFuZF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGZuW2NvbW1hbmRdKGFyZ3MsIGNiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gRXZlbnRFbWl0dGVyO1xufTsiXX0=
