'use client';

import React, { useEffect, useState } from 'react';
import { soundFx } from '@/lib/soundFx';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  endsAt: string | Date;
  onExpire?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export default function CountdownTimer({
  endsAt,
  onExpire,
  size = 'md',
  showIcon = true,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
  }>({ hours: 0, minutes: 0, seconds: 0, totalMs: 1 });

  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    const targetTime = new Date(endsAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
        if (!hasExpired) {
          setHasExpired(true);
          onExpire?.();
        }
        return;
      }

      setHasExpired(false);
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ hours, minutes, seconds, totalMs: diff });

      // Urgent audio tick when countdown is 10 seconds or lower
      if (totalSeconds <= 10 && totalSeconds > 0) {
        soundFx.playWarningTick();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endsAt, onExpire, hasExpired]);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const isUrgent = timeLeft.totalMs > 0 && timeLeft.totalMs <= 10000;
  const isZero = timeLeft.totalMs <= 0;

  const sizeClasses = {
    sm: 'text-xs py-1 px-2.5',
    md: 'text-sm py-1.5 px-3',
    lg: 'text-xl md:text-2xl py-3 px-6 tracking-widest',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 border font-mono-num font-bold select-none transition-all ${
        sizeClasses[size]
      } ${
        isZero
          ? 'bg-[#12141c] text-gray-500 border-gray-800'
          : isUrgent
          ? 'bg-red-950/50 text-red-400 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.35)] animate-pulse'
          : 'bg-[#0f1118] text-[#e6c35c] border-[#e6c35c]/35 shadow-[0_0_12px_rgba(230,195,92,0.12)]'
      }`}
    >
      {showIcon && (
        isUrgent ? (
          <AlertTriangle className="w-4 h-4 text-red-400 animate-spin" />
        ) : (
          <Clock className={`w-4 h-4 ${isZero ? 'text-gray-600' : 'text-[#e6c35c]'}`} />
        )
      )}
      <span className="font-pixel text-[11px] md:text-xs">
        {timeLeft.hours > 0 ? `${pad(timeLeft.hours)}:` : ''}
        {pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
      {isUrgent && (
        <span className="font-pixel text-[8px] bg-red-500 text-white px-1.5 py-0.5 uppercase tracking-normal">
          HOT 10s
        </span>
      )}
      {isZero && (
        <span className="font-pixel text-[8px] bg-gray-800 text-gray-400 px-1.5 py-0.5 uppercase tracking-normal">
          CLOSED
        </span>
      )}
    </div>
  );
}
