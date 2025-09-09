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

	// Generate response using AI agent (it handles posting directly to Slack)
	result, err := h.agentRepo.GenerateResponse(ctx, message)
	if err != nil {
		log.Printf("Error generating response: %v", err)
		return h.slackRepo.PostMessage(ctx, message.ChannelID, "申し訳ございません。応答の生成中にエラーが発生しました。", message.ThreadTS)
	}
	if result.IsError() {
		log.Printf("Agent returned error: %v", result.Error)
		return h.slackRepo.PostMessage(ctx, message.ChannelID, fmt.Sprintf("Sorry, I encountered an error: %s", result.Error.Error()), message.ThreadTS)
	}

	// Response has already been posted by claude-posts command
	// So we just return nil here
	return nil
}
