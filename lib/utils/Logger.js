'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GENERIC_LEVEL = process.env.NODE_EA_LOGGER || 1;

var logLevel = null; // Show error by default

var Logger = function () {
    /**
     * logLevel =>
     *     -1 || 'N' -> no log
     *      1 || 'E' -> error
     *      2 || 'W' -> warn (and bellow)
     *      3 || 'L' -> log (and bellow)
     *      4 || 'I' -> info (and bellow)
     *      5 || 'D' -> debug (and bellow)
     *     99 || 'A' -> all
     */

    function Logger(level) {
        _classCallCheck(this, Logger);

        logLevel = level || GENERIC_LEVEL || 1;
    }

    _createClass(Logger, [{
        key: 'debug',
        value: function debug(msg) {
            if (logLevel >= 5) {
                console.log('#DEBUG# - ' + JSON.stringify(msg));
            }
        }
    }, {
        key: 'log',
        value: function log(msg) {
            if (logLevel >= 4) {
                console.log('#LOG# - ' + JSON.stringify(msg));
            }
        }
    }, {
        key: 'info',
        value: function info(msg) {
            if (logLevel >= 3) {
                console.log('#INFO# - ' + JSON.stringify(msg));
            }
        }
    }, {
        key: 'warn',
        value: function warn(msg) {
            if (logLevel >= 2) {
                console.log('#WARNING# - ' + JSON.stringify(msg));
            }
        }
    }, {
        key: 'error',
        value: function error(msg) {
            if (logLevel >= 1) {
                console.log('#ERROR# - ' + JSON.stringify(msg));
            }
        }

        /**/

    }, {
        key: 'getLogLevel',
        value: function getLogLevel() {
            return logLevel;
        }
    }, {
        key: 'setLogLevel',
        value: function setLogLevel(level) {
            return logLevel = level || 1;
        }
    }]);

    return Logger;
}();

var LOG = new Logger();

Logger.prototype.none = function () {
    LOG.setLogLevel(-1);
};
Logger.prototype.error = function () {
    LOG.setLogLevel(1);
};
Logger.prototype.warn = function () {
    LOG.setLogLevel(2);
};
Logger.prototype.info = function () {
    LOG.setLogLevel(3);
};
Logger.prototype.log = function () {
    LOG.setLogLevel(4);
};
Logger.prototype.debug = function () {
    LOG.setLogLevel(5);
};
Logger.prototype.all = function () {
    LOG.setLogLevel(99);
};

