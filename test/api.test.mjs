import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../src/api/http-server.mjs';
import { MemoryStore } from '../src/infrastructure/memory-store.mjs';
import { createLoyaltyMock, createPaymentMock } from '../src/infrastructure/mock-services.mjs';

async function startServer(options = {}) {
  const logs = [];
  const server = createApiServer({
    store: new MemoryStore(),
    loyaltyService: createLoyaltyMock(),
    paymentService: createPaymentMock(),
    logger: (record) => logs.push(record),
    ...options,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    server,
    logs,
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      if (!server.listening) return;
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

function validBody(overrides = {}) {
  return {
    unitId: 'recife-centro', channel: 'WEB', fulfillment: 'PICKUP',
    items: [{ productId: 'bolo-milho', quantity: 2 }],
    payment: { method: 'PIX', outcome: 'APPROVED' },
    ...overrides,
  };
}

async function postOrder(app, body = validBody(), key = 'api-key-0001') {
  return fetch(`${app.baseUrl}/api/v1/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(body),
  });
}

test('health, catálogo e cabeçalhos básicos são servidos', async (t) => {
  const app = await startServer();
  t.after(() => app.close());
  const health = await fetch(`${app.baseUrl}/api/v1/health`);
  assert.equal(health.status, 200);
  assert.ok(health.headers.get('x-request-id'));
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  const units = await (await fetch(`${app.baseUrl}/api/v1/units`)).json();
  assert.equal(units.units.length, 2);
  const menu = await (await fetch(`${app.baseUrl}/api/v1/units/recife-centro/menu`)).json();
  assert.ok(menu.items.some((item) => item.id === 'bolo-milho'));
  assert.equal((await fetch(`${app.baseUrl}/api/v1/units/natal-norte/menu`)).status, 409);
});

test('prévia e pedido aprovado usam preço calculado no servidor', async (t) => {
  const paymentService = createPaymentMock();
  const store = new MemoryStore();
  const app = await startServer({ paymentService, store });
  t.after(() => app.close());
  const quote = await fetch(`${app.baseUrl}/api/v1/orders/quote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unitId: 'recife-centro', channel: 'WEB', fulfillment: 'PICKUP', items: [{ productId: 'bolo-milho', quantity: 2 }], couponCode: 'BOASVINDAS10' }),
  });
  assert.equal(quote.status, 200);
  const quoteBody = await quote.json();
  assert.equal(quoteBody.quote.totalCents, 2250);
  assert.equal(paymentService.calls, 0);
  assert.equal(store.countOrders(), 0);
  const createdResponse = await postOrder(app, validBody({ priceCents: 1, totalCents: 1 }));
  assert.equal(createdResponse.status, 400);
  const created = await postOrder(app);
  const order = await created.json();
  assert.equal(created.status, 201);
  assert.equal(order.subtotalCents, 2500);
  assert.equal(order.totalCents, 2500);
  assert.equal(order.status, 'CONFIRMED');
  assert.equal(order.orderNumber, 'RN-000001');
  assert.ok(order.accessToken);
});

test('rejeita carrinho vazio, unidade indisponível e cupom inválido sem pagamento', async (t) => {
  const paymentService = createPaymentMock();
  const app = await startServer({ paymentService });
  t.after(() => app.close());
  for (const [body, expected] of [
    [validBody({ items: [] }), 'CART_EMPTY'],
    [validBody({ unitId: 'natal-norte' }), 'UNIT_UNAVAILABLE'],
    [validBody({ couponCode: 'NAOEXISTE' }), 'COUPON_INVALID'],
    [validBody({ items: [{ productId: 'cuscuz-sertao', quantity: 1 }] }), 'PRODUCT_UNAVAILABLE'],
  ]) {
    const response = await postOrder(app, body, `negative-key-${expected}`);
    const payload = await response.json();
    assert.equal(payload.error.code, expected);
  }
  assert.equal(paymentService.calls, 0);
});

test('recusa, timeout e falha de fidelidade não confirmam pedido', async (t) => {
  const store = new MemoryStore();
  const paymentService = createPaymentMock();
  const app = await startServer({ store, paymentService, loyaltyService: createLoyaltyMock({ available: false }) });
  t.after(() => app.close());
  const declined = await postOrder(app, validBody({ payment: { method: 'PIX', outcome: 'DECLINED' } }), 'declined-key-0001');
  assert.equal((await declined.json()).error.code, 'PAYMENT_DECLINED');
  const timeout = await postOrder(app, validBody({ payment: { method: 'PIX', outcome: 'TIMEOUT' } }), 'timeout-key-0001');
  assert.equal(timeout.status, 504);
  assert.equal((await timeout.json()).error.code, 'PAYMENT_TIMEOUT');
  const loyalty = await postOrder(app, validBody({ useLoyalty: true }), 'loyalty-key-0001');
  assert.equal((await loyalty.json()).error.code, 'LOYALTY_UNAVAILABLE');
  assert.equal(store.countOrders(), 0);
});

