# Slack Agent セットアップガイド

このガイドでは、Slack Agentの設定方法について説明します。Slack Agentは、Slackワークスペースで動作するAIアシスタントで、Claude AIを活用して自然な会話を実現します。

## 目次

1. [前提条件](#前提条件)
2. [Slackアプリの設定](#slackアプリの設定)
3. [Anthropic API Keyの設定](#anthropic-api-keyの設定)
4. [環境変数の設定](#環境変数の設定)
5. [MCP（Mastra Control Plane）サーバーの設定](#mcpmastra-control-planeサーバーの設定)
6. [Dockerでの実行](#dockerでの実行)
7. [トラブルシューティング](#トラブルシューティング)

## 前提条件

- [Bun](https://bun.sh/) v1.x
- Node.js v18以上（型定義に必要）
- [Anthropic API Key](https://console.anthropic.com/)
- Slackワークスペースの管理者権限

## Slackアプリの設定

### 1. Slackアプリの作成

1. [api.slack.com/apps](https://api.slack.com/apps)にアクセスし、「Create New App」をクリックします
2. 「From scratch」を選択します
3. アプリ名（例：「AI Assistant」）を入力し、使用するワークスペースを選択します
4. 「Create App」をクリックします

### 2. 基本情報の確認

「Basic Information」セクションで以下の情報を確認します：

- **App Credentials**セクションの「Signing Secret」をメモします（後で環境変数として使用）

### 3. Socket ModeまたはHTTPモードの選択

#### オプションA: Socket Mode（開発用推奨）

1. 左サイドバーの「Socket Mode」をクリックします
2. 「Enable Socket Mode」をオンにします
3. App-Level Tokenを生成します（スコープ：`connections:write`）
4. 生成されたトークン（`xapp-`で始まる）をメモします（後で環境変数として使用）

#### オプションB: HTTPモード（本番環境用推奨）

1. 左サイドバーの「Event Subscriptions」をクリックします
2. 「Enable Events」をオンにします
3. Request URLを設定します：`https://your-domain/slack/events`
   - ローカル開発の場合は、[ngrok](https://ngrok.com)などのツールを使用して一時的な公開URLを作成できます
   - 例：`ngrok http 3000`を実行し、生成されたURLを使用

### 4. ボットの権限設定

1. 左サイドバーの「OAuth & Permissions」をクリックします
2. 「Scopes」セクションで以下のBot Token Scopesを追加します：
   - `app_mentions:read` (メンション)
   - `chat:write` (メッセージ送信)
   - `channels:history` (チャンネル履歴)
   - `groups:history` (プライベートチャンネル履歴)
   - `im:history` (IM履歴)
   - `im:read` (IM読み取り)
   - `im:write` (IM書き込み)
   - `mpim:history` (マルチパーソンIM履歴)

### 5. イベントの購読設定

1. 左サイドバーの「Event Subscriptions」をクリックします
2. 「Subscribe to bot events」セクションで以下のイベントを追加します：
   - `app_mention` (メンション)
   - `message.channels` (パブリックチャンネル)
   - `message.groups` (プライベートチャンネル)
   - `message.im` (ダイレクトメッセージ)
   - `message.mpim` (マルチパーソンIM)

### 6. アプリのインストール

1. 左サイドバーの「Install App」をクリックします
2. 「Install to Workspace」をクリックしてワークスペースにアプリをインストールします
3. 「Bot User OAuth Token」（`xoxb-`で始まる）をメモします（後で環境変数として使用）

## Anthropic API Keyの設定

Slack AgentはClaude CLIを使用してAnthropicのAIモデルと通信します。以下の手順でAPI Keyを設定します。

### 1. Anthropic API Keyの取得

1. [Anthropic Console](https://console.anthropic.com/)にアクセスしてアカウントを作成またはログインします
2. 「API Keys」セクションで新しいAPIキーを作成します
3. 生成されたAPIキーをメモします（`sk-`で始まる）

### 2. Claude CLIの認証設定

Claude CLIは環境変数または設定ファイルを通じて認証を行います。以下のいずれかの方法で設定します：

#### 環境変数による設定（推奨）

環境変数`ANTHROPIC_API_KEY`にAPIキーを設定します：

```bash
export ANTHROPIC_API_KEY=sk-your-api-key
```

または、`.env`ファイルに追加します：

```
ANTHROPIC_API_KEY=sk-your-api-key
```

#### 設定ファイルによる設定

`~/.claude.json`ファイルを作成し、以下の内容を追加します：

```json
{
  "apiKey": "sk-your-api-key"
}
```

### 3. 認証の確認

設定が正しく行われたことを確認するには、以下のコマンドを実行します：

```bash
mise exec -- claude auth status
```

正しく設定されている場合、認証状態が表示されます。

## 環境変数の設定

Slack Agentを実行するには、以下の環境変数を設定する必要があります。`.env`ファイルを作成するか、環境に直接設定します：

```bash
# 必須の環境変数
SLACK_BOT_TOKEN=xoxb-your-bot-token  # Slack Bot User OAuth Token
SLACK_SIGNING_SECRET=your-signing-secret  # Slack Signing Secret
ANTHROPIC_API_KEY=sk-your-api-key  # Anthropic API Key

# オプションの環境変数
SLACK_APP_TOKEN=xapp-your-app-token  # Socket Mode使用時に必要
GENERIC_AGENT_YAML=/path/to/your/agent-config.yaml  # MCPサーバー設定ファイルのパス
PORT=3000  # アプリケーションのポート番号
SYSTEM_PROMPT_PATH=/path/to/your/prompt.txt  # カスタムシステムプロンプト
```

## MCP（Mastra Control Plane）サーバーの設定

MCPサーバーを使用すると、Slack Agentに外部ツールや機能を追加できます。

### 1. YAML設定ファイルの作成

以下のような内容の`agent-config.yaml`ファイルを作成します：

```yaml
# エージェントの設定
name: "Slackカスタムアシスタント"
instructions: |
  あなたはSlackのカスタムアシスタントです。
  - ユーザーの質問に丁寧かつ簡潔に答えてください
  - 必要に応じて自己紹介やヘルプを提供してください
  - どんな内容でも日本語で親切に対応してください
model: "gpt-4o"  # または "claude-3-opus-20240229" など

# MCPサーバー設定
mcp_servers:
  # コマンド実行型サーバー
  stockPrice:
    command: npx
    args:
      - -y
      - tsx
      - ./src/mastra/tools/stock-price.ts
    env:
      API_KEY: your-api-key

  # URL接続型サーバー
  weather:
    url: http://localhost:8080/sse
```

### 2. 環境変数の設定

作成したYAMLファイルのパスを環境変数に設定します：

```bash
export GENERIC_AGENT_YAML=/path/to/your/agent-config.yaml
```

### 3. MCPサーバーの追加（Docker環境）

Docker環境でMCPサーバーを追加するには、`add_mcp_servers.sh`スクリプトを使用します：

```bash
/usr/local/bin/add_mcp_servers.sh "server_name" '{"command":"npx","args":["-y","tsx","./path/to/script.ts"]}'
```

## Dockerでの実行

### 1. イメージのビルド

```bash
docker build -t slack-agent .
```

### 2. コンテナの実行

```bash
docker run -p 3000:3000 \
  -e SLACK_BOT_TOKEN=xoxb-your-bot-token \
  -e SLACK_SIGNING_SECRET=your-signing-secret \
  -e ANTHROPIC_API_KEY=sk-your-api-key \
  -e SLACK_APP_TOKEN=xapp-your-app-token \
  slack-agent
```

または、環境変数ファイルを使用：

```bash
docker run -p 3000:3000 --env-file .env slack-agent
```

## トラブルシューティング

### Slack接続の問題

1. **認証エラー**
   - Slack Bot TokenとSigning Secretが正しいか確認
   - アプリがワークスペースに正しくインストールされているか確認
   - 必要なスコープがすべて付与されているか確認

2. **イベント購読の問題**
   - イベントサブスクリプションが有効になっているか確認
   - ボットがチャンネルに招待されているか確認

### Claude CLIの問題

1. **認証エラー**
   - ANTHROPIC_API_KEYが正しく設定されているか確認
   - `claude auth status`コマンドで認証状態を確認

2. **実行エラー**
   - Claude CLIが正しくインストールされているか確認
   - 必要な依存関係がインストールされているか確認

### MCPサーバーの問題

1. **設定ファイルの問題**
   - YAMLファイルの構文が正しいか確認
   - GENERIC_AGENT_YAML環境変数が正しく設定されているか確認

2. **サーバー接続の問題**
   - サーバーのURLが正しいか確認
   - 必要な認証情報が設定されているか確認
