# Development Guide

## Setup

### Requirements
- [bun](https://bun.sh) v1.0.25 or higher
- Node.js v18 or higher (for type definitions)

### Initial Setup

```bash
# Install dependencies
bun install
```

### Slack App Configuration

1. Create a new Slack App at [api.slack.com/apps](https://api.slack.com/apps)
2. Under "Basic Information", note down your "Signing Secret"

3. Choose either Socket Mode or HTTP mode:

   #### Option A: Socket Mode (Recommended for Development)
   - Under "Socket Mode", enable it and create an App-Level Token
   - No need to set up Event Subscription URL
   - Add `SLACK_APP_TOKEN` (starts with `xapp-`) to your environment variables

   #### Option B: HTTP Mode (Recommended for Production)
   - Keep Socket Mode disabled
   - Under "Event Subscriptions":
     - Enable events
     - Set the Request URL to: `https://your-domain/slack/events`
     - Wait for URL verification to complete
   - For local development with HTTP mode:
     - Use a tool like [ngrok](https://ngrok.com) to create a public URL
     - Run: `ngrok http 3000`
     - Use the generated URL as your Request URL: `https://<ngrok-id>.ngrok.io/slack/events`

4. Under "OAuth & Permissions", add the following bot token scopes:
   - `app_mentions:read` (Mentions)
   - `chat:write` (Send messages)
   - `channels:history` (Channel history)
   - `groups:history` (Private channel history)
   - `im:history` (IM history)
   - `im:read` (Read IMs)
   - `im:write` (Write IMs)
   - `mpim:history` (Multi-person IM history)

5. Install the app to your workspace

6. Note down the "Bot User OAuth Token" (starts with `xoxb-`)

7. Under "Event Subscriptions":
   - Subscribe to bot events:
     - `app_mention` (Mentions)
     - `message.channels` (Public channels)
     - `message.groups` (Private channels)
     - `message.im` (Direct messages)
     - `message.mpim` (Multi-person IMs)

### Features

#### Mention Responses
When mentioned in public or private channels, the bot responds in a thread.

#### IM (Direct Messages)
Enables private conversations with the bot:

1. Basic Usage
   - Send a direct message to the bot
   - Bot responds to the sent message
   - Thread conversations are supported

2. Required Configuration
   - Bot Token Scopes:
     - `im:history` (Read IM history)
     - `im:read` (Read IMs)
     - `im:write` (Write IMs)
     - `chat:write` (Send messages)
   - Event Subscriptions:
     - `message.im` (Receive IM messages)

3. Troubleshooting
   - If IMs are not working:
     - Verify all required scopes are granted
     - Check if event subscriptions are enabled
     - Reinstall the app to update permissions
     - Ensure the bot is invited to DMs

### Socket Mode Setup and Usage

Socket Mode allows your app to receive events and interact with Slack APIs through a WebSocket connection, which is ideal for development and environments where you can't expose a public HTTP endpoint.

#### 1. Enable Socket Mode

1. Go to your app settings at [api.slack.com/apps](https://api.slack.com/apps)
2. Click on "Socket Mode" in the left sidebar
3. Toggle "Enable Socket Mode" to On
4. Generate an App-Level Token with the following scopes:
   - `connections:write`
   - `app_token`
5. Save the generated token (starts with `xapp-`) - you'll only see it once

#### 2. Environment Setup

Create or update your `.env` file with all required tokens:

```env
# Bot Token (starts with xoxb-)
SLACK_BOT_TOKEN=xoxb-your-bot-token

# App-Level Token for Socket Mode (starts with xapp-)
SLACK_APP_TOKEN=xapp-your-app-token

# Signing Secret (from Basic Information)
SLACK_SIGNING_SECRET=your-signing-secret

# Port (optional, default: 3000)
PORT=3000
```

#### 3. Code Configuration

The application is already configured to use Socket Mode when `SLACK_APP_TOKEN` is present. Here's how it works:

```typescript
// Example of Socket Mode configuration in your app
const app = new App({
  token: config.slack.token,           // Bot Token
  appToken: config.slack.appToken,     // App-Level Token
  socketMode: true,                    // Enable Socket Mode
  signingSecret: config.slack.signingSecret
});
```

#### 4. Running the App

1. Start the application:
   ```bash
   # Development mode with hot reload
   bun run dev

   # Or production mode
   bun run start
   ```

2. Verify connection:
   - Look for the message "⚡️ Bolt app is running!" in the console
   - The app should automatically establish a WebSocket connection
   - No need to expose any ports or use ngrok

#### 5. Testing the Connection

1. Basic Connection Test:
   ```bash
   # Check if the app is running and connected
   bun run dev
   ```

2. Mention Test:
   - In Slack, mention your bot: `@YourBot hello`
   - You should see the interaction logged in your console
   - The bot should respond in the thread

3. Thread Test:
   - Start a thread in any channel where the bot is present
   - The bot should log thread messages (if configured)

#### 6. Debugging Socket Mode

Common issues and solutions:

1. **Connection Issues**
   ```
   Error: Cannot connect to Slack
   ```
   - Check if your `SLACK_APP_TOKEN` is correct
   - Verify that Socket Mode is enabled in Slack
   - Ensure you have the required scopes

2. **Authentication Errors**
   ```
   An API error occurred: invalid_auth
   ```
   - Verify your `SLACK_BOT_TOKEN`
   - Check if the app is properly installed to your workspace
   - Ensure all required scopes are granted

3. **Event Subscription Issues**
   ```
   Warning: No subscription callback
   ```
   - Verify that you've subscribed to the necessary bot events
   - Check if the bot has the required scopes
   - Ensure the bot is invited to the channels

#### 7. Best Practices

1. **Token Security**
   - Never commit tokens to version control
   - Use environment variables
   - Rotate tokens if compromised

2. **Error Handling**
   ```typescript
   app.error(async (error) => {
     console.error('An error occurred:', error);
     // Implement your error handling
   });
   ```

3. **Monitoring**
   - Log important events
   - Track connection status
   - Monitor WebSocket reconnections

4. **Development Workflow**
   - Use separate apps for development and production
   - Create different workspaces for testing
   - Utilize development-specific channels

## Local Development

### Environment Variables

Create a `.env` file and set the following environment variables:

```env
# Slack Bot Token (starts with xoxb-)
SLACK_BOT_TOKEN=xoxb-your-token

# Slack Signing Secret
SLACK_SIGNING_SECRET=your-signing-secret

# Slack App Token (required only for Socket Mode, starts with xapp-)
SLACK_APP_TOKEN=xapp-your-token

# Application port (optional, default: 3000)
PORT=3000
```

### Starting the Development Server

```bash
# Development mode (with hot reload)
bun run dev

# Production mode
bun run start
```

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run a specific test file
bun test tests/mention.test.ts

# Run tests in watch mode
bun test --watch

# Generate coverage report
bun test --coverage
```

### Test Structure

Tests are located in the `tests` directory and include the following files:

- `config.test.ts`: Configuration-related tests
- `mention.test.ts`: Mention handler tests
- `message.test.ts`: Message handler tests

### Adding Tests

When adding new features, make sure to add corresponding tests. Test files should follow this naming convention:

```
tests/{feature-name}.test.ts
```

Tests should be structured as follows:

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Feature Name', () => {
  it('should describe what the test case does', () => {
    // Test code
  });
});
```

### Using Mocks

When mocking Slack clients and events, use `vitest`'s `vi.fn()`:

```typescript
const mockClient = {
  conversations: {
    replies: vi.fn().mockResolvedValue({
      messages: ['test message'],
    }),
  },
};
```

## Building

```bash
# Build for production
bun run build

# Check build output
ls -l dist/
```

## Code Quality

### Linting

```bash
# Run linter
bun run lint

# Fix linting issues automatically
bun run lint --fix
```

### Type Checking

```bash
# Run type checker
bun run tsc --noEmit
```

## Troubleshooting

### Common Issues

1. **"An API error occurred: inactive_app"**
   - Make sure you've completed all the steps in "Slack App Configuration"
   - Verify that your app is installed to your workspace
   - Check if all required scopes are added
   - Ensure your Bot Token starts with `xoxb-`

2. **Socket Mode Issues**
   - Verify that Socket Mode is enabled in your Slack App settings
   - Check if you have the correct permissions and scopes
   - Ensure your environment variables are set correctly 