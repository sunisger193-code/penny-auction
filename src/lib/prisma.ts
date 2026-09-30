import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// When running in serverless environments (Netlify / AWS Lambda) with SQLite,
// copy the database to /tmp so writes succeed without "read-only filesystem" EROFS errors.
if (
  (process.env.NETLIFY === 'true' || process.env.AWS_LAMBDA_FUNCTION_NAME) &&
  (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:'))
) {
  const tmpDbPath = '/tmp/dev.db';
  if (fs.existsSync(/*turbopackIgnore: true*/ tmpDbPath)) {
    // already copied
  } else {
    const candidatePaths = [
      path.join(process.cwd(), 'dev.db'),
      path.join(process.cwd(), 'prisma', 'dev.db'),
    ];
    for (const src of candidatePaths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ src)) {
        try {
          fs.copyFileSync(src, tmpDbPath);
          console.log(`[PRISMA SERVERLESS] Copied seeded database to writable ${tmpDbPath}`);
          break;
        } catch (e) {
          console.warn('[PRISMA SERVERLESS] Could not copy dev.db to /tmp:', e);
        }
      }
    }
  }
  process.env.DATABASE_URL = `file:${tmpDbPath}`;
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
