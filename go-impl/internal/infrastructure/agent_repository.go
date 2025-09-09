package infrastructure

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/takutakahashi/slack-agent/internal/domain"
)

// AgentRepositoryImpl implements the AgentRepository interface
type AgentRepositoryImpl struct {
	systemPrompt    string
	agentScriptPath string
	claudeExtraArgs []string
	disallowedTools []string
	slackBotToken   string
}

// NewAgentRepository creates a new AgentRepository instance
func NewAgentRepository(systemPrompt, agentScriptPath string, claudeExtraArgs []string, disallowedTools []string) *AgentRepositoryImpl {
	return &AgentRepositoryImpl{
		systemPrompt:    systemPrompt,
		agentScriptPath: agentScriptPath,
		claudeExtraArgs: claudeExtraArgs,
		disallowedTools: disallowedTools,
		slackBotToken:   os.Getenv("SLACK_BOT_TOKEN"),
	}
}

// StreamMessage represents a Claude stream output message
type StreamMessage struct {
	Type    string `json:"type"`
	Content string `json:"content,omitempty"`
	Text    string `json:"text,omitempty"`
}

// GenerateResponse generates a response using the AI agent
func (r *AgentRepositoryImpl) GenerateResponse(ctx context.Context, message *domain.Message) (*domain.AgentResult, error) {
	// Create session directory
	sessionDir := filepath.Join("sessions", message.ThreadTS)
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create session directory: %w", err)
	}

	// Load system prompt from file if path is provided
	systemPrompt := r.systemPrompt
	if r.systemPrompt != "" && strings.HasSuffix(r.systemPrompt, ".txt") {
		content, err := os.ReadFile(r.systemPrompt)
		if err != nil {
			log.Printf("Error reading system prompt file: %v", err)
		} else {
			systemPrompt = string(content)
		}
	}

	// Clean message text by removing mention
	cleanedText := r.cleanMessageText(message.Text)

	// Build Claude command arguments
	args := []string{
		"exec", "--",
		"claude", "-c",
		"--output-format", "stream-json",
		"--dangerously-skip-permissions",
		"-p", "--verbose",
	}

	// Add disallowed tools if provided
	if len(r.disallowedTools) > 0 {
		args = append(args, "--disallowedTools", strings.Join(r.disallowedTools, ","))
	}

	// Add extra arguments if provided
	args = append(args, r.claudeExtraArgs...)
	args = append(args, "--print")

	// Add the prompt as the last argument
	args = append(args, cleanedText)

	// Log the full command for debugging
	log.Printf("Executing Claude command: mise %s", strings.Join(args, " "))
	log.Printf("Claude prompt text: '%s'", cleanedText)
	log.Printf("Working directory: %s", sessionDir)

	// Create the command to run Claude through mise
	cmd := exec.CommandContext(ctx, "mise", args...)
	cmd.Dir = sessionDir

	// Set environment variables
	env := os.Environ()
	if systemPrompt != "" {
		env = append(env, fmt.Sprintf("SYSTEM_PROMPT=%s", systemPrompt))
		log.Printf("Setting SYSTEM_PROMPT environment variable (length: %d)", len(systemPrompt))
	}
	env = append(env, fmt.Sprintf("SLACK_AGENT_PROMPT=%s", cleanedText))
	log.Printf("Setting SLACK_AGENT_PROMPT environment variable: '%s'", cleanedText)
	cmd.Env = env

	// Create pipes for claude-posts command
	claudePipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Start Claude command
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start claude: %w", err)
	}

	// Create claude-posts command
	postsArgs := []string{
		fmt.Sprintf("--bot-token=%s", r.slackBotToken),
		fmt.Sprintf("--channel-id=%s", message.ChannelID),
		fmt.Sprintf("--thread-ts=%s", message.ThreadTS),
	}

	// Log claude-posts command for debugging
	log.Printf("Executing claude-posts command: claude-posts %s", strings.Join(postsArgs, " "))
	log.Printf("claude-posts bot-token: %s (length: %d)", maskToken(r.slackBotToken), len(r.slackBotToken))
	log.Printf("claude-posts channel-id: %s", message.ChannelID)
	log.Printf("claude-posts thread-ts: %s", message.ThreadTS)

	postsCmd := exec.CommandContext(ctx, "claude-posts", postsArgs...)
	postsCmd.Dir = sessionDir

	// Connect claude output to claude-posts input
	postsCmd.Stdin = claudePipe

	// Start claude-posts command
	if err := postsCmd.Start(); err != nil {
		cmd.Process.Kill()
		return nil, fmt.Errorf("failed to start claude-posts: %w", err)
	}

	// Read any errors from Claude
	errBytes, _ := io.ReadAll(stderr)

	// Wait for both commands to complete
	claudeErr := cmd.Wait()
	postsErr := postsCmd.Wait()

	if claudeErr != nil {
		log.Printf("Claude stderr: %s", string(errBytes))
		return domain.NewAgentResult("", claudeErr), nil
	}

	if postsErr != nil {
		return domain.NewAgentResult("", postsErr), nil
	}

	// Since claude-posts handles the posting directly, we return an empty response
	// The actual response has been sent to Slack already
	return domain.NewAgentResult("", nil), nil
}

