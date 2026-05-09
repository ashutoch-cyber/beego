'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import { api } from '@/lib/api';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    async function verify() {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token') || '';
        if (!token) throw new Error('Verification link is missing.');

        const data = await api.verifyEmail(token);
        if (data?.token) localStorage.setItem('token', data.token);
        setStatus('success');
        setMessage('Email verified. Signing you in...');
        window.setTimeout(() => {
          window.location.href = '/?verified=success';
        }, 800);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'This verification link is invalid or expired.');
      }
    }

    verify();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5faf7] px-4">
      <div className="w-full max-w-sm rounded-[1.75rem] border border-[#dce8e1] bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f1f8f4] text-[#2D6A4F]">
          {status === 'loading' && <Loader2 className="animate-spin" size={32} />}
          {status === 'success' && <CheckCircle2 size={34} />}
          {status === 'error' && <MailWarning className="text-red-500" size={34} />}
        </div>
        <h1 className="text-2xl font-black text-[#1B4332]">
          {status === 'error' ? 'Verification Failed' : 'Verify Email'}
        </h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#607869]">{message}</p>
        {status === 'error' && (
          <button
            onClick={() => { window.location.href = '/login'; }}
            className="btn-primary mt-6 w-full"
          >
            Back to Sign In
          </button>
        )}
      </div>
    </div>
  );
}
