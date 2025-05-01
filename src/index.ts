// src/index.ts
import { App, ExpressReceiver, LogLevel } from '@slack/bolt';
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
    
    // Socket Modeが有効な場合の設定
    if (process.env.SLACK_APP_TOKEN) {
      console.log('🔌 Socket Mode が有効です');
      const app = new App({
        token: config.slack.token,
        appToken: process.env.SLACK_APP_TOKEN,
        socketMode: true,
        logLevel: LogLevel.DEBUG, // デバッグログを有効化
      });

      // メンションとメッセージハンドラーの登録
      registerMentionHandler(app);
      registerMessageHandler(app);

      // アプリケーションの起動
      await app.start();
      console.log('⚡️ Socket Mode でアプリが起動しました');
      return;
    }

    // HTTPモードの設定（Socket Modeが無効な場合）
    console.log('🌐 HTTP Mode が有効です');
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
    
    // メンションとメッセージハンドラーの登録
    registerMentionHandler(app);
    registerMessageHandler(app);
    
    // アプリケーションの起動
    await app.start(config.app.port);
    console.log(`⚡️ HTTP Mode でアプリが起動しました（ポート: ${config.app.port}）`);
  } catch (error) {
    console.error('❌ アプリの起動中にエラーが発生:', error);
    process.exit(1);
  }
};

// アプリケーション起動
startApp().catch(console.error);