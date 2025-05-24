# ビルドステージ
FROM oven/bun:1.2.11 as builder

WORKDIR /app

# bunのバージョンを表示（デバッグ用）
RUN bun --version

# 依存関係のインストール
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# miseとNode.jsのインストール
RUN apt-get update && apt-get install -y curl ca-certificates

# ソースコードのコピーとビルド
COPY . .
# ビルド実行（詳細なデバッグ出力を有効化）
RUN echo "Running build with direct command..." && NODE_ENV=production bun build src/index.ts --outdir ./dist --target bun
# ビルド結果の確認
RUN ls -la ./dist

# claude-posts binary stage
FROM ghcr.io/takutakahashi/claude-posts:latest as claude-posts

# 実行ステージ
FROM oven/bun:1.2.11 as runner

WORKDIR /app

# 必要なファイルのみをコピー
COPY --from=builder /app/package.json /app/bun.lockb ./
COPY --from=builder /app/dist ./dist

# curlをインストール
RUN apt-get update && apt-get install -y curl ca-certificates

# Copy claude-posts binary
COPY --from=claude-posts /root/claude-posts /usr/local/bin/claude-posts
RUN chmod +x /usr/local/bin/claude-posts

# 実行時に必要な依存関係のみをインストール
RUN bun install --frozen-lockfile --production

# 非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 bunuser \
    && chown -R bunuser:nodejs /app \
    && chown -R bunuser:nodejs /home/bunuser/.local \
    && chown -R bunuser:nodejs /home/bunuser/.config

# 作成したユーザーに切り替え
USER bunuser

RUN curl https://mise.run | sh
ENV PATH="/home/bunuser/.local/bin:$PATH"
RUN mise use node@lts

# claude codeのインストール
RUN mise exec -- npm install -g @anthropic-ai/claude-code --force --no-os-check

# 環境変数の設定
ENV NODE_ENV production
ENV PATH="/home/bunuser/.local/bin:$PATH"

# アプリケーションの起動
CMD ["bun", "run", "dist/index.js"]

# ポートの公開
EXPOSE ${PORT:-3000}
