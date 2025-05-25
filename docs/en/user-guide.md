# Slack AI Assistant User Guide

## Overview

This Slack AI Assistant is a bot that enables intelligent conversations on Slack using the OpenAI API. It responds to various questions and requests through mentions and direct messages.

## Features

### 1. Mention Responses
- Can be used by mentioning the bot (`@bot`) in public or private channels
- Responses are always made in threads
- Supports multiple interactions

### 2. Direct Messages (DM)
- Enables private one-on-one conversations with the bot
- Supports threaded conversations

## Setup

### Environment Variables

Set the following environment variables in your `.env` file:

```bash
# Required Settings
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
OPENAI_API_KEY=your-openai-api-key

# Optional Settings
SLACK_APP_TOKEN=xapp-your-app-token  # Required for Socket Mode
SYSTEM_PROMPT_PATH=/path/to/your/prompt.txt  # Custom system prompt
PORT=3000  # Application port number
```

### Customizing System Prompt

To customize the bot's response style and personality, you have two options:

#### 1. Using Environment Variables and Prompt File

1. Create a prompt file:
   ```text
   # prompt.txt
   You are a helpful and capable assistant. Please respond to user questions and requests appropriately and politely.

   When responding, please keep in mind:
   1. Use clear and understandable language
   2. Use bullet points and headings to organize information when needed
   3. Provide explanations for technical terms
   ```

2. Specify in environment variables:
   ```bash
   SYSTEM_PROMPT_PATH=/path/to/your/prompt.txt
   ```

#### 2. Using YAML Configuration

You can also specify the system prompt directly in the agent YAML configuration file by adding a `systemPrompt` field:

```yaml
name: "Slack Custom Assistant"
instructions: |
  # These are regular instructions
  - Answer user questions politely and concisely
systemPrompt: |
  # This is the system prompt
  You are a helpful and capable assistant. Please respond to user questions and requests appropriately and politely.
model: "gpt-4o"
```

When using a YAML file, specify it with an environment variable:
```bash
GENERIC_AGENT_YAML=/path/to/your/agent.yaml
```

## Usage

### Using Mentions

1. In public channels:
   ```
   @bot hello
   > Hello! How can I help you today?
   ```

2. Example question:
   ```
   @bot Can you explain Python list comprehension?
   > [Detailed explanation will be provided in thread]
   ```

### Using DMs

1. Basic conversation:
   ```
   You: Hello
   Bot: Hello! How can I assist you today?
   ```

2. Threaded conversation:
   ```
   You: I have a question about programming
   Bot: Sure, what would you like to know? Feel free to ask.
   ```

## Troubleshooting

### Common Issues and Solutions

1. Bot Not Responding
   - Verify environment variables are set correctly
   - Check if the bot is invited to the channel
   - Check logs for detailed errors

2. Custom Prompt Not Applied
   - Verify the `SYSTEM_PROMPT_PATH` value
   - Check file permissions
   - Ensure file encoding is UTF-8

3. Error Messages Displayed
   - Verify API key validity
   - Check if necessary permissions are granted
   - Verify network connectivity

## Support and Feedback

If you encounter unresolved issues or have feature requests, please contact us through:

1. Creating a GitHub Issue
2. Submitting a Pull Request
3. Contacting the administrator directly

## Security Considerations

1. API Key Management
   - Properly manage environment variables and don't commit them to public repositories
   - Rotate API keys periodically

2. Information Handling
   - Don't share sensitive information in bot conversations
   - Use private channels or DMs when necessary

## Advanced Features

### Thread Management
- All responses are automatically threaded
- Maintains conversation context within threads
- Supports multiple concurrent conversations

### Response Customization
- Customize bot personality through system prompts
- Adjust response format and style
- Configure language preferences

## Best Practices

1. Channel Usage
   - Use public channels for general queries
   - Use private channels or DMs for sensitive topics
   - Keep threads organized for better conversation flow

2. Effective Communication
   - Be specific with questions
   - Provide context when needed
   - Use code blocks for code snippets
   - Break down complex questions into smaller parts

3. Performance Optimization
   - Avoid sending multiple requests in quick succession
   - Use threads for related follow-up questions
   - Keep messages concise and clear

## Limitations

1. Response Time
   - Responses may take a few seconds due to API processing
   - Complex queries might take longer

2. Content Restrictions
   - Cannot process images or files
   - Limited to text-based interactions
   - Maximum message length restrictions apply

3. API Limitations
   - Subject to OpenAI API rate limits
   - May have usage quotas based on your plan  