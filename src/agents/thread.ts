import { BaseAgent } from './base';
import type { Tool } from './base';

export interface ThreadContext {
  channelId: string;
  userId: string;
  threadTs: string;
  previousMessages: Array<{
    user: string;
    text: string;
    ts: string;
  }>;
}

export class ThreadAgent extends BaseAgent {
  protected getTools(): Tool[] {
    const tools = super.getTools();
    return [
      ...tools,
      {
        name: 'threadReply',
        description: 'スレッドにメッセージを送信します',
        parameters: {
          message: {
            type: 'string',
            description: '送信するメッセージ',
          },
          context: {
            type: 'object',
            description: 'スレッドのコンテキスト情報',
            properties: {
              channelId: {
                type: 'string',
                description: 'チャンネルID',
              },
              threadTs: {
                type: 'string',
                description: 'スレッドのタイムスタンプ',
              },
            },
          },
        },
        execute: async ({ message, context }: { message: string; context: ThreadContext }) => {
          // スレッドへの返信ロジックを実装
          return `メッセージを送信しました: ${message}`;
        },
      },
    ];
  }

  public async handleMessage(message: string, context: ThreadContext): Promise<string> {
    // 会話履歴を含めたプロンプトを構築
    const conversationHistory = context.previousMessages
      .map(msg => `${msg.user === context.userId ? 'ユーザー' : 'アシスタント'}: ${msg.text}`)
      .join('\n');

    const response = await this.process(`
スレッド内の会話履歴：
${conversationHistory}

最新のメッセージ：
${message}

注意事項：
- ユーザーIDは <@${context.userId}> です
- これはスレッド内の会話です
- 会話の文脈を考慮して応答してください
- 必要に応じて過去の発言を参照してください
`);
    return response;
  }
} 