'use client';

import React, { useState } from 'react';
import CountdownTimer from './CountdownTimer';
import { useAuth } from '@/lib/AuthContext';
import { Trophy, Crown, ShieldCheck, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';

export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  category?: string;
  imageUrl: string;
  images?: string;
  imagesList?: string[];
  startingPrice: number;
  currentPrice: number;
  creditCostPerBid: number;
  bidIncrement: number;
  status: string;
  endsAt: string;
  highestBidderId?: string | null;
  highestBidder?: { id: string; username: string } | null;
  winnerId?: string | null;
  winner?: { id: string; username: string } | null;
  totalBids: number;
}

interface AuctionCardProps {
  auction: AuctionItem;
  onBidSuccess?: (updated: Partial<AuctionItem>) => void;
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  const { user } = useAuth();
  const isEnded = auction.status === 'ENDED';
  const isWinning = user && auction.highestBidderId === user.id;

  // Multi-image slider support
  const images = auction.imagesList && auction.imagesList.length > 0
    ? auction.imagesList
    : [auction.imageUrl];
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const activeImage = images[currentImgIndex] || auction.imageUrl;

  return (
    <div className="gold-card flex flex-col justify-between overflow-hidden relative group transition-all duration-200">
      {/* Top Header Bar */}
      <div className="bg-[#0c0e15] border-b border-[#e6c35c]/15 px-3 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#e6c35c]" />
          <span className="font-pixel text-[9px] text-[#e6c35c] uppercase">
            {auction.category || 'GAMING ASSET'}
          </span>
        </div>
        <span
          className={`font-pixel text-[8px] px-2 py-0.5 uppercase ${
            isEnded
              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
              : 'bg-[#e6c35c]/10 text-[#e6c35c] border border-[#e6c35c]/30'
          }`}
        >
          {isEnded ? 'SETTLED' : 'ACTIVE LOT'}
        </span>
      </div>

      {/* Lot Showcase Image with Interactive Slider */}
      <div className="relative aspect-[16/10] w-full bg-[#050608] overflow-hidden border-b border-[#e6c35c]/15 select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeImage}
          alt={auction.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#11141d] via-transparent to-transparent opacity-90 pointer-events-none" />

        {/* Carousel Slider Arrows (if multiple pictures) */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/70 hover:bg-[#e6c35c] text-white hover:text-black transition-all border border-gray-700 hover:border-[#e6c35c] z-10 opacity-75 group-hover:opacity-100"
              title="Previous picture"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/70 hover:bg-[#e6c35c] text-white hover:text-black transition-all border border-gray-700 hover:border-[#e6c35c] z-10 opacity-75 group-hover:opacity-100"
              title="Next picture"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Slide Dots */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10 bg-black/60 px-1.5 py-0.5 rounded-full border border-gray-800">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentImgIndex ? 'bg-[#e6c35c] w-3' : 'bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Live Countdown Badge Overlay */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-center z-10 pointer-events-none">
          <CountdownTimer endsAt={auction.endsAt} size="sm" />
          <span className="font-pixel text-[8px] bg-black/80 text-gray-300 border border-gray-700 px-2 py-1 backdrop-blur-sm">
            1 BAHT = 1 CREDIT
          </span>
        </div>
      </div>

      {/* Card Content & Valuation */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white group-hover:text-[#fbe38e] transition-colors line-clamp-1">
            {auction.title}
          </h3>
          <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
            {auction.description}
          </p>
        </div>

        {/* Valuation & Leaderboard Box */}
        <div className="bg-[#0b0d14] border border-[#e6c35c]/20 p-3 space-y-2">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="text-[10px] text-gray-400 font-mono uppercase block">
                CURRENT HIGH BID
              </span>
              <span className="text-xl font-bold font-mono-num text-[#e6c35c] tracking-tight">
                ฿{auction.currentPrice.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">
                TOTAL BIDS
              </span>
              <span className="text-xs font-mono-num text-gray-300 font-semibold">
                #{auction.totalBids}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-[#e6c35c]" />
              TOP BIDDER:
            </span>
            <span
              className={`font-semibold ${
                isWinning ? 'text-[#e6c35c]' : 'text-gray-200'
              }`}
            >
              {auction.winner?.username ? (
                `🏆 ${auction.winner.username}`
              ) : auction.highestBidder?.username ? (
                auction.highestBidder.username
              ) : (
                'NO BIDS YET'
              )}
              {isWinning && !isEnded && ' (YOU)'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {!isEnded ? (
            <a
              href={`/auctions/${auction.id}`}
              className="w-full btn-gold py-2.5 flex items-center justify-center gap-2 group/btn"
            >
              <span>ENTER LOT TO BID</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </a>
          ) : (
            <a
              href={`/auctions/${auction.id}`}
              className="w-full btn-dark py-2.5 flex items-center justify-center gap-2 text-[#e6c35c]"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>VIEW SETTLED LOT</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
