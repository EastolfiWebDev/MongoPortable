var gulp = require("gulp");
var runSequence = require("run-sequence");

// Importing all the sub-tasks
require("require-dir")("./gulp/tasks");

// Build the application and bundle it for browser
gulp.task("build", function(cb) {
    runSequence(
        "build:app",            // build
        "compress:app",         // bundle + compress
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

// Creates the html docs, and the .md docs
gulp.task("doc", function(cb) {
    runSequence(
        "doc:app",              // generate html docs
        "doc:api",        		// generate MD docs
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

// Generates the application by building, testing, and documenting
gulp.task("generate", function(cb) {
    runSequence(
        "test",                 // build + bundle + tests
        "doc",                  // generate all docs
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

// Release a new version to github:
//      Generates the application
//      Updates the changelog
//      Bump version, push changes and release to github
//      Push test coveralls
gulp.task("release", function(cb) {
    runSequence(
        "generate",             // build + bundle + tests + docs
        "version",              // bump version
        "commit-changes",       // add all and commit under "relase MAJOR|MINOR|PATCH version (vVERSION)" message
        "commit-changelog",     // generate changelog
        "push-changes",         // push all commits to github
        "create-new-tag",       // generate tag and push it
        "release:github",       // generate github release
        "publish:coveralls",    // generate and publis coveralls
        "publish:ghpages",
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

gulp.task("default", function(cb) {
    runSequence(
        "generate",
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});