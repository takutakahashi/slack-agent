// src/index.ts
import { App, ExpressReceiver } from '@slack/bolt';
import { loadConfig } from './config';
import { registerMentionHandler } from './handlers/mention';
import { registerMessageHandler } from './handlers/message';

/**
 * アプリケーションのエントリーポイント
 * 設定を読み込み、Slack Bolt アプリケーションを初期化して起動します
 */
const startApp = async () => {
  try {
    // 設定を読み込む
    const config = loadConfig();
    
    // ExpressReceiverの初期化
    const receiver = new ExpressReceiver({
      signingSecret: config.slack.signingSecret,
      processBeforeResponse: true,
    });

    // ヘルスチェックエンドポイントの追加
    receiver.router.get('/health', (_, res) => {
      res.send('OK');
    });
    
    // Slack Bolt アプリケーションの初期化
    const app = new App({
      token: config.slack.token,
      receiver,
    });
    
    // メンションハンドラーの登録
    registerMentionHandler(app);
    registerMessageHandler(app);
    
    // アプリケーションの起動
    await app.start(config.app.port);
    console.log(`⚡️ Bolt app is running on port ${config.app.port}!`);
  } catch (error) {
    console.error('Error starting app:', error);
    process.exit(1);
  }
};

// アプリケーション起動
startApp().catch(console.error);