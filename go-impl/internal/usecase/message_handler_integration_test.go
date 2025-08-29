package usecase_test

import (
	"context"
	"errors"
	"testing"

	"go.uber.org/mock/gomock"
	"github.com/takutakahashi/slack-agent/internal/domain"
	"github.com/takutakahashi/slack-agent/internal/mocks"
	"github.com/takutakahashi/slack-agent/internal/usecase"
)

func TestMessageHandlerImpl_HandleMessage_Integration(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	slackRepo := mocks.NewMockSlackRepository(ctrl)
	agentRepo := mocks.NewMockAgentRepository(ctrl)

	// Bot user ID for mention detection
	botUserID := "U_BOT_USER"
	slackRepo.EXPECT().GetBotUserID(gomock.Any()).Return(botUserID, nil).AnyTimes()

	tests := []struct {
		name          string
		message       *domain.Message
		setupMocks    func()
		expectHandled bool
	}{
		{
			name: "handles bot mention with successful agent response",
			message: &domain.Message{
				ID:        "msg1",
				UserID:    "U12345",
				ChannelID: "C67890",
				Text:      "<@U_BOT_USER> Hello, can you help me?",
				ThreadTS:  "",
			},
			setupMocks: func() {
				// Agent generates response
				agentResult := &domain.AgentResult{
					Response: "Of course! How can I help you today?",
					Error:    nil,
				}
				agentRepo.EXPECT().
					GenerateResponse(gomock.Any(), "Hello, can you help me?").
					Return(agentResult, nil)

				// Slack posts response
				slackRepo.EXPECT().
					PostMessage(gomock.Any(), "C67890", "Of course! How can I help you today?", "").
					Return(nil)
			},
			expectHandled: true,
		},
		{
			name: "handles direct message with successful agent response and thread",
			message: &domain.Message{
				ID:        "msg2",
				UserID:    "U54321",
				ChannelID: "D_DIRECT", // Direct message channel
				Text:      "What's the weather like?",
				ThreadTS:  "1234567890.123456",
			},
			setupMocks: func() {
				// Agent generates response
				agentResult := &domain.AgentResult{
					Response: "I'm sorry, I cannot check the weather as I don't have access to weather APIs.",
					Error:    nil,
				}
				agentRepo.EXPECT().
					GenerateResponse(gomock.Any(), "What's the weather like?").
					Return(agentResult, nil)

				// Slack posts response with thread
				slackRepo.EXPECT().
					PostMessage(gomock.Any(), "D_DIRECT", "I'm sorry, I cannot check the weather as I don't have access to weather APIs.", "1234567890.123456").
					Return(nil)
			},
			expectHandled: true,
		},
		{
			name: "handles agent error response",
			message: &domain.Message{
				ID:        "msg3",
				UserID:    "U99999",
				ChannelID: "C11111",
				Text:      "<@U_BOT_USER> Please help",
				ThreadTS:  "",
			},
			setupMocks: func() {
				// Agent returns error
				agentResult := &domain.AgentResult{
					Response: "",
					Error:    errors.New("Agent execution failed"),
				}
				agentRepo.EXPECT().
					GenerateResponse(gomock.Any(), "Please help").
					Return(agentResult, nil)

				// Slack posts error message
				slackRepo.EXPECT().
					PostMessage(gomock.Any(), "C11111", "Sorry, I encountered an error: Agent execution failed", "").
					Return(nil)
			},
			expectHandled: true,
		},
		{
			name: "ignores bot's own message",
			message: &domain.Message{
				ID:        "msg4",
				UserID:    "U_BOT_USER", // Bot's own message
				ChannelID: "C22222",
				Text:      "I am responding to someone",
				ThreadTS:  "",
			},
			setupMocks: func() {
				// No interactions expected - bot ignores its own messages
			},
			expectHandled: false,
		},
		{
			name: "ignores message without mention or DM",
			message: &domain.Message{
				ID:        "msg5",
				UserID:    "U33333",
				ChannelID: "C44444", // Channel message without mention
				Text:      "This is a regular message",
				ThreadTS:  "",
			},
			setupMocks: func() {
				// No interactions expected - not a mention or DM
			},
			expectHandled: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMocks()

			bot := &domain.Bot{
				UserID: botUserID,
			}

			handler := usecase.NewMessageHandler(slackRepo, agentRepo, bot)
			err := handler.HandleMessage(context.Background(), tt.message)

			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestMessageHandlerImpl_CompleteFlow_Integration(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	slackRepo := mocks.NewMockSlackRepository(ctrl)
	agentRepo := mocks.NewMockAgentRepository(ctrl)

	botUserID := "U_BOT_USER"
	slackRepo.EXPECT().GetBotUserID(gomock.Any()).Return(botUserID, nil).AnyTimes()

	// Simulate a conversation flow
	message1 := &domain.Message{
		ID:        "msg1",
		UserID:    "U12345",
		ChannelID: "C67890",
		Text:      "<@U_BOT_USER> Hello!",
		ThreadTS:  "",
	}

	message2 := &domain.Message{
		ID:        "msg2",
		UserID:    "U12345",
		ChannelID: "C67890",
		Text:      "<@U_BOT_USER> Can you tell me about Go?",
		ThreadTS:  "1234567890.111111", // In thread
	}

	// First interaction
	agentResult1 := &domain.AgentResult{
		Response: "Hello! How can I help you?",
		Error:    nil,
	}
	agentRepo.EXPECT().
		GenerateResponse(gomock.Any(), "Hello!").
		Return(agentResult1, nil)

	slackRepo.EXPECT().
		PostMessage(gomock.Any(), "C67890", "Hello! How can I help you?", "").
		Return(nil)

	// Second interaction in thread
	agentResult2 := &domain.AgentResult{
		Response: "Go is a programming language developed by Google. It's known for its simplicity and performance.",
		Error:    nil,
	}
	agentRepo.EXPECT().
		GenerateResponse(gomock.Any(), "Can you tell me about Go?").
		Return(agentResult2, nil)

	slackRepo.EXPECT().
		PostMessage(gomock.Any(), "C67890", "Go is a programming language developed by Google. It's known for its simplicity and performance.", "1234567890.111111").
		Return(nil)

	bot := &domain.Bot{
		UserID: botUserID,
	}

	handler := usecase.NewMessageHandler(slackRepo, agentRepo, bot)

	// Handle first message
	err := handler.HandleMessage(context.Background(), message1)
	if err != nil {
		t.Errorf("unexpected error in first message: %v", err)
	}

	// Handle second message
	err = handler.HandleMessage(context.Background(), message2)
	if err != nil {
		t.Errorf("unexpected error in second message: %v", err)
	}
}