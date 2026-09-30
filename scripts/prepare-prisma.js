const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const pgSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.postgresql.prisma');
const sqliteSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.sqlite.prisma');

// Backup sqlite schema if not backed up yet
if (!fs.existsSync(sqliteSchemaPath) && fs.existsSync(schemaPath)) {
  const currentContent = fs.readFileSync(schemaPath, 'utf8');
  if (currentContent.includes('provider = "sqlite"')) {
    fs.writeFileSync(sqliteSchemaPath, currentContent);
  }
}

if (isPostgres && fs.existsSync(pgSchemaPath)) {
  console.log('🔄 [PRISMA DETECT] PostgreSQL connection string detected.');
  console.log('⚡ Activating PostgreSQL Prisma schema for production cloud deployment...');
  fs.copyFileSync(pgSchemaPath, schemaPath);

  try {
    console.log('🚀 [PRISMA SYNC] Synchronizing PostgreSQL database tables (db push)...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ [PRISMA SYNC] PostgreSQL database tables synchronized successfully!');
  } catch (err) {
    console.warn('⚠️ [PRISMA SYNC] Could not push schema during build:', err.message);
  }
} else if (!isPostgres && fs.existsSync(sqliteSchemaPath)) {
  console.log('📦 [PRISMA DETECT] SQLite connection detected. Using SQLite schema.');
  fs.copyFileSync(sqliteSchemaPath, schemaPath);

  try {
    console.log('🚀 [PRISMA SYNC] Verifying SQLite database tables (db push)...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ [PRISMA SYNC] SQLite database tables verified successfully!');
  } catch (err) {
    console.warn('⚠️ [PRISMA SYNC] Could not push schema during build:', err.message);
  }
}
