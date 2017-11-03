var gulp = require("gulp");
var del = require("del");
var minify = require("gulp-minify");
var browserify = require("browserify");
var sourcemaps = require("gulp-sourcemaps");
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");

gulp.task("clean:dist", function () {
    return del([
        "dist/**/*.js"
    ]);
});

gulp.task("bundle:app", ["clean:dist"], function() {
    return browserify({basedir: "./"})
        .add("index.js")
        .bundle()
        .pipe(source("mongo-portable.js"))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sourcemaps.write("./"))
        .pipe(gulp.dest("./dist"));
});

gulp.task("compress:app", ["bundle:app"], function() {
    return gulp.src("dist/mongo-portable.js")
        .pipe(minify({
            ext:{
                min:".min.js"
            }
        }))
        .pipe(gulp.dest("dist"));
});