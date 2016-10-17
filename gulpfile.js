var gulp = require('gulp');
var runSequence = require('run-sequence');
var conventionalChangelog = require('gulp-conventional-changelog');
var conventionalGithubReleaser = require('conventional-github-releaser');
var bump = require('gulp-bump');
var gutil = require('gulp-util');
var git = require('gulp-git');
var fs = require('fs');
var minimist = require('minimist');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var mocha = require('gulp-mocha');
var mochaPhantomJS = require('gulp-mocha-phantomjs');
// var browserify = require('gulp-browserify');
var jsdoc = require('gulp-jsdoc3');
var gulpJsdoc2md = require('gulp-jsdoc-to-markdown');
var rename = require('gulp-rename');
var jsdoc2md = require('jsdoc-to-markdown');

var knownOptions = {
    boolean: ['major', 'minor', 'patch'],
    alias: { major: 'M', minor: 'm', patch: 'p' },
    default: { major: false, minor: false, patch: false, M: false, m: false, p: false }
};

var options = minimist(process.argv.slice(2), knownOptions);

gulp.task('doc:api:full', function () {
    return jsdoc2md.render({ files: 'src/**/*.js' })
    .then(function(output) {
        return fs.writeFileSync('api/documentation.md', output);
    });
});

gulp.task('doc:api', function () {
    return gulp.src(['src/MongoPortable.js', 'src/Collection.js', 'src/Cursor.js', 'src/Selector.js', 'src/ObjectId.js'])
        .pipe(gulpJsdoc2md(/*{ template: fs.readFileSync('./readme.hbs', 'utf8') }*/))
        .on('error', function (err) {
            gutil.log(gutil.colors.red('jsdoc2md failed'), err.message);
        })
        .pipe(rename(function (path) {
            path.extname = '.md';
        }))
        .pipe(gulp.dest('api'));
});

gulp.task('doc:app', function (cb) {
    var config = require('./jsdoc.conf.json');
    
    gulp.src(['./src/**/*.js'], {read: false})
        .pipe(jsdoc(config, cb));
});

gulp.task('bundle', function() {
    // Single entry point to browserify 
    return gulp.src(['./index.js'/*, './node_modules/jsw-logger/index.js'*/])
        .pipe(browserify({
            insertGlobals : true
        }))
        .pipe(gulp.dest('./build'));
});

gulp.task('clean:lib', function () {
    return del([
        'lib/**/*.js',
        // // here we use a globbing pattern to match everything inside the `mobile` folder
        // 'dist/mobile/**/*',
        // // we don't want to clean this file though so we negate the pattern
        // '!dist/mobile/deploy.json'
    ]);
});

gulp.task('test:app', function () { 
    return gulp.src('test/*.js', {read: false})
        // gulp-mocha needs filepaths so you can't have any plugins before it
        .pipe(mocha({reporter: 'nyan'}));
});

gulp.task('test:browser', function () { 
    return gulp.src('tests/index.html', {read: false})
        .pipe(mochaPhantomJS({reporter: 'nyan'}));
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

gulp.task('changelog', function () {
    return gulp.src('CHANGELOG.md', {
        buffer: false
    })
    .pipe(conventionalChangelog({
        preset: 'angular' // Or to any other commit message convention you use.
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('release:github', function (done) {
    conventionalGithubReleaser({
        type: "oauth",
        token: 'bb2128b43719d95467e61a861c079152986ef9ba' // change this to your own GitHub token or use an environment variable
    }, {
        preset: 'angular' // Or to any other commit message convention you use.
    }, done);
});

gulp.task('version', function () {
    var src = gulp.src(['./bower.json', './package.json']);
    // Do patch by default
    var stage = null;
    
    if (options.major) {
        stage = src.pipe(bump({type: 'major'}).on('error', gutil.log));
    } else if (options.minor) {
        stage = src.pipe(bump({type: 'minor'}).on('error', gutil.log));
    } else {
        stage = src.pipe(bump({type: 'patch'}).on('error', gutil.log));
    }
        
    return stage.pipe(gulp.dest('./'));
});

gulp.task('commit-changes', function () {
    var msg = 'chore(version): Release new patch version';
    
    if (options.major) {
        msg = 'chore(version): Release new major version';
    } else if (options.minor) {
        msg = 'chore(version): Release new minor version';
    }
    
    return gulp.src('.')
        .pipe(git.add())
        .pipe(git.commit(msg));
});

gulp.task('push-changes', function (cb) {
    git.push('origin', 'master', cb);
});

gulp.task('create-new-tag', function (cb) {
    var version = getPackageJsonVersion();
    git.tag(version, 'Created Tag for version: ' + version, function (error) {
        if (error) {
            return cb(error);
        }
        
        git.push('origin', 'master', {args: '--tags'}, cb);
    });
    
    function getPackageJsonVersion () {
        // We parse the json file instead of using require because require caches
        // multiple calls so the version number won't be updated
        return JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
    }
});

gulp.task('build', function(callback) {
    runSequence(
        'build:app',
        // 'bundle:app',
    function (error) {
        if (error) {
            console.log(error.message);
        }
        
        callback(error);
    }
    );
});

gulp.task('test', function(callback) {
    runSequence(
        'test:app',
        // 'test:browser',
    function (error) {
        if (error) {
            console.log(error.message);
        }
        
        callback(error);
    }
    );
});

gulp.task('doc', function(cb) {
    runSequence(
        'doc:app',
        'doc:api',
        'doc:api:full',
    function(error) {
        if (error) {
            console.log(error.message);
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
            console.log(error.message);
        }
        
        cb(error);
    });
});

gulp.task('release', function (callback) {
    runSequence(
        'generate',
        // git add build/browser
        // 'version',
        // 'changelog',
        // 'commit-changes',
        // 'push-changes',
        // 'create-new-tag',
        // 'github-release',
    function (error) {
        if (error) {
            console.log(error.message);
        } else {
            console.log('RELEASE FINISHED SUCCESSFULLY');
        }
        
        callback(error);
    });
});

// gulp.task('test-client', ['bundle-test'], function() {
//     return gulp.src('tests/fixtures/index.html')
//         .pipe(mochaPhantomJS({reporter: 'nyan'}));
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