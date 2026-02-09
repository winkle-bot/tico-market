export const COSTA_RICA_IVA_RATE = 0.13;

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

export function calculateIvaCents(subtotalCents: number, rate = COSTA_RICA_IVA_RATE): number {
  if (!Number.isFinite(subtotalCents) || subtotalCents <= 0) {
    return 0;
  }
  return Math.round(subtotalCents * rate);
}

export function formatColonFromCents(cents: number): string {
  const safeCents = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  const amount = Math.round(safeCents / 100);
  return `₡${amount.toLocaleString('es-CR')}`;
}
