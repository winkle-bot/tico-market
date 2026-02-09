'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { QuickDeliveryForm } from '@/components/delivery/QuickDeliveryForm';
import { ScheduledDeliveryForm } from '@/components/delivery/ScheduledDeliveryForm';
import type { DriverProfile } from '@/types';

type DeliveryTab = 'quick' | 'schedule' | 'tasks';

export default function DeliveryPage() {
  const [tab, setTab] = useState<DeliveryTab>('quick');
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await fetch('/api/drivers?online=true');
        if (!res.ok) return;
        const payload = await res.json();
        setDrivers(payload.data || []);
      } catch {
        setDrivers([]);
      }
    };

    fetchDrivers();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <header className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
        <div className="tm-shell py-6 flex items-center gap-3">
          <Link href="/" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors" aria-label="Back to home">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#18284a] uppercase tracking-tight">Delivery Marketplace</h1>
            <p className="text-sm text-[#6780b3]">Book quick delivery, schedule pickup windows, or browse open tasks.</p>
          </div>
        </div>
      </header>

      <main className="tm-shell py-6">
        <div className="inline-flex rounded-2xl border border-[#dce5f7] bg-white p-1 mb-6">
          <button
            className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'quick' ? 'bg-[#1f4fbf] text-white' : 'text-[#34558e]'}`}
            onClick={() => setTab('quick')}
          >
            Quick Delivery
          </button>
          <button
            className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'schedule' ? 'bg-[#1f4fbf] text-white' : 'text-[#34558e]'}`}
            onClick={() => setTab('schedule')}
          >
            Schedule
          </button>
          <button
            className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'tasks' ? 'bg-[#1f4fbf] text-white' : 'text-[#34558e]'}`}
            onClick={() => setTab('tasks')}
          >
            Browse Tasks
          </button>
        </div>

        <section className="rounded-2xl border border-[#dce5f7] bg-white p-5">
          {tab === 'quick' && <QuickDeliveryForm drivers={drivers} />}
          {tab === 'schedule' && <ScheduledDeliveryForm />}
          {tab === 'tasks' && (
            <div className="space-y-3">
              <p className="text-sm text-[#5672a8]">Open delivery tasks are listed on the marketplace page.</p>
              <Link href="/delivery/tasks" className="tm-btn tm-btn-primary inline-flex">
                Open Task Marketplace
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
