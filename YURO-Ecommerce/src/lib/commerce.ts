import type { CommerceSettings } from '../types';

const fallbackSettings: CommerceSettings = {
  freeShippingThreshold: 3500,
  shippingFee: 149,
  promoCode: 'YURO10',
  promoRate: 0.1,
  applicationsOpen: true,
  marketplaceName: 'YURO',
};

let currentSettings = fallbackSettings;

export function getCommerceSettings(): CommerceSettings {
  return currentSettings;
}

export function setCommerceSettings(settings: CommerceSettings): void {
  currentSettings = { ...fallbackSettings, ...settings };
}
