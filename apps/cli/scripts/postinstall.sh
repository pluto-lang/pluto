#!/bin/bash

# If this is a release build and we are in CI, skip this script to avoid modifying the source code
if [ "$RELEASE" = "true" ] && [ "$CI" = "true" ]; then
    echo "Skipping postinstall.sh"
    exit 0
fi

languages=("python" "typescript")
files=("gitignore" "env" "env.local")

for language in "${languages[@]}"; do
    for file in "${files[@]}"; do
        source="template/$language/$file"
        target="template/$language/.$file"
        if [ -f "$source" ]; then
            mv $source $target
        fi
    done
done
