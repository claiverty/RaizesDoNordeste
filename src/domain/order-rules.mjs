import { AppError, badRequest } from './errors.mjs';

const CHANNELS = new Set(['APP', 'WEB', 'TOTEM', 'BALCAO', 'PICKUP']);
const FULFILLMENTS = new Set(['PICKUP', 'DINE_IN']);
const METHODS = new Set(['PIX', 'CARD']);
const OUTCOMES = new Set(['APPROVED', 'DECLINED', 'TIMEOUT']);

export function validateOrderCommand(input, { requirePayment = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('INVALID_REQUEST', 'O corpo da requisição deve ser um objeto JSON.');
  }
  const allowed = new Set(['unitId', 'channel', 'fulfillment', 'items', 'couponCode', 'useLoyalty', 'customerName', 'payment']);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw badRequest('INVALID_FIELD', 'A requisição contém um campo não permitido.');
  }
  const unitId = stringField(input.unitId, 'unitId', 1, 64);
  const channel = stringField(input.channel, 'channel', 1, 16).toUpperCase();
  const fulfillment = stringField(input.fulfillment, 'fulfillment', 1, 16).toUpperCase();
  if (!CHANNELS.has(channel)) throw badRequest('CHANNEL_INVALID', 'Canal de origem inválido.');
  if (!FULFILLMENTS.has(fulfillment)) throw badRequest('FULFILLMENT_INVALID', 'Modalidade do pedido inválida.');
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new AppError(422, 'CART_EMPTY', 'Adicione ao menos um produto antes de confirmar.');
  }
  if (input.items.length > 20) throw badRequest('ITEM_COUNT_EXCEEDED', 'O carrinho excede 20 linhas de produto.');
  const seen = new Set();
  const items = input.items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw badRequest('ITEM_INVALID', 'Um item do carrinho é inválido.');
    if (Object.keys(item).some((key) => key !== 'productId' && key !== 'quantity')) throw badRequest('ITEM_FIELD_INVALID', 'O item contém um campo não permitido.');
    const productId = stringField(item.productId, 'productId', 1, 64);
    if (seen.has(productId)) throw badRequest('ITEM_DUPLICATED', 'Cada produto deve aparecer uma única vez no carrinho.');
    seen.add(productId);
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throw badRequest('QUANTITY_INVALID', 'A quantidade deve ser um número inteiro entre 1 e 20.');
    }
    return { productId, quantity: item.quantity };
  }).sort((a, b) => a.productId.localeCompare(b.productId));

  if (input.useLoyalty !== undefined && typeof input.useLoyalty !== 'boolean') {
    throw badRequest('LOYALTY_FLAG_INVALID', 'A opção de fidelidade deve ser verdadeira ou falsa.');
  }
  let couponCode;
  if (input.couponCode !== undefined && input.couponCode !== null && input.couponCode !== '') {
    couponCode = stringField(input.couponCode, 'couponCode', 1, 32).trim().toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(couponCode)) throw badRequest('COUPON_FORMAT_INVALID', 'O formato do cupom é inválido.');
  }
  let customerName;
  if (input.customerName !== undefined && input.customerName !== '') {
    customerName = stringField(input.customerName, 'customerName', 1, 40).trim();
    if (!/^[\p{L}\p{M} .'’-]+$/u.test(customerName)) throw badRequest('CUSTOMER_NAME_INVALID', 'Use apenas um nome curto, sem números ou dados de identificação.');
  }

  let payment;
  if (requirePayment) {
    if (!input.payment || typeof input.payment !== 'object' || Array.isArray(input.payment)) throw badRequest('PAYMENT_INVALID', 'Selecione uma opção de pagamento simulado.');
    if (Object.keys(input.payment).some((key) => key !== 'method' && key !== 'outcome')) throw badRequest('PAYMENT_FIELD_INVALID', 'A opção de pagamento contém um campo não permitido.');
    const method = stringField(input.payment.method, 'payment.method', 1, 16).toUpperCase();
    const outcome = stringField(input.payment.outcome, 'payment.outcome', 1, 16).toUpperCase();
    if (!METHODS.has(method)) throw badRequest('PAYMENT_METHOD_INVALID', 'Forma de pagamento simulada inválida.');
    if (!OUTCOMES.has(outcome)) throw badRequest('PAYMENT_OUTCOME_INVALID', 'Resultado de pagamento simulado inválido.');
    payment = { method, outcome };
  } else if (input.payment !== undefined) {
    throw badRequest('PAYMENT_NOT_ALLOWED', 'A prévia não deve incluir dados de pagamento.');
  }

  return {
    unitId,
    channel,
    fulfillment,
    items,
    ...(couponCode ? { couponCode } : {}),
    useLoyalty: input.useLoyalty === true,
    ...(customerName ? { customerName } : {}),
    ...(payment ? { payment } : {}),
  };
}

function stringField(value, name, min, max) {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    throw badRequest('FIELD_INVALID', `O campo ${name} está ausente ou fora do tamanho permitido.`);
  }
  return value;
}

