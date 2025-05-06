import Bolt from '@slack/bolt';
const { App } = Bolt;

export const registerThreadHandler = (app: InstanceType<typeof App>, agentInstance: any, toolsets: any, botUserId: string): void => {
  app.message(async ({ message, say, client }: any) => {
    // スレッドメッセージのみを処理
    if (!('thread_ts' in message) || !message.thread_ts || message.subtype) {
      return;
    }
    // botへのメンションがなければ無視
    const mentionPattern = new RegExp(`<@${botUserId}>`);
    if (!mentionPattern.test(message.text || '')) {
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
      // botにメンションされたメッセージのみ抽出
      const previousMessages = result.messages
        .filter((msg: any) => msg.ts && msg.user && mentionPattern.test(msg.text || ''))
        .map((msg: any) => ({
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
      // agentInstanceで応答生成（contextをsystemプロンプトとして渡す）
      const systemPrompt = JSON.stringify(context);
      const response = await agentInstance.generate([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.text || '' }
      ], { toolsets });
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