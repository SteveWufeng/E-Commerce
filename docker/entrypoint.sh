#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Add the PostgreSQL plugin in Railway dashboard."
  echo "       Railway → your project → + New → Database → Add PostgreSQL"
  exit 1
fi

printf 'Waiting for database and applying migrations...\n'
max_retries=30
i=0
until npx prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge "$max_retries" ]; then
    echo ""
    echo "Failed to apply migrations after $max_retries attempts."
    echo "Check the Railway logs above for the specific error."
    exit 1
  fi
  printf '.'
  sleep 2
done
printf '\nMigrations applied\n'

printf 'Checking whether admin user exists...\n'
admin_exists=$(node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { email: 'admin@store.com' } })
  .then(user => {
    console.log(user ? 'yes' : 'no');
    return prisma.$disconnect();
  })
  .catch(async error => {
    console.error("Admin check error:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
NODE
)

if [ "$admin_exists" = "no" ]; then
  printf 'No admin user found. Running seed script...\n'
  if npm run db:seed; then
    printf 'Seed completed\n'
  else
    printf 'ts-node seed failed. Creating admin directly...\n'
    node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@store.com' } });
  if (existing) { await prisma.$disconnect(); return; }
  const hash = await bcrypt.hash('admin123', 12);
  await prisma.user.create({
    data: { email: 'admin@store.com', passwordHash: hash, firstName: 'Admin', lastName: 'User', role: 'ADMIN', isVerified: true },
  });
  console.log('Admin user created (admin@store.com / admin123)');
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
NODE
  fi
else
  printf 'Admin user exists\n'
fi

exec node server.js
