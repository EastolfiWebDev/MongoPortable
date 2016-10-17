var gulp = require('gulp');
var del = require('del');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('clean:lib', function () {
    return del([
        'lib/**/*.js',
        // // here we use a globbing pattern to match everything inside the `mobile` folder
        // 'dist/mobile/**/*',
        // // we don't want to clean this file though so we negate the pattern
        // '!dist/mobile/deploy.json'
    ]);
});

gulp.task('build:app', function () {
    return gulp.src('src/**/*.js')
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('lib'));
});

// gulp.task('bundle', function() {
//     // Single entry point to browserify 
//     return gulp.src(['./index.js'/*, './node_modules/jsw-logger/index.js'*/])
//         .pipe(browserify({
//             insertGlobals : true
//         }))
//         .pipe(gulp.dest('./build'));
// });

// gulp.task('bundle-client', function() {
//     return gulp.src('tests/index.js')
//     // return gulp.src('index_browser.js')
//         .pipe(browserify({
//           insertGlobals: true
//         }))
//         .pipe(rename('mongo-portable.js'))
//         .pipe(gulp.dest('build'));
// });

// gulp.task('bundle-test', ['bundle-client'], function() {
//     return gulp.src('tests/specs/index.js')
//         .pipe(browserify({
//           insertGlobals: true
//         }))
//         .pipe(rename('client-test.js'))
//         .pipe(gulp.dest('tests/specs'));
// });