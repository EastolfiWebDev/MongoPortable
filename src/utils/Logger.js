const GENERIC_LEVEL = process.env.NODE_EA_LOGGER || 1;

var Logger = function(level) {
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
    var logLevel = level || GENERIC_LEVEL || 1;      // Show error by default
    
    this.debug = function(msg) {
        if (logLevel >= 5) {
            console.log('#DEBUG# - ' + JSON.stringify(msg));
        }
    };
    this.log = function(msg) {
        if (logLevel >= 4) {
            console.log('#LOG# - ' + JSON.stringify(msg));
        }
    };
    this.info = function(msg) {
        if (logLevel >= 3) {
            console.log('#INFO# - ' + JSON.stringify(msg));
        }
    };
    this.warn = function(msg) {
        if (logLevel >= 2) {
            console.log('#WARNING# - ' + JSON.stringify(msg));
        }
    };
    this.error = function(msg) {
        if (logLevel >= 1) {
            console.log('#ERROR# - ' + JSON.stringify(msg));
        }
    };
    
    /**/
    this.getLogLevel = function() {
        return logLevel;
    };
    
    this.setLogLevel = function(level) {
        return logLevel = level || 1;
    };
};

var LOG = new Logger();

Logger.prototype.none       = function() { LOG.setLogLevel(-1)} ;
Logger.prototype.error      = function() { LOG.setLogLevel(1)} ;
Logger.prototype.warn       = function() { LOG.setLogLevel(2)} ;
Logger.prototype.info       = function() { LOG.setLogLevel(3)} ;
Logger.prototype.log        = function() { LOG.setLogLevel(4)} ;
Logger.prototype.debug      = function() { LOG.setLogLevel(5)} ;
Logger.prototype.all        = function() { LOG.setLogLevel(99)} ;

module.exports = LOG;