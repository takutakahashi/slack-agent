#!/bin/bash
PROMPT="$SLACK_AGENT_PROMPT"
echo "Response to: $PROMPT"
echo "Channel: $SLACK_CHANNEL_ID"
echo "Thread: $SLACK_THREAD_TS"
echo "Extra Args: $CLAUDE_EXTRA_ARGS"
echo "Test successful response"
echo '{"result": "completed"}'
