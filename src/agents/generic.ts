import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import fs from "fs";
import yaml from "js-yaml";
import { z } from "zod";

// YAMLスキーマ定義
const AgentYamlSchema = z.object({
  name: z.string(),
  instructions: z.string(),
  model: z.string(),
});

type AgentYaml = z.infer<typeof AgentYamlSchema>;

// デフォルト値
let agentName = "Slack汎用エージェント";
let agentInstructions = `あなたはSlackの親切なアシスタントです。\n\n- 会話の文脈（DM/スレッド/メンション）を理解し、適切に応答してください\n- 初回DMは自己紹介を含めてください\n- スレッドでは履歴を考慮し、メンション時は丁寧な日本語で応答してください`;
let agentModel: any = openai("gpt-4o-mini");

const yamlPath = process.env.GENERIC_AGENT_YAML;
if (yamlPath && fs.existsSync(yamlPath)) {
  try {
    const doc = yaml.load(fs.readFileSync(yamlPath, "utf8"));
    const parsed = AgentYamlSchema.safeParse(doc);
    if (parsed.success) {
      const agentYaml: AgentYaml = parsed.data;
      agentName = agentYaml.name;
      agentInstructions = agentYaml.instructions;
      agentModel = openai(agentYaml.model);
    } else {
      console.warn("YAMLのバリデーションに失敗しました", parsed.error);
    }
  } catch (e) {
    console.warn("YAMLの読み込みに失敗しました", e);
  }
}

export const singleAgent = new Agent({
  name: agentName,
  instructions: agentInstructions,
  model: agentModel,
  // tools: {} // 必要に応じてツールを追加
}); 