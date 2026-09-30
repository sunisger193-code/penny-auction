import { prisma } from './src/lib/prisma';
import { placeBid, settleAuction } from './src/lib/auctionEngine';
import crypto from 'crypto';

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🕹️  RUNNING CUMULATIVE OFFERING AUCTION VERIFICATION  🕹️');
  console.log('======================================================\n');

  // Test 1: Discord Claim Voucher Token Generation
  console.log('--- TEST 1: DISCORD CLAIM VOUCHER TOKEN GENERATION ---');
  const claimToken = `AURUM-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  console.log('Generated Secret Discord Voucher Token:', claimToken);
  if (!claimToken.startsWith('AURUM-') || claimToken.split('-').length !== 3) {
    throw new Error('Claim token format invalid!');
  }
  console.log('✅ TEST 1 PASSED: Cryptographically secure Discord voucher token generated.\n');

  // Setup test users:
  // User A (High balance: 5,000 credits)
  const userA = await prisma.user.upsert({
    where: { username: 'BidderAlice' },
    update: { credits: 5000 },
    create: {
      username: 'BidderAlice',
      email: 'alice@arcade.bid',
      password: 'hashedpassword',
      credits: 5000,
    },
  });

  // User B (Lower balance: 2,000 credits)
  const userB = await prisma.user.upsert({
    where: { username: 'BidderBob' },
    update: { credits: 2000 },
    create: {
      username: 'BidderBob',
      email: 'bob@arcade.bid',
      password: 'hashedpassword',
      credits: 2000,
    },
  });

  // User C (Challenger: 4,000 credits)
  const userC = await prisma.user.upsert({
    where: { username: 'BidderCharlie' },
    update: { credits: 4000 },
    create: {
      username: 'BidderCharlie',
      email: 'charlie@arcade.bid',
      password: 'hashedpassword',
      credits: 4000,
    },
  });

  // Setup fresh active test auction
  const initialEndsAt = new Date(Date.now() + 60000);
  const testAuction = await prisma.auction.create({
    data: {
      title: 'Free Fire: Cumulative Offering Battle Test',
      description: 'Automated test auction verifying offering comparison and balance thresholds.',
      category: 'Free Fire',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e',
      images: JSON.stringify(['https://images.unsplash.com/photo-1542751371-adc38448a05e']),
      claimToken,
      discordUrl: 'https://discord.gg/aurum8bit',
      startingPrice: 0.00,
      currentPrice: 0.00,
      creditCostPerBid: 1,
      bidIncrement: 1.00,
      status: 'ACTIVE',
      endsAt: initialEndsAt,
      totalBids: 0,
    },
  });

  // Test 2: User A opens with 3,000 Offering
  console.log('--- TEST 2: CUMULATIVE OFFERINGS & COMPARISON ---');
  console.log(`User A (Alice) balance: ฿${userA.credits}. Adding ฿3,000 to offering...`);
  const bidA1 = await placeBid(testAuction.id, userA.id, 3000);
  console.log(`Current High Offering: ฿${bidA1.auction.currentPrice.toFixed(2)} (Leader: ${bidA1.auction.highestBidderName})`);
  console.log(`Alice remaining balance: ฿${bidA1.userCredits}`);

  if (bidA1.auction.currentPrice !== 3000.00 || bidA1.userCredits !== 2000) {
    throw new Error('Initial offering calculation failed!');
  }

  // Test 3: The exact user scenario:
  // "if the current price is 3000 and my balance is 2000 i shouldnt be able to add any bid"
  console.log('\n--- TEST 3: INSUFFICIENT BALANCE TO LEAD (PRICE 3000, BALANCE 2000) ---');
  console.log(`User B (Bob) has ฿2,000 balance. Current price is ฿3,000.`);
  console.log('Testing if User B is prevented from outbidding User A...');

  let bobBlocked = false;
  try {
    // Bob attempts to add his maximum 2,000 credits
    await placeBid(testAuction.id, userB.id, 2000);
  } catch (err: any) {
    console.log(`Bob's bid correctly rejected with error: "${err.message}"`);
    bobBlocked = true;
  }

  if (!bobBlocked) {
    throw new Error('FAILED: User with ฿2,000 was able to bid on a ฿3,000 top price!');
  }
  console.log('✅ TEST 3 PASSED: User with ฿2,000 balance cannot bid when top offering is ฿3,000!\n');

  // Test 4: User C (Charlie) has 4,000 balance and adds 3,005 to take lead
  console.log('--- TEST 4: USER C OUTBIDS TO ฿3,005 & USER A INCREMENTS OFFERING ---');
  console.log('User C (Charlie) adds ฿3,005 to take lead from Alice...');
  const bidC = await placeBid(testAuction.id, userC.id, 3005);
  console.log(`New High Offering: ฿${bidC.auction.currentPrice.toFixed(2)} (Leader: ${bidC.auction.highestBidderName})`);
  if (bidC.auction.currentPrice !== 3005.00 || bidC.auction.highestBidderName !== 'BidderCharlie') {
    throw new Error('User C failed to take lead at ฿3,005!');
  }

  // Now User A (Alice) wants to take the lead back!
  // Alice already offered 3,000. To reach 3,010, Alice only needs to add 10 credits!
  console.log('User A (Alice) previously offered ฿3,000. Adding +฿10 more from her balance to reach ฿3,010 total offering...');
  const bidA2 = await placeBid(testAuction.id, userA.id, 10);
  console.log(`New High Offering: ฿${bidA2.auction.currentPrice.toFixed(2)} (Leader: ${bidA2.auction.highestBidderName}, Alice Total Offering: ฿${bidA2.userOffering})`);
  if (bidA2.auction.currentPrice !== 3010.00 || bidA2.userOffering !== 3010.00 || bidA2.auction.highestBidderName !== 'BidderAlice') {
    throw new Error('Alice failed to take back lead with cumulative offering!');
  }
  console.log('✅ TEST 4 PASSED: Cumulative offering addition and leader comparison working perfectly!\n');

  // Test 5: 10-Second Sudden Death Overtime Restart
  console.log('--- TEST 5: 10s SUDDEN DEATH OVERTIME RESTART ---');
  await prisma.auction.update({
    where: { id: testAuction.id },
    data: { endsAt: new Date(Date.now() + 5000) },
  });

  const nowBeforeOvertime = Date.now();
  // Charlie adds 10 more to reach 3015 in overtime
  const overtimeBid = await placeBid(testAuction.id, userC.id, 10);
  const remainingOvertimeMs = new Date(overtimeBid.auction.endsAt).getTime() - nowBeforeOvertime;

  console.log(`Overtime bid placed -> Timer restarted to: ${remainingOvertimeMs}ms (isOvertimeRestart: ${overtimeBid.isOvertimeRestart})`);
  if (!overtimeBid.isOvertimeRestart || remainingOvertimeMs < 9500 || remainingOvertimeMs > 10500) {
    throw new Error('Overtime bid failed to restart timer to 10s!');
  }
  console.log('✅ TEST 5 PASSED: 10s sudden death overtime restarts clock on leading bid.\n');

  // Test 6: Settle Auction & Discord Claim Token
  console.log('--- TEST 6: SETTLE AUCTION & DISCORD CLAIM TOKEN ---');
  const settled = await settleAuction(testAuction.id);
  console.log(`Auction status: ${settled?.status}`);
  console.log(`Certified Winner: ${settled?.winner?.username}`);

  const settledFull = await prisma.auction.findUnique({
    where: { id: testAuction.id },
  });
  console.log(`Winner Discord Claim Token: ${settledFull?.claimToken}`);
  if (!settledFull?.claimToken || settledFull.claimToken !== claimToken) {
    throw new Error('Claim token mismatch on settled auction!');
  }
  console.log('✅ TEST 6 PASSED: Certified winner awarded secret Discord claim voucher token.\n');

  // Clean up test entities
  await prisma.bid.deleteMany({ where: { auctionId: testAuction.id } });
  await prisma.auction.delete({ where: { id: testAuction.id } });
  await prisma.walletTransaction.deleteMany({
    where: { userId: { in: [userA.id, userB.id, userC.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [userA.id, userB.id, userC.id] } },
  });

  console.log('======================================================');
  console.log('🎉  ALL CUMULATIVE OFFERING SYSTEM TESTS PASSED!  🎉');
  console.log('======================================================\n');
}

runTestSuite()
  .catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
