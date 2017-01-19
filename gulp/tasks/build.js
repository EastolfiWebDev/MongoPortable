var gulp = require("gulp");
var del = require("del");
var ts = require("gulp-typescript");
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

var tsProject = ts.createProject("tsconfig.json");
gulp.task("build:source", function () {
    return gulp.src("src/**/*.ts")
        .pipe(sourcemaps.init())
        .pipe(tsProject()).js
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest("./src"));
});

var tsProjectIndex = ts.createProject("tsconfig.json");
gulp.task("build:index", function () {
    return gulp.src("index.ts")
        .pipe(sourcemaps.init())
        .pipe(tsProjectIndex()).js
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest("."));
});

gulp.task("build:app", ["build:source", "build:index"]);

gulp.task("watch:app", ["build:app"], function () {
    gulp.watch(["./src/**/*.ts", "./index.ts"], ["build:app"]);
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