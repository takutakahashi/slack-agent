import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const child = spawn('bash', [path.join(__dirname, 'start_agent.sh')], {
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe']
});

child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`child process exited with code ${code}`);
    process.exit(code);
  }
}); 