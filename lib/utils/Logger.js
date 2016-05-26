"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @file Logger.js - Winston based logging class
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eduardo.astolfi91@gmail.com>
 * @license MIT Licensed
 */

var _ = require("lodash"),
    winston = require("winston"),
    winstonLogger = winston.Logger;

var TRANSPORT_PREFIX = 'EAMP_LOGGER_';

// Singleton instance
var singleton = Symbol();
var singletonEnforcer = Symbol();

var defaultOptions = {
    throwError: true
};

/**
 * Logger
 * 
 * @module Logger
 * @constructor
 * @since 1.0.0
 * 
 * @classdesc Logging module singleton which inherits the Winston Logger module.
 *          By default: 
 *              <ol>
 *                  <li>Writes all the HANDLED exceptions under a log file in "logs/handledException.log"</li>
 *                  <li>Writes in the console all warnings and erros</li>
 *              </ol>
 * 
 * @param {Symbol} enforcer - Enforcer internal object to avoid instanciating as "new Logger()"
 * @param {Object} [options] - Additional options
 * 
 * @param {String|Array} [options.throwError=true] - Whether if throw an exception when logged trought the Logger#throw method
 */

var Logger = function (_winstonLogger) {
    _inherits(Logger, _winstonLogger);

    function Logger(enforcer) {
        var options = arguments.length <= 1 || arguments[1] === undefined ? defaultOptions : arguments[1];

        _classCallCheck(this, Logger);

        if (enforcer != singletonEnforcer) throw new Error("Cannot construct singleton");

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Logger).call(this, {
            transports: [new winston.transports.Console({
                name: TRANSPORT_PREFIX + 'debug-console',
                level: 'error'
            })]
        }));

        _this.options = options;

        _this.logger = new winston.Logger({
            transports: [new winston.transports.File({
                name: TRANSPORT_PREFIX + 'exception-file',
                filename: 'logs/handledException.log',
                level: 'error',
                json: false,
                colorize: true
            })]
        });
        return _this;
    }

    /**
     * Method to throw a controlled exception, logging it to a log file.
     * 
     * @param {Error|String} error - The exception or message to be thrown.
     * @param {Boolean} [throwError=true] - Same as Logger->options->throwError
     */


    _createClass(Logger, [{
        key: "throw",
        value: function _throw(error) {
            if (_.isString(error)) error = new Error(error);

            this.logger.error(error);

            if (this.options.throwError) throw error;
        }

        /**
         * Retrieves the current singleton instance, creating a new one if needed.
         * 
         * @static
         * 
         * @returns {Logger} this - The singleton Instance
         */

    }], [{
        key: "getInstance",


        /**
         * Retrieves the current singleton instance, creating a new one if needed. 
         * It allows, when creating the first time, a set of options. Otherwise, it will return the singleton instance
         * 
         * @static
         * 
         * @param {Object} [options] - Additional options. See {@link Logger#constructor}
         * 
         * @returns {Logger} this - The singleton Instance
         */
        value: function getInstance(options) {
            if (_.isNil(this[singleton])) {
                this[singleton] = new Logger(singletonEnforcer, options);
            } else {
                console.error("Singleton already instanciated. Ignoring options and retrieving current instance.");
            }

            return Logger.instance;
        }

        /**
         * Destroy the current singleton instance
         * 
         * @static
         */

    }, {
        key: "__dropInstance",
        value: function __dropInstance() {
            delete this[singleton];
        }
    }, {
        key: "instance",
        get: function get() {
            if (_.isNil(this[singleton])) {
                this[singleton] = new Logger(singletonEnforcer);
            }

            return this[singleton];
        }
    }]);

    return Logger;
}(winstonLogger);

