import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    let user = await prisma.user.findUnique({
      where: { username },
    });

    // If user does not exist but is a recognized test player, auto-provision with credits for seamless testing
    if (!user && (username === 'PixelMaster' || username === 'RetroSniper' || username === 'CyberGhost')) {
      const defaultHash = await bcrypt.hash('player123', 10);
      user = await prisma.user.create({
        data: {
          username,
          email: `${username.toLowerCase()}@gmail.com`,
          password: defaultHash,
          role: 'USER',
          credits: 500, // 500 credits for instant test bidding
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        credits: user.credits,
      },
      token,
    });

    res.cookies.set('arcade_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error('Switch user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
