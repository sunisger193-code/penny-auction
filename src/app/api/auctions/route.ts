import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Build filter
    const where: Record<string, unknown> = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const rawAuctions = await prisma.auction.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // ACTIVE first
        { endsAt: 'asc' },
      ],
      include: {
        highestBidder: {
          select: { id: true, username: true },
        },
        winner: {
          select: { id: true, username: true },
        },
        _count: {
          select: { bids: true },
        },
      },
    });

    // Strip claimToken from public lobby feed and parse images
    const auctions = rawAuctions.map((auc) => {
      let parsedImages: string[] = [];
      if (auc.images) {
        try {
          parsedImages = JSON.parse(auc.images);
        } catch {
          parsedImages = [auc.imageUrl];
        }
      }
      if (parsedImages.length === 0 && auc.imageUrl) {
        parsedImages = [auc.imageUrl];
      }

      const { claimToken: _secret, ...safe } = auc;
      return {
        ...safe,
        imagesList: parsedImages,
      };
    });

    return NextResponse.json({ auctions });
  } catch (error) {
    console.error('Fetch auctions error:', error);
    return NextResponse.json({ error: 'Failed to fetch auctions' }, { status: 500 });
  }
}
