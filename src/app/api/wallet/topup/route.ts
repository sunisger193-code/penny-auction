import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { amount, slipImage, bankRef } = await req.json();

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0 || !slipImage) {
      return NextResponse.json(
        { error: 'Valid Baht amount and bank transfer slip image are required' },
        { status: 400 }
      );
    }

    // Exact rule: 1 Baht = 1 Credit!
    const creditsToGrant = Math.round(numericAmount);

    const request = await prisma.topUpRequest.create({
      data: {
        userId: user.id,
        amount: numericAmount,
        credits: creditsToGrant, // 1 Baht = 1 Credit
        slipImage,
        bankRef: bankRef || `PROMPTPAY-${Date.now().toString(36).toUpperCase()}`,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Top-up slip for ฿${numericAmount.toFixed(2)} submitted! (${creditsToGrant} Credits pending admin approval)`,
      request,
    });
  } catch (error) {
    console.error('Wallet topup error:', error);
    return NextResponse.json({ error: 'Failed to submit topup request' }, { status: 500 });
  }
}
