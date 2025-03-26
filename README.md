# Slack Agent

Slack integration for AI Agents - TypeScriptで実装されたSlack Bot

## 機能

- Slackでのメンション (`@botname`) をトリガーに応答するボット
- 設定可能な応答メッセージ
- TypeScript + Bun で実装
- Docker コンテナでの実行

## 環境変数

以下の環境変数を設定する必要があります：

| 変数名 | 必須 | 説明 | デフォルト値 |
|--------|------|------|------------|
| `SLACK_BOT_TOKEN` | ✅ | Slack Bot User OAuth Token | なし |
| `SLACK_SIGNING_SECRET` | ✅ | Slack Signing Secret | なし |
| `PORT` | ❌ | サーバーのポート番号 | 3000 |
| `REPLY_MESSAGE` | ❌ | ボットの応答メッセージ | "こんにちは！メッセージありがとうございます。" |

## 開発

### 必要条件

- [Bun](https://bun.sh/) v1.x

### セットアップ

```bash
# 依存関係のインストール
bun install

# 開発サーバーの起動（ホットリロード）
bun run dev

# テストの実行
bun test

# リンターの実行
bun run lint
```

### ビルド

```bash
# ビルド
bun run build
```

### Docker

ローカルでのビルドと実行：

```bash
# イメージのビルド
docker build -t slack-agent .

# コンテナの実行
docker run -p 3000:3000 --env-file .env slack-agent
```

## CI/CD

GitHub Actionsで以下が自動化されています：

- PRとpushごとのテスト実行
- mainブランチへのマージ時にDockerイメージのビルドとGitHub Container Registryへのプッシュ

## ライセンス

MIT