module.exports = LOG;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9Mb2dnZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBTSxnQkFBZ0IsUUFBUSxHQUFSLENBQVksY0FBWixJQUE4QixDQUFwRDs7QUFFQSxJQUFJLFdBQVcsSUFBZixDOztJQUNNLE07Ozs7Ozs7Ozs7OztBQVdGLG9CQUFZLEtBQVosRUFBbUI7QUFBQTs7QUFDZixtQkFBVyxTQUFTLGFBQVQsSUFBMEIsQ0FBckM7QUFDSDs7Ozs4QkFHSyxHLEVBQUs7QUFDUCxnQkFBSSxZQUFZLENBQWhCLEVBQW1CO0FBQ2Ysd0JBQVEsR0FBUixDQUFZLGVBQWUsS0FBSyxTQUFMLENBQWUsR0FBZixDQUEzQjtBQUNIO0FBQ0o7Ozs0QkFFRyxHLEVBQUs7QUFDTCxnQkFBSSxZQUFZLENBQWhCLEVBQW1CO0FBQ2Ysd0JBQVEsR0FBUixDQUFZLGFBQWEsS0FBSyxTQUFMLENBQWUsR0FBZixDQUF6QjtBQUNIO0FBQ0o7Ozs2QkFFSSxHLEVBQUs7QUFDTixnQkFBSSxZQUFZLENBQWhCLEVBQW1CO0FBQ2Ysd0JBQVEsR0FBUixDQUFZLGNBQWMsS0FBSyxTQUFMLENBQWUsR0FBZixDQUExQjtBQUNIO0FBQ0o7Ozs2QkFFSSxHLEVBQUs7QUFDTixnQkFBSSxZQUFZLENBQWhCLEVBQW1CO0FBQ2Ysd0JBQVEsR0FBUixDQUFZLGlCQUFpQixLQUFLLFNBQUwsQ0FBZSxHQUFmLENBQTdCO0FBQ0g7QUFDSjs7OzhCQUVLLEcsRUFBSztBQUNQLGdCQUFJLFlBQVksQ0FBaEIsRUFBbUI7QUFDZix3QkFBUSxHQUFSLENBQVksZUFBZSxLQUFLLFNBQUwsQ0FBZSxHQUFmLENBQTNCO0FBQ0g7QUFDSjs7Ozs7O3NDQUdhO0FBQ1YsbUJBQU8sUUFBUDtBQUNIOzs7b0NBRVcsSyxFQUFPO0FBQ2YsbUJBQU8sV0FBVyxTQUFTLENBQTNCO0FBQ0g7Ozs7OztBQUdMLElBQUksTUFBTSxJQUFJLE1BQUosRUFBVjs7QUFFQSxPQUFPLFNBQVAsQ0FBaUIsSUFBakIsR0FBOEIsWUFBVztBQUFFLFFBQUksV0FBSixDQUFnQixDQUFDLENBQWpCO0FBQW9CLENBQS9EO0FBQ0EsT0FBTyxTQUFQLENBQWlCLEtBQWpCLEdBQThCLFlBQVc7QUFBRSxRQUFJLFdBQUosQ0FBZ0IsQ0FBaEI7QUFBbUIsQ0FBOUQ7QUFDQSxPQUFPLFNBQVAsQ0FBaUIsSUFBakIsR0FBOEIsWUFBVztBQUFFLFFBQUksV0FBSixDQUFnQixDQUFoQjtBQUFtQixDQUE5RDtBQUNBLE9BQU8sU0FBUCxDQUFpQixJQUFqQixHQUE4QixZQUFXO0FBQUUsUUFBSSxXQUFKLENBQWdCLENBQWhCO0FBQW1CLENBQTlEO0FBQ0EsT0FBTyxTQUFQLENBQWlCLEdBQWpCLEdBQThCLFlBQVc7QUFBRSxRQUFJLFdBQUosQ0FBZ0IsQ0FBaEI7QUFBbUIsQ0FBOUQ7QUFDQSxPQUFPLFNBQVAsQ0FBaUIsS0FBakIsR0FBOEIsWUFBVztBQUFFLFFBQUksV0FBSixDQUFnQixDQUFoQjtBQUFtQixDQUE5RDtBQUNBLE9BQU8sU0FBUCxDQUFpQixHQUFqQixHQUE4QixZQUFXO0FBQUUsUUFBSSxXQUFKLENBQWdCLEVBQWhCO0FBQW9CLENBQS9EOztBQUVBLE9BQU8sT0FBUCxHQUFpQixHQUFqQiIsImZpbGUiOiJMb2dnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBHRU5FUklDX0xFVkVMID0gcHJvY2Vzcy5lbnYuTk9ERV9FQV9MT0dHRVIgfHwgMTtcblxudmFyIGxvZ0xldmVsID0gbnVsbDsgICAgICAvLyBTaG93IGVycm9yIGJ5IGRlZmF1bHRcbmNsYXNzIExvZ2dlciB7XG4gICAgLyoqXG4gICAgICogbG9nTGV2ZWwgPT5cbiAgICAgKiAgICAgLTEgfHwgJ04nIC0+IG5vIGxvZ1xuICAgICAqICAgICAgMSB8fCAnRScgLT4gZXJyb3JcbiAgICAgKiAgICAgIDIgfHwgJ1cnIC0+IHdhcm4gKGFuZCBiZWxsb3cpXG4gICAgICogICAgICAzIHx8ICdMJyAtPiBsb2cgKGFuZCBiZWxsb3cpXG4gICAgICogICAgICA0IHx8ICdJJyAtPiBpbmZvIChhbmQgYmVsbG93KVxuICAgICAqICAgICAgNSB8fCAnRCcgLT4gZGVidWcgKGFuZCBiZWxsb3cpXG4gICAgICogICAgIDk5IHx8ICdBJyAtPiBhbGxcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihsZXZlbCkge1xuICAgICAgICBsb2dMZXZlbCA9IGxldmVsIHx8IEdFTkVSSUNfTEVWRUwgfHwgMTtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgZGVidWcobXNnKSB7XG4gICAgICAgIGlmIChsb2dMZXZlbCA+PSA1KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnI0RFQlVHIyAtICcgKyBKU09OLnN0cmluZ2lmeShtc2cpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBsb2cobXNnKSB7XG4gICAgICAgIGlmIChsb2dMZXZlbCA+PSA0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnI0xPRyMgLSAnICsgSlNPTi5zdHJpbmdpZnkobXNnKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaW5mbyhtc2cpIHtcbiAgICAgICAgaWYgKGxvZ0xldmVsID49IDMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCcjSU5GTyMgLSAnICsgSlNPTi5zdHJpbmdpZnkobXNnKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgd2Fybihtc2cpIHtcbiAgICAgICAgaWYgKGxvZ0xldmVsID49IDIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCcjV0FSTklORyMgLSAnICsgSlNPTi5zdHJpbmdpZnkobXNnKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgZXJyb3IobXNnKSB7XG4gICAgICAgIGlmIChsb2dMZXZlbCA+PSAxKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnI0VSUk9SIyAtICcgKyBKU09OLnN0cmluZ2lmeShtc2cpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKiovXG4gICAgZ2V0TG9nTGV2ZWwoKSB7XG4gICAgICAgIHJldHVybiBsb2dMZXZlbDtcbiAgICB9XG4gICAgXG4gICAgc2V0TG9nTGV2ZWwobGV2ZWwpIHtcbiAgICAgICAgcmV0dXJuIGxvZ0xldmVsID0gbGV2ZWwgfHwgMTtcbiAgICB9XG59XG5cbnZhciBMT0cgPSBuZXcgTG9nZ2VyKCk7XG5cbkxvZ2dlci5wcm90b3R5cGUubm9uZSAgICAgICA9IGZ1bmN0aW9uKCkgeyBMT0cuc2V0TG9nTGV2ZWwoLTEpfSA7XG5Mb2dnZXIucHJvdG90eXBlLmVycm9yICAgICAgPSBmdW5jdGlvbigpIHsgTE9HLnNldExvZ0xldmVsKDEpfSA7XG5Mb2dnZXIucHJvdG90eXBlLndhcm4gICAgICAgPSBmdW5jdGlvbigpIHsgTE9HLnNldExvZ0xldmVsKDIpfSA7XG5Mb2dnZXIucHJvdG90eXBlLmluZm8gICAgICAgPSBmdW5jdGlvbigpIHsgTE9HLnNldExvZ0xldmVsKDMpfSA7XG5Mb2dnZXIucHJvdG90eXBlLmxvZyAgICAgICAgPSBmdW5jdGlvbigpIHsgTE9HLnNldExvZ0xldmVsKDQpfSA7XG5Mb2dnZXIucHJvdG90eXBlLmRlYnVnICAgICAgPSBmdW5jdGlvbigpIHsgTE9HLnNldExvZ0xldmVsKDUpfSA7XG5Mb2dnZXIucHJvdG90eXBlLmFsbCAgICAgICAgPSBmdW5jdGlvbigpIHsgTE9HLnNldExvZ0xldmVsKDk5KX0gO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExPRzsiXX0=
