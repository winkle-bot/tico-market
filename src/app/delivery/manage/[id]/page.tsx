'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { withCsrfHeaders } from '@/lib/csrf';

type DeliveryRequestDetail = {
  id: string;
  requesterId: string;
  status: 'open' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
  requestType?: 'auto' | 'manual' | 'broadcast';
  offeredPrice?: number;
  budgetAmount?: number;
  finalAmount?: number;
  pickupAddress: string;
  dropoffAddress: string;
  itemDescription: string;
  assignedDriverId?: string;
  createdAt: string;
};

type NegotiationItem = {
  id: string;
  proposedBy: string;
  proposedByName?: string | null;
  amount: number;
  status: 'proposed' | 'accepted' | 'rejected' | 'countered';
  createdAt: string;
};

export default function DeliveryManagePage() {
  const params = useParams<{ id: string }>();
  const requestId = params?.id;
  const { user, isLoading } = useAuth();

  const [requestData, setRequestData] = useState<DeliveryRequestDetail | null>(null);
  const [negotiations, setNegotiations] = useState<NegotiationItem[]>([]);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [buyerAmount, setBuyerAmount] = useState('');
  const [driverCounterAmount, setDriverCounterAmount] = useState('');
  const [showDriverCounterInput, setShowDriverCounterInput] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!requestId || !user) return;

    try {
      const [requestRes, negotiationRes, meDriverRes] = await Promise.all([
        fetch(`/api/delivery-requests/${requestId}`),
        fetch(`/api/delivery-requests/${requestId}/negotiations`),
        fetch('/api/drivers/me'),
      ]);

      const requestPayload = await requestRes.json().catch(() => null);
      if (!requestRes.ok) {
        const payload = requestPayload;
        throw new Error(payload?.error || 'Failed to load request');
      }
      setRequestData(requestPayload as DeliveryRequestDetail);

      if (negotiationRes.ok) {
        const negotiationPayload = await negotiationRes.json();
        setNegotiations((negotiationPayload.data || []) as NegotiationItem[]);
      } else {
        setNegotiations([]);
      }

      setIsDriver(meDriverRes.ok);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  }, [requestId, user]);

  useEffect(() => {
    if (!isLoading && user && requestId) {
      setLoading(true);
      void fetchData();
    }
  }, [fetchData, isLoading, requestId, user]);

  useEffect(() => {
    if (!requestId || !user) return;

    const timer = window.setInterval(() => {
      void fetchData();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [fetchData, requestId, user]);

  const isBuyer = useMemo(
    () => Boolean(user?.id && requestData?.requesterId === user.id),
    [requestData?.requesterId, user?.id]
  );

  const currentOffer = negotiations[0]?.amount ??
    requestData?.offeredPrice ??
    requestData?.budgetAmount ??
    requestData?.finalAmount ??
    0;

  const submitCounter = useCallback(async (amount: number, roleLabel: 'buyer' | 'driver') => {
    if (!requestId) return;
    setSubmitting('counter');

    try {
      const res = await fetch(`/api/delivery-requests/${requestId}/counter`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ amount }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to submit counter offer');

      setFeedback(roleLabel === 'buyer' ? 'Counter offer sent to drivers.' : 'Counter offer sent to buyer.');
      await fetchData();
      if (roleLabel === 'buyer') setBuyerAmount('');
      if (roleLabel === 'driver') {
        setDriverCounterAmount('');
        setShowDriverCounterInput(false);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to submit counter offer');
    } finally {
      setSubmitting(null);
    }
  }, [fetchData, requestId]);

  const acceptAsDriver = useCallback(async () => {
    if (!requestId) return;
    setSubmitting('accept');

    try {
      const res = await fetch(`/api/delivery-requests/${requestId}/accept`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to accept request');

      setFeedback('Delivery accepted.');
      await fetchData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to accept request');
    } finally {
      setSubmitting(null);
    }
  }, [fetchData, requestId]);

  const declineAsDriver = useCallback(async () => {
    if (!requestId) return;
    setSubmitting('decline');

    try {
      const res = await fetch(`/api/delivery-requests/${requestId}/decline`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to decline request');

      setFeedback('Request declined.');
      await fetchData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to decline request');
    } finally {
      setSubmitting(null);
    }
  }, [fetchData, requestId]);

  if (isLoading || (user && loading)) {
    return <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center text-[#6780b3]">Loading request...</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center text-[#6780b3]">Log in to manage this delivery.</div>;
  }

  if (!requestData) {
    return <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center text-[#6780b3]">Delivery request not found.</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f8ff] pb-8">
      <header className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
        <div className="tm-shell py-6 flex items-center gap-3">
          <Link href="/delivery" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#7690bd]">Delivery Request</p>
            <h1 className="text-xl font-black text-[#18284a] sm:text-2xl">Manage Negotiation</h1>
          </div>
        </div>
      </header>

      <main className="tm-shell py-6 max-w-3xl mx-auto space-y-4">
        <section className="rounded-2xl border border-[#dce5f7] bg-white p-5 space-y-2">
          <p className="text-xs uppercase tracking-wider font-black text-[#7890bd]">Request #{requestData.id.slice(0, 8)}</p>
          <p className="text-sm text-[#4d689b]"><span className="font-semibold text-[#223d6b]">Status:</span> {requestData.status.replace('_', ' ')}</p>
          <p className="text-sm text-[#4d689b]"><span className="font-semibold text-[#223d6b]">Pickup:</span> {requestData.pickupAddress}</p>
          <p className="text-sm text-[#4d689b]"><span className="font-semibold text-[#223d6b]">Dropoff:</span> {requestData.dropoffAddress}</p>
          <p className="text-sm text-[#4d689b]"><span className="font-semibold text-[#223d6b]">Item:</span> {requestData.itemDescription}</p>
          <p className="text-sm text-[#2f539e] font-semibold">Current offer: ₡{Number(currentOffer || 0).toLocaleString('es-CR')}</p>
          <div className="pt-2">
            <button type="button" className="tm-btn tm-btn-muted" onClick={() => void fetchData()}>
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#dce5f7] bg-white p-5 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#335186]">Negotiation History</h2>
          {negotiations.length === 0 ? (
            <p className="text-sm text-[#6780b3]">No negotiation entries yet.</p>
          ) : (
            <div className="space-y-2">
              {negotiations.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-[#dce5f7] bg-[#fbfcff] px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#223d6b]">₡{entry.amount.toLocaleString('es-CR')}</p>
                    <p className="text-xs text-[#6780b3]">
                      by {entry.proposedBy === user.id ? 'You' : (entry.proposedByName || 'Participant')} • {new Date(entry.createdAt).toLocaleString('es-CR')}
                    </p>
                  </div>
                  <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full ${
                    entry.status === 'accepted'
                      ? 'bg-emerald-100 text-emerald-700'
                      : entry.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : entry.status === 'countered'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-[#eaf0ff] text-[#335186]'
                  }`}>{entry.status}</span>
                </article>
              ))}
            </div>
          )}
        </section>

        {isBuyer && requestData.status === 'open' && (
          <section className="rounded-2xl border border-[#dce5f7] bg-white p-5 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#335186]">Propose New Price</h2>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className="tm-input"
                inputMode="numeric"
                placeholder="Counter amount in CRC"
                value={buyerAmount}
                onChange={(e) => setBuyerAmount(e.target.value)}
              />
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                disabled={submitting === 'counter'}
                onClick={() => {
                  const amount = Number.parseInt(buyerAmount, 10);
                  if (!Number.isFinite(amount) || amount < 100) {
                    setFeedback('Counter amount must be at least ₡100.');
                    return;
                  }
                  void submitCounter(amount, 'buyer');
                }}
              >
                {submitting === 'counter' ? 'Submitting...' : 'Submit Offer'}
              </button>
            </div>
          </section>
        )}

        {!isBuyer && isDriver && requestData.status === 'open' && (
          <section className="rounded-2xl border border-[#dce5f7] bg-white p-5 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#335186]">Driver Actions</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                disabled={submitting === 'accept'}
                onClick={() => void acceptAsDriver()}
              >
                {submitting === 'accept' ? 'Accepting...' : 'Accept'}
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-muted"
                disabled={submitting === 'decline'}
                onClick={() => void declineAsDriver()}
              >
                {submitting === 'decline' ? 'Declining...' : 'Decline'}
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-muted"
                onClick={() => setShowDriverCounterInput((prev) => !prev)}
              >
                Counter
              </button>
            </div>

            {showDriverCounterInput && (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  className="tm-input"
                  inputMode="numeric"
                  placeholder="Counter amount in CRC"
                  value={driverCounterAmount}
                  onChange={(e) => setDriverCounterAmount(e.target.value)}
                />
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  disabled={submitting === 'counter'}
                  onClick={() => {
                    const amount = Number.parseInt(driverCounterAmount, 10);
                    if (!Number.isFinite(amount) || amount < 100) {
                      setFeedback('Counter amount must be at least ₡100.');
                      return;
                    }
                    void submitCounter(amount, 'driver');
                  }}
                >
                  {submitting === 'counter' ? 'Submitting...' : 'Send Counter'}
                </button>
              </div>
            )}
          </section>
        )}

        {feedback && <p className="text-sm text-[#4d6698]">{feedback}</p>}
      </main>
    </div>
  );
}
