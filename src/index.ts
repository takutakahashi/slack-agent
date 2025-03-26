// src/index.ts
import { App, ExpressReceiver } from '@slack/bolt';
import { getConfig } from './config';
import { registerMentionHandler } from './handlers/mention';

/**
 * アプリケーションのエントリーポイント
 * 設定を読み込み、Slack Bolt アプリケーションを初期化して起動します
 */
const startApp = async () => {
  try {
    // 設定を読み込む
    const config = getConfig();
    
    // ExpressReceiverを作成してヘルスチェックエンドポイントを追加
    const receiver = new ExpressReceiver({
      signingSecret: config.slack.signingSecret,
      processBeforeResponse: true,
    });
    
    // ヘルスチェックエンドポイントの追加
    receiver.app.get('/health', (_, res) => {
      res.status(200).send('OK');
    });
    
    // Slack Bolt アプリケーションの初期化
    const app = new App({
      token: config.slack.botToken,
      receiver,
    });
    
    // メンションハンドラーの登録
    registerMentionHandler(app, config);
    
    // サーバーの起動
    await app.start(config.app.port);
    console.log(`⚡️ Slack Bot is running on port ${config.app.port}!`);
  } catch (error) {
    console.error('Error starting app:', error);
    process.exit(1);
  }
};

// アプリケーション起動
startApp();