module.exports = Logger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9Mb2dnZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVNBLElBQUksSUFBSSxRQUFRLFFBQVIsQ0FBUjtJQUNJLFVBQVUsUUFBUSxTQUFSLENBRGQ7SUFFSSxnQkFBZ0IsUUFBUSxNQUY1Qjs7QUFJQSxJQUFNLG1CQUFtQixjQUF6Qjs7O0FBR0EsSUFBSSxZQUFZLFFBQWhCO0FBQ0EsSUFBSSxvQkFBb0IsUUFBeEI7O0FBRUEsSUFBSSxpQkFBaUI7QUFDakIsZ0JBQVk7QUFESyxDQUFyQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQXVCTSxNOzs7QUFDRixvQkFBWSxRQUFaLEVBQWdEO0FBQUEsWUFBMUIsT0FBMEIseURBQWhCLGNBQWdCOztBQUFBOztBQUM1QyxZQUFHLFlBQVksaUJBQWYsRUFBa0MsTUFBTSxJQUFJLEtBQUosQ0FBVSw0QkFBVixDQUFOOztBQURVLDhGQUd0QztBQUNGLHdCQUFZLENBQ1IsSUFBSSxRQUFRLFVBQVIsQ0FBbUIsT0FBdkIsQ0FBK0I7QUFDM0Isc0JBQU0sbUJBQW1CLGVBREU7QUFFM0IsdUJBQU87QUFGb0IsYUFBL0IsQ0FEUTtBQURWLFNBSHNDOztBQVk1QyxjQUFLLE9BQUwsR0FBZSxPQUFmOztBQUVBLGNBQUssTUFBTCxHQUFjLElBQUksUUFBUSxNQUFaLENBQW1CO0FBQzdCLHdCQUFZLENBQ1IsSUFBSSxRQUFRLFVBQVIsQ0FBbUIsSUFBdkIsQ0FBNEI7QUFDeEIsc0JBQU0sbUJBQW1CLGdCQUREO0FBRXhCLDBCQUFVLDJCQUZjO0FBR3hCLHVCQUFPLE9BSGlCO0FBSXhCLHNCQUFNLEtBSmtCO0FBS3hCLDBCQUFVO0FBTGMsYUFBNUIsQ0FEUTtBQURpQixTQUFuQixDQUFkO0FBZDRDO0FBeUIvQzs7Ozs7Ozs7Ozs7OytCQVFLLEssRUFBTztBQUNULGdCQUFJLEVBQUUsUUFBRixDQUFXLEtBQVgsQ0FBSixFQUF1QixRQUFRLElBQUksS0FBSixDQUFVLEtBQVYsQ0FBUjs7QUFFdkIsaUJBQUssTUFBTCxDQUFZLEtBQVosQ0FBa0IsS0FBbEI7O0FBRUEsZ0JBQUksS0FBSyxPQUFMLENBQWEsVUFBakIsRUFBNkIsTUFBTSxLQUFOO0FBQ2hDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7b0NBNEJrQixPLEVBQVM7QUFDeEIsZ0JBQUksRUFBRSxLQUFGLENBQVEsS0FBSyxTQUFMLENBQVIsQ0FBSixFQUE4QjtBQUMxQixxQkFBSyxTQUFMLElBQWtCLElBQUksTUFBSixDQUFXLGlCQUFYLEVBQThCLE9BQTlCLENBQWxCO0FBQ0gsYUFGRCxNQUVPO0FBQ0gsd0JBQVEsS0FBUixDQUFjLG1GQUFkO0FBQ0g7O0FBRUQsbUJBQU8sT0FBTyxRQUFkO0FBQ0g7Ozs7Ozs7Ozs7eUNBT3VCO0FBQ3BCLG1CQUFPLEtBQUssU0FBTCxDQUFQO0FBQ0g7Ozs0QkFwQ3FCO0FBQ2xCLGdCQUFJLEVBQUUsS0FBRixDQUFRLEtBQUssU0FBTCxDQUFSLENBQUosRUFBOEI7QUFDMUIscUJBQUssU0FBTCxJQUFrQixJQUFJLE1BQUosQ0FBVyxpQkFBWCxDQUFsQjtBQUNIOztBQUVELG1CQUFPLEtBQUssU0FBTCxDQUFQO0FBRUg7Ozs7RUF4RGdCLGE7O0FBd0ZyQixPQUFPLE9BQVAsR0FBaUIsTUFBakIiLCJmaWxlIjoiTG9nZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBMb2dnZXIuanMgLSBXaW5zdG9uIGJhc2VkIGxvZ2dpbmcgY2xhc3NcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBcbiAqIEBhdXRob3IgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTYgRWR1YXJkbyBBc3RvbGZpIDxlZHVhcmRvLmFzdG9sZmk5MUBnbWFpbC5jb20+XG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIiksXG4gICAgd2luc3RvbiA9IHJlcXVpcmUoXCJ3aW5zdG9uXCIpLFxuICAgIHdpbnN0b25Mb2dnZXIgPSB3aW5zdG9uLkxvZ2dlcjtcbiAgICBcbmNvbnN0IFRSQU5TUE9SVF9QUkVGSVggPSAnRUFNUF9MT0dHRVJfJztcblxuLy8gU2luZ2xldG9uIGluc3RhbmNlXG5sZXQgc2luZ2xldG9uID0gU3ltYm9sKCk7XG5sZXQgc2luZ2xldG9uRW5mb3JjZXIgPSBTeW1ib2woKTtcblxubGV0IGRlZmF1bHRPcHRpb25zID0ge1xuICAgIHRocm93RXJyb3I6IHRydWVcbn07XG5cbi8qKlxuICogTG9nZ2VyXG4gKiBcbiAqIEBtb2R1bGUgTG9nZ2VyXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzaW5jZSAxLjAuMFxuICogXG4gKiBAY2xhc3NkZXNjIExvZ2dpbmcgbW9kdWxlIHNpbmdsZXRvbiB3aGljaCBpbmhlcml0cyB0aGUgV2luc3RvbiBMb2dnZXIgbW9kdWxlLlxuICogICAgICAgICAgQnkgZGVmYXVsdDogXG4gKiAgICAgICAgICAgICAgPG9sPlxuICogICAgICAgICAgICAgICAgICA8bGk+V3JpdGVzIGFsbCB0aGUgSEFORExFRCBleGNlcHRpb25zIHVuZGVyIGEgbG9nIGZpbGUgaW4gXCJsb2dzL2hhbmRsZWRFeGNlcHRpb24ubG9nXCI8L2xpPlxuICogICAgICAgICAgICAgICAgICA8bGk+V3JpdGVzIGluIHRoZSBjb25zb2xlIGFsbCB3YXJuaW5ncyBhbmQgZXJyb3M8L2xpPlxuICogICAgICAgICAgICAgIDwvb2w+XG4gKiBcbiAqIEBwYXJhbSB7U3ltYm9sfSBlbmZvcmNlciAtIEVuZm9yY2VyIGludGVybmFsIG9iamVjdCB0byBhdm9pZCBpbnN0YW5jaWF0aW5nIGFzIFwibmV3IExvZ2dlcigpXCJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBZGRpdGlvbmFsIG9wdGlvbnNcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IFtvcHRpb25zLnRocm93RXJyb3I9dHJ1ZV0gLSBXaGV0aGVyIGlmIHRocm93IGFuIGV4Y2VwdGlvbiB3aGVuIGxvZ2dlZCB0cm91Z2h0IHRoZSBMb2dnZXIjdGhyb3cgbWV0aG9kXG4gKi9cbmNsYXNzIExvZ2dlciBleHRlbmRzIHdpbnN0b25Mb2dnZXIge1xuICAgIGNvbnN0cnVjdG9yKGVuZm9yY2VyLCBvcHRpb25zID0gZGVmYXVsdE9wdGlvbnMpIHtcbiAgICAgICAgaWYoZW5mb3JjZXIgIT0gc2luZ2xldG9uRW5mb3JjZXIpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBjb25zdHJ1Y3Qgc2luZ2xldG9uXCIpO1xuICAgICAgICBcbiAgICAgICAgc3VwZXIoe1xuICAgICAgICAgICAgdHJhbnNwb3J0czogW1xuICAgICAgICAgICAgICAgIG5ldyB3aW5zdG9uLnRyYW5zcG9ydHMuQ29uc29sZSh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFRSQU5TUE9SVF9QUkVGSVggKyAnZGVidWctY29uc29sZScsXG4gICAgICAgICAgICAgICAgICAgIGxldmVsOiAnZXJyb3InXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sb2dnZXIgPSBuZXcgd2luc3Rvbi5Mb2dnZXIoe1xuICAgICAgICAgICAgdHJhbnNwb3J0czogW1xuICAgICAgICAgICAgICAgIG5ldyB3aW5zdG9uLnRyYW5zcG9ydHMuRmlsZSh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFRSQU5TUE9SVF9QUkVGSVggKyAnZXhjZXB0aW9uLWZpbGUnLFxuICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZTogJ2xvZ3MvaGFuZGxlZEV4Y2VwdGlvbi5sb2cnLFxuICAgICAgICAgICAgICAgICAgICBsZXZlbDogJ2Vycm9yJyxcbiAgICAgICAgICAgICAgICAgICAganNvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yaXplOiB0cnVlXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byB0aHJvdyBhIGNvbnRyb2xsZWQgZXhjZXB0aW9uLCBsb2dnaW5nIGl0IHRvIGEgbG9nIGZpbGUuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtFcnJvcnxTdHJpbmd9IGVycm9yIC0gVGhlIGV4Y2VwdGlvbiBvciBtZXNzYWdlIHRvIGJlIHRocm93bi5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFt0aHJvd0Vycm9yPXRydWVdIC0gU2FtZSBhcyBMb2dnZXItPm9wdGlvbnMtPnRocm93RXJyb3JcbiAgICAgKi9cbiAgICB0aHJvdyhlcnJvcikge1xuICAgICAgICBpZiAoXy5pc1N0cmluZyhlcnJvcikpIGVycm9yID0gbmV3IEVycm9yKGVycm9yKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGVycm9yKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMudGhyb3dFcnJvcikgdGhyb3cgZXJyb3I7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgY3VycmVudCBzaW5nbGV0b24gaW5zdGFuY2UsIGNyZWF0aW5nIGEgbmV3IG9uZSBpZiBuZWVkZWQuXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtMb2dnZXJ9IHRoaXMgLSBUaGUgc2luZ2xldG9uIEluc3RhbmNlXG4gICAgICovXG4gICAgc3RhdGljIGdldCBpbnN0YW5jZSgpIHtcbiAgICAgICAgaWYgKF8uaXNOaWwodGhpc1tzaW5nbGV0b25dKSkge1xuICAgICAgICAgICAgdGhpc1tzaW5nbGV0b25dID0gbmV3IExvZ2dlcihzaW5nbGV0b25FbmZvcmNlcik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzW3NpbmdsZXRvbl07XG4gICAgICAgIFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIGN1cnJlbnQgc2luZ2xldG9uIGluc3RhbmNlLCBjcmVhdGluZyBhIG5ldyBvbmUgaWYgbmVlZGVkLiBcbiAgICAgKiBJdCBhbGxvd3MsIHdoZW4gY3JlYXRpbmcgdGhlIGZpcnN0IHRpbWUsIGEgc2V0IG9mIG9wdGlvbnMuIE90aGVyd2lzZSwgaXQgd2lsbCByZXR1cm4gdGhlIHNpbmdsZXRvbiBpbnN0YW5jZVxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQWRkaXRpb25hbCBvcHRpb25zLiBTZWUge0BsaW5rIExvZ2dlciNjb25zdHJ1Y3Rvcn1cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7TG9nZ2VyfSB0aGlzIC0gVGhlIHNpbmdsZXRvbiBJbnN0YW5jZVxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRJbnN0YW5jZShvcHRpb25zKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKHRoaXNbc2luZ2xldG9uXSkpIHtcbiAgICAgICAgICAgIHRoaXNbc2luZ2xldG9uXSA9IG5ldyBMb2dnZXIoc2luZ2xldG9uRW5mb3JjZXIsIG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlNpbmdsZXRvbiBhbHJlYWR5IGluc3RhbmNpYXRlZC4gSWdub3Jpbmcgb3B0aW9ucyBhbmQgcmV0cmlldmluZyBjdXJyZW50IGluc3RhbmNlLlwiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIExvZ2dlci5pbnN0YW5jZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSB0aGUgY3VycmVudCBzaW5nbGV0b24gaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIF9fZHJvcEluc3RhbmNlKCkge1xuICAgICAgICBkZWxldGUgdGhpc1tzaW5nbGV0b25dO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMb2dnZXI7Il19
