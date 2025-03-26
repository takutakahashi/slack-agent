// tests/mention.test.ts
import { describe, it, expect, vi } from 'vitest';
import { handleMention } from '../src/handlers/mention';

// モックイベントとsay関数
const mockEvent = {
  user: 'U12345',
  text: 'こんにちは <@U67890>',
  ts: '1625792323.000300',
  channel: 'C12345'
};

describe('Mention Handler', () => {
  it('should reply to user with configured message', async () => {
    // sayモック関数の作成
    const mockSay = vi.fn();
    const replyMessage = 'テストメッセージです';
    
    // ハンドラ関数の呼び出し
    await handleMention(mockEvent, mockSay, replyMessage);
    
    // 期待する結果の検証
    expect(mockSay).toHaveBeenCalledTimes(1);
    expect(mockSay).toHaveBeenCalledWith({
      text: `<@${mockEvent.user}> ${replyMessage}`,
      thread_ts: mockEvent.ts
    });
  });
  
  it('should handle errors gracefully', async () => {
    // エラーを投げるmockSay関数
    const mockSayWithError = vi.fn().mockRejectedValueOnce(new Error('Test error'));
    const replyMessage = 'テストメッセージです';
    
    // 関数がエラーを投げることを検証
    await expect(handleMention(mockEvent, mockSayWithError, replyMessage))
      .rejects
      .toThrow('Test error');
    
    // 呼び出されたことを確認
    expect(mockSayWithError).toHaveBeenCalledTimes(1);
  });
});