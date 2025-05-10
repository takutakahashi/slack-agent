// src/services/agent.ts
import { AgentInterface, MessageContext } from '../types';

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
    agentInstance: AgentInterface,
    context: MessageContext,
    userMessage: string,
    toolsets: any
  ) => {
    const systemPrompt = JSON.stringify(context);
    return await agentInstance.generate([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], { toolsets });
  }
};

export default AgentService;