// src/config.ts
export interface Config {
  slack: {
    token: string;
    signingSecret: string;
  };
  app: {
    port: number;
  };
}

export const loadConfig = (): Config => {
  return {
    slack: {
      token: process.env.SLACK_BOT_TOKEN || '',
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    },
    app: {
      port: parseInt(process.env.PORT || '3000', 10),
    },
  };
};