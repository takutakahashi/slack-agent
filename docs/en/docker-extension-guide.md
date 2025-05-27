# Slack Agent Docker Extension Guide

This guide explains how to extend the Slack Agent Docker image to integrate additional MCP servers.

## Table of Contents

1. [Overview](#overview)
2. [Basic Extension Method](#basic-extension-method)
3. [Adding MCP Servers](#adding-mcp-servers)
4. [Custom Prompt Configuration](#custom-prompt-configuration)
5. [Extended Dockerfile Examples](#extended-dockerfile-examples)
6. [Best Practices](#best-practices)

## Overview

The Slack Agent Docker image is designed to be extended with additional MCP servers and custom configurations. This allows you to maintain the core functionality of Slack Agent while customizing it for specific use cases.

## Basic Extension Method

To extend the Slack Agent image, use the following basic approach:

1. Use the official image as a base image
2. Install additional tools and libraries
3. Add MCP server configurations
4. Add custom prompts and system settings

Basic Dockerfile structure:

```dockerfile
# Use the official Slack Agent image as the base image
FROM ghcr.io/takutakahashi/slack-agent:latest

# Install additional tools and libraries
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy custom configuration files
COPY config/custom-prompt.txt /app/config/
COPY config/agent-config.yaml /app/config/

# Set environment variables
ENV SYSTEM_PROMPT_PATH=/app/config/custom-prompt.txt
ENV GENERIC_AGENT_YAML=/app/config/agent-config.yaml

# Run a script to add MCP servers when the container starts
COPY scripts/setup.sh /app/scripts/
RUN chmod +x /app/scripts/setup.sh
ENTRYPOINT ["/app/scripts/setup.sh"]
```

## Adding MCP Servers

There are two main methods to add MCP servers:

### 1. Using a YAML Configuration File

Create an `agent-config.yaml` file defining your MCP server configurations:

```yaml
# Agent Configuration
name: "Custom Assistant"
instructions: |
  You are a customized assistant.
  You have specific business knowledge and can answer specialized questions.
model: "gpt-4o"

# MCP Server Configuration
mcp_servers:
  # Database query tool
  database:
    command: node
    args:
      - /app/tools/database-query.js
    env:
      DB_HOST: localhost
      DB_USER: user
      DB_PASS: password
      DB_NAME: mydb

  # External API service
  externalApi:
    url: http://api-service:8080/api
```

Copy this YAML file to your container and specify it with the `GENERIC_AGENT_YAML` environment variable.

### 2. Adding MCP Servers at Startup

You can dynamically add MCP servers at container startup using the `add_mcp_servers.sh` script. This is useful when retrieving configurations from environment variables or generating them dynamically.

For example, create a script like this:

```bash
#!/bin/bash
# setup.sh

# Add database MCP server
/usr/local/bin/add_mcp_servers.sh "database" '{
  "command": "node",
  "args": ["/app/tools/database-query.js"],
  "env": {
    "DB_HOST": "'${DB_HOST}'",
    "DB_USER": "'${DB_USER}'",
    "DB_PASS": "'${DB_PASS}'",
    "DB_NAME": "'${DB_NAME}'"
  }
}'

# Add external API server
/usr/local/bin/add_mcp_servers.sh "externalApi" '{
  "url": "'${API_URL}'"
}'

# Run the original entrypoint
exec bun run dist/index.js
```

## Custom Prompt Configuration

To set a custom system prompt, create a prompt file and copy it to your container:

```
You are an assistant customized for a specific industry.
Please respond with attention to the following points:

1. Use industry-specific terminology appropriately
2. Provide accurate information about regulations and compliance
3. Consider the latest industry trends in your responses
```

Copy this file to your container and specify it with the `SYSTEM_PROMPT_PATH` environment variable.

## Extended Dockerfile Examples

Here's a complete Dockerfile example for creating a custom Slack Agent with database connection and API access capabilities:

```dockerfile
FROM ghcr.io/takutakahashi/slack-agent:latest

# Install necessary tools
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js tools
RUN mise exec -- npm install -g \
    pg \
    axios \
    dotenv

# Set working directory
WORKDIR /app

# Copy custom tools
COPY tools/database-query.js /app/tools/
COPY tools/api-client.js /app/tools/

# Copy custom configuration files
COPY config/custom-prompt.txt /app/config/
COPY config/agent-config.yaml /app/config/

# Copy startup script
COPY scripts/setup.sh /app/scripts/
RUN chmod +x /app/scripts/setup.sh

# Set environment variables
ENV SYSTEM_PROMPT_PATH=/app/config/custom-prompt.txt
ENV GENERIC_AGENT_YAML=/app/config/agent-config.yaml

# Run script at container startup
ENTRYPOINT ["/app/scripts/setup.sh"]
```

## Best Practices

### Security

1. **Managing Sensitive Information**
   - Pass sensitive information like API keys and passwords as environment variables, not directly in the Dockerfile
   - When possible, use Docker Secrets or volume mounts to manage sensitive information

2. **Principle of Least Privilege**
   - Grant only the minimum necessary permissions to your container
   - Run the container as a non-root user when possible

### Performance

1. **Optimizing Image Size**
   - Avoid installing unnecessary packages and files
   - Utilize multi-stage builds to reduce the final image size

2. **Leveraging Caching**
   - Place layers that change less frequently earlier in the Dockerfile to effectively use Docker's build cache

### Maintainability

1. **Documentation**
   - Document the functionality and usage of custom MCP servers
   - Clearly specify required environment variables and their purpose

2. **Version Control**
   - Base your image on a specific version of the Slack Agent image (avoid using the `latest` tag)
   - Apply appropriate version tags to your custom images
