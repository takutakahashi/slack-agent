#!/bin/bash

set -e

env > /tmp/prestart_env_$$

# Setup GitHub if GITHUB_REPO_URL is set
if [ -n "$GITHUB_REPO_URL" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$SCRIPT_DIR/setup_github.sh" ]; then
        echo "Running GitHub setup..."
        source "$SCRIPT_DIR/setup_github.sh"
        
        # Source the GitHub environment if it was created
        if [ -f "/tmp/github_env_$$" ]; then
            source "/tmp/github_env_$$"
            rm -f "/tmp/github_env_$$"
        fi
    fi
fi

export PRESTART_COMPLETED=true

echo "prestart_agent.sh completed successfully"
