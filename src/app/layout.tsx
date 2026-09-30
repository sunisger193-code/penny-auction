import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import ArcadeNavbar from '@/components/ArcadeNavbar';
import ClientShell from '@/components/ClientShell';

export const metadata: Metadata = {
  title: '8-BIT PENNY WARS | Real-Time Penny Auction Arcade',
  description: 'High-stakes 8-bit retro penny auction platform with dynamic +10s countdown, Redis atomic concurrency, and encrypted game account deliveries!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#090d16] text-[#f8fafc] flex flex-col">
        <AuthProvider>
          <ClientShell>
            <ArcadeNavbar />
            <main className="flex-1 pb-16">{children}</main>
            <footer className="bg-[#0c1222] border-t-4 border-black py-6 px-4 text-center text-[10px] text-gray-500">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-[#facc15] font-bold">
                  🕹️ 8-BIT PENNY AUCTIONS ARCADE
                </div>
                <div className="text-gray-400">
                  REDIS DISTRIBUTED LOCKS • WEBSOCKET SYNCHRONIZATION • AES-256 ENCRYPTION
                </div>
                <div>© 2026 COIN-OP ARCHITECTURE. ALL BIDS NON-REFUNDABLE.</div>
              </div>
            </footer>
          </ClientShell>
        </AuthProvider>
      </body>
    </html>
  );
}
