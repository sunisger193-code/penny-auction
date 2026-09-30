import { prisma } from './prisma';
import { withLock } from './redis';

export interface PlaceBidResult {
  success: boolean;
  auction: {
    id: string;
    title: string;
    currentPrice: number;
    highestBidderId: string | null;
    highestBidderName: string | null;
    endsAt: Date;
    totalBids: number;
    status: string;
  };
  bid: {
    id: string;
    amount: number;
    creditCost: number;
    createdAt: Date;
    user: {
      id: string;
      username: string;
    };
  };
  userOffering: number;
  userCredits: number;
  isOvertimeRestart: boolean;
}

/**
 * Places a bid in the Cumulative Offering Auction Engine with Redis Distributed Lock Protection & Atomic DB Transaction.
 * Each bid ADDS credits to the user's total offering.
 * The system COMPARES all offerings, and the highest offering takes the lead.
 */
export async function placeBid(
  auctionId: string,
  userId: string,
  creditsToAdd: number = 1
): Promise<PlaceBidResult> {
  const creditsToDeduct = Math.max(1, Math.floor(creditsToAdd));
  const lockResourceKey = `auction:${auctionId}`;

  return await withLock(lockResourceKey, async () => {
    // 1. Fetch user to verify available credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, credits: true },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND: User does not exist.');
    }

    // 2. Fetch auction within lock
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        highestBidder: {
          select: { id: true, username: true },
        },
      },
    });

    if (!auction) {
      throw new Error('AUCTION_NOT_FOUND: Auction does not exist.');
    }

    if (auction.status !== 'ACTIVE') {
      throw new Error(`AUCTION_INACTIVE: Auction is ${auction.status}. Bids are closed.`);
    }

    const now = Date.now();
    const currentEndsAtMs = new Date(auction.endsAt).getTime();
    const remainingMs = currentEndsAtMs - now;

    if (remainingMs <= 0) {
      // Auction expired; trigger settlement
      await settleAuctionDirect(auctionId);
      throw new Error('AUCTION_EXPIRED: The auction has ended! Bids are frozen.');
    }

    // 3. Verify user has enough available credits to add
    if (user.credits < creditsToDeduct) {
      throw new Error(
        `INSUFFICIENT_CREDITS: You need ${creditsToDeduct} credits (฿${creditsToDeduct}) to add to your offering, but your balance is ${user.credits} credits.`
      );
    }

    // 4. Calculate user's previous offering on this auction
    const previousBids = await prisma.bid.findMany({
      where: { auctionId, userId },
      select: { creditCost: true },
    });
    const previousOffering = previousBids.reduce((sum, b) => sum + b.creditCost, 0);
    const newTotalOffering = previousOffering + creditsToDeduct;

    // 5. Compare with other bidders' offerings on this auction
    const allAuctionBids = await prisma.bid.findMany({
      where: { auctionId },
      select: { userId: true, creditCost: true },
    });

    const offeringByUser: Record<string, number> = {};
    for (const b of allAuctionBids) {
      offeringByUser[b.userId] = (offeringByUser[b.userId] || 0) + b.creditCost;
    }

    let topOtherOffering = auction.startingPrice;
    for (const [uid, off] of Object.entries(offeringByUser)) {
      if (uid !== userId && off > topOtherOffering) {
        topOtherOffering = off;
      }
    }

    // User's new total offering must strictly exceed the highest other offering to take the lead
    const isAlreadyLeader = auction.highestBidderId === userId;
    if (!isAlreadyLeader && newTotalOffering <= topOtherOffering) {
      const neededToAdd = Math.max(1, topOtherOffering + 1 - previousOffering);
      throw new Error(
        `INSUFFICIENT_OFFERING: Your new total offering would be ฿${newTotalOffering.toFixed(2)}, but the top offering is ฿${topOtherOffering.toFixed(2)}. You need to add at least ฿${neededToAdd.toFixed(2)} to take the lead!`
      );
    }

    // 6. Calculate new auction price (highest total offering)
    const newPrice = Math.max(auction.startingPrice, newTotalOffering);

    // 7. Canonical 10-Second Sudden Death Overtime Phase Logic:
    let newEndsAt: Date;
    let isOvertimeRestart = false;

    if (remainingMs <= 10000) {
      // In the 10-Second Sudden Death Phase! Every placed bid restarts the clock to 10 seconds!
      newEndsAt = new Date(now + 10000);
      isOvertimeRestart = true;
    } else {
      // Normal scheduled countdown continues
      newEndsAt = auction.endsAt;
      isOvertimeRestart = false;
    }

    // 8. Execute atomic transaction in Database
    const [updatedAuction, updatedUser, createdBid] = await prisma.$transaction([
      // Update auction
      prisma.auction.update({
        where: { id: auctionId },
        data: {
          currentPrice: newPrice,
          highestBidderId: user.id,
          endsAt: newEndsAt,
          totalBids: { increment: 1 },
        },
      }),
      // Deduct non-refundable credits immediately (1 Credit = 1 Baht)
      prisma.user.update({
        where: { id: user.id },
        data: {
          credits: { decrement: creditsToDeduct },
        },
      }),
      // Record bid with exact credits added and new cumulative offering price
      prisma.bid.create({
        data: {
          auctionId,
          userId: user.id,
          amount: newPrice,
          creditCost: creditsToDeduct,
        },
      }),
      // Record wallet transaction
      prisma.walletTransaction.create({
        data: {
          userId: user.id,
          type: 'BID_DEDUCT',
          amount: -creditsToDeduct,
          balanceAfter: user.credits - creditsToDeduct,
          description: `Added +${creditsToDeduct} Credits to offering on "${auction.title}" (Total Offering: ฿${newTotalOffering.toFixed(2)})`,
          referenceId: auctionId,
        },
      }),
    ]);

    return {
      success: true,
      auction: {
        id: updatedAuction.id,
        title: updatedAuction.title,
        currentPrice: updatedAuction.currentPrice,
        highestBidderId: user.id,
        highestBidderName: user.username,
        endsAt: updatedAuction.endsAt,
        totalBids: updatedAuction.totalBids,
        status: updatedAuction.status,
      },
      bid: {
        id: createdBid.id,
        amount: createdBid.amount,
        creditCost: createdBid.creditCost,
        createdAt: createdBid.createdAt,
        user: {
          id: user.id,
          username: user.username,
        },
      },
      userOffering: newTotalOffering,
      userCredits: updatedUser.credits,
      isOvertimeRestart,
    };
  });
}