// cleanMessageText removes mention tags from message text
func (r *AgentRepositoryImpl) cleanMessageText(text string) string {
	log.Printf("Original message text: '%s'", text)

	// Use regex to properly remove mention tags like <@U12345> or <@UMG0E05JR>
	mentionRegex := regexp.MustCompile(`<@[A-Z0-9_]+>`)
	cleanedText := mentionRegex.ReplaceAllString(text, "")

	// Trim whitespace
	cleanedText = strings.TrimSpace(cleanedText)

	log.Printf("Cleaned message text: '%s'", cleanedText)

	if cleanedText == "" {
		log.Printf("WARNING: Cleaned text is empty after removing mentions from: '%s'", text)
	}

	return cleanedText
}

// maskToken masks sensitive token for logging
func maskToken(token string) string {
	if len(token) <= 8 {
		return "***"
	}
	return token[:4] + "..." + token[len(token)-4:]
}

// Alternative implementation that collects output and returns it
func (r *AgentRepositoryImpl) GenerateResponseWithReturn(ctx context.Context, message *domain.Message) (*domain.AgentResult, error) {
	// Create session directory
	sessionDir := filepath.Join("sessions", message.ThreadTS)
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create session directory: %w", err)
	}

	// Load system prompt from file if path is provided
	systemPrompt := r.systemPrompt
	if r.systemPrompt != "" && strings.HasSuffix(r.systemPrompt, ".txt") {
		content, err := os.ReadFile(r.systemPrompt)
		if err != nil {
			log.Printf("Error reading system prompt file: %v", err)
		} else {
			systemPrompt = string(content)
		}
	}

	// Clean message text by removing mention
	cleanedText := r.cleanMessageText(message.Text)

	// Build Claude command arguments
	args := []string{
		"exec", "--",
		"claude", "-c",
		"--output-format", "stream-json",
		"--dangerously-skip-permissions",
		"-p", "--verbose",
	}

	// Add disallowed tools if provided
	if len(r.disallowedTools) > 0 {
		args = append(args, "--disallowedTools", strings.Join(r.disallowedTools, ","))
	}

	// Add extra arguments if provided
	args = append(args, r.claudeExtraArgs...)

	// Add the prompt as the last argument
	args = append(args, cleanedText)

	// Create the command to run Claude through mise
	cmd := exec.CommandContext(ctx, "mise", args...)
	cmd.Dir = sessionDir

	// Set environment variables
	env := os.Environ()
	if systemPrompt != "" {
		env = append(env, fmt.Sprintf("SYSTEM_PROMPT=%s", systemPrompt))
	}
	cmd.Env = env

	// Set up pipes
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start claude: %w", err)
	}

	// Collect the response text
	var responseText strings.Builder
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		var msg StreamMessage
		if err := json.Unmarshal([]byte(line), &msg); err == nil {
			if msg.Type == "text" && msg.Text != "" {
				responseText.WriteString(msg.Text)
			} else if msg.Type == "content" && msg.Content != "" {
				responseText.WriteString(msg.Content)
			}
		}
	}

	// Read any errors
	errBytes, _ := io.ReadAll(stderr)

	// Wait for the command to complete
	if err := cmd.Wait(); err != nil {
		log.Printf("Claude stderr: %s", string(errBytes))
		return domain.NewAgentResult("", err), nil
	}

	response := strings.TrimSpace(responseText.String())
	if response == "" {
		return nil, fmt.Errorf("empty response from agent")
	}

	return domain.NewAgentResult(response, nil), nil
}
