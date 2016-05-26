var expect = require("chai").expect,
    Logger = require("../lib/utils/Logger");
    
// var logger = new winston.Logger({
//     transports: [
//         new winston.transports.Console({
//             name: 'debug-console',
//             level: 'debug'
//         // }),
//         // new (winston.transports.File)({
//         //     name: 'info-file',
//         //     level: 'info',
//         //     filename: 'logs/info.log'
//         // }),
//         // new (winston.transports.File)({
//         //     name: 'error-file',
//         //     level: 'error',
//         //     filename: 'logs/error.log'
//         })
//     ],
//     exceptionHandlers: [
//         new winston.transports.File({
//             name: 'exception-file',
//             filename: 'logs/exception.log',
//             humanReadableUnhandledException: true,
//             level: 'debug',
//             handleExceptions: true,
//             json: false,
//             colorize: true
//         })
//     ],
//     exitOnError: true
// });
  
//   var logger = new (winston.Logger)({
//     transports: [
//         new winston.transports.Console(
//             {
//                 level: 'debug',
//                 colorize: true,
//                 timestamp: true
//             }),
//         new winston.transports.File(
//             {
//                 level: 'info',
//                 colorize: false,
//                 timestamp: true,
//                 json: true,
//                 filename: '/logs/exception.log',
//                 handleExceptions: true
//             })
//     ]
// });

//   winston.handleExceptions(new winston.transports.File({ filename: 'logs/exception.log' }));

  
describe("Logger", function() {
    describe("#Constructor", function() {
        it("should have the dependencies ready", function() {
            expect(Logger).to.exist;
            // Logger.info('Hello again distributed logs');
            
            
            // create a thrower that has a winston instance, so it can throw the error in console, write it to disk and exit the program if wanted
            
            // expect(true).to.be.true;
            // console.log(fff);
            // expect(Logger.getLogLevel()).to.be.equal(1);
        });
    });
        
    describe("#Instance", function() {
        it("should be able to create a first instance with options", function() {
            var logger = Logger.getInstance({ testing: true });
            
            expect(logger).to.exist;
            
            expect(logger).to.have.ownProperty('options');
            expect(logger.options).to.have.ownProperty('testing');
            expect(logger.options.testing).to.be.equal(true);
        });
        
        it("should be able to retrieve the instance", function() {
            var logger = Logger.instance;
            
            expect(logger).to.exist;
            
            expect(logger).to.have.ownProperty('options');
            expect(logger.options).to.have.ownProperty('testing');
            expect(logger.options.testing).to.be.equal(true);
        });
        
        it("should fail when re-instanciating with options", function() {
            var logger = Logger.getInstance({ testing: false });
            
            expect(logger).to.exist;
            
            expect(logger).to.have.ownProperty('options');
            expect(logger.options).to.have.ownProperty('testing');
            expect(logger.options.testing).to.be.equal(true);
        });
        
        it("should be able to drop the instance", function() {
            Logger.__dropInstance();
            
            var logger = Logger.getInstance({ testing: false });
            
            expect(logger).to.exist;
            
            expect(logger).to.have.ownProperty('options');
            expect(logger.options).to.have.ownProperty('testing');
            expect(logger.options.testing).to.be.equal(false);
        });
        
        it("should be able to create a first instance without options", function() {
            Logger.__dropInstance();
            
            var logger = Logger.instance;
            
            expect(logger).to.exist;
            
            expect(logger).to.have.ownProperty('options');
            expect(logger.options).to.not.have.ownProperty('testing');
        });
    });
    
    // describe("#Constructor", function() {
    //     it("should have the dependencies ready", function() {
    //         expect(Logger).to.exist;
            
    //         expect(Logger.getLogLevel()).to.be.equal(1);
    //     });
    // });
    
    // describe("Failures", function() {
    //     it("should fail when instanciating as a function (without 'new')", function() {
    //         expect(Logger).to.throw(Error);
    //     });
    // });
});