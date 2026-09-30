# 🕹️ 8-BIT REAL-TIME PENNY AUCTION WEB APPLICATION (THB ฿ EDITION)

A high-performance, real-time Penny Auction arcade web application built with **Next.js (App Router)**, **TailwindCSS**, **Node.js with Socket.io**, and **Prisma ORM with Redis Concurrency Distributed Locks**.

Themed in an authentic **8-bit retro arcade aesthetic**, featuring synthesized Web Audio chiptunes, pixel art borders, CRT scanlines, and high-stakes dynamic bidding countdowns in **Thai Baht (฿)** with a direct **1 Baht = 1 Credit** conversion.

---

## 🏛️ Updated Architecture & Features

### 1. Currency & Credit Economy (1 Baht = 1 Credit)
- Removed all USD references; platform is natively denominated in **Thai Baht (฿)**.
- **Conversion Rate**: Exactly **1 Baht = 1 Credit (1 THB = 1 Credit)**.
- **Non-Refundable Credit Deduction**: Each bid deducts fixed credits instantly. Non-refundable regardless of outcome.
- **Top-Up System**:
  - Packages: ฿50 (50 Credits), ฿100 (100 Credits), ฿300 (300 Credits), ฿500 (500 Credits).
  - Transfer via PromptPay / Thai QR / Bank slip upload.
  - Submitting receipt ties request to user ID in `PENDING` status.
  - When Admin approves slip, user receives exactly **1 Credit per 1 Baht** deposited!

### 2. Mandatory Room Entry Gate
- Bidding is strictly blocked until the player clicks **`[ 🎮 INSERT COIN & ENTER ROOM ]`** inside the auction room.
- Once joined, the room broadcasts the player's entry, unlocks the **`[ 💥 BID NOW (-X CREDITS) ]`** button, and synchronizes live countdown and bid history.

### 3. Admin Dashboard (`/admin`)
- **Protected Access**:
  - Requires logging in with:
    - **Email**: `admin@gmail.com`
    - **Password**: `admin1`
  - Unauthorized visitors are automatically redirected to `/login?redirect=/admin`.
- **Inventory Management & Picture Upload**:
  - Add game accounts with screenshot pictures (e.g. Free Fire character lobby, weapon crates, rank badges) via image file upload or base64.
  - Credentials stored encrypted with **AES-256-GCM** (`iv:authTag:ciphertext`).
  - Auto-revealed **only** to the certified winning bidder upon settlement.
- **Auction Controls**:
  - Launch auctions with custom starting prices, credit bid costs, bid increments in Baht, and duration.
  - Live controls: Pause, Resume, Extend Time (+5M), or Force Settle.
- **Manual Slip Approval Table**:
  - Review deposited PromptPay / Bank slips with zoom preview modal.
  - One-click **Approve** (atomically grants 1 credit per 1 baht) and **Reject** buttons.

### 4. Authentication (`/login` & `/signup`)
- **Login (`/login`)**:
  - 8-bit arcade cabinet theme with quick autofill for Admin (`admin@gmail.com` / `admin1`).
- **Signup (`/signup`)**:
  - Clean signup form requiring only **Username**, **Gmail / Email**, and **Password**.
  - New players instantly receive **100 Starter Credits (฿100 value)** to jump into live auctions immediately!

### 5. Real-Time Bidding Engine (`/auctions/[id]`)
- **Low-Latency WebSockets (Socket.io)**: Real-time synchronization across all players in the room.
- **Dynamic Countdown (+10 Seconds)**: Every placed bid extends the countdown by **exactly 10 seconds**!
- **Redis Concurrency Locks**: Distributed atomic locks (`SET NX PX`) with Lua compare-and-delete scripts to prevent race conditions during rapid last-second bid spams.
- **Settlement & Vault Auto-Reveal**: At `00:00:00`, room freezes, assigns winner, and reveals decrypted game account credentials to the winner.

---

## 👥 Default Accounts
| Role | Email | Password | Username | Credits |
|---|---|---|---|---|
| **Admin** | `admin@gmail.com` | `admin1` | `ArcadeAdmin` | 9,999 Credits |
| **Player 1** | `pixel@gmail.com` | `player123` | `PixelMaster` | 150 Credits |
| **Player 2** | `sniper@gmail.com` | `player123` | `RetroSniper` | 100 Credits |
| **Player 3** | `cyber@gmail.com` | `player123` | `CyberGhost` | 80 Credits |

---

## 🚀 Quick Run
```bash
# Start server on port 3000
npm run dev

# Run automated test verification suite
npx tsx test-auction-suite.ts

# Re-seed database
npm run seed
```
Visit **[http://localhost:3000](http://localhost:3000)**!
