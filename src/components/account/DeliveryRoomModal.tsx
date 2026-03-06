'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Truck, X } from 'lucide-react';
import { withCsrfHeaders } from '@/lib/csrf';
import { useToast } from '@/context/ToastContext';
import { useOverlayDialog } from '@/lib/use-overlay-dialog';
import type { Order } from '@/types';

type DeliveryRoomParticipant = {
  id: string;
  name: string;
  role: 'buyer' | 'seller' | 'driver';
};

type DeliveryRoomMessage = {
  id: number;
  orderId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
};

interface DeliveryRoomModalProps {
  dateLocale: string;
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  userId: string;
}

const QUICK_REPLIES = [
  'I am on my way.',
  'I reached the pickup point.',
  'Please share a landmark.',
  'I have received the package.',
];

export function DeliveryRoomModal({ dateLocale, isOpen, onClose, order, userId }: DeliveryRoomModalProps) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<DeliveryRoomMessage[]>([]);
  const [participants, setParticipants] = useState<DeliveryRoomParticipant[]>([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useOverlayDialog<HTMLDivElement>({
    isOpen,
    onClose,
    initialFocusRef: inputRef,
  });

  const loadRoom = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/messages`);
      if (!res.ok) {
        throw new Error('Failed to load delivery room');
      }
      const payload = await res.json();
      setMessages(payload.messages || []);
      setParticipants(payload.participants || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load delivery room');
    } finally {
      setIsLoading(false);
    }
  }, [order.id, toast]);

  useEffect(() => {
    if (!isOpen) return;
    void loadRoom();

    const source = new EventSource(`/api/events?userId=${userId}`);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; table?: string };
        if (payload.type === 'update' && payload.table === 'order_messages') {
          void loadRoom();
        }
      } catch {
        // Ignore malformed event payloads.
      }
    };

    return () => {
      source.close();
    };
  }, [isOpen, loadRoom, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/messages`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ text: message.trim() }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(payload.error || 'Failed to send delivery room message');
      }

      setMessage('');
      void loadRoom();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send delivery room message');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Delivery room">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          ref={dialogRef}
          tabIndex={-1}
          className="relative bg-white w-full max-w-xl h-[640px] max-h-[86vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-[#dce5f7]"
        >
          <div className="p-4 border-b border-[#dce5f7] bg-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#e9f4ff] flex items-center justify-center">
                <Truck className="w-6 h-6 text-[#2f61b8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#18284a] truncate">{order.listingSnapshot?.title || 'Delivery Room'}</h3>
                    <p className="text-sm text-[#6f83ad]">Buyer, seller, and driver coordination</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-[#6f83ad]" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {participants.map((participant) => (
                    <span
                      key={`${participant.role}-${participant.id}`}
                      className="rounded-full bg-[#eef4ff] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#3159a8]"
                    >
                      {participant.role}: {participant.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#f5f8ff] p-4 space-y-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-sm font-medium text-[#6f83ad]">
                Loading delivery room...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 border border-[#dce5f7]">
                  <MessageCircle className="w-7 h-7 text-[#5f7fb7]" />
                </div>
                <h4 className="font-bold text-[#18284a] mb-2">Start the delivery room</h4>
                <p className="text-sm text-[#6f83ad]">Use this space to coordinate pickup, landmarks, and handoff timing.</p>
              </div>
            ) : (
              <>
                {messages.map((entry) => {
                  const isOwnMessage = entry.senderId === userId;
                  return (
                    <div
                      key={entry.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-white text-[#18284a] rounded-bl-md border border-[#dce5f7] shadow-sm'
                        }`}
                      >
                        <p className={`text-[11px] font-black uppercase tracking-wider ${isOwnMessage ? 'text-blue-100' : 'text-[#5f7fb7]'}`}>
                          {entry.senderName}
                        </p>
                        <p className="mt-1 text-sm whitespace-pre-wrap">{entry.text}</p>
                        <p className={`mt-2 text-[10px] ${isOwnMessage ? 'text-blue-100' : 'text-[#7d91b8]'}`}>
                          {new Date(entry.createdAt).toLocaleTimeString(dateLocale, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="border-t border-[#dce5f7] bg-white">
            <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto scrollbar-hide">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => setMessage(reply)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#f0f4ff] text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100"
                >
                  {reply}
                </button>
              ))}
            </div>
            <div className="p-4 flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Send a delivery update"
                className="flex-1 rounded-2xl border border-[#dce5f7] px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={isSending || !message.trim()}
                className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center disabled:bg-blue-300 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
