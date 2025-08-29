package domain

import (
	"time"
)

// Message represents a Slack message
type Message struct {
	ID        string
	UserID    string
	ChannelID string
	Text      string
	ThreadTS  string
	Timestamp time.Time
}

// NewMessage creates a new Message instance
func NewMessage(id, userID, channelID, text, threadTS string, timestamp time.Time) *Message {
	return &Message{
		ID:        id,
		UserID:    userID,
		ChannelID: channelID,
		Text:      text,
		ThreadTS:  threadTS,
		Timestamp: timestamp,
	}
}