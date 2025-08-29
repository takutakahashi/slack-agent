package infrastructure

import (
	"context"
	"fmt"
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
	client := slack.New(token, slack.OptionDebug(false))

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
		socketClient := socketmode.New(
			client,
		)
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
			return "", "", "", "", false
		}
		return ev.User, ev.Channel, ev.Text, ev.ThreadTimeStamp, true
	case *slackevents.AppMentionEvent:
		return ev.User, ev.Channel, ev.Text, ev.ThreadTimeStamp, true
	default:
		return "", "", "", "", false
	}
}
