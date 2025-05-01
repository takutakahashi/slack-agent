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

必要に応じて、以下のツールを使用することができます：
${this.tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

ツールの使用は必須ではありません。ユーザーの質問に直接答えられる場合は、そのまま回答してください。`;
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