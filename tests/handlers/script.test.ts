import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

describe('Script Integration Tests', () => {
  const originalEnv = {
    SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
    SLACK_THREAD_TS: process.env.SLACK_THREAD_TS
  };

  beforeAll(() => {
    process.env.SLACK_CHANNEL_ID = 'C123TEST';
    process.env.SLACK_THREAD_TS = '1234.5678TEST';
  });

  afterAll(() => {
    process.env.SLACK_CHANNEL_ID = originalEnv.SLACK_CHANNEL_ID;
    process.env.SLACK_THREAD_TS = originalEnv.SLACK_THREAD_TS;
  });

  it('should execute success script and return completed result', async () => {
    const scriptPath = './bin/test/success_agent.sh';
    const prompt = 'Test success message';
    
    const { stdout, stderr } = await execFileAsync('bash', [scriptPath], {
      env: { ...process.env, SLACK_AGENT_PROMPT: prompt }
    });
    
    expect(stdout).toContain(`Response to: ${prompt}`);
    expect(stdout).toContain('Channel: C123TEST');
    expect(stdout).toContain('Thread: 1234.5678TEST');
    expect(stdout).toContain('{"result": "completed"}');
    expect(stderr).toBe('');
  });

  it('should execute continue script and return continue result', async () => {
    const scriptPath = './bin/test/continue_agent.sh';
    const prompt = 'Test continue message';
    
    const { stdout, stderr } = await execFileAsync('bash', [scriptPath], {
      env: { ...process.env, SLACK_AGENT_PROMPT: prompt }
    });
    
    expect(stdout).toContain(`Continuing with: ${prompt}`);
    expect(stdout).toContain('More processing needed');
    expect(stdout).toContain('{"result": "continue"}');
    expect(stderr).toBe('');
  });

  it('should handle error script execution', async () => {
    const scriptPath = './bin/test/error_agent.sh';
    
    try {
      await execFileAsync('bash', [scriptPath], {
        env: process.env
      });
      expect(true).toBe(false);
    } catch (error) {
      expect(error.stderr).toContain('Error occurred');
      expect(error.code).not.toBe(0);
    }
  });
});
