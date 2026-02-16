/**
 * Format a price for display using Costa Rican conventions.
 * CRC uses period as thousands separator: ₡5.000
 * USD uses standard formatting: $50.00
 */
export function formatPrice(
  priceCents: number | null | undefined,
  currency: 'CRC' | 'USD' = 'CRC',
  fallbackPrice?: string
): string {
  // If we have the legacy text price and no numeric, use it
  if (priceCents == null && fallbackPrice) {
    return fallbackPrice;
  }

  if (priceCents == null) return currency === 'CRC' ? '₡0' : '$0';

  if (currency === 'USD') {
    const dollars = priceCents / 100;
    return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: dollars % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
  }

  // CRC: no decimal places, period as thousands separator
  return `₡${priceCents.toLocaleString('es-CR', { maximumFractionDigits: 0 }).replace(/,/g, '.')}`;
}

/**
 * Format condition for display
 */
export function formatCondition(condition: string): string {
  const map: Record<string, string> = {
    new: 'New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    for_parts: 'For Parts',
  };
  return map[condition] || condition;
}

/**
 * Format item type for display
 */
export function formatItemType(itemType: string): string {
  const map: Record<string, string> = {
    physical: 'Physical Good',
    food: 'Food / Produce',
    service: 'Service',
    rental: 'Rental',
    free: 'Free',
  };
  return map[itemType] || itemType;
}

/**
 * Generate a Waze deep link for navigation to coordinates.
 */
export function wazeLink(lat: number, lng: number): string {
  return `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Format response time for display.
 */
export function formatResponseTime(minutes: number | null | undefined): string {
  if (!minutes) return '';
  if (minutes < 60) return `Responds in ~${minutes}min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Responds in ~${hours}h`;
  return `Responds in ~${Math.round(hours / 24)}d`;
}
