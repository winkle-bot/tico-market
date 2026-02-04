'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { API_ROUTES, MODAL_BACKDROP_VARIANTS } from '@/config/constants';
import { useAuth } from '@/context/AuthContext';
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
  const { login } = useAuth();

  const handleAuth = async () => {
    const res = await fetch(API_ROUTES.AUTH, {
      method: 'POST',
      body: JSON.stringify({ ...formState, action: mode }),
    });
    if (res.ok) {
      const userData = await res.json();
      login(userData);
      onClose();
    } else {
      const err = await res.json();
      alert(err.error);
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
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold"
                  value={formState.name}
                  onChange={(e) =>
                    onFormChange({ ...formState, name: e.target.value })
                  }
                />
              )}
              <input
                type="email"
                placeholder="Email Address"
                className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold"
                value={formState.email}
                onChange={(e) =>
                  onFormChange({ ...formState, email: e.target.value })
                }
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold"
                value={formState.password}
                onChange={(e) =>
                  onFormChange({ ...formState, password: e.target.value })
                }
              />
              <button
                onClick={handleAuth}
                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm shadow-xl shadow-blue-200"
              >
                {mode === 'login' ? 'Login' : 'Sign Up'}
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
