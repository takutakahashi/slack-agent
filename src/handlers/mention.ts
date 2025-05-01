// src/handlers/mention.ts
import { App } from '@slack/bolt';
import { SlackAgent } from '../agents/slack';

/**
 * メンション（@bot）イベントに対する処理ハンドラ
 * @param app Bolt Appインスタンス
 */
export const registerMentionHandler = (app: App): void => {
  const agent = new SlackAgent();

  // app_mentionイベント（メンション）をリッスン
  app.event('app_mention', async ({ event, say, client }) => {
    try {
      const threadTs = event.thread_ts || event.ts;
      
      // AIエージェントに処理を依頼
      const response = await agent.handleMessage(event.text, {
        channelId: event.channel,
        userId: event.user || '',
        threadTs: threadTs,
      });

      // メンションに対する応答
      await say({
        text: response,
        thread_ts: threadTs,
      });

      // スレッド内のメッセージを監視
      const result = await client.conversations.replies({
        channel: event.channel,
        ts: threadTs,
      });

      if (result.messages) {
        console.log(`Thread messages for ${event.ts}:`, result.messages);
      }
    } catch (error) {
      console.error('Error handling mention:', error);
      await say({
        text: 'すみません、エラーが発生しました。',
        thread_ts: event.thread_ts || event.ts,
      });
    }
  });
};