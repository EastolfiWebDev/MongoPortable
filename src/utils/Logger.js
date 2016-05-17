const GENERIC_LEVEL = process.env.NODE_EA_LOGGER || 1;

var logLevel = null;      // Show error by default
class Logger {
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
    constructor(level) {
        logLevel = level || GENERIC_LEVEL || 1;
    }
    
    
    debug(msg) {
        if (logLevel >= 5) {
            console.log('#DEBUG# - ' + JSON.stringify(msg));
        }
    }
    
    log(msg) {
        if (logLevel >= 4) {
            console.log('#LOG# - ' + JSON.stringify(msg));
        }
    }
    
    info(msg) {
        if (logLevel >= 3) {
            console.log('#INFO# - ' + JSON.stringify(msg));
        }
    }
    
    warn(msg) {
        if (logLevel >= 2) {
            console.log('#WARNING# - ' + JSON.stringify(msg));
        }
    }
    
    error(msg) {
        if (logLevel >= 1) {
            console.log('#ERROR# - ' + JSON.stringify(msg));
        }
    }
    
    /**/
    getLogLevel() {
        return logLevel;
    }
    
    setLogLevel(level) {
        return logLevel = level || 1;
    }
}

var LOG = new Logger();

Logger.prototype.none       = function() { LOG.setLogLevel(-1)} ;
Logger.prototype.error      = function() { LOG.setLogLevel(1)} ;
Logger.prototype.warn       = function() { LOG.setLogLevel(2)} ;
Logger.prototype.info       = function() { LOG.setLogLevel(3)} ;
Logger.prototype.log        = function() { LOG.setLogLevel(4)} ;
Logger.prototype.debug      = function() { LOG.setLogLevel(5)} ;
Logger.prototype.all        = function() { LOG.setLogLevel(99)} ;

module.exports = LOG;