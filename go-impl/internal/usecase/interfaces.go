package usecase

import (
	"context"

	"github.com/takutakahashi/slack-agent/internal/domain"
)

// SlackRepository defines the interface for Slack operations
type SlackRepository interface {
	PostMessage(ctx context.Context, channelID, text, threadTS string) error
	GetBotUserID(ctx context.Context) (string, error)
}

// AgentRepository defines the interface for AI agent operations
type AgentRepository interface {
	GenerateResponse(ctx context.Context, message *domain.Message) (*domain.AgentResult, error)
}

// MessageHandler defines the interface for message handling use case
type MessageHandler interface {
	HandleMessage(ctx context.Context, message *domain.Message) error
}
