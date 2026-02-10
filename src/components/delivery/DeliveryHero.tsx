import { Bike, Clock3, ShieldCheck, Truck } from 'lucide-react';

interface DeliveryHeroProps {
  onlineDrivers: number;
}

const HERO_STATS = [
  { label: 'Fast dispatch', value: '5-10 min', icon: Clock3 },
  { label: 'Live coverage', value: 'GAM wide', icon: Truck },
  { label: 'Trusted riders', value: 'Verified', icon: ShieldCheck },
];

export function DeliveryHero({ onlineDrivers }: DeliveryHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-[#dce5f7] bg-gradient-to-br from-[#183770] via-[#1f4fbf] to-[#2b6ee5] p-5 text-white shadow-[0_20px_50px_rgba(19,47,110,0.35)] sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-[#71f0d0]/20 blur-2xl"
      />

      <div className="relative space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
          <Bike className="h-3.5 w-3.5" />
          Live delivery network
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black leading-tight sm:text-3xl">Delivery Marketplace</h1>
          <p className="max-w-xl text-sm text-[#d7e5ff] sm:text-base">
            Launch quick drops, schedule priority pickups, and track available drivers in real time across Costa Rica.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#c8dcff]">Online now</p>
            <p className="mt-1 text-2xl font-black">{onlineDrivers}</p>
          </div>
          {HERO_STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-[#c8dcff]">{stat.label}</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-black">
                  <Icon className="h-4 w-4" /> {stat.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
