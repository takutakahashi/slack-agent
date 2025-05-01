import { App } from '@slack/bolt';
import { IMAgent } from '../agents/im';
import type { IMContext } from '../agents/im';

/**
 * IMイベント（ダイレクトメッセージ）に対する処理ハンドラ
 * @param app Bolt Appインスタンス
 */
export const registerIMHandler = (app: App): void => {
  const agent = new IMAgent();
  const userFirstInteraction = new Set<string>();

  app.message(async ({ message, say, client }) => {
    // DMメッセージのみを処理
    if (message.channel_type !== 'im' || message.subtype) {
      return;
    }

    try {
      let previousMessages: Array<{ user: string; text: string; ts: string }> = [];
      
      // スレッド内のメッセージの場合は履歴を取得
      if ('thread_ts' in message && message.thread_ts) {
        const result = await client.conversations.replies({
          channel: message.channel,
          ts: message.thread_ts,
        });

        if (result.messages) {
          previousMessages = result.messages
            .filter(msg => msg.ts && msg.user)
            .map(msg => ({
              user: msg.user!,
              text: msg.text || '',
              ts: msg.ts!,
            }));
        }
      } else {
        // スレッドでない場合は最近のDM履歴を取得
        const result = await client.conversations.history({
          channel: message.channel,
          limit: 10,
        });

        if (result.messages) {
          previousMessages = result.messages
            .filter(msg => msg.ts && msg.user)
            .map(msg => ({
              user: msg.user!,
              text: msg.text || '',
              ts: msg.ts!,
            }));
        }
      }

      // コンテキストを作成
      const context: IMContext = {
        userId: message.user || '',
        threadTs: 'thread_ts' in message ? message.thread_ts : undefined,
        previousMessages,
        isFirstInteraction: !userFirstInteraction.has(message.user || ''),
      };

      // AIエージェントに処理を依頼
      const response = await agent.handleMessage(message.text || '', context);

      // 応答を送信
      await say({
        text: response,
        thread_ts: 'thread_ts' in message ? message.thread_ts : undefined,
      });

      // ユーザーとの初回やり取りを記録
      if (context.isFirstInteraction && message.user) {
        userFirstInteraction.add(message.user);
      }

    } catch (error) {
      console.error('Error handling IM:', error);
      await say({
        text: 'すみません、エラーが発生しました。',
        thread_ts: 'thread_ts' in message ? message.thread_ts : undefined,
      });
    }
  });
}; 