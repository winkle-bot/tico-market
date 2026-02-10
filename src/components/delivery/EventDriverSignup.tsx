'use client';

import { useState } from 'react';

interface EventDriverSignupProps {
  onSubmitted?: () => void;
}

export function EventDriverSignup({ onSubmitted }: EventDriverSignupProps) {
  const [eventId, setEventId] = useState('market-day-gam');
  const [eventName, setEventName] = useState('Market Day Delivery Support');
  const [eventDate, setEventDate] = useState('');
  const [locationName, setLocationName] = useState('San Jose, Costa Rica');
  const [availabilityStart, setAvailabilityStart] = useState('08:00');
  const [availabilityEnd, setAvailabilityEnd] = useState('14:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/event-drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          eventName,
          eventDate,
          locationName,
          availabilityStart,
          availabilityEnd,
          notes,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to submit event signup');
      }

      setMessage('Event signup submitted. Status: pending review.');
      setNotes('');
      onSubmitted?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to submit event signup');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-[#dce5f7] bg-white p-4">
      <div>
        <h3 className="text-sm font-black uppercase tracking-wider text-[#355488]">Event Driver Signup</h3>
        <p className="mt-1 text-xs text-[#6881b1]">Register availability for special market events.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#3f5f96]">
          Event ID
          <input className="tm-input mt-1" value={eventId} onChange={(e) => setEventId(e.target.value)} required />
        </label>
        <label className="text-xs font-semibold text-[#3f5f96]">
          Event Date
          <input type="date" className="tm-input mt-1" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
        </label>
      </div>

      <label className="text-xs font-semibold text-[#3f5f96] block">
        Event Name
        <input className="tm-input mt-1" value={eventName} onChange={(e) => setEventName(e.target.value)} required />
      </label>

      <label className="text-xs font-semibold text-[#3f5f96] block">
        Location
        <input className="tm-input mt-1" value={locationName} onChange={(e) => setLocationName(e.target.value)} required />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#3f5f96]">
          Start
          <input type="time" className="tm-input mt-1" value={availabilityStart} onChange={(e) => setAvailabilityStart(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-[#3f5f96]">
          End
          <input type="time" className="tm-input mt-1" value={availabilityEnd} onChange={(e) => setAvailabilityEnd(e.target.value)} />
        </label>
      </div>

      <label className="text-xs font-semibold text-[#3f5f96] block">
        Notes
        <textarea className="tm-input mt-1 min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <button className="tm-btn tm-btn-primary w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Sign Up for Event'}
      </button>

      {message && <p className="text-sm text-[#4d6698]">{message}</p>}
    </form>
  );
}
