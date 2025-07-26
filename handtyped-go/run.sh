#!/bin/bash

export CGO_CPPFLAGS="-I/usr/local/include/opencv4"
export CGO_LDFLAGS="-L/usr/local/lib"
export DYLD_LIBRARY_PATH="/usr/local/lib:$DYLD_LIBRARY_PATH"

go run main.go
