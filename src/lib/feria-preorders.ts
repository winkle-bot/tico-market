import type { FeriaPreorderMeta, ListingSnapshot, MarketEvent, OrderStatus } from '@/types';

const VALID_RESERVATION_STATUSES = new Set(['pending_confirmation', 'confirmed']);

export function buildFeriaPreorderMeta(
  event: MarketEvent,
  reservedAt = new Date().toISOString()
): FeriaPreorderMeta {
  return {
    kind: 'feria_preorder',
    eventId: event.id,
    eventName: event.name,
    eventDate: event.date,
    timeWindow: event.timeWindow,
    locationName: event.locationName,
    reservationStatus: 'pending_confirmation',
    reservedAt,
  };
}

export function getFeriaPreorderMeta(snapshot: unknown): FeriaPreorderMeta | null {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  const preorder = (snapshot as ListingSnapshot).feriaPreorder;
  if (!preorder || typeof preorder !== 'object') {
    return null;
  }

  const candidate = preorder as Partial<FeriaPreorderMeta>;
  if (
    candidate.kind !== 'feria_preorder' ||
    typeof candidate.eventId !== 'string' ||
    typeof candidate.eventName !== 'string' ||
    typeof candidate.eventDate !== 'string' ||
    typeof candidate.timeWindow !== 'string' ||
    typeof candidate.locationName !== 'string' ||
    typeof candidate.reservedAt !== 'string' ||
    typeof candidate.reservationStatus !== 'string' ||
    !VALID_RESERVATION_STATUSES.has(candidate.reservationStatus)
  ) {
    return null;
  }

  return candidate as FeriaPreorderMeta;
}

export function updateFeriaPreorderForStatus(
  snapshot: Record<string, unknown>,
  status: OrderStatus
): Record<string, unknown> {
  const preorder = getFeriaPreorderMeta(snapshot);
  if (!preorder) {
    return snapshot;
  }

  if (status !== 'confirmed') {
    return snapshot;
  }

  return {
    ...snapshot,
    feriaPreorder: {
      ...preorder,
      reservationStatus: 'confirmed',
    },
  };
}
