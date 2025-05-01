import { App } from '@slack/bolt';
import { ThreadAgent } from '../agents/thread';
import type { ThreadContext } from '../agents/thread';

export const registerThreadHandler = (app: App): void => {
  const agent = new ThreadAgent();

  app.message(async ({ message, say, client }) => {
    // スレッドメッセージのみを処理
    if (!('thread_ts' in message) || !message.thread_ts || message.subtype) {
      return;
    }

    try {
      // スレッドの会話履歴を取得
      const result = await client.conversations.replies({
        channel: message.channel,
        ts: message.thread_ts,
      });

      if (!result.messages) {
        return;
      }

      // 会話履歴を構築
      const previousMessages = result.messages
        .filter(msg => msg.ts && msg.user) // 必要なプロパティが存在するメッセージのみをフィルタリング
        .map(msg => ({
          user: msg.user!,
          text: msg.text || '',
          ts: msg.ts!,
        }));

      // スレッドコンテキストを作成
      const context: ThreadContext = {
        channelId: message.channel,
        userId: message.user || '',
        threadTs: message.thread_ts,
        previousMessages,
      };

      // AIエージェントに処理を依頼
      const response = await agent.handleMessage(message.text || '', context);

      // 応答を送信
      await say({
        text: response,
        thread_ts: message.thread_ts,
      });

    } catch (error) {
      console.error('Error handling thread message:', error);
      await say({
        text: 'すみません、エラーが発生しました。',
        thread_ts: message.thread_ts,
      });
    }
  });
}; 