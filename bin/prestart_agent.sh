#!/bin/bash



env > /tmp/prestart_env_$$

export PRESTART_COMPLETED=true

echo "prestart_agent.sh completed successfully"
