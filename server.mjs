import { createApiServer } from './src/api/http-server.mjs';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '127.0.0.1';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser um inteiro entre 1 e 65535.');
}

const server = createApiServer({
  logger: process.env.LOG_HTTP === '0' ? () => {} : undefined,
});
server.listen(port, host, () => {
  console.log(JSON.stringify({ event: 'server_started', host, port }));
});

function shutdown(signal) {
  server.close((error) => {
    if (error) {
      console.error(JSON.stringify({ event: 'server_shutdown_error', signal }));
      process.exitCode = 1;
      return;
    }
    process.exitCode = 0;
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
