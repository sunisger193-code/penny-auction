# 🚀 Aurum 8-Bit Real-Time Penny Auction - Online Deployment Guide

This guide details how to take your penny auction platform online to **Netlify**, **Railway**, **Render**, **Vercel**, or **Docker VPS**.

---

## ⚡ Option 1: Deploy to Netlify (Serverless Cloud)

Netlify is pre-configured via [`netlify.toml`](./netlify.toml) and Next.js App Router support.

### Step 1: Database Setup (Cloud PostgreSQL)
Because Netlify serverless functions have ephemeral file systems, use a free cloud PostgreSQL database:
- **[Neon](https://neon.tech)** (Recommended: Free Serverless Postgres)
- **[Supabase](https://supabase.com)** (Free PostgreSQL tier)

1. Create a database on Neon or Supabase and copy the connection string:
   ```
   postgresql://user:password@ep-host.region.aws.neon.tech/neondb?sslmode=require
   ```
2. Apply the PostgreSQL schema:
   ```bash
   npx prisma db push --schema=prisma/schema.postgresql.prisma
   ```

### Step 2: Push to GitHub & Connect to Netlify
1. Push your repository to GitHub.
2. In [Netlify Dashboard](https://app.netlify.com/):
   - Click **Add new site** > **Import an existing project** > **GitHub**.
   - Select your repository.
3. Build Settings will auto-detect from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`

### Step 3: Configure Environment Variables in Netlify
Under **Site configuration** > **Environment variables**, add:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://user:pass@ep-host.region.neon.tech/neondb?sslmode=require` | Cloud Postgres URL |
| `ADMIN_SECURITY_TOKEN` | `AURUM-ADMIN-8888-MASTER` | Master Passkey to unlock `/admin` |
| `JWT_SECRET` | `your_long_random_jwt_secret_here` | Session Token Secret |
| `ENCRYPTION_KEY` | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` | 32-byte AES Key |

> **Note on WebSockets in Netlify:**  
> When deployed to Netlify without an external WebSocket server, the app's built-in **Cloud Polling Engine** automatically activates every 2 seconds. The auction countdown, leaderboards, and outbids remain 100% active and synchronized!

---

## 🚂 Option 2: Deploy to Railway or Render (Persistent WebSockets)

If you want low-latency real-time WebSockets running 24/7 on Node.js:

1. Link your repository in [Railway](https://railway.app/) or [Render](https://render.com/).
2. Add a **PostgreSQL** database and **Redis** instance directly from the Railway/Render dashboard.
3. Configure Start Command:
   ```bash
   npm run start
   ```
4. Set Environment Variables:
   - `DATABASE_URL` (Automatically linked by Railway)
   - `REDIS_URL` (Automatically linked by Railway)
   - `ADMIN_SECURITY_TOKEN=AURUM-ADMIN-8888-MASTER`
   - `JWT_SECRET=your_jwt_secret`
   - `ENCRYPTION_KEY=your_encryption_key`

---

## 🐳 Option 3: Deploy with Docker Compose (Any VPS / DigitalOcean / Linode)

To run the complete stack (Web + Node Socket.io + PostgreSQL + Redis) on any VPS:

```bash
# 1. Clone your repository on your server
git clone <your-repo-url>
cd penny-auction-8bit

# 2. Start the full container stack
docker-compose up -d --build

# 3. Initialize database schema
docker-compose exec web npx prisma db push --schema=prisma/schema.postgresql.prisma

# 4. Seed initial admin account
docker-compose exec web npm run seed
```

---

## 🔑 Default Credentials & Access

- **Admin Login**: `admin@gmail.com`
- **Admin Password**: `admin1`
- **Master Admin Passkey**: `AURUM-ADMIN-8888-MASTER`
- **New User Signup**: Starts at **฿0 credits** (No free credits).
- **Credit Top-Up**: Scan PromptPay Thai QR code at `/wallet` (1 Baht = 1 Bidding Credit).
- **Rewards**: Winners receive a custom Discord voucher token (`AURUM-XXXX-XXXX`) to claim via Discord ticket.
