import { App } from '@slack/bolt';
import type { GenericMessageEvent } from '@slack/bolt';

export const registerMessageHandler = (app: App): void => {
  app.message(async ({ message, client }) => {
    const msg = message as GenericMessageEvent;
    if (msg.thread_ts) {
      try {
        // スレッド内のメッセージを取得
        const result = await client.conversations.replies({
          channel: msg.channel,
          ts: msg.thread_ts,
        });

        if (result.messages) {
          console.log(`Thread messages for ${msg.thread_ts}:`, result.messages);
        }
      } catch (error) {
        console.error('Error fetching thread messages:', error);
      }
    }
  });
}; 