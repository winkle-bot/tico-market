'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Truck, UserPlus } from 'lucide-react';
import { DriverProfileCard } from '@/components/drivers/DriverProfileCard';
import { DriversMap } from '@/components/drivers/DriversMap';
import type { DriverProfile, VehicleType } from '@/types';
import { useI18n } from '@/context/I18nContext';

export default function DriversPage() {
  const { t } = useI18n();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleType | 'all'>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true);
        setFetchError(false);
        const res = await fetch('/api/drivers?online=true');
        if (!res.ok) throw new Error('Failed to fetch drivers');
        const payload = await res.json();
        setDrivers(payload.data || []);
      } catch {
        setDrivers([]);
        setFetchError(true);
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
              <h1 className="text-2xl font-black text-[#18284a] uppercase tracking-tight">{t('drivers.title', 'Delivery Drivers')}</h1>
              <p className="text-sm text-[#6780b3]">{t('drivers.subtitle', 'Discover nearby drivers and request delivery')}</p>
            </div>
          </div>

          <Link href="/delivery" className="tm-btn tm-btn-primary">
            <Truck className="w-4 h-4" /> {t('drivers.requestDelivery', 'Request Delivery')}
          </Link>
        </div>
      </header>

      <main className="tm-shell py-6 space-y-5">
        <DriversMap drivers={filteredDrivers} />

        <section className="bg-white rounded-2xl border border-[#dce5f7] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm text-[#334d80] font-semibold">
              {t('drivers.vehicleType', 'Vehicle Type')}
              <select
                className="tm-input mt-1"
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value as VehicleType | 'all')}
              >
                <option value="all">{t('drivers.allVehicles', 'All Vehicles')}</option>
                <option value="motorcycle">{t('drivers.motorcycle', 'Motorcycle')}</option>
                <option value="car">{t('drivers.car', 'Car')}</option>
                <option value="bike">{t('drivers.bike', 'Bike')}</option>
                <option value="walker">{t('drivers.walker', 'Walker')}</option>
              </select>
            </label>

            <label className="text-sm text-[#334d80] font-semibold">
              {t('drivers.specialty', 'Specialty')}
              <select
                className="tm-input mt-1"
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
              >
                {allSpecialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty === 'all' ? t('drivers.allSpecialties', 'All Specialties') : specialty}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section>
          {loading ? (
            <div className="py-16 text-center text-[#6780b3] font-medium">{t('drivers.loading', 'Loading drivers...')}</div>
          ) : fetchError ? (
            <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
              <p className="text-red-600 font-bold mb-3">{t('drivers.loadError', 'Could not load drivers')}</p>
              <p className="text-gray-500 text-sm mb-4">{t('drivers.loadErrorDescription', 'Please check your connection and try again.')}</p>
              <button onClick={() => window.location.reload()} className="tm-btn tm-btn-primary">
                {t('common.tryAgain', 'Try Again')}
              </button>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[#dce5f7] p-8 text-center text-[#6780b3]">
                {t('drivers.noDrivers', 'No drivers match your filters right now')}
              </div>
              <div className="rounded-2xl border border-[#dce5f7] bg-gradient-to-br from-[#1f4fbf] to-[#1a3d9e] p-5 text-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-white/20 p-2.5">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-wide">{t('drivers.beTheFirst', 'Be the First')}</h3>
                      <p className="mt-1 text-sm text-white/80">{t('drivers.joinNetwork', 'Join our delivery network and start earning today.')}</p>
                    </div>
                  </div>
                  <Link href="/driver-application" className="tm-btn bg-white text-[#1f4fbf] hover:bg-white/90 shrink-0">
                    {t('drivers.applyToDrive', 'Apply to Drive')}
                  </Link>
                </div>
              </div>
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
