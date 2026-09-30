import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const rawAuctions = await prisma.auction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        highestBidder: {
          select: { id: true, username: true, email: true },
        },
        winner: {
          select: { id: true, username: true, email: true },
        },
        _count: {
          select: { bids: true },
        },
      },
    });

    const auctions = rawAuctions.map((auc) => {
      let parsedImages: string[] = [];
      if (auc.images) {
        try {
          parsedImages = JSON.parse(auc.images);
        } catch {
          parsedImages = [auc.imageUrl];
        }
      }
      if (parsedImages.length === 0 && auc.imageUrl) {
        parsedImages = [auc.imageUrl];
      }
      return {
        ...auc,
        imagesList: parsedImages,
      };
    });

    return NextResponse.json({ auctions });
  } catch (error) {
    console.error('Admin fetch auctions error:', error);
    return NextResponse.json({ error: 'Failed to fetch auctions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      category = 'Gaming Asset',
      images = [],
      startingPrice = 0.0,
      durationMinutes = 10,
      discordUrl = 'https://discord.gg/aurum8bit',
    } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Product title is required' }, { status: 400 });
    }

    // Process images
    const imagesArray: string[] = Array.isArray(images) && images.length > 0 ? images : [];
    const fallbackImage =
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop';
    const primaryImage = imagesArray[0] || fallbackImage;
    if (imagesArray.length === 0) {
      imagesArray.push(fallbackImage);
    }

    // Auto-generate cryptographically secure Discord Claim Voucher Token (e.g. AURUM-8F2B1A-7C4E8D)
    const claimToken = `AURUM-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const numDuration = Math.max(1, parseFloat(durationMinutes) || 10);
    const endsAt = new Date(Date.now() + numDuration * 60 * 1000);
    const numPrice = Math.max(0, parseFloat(startingPrice) || 0);

    const auction = await prisma.auction.create({
      data: {
        title: title.trim(),
        description: description?.trim() || 'Verified gaming asset lot. Bids extend clock to 10s in overtime.',
        category: category?.trim() || 'Gaming Asset',
        imageUrl: primaryImage,
        images: JSON.stringify(imagesArray),
        claimToken,
        discordUrl: discordUrl?.trim() || 'https://discord.gg/aurum8bit',
        startingPrice: numPrice,
        currentPrice: numPrice,
        creditCostPerBid: 1, // Default base is 1 credit = 1 baht
        bidIncrement: 1.0,
        status: 'ACTIVE',
        endsAt,
      },
    });

    return NextResponse.json({ success: true, auction });
  } catch (error) {
    console.error('Admin create auction error:', error);
    return NextResponse.json({ error: 'Failed to create auction' }, { status: 500 });
  }
}
