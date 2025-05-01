// tests/message.test.ts
import { describe, it, expect, vi } from 'vitest';
import { App } from '@slack/bolt';
import { registerMessageHandler } from '../src/handlers/message';
import type { GenericMessageEvent } from '@slack/bolt';

describe('Message Handler', () => {
  it('should register message handler', () => {
    // モックAppインスタンスの作成
    const mockApp = {
      message: vi.fn(),
    } as unknown as App;

    // ハンドラーの登録
    registerMessageHandler(mockApp);

    // メッセージハンドラーが登録されたことを確認
    expect(mockApp.message).toHaveBeenCalledTimes(1);
    expect(mockApp.message).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should handle thread messages', async () => {
    // モックの作成
    const mockClient = {
      conversations: {
        replies: vi.fn().mockResolvedValue({
          messages: ['test message'],
        }),
      },
    };
    const mockMessage: Partial<GenericMessageEvent> = {
      user: 'U12345',
      text: 'スレッド内のメッセージ',
      ts: '1625792323.000300',
      thread_ts: '1625792300.000100',
      channel: 'C12345',
    };

    // ハンドラー関数を保持する変数
    let storedHandler: Function | undefined;

    // モックAppインスタンスの作成
    const mockApp = {
      message: vi.fn().mockImplementation((handler) => {
        storedHandler = handler;
      }),
    } as unknown as App;

    // ハンドラーの登録
    registerMessageHandler(mockApp);

    // ハンドラーが登録されたことを確認
    expect(mockApp.message).toHaveBeenCalledWith(expect.any(Function));

    // ハンドラーが保存されていることを確認
    expect(storedHandler).toBeDefined();

    // 保存したハンドラーを実行
    await storedHandler!({ message: mockMessage, client: mockClient });

    // スレッド返信の取得が呼ばれたことを確認
    expect(mockClient.conversations.replies).toHaveBeenCalledWith({
      channel: mockMessage.channel,
      ts: mockMessage.thread_ts,
    });
  });

  it('should ignore non-thread messages', async () => {
    // モックの作成
    const mockClient = {
      conversations: {
        replies: vi.fn().mockResolvedValue({
          messages: ['test message'],
        }),
      },
    };
    const mockMessage: Partial<GenericMessageEvent> = {
      user: 'U12345',
      text: '通常のメッセージ',
      ts: '1625792323.000300',
      channel: 'C12345',
      // thread_tsは含まない
    };

    // ハンドラー関数を保持する変数
    let storedHandler: Function | undefined;

    // モックAppインスタンスの作成
    const mockApp = {
      message: vi.fn().mockImplementation((handler) => {
        storedHandler = handler;
      }),
    } as unknown as App;

    // ハンドラーの登録
    registerMessageHandler(mockApp);

    // 保存したハンドラーを実行
    await storedHandler!({ message: mockMessage, client: mockClient });

    // スレッド返信の取得が呼ばれないことを確認
    expect(mockClient.conversations.replies).not.toHaveBeenCalled();
  });
}); 