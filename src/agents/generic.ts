import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import fs from 'fs';
import yaml from 'js-yaml';
import { z } from 'zod';

// YAMLスキーマ定義
const AgentYamlSchema = z.object({
  name: z.string(),
  instructions: z.string(),
  model: z.string(),
  systemPrompt: z.string().optional(), // カスタムシステムプロンプト
});

type AgentYaml = z.infer<typeof AgentYamlSchema>;

const outputInstructions = `
# 出力
エージェントからユーザーに返却するすべての応答は、必ず最終行に以下の json のみで構成される行を含めてください

{"result": "completed" | "continue" | "answer_required"}
この result は以下の条件に従って選択してください。

- completed: タスクが完了した、終了したことを示す文章
- continue: タスクを継続することを示す文章
- answer_required: ユーザーからの応答が必要な文章（質問や確認など）

また、AI エージェントとしてユーザーフレンドリーな応答を意識するために、以下の指示に従ってください。
- 指示を受けた際、まず指示をどう理解したかを応答してください。
- さらに指示を実行する際、必ず実行計画を応答してください。その場合は行末のjsonに {"result": "continue"} を返してください。そしてユーザーが応答を返したら指示を実行してください。
`;

export async function createGenericAgent() {
  // デフォルト値
  let agentName = 'Slack汎用エージェント';
  let agentInstructions = 'あなたはSlackの親切なアシスタントです。\n\n- 会話の文脈（DM/スレッド/メンション）を理解し、適切に応答してください\n- 初回DMは自己紹介を含めてください\n- スレッドでは履歴を考慮し、メンション時は丁寧な日本語で応答してください';
  let agentModel: any = openai('gpt-4o-mini');
  const agentTools: Record<string, any> = {};

  const yamlPath = process.env.GENERIC_AGENT_YAML;
  if (yamlPath && fs.existsSync(yamlPath)) {
    try {
      const doc = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
      const parsed = AgentYamlSchema.safeParse(doc);
      if (parsed.success) {
        const agentYaml: AgentYaml = parsed.data;
        agentName = agentYaml.name;
        
        if (agentYaml.systemPrompt) {
          agentInstructions = agentYaml.systemPrompt;
        } else {
          agentInstructions = agentYaml.instructions;
        }
        
        agentInstructions = agentInstructions + '\n\n' + outputInstructions;
        agentModel = openai(agentYaml.model);
      } else {
        console.warn('YAMLのバリデーションに失敗しました', parsed.error);
      }
    } catch (e) {
      console.warn('YAMLの読み込みに失敗しました', e);
    }
  }

  return new Agent({
    name: agentName,
    instructions: agentInstructions,
    model: agentModel,
    tools: agentTools,
  });
}  