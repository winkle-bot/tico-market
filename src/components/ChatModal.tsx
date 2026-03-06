"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, Send, MessageCircle, ImagePlus, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { withCsrfHeaders } from '@/lib/csrf';
import { useI18n } from '@/context/I18nContext';
import { useToast } from '@/context/ToastContext';
import { TranslatableText } from '@/components/TranslatableText';
import { enqueueJsonMutation, isOfflineMutationError } from '@/lib/offline-queue';
import type { MessageAttachment } from '@/types';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: number;
    title: string;
    sellerId: string;
    owner: string;
    imageUrl?: string;
  };
  currentUser: {
    id: string;
    name: string;
  } | null;
  onAuthRequired: () => void;
  chatWithName?: string; // Override for "Chat with X" when opening from messages
  chatWithId?: string; // Specific user ID to chat with (essential for sellers)
}

interface Message {
  id: number;
  senderId: string;
  text: string;
  attachments?: MessageAttachment[];
  createdAt: string;
  read?: boolean;
  pending?: boolean;
}

interface Conversation {
  listingId: number;
  otherPartyId: string;
  messages: Message[];
}

export default function ChatModal({ isOpen, onClose, listing, currentUser, onAuthRequired, chatWithName, chatWithId }: ChatModalProps) {
  const { t } = useI18n();
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedMessagesRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async () => {
    if (!currentUser) return;

    // Only show loading on initial fetch.
    if (!hasLoadedMessagesRef.current) setIsLoading(true);

    try {
      const res = await fetch(`/api/messages?userId=${currentUser.id}`);
      if (!res.ok) {
        throw new Error('Failed to load conversations');
      }
      const conversations = (await res.json()) as Conversation[];

      // Find conversation for this listing
      // If chatWithId is provided, look for that specific conversation
      // Otherwise, default to finding the conversation where the other party is the seller
      const conv = conversations.find((c) => {
        if (c.listingId !== listing.id) return false;

        if (chatWithId) {
          return c.otherPartyId === chatWithId;
        }

        // Default behavior (Buyer clicking "Chat" on listing)
        // We want the conversation with the seller
        return c.otherPartyId === listing.sellerId;
      });
      
      if (conv) {
        // Only update if we have new messages or count changed
        // Simple length check for now, could be more robust
        setMessages((prev) => {
          if (prev.length !== conv.messages.length) return conv.messages;
          // Check last message ID
          if (prev.length > 0 && conv.messages.length > 0 && prev[prev.length - 1].id !== conv.messages[conv.messages.length - 1].id) {
            return conv.messages;
          }
          return prev;
        });

        // Check for unread messages and mark them as read
        const hasUnread = conv.messages.some((m) => !m.read && m.senderId !== currentUser.id);
        if (hasUnread) {
           const targetId = chatWithId || (currentUser.id === listing.sellerId ? null : listing.sellerId);
           if (targetId) {
             fetch('/api/messages', {
               method: 'PATCH',
               headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
               body: JSON.stringify({
                 userId: currentUser.id,
                 listingId: listing.id,
                 otherPartyId: targetId
               })
             }).catch((error: unknown) => {
               console.error('Failed to mark messages as read:', error);
             });
           }
        }
      } else {
        setMessages([]);
      }
      hasLoadedMessagesRef.current = true;
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [chatWithId, currentUser, listing.id, listing.sellerId]);

  useEffect(() => {
    if (isOpen && currentUser) {
      void loadMessages();

      // Use SSE for real-time updates instead of polling
      const eventSource = new EventSource(`/api/events?userId=${currentUser.id}`);

      eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data) as { type?: string };
        if (data.type === 'update') {
          void loadMessages();
        }
      };

      return () => {
        eventSource.close();
      };
    }
    return undefined;
  }, [currentUser, isOpen, loadMessages]);

  useEffect(() => {
    if (!isOpen) {
      hasLoadedMessagesRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !pendingImage && !pendingLocation) || !currentUser || isSending) return;

    // Determine roles
    // If I am the seller, the "buyer" is the person I'm chatting with (chatWithId)
    // If I am the buyer, I am the buyer.
    
    let buyerId, buyerName, sellerId, sellerName;

    if (currentUser.id === listing.sellerId) {
      // I am the seller
      sellerId = currentUser.id;
      sellerName = currentUser.name;
      
      // I must know who the buyer is to reply!
      if (!chatWithId) {
        console.error("Cannot reply without a buyer ID (chatWithId)");
        return;
      }
      buyerId = chatWithId;
      buyerName = chatWithName || 'Buyer'; // Fallback
    } else {
      // I am the buyer
      buyerId = currentUser.id;
      buyerName = currentUser.name;
      sellerId = listing.sellerId;
      sellerName = listing.owner;
    }

    const locationAttachments = pendingLocation
      ? [
          {
            type: 'location' as const,
            lat: pendingLocation.lat,
            lng: pendingLocation.lng,
            label: pendingLocation.label,
          },
        ]
      : [];
    const queuedPayload = {
      listingId: listing.id,
      buyerId,
      buyerName,
      sellerId,
      sellerName,
      senderId: currentUser.id,
      text: newMessage.trim(),
      attachments: locationAttachments,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (pendingImage) {
        toast.error('Image attachments need a connection to send.');
        return;
      }

      await enqueueJsonMutation({
        url: '/api/messages',
        method: 'POST',
        body: queuedPayload,
        headers: { 'Content-Type': 'application/json' },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: -Date.now(),
          senderId: currentUser.id,
          text: newMessage.trim(),
          attachments: locationAttachments,
          createdAt: new Date().toISOString(),
          read: false,
          pending: true,
        },
      ]);
      setNewMessage('');
      setPendingLocation(null);
      toast.success('Message queued for sync');
      return;
    }
    
    setIsSending(true);
    try {
      const requestInit: RequestInit =
        pendingImage || pendingLocation
          ? {
              method: 'POST',
              headers: withCsrfHeaders(),
              body: (() => {
                const formData = new FormData();
                formData.set('listingId', String(listing.id));
                formData.set('buyerId', buyerId);
                formData.set('buyerName', buyerName);
                formData.set('sellerId', sellerId);
                formData.set('sellerName', sellerName);
                formData.set('text', newMessage.trim());
                if (pendingImage) {
                  formData.set('image', pendingImage);
                }
                if (pendingLocation) {
                  formData.set('locationLat', String(pendingLocation.lat));
                  formData.set('locationLng', String(pendingLocation.lng));
                  if (pendingLocation.label) {
                    formData.set('locationLabel', pendingLocation.label);
                  }
                }
                return formData;
              })(),
            }
          : {
              method: 'POST',
              headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify(queuedPayload),
            };

      const res = await fetch('/api/messages', requestInit);

      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
        setPendingImage(null);
        setPendingLocation(null);
        // Refresh immediately
        void loadMessages();
      } else {
        const payload = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(payload.error || 'Could not send message');
      }
    } catch (err) {
      if (isOfflineMutationError(err) && !pendingImage) {
        await enqueueJsonMutation({
          url: '/api/messages',
          method: 'POST',
          body: queuedPayload,
          headers: { 'Content-Type': 'application/json' },
        });
        setMessages((prev) => [
          ...prev,
          {
            id: -Date.now(),
            senderId: currentUser.id,
            text: newMessage.trim(),
            attachments: locationAttachments,
            createdAt: new Date().toISOString(),
            read: false,
            pending: true,
          },
        ]);
        setNewMessage('');
        setPendingLocation(null);
        toast.success('Message queued for sync');
      } else {
        console.error('Error sending message:', err);
        toast.error(err instanceof Error ? err.message : 'Could not send message');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handlePickLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPendingLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'Shared location',
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('chat.title', 'Chat')}>
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
          className="relative bg-white w-full max-w-lg h-[600px] max-h-[84vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-[#dce5f7]"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#dce5f7] flex items-center gap-4 bg-white">
            <div className="w-12 h-12 rounded-2xl bg-[#e7efff] flex items-center justify-center overflow-hidden relative">
              {listing.imageUrl ? (
                <Image src={listing.imageUrl} alt={listing.title} fill sizes="48px" className="object-cover" />
              ) : (
                <MessageCircle className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[#18284a] truncate">{listing.title}</h3>
              <p className="text-sm text-[#6f83ad]">{t('chat.chatWith', 'Chat with')} {chatWithName || listing.owner}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[#6f83ad]" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f5f8ff]">
            {!currentUser ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-bold text-[#18284a] mb-2">{t('chat.signInToMessage', 'Sign in to message')}</h4>
                <p className="text-sm text-[#6f83ad] mb-4">{t('chat.createAccountToContact', 'Create an account to contact sellers')}</p>
                <button
                  onClick={() => { onClose(); onAuthRequired(); }}
                  className="tm-btn tm-btn-primary rounded-full px-6"
                >
                  {t('chat.signInSignUp', 'Sign In / Sign Up')}
                </button>
              </div>
            ) : isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-pulse text-gray-400 font-medium">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-gray-300" />
                </div>
                <h4 className="font-bold text-[#18284a] mb-2">Start a conversation</h4>
                <p className="text-sm text-[#6f83ad]">Send a message about this listing</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                        msg.senderId === currentUser.id
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white text-[#18284a] rounded-bl-md shadow-sm border border-[#dce5f7]'
                      }`}
                    >
                      {msg.attachments?.map((attachment, index) => {
                        if (attachment.type === 'image' && attachment.signedUrl) {
                          return (
                            <div key={`${msg.id}-attachment-${index}`} className="mb-2 overflow-hidden rounded-2xl">
                              <Image
                                src={attachment.signedUrl}
                                alt={attachment.fileName || 'Message attachment'}
                                width={220}
                                height={220}
                                className="h-auto w-full max-w-[220px] object-cover"
                              />
                            </div>
                          );
                        }

                        if (attachment.type === 'location') {
                          return (
                            <a
                              key={`${msg.id}-attachment-${index}`}
                              href={`https://www.google.com/maps/search/?api=1&query=${attachment.lat},${attachment.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`mb-2 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold ${
                                msg.senderId === currentUser.id ? 'bg-blue-500 text-white' : 'bg-[#eef4ff] text-[#32569a]'
                              }`}
                            >
                              <MapPin className="h-4 w-4" />
                              {attachment.label || 'Shared location'}
                            </a>
                          );
                        }

                        return null;
                      })}
                      {msg.text && (
                        <TranslatableText
                          text={msg.text}
                          context="message"
                          textClassName="text-sm"
                          metaClassName={msg.senderId === currentUser.id ? 'text-blue-200' : 'text-[#7d91b8]'}
                          translatedMetaClassName={msg.senderId === currentUser.id ? 'text-blue-100' : 'text-blue-600'}
                          buttonClassName={msg.senderId === currentUser.id ? 'text-blue-100 hover:text-white' : 'text-[#5b78b5] hover:text-[#274f99]'}
                        />
                      )}
                      <p className={`text-[10px] mt-1 ${
                        msg.senderId === currentUser.id ? 'text-blue-200' : 'text-[#7d91b8]'
                      }`}>
                        {new Date(msg.createdAt).toLocaleTimeString('es-CR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                        {msg.pending ? ' • queued' : ''}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Quick Replies + Input Area */}
          {currentUser && (
            <div className="border-t border-[#dce5f7] bg-white">
              {/* Quick reply buttons */}
              <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto scrollbar-hide">
                {(currentUser.id === listing.sellerId
                  ? [
                      { label: 'Still available', text: 'Yes, this is still available!' },
                      { label: 'Sold', text: 'Sorry, this item has been sold.' },
                      { label: 'Price is firm', text: 'The price is firm, thank you.' },
                      { label: 'Send offer', text: 'Feel free to make an offer!' },
                    ]
                  : [
                      { label: 'Available?', text: 'Hi! Is this still available?' },
                      { label: 'Lowest price?', text: 'What is the lowest price you can do?' },
                      { label: 'Can deliver?', text: 'Can you deliver this item?' },
                      { label: 'When pickup?', text: 'When can I pick this up?' },
                    ]
                ).map((qr) => (
                  <button
                    key={qr.label}
                    type="button"
                    onClick={() => setNewMessage(qr.text)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#f0f4ff] text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
              {(pendingImage || pendingLocation) && (
                <div className="px-4 pt-2 flex flex-wrap gap-2">
                  {pendingImage && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#edf4ff] px-3 py-1.5 text-xs font-bold text-[#32569a]">
                      <ImagePlus className="h-3.5 w-3.5" />
                      <span className="max-w-[180px] truncate">{pendingImage.name}</span>
                      <button type="button" onClick={() => setPendingImage(null)} aria-label="Remove image">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {pendingLocation && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#edf4ff] px-3 py-1.5 text-xs font-bold text-[#32569a]">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{pendingLocation.label || 'Location ready'}</span>
                      <button type="button" onClick={() => setPendingLocation(null)} aria-label="Remove location">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="p-4 pt-2 flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setPendingImage(file);
                    }
                    event.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="tm-btn px-3 min-w-12 border border-[#dce5f7] bg-white text-[#32569a] hover:bg-[#edf4ff]"
                  aria-label="Attach image"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handlePickLocation}
                  className="tm-btn px-3 min-w-12 border border-[#dce5f7] bg-white text-[#32569a] hover:bg-[#edf4ff]"
                  aria-label="Share location"
                >
                  <MapPin className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  className="tm-input flex-1 font-medium"
                />
                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && !pendingImage && !pendingLocation) || isSending}
                  className="tm-btn tm-btn-primary px-3 min-w-12 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
