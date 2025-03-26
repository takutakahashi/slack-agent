// src/config.ts
export interface Config {
  slack: {
    botToken: string;
    signingSecret: string;
  };
  app: {
    port: number;
    replyMessage: string;
  };
}

export const getConfig = (): Config => {
  // 環境変数から設定値を取得
  const botToken = process.env.SLACK_BOT_TOKEN;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const replyMessage = process.env.REPLY_MESSAGE || 'こんにちは！メッセージありがとうございます。';

  // 必須環境変数のチェック
  if (!botToken) {
    throw new Error('SLACK_BOT_TOKEN is required');
  }

  if (!signingSecret) {
    throw new Error('SLACK_SIGNING_SECRET is required');
  }

  return {
    slack: {
      botToken,
      signingSecret,
    },
    app: {
      port,
      replyMessage,
    },
  };
};