'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Loader2, LogIn, Mail, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';

type AuthMode = 'login' | 'register' | 'forgot';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [setupLink, setSetupLink] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'success') {
      setNotice('Password reset successfully. Sign in with your new password.');
    }
    if (params.get('verified') === 'success') {
      setNotice('Email verified. You are signed in.');
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    setSetupLink('');

    try {
      if (mode === 'forgot') {
        const data = await api.forgotPassword(email);
        setNotice(data?.message || 'If that email is registered, a reset link will be sent.');
        return;
      }

      if (mode === 'register') {
        const data = await api.register(email, password);
        setNotice(data?.message || 'Verification email sent. Please check your inbox.');
        if (data?.verificationUrl) setSetupLink(data.verificationUrl);
        setMode('login');
        setPassword('');
        return;
      }

      const data = await api.login(email, password);
      if (data?.token) {
        localStorage.setItem('token', data.token);
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      if (err?.verificationUrl) setSetupLink(err.verificationUrl);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    setSetupLink('');
    if (nextMode !== 'forgot') setPassword('');
  }

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2D6A4F] text-2xl font-black text-white shadow-lg">
            N
          </div>
          <h1 className="text-2xl font-black text-[#1B4332]">NutriSnap AI</h1>
          <p className="mt-1 text-sm text-[#607869]">Smart calorie tracking powered by AI</p>
        </div>

        <div className="card shadow-xl">
          {isForgot && (
            <button
              onClick={() => switchMode('login')}
              className="mb-4 flex items-center gap-2 text-sm font-bold text-[#2D6A4F]"
            >
              <ArrowLeft size={16} /> Back to sign in
            </button>
          )}

          <h2 className="mb-1 text-xl font-black text-[#1B4332]">
            {isForgot ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="mb-6 text-sm text-[#607869]">
            {isForgot
              ? 'Enter your email and we will send a secure reset link.'
              : isLogin
                ? 'Sign in to continue tracking'
                : 'Verify your email before entering the app'}
          </p>

          {notice && (
            <div className="mb-4 rounded-xl border border-[#b7dfcb] bg-[#f1f8f4] p-3 text-sm font-semibold text-[#1B4332]">
              {notice}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {setupLink && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-800">
              Email sending is not configured yet. Temporary verification link:
              <a href={setupLink} className="mt-2 block break-all underline">{setupLink}</a>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-[#315743]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input-field"
              />
            </div>

            {!isForgot && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-bold text-[#315743]">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-black text-[#2D6A4F]"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  minLength={6}
                  className="input-field"
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Please wait...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isForgot ? <Mail size={18} /> : isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                  {isForgot ? 'Send Reset Email' : isLogin ? 'Sign In' : 'Create Account'}
                </span>
              )}
            </button>
          </form>

          {!isForgot && (
            <div className="mt-6 text-center">
              <button
                onClick={() => switchMode(isLogin ? 'register' : 'login')}
                className="text-sm font-bold text-[#2D6A4F] hover:underline"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          )}

          <div className="mt-4 border-t border-gray-100 pt-4 text-center">
            <button
              onClick={() => { window.location.href = '/'; }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Continue as Guest
            </button>
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1 text-center text-xs text-gray-400">
          <KeyRound size={12} /> Secure email verification and password recovery
        </p>
      </div>
    </div>
  );
}
