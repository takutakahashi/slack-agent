// src/handlers/index.ts
import type { BoltApp } from '../types';
import type { MessageEvent, AppMentionEvent } from '@slack/web-api';
import { execFile } from 'child_process';
import { promisify } from 'util';
import SlackService from '../services/slack';
import ContextService from '../services/context';
import { judgeFinishStatus } from '../agents/finished';

const execFileAsync = promisify(execFile);

/**
 * bin/start_agent.shを実行してClaude codeベースの応答を生成
 */
/**
 * メンション記号を削除する関数
 * <@USERID>形式のメンションを削除
 */
const removeMentions = (text: string): string => {
  return text.replace(/<@[A-Z0-9]+>/g, '').trim();
};

const executeClaudeAgent = async (prompt: string, channelId: string, threadTs: string): Promise<{ text: string }> => {
  try {
    const scriptPath = process.env.AGENT_SCRIPT_PATH || '/home/ubuntu/repos/slack-agent/bin/start_agent.sh';
    
    const cleanPrompt = removeMentions(prompt);
    
    const { stdout, stderr } = await execFileAsync('bash', [scriptPath], {
      env: {
        ...process.env,
        SLACK_AGENT_PROMPT: cleanPrompt,
        SLACK_CHANNEL_ID: channelId,
        SLACK_THREAD_TS: threadTs,
      },
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large responses
    });
    
    if (stderr) {
      console.warn('Script stderr:', stderr);
    }
    
    return { text: stdout.trim() };
  } catch (error) {
    console.error('Error executing claude agent script:', error);
    throw new Error('Claude agent script execution failed');
  }
};

/**
 * 統合されたSlackイベントハンドラを登録する関数
 * DM、メンション、スレッドの全てのイベントを一つのファイルで管理
 */
export const registerHandlers = (
  app: BoltApp, 
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
        const response = await executeClaudeAgent(
          msg.text || '',
          msg.channel,
          threadTs
        );

        // 応答を送信（常にスレッドに返信）
        const text = (response.text || '').replace(/[\s\n\r]*\{"result":.*\}\s*$/, '');
        await say({
          text: text,
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
        const response = await executeClaudeAgent(
          mentionEvent.text || '',
          mentionEvent.channel,
          threadTs
        );
      
        // メンションに対する応答
        // 最終行の json を削除して送信（末尾に改行がなくても対応）
        const text = (response.text || '').replace(/[\s\n\r]*\{"result":.*\}\s*$/, '');
        console.log(response.text || '');
        await say({
          text: text,
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
        const response = await executeClaudeAgent(
          msg.text || '',
          msg.channel,
          msg.thread_ts
        );
      
        // 応答を送信
        const text = (response.text || '').replace(/[\s\n\r]*\{"result":.*\}\s*$/, '');
        await say({
          text: text,
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
