#!/bin/bash
PROMPT="$SLACK_AGENT_PROMPT"
SYSTEM_PROMPT="$SLACK_AGENT_SYSTEM_PROMPT"

mkdir -p sessions/$SLACK_THREAD_TS
cd sessions/$SLACK_THREAD_TS

if [ -n "$SYSTEM_PROMPT" ]; then
  claude -c --system "$SYSTEM_PROMPT" --output-format stream-json -p --verbose "$PROMPT" | claude-posts --bot-token=$SLACK_BOT_TOKEN --channel-id=$SLACK_CHANNEL_ID --thread-ts=$SLACK_THREAD_TS &
else
  claude -c --output-format stream-json -p --verbose "$PROMPT" | claude-posts --bot-token=$SLACK_BOT_TOKEN --channel-id=$SLACK_CHANNEL_ID --thread-ts=$SLACK_THREAD_TS &
fi
