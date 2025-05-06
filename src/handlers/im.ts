import Bolt from '@slack/bolt';
const { App } = Bolt;

export const registerIMHandler = (app: InstanceType<typeof App>, agentInstance: any, toolsets: any): void => {
  const userFirstInteraction = new Set<string>();

  app.message(async ({ message, say, client }: any) => {
    // DMメッセージのみを処理
    if (message.channel_type !== 'im' || message.subtype) {
      return;
    }

    try {
      let previousMessages: Array<{ user: string; text: string; ts: string }> = [];
      const threadTs = message.thread_ts || message.ts;
      
      // スレッド内のメッセージを取得
      const result = await client.conversations.replies({
        channel: message.channel,
        ts: threadTs,
      });

      if (result.messages) {
        previousMessages = result.messages
          .filter((msg: any) => msg.ts && msg.user)
          .map((msg: any) => ({
            user: msg.user!,
            text: msg.text || '',
            ts: msg.ts!,
          }));
      }

      // context作成
      const context = {
        type: 'im',
        userId: message.user || '',
        threadTs: threadTs,
        previousMessages,
        isFirstInteraction: !userFirstInteraction.has(message.user || ''),
      };

      // agentInstanceで応答生成（contextをsystemプロンプトとして渡す）
      const systemPrompt = JSON.stringify(context);
      const response = await agentInstance.generate([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.text || '' }
      ], { toolsets });

      // 応答を送信（常にスレッドに返信）
      await say({
        text: response.text,
        thread_ts: threadTs,
      });

      // ユーザーとの初回やり取りを記録
      if (context.isFirstInteraction && message.user) {
        userFirstInteraction.add(message.user);
      }

    } catch (error) {
      console.error('Error handling IM:', error);
      const errorThreadTs = message.thread_ts || message.ts;
      await say({
        text: 'すみません、エラーが発生しました。',
        thread_ts: errorThreadTs,
      });
    }
  });
}; 