.PHONY: all clean build package upload

all: clean build package upload

clean:
	rm -rf dist

build:
	python3 -m build

package:
	python3 -m twine check dist/*

upload:
	python3 -m twine upload dist/*
