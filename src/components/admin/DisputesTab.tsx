'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { withCsrfHeaders } from '@/lib/csrf';
import type { DisputeStatus } from '@/types';

interface AdminDispute {
  id: string;
  orderId: string;
  openedBy: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  order?: {
    id: string;
    buyerId: string;
    buyerName: string;
    sellerId: string;
    sellerName: string;
    status: string;
    listingTitle: string;
  };
}

interface DisputeMessage {
  id: string;
  senderRole: string;
  senderName: string;
  text: string;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-blue-100 text-blue-700',
  resolved_buyer: 'bg-green-100 text-green-700',
  resolved_seller: 'bg-green-100 text-green-700',
  resolved_refund: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-100 text-gray-600',
};

const reasonLabels: Record<string, string> = {
  item_not_received: 'Item Not Received',
  item_not_as_described: 'Not As Described',
  damaged: 'Damaged',
  wrong_item: 'Wrong Item',
  seller_unresponsive: 'Seller Unresponsive',
  other: 'Other',
};

export function DisputesTab({
  disputes,
  onUpdate,
}: {
  disputes: AdminDispute[];
  onUpdate: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/disputes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data?.messages || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMessages(false);
    }
  };

  const resolveDispute = async (id: string, status: DisputeStatus) => {
    if (!resolutionNotes.trim()) return;
    setResolving(id);
    try {
      await fetch(`/api/admin/disputes/${id}`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status, resolutionNotes: resolutionNotes.trim() }),
      });
      setResolutionNotes('');
      setExpandedId(null);
      onUpdate();
    } catch {
      // ignore
    } finally {
      setResolving(null);
    }
  };

  const activeDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'under_review');
  const resolvedDisputes = disputes.filter((d) => d.status !== 'open' && d.status !== 'under_review');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-bold text-gray-600">
          {activeDisputes.length} active • {resolvedDisputes.length} resolved
        </span>
      </div>

      {disputes.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No disputes yet</p>
      )}

      {disputes.map((dispute) => {
        const isExpanded = expandedId === dispute.id;
        const isActive = dispute.status === 'open' || dispute.status === 'under_review';

        return (
          <div key={dispute.id} className="rounded-xl bg-gray-50 overflow-hidden">
            <button
              onClick={() => toggleExpand(dispute.id)}
              className="w-full p-3 flex items-center gap-3 text-left hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusStyles[dispute.status] || ''}`}>
                    {dispute.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {reasonLabels[dispute.reason] || dispute.reason}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">
                  {dispute.order?.listingTitle || 'Unknown Item'}
                </p>
                <p className="text-xs text-gray-500">
                  {dispute.order?.buyerName} vs {dispute.order?.sellerName}
                </p>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 border-t border-gray-200">
                <div className="mt-3 mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Description</p>
                  <p className="text-sm text-gray-700">{dispute.description}</p>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Messages
                  </p>
                  {loadingMessages ? (
                    <p className="text-xs text-gray-400">Loading...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-gray-400">No messages</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {messages.map((msg) => (
                        <div key={msg.id} className="text-xs bg-white rounded-lg p-2">
                          <span className="font-bold capitalize">{msg.senderRole}</span>
                          <span className="mx-1 text-gray-400">•</span>
                          <span className="text-gray-500">{msg.senderName}</span>
                          <p className="text-gray-700 mt-0.5">{msg.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {dispute.resolutionNotes && (
                  <div className="mb-3 bg-green-50 rounded-lg p-2">
                    <p className="text-xs font-bold text-green-700">Resolution Notes</p>
                    <p className="text-xs text-green-600">{dispute.resolutionNotes}</p>
                  </div>
                )}

                {isActive && (
                  <div className="space-y-2 border-t border-gray-200 pt-3">
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Resolution notes (required)..."
                      rows={2}
                      className="w-full p-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-blue-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveDispute(dispute.id, 'resolved_buyer')}
                        disabled={!!resolving || !resolutionNotes.trim()}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Favor Buyer
                      </button>
                      <button
                        onClick={() => resolveDispute(dispute.id, 'resolved_seller')}
                        disabled={!!resolving || !resolutionNotes.trim()}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Favor Seller
                      </button>
                      <button
                        onClick={() => resolveDispute(dispute.id, 'resolved_refund')}
                        disabled={!!resolving || !resolutionNotes.trim()}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Refund
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
