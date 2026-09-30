import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { settleAuction } from '@/lib/auctionEngine';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, extendMinutes, setRemainingSeconds } = await req.json();

    const auction = await prisma.auction.findUnique({
      where: { id },
    });

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    if (status === 'ENDED' && auction.status !== 'ENDED') {
      const settled = await settleAuction(id);
      return NextResponse.json({ success: true, auction: settled });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (extendMinutes) {
      updateData.endsAt = new Date(Date.now() + extendMinutes * 60 * 1000);
    }
    if (setRemainingSeconds !== undefined) {
      updateData.endsAt = new Date(Date.now() + setRemainingSeconds * 1000);
    }

    const updated = await prisma.auction.update({
      where: { id },
      data: updateData,
    });

    if (global.io && setRemainingSeconds !== undefined) {
      global.io.emit('bid_success', {
        auctionId: id,
        currentPrice: updated.currentPrice,
        highestBidderId: updated.highestBidderId,
        endsAt: updated.endsAt,
        totalBids: updated.totalBids,
        isOvertimeRestart: true,
      });
    }

    return NextResponse.json({ success: true, auction: updated });
  } catch (error) {
    console.error('Update auction error:', error);
    return NextResponse.json({ error: 'Failed to update auction' }, { status: 500 });
  }
}
