'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { withCsrfHeaders } from '@/lib/csrf';
import { DisputesTab } from '@/components/admin/DisputesTab';
import type { Report, Dispute } from '@/types';

type AdminListing = {
  id: number;
  title: string;
  owner: string;
  price: string;
  moderationStatus: 'active' | 'hidden';
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'moderator';
  verified: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { t } = useI18n();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [listingsRes, usersRes, reportsRes, disputesRes] = await Promise.all([
        fetch('/api/admin/listings'),
        fetch('/api/admin/users'),
        fetch('/api/admin/reports'),
        fetch('/api/admin/disputes'),
      ]);

      if (!listingsRes.ok || !usersRes.ok || !reportsRes.ok) {
        throw new Error('Admin data load failed');
      }

      setListings(await listingsRes.json());
      setUsers(await usersRes.json());
      setReports(await reportsRes.json());
      if (disputesRes.ok) {
        const disputeData = await disputesRes.json();
        setDisputes(disputeData.data || []);
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Could not load admin data';
      setError(message);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/');
      return;
    }
    if (user.role !== 'admin' && user.role !== 'moderator') {
      router.push('/account');
      return;
    }
    loadData();
  }, [user, isLoading, router]);

  const updateListingStatus = async (id: number, moderationStatus: 'active' | 'hidden') => {
    await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ moderationStatus }),
    });
    await loadData();
  };

  const updateUser = async (id: string, payload: Partial<Pick<AdminUser, 'role' | 'verified'>>) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    await loadData();
  };

  const updateReportStatus = async (id: number, status: 'open' | 'resolved' | 'dismissed') => {
    await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status }),
    });
    await loadData();
  };

  if (isLoading || !user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 uppercase">{t('admin.dashboard', 'Admin Dashboard')}</h1>
          <Link href="/account" className="text-blue-600 font-bold hover:underline">{t('admin.backToAccount', 'Back to account')}</Link>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 mb-3 uppercase text-sm">{t('admin.listingsModeration', 'Listings Moderation')}</h2>
          <div className="space-y-2">
            {listings.map((listing) => (
              <div key={listing.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{listing.title}</p>
                  <p className="text-xs text-gray-500">{t('admin.seller', 'Seller')}: {listing.owner} • {listing.price}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  listing.moderationStatus === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {listing.moderationStatus}
                </span>
                <button
                  onClick={() => updateListingStatus(listing.id, listing.moderationStatus === 'active' ? 'hidden' : 'active')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                  {listing.moderationStatus === 'active' ? t('admin.hide', 'Hide') : t('admin.restore', 'Restore')}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 mb-3 uppercase text-sm">{t('admin.userRoles', 'User Roles')}</h2>
          <div className="space-y-2">
            {users.map((adminUser) => (
              <div key={adminUser.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{adminUser.name}</p>
                  <p className="text-xs text-gray-500 truncate">{adminUser.email}</p>
                </div>
                <select
                  value={adminUser.role}
                  onChange={(e) => updateUser(adminUser.id, { role: e.target.value as AdminUser['role'] })}
                  className="text-xs border border-gray-200 rounded-lg p-1.5"
                >
                  <option value="user">user</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </select>
                <button
                  onClick={() => updateUser(adminUser.id, { verified: !adminUser.verified })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    adminUser.verified ? 'bg-gray-200 text-gray-700' : 'bg-green-600 text-white'
                  }`}
                >
                  {adminUser.verified ? t('admin.unverify', 'Unverify') : t('admin.verify', 'Verify')}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 mb-3 uppercase text-sm">{t('disputes.title', 'Disputes')}</h2>
          <DisputesTab disputes={disputes} onUpdate={loadData} />
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 mb-3 uppercase text-sm">{t('admin.reports', 'Reports')}</h2>
          <div className="space-y-2">
            {reports.map((report) => (
              <div key={report.id} className="p-3 rounded-xl bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm text-gray-900">
                    {report.targetType} report #{report.id}
                  </p>
                  <span className="text-xs font-bold text-gray-500">{report.status}</span>
                </div>
                <p className="text-sm text-gray-700">{report.reason}</p>
                {report.details && <p className="text-xs text-gray-500 mt-1">{report.details}</p>}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => updateReportStatus(report.id, 'resolved')}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold"
                  >
                    {t('admin.resolve', 'Resolve')}
                  </button>
                  <button
                    onClick={() => updateReportStatus(report.id, 'dismissed')}
                    className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-bold"
                  >
                    {t('admin.dismiss', 'Dismiss')}
                  </button>
                  <button
                    onClick={() => updateReportStatus(report.id, 'open')}
                    className="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-bold"
                  >
                    {t('admin.reopen', 'Reopen')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
