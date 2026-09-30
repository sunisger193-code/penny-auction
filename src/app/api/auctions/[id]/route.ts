import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        highestBidder: {
          select: { id: true, username: true },
        },
        winner: {
          select: { id: true, username: true },
        },
        bids: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Check if the current user is the certified winner or admin
    const isWinner = !!(user && auction.status === 'ENDED' && auction.winnerId === user.id);
    const isAdmin = user?.role === 'ADMIN';

    // Parse images array if stored as JSON
    let parsedImages: string[] = [];
    if (auction.images) {
      try {
        parsedImages = JSON.parse(auction.images);
      } catch {
        parsedImages = [auction.imageUrl];
      }
    }
    if (parsedImages.length === 0 && auction.imageUrl) {
      parsedImages = [auction.imageUrl];
    }

    // Calculate Cumulative Offerings per User across all bids on this auction
    const allAuctionBids = await prisma.bid.findMany({
      where: { auctionId: id },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    const userOfferingMap = new Map<
      string,
      { user: { id: string; username: string }; totalOffering: number; lastBidAt: Date }
    >();

    for (const b of allAuctionBids) {
      const existing = userOfferingMap.get(b.userId);
      if (existing) {
        existing.totalOffering += b.creditCost;
        if (new Date(b.createdAt) > existing.lastBidAt) {
          existing.lastBidAt = new Date(b.createdAt);
        }
      } else {
        userOfferingMap.set(b.userId, {
          user: b.user,
          totalOffering: b.creditCost,
          lastBidAt: new Date(b.createdAt),
        });
      }
    }

    // Sort offerings ranking from highest offering down
    const offerings = Array.from(userOfferingMap.values()).sort(
      (a, b) => b.totalOffering - a.totalOffering
    );

    // Current user's offering
    const myOffering = user ? userOfferingMap.get(user.id)?.totalOffering || 0 : 0;
    const isAlreadyLeader = user && auction.highestBidderId === user.id;

    // Minimum new total offering needed to take lead (or stay lead)
    const currentTopOffering = Math.max(auction.startingPrice, auction.currentPrice);
    const minToLead = isAlreadyLeader
      ? currentTopOffering
      : currentTopOffering > 0
      ? currentTopOffering + 1
      : Math.max(1, auction.startingPrice);

    // Credits needed from user's balance to reach minToLead
    const creditsNeededToLead = isAlreadyLeader
      ? 1
      : Math.max(1, minToLead - myOffering);

    // Only reveal claimToken to the certified winner or admin after auction has ENDED
    const safeAuction = {
      ...auction,
      imagesList: parsedImages,
      claimToken: (isWinner || isAdmin) && auction.status === 'ENDED' ? auction.claimToken : null,
    };

    return NextResponse.json({
      auction: safeAuction,
      offerings,
      myOffering,
      minToLead,
      creditsNeededToLead,
      isWinner,
      isAdmin,
    });
  } catch (error) {
    console.error('Fetch auction error:', error);
    return NextResponse.json({ error: 'Failed to fetch auction' }, { status: 500 });
  }
}
