// src/handlers/mention.ts
import Bolt from '@slack/bolt';
const { App } = Bolt;

export const registerMentionHandler = (app: InstanceType<typeof App>, agentInstance: any, toolsets: any): void => {
  // app_mentionイベント（メンション）をリッスン
  app.event('app_mention', async ({ event, say, client }: any) => {
    try {
      const threadTs = event.thread_ts || event.ts;
      // context作成
      const context = {
        type: 'mention',
        channelId: event.channel,
        userId: event.user || '',
        threadTs: threadTs,
      };
      // agentInstanceで応答生成（contextをsystemプロンプトとして渡す）
      const systemPrompt = JSON.stringify(context);
      const response = await agentInstance.generate([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: event.text }
      ], { toolsets });
      // メンションに対する応答
      await say({
        text: response.text,
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