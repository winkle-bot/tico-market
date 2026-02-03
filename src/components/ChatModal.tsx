"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
}

interface Message {
  id: number;
  senderId: string;
  text: string;
  createdAt: string;
}

export default function ChatModal({ isOpen, onClose, listing, currentUser, onAuthRequired }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      loadMessages();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/messages?userId=${currentUser.id}`);
      const conversations = await res.json();
      
      // Find conversation for this listing
      const conv = conversations.find((c: any) => 
        c.listingId === listing.id && 
        (c.otherPartyId === listing.sellerId || currentUser.id === listing.sellerId)
      );
      
      if (conv) {
        setMessages(conv.messages);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || isSending) return;

    const isBuyer = currentUser.id !== listing.sellerId;
    
    setIsSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          buyerId: isBuyer ? currentUser.id : listing.sellerId,
          buyerName: isBuyer ? currentUser.name : listing.owner,
          sellerId: listing.sellerId,
          sellerName: listing.owner,
          senderId: currentUser.id,
          text: newMessage.trim()
        })
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
          className="relative bg-white w-full max-w-lg h-[600px] max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center gap-4 bg-white">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center overflow-hidden">
              {listing.imageUrl ? (
                <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <MessageCircle className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{listing.title}</h3>
              <p className="text-sm text-gray-500">Chat with {listing.owner}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {!currentUser ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Sign in to message</h4>
                <p className="text-sm text-gray-500 mb-4">Create an account to contact sellers</p>
                <button
                  onClick={() => { onClose(); onAuthRequired(); }}
                  className="bg-blue-600 text-white font-bold px-6 py-3 rounded-full hover:bg-blue-700 transition-colors"
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
                <h4 className="font-bold text-gray-900 mb-2">Start a conversation</h4>
                <p className="text-sm text-gray-500">Send a message about this listing</p>
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
                          : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.senderId === currentUser.id ? 'text-blue-200' : 'text-gray-400'
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
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
