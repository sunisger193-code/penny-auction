'use client';

import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { soundFx } from '@/lib/soundFx';
import {
  Coins,
  Shield,
  Volume2,
  VolumeX,
  Tv,
  LogOut,
  UserCheck,
  PlusCircle,
  Gavel,
  LogIn,
  UserPlus,
} from 'lucide-react';

export default function ArcadeNavbar() {
  const {
    user,
    logout,
    crtEnabled,
    toggleCrt,
    sfxEnabled,
    toggleSfx,
  } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-[#0a0b10]/95 backdrop-blur-md border-b border-[#e6c35c]/25 shadow-[0_4px_25px_rgba(0,0,0,0.8)] px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand / Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-gradient-to-br from-[#fbe38e] via-[#e6c35c] to-[#9b7e28] flex items-center justify-center border border-[#fbe38e] shadow-[0_0_12px_rgba(230,195,92,0.3)]">
            <Gavel className="w-5 h-5 text-black transform group-hover:-rotate-12 transition-transform duration-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-xs md:text-sm font-bold tracking-wider text-white">
                AURUM<span className="text-[#e6c35c]">.8BIT</span>
              </span>
              <span className="bg-[#e6c35c]/15 text-[#e6c35c] border border-[#e6c35c]/30 text-[8px] font-pixel px-1.5 py-0.5">
                LIVE
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono tracking-tight block">
              PREMIUM DIGITAL ASSET AUCTION HOUSE (THB ฿)
            </span>
          </div>
        </a>

        {/* Global Sound & Display Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* SFX Toggle */}
          <button
            onClick={() => {
              toggleSfx();
              if (!sfxEnabled) soundFx.playCoin();
            }}
            className="p-1.5 bg-[#12151f] border border-[#e6c35c]/20 text-gray-300 hover:text-[#e6c35c] transition-colors"
            title="Toggle Audio Effects"
          >
            {sfxEnabled ? <Volume2 className="w-4 h-4 text-[#e6c35c]" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>

          {/* CRT Scanline Toggle */}
          <button
            onClick={() => {
              soundFx.playBid();
              toggleCrt();
            }}
            className={`p-1.5 border transition-colors ${
              crtEnabled
                ? 'bg-[#e6c35c] text-black border-[#e6c35c]'
                : 'bg-[#12151f] border-[#e6c35c]/20 text-gray-400 hover:text-[#e6c35c]'
            }`}
            title="Toggle Subtle 8-Bit Scanlines"
          >
            <Tv className="w-4 h-4" />
          </button>
        </div>

        {/* User HUD / Wallet & Auth Links */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Credit Balance HUD */}
              <a
                href="/wallet"
                onClick={() => soundFx.playCoin()}
                className="bg-gradient-to-r from-[#171b26] to-[#12141d] border border-[#e6c35c]/40 px-3.5 py-1.5 flex items-center gap-2.5 hover:border-[#e6c35c] transition-all group"
                title="Your Credit Balance (1 Baht = 1 Credit)"
              >
                <Coins className="w-4 h-4 text-[#e6c35c] animate-pulse" />
                <div className="text-right">
                  <span className="text-[8px] text-[#e6c35c] font-pixel block">CREDITS</span>
                  <span className="text-xs md:text-sm font-mono-num font-bold text-white tracking-wider">
                    {user.credits} <span className="text-[10px] text-gray-400 font-normal">฿</span>
                  </span>
                </div>
                <PlusCircle className="w-3.5 h-3.5 text-[#e6c35c] group-hover:scale-110 transition-transform ml-1" />
              </a>

              {/* Admin Link if role is ADMIN */}
              {user.role === 'ADMIN' && (
                <a
                  href="/admin"
                  className="btn-gold px-2.5 py-1.5 flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-black" />
                  <span className="hidden md:inline">ADMIN</span>
                </a>
              )}

              {/* User badge */}
              <div className="bg-[#12151f] border border-gray-800 px-2.5 py-1.5 text-xs hidden lg:flex items-center gap-1.5 font-mono">
                <UserCheck className="w-3.5 h-3.5 text-[#e6c35c]" />
                <span className="text-gray-200">{user.username}</span>
              </div>

              {/* Logout button */}
              <button
                onClick={() => {
                  soundFx.playBid();
                  logout();
                }}
                className="p-2 bg-[#12151f] border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href="/login"
                className="btn-dark px-3 py-2 flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-[#e6c35c]" />
                <span>LOGIN</span>
              </a>
              <a
                href="/signup"
                className="btn-gold px-3 py-2 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-black" />
                <span>SIGN UP</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
