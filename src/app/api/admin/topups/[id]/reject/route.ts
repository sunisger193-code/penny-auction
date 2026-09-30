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

    const { notes } = await req.json().catch(() => ({ notes: '' }));

    const request = await prisma.topUpRequest.findUnique({
      where: { id },
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

    const updatedRequest = await prisma.topUpRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNotes: notes || 'Receipt unverified or invalid transfer proof.',
        reviewedAt: new Date(),
        reviewedBy: adminUser.username,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Top-up request rejected.',
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Reject topup error:', error);
    return NextResponse.json({ error: 'Failed to reject top-up request' }, { status: 500 });
  }
}
