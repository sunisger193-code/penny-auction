'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { soundFx } from '@/lib/soundFx';
import {
  Coins,
  Receipt,
  Upload,
  CheckCircle,
  Clock,
  ShieldCheck,
  History,
  QrCode,
  AlertCircle,
  Download,
  Eye,
  Maximize2,
} from 'lucide-react';

const PACKAGES = [
  { id: 'p1', credits: 50, price: 50.0, label: 'STARTER PACK' },
  { id: 'p2', credits: 100, price: 100.0, label: 'POPULAR CHOICE', popular: true },
  { id: 'p3', credits: 300, price: 300.0, label: 'HIGH ROLLER', bestValue: true },
  { id: 'p4', credits: 500, price: 500.0, label: 'PRO CHAMPION' },
];

export default function WalletPage() {
  const { user, token } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[1]);
  const [slipImage, setSlipImage] = useState<string>('');
  const [bankRef, setBankRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // History state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [topUpRequests, setTopUpRequests] = useState<any[]>([]);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTopUpRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSlipImage(event.target?.result as string);
      soundFx.playCoin();
    };
    reader.readAsDataURL(file);
  };

  const useSampleSlip = () => {
    soundFx.playCoin();
    const sampleSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500" fill="%230c0e14"><rect width="400" height="500" fill="%230c0e14"/><rect x="20" y="20" width="360" height="460" fill="%23141722" stroke="%23e6c35c" stroke-width="2"/><text x="40" y="65" fill="%23e6c35c" font-family="monospace" font-size="16" font-weight="bold">PROMPTPAY / TRUEMONEY SLIP</text><text x="40" y="100" fill="%2394a3b8" font-family="monospace" font-size="11">RECEIVER: เอกกวิน มานะทิวสน</text><text x="40" y="130" fill="%23fbe38e" font-family="monospace" font-size="15" font-weight="bold">AMOUNT: ฿${selectedPackage.price.toFixed(2)} THB</text><text x="40" y="160" fill="%2334d399" font-family="monospace" font-size="13">CREDITS: +${selectedPackage.credits} CREDITS (1:1)</text><text x="40" y="190" fill="%23cbd5e1" font-family="monospace" font-size="11">SENDER: ${user?.username || 'PLAYER'}</text><text x="40" y="220" fill="%23a855f7" font-family="monospace" font-size="10">REF: PROMPTPAY-${Date.now().toString().slice(-6)}</text><rect x="40" y="260" width="100" height="100" fill="%2308090c" stroke="%23e6c35c" stroke-width="1.5"/><text x="50" y="315" fill="%23e6c35c" font-family="monospace" font-size="10">VERIFIED</text></svg>`;
    setSlipImage(sampleSvg);
    setBankRef(`PROMPTPAY-${Date.now().toString(36).toUpperCase()}`);
  };

  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slipImage) {
      setErrorMsg('Please upload a transfer slip or click [USE SAMPLE SLIP]');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: selectedPackage.price, // 1 Baht = 1 Credit
          slipImage,
          bankRef: bankRef || `PROMPTPAY-${Date.now().toString(36).toUpperCase()}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundFx.playCoin();
        setSubmitSuccess(true);
        setSlipImage('');
        setBankRef('');
        fetchHistory();
      } else {
        soundFx.playError();
        setErrorMsg(data.error || 'Failed to submit topup');
      }
    } catch {
      soundFx.playError();
      setErrorMsg('Network error submitting receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Wallet Balance Hero Banner */}
      <div className="gold-card p-6 md:p-8 bg-gradient-to-r from-[#141722] via-[#0f1118] to-[#08090c] border border-[#e6c35c]/30 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#fbe38e] via-[#e6c35c] to-[#9b7e28] flex items-center justify-center border border-[#fbe38e] shadow-[0_0_15px_rgba(230,195,92,0.35)] shrink-0">
            <Coins className="w-8 h-8 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[9px] text-[#e6c35c] tracking-wider uppercase">
                BIDDING VAULT BALANCE
              </span>
              <span className="badge-green text-[7px] py-0.5 px-1.5">1 BAHT = 1 CREDIT</span>
            </div>
            <div className="text-3xl md:text-5xl font-extrabold text-white font-mono-num tracking-tight mt-1 flex items-baseline gap-2">
              {user?.credits ?? 0}
              <span className="text-sm font-sans text-gray-400 font-normal">
                CREDITS (฿{user?.credits ?? 0})
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-300 bg-[#0a0c12] p-4 border border-[#e6c35c]/20 max-w-md space-y-1">
          <div className="flex items-center gap-1.5 text-[#e6c35c] font-pixel text-[9px]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>PENNY AUCTION PROTOCOL</span>
          </div>
          <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
            Bids immediately deduct fixed credits from your balance and are non-refundable. Top-ups convert 1:1 in Thai Baht (฿) via PromptPay slip verification.
          </p>
        </div>
      </div>

      {/* Main Top-Up Interface & Bank Transfer Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Top-Up Process (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="gold-card p-6 space-y-6 border border-[#e6c35c]/25">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#e6c35c]" />
                <h2 className="text-sm md:text-base font-bold text-white">
                  STEP 1: SELECT CREDIT PACKAGE (1:1 RATE)
                </h2>
              </div>
              <p className="text-xs text-gray-400 font-sans mt-1">
                Every 1 Thai Baht deposited grants exactly 1 Bidding Credit upon Admin verification.
              </p>
            </div>

            {/* Package selector cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PACKAGES.map((pkg) => {
                const isSelected = selectedPackage.id === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      soundFx.playCoin();
                      setSelectedPackage(pkg);
                    }}
                    className={`p-3.5 text-left border transition-all relative ${
                      isSelected
                        ? 'border-[#e6c35c] bg-[#1a1e2b] shadow-[0_0_15px_rgba(230,195,92,0.15)] ring-1 ring-[#e6c35c]'
                        : 'border-gray-800 bg-[#0d0f15] hover:border-[#e6c35c]/40 hover:bg-[#131622]'
                    }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-2 right-2 bg-[#e6c35c] text-black font-pixel text-[7px] px-1.5 py-0.5 font-bold shadow-sm">
                        POPULAR
                      </span>
                    )}
                    {pkg.bestValue && (
                      <span className="absolute -top-2 right-2 bg-emerald-500 text-black font-pixel text-[7px] px-1.5 py-0.5 font-bold shadow-sm">
                        VALUE
                      </span>
                    )}
                    <span className="text-[9px] font-pixel text-gray-400 block uppercase truncate">
                      {pkg.label}
                    </span>
                    <div className="text-lg font-bold text-white font-mono-num mt-1">
                      {pkg.credits} <span className="text-[10px] text-[#e6c35c] font-normal">PTS</span>
                    </div>
                    <div className="text-xs text-[#e6c35c] font-semibold mt-1 font-mono-num">
                      ฿{pkg.price.toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Step 2: PromptPay Thai QR Payment Card with User's QR Code */}
            <div className="bg-[#0a0c12] border border-[#e6c35c]/35 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6c35c]/20 pb-3">
                <div className="text-white font-bold flex items-center gap-2 text-xs">
                  <QrCode className="w-4 h-4 text-[#e6c35c]" />
                  <span>STEP 2: SCAN PROMPTPAY / THAI QR PAYMENT</span>
                </div>
                <span className="badge-gold text-[8px]">OFFICIAL THAI QR</span>
              </div>

              {/* QR Image and Account Info Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* QR Code Showcase Box (5 cols) */}
                <div className="sm:col-span-5 bg-white p-2.5 rounded-sm shadow-md text-center border-2 border-[#e6c35c] relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/promptpay-qr.jpg"
                    alt="PromptPay Thai QR Payment - เอกกวิน มานะทิวสน"
                    className="w-full max-h-56 object-contain mx-auto"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white text-[10px] font-pixel transition-opacity"
                  >
                    <Maximize2 className="w-4 h-4 text-[#e6c35c]" />
                    <span>ENLARGE QR</span>
                  </button>
                </div>

                {/* Account Details & Scan Instructions (7 cols) */}
                <div className="sm:col-span-7 space-y-3 text-xs font-mono text-gray-300">
                  <div className="bg-[#121522] p-3 border border-gray-800 space-y-2">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-sans">
                        RECEIVER ACCOUNT NAME (ชื่อบัญชี):
                      </span>
                      <span className="text-white font-bold text-sm font-sans text-[#e6c35c]">
                        เอกกวิน มานะทิวสน
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-sans">
                          PROVIDER:
                        </span>
                        <span className="text-white font-semibold">TrueMoney / PromptPay</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-sans">
                          ACCOUNT NUMBER:
                        </span>
                        <span className="text-white font-mono-num font-bold">140-********* - 212</span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-gray-800 flex justify-between items-center text-[11px]">
                      <span className="text-gray-400">TRANSFER AMOUNT:</span>
                      <span className="text-[#e6c35c] font-bold font-mono-num text-sm">
                        ฿{selectedPackage.price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="btn-dark px-3 py-1.5 text-[9px] flex items-center gap-1.5"
                    >
                      <Eye className="w-3 h-3 text-[#e6c35c]" />
                      <span>VIEW FULL QR</span>
                    </button>
                    <a
                      href="/images/promptpay-qr.jpg"
                      download="promptpay-qr.jpg"
                      className="btn-dark px-3 py-1.5 text-[9px] flex items-center gap-1.5"
                    >
                      <Download className="w-3 h-3 text-[#e6c35c]" />
                      <span>DOWNLOAD QR</span>
                    </a>
                  </div>

                  <p className="text-[10px] text-gray-400 font-sans leading-normal">
                    💡 Scan with TrueMoney Wallet or any mobile banking app (K PLUS, SCB EASY, Krungthai NEXT, etc.). Then upload receipt below.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Receipt Upload Form */}
            <form onSubmit={handleSubmitTopup} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#e6c35c]" />
                    <span>STEP 3: UPLOAD TRANSFER RECEIPT</span>
                  </label>
                  <button
                    type="button"
                    onClick={useSampleSlip}
                    className="text-[10px] text-[#e6c35c] underline hover:text-[#fbe38e] transition-colors font-mono"
                  >
                    [ USE SAMPLE SLIP ]
                  </button>
                </div>

                <div className="border border-dashed border-[#e6c35c]/30 p-4 text-center bg-[#0a0c12] space-y-2">
                  {slipImage ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slipImage}
                        alt="Slip Preview"
                        className="max-h-40 mx-auto object-contain border border-[#e6c35c]/40 rounded-sm shadow-md"
                      />
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Slip loaded ready for audit
                        </span>
                        <button
                          type="button"
                          onClick={() => setSlipImage('')}
                          className="text-[10px] text-red-400 underline font-mono ml-2 hover:text-red-300"
                        >
                          [Remove]
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-3">
                      <Upload className="w-8 h-8 text-[#e6c35c] mx-auto opacity-75" />
                      <p className="text-xs text-gray-400 font-sans">
                        Upload PromptPay transfer slip (PNG, JPG, or screenshot)
                      </p>
                      <label className="btn-dark px-3 py-1.5 inline-flex items-center gap-1.5 cursor-pointer text-[9px]">
                        <Upload className="w-3.5 h-3.5 text-[#e6c35c]" />
                        <span>CHOOSE SLIP FILE</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 block mb-1 font-sans">
                  TRANSACTION REFERENCE (OPTIONAL):
                </label>
                <input
                  type="text"
                  placeholder="e.g. PROMPTPAY-982103"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  className="w-full bg-[#0a0c12] border border-[#e6c35c]/30 p-2.5 text-white text-xs font-mono focus:border-[#e6c35c] focus:outline-none"
                />
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-2.5 text-xs text-center font-mono">
                  {errorMsg}
                </div>
              )}

              {submitSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 p-3.5 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> SLIP SUBMITTED TO AUDIT QUEUE
                  </div>
                  <p className="text-gray-300 font-sans">
                    Deposit of ฿{selectedPackage.price.toFixed(2)} registered. Upon Admin approval, +{selectedPackage.credits} Credits will be added directly to your balance!
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-gold py-3 text-xs flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-black" />
                <span>
                  {submitting
                    ? 'TRANSMITTING RECEIPT...'
                    : `SUBMIT SLIP (฿${selectedPackage.price.toFixed(2)} → +${selectedPackage.credits} CREDITS)`}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: History & Status (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pending Top-Up Status List */}
          <div className="gold-card p-5 space-y-3.5 border border-[#e6c35c]/20">
            <div className="flex items-center justify-between border-b border-[#e6c35c]/20 pb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#e6c35c]" />
                PENDING / RECENT DEPOSITS
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">
                {topUpRequests.length} REQUESTS
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              {topUpRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-6 font-sans text-xs">
                  No top-up slips submitted yet.
                </p>
              ) : (
                topUpRequests.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-[#0a0c12] border border-gray-800 space-y-1.5 hover:border-[#e6c35c]/30 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white font-mono-num">
                        ฿{r.amount.toFixed(2)}{' '}
                        <span className="text-emerald-400 font-normal">
                          (+{r.credits} Credits)
                        </span>
                      </span>
                      <span
                        className={`font-pixel text-[8px] px-2 py-0.5 uppercase ${
                          r.status === 'APPROVED'
                            ? 'badge-green'
                            : r.status === 'REJECTED'
                            ? 'badge-red'
                            : 'badge-gold pulse-gold'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 flex justify-between">
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      <span className="truncate max-w-[150px]">Ref: {r.bankRef || 'N/A'}</span>
                    </div>
                    {r.adminNotes && (
                      <div className="text-[10px] text-red-400">Audit Note: {r.adminNotes}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Wallet Transaction Ledger */}
          <div className="gold-card p-5 space-y-3.5 border border-[#e6c35c]/20">
            <div className="flex items-center justify-between border-b border-[#e6c35c]/20 pb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[#e6c35c]" />
                CREDIT AUDIT LEDGER
              </h3>
              <span className="badge-gold text-[8px]">IMMUTABLE</span>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 text-xs font-mono pr-1">
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-6 font-sans text-xs">
                  No credit audit records yet.
                </p>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 bg-[#0a0c12] border border-gray-800 flex justify-between items-center hover:border-gray-700 transition-colors"
                  >
                    <div>
                      <div className="text-white font-semibold text-xs font-sans">
                        {tx.description}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • BAL: <span className="text-white font-bold">{tx.balanceAfter}</span>
                      </div>
                    </div>
                    <span
                      className={`font-bold font-mono-num text-xs ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PROMPTPAY QR LIGHTBOX MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="gold-card max-w-sm w-full p-5 space-y-4 border border-[#e6c35c]/50 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#e6c35c]/20 pb-2">
              <span className="font-pixel text-[10px] text-[#e6c35c]">
                THAI QR PROMPTPAY SCAN
              </span>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-gray-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>
            <div className="bg-white p-3 rounded-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/promptpay-qr.jpg"
                alt="PromptPay Full QR"
                className="w-full object-contain"
              />
            </div>
            <div className="text-center space-y-1 text-xs font-mono">
              <div className="font-bold text-white text-sm">เอกกวิน มานะทิวสน</div>
              <div className="text-gray-400 text-[11px]">TrueMoney / PromptPay: 140-********* - 212</div>
              <div className="text-[#e6c35c] font-bold text-xs pt-1">
                TRANSFER ฿{selectedPackage.price.toFixed(2)} → +{selectedPackage.credits} CREDITS
              </div>
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full btn-dark py-2 text-[10px]"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
