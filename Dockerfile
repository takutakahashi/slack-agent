# Build stage
FROM golang:1.23-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git make

# Set working directory
WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN make build

# claude-posts binary stage
FROM ghcr.io/takutakahashi/claude-posts:v0.1.4 as claude-posts

# Final stage
FROM ubuntu:22.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    bash \
    curl \
    git \
    nodejs \
    npm \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN adduser --disabled-password --uid 1000 appuser

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/build/slack-agent /usr/local/bin/slack-agent

# Copy claude-posts binary
COPY --from=claude-posts /root/claude-posts /usr/local/bin/claude-posts
RUN chmod +x /usr/local/bin/claude-posts

# Copy bin scripts
COPY bin/add_mcp_servers.sh /usr/local/bin/add_mcp_servers.sh
COPY bin/prestart_agent.sh /usr/local/bin/prestart_agent.sh
COPY bin/setup_github.sh /usr/local/bin/setup_github.sh
COPY bin/start_agent.sh /usr/local/bin/start_agent.sh
RUN chmod +x /usr/local/bin/add_mcp_servers.sh /usr/local/bin/prestart_agent.sh /usr/local/bin/setup_github.sh /usr/local/bin/start_agent.sh

# Install mise
USER appuser
RUN curl -fsSL https://claude.ai/install.sh | bash
RUN curl https://mise.run | sh
ENV PATH="/home/appuser/.local/bin:$PATH"

# Copy claude.json
COPY --chown=appuser:appuser config/claude.json /home/appuser/.claude.json

# Change ownership
USER root
RUN chown -R appuser:appuser /app
USER appuser

# Expose port (if using Web API mode)
EXPOSE 3000

# Run the application
ENTRYPOINT ["slack-agent"]
CMD ["start"]
