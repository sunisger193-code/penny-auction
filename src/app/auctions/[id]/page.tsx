'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import CountdownTimer from '@/components/CountdownTimer';
import { useSocket } from '@/lib/useSocket';
import { useAuth } from '@/lib/AuthContext';
import { soundFx } from '@/lib/soundFx';
import confetti from 'canvas-confetti';
import {
  Gavel,
  ShieldCheck,
  CheckCircle,
  Copy,
  Check,
  Trophy,
  Crown,
  Volume2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  KeyRound,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';

interface BidEntry {
  id: string;
  amount: number;
  creditCost: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
  };
}

interface UserOffering {
  user: { id: string; username: string };
  totalOffering: number;
  lastBidAt: string;
}

export default function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, token, deductCreditsLocally } = useAuth();
  const { socket, isConnected } = useSocket();

  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [offerings, setOfferings] = useState<UserOffering[]>([]);
  const [myOffering, setMyOffering] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastExtensionNotice, setLastExtensionNotice] = useState<string | null>(null);

  // Custom bid input state
  const [customAddAmount, setCustomAddAmount] = useState<string>('');

  // Mandatory Room Registration
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

  // Winner claim token state
  const [isWinner, setIsWinner] = useState(false);
  const [claimTokenData, setClaimTokenData] = useState<{
    claimToken: string;
    discordUrl: string;
    instructions: string;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Overtime state calculation
  const [isOvertime, setIsOvertime] = useState(false);

  // Multi-image slider index
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const fetchAuctionDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAuction(data.auction);
        setOfferings(data.offerings || []);
        setMyOffering(data.myOffering || 0);

        // Sort bids strictly descending by createdAt
        const initialBids = (data.auction.bids || []).sort(
          (a: BidEntry, b: BidEntry) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setBids(initialBids);
        setIsWinner(data.isWinner);

        if (data.isWinner && data.auction.claimToken) {
          setClaimTokenData({
            claimToken: data.auction.claimToken,
            discordUrl: data.auction.discordUrl || 'https://discord.gg/aurum8bit',
            instructions:
              'Copy your official Claim Token above, join our Discord server, and open a ticket in #claim-rewards to claim your gaming asset!',
          });
        }

        // Check if already in 10-second phase
        const diff = new Date(data.auction.endsAt).getTime() - Date.now();
        setIsOvertime(diff <= 10000 && diff > 0);
      }
    } catch (err) {
      console.error('Error fetching auction:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAuctionDetails();
  }, [fetchAuctionDetails]);

  // Periodic check if auction entered the 10-second overtime phase
  useEffect(() => {
    if (!auction?.endsAt) return;
    const interval = setInterval(() => {
      const diff = new Date(auction.endsAt).getTime() - Date.now();
      if (diff <= 10000 && diff > 0) {
        setIsOvertime(true);
      } else {
        setIsOvertime(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [auction?.endsAt]);

  // Periodic fallback polling when socket is disconnected (crucial for serverless hosts like Netlify/Vercel)
  useEffect(() => {
    if (isConnected || !id) return;
    const pollInterval = setInterval(() => {
      fetchAuctionDetails();
    }, 2000);
    return () => clearInterval(pollInterval);
  }, [isConnected, id, fetchAuctionDetails]);

  // Handle explicit room joining
  const handleJoinRoom = () => {
    if (!user) {
      soundFx.playError();
      alert('Please log in or sign up first to enter the lot arena!');
      return;
    }

    soundFx.playCoin();
    setHasJoinedRoom(true);

    if (socket) {
      socket.emit('join_auction', id);
    }

    setLastExtensionNotice(`⚡ BIDDER ${user.username} ENTERED THE ARENA! GAVEL UNLOCKED.`);
    setTimeout(() => setLastExtensionNotice(null), 3000);
  };

  // Socket.io Room & Global Event Listener
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join_auction', id);

    const handleBidSuccess = (payload: any) => {
      if (payload.auctionId !== id) return;

      soundFx.playBid();
      setAuction((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentPrice: payload.currentPrice,
          highestBidderId: payload.highestBidderId,
          highestBidder: {
            id: payload.highestBidderId,
            username: payload.highestBidderName || payload.highestBidder?.username || 'Bidder',
          },
          endsAt: payload.endsAt,
          totalBids: payload.totalBids,
        };
      });

      // Insert and deduplicate new bid, strictly sorted with newest on top
      if (payload.bid) {
        setBids((prev) => {
          if (prev.some((b) => b.id === payload.bid.id)) return prev;
          const merged = [payload.bid, ...prev];
          return merged
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 30);
        });
      }

      // Re-fetch auction details to update offerings leaderboard accurately
      fetchAuctionDetails();

      if (payload.isOvertimeRestart) {
        setIsOvertime(true);
        setLastExtensionNotice(
          `⚡ 10s OVERTIME RESTARTS: TOP OFFERING ฿${payload.currentPrice.toFixed(2)} BY ${payload.highestBidderName}!`
        );
      } else {
        setLastExtensionNotice(
          `⚡ NEW TOP OFFERING: ฿${payload.currentPrice.toFixed(2)} BY ${payload.highestBidderName}`
        );
      }
      setTimeout(() => setLastExtensionNotice(null), 2500);
    };

    const handleBidError = (payload: { message: string }) => {
      soundFx.playError();
      setErrorMsg(payload.message?.split(':')[1] || payload.message || 'Bid rejected');
      setTimeout(() => setErrorMsg(null), 3500);
    };

    const handleAuctionSettled = (payload: any) => {
      if (payload.auctionId !== id) return;

      soundFx.playVictory();
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {}

      setAuction((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'ENDED',
          winnerId: payload.winnerId,
          winner: payload.winnerName ? { username: payload.winnerName } : null,
          settledAt: payload.settledAt,
        };
      });

      if (user && payload.winnerId === user.id) {
        setIsWinner(true);
        fetchAuctionDetails(); // Fetch claimToken
      }
    };

    socket.on('bid_success', handleBidSuccess);
    socket.on('bid_error', handleBidError);
    socket.on('auction_settled', handleAuctionSettled);

    return () => {
      socket.off('bid_success', handleBidSuccess);
      socket.off('bid_error', handleBidError);
      socket.off('auction_settled', handleAuctionSettled);
    };
  }, [socket, id, user, fetchAuctionDetails]);

  // Robust Cumulative Offering Bid Placement Handler
  const handleAddCreditsToOffering = async (creditsToAdd: number) => {
    if (!user) {
      alert('Please log in to place bids!');
      return;
    }

    if (!hasJoinedRoom) {
      soundFx.playError();
      setErrorMsg('YOU MUST ENTER THE LOT ARENA FIRST BEFORE BIDDING!');
      return;
    }

    if (auction?.status !== 'ACTIVE') {
      soundFx.playError();
      setErrorMsg('AUCTION LOT IS CLOSED!');
      return;
    }

    if (user.credits < creditsToAdd) {
      soundFx.playError();
      setErrorMsg(`INSUFFICIENT BALANCE! (NEED ฿${creditsToAdd} CREDITS, YOU HAVE ฿${user.credits})`);
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }

    setSubmittingBid(true);
    setErrorMsg(null);

    try {
      soundFx.playBid();
      const res = await fetch(`/api/auctions/${id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ creditAmount: creditsToAdd }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // 1. Deduct credits immediately in HUD
        deductCreditsLocally(creditsToAdd);

        // 2. Direct State Update for lag-free instant response
        setAuction((prev: any) => ({
          ...prev,
          currentPrice: data.auction.currentPrice,
          highestBidderId: data.auction.highestBidderId,
          highestBidder: {
            id: data.auction.highestBidderId,
            username: data.auction.highestBidderName,
          },
          endsAt: data.auction.endsAt,
          totalBids: data.auction.totalBids,
        }));

        setMyOffering(data.userOffering || myOffering + creditsToAdd);
        setCustomAddAmount('');

        // Deduplicate and order strictly descending
        if (data.bid) {
          setBids((prev) => {
            if (prev.some((b) => b.id === data.bid.id)) return prev;
            const merged = [data.bid, ...prev];
            return merged
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
              .slice(0, 30);
          });
        }

        if (data.isOvertimeRestart) {
          setIsOvertime(true);
          setLastExtensionNotice(
            `⚡ 10s OVERTIME RESTARTS: TOP OFFERING ฿${data.auction.currentPrice.toFixed(2)} BY YOU!`
          );
        } else {
          setLastExtensionNotice(
            `⚡ OFFERING REGISTERED! TOTAL OFFERING: ฿${data.userOffering?.toFixed(2)} (LEADING)`
          );
        }
        setTimeout(() => setLastExtensionNotice(null), 2500);

        fetchAuctionDetails();
      } else {
        soundFx.playError();
        setErrorMsg(data.error?.split(':')[1] || data.error || 'Bid rejected');
        setTimeout(() => setErrorMsg(null), 4000);
      }
    } catch {
      soundFx.playError();
      setErrorMsg('Network congestion. Retry offering!');
      setTimeout(() => setErrorMsg(null), 2500);
    } finally {
      setSubmittingBid(false);
    }
  };

  // Copy Claim Token to Clipboard
  const handleCopyToken = () => {
    if (!claimTokenData?.claimToken) return;
    soundFx.playCoin();
    navigator.clipboard.writeText(claimTokenData.claimToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  if (loading || !auction) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="gold-card p-8 border border-[#e6c35c]/30 text-[#e6c35c] font-pixel text-xs animate-pulse">
          CONNECTING TO LIVE LOT FLOOR...
        </div>
      </div>
    );
  }

  const isEnded = auction.status === 'ENDED';
  const isUserLeading = user && auction.highestBidderId === user.id;

  // Multi-image list
  const images: string[] =
    auction.imagesList && auction.imagesList.length > 0
      ? auction.imagesList
      : [auction.imageUrl];
  const activeImage = images[activeImageIndex] || auction.imageUrl;

  // Cumulative Offering Calculations
  const currentTopOffering = Math.max(auction.startingPrice, auction.currentPrice);
  const minToLead = isUserLeading
    ? currentTopOffering
    : currentTopOffering > 0
    ? currentTopOffering + 1
    : Math.max(1, auction.startingPrice);

  const creditsNeededToLead = isUserLeading
    ? 1
    : Math.max(1, minToLead - myOffering);

  const userCanAffordLead = (user?.credits ?? 0) >= creditsNeededToLead;

  // Quick Outbid Tiers (relative to minimum to lead)
  const quickOutbidButtons = [
    {
      label: 'OUTBID +฿1',
      delta: 0,
      creditsToAdd: creditsNeededToLead,
      newTotal: isUserLeading ? myOffering + 1 : minToLead,
    },
    {
      label: 'OUTBID +฿5',
      delta: 4,
      creditsToAdd: isUserLeading ? 5 : creditsNeededToLead + 4,
      newTotal: isUserLeading ? myOffering + 5 : minToLead + 4,
      popular: true,
    },
    {
      label: 'OUTBID +฿10',
      delta: 9,
      creditsToAdd: isUserLeading ? 10 : creditsNeededToLead + 9,
      newTotal: isUserLeading ? myOffering + 10 : minToLead + 9,
    },
    {
      label: 'OUTBID +฿50',
      delta: 49,
      creditsToAdd: isUserLeading ? 50 : creditsNeededToLead + 49,
      newTotal: isUserLeading ? myOffering + 50 : minToLead + 49,
    },
  ];

  const parsedCustomAdd = parseInt(customAddAmount, 10);
  const isValidCustomAdd =
    !isNaN(parsedCustomAdd) &&
    parsedCustomAdd >= (isUserLeading ? 1 : creditsNeededToLead) &&
    parsedCustomAdd <= (user?.credits ?? 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e6c35c]/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[9px] bg-[#e6c35c]/10 text-[#e6c35c] border border-[#e6c35c]/30 px-2 py-0.5 uppercase">
              LOT #{auction.id.slice(-6).toUpperCase()}
            </span>
            <span className="text-gray-400 text-xs font-mono">• {auction.category || 'GAMING ASSET'}</span>
            <span className="badge-green text-[7px] py-0.5 px-1.5 font-mono">1 BAHT = 1 CREDIT</span>
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight mt-1">
            {auction.title}
          </h1>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`font-pixel text-[8px] px-2 py-1 flex items-center gap-1.5 border ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                : 'bg-[#141722] text-[#e6c35c] border-[#e6c35c]/30'
            }`}
            title={isConnected ? 'Connected via Low-Latency WebSocket' : 'Syncing via Cloud Polling Protocol'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-[#e6c35c]'}`} />
            {isConnected ? 'LIVE WEBSOCKET' : 'CLOUD SYNC'}
          </span>
          <span
            className={`font-pixel text-[9px] px-3 py-1.5 uppercase ${
              isEnded
                ? 'badge-red'
                : isOvertime
                ? 'badge-gold pulse-gold font-bold'
                : 'badge-green'
            }`}
          >
            {isEnded
              ? 'AUCTION SETTLED'
              : isOvertime
              ? '⚡ 10s SUDDEN DEATH OVERTIME'
              : 'LIVE FLOOR OPEN'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Multi-Image Carousel & Lot Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="gold-card overflow-hidden border border-[#e6c35c]/25">
            {/* Header Tag */}
            <div className="bg-[#0b0d13] border-b border-[#e6c35c]/15 px-4 py-2.5 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#e6c35c]" />
                <span className="text-sm font-semibold text-white">{auction.title}</span>
              </div>
              <span className="font-pixel text-[8px] bg-black text-[#e6c35c] border border-[#e6c35c]/30 px-2 py-0.5 uppercase">
                {auction.category || 'GAMING ASSET'}
              </span>
            </div>

            {/* Showcase Image Carousel Slider */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-black select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage}
                alt={auction.title}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#11141d] via-transparent to-transparent opacity-85 pointer-events-none" />

              {/* Slider Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/75 hover:bg-[#e6c35c] text-white hover:text-black border border-gray-700 hover:border-[#e6c35c] transition-all z-10"
                    title="Previous picture"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/75 hover:bg-[#e6c35c] text-white hover:text-black border border-gray-700 hover:border-[#e6c35c] transition-all z-10"
                    title="Next picture"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Dot Indicators */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 bg-black/70 px-2 py-1 rounded-full border border-gray-800">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === activeImageIndex ? 'bg-[#e6c35c] w-4' : 'bg-gray-500'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Real-Time Live Notification Banner */}
              {lastExtensionNotice && (
                <div className="absolute top-3 left-3 right-3 bg-[#e6c35c] text-black px-3 py-2 text-xs font-semibold text-center shadow-lg animate-bounce font-sans z-20">
                  {lastExtensionNotice}
                </div>
              )}

              {/* Bottom Specs Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono z-10 pointer-events-none">
                <div className="bg-black/80 border border-gray-800 px-2.5 py-1 text-gray-300 backdrop-blur-sm">
                  RATE: <span className="text-[#e6c35c] font-bold">1 BAHT = 1 CREDIT</span>
                </div>
                <div className="bg-black/80 border border-gray-800 px-2.5 py-1 text-[#e6c35c] backdrop-blur-sm">
                  {isOvertime ? 'OVERTIME: RESTARTS TO 10s' : 'SCHEDULED COUNTDOWN'}
                </div>
              </div>
            </div>

            {/* Thumbnail Row if multiple images */}
            {images.length > 1 && (
              <div className="p-3 bg-[#08090c] border-t border-[#e6c35c]/15 flex items-center gap-2.5 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative w-16 h-12 shrink-0 border-2 overflow-hidden transition-all ${
                      i === activeImageIndex
                        ? 'border-[#e6c35c] shadow-[0_0_8px_rgba(230,195,92,0.4)]'
                        : 'border-gray-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Lot Specifications & Description */}
            <div className="p-5 space-y-3 bg-[#0d0f17] border-t border-[#e6c35c]/15">
              <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 uppercase font-mono">
                <ShieldCheck className="w-4 h-4 text-[#e6c35c]" />
                PRODUCT &amp; REWARD SPECIFICATIONS
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed bg-[#12151f] p-3.5 border border-gray-800 font-sans">
                {auction.description}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#e6c35c] font-mono">
                <KeyRound className="w-3.5 h-3.5" />
                <span>OFFICIAL REWARD: WINNER RECEIVES SECRET DISCORD CLAIM TOKEN UPON FINAL GAVEL.</span>
              </div>
            </div>
          </div>

          {/* Settled / Winner Discord Claim Token Panel */}
          {isEnded && (
            <div className="gold-card p-6 space-y-5 border-[#e6c35c]/60 shadow-[0_0_30px_rgba(230,195,92,0.15)] bg-gradient-to-br from-[#121522] via-[#0d0f17] to-[#08090c]">
              <div className="flex items-center gap-3.5 border-b border-[#e6c35c]/20 pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#fbe38e] via-[#e6c35c] to-[#9b7e28] flex items-center justify-center border border-[#fbe38e] shadow-[0_0_15px_rgba(230,195,92,0.4)] shrink-0">
                  <Trophy className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                    LOT FINALIZED &amp; SETTLED
                  </h3>
                  <p className="text-xs text-gray-300 font-mono mt-0.5">
                    WINNING OFFERING:{' '}
                    <span className="text-[#e6c35c] font-bold text-sm">
                      ฿{auction.currentPrice.toFixed(2)}
                    </span>{' '}
                    BY{' '}
                    <span className="text-white font-semibold">
                      {auction.winner?.username || auction.highestBidder?.username || 'No Bids'}
                    </span>
                  </p>
                </div>
              </div>

              {/* If User is the Certified Winner */}
              {isWinner || (user && auction.winnerId === user.id) ? (
                <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/40 p-4 text-xs text-emerald-400 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-sm">
                      🏆 CONGRATULATIONS! YOU WON THIS LOT!
                    </div>
                    <p className="text-gray-300 font-sans leading-relaxed">
                      Your winning offering of ฿{auction.currentPrice.toFixed(2)} has been certified. Your unique Discord Claim Token has been generated below.
                    </p>
                  </div>

                  {claimTokenData ? (
                    <div className="bg-[#090b10] border border-[#e6c35c]/40 p-5 space-y-4">
                      <div>
                        <span className="font-pixel text-[9px] text-gray-400 uppercase block mb-1.5">
                          OFFICIAL DISCORD CLAIM TOKEN
                        </span>
                        <div className="bg-[#141824] border border-[#e6c35c]/40 p-3.5 flex items-center justify-between gap-3">
                          <code className="text-sm md:text-base font-mono font-extrabold text-[#e6c35c] tracking-wider truncate">
                            {claimTokenData.claimToken}
                          </code>
                          <button
                            onClick={handleCopyToken}
                            className="btn-gold px-3 py-2 text-[9px] flex items-center gap-1.5 shrink-0"
                            title="Copy Claim Token"
                          >
                            {copiedToken ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-black" />
                                <span>COPIED!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-black" />
                                <span>COPY TOKEN</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Discord Ticket Instructions */}
                      <div className="space-y-2 bg-[#0d101a] p-3.5 border border-gray-800 text-xs font-sans">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-[#e6c35c]" />
                          <span>HOW TO CLAIM YOUR REWARD:</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px] leading-relaxed">
                          <li>Click the button below to join our official Discord server.</li>
                          <li>Open a ticket in the <strong className="text-white">#claim-rewards</strong> channel.</li>
                          <li>Paste your Claim Token (<code className="text-[#e6c35c]">{claimTokenData.claimToken}</code>) to staff to verify and receive your prize!</li>
                        </ol>
                      </div>

                      <a
                        href={claimTokenData.discordUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full btn-gold py-3 text-xs flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4 text-black" />
                        <span>JOIN DISCORD TO CLAIM REWARD</span>
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <button
                        onClick={fetchAuctionDetails}
                        className="btn-gold px-4 py-2 text-xs"
                      >
                        RELOAD WINNER TOKEN
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#0d101a] border border-gray-800 p-4 text-xs text-gray-400 space-y-2 font-sans">
                  <div className="text-white font-semibold">LOT SETTLED &amp; CLOSED</div>
                  <p>
                    The 10-second countdown concluded with no further bids. This lot has been permanently awarded. The official Discord Claim Token is only accessible by the verified winner.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Offerings Leaderboard Table */}
          <div className="gold-card p-5 space-y-3.5 border border-[#e6c35c]/25">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#e6c35c]" />
                TOTAL OFFERINGS RANKING ({offerings.length} BIDDERS)
              </span>
              <span className="badge-gold text-[8px]">ALL-PAY TOTALS</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {offerings.length === 0 ? (
                <p className="text-gray-500 text-center py-4 font-sans text-xs">
                  No offerings on the table yet. Be the first to place an offering!
                </p>
              ) : (
                offerings.map((off, idx) => {
                  const isTop = idx === 0;
                  const isMe = user && off.user.id === user.id;

                  return (
                    <div
                      key={off.user.id}
                      className={`p-3 border flex items-center justify-between transition-colors ${
                        isTop
                          ? 'bg-[#181d29] border-[#e6c35c]/50 text-white'
                          : 'bg-[#0a0c12] border-gray-800/80 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-pixel text-[9px] w-6 h-6 flex items-center justify-center font-bold ${
                            isTop ? 'bg-[#e6c35c] text-black' : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            {off.user.username}
                            {isMe && <span className="text-[#e6c35c] text-[10px]">(YOU)</span>}
                            {isTop && <Crown className="w-3.5 h-3.5 text-[#e6c35c]" />}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {isTop ? 'CURRENT HIGHEST OFFERING' : 'OUTBID'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold font-mono-num text-[#e6c35c]">
                          ฿{off.totalOffering.toFixed(2)}
                        </div>
                        <span className="text-[9px] text-gray-400">Total Committed</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Gavel Console & Cumulative Offering Bidding (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="gold-card p-6 space-y-5 border border-[#e6c35c]/25">
            {/* Header: Dynamic Countdown Clock */}
            <div className="text-center space-y-2">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest block">
                {isEnded
                  ? 'AUCTION LOT SETTLED'
                  : isOvertime
                  ? '⚡ 10s OVERTIME (RESETS ON BID)'
                  : 'SCHEDULED MAIN COUNTDOWN'}
              </span>
              <div className="flex justify-center">
                <CountdownTimer
                  endsAt={auction.endsAt}
                  size="lg"
                  onExpire={() => {
                    fetchAuctionDetails();
                  }}
                />
              </div>
            </div>

            {/* Current Top Offering Display */}
            <div className="bg-[#0b0d14] border border-[#e6c35c]/35 p-5 text-center shadow-inner">
              <span className="text-[10px] text-gray-400 font-mono uppercase block tracking-wider">
                CURRENT HIGHEST OFFERING
              </span>
              <div className="text-3xl md:text-5xl font-extrabold font-mono-num text-[#e6c35c] tracking-tight my-1.5">
                ฿{auction.currentPrice.toFixed(2)}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <Crown className="w-4 h-4 text-[#e6c35c]" />
                <span className="text-gray-400 font-mono">TOP BIDDER:</span>
                <span
                  className={`font-semibold font-mono ${
                    isUserLeading ? 'text-[#e6c35c]' : 'text-gray-200'
                  }`}
                >
                  {auction.highestBidder?.username || 'NO BIDS YET'}
                  {isUserLeading && ' (YOU)'}
                </span>
              </div>
            </div>

            {/* Your Personal Offering Stats */}
            <div className="bg-[#121522] border border-[#e6c35c]/25 p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">YOUR COMMITTED OFFERING:</span>
                <span className="font-bold font-mono-num text-white">
                  ฿{myOffering.toFixed(2)}{' '}
                  {isUserLeading ? (
                    <span className="text-emerald-400 text-[10px]">(LEADING 👑)</span>
                  ) : myOffering > 0 ? (
                    <span className="text-amber-400 text-[10px]">(OUTBID ⚠️)</span>
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">YOUR WALLET BALANCE:</span>
                <span className="font-bold font-mono-num text-[#e6c35c]">
                  {user?.credits ?? 0} CREDITS (฿{user?.credits ?? 0})
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-800">
                <span className="text-gray-300">MIN. TO TAKE/HOLD LEAD:</span>
                <span className="font-bold font-mono-num text-white">
                  ฿{minToLead.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">CREDITS NEEDED FROM BALANCE:</span>
                <span
                  className={`font-bold font-mono-num ${
                    userCanAffordLead ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  ฿{creditsNeededToLead} Credits
                </span>
              </div>
            </div>

            {/* Error Message Toast */}
            {errorMsg && (
              <div className="bg-red-950/60 border border-red-500 text-red-300 p-2.5 text-xs text-center font-mono">
                {errorMsg}
              </div>
            )}

            {/* Mandatory Room Gate: Must join room to bid */}
            {!isEnded && !hasJoinedRoom ? (
              <div className="bg-[#0d101a] border border-[#e6c35c]/30 p-5 text-center space-y-3.5">
                <div className="flex items-center justify-center gap-2 text-[#e6c35c] text-xs font-semibold">
                  <Gavel className="w-4 h-4 text-[#e6c35c]" />
                  <span>LOT ARENA REGISTRATION REQUIRED</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  You must enter this lot arena to verify bidder status and unlock real-time bidding controls.
                </p>
                <button
                  onClick={handleJoinRoom}
                  className="w-full btn-gold py-3 text-xs flex items-center justify-center gap-2"
                >
                  <Gavel className="w-4 h-4 text-black" />
                  <span>ENTER LOT ARENA &amp; UNLOCK GAVEL</span>
                </button>
              </div>
            ) : (
              /* Bidding Controls (Unlocked after joining) */
              <div className="space-y-4">
                {/* Insufficient Balance Warning Box (if balance cannot beat top price) */}
                {!userCanAffordLead && !isEnded && (
                  <div className="bg-red-950/50 border border-red-500/60 p-4 space-y-2 text-xs font-sans">
                    <div className="text-red-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>INSUFFICIENT BALANCE TO LEAD THIS LOT</span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      Current highest offering is <strong className="text-white">฿{currentTopOffering.toFixed(2)}</strong>. You need at least <strong className="text-[#e6c35c]">฿{creditsNeededToLead}</strong> more from your balance, but you only have <strong className="text-red-300">฿{user?.credits ?? 0}</strong>.
                    </p>
                    <a
                      href="/wallet"
                      className="btn-gold py-2 px-3 text-[9px] flex items-center justify-center gap-1.5 mt-2"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-black" />
                      <span>TOP UP WALLET VIA PROMPTPAY</span>
                    </a>
                  </div>
                )}

                {/* Quick Outbid Buttons (adds to offering to take lead) */}
                <div className="space-y-2">
                  <span className="text-[10px] text-gray-400 font-mono uppercase block">
                    QUICK OUTBID OPTIONS (ADDS TO YOUR OFFERING):
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    {quickOutbidButtons.map((opt) => {
                      const canAffordThis = (user?.credits ?? 0) >= opt.creditsToAdd;

                      return (
                        <button
                          key={opt.label}
                          onClick={() => handleAddCreditsToOffering(opt.creditsToAdd)}
                          disabled={isEnded || !canAffordThis || submittingBid}
                          className={`p-3 text-center border font-mono transition-all relative ${
                            isEnded || !canAffordThis
                              ? 'bg-[#0f1118] border-gray-800 text-gray-600 cursor-not-allowed opacity-60'
                              : opt.popular
                              ? 'btn-gold shadow-md hover:scale-[1.02]'
                              : 'bg-[#141824] border-[#e6c35c]/30 text-white hover:border-[#e6c35c] hover:bg-[#1a2030] active:scale-95'
                          }`}
                        >
                          <div className="font-pixel text-[9px] font-bold">
                            {opt.label}
                          </div>
                          <div
                            className={`text-xs mt-1 font-mono-num font-bold ${
                              opt.popular && canAffordThis ? 'text-black' : 'text-[#e6c35c]'
                            }`}
                          >
                            +฿{opt.creditsToAdd} from Wallet
                          </div>
                          <div className="text-[8px] text-gray-400 mt-0.5">
                            New Total: ฿{opt.newTotal.toFixed(2)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Amount Offering Input */}
                <div className="bg-[#0b0d14] border border-[#e6c35c]/30 p-3.5 space-y-3 font-mono text-xs">
                  <label className="text-gray-300 font-bold block text-[11px] font-sans">
                    OR TYPE CUSTOM CREDITS TO ADD TO OFFERING:
                  </label>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-2.5 text-gray-400">฿</span>
                      <input
                        type="number"
                        placeholder={`Min +฿${creditsNeededToLead}`}
                        value={customAddAmount}
                        onChange={(e) => setCustomAddAmount(e.target.value)}
                        min={creditsNeededToLead}
                        max={user?.credits ?? 0}
                        className="w-full bg-[#121522] border border-[#e6c35c]/30 pl-7 pr-3 py-2 text-white font-mono text-xs focus:border-[#e6c35c] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddCreditsToOffering(parsedCustomAdd)}
                      disabled={!isValidCustomAdd || isEnded || submittingBid}
                      className={`px-3 py-2 text-[9px] font-pixel transition-all ${
                        isValidCustomAdd && !isEnded && !submittingBid
                          ? 'btn-gold'
                          : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      }`}
                    >
                      {submittingBid ? 'SENDING...' : 'ADD & LEAD'}
                    </button>
                  </div>

                  {/* Real-Time Preview of Custom Offering */}
                  {!isNaN(parsedCustomAdd) && parsedCustomAdd > 0 && (
                    <div className="bg-[#141824] p-2.5 border border-gray-800 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Offering:</span>
                        <span className="text-white">฿{myOffering.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Adding:</span>
                        <span className="text-emerald-400">+฿{parsedCustomAdd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-800 font-bold">
                        <span className="text-[#e6c35c]">New Total Offering:</span>
                        <span className="text-[#e6c35c]">
                          ฿{(myOffering + parsedCustomAdd).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-center text-gray-400 leading-normal font-sans pt-1">
                  1 Credit = 1 Baht. In 10s overtime, every new leading offering restarts the countdown to 10s.
                </p>
              </div>
            )}
          </div>

          {/* Live Bid Stream Order Book */}
          <div className="gold-card p-4 space-y-3 border border-[#e6c35c]/25">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2.5 text-xs font-mono">
              <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#e6c35c]" />
                LIVE BID TRANSACTIONS (#{auction.totalBids})
              </span>
              <span className="text-[#e6c35c] text-[10px]">AUTOSYNC</span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 text-xs font-mono pr-1">
              {bids.length === 0 ? (
                <div className="text-gray-500 text-center py-8 font-sans text-xs">
                  No offerings placed yet. Be the first to bid!
                </div>
              ) : (
                bids.map((b, idx) => (
                  <div
                    key={b.id || idx}
                    className={`flex items-center justify-between p-2.5 border transition-all ${
                      idx === 0
                        ? 'bg-[#181d29] border-[#e6c35c]/50 text-[#e6c35c]'
                        : 'bg-[#0a0c12] border-gray-800/80 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-gray-500 text-[10px]">
                        {new Date(b.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      <span className="font-semibold text-white truncate max-w-[120px]">
                        {b.user.username}
                      </span>
                      {idx === 0 && (
                        <span className="badge-gold text-[7px] py-0 px-1 font-pixel">TOP</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono-num">
                      <span className="text-[10px] text-gray-400">Added:</span>
                      <span className="font-bold text-emerald-400">
                        +฿{b.creditCost}
                      </span>
                      <span className="text-[9px] bg-black/60 px-1.5 py-0.5 text-[#e6c35c] border border-gray-800">
                        Total ฿{b.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
