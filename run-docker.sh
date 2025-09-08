#!/bin/bash

IMAGE_NAME="discord-music-bot:latest"

if [ -f .env ]; then
    echo "Running with .env file..."
    docker run --env-file .env $IMAGE_NAME
else
    echo "No .env file found. Please create one or pass environment variables manually."
    echo "Example: docker run -e DISCORD_TOKEN=\"your_token\" $IMAGE_NAME"
    exit 1
fi
