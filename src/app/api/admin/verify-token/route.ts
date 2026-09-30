import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { securityToken } = await req.json();
    const expectedToken = process.env.ADMIN_SECURITY_TOKEN || 'AURUM-ADMIN-8888-MASTER';

    if (!securityToken || securityToken.trim() !== expectedToken.trim()) {
      return NextResponse.json(
        { error: 'Invalid master admin security passkey token. Access denied.' },
        { status: 401 }
      );
    }

    // Try to find or auto-provision the primary Admin user in the database
    let adminUser = null;
    try {
      adminUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: 'admin@gmail.com' }, { role: 'ADMIN' }],
        },
      });

      if (!adminUser) {
        const passwordHash = await hashPassword('admin1');
        adminUser = await prisma.user.create({
          data: {
            username: 'ArcadeAdmin',
            email: 'admin@gmail.com',
            password: passwordHash,
            role: 'ADMIN',
            credits: 9999,
          },
        });
      }
    } catch (dbErr) {
      console.warn('[VERIFY-TOKEN] Note: Could not query or create admin in DB, proceeding with master session:', dbErr);
    }

    const adminPayload = {
      userId: adminUser?.id || 'master-admin-id',
      username: adminUser?.username || 'ArcadeAdmin',
      role: 'ADMIN',
    };

    const token = signToken(adminPayload);

    const res = NextResponse.json({
      success: true,
      verified: true,
      token,
      user: {
        id: adminPayload.userId,
        username: adminPayload.username,
        email: adminUser?.email || 'admin@gmail.com',
        role: 'ADMIN',
        credits: adminUser?.credits ?? 9999,
      },
      message: 'Level 5 Master Clearance granted. Admin session authorized.',
    });

    // 1. Set arcade_token cookie (logs user in as ADMIN)
    res.cookies.set('arcade_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // 2. Set arcade_admin_gate cookie (unlocks /admin console)
    res.cookies.set('arcade_admin_gate', 'verified', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    console.error('Verify admin token error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
