#!/bin/bash

set -e

env > /tmp/prestart_env_$$

# GITHUB_REPO_URLがセットされていたらsetup_github.shを実行
if [ -n "$GITHUB_REPO_URL" ]; then
    setup_github.sh
fi

export PRESTART_COMPLETED=true

echo "prestart_agent.sh completed successfully"
