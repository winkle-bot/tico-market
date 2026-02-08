export function parseColonPriceToCents(price: string): number {
  const digits = price.replace(/[^\d]/g, '');
  if (!digits) {
    throw new Error('Invalid price format');
  }

  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid price amount');
  }

  // Stripe expects the smallest currency unit.
  return amount * 100;
}
