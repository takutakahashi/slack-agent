package infrastructure_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/takutakahashi/slack-agent/internal/infrastructure"
)

func TestAgentRepositoryImpl_GenerateResponse(t *testing.T) {
	// Create a temporary script for testing
	tempDir := t.TempDir()
	scriptPath := filepath.Join(tempDir, "test_agent.sh")

	scriptContent := `#!/bin/bash
echo "Test response for: $1"
exit 0
`
	if err := os.WriteFile(scriptPath, []byte(scriptContent), 0755); err != nil {
		t.Fatalf("failed to create test script: %v", err)
	}

	tests := []struct {
		name            string
		systemPrompt    string
		agentScriptPath string
		claudeExtraArgs []string
		disallowedTools []string
		message         *domain.Message
		expectError     bool
	}{
		{
			name:            "successful response",
			systemPrompt:    "You are a helpful assistant",
			agentScriptPath: scriptPath,
			claudeExtraArgs: []string{},
			disallowedTools: []string{"Bash"},
			message:         domain.NewMessage("msg1", "U123", "C123", "Hello", "", time.Now()),
			expectError:     false,
		},
		{
			name:            "with extra args",
			systemPrompt:    "You are a helpful assistant",
			agentScriptPath: scriptPath,
			claudeExtraArgs: []string{"--verbose"},
			disallowedTools: []string{"Bash", "Edit"},
			message:         domain.NewMessage("msg2", "U123", "C123", "Test with args", "", time.Now()),
			expectError:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := infrastructure.NewAgentRepository(
				tt.systemPrompt,
				tt.agentScriptPath,
				tt.claudeExtraArgs,
				tt.disallowedTools,
			)

			result, err := repo.GenerateResponse(context.Background(), tt.message)

			if tt.expectError {
				if err == nil {
					t.Error("expected error, but got none")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if result == nil {
					t.Error("expected non-nil result")
				} else if result.Response == "" {
					t.Error("expected non-empty response")
				}
			}
		})
	}
}

func TestAgentRepositoryImpl_GenerateResponse_NonexistentScript(t *testing.T) {
	repo := infrastructure.NewAgentRepository(
		"Test prompt",
		"/nonexistent/script.sh",
		[]string{},
		[]string{},
	)

	_, err := repo.GenerateResponse(context.Background(), "test")

	if err == nil {
		t.Error("expected error for nonexistent script, but got none")
	}
}

func TestAgentRepositoryImpl_GenerateResponse_SystemPromptFromFile(t *testing.T) {
	// Create a temporary system prompt file
	tempDir := t.TempDir()
	promptPath := filepath.Join(tempDir, "system_prompt.txt")
	scriptPath := filepath.Join(tempDir, "test_agent.sh")

	systemPromptContent := "You are a test assistant"
	if err := os.WriteFile(promptPath, []byte(systemPromptContent), 0644); err != nil {
		t.Fatalf("failed to create system prompt file: %v", err)
	}

	scriptContent := `#!/bin/bash
echo "Response with system prompt: $SYSTEM_PROMPT"
exit 0
`
	if err := os.WriteFile(scriptPath, []byte(scriptContent), 0755); err != nil {
		t.Fatalf("failed to create test script: %v", err)
	}

	repo := infrastructure.NewAgentRepository(
		promptPath, // This should be treated as a file path
		scriptPath,
		[]string{},
		[]string{},
	)

	result, err := repo.GenerateResponse(context.Background(), "test")

	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	if result == nil {
		t.Error("expected non-nil result")
	} else {
		// The response should indicate the system prompt was loaded from file
		if !contains(result.Response, systemPromptContent) {
			t.Errorf("expected response to contain system prompt content, got: %s", result.Response)
		}
	}
}

// Helper function since strings.Contains is not available in this context
func contains(s, substr string) bool {
	return len(s) >= len(substr) && containsAt(s, substr, 0)
}

func containsAt(s, substr string, start int) bool {
	for i := start; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
