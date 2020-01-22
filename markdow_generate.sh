#!/bin/bash

for filename in */index.md; do
	dir=$(dirname $filename)
	pandoc $filename --template=template.html -o $dir/index.html
	echo "$dir/index.html generated"
done
