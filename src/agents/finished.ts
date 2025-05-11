import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const FinishResultSchema = z.object({
  result: z.enum(['completed', 'continue', 'answer_required']),
});

type FinishResult = z.infer<typeof FinishResultSchema>;

export async function createFinishAgent() {
  return new Agent({
    name: 'Finish判定エージェント',
    instructions: `あなたは文章のニュアンスを分析し、以下の3つの状態のいずれかに分類するエージェントです：

1. completed: タスクが完了した、終了したことを示す文章
2. continue: タスクを継続することを示す文章
3. answer_required: ユーザーからの応答が必要な文章（質問や確認など）

以下のような特徴を持つ文章を分類してください：

- completed: 「完了」「終了」「終わり」「done」「finished」などのキーワードを含む
- continue: 「続ける」「続行」「next」「continue」などのキーワードを含む
- answer_required: 「どうする？」「どうしますか？」などの質問や、ユーザーの判断が必要な文章

必ず以下のJSON形式で出力してください：
{"result": "completed"} または {"result": "continue"} または {"result": "answer_required"}`,
    model: openai('gpt-4'),
  });
}

/**
 * 文章を分析して完了状態を判定するメソッド
 * @param text 分析する文章
 * @returns 判定結果（completed, continue, answer_required）
 */
export async function judgeFinishStatus(text: string): Promise<FinishResult> {
  const agent = await createFinishAgent();
  const response = await agent.generate([
    { role: 'user', content: text }
  ]);
  
  try {
    // レスポンスからJSONを抽出して解析
    const content = response.text;
    const jsonMatch = content.match(/\{.*\}/s);
    
    if (jsonMatch) {
      const parsedResult = JSON.parse(jsonMatch[0]);
      return FinishResultSchema.parse(parsedResult);
    } else {
      console.warn('エージェントからの応答にJSONが含まれていません:', content);
      // デフォルト値を返す
      return { result: 'answer_required' };
    }
  } catch (error) {
    console.error('判定結果の解析に失敗しました:', error);
    // エラー時はデフォルト値を返す
    return { result: 'answer_required' };
  }
}
