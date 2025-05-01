// src/handlers/mention.ts
import { App } from '@slack/bolt';

/**
 * メンション（@bot）イベントに対する処理ハンドラ
 * @param app Bolt Appインスタンス
 */
export const registerMentionHandler = (app: App): void => {
  // app_mentionイベント（メンション）をリッスン
  app.event('app_mention', async ({ event, say, client }) => {
    try {
      // メンションに対する応答
      const response = await say({
        text: `<@${event.user}> メッセージを受け取りました！`,
        thread_ts: event.ts,
      });

      // スレッド内のメッセージを監視
      if (response.ts) {
        const result = await client.conversations.replies({
          channel: event.channel,
          ts: event.ts,
        });

        if (result.messages) {
          console.log(`Thread messages for ${event.ts}:`, result.messages);
        }
      }
    } catch (error) {
      console.error('Error handling mention:', error);
    }
  });
};