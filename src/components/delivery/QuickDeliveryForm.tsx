'use client';

import { useMemo, useState } from 'react';
import { API_ROUTES } from '@/config/constants';
import type { DriverProfile } from '@/types';

interface QuickDeliveryFormProps {
  drivers: DriverProfile[];
}

function estimatePrice(pickup: string, dropoff: string): number {
  const base = 2200;
  const lengthFactor = Math.max(0, Math.min(7000, (pickup.length + dropoff.length) * 25));
  return base + lengthFactor;
}

export function QuickDeliveryForm({ drivers }: QuickDeliveryFormProps) {
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState<number | undefined>(undefined);
  const [pickupLng, setPickupLng] = useState<number | undefined>(undefined);
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const estimatedPrice = useMemo(() => estimatePrice(pickupAddress, dropoffAddress), [pickupAddress, dropoffAddress]);

  const handleUseGps = async () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setPickupLat(lat);
        setPickupLng(lng);
        setPickupAddress(`GPS location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        setMessage(null);
      },
      () => {
        setMessage('Unable to get your GPS location.');
      }
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(API_ROUTES.DELIVERY_REQUESTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupAddress,
          pickupLat,
          pickupLng,
          dropoffAddress,
          itemDescription,
          isFragile,
          budgetAmount: estimatedPrice,
        }),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null);
        throw new Error(errorPayload?.error || 'Failed to create request');
      }

      const payload = await res.json();
      if (selectedDriverId) {
        await fetch(`${API_ROUTES.DELIVERY_REQUESTS}/${payload.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedDriverId: selectedDriverId, status: 'assigned', finalAmount: estimatedPrice }),
        });
      }

      setPickupAddress('');
      setDropoffAddress('');
      setItemDescription('');
      setSelectedDriverId('');
      setIsFragile(false);
      setMessage('Delivery request created successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          className="tm-input"
          placeholder="Pickup address"
          value={pickupAddress}
          onChange={(e) => setPickupAddress(e.target.value)}
          required
        />
        <button type="button" className="tm-btn tm-btn-muted" onClick={handleUseGps}>
          Use GPS
        </button>
      </div>

      <input
        className="tm-input"
        placeholder="Dropoff address"
        value={dropoffAddress}
        onChange={(e) => setDropoffAddress(e.target.value)}
        required
      />

      <textarea
        className="tm-input min-h-24"
        placeholder="Item description"
        value={itemDescription}
        onChange={(e) => setItemDescription(e.target.value)}
        required
      />

      <div className="rounded-xl bg-[#f5f8ff] px-4 py-3 text-sm font-semibold text-[#2f539e]">
        Estimated price: ₡{estimatedPrice.toLocaleString('es-CR')}
      </div>

      <select
        className="tm-input"
        value={selectedDriverId}
        onChange={(e) => setSelectedDriverId(e.target.value)}
      >
        <option value="">Auto-assign best driver</option>
        {drivers.filter((driver) => driver.isOnline).map((driver) => (
          <option key={driver.id} value={driver.userId}>
            {driver.name} ({driver.vehicleType || 'driver'}) - {driver.rating.toFixed(1)}★
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm font-medium text-[#334d80]">
        <input type="checkbox" checked={isFragile} onChange={(e) => setIsFragile(e.target.checked)} />
        Fragile item
      </label>

      <button className="tm-btn tm-btn-primary w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Quick Delivery'}
      </button>

      {message && <p className="text-sm text-[#4d6698]">{message}</p>}
    </form>
  );
}
