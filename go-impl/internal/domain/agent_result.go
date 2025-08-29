package domain

// AgentResult represents the result from an AI agent
type AgentResult struct {
	Response string
	Error    error
}

// NewAgentResult creates a new AgentResult instance
func NewAgentResult(response string, err error) *AgentResult {
	return &AgentResult{
		Response: response,
		Error:    err,
	}
}

// IsError checks if the result contains an error
func (ar *AgentResult) IsError() bool {
	return ar.Error != nil
}