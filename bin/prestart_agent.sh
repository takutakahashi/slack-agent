#!/bin/bash

set -e

env > /tmp/prestart_env_$$

# Clone repository if GITHUB_REPO_URL is set
if [ -n "$GITHUB_REPO_URL" ]; then
    echo "Cloning repository: $GITHUB_REPO_URL"
    
    # Set clone directory (default to session directory)
    CLONE_DIR="${GITHUB_CLONE_DIR:-$(pwd)}"
    
    # Remove existing directory if it exists
    if [ -d "$CLONE_DIR" ]; then
        echo "Removing existing directory: $CLONE_DIR"
        rm -rf "$CLONE_DIR"
    fi
    
    # Clone the repository
    if [ -n "$GITHUB_TOKEN" ]; then
        # Clone with token authentication
        REPO_URL_WITH_TOKEN=$(echo "$GITHUB_REPO_URL" | sed "s|https://|https://x-access-token:${GITHUB_TOKEN}@|")
        git clone "$REPO_URL_WITH_TOKEN" "$CLONE_DIR"
    else
        # Clone without authentication (public repos)
        git clone "$GITHUB_REPO_URL" "$CLONE_DIR"
    fi
    
    echo "Repository cloned to: $CLONE_DIR"
    export GITHUB_CLONE_DIR="$CLONE_DIR"
fi

export PRESTART_COMPLETED=true

echo "prestart_agent.sh completed successfully"
