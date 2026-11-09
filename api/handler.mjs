import { createApiServer } from '../src/api/http-server.mjs';
import { URL, URLSearchParams } from 'node:url';

// One function handles every API endpoint, keeping the prototype's in-memory
// order store shared for as long as this Vercel function instance is warm.
const apiServer = createApiServer({
  logger: process.env.LOG_HTTP === '0' ? () => {} : undefined,
});

export const config = {
  api: { bodyParser: false },
};

export default function handler(request, response) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const path = url.searchParams.get('path');

  if (!path) {
    response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: { code: 'PATH_REQUIRED', message: 'O caminho da API não foi informado.' } }));
    return;
  }

  const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  const originalUrl = request.url;
  const remainingQuery = new URLSearchParams(url.searchParams);
  remainingQuery.delete('path');
  request.url = `/api/v1/${encodedPath}${remainingQuery.size ? `?${remainingQuery}` : ''}`;

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      request.url = originalUrl;
    };
    const onFinish = () => {
      cleanup();
      response.removeListener('close', onClose);
      response.removeListener('error', onError);
      resolve();
    };
    const onClose = () => {
      cleanup();
      response.removeListener('finish', onFinish);
      response.removeListener('error', onError);
      resolve();
    };
    const onError = (error) => {
      cleanup();
      response.removeListener('finish', onFinish);
      response.removeListener('close', onClose);
      reject(error);
    };
    response.once('finish', onFinish);
    response.once('close', onClose);
    response.once('error', onError);
    apiServer.emit('request', request, response);
  });
}
