package infrastructure_test

import (
	"context"
	"testing"

	"github.com/slack-go/slack"
	"github.com/slack-go/slack/slackevents"
	"github.com/takutakahashi/slack-agent/internal/infrastructure"
)

func TestSlackRepositoryImpl_PostMessage(t *testing.T) {
	// Note: This would require mocking the Slack client
	// For now, we'll test the public interface
	t.Skip("Integration test - requires real Slack credentials")
}

func TestSlackRepositoryImpl_GetBotUserID(t *testing.T) {
	// Note: This would require mocking the Slack client
	// For now, we'll test the public interface
	t.Skip("Integration test - requires real Slack credentials")
}

func TestExtractMessageFromEvent(t *testing.T) {
	tests := []struct {
		name           string
		event          slackevents.EventsAPIEvent
		expectedUser   string
		expectedChannel string
		expectedText   string
		expectedThread string
		expectedOK     bool
	}{
		{
			name: "message event",
			event: slackevents.EventsAPIEvent{
				InnerEvent: slackevents.EventsAPIInnerEvent{
					Data: &slackevents.MessageEvent{
						User:            "U123456",
						Channel:         "C789012",
						Text:            "Hello world",
						ThreadTimeStamp: "1234567890.123456",
					},
				},
			},
			expectedUser:    "U123456",
			expectedChannel: "C789012",
			expectedText:    "Hello world",
			expectedThread:  "1234567890.123456",
			expectedOK:      true,
		},
		{
			name: "app mention event",
			event: slackevents.EventsAPIEvent{
				InnerEvent: slackevents.EventsAPIInnerEvent{
					Data: &slackevents.AppMentionEvent{
						User:            "U654321",
						Channel:         "C210987",
						Text:            "<@U12345> hello",
						ThreadTimeStamp: "1234567890.654321",
					},
				},
			},
			expectedUser:    "U654321",
			expectedChannel: "C210987",
			expectedText:    "<@U12345> hello",
			expectedThread:  "1234567890.654321",
			expectedOK:      true,
		},
		{
			name: "unsupported event",
			event: slackevents.EventsAPIEvent{
				InnerEvent: slackevents.EventsAPIInnerEvent{
					Data: &slackevents.ReactionAddedEvent{
						User: "U111111",
					},
				},
			},
			expectedUser:    "",
			expectedChannel: "",
			expectedText:    "",
			expectedThread:  "",
			expectedOK:      false,
		},
		{
			name: "bot message (should be filtered)",
			event: slackevents.EventsAPIEvent{
				InnerEvent: slackevents.EventsAPIInnerEvent{
					Data: &slackevents.MessageEvent{
						User:    "U123456",
						Channel: "C789012",
						Text:    "Bot message",
						BotID:   "B123456", // Bot message
					},
				},
			},
			expectedUser:    "",
			expectedChannel: "",
			expectedText:    "",
			expectedThread:  "",
			expectedOK:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userID, channelID, text, threadTS, ok := infrastructure.ExtractMessageFromEvent(tt.event)

			if userID != tt.expectedUser {
				t.Errorf("expected userID %s, got %s", tt.expectedUser, userID)
			}
			if channelID != tt.expectedChannel {
				t.Errorf("expected channelID %s, got %s", tt.expectedChannel, channelID)
			}
			if text != tt.expectedText {
				t.Errorf("expected text %s, got %s", tt.expectedText, text)
			}
			if threadTS != tt.expectedThread {
				t.Errorf("expected threadTS %s, got %s", tt.expectedThread, threadTS)
			}
			if ok != tt.expectedOK {
				t.Errorf("expected ok %t, got %t", tt.expectedOK, ok)
			}
		})
	}
}