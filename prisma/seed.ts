/**
 * Database seed script.
 *
 * Populates the database with initial data:
 * - Admin user
 * - Sample categories (groceries, electronics, household, personal care)
 * - Sample products across all categories
 * - Pickup slots for the next 14 days
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Admin user ──────────────────────────────────────────────
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

  // ── Categories ──────────────────────────────────────────────
  const categories = await Promise.all([
    // Groceries sub-categories
    prisma.category.upsert({
      where: { slug: "dairy-eggs" },
      update: {},
      create: {
        name: "Dairy & Eggs",
        slug: "dairy-eggs",
        description: "Milk, cheese, yogurt, eggs, and more",
        sortOrder: 1,
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
        sortOrder: 2,
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
        sortOrder: 3,
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
        sortOrder: 4,
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
        sortOrder: 5,
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
        sortOrder: 6,
        isActive: true,
      },
    }),
    // Electronics
    prisma.category.upsert({
      where: { slug: "electronics" },
      update: {},
      create: {
        name: "Electronics",
        slug: "electronics",
        description: "Phones, laptops, headphones, chargers, and smart home devices",
        sortOrder: 7,
        isActive: true,
      },
    }),
    // Household
    prisma.category.upsert({
      where: { slug: "household" },
      update: {},
      create: {
        name: "Household",
        slug: "household",
        description: "Cleaning supplies, kitchen essentials, and home organization",
        sortOrder: 8,
        isActive: true,
      },
    }),
    // Personal Care
    prisma.category.upsert({
      where: { slug: "personal-care" },
      update: {},
      create: {
        name: "Personal Care",
        slug: "personal-care",
        description: "Skincare, haircare, hygiene, and wellness products",
        sortOrder: 9,
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ ${categories.length} categories created`);

  // ── Category lookups ────────────────────────────────────────
  const cat = (slug: string) => categories.find((c) => c.slug === slug)!;

  // ── Products ────────────────────────────────────────────────
  const products = await Promise.all([
    // ── Dairy & Eggs ──
    prisma.product.create({
      data: {
        name: "Organic Whole Milk",
        slug: "organic-whole-milk",
        description: "Fresh organic whole milk from grass-fed cows. 1 gallon.",
        price: 5.99,
        comparePrice: 7.49,
        cost: 3.50,
        stock: 50,
        categoryId: cat("dairy-eggs").id,
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
        categoryId: cat("dairy-eggs").id,
        tags: ["eggs", "free-range", "dairy"],
        isFeatured: true,
        images: [],
      },
    }),

    // ── Fresh Produce ──
    prisma.product.create({
      data: {
        name: "Fresh Bananas",
        slug: "fresh-bananas",
        description: "Organic bananas, sold per pound.",
        price: 0.69,
        cost: 0.30,
        stock: 100,
        categoryId: cat("produce").id,
        tags: ["fruit", "organic", "banana"],
        isFeatured: true,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "Organic Avocados (4 pack)",
        slug: "organic-avocados-4",
        description: "Ripe and ready-to-eat Hass avocados.",
        price: 5.49,
        comparePrice: 6.99,
        cost: 3.00,
        stock: 60,
        categoryId: cat("produce").id,
        tags: ["fruit", "organic", "avocado", "superfood"],
        isFeatured: true,
        images: [],
      },
    }),

    // ── Bakery ──
    prisma.product.create({
      data: {
        name: "Sourdough Bread",
        slug: "sourdough-bread",
        description: "Freshly baked artisan sourdough loaf.",
        price: 6.99,
        cost: 3.00,
        stock: 20,
        categoryId: cat("bakery").id,
        tags: ["bread", "sourdough", "bakery", "fresh"],
        isFeatured: true,
        images: [],
      },
    }),

    // ── Beverages ──
    prisma.product.create({
      data: {
        name: "Fresh Orange Juice",
        slug: "fresh-orange-juice",
        description: "Cold-pressed orange juice, no added sugar. 52oz.",
        price: 4.99,
        comparePrice: 5.99,
        cost: 2.50,
        stock: 30,
        categoryId: cat("beverages").id,
        tags: ["juice", "orange", "beverage", "fresh"],
        isFeatured: false,
        images: [],
      },
    }),

    // ── Snacks ──
    prisma.product.create({
      data: {
        name: "Mixed Nuts Trail Mix",
        slug: "mixed-nuts-trail-mix",
        description: "Premium mix of almonds, cashews, walnuts, and dried fruit. 16oz.",
        price: 8.99,
        cost: 4.50,
        stock: 25,
        categoryId: cat("snacks").id,
        tags: ["nuts", "snack", "trail-mix", "healthy"],
        isFeatured: false,
        images: [],
      },
    }),

    // ── Pantry Staples ──
    prisma.product.create({
      data: {
        name: "Organic Brown Rice (2 lb)",
        slug: "organic-brown-rice-2lb",
        description: "Long-grain organic brown rice. Great for meal prep.",
        price: 4.29,
        cost: 2.00,
        stock: 45,
        categoryId: cat("pantry").id,
        tags: ["rice", "organic", "grain", "pantry"],
        isFeatured: false,
        images: [],
      },
    }),

    // ── Electronics ──
    prisma.product.create({
      data: {
        name: "Wireless Bluetooth Earbuds",
        slug: "wireless-bluetooth-earbuds",
        description: "True wireless earbuds with active noise cancellation and 24-hour battery life.",
        price: 49.99,
        comparePrice: 79.99,
        cost: 22.00,
        sku: "ELEC-WBE-001",
        stock: 35,
        categoryId: cat("electronics").id,
        tags: ["electronics", "audio", "bluetooth", "earbuds", "wireless"],
        isFeatured: true,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "USB-C Fast Charger (65W)",
        slug: "usb-c-fast-charger-65w",
        description: "Compact GaN charger compatible with laptops, tablets, and phones.",
        price: 29.99,
        cost: 12.00,
        sku: "ELEC-CHG-002",
        stock: 50,
        categoryId: cat("electronics").id,
        tags: ["electronics", "charger", "usb-c", "fast-charge"],
        isFeatured: false,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "Smart LED Light Bulb (4-Pack)",
        slug: "smart-led-bulb-4pack",
        description: "WiFi-enabled color-changing bulbs compatible with Alexa and Google Home.",
        price: 34.99,
        comparePrice: 44.99,
        cost: 15.00,
        sku: "ELEC-BULB-003",
        stock: 30,
        categoryId: cat("electronics").id,
        tags: ["electronics", "smart-home", "lighting", "wifi"],
        isFeatured: true,
        images: [],
      },
    }),

    // ── Household ──
    prisma.product.create({
      data: {
        name: "All-Purpose Cleaner (32oz)",
        slug: "all-purpose-cleaner-32oz",
        description: "Plant-based, non-toxic multi-surface cleaner. Lemon scent.",
        price: 6.49,
        cost: 2.50,
        sku: "HH-CLEAN-001",
        stock: 40,
        categoryId: cat("household").id,
        tags: ["household", "cleaning", "eco-friendly", "non-toxic"],
        isFeatured: false,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "Reusable Food Storage Bags (10-Pack)",
        slug: "reusable-food-storage-bags-10",
        description: "BPA-free silicone bags. Freezer, microwave, and dishwasher safe.",
        price: 14.99,
        comparePrice: 19.99,
        cost: 6.00,
        sku: "HH-STOR-002",
        stock: 25,
        categoryId: cat("household").id,
        tags: ["household", "kitchen", "storage", "eco-friendly", "reusable"],
        isFeatured: true,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "Bamboo Paper Towels (6 Rolls)",
        slug: "bamboo-paper-towels-6",
        description: "Ultra-absorbent, sustainable bamboo paper towels. 2x more sheets per roll.",
        price: 12.99,
        cost: 5.50,
        sku: "HH-PTOW-003",
        stock: 35,
        categoryId: cat("household").id,
        tags: ["household", "cleaning", "bamboo", "sustainable"],
        isFeatured: false,
        images: [],
      },
    }),

    // ── Personal Care ──
    prisma.product.create({
      data: {
        name: "Natural Deodorant — Unscented",
        slug: "natural-deodorant-unscented",
        description: "Aluminum-free, baking-soda-free deodorant. Sensitive skin formula. 2.65oz.",
        price: 9.99,
        cost: 4.00,
        sku: "PC-DEO-001",
        stock: 55,
        categoryId: cat("personal-care").id,
        tags: ["personal-care", "deodorant", "natural", "sensitive-skin"],
        isFeatured: true,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "Organic Shampoo — Lavender Mint",
        slug: "organic-shampoo-lavender-mint",
        description: "Sulfate-free shampoo with organic lavender and peppermint oils. 12oz.",
        price: 12.49,
        comparePrice: 15.99,
        cost: 5.00,
        sku: "PC-SHAM-002",
        stock: 40,
        categoryId: cat("personal-care").id,
        tags: ["personal-care", "haircare", "organic", "shampoo"],
        isFeatured: false,
        images: [],
      },
    }),
    prisma.product.create({
      data: {
        name: "Vitamin C Serum (1oz)",
        slug: "vitamin-c-serum-1oz",
        description: "20% Vitamin C + Hyaluronic Acid serum for brightening and anti-aging.",
        price: 18.99,
        cost: 7.00,
        sku: "PC-SERUM-003",
        stock: 30,
        categoryId: cat("personal-care").id,
        tags: ["personal-care", "skincare", "vitamin-c", "serum", "anti-aging"],
        isFeatured: true,
        images: [],
      },
    }),
  ]);
  console.log(`✅ ${products.length} products created`);

  // ── Pickup Slots ────────────────────────────────────────────
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

    // Skip Sundays
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

  // ── Default Payment Method Definitions ─────────────────────
  const bankTransfer = await prisma.paymentMethodDefinition.upsert({
    where: { name: "Bank Transfer" },
    update: {},
    create: {
      name: "Bank Transfer",
      description: "Pay via bank transfer. Upload your payment receipt after placing the order.",
      isActive: true,
      sortOrder: 1,
      proofType: "IMAGE",
      proofLabel: "Upload your payment receipt",
      proofImageRequired: true,
      requiresTransactionId: true,
    },
  });
  console.log(`✅ Default payment method created: ${bankTransfer.name}`);

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
