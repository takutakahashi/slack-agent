#!/bin/bash

set -e

# 必須環境変数チェック
if [ -z "$GITHUB_REPO_URL" ]; then
    echo "Error: GITHUB_REPO_URL が設定されていません。"
    exit 1
fi

# GITHUB_TOKEN もしくは GitHub App認証用セットのいずれかが必要
if [ -z "$GITHUB_TOKEN" ]; then
    if [ -z "$GITHUB_APP_PEM_PATH" ] || [ -z "$GITHUB_APP_ID" ] || [ -z "$GITHUB_INSTALLATION_ID" ]; then
        echo "Error: GITHUB_TOKEN もしくは GitHub App認証用の GITHUB_APP_PEM_PATH, GITHUB_APP_ID, GITHUB_INSTALLATION_ID のいずれかが設定されていません。"
        exit 1
    fi
fi

# Check if GitHub App PEM file exists and generate installation token
get_github_app_token() {
    if [ -n "$GITHUB_APP_PEM_PATH" ] && [ -f "$GITHUB_APP_PEM_PATH" ]; then
        echo "GitHub App PEM file found at $GITHUB_APP_PEM_PATH"
        if [ -z "$GITHUB_APP_ID" ] || [ -z "$GITHUB_INSTALLATION_ID" ]; then
            echo "Warning: GITHUB_APP_ID and GITHUB_INSTALLATION_ID are required for GitHub App authentication"
            return 1
        fi
        echo "Generating GitHub installation token..."
        GITHUB_API_URL="${GITHUB_API:-https://api.github.com}"
        HEADER='{"alg":"RS256","typ":"JWT"}'
        NOW=$(date +%s)
        IAT=$((NOW - 60))
        EXP=$((NOW + 600))
        PAYLOAD="{\"iat\":$IAT,\"exp\":$EXP,\"iss\":\"$GITHUB_APP_ID\"}"
        HEADER_B64=$(echo -n "$HEADER" | base64 | tr -d '=' | tr '+/' '-_' | tr -d '\n')
        PAYLOAD_B64=$(echo -n "$PAYLOAD" | base64 | tr -d '=' | tr '+/' '-_' | tr -d '\n')
        SIGNATURE=$(echo -n "${HEADER_B64}.${PAYLOAD_B64}" | openssl dgst -sha256 -sign "$GITHUB_APP_PEM_PATH" | base64 | tr -d '=' | tr '+/' '-_' | tr -d '\n')
        JWT="${HEADER_B64}.${PAYLOAD_B64}.${SIGNATURE}"
        INSTALLATION_TOKEN=$(curl -s -X POST \
            -H "Authorization: Bearer $JWT" \
            -H "Accept: application/vnd.github.v3+json" \
            "${GITHUB_API_URL}/app/installations/$GITHUB_INSTALLATION_ID/access_tokens" | \
            grep -o '"token":"[^\"]*' | cut -d'"' -f4)
        if [ -n "$INSTALLATION_TOKEN" ]; then
            export GITHUB_TOKEN="$INSTALLATION_TOKEN"
            echo "GitHub installation token generated successfully"
            return 0
        else
            echo "Failed to generate GitHub installation token"
            return 1
        fi
    fi
    return 1
}

# まずGITHUB_TOKENがセットされているか確認
if [ -z "$GITHUB_TOKEN" ]; then
    # 未セットならGitHub Appで取得を試みる
    get_github_app_token || true
fi

# GITHUB_TOKENがセットされていればクローン＆mcp addを実行
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_REPO_URL" ]; then
    echo "Cloning repository: $GITHUB_REPO_URL"
    CLONE_DIR="${GITHUB_CLONE_DIR:-$(pwd)}/repo"
    if [ -d "$CLONE_DIR/.git" ]; then
        echo "$CLONE_DIR は既にgitリポジトリです。pullで更新します。"
        cd "$CLONE_DIR"
        git pull
    else
        if [ ! -d "$CLONE_DIR" ]; then
            mkdir -p "$CLONE_DIR"
        fi
        REPO_URL_WITH_TOKEN=$(echo "$GITHUB_REPO_URL" | sed "s|https://|https://x-access-token:${GITHUB_TOKEN}@|")
        git clone "$REPO_URL_WITH_TOKEN" "$CLONE_DIR"
        cd "$CLONE_DIR"
    fi
    echo "Repository is ready at: $CLONE_DIR"
    export GITHUB_CLONE_DIR="$CLONE_DIR"
    echo "export GITHUB_CLONE_DIR=\"$CLONE_DIR\"" >> /tmp/github_env_$$
    mise exec -- claude mcp add github -- docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_TOKEN ghcr.io/github/github-mcp-server
fi

echo "GitHub setup completed successfully"