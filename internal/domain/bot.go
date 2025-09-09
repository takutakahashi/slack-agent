package domain

// Bot represents the Slack bot
type Bot struct {
	UserID string
}

// NewBot creates a new Bot instance
func NewBot(userID string) *Bot {
	return &Bot{
		UserID: userID,
	}
}

// IsMentioned checks if the bot is mentioned in the text
func (b *Bot) IsMentioned(text string) bool {
	return contains(text, "<@"+b.UserID+">")
}

// contains checks if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && containsAt(s, substr, 0)
}

// containsAt checks if a string contains a substring at any position
func containsAt(s, substr string, start int) bool {
	for i := start; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
