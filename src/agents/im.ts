import { BaseAgent } from './base';
import type { Tool } from './base';

export interface IMContext {
  userId: string;
  threadTs?: string;
  previousMessages: Array<{
    user: string;
    text: string;
    ts: string;
  }>;
  isFirstInteraction: boolean;
}

export class IMAgent extends BaseAgent {
  protected getTools(): Tool[] {
    const tools = super.getTools();
    return [
      ...tools,
      {
        name: 'imReply',
        description: 'ダイレクトメッセージを送信します',
        parameters: {
          message: {
            type: 'string',
            description: '送信するメッセージ',
          },
          context: {
            type: 'object',
            description: 'DMのコンテキスト情報',
            properties: {
              userId: {
                type: 'string',
                description: 'ユーザーID',
              },
              threadTs: {
                type: 'string',
                description: 'スレッドのタイムスタンプ（オプション）',
                optional: true,
              },
            },
          },
        },
        execute: async ({ message, context }: { message: string; context: IMContext }) => {
          // DMへの返信ロジックを実装
          return `メッセージを送信しました: ${message}`;
        },
      },
    ];
  }

  public async handleMessage(message: string, context: IMContext): Promise<string> {
    // 初回のやり取りの場合は挨拶を含める
    if (context.isFirstInteraction) {
      return this.process(`
初めてのダイレクトメッセージです。
ユーザーからのメッセージ: ${message}

注意事項：
- ユーザーIDは <@${context.userId}> です
- これは1対1のプライベートな会話です
- 丁寧で親しみやすい応答を心がけてください
- 必要に応じて自己紹介を含めてください
`);
    }

    // 会話履歴を含めたプロンプトを構築
    const conversationHistory = context.previousMessages
      .map(msg => `${msg.user === context.userId ? 'ユーザー' : 'アシスタント'}: ${msg.text}`)
      .join('\n');

    const response = await this.process(`
ダイレクトメッセージの会話履歴：
${conversationHistory}

最新のメッセージ：
${message}

注意事項：
- ユーザーIDは <@${context.userId}> です
- これは1対1のプライベートな会話です
- 会話の文脈を考慮して応答してください
- 親しみやすく、かつ専門的な支援ができるよう心がけてください
${context.threadTs ? '- これはスレッド内の会話です' : ''}
`);
    return response;
  }
} 