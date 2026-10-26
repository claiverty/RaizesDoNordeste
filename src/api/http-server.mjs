import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve, sep } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { AppError, badRequest } from '../domain/errors.mjs';
import { validateIdempotencyKey, validateOrderCommand } from '../domain/order-rules.mjs';
import { createOrderService } from '../application/order-service.mjs';
import { catalog as defaultCatalog } from '../infrastructure/catalog.mjs';
import { MemoryStore } from '../infrastructure/memory-store.mjs';
import { createLoyaltyMock, createPaymentMock } from '../infrastructure/mock-services.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = resolve(HERE, '..', '..', 'dist', 'client');
const MAX_BODY_BYTES = 32 * 1024;
const APP_ROUTES = new Set(['/', '/cardapio', '/checkout', '/comprovante']);

export function createRateLimiter({ limit = 60, windowMs = 60_000, maxClients = 10_000, now = Date.now } = {}) {
  const entries = new Map();
  let callsSinceSweep = 0;
  return {
    limit,
    consume(key) {
      const time = now();
      callsSinceSweep += 1;
      if (callsSinceSweep % 256 === 0) {
        for (const [clientKey, clientEntry] of entries) {
          if (clientEntry.expiresAt <= time) entries.delete(clientKey);
        }
      }
      let entry = entries.get(key);
      if (!entry || entry.expiresAt <= time) {
        if (!entry && entries.size >= maxClients) {
          return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)) };
        }
        entry = { count: 0, expiresAt: time + windowMs };
        entries.set(key, entry);
      }
      entry.count += 1;
      const allowed = entry.count <= limit;
      return {
        allowed,
        remaining: Math.max(0, limit - entry.count),
        retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt - time) / 1000)),
      };
    },
  };
}

