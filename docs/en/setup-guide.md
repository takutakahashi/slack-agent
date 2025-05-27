# Slack Agent Setup Guide

This guide explains how to set up Slack Agent, an AI assistant that operates in Slack workspaces and leverages Claude AI to enable natural conversations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Slack App Configuration](#slack-app-configuration)
3. [Anthropic API Key Setup](#anthropic-api-key-setup)
4. [Environment Variables](#environment-variables)
5. [MCP (Mastra Control Plane) Server Configuration](#mcp-mastra-control-plane-server-configuration)
6. [Running with Docker](#running-with-docker)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- [Bun](https://bun.sh/) v1.x
- Node.js v18 or higher (for type definitions)
- [Anthropic API Key](https://console.anthropic.com/)
- Admin privileges for a Slack workspace

## Slack App Configuration

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click "Create New App"
2. Select "From scratch"
3. Enter an app name (e.g., "AI Assistant") and select your workspace
4. Click "Create App"

### 2. Basic Information

In the "Basic Information" section, note the following:

- Under **App Credentials**, note your "Signing Secret" (you'll use this as an environment variable later)

### 3. Choose Socket Mode or HTTP Mode

#### Option A: Socket Mode (Recommended for Development)

1. Click "Socket Mode" in the left sidebar
2. Toggle "Enable Socket Mode" to On
3. Generate an App-Level Token with the `connections:write` scope
4. Note the generated token (starts with `xapp-`) for use as an environment variable

#### Option B: HTTP Mode (Recommended for Production)

1. Click "Event Subscriptions" in the left sidebar
2. Toggle "Enable Events" to On
3. Set the Request URL to: `https://your-domain/slack/events`
   - For local development, you can use a tool like [ngrok](https://ngrok.com) to create a temporary public URL
   - Example: Run `ngrok http 3000` and use the generated URL

### 4. Bot Permissions

1. Click "OAuth & Permissions" in the left sidebar
2. Under "Scopes", add the following Bot Token Scopes:
   - `app_mentions:read` (Mentions)
   - `chat:write` (Send messages)
   - `channels:history` (Channel history)
   - `groups:history` (Private channel history)
   - `im:history` (IM history)
   - `im:read` (Read IMs)
   - `im:write` (Write IMs)
   - `mpim:history` (Multi-person IM history)

### 5. Event Subscriptions

1. Click "Event Subscriptions" in the left sidebar
2. Under "Subscribe to bot events", add the following events:
   - `app_mention` (Mentions)
   - `message.channels` (Public channels)
   - `message.groups` (Private channels)
   - `message.im` (Direct messages)
   - `message.mpim` (Multi-person IMs)

### 6. Install the App

1. Click "Install App" in the left sidebar
2. Click "Install to Workspace" to install the app to your workspace
3. Note the "Bot User OAuth Token" (starts with `xoxb-`) for use as an environment variable

## Anthropic API Key Setup

Slack Agent uses Claude CLI to communicate with Anthropic's AI models. Follow these steps to set up your API Key:

### 1. Obtain an Anthropic API Key

1. Go to the [Anthropic Console](https://console.anthropic.com/) and create an account or log in
2. Create a new API key in the "API Keys" section
3. Note the generated API key (starts with `sk-`)

### 2. Configure Claude CLI Authentication

Claude CLI can be authenticated through environment variables or a configuration file. Choose one of the following methods:

#### Environment Variable Method (Recommended)

Set the `ANTHROPIC_API_KEY` environment variable:

```bash
export ANTHROPIC_API_KEY=sk-your-api-key
```

Or add it to your `.env` file:

```
ANTHROPIC_API_KEY=sk-your-api-key
```

#### Configuration File Method

Create a `~/.claude.json` file with the following content:

```json
{
  "apiKey": "sk-your-api-key"
}
```

### 3. Verify Authentication

To verify that authentication is set up correctly, run:

```bash
mise exec -- claude auth status
```

If configured correctly, you should see your authentication status.

## Environment Variables

To run Slack Agent, you need to set the following environment variables. Create a `.env` file or set them directly in your environment:

```bash
# Required Environment Variables
SLACK_BOT_TOKEN=xoxb-your-bot-token  # Slack Bot User OAuth Token
SLACK_SIGNING_SECRET=your-signing-secret  # Slack Signing Secret
ANTHROPIC_API_KEY=sk-your-api-key  # Anthropic API Key

# Optional Environment Variables
SLACK_APP_TOKEN=xapp-your-app-token  # Required for Socket Mode
GENERIC_AGENT_YAML=/path/to/your/agent-config.yaml  # MCP server configuration file path
PORT=3000  # Application port number
SYSTEM_PROMPT_PATH=/path/to/your/prompt.txt  # Custom system prompt
```

## MCP (Mastra Control Plane) Server Configuration

MCP servers allow you to add external tools and capabilities to your Slack Agent.

### 1. Create a YAML Configuration File

Create an `agent-config.yaml` file with content like this:

```yaml
# Agent Configuration
name: "Slack Custom Assistant"
instructions: |
  You are a custom assistant for Slack.
  - Answer user questions politely and concisely
  - Provide self-introduction or help when needed
  - Be helpful and friendly in all interactions
model: "gpt-4o"  # or "claude-3-opus-20240229", etc.

# MCP Server Configuration
mcp_servers:
  # Command-based server
  stockPrice:
    command: npx
    args:
      - -y
      - tsx
      - ./src/mastra/tools/stock-price.ts
    env:
      API_KEY: your-api-key

  # URL-based server
  weather:
    url: http://localhost:8080/sse
```

### 2. Set Environment Variable

Set the path to your YAML file in the environment variable:

```bash
export GENERIC_AGENT_YAML=/path/to/your/agent-config.yaml
```

### 3. Add MCP Servers (Docker Environment)

To add MCP servers in a Docker environment, use the `add_mcp_servers.sh` script:

```bash
/usr/local/bin/add_mcp_servers.sh "server_name" '{"command":"npx","args":["-y","tsx","./path/to/script.ts"]}'
```

## Running with Docker

### 1. Build the Image

```bash
docker build -t slack-agent .
```

### 2. Run the Container

```bash
docker run -p 3000:3000 \
  -e SLACK_BOT_TOKEN=xoxb-your-bot-token \
  -e SLACK_SIGNING_SECRET=your-signing-secret \
  -e ANTHROPIC_API_KEY=sk-your-api-key \
  -e SLACK_APP_TOKEN=xapp-your-app-token \
  slack-agent
```

Or using an environment file:

```bash
docker run -p 3000:3000 --env-file .env slack-agent
```

## Troubleshooting

### Slack Connection Issues

1. **Authentication Errors**
   - Verify that your Slack Bot Token and Signing Secret are correct
   - Ensure the app is properly installed to your workspace
   - Check that all required scopes are granted

2. **Event Subscription Issues**
   - Verify that event subscriptions are enabled
   - Ensure the bot is invited to the channels

### Claude CLI Issues

1. **Authentication Errors**
   - Verify that ANTHROPIC_API_KEY is set correctly
   - Check authentication status with `claude auth status`

2. **Execution Errors**
   - Ensure Claude CLI is properly installed
   - Verify that all dependencies are installed

### MCP Server Issues

1. **Configuration File Issues**
   - Check that your YAML file has correct syntax
   - Verify that the GENERIC_AGENT_YAML environment variable is set correctly

2. **Server Connection Issues**
   - Verify that server URLs are correct
   - Ensure that necessary credentials are configured
