// tests/handlers/index.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerHandlers } from '../../src/handlers';
import SlackService from '../../src/services/slack';
import AgentService from '../../src/services/agent';
import ContextService from '../../src/services/context';

// サービスのモック
vi.mock('../../src/services/slack');
vi.mock('../../src/services/agent');
vi.mock('../../src/services/context');

describe('Slack Handlers', () => {
  // モックのセットアップ
  let mockApp;
  let mockAgentInstance;
  let mockToolsets;
  const botUserId = 'B123';

  beforeEach(() => {
    // モックのリセット
    vi.resetAllMocks();
    
    // モックのアプリケーション
    mockApp = {
      message: vi.fn(),
      event: vi.fn()
    };
    
    // モックのエージェントと追加機能
    mockAgentInstance = {};
    mockToolsets = {};
    
    // サービスのモック関数
    (SlackService.getThreadMessages as any).mockResolvedValue([]);
    (SlackService.handleError as any).mockResolvedValue(undefined);
    (SlackService.isFirstInteraction as any).mockReturnValue(false);
    (SlackService.recordFirstInteraction as any).mockReturnValue(undefined);
    
    (AgentService.generateResponse as any).mockResolvedValue({ text: 'Mock response' });
    
    (ContextService.createImContext as any).mockResolvedValue({ type: 'im', userId: '', threadTs: '' });
    (ContextService.createMentionContext as any).mockReturnValue({ type: 'mention', userId: '', threadTs: '' });
    (ContextService.createThreadContext as any).mockReturnValue({ type: 'thread', userId: '', threadTs: '' });
  });

  describe('registerHandlers', () => {
    it('should register message and event handlers', () => {
      registerHandlers(mockApp, mockAgentInstance, mockToolsets, botUserId);
      
      // message ハンドラが2回登録されることを確認（IM用とスレッド用）
      expect(mockApp.message).toHaveBeenCalledTimes(2);
      
      // event ハンドラが1回登録されることを確認（メンション用）
      expect(mockApp.event).toHaveBeenCalledTimes(1);
      expect(mockApp.event).toHaveBeenCalledWith('app_mention', expect.any(Function));
    });
  });

  // IMハンドラのテスト
  describe('IM message handler', () => {
    it('should process IM messages correctly', async () => {
      registerHandlers(mockApp, mockAgentInstance, mockToolsets, botUserId);
      
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
        '1234.5678'
      );
      
      // 応答が生成されたことを確認
      expect(AgentService.generateResponse).toHaveBeenCalled();
      
      // 応答が送信されたことを確認
      expect(mockSay).toHaveBeenCalledWith({
        text: 'Mock response',
        thread_ts: '1234.5678'
      });
    });
    
    it('should skip non-IM messages', async () => {
      registerHandlers(mockApp, mockAgentInstance, mockToolsets, botUserId);
      
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
      expect(AgentService.generateResponse).not.toHaveBeenCalled();
      expect(mockSay).not.toHaveBeenCalled();
    });
    
    it('should handle errors correctly', async () => {
      registerHandlers(mockApp, mockAgentInstance, mockToolsets, botUserId);
      
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
      registerHandlers(mockApp, mockAgentInstance, mockToolsets, botUserId);
      
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
        'C123',
        'U123',
        '1234.5678'
      );
      
      // 応答が生成されたことを確認
      expect(AgentService.generateResponse).toHaveBeenCalled();
      
      // 応答が送信されたことを確認
      expect(mockSay).toHaveBeenCalledWith({
        text: 'Mock response',
        thread_ts: '1234.5678'
      });
    });
    
    it('should skip thread mentions', async () => {
      registerHandlers(mockApp, mockAgentInstance, mockToolsets, botUserId);
      
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
      expect(AgentService.generateResponse).not.toHaveBeenCalled();
      expect(mockSay).not.toHaveBeenCalled();
    });
  });
});