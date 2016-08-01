## Variables ##

# Global Packages #
grunt = ./node_modules/.bin/grunt
mocha = ./node_modules/.bin/mocha
coveralls = ./node_modules/.bin/coveralls
jscoverage = ./node_modules/.bin/jscoverage

# Building #
build_app = $(grunt) build_app

compress_bundle = $(grunt) bundle

build_web_full = $(grunt) build_doc

build_api_full = $(grunt) build_html

# Testing #
run_test = $(grunt) run_test

coveralls = $(grunt) coveralls_dist

# Publishing #
npm_publish = npm publish

# Cleaning #
clean_test = rm -rf test/coverage && rm -rf test/results && rm -rf lib-cov

## Actions ##

# Building Application #

build:
	$(build_app)
	
bundle: build
	$(compress_bundle)
	
# Building Documentation #

build_web_doc: build
	$(build_web_full)
	
build_api_doc: build
	$(build_api_full)
	
build_full_doc: build
	$(build_web_full)
	$(build_api_full)
	
# Running Tests #

test: build
	$(run_test)
	
do_coverage: test
	$(clean_test)
	mkdir test/coverage && mkdir test/results
	$(jscoverage) --no-highlight lib lib-cov
	mv lib lib-orig
	mv lib-cov lib
	$(mocha) test -R html-cov > test/results/coverage.html
	$(mocha) test -R mocha-lcov-reporter > test/coverage/coverage-dist.lcov
	rm -rf lib
	mv lib-orig lib
	
coverage: do_coverage
	$(coveralls)
	
# NPM Publishing #

build_all: build build_full_doc test coverage

# Bower Publishing #

bower_major: bundle test
	bower version major -m "VERSION: New major version released (v%s)"

bower_minor: bundle test
	bower version minor -m "VERSION: New minor version released (v%s)"

bower_patch: bundle test
	bower version patch -m "VERSION: New patch released (v%s)"
	
.PHONY: build_all