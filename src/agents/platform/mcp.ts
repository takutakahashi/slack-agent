import { MCPClient } from '@mastra/mcp';
import fs from 'fs';
import yaml from 'js-yaml';
import { z } from 'zod';

// YAMLスキーマ定義（mcp_serversのみ）
const McpYamlSchema = z.object({
  mcp_servers: z.record(
    z.object({
      command: z.string().optional(),
      args: z.array(z.string()).optional(),
      env: z.record(z.string()).optional(),
      url: z.string().optional(),
    })
  )
});

type McpYaml = z.infer<typeof McpYamlSchema>;

let mcpInstance: any = null;
let toolsetsInstance: any = null;

export async function createMcpAndToolsets() {
  if (mcpInstance && toolsetsInstance) {
    return { mcp: mcpInstance, toolsets: toolsetsInstance };
  }
  const yamlPath = process.env.GENERIC_AGENT_YAML;
  if (!yamlPath || !fs.existsSync(yamlPath)) {
    throw new Error('GENERIC_AGENT_YAMLが指定されていないか、ファイルが存在しません');
  }
  const doc = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  const parsed = McpYamlSchema.safeParse(doc);
  if (!parsed.success) {
    throw new Error('YAMLのバリデーションに失敗しました: ' + parsed.error);
  }
  const mcpYaml: McpYaml = parsed.data;
  // urlをURL型に変換
  const servers: any = {};
  for (const [key, value] of Object.entries(mcpYaml.mcp_servers)) {
    servers[key] = { ...value };
    if (value.url) {
      servers[key].url = new URL(value.url);
    }
  }
  mcpInstance = new MCPClient({ servers });
  toolsetsInstance = await mcpInstance.getToolsets();
  return { mcp: mcpInstance, toolsets: toolsetsInstance };
} 