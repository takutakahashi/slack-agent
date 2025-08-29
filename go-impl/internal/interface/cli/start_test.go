package cli

import (
	"bytes"
	"os"
	"strings"
	"testing"

	"github.com/spf13/cobra"
	"github.com/takutakahashi/slack-agent/pkg/config"
)

func TestStartCmd(t *testing.T) {
	tests := []struct {
		name           string
		args           []string
		setupEnv       func()
		cleanupEnv     func()
		expectError    bool
		expectedOutput string
	}{
		{
			name: "missing configuration",
			args: []string{"start"},
			setupEnv: func() {
				// Clear all environment variables
				os.Clearenv()
				// Set HOME to avoid "HOME is not defined" error
				os.Setenv("HOME", "/tmp")
				// Set minimal required env for bot token but leave missing signing secret
				os.Setenv("SLACK_BOT_TOKEN", "xoxb-test")
			},
			cleanupEnv: func() {
				// Environment will be cleared anyway after test
			},
			expectError:    true,
			expectedOutput: "SLACK_SIGNING_SECRET is required",
		},
		{
			name: "invalid configuration",
			args: []string{"start"},
			setupEnv: func() {
				os.Clearenv()
				// Set HOME to avoid "HOME is not defined" error
				os.Setenv("HOME", "/tmp")
				// Set invalid config (missing required fields)
				os.Setenv("SLACK_BOT_TOKEN", "")
				os.Setenv("AI_AGENT_SCRIPT_PATH", "")
			},
			cleanupEnv: func() {
				os.Clearenv()
			},
			expectError:    true,
			expectedOutput: "SLACK_BOT_TOKEN is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.setupEnv != nil {
				tt.setupEnv()
			}
			if tt.cleanupEnv != nil {
				defer tt.cleanupEnv()
			}

			// Create a new root command for testing
			cmd := &cobra.Command{
				Use: "test",
			}
			cmd.AddCommand(startCmd)

			// Capture output
			var output bytes.Buffer
			cmd.SetOutput(&output)
			cmd.SetArgs(tt.args)

			err := cmd.Execute()

			if tt.expectError && err == nil {
				t.Error("expected error but got none")
			}

			if !tt.expectError && err != nil {
				t.Errorf("unexpected error: %v", err)
			}

			outputStr := output.String()
			if tt.expectedOutput != "" && !strings.Contains(outputStr, tt.expectedOutput) {
				t.Errorf("expected output to contain %q, got %q", tt.expectedOutput, outputStr)
			}
		})
	}
}

func TestStartApp_ConfigValidation(t *testing.T) {
	tests := []struct {
		name        string
		config      *config.Config
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid config",
			config: &config.Config{
				Slack: config.SlackConfig{
					BotToken: "xoxb-test",
					AppToken: "xapp-test",
				},
				AI: config.AIConfig{
					AgentScriptPath: "/test/script.sh",
				},
				App: config.AppConfig{
					Port: 3000,
				},
			},
			expectError: false,
		},
		{
			name: "missing bot token",
			config: &config.Config{
				Slack: config.SlackConfig{
					BotToken: "",
					AppToken: "xapp-test",
				},
				AI: config.AIConfig{
					AgentScriptPath: "/test/script.sh",
				},
				App: config.AppConfig{
					Port: 3000,
				},
			},
			expectError: true,
			errorMsg:    "Invalid configuration",
		},
		{
			name: "missing agent script path",
			config: &config.Config{
				Slack: config.SlackConfig{
					BotToken: "xoxb-test",
					AppToken: "xapp-test",
				},
				AI: config.AIConfig{
					AgentScriptPath: "",
				},
				App: config.AppConfig{
					Port: 3000,
				},
			},
			expectError: true,
			errorMsg:    "Invalid configuration",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := startApp(tt.config)

			if tt.expectError && err == nil {
				t.Error("expected error but got none")
			}

			if !tt.expectError && err != nil {
				t.Errorf("unexpected error: %v", err)
			}

			if tt.expectError && err != nil {
				if tt.errorMsg != "" && !strings.Contains(err.Error(), tt.errorMsg) {
					t.Errorf("expected error to contain %q, got %q", tt.errorMsg, err.Error())
				}
			}
		})
	}
}

func TestStartApp_Integration(t *testing.T) {
	// This test checks if startApp properly initializes components
	// but doesn't actually start the application (which would block)
	
	// Create a temporary script file for testing
	tempDir := t.TempDir()
	scriptPath := tempDir + "/agent.sh"
	
	scriptContent := `#!/bin/bash
echo "test response"
exit 0
`
	if err := os.WriteFile(scriptPath, []byte(scriptContent), 0755); err != nil {
		t.Fatalf("failed to create test script: %v", err)
	}

	config := &config.Config{
		Slack: config.SlackConfig{
			BotToken: "xoxb-test-token",
			AppToken: "xapp-test-token",
		},
		AI: config.AIConfig{
			AgentScriptPath:      scriptPath,
			DefaultSystemPrompt:  "You are a test bot",
			ClaudeExtraArgs:     "--verbose",
			DisallowedTools:     "Bash,Edit",
		},
		App: config.AppConfig{
			Port: 3000,
		},
	}

	// Note: This test will fail when trying to connect to Slack,
	// but we can verify that the configuration and initialization works
	err := startApp(config)
	
	// We expect this to fail with a Slack connection error since we're using test tokens
	if err == nil {
		t.Error("expected error due to invalid Slack tokens")
	}

	// Check that the error is related to Slack connection, not configuration
	if !strings.Contains(err.Error(), "slack") && !strings.Contains(err.Error(), "bot") {
		t.Errorf("unexpected error type: %v", err)
	}
}

// Test helper functions

func TestExtractArgsAndTools(t *testing.T) {
	tests := []struct {
		name            string
		extraArgs       string
		disallowedTools string
		expectedArgs    []string
		expectedTools   []string
	}{
		{
			name:            "empty strings",
			extraArgs:       "",
			disallowedTools: "",
			expectedArgs:    []string{},
			expectedTools:   []string{""},
		},
		{
			name:            "single values",
			extraArgs:       "--verbose",
			disallowedTools: "Bash",
			expectedArgs:    []string{"--verbose"},
			expectedTools:   []string{"Bash"},
		},
		{
			name:            "multiple values",
			extraArgs:       "--verbose --debug",
			disallowedTools: "Bash,Edit,Write",
			expectedArgs:    []string{"--verbose", "--debug"},
			expectedTools:   []string{"Bash", "Edit", "Write"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			args := strings.Fields(tt.extraArgs)
			tools := strings.Split(tt.disallowedTools, ",")

			if len(args) != len(tt.expectedArgs) {
				t.Errorf("expected %d args, got %d", len(tt.expectedArgs), len(args))
			}

			for i, arg := range args {
				if arg != tt.expectedArgs[i] {
					t.Errorf("expected arg %s, got %s", tt.expectedArgs[i], arg)
				}
			}

			if len(tools) != len(tt.expectedTools) {
				t.Errorf("expected %d tools, got %d", len(tt.expectedTools), len(tools))
			}

			for i, tool := range tools {
				if tool != tt.expectedTools[i] {
					t.Errorf("expected tool %s, got %s", tt.expectedTools[i], tool)
				}
			}
		})
	}
}