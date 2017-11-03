var gulp = require("gulp");
var mochaPhantomJS = require("gulp-mocha-phantomjs");

gulp.task("test:browser", ["compress:app"], function () { 
    return gulp.src("test/index.html", {read: false})
        .pipe(mochaPhantomJS({reporter: "nyan"}));
});