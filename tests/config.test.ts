// tests/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getConfig } from '../src/config';

describe('Configuration', () => {
  // 環境変数のバックアップを保持
  const envBackup = { ...process.env };
  
  // 各テスト前に環境変数をリセット
  beforeEach(() => {
    // 環境変数をクリア
    Object.keys(process.env).forEach(key => {
      delete process.env[key];
    });
  });
  
  // 各テスト後に元の環境変数を復元
  afterEach(() => {
    // 環境変数を元に戻す
    Object.keys(process.env).forEach(key => {
      delete process.env[key];
    });
    Object.keys(envBackup).forEach(key => {
      process.env[key] = envBackup[key];
    });
  });
  
  it('should load config from environment variables', () => {
    // 環境変数の設定
    process.env.SLACK_BOT_TOKEN = 'test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    process.env.PORT = '9000';
    process.env.REPLY_MESSAGE = 'カスタムメッセージ';
    
    // 設定読み込み
    const config = getConfig();
    
    // 期待される設定値の検証
    expect(config.slack.botToken).toBe('test-token');
    expect(config.slack.signingSecret).toBe('test-secret');
    expect(config.app.port).toBe(9000);
    expect(config.app.replyMessage).toBe('カスタムメッセージ');
  });
  
  it('should use default values when env vars are not provided', () => {
    // 必須項目のみ設定
    process.env.SLACK_BOT_TOKEN = 'test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    // PORT, REPLY_MESSAGEは設定せずにデフォルト値が使われるべき
    
    // 設定読み込み
    const config = getConfig();
    
    // デフォルト値の検証
    expect(config.app.port).toBe(3000);
    expect(config.app.replyMessage).toBe('こんにちは！メッセージありがとうございます。');
  });
  
  it('should throw error when bot token is missing', () => {
    // BOT TOKENを設定しない
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    
    // エラーを投げるべき
    expect(() => getConfig()).toThrow('SLACK_BOT_TOKEN is required');
  });
  
  it('should throw error when signing secret is missing', () => {
    // SIGNING SECRETを設定しない
    process.env.SLACK_BOT_TOKEN = 'test-token';
    
    // エラーを投げるべき
    expect(() => getConfig()).toThrow('SLACK_SIGNING_SECRET is required');
  });
});