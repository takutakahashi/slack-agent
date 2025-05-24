// tests/handlers/index.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerHandlers } from '../../src/handlers';
import SlackService from '../../src/services/slack';
import ContextService from '../../src/services/context';
import { judgeFinishStatus } from '../../src/agents/finished';
import path from 'path';

// サービスのモック
vi.mock('../../src/services/slack');
vi.mock('../../src/services/context');
vi.mock('../../src/agents/finished');
vi.mock('child_process', () => ({
  execFile: vi.fn((cmd, args, options, callback) => {
    if (typeof callback === 'function') {
      callback(null, { stdout: 'Mock response', stderr: '' });
      return;
    }
    return Promise.resolve({ stdout: 'Mock response', stderr: '' });
  })
}));
vi.mock('util', () => ({
  promisify: vi.fn((fn) => fn),
}));

// child_processのモックを取得
import { execFile } from 'child_process';
const mockedExecFile = execFile as unknown as ReturnType<typeof vi.fn>;

describe('Slack Handlers', () => {
  // モックのセットアップ
  let mockApp;
  const botUserId = 'B123';

  beforeEach(() => {
    // モックのリセット
    vi.resetAllMocks();
    
    // モックのアプリケーション
    mockApp = {
      message: vi.fn(),
      event: vi.fn()
    };
    
    // サービスのモック関数
    (SlackService.getThreadMessages as any).mockResolvedValue([]);
    (SlackService.getThreadMessagesWithRoles as any).mockResolvedValue([]);
    (SlackService.handleError as any).mockResolvedValue(undefined);
    (SlackService.isFirstInteraction as any).mockReturnValue(false);
    (SlackService.recordFirstInteraction as any).mockReturnValue(undefined);
    
    (judgeFinishStatus as any).mockResolvedValue('finish');
    
    (ContextService.createImContext as any).mockResolvedValue({ type: 'im', userId: '', threadTs: '' });
    (ContextService.createMentionContext as any).mockResolvedValue({ type: 'mention', userId: '', threadTs: '' });
    (ContextService.createThreadContext as any).mockResolvedValue({ type: 'thread', userId: '', threadTs: '' });
  });

  describe('registerHandlers', () => {
    it('should register message and event handlers', () => {
      registerHandlers(mockApp, botUserId);
      
      // message ハンドラが2回登録されることを確認（IM用とスレッド用）
      expect(mockApp.message).toHaveBeenCalledTimes(2);
      
      // event ハンドラが1回登録されることを確認（メンション用）
      expect(mockApp.event).toHaveBeenCalledTimes(1);
      expect(mockApp.event).toHaveBeenCalledWith('app_mention', expect.any(Function));
    });
  });

  // IMハンドラのテスト
  describe('IM message handler', () => {
    it('should use AGENT_SCRIPT_PATH environment variable when set', async () => {
      const originalEnv = process.env.AGENT_SCRIPT_PATH;
      process.env.AGENT_SCRIPT_PATH = '/custom/path/to/agent.sh';
      
      registerHandlers(mockApp, botUserId);
      
      const imHandler = mockApp.message.mock.calls[0][0];
      
      const mockMessage = {
        channel_type: 'im',
        user: 'U123',
        ts: '1234.5678',
        text: 'Hello bot',
        channel: 'C123'
      };
      const mockSay = vi.fn().mockResolvedValue(undefined);
      const mockClient = {};
      
      await imHandler({ message: mockMessage, say: mockSay, client: mockClient });
      
      expect(mockedExecFile).toHaveBeenCalled();
      expect(mockedExecFile.mock.calls[0][0]).toBe('bash');
      expect(mockedExecFile.mock.calls[0][1][0]).toBe('/custom/path/to/agent.sh');
      
      process.env.AGENT_SCRIPT_PATH = originalEnv;
    });
    
    it('should process IM messages correctly', async () => {
      registerHandlers(mockApp, botUserId);
      
      // message ハンドラの最初の呼び出しで渡された関数を取得
      const imHandler = mockApp.message.mock.calls[0][0];
      
      // モックのメッセージとSayとクライアント
      const mockMessage = {
        channel_type: 'im',
        user: 'U123',
        ts: '1234.5678',
        text: 'Hello bot',
        channel: 'C123'
      };
      const mockSay = vi.fn().mockResolvedValue(undefined);
      const mockClient = {};
      
      // ハンドラを呼び出し
      await imHandler({ message: mockMessage, say: mockSay, client: mockClient });
      
      // コンテキストが作成されたことを確認
      expect(ContextService.createImContext).toHaveBeenCalledWith(
        mockClient,
        'U123',
        'C123',
        '1234.5678',
        botUserId
      );
      
      // execFileが呼び出されたことを確認
      expect(mockedExecFile).toHaveBeenCalled();
      expect(mockedExecFile.mock.calls[0][0]).toBe('bash');
      expect(mockedExecFile.mock.calls[0][1]).toHaveLength(2);
      expect(mockedExecFile.mock.calls[0][1][1]).toBe('Hello bot');
      expect(mockedExecFile.mock.calls[0][2].env).toHaveProperty('SLACK_CHANNEL_ID', 'C123');
      expect(mockedExecFile.mock.calls[0][2].env).toHaveProperty('SLACK_THREAD_TS', '1234.5678');
      
      // 応答が送信されたことを確認
      expect(mockSay).toHaveBeenCalledWith({
        text: 'Mock response',
        thread_ts: '1234.5678'
      });
    });
    
    it('should skip non-IM messages', async () => {
      registerHandlers(mockApp, botUserId);
      
      const imHandler = mockApp.message.mock.calls[0][0];
      
      // チャンネルタイプがIMでないメッセージ
      const mockMessage = {
        channel_type: 'channel',
        user: 'U123',
        ts: '1234.5678',
        text: 'Hello bot'
      };
      const mockSay = vi.fn();
      const mockClient = {};
      
      await imHandler({ message: mockMessage, say: mockSay, client: mockClient });
      
      // IM以外のメッセージは処理されないはず
      expect(ContextService.createImContext).not.toHaveBeenCalled();
      expect(mockedExecFile).not.toHaveBeenCalled();
      expect(mockSay).not.toHaveBeenCalled();
    });
    
    it('should handle errors correctly', async () => {
      registerHandlers(mockApp, botUserId);
      
      const imHandler = mockApp.message.mock.calls[0][0];
      
      // エラーをスローするように設定
      (ContextService.createImContext as any).mockRejectedValue(new Error('Test error'));
      
      const mockMessage = {
        channel_type: 'im',
        user: 'U123',
        ts: '1234.5678',
        text: 'Hello bot'
      };
      const mockSay = vi.fn();
      const mockClient = {};
      
      await imHandler({ message: mockMessage, say: mockSay, client: mockClient });
      
      // エラーハンドリングが呼ばれたことを確認
      expect(SlackService.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        mockSay,
        '1234.5678'
      );
    });
  });
  
  // メンションハンドラのテスト
  describe('Mention handler', () => {
    it('should process mention correctly', async () => {
      registerHandlers(mockApp, botUserId);
      
      // event ハンドラの呼び出しで渡された関数を取得
      const mentionHandler = mockApp.event.mock.calls[0][1];
      
      // モックのイベント
      const mockEvent = {
        channel: 'C123',
        user: 'U123',
        ts: '1234.5678',
        text: 'Hello <@B123>'
      };
      const mockSay = vi.fn().mockResolvedValue(undefined);
      const mockClient = {};
      
      // ハンドラを呼び出し
      await mentionHandler({ event: mockEvent, say: mockSay, client: mockClient });
      
      // コンテキストが作成されたことを確認
      expect(ContextService.createMentionContext).toHaveBeenCalledWith(
        mockClient,
        'C123',
        'U123',
        '1234.5678',
        botUserId
      );
      
      // execFileが呼び出されたことを確認
      expect(mockedExecFile).toHaveBeenCalled();
      expect(mockedExecFile.mock.calls[0][0]).toBe('bash');
      expect(mockedExecFile.mock.calls[0][1]).toHaveLength(2);
      expect(mockedExecFile.mock.calls[0][1][1]).toBe('Hello <@B123>');
      expect(mockedExecFile.mock.calls[0][2].env).toHaveProperty('SLACK_CHANNEL_ID', 'C123');
      expect(mockedExecFile.mock.calls[0][2].env).toHaveProperty('SLACK_THREAD_TS', '1234.5678');
      
      // 応答が送信されたことを確認
      expect(mockSay).toHaveBeenCalledWith({
        text: 'Mock response',
        thread_ts: '1234.5678'
      });
    });
    
    it('should skip thread mentions', async () => {
      registerHandlers(mockApp, botUserId);
      
      const mentionHandler = mockApp.event.mock.calls[0][1];
      
      // スレッド内のメンション
      const mockEvent = {
        channel: 'C123',
        user: 'U123',
        ts: '1234.5678',
        thread_ts: '1234.5677', // スレッドのタイムスタンプがある
        text: 'Hello <@B123>'
      };
      const mockSay = vi.fn();
      const mockClient = {};
      
      await mentionHandler({ event: mockEvent, say: mockSay, client: mockClient });
      
      // スレッド内メンションは処理されないはず
      expect(ContextService.createMentionContext).not.toHaveBeenCalled();
      expect(mockedExecFile).not.toHaveBeenCalled();
      expect(mockSay).not.toHaveBeenCalled();
    });
  });
  
  // スレッドメッセージハンドラのテスト
  describe('Thread message handler', () => {
    it('should process thread messages correctly', async () => {
      registerHandlers(mockApp, botUserId);
      
      // 2番目のmessageハンドラ（スレッド用）を取得
      const threadHandler = mockApp.message.mock.calls[1][0];
      
      // モックのスレッドメッセージ
      const mockMessage = {
        thread_ts: '1234.5677',
        user: 'U123',
        ts: '1234.5678',
        text: 'Thread reply',
        channel: 'C123'
      };
      
      const mockSay = vi.fn().mockResolvedValue(undefined);
      const mockClient = {};
      
      // botが参加しているスレッドとしてモック
      (SlackService.getThreadMessages as any).mockResolvedValue([
        { user: botUserId, text: 'Bot message', ts: '1234.5676' }
      ]);
      
      // ハンドラを呼び出し
      await threadHandler({ message: mockMessage, say: mockSay, client: mockClient });
      
      // スレッドコンテキストが作成されたことを確認
      expect(ContextService.createThreadContext).toHaveBeenCalledWith(
        mockClient,
        'C123',
        'U123',
        '1234.5677',
        botUserId
      );
      
      // execFileが呼び出されたことを確認
      expect(mockedExecFile).toHaveBeenCalled();
      expect(mockedExecFile.mock.calls[0][0]).toBe('bash');
      expect(mockedExecFile.mock.calls[0][1]).toHaveLength(2);
      expect(mockedExecFile.mock.calls[0][1][1]).toBe('Thread reply');
      expect(mockedExecFile.mock.calls[0][2].env).toHaveProperty('SLACK_CHANNEL_ID', 'C123');
      expect(mockedExecFile.mock.calls[0][2].env).toHaveProperty('SLACK_THREAD_TS', '1234.5677');
      
      // 応答が送信されたことを確認
      expect(mockSay).toHaveBeenCalledWith({
        text: 'Mock response',
        thread_ts: '1234.5677'
      });
    });
    
    it('should skip messages in threads where bot is not participating', async () => {
      registerHandlers(mockApp, botUserId);
      
      const threadHandler = mockApp.message.mock.calls[1][0];
      
      const mockMessage = {
        thread_ts: '1234.5677',
        user: 'U123',
        ts: '1234.5678',
        text: 'Thread reply',
        channel: 'C123'
      };
      
      const mockSay = vi.fn();
      const mockClient = {};
      
      // botが参加していないスレッドとしてモック
      (SlackService.getThreadMessages as any).mockResolvedValue([
        { user: 'U456', text: 'Other user message', ts: '1234.5676' }
      ]);
      
      await threadHandler({ message: mockMessage, say: mockSay, client: mockClient });
      
      // botが参加していないスレッドは処理されないはず
      expect(ContextService.createThreadContext).not.toHaveBeenCalled();
      expect(mockedExecFile).not.toHaveBeenCalled();
      expect(mockSay).not.toHaveBeenCalled();
    });
  });
});
