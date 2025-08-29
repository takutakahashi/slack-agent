package usecase

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"
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

	// Clean message text by removing mention
	cleanedText := h.cleanMessageText(message.Text)

	// Generate response using AI agent
	result, err := h.agentRepo.GenerateResponse(ctx, cleanedText)
	if err != nil {
		log.Printf("Error generating response: %v", err)
		return h.slackRepo.PostMessage(ctx, message.ChannelID, "申し訳ございません。応答の生成中にエラーが発生しました。", message.ThreadTS)
	}
	if result.IsError() {
		log.Printf("Agent returned error: %v", result.Error)
		return h.slackRepo.PostMessage(ctx, message.ChannelID, fmt.Sprintf("Sorry, I encountered an error: %s", result.Error.Error()), message.ThreadTS)
	}

	// Post the response
	if err := h.slackRepo.PostMessage(ctx, message.ChannelID, result.Response, message.ThreadTS); err != nil {
		return fmt.Errorf("failed to post message: %w", err)
	}

	return nil
}

// cleanMessageText removes mention tags from message text
func (h *messageHandlerImpl) cleanMessageText(text string) string {
	// Remove mention tags like <@U12345> or <@U_BOT_USER>
	mentionRegex := regexp.MustCompile(`<@[A-Z0-9_]+>`)
	cleaned := mentionRegex.ReplaceAllString(text, "")
	
	// Trim whitespace
	return strings.TrimSpace(cleaned)
}