// src/handlers/index.ts
import type { BoltApp } from '../types';
import type { MessageEvent, AppMentionEvent } from '@slack/bolt';
import type { ToolsetsInput } from '@mastra/core/agent';
import SlackService from '../services/slack';
import AgentService from '../services/agent';
import ContextService from '../services/context';
import { Agent } from '@mastra/core/agent';

/**
 * 統合されたSlackイベントハンドラを登録する関数
 * DM、メンション、スレッドの全てのイベントを一つのファイルで管理
 */
export const registerHandlers = (
  app: BoltApp, 
  agentInstance: Agent, 
  toolsets: ToolsetsInput, 
  botUserId: string
): void => {
  // IMメッセージ（ダイレクトメッセージ）ハンドラ
  app.message(async ({ message, say, client }) => {
    const msg = message as MessageEvent;
    // DMメッセージのみを処理
    if (msg.channel_type !== 'im' || msg.subtype) {
      return;
    }

    try {
      const threadTs = msg.thread_ts || msg.ts;
      
      // IMコンテキスト作成
      const context = await ContextService.createImContext(
        client,
        msg.user || '',
        msg.channel,
        threadTs
      );
      
      // 応答生成
      const response = await AgentService.generateResponse(
        agentInstance,
        context,
        msg.text || '',
        toolsets
      );

      // 応答を送信（常にスレッドに返信）
      await say({
        text: response.text,
        thread_ts: threadTs,
      });

      // ユーザーとの初回やり取りを記録
      if (context.isFirstInteraction && msg.user) {
        SlackService.recordFirstInteraction(msg.user);
      }
    } catch (error) {
      await SlackService.handleError(error, say, msg.thread_ts || msg.ts);
    }
  });

  // メンションハンドラ
  app.event('app_mention', async ({ event, say }) => {
    const mentionEvent = event as AppMentionEvent;
    // スレッド内メンションはここで応答しない
    if (mentionEvent.thread_ts) {
      return;
    }
    
    try {
      const threadTs = mentionEvent.thread_ts || mentionEvent.ts;
      
      // メンションコンテキスト作成
      const context = ContextService.createMentionContext(
        mentionEvent.channel,
        mentionEvent.user || '',
        threadTs
      );
      
      // 応答生成
      const response = await AgentService.generateResponse(
        agentInstance,
        context,
        mentionEvent.text || '',
        toolsets
      );
      
      // メンションに対する応答
      await say({
        text: response.text,
        thread_ts: threadTs,
      });
      
    } catch (error) {
      await SlackService.handleError(error, say, mentionEvent.thread_ts || mentionEvent.ts);
    }
  });

  // スレッドメッセージハンドラ
  app.message(async ({ message, say, client }) => {
    const msg = message as MessageEvent;
    // スレッドメッセージのみを処理
    if (!('thread_ts' in msg) || !msg.thread_ts || msg.subtype) {
      return;
    }
    
    // botへのメンションがなければ無視
    const mentionPattern = new RegExp(`<@${botUserId}>`);
    if (!mentionPattern.test(msg.text || '')) {
      return;
    }
    
    try {
      // スレッドの会話履歴を取得
      const allMessages = await SlackService.getThreadMessages(
        client,
        msg.channel,
        msg.thread_ts
      );
      
      if (allMessages.length === 0) {
        return;
      }
      
      // botにメンションされたメッセージのみ抽出
      const previousMessages = allMessages
        .filter(msg => mentionPattern.test(msg.text || ''));
      
      // スレッドコンテキスト作成
      const context = ContextService.createThreadContext(
        msg.channel,
        msg.user || '',
        msg.thread_ts,
        previousMessages
      );
      
      // 応答生成
      const response = await AgentService.generateResponse(
        agentInstance,
        context,
        msg.text || '',
        toolsets
      );
      
      // 応答を送信
      await say({
        text: response.text,
        thread_ts: msg.thread_ts,
      });
    } catch (error) {
      await SlackService.handleError(error, say, msg.thread_ts);
    }
  });
};