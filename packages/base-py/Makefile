.PHONY: all clean build publish publish-to-testpypi

# official release
all: clean build publish

# test release
test: clean build publish-to-testpypi

clean:
	rm -rf dist

build:
	poetry build

# publish to pypi
publish:
	poetry publish

# publish to testpypi
publish-to-testpypi:
	poetry publish -r test-pypi