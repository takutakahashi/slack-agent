package domain_test

import (
	"testing"

	"github.com/takutakahashi/slack-agent/internal/domain"
)

func TestNewBot(t *testing.T) {
	bot := domain.NewBot("U12345")
	if bot.UserID != "U12345" {
		t.Errorf("expected UserID to be U12345, got %s", bot.UserID)
	}
}

func TestBotIsMentioned(t *testing.T) {
	bot := domain.NewBot("U12345")

	tests := []struct {
		name     string
		text     string
		expected bool
	}{
		{
			name:     "direct mention",
			text:     "<@U12345> hello",
			expected: true,
		},
		{
			name:     "mention in middle",
			text:     "Hey <@U12345> how are you?",
			expected: true,
		},
		{
			name:     "mention at end",
			text:     "What do you think <@U12345>",
			expected: true,
		},
		{
			name:     "no mention",
			text:     "Hello world",
			expected: false,
		},
		{
			name:     "different user mention",
			text:     "<@U98765> hello",
			expected: false,
		},
		{
			name:     "partial match should not count",
			text:     "<@U123456> hello",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := bot.IsMentioned(tt.text)
			if result != tt.expected {
				t.Errorf("expected %v, got %v for text: %s", tt.expected, result, tt.text)
			}
		})
	}
}