export const COSTA_RICA_IVA_RATE = 0.13;
export type PaymentCurrency = 'CRC' | 'USD';

const FALLBACK_CRC_PER_USD = 500;

function getCrcPerUsd(): number {
  const rawValue =
    process.env.NEXT_PUBLIC_CRC_PER_USD ??
    process.env.CRC_PER_USD ??
    String(FALLBACK_CRC_PER_USD);
  const parsed = Number.parseFloat(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_CRC_PER_USD;
}

export function parseDisplayPriceToMinorUnits(
  price: string,
  currency: PaymentCurrency = 'CRC'
): number {
  const trimmed = price.trim();
  if (!trimmed) {
    throw new Error('Invalid price format');
  }

  if (currency === 'USD') {
    const normalized = trimmed.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
    const amount = Number.parseFloat(normalized);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid price amount');
    }
    return Math.round(amount * 100);
  }

  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) {
    throw new Error('Invalid price format');
  }

  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid price amount');
  }

  // CRC is a zero-decimal Stripe currency, so whole colones are already minor units.
  return amount;
}

export function convertCrcAmountToMinorUnits(
  amountInColones: number,
  currency: PaymentCurrency
): number {
  if (!Number.isFinite(amountInColones) || amountInColones <= 0) {
    return 0;
  }

  if (currency === 'CRC') {
    return Math.round(amountInColones);
  }

  return Math.round((amountInColones / getCrcPerUsd()) * 100);
}

export function calculateIvaMinorUnits(
  subtotalMinorUnits: number,
  rate = COSTA_RICA_IVA_RATE
): number {
  if (!Number.isFinite(subtotalMinorUnits) || subtotalMinorUnits <= 0) {
    return 0;
  }
  return Math.round(subtotalMinorUnits * rate);
}

export function formatMinorUnits(
  amountMinorUnits: number,
  currency: PaymentCurrency = 'CRC'
): string {
  const safeAmount = Number.isFinite(amountMinorUnits)
    ? Math.max(0, Math.round(amountMinorUnits))
    : 0;

  if (currency === 'USD') {
    const dollars = safeAmount / 100;
    return `$${dollars.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `₡${safeAmount.toLocaleString('es-CR')}`;
}

// Backwards-compatible names used in older checkout code paths.
export const parseColonPriceToCents = parseDisplayPriceToMinorUnits;
export const calculateIvaCents = calculateIvaMinorUnits;
export const formatColonFromCents = formatMinorUnits;
