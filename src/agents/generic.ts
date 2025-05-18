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
});

type AgentYaml = z.infer<typeof AgentYamlSchema>;

export async function createGenericAgent() {
  // デフォルト値
  let requiredInstructions = '一度のリクエストでタスクを完了させる必要はありません。ツールを実行する際や、他のアクションを起こす際など、一度実施するアクションを宣言するのみの応答を行ってください。ユーザーが再度行動に問題なければ続行の指示をします。以下は追加のガイドラインです。 \n\n';
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
        agentInstructions = agentYaml.instructions;
        agentInstructions = requiredInstructions + '\n\n' + agentInstructions;
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