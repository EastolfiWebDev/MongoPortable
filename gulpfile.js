var gulp = require('gulp');
var runSequence = require('run-sequence');

require('require-dir')('./gulp/tasks');

gulp.task('build', function(cb) {
    runSequence(
        'clean:lib',
        'build:app',
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

gulp.task('test', function(cb) {
    runSequence(
        'test:app',
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

gulp.task('doc', function(cb) {
    runSequence(
        'doc:app',
        'doc:api:files',
        'doc:api:full',
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

gulp.task('generate', function(cb) {
    runSequence(
        'build',
        'test',
        'doc',
    function(error) {
        if (error) {
            console.log(error);
        }
        
        cb(error);
    });
});

gulp.task('release', function(cb) {
    runSequence(
        'generate',
        'test',
        'doc',
        'version',
        'commit-changes',
        'push-changes',
        'create-new-tag',
        'github-release',
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