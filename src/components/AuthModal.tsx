'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_ROUTES, MODAL_BACKDROP_VARIANTS } from '@/config/constants';
import type { AuthFormState } from '@/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
  formState: AuthFormState;
  onFormChange: (state: AuthFormState) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  mode,
  onModeChange,
  formState,
  onFormChange,
}: AuthModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const handleAuth = async () => {
    setError(null);
    // Basic validation
    const newErrors: { [key: string]: string } = {};
    if (!formState.email.includes('@')) newErrors['email'] = 'Invalid email';
    if (formState.password.length < 6) newErrors['password'] = 'Password too short (min 6 chars)';
    if (mode === 'signup' && !formState.name.trim()) newErrors['name'] = 'Name required';

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }
    
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const res = await fetch(API_ROUTES.AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formState, action: mode }),
      });

      const data = await res.json();

      if (res.ok) {
        onClose();
        // Reset form
        onFormChange({ email: '', password: '', name: '' });
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            {...MODAL_BACKDROP_VARIANTS}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
          >
            <h2 className="text-2xl font-black text-gray-900 uppercase mb-6">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <div className="space-y-4">
              {mode === 'signup' && (
                <div key="name-field">
                  <input
                    type="text"
                    placeholder="Full Name"
                    className={`w-full p-4 bg-gray-50 rounded-2xl border-2 ${
                      fieldErrors.name ? 'border-red-500' : 'border-gray-100'
                    } focus:border-blue-500 focus:outline-none font-bold`}
                    value={formState.name}
                    onChange={(e) =>
                      onFormChange({ ...formState, name: e.target.value })
                    }
                  />
                  {fieldErrors.name && (
                    <p className="text-red-500 text-xs font-bold mt-1 px-2">{fieldErrors.name}</p>
                  )}
                </div>
              )}
              <div>
                <input
                  type="email"
                  placeholder="Email Address"
                  className={`w-full p-4 bg-gray-50 rounded-2xl border-2 ${
                    fieldErrors.email ? 'border-red-500' : 'border-gray-100'
                  } focus:border-blue-500 focus:outline-none font-bold`}
                  value={formState.email}
                  onChange={(e) =>
                    onFormChange({ ...formState, email: e.target.value })
                  }
                />
                {fieldErrors.email && (
                  <p className="text-red-500 text-xs font-bold mt-1 px-2">{fieldErrors.email}</p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  className={`w-full p-4 bg-gray-50 rounded-2xl border-2 ${
                    fieldErrors.password ? 'border-red-500' : 'border-gray-100'
                  } focus:border-blue-500 focus:outline-none font-bold`}
                  value={formState.password}
                  onChange={(e) =>
                    onFormChange({ ...formState, password: e.target.value })
                  }
                />
                {fieldErrors.password && (
                  <p className="text-red-500 text-xs font-bold mt-1 px-2">{fieldErrors.password}</p>
                )}
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}
              <button
                onClick={handleAuth}
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm shadow-xl shadow-blue-200 transition-colors"
              >
                {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign Up'}
              </button>
              <p className="text-center text-sm font-bold text-gray-400">
                {mode === 'login'
                  ? "Don't have an account?"
                  : 'Already have an account?'}
                <button
                  onClick={() =>
                    onModeChange(mode === 'login' ? 'signup' : 'login')
                  }
                  className="text-blue-600 ml-1"
                >
                  {mode === 'login' ? 'Sign Up' : 'Login'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
