/* Upsert an ADMIN user. Usage: node prisma/create-admin.js --email=x --name=y --password=z */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}

async function main() {
  const email = String(arg('email', 'medkish@aliostore.com')).trim().toLowerCase();
  const name = String(arg('name', 'Medkish')).trim();
  const password = String(arg('password', 'medk@love'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email: ' + email);
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash: bcrypt.hashSync(password, 10), role: 'ADMIN' },
    create: { name, email, mobile: '', passwordHash: bcrypt.hashSync(password, 10), role: 'ADMIN', cart: [] }
  });
  console.log('Admin ready: ' + email + ' (role=' + user.role + ', id=' + user.id + ')');
}

main()
  .then(function () { return prisma.$disconnect(); })
  .catch(async function (e) {
    console.error('Failed to create admin:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  });