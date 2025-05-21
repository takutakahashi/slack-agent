// =============================
// mastra dev エントリーポイント指定方法
//
// 例: プロジェクトルートで以下のコマンドを実行
//
//   npx mastra dev src/agents/workflow/dev.ts
//
// または package.json の scripts に
//   "dev": "mastra dev src/agents/workflow/dev.ts"
// などを追加して
//   npm run dev
// で起動できます。
//
// このファイルが export const mastra = ... を提供することで
// APIエンドポイントやPlaygroundが有効化されます。
// =============================

import { createAutonomousWorkflowWithTools } from './autonomous';

// mastra dev で自動検出されるように、同期的にexportする
// ただし、toolsets取得は非同期なので、即時関数で初期化

let mastraInstance: any = null;
let error: any = null;

(async () => {
  try {
    const { mastra } = await createAutonomousWorkflowWithTools();
    mastraInstance = mastra;
  } catch (e) {
    error = e;
    console.error('mastra初期化エラー:', e);
  }
})();

export const mastra = new Proxy({}, {
  get(_target, prop) {
    if (error) throw error;
    if (!mastraInstance) throw new Error('mastra初期化中です。しばらくしてから再度お試しください。');
    return (mastraInstance as any)[prop];
  }
}); 