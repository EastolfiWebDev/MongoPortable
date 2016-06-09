"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Logger = require("jsw-logger"),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9FdmVudEVtaXR0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSSxTQUFTLFFBQVEsWUFBUixDQUFiO0lBQ0ksSUFBSSxRQUFRLFFBQVIsQ0FEUjs7QUFHQSxJQUFJLFNBQVMsSUFBYjs7SUFFTSxZO0FBQ0YsNEJBQWM7QUFBQTs7QUFDVixpQkFBUyxPQUFPLFFBQWhCO0FBQ0g7Ozs7NkJBRUksSSxFQUFNLEksRUFBTSxFLEVBQUksTSxFQUFRO0FBQ3pCLGdCQUFJLEVBQUUsS0FBRixDQUFRLElBQVIsS0FBaUIsQ0FBQyxFQUFFLFFBQUYsQ0FBVyxJQUFYLENBQXRCLEVBQXdDO0FBQ3BDLHNCQUFNLElBQUksS0FBSixDQUFVLGVBQVYsQ0FBTjtBQUNIOztBQUVELGdCQUFJLEVBQUUsS0FBRixDQUFRLElBQVIsQ0FBSixFQUFtQjtBQUNmLHVCQUFPLEVBQVA7QUFDQSxxQkFBSyxJQUFMO0FBQ0g7O0FBRUQsZ0JBQUksRUFBRSxLQUFGLENBQVEsRUFBUixDQUFKLEVBQWlCO0FBQ2IscUJBQUssSUFBTDtBQUNIOztBQUVELGdCQUFJLEVBQUUsVUFBRixDQUFhLElBQWIsQ0FBSixFQUF3QjtBQUNwQixxQkFBSyxJQUFMO0FBQ0EsdUJBQU8sRUFBUDtBQUNIOztBQUVELGdCQUFJLENBQUMsRUFBRSxLQUFGLENBQVEsTUFBUixDQUFELElBQW9CLEVBQUUsT0FBRixDQUFVLE1BQVYsQ0FBeEIsRUFBMkM7QUFDdkMscUJBQUssT0FBTCxHQUFlLE1BQWY7QUFDSDs7QUFFRCxnQkFBSSxVQUFVLElBQWQ7O0FBRUEsbUJBQU8sSUFBUCxDQUFZLDBCQUEwQixJQUF0QztBQUNBLG1CQUFPLEtBQVAsQ0FBYSxJQUFiOzs7QUFHQSxjQUFFLE9BQUYsQ0FBVSxLQUFLLE9BQWYsRUFBd0IsVUFBVSxFQUFWLEVBQWM7QUFDbEMsb0JBQUksRUFBRSxVQUFGLENBQWEsR0FBRyxPQUFILENBQWIsQ0FBSixFQUErQjtBQUMzQix1QkFBRyxPQUFILEVBQVksSUFBWixFQUFrQixFQUFsQjtBQUNIO0FBQ0osYUFKRDtBQUtIOzs7Ozs7QUFHTCxPQUFPLE9BQVAsR0FBaUIsWUFBakIiLCJmaWxlIjoiRXZlbnRFbWl0dGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIExvZ2dlciA9IHJlcXVpcmUoXCJqc3ctbG9nZ2VyXCIpLFxuICAgIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpO1xuICAgIFxudmFyIGxvZ2dlciA9IG51bGw7XG5cbmNsYXNzIEV2ZW50RW1pdHRlciB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIGxvZ2dlciA9IExvZ2dlci5pbnN0YW5jZTtcbiAgICB9XG4gICAgXG4gICAgZW1pdChuYW1lLCBhcmdzLCBjYiwgc3RvcmVzKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKG5hbWUpIHx8ICFfLmlzU3RyaW5nKG5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciBvbiBuYW1lXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChhcmdzKSkge1xuICAgICAgICAgICAgYXJncyA9IHt9O1xuICAgICAgICAgICAgY2IgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc05pbChjYikpIHtcbiAgICAgICAgICAgIGNiID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihhcmdzKSkge1xuICAgICAgICAgICAgY2IgPSBhcmdzO1xuICAgICAgICAgICAgYXJncyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIV8uaXNOaWwoc3RvcmVzKSAmJiBfLmlzQXJyYXkoc3RvcmVzKSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmVzID0gc3RvcmVzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgY29tbWFuZCA9IG5hbWU7XG4gICAgXG4gICAgICAgIGxvZ2dlci5pbmZvKCdFbWl0dGluZyBzdG9yZSBldmVudCAnICsgbmFtZSk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhhcmdzKTtcbiAgICBcbiAgICAgICAgLy8gU2VuZCBldmVudCB0byBhbGwgdGhlIHN0b3JlcyByZWdpc3RlcmVkXG4gICAgICAgIF8uZm9yRWFjaCh0aGlzLl9zdG9yZXMsIGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihmbltjb21tYW5kXSkpIHtcbiAgICAgICAgICAgICAgICBmbltjb21tYW5kXShhcmdzLCBjYik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7Il19
