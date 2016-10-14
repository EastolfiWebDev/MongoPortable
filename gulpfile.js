var gulp = require('gulp');
var runSequence = require('run-sequence');
var conventionalChangelog = require('gulp-conventional-changelog');
var conventionalGithubReleaser = require('conventional-github-releaser');
var bump = require('gulp-bump');
var gutil = require('gulp-util');
var git = require('gulp-git');
var fs = require('fs');
var minimist = require('minimist');

var knownOptions = {
    boolean: ['major', 'minor', 'patch'],
    alias: { major: 'M', minor: 'm', patch: 'p' },
    default: { major: false, minor: false, patch: false, M: false, m: false, p: false }
};

var options = minimist(process.argv.slice(2), knownOptions);

gulp.task('changelog', function () {
    return gulp.src('CHANGELOG.md', {
        buffer: false
    })
    .pipe(conventionalChangelog({
        preset: 'angular' // Or to any other commit message convention you use.
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('github-release', function(done) {
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

gulp.task('release', function (callback) {
    runSequence(
        // run test on souºrce
        // compile
        // run test on build
        // bundle
        // run browser test
        // add build/browser
        'version',
        'changelog',
        'commit-changes',
        'push-changes',
        'create-new-tag',
        'github-release',
    function (error) {
        if (error) {
            console.log(error.message);
        } else {
            console.log('RELEASE FINISHED SUCCESSFULLY');
        }
        callback(error);
    });
});