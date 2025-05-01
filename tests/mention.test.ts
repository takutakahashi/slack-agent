// tests/mention.test.ts
import { describe, it, expect, vi } from 'vitest';
import { App } from '@slack/bolt';
import { registerMentionHandler } from '../src/handlers/mention';

describe('Mention Handler', () => {
  it('should register mention handler', () => {
    // モックAppインスタンスの作成
    const mockApp = {
      event: vi.fn(),
    } as unknown as App;

    // ハンドラーの登録
    registerMentionHandler(mockApp);

    // イベントハンドラーが登録されたことを確認
    expect(mockApp.event).toHaveBeenCalledTimes(1);
    expect(mockApp.event).toHaveBeenCalledWith('app_mention', expect.any(Function));
  });

  it('should handle mention events', async () => {
    // モックの作成
    const mockSay = vi.fn().mockResolvedValue({ ts: '1234.5678' });
    const mockClient = {
      conversations: {
        replies: vi.fn().mockResolvedValue({
          messages: ['test message'],
        }),
      },
    };
    const mockEvent = {
      user: 'U12345',
      text: 'こんにちは <@U67890>',
      ts: '1625792323.000300',
      channel: 'C12345',
    };

    // ハンドラー関数を保持する変数
    let storedHandler: Function | undefined;

    // モックAppインスタンスの作成
    const mockApp = {
      event: vi.fn().mockImplementation((_, handler) => {
        storedHandler = handler;
      }),
    } as unknown as App;

    // ハンドラーの登録
    registerMentionHandler(mockApp);

    // ハンドラーが登録されたことを確認
    expect(mockApp.event).toHaveBeenCalledWith('app_mention', expect.any(Function));

    // ハンドラーが保存されていることを確認
    expect(storedHandler).toBeDefined();

    // 保存したハンドラーを実行
    await storedHandler!({ event: mockEvent, say: mockSay, client: mockClient });

    // 期待する結果の検証
    expect(mockSay).toHaveBeenCalledWith({
      text: `<@${mockEvent.user}> メッセージを受け取りました！`,
      thread_ts: mockEvent.ts,
    });

    // スレッド返信の取得が呼ばれたことを確認
    expect(mockClient.conversations.replies).toHaveBeenCalledWith({
      channel: mockEvent.channel,
      ts: mockEvent.ts,
    });
  });
});