'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { isPushSupported, isPushSubscribed, requestPushPermission, unsubscribePush } from '@/lib/push-client';
import { useToast } from '@/context/ToastContext';

export function NotificationSettings() {
  const toast = useToast();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const check = async () => {
      const sup = isPushSupported();
      setSupported(sup);
      if (sup) {
        setSubscribed(await isPushSubscribed());
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

  if (loading) return null;

  if (!supported) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      <h3 className="font-black text-gray-900 text-sm uppercase">Notifications</h3>

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
          className={`relative w-12 h-7 rounded-full transition-colors ${subscribed ? 'bg-blue-600' : 'bg-gray-300'
            } ${toggling ? 'opacity-50' : ''}`}
          aria-label={subscribed ? 'Disable push notifications' : 'Enable push notifications'}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${subscribed ? 'translate-x-5' : 'translate-x-0'
              }`}
          />
        </button>
      </div>
    </div>
  );
}
