var gulp = require('gulp');
var fs = require('fs');
var gutil = require('gulp-util');
var rename = require('gulp-rename');
var typedoc = require("gulp-typedoc");
var ghPages = require("gulp-gh-pages");
var jsdoc2md = require('jsdoc-to-markdown');
var gulpJsdoc2md = require('gulp-jsdoc-to-markdown');
var conventionalChangelog = require('gulp-conventional-changelog');

gulp.task("doc:api:full", function () {
    return jsdoc2md.render({ files: "src/**/*.js" })
    .then(function(output) {
        return fs.writeFileSync("api/index.md", output);
    });
});

gulp.task("doc:api:files", function () {
    return gulp.src([
            "src/utils/Utils.js", "src/emitter/EventEmitter.js",
            "src/binary/BinaryParserBuffer.js", "src/binary/BinaryParser.js",
            "src/document/ObjectId.js", "src/document/Document.js",
            "src/selector/SelectorMatcher.js", "src/selector/Selector.js",
            "src/collection/Collection.js", "src/collection/Cursor.js",
            "src/aggregation/Aggregation.js", "src/core/Options.js",
            "src/core/MongoPortable.js"
        ])
        .pipe(gulpJsdoc2md(/*{ template: fs.readFileSync("./readme.hbs", "utf8") }*/))
        .on("error", function (err) {
            gutil.log(gutil.colors.red("jsdoc2md failed"), err.message);
        })
        .pipe(rename(function (path) {
            path.extname = ".md";
        }))
        .pipe(gulp.dest("api"));
});

gulp.task("doc:app", function (cb) {
    return gulp.src("./src/**/*.ts")
        .pipe(typedoc({
            // typescript
            target: "es6",
    		module: "commonjs",
    		moduleResolution: "node",
    		experimentalDecorators: true,
    		emitDecoratorMetadata: true,
    		noImplicitAny: false,
    		suppressImplicitAnyIndexErrors: true,
			exclude: "**/**/index.ts",
			excludeExternals: true,
    		
    		// typedoc
    		out: "docs",
    		json: "docs/out.json",
			readme: "./README.md",
			mode: "file",
    		
    		name: "Mongo Portable",
    		ignoreCompilerErrors: true, // true -> Cannot find name 'process'
    		version: true
        }));
});

gulp.task("publish:ghpages", function() {
  return gulp.src("./docs/**/*")
    .pipe(ghPages());
});

gulp.task("changelog", function () {
    return gulp.src("CHANGELOG.md", {
        buffer: false
    })
    .pipe(conventionalChangelog({
        preset: "angular",
        outputUnreleased: true,
        releaseCount: 0
    }, {
        host: "https://github.com",
        owner: "EastolfiWebDev",
        repository: "MongoPortable"
    }))
    .pipe(gulp.dest("./"));
});