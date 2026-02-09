'use client';

import { useState } from 'react';
import { API_ROUTES } from '@/config/constants';

export function ScheduledDeliveryForm() {
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [pickupWindowStart, setPickupWindowStart] = useState('');
  const [pickupWindowEnd, setPickupWindowEnd] = useState('');
  const [dropoffWindowStart, setDropoffWindowStart] = useState('');
  const [dropoffWindowEnd, setDropoffWindowEnd] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('3500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
          dropoffAddress,
          itemDescription,
          pickupWindowStart: pickupWindowStart ? new Date(pickupWindowStart).toISOString() : undefined,
          pickupWindowEnd: pickupWindowEnd ? new Date(pickupWindowEnd).toISOString() : undefined,
          dropoffWindowStart: dropoffWindowStart ? new Date(dropoffWindowStart).toISOString() : undefined,
          dropoffWindowEnd: dropoffWindowEnd ? new Date(dropoffWindowEnd).toISOString() : undefined,
          budgetAmount: Number.parseInt(budgetAmount, 10) || undefined,
        }),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null);
        throw new Error(errorPayload?.error || 'Failed to create scheduled request');
      }

      setPickupAddress('');
      setDropoffAddress('');
      setItemDescription('');
      setPickupWindowStart('');
      setPickupWindowEnd('');
      setDropoffWindowStart('');
      setDropoffWindowEnd('');
      setMessage('Scheduled delivery request created.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create scheduled request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        className="tm-input"
        placeholder="Pickup address"
        value={pickupAddress}
        onChange={(e) => setPickupAddress(e.target.value)}
        required
      />
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

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-[#334d80] font-semibold">
          Pickup Window Start
          <input
            type="datetime-local"
            className="tm-input mt-1"
            value={pickupWindowStart}
            onChange={(e) => setPickupWindowStart(e.target.value)}
            required
          />
        </label>
        <label className="text-sm text-[#334d80] font-semibold">
          Pickup Window End
          <input
            type="datetime-local"
            className="tm-input mt-1"
            value={pickupWindowEnd}
            onChange={(e) => setPickupWindowEnd(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-[#334d80] font-semibold">
          Dropoff Window Start
          <input
            type="datetime-local"
            className="tm-input mt-1"
            value={dropoffWindowStart}
            onChange={(e) => setDropoffWindowStart(e.target.value)}
            required
          />
        </label>
        <label className="text-sm text-[#334d80] font-semibold">
          Dropoff Window End
          <input
            type="datetime-local"
            className="tm-input mt-1"
            value={dropoffWindowEnd}
            onChange={(e) => setDropoffWindowEnd(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="text-sm text-[#334d80] font-semibold block">
        Budget (CRC)
        <input
          className="tm-input mt-1"
          value={budgetAmount}
          onChange={(e) => setBudgetAmount(e.target.value)}
          inputMode="numeric"
        />
      </label>

      <button className="tm-btn tm-btn-primary w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Scheduled Delivery'}
      </button>

      {message && <p className="text-sm text-[#4d6698]">{message}</p>}
    </form>
  );
}
