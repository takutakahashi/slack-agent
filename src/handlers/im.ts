import { App } from '@slack/bolt';
import type { GenericMessageEvent } from '@slack/bolt';

/**
 * IMイベント（ダイレクトメッセージ）に対する処理ハンドラ
 * @param app Bolt Appインスタンス
 */
export const registerIMHandler = (app: App): void => {
  app.message(async ({ message, say }) => {
    const msg = message as GenericMessageEvent;
    
    // 全てのメッセージをデバッグ出力
    console.log('📨 メッセージを受信:', {
      channel_type: msg.channel_type,
      bot_id: msg.bot_id,
      user: msg.user,
      text: msg.text,
    });
    
    // ボットの投稿には反応しない
    if (msg.bot_id) {
      console.log('🤖 ボットからのメッセージのためスキップします');
      return;
    }

    // チャンネルタイプがimの場合のみ処理
    if (msg.channel_type === 'im') {
      try {
        console.log('💬 IMを受信:', msg);
        
        // IMに返信
        const response = await say({
          text: `<@${msg.user}> メッセージを受け取りました！`,
          thread_ts: msg.thread_ts, // スレッドの場合はスレッドで返信
        });
        
        console.log('✅ 返信を送信しました:', response);
      } catch (error) {
        console.error('❌ IMの処理中にエラーが発生:', error);
      }
    } else {
      console.log('⏭️ IMではないためスキップします');
    }
  });
}; 