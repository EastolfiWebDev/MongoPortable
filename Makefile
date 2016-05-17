build:
	./node_modules/.bin/grunt build
	
doc: build
	./node_modules/.bin/grunt build_doc
	
test: build
	./node_modules/.bin/grunt run_test
	
release-patch: build test
	npm version patch

release-minor: build test
	npm version minor

release-major: build test
	npm version major
	
publish: test doc
	npm -v #npm publish