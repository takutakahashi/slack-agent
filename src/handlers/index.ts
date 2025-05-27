// src/handlers/index.ts
import type { BoltApp, SlackSayInterface } from '../types';
import type { MessageEvent, AppMentionEvent } from '@slack/web-api';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import SlackService from '../services/slack';
import { loadConfig } from '../config';

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

/**
 * スレッド履歴をフォーマットする関数
 */
const formatThreadHistory = (messages: { user: string; text: string; ts: string }[]): string => {
  if (messages.length === 0) return '';
  
  const formattedMessages = messages.map(msg => 
    `[${msg.user}]: ${msg.text}`
  ).join('\n');
  
  return `スレッドの過去のメッセージ:\n${formattedMessages}`;
};

/**
 * CLAUDE.mdファイルの内容を生成する関数
 */
const generateClaudeMdContent = (): string => {
  const config = loadConfig();
  let systemPrompt = config.ai.defaultSystemPrompt;
  
  if (config.ai.systemPromptPath && fs.existsSync(config.ai.systemPromptPath)) {
    try {
      systemPrompt = fs.readFileSync(config.ai.systemPromptPath, 'utf8');
    } catch (error) {
      console.warn('システムプロンプトファイルの読み込みに失敗しました:', error);
    }
  }
  
  return systemPrompt;
};

const executeClaudeAgent = async (
  prompt: string, 
  channelId: string, 
  threadTs: string, 
  threadHistory?: string
): Promise<{ text: string }> => {
  try {
    const scriptPath = process.env.AGENT_SCRIPT_PATH || '/home/ubuntu/repos/slack-agent/bin/start_agent.sh';
    
    const cleanPrompt = removeMentions(prompt);
    const fullPrompt = threadHistory ? `${threadHistory}\n\n現在のメッセージ: ${cleanPrompt}` : cleanPrompt;
    
    const sessionsDir = path.join(process.cwd(), 'sessions');
    const threadDir = path.join(sessionsDir, threadTs);
    
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }
    if (!fs.existsSync(threadDir)) {
      fs.mkdirSync(threadDir, { recursive: true });
    }
    
    const claudeMdPath = path.join(threadDir, 'CLAUDE.md');
    const claudeMdContent = generateClaudeMdContent();
    fs.writeFileSync(claudeMdPath, claudeMdContent, 'utf8');
    
    const { stdout, stderr } = await execFileAsync('bash', [scriptPath], {
      env: {
        ...process.env,
        SLACK_AGENT_PROMPT: fullPrompt,
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
  app.message(async ({ message, say, client: _client }) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    const msg = message as MessageEvent;
    // DMメッセージのみを処理
    if (msg.channel_type !== 'im' || msg.subtype) {
      return;
    }

    try {
      const threadTs = msg.thread_ts || msg.ts;
      
      // Claude code側にcontextを任せるため、context生成は行わない
      
      const finished = 'continue';
      while (finished === 'continue') {
        // 応答生成
        console.log(msg.text || '');
        const response = await executeClaudeAgent(
          msg.text || '',
          msg.channel,
          threadTs,
          undefined // No thread history for IM messages
        );

        // 応答を送信（常にスレッドに返信）
        if (process.env.NODE_ENV !== 'production') {
          await say({
            text: (response.text || '').replace(/[\s\n\r]*\{"result":.*\}\s*$/, ''),
            thread_ts: threadTs,
          });
        }
        // Claude code側に完了判定も任せるため、ループは1回のみでbreak
        break;
      }

      // ユーザーとの初回やり取りを記録
      if (msg.user) {
        SlackService.recordFirstInteraction(msg.user);
      }
    } catch (error) {
      await SlackService.handleError(error, say as SlackSayInterface, msg.thread_ts || msg.ts);
    }
  });

  // メンションハンドラ
  app.event('app_mention', async ({ event, say, client }) => {
    const mentionEvent = event as AppMentionEvent;
    
    try {
      const threadTs = mentionEvent.thread_ts || mentionEvent.ts;
      
      // スレッド内メンションの場合、過去のメッセージを取得
      let threadHistory = '';
      if (mentionEvent.thread_ts) {
        const threadMessages = await SlackService.getThreadMessages(client, mentionEvent.channel, mentionEvent.thread_ts);
        const pastMessages = threadMessages.filter(msg => msg.ts !== mentionEvent.ts);
        threadHistory = formatThreadHistory(pastMessages);
      }
      
      const finished = 'continue';
      while (finished === 'continue') {
        // 応答生成
        console.log(mentionEvent.text || '');
        const response = await executeClaudeAgent(
          mentionEvent.text || '',
          mentionEvent.channel,
          threadTs,
          threadHistory
        );
      
        // メンションに対する応答
        // 最終行の json を削除して送信（末尾に改行がなくても対応）
        console.log(response.text || '');
        if (process.env.NODE_ENV !== 'production') {
          await say({
            text: (response.text || '').replace(/[\s\n\r]*\{"result":.*\}\s*$/, ''),
            thread_ts: threadTs,
          });
        }
        // Claude code側に完了判定も任せるため、ループは1回のみでbreak
        break;
      }

    } catch (error) {
      await SlackService.handleError(error, say as SlackSayInterface, mentionEvent.thread_ts || mentionEvent.ts);
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
    
    const mentionPattern = new RegExp(`<@${botUserId}>`);
    const hasDirectMention = mentionPattern.test(msg.text || '');
    if (hasDirectMention) {
      return;
    }
    
    // スレッド内の会話を取得して、botが参加しているスレッドか確認
    const threadMessages = await SlackService.getThreadMessages(client, msg.channel, msg.thread_ts);
    const botHasReplied = threadMessages.some(m => m.user === botUserId);
    
    // botが参加していないスレッドはスキップ
    if (!botHasReplied) {
      return;
    }
    
    try {
      const allThreadMessages = await SlackService.getThreadMessages(client, msg.channel, msg.thread_ts);
      const pastMessages = allThreadMessages.filter(m => m.ts !== msg.ts);
      const threadHistory = formatThreadHistory(pastMessages);
      
      const finished = 'continue';
      while (finished === 'continue') {
        // 応答生成
        console.log(msg.text || '');
        const response = await executeClaudeAgent(
          msg.text || '',
          msg.channel,
          msg.thread_ts,
          threadHistory
        );
      
        // 応答を送信
        if (process.env.NODE_ENV !== 'production') {
          await say({
            text: (response.text || '').replace(/[\s\n\r]*\{"result":.*\}\s*$/, ''),
            thread_ts: msg.thread_ts,
          });
        }
        // Claude code側に完了判定も任せるため、ループは1回のみでbreak
        break;
      }
    } catch (error) {
      await SlackService.handleError(error, say as SlackSayInterface, msg.thread_ts);
    }
  });
};
