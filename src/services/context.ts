// src/services/context.ts
import { MessageContext, MessageRecord, SlackClientInterface } from '../types';
import SlackService from './slack';

/**
 * コンテキスト関連のサービス
 * 各種メッセージコンテキストの作成を担当
 */
export const ContextService = {
  /**
   * DMメッセージのコンテキストを作成
   */
  createImContext: async (
    client: SlackClientInterface,
    userId: string,
    channel: string,
    threadTs: string
  ): Promise<MessageContext> => {
    const previousMessages = await SlackService.getThreadMessages(client, channel, threadTs);
    const isFirstInteraction = SlackService.isFirstInteraction(userId);
    
    return {
      type: 'im',
      userId,
      threadTs,
      previousMessages,
      isFirstInteraction,
    };
  },

  /**
   * メンションのコンテキストを作成
   */
  createMentionContext: (
    channelId: string,
    userId: string,
    threadTs: string
  ): MessageContext => {
    return {
      type: 'mention',
      channelId,
      userId,
      threadTs,
    };
  },

  /**
   * スレッドメッセージのコンテキストを作成
   */
  createThreadContext: (
    channelId: string,
    userId: string,
    threadTs: string,
    previousMessages: MessageRecord[]
  ): MessageContext => {
    return {
      type: 'thread',
      channelId,
      userId,
      threadTs,
      previousMessages,
    };
  }
};

export default ContextService;