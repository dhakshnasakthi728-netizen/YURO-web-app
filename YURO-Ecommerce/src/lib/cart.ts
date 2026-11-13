import { findProduct } from './catalog';
import { getCommerceSettings } from './commerce';
import type { CartItem, CartLine, CartTotals } from '../types';

export function clampQuantity(quantity: number, maximum = 99): number {
  return Math.min(Math.max(1, maximum), Math.max(1, Math.round(quantity)));
}

export function getCartLines(items: CartItem[]): CartLine[] {
  return items.flatMap((item) => {
    const product = findProduct(item.productId);
    if (!product) return [];
    const quantity = clampQuantity(item.quantity);

    return [
      {
        product,
        quantity,
        lineTotal: product.price * quantity,
      },
    ];
  });
}

export function calculateTotals(
  items: CartItem[],
  promoApplied = false,
): CartTotals {
  const settings = getCommerceSettings();
  const lines = getCartLines(items);
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
  const discount = promoApplied
    ? Math.round(subtotal * settings.promoRate)
    : 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const shipping =
    itemCount === 0 || discountedSubtotal >= settings.freeShippingThreshold
      ? 0
      : settings.shippingFee;

  return {
    itemCount,
    subtotal,
    discount,
    shipping,
    total: discountedSubtotal + shipping,
    freeShippingRemaining:
      itemCount === 0
        ? 0
        : Math.max(0, settings.freeShippingThreshold - discountedSubtotal),
  };
}
