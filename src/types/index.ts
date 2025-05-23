// src/types/index.ts
import Bolt from '@slack/bolt';

/**
 * メッセージの記録を表す型
 */
export type MessageRecord = {
  user: string;
  text: string;
  ts: string;
};

/**
 * 会話履歴の型定義
 */
export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
};

/**
 * メッセージコンテキストの型定義
 * 各ハンドラタイプに対応する情報を含む
 */
export type MessageContext = {
  type: 'im' | 'mention' | 'thread';
  userId: string;
  threadTs: string;
  channelId?: string;
  previousMessages?: MessageRecord[];
  conversationHistory?: ConversationMessage[];
  isFirstInteraction?: boolean;
};

/**
 * SlackクライアントのインターフェースBolt
 * 必要なメソッドのみ定義
 */
export interface SlackClientInterface {
  conversations: {
    replies: (params: { channel: string; ts: string }) => Promise<any>;
  };
  // 必要に応じて他のメソッドも追加
}

/**
 * SlackのSay関数インターフェース
 */
export interface SlackSayInterface {
  (message: { text: string; thread_ts?: string }): Promise<any>;
}

/**
 * Boltアプリケーションのインスタンス型
 */
export type BoltApp = InstanceType<typeof Bolt.App>;