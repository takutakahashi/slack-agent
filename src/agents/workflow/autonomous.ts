import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

// 1. エージェント定義（例：計画・実行・完了判定用）
const plannerAgent = new Agent({
  name: 'プランナー',
  instructions: 'ユーザーの指示をもとに実行計画を立ててください。',
  model: openai('gpt-4o-mini'),
});

const executorAgent = new Agent({
  name: '実行エージェント',
  instructions: '計画に従ってタスクを実行してください。',
  model: openai('gpt-4o-mini'),
});

const finisherAgent = new Agent({
  name: '完了判定エージェント',
  instructions: 'タスクが完了したかどうかを判定してください。',
  model: openai('gpt-4o-mini'),
});

// 2. ステップ定義
const planStep = createStep({
  id: 'plan',
  inputSchema: z.object({ userInput: z.string() }),
  outputSchema: z.object({ plan: z.string() }),
  execute: async ({ inputData }: { inputData: { userInput: string } }) => {
    const { userInput } = inputData;
    const response = await plannerAgent.generate(
      `ユーザー指示: ${userInput}\nこの指示に対する実行計画を日本語で簡潔に作成してください。`,
      { output: z.object({ plan: z.string() }) }
    );
    return { plan: response.object.plan };
  },
});

const executeStep = createStep({
  id: 'execute',
  inputSchema: z.object({ plan: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }: { inputData: { plan: string } }) => {
    const { plan } = inputData;
    const response = await executorAgent.generate(
      `計画: ${plan}\nこの計画を実行し、結果を日本語で簡潔にまとめてください。`,
      { output: z.object({ result: z.string() }) }
    );
    return { result: response.object.result };
  },
});

const finishStep = createStep({
  id: 'finish',
  inputSchema: z.object({ result: z.string() }),
  outputSchema: z.object({ finished: z.boolean(), message: z.string() }),
  execute: async ({ inputData }: { inputData: { result: string } }) => {
    const { result } = inputData;
    const response = await finisherAgent.generate(
      `実行結果: ${result}\nこのタスクは完了していますか？完了ならtrue、未完了ならfalseと理由を日本語で返してください。`,
      { output: z.object({ finished: z.boolean(), message: z.string() }) }
    );
    return response.object;
  },
});

// execute→finishのサブワークフロー
const execAndFinishWorkflow = createWorkflow({
  id: 'exec-and-finish',
  inputSchema: z.object({ plan: z.string() }),
  outputSchema: z.object({
    finished: z.boolean(),
    result: z.string(),
    message: z.string(),
  }),
})
  .then(executeStep)
  .then(finishStep)
  .commit();

// メインワークフロー
export const autonomousWorkflow = createWorkflow({
  id: 'autonomous-agent',
  inputSchema: z.object({ userInput: z.string() }),
  outputSchema: z.object({
    finished: z.boolean(),
    result: z.string(),
    message: z.string(),
  }),
})
  .then(planStep)
  .dountil(
    execAndFinishWorkflow,
    async ({ inputData }: { inputData: { finished: boolean } }) => inputData.finished === true
  )
  .commit();
  