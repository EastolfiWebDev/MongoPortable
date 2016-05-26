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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9FdmVudEVtaXR0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSSxTQUFTLFFBQVEsVUFBUixDQUFiO0lBQ0ksSUFBSSxRQUFRLFFBQVIsQ0FEUjs7QUFHQSxJQUFJLFNBQVMsSUFBYjs7SUFFTSxZO0FBQ0YsNEJBQWM7QUFBQTs7QUFDVixpQkFBUyxPQUFPLFFBQWhCO0FBQ0g7Ozs7NkJBRUksSSxFQUFNLEksRUFBTSxFLEVBQUksTSxFQUFRO0FBQ3pCLGdCQUFJLEVBQUUsS0FBRixDQUFRLElBQVIsS0FBaUIsQ0FBQyxFQUFFLFFBQUYsQ0FBVyxJQUFYLENBQXRCLEVBQXdDO0FBQ3BDLHNCQUFNLElBQUksS0FBSixDQUFVLGVBQVYsQ0FBTjtBQUNIOztBQUVELGdCQUFJLEVBQUUsS0FBRixDQUFRLElBQVIsQ0FBSixFQUFtQjtBQUNmLHVCQUFPLEVBQVA7QUFDQSxxQkFBSyxJQUFMO0FBQ0g7O0FBRUQsZ0JBQUksRUFBRSxLQUFGLENBQVEsRUFBUixDQUFKLEVBQWlCO0FBQ2IscUJBQUssSUFBTDtBQUNIOztBQUVELGdCQUFJLEVBQUUsVUFBRixDQUFhLElBQWIsQ0FBSixFQUF3QjtBQUNwQixxQkFBSyxJQUFMO0FBQ0EsdUJBQU8sRUFBUDtBQUNIOztBQUVELGdCQUFJLENBQUMsRUFBRSxLQUFGLENBQVEsTUFBUixDQUFELElBQW9CLEVBQUUsT0FBRixDQUFVLE1BQVYsQ0FBeEIsRUFBMkM7QUFDdkMscUJBQUssT0FBTCxHQUFlLE1BQWY7QUFDSDs7QUFFRCxnQkFBSSxVQUFVLElBQWQ7O0FBRUEsbUJBQU8sSUFBUCxDQUFZLDBCQUEwQixJQUF0QztBQUNBLG1CQUFPLEtBQVAsQ0FBYSxJQUFiOzs7QUFHQSxjQUFFLE9BQUYsQ0FBVSxLQUFLLE9BQWYsRUFBd0IsVUFBVSxFQUFWLEVBQWM7QUFDbEMsb0JBQUksRUFBRSxVQUFGLENBQWEsR0FBRyxPQUFILENBQWIsQ0FBSixFQUErQjtBQUMzQix1QkFBRyxPQUFILEVBQVksSUFBWixFQUFrQixFQUFsQjtBQUNILGlCQUZELE1BRU8sSUFBSSxFQUFFLFVBQUYsQ0FBYSxHQUFHLEdBQWhCLENBQUosRUFBMEI7QUFDN0IseUJBQUssSUFBTCxHQUFZLElBQVo7QUFDQSx1QkFBRyxHQUFILENBQU8sSUFBUCxFQUFhLEVBQWI7QUFDSDtBQUNKLGFBUEQ7QUFRSDs7Ozs7O0FBR0wsT0FBTyxPQUFQLEdBQWlCLFlBQWpCIiwiZmlsZSI6IkV2ZW50RW1pdHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBMb2dnZXIgPSByZXF1aXJlKFwiLi9Mb2dnZXJcIiksXG4gICAgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIik7XG4gICAgXG52YXIgbG9nZ2VyID0gbnVsbDtcblxuY2xhc3MgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgIH1cbiAgICBcbiAgICBlbWl0KG5hbWUsIGFyZ3MsIGNiLCBzdG9yZXMpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwobmFtZSkgfHwgIV8uaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIG9uIG5hbWVcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGFyZ3MpKSB7XG4gICAgICAgICAgICBhcmdzID0ge307XG4gICAgICAgICAgICBjYiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChfLmlzTmlsKGNiKSkge1xuICAgICAgICAgICAgY2IgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGFyZ3MpKSB7XG4gICAgICAgICAgICBjYiA9IGFyZ3M7XG4gICAgICAgICAgICBhcmdzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghXy5pc05pbChzdG9yZXMpICYmIF8uaXNBcnJheShzdG9yZXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9zdG9yZXMgPSBzdG9yZXM7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBjb21tYW5kID0gbmFtZTtcbiAgICBcbiAgICAgICAgbG9nZ2VyLmluZm8oJ0VtaXR0aW5nIHN0b3JlIGV2ZW50ICcgKyBuYW1lKTtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKGFyZ3MpO1xuICAgIFxuICAgICAgICAvLyBTZW5kIGV2ZW50IHRvIGFsbCB0aGUgc3RvcmVzIHJlZ2lzdGVyZWRcbiAgICAgICAgXy5mb3JFYWNoKHRoaXMuX3N0b3JlcywgZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGZuW2NvbW1hbmRdKSkge1xuICAgICAgICAgICAgICAgIGZuW2NvbW1hbmRdKGFyZ3MsIGNiKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKGZuLmFsbCkpIHtcbiAgICAgICAgICAgICAgICBhcmdzLm5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgICAgIGZuLmFsbChhcmdzLCBjYik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7Il19
