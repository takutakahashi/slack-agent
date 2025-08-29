package domain_test

import (
	"testing"
	"time"

	"github.com/takutakahashi/slack-agent/internal/domain"
)

func TestNewMessage(t *testing.T) {
	now := time.Now()
	msg := domain.NewMessage("msg123", "U123", "C456", "Hello world", "1234567890.123456", now)

	if msg.ID != "msg123" {
		t.Errorf("expected ID to be msg123, got %s", msg.ID)
	}
	if msg.UserID != "U123" {
		t.Errorf("expected UserID to be U123, got %s", msg.UserID)
	}
	if msg.ChannelID != "C456" {
		t.Errorf("expected ChannelID to be C456, got %s", msg.ChannelID)
	}
	if msg.Text != "Hello world" {
		t.Errorf("expected Text to be 'Hello world', got %s", msg.Text)
	}
	if msg.ThreadTS != "1234567890.123456" {
		t.Errorf("expected ThreadTS to be 1234567890.123456, got %s", msg.ThreadTS)
	}
	if !msg.Timestamp.Equal(now) {
		t.Errorf("expected Timestamp to be %v, got %v", now, msg.Timestamp)
	}
}