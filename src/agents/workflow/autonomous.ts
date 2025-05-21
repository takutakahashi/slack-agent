import { Step, Workflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

// 1. エージェント定義
const agent = new Agent({
  name: 'シンプルエージェント',
  instructions: 'ユーザーの指示に応じてタスクを実行してください。',
  model: openai('gpt-4o-mini'),
});

// 2. ステップ定義
const executeStep = new Step({
  id: 'execute',
  inputSchema: z.object({ userInput: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ context }) => {
    const { userInput } = context.triggerData;
    const response = await agent.generate(
      `ユーザー指示: ${userInput}\nこの指示を実行し、結果を日本語で簡潔にまとめてください。`,
      { output: z.object({ result: z.string() }) }
    );
    return { result: response.object.result };
  },
});

// 3. ワークフロー定義
export const autonomousWorkflow = new Workflow({
  name: 'autonomous-agent',
  triggerSchema: z.object({ userInput: z.string() }),
})
  .step(executeStep)
  .commit();

// MCPからtoolsetsを取得し、各エージェントにtoolsとしてセットするファクトリ関数
export async function createAutonomousWorkflowWithTools() {
  // Mastraインスタンス作成・ワークフロー登録
  const mastra = new Mastra({
    workflows: { autonomousWorkflow },
  });

  return { mastra, autonomousWorkflow };
}

// APIや開発用Playgroundはmastra devコマンドで自動的に有効化されます
// 例: npm run dev で http://localhost:4111/api/workflows/autonomous-agent/ などが利用可能
