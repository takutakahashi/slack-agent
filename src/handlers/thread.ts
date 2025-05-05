import { App } from '@slack/bolt';
import { singleAgent } from '../agents/generic';

export const registerThreadHandler = (app: App): void => {
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
        .filter(msg => msg.ts && msg.user)
        .map(msg => ({
          user: msg.user!,
          text: msg.text || '',
          ts: msg.ts!,
        }));
      // context作成
      const context = {
        type: 'thread',
        channelId: message.channel,
        userId: message.user || '',
        threadTs: message.thread_ts,
        previousMessages,
      };
      // singleAgentで応答生成（contextをsystemプロンプトとして渡す）
      const systemPrompt = JSON.stringify(context);
      const response = await singleAgent.generate([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.text || '' }
      ]);
      await say({
        text: response.text,
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