export async function calculateQuote(command, { catalog, loyaltyService }) {
  const unit = catalog.getUnit(command.unitId);
  if (!unit) throw new AppError(404, 'UNIT_NOT_FOUND', 'Unidade não encontrada.');
  if (!unit.active) throw new AppError(409, 'UNIT_UNAVAILABLE', 'Esta unidade está temporariamente indisponível para novos pedidos.');
  const menu = catalog.getMenu(command.unitId) ?? [];
  const products = new Map(menu.map((product) => [product.id, product]));
  const lines = command.items.map(({ productId, quantity }) => {
    const product = products.get(productId);
    if (!product) throw new AppError(422, 'PRODUCT_NOT_FOUND', 'Um produto não pertence ao cardápio desta unidade.');
    if (!product.available) throw new AppError(409, 'PRODUCT_UNAVAILABLE', `${product.name} está indisponível nesta unidade.`);
    return {
      productId,
      name: product.name,
      quantity,
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * quantity,
    };
  });
  const subtotalCents = lines.reduce((total, line) => total + line.lineTotalCents, 0);
  const discounts = [];
  if (command.couponCode) {
    if (command.couponCode === 'VENCIDO') throw new AppError(422, 'COUPON_EXPIRED', 'Este cupom expirou e não pode ser aplicado.');
    if (command.couponCode !== 'BOASVINDAS10') throw new AppError(422, 'COUPON_INVALID', 'Cupom não reconhecido. Confira o código e tente novamente.');
    discounts.push({ type: 'COUPON', code: command.couponCode, amountCents: Math.floor(subtotalCents * 0.1), label: 'Cupom de boas-vindas (10%)' });
  }
  let pointsRedeemed = 0;
  if (command.useLoyalty) {
    let benefit;
    try {
      benefit = await loyaltyService.quoteBenefit();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(503, 'LOYALTY_UNAVAILABLE', 'Não foi possível consultar a fidelidade. Tente novamente sem o benefício.');
    }
    const remainingCents = Math.max(0, subtotalCents - discounts.reduce((sum, discount) => sum + discount.amountCents, 0));
    const amountCents = Math.min(remainingCents, benefit.discountCents);
    if (amountCents > 0) {
      discounts.push({ type: 'LOYALTY', amountCents, label: 'Benefício de fidelidade (500 pontos)' });
      pointsRedeemed = benefit.pointsRedeemed;
    }
  }
  const discountCents = discounts.reduce((total, discount) => total + discount.amountCents, 0);
  return {
    unit: { id: unit.id, name: unit.name },
    lines,
    subtotalCents,
    discounts,
    discountCents,
    totalCents: Math.max(0, subtotalCents - discountCents),
    pointsRedeemed,
  };
}

export function validateIdempotencyKey(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw badRequest('IDEMPOTENCY_KEY_INVALID', 'Envie Idempotency-Key com 8 a 128 caracteres permitidos.');
  }
  return value;
}

export function isSupportedChannel(channel) {
  return CHANNELS.has(channel);
}

export function isSupportedPaymentOutcome(outcome) {
  return OUTCOMES.has(outcome);
}
