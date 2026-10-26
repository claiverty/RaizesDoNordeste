import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/infrastructure/catalog.mjs';
import { MemoryStore } from '../src/infrastructure/memory-store.mjs';
import { createLoyaltyMock, createPaymentMock } from '../src/infrastructure/mock-services.mjs';
import { createOrderService } from '../src/application/order-service.mjs';
import { validateOrderCommand, calculateQuote } from '../src/domain/order-rules.mjs';

function quoteCommand(overrides = {}) {
  return validateOrderCommand({
    unitId: 'recife-centro', channel: 'WEB', fulfillment: 'PICKUP',
    items: [{ productId: 'bolo-milho', quantity: 2 }],
    ...overrides,
  });
}

test('calcula subtotal em centavos com preço do catálogo', async () => {
  const quote = await calculateQuote(quoteCommand(), { catalog, loyaltyService: createLoyaltyMock() });
  assert.equal(quote.subtotalCents, 2500);
  assert.equal(quote.totalCents, 2500);
  assert.equal(quote.lines[0].unitPriceCents, 1250);
});

test('aplica cupom de 10% e fidelidade sem ultrapassar subtotal', async () => {
  const command = quoteCommand({ couponCode: 'BOASVINDAS10', useLoyalty: true });
  const quote = await calculateQuote(command, { catalog, loyaltyService: createLoyaltyMock() });
  assert.equal(quote.subtotalCents, 2500);
  assert.equal(quote.discountCents, 550);
  assert.equal(quote.totalCents, 1950);
  assert.equal(quote.pointsRedeemed, 500);
});

test('rejeita unidade indisponível', async () => {
  await assert.rejects(
    calculateQuote(quoteCommand({ unitId: 'natal-norte' }), { catalog, loyaltyService: createLoyaltyMock() }),
    (error) => error.code === 'UNIT_UNAVAILABLE' && error.status === 409,
  );
});

test('rejeita produto indisponível e produto de outro cardápio', async () => {
  await assert.rejects(
    calculateQuote(quoteCommand({ items: [{ productId: 'cuscuz-sertao', quantity: 1 }] }), { catalog, loyaltyService: createLoyaltyMock() }),
    (error) => error.code === 'PRODUCT_UNAVAILABLE',
  );
  await assert.rejects(
    calculateQuote(quoteCommand({ items: [{ productId: 'produto-inexistente', quantity: 1 }] }), { catalog, loyaltyService: createLoyaltyMock() }),
    (error) => error.code === 'PRODUCT_NOT_FOUND',
  );
});

test('distingue cupom expirado e inválido', async () => {
  await assert.rejects(calculateQuote(quoteCommand({ couponCode: 'VENCIDO' }), { catalog, loyaltyService: createLoyaltyMock() }), (error) => error.code === 'COUPON_EXPIRED');
  await assert.rejects(calculateQuote(quoteCommand({ couponCode: 'OUTRO' }), { catalog, loyaltyService: createLoyaltyMock() }), (error) => error.code === 'COUPON_INVALID');
});

test('falha de fidelidade não retorna desconto', async () => {
  await assert.rejects(
    calculateQuote(quoteCommand({ useLoyalty: true }), { catalog, loyaltyService: createLoyaltyMock({ available: false }) }),
    (error) => error.code === 'LOYALTY_UNAVAILABLE' && error.status === 503,
  );
});

test('valida carrinho, quantidade, duplicidade e campos proibidos', () => {
  assert.throws(() => validateOrderCommand({ unitId: 'recife-centro', channel: 'WEB', fulfillment: 'PICKUP', items: [] }), (error) => error.code === 'CART_EMPTY');
  assert.throws(() => quoteCommand({ items: [{ productId: 'bolo-milho', quantity: 0 }] }), (error) => error.code === 'QUANTITY_INVALID');
  assert.throws(() => quoteCommand({ items: [{ productId: 'bolo-milho', quantity: 1 }, { productId: 'bolo-milho', quantity: 1 }] }), (error) => error.code === 'ITEM_DUPLICATED');
  assert.throws(() => quoteCommand({ customerName: 'Ana', cpf: '123' }), (error) => error.code === 'INVALID_FIELD');
  assert.throws(() => quoteCommand({ channel: 'DESCONHECIDO' }), (error) => error.code === 'CHANNEL_INVALID');
  assert.throws(() => quoteCommand({ customerName: 'Ana 123' }), (error) => error.code === 'CUSTOMER_NAME_INVALID');
});

