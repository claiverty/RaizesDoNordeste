import type { ApiError, CreatedOrder, OrderBody, Product, Quote, Unit } from './types';

async function responseBody<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function getUnits(): Promise<Unit[]> {
  const response = await fetch('/api/v1/units');
  const data = await responseBody<{ units: Unit[] }>(response);
  if (!response.ok) throw new Error('Não foi possível carregar as unidades.');
  return data.units;
}

export async function getMenu(unitId: string): Promise<Product[]> {
  const response = await fetch(`/api/v1/units/${encodeURIComponent(unitId)}/menu`);
  const data = await responseBody<{ items: Product[] } & ApiError>(response);
  if (!response.ok) throw new Error(data.error?.message ?? 'Não foi possível carregar o cardápio.');
  return data.items;
}

export async function getQuote(order: Omit<OrderBody, 'payment' | 'customerName'>): Promise<Quote> {
  const response = await fetch('/api/v1/orders/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  const data = await responseBody<{ quote: Quote } & ApiError>(response);
  if (!response.ok) throw new Error(data.error?.message ?? 'Não foi possível calcular o total.');
  return data.quote;
}

export async function createOrder(order: OrderBody, idempotencyKey: string): Promise<CreatedOrder> {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(order),
  });
  const data = await responseBody<CreatedOrder & ApiError>(response);
  if (!response.ok) {
    const error = new Error(data.error?.message ?? 'Não foi possível confirmar o pedido.') as Error & { code?: string };
    error.code = data.error?.code;
    throw error;
  }
  return data;
}
