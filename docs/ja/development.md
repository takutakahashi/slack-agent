# 開発ガイド

## セットアップ

### 必要条件
- [bun](https://bun.sh) v1.0.25以上
- Node.js v18以上（型定義に必要）

### 初期セットアップ

```bash
# 依存関係のインストール
bun install
```

### Slack アプリの設定

1. [api.slack.com/apps](https://api.slack.com/apps)で新しいSlackアプリを作成
2. "Basic Information"で"Signing Secret"を確認

3. Socket ModeまたはHTTPモードのいずれかを選択：

   #### オプションA: Socket Mode（開発用推奨）
   - "Socket Mode"を有効化し、App-Level Tokenを作成
   - Event Subscription URLの設定は不要
   - 環境変数に`SLACK_APP_TOKEN`（`xapp-`で始まる）を追加

   #### オプションB: HTTPモード（本番環境用推奨）
   - Socket Modeは無効のまま
   - "Event Subscriptions"で：
     - イベントを有効化
     - Request URLを設定: `https://your-domain/slack/events`
     - URLの検証が完了するまで待機
   - ローカル開発でHTTPモードを使用する場合：
     - [ngrok](https://ngrok.com)などのツールで公開URLを作成
     - `ngrok http 3000`を実行
     - 生成されたURLをRequest URLとして使用: `https://<ngrok-id>.ngrok.io/slack/events`

4. "OAuth & Permissions"で以下のbot token scopesを追加：
   - `app_mentions:read`
   - `chat:write`
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `mpim:history`

5. ワークスペースにアプリをインストール

6. "Bot User OAuth Token"（`xoxb-`で始まる）を保存

7. "Event Subscriptions"で：
   - 以下のbot eventsを購読：
     - `app_mention`
     - `message.channels`
     - `message.groups`
     - `message.im`
     - `message.mpim`

### Socket Modeのセットアップと使用方法

Socket Modeを使用すると、WebSocket接続を通じてSlack APIとやり取りできます。これは開発環境や、公開HTTPエンドポイントを公開できない環境に最適です。

#### 1. Socket Modeの有効化

1. [api.slack.com/apps](https://api.slack.com/apps)でアプリの設定を開く
2. 左サイドバーの"Socket Mode"をクリック
3. "Enable Socket Mode"をオンに切り替え
4. 以下のスコープを持つApp-Level Tokenを生成：
   - `connections:write`
   - `app_token`
5. 生成されたトークン（`xapp-`で始まる）を保存 - 表示は1回限り

#### 2. 環境設定

`.env`ファイルを作成または更新し、必要なトークンを設定：

```env
# Botトークン（xoxb-で始まる）
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Socket Mode用App-Level Token（xapp-で始まる）
SLACK_APP_TOKEN=xapp-your-app-token

# Signing Secret（Basic Informationから）
SLACK_SIGNING_SECRET=your-signing-secret

# ポート番号（オプション、デフォルト: 3000）
PORT=3000
```

#### 3. コードの設定

`SLACK_APP_TOKEN`が存在する場合、アプリケーションは自動的にSocket Modeを使用します：

```typescript
// アプリでのSocket Mode設定例
const app = new App({
  token: config.slack.token,           // Botトークン
  appToken: config.slack.appToken,     // App-Level Token
  socketMode: true,                    // Socket Modeを有効化
  signingSecret: config.slack.signingSecret
});
```

#### 4. アプリの実行

1. アプリケーションの起動：
   ```bash
   # 開発モード（ホットリロード有効）
   bun run dev

   # または本番モード
   bun run start
   ```

2. 接続の確認：
   - コンソールに"⚡️ Bolt app is running!"と表示されることを確認
   - WebSocket接続が自動的に確立される
   - ポートの公開やngrokは不要

#### 5. 接続テスト

1. 基本的な接続テスト：
   ```bash
   # アプリが起動し接続されているか確認
   bun run dev
   ```

2. メンションテスト：
   - Slackでボットにメンション: `@YourBot hello`
   - コンソールにインタラクションが記録される
   - ボットがスレッドで応答する

3. スレッドテスト：
   - ボットが参加しているチャンネルでスレッドを開始
   - ボットがスレッドメッセージを記録（設定されている場合）

#### 6. Socket Modeのデバッグ

よくある問題と解決方法：

1. **接続の問題**
   ```
   Error: Cannot connect to Slack
   ```
   - `SLACK_APP_TOKEN`が正しいか確認
   - SlackでSocket Modeが有効になっているか確認
   - 必要なスコープが付与されているか確認

2. **認証エラー**
   ```
   An API error occurred: invalid_auth
   ```
   - `SLACK_BOT_TOKEN`を確認
   - アプリがワークスペースに正しくインストールされているか確認
   - 必要なスコープがすべて付与されているか確認

3. **イベント購読の問題**
   ```
   Warning: No subscription callback
   ```
   - 必要なボットイベントを購読しているか確認
   - ボットに必要なスコープが付与されているか確認
   - ボットがチャンネルに招待されているか確認

#### 7. ベストプラクティス

1. **トークンのセキュリティ**
   - トークンをバージョン管理に含めない
   - 環境変数を使用する
   - 漏洩した場合はトークンをローテーション

2. **エラーハンドリング**
   ```typescript
   app.error(async (error) => {
     console.error('エラーが発生しました:', error);
     // エラーハンドリングを実装
   });
   ```

3. **モニタリング**
   - 重要なイベントをログに記録
   - 接続状態を追跡
   - WebSocketの再接続を監視

4. **開発ワークフロー**
   - 開発用と本番用で別のアプリを使用
   - テスト用に別のワークスペースを作成
   - 開発専用のチャンネルを活用

## ローカル開発

### テストの実行

```bash
# すべてのテストを実行
bun test

# 特定のテストファイルを実行
bun test tests/mention.test.ts

# ウォッチモードでテストを実行
bun test --watch

# カバレッジレポートの生成
bun test --coverage
```

### テストの構造

テストは`tests`ディレクトリに配置されており、以下のファイルが含まれています：

- `config.test.ts`: 設定関連のテスト
- `mention.test.ts`: メンションハンドラーのテスト
- `message.test.ts`: メッセージハンドラーのテスト

### テストの追加

新しい機能を追加する場合は、対応するテストも追加してください。テストファイルは以下の命名規則に従います：

```
tests/{機能名}.test.ts
```

テストは以下の構造に従って記述してください：

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('機能名', () => {
  it('should テストケースの説明', () => {
    // テストコード
  });
});
```

### モックの使用

Slackのクライアントやイベントをモックする場合は、`vitest`の`vi.fn()`を使用します：

```typescript
const mockClient = {
  conversations: {
    replies: vi.fn().mockResolvedValue({
      messages: ['test message'],
    }),
  },
};
```

## ビルド

```bash
# プロダクション用にビルド
bun run build

# ビルド結果の確認
ls -l dist/
```

## コードの品質管理

### リンター

```bash
# リンターの実行
bun run lint

# リンターの自動修正
bun run lint --fix
```

### 型チェック

```bash
# 型チェックの実行
bun run tsc --noEmit
``` 