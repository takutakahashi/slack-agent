// src/services/agent.ts
import { Agent, type ToolsetsInput } from '@mastra/core/agent';
import type { MessageContext } from '../types';

// メッセージの型定義
type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * エージェント関連のサービス
 * AIエージェントとのインタラクションを担当
 */
export const AgentService = {
  /**
   * AIエージェントで応答を生成する関数
   * @param agentInstance エージェントのインスタンス
   * @param context メッセージコンテキスト
   * @param userMessage ユーザーからのメッセージ
   * @param toolsets ツールセット
   * @returns 生成された応答
   */
  generateResponse: async (
    agentInstance: Agent,
    context: MessageContext,
    userMessage: string,
    toolsets: ToolsetsInput
  ) => {
    // システムプロンプトを準備
    const systemMessage: Message = { role: 'system', content: JSON.stringify(context) };
    
    let messages: Message[] = [systemMessage];
    
    // 会話履歴がある場合は追加
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      // タイムスタンプでソートして、古い順に並べる
      const sortedHistory = [...context.conversationHistory].sort((a, b) => 
        parseFloat(a.ts) - parseFloat(b.ts)
      );
      
      // メッセージ履歴を追加
      messages = [
        systemMessage,
        ...sortedHistory.map(msg => ({ 
          role: msg.role, 
          content: msg.content 
        }))
      ];
      
      // 最新のユーザーメッセージを追加
      const lastMessage = sortedHistory[sortedHistory.length - 1];
      if (lastMessage && lastMessage.role === 'user' && lastMessage.content === userMessage) {
        // 最後のメッセージが同じユーザーメッセージなら追加しない
      } else {
        messages.push({ role: 'user', content: userMessage });
      }
    } else {
      // 会話履歴がない場合は単純にユーザーメッセージを追加
      messages.push({ role: 'user', content: userMessage });
    }
    
    // エージェントに応答を生成させる
    return await agentInstance.generate(messages, { toolsets });
  }
};

export default AgentService;