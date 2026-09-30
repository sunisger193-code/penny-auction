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

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const auction = await prisma.auction.findUnique({
      where: { id },
    });

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    if (auction.status !== 'ENDED') {
      return NextResponse.json(
        { error: 'Auction is not yet ended. Claim tokens remain sealed until the final gavel.' },
        { status: 400 }
      );
    }

    // Verify winner identity
    if (auction.winnerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access Denied: You are not the certified winning bidder of this auction.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      claimToken: auction.claimToken,
      discordUrl: auction.discordUrl || 'https://discord.gg/aurum8bit',
      instructions:
        'Copy your official Claim Token above, join our Discord server, and open a ticket in #claim-rewards to claim your gaming asset!',
      settledAt: auction.settledAt,
      finalPrice: auction.currentPrice,
    });
  } catch (error) {
    console.error('Claim token error:', error);
    return NextResponse.json({ error: 'Failed to retrieve claim token' }, { status: 500 });
  }
}
