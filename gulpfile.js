var gulp = require('gulp');
var runSequence = require('run-sequence');

require('require-dir')('./gulp/tasks');

gulp.task('build', function(cb) {
    runSequence(
        'clean:lib',            // deletes folder lib content
        'build:app',            // build
        'bundle:app',           // bundle
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

gulp.task('test', function(cb) {
    runSequence(
        'test:app',             // build + test
        // 'test:browser',         // build + bundle + test
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

gulp.task('doc', function(cb) {
    runSequence(
        'doc:app',              // generate html docs
        'doc:api:files',        // generate MD docs (file/class)
        'doc:api:full',         // generate MD docs (all class together)
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

gulp.task('generate', function(cb) {
    runSequence(
        'test',                 // build + bundle + tests
        'doc',                  // generate all docs
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

gulp.task('release', function(cb) {
    runSequence(
        'generate',             // build + bundle + tests + docs
        'version',              // bump version
        'commit-changes',       // add all and commit under "relase MAJOR|MINOR|PATCH version (vVERSION)" message
        'commit-changelog',     // generate changelog
        'push-changes',         // push all commits to github
        'create-new-tag',       // generate tag and push it
        'release:github',       // generate github release
        'publish:coveralls',    // generate and publis coveralls
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

gulp.task('default', function(cb) {
    runSequence(
        'generate',
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});