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
run_test = $(grunt) test

coveralls = $(grunt) coveralls_dist

# Publishing #
npm_publish = npm publish

# Cleaning #
clean_test = rm -rf test/coverage && rm -rf test/results && rm -rf lib-cov

## Actions ##

# Running Tests #

test: bundle
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

# Building Application #

build:
	$(build_app)
	
bundle: build
	$(compress_bundle)
	
build_all: build bundle build_full_doc test coverage
	
# Building Documentation #

build_web_doc: build
	$(build_web_full)
	
build_api_doc: build
	$(build_api_full)
	
build_full_doc: build
	$(build_web_full)
	$(build_api_full)
	
## Publishg ##

# NPM #

npm_major: test
	npm version major --no-git-tag-version
	git commit -m "VERSION: New major version released"

npm_minor: test
	npm version minor --no-git-tag-version
	git commit -m "VERSION: New minor version released"

npm_patch: test
	npm version patch --no-git-tag-version
	git commit -m "VERSION: New patch released"

# Bower #

bower_major: test
	bower version major -m "VERSION: New major version released (v%s)"
	git push -u origin --follow-tags

bower_minor: test
	bower version minor -m "VERSION: New minor version released (v%s)"
	git push -u origin --follow-tags

bower_patch: test
	bower version patch -m "VERSION: New patch released (v%s)"
	git push -u origin --follow-tags
	
# NPM & Bower #
	
publish_major:
	make npm_major
	make bower_major
	npm publish
	
publish_minor:
	make npm_minor
	make bower_minor
	npm publish
	
publish_patch:
	make npm_patch
	make bower_patch
	npm publish
	
.PHONY: build_all, publish_major, publish_minor, publish_patch