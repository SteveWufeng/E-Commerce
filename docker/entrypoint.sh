#!/bin/sh
set -e

printf 'Waiting for database and applying migrations...\n'
max_retries=30
i=0
until npx prisma migrate deploy > /dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge "$max_retries" ]; then
    echo "Failed to connect to database after $max_retries attempts"
    exit 1
  fi
  printf '.'
  sleep 2
done
printf '\nMigrations applied\n'

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
