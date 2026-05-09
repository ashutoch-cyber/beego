'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!token) {
      setError('Reset link is missing.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.resetPassword(token, password);
      setNotice(data?.message || 'Password reset successfully.');
      window.setTimeout(() => {
        window.location.href = '/login?reset=success';
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5faf7] px-4">
      <div className="w-full max-w-sm rounded-[1.75rem] border border-[#dce8e1] bg-white p-6 shadow-xl">
        <button
          onClick={() => { window.location.href = '/login'; }}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-[#2D6A4F]"
        >
          <ArrowLeft size={16} /> Back to sign in
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1f8f4] text-[#2D6A4F]">
            <KeyRound size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1B4332]">Set New Password</h1>
            <p className="text-sm font-semibold text-[#607869]">Use the reset link from your email.</p>
          </div>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-[#315743]">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-field"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[#315743]">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="input-field"
              placeholder="Confirm new password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={18} />
                Resetting...
              </span>
            ) : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
