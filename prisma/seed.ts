import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Wiping all stock products, dummy auctions, and test data...');

  await prisma.bid.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.topUpRequest.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.user.deleteMany();

  // Create ONLY Admin User: admin@gmail.com / admin1
  const adminPasswordHash = await bcrypt.hash('admin1', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'ArcadeAdmin',
      email: 'admin@gmail.com',
      password: adminPasswordHash,
      role: 'ADMIN',
      credits: 9999,
    },
  });

  console.log(`✅ Clean Database Initialized!`);
  console.log(`👤 Admin: ${admin.email} (Role: ADMIN, Credits: 9,999)`);
  console.log(`📦 Stock Products: 0 (Ready for real product creation)`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
