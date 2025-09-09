package cli

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/slack-go/slack/slackevents"
	"github.com/slack-go/slack/socketmode"
	"github.com/spf13/cobra"
	"github.com/takutakahashi/slack-agent/internal/domain"
	"github.com/takutakahashi/slack-agent/internal/infrastructure"
	"github.com/takutakahashi/slack-agent/internal/usecase"
	"github.com/takutakahashi/slack-agent/pkg/config"
)

// startCmd represents the start command
var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start the Slack agent",
	Long:  `Start the Slack agent bot that will listen for messages and respond using AI.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.Load()
		if err != nil {
			return fmt.Errorf("Failed to load configuration: %v", err)
		}

		// Validate configuration
		if err := cfg.Validate(); err != nil {
			return fmt.Errorf("Invalid configuration: %v", err)
		}

		// Start the application
		if err := startApp(cfg); err != nil {
			return fmt.Errorf("Application error: %v", err)
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(startCmd)
}

func startApp(cfg *config.Config) error {
	log.Println("🚀 Starting Slack Agent...")

	// Create repositories
	slackRepo, err := infrastructure.NewSlackRepository(cfg.Slack.BotToken, cfg.Slack.AppToken)
	if err != nil {
		return fmt.Errorf("failed to create slack repository: %w", err)
	}

	agentRepo := infrastructure.NewAgentRepository(
		cfg.AI.DefaultSystemPrompt,
		cfg.AI.AgentScriptPath,
		strings.Fields(cfg.AI.ClaudeExtraArgs),
		strings.Split(cfg.AI.DisallowedTools, ","),
	)
	agentRepo.SetDebug(cfg.App.Debug)

	// Get bot user ID
	botUserID, err := slackRepo.GetBotUserID(context.Background())
	if err != nil {
		return fmt.Errorf("failed to get bot user ID: %w", err)
	}

	bot := domain.NewBot(botUserID)

	// Create use case
	messageHandler := usecase.NewMessageHandler(slackRepo, agentRepo, bot)

	// Determine mode and start
	if cfg.Slack.AppToken != "" {
		log.Println("🔌 Starting in Socket Mode...")
		return startSocketMode(slackRepo, messageHandler)
	}

	log.Println("🌐 Starting in Web API Mode...")
	return startWebAPIMode(slackRepo, messageHandler, cfg.App.Port)
}

func startSocketMode(slackRepo *infrastructure.SlackRepositoryImpl, handler usecase.MessageHandler) error {
	socketClient := slackRepo.GetSocketClient()
	if socketClient == nil {
		return fmt.Errorf("socket client not initialized")
	}

	// Create a map to track processed messages (deduplication)
	processedMessages := make(map[string]time.Time)
	// Cleanup old entries periodically
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now()
			for key, timestamp := range processedMessages {
				if now.Sub(timestamp) > 10*time.Minute {
					delete(processedMessages, key)
				}
			}
		}
	}()

	go func() {
		for evt := range socketClient.Events {
			switch evt.Type {
			case socketmode.EventTypeEventsAPI:
				eventsAPIEvent, ok := evt.Data.(slackevents.EventsAPIEvent)
				if !ok {
					log.Printf("Ignored %+v\n", evt)
					socketClient.Ack(*evt.Request)
					continue
				}

				// Acknowledge the event immediately to prevent retries
				socketClient.Ack(*evt.Request)

				// Handle message events asynchronously
				userID, channelID, text, threadTS, ok := infrastructure.ExtractMessageFromEvent(eventsAPIEvent)
				if ok {
					// Create a unique message key for deduplication
					messageKey := fmt.Sprintf("%s:%s:%s:%s", userID, channelID, threadTS, text)

					// Check if we've already processed this message recently
					if lastProcessed, exists := processedMessages[messageKey]; exists {
						if time.Since(lastProcessed) < 30*time.Second {
							log.Printf("Skipping duplicate message (processed %v ago): %s", time.Since(lastProcessed), messageKey)
							continue
						}
					}

					// Mark message as processed
					processedMessages[messageKey] = time.Now()

					msg := domain.NewMessage(
						"", // ID not available in events
						userID,
						channelID,
						text,
						threadTS,
						time.Now(),
					)

					// Process message in a goroutine to avoid blocking
					go func() {
						if err := handler.HandleMessage(context.Background(), msg); err != nil {
							log.Printf("Error handling message: %v", err)
						}
					}()
				}

			case socketmode.EventTypeConnectionError:
				log.Println("Connection failed. Retrying later...")

			default:
				log.Printf("Unexpected event type received: %s\n", evt.Type)
			}
		}
	}()

	// Handle graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt)

	go func() {
		<-sigChan
		log.Println("🛑 Shutting down...")
		cancel()
	}()

	if err := socketClient.RunContext(ctx); err != nil {
		return fmt.Errorf("socket mode error: %w", err)
	}

	return nil
}

func startWebAPIMode(slackRepo *infrastructure.SlackRepositoryImpl, handler usecase.MessageHandler, port int) error {
	// This is a simplified version - in production, you'd want to implement
	// proper event handling with verification, etc.
	log.Printf("⚡️ Web API Mode started on port %d", port)

	// Keep the application running
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt)
	<-sigChan

	log.Println("🛑 Shutting down...")
	return nil
}
