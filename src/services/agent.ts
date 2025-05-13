// src/services/agent.ts
import { Agent, type ToolsetsInput } from '@mastra/core/agent';
import type { MessageContext } from '../types';


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
    const systemPrompt = JSON.stringify(context);
    return await agentInstance.generate([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], { toolsets });
  }
};

export default AgentService;