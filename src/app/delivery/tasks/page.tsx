'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { EventDriverSignup } from '@/components/delivery/EventDriverSignup';

interface TaskItem {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  itemDescription: string;
  budgetAmount?: number;
  createdAt: string;
}

export default function DeliveryTaskMarketplacePage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [budgetMin, setBudgetMin] = useState('0');
  const [budgetMax, setBudgetMax] = useState('100000');
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  const [bidEta, setBidEta] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/delivery-requests?status=open&limit=60');
        if (!res.ok) throw new Error('Failed to load tasks');
        const payload = await res.json();
        setTasks(payload.data || []);
      } catch {
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    const min = Number.parseInt(budgetMin, 10) || 0;
    const max = Number.parseInt(budgetMax, 10) || Number.MAX_SAFE_INTEGER;
    return tasks.filter((task) => {
      const budget = task.budgetAmount || 0;
      return budget >= min && budget <= max;
    });
  }, [budgetMin, budgetMax, tasks]);

  const placeBid = async (taskId: string) => {
    const amount = Number.parseInt(bidAmounts[taskId] || '', 10);
    const etaMinutes = Number.parseInt(bidEta[taskId] || '', 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback('Please enter a valid bid amount.');
      return;
    }

    try {
      const res = await fetch(`/api/delivery-requests/${taskId}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          etaMinutes: Number.isFinite(etaMinutes) && etaMinutes > 0 ? etaMinutes : undefined,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to place bid');
      }
      setFeedback('Bid submitted successfully.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to place bid.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <header className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
        <div className="tm-shell py-6 flex items-center gap-3">
          <Link href="/delivery" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors" aria-label="Back to delivery page">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#18284a] uppercase tracking-tight">Delivery Tasks</h1>
            <p className="text-sm text-[#6780b3]">Browse open requests and place your bid.</p>
          </div>
        </div>
      </header>

      <main className="tm-shell py-6 space-y-5">
        <EventDriverSignup />

        <section className="rounded-2xl border border-[#dce5f7] bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-[#334d80]">
              Budget min
              <input className="tm-input mt-1" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} inputMode="numeric" />
            </label>
            <label className="text-sm font-semibold text-[#334d80]">
              Budget max
              <input className="tm-input mt-1" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} inputMode="numeric" />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-[#dce5f7] bg-white p-8 text-center text-[#6780b3]">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-[#dce5f7] bg-white p-8 text-center text-[#6780b3]">No open tasks for this budget range.</div>
          ) : (
            filteredTasks.map((task) => (
              <article key={task.id} className="rounded-2xl border border-[#dce5f7] bg-white p-4">
                <p className="text-xs uppercase tracking-wider text-[#7890bd] font-black">Task #{task.id.slice(0, 8)}</p>
                <h3 className="mt-1 text-lg font-bold text-[#18284a] line-clamp-2">{task.itemDescription}</h3>
                <p className="text-sm text-[#4d689b] mt-2">Pickup: {task.pickupAddress}</p>
                <p className="text-sm text-[#4d689b]">Dropoff: {task.dropoffAddress}</p>
                <p className="text-sm font-semibold text-[#2f539e] mt-2">Budget: ₡{(task.budgetAmount || 0).toLocaleString('es-CR')}</p>

                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    className="tm-input"
                    placeholder="Bid amount (CRC)"
                    inputMode="numeric"
                    value={bidAmounts[task.id] || ''}
                    onChange={(e) => setBidAmounts((prev) => ({ ...prev, [task.id]: e.target.value }))}
                  />
                  <input
                    className="tm-input"
                    placeholder="ETA minutes"
                    inputMode="numeric"
                    value={bidEta[task.id] || ''}
                    onChange={(e) => setBidEta((prev) => ({ ...prev, [task.id]: e.target.value }))}
                  />
                  <button className="tm-btn tm-btn-primary" onClick={() => void placeBid(task.id)}>
                    Place Bid
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        {feedback && <p className="text-sm text-[#4d6698]">{feedback}</p>}
      </main>
    </div>
  );
}
