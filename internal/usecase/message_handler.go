package usecase

import (
	"context"
	"fmt"
	"log"
	"github.com/takutakahashi/slack-agent/internal/domain"
)

// messageHandlerImpl implements the MessageHandler interface
type messageHandlerImpl struct {
	slackRepo SlackRepository
	agentRepo AgentRepository
	bot       *domain.Bot
}

// NewMessageHandler creates a new MessageHandler instance
func NewMessageHandler(slackRepo SlackRepository, agentRepo AgentRepository, bot *domain.Bot) MessageHandler {
	return &messageHandlerImpl{
		slackRepo: slackRepo,
		agentRepo: agentRepo,
		bot:       bot,
	}
}

// HandleMessage handles incoming Slack messages
func (h *messageHandlerImpl) HandleMessage(ctx context.Context, message *domain.Message) error {
	// Skip messages from the bot itself
	if message.UserID == h.bot.UserID {
		return nil
	}

	// Check if the bot is mentioned or if it's a direct message
	if !h.bot.IsMentioned(message.Text) && message.ChannelID[0] != 'D' {
		return nil
	}

	// Log the incoming message
	log.Printf("Handling message from user %s in channel %s: %s", message.UserID, message.ChannelID, message.Text)

	// Generate response using AI agent
	result := h.agentRepo.GenerateResponse(ctx, message.Text)
	if result.IsError() {
		log.Printf("Error generating response: %v", result.Error)
		return h.slackRepo.PostMessage(ctx, message.ChannelID, "申し訳ございません。応答の生成中にエラーが発生しました。", message.ThreadTS)
	}

	// Post the response
	if err := h.slackRepo.PostMessage(ctx, message.ChannelID, result.Response, message.ThreadTS); err != nil {
		return fmt.Errorf("failed to post message: %w", err)
	}

	return nil
}