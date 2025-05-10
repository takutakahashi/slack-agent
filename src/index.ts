// src/index.ts
import Bolt from '@slack/bolt';
const { App, ExpressReceiver, LogLevel } = Bolt;
import { loadConfig, validateEnv, ConfigError } from './config';
import { registerMentionHandler } from './handlers/mention';
import { registerIMHandler } from './handlers/im';
import { registerThreadHandler } from './handlers/thread';
import { createGenericAgent } from './agents/generic';
import { createMcpAndToolsets } from './agents/platform/mcp';
import { WebClient } from '@slack/web-api';

// グローバル変数として保持
let globalBotUserId: string | null = null;

/**
 * BotのユーザーIDを取得する関数
 * 一度取得したらキャッシュを使用
 */
const getBotUserId = async (token: string): Promise<string> => {
  if (globalBotUserId) {
    return globalBotUserId;
  }
  const webClient = new WebClient(token);
  const authTest = await webClient.auth.test();
  globalBotUserId = authTest.user_id as string;
  return globalBotUserId;
};

/**
 * Slackアプリの設定に必要なスコープとイベント
 * 
 * 必要なBot Token Scopes:
 * - app_mentions:read (メンションを読む)
 * - channels:history (チャンネル履歴を読む)
 * - chat:write (メッセージを送信)
 * - groups:history (プライベートチャンネル履歴を読む)
 * - im:history (IMの履歴を読む)
 * - im:read (IMを読む)
 * - im:write (IMに書き込む)
 * - mpim:history (マルチパーソンIMの履歴を読む)
 * 
 * 必要なイベントサブスクリプション:
 * - app_mention (メンションを受信)
 * - message.channels (パブリックチャンネルのメッセージを受信)
 * - message.groups (プライベートチャンネルのメッセージを受信)
 * - message.im (IMのメッセージを受信)
 * - message.mpim (マルチパーソンIMのメッセージを受信)
 */

/**
 * アプリケーションのエントリーポイント
 * 設定を読み込み、Slack Bolt アプリケーションを初期化して起動します
 */
const startApp = async () => {
  try {
    console.log('🚀 アプリケーションを起動しています...');
    const config = loadConfig();

    // 起動モードの決定
    const isSocketMode = !!process.env.SLACK_APP_TOKEN;
    const mode = isSocketMode ? 'socket' : 'webapi';
    
    // 環境変数のバリデーション（必要な環境変数が設定されているか確認）
    try {
      validateEnv(mode);
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error(`❌ 設定エラー: ${error.message}`);
        process.exit(1);
      }
      throw error; // 他の種類のエラーはそのまま再スロー
    }
    
    // ここで一度だけ初期化
    const agentInstance = await createGenericAgent();
    const { toolsets } = await createMcpAndToolsets();

    // BotのユーザーIDを取得（キャッシュを使用）
    const botUserId = await getBotUserId(config.slack.token);

    if (isSocketMode) {
      console.log('🔌 Socket Mode でアプリを起動します');
      const app = new App({
        token: config.slack.token,
        appToken: process.env.SLACK_APP_TOKEN,
        socketMode: true,
        logLevel: LogLevel.DEBUG,
        // Socket Modeの再接続設定
        socketMode: {
          // trueに設定することで、接続が切断された場合に自動的に再接続を試みる
          reconnect: true,
          // 起動時のエラーでも再接続を試みる
          reconnectOnStart: true,
          // 再接続の試行設定
          retryConfig: {
            // 最大再試行回数 (null = 無制限)
            retries: 10,
            // リトライ間のディレイを計算する関数
            // attempt: 現在の再試行回数、error: 発生したエラー
            calculateDelay: (attempt) => {
              // 指数バックオフ: 2^attemptから始まるミリ秒 (最大60秒)
              const baseDelay = Math.min(1000 * Math.pow(2, attempt), 60000);
              // ±10%のジッターを加えて、競合を減らす
              const jitter = 0.8 + Math.random() * 0.4;
              return Math.floor(baseDelay * jitter);
            }
          }
        },
      });

      registerThreadHandler(app, agentInstance, toolsets, botUserId);
      registerIMHandler(app, agentInstance, toolsets);
      registerMentionHandler(app, agentInstance, toolsets);
      
      // Socket Mode接続の状態監視
      let socketConnected = false;
      let reconnectAttempts = 0;
      
      // 接続成功時のイベント
      app.client.on('connect', () => {
        console.log('✅ Socket Mode: 接続に成功しました');
        socketConnected = true;
        reconnectAttempts = 0;
      });

      // 接続切断時のイベント
      app.client.on('disconnect', () => {
        console.log('❗ Socket Mode: 接続が切断されました。再接続を試みます...');
        socketConnected = false;
      });

      // 再接続時のイベント
      app.client.on('reconnect', () => {
        reconnectAttempts++;
        console.log(`🔄 Socket Mode: 再接続中... (試行: ${reconnectAttempts}回目)`);
      });

      // エラーハンドリング
      app.error((error) => {
        console.error('❌ アプリケーションエラー:', error);
        // エラー状態をログに記録（必要に応じてモニタリングサービスに通知するコードも追加可能）
      });
      
      await app.start();
      console.log('⚡️ Socket Mode でアプリが起動しました');
      return;
    }

    console.log('🌐 Web API Mode でアプリを起動します');
    const receiver = new ExpressReceiver({
      signingSecret: config.slack.signingSecret,
      processBeforeResponse: true,
    });
    receiver.router.get('/health', (_, res) => {
      res.send('OK');
    });
    
    // ヘルスチェック用のエンドポイントを追加
    receiver.router.get('/health/details', (_, res) => {
      res.json({
        status: 'OK',
        version: process.env.npm_package_version || '0.1.0',
        timestamp: new Date().toISOString()
      });
    });
    
    const app = new App({
      token: config.slack.token,
      receiver,
    });

    registerThreadHandler(app, agentInstance, toolsets, botUserId);
    registerIMHandler(app, agentInstance, toolsets);
    registerMentionHandler(app, agentInstance, toolsets);
    
    // エラーハンドリング
    app.error((error) => {
      console.error('❌ アプリケーションエラー:', error);
      // エラー状態をログに記録（必要に応じてモニタリングサービスに通知するコードも追加可能）
    });
    
    await app.start(config.app.port);
    console.log(`⚡️ Web API Mode でアプリが起動しました（ポート: ${config.app.port}）`);
  } catch (error) {
    console.error('❌ アプリの起動中にエラーが発生:', error);
    process.exit(1);
  }
};

// アプリケーション起動
startApp().catch(console.error);