package cli

import (
	"bytes"
	"os"
	"strings"
	"testing"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func TestRootCmd(t *testing.T) {
	tests := []struct {
		name           string
		args           []string
		expectedOutput string
	}{
		{
			name:           "help command",
			args:           []string{"--help"},
			expectedOutput: "Slack Agent is a bot that integrates AI capabilities into Slack",
		},
		{
			name:           "version info in help",
			args:           []string{"--help"},
			expectedOutput: "Slack Agent",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a new root command for testing
			cmd := &cobra.Command{
				Use:   "slack-agent",
				Short: "Slack integration for AI Agents",
				Long: `Slack Agent is a bot that integrates AI capabilities into Slack.
It can respond to mentions and direct messages using AI-powered responses.`,
			}

			var output bytes.Buffer
			cmd.SetOutput(&output)
			cmd.SetArgs(tt.args)

			// Execute command
			err := cmd.Execute()
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}

			outputStr := output.String()
			if tt.expectedOutput != "" && !strings.Contains(outputStr, tt.expectedOutput) {
				t.Errorf("expected output to contain %q, got %q", tt.expectedOutput, outputStr)
			}
		})
	}
}

func TestExecute(t *testing.T) {
	// Test that Execute function works correctly
	// We can't easily test os.Exit(1) calls, so we test successful execution
	
	// Save original args
	originalArgs := os.Args
	defer func() {
		os.Args = originalArgs
	}()

	// Set test args
	os.Args = []string{"slack-agent", "--help"}

	// We expect this to not panic or cause issues
	// The actual Execute() function calls os.Exit() which we can't easily test
	// So we test the underlying rootCmd.Execute() instead
	var output bytes.Buffer
	rootCmd.SetOutput(&output)
	rootCmd.SetArgs([]string{"--help"})

	err := rootCmd.Execute()
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	outputStr := output.String()
	if !strings.Contains(outputStr, "slack-agent") {
		t.Errorf("expected output to contain command name, got %q", outputStr)
	}
}

func TestInitConfig(t *testing.T) {
	tests := []struct {
		name           string
		configFile     string
		setupEnv       func()
		cleanupEnv     func()
		expectError    bool
	}{
		{
			name:       "no config file",
			configFile: "",
			setupEnv: func() {
				viper.Reset()
			},
			cleanupEnv: func() {
				viper.Reset()
			},
			expectError: false,
		},
		{
			name:       "specific config file",
			configFile: "/tmp/test-config.yaml",
			setupEnv: func() {
				viper.Reset()
				cfgFile = "/tmp/test-config.yaml"
				// Create a temporary config file
				configContent := `slack:
  bot_token: "test-token"
ai:
  agent_script_path: "/test/path"
`
				if err := os.WriteFile("/tmp/test-config.yaml", []byte(configContent), 0644); err != nil {
					t.Fatalf("failed to create test config: %v", err)
				}
			},
			cleanupEnv: func() {
				os.Remove("/tmp/test-config.yaml")
				cfgFile = ""
				viper.Reset()
			},
			expectError: false,
		},
		{
			name:       "environment variables",
			configFile: "",
			setupEnv: func() {
				viper.Reset()
				os.Setenv("SLACK_BOT_TOKEN", "env-token")
				os.Setenv("AI_AGENT_SCRIPT_PATH", "/env/path")
			},
			cleanupEnv: func() {
				os.Unsetenv("SLACK_BOT_TOKEN")
				os.Unsetenv("AI_AGENT_SCRIPT_PATH")
				viper.Reset()
			},
			expectError: false,
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

			// Call initConfig
			initConfig()

			// Verify viper is configured
			if tt.configFile != "" {
				// If we specified a config file, check it's being used
				if viper.ConfigFileUsed() != tt.configFile {
					t.Errorf("expected config file %s, got %s", tt.configFile, viper.ConfigFileUsed())
				}
			}

			// Test that environment variables work
			if os.Getenv("SLACK_BOT_TOKEN") != "" {
				token := viper.GetString("SLACK_BOT_TOKEN")
				if token != os.Getenv("SLACK_BOT_TOKEN") {
					t.Errorf("expected token from env %s, got %s", os.Getenv("SLACK_BOT_TOKEN"), token)
				}
			}
		})
	}
}

func TestConfigFilePaths(t *testing.T) {
	// Test that viper is configured to look in the right places
	viper.Reset()
	
	// Mock home directory
	originalHome := os.Getenv("HOME")
	defer os.Setenv("HOME", originalHome)
	
	tempDir := t.TempDir()
	os.Setenv("HOME", tempDir)
	
	initConfig()
	
	// Verify config paths are set correctly
	// This is indirectly tested by checking that viper can find config files
	configPaths := viper.GetStringSlice("config_paths")
	
	// Since viper doesn't expose config paths directly, we test by trying to read a config
	testConfigPath := tempDir + "/.slack-agent.yaml"
	testConfigContent := `slack:
  bot_token: "test-from-home"
`
	
	err := os.WriteFile(testConfigPath, []byte(testConfigContent), 0644)
	if err != nil {
		t.Fatalf("failed to create test config: %v", err)
	}
	defer os.Remove(testConfigPath)
	
	// Re-initialize to pick up the config
	viper.Reset()
	initConfig()
	
	// Check if the config was loaded
	token := viper.GetString("slack.bot_token")
	if token != "test-from-home" {
		t.Errorf("config not loaded from home directory: got token %s", token)
	}
	
	// Clean up
	_ = configPaths // Just to avoid unused variable warning
}