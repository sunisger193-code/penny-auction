import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const requests = await prisma.topUpRequest.findMany({
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'desc' },
      ],
      include: {
        user: {
          select: { id: true, username: true, email: true, credits: true },
        },
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Fetch topup requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch topup requests' }, { status: 500 });
  }
}
