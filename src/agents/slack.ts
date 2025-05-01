import { BaseAgent } from './base';
import type { Tool } from './base';

export interface SlackContext {
  channelId: string;
  userId: string;
  threadTs: string | undefined;
}

export class SlackAgent extends BaseAgent {
  protected getTools(): Tool[] {
    const tools = super.getTools();
    return [
      ...tools,
      {
        name: 'slackReply',
        description: 'Slackチャンネルにメッセージを送信します',
        parameters: {
          message: {
            type: 'string',
            description: '送信するメッセージ',
          },
          context: {
            type: 'object',
            description: 'Slackのコンテキスト情報',
            properties: {
              channelId: {
                type: 'string',
                description: 'チャンネルID',
              },
              userId: {
                type: 'string',
                description: 'ユーザーID',
              },
              threadTs: {
                type: 'string',
                description: 'スレッドのタイムスタンプ',
                optional: true,
              },
            },
          },
        },
        execute: async ({ message, context }: { message: string; context: SlackContext }) => {
          // Slackへの返信ロジックを実装
          return `メッセージを送信しました: ${message}`;
        },
      },
    ];
  }

  public async handleMessage(message: string, context: SlackContext): Promise<string> {
    // メンションを除去してメッセージを抽出
    const cleanMessage = message.replace(/<@[A-Z0-9]+>/g, '').trim();
    
    if (!cleanMessage) {
      return 'こんにちは！何かお手伝いできることはありますか？';
    }

    const response = await this.process(`
ユーザーからの質問：
${cleanMessage}

注意事項：
- ユーザーIDは <@${context.userId}> です
- 必要に応じて適切なツールを使用してください
- 応答は日本語で、丁寧に行ってください
`);
    return response;
  }
} 