test('indisponibilidade de pagamento e exceção interna não vazam detalhes nem criam pedido', async (t) => {
  const store = new MemoryStore();
  const app = await startServer({ store, paymentService: createPaymentMock({ available: false }) });
  t.after(() => app.close());
  const unavailable = await postOrder(app, validBody(), 'payment-unavailable-001');
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error.code, 'PAYMENT_UNAVAILABLE');
  assert.equal(store.countOrders(), 0);

  const internalApp = await startServer({ paymentService: { async authorize() { throw new Error('segredo interno de integração'); } } });
  t.after(() => internalApp.close());
  const internal = await postOrder(internalApp, validBody(), 'payment-internal-0001');
  const payload = await internal.json();
  assert.equal(internal.status, 500);
  assert.equal(payload.error.code, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(payload).includes('segredo interno'), false);
});

test('repetição com mesma chave reusa resposta; payload alterado dá conflito', async (t) => {
  const paymentService = createPaymentMock();
  const app = await startServer({ paymentService });
  t.after(() => app.close());
  const firstResponse = await postOrder(app);
  const first = await firstResponse.json();
  const replayResponse = await postOrder(app);
  const replay = await replayResponse.json();
  assert.equal(replayResponse.headers.get('idempotency-replayed'), 'true');
  assert.equal(replay.id, first.id);
  assert.equal(paymentService.calls, 1);
  const changed = await postOrder(app, validBody({ items: [{ productId: 'bolo-milho', quantity: 3 }] }));
  assert.equal(changed.status, 409);
  assert.equal((await changed.json()).error.code, 'IDEMPOTENCY_CONFLICT');
});

test('preços permanecem consistentes nos canais suportados', async (t) => {
  const app = await startServer();
  t.after(() => app.close());
  const channels = ['APP', 'WEB', 'TOTEM', 'BALCAO', 'PICKUP'];
  const orderNumbers = [];
  for (const channel of channels) {
    const response = await postOrder(app, validBody({ channel }), `channel-key-${channel.toLowerCase()}`);
    const order = await response.json();
    assert.equal(response.status, 201);
    assert.equal(order.channel, channel);
    assert.equal(order.totalCents, 2500);
    orderNumbers.push(order.orderNumber);
  }
  assert.equal(new Set(orderNumbers).size, channels.length);
});

test('reiniciar a aplicação perde pedidos, conforme limite do store em memória', async (t) => {
  const firstApp = await startServer();
  t.after(() => firstApp.close());
  const order = await (await postOrder(firstApp)).json();
  await firstApp.close();

  const restartedApp = await startServer();
  t.after(() => restartedApp.close());
  const lookup = await fetch(`${restartedApp.baseUrl}/api/v1/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${order.accessToken}` },
  });
  assert.equal(lookup.status, 404);
  assert.equal((await lookup.json()).error.code, 'ORDER_NOT_FOUND');
});

test('consulta exige token e não devolve o token na resposta de leitura', async (t) => {
  const app = await startServer();
  t.after(() => app.close());
  const created = await (await postOrder(app)).json();
  const url = `${app.baseUrl}/api/v1/orders/${created.id}`;
  assert.equal((await fetch(url)).status, 401);
  const denied = await fetch(url, { headers: { Authorization: 'Bearer token-incorreto-longo-00000000' } });
  assert.equal(denied.status, 401);
  const allowed = await fetch(url, { headers: { Authorization: `Bearer ${created.accessToken}` } });
  const order = await allowed.json();
  assert.equal(allowed.status, 200);
  assert.equal(order.orderNumber, created.orderNumber);
  assert.equal('accessToken' in order, false);
});

test('valida JSON, tipo de conteúdo, chave e tamanho máximo do corpo', async (t) => {
  const app = await startServer();
  t.after(() => app.close());
  const base = `${app.baseUrl}/api/v1/orders`;
  const invalidJson = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'json-key-001' }, body: '{' });
  assert.equal((await invalidJson.json()).error.code, 'JSON_INVALID');
  const wrongType = await fetch(base, { method: 'POST', headers: { 'Idempotency-Key': 'type-key-001' }, body: '{}' });
  assert.equal(wrongType.status, 415);
  const missingKey = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal((await missingKey.json()).error.code, 'IDEMPOTENCY_KEY_INVALID');
  const oversized = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'large-key-001' }, body: JSON.stringify({ data: 'x'.repeat(33_000) }) });
  assert.equal(oversized.status, 413);
});

test('rate limit padrão retorna 429 após 60 requests e logs não guardam o corpo', async (t) => {
  const app = await startServer();
  t.after(() => app.close());
  let response;
  for (let requestNumber = 0; requestNumber < 60; requestNumber += 1) {
    response = await fetch(`${app.baseUrl}/api/v1/units`);
    assert.equal(response.status, 200);
  }
  const limited = await fetch(`${app.baseUrl}/api/v1/units`);
  assert.equal(limited.status, 429);
  assert.ok(limited.headers.get('retry-after'));
  assert.equal(limited.headers.get('ratelimit-limit'), '60');

  const logs = [];
  const logApp = await startServer({ logger: (entry) => logs.push(entry) });
  t.after(() => logApp.close());
  await postOrder(logApp, validBody({ customerName: 'Pessoa Teste' }), 'log-key-person-0001');
  assert.ok(logs.every((entry) => !('body' in entry) && !('authorization' in entry)));
  assert.ok(logs.every((entry) => entry.requestId && typeof entry.durationMs === 'number'));
  assert.ok(logs.every((entry) => !JSON.stringify(entry).includes('Pessoa Teste')));
});
