# Slack Agent - Go Implementation

Cleanアーキテクチャーに従ったSlackボットのGo実装。

## アーキテクチャ

```
cmd/                    # メインアプリケーション
├── slack-agent/
internal/               # プライベートパッケージ
├── domain/            # ドメインエンティティ
├── usecase/           # ビジネスロジック
├── infrastructure/    # 外部システム連携（Slack, Agent）
├── interface/         # CLI（cobra）
└── mocks/            # テスト用モック
pkg/                   # パブリックパッケージ
└── config/           # 設定管理（viper）
```

## 特徴

- **Clean Architecture**: ドメイン駆動設計とクリーンアーキテクチャの原則に従った構造
- **CLI Framework**: CobraとViperを使用したCLI
- **Test Coverage**: 包括的なテストスイートとモックを使用した統合テスト
- **Socket Mode**: SlackのSocket Mode APIをサポート
- **Agent Integration**: AIエージェントとの統合

## 構成要素

### Domain Layer
- `Bot`: Slackボットエンティティ
- `Message`: メッセージエンティティ  
- `AgentResult`: AI agent結果

### Use Case Layer
- `MessageHandler`: メッセージ処理のビジネスロジック
- Repository interfaces

### Infrastructure Layer
- `SlackRepository`: Slack API連携
- `AgentRepository`: AIエージェント実行

### Interface Layer
- CLI commands with Cobra

## ビルドと実行

```bash
# 依存関係のインストール
go mod download

# テスト実行
make test

# ビルド
make build

# 実行
./bin/slack-agent start
```

## 設定

環境変数またはYAML設定ファイルで設定:

```bash
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_APP_TOKEN="xapp-..."
export AI_AGENT_SCRIPT_PATH="/path/to/script.sh"
```

## テスト

```bash
# 全テスト実行
make test

# カバレッジ表示
make coverage

# モック生成
make mock
```

## 開発

- Go 1.23+
- Clean Architecture principles
- Comprehensive test suite with 80%+ coverage
- Mock-based testing for external dependencies