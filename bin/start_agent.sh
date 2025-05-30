#!/bin/bash

cleanup() {
    if [ ! -z "$BACKGROUND_PID" ]; then
        kill $BACKGROUND_PID 2>/dev/null
        wait $BACKGROUND_PID 2>/dev/null
    fi
    exit
}

trap cleanup SIGTERM SIGINT

PROMPT="$SLACK_AGENT_PROMPT"
mkdir -p sessions/$SLACK_THREAD_TS
cd sessions/$SLACK_THREAD_TS

mise exec -- claude -c --output-format stream-json --dangerously-skip-permissions --disallowedTools "$DISALLOWED_TOOLS" -p --verbose $CLAUDE_EXTRA_ARGS "$PROMPT" | claude-posts --bot-token=$SLACK_BOT_TOKEN --channel-id=$SLACK_CHANNEL_ID --thread-ts=$SLACK_THREAD_TS &
BACKGROUND_PID=$!

wait $BACKGROUND_PID
