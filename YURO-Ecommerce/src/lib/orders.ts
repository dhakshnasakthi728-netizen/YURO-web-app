import type { OrderStatus, PaymentStatus } from '../types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Order placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  placed: 'We have received your order. The seller will confirm it shortly.',
  confirmed: 'The seller has confirmed your order and is preparing it.',
  processing: 'Your pieces are being prepared for dispatch.',
  shipped: 'Your parcel is on its way.',
  delivered: 'The order has been delivered.',
  cancelled: 'This order was cancelled.',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  paid: 'Paid',
  refunded: 'Refunded',
};

export const FULFILMENT_STEPS: OrderStatus[] = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
];

export const SELLER_STATUS_OPTIONS: Array<OrderStatus | 'cancelled'> = [
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export function orderProgressIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1;
  const index = FULFILMENT_STEPS.indexOf(status);
  return index === -1 ? 0 : index;
}

export function isOpenStatus(status: OrderStatus): boolean {
  return status !== 'delivered' && status !== 'cancelled';
}
