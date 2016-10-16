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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInV0aWxzL0V2ZW50RW1pdHRlci5qcyJdLCJuYW1lcyI6WyJsb2dnZXIiLCJtb2R1bGUiLCJleHBvcnRzIiwiTG9nZ2VyIiwiXyIsIkV2ZW50RW1pdHRlciIsImluc3RhbmNlIiwibmFtZSIsImFyZ3MiLCJjYiIsInN0b3JlcyIsImlzTmlsIiwiaXNTdHJpbmciLCJFcnJvciIsImlzRnVuY3Rpb24iLCJpc0FycmF5IiwiX3N0b3JlcyIsImNvbW1hbmQiLCJpbmZvIiwiZGVidWciLCJmb3JFYWNoIiwiZm4iXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLElBQUlBLFNBQVMsSUFBYjs7QUFFQUMsT0FBT0MsT0FBUCxHQUFpQixVQUFTQyxNQUFULEVBQWlCQyxDQUFqQixFQUFvQjtBQUFBLFFBRTNCQyxZQUYyQjtBQUc3QixnQ0FBYztBQUFBOztBQUNWTCxxQkFBU0csT0FBT0csUUFBaEI7QUFDSDs7QUFMNEI7QUFBQTtBQUFBLGlDQU94QkMsSUFQd0IsRUFPbEJDLElBUGtCLEVBT1pDLEVBUFksRUFPUkMsTUFQUSxFQU9BO0FBQ3pCLG9CQUFJTixFQUFFTyxLQUFGLENBQVFKLElBQVIsS0FBaUIsQ0FBQ0gsRUFBRVEsUUFBRixDQUFXTCxJQUFYLENBQXRCLEVBQXdDO0FBQ3BDLDBCQUFNLElBQUlNLEtBQUosQ0FBVSxlQUFWLENBQU47QUFDSDs7QUFFRCxvQkFBSVQsRUFBRU8sS0FBRixDQUFRSCxJQUFSLENBQUosRUFBbUI7QUFDZkEsMkJBQU8sRUFBUDtBQUNBQyx5QkFBSyxJQUFMO0FBQ0g7O0FBRUQsb0JBQUlMLEVBQUVPLEtBQUYsQ0FBUUYsRUFBUixDQUFKLEVBQWlCO0FBQ2JBLHlCQUFLLElBQUw7QUFDSDs7QUFFRCxvQkFBSUwsRUFBRVUsVUFBRixDQUFhTixJQUFiLENBQUosRUFBd0I7QUFDcEJDLHlCQUFLRCxJQUFMO0FBQ0FBLDJCQUFPLEVBQVA7QUFDSDs7QUFFRCxvQkFBSSxDQUFDSixFQUFFTyxLQUFGLENBQVFELE1BQVIsQ0FBRCxJQUFvQk4sRUFBRVcsT0FBRixDQUFVTCxNQUFWLENBQXhCLEVBQTJDO0FBQ3ZDLHlCQUFLTSxPQUFMLEdBQWVOLE1BQWY7QUFDSDs7QUFFRCxvQkFBSU8sVUFBVVYsSUFBZDs7QUFFQVAsdUJBQU9rQixJQUFQLENBQVksMEJBQTBCWCxJQUF0QztBQUNBUCx1QkFBT21CLEtBQVAsQ0FBYVgsSUFBYjs7QUFFQTtBQUNBSixrQkFBRWdCLE9BQUYsQ0FBVSxLQUFLSixPQUFmLEVBQXdCLFVBQVVLLEVBQVYsRUFBYztBQUNsQyx3QkFBSWpCLEVBQUVVLFVBQUYsQ0FBYU8sR0FBR0osT0FBSCxDQUFiLENBQUosRUFBK0I7QUFDM0JJLDJCQUFHSixPQUFILEVBQVlULElBQVosRUFBa0JDLEVBQWxCO0FBQ0g7QUFDSixpQkFKRDtBQUtIO0FBekM0Qjs7QUFBQTtBQUFBOztBQTRDakMsV0FBT0osWUFBUDtBQUNILENBN0NEIiwiZmlsZSI6InV0aWxzL0V2ZW50RW1pdHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBsb2dnZXIgPSBudWxsO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKExvZ2dlciwgXykge1xuICAgIFxuICAgIGNsYXNzIEV2ZW50RW1pdHRlciB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgbG9nZ2VyID0gTG9nZ2VyLmluc3RhbmNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBlbWl0KG5hbWUsIGFyZ3MsIGNiLCBzdG9yZXMpIHtcbiAgICAgICAgICAgIGlmIChfLmlzTmlsKG5hbWUpIHx8ICFfLmlzU3RyaW5nKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3Igb24gbmFtZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKF8uaXNOaWwoYXJncykpIHtcbiAgICAgICAgICAgICAgICBhcmdzID0ge307XG4gICAgICAgICAgICAgICAgY2IgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoXy5pc05pbChjYikpIHtcbiAgICAgICAgICAgICAgICBjYiA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24oYXJncykpIHtcbiAgICAgICAgICAgICAgICBjYiA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgYXJncyA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIV8uaXNOaWwoc3RvcmVzKSAmJiBfLmlzQXJyYXkoc3RvcmVzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0b3JlcyA9IHN0b3JlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNvbW1hbmQgPSBuYW1lO1xuICAgICAgICBcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdFbWl0dGluZyBzdG9yZSBldmVudCAnICsgbmFtZSk7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoYXJncyk7XG4gICAgICAgIFxuICAgICAgICAgICAgLy8gU2VuZCBldmVudCB0byBhbGwgdGhlIHN0b3JlcyByZWdpc3RlcmVkXG4gICAgICAgICAgICBfLmZvckVhY2godGhpcy5fc3RvcmVzLCBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGZuW2NvbW1hbmRdKSkge1xuICAgICAgICAgICAgICAgICAgICBmbltjb21tYW5kXShhcmdzLCBjYik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcbn07Il19
