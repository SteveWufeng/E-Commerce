/**
 * Database seed script.
 *
 * Populates the database with initial data:
 * - Admin user
 * - Sample categories
 * - Sample products
 * - Pickup slots for the next 14 days
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@store.com" },
    update: {},
    create: {
      email: "admin@store.com",
      passwordHash: adminPassword,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      isVerified: true,
    },
  });
  console.log("✅ Admin user created");

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "dairy-eggs" },
      update: {},
      create: {
        name: "Dairy & Eggs",
        slug: "dairy-eggs",
        description: "Milk, cheese, yogurt, eggs, and more",
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: "produce" },
      update: {},
      create: {
        name: "Fresh Produce",
        slug: "produce",
        description: "Fruits, vegetables, and herbs",
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: "bakery" },
      update: {},
      create: {
        name: "Bakery",
        slug: "bakery",
        description: "Fresh bread, pastries, and baked goods",
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: "beverages" },
      update: {},
      create: {
        name: "Beverages",
        slug: "beverages",
        description: "Water, juice, soda, coffee, and tea",
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: "snacks" },
      update: {},
      create: {
        name: "Snacks",
        slug: "snacks",
        description: "Chips, crackers, nuts, and candy",
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: "pantry" },
      update: {},
      create: {
        name: "Pantry Staples",
        slug: "pantry",
        description: "Rice, pasta, canned goods, and cooking essentials",
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ ${categories.length} categories created`);

  // Create sample products
  const dairyCategory = categories.find((c) => c.slug === "dairy-eggs")!;
  const produceCategory = categories.find((c) => c.slug === "produce")!;
  const bakeryCategory = categories.find((c) => c.slug === "bakery")!;
  const beveragesCategory = categories.find((c) => c.slug === "beverages")!;
  const snacksCategory = categories.find((c) => c.slug === "snacks")!;

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Organic Whole Milk",
        slug: "organic-whole-milk",
        description: "Fresh organic whole milk from grass-fed cows. 1 gallon.",
        price: 5.99,
        comparePrice: 7.49,
        cost: 3.50,
        stock: 50,
        categoryId: dairyCategory.id,
        tags: ["organic", "dairy", "milk"],
        isFeatured: true,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "Free Range Eggs (12 pack)",
        slug: "free-range-eggs-12",
        description: "Large free-range eggs from pasture-raised hens.",
        price: 4.49,
        cost: 2.50,
        stock: 40,
        categoryId: dairyCategory.id,
        tags: ["eggs", "free-range", "dairy"],
        isFeatured: true,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "Fresh Bananas",
        slug: "fresh-bananas",
        description: "Organic bananas, sold per pound.",
        price: 0.69,
        cost: 0.30,
        stock: 100,
        categoryId: produceCategory.id,
        tags: ["fruit", "organic", "banana"],
        isFeatured: true,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "Sourdough Bread",
        slug: "sourdough-bread",
        description: "Freshly baked artisan sourdough loaf.",
        price: 6.99,
        cost: 3.00,
        stock: 20,
        categoryId: bakeryCategory.id,
        tags: ["bread", "sourdough", "bakery", "fresh"],
        isFeatured: true,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "Fresh Orange Juice",
        slug: "fresh-orange-juice",
        description: "Cold-pressed orange juice, no added sugar. 52oz.",
        price: 4.99,
        comparePrice: 5.99,
        cost: 2.50,
        stock: 30,
        categoryId: beveragesCategory.id,
        tags: ["juice", "orange", "beverage", "fresh"],
        isFeatured: false,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "Mixed Nuts Trail Mix",
        slug: "mixed-nuts-trail-mix",
        description: "Premium mix of almonds, cashews, walnuts, and dried fruit. 16oz.",
        price: 8.99,
        cost: 4.50,
        stock: 25,
        categoryId: snacksCategory.id,
        tags: ["nuts", "snack", "trail-mix", "healthy"],
        isFeatured: false,
        images: [],
      },
    }),
  ]);
  console.log(`✅ ${products.length} products created`);

  // Create pickup slots for the next 14 days
  const timeSlots = [
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
    { start: "16:00", end: "17:00" },
  ];

  let slotCount = 0;
  for (let i = 1; i <= 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();

    // Skip Sundays (or reduce slots)
    if (dayOfWeek === 0) continue;

    // Weekend has fewer slots
    const slots = dayOfWeek === 6 ? timeSlots.slice(0, 4) : timeSlots;

    for (const slot of slots) {
      await prisma.pickupSlot.create({
        data: {
          date,
          startTime: slot.start,
          endTime: slot.end,
          maxOrders: 10,
          isActive: true,
        },
      });
      slotCount++;
    }
  }
  console.log(`✅ ${slotCount} pickup slots created`);

  console.log("🌱 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
