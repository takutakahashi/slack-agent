package infrastructure

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"strings"
	"github.com/takutakahashi/slack-agent/internal/domain"
)

// AgentRepositoryImpl implements the AgentRepository interface
type AgentRepositoryImpl struct {
	systemPrompt    string
	agentScriptPath string
	claudeExtraArgs []string
	disallowedTools []string
}

// NewAgentRepository creates a new AgentRepository instance
func NewAgentRepository(systemPrompt, agentScriptPath string, claudeExtraArgs []string, disallowedTools []string) *AgentRepositoryImpl {
	return &AgentRepositoryImpl{
		systemPrompt:    systemPrompt,
		agentScriptPath: agentScriptPath,
		claudeExtraArgs: claudeExtraArgs,
		disallowedTools: disallowedTools,
	}
}

// GenerateResponse generates a response using the AI agent
func (r *AgentRepositoryImpl) GenerateResponse(ctx context.Context, prompt string) (*domain.AgentResult, error) {
	// Check if script exists first
	if _, err := os.Stat(r.agentScriptPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("agent script not found: %s", r.agentScriptPath)
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

	// Build the command arguments
	args := []string{r.agentScriptPath, prompt}
	
	// Add extra arguments if provided
	args = append(args, r.claudeExtraArgs...)
	
	// Create the command
	cmd := exec.CommandContext(ctx, "bash", args...)
	
	// Set environment variables
	env := os.Environ()
	env = append(env, fmt.Sprintf("SYSTEM_PROMPT=%s", systemPrompt))
	
	// Add disallowed tools if provided
	if len(r.disallowedTools) > 0 {
		env = append(env, fmt.Sprintf("DISALLOWED_TOOLS=%s", strings.Join(r.disallowedTools, ",")))
	}
	
	cmd.Env = env
	
	// Set up pipes for stdout and stderr
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
		return nil, fmt.Errorf("failed to start agent: %w", err)
	}
	
	// Read output
	outBytes, err := io.ReadAll(stdout)
	if err != nil {
		return nil, fmt.Errorf("failed to read stdout: %w", err)
	}
	
	errBytes, err := io.ReadAll(stderr)
	if err != nil {
		log.Printf("Failed to read stderr: %v", err)
	}
	
	// Wait for the command to complete
	if err := cmd.Wait(); err != nil {
		log.Printf("Agent stderr: %s", string(errBytes))
		return domain.NewAgentResult("", err), nil
	}
	
	response := strings.TrimSpace(string(outBytes))
	if response == "" {
		return nil, fmt.Errorf("empty response from agent")
	}
	
	return domain.NewAgentResult(response, nil), nil
}