## Variables ##

build_app = ./node_modules/.bin/grunt build_app

build_web_full = ./node_modules/.bin/grunt build_doc

build_api_full = ./node_modules/.bin/grunt build_html

run_test = ./node_modules/.bin/grunt run_test

npm_publish = npm publish

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

# NPM Publishing #

build_all: build build_full_doc test

.PHONY: build_all