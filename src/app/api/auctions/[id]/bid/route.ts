import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { placeBid } from '@/lib/auctionEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required to bid' }, { status: 401 });
    }

    let creditAmount = 1;
    try {
      const body = await req.json();
      if (body && typeof body.creditAmount === 'number' && body.creditAmount > 0) {
        creditAmount = body.creditAmount;
      }
    } catch {
      // Body may be empty, default to 1 credit
    }

    const result = await placeBid(id, user.id, creditAmount);

    // Broadcast update to all connected clients immediately!
    if (global.io) {
      const payload = {
        auctionId: result.auction.id,
        currentPrice: result.auction.currentPrice,
        highestBidderId: result.auction.highestBidderId,
        highestBidderName: result.auction.highestBidderName,
        endsAt: result.auction.endsAt,
        totalBids: result.auction.totalBids,
        bid: result.bid,
        isOvertimeRestart: result.isOvertimeRestart,
      };

      global.io.to(`auction:${id}`).emit('bid_success', payload);
      global.io.emit('bid_success', payload); // Global sync
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Bid error:', error.message);
    const statusCode = error.message.includes('INSUFFICIENT_CREDITS')
      ? 402
      : error.message.includes('AUCTION_EXPIRED')
      ? 410
      : 400;

    return NextResponse.json({ error: error.message }, { status: statusCode });
  }
}
