#!/bin/bash
PROMPT="$SLACK_AGENT_PROMPT"
mkdir -p sessions/$SLACK_THREAD_TS
cd sessions/$SLACK_THREAD_TS
mise exec -- claude -c --output-format stream-json --dangerously-skip-permissions --disallowedTools "Bash,Edit,MultiEdit,Write,NotebookRead,NotebookEdit,WebFetch,TodoRead,TodoWrite,WebSearch" -p --verbose $CLAUDE_EXTRA_ARGS "$PROMPT" | claude-posts --bot-token=$SLACK_BOT_TOKEN --channel-id=$SLACK_CHANNEL_ID --thread-ts=$SLACK_THREAD_TS &
