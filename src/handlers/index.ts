// src/handlers/index.ts
import Bolt from '@slack/bolt';
const { App } = Bolt;

/**
 * メッセージコンテキストの型定義
 * 各ハンドラタイプに対応する情報を含む
 */
type MessageContext = {
  type: 'im' | 'mention' | 'thread';
  userId: string;
  threadTs: string;
  channelId?: string;
  previousMessages?: Array<{ user: string; text: string; ts: string }>;
  isFirstInteraction?: boolean;
};

/**
 * 統合されたSlackイベントハンドラを登録する関数
 * DM、メンション、スレッドの全てのイベントを一つのファイルで管理
 */
export const registerHandlers = (
  app: InstanceType<typeof App>, 
  agentInstance: any, 
  toolsets: any, 
  botUserId: string
): void => {
  // ユーザーとの初回やり取りを記録するセット（IMハンドラで使用）
  const userFirstInteraction = new Set<string>();

  /**
   * 共通のエラーハンドリング関数
   */
  const handleError = async (error: any, say: any, thread_ts: string) => {
    console.error('Error handling message:', error);
    await say({
      text: 'すみません、エラーが発生しました。',
      thread_ts: thread_ts,
    });
  };

  /**
   * AIエージェントで応答を生成する共通関数
   */
  const generateResponse = async (
    context: MessageContext, 
    userMessage: string
  ) => {
    const systemPrompt = JSON.stringify(context);
    return await agentInstance.generate([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], { toolsets });
  };

  /**
   * スレッド内のメッセージを取得する共通関数
   */
  const getThreadMessages = async (client: any, channel: string, ts: string) => {
    try {
      const result = await client.conversations.replies({
        channel: channel,
        ts: ts,
      });
      
      if (!result.messages) return [];
      
      return result.messages
        .filter((msg: any) => msg.ts && msg.user)
        .map((msg: any) => ({
          user: msg.user!,
          text: msg.text || '',
          ts: msg.ts!,
        }));
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      return [];
    }
  };

  // IMメッセージ（ダイレクトメッセージ）ハンドラ
  app.message(async ({ message, say, client }: any) => {
    // DMメッセージのみを処理
    if (message.channel_type !== 'im' || message.subtype) {
      return;
    }

    try {
      const threadTs = message.thread_ts || message.ts;
      const previousMessages = await getThreadMessages(client, message.channel, threadTs);
      
      // IMコンテキスト作成
      const context: MessageContext = {
        type: 'im',
        userId: message.user || '',
        threadTs: threadTs,
        previousMessages,
        isFirstInteraction: !userFirstInteraction.has(message.user || ''),
      };

      // 応答生成
      const response = await generateResponse(context, message.text || '');

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
      await handleError(error, say, message.thread_ts || message.ts);
    }
  });

  // メンションハンドラ
  app.event('app_mention', async ({ event, say, client }: any) => {
    // スレッド内メンションはここで応答しない
    if (event.thread_ts) {
      return;
    }
    
    try {
      const threadTs = event.thread_ts || event.ts;
      
      // メンションコンテキスト作成
      const context: MessageContext = {
        type: 'mention',
        channelId: event.channel,
        userId: event.user || '',
        threadTs: threadTs,
      };
      
      // 応答生成
      const response = await generateResponse(context, event.text || '');
      
      // メンションに対する応答
      await say({
        text: response.text,
        thread_ts: threadTs,
      });
      
      // スレッド内のメッセージを監視
      const messages = await getThreadMessages(client, event.channel, threadTs);
      if (messages.length > 0) {
        console.log(`Thread messages for ${event.ts}:`, messages);
      }
    } catch (error) {
      await handleError(error, say, event.thread_ts || event.ts);
    }
  });

  // スレッドメッセージハンドラ
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
      const allMessages = await getThreadMessages(client, message.channel, message.thread_ts);
      
      if (allMessages.length === 0) {
        return;
      }
      
      // botにメンションされたメッセージのみ抽出
      const previousMessages = allMessages
        .filter((msg: any) => mentionPattern.test(msg.text || ''));
      
      // スレッドコンテキスト作成
      const context: MessageContext = {
        type: 'thread',
        channelId: message.channel,
        userId: message.user || '',
        threadTs: message.thread_ts,
        previousMessages,
      };
      
      // 応答生成
      const response = await generateResponse(context, message.text || '');
      
      // 応答を送信
      await say({
        text: response.text,
        thread_ts: message.thread_ts,
      });
    } catch (error) {
      await handleError(error, say, message.thread_ts);
    }
  });
};