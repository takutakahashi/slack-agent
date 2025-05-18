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

- completed: 「完了」「終了」「終わり」「done」「finished」などのキーワードを含む、または、文脈によりタスクが完了したことを示す文章
- continue: 「続ける」「続行」「next」「continue」などのキーワードを含む、または、文脈によりタスクを継続することを示す文章
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
  // 環境変数フラグのチェック - 'true'でない場合は常に'completed'を返す
  if (process.env.USE_FINISHED_JUDGE !== 'true') {
    return { result: 'completed' };
  }
  // text の最終行に json が含まれてくる。その json を解析して result を返す
  const jsonMatch = text.match(/\{.*\}/s);
  if (jsonMatch) {
    const parsedResult = JSON.parse(jsonMatch[0]);
    const result = FinishResultSchema.parse(parsedResult);
    return result;
  }
  return { result: 'answer_required' };
}
