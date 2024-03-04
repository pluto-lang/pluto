.PHONY: all clean build package upload

all: clean build package upload

clean:
	rm -rf dist

build:
	python3 -m build

check:
	python3 -m twine check dist/*

publish:
	python3 -m twine upload dist/*
