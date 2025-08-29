package config_test

import (
	"os"
	"testing"

	"github.com/takutakahashi/slack-agent/pkg/config"
)

func TestConfigValidate(t *testing.T) {
	t.Run("should fail when bot token is missing", func(t *testing.T) {
		cfg := &config.Config{
			Slack: config.SlackConfig{
				BotToken:      "",
				SigningSecret: "secret",
			},
		}

		err := cfg.Validate()
		if err == nil {
			t.Error("expected error when bot token is missing")
		}
	})

	t.Run("should fail when signing secret is missing in web api mode", func(t *testing.T) {
		cfg := &config.Config{
			Slack: config.SlackConfig{
				BotToken:      "xoxb-123",
				SigningSecret: "",
				AppToken:      "", // Web API mode
			},
		}

		err := cfg.Validate()
		if err == nil {
			t.Error("expected error when signing secret is missing in web api mode")
		}
	})

	t.Run("should pass when app token is provided for socket mode", func(t *testing.T) {
		cfg := &config.Config{
			Slack: config.SlackConfig{
				BotToken: "xoxb-123",
				AppToken: "xapp-123",
				// SigningSecret not required for socket mode
			},
		}

		err := cfg.Validate()
		if err != nil {
			t.Errorf("expected no error in socket mode, got %v", err)
		}
	})

	t.Run("should validate agent script path", func(t *testing.T) {
		cfg := &config.Config{
			Slack: config.SlackConfig{
				BotToken: "xoxb-123",
				AppToken: "xapp-123",
			},
			AI: config.AIConfig{
				AgentScriptPath: "/nonexistent/path/to/script.sh",
			},
		}

		err := cfg.Validate()
		if err == nil {
			t.Error("expected error when agent script path does not exist")
		}
	})
}

func TestConfigLoad(t *testing.T) {
	// Set up test environment variables
	os.Setenv("SLACK_BOT_TOKEN", "xoxb-test-token")
	os.Setenv("SLACK_SIGNING_SECRET", "test-secret")
	os.Setenv("PORT", "8080")
	os.Setenv("USE_FINISHED_JUDGE", "true")
	defer func() {
		os.Unsetenv("SLACK_BOT_TOKEN")
		os.Unsetenv("SLACK_SIGNING_SECRET")
		os.Unsetenv("PORT")
		os.Unsetenv("USE_FINISHED_JUDGE")
	}()

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	if cfg.Slack.BotToken != "xoxb-test-token" {
		t.Errorf("expected bot token to be xoxb-test-token, got %s", cfg.Slack.BotToken)
	}

	if cfg.Slack.SigningSecret != "test-secret" {
		t.Errorf("expected signing secret to be test-secret, got %s", cfg.Slack.SigningSecret)
	}

	if cfg.App.Port != 8080 {
		t.Errorf("expected port to be 8080, got %d", cfg.App.Port)
	}

	if !cfg.App.UseFinishedJudge {
		t.Error("expected UseFinishedJudge to be true")
	}

	// Check defaults
	if cfg.AI.DisallowedTools == "" {
		t.Error("expected DisallowedTools to have default value")
	}

	if cfg.AI.DefaultSystemPrompt == "" {
		t.Error("expected DefaultSystemPrompt to have default value")
	}
}