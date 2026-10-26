import { randomUUID } from 'node:crypto';
import { AppError } from '../domain/errors.mjs';

export function createLoyaltyMock({ available = true, discountCents = 300 } = {}) {
  let calls = 0;
  return {
    async quoteBenefit() {
      calls += 1;
      if (!available) throw new AppError(503, 'LOYALTY_UNAVAILABLE', 'Não foi possível consultar a fidelidade. Tente novamente sem o benefício.');
      return { pointsRedeemed: 500, discountCents };
    },
    get calls() {
      return calls;
    },
  };
}

export function createPaymentMock({ available = true, delayMs = 0 } = {}) {
  let calls = 0;
  return {
    async authorize({ amountCents, method, outcome }) {
      calls += 1;
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (!available) throw new AppError(503, 'PAYMENT_UNAVAILABLE', 'O serviço de pagamento simulado está indisponível. Nenhum pedido foi confirmado.');
      if (outcome === 'DECLINED') throw new AppError(402, 'PAYMENT_DECLINED', 'Pagamento simulado recusado. Revise a forma de pagamento ou tente novamente.');
      if (outcome === 'TIMEOUT') throw new AppError(504, 'PAYMENT_TIMEOUT', 'Tempo esgotado no pagamento simulado. O pedido não foi confirmado. Consulte o suporte antes de iniciar outra tentativa.');
      if (outcome !== 'APPROVED') throw new AppError(400, 'PAYMENT_OUTCOME_INVALID', 'Resultado de pagamento simulado inválido.');
      return {
        status: 'APPROVED',
        method,
        transactionId: `MOCK-${randomUUID()}`,
        authorizedAt: new Date().toISOString(),
        amountCents,
      };
    },
    get calls() {
      return calls;
    },
  };
}
