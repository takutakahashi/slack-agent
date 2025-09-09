package infrastructure

import (
	"context"
	"fmt"
	"log"

	"github.com/slack-go/slack"
	"github.com/slack-go/slack/slackevents"
	"github.com/slack-go/slack/socketmode"
)

// SlackRepositoryImpl implements the SlackRepository interface
type SlackRepositoryImpl struct {
	client       *slack.Client
	socketClient *socketmode.Client
	botUserID    string
}

// NewSlackRepository creates a new SlackRepository instance
func NewSlackRepository(token, appToken string) (*SlackRepositoryImpl, error) {
	options := []slack.Option{slack.OptionDebug(false)}

	// Add app token if provided
	if appToken != "" {
		options = append(options, slack.OptionAppLevelToken(appToken))
	}

	client := slack.New(token, options...)

	// Get bot user ID
	authTest, err := client.AuthTest()
	if err != nil {
		return nil, fmt.Errorf("failed to authenticate: %w", err)
	}

	repo := &SlackRepositoryImpl{
		client:    client,
		botUserID: authTest.UserID,
	}

	// If app token is provided, create socket mode client
	if appToken != "" {
		socketClient := socketmode.New(client)
		repo.socketClient = socketClient
	}

	return repo, nil
}

// PostMessage posts a message to Slack
func (r *SlackRepositoryImpl) PostMessage(ctx context.Context, channelID, text, threadTS string) error {
	options := []slack.MsgOption{
		slack.MsgOptionText(text, false),
	}

	if threadTS != "" {
		options = append(options, slack.MsgOptionTS(threadTS))
	}

	_, _, err := r.client.PostMessageContext(ctx, channelID, options...)
	if err != nil {
		return fmt.Errorf("failed to post message: %w", err)
	}

	return nil
}

// GetBotUserID returns the bot's user ID
func (r *SlackRepositoryImpl) GetBotUserID(ctx context.Context) (string, error) {
	return r.botUserID, nil
}

// GetClient returns the Slack client (for event handling)
func (r *SlackRepositoryImpl) GetClient() *slack.Client {
	return r.client
}

// GetSocketClient returns the Socket Mode client
func (r *SlackRepositoryImpl) GetSocketClient() *socketmode.Client {
	return r.socketClient
}

// ExtractMessageFromEvent extracts message information from Slack events
func ExtractMessageFromEvent(event slackevents.EventsAPIEvent) (string, string, string, string, bool) {
	switch ev := event.InnerEvent.Data.(type) {
	case *slackevents.MessageEvent:
		// Skip bot messages
		if ev.BotID != "" {
			log.Printf("Skipping bot message from BotID: %s", ev.BotID)
			return "", "", "", "", false
		}
		// Use ThreadTimeStamp if it exists, otherwise use the message TimeStamp itself
		threadTS := ev.ThreadTimeStamp
		if threadTS == "" {
			threadTS = ev.TimeStamp
		}
		log.Printf("MessageEvent - ThreadTS: %s, TimeStamp: %s, Using: %s", ev.ThreadTimeStamp, ev.TimeStamp, threadTS)
		return ev.User, ev.Channel, ev.Text, threadTS, true
	case *slackevents.AppMentionEvent:
		// Skip bot mentions (bot shouldn't respond to its own mentions)
		if ev.BotID != "" {
			log.Printf("Skipping bot mention from BotID: %s", ev.BotID)
			return "", "", "", "", false
		}
		// Use ThreadTimeStamp if it exists, otherwise use the message TimeStamp itself
		threadTS := ev.ThreadTimeStamp
		if threadTS == "" {
			threadTS = ev.TimeStamp
		}
		log.Printf("AppMentionEvent - ThreadTS: %s, TimeStamp: %s, Using: %s", ev.ThreadTimeStamp, ev.TimeStamp, threadTS)
		return ev.User, ev.Channel, ev.Text, threadTS, true
	default:
		return "", "", "", "", false
	}
}
