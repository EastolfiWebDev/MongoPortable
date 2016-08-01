var banner = '' +
'/**\n' +
' * MongoPortable - Solution for a MongoDB-like portable database.\n' +
' * version <%= pkg.version %>\n' +
' * \n' +
' * made by Eduardo Astolfi <eastolfi91@gmail.com>\n' +
' * copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>\n' +
' * MIT Licensed\n' +
' */\n';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
    
        watch: {
            dist: {
                files: ['src/**/*.js'],
                tasks: ['build_app'],
                options: {
                    spawn: false,
                }
            }
        },
        
        babel: {
            options: {
                sourceMaps: "inline",
                compact: false
            },
            dist: {
                files: {
                    "lib/utils/EventEmitter.js":        "src/utils/EventEmitter.js",
                    "lib/BinaryParserBuffer.js":        "src/BinaryParserBuffer.js",
                    "lib/BinaryParser.js":              "src/BinaryParser.js",
                    "lib/ObjectId.js":                  "src/ObjectId.js",
                    "lib/SelectorMatcher.js":           "src/SelectorMatcher.js",
                    "lib/Selector.js":                  "src/Selector.js",
                    "lib/Cursor.js":                    "src/Cursor.js",
                    "lib/Collection.js":                "src/Collection.js",
                    "lib/MongoPortable.js":             "src/MongoPortable.js"
                }
            }
        },
    
        simplemocha: {
            all: {
                src: ['test/1_ObjectId.js', 'test/2_Selector.js',
                        'test/3_Cursor.js', 'test/4_Collection.js',
                        'test/5_MongoPortable.js', 'test/6_Coverage.js']
            }
        },
        
        jsdoc : {
            dist : {
                src: ['src/MongoPortable.js', 'src/Collection.js', 'src/Cursor.js',
                        'src/Selector.js', 'src/ObjectId.js'],
                options: {
                    destination: 'doc',
                    config: 'jsdoc.conf.json'
                }
            }
        },
        
        jsdoc2md: {
            fullDoc: {
                src: ['src/MongoPortable.js', 'src/Collection.js', 'src/Cursor.js'],
                dest: 'api/documentation.md'
            },
            apiDoc: {
                files: [
                    { src: 'src/MongoPortable.js', dest: 'api/MongoPortable.md' },
                    { src: 'src/Collection.js', dest: 'api/Collection.md' },
                    { src: 'src/Cursor.js', dest: 'api/Cursor.md' }
                ]
            }
        },
        
        coveralls: {
            options: {
                force: false
            },
            
            dist: {
                src: ['test/coverage/coverage-dist.lcov'],
                options: { }
            }
        },
        
        browserify: {
            dist: {
                files: {
                    'dist/mongo-portable.js': ['./index.js']
                }
            },
            browser: {
                files: {
                    './dist/src/index.js':              './browser/index.js'
                },
                options: {
                    transform: [['babelify', {presets: ['es2015', 'react']}]],
                    alias: {
                        'mongo-portable':      './browser/MongoPortable.js',
                    }
                }
            },
            options: {
                banner: banner
            }
        },
        
        uglify: {
            dist: {
                files: {
                    'dist/mongo-portable.min.js': ['dist/mongo-portable.js']
                }
            },
            options: {
                banner: banner
            }
        }
    });

    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-babel');
    grunt.loadNpmTasks('grunt-jsdoc');
    grunt.loadNpmTasks('grunt-jsdoc-to-markdown');
    grunt.loadNpmTasks('grunt-coveralls');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-browserify');
    
    // Building
    grunt.registerTask('watch_dist', ['watch:dist']);
    grunt.registerTask('build_app', ['babel:dist']);
    grunt.registerTask('bundle', ['browserify:browser', 'uglify:dist']);
    
    // Documentation
    grunt.registerTask('build_doc', ['jsdoc:dist']);
    grunt.registerTask('build_html', ['jsdoc2md:fullDoc', 'jsdoc2md:apiDoc']);
    grunt.registerTask('build_full_doc', ['build_doc', 'build_html']);
    
    // Testing
    grunt.registerTask('dev_test', ['simplemocha:dev']);
    grunt.registerTask('run_test', ['simplemocha:all']);
    grunt.registerTask('coveralls_dist', ['coveralls:dist']);
    
    grunt.registerTask('full_build', ['build_app', 'build_doc', 'run_test']);
    
    grunt.registerTask('default', ['full_build']);
};