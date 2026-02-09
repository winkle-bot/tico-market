import type { PickupLocation } from '@/types';

export interface DriverOption {
  id: string;
  listingId: number;
  name: string;
  rating: number;
  verified: boolean;
  distanceKm: number;
  etaMinutes: number;
  availabilityLabel: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function formatSchedule(schedule: PickupLocation['schedule']): string {
  const available = DAYS
    .map((day, index) => {
      const times = schedule[day];
      if (!times || times.length === 0) return null;
      const range = times.map((timeRange) => `${timeRange.start}-${timeRange.end}`).join(', ');
      return `${SHORT_DAYS[index]} ${range}`;
    })
    .filter(Boolean);

  return available.join(' • ') || 'Contact seller for availability';
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function getDistanceKm(from: [number, number], to: [number, number]): number {
  const dLat = toRadians(to[0] - from[0]);
  const dLng = toRadians(to[1] - from[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from[0])) * Math.cos(toRadians(to[0])) * Math.sin(dLng / 2) ** 2;

  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function estimateEtaMinutes(distanceKm: number): number {
  return Math.max(12, Math.round(8 + distanceKm * 6));
}

export function parseDeliveryFee(display: string): number {
  const value = Number.parseInt(display.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(value) ? value : 2500;
}

export function parseColonDisplayToNumber(value: string): number {
  const numeric = Number.parseInt(value.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatColon(value: number): string {
  return `₡${value.toLocaleString('es-CR')}`;
}
