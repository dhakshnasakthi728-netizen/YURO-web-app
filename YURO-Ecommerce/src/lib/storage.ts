import type { CartItem } from '../types';
import { clampQuantity } from './cart';

const CART_KEY = 'yuro.cart.v2';
const WISHLIST_KEY = 'yuro.wishlist.v2';
const RECENT_KEY = 'yuro.recent.v2';

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private browsing; the app still works.
  }
}

export function loadCart(): CartItem[] {
  const stored = readJson(CART_KEY);
  if (!Array.isArray(stored)) return [];

  const merged = new Map<number, number>();

  for (const entry of stored) {
    if (!entry || typeof entry !== 'object') continue;

    const productId = Number((entry as { productId?: unknown }).productId);
    const quantity = Number((entry as { quantity?: unknown }).quantity);

    if (!Number.isInteger(productId) || productId < 1) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    merged.set(
      productId,
      clampQuantity((merged.get(productId) ?? 0) + quantity),
    );
  }

  return Array.from(merged, ([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function saveCart(cart: CartItem[]): void {
  writeJson(CART_KEY, cart);
}

function loadProductIds(key: string, limit: number): number[] {
  const stored = readJson(key);
  if (!Array.isArray(stored)) return [];

  const ids: number[] = [];
  for (const value of stored) {
    const id = Number(value);
    if (Number.isInteger(id) && id > 0 && !ids.includes(id)) {
      ids.push(id);
    }
  }

  return ids.slice(0, limit);
}

export function loadWishlist(): number[] {
  return loadProductIds(WISHLIST_KEY, 100);
}

export function saveWishlist(wishlist: number[]): void {
  writeJson(WISHLIST_KEY, wishlist);
}

export function loadRecentlyViewed(): number[] {
  return loadProductIds(RECENT_KEY, 8);
}

export function saveRecentlyViewed(ids: number[]): void {
  writeJson(RECENT_KEY, ids);
}
