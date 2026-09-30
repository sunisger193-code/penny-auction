'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { soundFx } from '@/lib/soundFx';
import { Lock, Mail, ShieldAlert, LogIn, KeyRound } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    soundFx.playBid();

    const success = await login(email, password);
    setLoading(false);

    if (success) {
      soundFx.playCoin();
      // If logging in as admin@gmail.com, automatically route to /admin
      if (email.toLowerCase() === 'admin@gmail.com') {
        router.push('/admin');
      } else {
        router.push(redirectPath);
      }
    } else {
      soundFx.playError();
      setErrorMsg('Invalid email or password. For Admin, use admin@gmail.com / admin1');
    }
  };

  const quickFillAdmin = () => {
    soundFx.playCoin();
    setEmail('admin@gmail.com');
    setPassword('admin1');
  };

  return (
    <div className="max-w-md w-full mx-auto gold-card p-6 md:p-8 bg-[#0a0c12] border border-[#e6c35c]/40 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="text-center space-y-2 border-b border-[#e6c35c]/20 pb-4">
        <div className="w-12 h-12 mx-auto bg-gradient-to-br from-[#fbe38e] via-[#e6c35c] to-[#9b7e28] flex items-center justify-center border border-[#fbe38e] shadow-[0_0_15px_rgba(230,195,92,0.35)]">
          <KeyRound className="w-6 h-6 text-black" />
        </div>
        <h1 className="text-sm md:text-base font-bold text-[#fbe38e] font-pixel tracking-wider uppercase">
          BIDDER LOGIN
        </h1>
        <p className="text-[10px] text-gray-400 font-sans">
          ENTER YOUR CREDENTIALS TO ACCESS YOUR VAULT & BID
        </p>
      </div>

      {/* Admin Notice Banner */}
      <div className="bg-[#121522] border border-[#e6c35c]/25 p-3 text-[11px] font-mono space-y-2">
        <div className="flex items-center justify-between text-[#e6c35c] font-bold">
          <span className="flex items-center gap-1.5 text-xs">
            <ShieldAlert className="w-3.5 h-3.5" /> ADMIN CREDENTIALS:
          </span>
          <button
            type="button"
            onClick={quickFillAdmin}
            className="text-[10px] text-[#fbe38e] underline hover:text-white cursor-pointer"
          >
            [ AUTO-FILL ADMIN ]
          </button>
        </div>
        <p className="text-gray-300 text-[11px]">
          Admin Email: <span className="text-[#fbe38e] font-bold">admin@gmail.com</span><br />
          Password: <span className="text-[#fbe38e] font-bold">admin1</span>
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 text-[11px] text-center font-mono animate-shake">
          {errorMsg}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4 font-mono text-[11px]">
        <div>
          <label className="text-gray-300 mb-1.5 flex items-center gap-1.5 text-xs">
            <Mail className="w-3.5 h-3.5 text-[#e6c35c]" /> EMAIL / GMAIL:
          </label>
          <input
            type="email"
            required
            placeholder="e.g. admin@gmail.com or bidder@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#121522] border border-gray-700 focus:border-[#e6c35c] p-3 text-white text-xs font-mono outline-none transition-colors"
          />
        </div>

        <div>
          <label className="text-gray-300 mb-1.5 flex items-center gap-1.5 text-xs">
            <Lock className="w-3.5 h-3.5 text-[#e6c35c]" /> PASSWORD:
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#121522] border border-gray-700 focus:border-[#e6c35c] p-3 text-white text-xs font-mono outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-gold py-3 text-xs flex items-center justify-center gap-2 mt-2 font-pixel cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>{loading ? 'AUTHENTICATING...' : 'SIGN IN / ENTER'}</span>
        </button>
      </form>

      {/* Bottom Switcher */}
      <div className="text-center pt-3 border-t border-gray-800 text-[11px] font-sans">
        <p className="text-gray-400">
          NEW BIDDER?{' '}
          <Link href="/signup" className="text-[#e6c35c] font-bold underline hover:text-[#fbe38e]">
            CREATE AN ACCOUNT
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center min-h-[75vh]">
      <Suspense fallback={<div className="gold-card p-8 text-center text-[#e6c35c] font-pixel text-xs">LOADING LOGIN...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
