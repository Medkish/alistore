require('dotenv').config();
const fs = require('fs');
const path = require('path');
const prisma = require('../src/lib/prisma');

// Must match scripts/db-backup.js ordering (parents before children on insert).
const TABLES = [
  'Notification',
  'ActionLog',
  'VisitEvent',
  'Session',
  'OrderItem',
  'Review',
  'Donation',
  'Subscription',
  'Order',
  'Book',
  'Category',
  'User'
];

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error('Usage: npm run db:restore -- <backup.json> --yes');
    process.exit(1);
  }
  const yes = process.argv.includes('--yes');
  const file = path.resolve(process.cwd(), raw);
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!payload.tables) {
    console.error('Not an AlioStore backup file: ' + file);
    process.exit(1);
  }
  if (!yes) {
    console.error('This ERASES all current data and replaces it with the backup.');
    console.error('Re-run with --yes to proceed against: ' + file);
    process.exit(0);
  }

  for (const name of [...TABLES].reverse()) {
    const count = await prisma[name].deleteMany();
    console.log('Cleared: ' + name + ' (' + count.count + ')');
  }

  for (const name of TABLES) {
    const rows = payload.tables[name] || [];
    if (rows.length) {
      await prisma[name].createMany({ data: rows });
    }
    console.log('Restored: ' + name + ' (' + rows.length + ')');
  }
  console.log('Restore complete.');
}

main()
  .catch(function (err) {
    console.error('Restore failed:', err);
    process.exit(1);
  })
  .finally(function () {
    return prisma.$disconnect();
  });