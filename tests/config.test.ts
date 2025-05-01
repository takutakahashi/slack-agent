// tests/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config';

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
    
    // 設定読み込み
    const config = loadConfig();
    
    // 期待される設定値の検証
    expect(config.slack.token).toBe('test-token');
    expect(config.slack.signingSecret).toBe('test-secret');
    expect(config.app.port).toBe(9000);
  });
  
  it('should use default values when env vars are not provided', () => {
    // 必須項目のみ設定
    process.env.SLACK_BOT_TOKEN = 'test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    // PORTは設定せずにデフォルト値が使われるべき
    
    // 設定読み込み
    const config = loadConfig();
    
    // デフォルト値の検証
    expect(config.app.port).toBe(3000);
  });
  
  it('should handle empty environment variables', () => {
    // 環境変数を設定しない
    const config = loadConfig();
    
    // デフォルト値の検証
    expect(config.slack.token).toBe('');
    expect(config.slack.signingSecret).toBe('');
    expect(config.app.port).toBe(3000);
  });
});