import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminUser = await getUserFromRequest(req);

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const request = await prisma.topUpRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request) {
      return NextResponse.json({ error: 'Top-up request not found' }, { status: 404 });
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Request has already been processed as ${request.status}` },
        { status: 400 }
      );
    }

    // Atomic transaction: update request, increment user credits, log wallet transaction
    const [updatedRequest, updatedUser] = await prisma.$transaction([
      prisma.topUpRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: adminUser.username,
        },
      }),
      prisma.user.update({
        where: { id: request.userId },
        data: {
          credits: { increment: request.credits },
        },
      }),
      prisma.walletTransaction.create({
        data: {
          userId: request.userId,
          type: 'TOPUP',
          amount: request.credits,
          balanceAfter: request.user.credits + request.credits,
          description: `Bank Slip Approved (+${request.credits} Credits, ฿${request.amount.toFixed(2)})`,
          referenceId: id,
        },
      }),
    ]);

    // If socket server is active, broadcast credit update to all sockets
    if (global.io) {
      global.io.emit('user_credits_credited', {
        userId: request.userId,
        newBalance: updatedUser.credits,
        addedCredits: request.credits,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Approved! Credited ${request.credits} tokens to ${request.user.username}.`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Approve topup error:', error);
    return NextResponse.json({ error: 'Failed to approve top-up request' }, { status: 500 });
  }
}
