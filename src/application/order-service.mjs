import { randomUUID } from 'node:crypto';
import { AppError } from '../domain/errors.mjs';
import { calculateQuote } from '../domain/order-rules.mjs';

export function createOrderService({ catalog, store, loyaltyService, paymentService, now = () => new Date() }) {
  async function quote(command) {
    return calculateQuote(command, { catalog, loyaltyService });
  }

  async function createOrder(command, idempotencyKey) {
    const fingerprint = JSON.stringify(command);
    const reservation = store.reserveIdempotency(idempotencyKey, fingerprint);
    if (reservation.kind === 'existing') {
      const record = reservation.record;
      if (record.fingerprint !== fingerprint) {
        return failure(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave já foi usada com outro conteúdo. Gere uma nova chave para uma nova tentativa.');
      }
      if (record.state === 'PROCESSING') {
        return failure(409, 'REQUEST_IN_PROGRESS', 'Esta tentativa ainda está sendo processada. Aguarde e consulte novamente com a mesma chave.');
      }
      return { ...structuredClone(record.result), replayed: true };
    }

    try {
      const quoteResult = await quote(command);
      const payment = await paymentService.authorize({
        amountCents: quoteResult.totalCents,
        method: command.payment.method,
        outcome: command.payment.outcome,
      });
      const createdAt = now().toISOString();
      const token = randomUUID();
      const order = store.createOrder({
        id: randomUUID(),
        unitId: command.unitId,
        channel: command.channel,
        fulfillment: command.fulfillment,
        customerName: command.customerName ?? 'Cliente',
        items: quoteResult.lines,
        subtotalCents: quoteResult.subtotalCents,
        discounts: quoteResult.discounts,
        discountCents: quoteResult.discountCents,
        totalCents: quoteResult.totalCents,
        loyaltyPointsRedeemed: quoteResult.pointsRedeemed,
        status: 'CONFIRMED',
        payment: { status: payment.status, method: payment.method, transactionId: payment.transactionId },
        accessToken: token,
        createdAt,
      });
      const result = {
        status: 201,
        ok: true,
        data: publicOrder(order),
      };
      store.completeIdempotency(idempotencyKey, result);
      return result;
    } catch (error) {
      const appError = error instanceof AppError
        ? error
        : new AppError(500, 'INTERNAL_ERROR', 'Não foi possível concluir o pedido. Tente novamente com a mesma chave de idempotência.');
      const result = failure(appError.status, appError.code, appError.message);
      store.completeIdempotency(idempotencyKey, result);
      return result;
    }
  }

  return { quote, createOrder };
}

function failure(status, code, message) {
  return { status, ok: false, error: { code, message } };
}

function publicOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    unitId: order.unitId,
    channel: order.channel,
    fulfillment: order.fulfillment,
    customerName: order.customerName,
    items: order.items,
    subtotalCents: order.subtotalCents,
    discounts: order.discounts,
    discountCents: order.discountCents,
    totalCents: order.totalCents,
    loyaltyPointsRedeemed: order.loyaltyPointsRedeemed,
    status: order.status,
    payment: { status: order.payment.status, method: order.payment.method },
    createdAt: order.createdAt,
    accessToken: order.accessToken,
  };
}
