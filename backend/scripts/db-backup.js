require('dotenv').config();
const fs = require('fs');
const path = require('path');
const prisma = require('../src/lib/prisma');

// Insert/delete in FK-safe order (children before parents on delete,
// parents before children on insert). Keep in sync with prisma/schema.prisma.
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
  const data = {};
  let total = 0;
  for (const name of TABLES) {
    const rows = await prisma[name].findMany();
    data[name] = rows;
    total += rows.length;
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(backupDir, 'alistore-' + stamp + '.json');
  const host = new URL(process.env.DATABASE_URL || 'postgresql://').hostname;

  fs.writeFileSync(
    file,
    JSON.stringify(
      { createdAt: new Date().toISOString(), databaseHost: host, database: host, tables: data },
      null,
      2
    )
  );

  console.log('Backup written: ' + file);
  console.log('Tables: ' + TABLES.length + '  Rows: ' + total);
  console.log('Database host: ' + host);
}

main()
  .catch(function (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  })
  .finally(function () {
    return prisma.$disconnect();
  });