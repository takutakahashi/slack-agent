// tests/services/slack.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SlackService from '../../src/services/slack';
import { MessageRecord } from '../../src/types';

describe('SlackService', () => {
  describe('getThreadMessages', () => {
    it('should extract messages from Slack API response', async () => {
      // モックのSlackクライアント
      const mockClient = {
        conversations: {
          replies: vi.fn().mockResolvedValue({
            messages: [
              { user: 'U123', text: 'Hello', ts: '1234.5678' },
              { user: 'U456', text: 'Hi there', ts: '1234.5679' }
            ]
          })
        }
      };

      const messages = await SlackService.getThreadMessages(
        mockClient as any,
        'C123',
        '1234.5678'
      );

      expect(messages).toHaveLength(2);
      expect(messages[0].user).toBe('U123');
      expect(messages[0].text).toBe('Hello');
      expect(mockClient.conversations.replies).toHaveBeenCalledWith({
        channel: 'C123',
        ts: '1234.5678'
      });
    });

    it('should handle empty messages array', async () => {
      // モックのSlackクライアント
      const mockClient = {
        conversations: {
          replies: vi.fn().mockResolvedValue({
            messages: []
          })
        }
      };

      const messages = await SlackService.getThreadMessages(
        mockClient as any,
        'C123',
        '1234.5678'
      );

      expect(messages).toHaveLength(0);
    });

    it('should handle API error gracefully', async () => {
      // エラーをスローするモック
      const mockClient = {
        conversations: {
          replies: vi.fn().mockRejectedValue(new Error('API error'))
        }
      };

      const messages = await SlackService.getThreadMessages(
        mockClient as any,
        'C123',
        '1234.5678'
      );

      expect(messages).toHaveLength(0);
      // テストではコンソールエラーログの出力のみを確認（実際のログ内容は検証しない）
      // モック化する場合は vi.spyOn(console, 'error') を使用できる
    });
  });

  describe('isFirstInteraction and recordFirstInteraction', () => {
    beforeEach(() => {
      // テスト間で状態をリセット
      SlackService.resetFirstInteractions();
    });

    it('should correctly track first interactions', () => {
      const userId = 'U123';
      
      // 最初の相互作用はtrueを返すべき
      expect(SlackService.isFirstInteraction(userId)).toBe(true);
      
      // 記録
      SlackService.recordFirstInteraction(userId);
      
      // 2回目はfalseを返すべき
      expect(SlackService.isFirstInteraction(userId)).toBe(false);
      
      // 別のユーザーは初回として扱われるべき
      expect(SlackService.isFirstInteraction('U456')).toBe(true);
    });
  });

  describe('handleError', () => {
    it('should call say with error message', async () => {
      const mockSay = vi.fn();
      const error = new Error('Test error');
      const threadTs = '1234.5678';

      await SlackService.handleError(error, mockSay, threadTs);

      expect(mockSay).toHaveBeenCalledWith({
        text: 'すみません、エラーが発生しました。',
        thread_ts: threadTs
      });
    });
  });
});