/**
 * Internal direct settlement called inside or outside lock
 */
async function settleAuctionDirect(auctionId: string) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      highestBidder: true,
      winner: {
        select: { id: true, username: true, email: true },
      },
    },
  });

  if (!auction || auction.status === 'ENDED') {
    return auction;
  }

  const winnerId = auction.highestBidderId;

  // Perform settlement update
  const settled = await prisma.auction.update({
    where: { id: auctionId },
    data: {
      status: 'ENDED',
      winnerId: winnerId || null,
      settledAt: new Date(),
    },
    include: {
      winner: {
        select: { id: true, username: true, email: true },
      },
      highestBidder: {
        select: { id: true, username: true },
      },
    },
  });

  return settled;
}

/**
 * Public method to settle an auction with lock protection
 */
export async function settleAuction(auctionId: string) {
  const lockResourceKey = `auction:${auctionId}`;
  return await withLock(lockResourceKey, async () => {
    return await settleAuctionDirect(auctionId);
  });
}

/**
 * Periodic sweeper to settle any expired auctions
 */
export async function checkAndSettleExpiredAuctions() {
  const now = new Date();
  const expiredActiveAuctions = await prisma.auction.findMany({
    where: {
      status: 'ACTIVE',
      endsAt: { lte: now },
    },
    select: { id: true },
  });

  const settledList = [];
  for (const item of expiredActiveAuctions) {
    try {
      const settled = await settleAuction(item.id);
      if (settled) settledList.push(settled);
    } catch (err) {
      console.error(`Error settling auction ${item.id}:`, err);
    }
  }

  return settledList;
}
