var gulp = require('gulp');
var typedoc = require("gulp-typedoc");
var ghPages = require("gulp-gh-pages");
var conventionalChangelog = require('gulp-conventional-changelog');

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

gulp.task("doc:api", function (cb) {
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
    		out: "api2",
    		json: "api2/out.json",
			readme: "./README.md",
			mode: "file",
			theme: "markdown",
    		
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