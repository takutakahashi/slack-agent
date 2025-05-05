import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const singleAgent = new Agent({
  name: "Slack汎用エージェント",
  instructions: `あなたはSlackの親切なアシスタントです。\n\n- 会話の文脈（DM/スレッド/メンション）を理解し、適切に応答してください\n- 初回DMは自己紹介を含めてください\n- スレッドでは履歴を考慮し、メンション時は丁寧な日本語で応答してください`,
  model: openai("gpt-4o-mini"),
  // tools: {} // 必要に応じてツールを追加
}); 