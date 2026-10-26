export type Channel = 'APP' | 'WEB' | 'TOTEM' | 'BALCAO' | 'PICKUP';
export type Fulfillment = 'PICKUP' | 'DINE_IN';
export type PaymentMethod = 'PIX' | 'CARD';
export type PaymentOutcome = 'APPROVED' | 'DECLINED' | 'TIMEOUT';

export interface Unit {
  id: string;
  name: string;
  city: string;
  active: boolean;
  channels: Channel[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
}

export interface Discount {
  type: 'COUPON' | 'LOYALTY';
  code?: string;
  amountCents: number;
  label: string;
}

export interface Quote {
  unit: { id: string; name: string };
  lines: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  subtotalCents: number;
  discounts: Discount[];
  discountCents: number;
  totalCents: number;
  pointsRedeemed: number;
}

export interface OrderBody {
  unitId: string;
  channel: Channel;
  fulfillment: Fulfillment;
  items: Array<{ productId: string; quantity: number }>;
  couponCode?: string;
  useLoyalty: boolean;
  customerName?: string;
  payment: { method: PaymentMethod; outcome: PaymentOutcome };
}

export interface CreatedOrder {
  orderNumber: string;
  unitId: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  subtotalCents: number;
  discounts: Discount[];
  totalCents: number;
  fulfillment: Fulfillment;
  payment: { status: 'APPROVED'; method: PaymentMethod };
  createdAt: string;
}

export interface ApiError {
  error?: { code?: string; message?: string };
}
