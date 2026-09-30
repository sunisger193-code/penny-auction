'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { soundFx } from '@/lib/soundFx';
import { ShieldCheck, Lock, Mail, User, UserPlus, Coins } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setErrorMsg('Please enter username, email (gmail), and password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    soundFx.playBid();

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundFx.playCoin();
        localStorage.setItem('arcade_token', data.token);
        await refreshUser();
        router.push('/');
      } else {
        soundFx.playError();
        setErrorMsg(data.error || 'Failed to create account');
      }
    } catch {
      soundFx.playError();
      setErrorMsg('Network error during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center min-h-[75vh]">
      <div className="max-w-md w-full mx-auto gold-card p-6 md:p-8 bg-[#0a0c12] border border-[#e6c35c]/40 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2 border-b border-[#e6c35c]/20 pb-4">
          <div className="w-12 h-12 mx-auto bg-gradient-to-br from-[#fbe38e] via-[#e6c35c] to-[#9b7e28] flex items-center justify-center border border-[#fbe38e] shadow-[0_0_15px_rgba(230,195,92,0.35)]">
            <UserPlus className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-sm md:text-base font-bold text-[#fbe38e] font-pixel tracking-wider uppercase">
            CREATE BIDDER ACCOUNT
          </h1>
          <p className="text-[10px] text-gray-400 font-sans">
            JOIN REAL-TIME PENNY AUCTIONS & COMPETE FOR PREMIER ASSETS
          </p>
        </div>

        {/* Currency & Protocol Notice */}
        <div className="bg-[#121522] border border-[#e6c35c]/25 p-3 text-[10px] text-gray-300 font-sans space-y-1">
          <div className="flex items-center gap-1.5 text-[#e6c35c] font-pixel text-[9px]">
            <Coins className="w-3.5 h-3.5" />
            <span>ACCOUNT PROTOCOL</span>
          </div>
          <p className="text-gray-400 leading-relaxed text-[11px]">
            Accounts start at 0 credits. Top up via Thai PromptPay QR code (1 Baht = 1 Bidding Credit). Bids are non-refundable.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 text-[11px] text-center font-mono animate-shake">
            {errorMsg}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-4 font-mono text-[11px]">
          <div>
            <label className="text-gray-300 mb-1.5 flex items-center gap-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-[#e6c35c]" /> USERNAME:
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AurumBidder99"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#121522] border border-gray-700 focus:border-[#e6c35c] p-3 text-white text-xs font-mono outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-gray-300 mb-1.5 flex items-center gap-1.5 text-xs">
              <Mail className="w-3.5 h-3.5 text-[#e6c35c]" /> GMAIL / EMAIL:
            </label>
            <input
              type="email"
              required
              placeholder="e.g. bidder@gmail.com"
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
              placeholder="Create your secure password"
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
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'REGISTERING...' : 'CREATE ACCOUNT'}</span>
          </button>
        </form>

        <div className="text-center pt-3 border-t border-gray-800 text-[11px] font-sans">
          <p className="text-gray-400">
            ALREADY REGISTERED?{' '}
            <Link href="/login" className="text-[#e6c35c] font-bold underline hover:text-[#fbe38e]">
              LOG IN HERE
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
