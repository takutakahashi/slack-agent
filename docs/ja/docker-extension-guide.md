# Slack Agent Docker拡張ガイド

このガイドでは、Slack AgentのDockerイメージを拡張して、追加のMCPサーバーを統合する方法について説明します。

## 目次

1. [概要](#概要)
2. [基本的な拡張方法](#基本的な拡張方法)
3. [MCPサーバーの追加](#mcpサーバーの追加)
4. [カスタムプロンプトの設定](#カスタムプロンプトの設定)
5. [拡張Dockerfileの例](#拡張dockerfileの例)
6. [ベストプラクティス](#ベストプラクティス)

## 概要

Slack AgentのDockerイメージは、追加のMCPサーバーやカスタム設定で拡張できるように設計されています。これにより、基本的なSlack Agentの機能を保持しながら、特定のユースケースに合わせたカスタマイズが可能になります。

## 基本的な拡張方法

Slack Agentイメージを拡張するには、以下の基本的なアプローチを使用します：

1. 公式イメージをベースイメージとして使用
2. 追加のツールやライブラリをインストール
3. MCPサーバー設定を追加
4. カスタムプロンプトやシステム設定を追加

基本的なDockerfile構造：

```dockerfile
# ベースイメージとして公式Slack Agentイメージを使用
FROM ghcr.io/takutakahashi/slack-agent:latest

# 追加のツールやライブラリをインストール
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリを設定
WORKDIR /app

# カスタム設定ファイルをコピー
COPY config/custom-prompt.txt /app/config/
COPY config/agent-config.yaml /app/config/

# 環境変数を設定
ENV SYSTEM_PROMPT_PATH=/app/config/custom-prompt.txt
ENV GENERIC_AGENT_YAML=/app/config/agent-config.yaml

# コンテナ起動時にMCPサーバーを追加するスクリプトを実行
COPY scripts/setup.sh /app/scripts/
RUN chmod +x /app/scripts/setup.sh
ENTRYPOINT ["/app/scripts/setup.sh"]
```

## MCPサーバーの追加

MCPサーバーを追加するには、主に2つの方法があります：

### 1. YAML設定ファイルを使用

`agent-config.yaml`ファイルを作成し、MCPサーバー設定を定義します：

```yaml
# エージェントの設定
name: "カスタムアシスタント"
instructions: |
  あなたはカスタマイズされたアシスタントです。
  特定の業務知識を持ち、専門的な質問に答えることができます。
model: "gpt-4o"

# MCPサーバー設定
mcp_servers:
  # データベースクエリツール
  database:
    command: node
    args:
      - /app/tools/database-query.js
    env:
      DB_HOST: localhost
      DB_USER: user
      DB_PASS: password
      DB_NAME: mydb

  # 外部APIサービス
  externalApi:
    url: http://api-service:8080/api
```

このYAMLファイルをコンテナにコピーし、`GENERIC_AGENT_YAML`環境変数で指定します。

### 2. 起動時にMCPサーバーを追加

コンテナ起動時に`add_mcp_servers.sh`スクリプトを使用して動的にMCPサーバーを追加できます。これは、環境変数から設定を取得する場合や、動的に設定を生成する場合に便利です。

例えば、以下のようなスクリプトを作成します：

```bash
#!/bin/bash
# setup.sh

# データベースMCPサーバーを追加
/usr/local/bin/add_mcp_servers.sh "database" '{
  "command": "node",
  "args": ["/app/tools/database-query.js"],
  "env": {
    "DB_HOST": "'${DB_HOST}'",
    "DB_USER": "'${DB_USER}'",
    "DB_PASS": "'${DB_PASS}'",
    "DB_NAME": "'${DB_NAME}'"
  }
}'

# 外部APIサーバーを追加
/usr/local/bin/add_mcp_servers.sh "externalApi" '{
  "url": "'${API_URL}'"
}'

# 元のエントリポイントを実行
exec bun run dist/index.js
```

## カスタムプロンプトの設定

カスタムシステムプロンプトを設定するには、プロンプトファイルを作成し、コンテナにコピーします：

```
あなたは特定の業界向けにカスタマイズされたアシスタントです。
以下の点に注意して応答してください：

1. 業界固有の専門用語を適切に使用する
2. 規制やコンプライアンスに関する情報を正確に提供する
3. 最新の業界トレンドを考慮した回答をする
```

このファイルをコンテナにコピーし、`SYSTEM_PROMPT_PATH`環境変数で指定します。

## 拡張Dockerfileの例

以下は、データベース接続とAPIアクセス機能を持つカスタムSlack Agentを作成する完全なDockerfileの例です：

```dockerfile
FROM ghcr.io/takutakahashi/slack-agent:latest

# 必要なツールをインストール
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Node.jsツールをインストール
RUN mise exec -- npm install -g \
    pg \
    axios \
    dotenv

# 作業ディレクトリを設定
WORKDIR /app

# カスタムツールをコピー
COPY tools/database-query.js /app/tools/
COPY tools/api-client.js /app/tools/

# カスタム設定ファイルをコピー
COPY config/custom-prompt.txt /app/config/
COPY config/agent-config.yaml /app/config/

# 起動スクリプトをコピー
COPY scripts/setup.sh /app/scripts/
RUN chmod +x /app/scripts/setup.sh

# 環境変数を設定
ENV SYSTEM_PROMPT_PATH=/app/config/custom-prompt.txt
ENV GENERIC_AGENT_YAML=/app/config/agent-config.yaml

# コンテナ起動時にスクリプトを実行
ENTRYPOINT ["/app/scripts/setup.sh"]
```

## ベストプラクティス

### セキュリティ

1. **機密情報の管理**
   - APIキーやパスワードなどの機密情報は環境変数として渡し、Dockerfileに直接記述しない
   - 可能であれば、Docker Secretsやボリュームマウントを使用して機密情報を管理

2. **最小権限の原則**
   - コンテナに必要最小限の権限のみを付与
   - 可能な限り非rootユーザーでコンテナを実行

### パフォーマンス

1. **イメージサイズの最適化**
   - 不要なパッケージやファイルをインストールしない
   - マルチステージビルドを活用して最終イメージのサイズを削減

2. **キャッシュの活用**
   - 頻繁に変更されないレイヤーを先に配置し、Dockerのビルドキャッシュを効果的に活用

### メンテナンス性

1. **ドキュメント化**
   - カスタムMCPサーバーの機能と使用方法を文書化
   - 必要な環境変数とその目的を明記

2. **バージョン管理**
   - 特定のバージョンのSlack Agentイメージをベースにする（`latest`タグの使用を避ける）
   - カスタムイメージにも適切なバージョンタグを付ける
