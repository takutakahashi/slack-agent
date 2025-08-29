package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/takutakahashi/slack-agent/internal/domain"
	"github.com/takutakahashi/slack-agent/internal/usecase"
)

// Mock implementations for testing
type mockSlackRepository struct {
	postMessageFunc   func(ctx context.Context, channelID, text, threadTS string) error
	getBotUserIDFunc  func(ctx context.Context) (string, error)
	postMessageCalled bool
}

func (m *mockSlackRepository) PostMessage(ctx context.Context, channelID, text, threadTS string) error {
	m.postMessageCalled = true
	if m.postMessageFunc != nil {
		return m.postMessageFunc(ctx, channelID, text, threadTS)
	}
	return nil
}

func (m *mockSlackRepository) GetBotUserID(ctx context.Context) (string, error) {
	if m.getBotUserIDFunc != nil {
		return m.getBotUserIDFunc(ctx)
	}
	return "U12345", nil
}

type mockAgentRepository struct {
	generateResponseFunc func(ctx context.Context, prompt string) (*domain.AgentResult, error)
}

func (m *mockAgentRepository) GenerateResponse(ctx context.Context, prompt string) (*domain.AgentResult, error) {
	if m.generateResponseFunc != nil {
		return m.generateResponseFunc(ctx, prompt)
	}
	return domain.NewAgentResult("Default response", nil), nil
}

func TestMessageHandler_HandleMessage(t *testing.T) {
	bot := domain.NewBot("U12345")

	t.Run("should skip message from bot itself", func(t *testing.T) {
		slackRepo := &mockSlackRepository{}
		agentRepo := &mockAgentRepository{}
		handler := usecase.NewMessageHandler(slackRepo, agentRepo, bot)

		msg := domain.NewMessage("msg1", "U12345", "C123", "Hello", "", time.Now())
		err := handler.HandleMessage(context.Background(), msg)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if slackRepo.postMessageCalled {
			t.Error("expected PostMessage not to be called for bot's own message")
		}
	})

	t.Run("should skip message without mention in public channel", func(t *testing.T) {
		slackRepo := &mockSlackRepository{}
		agentRepo := &mockAgentRepository{}
		handler := usecase.NewMessageHandler(slackRepo, agentRepo, bot)

		msg := domain.NewMessage("msg1", "U99999", "C123", "Hello world", "", time.Now())
		err := handler.HandleMessage(context.Background(), msg)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if slackRepo.postMessageCalled {
			t.Error("expected PostMessage not to be called for message without mention")
		}
	})

	t.Run("should handle message with mention", func(t *testing.T) {
		slackRepo := &mockSlackRepository{}
		agentRepo := &mockAgentRepository{
			generateResponseFunc: func(ctx context.Context, prompt string) (*domain.AgentResult, error) {
				return domain.NewAgentResult("AI response", nil), nil
			},
		}
		handler := usecase.NewMessageHandler(slackRepo, agentRepo, bot)

		msg := domain.NewMessage("msg1", "U99999", "C123", "<@U12345> hello", "", time.Now())
		err := handler.HandleMessage(context.Background(), msg)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if !slackRepo.postMessageCalled {
			t.Error("expected PostMessage to be called for message with mention")
		}
	})

	t.Run("should handle direct message", func(t *testing.T) {
		slackRepo := &mockSlackRepository{}
		agentRepo := &mockAgentRepository{
			generateResponseFunc: func(ctx context.Context, prompt string) (*domain.AgentResult, error) {
				return domain.NewAgentResult("AI response", nil), nil
			},
		}
		handler := usecase.NewMessageHandler(slackRepo, agentRepo, bot)

		msg := domain.NewMessage("msg1", "U99999", "D123", "hello", "", time.Now())
		err := handler.HandleMessage(context.Background(), msg)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if !slackRepo.postMessageCalled {
			t.Error("expected PostMessage to be called for direct message")
		}
	})

	t.Run("should handle agent error", func(t *testing.T) {
		expectedError := errors.New("agent error")
		slackRepo := &mockSlackRepository{}
		agentRepo := &mockAgentRepository{
			generateResponseFunc: func(ctx context.Context, prompt string) (*domain.AgentResult, error) {
				return domain.NewAgentResult("", expectedError), nil
			},
		}
		handler := usecase.NewMessageHandler(slackRepo, agentRepo, bot)

		msg := domain.NewMessage("msg1", "U99999", "D123", "hello", "", time.Now())
		err := handler.HandleMessage(context.Background(), msg)

		if err != nil {
			t.Errorf("expected no error from handler, got %v", err)
		}
		if !slackRepo.postMessageCalled {
			t.Error("expected PostMessage to be called with error message")
		}
	})

	t.Run("should return error when PostMessage fails", func(t *testing.T) {
		expectedError := errors.New("post error")
		slackRepo := &mockSlackRepository{
			postMessageFunc: func(ctx context.Context, channelID, text, threadTS string) error {
				return expectedError
			},
		}
		agentRepo := &mockAgentRepository{
			generateResponseFunc: func(ctx context.Context, prompt string) (*domain.AgentResult, error) {
				return domain.NewAgentResult("AI response", nil), nil
			},
		}
		handler := usecase.NewMessageHandler(slackRepo, agentRepo, bot)

		msg := domain.NewMessage("msg1", "U99999", "D123", "hello", "", time.Now())
		err := handler.HandleMessage(context.Background(), msg)

		if err == nil {
			t.Error("expected error when PostMessage fails")
		}
		if !errors.Is(err, expectedError) {
			t.Errorf("expected error to contain %v, got %v", expectedError, err)
		}
	})
}
