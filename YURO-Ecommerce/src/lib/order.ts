export function generateOrderReference(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `YR-${stamp}-${random}`;
}
