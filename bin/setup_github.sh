#!/bin/bash

set -e

# Check if GitHub App PEM file exists and generate installation token
if [ -n "$GITHUB_APP_PEM_PATH" ] && [ -f "$GITHUB_APP_PEM_PATH" ]; then
    echo "GitHub App PEM file found at $GITHUB_APP_PEM_PATH"
    
    # Check required environment variables for GitHub App
    if [ -z "$GITHUB_APP_ID" ] || [ -z "$GITHUB_INSTALLATION_ID" ]; then
        echo "Warning: GITHUB_APP_ID and GITHUB_INSTALLATION_ID are required for GitHub App authentication"
        exit 0
    fi
    
    echo "Generating GitHub installation token..."
    
    # Set GitHub API URL (support for GitHub Enterprise)
    GITHUB_API_URL="${GITHUB_API:-https://api.github.com}"
    
    # Generate JWT token
    HEADER='{"alg":"RS256","typ":"JWT"}'
    NOW=$(date +%s)
    IAT=$((NOW - 60))
    EXP=$((NOW + 600))
    PAYLOAD="{\"iat\":$IAT,\"exp\":$EXP,\"iss\":\"$GITHUB_APP_ID\"}"
    
    # Base64 encode header and payload
    HEADER_B64=$(echo -n "$HEADER" | base64 | tr -d '=' | tr '+/' '-_' | tr -d '\n')
    PAYLOAD_B64=$(echo -n "$PAYLOAD" | base64 | tr -d '=' | tr '+/' '-_' | tr -d '\n')
    
    # Create signature
    SIGNATURE=$(echo -n "${HEADER_B64}.${PAYLOAD_B64}" | openssl dgst -sha256 -sign "$GITHUB_APP_PEM_PATH" | base64 | tr -d '=' | tr '+/' '-_' | tr -d '\n')
    
    # Create JWT
    JWT="${HEADER_B64}.${PAYLOAD_B64}.${SIGNATURE}"
    
    # Get installation token
    INSTALLATION_TOKEN=$(curl -s -X POST \
        -H "Authorization: Bearer $JWT" \
        -H "Accept: application/vnd.github.v3+json" \
        "${GITHUB_API_URL}/app/installations/$GITHUB_INSTALLATION_ID/access_tokens" | \
        grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "$INSTALLATION_TOKEN" ]; then
        export GITHUB_TOKEN="$INSTALLATION_TOKEN"
        echo "GitHub installation token generated successfully"
    else
        echo "Failed to generate GitHub installation token"
        exit 1
    fi
fi

# Setup GitHub MCP server if GITHUB_TOKEN is available
if [ -n "$GITHUB_TOKEN" ]; then
    echo "Setting up GitHub MCP server..."
    
    # Create MCP config directory if it doesn't exist
    MCP_CONFIG_DIR="${HOME}/.config/mcp"
    mkdir -p "$MCP_CONFIG_DIR"
    
    # Set GitHub host for MCP server (support for GitHub Enterprise)
    GITHUB_HOST_ENV=""
    if [ -n "$GITHUB_HOST" ]; then
        GITHUB_HOST_ENV=",\"GITHUB_HOST\": \"$GITHUB_HOST\""
    fi
    
    # Create or update MCP server config for GitHub
    cat > "$MCP_CONFIG_DIR/github-server.json" << EOF
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "$GITHUB_TOKEN"${GITHUB_HOST_ENV}
      }
    }
  }
}
EOF
    
    echo "GitHub MCP server configuration created at $MCP_CONFIG_DIR/github-server.json"
    
    # Export GITHUB_TOKEN so it can be used by parent process
    echo "export GITHUB_TOKEN=\"$GITHUB_TOKEN\"" > /tmp/github_env_$$
fi

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
    echo "export GITHUB_CLONE_DIR=\"$CLONE_DIR\"" >> /tmp/github_env_$$
fi

echo "GitHub setup completed successfully"