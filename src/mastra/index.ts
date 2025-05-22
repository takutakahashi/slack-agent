import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { autonomousWorkflow } from '../agents/workflow/autonomous';

export const mastra = new Mastra({
  workflows: { autonomousWorkflow },
  storage: new LibSQLStore({
    url: 'file:./mastra.db',
  }),
}); 