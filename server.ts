import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { placeBid, settleAuction, checkAndSettleExpiredAuctions } from './src/lib/auctionEngine';
import { prisma } from './src/lib/prisma';
import { verifyToken } from './src/lib/auth';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global reference so Next.js API routes can also emit socket events if needed
declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  global.io = io;

  io.on('connection', (socket) => {
    // Client joining an auction room
    socket.on('join_auction', (auctionId: string) => {
      const room = `auction:${auctionId}`;
      socket.join(room);
    });

    socket.on('leave_auction', (auctionId: string) => {
      const room = `auction:${auctionId}`;
      socket.leave(room);
    });

    // Handle real-time bid placement
    socket.on('place_bid', async (payload: { auctionId: string; token: string }) => {
      try {
        const { auctionId, token } = payload;
        if (!auctionId || !token) {
          socket.emit('bid_error', { message: 'Authentication required to place bid.' });
          return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
          socket.emit('bid_error', { message: 'Invalid or expired session. Please log in again.' });
          return;
        }

        // Place bid with Redis Lock & Atomic Transaction
        const result = await placeBid(auctionId, decoded.userId);

        const broadcastData = {
          auctionId: result.auction.id,
          currentPrice: result.auction.currentPrice,
          highestBidderId: result.auction.highestBidderId,
          highestBidderName: result.auction.highestBidderName,
          endsAt: result.auction.endsAt,
          totalBids: result.auction.totalBids,
          bid: result.bid,
          isOvertimeRestart: result.isOvertimeRestart,
        };

        io.to(`auction:${auctionId}`).emit('bid_success', broadcastData);
        io.emit('bid_success', broadcastData);

        // Notify bidder about their updated credits
        socket.emit('credits_updated', {
          credits: result.userCredits,
        });
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Bid error:', error.message);
        socket.emit('bid_error', { message: error.message || 'Failed to place bid.' });
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  // Background Settlement Ticker (runs every 1 second)
  // Low-latency settlement check & dynamic timer countdown sync
  setInterval(async () => {
    try {
      const settledAuctions = await checkAndSettleExpiredAuctions();
      for (const settled of settledAuctions) {
        if (!settled) continue;
        console.log(`🏆 [SETTLEMENT] Auction settled: "${settled.title}" won by ${settled.winner?.username || settled.highestBidder?.username || 'No Bids'}`);
        io.to(`auction:${settled.id}`).emit('auction_settled', {
          auctionId: settled.id,
          winnerId: settled.winnerId,
          winnerName: (settled as any).winner?.username || null,
          finalPrice: settled.currentPrice,
          totalBids: settled.totalBids,
          status: 'ENDED',
          settledAt: settled.settledAt,
        });
      }
    } catch (err) {
      console.error('Ticker settlement error:', err);
    }
  }, 1000);

  httpServer.listen(port, () => {
    console.log(`
╔═════════════════════════════════════════════════════════════════════╗
║  🕹️  RETRO 8-BIT PENNY AUCTION ENGINE RUNNING ON PORT ${port}        ║
║  📡  Socket.io WebSocket Server initialized                         ║
║  🔒  Redis Concurrency Distributed Lock Engine active               ║
║  🌐  Open: http://localhost:${port}                                    ║
╚═════════════════════════════════════════════════════════════════════╝
    `);
  });
});