test('valida dados de pagamento e não aceita cartão real', () => {
  const valid = {
    unitId: 'recife-centro', channel: 'WEB', fulfillment: 'PICKUP',
    items: [{ productId: 'bolo-milho', quantity: 1 }],
    payment: { method: 'PIX', outcome: 'APPROVED' },
  };
  assert.equal(validateOrderCommand(valid, { requirePayment: true }).payment.outcome, 'APPROVED');
  assert.throws(() => validateOrderCommand({ ...valid, payment: { method: 'PIX', outcome: 'APPROVED', cardNumber: '4111111111111111' } }, { requirePayment: true }), (error) => error.code === 'PAYMENT_FIELD_INVALID');
  assert.throws(() => validateOrderCommand({ ...valid, payment: { method: 'PIX', outcome: 'UNKNOWN' } }, { requirePayment: true }), (error) => error.code === 'PAYMENT_OUTCOME_INVALID');
});

test('idempotência não cria duplicidade e rejeita chave reutilizada com payload diferente', async () => {
  const store = new MemoryStore();
  const paymentService = createPaymentMock({ delayMs: 25 });
  const service = createOrderService({ catalog, store, loyaltyService: createLoyaltyMock(), paymentService });
  const command = validateOrderCommand({
    unitId: 'recife-centro', channel: 'APP', fulfillment: 'PICKUP',
    items: [{ productId: 'bolo-milho', quantity: 1 }], payment: { method: 'PIX', outcome: 'APPROVED' },
  }, { requirePayment: true });
  const firstPromise = service.createOrder(command, 'key-concorrente-001');
  const concurrent = await Promise.all(Array.from({ length: 99 }, () => service.createOrder(command, 'key-concorrente-001')));
  assert.ok(concurrent.every((result) => result.error.code === 'REQUEST_IN_PROGRESS'));
  const first = await firstPromise;
  const replayResults = await Promise.all(Array.from({ length: 99 }, () => service.createOrder(command, 'key-concorrente-001')));
  const replay = replayResults[0];
  assert.equal(first.status, 201);
  assert.equal(replay.replayed, true);
  assert.ok(replayResults.every((result) => result.replayed && result.data.id === first.data.id));
  assert.equal(replay.data.id, first.data.id);
  assert.equal(store.countOrders(), 1);
  assert.equal(paymentService.calls, 1);
  const changed = { ...command, items: [{ productId: 'bolo-milho', quantity: 2 }] };
  assert.equal((await service.createOrder(changed, 'key-concorrente-001')).error.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(store.countOrders(), 1);
});

test('recusa e timeout são idempotentes e não criam pedido', async () => {
  const store = new MemoryStore();
  const paymentService = createPaymentMock();
  const service = createOrderService({ catalog, store, loyaltyService: createLoyaltyMock(), paymentService });
  for (const outcome of ['DECLINED', 'TIMEOUT']) {
    const command = validateOrderCommand({
      unitId: 'recife-centro', channel: 'WEB', fulfillment: 'PICKUP',
      items: [{ productId: 'bolo-milho', quantity: 1 }], payment: { method: 'PIX', outcome },
    }, { requirePayment: true });
    const key = `key-falha-${outcome.toLowerCase()}`;
    const result = await service.createOrder(command, key);
    const replay = await service.createOrder(command, key);
    assert.equal(result.ok, false);
    assert.equal(replay.replayed, true);
  }
  assert.equal(store.countOrders(), 0);
  assert.equal(paymentService.calls, 2);
});

test('store remove registros expirados e devolve cópia defensiva', () => {
  let now = 1000;
  const store = new MemoryStore({ now: () => now });
  const order = store.createOrder({ id: 'pedido-1', status: 'CONFIRMED' });
  store.reserveIdempotency('key-expiracao-001', 'fingerprint');
  order.status = 'ALTERADO';
  assert.equal(store.getOrder('pedido-1').status, 'CONFIRMED');
  now += 24 * 60 * 60 * 1000 + 1;
  assert.equal(store.getOrder('pedido-1'), null);
  assert.equal(store.countOrders(), 0);
  assert.equal(store.getIdempotency('key-expiracao-001'), null);
  store.dispose();
});
