// src/index.ts
import Bolt from '@slack/bolt';
const { App, ExpressReceiver, LogLevel } = Bolt;
import { loadConfig } from './config';
import { registerMentionHandler } from './handlers/mention';
import { registerIMHandler } from './handlers/im';
import { registerThreadHandler } from './handlers/thread';
import { createGenericAgent } from './agents/generic';
import { createMcpAndToolsets } from './agents/platform/mcp';
import { WebClient } from '@slack/web-api';

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
    const config = loadConfig();
    // ここで一度だけ初期化
    const agentInstance = await createGenericAgent();
    const { toolsets } = await createMcpAndToolsets();

    // BotのユーザーIDを取得
    const webClient = new WebClient(config.slack.token);
    const authTest = await webClient.auth.test();
    const botUserId = authTest.user_id;

    if (process.env.SLACK_APP_TOKEN) {
      console.log('🔌 Socket Mode が有効です');
      const app = new App({
        token: config.slack.token,
        appToken: process.env.SLACK_APP_TOKEN,
        socketMode: true,
        logLevel: LogLevel.DEBUG,
      });
      registerThreadHandler(app, agentInstance, toolsets, botUserId);
      registerIMHandler(app, agentInstance, toolsets);
      registerMentionHandler(app, agentInstance, toolsets);
      await app.start();
      console.log('⚡️ Socket Mode でアプリが起動しました');
      return;
    }

    console.log('🌐 HTTP Mode が有効です');
    const receiver = new ExpressReceiver({
      signingSecret: config.slack.signingSecret,
      processBeforeResponse: true,
    });
    receiver.router.get('/health', (_, res) => {
      res.send('OK');
    });
    const app = new App({
      token: config.slack.token,
      receiver,
    });
    registerThreadHandler(app, agentInstance, toolsets, botUserId);
    registerIMHandler(app, agentInstance, toolsets);
    registerMentionHandler(app, agentInstance, toolsets);
    await app.start(config.app.port);
    console.log(`⚡️ HTTP Mode でアプリが起動しました（ポート: ${config.app.port}）`);
  } catch (error) {
    console.error('❌ アプリの起動中にエラーが発生:', error);
    process.exit(1);
  }
};

// アプリケーション起動
startApp().catch(console.error);