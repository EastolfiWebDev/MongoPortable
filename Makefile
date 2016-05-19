## Variables ##

# Global Packages #
grunt = ./node_modules/.bin/grunt
mocha = ./node_modules/.bin/mocha
coveralls = ./node_modules/.bin/coveralls
jscoverage = ./node_modules/.bin/jscoverage

# Building #
build_app = $(grunt) build_app

build_web_full = $(grunt) build_doc

build_api_full = $(grunt) build_html

# Testing #
run_test = $(grunt) run_test

coveralls = $(grunt) coveralls_dist

# Publishing #
npm_publish = npm publish

# Cleaning #
clean_test = 	rm -rf test/coverage && rm -rf test/results && rm -rf lib-cov

## Actions ##

# Building Application #

build:
	$(build_app)
	
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

.PHONY: build_all