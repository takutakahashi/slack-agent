// src/handlers/mention.ts
import { App, SayFn } from '@slack/bolt';
import { Config } from '../config';

/**
 * メンション（@bot）イベントに対する処理ハンドラ
 * @param app Bolt Appインスタンス
 * @param config アプリケーション設定
 */
export const registerMentionHandler = (app: App, config: Config): void => {
  // app_mentionイベント（メンション）をリッスン
  app.event('app_mention', async ({ event, say }) => {
    try {
      await handleMention(event, say, config.app.replyMessage);
      console.log(`Replied to mention from user: ${event.user}`);
    } catch (error) {
      console.error('Error handling mention:', error);
    }
  });
};

/**
 * メンションに応答する関数
 * @param event Slackイベント
 * @param say 応答関数
 * @param replyMessage 応答メッセージ
 */
export const handleMention = async (
  event: { user: string; text: string; ts: string; channel: string },
  say: SayFn,
  replyMessage: string
): Promise<void> => {
  // スレッド内でメンションに返信
  await say({
    text: `<@${event.user}> ${replyMessage}`,
    thread_ts: event.ts
  });
};