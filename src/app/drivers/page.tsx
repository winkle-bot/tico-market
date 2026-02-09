'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Truck } from 'lucide-react';
import { DriverProfileCard } from '@/components/drivers/DriverProfileCard';
import { DriversMap } from '@/components/drivers/DriversMap';
import type { DriverProfile, VehicleType } from '@/types';

const VEHICLE_OPTIONS: Array<{ label: string; value: VehicleType | 'all' }> = [
  { label: 'All Vehicles', value: 'all' },
  { label: 'Motorcycle', value: 'motorcycle' },
  { label: 'Car', value: 'car' },
  { label: 'Bike', value: 'bike' },
  { label: 'Walker', value: 'walker' },
];

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleType | 'all'>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/drivers?online=true');
        if (!res.ok) throw new Error('Failed to fetch drivers');
        const payload = await res.json();
        setDrivers(payload.data || []);
      } catch {
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    drivers.forEach((driver) => driver.specialties.forEach((specialty) => set.add(specialty)));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesVehicle = vehicleFilter === 'all' || driver.vehicleType === vehicleFilter;
      const matchesSpecialty = specialtyFilter === 'all' || driver.specialties.includes(specialtyFilter);
      return matchesVehicle && matchesSpecialty;
    });
  }, [drivers, specialtyFilter, vehicleFilter]);

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <header className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
        <div className="tm-shell py-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors" aria-label="Back to home">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-[#18284a] uppercase tracking-tight">Delivery Drivers</h1>
              <p className="text-sm text-[#6780b3]">Discover nearby drivers and request delivery.</p>
            </div>
          </div>

          <Link href="/delivery" className="tm-btn tm-btn-primary">
            <Truck className="w-4 h-4" /> Request Delivery
          </Link>
        </div>
      </header>

      <main className="tm-shell py-6 space-y-5">
        <DriversMap drivers={filteredDrivers} />

        <section className="bg-white rounded-2xl border border-[#dce5f7] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm text-[#334d80] font-semibold">
              Vehicle Type
              <select
                className="tm-input mt-1"
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value as VehicleType | 'all')}
              >
                {VEHICLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[#334d80] font-semibold">
              Specialty
              <select
                className="tm-input mt-1"
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
              >
                {allSpecialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty === 'all' ? 'All Specialties' : specialty}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section>
          {loading ? (
            <div className="py-16 text-center text-[#6780b3] font-medium">Loading drivers...</div>
          ) : filteredDrivers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#dce5f7] p-8 text-center text-[#6780b3]">
              No drivers match your filters right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDrivers.map((driver) => (
                <DriverProfileCard
                  key={driver.id}
                  driver={driver}
                  onRequest={() => {
                    window.location.href = '/delivery';
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
