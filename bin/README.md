# GitHub Setup Script

## Overview

`setup_github.sh` automatically sets up GitHub authentication and MCP server configuration for the Slack Agent.

## Features

- GitHub App authentication with JWT token generation
- Installation token creation and management
- GitHub MCP server configuration
- Repository cloning with authentication
- GitHub Enterprise support

## Environment Variables

### Required for GitHub App Authentication
- `GITHUB_APP_PEM_PATH`: Path to the GitHub App private key (PEM file)
- `GITHUB_APP_ID`: GitHub App ID
- `GITHUB_INSTALLATION_ID`: GitHub App Installation ID

### Required for Repository Operations
- `GITHUB_REPO_URL`: Repository URL to clone
  - Example: `https://github.com/owner/repository.git`
  - Example: `https://github.enterprise.com/owner/repository.git`

### Optional
- `GITHUB_HOST`: GitHub Enterprise hostname (default: github.com)
- `GITHUB_API`: GitHub API URL (default: https://api.github.com)
- `GITHUB_CLONE_DIR`: Clone destination directory (default: current directory)

## Usage

The script is automatically executed by `prestart_agent.sh` when `GITHUB_REPO_URL` is set.

### Manual execution:
```bash
./bin/setup_github.sh
```

## What it does

1. **GitHub App Authentication**: If PEM file exists, generates JWT token and obtains installation token
2. **MCP Server Setup**: Creates GitHub MCP server configuration at `.config/mcp/github-server.json`
3. **Repository Cloning**: Clones the specified repository with authentication if available

## Output

- `GITHUB_TOKEN`: Generated installation token (exported to environment)
- `GITHUB_CLONE_DIR`: Directory where repository was cloned
- `.config/mcp/github-server.json`: MCP server configuration file

## Example Setup

```bash
export GITHUB_APP_PEM_PATH="/path/to/app.pem"
export GITHUB_APP_ID="123456"
export GITHUB_INSTALLATION_ID="789012"
export GITHUB_REPO_URL="https://github.com/owner/repo.git"

# Script will automatically:
# 1. Generate installation token
# 2. Setup MCP server
# 3. Clone repository to current directory
```

## GitHub Enterprise

For GitHub Enterprise instances:

```bash
export GITHUB_HOST="github.enterprise.com"
export GITHUB_API="https://github.enterprise.com/api/v3"
```