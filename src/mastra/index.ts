import { Mastra } from '@mastra/core';
import { autonomousWorkflow } from '../agents/workflow/autonomous';

export const mastra = new Mastra({
  workflows: { autonomousWorkflow },
}); 