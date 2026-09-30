import { NextResponse } from 'next/server';

export async function GET() {
  // Legacy inventory endpoint deprecated in favor of self-contained auctions with Discord claim tokens
  return NextResponse.json({ inventory: [] });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Direct inventory creation is deprecated. Use the unified /api/admin/auctions endpoint to launch lots with Discord claim tokens.',
  }, { status: 400 });
}
