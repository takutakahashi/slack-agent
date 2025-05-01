import OpenAI from 'openai';
import fs from 'fs/promises';
import type { Config } from '../config';
import { loadConfig } from '../config';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<string>;
}

export class BaseAgent {
  private openai: OpenAI;
  private tools: Tool[];
  private config: Config;
  private systemPrompt: string;

  constructor() {
    this.config = loadConfig();
    this.openai = new OpenAI({
      apiKey: this.config.ai.openaiApiKey,
    });
    this.tools = this.getTools();
    this.systemPrompt = this.config.ai.defaultSystemPrompt;
  }

  protected async initialize(): Promise<void> {
    if (this.config.ai.systemPromptPath) {
      try {
        this.systemPrompt = await fs.readFile(this.config.ai.systemPromptPath, 'utf-8');
        console.log('システムプロンプトを外部ファイルから読み込みました:', this.config.ai.systemPromptPath);
      } catch (error) {
        console.warn('システムプロンプトファイルの読み込みに失敗しました。デフォルトのプロンプトを使用します:', error);
      }
    }
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'search',
        description: '与えられたクエリに基づいて情報を検索します',
        parameters: {
          query: {
            type: 'string',
            description: '検索クエリ',
          },
        },
        execute: async ({ query }: { query: string }) => {
          return `検索結果: ${query}に関する情報`;
        },
      },
    ];
  }

  protected getSystemPromptWithTools(): string {
    return `${this.systemPrompt}

以下の点に注意して応答してください：
1. 自然な会話を心がけ、ユーザーに寄り添った対応をしてください
2. 必要な場合のみツールを使用し、通常は直接会話で応答してください
3. 応答は必ず通常の文章で行い、特別なフォーマットは使用しないでください
4. ユーザーの質問や要望に対して、具体的で実用的な情報を提供してください
5. 専門用語を使用する場合は、適切な説明を加えてください

利用可能なツール：
${this.tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}`;
  }

  public async process(input: string): Promise<string> {
    // 初期化が完了していない場合は実行
    if (!this.systemPrompt) {
      await this.initialize();
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: this.getSystemPromptWithTools(),
        },
        {
          role: 'user',
          content: input,
        },
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || '申し訳ありません。応答を生成できませんでした。';
    return response;
  }
} 