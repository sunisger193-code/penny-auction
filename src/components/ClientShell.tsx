'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useSocket } from '@/lib/useSocket';
import { soundFx } from '@/lib/soundFx';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { crtEnabled, user, addCreditsLocally } = useAuth();
  const { socket } = useSocket();

  // Listen to global credit topup approvals
  useEffect(() => {
    if (!socket || !user) return;

    const handleCreditAdded = (data: { userId: string; addedCredits: number }) => {
      if (data.userId === user.id) {
        soundFx.playCoin();
        addCreditsLocally(data.addedCredits);
      }
    };

    socket.on('user_credits_credited', handleCreditAdded);

    return () => {
      socket.off('user_credits_credited', handleCreditAdded);
    };
  }, [socket, user, addCreditsLocally]);

  return (
    <div className={`min-h-screen flex flex-col ${crtEnabled ? 'scanlines' : ''}`}>
      {children}
    </div>
  );
}
