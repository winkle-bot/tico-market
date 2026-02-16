'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, MessageCircle, Phone } from 'lucide-react';
import { isPushSupported, isPushSubscribed, requestPushPermission, unsubscribePush } from '@/lib/push-client';
import { withCsrfHeaders } from '@/lib/csrf';
import { useToast } from '@/context/ToastContext';

export function NotificationSettings() {
  const toast = useToast();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // WhatsApp state
  const [whatsappOptedIn, setWhatsappOptedIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  useEffect(() => {
    const check = async () => {
      const sup = isPushSupported();
      setSupported(sup);
      if (sup) {
        setSubscribed(await isPushSubscribed());
      }

      // Load notification preferences
      try {
        const res = await fetch('/api/notifications/preferences');
        if (res.ok) {
          const { data } = await res.json();
          setWhatsappOptedIn(data?.whatsappOptedIn || false);
          setPhoneNumber(data?.phoneNumber || '');
        }
      } catch {
        // ignore
      }

      setLoading(false);
    };
    check();
  }, []);

  const togglePush = async () => {
    setToggling(true);
    try {
      if (subscribed) {
        const success = await unsubscribePush();
        if (success) {
          setSubscribed(false);
          toast.success('Push notifications disabled');
        } else {
          toast.error('Failed to disable notifications');
        }
      } else {
        const success = await requestPushPermission();
        if (success) {
          setSubscribed(true);
          toast.success('Push notifications enabled');
        } else {
          toast.error('Could not enable notifications. Check browser permissions.');
        }
      }
    } finally {
      setToggling(false);
    }
  };

  const saveWhatsapp = async (optIn: boolean) => {
    if (optIn && !phoneNumber.trim()) {
      toast.error('Please enter your phone number first');
      return;
    }

    setSavingWhatsapp(true);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          whatsappOptedIn: optIn,
          phoneNumber: phoneNumber.trim() || null,
          whatsappMessages: optIn,
          whatsappOrders: optIn,
        }),
      });

      if (res.ok) {
        setWhatsappOptedIn(optIn);
        toast.success(optIn ? 'WhatsApp notifications enabled' : 'WhatsApp notifications disabled');
      } else {
        toast.error('Failed to update WhatsApp settings');
      }
    } finally {
      setSavingWhatsapp(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      <h3 className="font-black text-gray-900 text-sm uppercase">Notifications</h3>

      {/* Push Notifications */}
      {supported && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {subscribed ? (
              <Bell className="w-5 h-5 text-blue-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-bold text-gray-900">Push Notifications</p>
              <p className="text-xs text-gray-500">
                {subscribed ? 'Alerts for messages and orders' : 'Enable to get notified instantly'}
              </p>
            </div>
          </div>
          <button
            onClick={togglePush}
            disabled={toggling}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              subscribed ? 'bg-blue-600' : 'bg-gray-300'
            } ${toggling ? 'opacity-50' : ''}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                subscribed ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}

      {/* WhatsApp Notifications */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-3 mb-3">
          <MessageCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-bold text-gray-900">WhatsApp Notifications</p>
            <p className="text-xs text-gray-500">
              Get order and message alerts on WhatsApp
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+506 8888-8888"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {whatsappOptedIn ? 'WhatsApp alerts active' : 'Opt in to receive WhatsApp alerts'}
            </span>
            <button
              onClick={() => saveWhatsapp(!whatsappOptedIn)}
              disabled={savingWhatsapp}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                whatsappOptedIn ? 'bg-green-600' : 'bg-gray-300'
              } ${savingWhatsapp ? 'opacity-50' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  whatsappOptedIn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
