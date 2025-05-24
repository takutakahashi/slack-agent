#!/bin/bash
PROMPT=$1
# SLACK_CHANNEL_ID="" SLACK_THREAD_TS="" SLACK_BOT_TOKEN=""
claude --output-format stream-json -p --verbose "$PROMPT" | claude-posts
