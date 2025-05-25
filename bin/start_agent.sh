#!/bin/bash
PROMPT="$SLACK_AGENT_PROMPT"
mkdir -p sessions/$SLACK_THREAD_TS
cd sessions/$SLACK_THREAD_TS
claude -c --output-format stream-json -p --verbose  "$PROMPT" | claude-posts --bot-token=$SLACK_BOT_TOKEN --channel-id=$SLACK_CHANNEL_ID --thread-ts=$SLACK_THREAD_TS &
