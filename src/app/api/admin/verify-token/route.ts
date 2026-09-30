import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin user account required' },
        { status: 403 }
      );
    }

    const { securityToken } = await req.json();
    const expectedToken = process.env.ADMIN_SECURITY_TOKEN || 'AURUM-ADMIN-8888-MASTER';

    if (!securityToken || securityToken.trim() !== expectedToken.trim()) {
      return NextResponse.json(
        { error: 'Invalid master admin security token. Access denied.' },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      success: true,
      verified: true,
      message: 'Master security clearance granted.',
    });

    // Set secure gate session cookie
    res.cookies.set('arcade_admin_gate', 'verified', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/admin',
      maxAge: 60 * 60 * 8, // 8 hours session
    });

    return res;
  } catch (error) {
    console.error('Verify admin token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
