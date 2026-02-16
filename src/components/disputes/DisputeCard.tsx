'use client';

import { AlertTriangle, CheckCircle, Clock, Eye } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import type { DisputeStatus } from '@/types';

interface DisputeCardProps {
  id: string;
  orderId: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  createdAt: string;
  onView?: (id: string) => void;
}

const statusConfig: Record<DisputeStatus, { label: string; style: string; icon: React.ReactNode }> = {
  open: { label: 'Open', style: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Clock className="w-3 h-3" /> },
  under_review: { label: 'Under Review', style: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Eye className="w-3 h-3" /> },
  resolved_buyer: { label: 'Resolved (Buyer)', style: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="w-3 h-3" /> },
  resolved_seller: { label: 'Resolved (Seller)', style: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="w-3 h-3" /> },
  resolved_refund: { label: 'Refunded', style: 'bg-purple-100 text-purple-700 border-purple-200', icon: <CheckCircle className="w-3 h-3" /> },
  closed: { label: 'Closed', style: 'bg-gray-100 text-gray-600 border-gray-200', icon: <CheckCircle className="w-3 h-3" /> },
};

const reasonLabels: Record<string, string> = {
  item_not_received: 'Item Not Received',
  item_not_as_described: 'Not As Described',
  damaged: 'Damaged',
  wrong_item: 'Wrong Item',
  seller_unresponsive: 'Seller Unresponsive',
  other: 'Other',
};

export function DisputeCard({ id, orderId, reason, description, status, createdAt, onView }: DisputeCardProps) {
  const { locale } = useI18n();
  const config = statusConfig[status] || statusConfig.open;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="font-bold text-sm text-gray-900">
            {reasonLabels[reason] || reason}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${config.style}`}>
          {config.icon}
          {config.label}
        </span>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{description}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Order: {orderId.slice(0, 8)}... • {new Date(createdAt).toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US')}
        </p>
        {onView && (
          <button
            onClick={() => onView(id)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}
