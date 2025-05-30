# Slack Agent

Slack integration for AI Agents - TypeScriptで実装されたSlack Bot

## 機能

- Slackでのメンション (`@botname`) をトリガーに応答するボット
- 設定可能な応答メッセージ
- TypeScript + Bun で実装
- Docker コンテナでの実行

## 環境変数

### 必須環境変数

#### 全モード共通
| 変数名 | 説明 | 例 |
|--------|------|-----|
| `SLACK_BOT_TOKEN` | Slack Bot User OAuth Token | `xoxb-your-bot-token` |

#### Socket Mode（開発環境推奨）
| 変数名 | 説明 | 例 |
|--------|------|-----|
| `SLACK_APP_TOKEN` | Socket Mode用App-Level Token | `xapp-your-app-token` |

#### Web API Mode（本番環境推奨）
| 変数名 | 説明 | 例 |
|--------|------|-----|
| `SLACK_SIGNING_SECRET` | Slack Signing Secret | `your-signing-secret` |

### オプション環境変数
| 変数名 | 説明 | デフォルト値 |
|--------|------|------------|
| `PORT` | サーバーのポート番号 | `3000` |
| `SYSTEM_PROMPT_PATH` | カスタムシステムプロンプトファイルのパス | なし |
| `DISALLOWED_TOOLS` | Claudeで無効化するツール（カンマ区切り） | `Bash,Edit,MultiEdit,Write,NotebookRead,NotebookEdit,WebFetch,TodoRead,TodoWrite,WebSearch` |
| `AGENT_SCRIPT_PATH` | Claudeエージェント実行スクリプトのパス | `/usr/local/bin/start_agent.sh` |
| `CLAUDE_EXTRA_ARGS` | Claude実行時の追加引数 | なし |

## Slackアプリの設定

### 必須Bot Token Scopes
以下のスコープをSlackアプリの"OAuth & Permissions"で設定してください：

- `app_mentions:read` - メンションを読む
- `chat:write` - メッセージを送信
- `channels:history` - チャンネル履歴を読む
- `groups:history` - プライベートチャンネル履歴を読む
- `im:history` - IMの履歴を読む
- `im:read` - IMを読む
- `im:write` - IMに書き込む
- `mpim:history` - マルチパーソンIMの履歴を読む

### 必須Event Subscriptions
以下のイベントをSlackアプリの"Event Subscriptions"で購読してください：

- `app_mention` - メンションを受信
- `message.channels` - パブリックチャンネルのメッセージを受信
- `message.groups` - プライベートチャンネルのメッセージを受信
- `message.im` - IMのメッセージを受信
- `message.mpim` - マルチパーソンIMのメッセージを受信

## Claude設定

このアプリケーションはAnthropic社のClaude Code baseを使用しています。

### 必要なもの
- `mise`がインストールされていること
- `@anthropic-ai/claude-code`パッケージ（Dockerfileで自動インストール）
- `claude.json`設定ファイル（リポジトリに含まれています）

### 認証
Claude Codeの認証は以下の方法で行ってください：
1. Claude Codeの初期設定を完了する
2. 必要に応じてAWS認証情報を設定する（Claude Codeのドキュメントを参照）

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
