#!/bin/bash

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
