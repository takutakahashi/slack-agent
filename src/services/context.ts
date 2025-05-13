// src/services/context.ts
import type { MessageContext, SlackClientInterface } from '../types';
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
    threadTs: string,
    botUserId: string
  ): Promise<MessageContext> => {
    const previousMessages = await SlackService.getThreadMessages(client, channel, threadTs);
    const conversationHistory = await SlackService.getThreadMessagesWithRoles(client, channel, threadTs, botUserId);
    const isFirstInteraction = SlackService.isFirstInteraction(userId);
    
    return {
      type: 'im',
      userId,
      threadTs,
      previousMessages,
      conversationHistory,
      isFirstInteraction,
    };
  },

  /**
   * メンションのコンテキストを作成
   */
  createMentionContext: async (
    client: SlackClientInterface,
    channelId: string,
    userId: string,
    threadTs: string,
    botUserId: string
  ): Promise<MessageContext> => {
    const previousMessages = await SlackService.getThreadMessages(client, channelId, threadTs);
    const conversationHistory = await SlackService.getThreadMessagesWithRoles(client, channelId, threadTs, botUserId);
    
    return {
      type: 'mention',
      channelId,
      userId,
      threadTs,
      previousMessages,
      conversationHistory,
    };
  },

  /**
   * スレッドメッセージのコンテキストを作成
   */
  createThreadContext: async (
    client: SlackClientInterface,
    channelId: string,
    userId: string,
    threadTs: string,
    botUserId: string
  ): Promise<MessageContext> => {
    const previousMessages = await SlackService.getThreadMessages(client, channelId, threadTs);
    const conversationHistory = await SlackService.getThreadMessagesWithRoles(client, channelId, threadTs, botUserId);
    
    return {
      type: 'thread',
      channelId,
      userId,
      threadTs,
      previousMessages,
      conversationHistory,
    };
  }
};

export default ContextService;