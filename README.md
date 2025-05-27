# Slack Agent

Slack integration for AI Agents - TypeScriptで実装されたSlack Bot

## 機能

- Slackでのメンション (`@botname`) をトリガーに応答するAIアシスタント
- Claude AIを活用した自然な会話体験
- スレッドでの継続的な会話サポート
- ダイレクトメッセージ（DM）対応
- カスタマイズ可能なシステムプロンプト
- MCP（Mastra Control Plane）サーバーによる拡張機能
- TypeScript + Bun で実装
- Docker コンテナでの実行

## 環境変数

以下の環境変数を設定する必要があります：

| 変数名 | 必須 | 説明 | デフォルト値 |
|--------|------|------|------------|
| `SLACK_BOT_TOKEN` | ✅ | Slack Bot User OAuth Token | なし |
| `SLACK_SIGNING_SECRET` | ✅ | Slack Signing Secret | なし |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API Key for Claude CLI | なし |
| `SLACK_APP_TOKEN` | ❌ | Slack App Token (Socket Mode用) | なし |
| `GENERIC_AGENT_YAML` | ❌ | MCP server configuration file path | なし |
| `SYSTEM_PROMPT_PATH` | ❌ | カスタムシステムプロンプトのファイルパス | なし |
| `PORT` | ❌ | サーバーのポート番号 | 3000 |

## セットアップガイド

詳細なセットアップ手順については、以下のガイドを参照してください：

- [セットアップガイド（日本語）](docs/ja/setup-guide.md)
- [Setup Guide (English)](docs/en/setup-guide.md)

## Docker拡張ガイド

Dockerイメージを拡張してMCPサーバーを追加する方法については、以下のガイドを参照してください：

- [Docker拡張ガイド（日本語）](docs/ja/docker-extension-guide.md)
- [Docker Extension Guide (English)](docs/en/docker-extension-guide.md)

## 開発

### 必要条件

- [Bun](https://bun.sh/) v1.x
- Node.js v18以上（型定義に必要）

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

## ユーザーガイド

詳細な使用方法については、以下のガイドを参照してください：

- [ユーザーガイド（日本語）](docs/ja/user-guide.md)
- [User Guide (English)](docs/en/user-guide.md)

## ライセンス

MIT
