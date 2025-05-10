// tests/services/agent.test.ts
import { describe, it, expect, vi } from 'vitest';
import AgentService from '../../src/services/agent';
import { MessageContext, AgentInterface } from '../../src/types';

describe('AgentService', () => {
  describe('generateResponse', () => {
    it('should call agent generate with correct parameters', async () => {
      // モックのエージェント
      const mockAgent = {
        generate: vi.fn().mockResolvedValue({
          text: 'This is a test response'
        })
      };

      // テスト用のコンテキスト
      const context: MessageContext = {
        type: 'im',
        userId: 'U123',
        threadTs: '1234.5678',
        isFirstInteraction: true
      };

      const userMessage = 'Hello, bot!';
      const mockToolsets = { tool1: {} };

      const response = await AgentService.generateResponse(
        mockAgent as AgentInterface,
        context,
        userMessage,
        mockToolsets
      );

      expect(response.text).toBe('This is a test response');
      expect(mockAgent.generate).toHaveBeenCalledWith(
        [
          { role: 'system', content: JSON.stringify(context) },
          { role: 'user', content: userMessage }
        ],
        { toolsets: mockToolsets }
      );
    });

    it('should handle agent errors', async () => {
      // エラーをスローするモック
      const mockAgent = {
        generate: vi.fn().mockRejectedValue(new Error('Agent error'))
      };

      const context: MessageContext = {
        type: 'im',
        userId: 'U123',
        threadTs: '1234.5678'
      };

      await expect(
        AgentService.generateResponse(
          mockAgent as AgentInterface,
          context,
          'Hello',
          {}
        )
      ).rejects.toThrow('Agent error');
    });
  });
});