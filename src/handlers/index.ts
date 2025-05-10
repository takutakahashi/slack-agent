// src/handlers/index.ts
import { BoltApp, AgentInterface } from '../types';
import SlackService from '../services/slack';
import AgentService from '../services/agent';
import ContextService from '../services/context';

/**
 * 統合されたSlackイベントハンドラを登録する関数
 * DM、メンション、スレッドの全てのイベントを一つのファイルで管理
 */
export const registerHandlers = (
  app: BoltApp, 
  agentInstance: AgentInterface, 
  toolsets: any, 
  botUserId: string
): void => {
  // IMメッセージ（ダイレクトメッセージ）ハンドラ
  app.message(async ({ message, say, client }: any) => {
    // DMメッセージのみを処理
    if (message.channel_type !== 'im' || message.subtype) {
      return;
    }

    try {
      const threadTs = message.thread_ts || message.ts;
      
      // IMコンテキスト作成
      const context = await ContextService.createImContext(
        client,
        message.user || '',
        message.channel,
        threadTs
      );
      
      // 応答生成
      const response = await AgentService.generateResponse(
        agentInstance,
        context,
        message.text || '',
        toolsets
      );

      // 応答を送信（常にスレッドに返信）
      await say({
        text: response.text,
        thread_ts: threadTs,
      });

      // ユーザーとの初回やり取りを記録
      if (context.isFirstInteraction && message.user) {
        SlackService.recordFirstInteraction(message.user);
      }
    } catch (error) {
      await SlackService.handleError(error, say, message.thread_ts || message.ts);
    }
  });

  // メンションハンドラ
  app.event('app_mention', async ({ event, say }: any) => {
    // スレッド内メンションはここで応答しない
    if (event.thread_ts) {
      return;
    }
    
    try {
      const threadTs = event.thread_ts || event.ts;
      
      // メンションコンテキスト作成
      const context = ContextService.createMentionContext(
        event.channel,
        event.user || '',
        threadTs
      );
      
      // 応答生成
      const response = await AgentService.generateResponse(
        agentInstance,
        context,
        event.text || '',
        toolsets
      );
      
      // メンションに対する応答
      await say({
        text: response.text,
        thread_ts: threadTs,
      });
      
    } catch (error) {
      await SlackService.handleError(error, say, event.thread_ts || event.ts);
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
      const allMessages = await SlackService.getThreadMessages(
        client,
        message.channel,
        message.thread_ts
      );
      
      if (allMessages.length === 0) {
        return;
      }
      
      // botにメンションされたメッセージのみ抽出
      const previousMessages = allMessages
        .filter((msg: any) => mentionPattern.test(msg.text || ''));
      
      // スレッドコンテキスト作成
      const context = ContextService.createThreadContext(
        message.channel,
        message.user || '',
        message.thread_ts,
        previousMessages
      );
      
      // 応答生成
      const response = await AgentService.generateResponse(
        agentInstance,
        context,
        message.text || '',
        toolsets
      );
      
      // 応答を送信
      await say({
        text: response.text,
        thread_ts: message.thread_ts,
      });
    } catch (error) {
      await SlackService.handleError(error, say, message.thread_ts);
    }
  });
};