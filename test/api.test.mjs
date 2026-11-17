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

const managementKey = 'admin-catalog-test-key-000000000000000000';
function manage(app, path, method = 'GET', body, key = managementKey) {
  return fetch(`${app.baseUrl}/api/v1/admin${path}`, {
    method,
    headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const sampleProduct = { name: 'Bolo de mandioca', description: 'Fatia da casa.', priceCents: 850, category: 'Doces', available: true, imageKey: 'bolo-milho' };

test('cadastros exigem chave, gerenciam unidades e produtos e preservam pedidos antigos', async (t) => {
  const app = await startServer({ adminApiKey: managementKey });
  t.after(() => app.close());
  for (const [path, method, body] of [
    ['/catalog', 'GET'], ['/units', 'POST', { name: 'Loja proibida', city: 'Recife' }],
    ['/units/recife-centro', 'PATCH', { active: false }], ['/units/recife-centro', 'DELETE'],
    ['/units/recife-centro/products', 'POST', sampleProduct],
    ['/units/recife-centro/products/bolo-milho', 'DELETE'],
  ]) assert.equal((await manage(app, path, method, body, '')).status, 401);

  const created = await manage(app, '/units', 'POST', { name: 'Olinda Centro', city: 'Olinda', active: false });
  assert.equal(created.status, 201);
  const snapshot = await created.json();
  const unit = snapshot.units.find((entry) => entry.name === 'Olinda Centro');
  assert.equal(snapshot.persistence, 'memory');
  assert.equal(snapshot.productsByUnit[unit.id].length, 0);
  assert.equal((await manage(app, `/units/${unit.id}`, 'PATCH', { active: true })).status, 409);
  const productResponse = await manage(app, `/units/${unit.id}/products`, 'POST', sampleProduct);
  assert.equal(productResponse.status, 201);
  const product = (await productResponse.json()).productsByUnit[unit.id][0];
  assert.equal((await manage(app, `/units/${unit.id}`, 'PATCH', { active: true })).status, 200);
  const publicMenu = await (await fetch(`${app.baseUrl}/api/v1/units/${unit.id}/menu`)).json();
  assert.equal(publicMenu.items[0].category, 'Doces');
  assert.equal(publicMenu.items[0].priceCents, 850);

  const order = await postOrder(app, validBody({ unitId: unit.id, items: [{ productId: product.id, quantity: 1 }], expectedTotalCents: 850 }), 'catalog-order-original');
  assert.equal(order.status, 201);
  assert.equal((await order.json()).unitName, 'Olinda Centro');
  await manage(app, `/units/${unit.id}/products/${product.id}`, 'PATCH', { name: 'Nome novo', priceCents: 900, available: false });
  const unavailable = await postOrder(app, validBody({ unitId: unit.id, items: [{ productId: product.id, quantity: 1 }] }), 'catalog-unavailable-item');
  assert.equal((await unavailable.json()).error.code, 'PRODUCT_UNAVAILABLE');
  await manage(app, `/units/${unit.id}`, 'PATCH', { active: false, name: 'Nome novo da loja' });
  assert.equal((await fetch(`${app.baseUrl}/api/v1/units/${unit.id}/menu`)).status, 409);
  assert.equal((await manage(app, `/units/${unit.id}/products/${product.id}`, 'DELETE')).status, 200);
  assert.equal((await manage(app, `/units/${unit.id}`, 'DELETE')).status, 200);
  assert.equal((await manage(app, `/units/${unit.id}`, 'DELETE')).status, 404);
  const current = await (await manage(app, '/catalog')).json();
  assert.equal(current.units.some((entry) => entry.id === unit.id), false);
  assert.equal(Object.hasOwn(current.productsByUnit, unit.id), false);
  const { orders } = await (await manage(app, '/orders')).json();
  assert.equal(orders[0].unitName, 'Olinda Centro');
  assert.equal(orders[0].items[0].name, 'Bolo de mandioca');
  assert.equal(orders[0].totalCents, 850);
  const secondApp = await startServer({ adminApiKey: managementKey });
  t.after(() => secondApp.close());
  assert.equal((await (await manage(secondApp, '/catalog')).json()).units.length, 2);
  assert.ok(app.logs.every((entry) => !JSON.stringify(entry).includes(managementKey)));
});

test('cadastros rejeitam valores inválidos e métodos sem alterar o catálogo', async (t) => {
  const app = await startServer({ adminApiKey: managementKey });
  t.after(() => app.close());
  const productPath = '/units/recife-centro/products/bolo-milho';
  for (const value of [{ priceCents: -1 }, { priceCents: 1.5 }, { priceCents: 1_000_001 }, { category: 'Inválida' }, { available: 'true' }, { imageKey: 'https://example.com/image.jpg' }, { name: '<script>' }, { id: 'novo-id' }, {}]) {
    assert.equal((await manage(app, productPath, 'PATCH', value)).status, 400);
  }
  for (const value of [{ name: '' }, { active: null }, { city: 'x'.repeat(81) }, { channels: [] }, { channels: ['WEB', 'WEB'] }, { channels: ['EMAIL'] }]) {
    assert.equal((await manage(app, '/units/recife-centro', 'PATCH', value)).status, 400);
  }
  assert.equal((await manage(app, '/units', 'POST', { name: 'Aberta sem menu', city: 'Recife', active: true })).status, 409);
  assert.equal((await manage(app, '/units', 'POST', { name: 'Raízes do Nordeste — Recife Centro', city: 'Recife' })).status, 409);
  assert.equal((await manage(app, productPath, 'PUT', sampleProduct)).status, 405);
  assert.equal((await manage(app, '/units/inexistente/products', 'POST', sampleProduct)).status, 404);
  const menu = (await (await manage(app, '/catalog')).json()).productsByUnit['recife-centro'];
  assert.equal(menu.length, 24);
  assert.equal(menu.find((product) => product.id === 'bolo-milho').priceCents, 1250);
  const closed = await startServer({ adminApiKey: '' });
  t.after(() => closed.close());
  assert.equal((await manage(closed, '/catalog')).status, 503);
});

test('preço alterado exige nova revisão e unidade desativada bloqueia pedido antes do pagamento', async (t) => {
  const paymentService = createPaymentMock();
  const app = await startServer({ adminApiKey: managementKey, paymentService });
  t.after(() => app.close());
  await manage(app, '/units/recife-centro/products/bolo-milho', 'PATCH', { priceCents: 1400 });
  const stale = await postOrder(app, validBody({ expectedTotalCents: 2500 }), 'catalog-stale-price');
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).error.code, 'QUOTE_CHANGED');
  assert.equal(paymentService.calls, 0);
  const fresh = await postOrder(app, validBody({ expectedTotalCents: 2800 }), 'catalog-fresh-price');
  assert.equal(fresh.status, 201);
  assert.equal((await fresh.json()).totalCents, 2800);
  await manage(app, '/units/recife-centro', 'PATCH', { active: false });
  const blocked = await postOrder(app, validBody(), 'catalog-disabled-unit');
  assert.equal((await blocked.json()).error.code, 'UNIT_UNAVAILABLE');
  assert.equal(paymentService.calls, 1);
  for (const total of [-1, 0.5, '2800']) assert.equal((await postOrder(app, validBody({ expectedTotalCents: total }), 'catalog-total-invalid')).status, 400);
});

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

test('painel lista pedidos confirmados somente com chave e omite dados do cliente', async (t) => {
  const adminApiKey = 'admin-api-test-key-000000000000000000000000';
  const app = await startServer({ adminApiKey });
  t.after(() => app.close());
  const created = await postOrder(app, validBody({ customerName: 'Nome sintético' }));
  assert.equal(created.status, 201);

  const url = `${app.baseUrl}/api/v1/admin/orders`;
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { Authorization: 'Bearer chave-incorreta-000000000000000' } })).status, 401);

  const response = await fetch(url, { headers: { Authorization: `Bearer ${adminApiKey}` } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { orders } = await response.json();
  assert.equal(orders.length, 1);
  assert.equal(orders[0].orderNumber, 'RN-000001');
  assert.equal(orders[0].items[0].name, 'Bolo de milho');
  assert.equal('customerName' in orders[0], false);
  assert.equal('accessToken' in orders[0], false);
  assert.equal('id' in orders[0], false);
  assert.equal('expiresAt' in orders[0], false);
  assert.equal((await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${adminApiKey}` } })).status, 405);
});

test('painel não atende sem chave de administração configurada', async (t) => {
  const app = await startServer({ adminApiKey: '' });
  t.after(() => app.close());
  const response = await fetch(`${app.baseUrl}/api/v1/admin/orders`);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'ADMIN_NOT_CONFIGURED');
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
