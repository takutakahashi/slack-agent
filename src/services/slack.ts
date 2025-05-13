// src/services/slack.ts
import type { MessageRecord, SlackClientInterface, SlackSayInterface } from '../types';

/**
 * ユーザーとの初回やり取りを記録するセット
 * プライベート変数として保持
 */
const userFirstInteraction = new Set<string>();

/**
 * Slack関連のサービス
 * Slack APIとのインタラクションを担当
 */
export const SlackService = {
  /**
   * スレッド内のメッセージを取得する関数
   */
  getThreadMessages: async (
    client: SlackClientInterface,
    channel: string,
    ts: string
  ): Promise<MessageRecord[]> => {
    try {
      const result = await client.conversations.replies({
        channel,
        ts,
      });
      
      if (!result.messages) return [];
      
      return result.messages
        .filter((msg: { ts?: string; user?: string; text?: string }) => msg.ts && msg.user)
        .map((msg: { ts: string; user: string; text?: string }) => ({
          user: msg.user,
          text: msg.text || '',
          ts: msg.ts,
        }));
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      return [];
    }
  },

  /**
   * スレッド内の全会話メッセージを取得し、ロールを付与する関数
   */
  getThreadMessagesWithRoles: async (
    client: SlackClientInterface,
    channel: string,
    ts: string,
    botUserId: string
  ): Promise<{ role: 'user' | 'assistant'; content: string; ts: string }[]> => {
    try {
      const messages = await SlackService.getThreadMessages(client, channel, ts);
      
      return messages.map(msg => ({
        role: msg.user === botUserId ? 'assistant' : 'user',
        content: msg.text,
        ts: msg.ts
      }));
    } catch (error) {
      console.error('Error fetching thread messages with roles:', error);
      return [];
    }
  },

  /**
   * エラーハンドリング関数
   */
  handleError: async (error: unknown, say: SlackSayInterface, thread_ts: string): Promise<void> => {
    console.error('Error handling message:', error);
    await say({
      text: 'すみません、エラーが発生しました。',
      thread_ts,
    });
  },

  /**
   * ユーザーとの初回やり取りをチェックする関数
   */
  isFirstInteraction: (userId: string): boolean => {
    return !userFirstInteraction.has(userId);
  },

  /**
   * ユーザーとの初回やり取りを記録する関数
   */
  recordFirstInteraction: (userId: string): void => {
    userFirstInteraction.add(userId);
  },

  /**
   * テスト用にユーザーとの初回やり取り記録をリセットする関数
   */
  resetFirstInteractions: (): void => {
    userFirstInteraction.clear();
  }
};

export default SlackService;