import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiPort = process.env.API_PORT ?? '3000';
const children = [
  spawn(process.execPath, [resolve(root, 'server.mjs')], {
    cwd: root,
    env: { ...process.env, HOST: '127.0.0.1', PORT: apiPort },
    stdio: 'inherit',
  }),
  spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), '--config', resolve(root, 'vite.config.mjs')], {
    cwd: root,
    env: { ...process.env, API_PORT: apiPort },
    stdio: 'inherit',
  }),
];

let shuttingDown = false;
let exitCode = 0;

function stop(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  exitCode = code;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
  }
  if (children.every((child) => child.exitCode !== null)) process.exitCode = exitCode;
}

for (const child of children) {
  child.once('error', (error) => {
    console.error(JSON.stringify({ event: 'dev_process_error', message: error.message }));
    stop(1);
  });
  child.once('exit', (code) => {
    if (!shuttingDown) stop(code ?? 1);
    if (shuttingDown && children.every((process) => process.exitCode !== null)) process.exitCode = exitCode;
  });
}

process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