export function createApiServer({
  catalog = defaultCatalog,
  store = new MemoryStore(),
  loyaltyService = createLoyaltyMock(),
  paymentService = createPaymentMock(),
  rateLimiter = createRateLimiter({
    limit: Number.parseInt(process.env.RATE_LIMIT_MAX ?? '60', 10),
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  }),
  now = () => new Date(),
  logger = (record) => console.log(JSON.stringify(record)),
} = {}) {
  const service = createOrderService({ catalog, store, loyaltyService, paymentService, now });

  const server = createServer(async (request, response) => {
    const startedAt = performance.now();
    const requestId = randomUUID();
    const method = request.method ?? 'GET';
    let pathname = '/';
    let status = 500;
    let errorCode;
    setSecurityHeaders(response, requestId);

    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      pathname = url.pathname;
      if (method === 'GET' && (APP_ROUTES.has(pathname) || pathname === '/styles.css' || pathname.startsWith('/assets/'))) {
        await sendWebAsset(response, APP_ROUTES.has(pathname) ? '/' : pathname);
        status = 200;
      } else if (pathname.startsWith('/api/v1/')) {
        const clientIp = request.socket.remoteAddress ?? 'unknown';
        if (pathname !== '/api/v1/health') {
          const rate = rateLimiter.consume(clientIp);
          response.setHeader('RateLimit-Limit', String(rateLimiter.limit));
          response.setHeader('RateLimit-Remaining', String(rate.remaining));
          if (!rate.allowed) {
            response.setHeader('Retry-After', String(rate.retryAfterSeconds));
            status = 429;
            errorCode = 'RATE_LIMITED';
            writeJson(response, status, { error: { code: 'RATE_LIMITED', message: 'Limite de requisições atingido. Aguarde antes de tentar novamente.', requestId } });
            return;
          }
        }

        if (method === 'GET' && pathname === '/api/v1/health') {
          status = 200;
          writeJson(response, status, { status: 'ok', service: 'raizes-do-nordeste-api' });
        } else if (method === 'GET' && pathname === '/api/v1/units') {
          status = 200;
          writeJson(response, status, { units: catalog.listUnits() });
        } else if (method === 'GET' && /^\/api\/v1\/units\/[^/]+\/menu$/.test(pathname)) {
          const unitId = decodeSegment(pathname.split('/')[4]);
          const unit = catalog.getUnit(unitId);
          if (!unit) throw new AppError(404, 'UNIT_NOT_FOUND', 'Unidade não encontrada.');
          if (!unit.active) throw new AppError(409, 'UNIT_UNAVAILABLE', 'Esta unidade está temporariamente indisponível para novos pedidos.');
          status = 200;
          writeJson(response, status, { unit: { id: unit.id, name: unit.name, channels: unit.channels }, items: catalog.getMenu(unitId) ?? [] });
        } else if (method === 'POST' && pathname === '/api/v1/orders/quote') {
          const input = await readJson(request);
          const command = validateOrderCommand(input);
          const quote = await service.quote(command);
          status = 200;
          writeJson(response, status, { quote });
        } else if (method === 'POST' && pathname === '/api/v1/orders') {
          const key = validateIdempotencyKey(request.headers['idempotency-key']);
          const input = await readJson(request);
          const command = validateOrderCommand(input, { requirePayment: true });
          const result = await service.createOrder(command, key);
          status = result.status;
          if (result.replayed) response.setHeader('Idempotency-Replayed', 'true');
          if (result.ok) writeJson(response, status, result.data);
          else {
            errorCode = result.error.code;
            writeJson(response, status, { error: { ...result.error, requestId } });
          }
        } else if (method === 'GET' && /^\/api\/v1\/orders\/[^/]+$/.test(pathname)) {
          const id = decodeSegment(pathname.split('/')[4]);
          const order = store.getOrder(id);
          if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
          const token = readBearerToken(request.headers.authorization);
          if (!constantTimeEqual(token, order.accessToken)) throw new AppError(401, 'ORDER_ACCESS_DENIED', 'Token de acesso do pedido inválido ou ausente.');
          status = 200;
          const { accessToken: _accessToken, expiresAt: _expiresAt, ...safeOrder } = order;
          writeJson(response, status, safeOrder);
        } else {
          status = 404;
          writeJson(response, status, { error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.', requestId } });
        }
      } else {
        status = 404;
        writeJson(response, status, { error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.', requestId } });
      }
    } catch (error) {
      const appError = error instanceof AppError
        ? error
        : new AppError(500, 'INTERNAL_ERROR', 'Não foi possível processar a solicitação.');
      status = appError.status;
      errorCode = appError.code;
      if (!response.headersSent) writeJson(response, status, { error: { code: appError.code, message: appError.message, requestId } });
    } finally {
      if (pathname.startsWith('/api/v1/') && pathname !== '/api/v1/health') {
        try {
          logger({
            event: 'http_request',
            requestId,
            method,
            route: normalizeRoute(pathname),
            status,
            ...(errorCode ? { errorCode } : {}),
            durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          });
        } catch {
          // Logging failure must not change the response already sent to the customer.
        }
      }
    }
  });
  server.once('close', () => store.dispose?.());
  return server;
}

function setSecurityHeaders(response, requestId) {
  response.setHeader('X-Request-Id', requestId);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'");
}

async function sendWebAsset(response, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : decodeSegment(pathname.slice(1));
  const filename = resolve(WEB_DIR, relativePath);
  if (!filename.startsWith(`${WEB_DIR}${sep}`)) throw new AppError(404, 'ASSET_NOT_FOUND', 'Recurso não encontrado.');

  let contents;
  try {
    contents = await readFile(filename);
  } catch (error) {
    if (error.code === 'ENOENT' && pathname === '/') {
      throw new AppError(503, 'WEB_BUILD_MISSING', 'A interface ainda não foi compilada. Execute npm run build.');
    }
    if (error.code === 'ENOENT') throw new AppError(404, 'ASSET_NOT_FOUND', 'Recurso não encontrado.');
    throw error;
  }

  const contentType = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  }[extname(filename)] ?? 'application/octet-stream';
  const cacheControl = pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
  response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': cacheControl });
  response.end(contents);
}

async function readJson(request) {
  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) throw new AppError(415, 'CONTENT_TYPE_UNSUPPORTED', 'Envie o corpo como application/json.');
  const declaredLength = Number(request.headers['content-length'] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    request.resume();
    throw new AppError(413, 'BODY_TOO_LARGE', 'O corpo da requisição excede o limite de 32 KB.');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new AppError(413, 'BODY_TOO_LARGE', 'O corpo da requisição excede o limite de 32 KB.');
    chunks.push(chunk);
  }
  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw badRequest('JSON_INVALID', 'O corpo da requisição não contém JSON válido.');
  }
  return parsed;
}

function decodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw badRequest('PATH_INVALID', 'O caminho da requisição é inválido.');
  }
}

function readBearerToken(value) {
  if (typeof value !== 'string') return '';
  const match = /^Bearer ([A-Za-z0-9-]{20,80})$/.exec(value);
  return match?.[1] ?? '';
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

function normalizeRoute(pathname) {
  return pathname
    .replace(/^\/api\/v1\/units\/[^/]+\/menu$/, '/api/v1/units/:unitId/menu')
    .replace(/^\/api\/v1\/orders\/[^/]+$/, '/api/v1/orders/:orderId');
}

function writeJson(response, status, value) {
  if (response.headersSent) return;
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}
