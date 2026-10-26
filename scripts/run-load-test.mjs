import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = await choosePort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(port),
    RATE_LIMIT_MAX: '1000000',
    RATE_LIMIT_WINDOW_MS: '60000',
    LOG_HTTP: '0',
  },
  stdio: ['ignore', 'ignore', 'inherit'],
});

try {
  await waitForServer(server, baseUrl);
  const args = process.argv.slice(2);
  const load = spawn(process.execPath, ['scripts/load-test.mjs', ...args, `--baseUrl=${baseUrl}`], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  const exitCode = await new Promise((resolveExit, reject) => {
    load.once('error', reject);
    load.once('exit', (code, signal) => {
      if (signal) reject(new Error(`Gerador de carga encerrado por ${signal}.`));
      else resolveExit(code ?? 1);
    });
  });
  process.exitCode = exitCode;
} finally {
  server.kill();
}

async function choosePort() {
  const probe = createNetServer();
  await new Promise((resolveListen, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolveListen);
  });
  const address = probe.address();
  await new Promise((resolveClose) => probe.close(resolveClose));
  return address.port;
}

async function waitForServer(child, url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Servidor de carga terminou com código ${child.exitCode}.`);
    try {
      const response = await fetch(`${url}/api/v1/health`);
      if (response.ok) return;
    } catch {
      // O servidor pode levar alguns milissegundos para abrir a porta.
    }
    await delay(100);
  }
  throw new Error('Tempo esgotado aguardando o servidor de carga local.');
}
