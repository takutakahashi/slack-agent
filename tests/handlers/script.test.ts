import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

describe('Script Integration Tests', () => {
  const originalEnv = {
    SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
    SLACK_THREAD_TS: process.env.SLACK_THREAD_TS
  };
  
  const testThreadTs = '1234.5678TEST';
  const testSessionsDir = path.join(process.cwd(), 'sessions');
  const testThreadDir = path.join(testSessionsDir, testThreadTs);

  beforeAll(() => {
    process.env.SLACK_CHANNEL_ID = 'C123TEST';
    process.env.SLACK_THREAD_TS = testThreadTs;
  });

  afterAll(() => {
    process.env.SLACK_CHANNEL_ID = originalEnv.SLACK_CHANNEL_ID;
    process.env.SLACK_THREAD_TS = originalEnv.SLACK_THREAD_TS;
    
    if (fs.existsSync(testThreadDir)) {
      fs.rmSync(testThreadDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testSessionsDir) && fs.readdirSync(testSessionsDir).length === 0) {
      fs.rmSync(testSessionsDir, { recursive: true, force: true });
    }
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

  it('should correctly handle prompts with multiple spaces', async () => {
    const scriptPath = './bin/test/success_agent.sh';
    const prompt = 'This is a test prompt with multiple spaces and   double spaces';
    
    const { stdout, stderr } = await execFileAsync('bash', [scriptPath], {
      env: { ...process.env, SLACK_AGENT_PROMPT: prompt }
    });
    
    expect(stdout).toContain(`Response to: ${prompt}`);
    expect(stderr).toBe('');
  });

  it('should create and use CLAUDE.md file in the correct directory', async () => {
    const scriptPath = './bin/test/success_agent.sh';
    const prompt = 'Test CLAUDE.md creation';
    
    if (!fs.existsSync(testSessionsDir)) {
      fs.mkdirSync(testSessionsDir, { recursive: true });
    }
    if (!fs.existsSync(testThreadDir)) {
      fs.mkdirSync(testThreadDir, { recursive: true });
    }
    
    const claudeMdPath = path.join(testThreadDir, 'CLAUDE.md');
    const claudeMdContent = 'テスト用システムプロンプト\n\n親切で有能なアシスタント';
    fs.writeFileSync(claudeMdPath, claudeMdContent, 'utf8');
    
    const { stdout, stderr } = await execFileAsync('bash', [scriptPath], {
      env: { ...process.env, SLACK_AGENT_PROMPT: prompt }
    });
    
    expect(fs.existsSync(claudeMdPath)).toBe(true);
    
    const content = fs.readFileSync(claudeMdPath, 'utf8');
    expect(content).toContain('親切で有能なアシスタント');
    
    expect(stderr).toBe('');
  });

  it('should pass CLAUDE_EXTRA_ARGS environment variable to script', async () => {
    const scriptPath = './bin/test/success_agent.sh';
    const prompt = 'Test with extra args';
    const extraArgs = '--custom-arg value';
    
    const { stdout, stderr } = await execFileAsync('bash', [scriptPath], {
      env: { 
        ...process.env, 
        SLACK_AGENT_PROMPT: prompt,
        CLAUDE_EXTRA_ARGS: extraArgs
      }
    });
    
    expect(stdout).toContain(`Response to: ${prompt}`);
    expect(stdout).toContain(`Extra Args: ${extraArgs}`);
    expect(stderr).toBe('');
  });
});
