import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const singleAgent = new Agent({
  name: "Slack汎用エージェント",
  instructions: `あなたはSlackの親切なアシスタントです。\n\n- 会話の文脈（DM/スレッド/メンション）を理解し、適切に応答してください\n- 初回DMは自己紹介を含めてください\n- スレッドでは履歴を考慮し、メンション時は丁寧な日本語で応答してください`,
  model: openai("gpt-4o-mini"),
  // tools: {} // 必要に応じてツールを追加
  generatePrompt: ({ messages, context }) => {
    // DM
    if (context?.type === 'im') {
      if (context?.isFirstInteraction) {
        return `初めてのダイレクトメッセージです。\nユーザーからのメッセージ: ${messages[messages.length-1]?.content}\n\n注意事項：\n- ユーザーIDは <@${context.userId}> です\n- これは1対1のプライベートな会話です\n- 丁寧で親しみやすい応答を心がけてください\n- 必要に応じて自己紹介を含めてください`;
      }
      const conversationHistory = context?.previousMessages?.map(
        (msg: any) => `${msg.user === context.userId ? "ユーザー" : "アシスタント"}: ${msg.text}`
      ).join("\n") || "";
      return `ダイレクトメッセージの会話履歴：\n${conversationHistory}\n\n最新のメッセージ：\n${messages[messages.length-1]?.content}\n\n注意事項：\n- ユーザーIDは <@${context.userId}> です\n- これは1対1のプライベートな会話です\n- 会話の文脈を考慮して応答してください\n- 親しみやすく、かつ専門的な支援ができるよう心がけてください${context?.threadTs ? '\n- これはスレッド内の会話です' : ''}`;
    }
    // スレッド
    if (context?.type === 'thread') {
      const conversationHistory = context?.previousMessages?.map(
        (msg: any) => `${msg.user === context.userId ? "ユーザー" : "アシスタント"}: ${msg.text}`
      ).join("\n") || "";
      return `スレッド内の会話履歴：\n${conversationHistory}\n\n最新のメッセージ：\n${messages[messages.length-1]?.content}\n\n注意事項：\n- ユーザーIDは <@${context.userId}> です\n- これはスレッド内の会話です\n- 会話の文脈を考慮して応答してください\n- 必要に応じて過去の発言を参照してください`;
    }
    // メンション
    if (context?.type === 'mention') {
      const lastMessage = messages[messages.length-1]?.content || "";
      const cleanMessage = lastMessage.replace(/<@[A-Z0-9]+>/g, '').trim();
      if (!cleanMessage) {
        return 'こんにちは！何かお手伝いできることはありますか？';
      }
      return `ユーザーからの質問：\n${cleanMessage}\n\n注意事項：\n- ユーザーIDは <@${context.userId}> です\n- 必要に応じて適切なツールを使用してください\n- 応答は日本語で、丁寧に行ってください`;
    }
    // fallback
    return messages[messages.length-1]?.content || '';
  },
}); 