#!/bin/sh
set -e

export DB_HOST=${DB_HOST:-postgres}
export DB_PORT=${DB_PORT:-5432}
export DB_USER=${DB_USER:-ecommerce}
export DB_NAME=${DB_NAME:-ecommerce_mvp}

printf "Waiting for database %s:%s... " "$DB_HOST" "$DB_PORT"
while true; do
  if node -e "const net=require('net'); const host=process.env.DB_HOST; const port=Number(process.env.DB_PORT); const s=net.connect({host, port}); s.on('connect', () => { process.exit(0) }); s.on('error', () => process.exit(1));" >/dev/null 2>&1; then
    break
  fi
  printf '.'
  sleep 1
done
printf '\nDatabase is reachable\n'

printf 'Applying Prisma migrations...\n'
npx prisma migrate deploy

printf 'Checking whether database needs seed data...\n'
seed_count=$(node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.category.count()
  .then(count => {
    console.log(count);
    return prisma.$disconnect();
  })
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
NODE
)

if [ "$seed_count" -eq 0 ]; then
  printf 'No categories found, running seed script...\n'
  npm run db:seed
else
  printf 'Database already seeded (categories present)\n'
fi

exec node server.js
