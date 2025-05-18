// src/handlers/index.ts
import type { BoltApp } from '../types';
import type { MessageEvent, AppMentionEvent } from '@slack/web-api';
import type { ToolsetsInput } from '@mastra/core/agent';
import SlackService from '../services/slack';
import AgentService from '../services/agent';
import ContextService from '../services/context';
import { Agent } from '@mastra/core/agent';
import { judgeFinishStatus } from '../agents/finished';

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
        threadTs,
        botUserId
      );
      
      // ユーザーメッセージを会話履歴に追加
      if (!context.conversationHistory) {
        context.conversationHistory = [];
      }
      
      // 既に同じタイムスタンプのメッセージが会話履歴に存在しないことを確認
      const messageExists = context.conversationHistory.some(m => m.ts === msg.ts);
      if (!messageExists) {
        context.conversationHistory.push({
          role: 'user',
          content: msg.text || '',
          ts: msg.ts
        });
      }
      
      let finished = 'continue';
      while (finished === 'continue') {
        // 応答生成
        console.log(context);
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
        
        // ボットの応答を会話履歴に追加
        // 現在のタイムスタンプを取得（実際のAPIレスポンスからtsを取得するべきだが、簡易的に現在時刻を使用）
        const responseTs = String(Date.now() / 1000);
        context.conversationHistory.push({
          role: 'assistant',
          content: response.text,
          ts: responseTs
        });

        const finishResult = await judgeFinishStatus(response.text);
        finished = finishResult.result;
      }

      // ユーザーとの初回やり取りを記録
      if (context.isFirstInteraction && msg.user) {
        SlackService.recordFirstInteraction(msg.user);
      }
    } catch (error) {
      await SlackService.handleError(error, say, msg.thread_ts || msg.ts);
    }
  });

  // メンションハンドラ
  app.event('app_mention', async ({ event, say, client }) => {
    const mentionEvent = event as AppMentionEvent;
    // スレッド内メンションはここで応答しない
    if (mentionEvent.thread_ts) {
      return;
    }
    
    try {
      const threadTs = mentionEvent.thread_ts || mentionEvent.ts;
      
      // メンションコンテキスト作成
      const context = await ContextService.createMentionContext(
        client,
        mentionEvent.channel,
        mentionEvent.user || '',
        threadTs,
        botUserId
      );
      
      // ユーザーメッセージを会話履歴に追加
      if (!context.conversationHistory) {
        context.conversationHistory = [];
      }
      
      // 既に同じタイムスタンプのメッセージが会話履歴に存在しないことを確認
      const messageExists = context.conversationHistory.some(m => m.ts === mentionEvent.ts);
      if (!messageExists) {
        context.conversationHistory.push({
          role: 'user',
          content: mentionEvent.text || '',
          ts: mentionEvent.ts
        });
      }
      
      let finished = 'continue';
      while (finished === 'continue') {
        // 応答生成
        console.log(context);
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
        
        // ボットの応答を会話履歴に追加
        const responseTs = String(Date.now() / 1000);
        context.conversationHistory.push({
          role: 'assistant',
          content: response.text,
          ts: responseTs
        });
        
        const finishResult = await judgeFinishStatus(response.text);
        finished = finishResult.result;
      }

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
    
    // bot自身のメッセージは処理しない
    if (msg.user === botUserId) {
      return;
    }
    
    // スレッド内の会話を取得して、botが参加しているスレッドか確認
    const threadMessages = await SlackService.getThreadMessages(client, msg.channel, msg.thread_ts);
    const botHasReplied = threadMessages.some(m => m.user === botUserId);
    
    // botが参加していないスレッドはスキップ（メンションがある場合を除く）
    const mentionPattern = new RegExp(`<@${botUserId}>`);
    const hasDirectMention = mentionPattern.test(msg.text || '');
    
    if (!botHasReplied && !hasDirectMention) {
      return;
    }
    
    try {
      // スレッドコンテキスト作成（すべての会話履歴を含む）
      const context = await ContextService.createThreadContext(
        client,
        msg.channel,
        msg.user || '',
        msg.thread_ts,
        botUserId
      );
      
      // ユーザーメッセージを会話履歴に追加
      if (!context.conversationHistory) {
        context.conversationHistory = [];
      }
      
      // 既に同じタイムスタンプのメッセージが会話履歴に存在しないことを確認
      const messageExists = context.conversationHistory.some(m => m.ts === msg.ts);
      if (!messageExists) {
        context.conversationHistory.push({
          role: 'user',
          content: msg.text || '',
          ts: msg.ts
        });
      }
      
      let finished = 'continue';
      while (finished === 'continue') {
        // 応答生成
        console.log(context);
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
        
        // ボットの応答を会話履歴に追加
        const responseTs = String(Date.now() / 1000);
        context.conversationHistory.push({
          role: 'assistant',
          content: response.text,
          ts: responseTs
        });

        const finishResult = await judgeFinishStatus(response.text);
        finished = finishResult.result;
      }
    } catch (error) {
      await SlackService.handleError(error, say, msg.thread_ts);
    }
  });
};