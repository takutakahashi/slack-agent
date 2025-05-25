#!/bin/bash
PROMPT=$1
echo "Response to: $PROMPT"
echo "Channel: $SLACK_CHANNEL_ID"
echo "Thread: $SLACK_THREAD_TS"
echo "Test successful response"
echo '{"result": "completed"}'
