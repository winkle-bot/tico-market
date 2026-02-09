"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, Send, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { withCsrfHeaders } from '@/lib/csrf';

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
  createdAt: string;
  read?: boolean;
}

interface Conversation {
  listingId: number;
  otherPartyId: string;
  messages: Message[];
}

export default function ChatModal({ isOpen, onClose, listing, currentUser, onAuthRequired, chatWithName, chatWithId }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedMessagesRef = useRef(false);

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
    if (!newMessage.trim() || !currentUser || isSending) return;

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
    
    setIsSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          listingId: listing.id,
          buyerId,
          buyerName,
          sellerId,
          sellerName,
          senderId: currentUser.id,
          text: newMessage.trim()
        })
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
        // Refresh immediately
        void loadMessages();
      }
    } catch (err) {
      console.error('Error sending message:', err);
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
              <p className="text-sm text-[#6f83ad]">Chat with {chatWithName || listing.owner}</p>
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
                <h4 className="font-bold text-[#18284a] mb-2">Sign in to message</h4>
                <p className="text-sm text-[#6f83ad] mb-4">Create an account to contact sellers</p>
                <button
                  onClick={() => { onClose(); onAuthRequired(); }}
                  className="tm-btn tm-btn-primary rounded-full px-6"
                >
                  Sign In / Sign Up
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
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.senderId === currentUser.id ? 'text-blue-200' : 'text-[#7d91b8]'
                      }`}>
                        {new Date(msg.createdAt).toLocaleTimeString('es-CR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          {currentUser && (
            <div className="p-4 border-t border-[#dce5f7] bg-white">
              <div className="flex gap-2">
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
                  disabled={!newMessage.trim() || isSending}
                  className="tm-btn tm-btn-primary px-3 min-w-12 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
