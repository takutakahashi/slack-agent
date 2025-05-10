// tests/services/context.test.ts
import { describe, it, expect, vi } from 'vitest';
import ContextService from '../../src/services/context';
import SlackService from '../../src/services/slack';
import { MessageRecord } from '../../src/types';

// SlackService のモック
vi.mock('../../src/services/slack', () => ({
  default: {
    getThreadMessages: vi.fn(),
    isFirstInteraction: vi.fn(),
  }
}));

describe('ContextService', () => {
  describe('createImContext', () => {
    it('should create IM context with previous messages', async () => {
      // モックの準備
      const mockPreviousMessages: MessageRecord[] = [
        { user: 'U123', text: 'Hello', ts: '1234.5678' }
      ];
      
      // SlackService のモックメソッドの戻り値を設定
      (SlackService.getThreadMessages as any).mockResolvedValue(mockPreviousMessages);
      (SlackService.isFirstInteraction as any).mockReturnValue(true);
      
      const context = await ContextService.createImContext(
        {} as any, // モックのクライアント
        'U123',
        'C123',
        '1234.5678'
      );

      expect(context).toEqual({
        type: 'im',
        userId: 'U123',
        threadTs: '1234.5678',
        previousMessages: mockPreviousMessages,
        isFirstInteraction: true
      });
      
      expect(SlackService.getThreadMessages).toHaveBeenCalledWith(
        expect.anything(),
        'C123',
        '1234.5678'
      );
      
      expect(SlackService.isFirstInteraction).toHaveBeenCalledWith('U123');
    });
  });

  describe('createMentionContext', () => {
    it('should create mention context', () => {
      const context = ContextService.createMentionContext(
        'C123',
        'U123',
        '1234.5678'
      );

      expect(context).toEqual({
        type: 'mention',
        channelId: 'C123',
        userId: 'U123',
        threadTs: '1234.5678'
      });
    });
  });

  describe('createThreadContext', () => {
    it('should create thread context with previous messages', () => {
      const mockPreviousMessages: MessageRecord[] = [
        { user: 'U123', text: 'Hello', ts: '1234.5678' },
        { user: 'U456', text: 'Hi there', ts: '1234.5679' }
      ];

      const context = ContextService.createThreadContext(
        'C123',
        'U123',
        '1234.5678',
        mockPreviousMessages
      );

      expect(context).toEqual({
        type: 'thread',
        channelId: 'C123',
        userId: 'U123',
        threadTs: '1234.5678',
        previousMessages: mockPreviousMessages
      });
    });
  });
});