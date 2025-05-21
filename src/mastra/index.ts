import { createAutonomousWorkflowWithTools } from '../agents/workflow/autonomous';

let mastraInstance: any = null;
let error: any = null;
let initialized = false;

const init = async () => {
  try {
    const { mastra } = await createAutonomousWorkflowWithTools();
    mastraInstance = mastra;
    initialized = true;
  } catch (e) {
    error = e;
    console.error('mastra初期化エラー:', e);
    throw e;
  }
};

// 初期化を開始
init();

export const mastra = new Proxy({}, {
  get(_target, prop) {
    if (error) throw error;
    if (!initialized) {
      throw new Error('mastra初期化中です。しばらくしてから再度お試しください。');
    }
    return (mastraInstance as any)[prop];
  }
}); 