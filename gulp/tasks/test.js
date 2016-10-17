var gulp = require('gulp');
var mocha = require('gulp-mocha');

gulp.task('test:app', ['build:app'], function () { 
    return gulp.src('test/*.js', {read: false})
        // gulp-mocha needs filepaths so you can't have any plugins before it
        .pipe(mocha({reporter: 'nyan'}));
});

// gulp.task('test:browser', function () { 
//     return gulp.src('tests/index.html', {read: false})
//         .pipe(mochaPhantomJS({reporter: 'nyan'}));
// });

// gulp.task('test-client', ['bundle-test'], function() {
//     return gulp.src('tests/fixtures/index.html')
//         .pipe(mochaPhantomJS({reporter: 'nyan'}));
// });