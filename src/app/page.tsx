'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AuctionCard, { AuctionItem } from '@/components/AuctionCard';
import { useSocket } from '@/lib/useSocket';
import { Gavel, Clock, ShieldCheck, Zap, ArrowRight, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'ENDED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [recentBids, setRecentBids] = useState<Array<{ id: string; user: string; amount: number; title: string }>>([]);
  const { socket } = useSocket();

  const fetchAuctions = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setAuctions(data.auctions || []);
      }
    } catch (err) {
      console.error('Error fetching auctions:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  // Global socket listener for live lot updates
  useEffect(() => {
    if (!socket) return;

    const handleBidSuccess = (payload: {
      auctionId: string;
      currentPrice: number;
      highestBidderId: string;
      highestBidderName: string;
      endsAt: string;
      totalBids: number;
      bid?: { user: { username: string }; amount: number };
    }) => {
      setAuctions((prev) =>
        prev.map((auc) => {
          if (auc.id === payload.auctionId) {
            return {
              ...auc,
              currentPrice: payload.currentPrice,
              highestBidderId: payload.highestBidderId,
              highestBidder: { id: payload.highestBidderId, username: payload.highestBidderName },
              endsAt: payload.endsAt,
              totalBids: payload.totalBids,
            };
          }
          return auc;
        })
      );

      if (payload.bid) {
        setRecentBids((prev) => [
          {
            id: Math.random().toString(),
            user: payload.highestBidderName,
            amount: payload.currentPrice,
            title: `Lot #${payload.auctionId.slice(-4).toUpperCase()}`,
          },
          ...prev.slice(0, 4),
        ]);
      }
    };

    const handleSettled = (payload: { auctionId: string; winnerName: string; finalPrice: number }) => {
      setAuctions((prev) =>
        prev.map((auc) =>
          auc.id === payload.auctionId
            ? { ...auc, status: 'ENDED', winner: payload.winnerName ? { id: '', username: payload.winnerName } : null }
            : auc
        )
      );
    };

    socket.on('bid_success', handleBidSuccess);
    socket.on('auction_settled', handleSettled);

    return () => {
      socket.off('bid_success', handleBidSuccess);
      socket.off('auction_settled', handleSettled);
    };
  }, [socket]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Real-Time Live Ticker */}
      <div className="bg-[#0e1017] border border-[#e6c35c]/25 px-4 py-2.5 flex items-center gap-3 overflow-hidden shadow-sm">
        <span className="bg-[#e6c35c] text-black px-2 py-0.5 font-pixel text-[8px] font-bold flex items-center gap-1.5 shrink-0">
          <Zap className="w-3 h-3 fill-black" /> LIVE LOTS
        </span>
        <div className="text-xs text-gray-300 truncate font-mono">
          {recentBids.length > 0 ? (
            <span className="flex items-center gap-6">
              {recentBids.map((b) => (
                <span key={b.id} className="flex items-center gap-1.5">
                  <span className="text-[#e6c35c] font-semibold">{b.user}</span> placed bid ฿{b.amount.toFixed(2)} on <span className="text-gray-400">{b.title}</span>
                </span>
              ))}
            </span>
          ) : (
            <span className="text-gray-400">
              AURUM FLOOR SYNCHRONIZED • 1 BAHT = 1 CREDIT • 10-SEC SUDDEN DEATH OVERTIME ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Hero Banner: Luxury & Professional Digital Auction House */}
      <div className="gold-card p-8 md:p-12 relative overflow-hidden bg-gradient-to-br from-[#121520] via-[#0d0f15] to-[#08090c] border border-[#e6c35c]/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#e6c35c]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#e6c35c]/10 text-[#e6c35c] border border-[#e6c35c]/30 px-3 py-1 font-pixel text-[9px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CURATED DIGITAL ASSET AUCTIONS</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            High-Stakes Penny Auctions for <br />
            <span className="gold-gradient-text font-extrabold">Rare Gaming Credentials & IDs</span>
          </h1>

          <p className="text-sm text-gray-300 leading-relaxed font-sans max-w-2xl">
            Acquire verified Free Fire Grandmaster, Valorant Radiant, and Mythic game accounts. Every placed bid costs fixed non-refundable credits, claims top position, and enters 10-second sudden death overtime at zero.
          </p>

          {/* Pillar Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="bg-[#0a0c12]/90 border border-gray-800 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e6c35c]">
                <Clock className="w-4 h-4" />
                <span>10s OVERTIME PHASE</span>
              </div>
              <p className="text-xs text-gray-400 leading-normal">
                Scheduled timer enters 10s sudden death; each bid resets the 10-second clock.
              </p>
            </div>

            <div className="bg-[#0a0c12]/90 border border-gray-800 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e6c35c]">
                <Gavel className="w-4 h-4" />
                <span>1 BAHT = 1 CREDIT</span>
              </div>
              <p className="text-xs text-gray-400 leading-normal">
                Direct transparent 1:1 PromptPay top-up. No hidden fees or conversions.
              </p>
            </div>

            <div className="bg-[#0a0c12]/90 border border-gray-800 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e6c35c]">
                <ShieldCheck className="w-4 h-4" />
                <span>AES-256 VAULT</span>
              </div>
              <p className="text-xs text-gray-400 leading-normal">
                Account credentials sealed encrypted; auto-revealed solely to certified winner.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[9px] text-gray-400 mr-2 hidden sm:inline">VIEW:</span>
          {(['ALL', 'ACTIVE', 'ENDED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`font-pixel text-[9px] px-3.5 py-2 transition-all ${
                filter === tab
                  ? 'btn-gold'
                  : 'bg-[#12151f] text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {tab === 'ALL' ? 'ALL LOTS' : tab === 'ACTIVE' ? 'ACTIVE LOTS' : 'SETTLED ARCHIVE'}
            </button>
          ))}
        </div>

        <a
          href="/wallet"
          className="btn-dark px-3.5 py-2 flex items-center gap-2 text-[10px]"
        >
          <span>TOP-UP CREDITS</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#e6c35c]" />
        </a>
      </div>

      {/* Lot Catalog Grid */}
      {loading ? (
        <div className="text-center py-24 gold-card">
          <div className="font-pixel text-xs text-[#e6c35c] animate-pulse">
            LOADING LOT CATALOG...
          </div>
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-20 gold-card space-y-3">
          <p className="text-sm text-gray-400">NO AUCTIONS AVAILABLE IN THIS VIEW.</p>
          <button
            onClick={() => setFilter('ALL')}
            className="btn-gold px-4 py-2"
          >
            VIEW ALL LOTS
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
}
