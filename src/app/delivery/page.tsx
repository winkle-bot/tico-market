'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Clock3, Truck } from 'lucide-react';
import { QuickDeliveryForm } from '@/components/delivery/QuickDeliveryForm';
import { ScheduledDeliveryForm } from '@/components/delivery/ScheduledDeliveryForm';
import { DeliveryHero } from '@/components/delivery/DeliveryHero';
import { EmptyDeliveryState } from '@/components/delivery/EmptyDeliveryState';
import type { DriverProfile } from '@/types';

type DeliveryTab = 'quick' | 'schedule' | 'tasks';

function DriverCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[#dce5f7] bg-white p-4">
      <div className="mb-3 h-4 w-24 rounded bg-[#e5edff]" />
      <div className="mb-2 h-5 w-36 rounded bg-[#e5edff]" />
      <div className="h-3 w-full rounded bg-[#eef3ff]" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="h-10 rounded-xl bg-[#eef3ff]" />
        <div className="h-10 rounded-xl bg-[#eef3ff]" />
      </div>
    </div>
  );
}

function AnimatedDriverCard({ driver, index }: { driver: DriverProfile; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.06, 0.28) }}
      className="rounded-2xl border border-[#dce5f7] bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-[#7590bf]">{driver.vehicleType || 'Driver'}</p>
          <h3 className="text-base font-black text-[#1f3561]">{driver.name}</h3>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
          Online
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-[#f5f8ff] px-3 py-2">
          <p className="text-[#6d83af]">Rating</p>
          <p className="font-black text-[#1f3561]">{driver.rating.toFixed(1)} / 5</p>
        </div>
        <div className="rounded-xl bg-[#f5f8ff] px-3 py-2">
          <p className="text-[#6d83af]">Deliveries</p>
          <p className="font-black text-[#1f3561]">{driver.totalDeliveries}</p>
        </div>
      </div>

      {driver.specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {driver.specialties.slice(0, 3).map((specialty) => (
            <span key={`${driver.id}-${specialty}`} className="rounded-full bg-[#eaf1ff] px-2 py-1 text-[11px] font-semibold text-[#2f539e]">
              {specialty}
            </span>
          ))}
        </div>
      )}
    </motion.article>
  );
}

export default function DeliveryPage() {
  const [tab, setTab] = useState<DeliveryTab>('quick');
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoadingDrivers(true);
        const res = await fetch('/api/drivers?online=true');
        if (!res.ok) throw new Error('Failed to load drivers');
        const payload = await res.json();
        setDrivers(payload.data || []);
      } catch {
        setDrivers([]);
      } finally {
        setLoadingDrivers(false);
      }
    };

    fetchDrivers();
  }, []);

  const tabs: Array<{ id: DeliveryTab; label: string; icon: typeof Truck }> = [
    { id: 'quick', label: 'Quick Delivery', icon: Truck },
    { id: 'schedule', label: 'Schedule', icon: Clock3 },
    { id: 'tasks', label: 'Browse Tasks', icon: Truck },
  ];

  const onlineDrivers = useMemo(() => drivers.filter((driver) => driver.isOnline), [drivers]);

  return (
    <div className="min-h-screen bg-[#f5f8ff] pb-8">
      <header className="border-b border-[#dce5f7] bg-white/90 backdrop-blur-xl">
        <div className="tm-shell flex items-center gap-3 py-4 sm:py-5">
          <Link href="/" className="rounded-full p-2.5 transition-colors hover:bg-[#edf2ff]" aria-label="Back to home">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#7690bd]">Operations</p>
            <h1 className="text-xl font-black text-[#18284a] sm:text-2xl">Delivery Desk</h1>
          </div>
        </div>
      </header>

      <main className="tm-shell space-y-5 py-5 sm:space-y-6 sm:py-6">
        <DeliveryHero onlineDrivers={onlineDrivers.length} />

        <div className="no-scrollbar flex gap-2 overflow-x-auto rounded-2xl border border-[#dce5f7] bg-white p-1">
          {tabs.map((entry) => {
            const Icon = entry.icon;
            const isActive = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                className={`flex min-w-fit items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-colors sm:px-4 ${
                  isActive ? 'bg-[#1f4fbf] text-white' : 'text-[#39588f] hover:bg-[#eef3ff]'
                }`}
                onClick={() => setTab(entry.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {entry.label}
              </button>
            );
          })}
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-[#dce5f7] bg-white p-4 sm:p-5">
            {tab === 'quick' && (
              <>
                {loadingDrivers ? (
                  <div className="space-y-3">
                    <div className="h-5 w-40 animate-pulse rounded bg-[#e5edff]" />
                    <div className="h-10 animate-pulse rounded-xl bg-[#eef3ff]" />
                    <div className="h-10 animate-pulse rounded-xl bg-[#eef3ff]" />
                    <div className="h-24 animate-pulse rounded-xl bg-[#eef3ff]" />
                    <div className="h-10 animate-pulse rounded-xl bg-[#e5edff]" />
                  </div>
                ) : onlineDrivers.length === 0 ? (
                  <EmptyDeliveryState
                    title="No drivers online right now"
                    description="You can still create a task and drivers will bid as they come online."
                  />
                ) : (
                  <QuickDeliveryForm drivers={onlineDrivers} />
                )}
              </>
            )}

            {tab === 'schedule' && <ScheduledDeliveryForm />}

            {tab === 'tasks' && (
              <div className="space-y-3">
                <p className="text-sm text-[#5672a8]">
                  Open delivery tasks are listed on the marketplace page where drivers can submit bids.
                </p>
                <Link href="/delivery/tasks" className="tm-btn tm-btn-primary inline-flex">
                  Open Task Marketplace
                </Link>
              </div>
            )}
          </div>

          <aside className="space-y-3 rounded-2xl border border-[#dce5f7] bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#335186]">Available Drivers</h2>
              <span className="rounded-full bg-[#edf2ff] px-2 py-1 text-[11px] font-bold text-[#355a9a]">
                {loadingDrivers ? 'Loading...' : `${onlineDrivers.length} online`}
              </span>
            </div>

            {loadingDrivers ? (
              <div className="space-y-2.5">
                <DriverCardSkeleton />
                <DriverCardSkeleton />
              </div>
            ) : onlineDrivers.length === 0 ? (
              <EmptyDeliveryState
                title="No active drivers"
                description="Try again in a few minutes or switch to scheduled delivery to set a window."
                actionHref="/delivery"
                actionLabel="Refresh Delivery"
              />
            ) : (
              <div className="space-y-2.5">
                {onlineDrivers.slice(0, 4).map((driver, index) => (
                  <AnimatedDriverCard key={driver.id} driver={driver} index={index} />
                ))}
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
