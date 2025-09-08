#!/bin/bash

# TODO: do system env values override .env values?

set -e  # Exit on any error

# Configuration
IMAGE_NAME="discord-music-bot"
TAG="latest"

# Load environment variables from .env file
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Warning: .env file not found. Create one with your DISCORD_TOKEN."
    echo "Example: echo 'DISCORD_TOKEN=your_token_here' > .env"
fi

# Build the Docker image
echo "Building Docker image: ${IMAGE_NAME}:${TAG}"

docker build \
    --build-arg DISCORD_TOKEN="${DISCORD_TOKEN}" \
    -t "${IMAGE_NAME}:${TAG}" \
    .

echo "Build completed successfully!"
echo "Run with: docker run ${IMAGE_NAME}:${TAG}"
