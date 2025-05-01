import { App } from '@slack/bolt';
import type { GenericMessageEvent } from '@slack/bolt';

export const registerMessageHandler = (app: App): void => {
  app.message(async ({ message, say }) => {
    const msg = message as GenericMessageEvent;
    
    // ボットの投稿には反応しない
    if (msg.bot_id) {
      return;
    }

    if (msg.thread_ts) {
      try {
        console.log('📝 スレッドメッセージを受信:', msg);
        
        // スレッドに返信
        await say({
          text: `<@${msg.user}> スレッドメッセージを受け取りました！`,
          thread_ts: msg.thread_ts,
        });
      } catch (error) {
        console.error('❌ スレッドメッセージの処理中にエラーが発生:', error);
      }
    }
  });
}; 