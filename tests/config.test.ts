// tests/config.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig, validateEnv, ConfigError } from '../src/config';

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

  it('should load disallowed tools from environment variable', () => {
    // 環境変数の設定
    process.env.SLACK_BOT_TOKEN = 'test-token';
    process.env.DISALLOWED_TOOLS = 'Bash,Edit';
    
    // 設定読み込み
    const config = loadConfig();
    
    // 期待される設定値の検証
    expect(config.ai.disallowedTools).toBe('Bash,Edit');
  });
  
  it('should use default disallowed tools when env var is not provided', () => {
    // 環境変数の設定（DISALLOWED_TOOLSは設定しない）
    process.env.SLACK_BOT_TOKEN = 'test-token';
    
    // 設定読み込み
    const config = loadConfig();
    
    // デフォルト値の検証
    expect(config.ai.disallowedTools).toBe('Bash,Edit,MultiEdit,Write,NotebookRead,NotebookEdit,WebFetch,TodoRead,TodoWrite,WebSearch');
  });

  describe('Environment validation', () => {
    it('should validate socket mode environment variables', () => {
      // Socket Modeに必要な環境変数を設定
      process.env.SLACK_BOT_TOKEN = 'test-token';
      process.env.SLACK_APP_TOKEN = 'test-app-token';
      
      // エラーが発生しないことをテスト
      expect(() => validateEnv('socket')).not.toThrow();
    });
    
    it('should validate web API mode environment variables', () => {
      // Web API Modeに必要な環境変数を設定
      process.env.SLACK_BOT_TOKEN = 'test-token';
      process.env.SLACK_SIGNING_SECRET = 'test-secret';
      
      // エラーが発生しないことをテスト
      expect(() => validateEnv('webapi')).not.toThrow();
    });
    
    it('should throw ConfigError for missing socket mode variables', () => {
      // SLACK_BOT_TOKENのみ設定
      process.env.SLACK_BOT_TOKEN = 'test-token';
      
      // SLACK_APP_TOKENが不足しているのでエラーが発生するはず
      expect(() => validateEnv('socket')).toThrow(ConfigError);
      expect(() => validateEnv('socket')).toThrow(/SLACK_APP_TOKEN/);
    });
    
    it('should throw ConfigError for missing web API mode variables', () => {
      // SLACK_BOT_TOKENのみ設定
      process.env.SLACK_BOT_TOKEN = 'test-token';
      
      // SLACK_SIGNING_SECRETが不足しているのでエラーが発生するはず
      expect(() => validateEnv('webapi')).toThrow(ConfigError);
      expect(() => validateEnv('webapi')).toThrow(/SLACK_SIGNING_SECRET/);
    });
    
    it('should throw ConfigError for missing bot token in both modes', () => {
      // 基本的な環境変数を設定しない
      
      // SLACK_BOT_TOKENが不足しているのでエラーが発生するはず
      expect(() => validateEnv('socket')).toThrow(/SLACK_BOT_TOKEN/);
      expect(() => validateEnv('webapi')).toThrow(/SLACK_BOT_TOKEN/);
    });
  });
});
