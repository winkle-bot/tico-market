'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MODAL_BACKDROP_VARIANTS } from '@/config/constants';
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
  const { login, signup, requestPasswordReset } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [emailSent, setEmailSent] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const AUTH_TIMEOUT_MS = 15000;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmailSent(false);
      setPasswordResetSent(false);
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen]);

  const withTimeout = async <T,>(promise: Promise<T>) => {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), AUTH_TIMEOUT_MS)
      ),
    ]);
  };

  const handleAuth = async () => {
    if (isSubmitting) return;
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
      if (mode === 'signup') {
        const result = await withTimeout(signup(formState.email, formState.password, formState.name));
        if (result.error) {
          setError(result.error);
        } else {
          setEmailSent(true);
        }
      } else {
        const result = await withTimeout(login(formState.email, formState.password));
        if (result.error) {
          setError(result.error);
        } else {
          onClose();
          onFormChange({ email: '', password: '', name: '' });
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Request timeout') {
        setError('Login is taking too long. Please try again.');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (isSubmitting) return;
    setError(null);
    setFieldErrors({});

    const email = formState.email.trim();
    if (!email || !email.includes('@')) {
      setFieldErrors({ email: 'Enter your account email first' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await withTimeout(requestPasswordReset(email));
      if (result.error) {
        setError(result.error);
        return;
      }
      setPasswordResetSent(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Request timeout') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Network error. Please try again.');
      }
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
              {(emailSent || passwordResetSent) ? 'Check Your Email' : mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            {(emailSent || passwordResetSent) ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-600">
                  {passwordResetSent
                    ? <>We sent a password reset link to <span className="font-bold text-gray-900">{formState.email}</span></>
                    : <>We sent a confirmation link to <span className="font-bold text-gray-900">{formState.email}</span></>}
                </p>
                <p className="text-sm text-gray-400">
                  {passwordResetSent
                    ? 'Open the link in that email to choose a new password.'
                    : 'Click the link in the email to verify your account and log in.'}
                </p>
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setPasswordResetSent(false);
                    onFormChange({ email: '', password: '', name: '' });
                    onClose();
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-black py-4 rounded-2xl uppercase tracking-widest text-sm transition-colors mt-4"
                >
                  Got it
                </button>
              </div>
            ) : (
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
              {mode === 'login' && (
                <button
                  onClick={handleForgotPassword}
                  disabled={isSubmitting}
                  className="text-sm text-blue-600 font-bold hover:underline disabled:text-blue-300"
                >
                  Forgot your password?
                </button>
              )}
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
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
