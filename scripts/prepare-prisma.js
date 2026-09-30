const fs = require('fs');
const path = require('path');

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
} else if (!isPostgres && fs.existsSync(sqliteSchemaPath)) {
  console.log('📦 [PRISMA DETECT] SQLite connection detected. Using SQLite schema.');
  fs.copyFileSync(sqliteSchemaPath, schemaPath);
}
