// src/config.ts
export interface Config {
  slack: {
    token: string;
    signingSecret: string;
    appToken?: string; // Socket Mode用のトークン
  };
  app: {
    port: number;
  };
  ai: {
    openaiApiKey: string;
    systemPromptPath?: string; // システムプロンプトファイルのパス
    defaultSystemPrompt: string; // デフォルトのシステムプロンプト
  };
}

const DEFAULT_SYSTEM_PROMPT = `あなたは親切で有能なアシスタントです。ユーザーの質問や要望に対して、丁寧かつ適切に応答してください。

応答の際は以下の点に注意してください：
1. 明確で分かりやすい日本語を使用する
2. 必要に応じて箇条書きや見出しを使用して情報を整理する
3. 専門用語を使用する場合は適切な説明を加える
4. ユーザーの質問意図を理解し、的確な情報を提供する
5. 不確かな情報は提供せず、その旨を伝える`;

export const loadConfig = (): Config => {
  return {
    slack: {
      token: process.env.SLACK_BOT_TOKEN || '',
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      appToken: process.env.SLACK_APP_TOKEN, // Socket Mode用のトークン
    },
    app: {
      port: parseInt(process.env.PORT || '3000', 10),
    },
    ai: {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      systemPromptPath: process.env.SYSTEM_PROMPT_PATH,
      defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    },
  };
};