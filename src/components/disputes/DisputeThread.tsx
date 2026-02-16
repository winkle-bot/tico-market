'use client';

import { useState } from 'react';
import { Send, Shield, ShoppingBag, Store, Paperclip } from 'lucide-react';
import { withCsrfHeaders } from '@/lib/csrf';
import { useToast } from '@/context/ToastContext';
import type { DisputeMessage, DisputeStatus } from '@/types';

interface DisputeThreadProps {
  disputeId: string;
  messages: DisputeMessage[];
  status: DisputeStatus;
  currentUserId: string;
  onMessageSent: () => void;
}

const roleConfig: Record<string, { label: string; style: string; icon: React.ReactNode }> = {
  buyer: { label: 'Buyer', style: 'bg-blue-100 text-blue-700', icon: <ShoppingBag className="w-3 h-3" /> },
  seller: { label: 'Seller', style: 'bg-green-100 text-green-700', icon: <Store className="w-3 h-3" /> },
  admin: { label: 'Admin', style: 'bg-purple-100 text-purple-700', icon: <Shield className="w-3 h-3" /> },
};

export function DisputeThread({ disputeId, messages, status, currentUserId, onMessageSent }: DisputeThreadProps) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const isResolved = status === 'closed' || status.startsWith('resolved_');

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      setText('');
      onMessageSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          const role = roleConfig[msg.senderRole] || roleConfig.buyer;

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isOwn ? 'order-2' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${role.style}`}>
                    {role.icon}
                    {role.label}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {msg.senderName || 'Unknown'}
                  </span>
                </div>
                <div className={`rounded-2xl px-4 py-2.5 ${
                  isOwn
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
                {msg.evidenceUrls && msg.evidenceUrls.length > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Paperclip className="w-3 h-3" />
                    {msg.evidenceUrls.length} attachment{msg.evidenceUrls.length > 1 ? 's' : ''}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(msg.createdAt).toLocaleString('es-CR')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {isResolved ? (
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
          <p className="text-sm text-gray-500">This dispute has been resolved</p>
        </div>
      ) : (
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              maxLength={2000}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none text-sm"
            />
            <button
              onClick={sendMessage}
              disabled={isSending || !text.trim()}
              className="px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
