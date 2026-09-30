'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { soundFx } from '@/lib/soundFx';
import {
  Shield,
  Trophy,
  Receipt,
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Clock,
  Zap,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  KeyRound,
  Trash2,
  Lock,
  Unlock,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'ACTIVE_LOTS' | 'SETTLED_LOTS' | 'SLIPS'>('ACTIVE_LOTS');

  // Master Admin Security Gate State
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [securityPasskeyInput, setSecurityPasskeyInput] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);
  const [verifyingGate, setVerifyingGate] = useState(false);

  // Auctions state
  const [auctions, setAuctions] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [newLot, setNewLot] = useState({
    title: '',
    description: '',
    category: 'Free Fire',
    startingPrice: '0.00',
    durationMinutes: '10',
    discordUrl: 'https://discord.gg/aurum8bit',
  });
  const [creatingLot, setCreatingLot] = useState(false);

  // Slips state
  const [slips, setSlips] = useState<any[]>([]);
  const [selectedSlipImage, setSelectedSlipImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Authentication check: redirect to /login if not admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login?redirect=/admin');
    }
  }, [user, authLoading, router]);

  // Check if admin gate was previously unlocked in this session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isUnlocked = sessionStorage.getItem('aurum_admin_unlocked') === 'true';
      if (isUnlocked) {
        setAdminUnlocked(true);
      }
    }
  }, []);

  const fetchAdminData = useCallback(async () => {
    try {
      const [aucRes, slipRes] = await Promise.all([
        fetch('/api/admin/auctions'),
        fetch('/api/admin/topups'),
      ]);

      if (aucRes.ok) {
        const d = await aucRes.json();
        setAuctions(d.auctions || []);
      }
      if (slipRes.ok) {
        const d = await slipRes.json();
        setSlips(d.requests || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN' && adminUnlocked) {
      fetchAdminData();
    }
  }, [user, adminUnlocked, fetchAdminData]);

  // Handle Master Security Token Verification
  const handleVerifyGateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityPasskeyInput.trim()) {
      setGateError('Please enter the master security token');
      return;
    }

    setVerifyingGate(true);
    setGateError(null);
    soundFx.playBid();

    try {
      const res = await fetch('/api/admin/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ securityToken: securityPasskeyInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundFx.playCoin();
        sessionStorage.setItem('aurum_admin_unlocked', 'true');
        setAdminUnlocked(true);
        fetchAdminData();
      } else {
        soundFx.playError();
        setGateError(data.error || 'Invalid master security token. Access denied.');
      }
    } catch {
      soundFx.playError();
      setGateError('Verification service error. Check connection.');
    } finally {
      setVerifyingGate(false);
    }
  };

  const handleLockTerminal = () => {
    soundFx.playBid();
    sessionStorage.removeItem('aurum_admin_unlocked');
    setAdminUnlocked(false);
    setSecurityPasskeyInput('');
  };

  // Handle Multi-Image Upload (base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    soundFx.playCoin();
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setUploadedImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Unified Single-Step Launch Lot
  const handleLaunchLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLot.title.trim()) {
      alert('Lot Title is required');
      return;
    }

    setCreatingLot(true);

    try {
      const res = await fetch('/api/admin/auctions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newLot.title.trim(),
          description: newLot.description.trim(),
          category: newLot.category,
          images: uploadedImages,
          startingPrice: parseFloat(newLot.startingPrice) || 0,
          durationMinutes: parseFloat(newLot.durationMinutes) || 10,
          discordUrl: newLot.discordUrl.trim() || 'https://discord.gg/aurum8bit',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundFx.playCoin();
        setShowCreateModal(false);
        setUploadedImages([]);
        setNewLot({
          title: '',
          description: '',
          category: 'Free Fire',
          startingPrice: '0.00',
          durationMinutes: '10',
          discordUrl: 'https://discord.gg/aurum8bit',
        });
        fetchAdminData();
      } else {
        soundFx.playError();
        alert(data.error || 'Failed to create auction lot');
      }
    } catch {
      alert('Network error creating lot');
    } finally {
      setCreatingLot(false);
    }
  };

  // Handle Auction Status Update (PAUSE, RESUME, SETTLE, SET REMAINING SECONDS)
  const handleUpdateAuctionStatus = async (
    auctionId: string,
    status?: string,
    extendMinutes?: number,
    setRemainingSeconds?: number
  ) => {
    try {
      soundFx.playBid();
      const res = await fetch(`/api/admin/auctions/${auctionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status, extendMinutes, setRemainingSeconds }),
      });

      if (res.ok) {
        fetchAdminData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update auction');
      }
    } catch {
      alert('Error updating auction status');
    }
  };

  // Copy Claim Token
  const handleCopyClaimToken = (tokenStr: string, id: string) => {
    soundFx.playCoin();
    navigator.clipboard.writeText(tokenStr);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  // Handle Slip Approve (1 Baht = 1 Credit)
  const handleApproveSlip = async (slipId: string) => {
    setActionLoading(slipId);
    try {
      const res = await fetch(`/api/admin/topups/${slipId}/approve`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundFx.playCoin();
        fetchAdminData();
      } else {
        soundFx.playError();
        alert(data.error || 'Failed to approve slip');
      }
    } catch {
      alert('Error approving slip');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Slip Reject
  const handleRejectSlip = async (slipId: string) => {
    const reason = prompt('Enter rejection reason (e.g. Unverified payment slip):');
    if (reason === null) return;

    setActionLoading(slipId);
    try {
      const res = await fetch(`/api/admin/topups/${slipId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ notes: reason }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundFx.playBid();
        fetchAdminData();
      } else {
        alert(data.error || 'Failed to reject slip');
      }
    } catch {
      alert('Error rejecting slip');
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="gold-card p-8 border border-[#e6c35c]/30 text-[#e6c35c] font-pixel text-xs animate-pulse">
          AUTHENTICATING OPERATOR CREDENTIALS...
        </div>
      </div>
    );
  }

  // MASTER SECURITY TOKEN GATE: Renders if admin gate is not yet verified!
  if (!adminUnlocked) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="gold-card p-8 md:p-10 border-2 border-[#e6c35c]/40 space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-br from-[#121522] via-[#0d0f17] to-[#08090c]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#e6c35c]/5 rounded-full blur-2xl pointer-events-none" />

          {/* Security Gate Header */}
          <div className="text-center space-y-3 border-b border-[#e6c35c]/25 pb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-[#fbe38e] via-[#e6c35c] to-[#9b7e28] mx-auto flex items-center justify-center border-2 border-[#fbe38e] shadow-[0_0_20px_rgba(230,195,92,0.4)]">
              <Lock className="w-7 h-7 text-black" />
            </div>
            <div className="space-y-1">
              <span className="badge-red text-[8px] font-pixel px-2 py-0.5">
                RESTRICTED LEVEL 5 CLEARANCE
              </span>
              <h1 className="text-lg md:text-xl font-bold text-white tracking-wide font-pixel pt-1">
                MASTER SECURITY GATE
              </h1>
              <p className="text-xs text-gray-400 font-mono">
                ENTER THE MASTER ENCRYPTED PASSKEY TOKEN TO UNLOCK THE ADMIN CONSOLE
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {gateError && (
            <div className="bg-red-950/70 border border-red-500 text-red-300 p-3 text-xs text-center font-mono space-y-1">
              <div className="font-bold flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>ACCESS DENIED</span>
              </div>
              <p className="text-[11px]">{gateError}</p>
            </div>
          )}

          {/* Security Token Form */}
          <form onSubmit={handleVerifyGateToken} className="space-y-4 font-mono text-xs">
            <div>
              <label className="text-gray-300 block mb-2 font-sans text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-white font-semibold">
                  <KeyRound className="w-4 h-4 text-[#e6c35c]" />
                  MASTER SECURITY PASSKEY TOKEN:
                </span>
                <span className="text-[10px] text-gray-400">ENCRYPTED</span>
              </label>

              <input
                type="password"
                required
                placeholder="Enter master admin security token..."
                value={securityPasskeyInput}
                onChange={(e) => setSecurityPasskeyInput(e.target.value)}
                className="w-full bg-[#08090c] border border-[#e6c35c]/40 p-3.5 text-white font-mono text-sm tracking-widest focus:border-[#e6c35c] focus:outline-none shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={verifyingGate}
              className="w-full btn-gold py-3.5 text-xs flex items-center justify-center gap-2 font-pixel shadow-lg"
            >
              <Unlock className="w-4 h-4 text-black" />
              <span>
                {verifyingGate ? 'DECRYPTING TOKEN...' : 'VERIFY PASSKEY & UNLOCK CONSOLE'}
              </span>
            </button>
          </form>

          {/* Security Info Notice */}
          <div className="bg-[#090b10] border border-gray-800 p-3.5 text-[11px] text-gray-400 font-sans space-y-1">
            <span className="text-[#e6c35c] font-bold block font-mono text-xs">
              🔒 SECURITY NOTICE:
            </span>
            <p className="leading-relaxed">
              To prevent unauthorized operations, admin console access strictly requires this master encrypted security token. Master passkey is configured in system environment: <code className="text-[#e6c35c] font-mono text-[10px]">AURUM-ADMIN-8888-MASTER</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeAuctions = auctions.filter((a) => a.status === 'ACTIVE' || a.status === 'PAUSED');
  const settledAuctions = auctions.filter((a) => a.status === 'ENDED');
  const pendingSlipsCount = slips.filter((s) => s.status === 'PENDING').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e6c35c]/20 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-[#fbe38e] via-[#e6c35c] to-[#9b7e28] flex items-center justify-center border border-[#fbe38e] shadow-[0_0_10px_rgba(230,195,92,0.3)]">
              <Shield className="w-4 h-4 text-black" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              EXECUTIVE <span className="gold-gradient-text font-pixel text-base md:text-lg">ADMIN CONSOLE</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
            <span>OPERATOR: <strong className="text-[#e6c35c]">{user?.email}</strong></span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">GATE: UNLOCKED ✓</span>
            <span>•</span>
            <span className="text-gray-400">RATE: 1 BAHT = 1 CREDIT</span>
          </div>
        </div>

        {/* Lock Terminal & Tab Navigation */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#0e1017] p-1 border border-[#e6c35c]/25">
            <button
              onClick={() => setActiveTab('ACTIVE_LOTS')}
              className={`px-3 py-2 text-[9px] font-pixel flex items-center gap-2 transition-all ${
                activeTab === 'ACTIVE_LOTS'
                  ? 'btn-gold'
                  : 'text-gray-400 hover:text-white hover:bg-[#161a25]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>ACTIVE ({activeAuctions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('SETTLED_LOTS')}
              className={`px-3 py-2 text-[9px] font-pixel flex items-center gap-2 transition-all ${
                activeTab === 'SETTLED_LOTS'
                  ? 'btn-gold'
                  : 'text-gray-400 hover:text-white hover:bg-[#161a25]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>SETTLED ({settledAuctions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('SLIPS')}
              className={`px-3 py-2 text-[9px] font-pixel flex items-center gap-2 transition-all relative ${
                activeTab === 'SLIPS'
                  ? 'btn-gold'
                  : 'text-gray-400 hover:text-white hover:bg-[#161a25]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>SLIPS ({pendingSlipsCount})</span>
              {pendingSlipsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          </div>

          {/* Quick Lock Terminal Button */}
          <button
            onClick={handleLockTerminal}
            className="btn-dark p-2 text-[9px] flex items-center gap-1.5 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
            title="Lock Admin Terminal"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>LOCK</span>
          </button>
        </div>
      </div>

      {/* Action Bar: Launch Product / Lot */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0c12] p-4 border border-[#e6c35c]/25">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
            <KeyRound className="w-4 h-4 text-[#e6c35c]" />
            UNIFIED LOT LAUNCH &amp; DISCORD TOKEN SYSTEM
          </h2>
          <p className="text-xs text-gray-400 font-sans mt-0.5">
            Add a product with multiple pictures and instant slider. Once launched, it immediately appears on the live lobby. Winners receive a secure token to claim in Discord.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-gold px-4 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>+ LAUNCH NEW LOT / PRODUCT</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE LOTS */}
      {activeTab === 'ACTIVE_LOTS' && (
        <div className="space-y-4">
          <div className="gold-card overflow-x-auto border border-[#e6c35c]/20">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b0d13] border-b border-[#e6c35c]/25 text-[#e6c35c]">
                <tr>
                  <th className="p-3.5">SHOWCASE</th>
                  <th className="p-3.5">LOT TITLE &amp; CATEGORY</th>
                  <th className="p-3.5">CURRENT PRICE</th>
                  <th className="p-3.5">BIDS</th>
                  <th className="p-3.5">STATUS</th>
                  <th className="p-3.5">TOP BIDDER</th>
                  <th className="p-3.5">FLOOR CONTROLS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 bg-[#0e1017]">
                {activeAuctions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-gray-400 font-sans">
                      No active lots running. Click <strong className="text-[#e6c35c]">&quot;+ LAUNCH NEW LOT / PRODUCT&quot;</strong> to start your first auction!
                    </td>
                  </tr>
                ) : (
                  activeAuctions.map((auc) => (
                    <tr key={auc.id} className="hover:bg-[#151926] transition-colors">
                      <td className="p-3.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={auc.imageUrl}
                          alt={auc.title}
                          className="w-14 h-14 object-cover border border-[#e6c35c]/30 rounded-sm"
                        />
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm max-w-xs truncate">
                          <a href={`/auctions/${auc.id}`} className="hover:text-[#e6c35c] underline">
                            {auc.title}
                          </a>
                        </div>
                        <span className="text-[10px] text-cyan-400 font-sans">{auc.category}</span>
                      </td>
                      <td className="p-3.5 font-mono-num font-bold text-base text-[#e6c35c]">
                        ฿{auc.currentPrice.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-cyan-400 font-semibold">#{auc.totalBids}</td>
                      <td className="p-3.5">
                        <span
                          className={`font-pixel text-[8px] px-2 py-1 uppercase ${
                            auc.status === 'ACTIVE' ? 'badge-green' : 'badge-gold'
                          }`}
                        >
                          {auc.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        {auc.highestBidder?.username ? (
                          <span className="text-[#e6c35c] flex items-center gap-1">
                            👑 {auc.highestBidder.username}
                          </span>
                        ) : (
                          <span className="text-gray-500">NO BIDS</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center flex-wrap gap-1.5">
                          {auc.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={() => handleUpdateAuctionStatus(auc.id, 'PAUSED')}
                                className="btn-dark p-2 text-[9px] flex items-center gap-1"
                                title="Pause Bidding"
                              >
                                <Pause className="w-3 h-3 text-amber-400" />
                                <span>PAUSE</span>
                              </button>

                              <button
                                onClick={() => handleUpdateAuctionStatus(auc.id, 'ACTIVE', 5)}
                                className="btn-dark p-2 text-[9px] flex items-center gap-1 text-cyan-300"
                                title="Add 5 Minutes"
                              >
                                <Clock className="w-3 h-3" />
                                <span>+5M</span>
                              </button>

                              <button
                                onClick={() =>
                                  handleUpdateAuctionStatus(auc.id, undefined, undefined, 10)
                                }
                                className="bg-amber-500/15 border border-amber-500/40 text-amber-300 font-pixel text-[8px] px-2 py-1.5 hover:bg-amber-500/30 transition-colors flex items-center gap-1"
                                title="Jump clock to 10s Sudden Death Phase"
                              >
                                <Zap className="w-3 h-3 text-amber-300" />
                                <span>10s TEST</span>
                              </button>

                              <button
                                onClick={() => handleUpdateAuctionStatus(auc.id, 'ENDED')}
                                className="btn-red p-2 text-[9px] flex items-center gap-1"
                                title="Force Settle & Finalize Winner"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>SETTLE</span>
                              </button>
                            </>
                          )}
                          {auc.status === 'PAUSED' && (
                            <button
                              onClick={() => handleUpdateAuctionStatus(auc.id, 'ACTIVE')}
                              className="btn-gold p-2 text-[9px] flex items-center gap-1"
                              title="Resume Bidding"
                            >
                              <Play className="w-3 h-3 text-black" />
                              <span>RESUME</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SETTLED LOTS & DISCORD CLAIM TOKENS */}
      {activeTab === 'SETTLED_LOTS' && (
        <div className="space-y-4">
          <div className="bg-[#0b0d13] p-4 border border-[#e6c35c]/25 space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Trophy className="w-4 h-4 text-[#e6c35c]" />
              DISCORD CLAIM TOKEN VERIFICATION DESK
            </h3>
            <p className="text-xs text-gray-400 font-sans">
              When winners open a Discord ticket, compare the token they paste with the official Claim Token recorded below to verify authenticity and release the gaming asset.
            </p>
          </div>

          <div className="gold-card overflow-x-auto border border-[#e6c35c]/20">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b0d13] border-b border-[#e6c35c]/25 text-[#e6c35c]">
                <tr>
                  <th className="p-3.5">LOT TITLE</th>
                  <th className="p-3.5">FINAL PRICE</th>
                  <th className="p-3.5">CERTIFIED WINNER</th>
                  <th className="p-3.5">DISCORD CLAIM TOKEN</th>
                  <th className="p-3.5">SETTLED AT</th>
                  <th className="p-3.5">VIEW</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 bg-[#0e1017]">
                {settledAuctions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-400 font-sans">
                      No settled lots yet. Completed auctions will appear here with their Discord claim tokens.
                    </td>
                  </tr>
                ) : (
                  settledAuctions.map((auc) => (
                    <tr key={auc.id} className="hover:bg-[#151926] transition-colors">
                      <td className="p-3.5 font-bold text-white max-w-xs truncate">
                        {auc.title}
                      </td>
                      <td className="p-3.5 font-mono-num font-bold text-emerald-400 text-sm">
                        ฿{auc.currentPrice.toFixed(2)}
                      </td>
                      <td className="p-3.5">
                        {auc.winner?.username ? (
                          <div>
                            <div className="font-bold text-[#e6c35c]">🏆 {auc.winner.username}</div>
                            <div className="text-[10px] text-gray-400">{auc.winner.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500">NO BIDS / NO WINNER</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <code className="bg-[#141824] px-2.5 py-1 text-[#e6c35c] font-bold border border-[#e6c35c]/30 text-xs">
                            {auc.claimToken}
                          </code>
                          <button
                            onClick={() => handleCopyClaimToken(auc.claimToken, auc.id)}
                            className="p-1.5 btn-dark text-gray-300 hover:text-white"
                            title="Copy Token"
                          >
                            {copiedTokenId === auc.id ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 text-gray-400 text-[11px]">
                        {auc.settledAt
                          ? new Date(auc.settledAt).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                      <td className="p-3.5">
                        <a
                          href={`/auctions/${auc.id}`}
                          className="btn-dark px-2.5 py-1.5 text-[9px] inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>PAGE</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SLIP APPROVALS */}
      {activeTab === 'SLIPS' && (
        <div className="space-y-4">
          <div className="bg-[#0b0d13] p-4 border border-[#e6c35c]/25 space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Receipt className="w-4 h-4 text-[#e6c35c]" />
              BANK &amp; PROMPTPAY SLIP APPROVAL TABLE (1 BAHT = 1 CREDIT)
            </h3>
            <p className="text-xs text-gray-400 font-sans">
              Review transfer proof slips. Approving adds exactly 1 Credit per 1 Baht deposited directly to player wallet balance.
            </p>
          </div>

          <div className="gold-card overflow-x-auto border border-[#e6c35c]/20">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b0d13] border-b border-[#e6c35c]/25 text-[#e6c35c]">
                <tr>
                  <th className="p-3.5">REQUEST ID</th>
                  <th className="p-3.5">USER DETAILS</th>
                  <th className="p-3.5">PROOF SLIP</th>
                  <th className="p-3.5">DEPOSIT (฿)</th>
                  <th className="p-3.5">CREDITS TO GRANT</th>
                  <th className="p-3.5">STATUS</th>
                  <th className="p-3.5">DATE</th>
                  <th className="p-3.5">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 bg-[#0e1017]">
                {slips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-gray-400 font-sans">
                      No deposit slips submitted yet.
                    </td>
                  </tr>
                ) : (
                  slips.map((s) => (
                    <tr key={s.id} className="hover:bg-[#151926] transition-colors">
                      <td className="p-3.5 text-gray-400 text-[10px]">#{s.id.slice(-6).toUpperCase()}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{s.user.username}</div>
                        <div className="text-[10px] text-gray-400">{s.user.email}</div>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => setSelectedSlipImage(s.slipImage)}
                          className="btn-dark px-2.5 py-1.5 text-[9px] flex items-center gap-1.5"
                        >
                          <Eye className="w-3 h-3 text-[#e6c35c]" />
                          <span>INSPECT</span>
                        </button>
                      </td>
                      <td className="p-3.5 font-mono-num font-bold text-sm text-[#e6c35c]">
                        ฿{s.amount.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-emerald-400 font-bold font-mono-num">
                        +{s.credits} Credits (1:1)
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-pixel text-[8px] px-2 py-1 uppercase ${
                            s.status === 'APPROVED'
                              ? 'badge-green'
                              : s.status === 'REJECTED'
                              ? 'badge-red'
                              : 'badge-gold pulse-gold'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-400 text-[11px]">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5">
                        {s.status === 'PENDING' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApproveSlip(s.id)}
                              disabled={actionLoading === s.id}
                              className="btn-gold px-2.5 py-1.5 text-[9px] flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-3 h-3 text-black" />
                              <span>APPROVE (+{s.credits})</span>
                            </button>
                            <button
                              onClick={() => handleRejectSlip(s.id)}
                              disabled={actionLoading === s.id}
                              className="btn-red px-2.5 py-1.5 text-[9px] flex items-center gap-1.5"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>REJECT</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-500 font-mono">
                            {s.status} by {s.reviewedBy || 'Admin'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UNIFIED MODAL: LAUNCH NEW LOT & UPLOAD MULTIPLE PICTURES */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="gold-card max-w-xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto border border-[#e6c35c]/40 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#e6c35c]/20 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#e6c35c]" />
                <h3 className="font-pixel text-xs text-[#e6c35c]">
                  LAUNCH NEW LOT / PRODUCT
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLaunchLot} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-300 block mb-1 text-[11px] font-sans">
                  LOT TITLE (Required):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Fire: Grandmaster Cobra Bundle Max"
                  value={newLot.title}
                  onChange={(e) => setNewLot({ ...newLot, title: e.target.value })}
                  className="w-full bg-[#0a0c12] border border-[#e6c35c]/30 p-2.5 text-white focus:border-[#e6c35c] focus:outline-none"
                />
              </div>

              {/* Multi-Image Upload Area with Gallery */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[#e6c35c] font-bold block text-[11px]">
                    PRODUCT PICTURES (Upload Multiple for Slider):
                  </label>
                  <span className="text-[10px] text-gray-400 font-sans">
                    {uploadedImages.length} image(s) uploaded
                  </span>
                </div>

                <div className="border border-dashed border-[#e6c35c]/30 p-4 bg-[#0a0c12] space-y-3">
                  {/* Thumbnails Gallery */}
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {uploadedImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-video border border-[#e6c35c]/40 overflow-hidden bg-black group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={`Upload ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1 left-1 bg-black/80 text-[#e6c35c] font-pixel text-[7px] px-1">
                            {idx === 0 ? 'COVER' : `#${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(idx)}
                            className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white p-1 rounded-sm"
                            title="Remove Picture"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-center py-2 space-y-2">
                    <Upload className="w-6 h-6 text-[#e6c35c] mx-auto opacity-75" />
                    <p className="text-[11px] text-gray-400 font-sans">
                      Select 1 or more screenshots/images from your device
                    </p>
                    <label className="btn-dark px-3 py-1.5 inline-flex items-center gap-1.5 cursor-pointer text-[9px]">
                      <Upload className="w-3 h-3 text-[#e6c35c]" />
                      <span>+ ADD PICTURES</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1 text-[11px] font-sans">CATEGORY:</label>
                  <select
                    value={newLot.category}
                    onChange={(e) => setNewLot({ ...newLot, category: e.target.value })}
                    className="w-full bg-[#0a0c12] border border-[#e6c35c]/30 p-2.5 text-white focus:border-[#e6c35c] focus:outline-none"
                  >
                    <option value="Free Fire">Free Fire</option>
                    <option value="Valorant">Valorant</option>
                    <option value="Mobile Legends">Mobile Legends</option>
                    <option value="PUBG Mobile">PUBG Mobile</option>
                    <option value="Steam Account">Steam Account</option>
                    <option value="Roblox / Gaming">Roblox / Gaming</option>
                    <option value="Digital Collectible">Digital Collectible</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 text-[11px] font-sans">
                    STARTING PRICE (฿):
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={newLot.startingPrice}
                    onChange={(e) => setNewLot({ ...newLot, startingPrice: e.target.value })}
                    className="w-full bg-[#0a0c12] border border-[#e6c35c]/30 p-2.5 text-white focus:border-[#e6c35c] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1 text-[11px] font-sans">
                    DURATION (Minutes):
                  </label>
                  <input
                    type="number"
                    value={newLot.durationMinutes}
                    onChange={(e) => setNewLot({ ...newLot, durationMinutes: e.target.value })}
                    className="w-full bg-[#0a0c12] border border-[#e6c35c]/30 p-2.5 text-white focus:border-[#e6c35c] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 text-[11px] font-sans">
                    DISCORD SERVER / CHANNEL URL:
                  </label>
                  <input
                    type="url"
                    value={newLot.discordUrl}
                    onChange={(e) => setNewLot({ ...newLot, discordUrl: e.target.value })}
                    className="w-full bg-[#0a0c12] border border-[#e6c35c]/30 p-2.5 text-white focus:border-[#e6c35c] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1 text-[11px] font-sans">
                  LOT DESCRIPTION &amp; REWARD SPECIFICATIONS:
                </label>
                <textarea
                  rows={2}
                  placeholder="LVL 75, Sakura Bundle, 200 Crates, Full Access delivered upon Discord ticket claim"
                  value={newLot.description}
                  onChange={(e) => setNewLot({ ...newLot, description: e.target.value })}
                  className="w-full bg-[#0a0c12] border border-[#e6c35c]/30 p-2.5 text-white focus:border-[#e6c35c] focus:outline-none font-sans"
                />
              </div>

              <div className="bg-[#10141f] border border-[#e6c35c]/30 p-3 space-y-1 text-[11px] font-sans text-gray-300">
                <div className="text-[#e6c35c] font-bold flex items-center gap-1 font-mono text-xs">
                  <KeyRound className="w-3.5 h-3.5" />
                  AUTOMATIC DISCORD CLAIM TOKEN
                </div>
                <p>
                  No passwords stored on website. The system will auto-generate a secret claim token (e.g. <code>AURUM-XXXX-XXXX</code>). The certified winner copies their token to open a ticket in Discord!
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-dark px-3 py-2 text-[10px]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={creatingLot}
                  className="btn-gold px-4 py-2 text-[10px]"
                >
                  {creatingLot ? 'LAUNCHING...' : 'LAUNCH LOT IMMEDIATELY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SLIP IMAGE VIEWER */}
      {selectedSlipImage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="gold-card max-w-lg w-full p-4 space-y-4 border border-[#e6c35c]/40 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#e6c35c]/20 pb-2">
              <span className="font-pixel text-[10px] text-[#e6c35c]">
                BANK TRANSFER SLIP AUDIT
              </span>
              <button
                onClick={() => setSelectedSlipImage(null)}
                className="text-gray-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>
            <div className="bg-[#08090c] border border-gray-800 p-3 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedSlipImage}
                alt="Bank Transfer Slip"
                className="max-h-[65vh] object-contain rounded-sm"
              />
            </div>
            <button
              onClick={() => setSelectedSlipImage(null)}
              className="w-full btn-dark py-2.5 text-[10px]"
            >
              CLOSE PREVIEW
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
