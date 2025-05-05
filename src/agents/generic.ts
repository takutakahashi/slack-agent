import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import fs from "fs";
import yaml from "js-yaml";

// デフォルト値
let agentName = "Slack汎用エージェント";
let agentInstructions = `あなたはSlackの親切なアシスタントです。\n\n- 会話の文脈（DM/スレッド/メンション）を理解し、適切に応答してください\n- 初回DMは自己紹介を含めてください\n- スレッドでは履歴を考慮し、メンション時は丁寧な日本語で応答してください`;

const yamlPath = process.env.GENERIC_AGENT_YAML;
if (yamlPath && fs.existsSync(yamlPath)) {
  try {
    const doc = yaml.load(fs.readFileSync(yamlPath, "utf8"));
    if (typeof doc === "object" && doc !== null) {
      if ("name" in doc && typeof doc.name === "string") agentName = doc.name;
      if ("instructions" in doc && typeof doc.instructions === "string") agentInstructions = doc.instructions;
    }
  } catch (e) {
    console.warn("YAMLの読み込みに失敗しました", e);
  }
}

export const singleAgent = new Agent({
  name: agentName,
  instructions: agentInstructions,
  model: openai("gpt-4o-mini"),
  // tools: {} // 必要に応じてツールを追加
}); 