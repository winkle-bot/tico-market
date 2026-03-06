'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MODAL_BACKDROP_VARIANTS } from '@/config/constants';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { useOverlayDialog } from '@/lib/use-overlay-dialog';
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
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [emailSent, setEmailSent] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const AUTH_TIMEOUT_MS = 15000;
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const confirmationButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useOverlayDialog<HTMLDivElement>({
    isOpen,
    onClose,
    initialFocusRef:
      emailSent || passwordResetSent
        ? confirmationButtonRef
        : mode === 'signup'
          ? nameInputRef
          : emailInputRef,
  });

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
    if (!formState.email.includes('@')) newErrors['email'] = t('auth.invalidEmail', 'Invalid email');
    if (formState.password.length < 6) newErrors['password'] = t('auth.passwordTooShort', 'Password too short (min 6 chars)');
    if (mode === 'signup' && !formState.name.trim()) newErrors['name'] = t('auth.nameRequired', 'Name required');

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
        setError(t('auth.timeout', 'Login is taking too long. Please try again.'));
      } else {
        setError(t('auth.networkError', 'Network error. Please try again.'));
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
      setFieldErrors({ email: t('auth.enterEmailFirst', 'Enter your account email first') });
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
        setError(t('auth.requestTimeout', 'Request timed out. Please try again.'));
      } else {
        setError(t('auth.networkError', 'Network error. Please try again.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={mode === 'login' ? t('auth.signIn', 'Sign in') : t('auth.createAccount', 'Create account')}>
          <motion.div
            {...MODAL_BACKDROP_VARIANTS}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            ref={dialogRef}
            tabIndex={-1}
            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 border border-[#dce5f7]"
          >
            <h2 className="text-2xl font-black text-[#18284a] uppercase mb-6">
              {(emailSent || passwordResetSent) ? t('auth.checkYourEmail', 'Check Your Email') : mode === 'login' ? t('auth.welcomeBack', 'Welcome Back') : t('auth.createAccount', 'Create Account')}
            </h2>
            {(emailSent || passwordResetSent) ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-[#465f91]">
                  {passwordResetSent
                    ? <>{t('auth.passwordResetLinkSent', 'We sent a password reset link to')} <span className="font-bold text-[#18284a]">{formState.email}</span></>
                    : <>{t('auth.confirmationLinkSent', 'We sent a confirmation link to')} <span className="font-bold text-[#18284a]">{formState.email}</span></>}
                </p>
                <p className="text-sm text-[#7d91b8]">
                  {passwordResetSent
                    ? t('auth.openResetLink', 'Open the link in that email to choose a new password.')
                    : t('auth.clickConfirmLink', 'Click the link in the email to verify your account and log in.')}
                </p>
                <button
                  ref={confirmationButtonRef}
                  onClick={() => {
                    setEmailSent(false);
                    setPasswordResetSent(false);
                    onFormChange({ email: '', password: '', name: '' });
                    onClose();
                  }}
                  className="w-full tm-btn tm-btn-muted mt-4"
                >
                  {t('auth.gotIt', 'Got it')}
                </button>
              </div>
            ) : (
            <div className="space-y-4">
              {mode === 'signup' && (
                <div key="name-field">
                  <label htmlFor="auth-name" className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-1.5">{t('auth.name', 'Full Name')}</label>
                  <input
                    ref={nameInputRef}
                    id="auth-name"
                    type="text"
                    placeholder={t('auth.name', 'Full Name')}
                    className={`tm-input ${
                      fieldErrors.name ? 'border-red-500' : ''
                    }`}
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
                <label htmlFor="auth-email" className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-1.5">{t('auth.emailAddress', 'Email Address')}</label>
                <input
                  ref={emailInputRef}
                  id="auth-email"
                  type="email"
                  placeholder={t('auth.emailAddress', 'Email Address')}
                  className={`tm-input ${
                    fieldErrors.email ? 'border-red-500' : ''
                  }`}
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
                <label htmlFor="auth-password" className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-1.5">{t('auth.password', 'Password')}</label>
                <input
                  id="auth-password"
                  type="password"
                  placeholder={t('auth.password', 'Password')}
                  className={`tm-input ${
                    fieldErrors.password ? 'border-red-500' : ''
                  }`}
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
                  className="text-sm text-blue-700 font-bold hover:underline disabled:text-blue-300 min-h-10"
                >
                  {t('auth.forgotYourPassword', 'Forgot your password?')}
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
                className="w-full tm-btn tm-btn-primary disabled:opacity-70"
              >
                {isSubmitting ? t('auth.pleaseWait', 'Please wait...') : mode === 'login' ? t('auth.login', 'Login') : t('auth.signup', 'Sign Up')}
              </button>
              <p className="text-center text-sm font-bold text-[#7d91b8]">
                {mode === 'login'
                  ? t('auth.noAccount', "Don't have an account?")
                  : t('auth.hasAccount', 'Already have an account?')}
                <button
                  onClick={() =>
                    onModeChange(mode === 'login' ? 'signup' : 'login')
                  }
                  className="text-blue-700 ml-1 min-h-10"
                >
                  {mode === 'login' ? t('auth.signup', 'Sign Up') : t('auth.login', 'Login')}
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
