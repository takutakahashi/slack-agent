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

/**
 * 設定エラー
 * アプリケーション設定に関するエラーを表すカスタムエラークラス
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * 環境変数の存在チェック
 * 必要な環境変数が設定されているかを確認する
 */
export const validateEnv = (mode: 'socket' | 'webapi') => {
  const missingVars: string[] = [];
  
  // 共通で必要な環境変数
  if (!process.env.SLACK_BOT_TOKEN) {
    missingVars.push('SLACK_BOT_TOKEN');
  }
  
  // モード別に必要な環境変数をチェック
  if (mode === 'socket') {
    // Socket Modeの場合
    if (!process.env.SLACK_APP_TOKEN) {
      missingVars.push('SLACK_APP_TOKEN');
    }
  } else if (mode === 'webapi') {
    // WebAPI Modeの場合
    if (!process.env.SLACK_SIGNING_SECRET) {
      missingVars.push('SLACK_SIGNING_SECRET');
    }
  }

  if (missingVars.length > 0) {
    const modeText = mode === 'socket' ? 'Socket Mode' : 'WebAPI Mode';
    throw new ConfigError(
      `${modeText}で起動するには以下の環境変数が必要です: ${missingVars.join(', ')}\n` +
      `これらの値はSlackアプリの設定ページから取得できます。`
    );
  }
};

const DEFAULT_SYSTEM_PROMPT = `あなたは親切で有能なアシスタントです。ユーザーの質問や要望に対して、丁寧かつ適切に応答してください。

応答の際は以下の点に注意してください：
1. 明確で分かりやすい日本語を使用する
2. 必要に応じて箇条書きや見出しを使用して情報を整理する
3. 専門用語を使用する場合は適切な説明を加える
4. ユーザーの質問意図を理解し、的確な情報を提供する
5. 不確かな情報は提供せず、その旨を伝える`;

/**
 * 設定を読み込む
 * 環境変数から設定値を読み込みます
 */
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