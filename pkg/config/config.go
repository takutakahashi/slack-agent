package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

// Config represents the application configuration
type Config struct {
	Slack SlackConfig `mapstructure:"slack"`
	App   AppConfig   `mapstructure:"app"`
	AI    AIConfig    `mapstructure:"ai"`
}

// SlackConfig contains Slack-related configuration
type SlackConfig struct {
	BotToken      string `mapstructure:"bot_token"`
	SigningSecret string `mapstructure:"signing_secret"`
	AppToken      string `mapstructure:"app_token"`
}

// AppConfig contains application-level configuration
type AppConfig struct {
	Port             int  `mapstructure:"port"`
	UseFinishedJudge bool `mapstructure:"use_finished_judge"`
}

// AIConfig contains AI-related configuration
type AIConfig struct {
	OpenAIAPIKey        string `mapstructure:"openai_api_key"`
	SystemPromptPath    string `mapstructure:"system_prompt_path"`
	DefaultSystemPrompt string `mapstructure:"default_system_prompt"`
	DisallowedTools     string `mapstructure:"disallowed_tools"`
	AgentScriptPath     string `mapstructure:"agent_script_path"`
	ClaudeExtraArgs     string `mapstructure:"claude_extra_args"`
}

// Load loads configuration from environment variables and config file
func Load() (*Config, error) {
	// Set defaults
	viper.SetDefault("app.port", 3000)
	viper.SetDefault("app.use_finished_judge", false)
	viper.SetDefault("ai.disallowed_tools", "Bash,Edit,MultiEdit,Write,NotebookRead,NotebookEdit,WebFetch,TodoRead,TodoWrite,WebSearch")
	viper.SetDefault("ai.agent_script_path", "/usr/local/bin/start_agent.sh")
	viper.SetDefault("ai.default_system_prompt", defaultSystemPrompt)

	// Bind environment variables
	viper.SetEnvPrefix("")
	viper.AutomaticEnv()

	// Bind specific environment variables to config keys
	viper.BindEnv("slack.bot_token", "SLACK_BOT_TOKEN")
	viper.BindEnv("slack.signing_secret", "SLACK_SIGNING_SECRET")
	viper.BindEnv("slack.app_token", "SLACK_APP_TOKEN")
	viper.BindEnv("app.port", "PORT")
	viper.BindEnv("app.use_finished_judge", "USE_FINISHED_JUDGE")
	viper.BindEnv("ai.openai_api_key", "OPENAI_API_KEY")
	viper.BindEnv("ai.system_prompt_path", "SYSTEM_PROMPT_PATH")
	viper.BindEnv("ai.disallowed_tools", "DISALLOWED_TOOLS")
	viper.BindEnv("ai.agent_script_path", "AGENT_SCRIPT_PATH")
	viper.BindEnv("ai.claude_extra_args", "CLAUDE_EXTRA_ARGS")

	// Try to read config file if it exists
	if cfgFile := viper.GetString("config"); cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		viper.SetConfigName("slack-agent")
		viper.SetConfigType("yaml")
		viper.AddConfigPath(".")
		viper.AddConfigPath("$HOME/.config/slack-agent")
		viper.AddConfigPath("/etc/slack-agent")
	}

	// Read config file if exists
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("error reading config file: %w", err)
		}
		// Config file not found; ignore error
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("error unmarshaling config: %w", err)
	}

	// Load system prompt from file if specified
	if config.AI.SystemPromptPath != "" {
		content, err := os.ReadFile(config.AI.SystemPromptPath)
		if err != nil {
			return nil, fmt.Errorf("error reading system prompt file: %w", err)
		}
		config.AI.DefaultSystemPrompt = string(content)
	}

	return &config, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Check required fields
	if c.Slack.BotToken == "" {
		return fmt.Errorf("SLACK_BOT_TOKEN is required")
	}

	// Check mode-specific requirements
	isSocketMode := c.Slack.AppToken != ""
	if !isSocketMode && c.Slack.SigningSecret == "" {
		return fmt.Errorf("SLACK_SIGNING_SECRET is required for Web API mode")
	}

	// Validate agent script path
	if c.AI.AgentScriptPath != "" {
		if _, err := os.Stat(c.AI.AgentScriptPath); os.IsNotExist(err) {
			// Try to find in PATH
			if _, err := filepath.Abs(c.AI.AgentScriptPath); err != nil {
				return fmt.Errorf("agent script not found: %s", c.AI.AgentScriptPath)
			}
		}
	}

	return nil
}

const defaultSystemPrompt = `あなたは親切で有能なアシスタントです。ユーザーの質問や要望に対して、丁寧かつ適切に応答してください。

応答の際は以下の点に注意してください：
1. 明確で分かりやすい日本語を使用する
2. 必要に応じて箇条書きや見出しを使用して情報を整理する
3. 専門用語を使用する場合は適切な説明を加える
4. ユーザーの質問意図を理解し、的確な情報を提供する
5. 不確かな情報は提供せず、その旨を伝える`