#!/bin/bash

# HandTyped - Gesture-to-Key Mapping Application
# Run script with OpenCV environment setup

set -e  # Exit on any error

# Check if OpenCV is installed
if ! pkg-config --exists opencv4; then
    echo "Error: OpenCV4 not found. Please install OpenCV4 first."
    echo "On macOS: brew install opencv"
    echo "On Ubuntu: sudo apt-get install libopencv-dev"
    echo "On Windows: Download from https://opencv.org/"
    exit 1
fi

# Set up OpenCV environment variables
export CGO_CPPFLAGS="-I/usr/local/include/opencv4"
export CGO_LDFLAGS="-L/usr/local/lib"
export DYLD_LIBRARY_PATH="/usr/local/lib:$DYLD_LIBRARY_PATH"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed. Please install Go first."
    echo "Download from: https://golang.org/dl/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -f "go.mod" ]; then
    echo "Error: go.mod not found. Please run 'go mod init' first."
    exit 1
fi

# Download dependencies
echo "Downloading dependencies..."
go mod download

# Build the application
echo "Building HandTyped..."
go build -o handtyped-go .

# Check if build was successful
if [ ! -f "handtyped-go" ]; then
    echo "Error: Build failed. Please check the error messages above."
    exit 1
fi

echo "Build successful! Running HandTyped..."

# Run the application with default config
./handtyped-go "$@"
